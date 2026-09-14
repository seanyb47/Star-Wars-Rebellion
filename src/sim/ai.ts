import {
  AI_BUILD_INTERVAL,
  AI_FLEET_INTERVAL,
  AI_MISSION_INTERVAL,
  AI_MISSION_PARTIES,
  AI_NEAR_BONUS,
  AI_RECRUIT_BONUS,
  AI_SHIP_RESERVE,
  AI_TROOP_POOL,
  INCITE_PRIORITY_PENALTY,
  TROOP_BUILD,
  UPKEEP_PER_DAY,
  YARD_BUILDS,
  shipSpec,
  shipsFor,
} from './constants';
import { buildMenu, canQueueBuild, foundWorks, foundWorksError, queueBuild } from './build';
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
import {
  canStartMission,
  isMissionTarget,
  isRecruitTarget,
  quality,
  recruitOn,
  startMission,
  captiveOn,
} from './missions';
import type { Rng } from './rng';
import type {
  Character,
  FacilityType,
  Fleet,
  ShipClassId,
  GameState,
  PlayableFaction,
  System,
} from './types';

/**
 * Deliberately simple opponent (spec 4.7): keep the mine/refinery count level,
 * and keep the best diplomat working the most promising world.
 */
/**
 * What the opponent clears a day after everything it owns is paid for.
 *
 * The upkeep ceiling. Measured over a year of play the opponent used to run
 * its treasury dry by day 180 on either side — every island it took added
 * a garrison to feed, every hull a crew, and nothing ever asked whether the
 * ledger could carry it. It won land-grabs while bankrupt, with its works
 * falling down behind it. So: nothing that costs upkeep is ordered unless
 * the surplus can carry it with room to spare, and when the surplus is thin
 * the only thing it builds is an earner.
 */
function surplus(state: GameState, ai: PlayableFaction): number {
  const f = state.factions[ai];
  // Orders still on the stocks are wages not yet on the ledger. Without
  // counting them, six orders in one tick each saw the same surplus and the
  // opponent committed to more than it could carry.
  let pending = 0;
  for (const system of state.systems) {
    for (const facility of system.facilities) {
      if (facility.owner === ai && facility.building && !facility.founding) {
        pending += UPKEEP_PER_DAY[facility.building.item];
      }
    }
  }
  return f.income - f.upkeep - pending;
}
/** Kept clear over and above whatever the next order will cost to run. */
const AI_SURPLUS_MARGIN = 3;
/** Orders the opponent may place in one build tick, gold permitting. */
const AI_ORDERS_PER_TICK = 3;
/**
 * Above this the opponent is hoarding, not saving: by day 400 it sat on
 * thousands of gold with no cadence to spend it. Rich, it places twice the
 * orders a tick and lays down a hull at every free slipway rather than one.
 */
const AI_RICH = 600;

