import { GARRISON_FOR_BAND, SPILLOVER_FRACTION, loyaltyBand } from './constants';
import type {
  Deposit,
  Faction,
  FacilityType,
  ResourceType,
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

/**
 * Room left to build on. Everything standing takes one berth, whatever it is,
 * and an order still on its way has already taken its own (it stands from the
 * day it is ordered).
 */
/**
 * Berths with nothing on them: no building, and nothing in the ground either.
 *
 * A deposit stands in a berth until something is built on it. That is what
 * makes a forested island a different place from a bare one — the trees are
 * taking the room, and the only thing that can have that room is the mill that
 * cuts them.
 */
export function freeSlots(system: System): number {
  return system.slots - system.facilities.length - depositsOf(system).length;
}

/**
 * The island changes hands, and so does everything standing on it.
 *
 * Nothing did this before, and it went unnoticed while an island's worth was
 * berths you could build on: you took the place, built your own works on what
 * was left, and the old holder's mills sat there earning nobody anything.
 *
 * With resources in the ground it is not survivable. A captured island's mills
 * stand on forests that have already been cut — so the works earn nothing, the
 * ground they stand on is spent, and the island is barren for ever. Taking a
 * developed island has to mean taking what is on it, which is also what the
 * defences have always done: a seawall fires for whoever holds the island,
 * never for whoever paid for it.
 *
 * Anything still being built is lost. The builders scatter when the boats come
 * in, and inheriting a stranger's half-finished slipway is stranger than
 * losing it. A works that exists only as an order — a yard being laid down on
 * bare ground — goes with it.
 */
export function handOver(system: System, to: Faction): void {
  system.facilities = system.facilities
    .filter((facility) => !facility.founding)
    .map((facility) => (facility.building ? { ...facility, building: undefined } : facility))
    .map((facility) => ({ ...facility, owner: to }));
}

/** What is in this island's ground, unworked. Always an array. */
export function depositsOf(system: System): Deposit[] {
  return system.deposits ?? [];
}

/** How many of one kind of deposit are standing unworked here. */
export function depositsLeft(system: System, type: ResourceType): number {
  return depositsOf(system).filter((d) => d.type === type).length;
}

/**
 * Put a deposit back in the ground.
 *
 * Called when the works standing on one comes down — to bombardment, to a
 * landing, or to nobody paying for it. The forest was there before the mill and
 * it is there after: a long war should not quietly grind the world down to bare
 * rock that can never earn again.
 */
export function returnDeposit(state: GameState, system: System, type: ResourceType): void {
  system.deposits = [...depositsOf(system), { id: nextId(state, 'dep'), type }];
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
/**
 * Allegiance is a balance, not two opinions.
 *
 * Every island's regard for the two sides adds up to a hundred: there is no
 * undecided middle to win over first, so a point one side gains is a point
 * the other loses. Setting one number therefore sets both, and this is the
 * only place in the game that writes either of them.
 */
export function setSupport(system: System, faction: PlayableFaction, value: number): void {
  const mine = clampSupport(value);
  system.support[faction] = mine;
  system.support[otherFaction(faction)] = 100 - mine;
}

/** Move the balance by a signed amount, and report what actually moved. */
export function shiftSupport(system: System, faction: PlayableFaction, delta: number): number {
  const before = system.support[faction];
  setSupport(system, faction, before + delta);
  return system.support[faction] - before;
}

export function applySupportChange(
  state: GameState,
  system: System,
  faction: PlayableFaction,
  delta: number,
): number {
  const applied = shiftSupport(system, faction, delta);

  const spill = delta * SPILLOVER_FRACTION;
  if (spill === 0) return applied;

  for (const other of state.systems) {
    if (other.id === system.id) continue;
    if (other.sectorId !== system.sectorId) continue;
    if (!other.populated) continue;
    shiftSupport(other, faction, spill);
  }
  return applied;
}

/**
 * Companies needed to hold an island down: nothing on one that is firmly
 * yours, a token on a steady one, four where allegiance is thin and six to
 * face down a revolt (spec 4.3, and Sean's ladder of 15 September).
 */
export function requiredGarrison(support: number, uprising = false): number {
  return GARRISON_FOR_BAND[loyaltyBand(support, uprising)];
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
