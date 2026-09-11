import {
  AI_BUILD_INTERVAL,
  AI_FLEET_INTERVAL,
  AI_MISSION_INTERVAL,
  AI_MISSION_PARTIES,
  AI_NEAR_BONUS,
  AI_SHIP_RESERVE,
  AI_TROOP_POOL,
  INCITE_PRIORITY_PENALTY,
  TROOP_BUILD,
  YARD_BUILDS,
  shipSpec,
  shipsFor,
} from './constants';
import { buildMenu, canQueueBuild, queueBuild } from './build';
import {
  assault,
  assaultError,
  board,
  boardError,
  embark,
  embarkError,
  fleetCapacity,
  fleetGuns,
  fleetsOf,
  isAtSea,
  sailError,
  sailFleet,
} from './fleets';
import {
  freeEnergySlots,
  freeRawSlots,
  getSystem,
  otherFaction,
  requiredGarrison,
} from './helpers';
import { canStartMission, isMissionTarget, startMission } from './missions';
import type { Rng } from './rng';
import type {
  Character,
  FacilityType,
  Fleet,
  GameState,
  PlayableFaction,
  System,
} from './types';

/**
 * Deliberately simple opponent (spec 4.7): keep the mine/refinery count level,
 * and keep the best diplomat working the most promising world.
 */
export function runAI(state: GameState, rng: Rng): void {
  const ai = otherFaction(state.player);
  if (state.day % AI_BUILD_INTERVAL === 0) aiBuild(state, ai);
  if (state.day % AI_MISSION_INTERVAL === 0) aiMission(state, ai);
  if (state.day % AI_FLEET_INTERVAL === 0) aiFleet(state, ai, rng);
}

/**
 * What the opponent puts its gold into, in priority order.
 *
 * It used to queue nothing but mines and refineries, which meant it never
 * built a Slipway, never put a hull in the water and never drilled a company
 * past the ones it started with. Measured over a 700-day war it finished with
 * zero ships and its opening eight companies — so every naval rule it was
 * given was unreachable, and the war was one-sided in a way nothing on screen
 * admitted.
 *
 * It now holds what it has, then drills, then builds a yard, then grows.
 */
function aiBuild(state: GameState, ai: PlayableFaction): void {
  const gold = state.factions[ai].gold;
  const held = state.systems.filter((s) => s.control === ai && !s.uprising);

  // 1. Companies. A drill ground raises them on its own island and nowhere
  //    else, so this works outward from the drill grounds rather than from the
  //    islands that are short — the short ones usually have no drill ground on
  //    them, which is exactly why an earlier version of this never drilled at
  //    all. Each keeps what holds its island quiet plus a small pool, because
  //    an opponent with no spare companies can never land on anything.
  if (gold >= TROOP_BUILD.costGold) {
    const target = (s: System) => Math.max(requiredGarrison(s.support[ai]), 1) + AI_TROOP_POOL;
    const short = held
      .filter((s) => s.garrison < target(s))
      .sort((a, b) => target(b) - b.garrison - (target(a) - a.garrison));
    for (const system of short) {
      const drill = system.facilities.find(
        (f) => f.owner === ai && f.type === 'training_facility' && !f.building,
      );
      if (drill && canQueueBuild(state, drill.id, 'troop')) {
        queueBuild(state, drill.id, 'troop');
        return;
      }
    }
  }

  // 2. Then the buildings it is missing entirely: somewhere to drill, and a
  //    slipway, without which none of its fleet rules can ever fire.
  const countOf = (type: FacilityType) =>
    held.reduce((n, s) => n + s.facilities.filter((f) => f.owner === ai && f.type === type).length, 0);
  const wanted: FacilityType[] = [];
  if (countOf('training_facility') < 2) wanted.push('training_facility');
  if (countOf('shipyard') < 1) wanted.push('shipyard');
  else if (countOf('shipyard') < 2 && gold > AI_SHIP_RESERVE * 3) wanted.push('shipyard');

  for (const item of wanted) {
    if (gold < YARD_BUILDS[item].costGold) continue;
    const spot = bestSpotFor(state, ai, item);
    if (spot) {
      queueBuild(state, spot, item);
      return;
    }
  }

  // 3. Otherwise grow the economy, keeping the two earners level as before.
  const item = countOf('mine') <= countOf('refinery') ? 'mine' : 'refinery';
  if (gold < YARD_BUILDS[item].costGold) return;
  const spot = bestSpotFor(state, ai, item);
  if (spot) queueBuild(state, spot, item);
}

