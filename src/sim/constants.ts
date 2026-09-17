import shipData from '../data/ships.json';
import type { Rng } from './rng';
import terms from '../data/terms.json';
import type {
  BuildItem,
  FacilityType,
  IslandArchetype,
  LordPower,
  ResourceType,
  PlayableFaction,
  ShipClassId,
  ShipRole,
  Speed,
} from './types';

/**
 * Real time a game day takes, in milliseconds. One day is one tick (spec 2).
 *
 * Sean's reference, revised the same day he set it: 30 / 15 / 5 / 2 seconds a
 * day. The first table was Rebellion's own pace and it was right about the
 * shape and wrong about the size — a war here runs a few hundred days, and at
 * thirty seconds a day Medium was a five-hour sitting. This is five times
 * quicker at every setting: Fast puts a five-hundred-day war inside twenty
 * minutes, Medium inside three quarters of an hour, and Very Slow is still
 * something you leave running.
 *
 * Travel was lengthened in the same breath and the two are the same decision.
 * Days are cheaper now, so a crossing can cost more of them without costing
 * the player an evening — which is what makes distance mean anything.
 */
export const SPEED_MS: Record<Speed, number> = {
  paused: Number.POSITIVE_INFINITY,
  very_slow: 30_000,
  slow: 15_000,
  medium: 5_000,
  fast: 2_000,
};

/**
 * How often the clock looks at itself.
 *
 * Not how often a day passes — that is SPEED_MS. This is the resolution the
 * day's progress is measured and drawn at, fine enough that the ring around
 * the day badge moves smoothly and coarse enough to cost nothing. Halved when
 * the speeds were: at two seconds a day, two hundred milliseconds moved the
 * ring a tenth of a turn at a time and you could see the steps.
 */
export const CLOCK_TICK_MS = 100;

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
  /*
   * The two earners cost nothing, at Sean's word of 17 September: *"Gold mine
   * and lumber mill need to be zero cost... early game, shouldn't be terribly
   * constrained by gold."*
   *
   * They are still not free, which is the point. A mine can only go on a vein
   * and a mill on a forest, and there are only so many of either; the deposit
   * takes the berth, and berths are the game's real scarcity; and each is ten
   * days and five that the island's yards are doing nothing else with, one job
   * at a time. What the price bought was a first fortnight spent staring at a
   * ledger instead of at the chart, and Sean's other sentence says where the
   * gold is meant to come from anyway: *"as you use diplomacy to sway islands
   * to your side many will have income producing facilities."* Winning ground
   * is the economy; sinking shafts is what you do with ground you have won.
   */
  // Quick, both of them, and deliberately so. An island's works can only hold
  // one job at a time now, so a forested island with four stands of timber is
  // four jobs in a queue — at ten days each that is half a year before the
  // island is worth what it is worth, and measured, the opponent ended wars
  // sitting on thirteen thousand gold with two forests an island still
  // standing. Felling trees is not building a slipway.
  mine: { costGold: 0, days: 10, label: terms.facilities.mine },
  refinery: { costGold: 0, days: 5, label: terms.facilities.refinery },
  construction_yard: { costGold: 120, days: 20, label: terms.facilities.construction_yard },
  training_facility: { costGold: 80, days: 15, label: terms.facilities.training_facility },
  shipyard: { costGold: 150, days: 25, label: terms.facilities.shipyard },
  fort: { costGold: 100, days: 18, label: terms.facilities.fort },
  // Two and a half Fortresses' worth of stone and a bit over twice the guns,
  // for two and a half times the gold and not quite twice the time — on one
  // plot. Slightly worse per gun than building two Fortresses, and the only
  // thing you can do with a single berth on an island that has no more.
  heavy_fort: { costGold: 250, days: 32, label: terms.facilities.heavy_fort },
};

/**
 * The fixed defences, and what they are worth.
 *
 * A fort fires like a medium hull and a bit — enough that two of them turn a
 * sloop raid away, not enough that a harbor never needs a fleet.
 *
 * There was a second defence, a Boom — a chain across the harbor mouth that
 * cost a landing what two companies would and held the port open under light
 * blockade. It is gone, at Sean's word on 16 September. Measured over twelve
 * full wars before it was cut: zero standing, on zero islands. The opponent
 * had no rule that ever wanted one and a player had no reason to buy one, with
 * a Fortress beside it that stops a landing outright.
 */
// Scaled with the hulls: a fort still fires like a frigate and a bit.
export const FORT_GUNS = 20;
/**
 * And the Heavy Fortress, which is a berth's worth of decision.
 *
 * 45 guns against a Fortress's 20 and 150 of wall against 60, on the same one
 * plot — but 250 gold and 5 a day against 100 and 2. Per gun it is very
 * slightly the worse buy and per day of upkeep the worse buy again; per *berth*
 * it is more than twice the harbor. That is the whole trade, and it lands on
 * the game's real scarcity: an island has a fixed number of plots and the
 * mills and the yards want them too.
 *
 * Against the siege arithmetic the Fortress was tuned to — a proper train of
 * two first-rates and two frigates, 38 a day, through a Fortress in two days —
 * this takes four and a half, while firing back like two first-rates rather
 * than like a frigate. A harbor with one in it is a harbor you bring the fleet
 * to rather than a squadron.
 */
export const HEAVY_FORT_GUNS = 45;
export const HEAVY_FORT_STRENGTH = 150;

/**
 * The three questions every siege rule asks of a works, answered in one place.
 *
 * Two tiers of wall means the rest of the game must stop asking `type ===
 * 'fort'` and asking these instead — the guns it fires, the stone it is made
 * of, and whether it is a wall at all. Everything downstream (the blockade,
 * the bombardment, the nightly patch, what stops a landing, what the opponent
 * thinks a siege will cost) then works for both without knowing there are two.
 */
export function isWall(type: FacilityType): boolean {
  return type === 'fort' || type === 'heavy_fort';
}
export function wallGuns(type: FacilityType): number {
  return type === 'heavy_fort' ? HEAVY_FORT_GUNS : FORT_GUNS;
}
export function wallStrength(type: FacilityType): number {
  return type === 'heavy_fort' ? HEAVY_FORT_STRENGTH : FORT_STRENGTH;
}

/**
 * What a seawall is made of, and why an island with one cannot simply be
 * landed on.
 *
 * Sean, 15 September: *"a single fortress on the island prevents the fleet
 * from doing an assault. The fleet cannot assault until the fortress has been
 * destroyed, and the fortress can only be destroyed by bombardment."*
 *
 * That one rule is the whole siege. It makes bombardment **necessary** rather
 * than merely strong — the failure mode he named in Rebellion, where a good
 * player bombards to nothing and walks in, needs bombardment to be *optional*
 * and better. Here it is the only door, and it does not open far enough to
 * walk through: past the walls you still have to land against their companies.
 *
 * Sixty is tuned against the hulls. A proper siege train — two first-rates and
 * a pair of frigates, 38 a day — is through in two days. A swarm of sloops at
 * one apiece nets five a day against the wall's repairs and needs a fortnight
 * under twenty guns, which it does not survive. That is the answer to "why
 * build ships of the line", and it is arithmetic rather than a rule.
 */
export const FORT_STRENGTH = 60;

/**
 * What the Crown's seat opens with.
 *
 * Two walls and a real garrison. Measured before the siege rules: Highwater
 * opened with two companies and no fort in all forty worlds generated, never
 * built one in twelve wars, and was under three companies on three quarters
 * of all days. Its only defence was whatever squadron happened to be moored
 * in it, so moving that squadron — the most natural first move in the game —
 * handed the war away in seven weeks.
 */
export const CAPITAL_WALLS = 2;
export const CAPITAL_GARRISON = 6;
/**
 * And a battery on the great island's other Crown port.
 *
 * Sean, 15 September: *"Highwater should probably start with 2 defensive
 * structures, and maybe even the other port on the big island should have 1.
 * This makes the game so that Imperium can use their fleet rather than keeping
 * it docked to protect the island."*
 *
 * Which is the point of a wall, and the thing an earlier tuning pass missed by
 * reading a win rate instead: two walls was tried and scored 9–3 to the Crown
 * with eight wars in twenty never ending, so it was cut to one. That reading
 * was contaminated. At the time the opponent could not mount a siege at all —
 * it built nothing but transports, banked six figures it would not spend, and
 * the one squadron meant for Highwater had no idea how to open fire. With
 * those three fixed it can bring a siege train and use it, so the walls can be
 * what they are for.
 */
export const HOME_PORT_WALLS = 1;

/**
 * One round of shooting, as the spec sets it out.
 *
 * Three quarters of shots tell, and a hit does what the gun does give or take
 * a seventh. The variance is deliberately narrow: it is there so a round is
 * never quite what you expected, not so a weaker fleet can win by luck. The
 * spec's own words — "I expected to win but took more damage than expected",
 * never "the game decided my better fleet lost".
 */
export const HIT_CHANCE = 0.75;

/**
 * How hard each kind of hull is to hit, and how badly heavy guns fare against
 * a small one.
 *
 * Sean, 15 September: *"small ships can chip away at the hull of a big ship
 * really quickly and the big ships can't get them, because the big ships are
 * designed for big blasts at defensive structures on land. So when you're
 * building a fleet you want a balanced fleet, otherwise you leave yourself
 * extremely vulnerable to different scenarios."* And, on the worry that this
 * would tangle with the siege rules: *"sea combat has nothing to do with
 * fortress defenses. One is ship vs ship, another is ship vs island."* He is
 * right, and they stay separate — `bombard` is untouched by any of this.
 *
 * Three numbers do the whole triangle. A sloop is a hard mark for anybody and
 * a first-rate is a barn door, which on its own means both sides put more shot
 * into the big hull. The second rule is the one that makes it a triangle: a
 * heavy battery laid for pounding stone does not train round fast enough to
 * catch something small and quick.
 *
 * What it comes to, per round: a sloop lands nine shots in ten on a
 * first-rate, and a first-rate lands three in ten on a sloop. One to one the
 * first-rate still wins comfortably, which it should. Four sloops — thirty
 * guns and thirty-six hull, for thirty gold more — take her apart, which is
 * the vulnerability a fleet of nothing but ships of the line is supposed to
 * have. And four sloops throw four at a seawall that patches over one, so the
 * swarm is still no answer to a fortress.
 */
