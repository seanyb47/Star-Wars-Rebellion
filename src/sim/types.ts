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
  /**
   * What the painting calls this place, when the game has renamed it. Freeport
   * takes over a different island every game and keeps that island's position,
   * outline and room; this is how the chart still finds it.
   */
  chartName?: string;
  sectorId: string;
  x: number;
  y: number;
  explored: { empire: boolean; alliance: boolean };
  populated: boolean;
  isCore: boolean;
  control: Faction;
  support: { empire: number; alliance: number };
  /**
   * Room to build, and the whole of it. There used to be two pools — ground
   * for camps, water for everything else — which asked the player to hold two
   * numbers per island to answer one question: can I put this here. One
   * number answers it.
   */
  slots: number;
  facilities: Facility[];
  garrison: number;
  uprising: boolean;
  /**
   * An enemy fleet is lying off it and nothing is getting out. Always a real
   * boolean rather than an optional one: "absent" and "false" meaning the same
   * thing is the sort of ambiguity that goes wrong quietly later.
   */
  blockaded: boolean;
  /**
   * What is in the water here, as a creature slug — set only on islands of the
   * unexplored Reaches, and on most of those not at all. Written at worldgen
   * and never changed, so the answer is the same all game.
   */
  beast?: string;
  /**
   * Which side has actually seen it. Charting an island is not seeing it: this
   * turns true when that side's hull comes to anchor off the island and the
   * boats go ashore, and nothing else sets it.
   */
  beastSeen?: { empire: boolean; alliance: boolean };
  /** Hits it has taken. At its `hull` it is dead and stops fighting. */
  beastDamage?: number;
  /** Killed, and by whom. A dead creature stays on the island's record. */
  beastSlain?: Faction;
  /**
   * It has stopped staying put. A creature begins the war in one island's
   * water and is a hazard of going there; once the rumours start it hunts
   * instead, moving about its own Sea, and can be met where nobody expected
   * it. Set by the rumour that wakes it, or by taking enough hurt to run.
   */
  beastRoaming?: boolean;
  /** Hurt, tried to break off, and found the whole Sea shut to it. Carried so
   *  the log says so once rather than every day it goes on being true. */
  cornered?: boolean;
  /**
   * The order the player has put the garrison's kinds in, if they have. A
   * company has no identity of its own to move — the garrison is a count and
   * a roster read off it — so what is remembered is which kind comes first.
   */
  garrisonOrder?: string[];
  /**
   * The officer holding this island, if one has been posted to it.
   *
   * A posting rather than an errand: they arrive, they stay, and they are not
   * available for anything else until relieved. What it buys is order — an
   * island with a commander on it does not rise, and a stranger asking
   * questions in its harbor is far likelier to be found out.
   */
  commanderId?: string;
}

export type FacilityType =
  | 'mine'
  | 'refinery'
  | 'construction_yard'
  | 'training_facility'
  | 'shipyard'
  /** A fixed gun in the harbor: a warship that cannot weigh anchor. */
  | 'fort'
  /** A chain across the harbor mouth: landings and blockades both find it. */
  | 'boom';

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
  | 'brig'
  /** The Pirate Lords' own ships: one hull each, never built. */
  | 'harbor'
  | 'swallowtail'
  | 'ironback';

/** What a Pirate Lord's ship does that no other hull does. */
export type LordPower = 'moot' | 'runner' | 'line';

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
  /**
   * A works being laid down on an island that had none. It stands in its slot
   * from the day it is ordered, with its own build order counting down; when
   * that finishes it is simply done, rather than producing a second works.
   */
  founding?: true;
}

export interface BuildOrder {
  item: BuildItem;
  daysRemaining: number;
  costGold: number;
  /**
   * Where the thing lands when it is done, when that is not the island it is
   * made on: a company drilled here and shipped there, a hull that sails to
   * its station, builders sent to raise a camp on an island with no works.
   * The passage is counted into the days.
   */
  destinationId?: string;
}

export interface Character {
  id: string;
  name: string;
  /** Which people they belong to. Display only — drives their portrait. */
  people?: string;
  /** A line on who they are. Everyone carries it now, not only the unaligned:
   *  it is the reason to care which of your seven you send, and it was sitting
   *  unused in the roster while the crew screen showed four numbers instead. */
  blurb?: string;
  /** What they are called besides their name — "the Old Tide". */
  epithet?: string;
  /** What they are for, in the world bible's own words: Tidemaster, Leader,
   *  Recruiter. Display only; the ratings are what the rules read. */
  roles?: string[];
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
  /**
   * The officer whose errand this one is along on. Set on a companion for as
   * long as the errand lasts; the leader holds the Mission itself.
   */
  escorting?: string;
}

/**
 * What a character is doing ashore. Phase 3's full set is recorded in the
 * build spec; these are the ones that exist. They share a passage, fifteen
 * days of work and a foil check, and the island decides between them: who
 * holds it, and who happens to be standing on it.
 */
export type MissionType =
  | 'diplomacy'
  | 'incite'
  | 'recruit'
  | 'sabotage'
  | 'survey'
  | 'abduct'
  | 'command'
  | 'research'
  | 'rescue';

export interface Mission {
  type: MissionType;
  targetSystemId: string;
  /** For a Command posting to a squadron rather than to the island itself. */
  targetFleetId?: string;
  phase: 'travelling' | 'working';
  daysRemaining: number;
  /**
   * Who else went. Only the officer leading an errand carries the Mission;
   * the rest of the boat carry `escorting` pointing back at them, so the
   * day's tick resolves one errand however many people are on it.
   */
  party?: string[];
}

export interface FactionState {
  /** The one currency. Everything is bought and paid for in it. */
  gold: number;
  /** What your producers earn in a day, at the allegiance they have now. */
  income: number;
  /** What everything you own costs to keep in a day. */
  upkeep: number;
  /**
   * The Crown's is Highwater, always, and losing it loses the war. The
   * Confederacy has no seat: this is only where its people go home to —
   * wherever the Free Harbor lies, failing her another Lord's ship, failing
   * that the island that loves them best — and is kept in step every day.
   */
  hqSystemId: string;
  /**
   * Shipwright craft: how far this side's yards have come, 0 upward.
   *
   * The one thing research produces, and deliberately the only one. A tier
   * tree is a Phase 4 job; a single number that makes hulls cheaper and
   * quicker gives the R&D errand something real to do today without inventing
   * a system that then has to be lived with.
   */
  craft: number;
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

/** What each side brought to an action at sea, and what it cost them. */
export interface BattleReport {
  sides: Record<PlayableFaction, { hulls: number; lost: number; guns: number }>;
  /** The harbor's own guns, and whose harbor it is. */
  shore: number;
  holder: Faction;
}

/** A landing: who went ashore against whom, and how it ended. */
export interface LandingReport {
  attacker: PlayableFaction;
  landed: number;
  defenders: number;
  /** Chain across the harbor mouth, counted among the defenders. */
  boom: number;
  lost: number;
  defendersLost: number;
  taken: boolean;
}

export interface GameEvent {
  id: string;
  day: number;
  kind: EventKind;
  text: string;
  systemId?: string;
  characterId?: string;
  /** The tally behind an action at sea, for the card to lay out. */
  battle?: BattleReport;
  /** The tally behind a landing. */
  landing?: LandingReport;
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