export function runAI(state: GameState, rng: Rng): void {
  const ai = otherFaction(state.player);
  if (state.day % AI_BUILD_INTERVAL === 0) {
    // More than one order a tick. One every five days could not keep up
    // with a war that hands the opponent an island a week, each with a
    // garrison to feed: the earners it needed sat unordered behind the
    // cadence, not the treasury. It keeps ordering while it has the gold
    // and something to order, a few at a time.
    const orders = state.factions[ai].gold > AI_RICH ? AI_ORDERS_PER_TICK * 2 : AI_ORDERS_PER_TICK;
    for (let n = 0; n < orders; n++) {
      if (!aiBuild(state, ai)) break;
    }
  }
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
function aiBuild(state: GameState, ai: PlayableFaction): boolean {
  const gold = state.factions[ai].gold;
  const held = state.systems.filter((s) => s.control === ai && !s.uprising);
  const spare = surplus(state, ai);
  const canCarry = (item: FacilityType | 'troop') =>
    spare - UPKEEP_PER_DAY[item] >= AI_SURPLUS_MARGIN;
  // A thin surplus is spent on earners before anything that eats: islands
  // taken and won over keep adding garrisons to the bill, and the only
  // answer to that is income.
  const thin = spare < AI_SURPLUS_MARGIN * 2;

  // 1. Companies. A drill ground raises them on its own island and nowhere
  //    else, so this works outward from the drill grounds rather than from the
  //    islands that are short — the short ones usually have no drill ground on
  //    them, which is exactly why an earlier version of this never drilled at
  //    all. Each keeps what holds its island quiet plus a small pool, because
  //    an opponent with no spare companies can never land on anything.
  if (!thin && gold >= TROOP_BUILD.costGold && canCarry('troop')) {
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
        return true;
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
  else if (countOf('shipyard') < 3 && gold > AI_RICH * 2) wanted.push('shipyard');
  // Rich, it also fortifies: a battery on each held port that has none, so a
  // treasury with nothing to buy turns into something a raider has to reckon with.
  if (gold > AI_RICH * 2 && countOf('fort') < Math.ceil(held.length / 3)) wanted.push('fort');

  for (const item of wanted) {
    if (thin || gold < YARD_BUILDS[item].costGold || !canCarry(item)) continue;
    const spot = bestSpotFor(state, ai, item);
    if (spot) {
      queueBuild(state, spot, item);
      return true;
    }
  }

  // 3. Otherwise grow the economy, keeping the two earners level as before.
  const item = countOf('mine') <= countOf('refinery') ? 'mine' : 'refinery';
  if (gold < YARD_BUILDS[item].costGold) return false;
  const spot = bestSpotFor(state, ai, item);
  if (spot) {
    queueBuild(state, spot, item);
    return true;
  }

  // 4. No works with ground left beside it: lay one down on the held island
  //    with the most room, so the next earner has somewhere to go. This is
  //    what used to stop the opponent dead the day its starting islands
  //    filled — every island it took after that was a garrison bill and
  //    nothing else.
  if (gold < YARD_BUILDS.construction_yard.costGold || !canCarry('construction_yard')) return false;
  const open = held
    .filter((s) => foundWorksError(state, s.id, ai) === null)
    .sort((a, b) => freeRawSlots(b) + freeEnergySlots(b) - (freeRawSlots(a) + freeEnergySlots(a)));
  if (open.length > 0 && freeRawSlots(open[0]) + freeEnergySlots(open[0]) >= 3) {
    foundWorks(state, open[0].id, ai);
    return true;
  }
  return false;
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
 * on a boat is not playing — and it weighs all three errands on the same scale,
 * so an enemy island whose governor is barely hanging on is worth a visit even
 * when there are neutrals left to woo, and somebody worth signing on outranks
 * both. Otherwise the player would have the run of the unaligned.
 */
function aiMission(state: GameState, ai: PlayableFaction): void {
  const enemy = otherFaction(ai);
  const idle = state.characters
    .filter((c) => c.faction === ai && c.status === 'available')
    .sort((a, b) => b.diplomacy - a.diplomacy);
  if (idle.length === 0) return;

  // Unaligned islands to court, enemy islands to stir up, and anywhere at all
  // with somebody standing on it worth signing on — its own ground included,
  // which is the one reason it has to send anyone to an island it already holds.
  const open = state.systems.filter(
    (s) =>
      isMissionTarget(state, s, ai) &&
      (s.control === 'neutral' || s.control === enemy || isRecruitTarget(state, s, ai)),
  );
  if (open.length === 0) return;

  /**
   * What a trip is worth, on one scale for all three errands.
   *
   * Courting keeps a premium over inciting — an island won outright is worth
   * more than one merely made angry — but it is a premium and not a veto, which
   * is the whole difference: with a flat preference the opponent never incited
   * anything. A person outranks either, because people are scarce and permanent
   * and an island can be worked again next month.
   */
  const worth = (officer: Character, s: System) => {
    const home = state.systems.find((x) => x.id === officer.locationSystemId)?.sectorId;
    const close = s.sectorId === home ? AI_NEAR_BONUS : 0;
    const recruit = recruitOn(state, s, ai);
    if (recruit) return close + AI_RECRUIT_BONUS + quality(recruit);
    // One of its own in the enemy's cells: worth more than any island.
    const held = captiveOn(state, s, ai);
    if (held) return close + AI_RECRUIT_BONUS + quality(held);
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
  const spare = surplus(state, ai);
  const carried = (id: ShipClassId) => spare - UPKEEP_PER_DAY[id] >= AI_SURPLUS_MARGIN;
  const affordable = classes
    .filter((c) => c.role !== 'transport')
    .filter((c) => carried(c.id))
    .filter((c) => shipSpec(c.id).costGold + AI_SHIP_RESERVE <= state.factions[ai].gold)
    .sort((a, b) => shipSpec(b.id).costGold - shipSpec(a.id).costGold);
  const pick = wantTransport
    ? classes.find((c) => c.role === 'transport')
    : (affordable[0] ?? classes.find((c) => c.role === 'small'));
  if (!pick || !carried(pick.id)) return;

  // One hull, or — with gold to burn — one at every slipway standing idle.
  let laid = 0;
  for (const system of state.systems) {
    if (system.control !== ai || system.uprising) continue;
    for (const facility of system.facilities) {
      if (facility.type !== 'shipyard' || facility.owner !== ai || facility.building) continue;
      if (!buildMenu(facility).includes(pick.id)) continue;
      if (!canQueueBuild(state, facility.id, pick.id)) continue;
      if (laid > 0 && state.factions[ai].gold < AI_RICH + shipSpec(pick.id).costGold) return;
      if (laid > 0 && surplus(state, ai) - UPKEEP_PER_DAY[pick.id] < AI_SURPLUS_MARGIN) return;
      queueBuild(state, facility.id, pick.id);
      laid += 1;
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