export const HULL_EASE: Record<ShipRole, number> = {
  small: 0.8,
  medium: 1,
  large: 1.15,
  transport: 1.1,
};
/**
 * What a shooter manages against a small, quick target.
 *
 * A heavy battery laid for pounding stone cannot train round fast enough; a
 * frigate is built for exactly this work and is better at it than anything.
 * That last number is what makes the thing a triangle rather than a ladder:
 * without it sloops simply beat everything by the purse and there was no
 * reason to own a frigate at all.
 *
 *     frigates take sloops · sloops take ships of the line ·
 *     ships of the line take frigates
 *
 * And over all three, the seawall: no weight of sloops opens a fortified
 * harbor, so the fleet that can do everything has some of each.
 */
export const GUNNERY_ON_SMALL: Record<ShipRole, number> = {
  small: 1,
  medium: 1.55,
  large: 0.75,
  transport: 1,
};

/**
 * How many targets a hull can engage in a round.
 *
 * A ship of the line has gun decks and a sloop has a gun. Without this the
 * round gave every hull one shot whatever it was, so a first-rate put its
 * whole thirty into one nine-hull sloop and threw two thirds of it into the
 * sea — and a swarm won on hull count alone before accuracy was considered at
 * all. Measured with one shot each: a first-rate lost 0–149 to three sloops
 * that cost less than she did, which is not a triangle, it is an answer.
 *
 * Total weight of fire is unchanged; it is divided among the shots. What
 * changes is that a heavy ship stops wasting most of a broadside on something
 * small, which is the other half of why a balanced fleet beats a swarm.
 */
export const GUN_DECKS: Record<ShipRole, number> = {
  small: 1,
  medium: 2,
  large: 3,
  transport: 1,
};

/** Hit chance against a hull of this kind, before anybody's officer. */
export function hitChanceOn(role: ShipRole): number {
  return HIT_CHANCE * HULL_EASE[role];
}

/** What a shooter of this kind manages against a target of that kind. */
export function aimAt(shooter: ShipRole | 'shore', target: ShipRole): number {
  if (target !== 'small' || shooter === 'shore') return 1;
  return GUNNERY_ON_SMALL[shooter];
}
/**
 * How much a target's score wobbles when the guns are choosing whom to shoot.
 *
 * Enough that fire spreads naturally between hulls of similar worth and a
 * battle does not read as a machine working down a list; not so much that the
 * obvious target survives while the guns shoot at a transport.
 */
export const TARGET_JITTER = 0.25;
export const DAMAGE_SWING = 0.15;

/**
 * What a hull's long guns are worth firing into a fleet that is already
 * running: half what they are worth in a stand-up fight. A ship can be
 * frightening in line and still poor at catching somebody.
 */
export const LONG_GUN_SHARE = 0.5;

/**
 * How many parting shots a retreating hull eats, by its speed.
 *
 * The spec's table, at the three speeds hulls actually have. A sloop is out of
 * range almost at once; a first-rate wears the whole broadside twice over.
 * Indexed by speed, so a hull between bands reads off the nearest entry.
 */
/**
 * When the other side gives up a fight.
 *
 * Their captain breaks off once the guns still firing on your side are this
 * many times theirs — and only if there is somewhere to run to. Two is a
 * beating rather than a bad day: below it they stay and trade, which is what
 * keeps an even action from being decided by somebody losing their nerve on
 * the first broadside.
 *
 * It is deliberately not a policy the player has. You choose when to run; they
 * follow a rule, and the rule is legible enough that you can bait it.
 */
export const BREAK_OFF_ODDS = 2;

/**
 * When they have you cut off and there is no running.
 *
 * Sean, 15 September: *"over time fleeing will be more and more useless if we
 * get the timing correct. As R&D unlocks late-game ships with better stats
 * fleeing becomes harder. A strong superior fleet can stop retreat."*
 *
 * Breaking off has always worked and only ever cost you the run, which is the
 * right rule against an even enemy and the wrong one against an overwhelming
 * fleet — a squadron four times your weight does not watch you leave, it has
 * the weather gauge and the legs to close. So above this multiple of your own
 * guns, and only while they have something quick enough to run you down, the
 * order is refused and the action is fought to its end.
 *
 * Four rather than two, so it is a rout and not a bad day: it should be the
 * consequence of having sailed into something far too big, and not a thing
 * that happens in an ordinary action you are losing.
 */
export const PURSUIT_ODDS = 4;

export const RETREAT_SHOTS: Record<number, [number, number]> = {
  10: [0, 0],
  9: [0, 1],
  8: [1, 1],
  7: [1, 1],
  6: [1, 2],
  5: [2, 2],
  4: [2, 2],
  3: [2, 3],
  2: [3, 3],
  1: [3, 4],
};

/**
 * A creature is not a hull and does not fight like one.
 *
 * It used to be a pool of guns against a divisor, because the whole battle was
 * a pool of guns. Now that every ship rolls its own shot, a creature takes
 * real damage against a real hull like everything else — the difference is in
 * what it *does*, which is its own business and lives in creatures.ts. What is
 * here is only the one number the round needs: how likely it is to be hit at
 * all. A thing mostly under the water is harder to hit than a ship.
 */
export const BEAST_HIT_CHANCE = 0.55;

/**
 * When a creature stops staying put, and how it behaves once it has.
 *
 * Sean: "later in the game a log pops up saying rumours of [monster] are
 * spreading in the [sea name], and maybe we can have a monster attack either a
 * fleet in transit or a harbor. But should happen a little ways into game when
 * things are more established."
 *
 * So nothing moves for the first two hundred days. The opening is about the
 * war; a creature in that stretch is a hazard of sailing somewhere nobody has
 * been, which is what it should be. After that each one has a slow chance of
 * waking per day — slow enough that a world's few creatures wake at different
 * times over the long middle of a game rather than all at once — and a woken
 * one moves about its own Sea every week or so, preferring water somebody's
 * ships are in, because it is hunting now rather than lying about.
 *
 * And it can run. Past half its hull in damage it may break off and go
 * somewhere else in the Sea, exactly as a fleet would — but only if there is
 * somewhere to go. Cornered, it stands and fights, which is the one case where
 * a wounded creature is more dangerous than a fresh one.
 */
/**
 * What a commander posted to an island adds to the chance of catching someone
 * working against it.
 *
 * At the top of the range this is a quarter on top of the base risk, which
 * makes posting a good leader on a frontier holding a real answer to being
 * agitated and sabotaged — and gives the Crown's leadership advantage
 * something to buy, which it did not have before.
 */
export const COMMANDER_WATCH = 0.25;

/*
 * The watch: how hard it is to do quiet work on somebody else's island.
 *
 * Sean's rule, 17 September, and it is one number built out of four things:
 * *"all garrisons have a detection score. So do all crew members... If a crew
 * member is idle their detection score is added to the island's overall
 * detection score. Loyalty also improves detection. And a crew member set to
 * command improves the overall detection score of the island by a factor of
 * their leadership. Therefore covert action is more easily succeeded when
 * enemy loyalty is low. There is no commander or crew on the island. There
 * are few garrisons."*
 *
 * Every company ashore already carried a `watch` rating and only ever spent it
 * on smuggling. This is what it was for.
 */

/**
 * An officer's own watch, when the bible does not give them one.
 *
 * Sean: *"should be low for many but those who specialize in espionage,
 * combat or leadership will probably have better."* Espionage is the bulk of
 * it — noticing is the thing Espionage *is* — and the better of Combat and
 * Leadership adds a quarter, which is the sentry and the officer whose job is
 * knowing what happens on their island. Diplomacy buys nothing: a good talker
 * is not a good watchman.
 *
 * Lands between about 25 and 70 on the present cast, against companies worth
 * 10 to 35 apiece — so one good officer standing about is worth two companies
 * of the line, and a poor one is worth one.
 */
export const WATCH_FROM_ESPIONAGE = 0.5;
export const WATCH_FROM_BEARING = 0.25;
/**
 * What a posted commander is worth, on their Leadership.
 *
 * Bigger than standing about, because it is the whole of the job rather than
 * a side effect of being there: a commander is the one person on the island
 * whose business is that nothing happens on it without them hearing of it.
 */
export const WATCH_FROM_COMMAND = 0.9;
/**
 * What the island's own people are worth, at full allegiance.
 *
 * A population that is with its governor is a population that mentions the
 * strangers asking questions; one that is not says nothing to anybody. This is
 * the term that makes Sean's chain work — soften an island with incitement and
 * every covert errand on it afterwards is easier — and it is why a raid on a
 * loyal capital is a different proposition from a raid on a sullen frontier.
 */
export const WATCH_FROM_LOYALTY = 60;
/**
 * How much of the island's watch a covert errand actually has to beat, against
 * how much an open one does. Talking to people in daylight is not creeping
 * about their powder store.
 */
export const COVERT_EXPOSURE = 1;
export const OPEN_EXPOSURE = 0.25;
/**
 * The watch a party can shrug off per point of its best Espionage, and the
 * floor and ceiling on being found out. Nobody is ever safe on somebody
 * else's island and nobody is ever certain to be caught.
 */
export const WATCH_PER_ESPIONAGE = 1.6;

/**
 * What one person notices.
 *
 * Derived rather than written down, so a fifth rating nobody has to maintain
 * cannot drift out of step with the four that decide everything else — and so
 * the bible's rule is the formula rather than a hope about numbers somebody
 * typed. A bible entry may still name one, the way a ship class overrides its
 * role's stats, for anyone who should see more or less than their ratings say.
 */
