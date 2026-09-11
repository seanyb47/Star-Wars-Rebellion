import shipData from '../data/ships.json';
import terms from '../data/terms.json';
import type {
  BuildItem,
  FacilityType,
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
};

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
}

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
  return { ...SHIP_ROLES[cls.role], label: cls.name };
}

/** Hulls a faction can lay down without research. */
export function shipsFor(faction: PlayableFaction): ShipClass[] {
  return SHIP_CLASSES.filter((c) => c.faction === faction);
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
  troop: 0,
  ...NO_SHIP_INCOME,
};

const SHIP_UPKEEP = Object.fromEntries(
  (shipData.classes as ShipClass[]).map((c) => [c.id, SHIP_ROLES[c.role].upkeep]),
) as Record<ShipClassId, number>;

export const UPKEEP_PER_DAY: Record<BuildItem, number> = {
  mine: 0,
  refinery: 0,
  construction_yard: 3,
  training_facility: 2,
  shipyard: 4,
  troop: 1,
  ...SHIP_UPKEEP,
};

export function earns(item: BuildItem): boolean {
  return GOLD_PER_DAY[item] > 0;
}

/** Support / control thresholds (spec 4.3). */
export const FLIP_SUPPORT_MIN = 60;
export const FLIP_SUPPORT_MARGIN = 25;
export const UPRISING_SUPPORT = 30;
export const UPRISING_END_SUPPORT = 40;
export const SPILLOVER_FRACTION = 0.2;

/** Diplomacy mission (spec 4.5). */
export const TRAVEL_DAYS_IN_SECTOR = 3;
export const TRAVEL_DAYS_CROSS_SECTOR = 10;
export const MISSION_WORK_DAYS = 15;
export const FOIL_CHANCE = 0.1;
export const FOIL_INJURY_DAYS = 20;
export const MISSION_SUPPORT_LOSS = 4;

/** Victory (spec 4.6). */
export const VICTORY_CONTROL_FRACTION = 0.6;

/** Opponent AI cadence (spec 4.7). */
export const AI_BUILD_INTERVAL = 5;
export const AI_MISSION_INTERVAL = 10;
/** How often the opponent looks at its ships. Slower than building: a fleet
 *  order should be a considered move, not a twitch. */
export const AI_FLEET_INTERVAL = 12;
/** Gold the opponent keeps back before it will lay down a hull, so a navy
 *  never starves the economy that pays for it. */
export const AI_SHIP_RESERVE = 200;
/** Spare companies the opponent keeps on a drilling island, over what holds it
 *  quiet, so it has something to put aboard a transport. */
export const AI_TROOP_POOL = 2;

/** Facility types that a construction yard is allowed to queue. */
export const YARD_BUILDABLE: FacilityType[] = [
  'mine',
  'refinery',
  'construction_yard',
  'training_facility',
  'shipyard',
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
