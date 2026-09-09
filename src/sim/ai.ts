import { AI_BUILD_INTERVAL, AI_MISSION_INTERVAL, YARD_BUILDS } from './constants';
import { buildMenu, canQueueBuild, queueBuild } from './build';
import { freeEnergySlots, freeRawSlots, otherFaction } from './helpers';
import { canStartMission, isDiplomacyTarget, startMission } from './missions';
import type { GameState, PlayableFaction, System } from './types';

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
export function runAI(state: GameState): void {
  const ai = otherFaction(state.player);
  if (state.day % AI_BUILD_INTERVAL === 0) aiBuild(state, ai);
  if (state.day % AI_MISSION_INTERVAL === 0) aiMission(state, ai);
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
