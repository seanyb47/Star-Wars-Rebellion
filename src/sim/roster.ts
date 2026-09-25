/**
 * Where the canonical roster meets the game.
 *
 * `shipdefs.ts` reads the sheet and checks it. `cannon.ts` fights with it.
 * This is the third piece: it turns twenty-eight `ShipDefinition`s into the
 * twenty-eight hulls the rest of the game already knows how to build, sail,
 * pay for and draw — so `ships.json` can go.
 *
 * Almost all of it is a rename. Six fields are not, and they are the whole of
 * the interesting part of this file:
 *
 * **Three of them are the two scales meeting.** The roster's combat numbers
 * and the roster's *prices* are on different footings. The combat numbers are
 * absolute and port straight across, which `cannon.test.ts` proves by
 * reproducing the sheet's own battle lengths without tuning. The prices are
 * not: the sheet costs a Majestic at 2,610 gold and 1,200 days, against a war
 * that runs six to nine hundred days on island incomes of three to nine gold
 * a day. Ported literally, the best hull in the game takes thirteen years to
 * build and nothing else is ever laid down. So gold, days and daily
 * maintenance are each divided by a constant named below, chosen to land the
 * roster on the economy the game already has while leaving every hull's price
 * *relative to every other hull's* exactly as the sheet set it. That last
 * clause is the one that matters: the ratings in the sheet measure purchase
 * value, and a single divisor per column leaves every one of them true.
 *
 * **Two are the ladder.** The sheet gives four starting hulls a side and eight
 * research unlocks in order; the game had three grades of shipwright craft.
 * There are eight rungs now, at the same total progress the third grade used
 * to sit at, so the research is the same length of work and there are simply
 * more things on the way up. The troop roster of 19 September already assumed
 * this — its unlocks are written R2, R4, R6 and R8 — which is the better
 * argument for eight than anything here.
 *
 * **And one is a guess made honest.** The sheet's Speed is a word, and the
 * game wants two numbers from it: how long a crossing takes, and how hard a
 * hull is to catch when it runs. Both tables are below with the old roster's
 * values beside them, so the swap moves nothing that was not already moving.
 */
import { NAVY_FACTION_TO_PLAYABLE, ROSTER, type ShipDefinition, type SpeedCategory } from './shipdefs';
import flavourData from '../data/ship-flavour.json';
import type { PlayableFaction, ShipClassId, ShipRole } from './types';

/* ------------------------------------------------------- the three divisors */

/**
 * What the sheet's Gold to Build is divided by to become a price in this game.
 *
 * One. It is the same gold.
 *
 * This was five until 21 September, on the reasoning that the sheet had no
 * stated relationship to what an island earns. It has one: `buildTimeBands`
 * and `maintenanceBands` both price against *actual build cost*, and the
 * island economy was already built to the sheet's scale without anybody
 * noticing. Sean, asked directly, was unambiguous — a gold is a gold, a build
 * day is a game day, and an island earning three to nine a day is "about
 * right".
 */
export const ROSTER_GOLD_DIVISOR = 1;

/**
 * And Days to Build, which is also one, and which is the answer that surprised
 * me.
 *
 * Sean, 21 September: *"if it's talking about the ships it's how many game
 * days does it take for the ship to be completed and usable."* So a Majestic
 * really is twelve hundred days.
 *
 * It works because of a rule that was already in the game and that I had
 * forgotten was load-bearing: **build time divides by how many yards of that
 * kind stand on the island**, asked fresh every morning. A Majestic is twelve
 * hundred days at one slipway and two hundred at six. So the sheet's numbers
 * are not a wait, they are a *price in shipyards* — and that turns the whole
 * roster into the decision Sean says the game is about: *"are you building
 * income producing facilities or are you building stuff that makes you
 * ships?"* A side that wants capitals has to spend its berths on the yards to
 * lay them down, and those berths are not earning.
 *
 * Measured, twelve wars: gold stops being the constraint and starts piling up
 * — both sides ended on twenty-seven and thirty-six thousand — which is what
 * made it safe to stop discounting upkeep as well.
 */
export const ROSTER_DAYS_DIVISOR = 1;