export function watchOf(person: {
  espionage: number;
  combat: number;
  leadership: number;
  watch?: number;
}): number {
  if (person.watch !== undefined) return person.watch;
  return Math.round(
    person.espionage * WATCH_FROM_ESPIONAGE +
      Math.max(person.combat, person.leadership) * WATCH_FROM_BEARING,
  );
}
export const FOIL_FLOOR = 0.03;
export const FOIL_CEILING = 0.85;
/**
 * Being caught, once you have been found out.
 *
 * Detection and consequence are separate questions: the watch decides whether
 * anybody notices, and this decides whether the people who noticed can lay
 * hands on you. Scaled so a quiet frontier holding with two companies and no
 * commander rarely takes anybody, and a loyal capital with six and a general
 * in the chair usually does. Never certain — the boat is always close.
 */
export const CAPTURE_DIVISOR = 260;
export const CAPTURE_CEILING = 0.7;

export const BEAST_WAKE_DAY = 200;
export const BEAST_WAKE_CHANCE = 0.01;
export const BEAST_MOVE_CHANCE = 0.13;
export const BEAST_FLEE_HURT = 0.5;
export const BEAST_FLEE_CHANCE = 0.35;

/**
 * Garrisons at setup, the two numbers Rebellion is tuned against.
 *
 * Every held island opens with the garrison its allegiance needs plus two, so
 * a loyal port has a couple of companies and a sullen one has five. Capped at
 * six, which is the original's ceiling, and the capital gets one more because
 * a seat is defended whatever its people think.
 */
export const START_GARRISON_MAX = 6;
export const START_GARRISON_SPARE = 1;

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
  /** What she throws in a round. Damage is this, give or take a seventh. */
  guns: number;
  /** What she takes before she goes down. */
  hull: number;
  /** What she throws at a seawall. A different job from hitting a ship. */
  bombard: number;
  carries: number;
  /** Passage time against a frigate's. Under 1 is faster. */
  pace: number;
  /**
   * How hard she is to catch when her fleet breaks off, 1 to 10.
   *
   * Three bands rather than the ten the spec allowed for, because there are
   * only four kinds of hull and a ten-point scale for four values is a scale
   * pretending to be a measurement. It reads as a number because the retreat
   * table is a number, and it is not the same thing as pace: pace is how long
   * a crossing takes and speed is how fast she is out of gun-range, which a
   * sloop is good at and a first-rate is not.
   */
  speed: number;
  /**
   * Guns that reach. A hull without them cannot touch a fleet that is already
   * running; a hull with them fires at half weight into one that is.
   *
   * Nothing has them yet, which is the point — early retreat is nearly free,
   * and the day the first long-gunned hull is launched is the day breaking off
   * starts to cost. Set per class, so the arc is a design decision rather than
   * a property of being large.
   */
  longGuns?: boolean;
}

/**
 * Size is the trade-off, and it is a real one in both directions. A sloop
 * reaches a threatened harbor in two days where a first-rate takes four, and
 * then dies to one broadside. A transport carries more than anything and
 * cannot fire a shot.
 */
export const SHIP_ROLES: Record<ShipRole, Omit<ShipRoleSpec, 'label'>> = {
  // Firepower and hull are on a scale with room in them now. They were 2/3,
  // 4/5, 7/9 and 0/4, where every hit took exactly one point off — a scale on
  // which "give or take a seventh" rounds to nothing and a first-rate is only
  // three times a sloop because there is nowhere finer to put it. The ratios
  // between the four are unchanged, so the war balances where it balanced;
  // what changed is that there is now somewhere to put a damage roll.
  //
  // Tuned so a fleet action is over in one to three rounds, at Sean's word.
  // Hull is about one and a half times firepower, and three quarters of the
  // shots tell, so two evenly matched squadrons take roughly half of each
  // other off per round and the second or third round settles it.
  //
  // Every hull carries somebody. Sean, 16 September: "each ship needs garrison
  // capacity." A sloop used to carry nobody at all, which made a landing a
  // thing only a transport or a ship of the line could contribute to, and left
  // a squadron of scouts unable to put one person on an empty beach. One
  // company is not a landing force; it is enough to take ground nobody is
  // holding, and enough that no hull in the game is useless at the thing the
  // war is decided by.
  //
  // `bombard` is what the hull throws at stone rather than at another ship,
  // and it is deliberately on a much steeper curve than `guns`: a first-rate
  // is under twice a frigate in a fleet action and fourteen times a sloop
  // against a wall. Sean's reasoning, and it is right — heaving a shot up onto
  // a battery is a different job from hitting something that moves, and a
  // sloop is simply not carrying the weight to do it. A transport does not
  // bombard at all.
  small: { costGold: 45, days: 8, upkeep: 2, guns: 8, hull: 9, carries: 1, pace: 0.7, speed: 9, bombard: 1 },
  medium: { costGold: 85, days: 14, upkeep: 3, guns: 17, hull: 18, carries: 1, pace: 1, speed: 6, bombard: 5 },
  large: { costGold: 150, days: 22, upkeep: 5, guns: 30, hull: 32, carries: 2, pace: 1.35, speed: 3, bombard: 14 },
  transport: { costGold: 55, days: 10, upkeep: 2, guns: 0, hull: 14, carries: 3, pace: 1, speed: 5, bombard: 0 },
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
  /**
   * Lore only. A legend is a ship the stories tell about — the three the
   * Pirate Lords are named for — and it is never put on the water: nothing
   * builds it, nothing sails it, nothing fights it. It is here so a name on a
   * bio resolves to something with prose attached.
   */
  legend?: true;
  /**
   * The research grade a side must have reached before a yard will lay one
   * down. Absent means day one.
   *
   * Sean's ruling, 16 September: *"They are all building but better units
   * require r&d. Like in SWRebellion."* Rebellion gates its better hulls
   * behind a research track run by people rather than by a build queue, and
   * that is what the craft ladder here already was — it simply had nothing to
   * unlock, and made hulls cheaper and quicker instead. Now it has something.
   */
  craft?: 1 | 2 | 3;
  /**
   * Numbers of its own, over the size's.
   *
   * A role is a starting point, not a straitjacket: a Bulwark is a medium with
   * half again the hull and four fewer guns, a Marauder is a medium that hits
   * like one and folds like a sloop. Anything not stated here is the role's.
   */
  hull?: number;
  guns?: number;
  pace?: number;
  carries?: number;
  costGold?: number;
  days?: number;
  upkeep?: number;
  speed?: number;
  bombard?: number;
}

/**
 * The three Pirate Lords who lead the Confederacy.
 *
 * People, like everybody else in this game, each carrying one thing nobody
 * else can do. Take all three at once and the Confederacy is finished —
 * Rebellion's Mothma-and-Luke condition. By name, because characters take
 * fresh ids each game.
 */
export interface PirateLord {
  name: string;
  /** Lore only: the ship the stories give them. Never put on the water. */
  ship: ShipClassId;
  power: LordPower;
}
/*
 * The three, their ships and their powers.
 *
 * `ship` is lore now and nothing else — a name for the bio and the sheet. No
 * hull of these classes is ever put on the water. What a Lord brings is the
 * power, and where it applies is in `lords.ts`.
 */
/**
 * The Crown's own fixed principal.
 *
 * Sean, 15 September: *"have him start all games."* The Confederacy has three
 * characters it cannot lose and the Crown had none — the Regent, its head of
 * state and the best leader in the game, turned up in forty-five per cent of
 * wars, so a Crown without him was a different faction rather than a varied
 * one. Now the opening is one fixed and three drawn on that side, and three
 * fixed and two drawn on the other.
 */
export const CROWN_PRINCIPAL = 'Lord Regent Halvard Corvane';

export const PIRATE_LORDS: PirateLord[] = [
  { name: 'Commodore-Elect Adaira Hale', ship: 'harbor', power: 'moot' },
  { name: 'Captain Silas Reyne', ship: 'swallowtail', power: 'runner' },
  { name: 'Admiral Dorian Jessup', ship: 'ironback', power: 'line' },
];

/** What each power is called, so it can be named before it is explained. */
export const LORD_POWER_LABEL: Record<LordPower, string> = {
  moot: 'The Moot sails with her',
  runner: 'He is never off the Swallowtail',
  line: "He fights a harbor the Ironback's way",
};

/** What each power does, in the player's words. */
export const LORD_POWER_TEXT: Record<LordPower, string> = {
  moot: 'The Moot sits where she does. While she holds a posting, that island comes round to the Confederacy a point a day — their own ground, unaligned ground, or the Crown\'s.',
  runner: 'The Swallowtail is the fastest thing afloat and he is never off her. Any errand he leads makes the passage in half the time.',
  line: 'While he holds a posting, every fleet lying in that harbor fights under the Admiral\'s command.',
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
  for (const key of ['hull', 'guns', 'pace', 'carries', 'costGold', 'days', 'upkeep', 'speed', 'bombard'] as const) {
    const own = cls[key];
    if (own !== undefined) spec[key] = own;
  }
  return spec;
}

/** What grade of shipwright craft this hull waits on. Nothing, for most. */
export function craftNeeded(id: ShipClassId): number {
  return shipClass(id).craft ?? 0;
}

/**
 * Every hull a faction has designs for, research or no research.
 *
 * `shipsAt` is what a yard will actually take an order for today.
 */
export function shipsFor(faction: PlayableFaction): ShipClass[] {
  return SHIP_CLASSES.filter((c) => c.faction === faction && !c.legend);
}

/** The hulls a side can lay down at a given grade of craft. */
export function shipsAt(faction: PlayableFaction, grade: number): ShipClass[] {
  return shipsFor(faction).filter((c) => (c.craft ?? 0) <= grade);
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
  // Gold against timber. A vein pays better than two mills and there are
  // nothing like two mills' worth of veins in the world.
  mine: 9,
  refinery: 3,
  construction_yard: 0,
  training_facility: 0,
  shipyard: 0,
  fort: 0,
  heavy_fort: 0,
  troop: 0,
  ...NO_SHIP_INCOME,
};

