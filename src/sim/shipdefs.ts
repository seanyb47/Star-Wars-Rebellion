/**
 * The naval roster: what a ship *is*, before anybody sails one.
 *
 * Sean's combat overhaul of 18 September arrived as a pair of v2.4 design
 * exports, and then he went and rewrote the fleet himself the same day. The
 * **Fleet Roster sheet in Drive is the roster now** and is read verbatim into
 * `src/data/combat-ships.json`; the v2.4 export is superseded and the file
 * records which it replaced.
 *
 * What his revision did: twenty-four hulls rather than twenty-five, four
 * starting ships and eight research unlocks a side with the Confederacy's
 * gapped ladder closed, two new Confederate starts (Chimera, Tidestalker), a
 * new Crown warship (Justiciar), and the endgame split three ways — the
 * Majestic keeps the heaviest guns, the Urskin Whaler takes the largest hull
 * in the game, the Coral-Class takes the heaviest armor.
 *
 * Three rules shape this file, and all three are his:
 *
 * 1. **Balance data is not engine logic.** Every number lives in
 *    `src/data/combat-ships.json`, imported verbatim from the export. This
 *    file knows how to read and check that data and nothing about what any of
 *    it means in a fight.
 * 2. **Do not invent missing formulas.** Armor mitigation, First Strike,
 *    pursuit, how three kinds of gun resolve against a hull — none of that is
 *    defined yet, so none of it is here. See `navy.ts` for the placeholders
 *    and the open questions.
 * 3. **Nothing is wired into the live game.** This is the parallel system Sean
 *    asked for: it loads, it validates, it is tested, and `advanceDay` has
 *    never heard of it. The existing roster in `ships.json` is untouched.
 *
 * The one thing this file does decide is the *shape*: an immutable definition
 * here, a mutable instance in `navy.ts`, and no way to confuse the two.
 */
import rosterData from '../data/combat-ships.json';

/* -------------------------------------------------------------- vocabulary */

/**
 * The two navies, under the names the design export uses.
 *
 * Deliberately not `PlayableFaction` ('empire' | 'alliance'). The export is
 * the source of truth for its own vocabulary, and while this system runs
 * alongside the live game rather than inside it, a translation is a place for
 * a bug to hide. `NAVY_FACTION_TO_PLAYABLE` is the one crossing point, and it
 * is used by nothing yet.
 */
export const NAVY_FACTIONS = ['Crown Imperium', 'Free Confederacy'] as const;
export type NavyFaction = (typeof NAVY_FACTIONS)[number];

/** Which side of the live game each navy is, for when the two systems meet. */
export const NAVY_FACTION_TO_PLAYABLE: Record<NavyFaction, 'empire' | 'alliance'> = {
  'Crown Imperium': 'empire',
  'Free Confederacy': 'alliance',
};

/** The five speed categories. Combat reads these directly — there is no 1–10. */
export const SPEED_CATEGORIES = ['None', 'Slow', 'Normal', 'Fast', 'Very Fast'] as const;
export type SpeedCategory = (typeof SPEED_CATEGORIES)[number];

/**
 * How big a hull is, smallest first.
 *
 * New with the locked combat rules of 18 September, and *"a manual ship
 * property, separate from Hull and Armor."* It is one half of what decides
 * whether a gun hits: a Heavy Gun is −30 against a Small hull and +15 against a
 * Gigantic one, which is the whole of why a first-rate cannot swat sloops.
 */
export const SHIP_SIZES = ['Small', 'Medium', 'Large', 'Gigantic'] as const;
export type ShipSize = (typeof SHIP_SIZES)[number];

/**
 * Whether a hull is worth shooting at first.
 *
 * The roster marks the Swift — no guns at all — as Noncombat, and the targeting
 * rule is that *"transports with zero guns remain valid targets but are
 * considered only after armed targets are handled."*
 */
export const COMBATANT_TYPES = ['Warship', 'Noncombat'] as const;
export type CombatantType = (typeof COMBATANT_TYPES)[number];

/**
 * The five condition states, worst first.
 *
 * Ordered T0 to T4 exactly as the export's Status band is, so an index into
 * this array is a tier. What is *not* established anywhere is where the
 * boundaries fall — see `HULL_STATUS_THRESHOLDS` in `navy.ts`, which is an
 * assumption and says so.
 */
export const SHIP_STATUSES = [
  'Destroyed',
  'Critically Damaged',
  'Heavily Damaged',
  'Damaged',
  'Healthy',
] as const;
export type ShipStatus = (typeof SHIP_STATUSES)[number];