/**
 * Upkeep is not divided at all. It is recomputed.
 *
 * The sheet's own `maintenanceBands` define On Rate as **1% of actual build
 * cost per day**, and that is the number used here. The Gold/Day Maintenance
 * column is not: measured against the sheet's own benchmark, every hull in the
 * roster is above rate, the Crown's by a mean of 238% and the Confederacy's by
 * 172%.
 *
 * That gap is question B4 — *"the Crown pays 2.1x the Confederacy's
 * maintenance for the same hull"* — and at full scale it is not a flavour, it
 * is decisive: with the column taken literally the Crown ended wars on
 * **thirteen hulls** against the Confederacy's thirty-two, because it simply
 * could not afford a navy. Sean, on that question: *"we'll fix that in
 * balancing... I'll default to the AI for help with tuning."*
 *
 * So this is the tuning, and it is deliberately not a number I invented: it is
 * the sheet's own definition of On Rate, applied to every hull on both sides.
 * It removes the Crown's tax as a side effect of removing everybody's, and it
 * leaves the *relative* price of hulls exactly where `Gold to Build` puts it.
 *
 * WHAT IT THROWS AWAY, and this is the open question: the column's deliberate
 * per-hull deviations. The Witchlight paying above rate is called a valve in
 * the troop document, and the Swift at 36% of rate is meant to be nearly free
 * to keep. Both are flattened here. If those deviations are load-bearing, the
 * fix is to keep each hull's ratio to its own benchmark and compress it
 * rather than discard it — but that needs Sean's word on which ones matter.
 */
export const UPKEEP_SHARE_OF_COST = 0.01;

/* ------------------------------------------------------------- speed, twice */

/**
 * How long a crossing takes, against a frigate's.
 *
 * The old roster's `pace` by role: a sloop 0.7, a frigate 1, a ship of the
 * line 1.35. The sheet's four words map onto that range and keep its ends.
 */
const PACE_OF: Record<SpeedCategory, number> = {
  'Very Fast': 0.7,
  Fast: 0.85,
  Normal: 1,
  Slow: 1.35,
  // Nothing in the roster is None. A shore battery does not make crossings.
  None: 1,
};

/**
 * And how hard she is to catch once her fleet has broken off, 1 to 10.
 *
 * The old roster's `speed` ran from a Reefwalker's 12 to a Majestic's 2 and
 * was set per class by hand. Four words cannot reproduce twenty-four
 * hand-set numbers and should not try: these are the four bands those numbers
 * clustered into.
 */
const EVASION_OF: Record<SpeedCategory, number> = {
  'Very Fast': 11,
  Fast: 8,
  Normal: 5,
  Slow: 2,
  None: 0,
};

/* ------------------------------------------------------------- the ladder */

/**
 * Which grade of craft each research step waits on.
 *
 * R1 is the first rung and R8 the eighth, so the number in the sheet *is* the
 * grade. A starting hull waits on nothing.
 */
export function craftFor(def: ShipDefinition): number | undefined {
  return def.research.kind === 'start' ? undefined : def.research.order;
}

/* --------------------------------------------------------------- the slugs */

/**
 * A readable id, because `CWN-SOV-S04` is a fine primary key for a spreadsheet
 * and a poor one for a save file, a build order or a line of code.
 *
 * Written out rather than derived from the name so that renaming a hull in the
 * sheet cannot silently invalidate every save in existence — the same reason
 * `reaches.json` writes its island seeds down.
 */
const SLUG: Record<string, ShipClassId> = {
  // --- Crown Imperium ---
  'CWN-WAY-S01': 'wayfinder',
  'CWN-INT-S02': 'interceptor-i',
  'CWN-MOR-S03': 'morningstar',
  'CWN-SOV-S04': 'sovereign',
  'CWN-VAN-R1-01': 'vanguard',
  'CWN-FEN-R1-02': 'fenrunner',
  'CWN-RES-R2-01': 'resolute',
  'CWN-BUL-R3-01': 'bulwark',
  'CWN-VAN-R4-02': 'vanguard-ii',
  'CWN-INT-R5-02': 'interceptor-ii',
  'CWN-WRA-R5-03': 'wraith',
  'CWN-JUS-R6-01': 'justiciar',
  'CWN-SOV-R7-02': 'sovereign-ii',
  'CWN-MAJ-R8-01': 'majestic',
  // --- Free Confederacy ---
  'CFS-SWI-S01': 'swift',
  'CFS-BRI-S02': 'brigantine',
  'CFS-CHI-S03': 'chimera',
  'CFS-TID-S04': 'tidestalker',
  'CFS-MAR-R1-01': 'marauder',
  'CFS-CUT-R2-01': 'cutlass',
  'CFS-WIT-R2-02': 'witchlight',
  'CFS-TEM-R3-01': 'tempest',
  'CFS-URW-R3-01': 'urskin-whaler',
  'CFS-REE-R4-01': 'reefwarden',
  'CFS-IRB-R5-01': 'ironback',
  'CFS-BLA-R6-01': 'blackfin',
  'CFS-URG-R7-01': 'urskin-goliath',
  'CFS-COR-R8-01': 'coral-dreadnaught',
};

export const slugOf = (rosterId: string): ShipClassId | undefined => SLUG[rosterId];