/** The held island with the most room to grow that can take this order. */
function bestSpotFor(
  state: GameState,
  ai: PlayableFaction,
  item: FacilityType,
): string | undefined {
  let best: { facilityId: string; slots: number } | undefined;
  for (const system of state.systems) {
    if (system.control !== ai || system.uprising) continue;
    const slots = item === 'mine' ? freeRawSlots(system) : freeEnergySlots(system);
    if (slots < 1) continue;
    for (const facility of system.facilities) {
      if (facility.owner !== ai || facility.building) continue;
      if (!buildMenu(facility).includes(item)) continue;
      if (!canQueueBuild(state, facility.id, item)) continue;
      if (!best || slots > best.slots) best = { facilityId: facility.id, slots };
    }
  }
  return best?.facilityId;
}

/**
 * The opponent's officers.
 *
 * It keeps more than one of them at sea — a faction with five officers and one
 * on a boat is not playing — and it weighs courting an unaligned island against
 * stirring up one the player holds on the same scale, so an enemy island whose
 * governor is barely hanging on is worth a visit even when there are neutrals
 * left to woo.
 */
function aiMission(state: GameState, ai: PlayableFaction): void {
  const enemy = otherFaction(ai);
  const idle = state.characters
    .filter((c) => c.faction === ai && c.status === 'available')
    .sort((a, b) => b.diplomacy - a.diplomacy);
  if (idle.length === 0) return;

  // Unaligned worlds to court, and enemy worlds to stir up. An island it already
  // holds cannot be won again, so those are no use either way.
  const open = state.systems.filter(
    (s) => (s.control === 'neutral' || s.control === enemy) && isMissionTarget(s, ai),
  );
  if (open.length === 0) return;

  /**
   * What a trip is worth, on one scale for both kinds of work.
   *
   * Courting keeps a premium — an island won outright is worth more than one
   * merely made angry — but it is a premium and not a veto, which is the whole
   * difference: with a flat preference the opponent never incited anything.
   */
  const worth = (officer: Character, s: System) => {
    const home = state.systems.find((x) => x.id === officer.locationSystemId)?.sectorId;
    const close = s.sectorId === home ? AI_NEAR_BONUS : 0;
    if (s.control === 'neutral') return close + s.support[ai];
    // The weaker their hold, the nearer the uprising threshold, the better.
    return close + (100 - s.support[enemy]) - INCITE_PRIORITY_PENALTY;
  };

  const taken = new Set(
    state.characters
      .filter((c) => c.faction === ai && c.mission)
      .map((c) => c.mission!.targetSystemId),
  );

  // The best officer takes the best island, and so on down, so the opponent's
  // strongest diplomat is not left courting a backwater.
  for (const officer of idle.slice(0, AI_MISSION_PARTIES)) {
    const target = open
      .filter((s) => !taken.has(s.id) && canStartMission(state, officer.id, s.id))
      .sort((a, b) => worth(officer, b) - worth(officer, a))[0];
    if (!target) return;
    taken.add(target.id);
    startMission(state, officer.id, target.id);
  }
}

/**
 * The opponent's navy, in the same spirit as the rest of it: no plan beyond
 * the next order, but enough that the player faces sail rather than an empty
 * sea. It lays down hulls when it can spare the gold, takes companies aboard,
 * and sends fleets at the islands you earn most from.
 *
 * Every order goes through the same checks the player's do — the AI has no
 * private rules, so anything it can do, you can do.
 */
function aiFleet(state: GameState, ai: PlayableFaction, rng: Rng): void {
  aiLayDownHull(state, ai);

  for (const fleet of fleetsOf(state, ai)) {
    if (isAtSea(fleet)) continue;
    aiSignOn(state, fleet, ai);
    if (aiLandTroops(state, fleet, ai, rng)) continue;
    aiLoadAndSail(state, fleet, ai);
  }
}

