import { SPILLOVER_FRACTION } from './constants';
import type {
  Faction,
  FacilityType,
  GameEvent,
  GameState,
  PlayableFaction,
  System,
} from './types';

export function otherFaction(faction: PlayableFaction): PlayableFaction {
  return faction === 'empire' ? 'alliance' : 'empire';
}

export function nextId(state: GameState, prefix: string): string {
  state.nextId += 1;
  return `${prefix}-${state.nextId}`;
}

export function findSystem(state: GameState, systemId: string): System | undefined {
  return state.systems.find((s) => s.id === systemId);
}

export function getSystem(state: GameState, systemId: string): System {
  const system = findSystem(state, systemId);
  if (!system) throw new Error(`Unknown system: ${systemId}`);
  return system;
}

export function getCharacter(state: GameState, characterId: string) {
  const character = state.characters.find((c) => c.id === characterId);
  if (!character) throw new Error(`Unknown character: ${characterId}`);
  return character;
}

export function systemsInSector(state: GameState, sectorId: string): System[] {
  return state.systems.filter((s) => s.sectorId === sectorId);
}

export function sectorOf(state: GameState, systemId: string): string {
  return getSystem(state, systemId).sectorId;
}

export function clampSupport(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function countFacilities(system: System, type: FacilityType, owner: Faction): number {
  return system.facilities.filter((f) => f.type === type && f.owner === owner).length;
}

/** Slots taken by mines. Mines occupy raw slots; everything else occupies energy slots. */
export function usedRawSlots(system: System): number {
  return system.facilities.filter((f) => f.type === 'mine').length;
}

export function usedEnergySlots(system: System): number {
  return system.facilities.filter((f) => f.type !== 'mine').length;
}

export function freeRawSlots(system: System): number {
  return system.rawSlots - usedRawSlots(system);
}

export function freeEnergySlots(system: System): number {
  return system.energySlots - usedEnergySlots(system);
}

export function freeSlots(system: System): number {
  return freeRawSlots(system) + freeEnergySlots(system);
}

export function factionSystems(state: GameState, faction: Faction): System[] {
  return state.systems.filter((s) => s.control === faction);
}

export function pushEvent(state: GameState, event: Omit<GameEvent, 'id' | 'day'>): void {
  state.events.push({ id: nextId(state, 'evt'), day: state.day, ...event });
}

/**
 * Apply a support change to a system, then spill 20% of that change over every
 * other populated system in the same sector (spec 4.3).
 *
 * Returns the actual delta applied to the target system after clamping.
 */
export function applySupportChange(
  state: GameState,
  system: System,
  faction: PlayableFaction,
  delta: number,
): number {
  const before = system.support[faction];
  system.support[faction] = clampSupport(before + delta);
  const applied = system.support[faction] - before;

  const spill = delta * SPILLOVER_FRACTION;
  if (spill === 0) return applied;

  for (const other of state.systems) {
    if (other.id === system.id) continue;
    if (other.sectorId !== system.sectorId) continue;
    if (!other.populated) continue;
    other.support[faction] = clampSupport(other.support[faction] + spill);
  }
  return applied;
}

/** Garrison needed to hold a restless world down (spec 4.3). */
export function requiredGarrison(support: number): number {
  return Math.max(0, Math.ceil((50 - support) / 10));
}

/** Mine output scales with how loyal the populace is (spec 4.2.1). */
export function supportMultiplier(support: number): number {
  return 0.5 + support / 200;
}

export function isPlayable(faction: Faction): faction is PlayableFaction {
  return faction === 'empire' || faction === 'alliance';
}

/** Deep clone that keeps `GameState` a plain JSON object. */
export function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}
