import shipData from '../data/ships.json';
import terms from '../data/terms.json';
import type {
  BuildItem,
  FacilityType,
  LordPower,
  PlayableFaction,
  ShipClassId,
  ShipRole,
  Speed,
} from './types';

/** Milliseconds between ticks. One tick = one day (spec 2). */
export const SPEED_MS: Record<Speed, number> = {
  paused: Number.POSITIVE_INFINITY,
  very_slow: 4000,
  slow: 2000,
  medium: 1000,
  fast: 400,
};

export const SPEED_ORDER: Speed[] = ['paused', 'very_slow', 'slow', 'medium', 'fast'];

export const SPEED_LABEL: Record<Speed, string> = {
  paused: 'Paused',
  very_slow: 'Very slow',
  slow: 'Slow',
  medium: 'Medium',
  fast: 'Fast',
};

export interface BuildSpec {
  costGold: number;
  days: number;
  label: string;
}

/** Construction-yard menu (spec 4.4). */
export const YARD_BUILDS: Record<FacilityType, BuildSpec> = {
  mine: { costGold: 40, days: 8, label: terms.facilities.mine },
  refinery: { costGold: 60, days: 10, label: terms.facilities.refinery },
  construction_yard: { costGold: 120, days: 20, label: terms.facilities.construction_yard },
  training_facility: { costGold: 80, days: 15, label: terms.facilities.training_facility },
  shipyard: { costGold: 150, days: 25, label: terms.facilities.shipyard },
  fort: { costGold: 100, days: 18, label: terms.facilities.fort },
  boom: { costGold: 70, days: 12, label: terms.facilities.boom },
};

/**
 * The fixed defences, and what they are worth.
 *
 * A fort fires like a medium hull and a bit — enough that two of them turn a
 * sloop raid away, not enough that a harbour never needs a fleet. A boom is
 * counted as companies for a landing (a chain has to be cut under fire, which
 * costs the attacker exactly what a company would) and as a floor for a
 * blockade: under BOOM_BLOCKADE_GUNS of enemy fire the port stays open, so a
 * single sloop lying off a boomed harbour is a nuisance rather than a siege.
 */
export const FORT_GUNS = 5;
export const BOOM_DEFENCE = 2;
export const BOOM_BLOCKADE_GUNS = 6;

/**
 * Garrisons at setup, the two numbers Rebellion is tuned against.
 *
 * Every held island opens with the garrison its allegiance needs plus two, so
 * a loyal port has a couple of companies and a sullen one has five. Capped at
 * six, which is the original's ceiling, and the capital gets one more because
 * a seat is defended whatever its people think.
 */
export const START_GARRISON_MAX = 6;
export const START_GARRISON_SPARE = 2;

/** Training-facility menu (spec 4.4). */
export const TROOP_BUILD: BuildSpec = { costGold: 25, days: 5, label: terms.troop };

/**
 * Hulls.
 *
 * The numbers are keyed by role, not by class, so the two fleets are balanced
 * identically and differ only in name and character. That is deliberate: the
 * war already runs to a tested length, and giving one side better ships is a
 * tuning job to do on purpose later rather than a side effect of adding them.
 *
 * `guns` is what a hull contributes to a battle; `hull` is how much damage it
 * takes before it goes down; `carries` is companies, and only transports and
 * capitals have room for any.
 */
export interface ShipRoleSpec extends BuildSpec {
  upkeep: number;
  guns: number;
  hull: number;
  carries: number;
  /** Passage time against a frigate's. Under 1 is faster. */
  pace: number;
}

/**
 * Size is the trade-off, and it is a real one in both directions. A sloop
 * reaches a threatened harbour in two days where a first-rate takes four, and
 * then dies to one broadside. A transport carries more than anything and
 * cannot fire a shot.
 */
export const SHIP_ROLES: Record<ShipRole, Omit<ShipRoleSpec, 'label'>> = {
  small: { costGold: 45, days: 8, upkeep: 2, guns: 2, hull: 3, carries: 0, pace: 0.7 },
  medium: { costGold: 85, days: 14, upkeep: 3, guns: 4, hull: 5, carries: 1, pace: 1 },
  large: { costGold: 150, days: 22, upkeep: 5, guns: 7, hull: 9, carries: 2, pace: 1.35 },
  transport: { costGold: 55, days: 10, upkeep: 2, guns: 0, hull: 4, carries: 3, pace: 1 },
};