const SHIP_UPKEEP = Object.fromEntries(
  (shipData.classes as ShipClass[]).map((c) => [c.id, c.legend ? 0 : SHIP_ROLES[c.role].upkeep]),
) as Record<ShipClassId, number>;

export const UPKEEP_PER_DAY: Record<BuildItem, number> = {
  mine: 0,
  refinery: 0,
  construction_yard: 3,
  training_facility: 2,
  shipyard: 4,
  fort: 2,
  heavy_fort: 5,
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
/**
 * The whole of an island's opinion. Every island's regard for the two sides
 * adds up to this, so a point one side wins is a point the other loses, and an
 * island sitting here is one where the other side has nobody left at all.
 */
export const SUPPORT_MAX = 100;
export const UPRISING_SUPPORT = 30;
export const UPRISING_END_SUPPORT = 40;
/*
 * `SPILLOVER_FRACTION` stood here: the fifth of every allegiance change that
 * used to land on every island in the Reach. Gone with the rule it served —
 * see `propagate.ts`, and Sean's memo of 17 September.
 */
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

/*
 * How long it takes to get anywhere.
 *
 * It used to be two numbers — three days inside a Reach, ten to leave it — and
 * that made the chart a diagram rather than a map. Every island in a Reach was
 * equally close, and the far side of the world was only three days further
 * than the next Sea over. Distance is measured now, in the galaxy's own 1200
 * units, so a long haul reads as a long haul.
 *
 * `TRAVEL_LEAGUE` is how far a ship makes in a day, `TRAVEL_CAST_OFF` the days
 * that go on any passage at all however short, and `TRAVEL_OPEN_SEA` the toll
 * for leaving your own Sea: the water between the Reaches is open ocean, and
 * crossing it is worse than the same distance among known islands.
 *
 * What that works out to: a hop between neighbours in a Reach is 3 or 4 days,
 * the length of a Reach 7 or 8, the next Sea over about a fortnight, and the
 * far corner of the world a month. A fleet is slower or quicker than that by
 * its pace (see `fleetPace`), so a ship of the line crossing the world is
 * closer to six weeks and a sloop closer to three.
 */
export const TRAVEL_LEAGUE = 36;
export const TRAVEL_CAST_OFF = 2;
export const TRAVEL_OPEN_SEA = 4;
export const MISSION_WORK_DAYS = 15;
/**
 * How many can go on one errand, the officer leading it included. Sean's rule,
 * 15 September. Four is enough for a boat and few enough that sending one is
 * still a decision about who you are leaving behind.
 */
export const MISSION_PARTY_MAX = 4;
export const FOIL_CHANCE = 0.1;
export const FOIL_INJURY_DAYS = 20;
/** Stirring up a revolt on an island the enemy holds. Far more dangerous than
 *  talking to people who have not chosen a side: their garrison, their harbor,
 *  their crew watching the strangers ask questions. */
export const INCITE_FOIL_CHANCE = 0.3;
/** How much an enemy officer standing on the island adds to the risk, scaled by
 *  their espionage rating. A good spy in residence roughly doubles it. */
export const FOIL_PER_WATCHER = 0.3;
/** Support taken off the holder by a landed incitement, before the officer's own
 *  rating. Pushing an island under UPRISING_SUPPORT is what sets it alight. */
export const INCITE_SUPPORT_LOSS = 9;
/** Incitement is harder work than a parley; this scales the officer's chance. */
/**
 * Stirring up an island, on Leadership against its loyalty.
 *
 * Sean: *"Parley is only to gain loyalty on your locations or neutral ones.
 * You have to send your crew on Incite Uprising mission if you're trying to
 * inspire loyalty in an enemy location."* So this is the only lever there is
 * on ground somebody else holds, and it is priced off the thing it is arguing
 * against: at a hundred for them it is near hopeless, at fifty-five it is the
 * best errand on the board. Which is what makes Sean's chain work — soften the
 * island first, and every covert errand on it afterwards is easier, because
 * the watch falls with the loyalty.
 */
export const INCITE_BASE = 0.62;
export const INCITE_LOYALTY_WEIGHT = 0.45;
/** What a garrison is worth at keeping hold of somebody in its cells, against
 *  the Combat of the party come to take them out. */
export const RESCUE_GARRISON_DIVISOR = 420;

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
 * off a quay — the whole harbor is watching the cells — and read off
 * Espionage, since it is craft and not argument.
 */
/**
 * How hard it is to get somebody out of a cell — and the master dial of the
 * whole war, which is worth knowing before anybody turns it.
 *
 * A prisoner is held until somebody comes for them, and the Crown wins by
 * holding all three Lords *at once*. So how long a Lord stays in irons is
 * what decides whether the Crown's victory condition is reachable at all, and
 * it turns out to be a knife edge. Measured over four seed blocks, ninety-six
 * wars, making a Lord specifically harder to free than an ordinary officer:
 *
 *   no penalty      Crown 42 — Confederacy 52   (as it ships)
 *   minus 0.07      no measurable change at all
 *   minus 0.11      Crown 33 — Confederacy 35, the same within noise
 *   minus 0.15      Crown 56 — Confederacy 37, and every war finished
 *
 * Nothing, nothing, nothing, then the game. Two rescues in a row failing is
 * what lets the Crown hold two long enough to go for the third, and the odds
 * of that turn over very fast. Left alone deliberately: the balance is good
 * where it is and this is the wrong dial to set by accident. It is, though,
 * exactly the right dial for a difficulty setting.
 */
export const RESCUE_BASE = 0.3;
/** How much of the target's Combat protects them, as a divisor. */
export const ABDUCT_RESIST_DIVISOR = 230;

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
/**
 * Coming back with a report.
 *
 * The highest floor of any errand, and it should be: the officer has already
 * beaten the island's watch to be standing there at all, and what is left is
 * counting companies and reading a harbor. A poor spy lands around 0.7 and a
 * good one is nearly certain, which is the memo's point — *"one good spy is
 * usually sufficient"*. What makes espionage expensive is the door, not the
 * job, and the door is `foilChance`.
 */
export const ESPIONAGE_BASE = 0.6;
/** How much of the spy's own Espionage is added to that floor. */
export const ESPIONAGE_DIVISOR = 280;
/**
 * The Espionage a spy needs before their report carries a second island.
 *
 * Sean's memo: *"a successful espionage mission against an enemy system can
 * give you intelligence on another enemy system as well... the bonus
 * information has specific restrictions."* Ours are that the spy has to be
 * good enough to be reading somebody's dispatches rather than counting guns,
 * and that the island it names is never the enemy's capital — the same shape
 * as the original's rule that the free planet is never an Outer Rim one,
 * and for the same reason: the one address that decides the war should never
 * arrive as a bonus.
 */
export const ESPIONAGE_SECOND_ISLAND = 55;

/**
 * What an island you have not looked at is assumed to be watching with.
 *
 * Roughly a middling enemy holding: a few companies, a people mostly with
 * their holder, nobody in the chair. Deliberately not the worst case — a side
 * that assumes every dark island is a fortress never goes anywhere near one,
 * and the whole point of a guess is that it can be wrong in both directions.
 * Finding a capital behind it is how an officer ends up in irons; finding a
 * sullen frontier island behind it is a raid somebody nearly did not make.
 */
export const ASSUMED_WATCH = 70;

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

/**
 * What the opponent will cross a Sea for.
 *
 * Lifting somebody off a quay is worth more than any island, because a person
 * is permanent and an island can be worked again next month — and a Pirate
 * Lord is worth more again, being a third of the Confederacy's losing
 * condition. Set high enough to outrank a slipping holding, which is the only
 * thing that has ever competed for an officer's time.
 */
export const AI_ABDUCT_BONUS = 150;
export const AI_LORD_BOUNTY = 200;
/**
 * What the opponent will spend to get its own people out of a cell.
 *
 * Above the bounty on taking one of theirs, and well above courting an island:
 * from 16 September a prisoner is held until somebody comes for them, so an
 * officer left in the cells is an officer gone for the rest of the war — and
 * for a Lord it is a third of the war's victory condition sitting in the
 * enemy's hands. The opponent had no term for rescue at all and never once
 * tried it, which was survivable only while the gaoler opened the door by
 * himself.
 */
export const AI_RESCUE_BONUS = 220;
export const AI_LORD_RESCUE_BONUS = 400;

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

/**
 * Signing on, rebuilt to Sean's memo of 17 September.
 *
 * What it replaced was a manhunt. Eight strangers were scattered on eight
 * islands, the chart carried a filter that pinned every one of them, and
 * growing your corps meant sailing an officer to wherever a particular person
 * happened to be standing — often ground you did not hold, sometimes the
 * enemy's. Sean: *"the game does not force the player to travel around the
 * galaxy looking for specific people... the character pool determines who is
 * available; the recruiting location determines the conditions under which you
 * attempt to obtain them."*
 *
 * So the pool is a pool, and the island is the *condition*. You recruit at a
 * harbor of your own that is loyal enough to be worth recruiting at, which
 * makes a secure rear area a thing worth building — Sean's whole point — and
 * turns the errand from a race into a decision about where your capital is.
 *
 * Leadership settles it, not Diplomacy: *"the primary attribute governing
 * recruitment is Leadership."* And only a Recruiter may lead one, which is the
 * memo's other restriction.
 *
 * The Crown has **two** — the Regent and Admiral Blackwater — and the
 * Confederacy four, which is Rebellion's own asymmetry (two against four) and
 * is a correction. It shipped at one against four, and one was a single point
 * of failure rather than an asymmetry: measured over sixteen wars, the Crown
 * had *no Recruiter at large at all* at twenty of eighty sample points against
 * the Brethren's three, because its one Recruiter was the Regent and the
 * Regent goes in irons. A side that cannot recruit cannot replace the officers
 * it needs to rescue the officer who would let it recruit, and three wars in
 * forty froze solid inside that loop.
 */
/**
 * Allegiance an island must already have before anybody will sign on there.
 *
 * Exactly where drift settles a properly held island, and that is measured
 * rather than chosen. It opened at 70 — deliberately *above* the resting
 * point, so that a recruiting harbor would be one you had kept up rather than
 * one you merely held — and in six wars of machine play not a single hand was
 * signed on, by either side. Nothing in the game pushes a held island past its
 * resting point on its own: opinion drifts to `HELD_SUPPORT_LEVEL` and stops,
 * and neither the opponent nor an ordinary player has a reason to spend a
 * fortnight arguing with an island that already flies their flag.
 *
 * So the gate is "held and content" and the *reward* for a devoted harbor is
 * in the odds instead, where it belongs: `RECRUIT_LOYALTY_WEIGHT` pays out
 * across the whole stretch from here to a hundred, so the rear area Sean's
 * memo wants you to build is worth building without being the price of entry.
 * A newly taken island, or one somebody is stirring up, is under this and
 * signs nobody.
 */
export const RECRUIT_MIN_SUPPORT = HELD_SUPPORT_LEVEL;
/** The floor, before the officer and the island are weighed in. */
export const RECRUIT_BASE = 0.2;
/** What Leadership is worth: at a hundred, most of the rest of the chance. */
export const RECRUIT_LEADERSHIP_DIVISOR = 260;
/** What the last thirty points of an island's allegiance are worth. */
export const RECRUIT_LOYALTY_WEIGHT = 0.25;
/** Nothing is certain. */
export const RECRUIT_CEILING = 0.85;
/** The role that may lead one. */
export const RECRUITER_ROLE = 'Recruiter';
/*
 * Tried, and the most interesting thing cut all session.
 *
 * Only a Recruiter may keep a table, and that turns out to be an absorbing
 * state rather than an asymmetry: in the wars that ran long the Crown had *no
 * Recruiter at large at all, at every late sample point, in every war*, because
 * both of its Recruiters are prime abduction targets and a side that cannot
 * recruit cannot replace the officers it needs to rescue the officer who would
 * let it recruit. So the lock was rebuilt as a strong preference — anybody may
 * try, a Recruiter is about twice as good — and it worked exactly as intended:
 * the Crown's officers at large at day one thousand went from 1.0 to 3.4, and
 * its late-war chance of having a Recruiter from nought to certain.
 *
 * And the war got much worse: **ten wars in eighty never ended, against
 * three.** With both corps healthy, both sides rescue faster than either can
 * hold three Lords at once, and the Crown's victory condition stops closing.
 * The Crown's corps collapse is load-bearing — it is currently what *ends* long
 * wars — so this cannot ship until the war can be finished another way. That
 * is a design decision rather than a tuning one, and it is Sean's.
 */
/**
 * What the opponent will pay for signing someone on, against courting an
 * island. Multiplied by how likely the attempt is, like the two political
 * errands, so a lukewarm harbor is not scored as a devoted one.
 *
 * Raised from 120 on 17 September because at 120 the errand was dead. An
 * officer is permanent and works many islands over a war, which is the case
 * for paying more for one than for a single island — and measured at 120,
 * with the errand priced at most 68 against a neutral island's 150 and a
 * Lord on a quay's several hundred, the opponent started *no* recruitment at
 * all across six wars while up to fourteen of its own harbors qualified.
 * Sean's memo is explicit that this is the strongest early play there is:
 * *"the optimal early-game behavior... is essentially to recruit
 * aggressively."*
 */
export const AI_RECRUIT_BONUS = 300;
/*
 * Tried and cut: discounting this to a fifth once the side had seven hands,
 * to give Sean's memo its arc — *"early game, recruit heavily... late game,
 * recruitment becomes largely irrelevant"* — with roster size standing in for
 * the clock. It bought nothing it was meant to. Agitators and saboteurs did
 * not come back (2 and 0 errands, the same as without it), and everything
 * else got worse: officer-days on errands fell from 40% to 32%, days in irons
 * rose from 18% to 22%, and a third of the recruiting stopped. The arc is
 * already in the pool — two of the unaligned are about at the start and the
 * rest drift in over four hundred days — so pricing it twice only starved the
 * corps. What crowds out sabotage is a separate question and belongs there.
 */
/**
 * What an unaligned island is worth going and talking to.
 *
 * It had no bonus at all: a neutral island scored its current regard for you
 * and nothing else, twenty or thirty against a research posting's fifty-five
 * and an abduction's hundred and fifty. So a whole island, permanently, for a
 * fortnight ashore on ground where nobody is hunting you, was priced below
 * sending somebody to a shipyard. Sean: *"diplomacy should be an early game
 * high priority... the easiest high value choice out the gate."*
 *
 * Priced above lifting one of theirs and below getting one of your own back,
 * which is the right order: an officer in their cells is already lost, an
 * officer on their quay is only at risk, and an island is an island.
 */
export const AI_COURT_BONUS = 170;
/**
 * Spells ashore the opponent will spend courting one unaligned island.
 *
 * Longer than its patience for anything else, because the thing it is waiting
 * for has a known finish line — eighty — and walking away at three cycles
 * throws away everything the first two bought. See `outOfPatience`.
 */
export const AI_COURTING_PATIENCE = 8;
/**
 * And how many an agitator gets, for the same reason.
 *
 * An incitement has to move an island about twenty points against a drift that
 * is always pulling it back, which is three or four landed fortnights — and at
 * the ordinary patience of four the opponent gave up on every one of them just
 * short. Measured over six wars: not a single island rose in either direction
 * in thirty-six hundred days of war.
 */
export const AI_AGITATION_PATIENCE = 8;
/**
 * What the opponent thinks a fortnight in its own yards is worth.
 *
 * Deliberately under an island — craft is a slow compounding thing and a
 * neutral island is a whole island — but well over inciting, so it is what a
 * spare officer does when there is nothing urgent. Before this the opponent
 * could not research at all (its candidate islands were only ever neutral,
 * enemy, or its own in trouble, and a yard on loyal ground is none of those),
 * so `craft` measured exactly zero at the end of every game on both sides.
 */
export const AI_RESEARCH_BONUS = 55;
/**
 * How long the opponent is prepared to sit under a battery.
 *
 * It will not open a siege it cannot finish inside this many days, which is
 * the rule that stops it doing what it did on its first outing: sending one
 * first-rate against a hundred and twenty of wall under forty guns, seven
 * times in eight games, and losing her every time without taking a stone off.
 * Short of the weight, it calls the rest of the navy in first.
 */
export const AI_SIEGE_DAYS = 6;

/*
 * Tried and cut: a floor of four slipways whatever the acreage, and an
 * afford-it test in place of the be-rich test, to let the smaller side build a
 * navy sized to its war aim rather than to its land. It did exactly what it
 * was meant to — the Confederacy's slipways went from 1.1 to 3.2 by day three
 * hundred — and the war got *worse*: Crown 30-7 against 28-11, and three
 * unfinished against one, because both sides spent their gold on berths
 * instead of hulls and the Crown, with twice the income, filled its new berths
 * and the Confederacy could not. It is the same lesson as the siege length and
 * the hunter cap below: a symmetric improvement to how well the machine plays
 * is worth more to the side with more to play with.
 */
/**
 * How long a treasury is expected to cover a deficit.
 *
 * The opponent's build rules weigh every order against its daily surplus, so
 * that a war of conquest does not bankrupt it — which is right, and was being
 * asked to do a job it could not: it took no account of savings at all. A side
 * sitting on six figures with a thin ledger built nothing, and a war it had
 * otherwise already won never ended.
 *
 * Four hundred days was most of a war, and that was the mistake: it only ever
 * released a side that was *absurdly* rich. Sean, 18 September, watching:
 * *"in observe mode I don't see the AI utilising facilities right."* Measured
 * on one war, and it is plain — the Crown at day 80 holds 73 gold and has three
 * construction yards working; at day 320 it holds 1,140 and has **none**
 * working and sixteen standing idle, with five idle slipways and eight idle
 * drill grounds beside them. Nothing was wrong with the yards. Every island it
 * had taken in between brought a garrison to feed, so the daily ledger went
 * under, and at four hundred days a treasury of 1,140 licenses 2.85 a day
 * against a margin of 3. The bank could not clear the bar by itself, ever.
 *
 * A hundred and twenty days instead, which is the horizon a side should
 * actually be spending on: gold still in the vault when the war ends bought
 * nothing at all, and a deficit a bank can carry for four months is not a
 * deficit worth refusing an order over. The same 1,140 now licenses nine and a
 * half a day, which is a slipway working.
 */
export const AI_RUNWAY_DAYS = 120;

/**
 * What the outer Reaches are worth, and why anybody goes there.
 *
 * Sean, 15 September: *"the unexplored islands should be explored most games.
 * They have available land and eventually players need to expand to get more
 * gold to maintain bigger fleets. As maintenance costs grow the unexplored
 * areas offer opportunities to add capital. If sims ignore them, that's a
 * mistake in tuning — all you have to do is move one ship carrying one
 * garrison to the location and land it, and now you have a free location you
 * didn't have to attack."*
 *
 * He is right on every count, and the arithmetic backs it: twenty of
 * sixty-three islands start empty, they carry four to ten plots apiece against
 * a settled island's six to thirteen, and one filled with earners clears
 * something over six gold a day against an opening surplus of five. A colony
 * nearly doubles what a side is making, and costs one company and a crossing.
 *
 * It measured zero. Every empty island is `control: 'none'` and the opponent's
 * candidate list had no clause for that — the same shape of hole that made
 * research unreachable — so it never surveyed one, never found one, and never
 * settled one. Twenty-three islands started dark and all twenty-three ended
 * dark, in every war.
 *
 * `AI_SURVEY_BONUS` is what a fortnight's exploring is worth, and it rises as
 * the ledger thins: a side with money to spare would rather court an island
 * than chart one, and a side feeling its upkeep should go looking for ground.
 */
export const AI_SURVEY_BONUS = 30;
export const AI_SURVEY_HUNGER = 6;
/**
 * And what *not being able to see* is worth, whatever the ledger says.
 *
 * Added 17 September, and it is the fix for a chain nobody would have guessed
 * at. Sean asked for a richer opening — free mills, a purse that fills every
 * yard on the first morning — and measured over six wars the errand economy
 * fell apart: parleys halved, explorations went from 38 to 16, reports from 44
 * to 17, and agitators and saboteurs stopped being sent *at all* (91 and 37
 * down to 3 and 0). Nothing had touched any of those rules.
 *
 * The cause was this line. Exploring was priced off `AI_SURVEY_HUNGER` alone —
 * *"a side with money to spare would rather court an island than chart one"* —
 * so a comfortable side scored the whole dark frontier at 30 and went nowhere
 * near it. An island nobody has charted cannot be incited, raided or spied on,
 * because every one of those errands needs `explored`. So making the opponent
 * rich quietly blinded it, and being blind took three errands off the board.
 *
 * Wanting ground when the bill grows is still true and still here. This is the
 * other reason to go and look, and it is the one that does not care what is in
 * the treasury: a side that cannot see most of the world wants to see it. It
 * fades on its own as the chart fills, which is exactly when it should.
 */
export const AI_SURVEY_DARK = 110;
/** What each plot of empty land is worth to a squadron looking for somewhere. */
export const AI_PLOT_WORTH = 9;
/** Above this surplus the opponent is comfortable and expands for its own sake;
 *  below it, a colony is the answer to the bill. */
export const AI_COMFORTABLE = 12;

/**
 * Bombardment past the walls, and what it costs.
 *
 * Once no fort stands, the guns can reach the garrison — but companies are not
 * a battery, they are men spread through a town, and shot that goes looking
 * for them finds the town. `BOMBARD_PER_COMPANY` is how much weight of shot it
 * takes to break one company, set high on purpose: a good siege train needs
 * most of a day per company, so landing against them is nearly always the
 * better answer and the decision at the door is simply *have I brought enough
 * troops*.
 *
 * When you decide you have not, this is the bill. Sean: *"if it hits civilian
 * infrastructure, then loyalty is going to be destroyed throughout that Reach.
 * If it's once, it's fine, but it'll stack."* So the island's own regard falls
 * hard and every other island in the same Reach hears about it — and each
 * further day of it costs more than the last, because a town shelled for a
 * fortnight is a different story from a town shelled once.
 */
export const BOMBARD_PER_COMPANY = 26;
export const CIVILIAN_LOYALTY_HIT = 5;
export const CIVILIAN_REACH_HIT = 1.5;
/** What each day of shelling adds to the next day's price. */
export const CIVILIAN_STACK = 0.5;
/** And a ceiling, so a long siege does not reach absurd numbers. */
export const CIVILIAN_STACK_MAX = 4;

/**
 * What mends, and how fast.
 *
 * Sean, 15 September: *"ships and forts recover strength slowly day by day.
 * Let's say 1% per day. Let's make forts recover twice as fast. And ships on
 * an island with shipyards recover twice as fast also."*
 *
 * A percentage of the whole, so a first-rate and a sloop both take about a
 * hundred days to come back from nearly gone — which against a median war of
 * some three hundred and fifty days is a third of it, and half that with a
 * yard to hand. A campaign rhythm rather than a heal button.
 *
 * Nothing mends at sea. That rule was already on the ship's own sheet and it
 * is worth keeping: a squadron carries what was done to it until it stops
 * fighting, so where you put a mauled fleet is a decision. A yard under
 * blockade is a yard that cannot work, but the walls still get patched — men
 * with shovels do their job under fire and shipwrights do not, which is also
 * what makes abandoning a half-finished siege worthless.
 */
export const REPAIR_PER_DAY = 0.01;
export const REPAIR_AT_A_YARD = 0.02;
export const FORT_REPAIR_PER_DAY = 0.02;

/**
 * Loyalty, in three bands, and what each one costs you.
 *
 * Allegiance used to be a number that moved a multiplier and nothing else.
 * It is now the thing the chart is drawn by and the thing that decides how
 * much of an island's trade you actually see: an island that does not love
 * you keeps working, but its harbor leaks — goods go out the back to the
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

/**
 * Open ground, in the same three bands. Two or three free berths is a place
 * with a plan left in it; five or more is somewhere a side can build a whole
 * new industry without asking anybody's leave.
 */
export const ROOM_FAIR = 2;
export const ROOM_AMPLE = 5;

export function roomBand(free: number): MarkSize {
  if (free >= ROOM_AMPLE) return 'large';
  if (free >= ROOM_FAIR) return 'medium';
  return 'small';
}

/**
 * How far a character's ratings wander from their base, game to game.
 *
 * Inverted at Sean's word, 15 September, night: **the principals are fixed and
 * the strangers vary.** It had been the other way about — the fourteen named
 * swinging twenty either way and the twelve unaligned ten — which meant the
 * thing you could look up was the thing you could not rely on.
 *
 * The question was whether knowing the cast should be knowledge worth having,
 * and it should. Hale is the best diplomat in the Seven Seas in every game now,
 * not in some of them; Corvane always out-leads everyone; Sable is always the
 * one you send to listen at a door. Learning who is who is learning something
 * that stays learned, which is what makes a cast a cast rather than a roll.
 *
 * The variance moves to where it is interesting instead. A stranger standing on
 * a quay is an unknown quantity by definition, and now genuinely is one: twenty
 * either way, so the harpooner you sign on in Coral Reach might be a journeyman
 * or the find of the war, and there is no way to know before you spend the
 * fortnight fetching them.
 *
 * The top is deliberately uncapped, which now belongs to the strangers: the
 * Widow's ninety can come out at a hundred and ten, and somebody having the
 * game of their life should be allowed to be better than anyone has any right
 * to be. The floor is 1 — nobody is negative at anything.
 */
export const RATING_SWING_MAJOR = 0;
export const RATING_SWING_MINOR = 20;

export function rollRating(rng: Rng, base: number, major: boolean): number {
  const swing = major ? RATING_SWING_MAJOR : RATING_SWING_MINOR;
  if (swing === 0) return Math.max(1, base);
  return Math.max(1, base + rng.range(-swing, swing));
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
 * The other half of a leaky harbor: word gets out. Each day, this is the
 * chance that an island of yours the enemy has never charted turns up on
 * their charts anyway, because somebody talked — and what they learn is not
 * only that it is there but what stands on it and how many companies hold
 * it, which is everything charting an island gives. A firm island keeps its
 * mouth shut.
 *
 * Raised from a fiftieth and a twenty-fifth on 15 September: at those rates
 * it fired in none of sixteen games, which is a rule that does not exist.
 */
export const LEAK_CHANCE: Record<LoyaltyBand, number> = {
  uprising: 0.1,
  thin: 0.05,
  steady: 0,
  firm: 0,
};

/**
 * Companies an island asks for, by band. Sean's ladder, 15 September: an
 * island that is firmly yours needs nobody standing over it, a steady one
 * needs a token, a thin one needs a real garrison, and one in open revolt
 * needs six before order comes back.
 */
export const GARRISON_FOR_BAND: Record<LoyaltyBand, number> = {
  firm: 0,
  steady: 1,
  thin: 4,
  uprising: 6,
};

/**
 * What each company ashore takes off the smugglers: a twentieth of what they
 * were running. Troops help at the margin and no further — twenty companies
 * would close the back door and nobody will ever keep twenty on one island,
 * so a sour harbor always leaks something. Sean's call, 15 September, over
 * a tenth: a garrison should not be an answer to disloyalty, only a hand on
 * it while you fix the real thing.
 */
export const GARRISON_SMUGGLING_CUT = 0.05;

export const LOYALTY_BAND_LABEL: Record<LoyaltyBand, string> = {
  uprising: 'In revolt',
  thin: 'Thin',
  steady: 'Steady',
  firm: 'Firm',
};

/**
 * Victory. Two ways, one each, and nothing else: the Confederacy wins the day
 * it holds Highwater; the Crown wins the day all three Pirate Lords are in
 * irons at once. Nobody is released for nothing — a prisoner is held until
 * their own side sends somebody to get them out — so the Crown's condition is a
 * grip it has to keep hold of rather than a checklist.
 */

/** Opponent AI cadence (spec 4.7). */
export const AI_BUILD_INTERVAL = 5;
/**
 * How often the opponent hands out errands, and how many at a time.
 *
 * Sean, 17 September, watching a war at day 300: *"often there are shipyards,
 * construction yards and training facilities idle. Seems like unoptimized
 * play... tons of blue (unaligned) locations. I feel like diplomacy should be
 * an early game high priority."*
 *
 * Both halves came back to this pair. Two errands every ten days is one errand
 * per side per five days, against five to eight officers who are free — so most
 * of a side's people stood on a quay most of the war. Measured over four
 * hundred days with both sides played: **fifty-nine errands in total**, across
 * two factions, of which thirteen were parleys. A side cannot court the
 * unaligned world at one parley every sixty days.
 *
 * Every three days, four at a time. The cap still exists — an opponent that
 * empties its whole roster onto the chart in one pass leaves nothing at home —
 * but it is now a brake on a moving thing rather than the thing itself.
 */
export const AI_MISSION_INTERVAL = 3;
/** How many officers the opponent will have ashore at once. One is not a
 *  faction playing the game; all of them at once is a diplomatic blitz. */
export const AI_MISSION_PARTIES = 4;
/**
 * How many errands the opponent will break off to go and get its own people.
 *
 * A prisoner stays a prisoner until somebody comes, and the errand pass only
 * ever looks at officers standing idle — so a side whose whole corps is ashore
 * somewhere can never mount a rescue at all. Measured over six wars the Crown
 * had two thirds of its officers in cells by day two hundred and never once
 * tried: the corps never recovered, and the recruiting, the research and the
 * war went with it. Two, because rescuing is worth interrupting talks for and
 * is not worth emptying the board for.
 */
export const AI_RESCUE_PARTIES = 2;
/**
 * How many spells ashore the opponent will give an errand that is getting
 * nowhere. Four is two months of work — long enough that a hard island is
 * still worth trying, short enough that nobody stands on a foreign quay for
 * a year waiting to be carried off.
 */
export const AI_MISSION_PATIENCE = 4;
/**
 * How many officers the opponent will have out hunting people at once.
 *
 * The three Lords stand on Confederate ground and can always be gone after,
 * so they are three permanent top-ranked targets that never go away — and the
 * Crown chased them with a quarter to a third of its whole corps, measured
 * over eight wars, while spending one to four per cent of it on yard work. It
 * ended the war at craft one against the Confederacy's three: hunting the
 * principals is the Crown's route to winning, and it was eating the fleet
 * that has to do the winning. Hunting is a standing detail, not the corps.
 */
export const AI_HUNTERS = 2;
/** How much of an island's watch the opponent counts against a covert errand
 *  there. A loyal capital with six companies is worth roughly two hundred, so
 *  at this rate it costs an abduction most of its bounty — which is the point:
 *  soften it first, or go somewhere else. */
export const AI_WATCH_CAUTION = 0.6;
/**
 * How much thinner a corps has to get before the opponent starts looking
 * after it, and how careful it becomes at the worst of it.
 *
 * Added 17 September, and it is the fix for the longest-standing stall in the
 * game. Measured over sixteen wars with both sides played: in the wars that
 * dragged, the Crown's officers at large fell to **0.5 by day two thousand**
 * while the Confederacy's rose to **twelve**, and the Crown had no Recruiter
 * at large *at all* at every late sample point. Across twelve wars the Crown
 * launched a hundred and twenty-two raids and lost ninety people, and answered
 * with twenty-seven rescues; the Brethren lost a hundred and thirty-eight and
 * answered with sixty-two, and got a hundred and three of them back.
 *
 * The missing idea is the one a person applies without thinking: a side with
 * six officers can afford a raid that will probably cost it one, and a side
 * with one cannot. So the price of being seen rises as the hands run out, and
 * getting your own people back rises with how much of your corps is sitting in
 * somebody else's cells. Nothing else changes — the same raids are available
 * at the same odds; what changes is when a side judges them worth it.
 */
export const AI_CORPS_COMFORT = 4;
export const AI_SCARCITY_MAX = 4;
/*
 * Tried and cut: scaling a rescue's worth by how much of the corps was in
 * irons, so a side with its people in somebody's cells would go and get them.
 * It reads as obviously right and measured plainly worse — 28-9 with three
 * wars unfinished against 28-11 with one, and seventy days longer — because a
 * side down to its last hands sent *them* into enemy harbours after the rest,
 * where they were taken too. It amplified the doom loop it was meant to break.
 * The scarcity term above is the half that works.
 */
/**
 * What the first officer at the yards is worth, over and above an ordinary
 * spell of yard work.
 *
 * Craft is the compounding thing in this game — it is what the better hulls
 * are unlocked by — and it is the only errand that pays a side for the whole
 * rest of the war. It also loses every ranking it is in: a mark on a quay or
 * an island about to come over is worth more today, so a side with a war on
 * never gets round to it. Measured across four seed blocks the Crown ended
 * every one of them at craft 1.0 to 1.5 against the Confederacy's 2.1 to
 * 2.7 — fighting the second half of every war in worse ships — because its
 * officers were all out hunting Lords, which is the errand its victory
 * condition demands.
 *
 * So the *first* hand at the yards is priced above anything else on the
 * chart, and the second is priced as it always was. One shipwright is not a
 * research programme; nobody at all is a fleet that stops improving on day
 * one.
 */
export const AI_FIRST_YARD_BONUS = 300;
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
 * Companies a drill-ground island will raise over and above what holds it.
 *
 * What a landing is made of. Without it a drill ground only ever worked for
 * the island under it, and the islands with drill grounds are the long-held
 * quiet ones that are never short — so they drilled nothing for the rest of
 * the war while the side had no companies to put ashore anywhere.
 */
export const AI_LANDING_POOL = 4;

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

/**
 * What a works waits on the shipwrights for.
 *
 * Sean, 17 September: *"Heavy Fortress needs to be gated by Research
 * mission."* Until now the research errand reached hulls and nothing else, so
 * the one building in the game that is a campaign decision could be thrown up
 * on day one by anybody with 250 gold. A grade is a hundred progress — one
 * officer, three or four cycles in your own yards — so this is a fortnight or
 * two of somebody's time and not a tech tree, which is the right weight for
 * the thing it unlocks.
 */
export const FACILITY_CRAFT: Partial<Record<FacilityType, number>> = { heavy_fort: 1 };

/** Facility types that a construction yard is allowed to queue. */
export const YARD_BUILDABLE: FacilityType[] = [
  'mine',
  'refinery',
  'construction_yard',
  'training_facility',
  'shipyard',
  'fort',
  'heavy_fort',
];

/**
 * What the ground holds, and how much of it.
 *
 * Sean's ruling, 16 September: forests common, gold rare. Every island rolls
 * two to five forests; one island in four has gold at all, and where it does
 * there are one or two veins. The roll is the island's own and never changes:
 * what is under an island is a fact about the island, not about the war.
 *
 * A light nudge by what the island looks like, because a jungle island with no
 * trees and an ice floe with five would make the paintings liars — it is still
 * a roll, taken within the island's character.
 */
export const FOREST_MIN = 3;
export const FOREST_MAX = 6;
export const GOLD_ISLAND_CHANCE = 0.25;
export const GOLD_VEINS_MIN = 1;
export const GOLD_VEINS_MAX = 2;
/**
 * Berths kept clear of deposits whatever the roll.
 *
 * One is enough, and two was one too many. A mill takes the forest's own berth,
 * so an island needs exactly one open plot to bootstrap itself: put a
 * construction yard in it, and that yard can then work every forest on the
 * island without ever needing another. Measured at two, the cap was biting on
 * 37% of islands and the whole world ran out of ground by day 200.
 */
export const CLEAR_BERTHS = 1;

/** How many more or fewer trees an island of this sort carries. */
export const FOREST_BY_LOOK: Partial<Record<IslandArchetype, number>> = {
  'jungle-isle': 1,
  'storm-isle': 1,
  'ice-isle': -1,
  'tide-isle': -2,
  'drowned-isle': -1,
};

/** And where a vein is likelier than one island in four, or less likely. */
export const GOLD_BY_LOOK: Partial<Record<IslandArchetype, number>> = {
  'mining-isle': 0.45,
  'rock-isle': 0.1,
  'ice-isle': -0.05,
  'drowned-isle': -0.1,
  'free-harbor': -0.1,
  'port-city': -0.1,
};

/**
 * How much of a settled island's ground is already worked when the war opens.
 *
 * Sean, 16 September: *"The difference between settled and unsettled will be
 * settled islands will have resources already converted. Some, not necessarily
 * all."* Which is the whole difference between the two kinds of island, and a
 * good one: an empty island is cheap ground with all of its worth still in
 * front of you, and a settled island is a going concern you take for what is
 * already standing on it.
 *
 * A share of the deposits, rolled per island, so no two settled islands are
 * the same and none of them is finished. Never all of it — there is always
 * something left for a new holder to do.
 */
/**
 * Forests the opponent will not fell, however badly it wants the plot.
 *
 * Clearing is the one order that takes something out of the world for good, so
 * it is kept for islands with timber to spare. Two: an island down to its last
 * couple of stands keeps them, and an island covered in trees can afford to
 * lose one for a drill ground.
 */
export const AI_KEEP_TIMBER = 2;

export const SETTLED_WORKED_MIN = 0.3;
export const SETTLED_WORKED_MAX = 0.7;

export const RESOURCE_LABEL: Record<ResourceType, string> = {
  forest: 'Forest',
  gold: 'Gold vein',
};

export const RESOURCE_BLURB: Record<ResourceType, string> = {
  forest:
    'Standing timber. A Lumber Mill can be raised on it and nowhere else, and the mill takes its ground.',
  gold: 'A vein in the rock. A Gold Mine can be raised on it and nowhere else. Few islands have one.',
};

/** Which works a deposit can carry, and which deposit a works needs. */
export const WORKS_ON: Partial<Record<FacilityType, ResourceType>> = {
  refinery: 'forest',
  mine: 'gold',
};

export function needsResource(item: BuildItem): ResourceType | undefined {
  return typeof item === 'string' ? WORKS_ON[item as FacilityType] : undefined;
}

/**
 * The order buildings are shown in, everywhere they are listed.
 *
 * Sean's ruling, 16 September: *"Buildings do not need to be reordered, and
 * they should always be grouped similar. Only fleets need to be able to be
 * reordered. Buildings will follow a specific order: shipyards, training
 * facilities, construction yards, other, raw."*
 *
 * Makers first and biggest-commitment first, then the defences, then the
 * earners, and the unworked ground last of all — it is the only thing on the
 * board that is not a building. One order everywhere means an island's panel
 * reads the same way as every other island's, which is the whole reason to
 * take the choice away.
 */
export const BUILDING_ORDER: FacilityType[] = [
  'shipyard',
  'training_facility',
  'construction_yard',
  'heavy_fort',
  'fort',
  'refinery',
  'mine',
];

export function buildingRank(type: FacilityType): number {
  const at = BUILDING_ORDER.indexOf(type);
  return at === -1 ? BUILDING_ORDER.length : at;
}

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

/* ---------------------------------------------------------------------------
 * The political model. See `src/sim/politics.ts` for what each of these does
 * and why; the numbers live here because every other dial in the game does.
 *
 * Tuned to two readings Sean asked for by name. A ninety-Diplomacy envoy on an
 * unaligned harbor should be plainly favourable and never certain; a
 * thirty-five-Diplomacy one against an island that loves the other side should
 * be plainly hopeless and never impossible.
 * ------------------------------------------------------------------------ */

/** Even odds before anything is known about either side. */
export const PARLEY_BASE_CHANCE = 0.5;
/** How much a point of advantage is worth. At 160, a forty-point edge in
 *  persuasion over the island's own view moves the odds a quarter. */
export const PARLEY_SCALE = 160;
/** Sean's rule 7: 95 Diplomacy is not a hundred per cent and 35 is not nil. */
export const PARLEY_FLOOR = 0.08;
export const PARLEY_CEILING = 0.92;
/** What a landed fortnight moves, worst to best. The old rule gave a flat
 *  `8 + Diplomacy/10` every single time. */
/*
 * What a landed fortnight is worth, from the one that barely came off to the
 * one that went beautifully.
 *
 * These have to be read against `SUPPORT_DRIFT`, which is the thing that
 * caught the first pass out. An island nobody holds settles back toward fifty
 * at a quarter-point a day, so a fortnight ashore is arguing against three and
 * a half points of forgetting before it has won anything. At 2-10 — a mean of
 * six, landed about half the time — a parley won about three points a
 * fortnight and lost three and a half, which is not slow, it is a treadmill:
 * modelled over four thousand courtings, only *forty per cent* of them ever
 * carried the island inside the opponent's patience, and measured over six
 * wars the two sides between them left the archipelago with thirty-seven
 * unaligned islands still on it and never sent a single agitator or explorer
 * anywhere, because there was always another neutral island to fail at.
 *
 * At 4-18 a trained envoy carries a cold island in four fortnights and nine
 * times in ten, an ordinary officer in five and six times in ten, and a poor
 * one fails outright as often as not — which is the shape Sean asked for: who
 * you send is the question, and the answer is never certain.
 */
export const PARLEY_SWING_MIN = 4;
export const PARLEY_SWING_MAX = 18;

/** Incitement starts from worse odds than a parley, by Sean's rule 13. */
export const INCITE_BASE_CHANCE = 0.42;
export const INCITE_SCALE = 180;
export const INCITE_FLOOR = 0.05;
export const INCITE_CEILING = 0.85;
/** How much of the holder's standing argues back. */
export const INCITE_RESIST = 0.8;

/** What each hand after the first is worth on a political errand. */
export const PARTY_FALLOFF = [1, 0.75, 0.5, 0.25];
/** What being the right sort of person is worth, for the one leading it. */
export const ROLE_BONUS = 12;

/** Political security: what a company is worth, and what an officer is worth
 *  per point of Leadership. Neither buys allegiance — both buy quiet. */
export const SECURITY_PER_COMPANY = 6;
export const SECURITY_FROM_OFFICER = 0.3;

/**
 * Joining. The replacement for the eighty-point line.
 *
 * Asked only after a parley cycle that landed, so at 60 an island is a long
 * shot, at 80 it is better than one meeting in three, at 100 it is two in
 * three — and it is never a certainty at any number.
 */
export const JOIN_FLOOR = 55;
export const JOIN_SPAN = 70;
export const JOIN_CEILING = 0.7;

/** Where unrest starts being possible at all, and how steeply. There is no
 *  line any more — this is the top of a slope, not a trigger. */
export const MUTINY_WATCH = 45;
export const MUTINY_DIVISOR = 900;
/** The most an island can rise on any one day, however wretched it is. */
export const MUTINY_CEILING = 0.05;

/** What has lately happened here, and how fast it is forgotten. */
export const MOMENTUM_PER_SUCCESS = 6;
export const MOMENTUM_CAP = 30;
export const MOMENTUM_DECAY = 0.4;
/** How much momentum is worth against the other terms. */
export const MOMENTUM_WEIGHT = 1.2;

/**
 * What the opponent makes of all that.
 *
 * It used to price a political errand off allegiance alone: an unaligned
 * island by how warm it already was, an enemy island by how weakly held. Both
 * were the only figures there were. Now there is a standing that folds in who
 * is in the boat, what the island thinks, what is standing in the square and
 * what has lately been happening there — so the opponent reads that instead,
 * and these are what each half of it is worth against the other.
 *
 * Both are a premium multiplied by how likely the errand is to come off, and
 * that is the whole change. A flat premium on courting was a veto on
 * incitement dressed up as a preference: an unaligned island scored a hundred
 * and seventy whether the envoy could talk it round or not, an enemy island
 * scored a fraction of that at best, and measured over six wars the two sides
 * between them sent *no agitator anywhere at all* — nor any explorer, nor
 * much of a spy, because there was always another neutral island to fail at.
 * Priced this way a hostile harbor nobody can talk round stops outranking a
 * weakly-held one that would rise if somebody leaned on it.
 *
 * And the incitement side is the one political security finally reaches. Under
 * the old term a harbor with six companies and a commander in the chair scored
 * exactly as well as an empty one at the same allegiance; `inciteStanding`
 * prices them in, so the softer island up the chain wins the trip.
 */
export const AI_JOIN_WEIGHT = 80;
export const AI_INCITE_BONUS = 200;

/**
 * How news travels — Sean's propagation memo of 17 September, in numbers.
 *
 * The shape of every figure here comes from his worked example: a major
 * political conversion moves the island itself about ten points, the island
 * next door about three, the next about two, a distant one about one and a
 * remote one about half. Read `REGIONAL_FALLOFF` against a `regional` of 3 and
 * that is exactly what comes out.
 */
/** What each island in the Reach feels, nearest first, as a fraction of the
 *  shock's regional figure. Six deep, then the news has run out of people who
 *  care. */
export const REGIONAL_FALLOFF = [1, 0.7, 0.45, 0.3, 0.18, 0.1];
/** How much any one island's share may vary, either way. *"The exact effect
 *  can vary slightly... without guaranteeing a cascade."* */
export const REGIONAL_JITTER = 0.4;
/** The same, for the rare thing the whole world hears about. */
export const GLOBAL_JITTER = 0.5;
/**
 * A Reach's political connectivity, rolled once at worldgen.
 *
 * *"High-connectivity region: stronger domino effects... low-connectivity
 * region: more isolated politics, more resistant to outside influence."* At
 * 0.45 a Reach barely passes news along at all and has to be taken island by
 * island; at 1.45 one defection is felt down the whole chain.
 */
export const CONNECTIVITY_MIN = 0.45;
export const CONNECTIVITY_MAX = 1.45;
/**
 * What a shock is still worth at each depth of a cascade.
 *
 * Sean's §7: *"initial event 100%; second-order 50-70%; third-order 20-40%;
 * fourth-order negligible. This prevents one diplomatic action from
 * accidentally flipping an entire world."* Taken at the middle of each band,
 * and then a hard stop, because "negligible" that is not actually zero is a
 * chain that runs for ever at a hundredth of a point.
 */
export const CASCADE_DAMP = [1, 0.6, 0.3, 0];
/** How long an island remembers being shaken, for counting cascade depth.
 *  About a fortnight: long enough for the news to have caused what it caused,
 *  short enough that a second rising a season later is its own event. */
export const CASCADE_MEMORY = 20;
/** How long the chart ripples a Reach after something happened in it. */
export const SHOCKWAVE_DAYS = 3;

/**
 * What each kind of event is worth, locally and regionally.
 *
 * The regional figure is what the *nearest* island feels; `REGIONAL_FALLOFF`
 * takes it down the chain from there. Only events on this list are regional at
 * all — Sean's first rule is that *"the vast majority of normal actions should
 * be LOCAL"*, and a landed parley, a failed one, a garrison arriving and the
 * daily drift are all local and stay local.
 */
/** An unaligned island declares for somebody of its own accord. §3. */
export const SHOCK_CONVERSION = { local: 0, regional: 3 };
/** An island somebody held changes hands without a shot. §3. */
export const SHOCK_DEFECTION = { local: 0, regional: 3.5 };
/** An island throws its governor out. §3. */
export const SHOCK_MUTINY = { local: 0, regional: 2.5 };
/** A landing. Positive where the people wanted you, negative where they did
 *  not — §11 against §12 — and the line between is `SHOCK_LIBERATION_LEVEL`. */
export const SHOCK_CONQUEST = { local: 6, regional: 2.5 };
export const SHOCK_LIBERATION_LEVEL = 55;
/**
 * A day's bombardment, and the sharpest distinction in the memo.
 *
 * §13: shelling an island's works is *"a major political mistake"* — a large
 * local loss, a moderate regional one, and a very small global one, because
 * *"people across the region hear about the destruction"*. §14: shelling a
 * wall is not, because *"the attacking faction is perceived as defeating the
 * enemy military rather than attacking civilians"*, and it is worth a little
 * goodwill instead. The whole difference is what the guns were pointed at.
 */
export const SHOCK_CIVILIAN_FIRE = { local: 5, regional: 1.6, global: 0.25 };
export const SHOCK_MILITARY_FIRE = { local: 0.8, regional: 0.3 };
/** A fleet action, scaled by the guns that went to the bottom. §15: a patrol
 *  is nothing, a battle fleet is felt. */
export const SHOCK_PER_GUN_SUNK = 0.045;
/** Below this many guns destroyed, nobody outside the harbor hears about it. */
export const SHOCK_BATTLE_FLOOR = 25;
/** And a ceiling, so one enormous action is not the end of the political war. */
export const SHOCK_BATTLE_CEILING = 4;
/** One of the three Lords taken, or got back out. §16, and rare by nature. */
export const SHOCK_PRINCIPAL = { local: 4, regional: 2 };