/**
 * Where a hull sits in its faction's order of battle.
 *
 * Sean, 18 September: *"S = starting (you will have at least 1 of each class
 * depending on difficulty). R = requires research to unlock (ship research
 * mission), and the # is the order unlocked."*
 *
 * So the letter is a kind and the number is a sequence, and the two kinds
 * number independently: S01–S04 are the four hulls a side opens with, R1
 * upward is the order the research errand brings the rest in.
 */
export type ResearchKind = 'start' | 'research';

export interface ResearchStep {
  kind: ResearchKind;
  /** 1-based. The order within its kind, not across both. */
  order: number;
  /** As written in the data — 'S01', 'R10' — for reporting and round-tripping. */
  raw: string;
}

/** Long, Heavy and Light. The weapon system is these three and nothing else. */
export interface ShipArmament {
  longGuns: number;
  heavyGuns: number;
  lightGuns: number;
}

/* ------------------------------------------------------------- definitions */

/**
 * One hull, as designed. Immutable: nothing that happens in a war changes any
 * of it. What a particular ship has *left* lives in `NavyShip`.
 */
export interface ShipDefinition {
  readonly id: string;
  readonly faction: NavyFaction;
  readonly research: ResearchStep;
  readonly name: string;
  /**
   * What she is for, in the export's own words — *"Fast scout / interceptor"*,
   * *"Defensive heavy anchor"*. Free text on purpose: the export does not
   * enumerate roles, and inventing an enum it does not have would be inventing
   * design. Validated as non-empty and nothing more.
   */
  readonly role: string;
  readonly size: ShipSize;
  readonly speed: SpeedCategory;
  readonly combatantType: CombatantType;
  readonly guns: ShipArmament;
  /** 0–30 since the locked rules rescaled it. Flat subtraction, after penetration. */
  readonly armor: number;
  readonly hull: number;
  /** Against fortifications and locations only. Never ship-to-ship. */
  readonly bombardment: number;
  /** Companies carried. The export calls this Troop Capacity. */
  readonly troopCapacity: number;
  /** A fraction of whole hull per day: the export's '1.5%' is 0.015 here. */
  readonly repairRatePerDay: number;
  readonly daysToBuild: number;
  readonly goldToBuild: number;
  readonly goldPerDayMaintenance: number;
  /** What she is launched in. Every hull in the export launches Healthy. */
  readonly launchStatus: ShipStatus;
  readonly designNotes: string;
  /**
   * What the Ratings & Pricing tab makes of her.
   *
   * Carried because the sheet carries it and because a value rating is the
   * quickest read on whether a hull is worth building, but nothing in combat
   * touches any of it: this is economics, and the letter measures *purchase
   * value only* — build time and upkeep are separate levers by design.
   */
  readonly pricing: {
    readonly capabilityPoints: number;
    readonly baseReferenceCost: number;
    readonly synergyPct: number;
    readonly weaknessPct: number;
    readonly scaledReferenceCost: number;
    readonly priceRatio: number;
    readonly valueRating: string;
  };
}

/** The whole roster, plus the bands and rules it was designed against. */
export interface Roster {
  readonly version: string;
  readonly ships: readonly ShipDefinition[];
  readonly byId: ReadonlyMap<string, ShipDefinition>;
  readonly tierBands: Readonly<Record<string, Readonly<Record<string, string>>>>;
  readonly designRules: Readonly<Record<string, string>>;
  readonly buildTimeScaleDays: { readonly extreme_low: number; readonly majestic: number };
}

/* -------------------------------------------------------------- validation */

export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: IssueSeverity;
  /** The ship it concerns, or `null` for a whole-roster problem. */
  shipId: string | null;
  field: string;
  message: string;
}

/** Every numeric field, and whether the export writes it as a whole number. */
const NUMERIC_FIELDS: ReadonlyArray<{ key: keyof ShipDefinition | string; whole: boolean }> = [
  { key: 'armor', whole: true },
  { key: 'hull', whole: true },
  { key: 'bombardment', whole: true },
  { key: 'troopCapacity', whole: true },
  { key: 'daysToBuild', whole: true },
  { key: 'goldToBuild', whole: true },
  // Maintenance is the one that is not: Swift is 0.5 a day, the Marauder 1.5.
  { key: 'goldPerDayMaintenance', whole: false },
];

const RESEARCH_PATTERN = /^(S\d{2}|R\d{1,2})$/;

function parseResearch(raw: unknown): ResearchStep | null {
  if (typeof raw !== 'string' || !RESEARCH_PATTERN.test(raw)) return null;
  return {
    kind: raw.startsWith('S') ? 'start' : 'research',
    order: Number(raw.slice(1)),
    raw,
  };
}