/** One hull at a time, and never at the expense of the economy. */
function aiLayDownHull(state: GameState, ai: PlayableFaction): void {
  if (state.factions[ai].gold < AI_SHIP_RESERVE) return;
  const classes = shipsFor(ai);
  const afloat = fleetsOf(state, ai).flatMap((f) => f.ships);
  // Keep roughly two fighting hulls to every transport.
  const transports = afloat.filter((s) => s.classId === classes.find((c) => c.role === 'transport')!.id);
  const wantTransport = transports.length * 3 < afloat.length + 1;
  // Fighting hulls as big as it can afford; a transport when it is short of one.
  const affordable = classes
    .filter((c) => c.role !== 'transport')
    .filter((c) => shipSpec(c.id).costGold + AI_SHIP_RESERVE <= state.factions[ai].gold)
    .sort((a, b) => shipSpec(b.id).costGold - shipSpec(a.id).costGold);
  const pick = wantTransport
    ? classes.find((c) => c.role === 'transport')
    : (affordable[0] ?? classes.find((c) => c.role === 'small'));
  if (!pick) return;

  for (const system of state.systems) {
    if (system.control !== ai || system.uprising) continue;
    for (const facility of system.facilities) {
      if (facility.type !== 'shipyard' || facility.owner !== ai || facility.building) continue;
      if (!buildMenu(facility).includes(pick.id)) continue;
      if (!canQueueBuild(state, facility.id, pick.id)) continue;
      queueBuild(state, facility.id, pick.id);
      return;
    }
  }
}

/** Companies aboard and an island in reach that cannot hold: land them. */
function aiLandTroops(state: GameState, fleet: Fleet, ai: PlayableFaction, rng: Rng): boolean {
  if (fleet.troops === 0) return false;
  if (assaultError(state, fleet.id, ai) !== null) return false;
  const here = getSystem(state, fleet.systemId);
  // Only where it expects to win; a thrown-back landing is companies wasted.
  if (fleet.troops <= here.garrison) return false;
  assault(state, fleet.id, rng, ai);
  return true;
}

/** Take companies aboard where there are spare, then go and make a nuisance. */
function aiLoadAndSail(state: GameState, fleet: Fleet, ai: PlayableFaction): void {
  const here = getSystem(state, fleet.systemId);
  const room = fleetCapacity(fleet) - fleet.troops;
  if (room > 0 && here.control === ai) {
    // Leave enough ashore that the island does not rise the moment they sail.
    const spare = Math.max(0, here.garrison - 2);
    const take = Math.min(room, spare);
    if (take > 0 && embarkError(state, fleet.id, take, ai) === null) {
      embark(state, fleet.id, take, ai);
    }
  }

  // Somewhere worth going: an enemy island, richest first. With companies
  // aboard, prefer one it can actually carry.
  const enemy = otherFaction(ai);
  const targets = state.systems.filter((s) => s.control === enemy && s.populated);
  if (targets.length === 0) return;
  const worth = (s: System) =>
    s.facilities.filter((f) => f.owner === enemy).length * 10 -
    s.garrison * (fleet.troops > 0 ? 6 : 0);
  const target = [...targets].sort((a, b) => worth(b) - worth(a))[0];
  if (target.id === fleet.systemId) return;
  if (fleetGuns(fleet) === 0 && fleet.troops === 0) return; // nothing to offer
  if (sailError(state, fleet.id, target.id, ai) !== null) return;
  sailFleet(state, fleet.id, target.id, ai);
}

/**
 * One officer per fleet, the most useful crew member standing where she lies.
 * Without this the opponent would sail with nobody aboard and never scout,
 * never fight better and never carry a close landing — all three ratings would
 * be the player's alone.
 */
function aiSignOn(state: GameState, fleet: Fleet, ai: PlayableFaction): void {
  if (fleet.officerIds.length > 0) return;
  const worth = (c: { leadership: number; combat: number; espionage: number }) =>
    c.leadership + c.combat + c.espionage;
  const best = state.characters
    .filter((c) => boardError(state, fleet.id, c.id, ai) === null)
    .sort((a, b) => worth(b) - worth(a))[0];
  if (best) board(state, fleet.id, best.id, ai);
}