/**
 * What a save written against the old roster becomes.
 *
 * Taken from the crosswalk `lookup.tsx` has been using to send a player from a
 * live hull to its encyclopedia entry, which Sean settled when the two rosters
 * first stood side by side. Four hulls had no counterpart there and were left
 * pointing nowhere on purpose — the new roster cut them rather than renaming
 * them — but a save cannot be left pointing nowhere, so each is sent to the
 * nearest hull of its side and size. A Razorback was a Crown medium frigate
 * and the Resolute is the Crown's medium frigate; a Freebooter was a
 * Confederate large and the Ironback is one.
 */
export const LEGACY_SHIP_CLASS: Record<string, ShipClassId> = {
  // Same ship, same name.
  sovereign: 'sovereign',
  'sovereign-ii': 'sovereign-ii',
  bulwark: 'bulwark',
  vanguard: 'vanguard',
  'vanguard-ii': 'vanguard-ii',
  majestic: 'majestic',
  swift: 'swift',
  tempest: 'tempest',
  cutlass: 'cutlass',
  marauder: 'marauder',
  'urskin-whaler': 'urskin-whaler',
  // Same ship, renamed by the new roster.
  kestrel: 'interceptor-i',
  'kestrel-ii': 'interceptor-ii',
  fluyt: 'wayfinder',
  brig: 'brigantine',
  reef: 'coral-dreadnaught',
  reefwalker: 'reefwarden',
  // Cut rather than renamed: sent to the nearest hull of the same side and
  // size, because a save has to land somewhere.
  razorback: 'resolute',
  'razorback-ii': 'resolute',
  'fluyt-ii': 'wayfinder',
  freebooter: 'ironback',
};

/* ------------------------------------------------------------ the conversion */

/** What the game calls a hull of this size. */
function roleOf(def: ShipDefinition): ShipRole {
  // The one hull in the roster that carries and does not fight. The old game
  // had a whole transport role because lift was a property of being a
  // transport; lift is a number on every hull now, so this is a label for the
  // fleet list rather than a rule.
  if (def.combatantType === 'Noncombat') return 'transport';
  if (def.size === 'Small') return 'small';
  if (def.size === 'Medium') return 'medium';
  return 'large';
}

const FLAVOUR = flavourData.flavour as Record<string, string>;

/** One hull, as the game needs it. */
export interface RosterClass {
  id: ShipClassId;
  /** Its key in the sheet, for the encyclopedia and for round-tripping. */
  rosterId: string;
  faction: PlayableFaction;
  role: ShipRole;
  name: string;
  blurb: string;
  craft?: number;
  /* --- what the guns care about --- */
  size: ShipDefinition['size'];
  speedCategory: SpeedCategory;
  armor: number;
  longGuns: number;
  heavyGuns: number;
  lightGuns: number;
  /* --- what the rest of the game cares about --- */
  hull: number;
  guns: number;
  bombard: number;
  carries: number;
  costGold: number;
  days: number;
  upkeep: number;
  pace: number;
  speed: number;
  repairPerDay: number;
}

function convert(def: ShipDefinition): RosterClass {
  const id = SLUG[def.id];
  if (!id) throw new Error(`No slug for roster hull ${def.id}. Add it to SLUG in roster.ts.`);
  return {
    id,
    rosterId: def.id,
    faction: NAVY_FACTION_TO_PLAYABLE[def.faction],
    role: roleOf(def),
    name: def.name,
    // The sheet's own Design Notes were the stat grid written out as a
    // sentence, so Sean had them replaced; this is the replacement.
    blurb: FLAVOUR[def.id] ?? '',
    craft: craftFor(def),
    size: def.size,
    speedCategory: def.speed,
    armor: def.armor,
    longGuns: def.guns.longGuns,
    heavyGuns: def.guns.heavyGuns,
    lightGuns: def.guns.lightGuns,
    hull: def.hull,
    // Kept as a single number for everything that only wants to know how
    // heavily armed a hull is — a fleet-strength readout, the AI's estimate of
    // what is sitting in a harbor. Nothing fires it: the guns that fire are
    // the three above.
    guns: def.guns.longGuns + def.guns.heavyGuns + def.guns.lightGuns,
    bombard: def.bombardment,
    carries: def.troopCapacity,
    costGold: Math.max(1, Math.round(def.goldToBuild / ROSTER_GOLD_DIVISOR)),
    days: Math.max(1, Math.ceil(def.daysToBuild / ROSTER_DAYS_DIVISOR)),
    upkeep: Math.max(0.1, Math.round(def.goldToBuild * UPKEEP_SHARE_OF_COST * 10) / 10),
    pace: PACE_OF[def.speed],
    speed: EVASION_OF[def.speed],
    repairPerDay: def.repairRatePerDay,
  };
}

/** The twenty-eight, in the order each side gets them. */
export const ROSTER_CLASSES: RosterClass[] = ROSTER.ships.map(convert);
