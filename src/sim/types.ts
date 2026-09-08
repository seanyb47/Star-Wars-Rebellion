/**
 * Core data model for Galactic Rebellion, Phase 1.
 *
 * Nothing in /sim may import React. The whole game is one plain JSON object
 * (`GameState`) so that saving is `JSON.stringify` and loading is `JSON.parse`.
 */

export type Faction = 'empire' | 'alliance' | 'neutral' | 'none';
export type PlayableFaction = 'empire' | 'alliance';

export type Speed = 'paused' | 'very_slow' | 'slow' | 'medium' | 'fast';

/** A Reach: a cluster of islands inside one of the Seven Seas. */
export interface Sector {
  id: string;
  name: string;
  /** The Sea this Reach belongs to. Display only. */
  sea: string;
  systemIds: string[];
  x: number;
  y: number;
}

/** An island. */
export interface System {
  id: string;
  name: string;
  /** A line of colour from the world bible, shown on the island sheet. */
  note?: string;
  sectorId: string;
  x: number;
  y: number;
  explored: { empire: boolean; alliance: boolean };
  populated: boolean;
  isCore: boolean;
  control: Faction;
  support: { empire: number; alliance: number };
  rawSlots: number;
  energySlots: number;
  facilities: Facility[];
  garrison: number;
  uprising: boolean;
}

export type FacilityType =
  | 'mine'
  | 'refinery'
  | 'construction_yard'
  | 'training_facility'
  | 'shipyard';

export type BuildItem = FacilityType | 'troop';

export interface Facility {
  id: string;
  type: FacilityType;
  owner: Faction;
  building?: BuildOrder;
}

export interface BuildOrder {
  item: BuildItem;
  daysRemaining: number;
  costRefined: number;
}

export interface Character {
  id: string;
  name: string;
  faction: Faction;
  diplomacy: number;
  espionage: number;
  combat: number;
  leadership: number;
  locationSystemId: string;
  status: 'available' | 'on_mission' | 'injured' | 'captured';
  /** Days left of an `injured` status. Absent when not injured. */
  injuredDays?: number;
  mission?: Mission;
}

export interface Mission {
  type: 'diplomacy';
  targetSystemId: string;
  phase: 'travelling' | 'working';
  daysRemaining: number;
}

export interface FactionState {
  raw: number;
  refined: number;
  maintenanceCapacity: number;
  maintenanceUsed: number;
  hqSystemId: string;
  /** Consecutive days spent over maintenance capacity (scrapping starts at 5). */
  overCapacityDays: number;
}

export interface GameEvent {
  id: string;
  day: number;
  text: string;
  systemId?: string;
  characterId?: string;
}

/**
 * A resolved diplomacy mission waiting on the player's "continue or return"
 * answer (spec 4.5). The AI answers its own immediately, so this only ever
 * holds the human player's characters.
 */
export interface PendingMissionDecision {
  characterId: string;
  systemId: string;
  success: boolean;
}

export interface GameState {
  day: number;
  speed: Speed;
  player: PlayableFaction;
  sectors: Sector[];
  systems: System[];
  characters: Character[];
  factions: { empire: FactionState; alliance: FactionState };
  events: GameEvent[];
  pendingDecisions: PendingMissionDecision[];
  /** Set once a victory condition trips; the clock stops afterwards. */
  winner?: PlayableFaction;
  rngSeed: number;
  /** Monotonic counter behind every generated id, so "newest" is well defined. */
  nextId: number;
}
