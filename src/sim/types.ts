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
/**
 * What an island looks like, which decides which painting it shows.
 *
 * Ten of them cover a hundred islands, and that is the point: an island does
 * not need its own painting, it needs to look like the kind of place it is.
 * Assigned once at generation from the Sea it sits in, so Rime Reach is ice and
 * rock and the Bone Sea is drowned temples, and it never changes afterwards.
 */
export type IslandArchetype =
  | 'jungle-isle'
  | 'rock-isle'
  | 'port-city'
  | 'free-harbor'
  | 'mining-isle'
  | 'reef-isle'
  | 'storm-isle'
  | 'ice-isle'
  | 'drowned-isle'
  | 'tide-isle';

export interface System {
  id: string;
  name: string;
  /** Which of the ten island paintings this one wears. */
  archetype: IslandArchetype;
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
 * A hull's size, which is the whole of naval tactics here. There are no
 * fighters and there will not be: a small craft is just a small ship, so the
 * range runs small to large with a transport off to one side, and each size
 * is genuinely good at something and genuinely bad at something else.
 *
 * Small is fast and cheap and dies quickly. Large hits hardest and takes the
 * most killing, and is slow enough that it arrives after the fighting starts.
 * Medium is the compromise. A transport cannot fight at all and carries more
 * than anything else afloat.
 */
export type ShipRole = 'small' | 'medium' | 'large' | 'transport';

/** World bible section 6. Four classes a side, none needing research. */
export type ShipClassId =
  | 'kestrel'
  | 'razorback'
  | 'sovereign'
  | 'fluyt'
  | 'swift'
  | 'tempest'
  | 'reef'
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
  /**
   * Crew serving with the fleet. Their island is wherever the fleet is, and
   * the best Leadership among them tells in a fight, the best Combat in a
   * landing — which is what those ratings are for, and until now they were
   * generated, displayed and used by nothing.
   */
  officerIds: string[];
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
  /** A line on who they are. Carried by the unaligned people you can sign on,
   *  because a name on an island tells you nothing about whether to sail. */
  blurb?: string;
  /** For the unaligned: the day they turn up somewhere worth finding. They are
   *  in the world from the start so the seed decides them once, but they are
   *  nobody's to sign before this. Absent for anyone already in the war. */
  appearsOnDay?: number;
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

/**
 * What a character is doing ashore. Phase 3's full set is recorded in the
 * build spec; these are the ones that exist. They share a passage, fifteen
 * days of work and a foil check, and the island decides between them: who
 * holds it, and who happens to be standing on it.
 */
export type MissionType = 'diplomacy' | 'incite' | 'recruit' | 'sabotage' | 'survey';

export interface Mission {
  type: MissionType;
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