/** What to call a size in front of the player. */
export const SHIP_ROLE_LABEL: Record<ShipRole, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  transport: 'Transport',
};

export interface ShipClass {
  id: ShipClassId;
  faction: PlayableFaction;
  role: ShipRole;
  name: string;
  blurb: string;
  /** One of a kind: never on a shipyard's menu, and costs nothing to keep. */
  unique?: true;
  /** Numbers of its own, over the size's. */
  hull?: number;
  guns?: number;
  pace?: number;
  carries?: number;
  /** A Pirate Lord's ship carries one power. */
  power?: LordPower;
}

/**
 * The three Pirate Lords who lead the Confederacy, each bound to a ship.
 *
 * They never go ashore: the ship is the Lord, and what the ship does is what
 * the Lord does for the cause. Take the ship and you take the Lord. Take all
 * three at once and the Confederacy is finished — Rebellion's Mothma-and-Luke
 * condition, made naval. By name, because characters take fresh ids each game.
 */
export interface PirateLord {
  name: string;
  ship: ShipClassId;
}
export const PIRATE_LORDS: PirateLord[] = [
  { name: 'Commodore-Elect Adaira Hale', ship: 'harbor' },
  { name: 'Captain Silas Reyne', ship: 'swallowtail' },
  { name: 'Admiral Dorian Jessup', ship: 'ironback' },
];

/** What each power does, in the player's words. */
export const LORD_POWER_TEXT: Record<LordPower, string> = {
  moot: 'The Moot sails with her. Wherever she lies at anchor the island comes round to the Confederacy a point a day, and she is home to anyone coming back from a parley.',
  runner: 'Faster than anything afloat, and the last thing in a harbour the enemy can hit: while another Confederate hull floats beside her, the guns find that one instead.',
  line: 'The heaviest guns on the water, and every Confederate fleet lying in her harbour fights under the Admiral\'s command.',
};
/** Allegiance a day the Moot brings an island round by. */
export const MOOT_SUPPORT_PER_DAY = 1;

export const SHIP_CLASSES: ShipClass[] = shipData.classes as ShipClass[];

const SHIP_BY_ID = new Map(SHIP_CLASSES.map((c) => [c.id, c] as const));

export function shipClass(id: ShipClassId): ShipClass {
  const found = SHIP_BY_ID.get(id);
  if (!found) throw new Error(`Unknown ship class: ${id}`);
  return found;
}

export function isShipClass(item: BuildItem): item is ShipClassId {
  return SHIP_BY_ID.has(item as ShipClassId);
}

export function shipSpec(id: ShipClassId): ShipRoleSpec {
  const cls = shipClass(id);
  const spec = { ...SHIP_ROLES[cls.role], label: cls.name };
  if (cls.hull) spec.hull = cls.hull;
  if (cls.guns !== undefined) spec.guns = cls.guns;
  if (cls.pace !== undefined) spec.pace = cls.pace;
  if (cls.carries !== undefined) spec.carries = cls.carries;
  // A Lord keeps their own ship out of their own pocket.
  if (cls.unique) spec.upkeep = 0;
  return spec;
}

/** Hulls a faction can lay down without research. */
export function shipsFor(faction: PlayableFaction): ShipClass[] {
  return SHIP_CLASSES.filter((c) => c.faction === faction && !c.unique);
}

export function buildSpec(item: BuildItem): BuildSpec {
  if (item === 'troop') return TROOP_BUILD;
  if (isShipClass(item)) return shipSpec(item);
  return YARD_BUILDS[item];
}

/**
 * Buildings come in two kinds. Some earn: a camp cuts timber and ore, a mill
 * works it into something worth selling. The rest make things or protect you,
 * and cost gold every day they stand.
 */
const NO_SHIP_INCOME = Object.fromEntries(
  (shipData.classes as ShipClass[]).map((c) => [c.id, 0]),
) as Record<ShipClassId, number>;

export const GOLD_PER_DAY: Record<BuildItem, number> = {
  mine: 2,
  refinery: 3,
  construction_yard: 0,
  training_facility: 0,
  shipyard: 0,
  fort: 0,
  boom: 0,
  troop: 0,
  ...NO_SHIP_INCOME,
};

const SHIP_UPKEEP = Object.fromEntries(
  (shipData.classes as ShipClass[]).map((c) => [c.id, c.unique ? 0 : SHIP_ROLES[c.role].upkeep]),
) as Record<ShipClassId, number>;

