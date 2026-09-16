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
  /**
   * What is in the ground here and not yet worked. Each one stands in a berth
   * until something is built on it, and comes back if that something is ever
   * knocked down — the mill burns, the trees are still there.
   *
   * Optional only so a save written before resources existed still loads; the
   * world always writes it.
   */
  deposits?: Deposit[];
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
  /**
   * Days this island's own town has been shelled.
   *
   * Only counts shot that went past the walls looking for the garrison, which
   * is the only kind that touches the people. Never cleared: a town remembers,
   * and each further day of it costs the bombarding side more than the last.
   */
  shelled?: number;
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

/**
 * What an island has in the ground, before anybody works it.
 *
 * Sean's rule, 16 September: *"All islands should have raw resources on them.
 * Forests, gold. These should be randomly assigned to each island and Lumber
 * Mills and Gold Mines can only be deployed on them. They replace the raw
 * resource. Because it doesn't make sense that you can just put gold mines
 * anywhere and print money."*
 *
 * Forests are common and gold is rare, which is the whole shape of it: timber
 * is what an ordinary island is worth, and a vein of gold is a thing worth
 * sailing a war across.
 */
export type ResourceType = 'forest' | 'gold';

/**
 * One deposit, standing in a berth of its own.
 *
 * It takes room the way a building does, and the building that works it takes
 * the deposit's own berth rather than another — so raising a mill on a forest
 * costs no room at all, and an island's total built never exceeds its plots.
 */
export interface Deposit {
  id: string;
  type: ResourceType;
}

export type FacilityType =
  | 'mine'
  | 'refinery'
  | 'construction_yard'
  | 'training_facility'
  | 'shipyard'
  /** A fixed gun in the harbor: a warship that cannot weigh anchor. */
  | 'fort'
  /**
   * The same wall built twice over, on one plot.
   *
   * Sean, 16 September, handing over two paintings: *"One is a Fortress the
   * other is an Advanced Fortress... Let's call them Fortress and Heavy
   * Fortress. The one with bigger fort and more guns is heavy fortress."*
   *
   * A second tier rather than an upgrade in place, which was his call. What
   * makes it a decision and not simply the better building is the berth: it
   * gives more than twice a Fortress's guns and two and a half times its
   * stone on the one plot, and charges slightly more per gun and per day of
   * upkeep for the privilege. Land-poor and rich, you build this. Land-rich
   * and thrifty, you build two Fortresses.
   */
  | 'heavy_fort'
;

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

/** How far a side's shipwrights have got: nothing, then three grades. */
export type ShipGrade = 0 | 1 | 2 | 3;

/**
 * Every hull in the game, from the Naval Art Master roster.
 *
 * Four a side can be laid down from the first morning; the rest wait on the
 * shipwrights. The Crown improves families it already trusts and announces it
 * with green sails — a **II** is the same design taken further, not a new one.
 * The Confederacy has no II programme by rule, so where the Crown refines, it
 * finds another answer: a corvette built round a boarding action, a whaler
 * with the ice-frames still in her, a cruiser cut to one captain's taste.
 */
export type ShipClassId =
  // --- Crown Imperium ---
  | 'kestrel'
  | 'kestrel-ii'
  | 'razorback'
  | 'razorback-ii'
  | 'bulwark'
  | 'vanguard'
  | 'vanguard-ii'
  | 'sovereign'
  | 'sovereign-ii'
  | 'majestic'
  | 'fluyt'
  | 'fluyt-ii'
  // --- Free Confederacy ---
  | 'swift'
  | 'cutlass'
  | 'tempest'
  | 'marauder'
  | 'freebooter'
  | 'brig'
  | 'reef'
  | 'urskin-whaler'
  | 'reefwalker'
  /** The Pirate Lords' ships. Legends: named in the lore, never on the water. */
  | 'harbor'
  | 'swallowtail'
  | 'ironback';

/** What a Pirate Lord does that nobody else in the war can. */
export type LordPower = 'moot' | 'runner' | 'line';

export type BuildItem = FacilityType | 'troop' | ShipClassId;

export interface Ship {
  id: string;
  classId: ShipClassId;
  /**
   * Damage taken. At or past the class's hull the ship is lost.
   *
   * Fractional, because a hull mends by a percentage of itself each day and a
   * sloop's one per cent is nine hundredths of a point. Rounded wherever it is
   * shown; never rounded in the arithmetic, or a sloop would mend nothing for
   * eleven days and then a whole point at once.
   */
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
  /**
   * Standing orders to bombard the island she lies off.
   *
   * A day's bombardment is a day, not a round, so this is a state the squadron
   * is in rather than a button pressed every morning — the same shape as a
   * voyage. It ends when the walls fall, when the player says so, or when
   * anything happens that makes it impossible.
   */
  bombarding?: true;
}