/**
 * '1%' and '1.5%' become 0.01 and 0.015.
 *
 * Kept as a fraction rather than as the export's percentage because a repair
 * rate is used by multiplying, and a number that must be divided by a hundred
 * at every call site is a number somebody will eventually forget to divide.
 */
function parsePercent(raw: unknown): number | null {
  if (typeof raw === 'number') return raw / 100;
  if (typeof raw !== 'string') return null;
  const match = /^(-?\d+(?:\.\d+)?)\s*%$/.exec(raw.trim());
  return match ? Number(match[1]) / 100 : null;
}

/** A tier band string — '0', '1-2', '1600+', '0.1–1.0%' — as a numeric test. */
function bandContains(band: string, value: number): boolean {
  // Bands are sometimes written with a gameplay name beside them, as Armor's
  // '1-10 (Light)' is. The name is documentation; the numbers are the band.
  const spec = band
    .replace(/\([^)]*\)/g, '')
    .replace(/%/g, '')
    .trim();
  if (spec.endsWith('+')) return value >= Number(spec.slice(0, -1));
  // Either dash: the sheet writes en dashes, the import writes hyphens.
  const range = spec.split(/[–-]/);
  if (range.length === 2) return value >= Number(range[0]) && value <= Number(range[1]);
  return value === Number(spec);
}

/**
 * Whether a value falls anywhere inside its stat's declared bands.
 *
 * This is the check that catches a number outside the scale the roster was
 * designed on — a hull of 2,000 when T4 is '800+' still passes, but a negative
 * one or a stray decimal does not. Reported as a warning rather than an error:
 * the bands are a design aid, and Sean's instruction is to report suspected
 * data errors rather than to refuse the data.
 */
function inAnyBand(bands: Record<string, string> | undefined, value: number): boolean {
  if (!bands) return true;
  return Object.values(bands).some((band) => bandContains(band, value));
}

/**
 * Everything wrong with a roster, rather than the first thing wrong with it.
 *
 * A loader that throws on the first bad field makes fixing a data file a
 * twenty-round guessing game. This returns the lot, and `loadRoster` decides
 * what is fatal.
 */