export const UPKEEP_PER_DAY: Record<BuildItem, number> = {
  mine: 0,
  refinery: 0,
  construction_yard: 3,
  training_facility: 2,
  shipyard: 4,
  fort: 2,
  boom: 1,
  troop: 1,
  ...SHIP_UPKEEP,
};

export function earns(item: BuildItem): boolean {
  return GOLD_PER_DAY[item] > 0;
}

/** Support / control thresholds (spec 4.3). */
/**
 * What it takes to win an unaligned island over without landing a company.
 *
 * Allegiance is a two-way balance now, so the old pair of conditions — sixty
 * points and a twenty-five point lead — were the same sentence twice, and at
 * sixty a single landed parley would have carried an island that started
 * even. Changing a flag wants a plain supermajority: four islanders in five,
 * which is three or four parleys' work from level, against a drift that is
 * always pulling the island back to the middle.
 */
export const FLIP_SUPPORT_MIN = 80;
export const UPRISING_SUPPORT = 30;
export const UPRISING_END_SUPPORT = 40;
export const SPILLOVER_FRACTION = 0.2;
/** Points of support an island loses or regains per day as opinion drifts back
 *  toward its natural level. Small on purpose: it makes gains need keeping up
 *  without ever taking an island off you on its own. */
export const SUPPORT_DRIFT = 0.25;
/**
 * Where a holder's standing settles: governing an island is its own argument,
 * so it never drifts to nothing, but it is not banked at a hundred either.
 *
 * Inside the steady band on purpose, with a little headroom above sixty. An
 * island nobody works at is worth keeping and leaks a fifteenth of its trade;
 * getting one to firm is work you choose to do, and letting one fall to thin
 * takes the enemy pushing or you ignoring it. Settling below sixty instead
 * would have made the thin band the whole game's resting state.
 */
export const HELD_SUPPORT_LEVEL = 65;

/** Diplomacy mission (spec 4.5). */
export const TRAVEL_DAYS_IN_SECTOR = 3;
export const TRAVEL_DAYS_CROSS_SECTOR = 10;
export const MISSION_WORK_DAYS = 15;
export const FOIL_CHANCE = 0.1;
export const FOIL_INJURY_DAYS = 20;
/** Stirring up a revolt on an island the enemy holds. Far more dangerous than
 *  talking to people who have not chosen a side: their garrison, their harbour,
 *  their crew watching the strangers ask questions. */
export const INCITE_FOIL_CHANCE = 0.3;
/** How much an enemy officer standing on the island adds to the risk, scaled by
 *  their espionage rating. A good spy in residence roughly doubles it. */
export const FOIL_PER_WATCHER = 0.3;
/** Support taken off the holder by a landed incitement, before the officer's own
 *  rating. Pushing an island under UPRISING_SUPPORT is what sets it alight. */
export const INCITE_SUPPORT_LOSS = 9;
/** Incitement is harder work than a parley; this scales the officer's chance. */
export const INCITE_SUCCESS_SCALE = 0.75;

/**
 * The floor on a sabotage, before the saboteur's own Espionage is added.
 *
 * Lower than a parley's 0.4 because it is a harder thing to do and the cost of
 * being caught is the same. A good spy lands around 0.72, a poor one around
 * 0.45, so it is worth sending the right person and never a certainty.
 */
export const SABOTAGE_BASE = 0.34;

/**
 * Taking a named officer off the board.
 *
 * Lower than sabotage, because the thing being carried off can fight back and
 * a mill cannot. The defender's own Combat is subtracted from it, so the hard
 * cases really are hard: the fleet's best fighting captain is not something
 * you lift off a quay because you rolled well.
 */
export const ABDUCT_BASE = 0.42;
/**
 * Breaking one of yours out of the enemy's seat. Harder than lifting someone
 * off a quay — the whole harbour is watching the cells — and read off
 * Espionage, since it is craft and not argument.
 */
export const RESCUE_BASE = 0.3;
/** How much of the target's Combat protects them, as a divisor. */
export const ABDUCT_RESIST_DIVISOR = 230;
/** Days a rescued or exchanged prisoner is unfit for. Long: it is a real loss. */
export const CAPTIVE_DAYS = 60;

/**
 * Putting an island of yours back in order.
 *
 * Read off Leadership, which until now only decided how well a company fought.
 * Higher than the others because it is your own ground and nobody is hunting
 * the officer — the risk in a command posting is the time, not the danger.
 */
