import {
  AI_BUILD_INTERVAL,
  AI_FLEET_INTERVAL,
  AI_MISSION_INTERVAL,
  AI_SHIP_RESERVE,
  YARD_BUILDS,
  shipSpec,
  shipsFor,
} from './constants';
import { buildMenu, canQueueBuild, queueBuild } from './build';
import {
  assault,
  assaultError,
  embark,
  embarkError,
  fleetCapacity,
  fleetGuns,
  fleetsOf,
  isAtSea,
  sailError,
  sailFleet,
} from './fleets';
import { freeEnergySlots, freeRawSlots, getSystem, otherFaction } from './helpers';
import { canStartMission, isDiplomacyTarget, startMission } from './missions';
import type { Rng } from './rng';
import type { Fleet, GameState, PlayableFaction, System } from './types';

function ownedFacilityCount(state: GameState, faction: PlayableFaction, type: 'mine' | 'refinery') {
  let total = 0;
  for (const system of state.systems) {
    if (system.control !== faction) continue;
    total += system.facilities.filter((f) => f.type === type && f.owner === faction).length;
  }
  return total;
}

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

function aiBuild(state: GameState, ai: PlayableFaction): void {
  const mines = ownedFacilityCount(state, ai, 'mine');
  const refineries = ownedFacilityCount(state, ai, 'refinery');
  const item = mines <= refineries ? 'mine' : 'refinery';
  if (state.factions[ai].gold < YARD_BUILDS[item].costGold) return;

  // The held island with the most room to grow gets the new works.
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
  if (best) queueBuild(state, best.facilityId, item);
}

function aiMission(state: GameState, ai: PlayableFaction): void {
  const diplomat = state.characters
    .filter((c) => c.faction === ai && c.status === 'available')
    .sort((a, b) => b.diplomacy - a.diplomacy)[0];
  if (!diplomat) return;

  const homeSector = state.systems.find((s) => s.id === diplomat.locationSystemId)?.sectorId;
  // Only unaligned worlds are worth courting: an island already held cannot be
  // won again, and an enemy island cannot be talked over in phase 1.
  const eligible = state.systems.filter(
    (s) =>
      s.control === 'neutral' &&
      isDiplomacyTarget(s, ai) &&
      canStartMission(state, diplomat.id, s.id),
  );
  if (eligible.length === 0) return;

  // The unaligned island in its own Reach with the most sympathy, falling back to
  // the best unaligned island anywhere so the opponent never sits idle.
  const rank = (s: System) => (s.sectorId === homeSector ? 200 : 0) + s.support[ai];
  const target = eligible.sort((a, b) => rank(b) - rank(a))[0];
  startMission(state, diplomat.id, target.id);
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