export function validateRoster(raw: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const err = (shipId: string | null, field: string, message: string) =>
    issues.push({ severity: 'error', shipId, field, message });
  const warn = (shipId: string | null, field: string, message: string) =>
    issues.push({ severity: 'warning', shipId, field, message });

  if (typeof raw !== 'object' || raw === null) {
    err(null, 'root', 'The roster is not an object.');
    return issues;
  }
  const doc = raw as Record<string, unknown>;
  const ships = doc.ships;
  if (!Array.isArray(ships) || ships.length === 0) {
    err(null, 'ships', 'The roster has no ships.');
    return issues;
  }
  const bands = (doc.tierBands ?? {}) as Record<string, Record<string, string>>;

  const seenIds = new Set<string>();
  const seenOrder = new Map<string, string>();

  for (const entry of ships as Array<Record<string, unknown>>) {
    const id = typeof entry['Ship ID'] === 'string' ? (entry['Ship ID'] as string) : null;
    if (!id) {
      err(null, 'Ship ID', 'A ship has no id.');
      continue;
    }
    if (seenIds.has(id)) err(id, 'Ship ID', `Duplicate ship id ${id}.`);
    seenIds.add(id);

    const name = entry['Ship'];
    if (typeof name !== 'string' || name.trim() === '') err(id, 'Ship', 'Missing name.');
    const role = entry['Role'];
    if (typeof role !== 'string' || role.trim() === '') err(id, 'Role', 'Missing role.');

    const faction = entry['Faction'];
    if (!NAVY_FACTIONS.includes(faction as NavyFaction)) {
      err(id, 'Faction', `Unknown faction ${JSON.stringify(faction)}.`);
    }
    const speed = entry['Speed'];
    if (!SPEED_CATEGORIES.includes(speed as SpeedCategory)) {
      err(id, 'Speed', `Unknown speed category ${JSON.stringify(speed)}.`);
    }
    const size = entry['Size'];
    if (!SHIP_SIZES.includes(size as ShipSize)) {
      err(id, 'Size', `Unknown size ${JSON.stringify(size)}.`);
    }
    const combatant = entry['Combatant Type'];
    if (!COMBATANT_TYPES.includes(combatant as CombatantType)) {
      err(id, 'Combatant Type', `Unknown combatant type ${JSON.stringify(combatant)}.`);
    }
    // A hull the sheet calls a Warship with nothing to fire, or a Noncombat
    // with guns, is a data slip rather than a design statement.
    const gunCount =
      Number(entry['Long Guns'] ?? 0) + Number(entry['Heavy Guns'] ?? 0) + Number(entry['Light Guns'] ?? 0);
    if (combatant === 'Noncombat' && gunCount > 0) {
      warn(id, 'Combatant Type', `Marked Noncombat but carries ${gunCount} guns.`);
    }
    if (combatant === 'Warship' && gunCount === 0) {
      warn(id, 'Combatant Type', 'Marked Warship but carries no guns.');
    }
    const status = entry['Status'];
    if (!SHIP_STATUSES.includes(status as ShipStatus)) {
      err(id, 'Status', `Unknown status ${JSON.stringify(status)}.`);
    }

    const research = parseResearch(entry['Research Order']);
    if (!research) {
      err(id, 'Research Order', `Expected S01-style or R1-style, got ${JSON.stringify(entry['Research Order'])}.`);
    } else if (typeof faction === 'string') {
      // Two hulls cannot occupy the same step of the same navy's ladder: the
      // research errand would have nothing to choose between them.
      const key = `${faction}/${research.raw}`;
      const already = seenOrder.get(key);
      if (already) err(id, 'Research Order', `${research.raw} is already taken by ${already} in the ${faction}.`);
      seenOrder.set(key, id);
    }

    const guns: Array<[string, string]> = [
      ['Long Guns', 'longGuns'],
      ['Heavy Guns', 'heavyGuns'],
      ['Light Guns', 'lightGuns'],
    ];
    for (const [column] of guns) {
      const value = entry[column];
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
        err(id, column, `Expected a whole number of guns, got ${JSON.stringify(value)}.`);
      } else if (!inAnyBand(bands[column], value)) {
        warn(id, column, `${value} falls outside every declared tier band.`);
      }
    }

    const columnOf: Record<string, string> = {
      armor: 'Armor',
      hull: 'Hull',
      bombardment: 'Bombardment',
      troopCapacity: 'Troop Capacity',
      daysToBuild: 'Days to Build',
      goldToBuild: 'Gold to Build',
      goldPerDayMaintenance: 'Gold/Day Maintenance',
    };
    for (const { key, whole } of NUMERIC_FIELDS) {
      const column = columnOf[key as string];
      const value = entry[column];
      if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
        err(id, column, `Expected a non-negative number, got ${JSON.stringify(value)}.`);
        continue;
      }
      if (whole && !Number.isInteger(value)) {
        err(id, column, `Expected a whole number, got ${value}.`);
        continue;
      }
      if (!inAnyBand(bands[column], value)) {
        warn(id, column, `${value} falls outside every declared tier band.`);
      }
    }

    const repair = parsePercent(entry['Repair Rate']);
    if (repair === null) {
      err(id, 'Repair Rate', `Expected a percentage like '1.5%', got ${JSON.stringify(entry['Repair Rate'])}.`);
    } else if (repair < 0 || repair > 1) {
      err(id, 'Repair Rate', `A repair rate of ${repair * 100}% a day is outside 0–100%.`);
    }

    // A hull of nothing cannot be launched, taken or sunk.
    if (typeof entry['Hull'] === 'number' && entry['Hull'] <= 0) {
      err(id, 'Hull', 'A ship needs a hull above zero.');
    }
  }

  // Sean's rule, and the reason the export carries tier bands at all:
  // *"Starting/early ships should not have multiple top-tier capabilities
  // without major drawbacks."* Reported, never corrected.
  const COMBAT_COLUMNS = ['Long Guns', 'Heavy Guns', 'Light Guns', 'Armor', 'Hull', 'Bombardment'];
  for (const entry of ships as Array<Record<string, unknown>>) {
    const research = parseResearch(entry['Research Order']);
    if (research?.kind !== 'start') continue;
    const top = COMBAT_COLUMNS.filter((column) => {
      const value = entry[column];
      if (typeof value !== 'number') return false;
      // Both T4 and T4+ are top tier. The revision of 18 September added T4+
      // to Armor and Hull as pricing sub-bands, and a starting ship sitting in
      // one of those is exactly what this rule is watching for.
      return (['T4', 'T4+'] as const).some((tier) => {
        const band = bands[column]?.[tier];
        return band !== undefined && bandContains(band, value);
      });
    });
    if (top.length > 1) {
      warn(
        String(entry['Ship ID']),
        'Early-game power',
        `A starting ship with top-tier ${top.join(' and ')}. The design rules ask for major drawbacks against this.`,
      );
    }
  }

  return issues;
}

/* ------------------------------------------------------------------ loader */