export const COMMAND_BASE = 0.5;
/** How far a command posting brings the island back on a landed attempt. */
export const COMMAND_SUPPORT_GAIN = 11;

/**
 * The craft, and what each grade is worth.
 *
 * Three grades and no more. Every grade takes longer to reach than the last,
 * so the third is a campaign's work rather than a fortnight's, and the effect
 * is deliberately dull — cheaper and quicker hulls, not new ones — because a
 * research track that unlocks things needs things to unlock.
 */
export const RESEARCH_BASE = 0.45;
/** Allegiance an island must already have before its yards can spare the time. */
export const RESEARCH_MIN_SUPPORT = 75;
/** Progress a landed cycle adds, before the officer's Espionage. */
export const RESEARCH_PROGRESS = 24;
/** Progress needed for grades one, two and three. */
export const CRAFT_GRADES = [100, 260, 520];
/** What each grade takes off a hull's cost and days, as a fraction per grade. */
export const CRAFT_COST_STEP = 0.1;
export const CRAFT_DAYS_STEP = 0.13;

/**
 * What a saboteur goes for first.
 *
 * A slipway before a mine, every time: burning a yard costs the enemy the
 * hulls it has not laid down yet, where burning a mine costs them a few gold a
 * day they will not notice. Ordered by what it hurts to lose, and the outcome
 * walks this list.
 */
export const SABOTAGE_PRIORITY = [
  'shipyard',
  'construction_yard',
  'training_facility',
  'refinery',
  'mine',
] as const;
/** How much the opponent discounts an incitement against courting an unaligned
 *  island, so it does not spend every officer harrying islands it cannot keep. */
export const INCITE_PRIORITY_PENALTY = 30;

/** Recruitment (amended v4.11). */
/** How many of the unaligned are scattered over the isles in a given game.
 *  Fewer than the pool holds, so no two wars offer the same people. */
export const RECRUITS_IN_PLAY = 8;
/** How many are already ashore when the war opens. The rest drift in, so a
 *  player who finds this on day 200 has not already lost the race, and the
 *  first weeks are not a scramble to collect eight strangers off eight quays. */
export const RECRUITS_AT_START = 2;
/** The last day one of them can turn up. Past roughly this point a new officer
 *  would not have a war left to be useful in. */
export const RECRUIT_LAST_DAY = 420;
/** Scales an officer's chance by how good the recruit is: someone worth having
 *  knows it. `chance × (1 − quality/RECRUIT_QUALITY_DIVISOR)`. */
export const RECRUIT_QUALITY_DIVISOR = 200;
/** What the opponent adds for signing someone on, against courting an island.
 *  People are scarce and permanent; an island can be worked again next month. */
export const AI_RECRUIT_BONUS = 120;

/**
 * Loyalty, in three bands, and what each one costs you.
 *
 * Allegiance used to be a number that moved a multiplier and nothing else.
 * It is now the thing the chart is drawn by and the thing that decides how
 * much of an island's trade you actually see: an island that does not love
 * you keeps working, but its harbour leaks — goods go out the back to the
 * other side, and so does word of what you have there.
 *
 * Firm at ninety and up, steady from sixty, thin below it, and an island in
 * open revolt is its own band and the worst of them.
 */
export const SUPPORT_FIRM = 90;
export const SUPPORT_STEADY = 60;

/**
 * The three sizes a mark on the chart comes in. The chart's whole vocabulary:
 * one dot, three sizes, and a layer that answers with a quantity says which
 * size it means rather than making the chart guess from a number.
 */
export type MarkSize = 'small' | 'medium' | 'large';

/**
 * A garrison, in the same three bands. Sean's ladder, 14 September: under
 * three companies is a small dot, three to five a medium one, six and up a
 * large one. Six is the ceiling a starting garrison is capped at, so a large
 * dot means an island held as hard as the rules allow.
 */
export const GARRISON_FAIR = 3;
export const GARRISON_STRONG = 6;

export function garrisonBand(companies: number): MarkSize {
  if (companies >= GARRISON_STRONG) return 'large';
  if (companies >= GARRISON_FAIR) return 'medium';
  return 'small';
}

export type LoyaltyBand = 'uprising' | 'thin' | 'steady' | 'firm';

export function loyaltyBand(support: number, uprising = false): LoyaltyBand {
  if (uprising) return 'uprising';
  if (support >= SUPPORT_FIRM) return 'firm';
  if (support >= SUPPORT_STEADY) return 'steady';
  return 'thin';
}

