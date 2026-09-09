import terms from '../data/terms.json';
import type { BuildItem, FacilityType, Speed } from './types';

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

export function buildSpec(item: BuildItem): BuildSpec {
  return item === 'troop' ? TROOP_BUILD : YARD_BUILDS[item];
}

/**
 * Buildings come in two kinds. Some earn: a camp cuts timber and ore, a mill
 * works it into something worth selling. The rest make things or protect you,
 * and cost gold every day they stand.
 */
export const GOLD_PER_DAY: Record<BuildItem, number> = {
  mine: 2,
  refinery: 3,
  construction_yard: 0,
  training_facility: 0,
  shipyard: 0,
  troop: 0,
};

export const UPKEEP_PER_DAY: Record<BuildItem, number> = {
  mine: 0,
  refinery: 0,
  construction_yard: 3,
  training_facility: 2,
  shipyard: 4,
  troop: 1,
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