export class RosterError extends Error {
  constructor(readonly issues: ValidationIssue[]) {
    super(
      `The ship roster has ${issues.length} problem${issues.length === 1 ? '' : 's'}:\n` +
        issues.map((i) => `  ${i.shipId ?? '(roster)'} · ${i.field}: ${i.message}`).join('\n'),
    );
    this.name = 'RosterError';
  }
}

/**
 * Turn a raw design export into definitions, or refuse it.
 *
 * Warnings do not stop a load. They are design observations — a value outside
 * its band, a starting ship carrying two top-tier stats — and Sean's
 * instruction is to report suspected errors rather than to correct them or to
 * down tools over them.
 */
export function loadRoster(raw: unknown = rosterData): Roster {
  const issues = validateRoster(raw);
  const errors = issues.filter((i) => i.severity === 'error');
  if (errors.length > 0) throw new RosterError(errors);

  const doc = raw as Record<string, unknown>;
  const ships = (doc.ships as Array<Record<string, unknown>>).map((entry): ShipDefinition => ({
    id: entry['Ship ID'] as string,
    faction: entry['Faction'] as NavyFaction,
    research: parseResearch(entry['Research Order'])!,
    name: entry['Ship'] as string,
    role: entry['Role'] as string,
    size: entry['Size'] as ShipSize,
    speed: entry['Speed'] as SpeedCategory,
    combatantType: entry['Combatant Type'] as CombatantType,
    guns: {
      longGuns: entry['Long Guns'] as number,
      heavyGuns: entry['Heavy Guns'] as number,
      lightGuns: entry['Light Guns'] as number,
    },
    armor: entry['Armor'] as number,
    hull: entry['Hull'] as number,
    bombardment: entry['Bombardment'] as number,
    troopCapacity: entry['Troop Capacity'] as number,
    repairRatePerDay: parsePercent(entry['Repair Rate'])!,
    daysToBuild: entry['Days to Build'] as number,
    goldToBuild: entry['Gold to Build'] as number,
    goldPerDayMaintenance: entry['Gold/Day Maintenance'] as number,
    launchStatus: entry['Status'] as ShipStatus,
    designNotes: (entry['Design Notes'] as string) ?? '',
    pricing: {
      capabilityPoints: entry['Capability Points'] as number,
      baseReferenceCost: entry['Base Reference Cost'] as number,
      synergyPct: parsePercent(entry['Synergy %']) ?? 0,
      weaknessPct: parsePercent(entry['Weakness %']) ?? 0,
      scaledReferenceCost: entry['Scaled Reference Cost'] as number,
      priceRatio: parsePercent(entry['Price Ratio']) ?? 0,
      valueRating: (entry['Value Rating'] as string) ?? '',
    },
  }));

  return {
    version: String(doc._source && (doc._source as Record<string, unknown>).version),
    ships,
    byId: new Map(ships.map((s) => [s.id, s] as const)),
    tierBands: (doc.tierBands ?? {}) as Roster['tierBands'],
    designRules: (doc.designRules ?? {}) as Roster['designRules'],
    buildTimeScaleDays: doc.buildTimeScaleDays as Roster['buildTimeScaleDays'],
  };
}

/** The roster as shipped, loaded once. */
export const ROSTER: Roster = loadRoster();

/** Every hull a navy can ever put to sea, in the order it gets them. */
export function fleetOf(faction: NavyFaction, roster: Roster = ROSTER): ShipDefinition[] {
  return roster.ships
    .filter((s) => s.faction === faction)
    .sort((a, b) => {
      if (a.research.kind !== b.research.kind) return a.research.kind === 'start' ? -1 : 1;
      return a.research.order - b.research.order;
    });
}

/** The four a navy opens the war with. */
export function startingHulls(faction: NavyFaction, roster: Roster = ROSTER): ShipDefinition[] {
  return fleetOf(faction, roster).filter((s) => s.research.kind === 'start');
}

/**
 * What the research errand unlocks next, given what a side has already.
 *
 * `unlocked` is a count of research steps taken, not a set of ids: the roster
 * numbers a navy's unlocks in a fixed order and Sean's ruling is that the
 * number *is* the order. Returns undefined when there is nothing left.
 *
 * This answers "the nth unlock", which in the revision of 18 September is also
 * "the step called Rn" — both ladders now run R1–R8 with nothing missing. They
 * were not always the same question (the Confederacy used to run R1 then
 * R5–R11), so the counting is kept and a test holds the two together.
 */
export function nextUnlock(
  faction: NavyFaction,
  unlocked: number,
  roster: Roster = ROSTER,
): ShipDefinition | undefined {
  const ladder = fleetOf(faction, roster).filter((s) => s.research.kind === 'research');
  return ladder[unlocked];
}