/**
 * What share of an island's trade the smugglers run to the other side, by
 * band. Sean's ladder, 14 September: half in a revolt, nothing at all on an
 * island that is firmly yours. It is a transfer and not a tax — every coin
 * lost here is a coin the enemy banks, so an island you have let go sour is
 * paying for their fleet.
 */
export const SMUGGLED_SHARE: Record<LoyaltyBand, number> = {
  uprising: 0.5,
  thin: 0.25,
  steady: 0.15,
  firm: 0,
};

/**
 * The other half of a leaky harbour: word gets out. Each day, this is the
 * chance that an island of yours the enemy has never charted turns up on
 * their charts anyway, because somebody talked. A firm island keeps its
 * mouth shut.
 */
export const LEAK_CHANCE: Record<LoyaltyBand, number> = {
  uprising: 0.04,
  thin: 0.02,
  steady: 0,
  firm: 0,
};

export const LOYALTY_BAND_LABEL: Record<LoyaltyBand, string> = {
  uprising: 'In revolt',
  thin: 'Thin',
  steady: 'Steady',
  firm: 'Firm',
};

/**
 * Victory. Two ways, one each, and nothing else: the Confederacy wins the day
 * it holds Highwater; the Crown wins the day all three Pirate Lords are in
 * irons at once. Captives are exchanged after sixty days, so the Crown's is a
 * window rather than a checklist.
 */

/** Opponent AI cadence (spec 4.7). */
export const AI_BUILD_INTERVAL = 5;
export const AI_MISSION_INTERVAL = 10;
/** How many officers the opponent will have ashore at once. One is not a
 *  faction playing the game; all of them at once is a diplomatic blitz. */
export const AI_MISSION_PARTIES = 2;
/** What the opponent adds for an island in the Reach an officer already sits
 *  in, so it is not forever sailing ten days the long way round. */
export const AI_NEAR_BONUS = 25;
/** How often the opponent looks at its ships. Slower than building: a fleet
 *  order should be a considered move, not a twitch. */
export const AI_FLEET_INTERVAL = 12;
/** Gold the opponent keeps back before it will lay down a hull, so a navy
 *  never starves the economy that pays for it. */
export const AI_SHIP_RESERVE = 200;
/** Spare companies the opponent keeps on a drilling island, over what holds it
 *  quiet, so it has something to put aboard a transport. */
export const AI_TROOP_POOL = 2;

/**
 * How much the best officer aboard is worth at a rating of 100, as a fraction
 * added on. A quarter again: enough to tip a close fight, not enough to win
 * one against the odds.
 */
export const OFFICER_EDGE = 0.25;

/**
 * Espionage points per extra island charted when a fleet makes a landfall.
 * At 25 a rating of 100 charts four more of the chain beyond the one you
 * actually anchored at, so a good spy opens most of a chain in two voyages.
 */
export const SCOUT_PER_ISLAND = 25;

/**
 * Islands a survey charts, beyond the one the officer landed on.
 *
 * Coarser than a fleet's landfall on purpose. A ship makes a passing survey of
 * a chain from the water and charts a lot of it thinly; somebody put ashore for
 * a fortnight learns where things are. At 34 a rating of 100 opens three more
 * of the chain per report, so a good spy walks a chain in two or three trips
 * and a poor one is better used elsewhere.
 */
export const SURVEY_PER_ISLAND = 34;

/** Facility types that a construction yard is allowed to queue. */
export const YARD_BUILDABLE: FacilityType[] = [
  'mine',
  'refinery',
  'construction_yard',
  'training_facility',
  'shipyard',
  'fort',
  'boom',
];

/** Display names come from the world bible via `data/terms.json`. */
export const FACILITY_LABEL: Record<FacilityType, string> = terms.facilities;

export const FACILITY_BLURB: Record<FacilityType, string> = terms.facilityBlurbs;

export const TROOP_LABEL = terms.troop;

/** The player-facing name of anything you can order, whatever kind it is. */
export function buildLabel(item: BuildItem): string {
  if (item === 'troop') return TROOP_LABEL;
  if (isShipClass(item)) return shipClass(item).name;
  return FACILITY_LABEL[item];
}

export function buildBlurb(item: BuildItem): string {
  if (item === 'troop') return 'A company of marines, drilled and put ashore.';
  if (isShipClass(item)) return shipClass(item).blurb;
  return FACILITY_BLURB[item];
}
