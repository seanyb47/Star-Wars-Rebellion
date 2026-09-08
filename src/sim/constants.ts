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
  costRefined: number;
  days: number;
  label: string;
}

/** Construction-yard menu (spec 4.4). */
export const YARD_BUILDS: Record<FacilityType, BuildSpec> = {
  mine: { costRefined: 40, days: 8, label: 'Mine' },
  refinery: { costRefined: 50, days: 10, label: 'Refinery' },
  construction_yard: { costRefined: 120, days: 20, label: 'Construction Yard' },
  training_facility: { costRefined: 80, days: 15, label: 'Training Facility' },
  shipyard: { costRefined: 150, days: 25, label: 'Shipyard' },
};

/** Training-facility menu (spec 4.4). */
export const TROOP_BUILD: BuildSpec = { costRefined: 25, days: 5, label: 'Troop Regiment' };

export function buildSpec(item: BuildItem): BuildSpec {
  return item === 'troop' ? TROOP_BUILD : YARD_BUILDS[item];
}

/** Per-day upkeep (spec 4.2.4). Mines and refineries cost nothing. */
export const MAINTENANCE_COST: Record<BuildItem, number> = {
  mine: 0,
  refinery: 0,
  construction_yard: 20,
  training_facility: 15,
  shipyard: 30,
  troop: 8,
};

export const MAINTENANCE_PER_PAIR = 50;
export const DAYS_OVER_CAPACITY_BEFORE_SCRAP = 5;

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

export const FACILITY_LABEL: Record<FacilityType, string> = {
  mine: 'Mine',
  refinery: 'Refinery',
  construction_yard: 'Construction Yard',
  training_facility: 'Training Facility',
  shipyard: 'Shipyard',
};
