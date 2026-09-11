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
  /**
   * An enemy fleet is lying off it and nothing is getting out. Always a real
   * boolean rather than an optional one: "absent" and "false" meaning the same
   * thing is the sort of ambiguity that goes wrong quietly later.
   */
  blockaded: boolean;
}

export type FacilityType =
  | 'mine'
  | 'refinery'
  | 'construction_yard'
  | 'training_facility'
  | 'shipyard';

/**
 * What a hull is for. The three roles are the whole of naval tactics here:
 * escorts are cheap and quick, capitals carry the guns, transports carry
 * companies and cannot fight.
 */
export type ShipRole = 'escort' | 'capital' | 'transport';

/** World bible section 6. Three classes a side to begin with. */
export type ShipClassId =
  | 'kestrel'
  | 'sovereign'
  | 'fluyt'
  | 'swift'
  | 'tempest'
  | 'brig';

export type BuildItem = FacilityType | 'troop' | ShipClassId;

export interface Ship {
  id: string;
  classId: ShipClassId;
  /** Damage taken. At or past the class's hull the ship is lost. */
  damage: number;
}

/**
 * A fleet is a container, as in the original: hulls, the companies aboard
 * them, and (later) the officers who command it, all in one thing that moves
 * as one thing. Where a ship is and what it is carrying is one fact.
 */
export interface Fleet {
  id: string;
  name: string;
  faction: PlayableFaction;
  /** Where it lies. While at sea, the island it sailed from. */
  systemId: string;
  ships: Ship[];
  /** Companies aboard, never more than the hulls can carry. */
  troops: number;
  /** Set only while at sea. */
  voyage?: { targetSystemId: string; daysRemaining: number };
}

export interface Facility {
  id: string;
  type: FacilityType;
  owner: Faction;
  building?: BuildOrder;
}

export interface BuildOrder {
  item: BuildItem;
  daysRemaining: number;
  costGold: number;
}

export interface Character {
  id: string;
  name: string;
  /** Which people they belong to. Display only — drives their portrait. */
  people?: string;
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
  /** The one currency. Everything is bought and paid for in it. */
  gold: number;
  /** What your producers earn in a day, at the allegiance they have now. */
  income: number;
  /** What everything you own costs to keep in a day. */
  upkeep: number;
  hqSystemId: string;
}

/**
 * What sort of thing happened. Set so anything downstream can react to the
 * meaning of an event rather than reading its prose: the sound the game makes
 * is chosen from this, and the feed could mark them too.
 */
export type EventKind =
  | 'war'      // the war beginning or ending
  | 'flip'     // an island changing hands, or being settled
  | 'mutiny'   // an island rising
  | 'order'    // something you ordered finishing
  | 'mission'  // a crew member departing, landing, or reporting
  | 'loss'     // something taken from you
  | 'battle';  // ships meeting at an island

export interface GameEvent {
  id: string;
  day: number;
  kind: EventKind;
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
  fleets: Fleet[];
  factions: { empire: FactionState; alliance: FactionState };
  events: GameEvent[];
  pendingDecisions: PendingMissionDecision[];
  /** Set once a victory condition trips; the clock stops afterwards. */
  winner?: PlayableFaction;
  rngSeed: number;
  /** Monotonic counter behind every generated id, so "newest" is well defined. */
  nextId: number;
}