export interface Facility {
  id: string;
  type: FacilityType;
  owner: Faction;
  /**
   * What has been knocked off a fort, for works that can be shot at.
   *
   * Only forts carry it. A fort used to be twenty guns that simply could not
   * be damaged — it either stood or had never been built — which was fine
   * while nothing could shoot at the land. Now the wall has a condition, its
   * gunnery falls with it, and at its full strength in damage it is rubble.
   */
  damage?: number;
  building?: BuildOrder;
  /**
   * Older than the Imperium, and not on anybody's books.
   *
   * The seawalls the world opens with. The bible has always said Highwater's
   * are older than the Crown that shelters behind them, which makes them part
   * of the city rather than a work somebody is paying to keep — and the point
   * of them is that the Crown's fleet can leave harbor, so charging it a
   * standing tax for the privilege would undo the reason they exist. A wall
   * you *build* costs what a wall costs.
   */
  ancient?: true;
  /**
   * A works being laid down on an island that had none. It stands in its slot
   * from the day it is ordered, with its own build order counting down; when
   * that finishes it is simply done, rather than producing a second works.
   */
  founding?: true;
}

export interface BuildOrder {
  item: BuildItem;
  /**
   * The job, in works-days: what one works of its kind would take alone.
   *
   * Not days left. Every works of that kind standing on the island takes a day
   * off it each day, so three yards finish a sixty-day job in twenty, and a
   * fourth finished halfway through shortens what is left from that morning on.
   * Days to go is `ceil(workLeft / how many are working)`, which is a question
   * about today rather than a number written down when the order was placed.
   */
  work: number;
  workLeft: number;
  /**
   * The passage after the work, when the thing is bound somewhere else. Kept
   * apart from the work because they are different questions: how long until
   * it is finished, and how long until it is *there*. It used to be one number
   * with the crossing folded in, which made a hull built in a day and sailed
   * for thirty look the same as one built in thirty and delivered on the spot.
   */
  travel: number;
  travelLeft: number;
  costGold: number;
  /**
   * Where the thing lands when it is done, when that is not the island it is
   * made on: a company drilled here and shipped there, a hull that sails to
   * join a squadron on station, builders sent across the world to raise a
   * seawall on an island that could never have built one itself.
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
   * How many spells ashore this errand has already run. The player decides
   * for themselves whether a fortnight that got nowhere is worth another; the
   * opponent needs a number, and this is it.
   */
  cycles?: number;
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
   * Confederacy has no seat: this is only where its people go home to — the
   * island of theirs that loves them best — and is kept in step every day.
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
  /**
   * Keep this one out of the dispatch cards. It still belongs in the log — it
   * happened and the player should be able to find it — but something else is
   * already telling them about it. Set on the rounds of an action the player
   * is fighting by hand, where the battle sheet is the report.
   */
  quiet?: boolean;
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

/**
 * An action in progress, waiting on the player.
 *
 * `rounds` is what has been fought so far, so the sheet can say "second
 * broadside" rather than opening the same way every time. `last` is what the
 * round just fought cost each side — held here rather than recomputed,
 * because after the round the ships that paid for it are gone.
 */
export interface PendingBattle {
  systemId: string;
  rounds: number;
  last?: {
    empire: number;
    alliance: number;
    /** Damage taken across every hull present, both sides. */
    hurt: number;
    /** True if this was the round the creature went down. */
    beastSlain: boolean;
  };
  /** Set when the other side has broken off rather than fight on. */
  theyFled?: boolean;
  /**
   * How it ended, once it has. The action stays on the state after it is
   * settled rather than vanishing, so the player reads the result of the round
   * they just ordered instead of watching the sheet disappear. Cleared when
   * they close it.
   */
  settled?: BattleOutcome;
}

export type BattleOutcome = 'won' | 'lost' | 'they-fled' | 'you-fled' | 'beast-slain';

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
  /**
   * An action the player is in and has not settled yet.
   *
   * Set by `resolveBattles` when the day's fighting reaches an island the
   * player has a fleet at, instead of resolving it. While it is set the clock
   * is held and no day passes: the player fights the action round by round, or
   * breaks off. Battles the player is not at are settled the way they always
   * were, in one round a day, and reported to the log.
   */
  battle?: PendingBattle;
  /** Set once a victory condition trips; the clock stops afterwards. */
  winner?: PlayableFaction;
  rngSeed: number;
  /** Monotonic counter behind every generated id, so "newest" is well defined. */
  nextId: number;
  /**
   * How well the opponent plays, and which of its articles are switched off.
   *
   * Absent is the whole book — every save written before difficulties existed
   * keeps the opponent it had. `src/sim/doctrine.ts` reads it; `lab/doctrine.ts`
   * sets `without` to one article at a time to measure what that article is
   * worth.
   */
  doctrine?: { tier: 'plain' | 'sharp' | 'ruthless'; without?: string[] };
  /**
   * Hands your side to the opponent's brain and makes you the audience.
   *
   * Sean, 16 September: *"a button... that turns the active player into AI so
   * I can literally watch the AI play and open screens and do stuff. I still
   * control speed of game but all other functions are locked and I just
   * observe."* A development tool — it turns a game of player against machine
   * into machine against machine, with the panels still open to look at.
   *
   * Enforced in `commands.ts`, in the one wrapper every order passes through,
   * rather than by greying out buttons: a lock that lives in the simulation
   * cannot be got round by a screen somebody forgot to disable. Opening
   * panels, changing the speed and reading anything are all still yours.
   */
  observing?: boolean;
}
