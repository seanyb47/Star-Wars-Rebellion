import {
  DAYS_OVER_CAPACITY_BEFORE_SCRAP,
  FACILITY_LABEL,
  MAINTENANCE_COST,
  MAINTENANCE_PER_PAIR,
} from './constants';
import { otherFaction, pushEvent, supportMultiplier } from './helpers';
import type { Rng } from './rng';
import type { GameState, PlayableFaction, System } from './types';

/** A system contributes to the economy only while it is held and quiet. */
export function isProductive(system: System, faction: PlayableFaction): boolean {
  return system.control === faction && !system.uprising;
}

function facilityCount(state: GameState, faction: PlayableFaction, type: 'mine' | 'refinery') {
  let total = 0;
  for (const system of state.systems) {
    if (system.control !== faction) continue;
    for (const facility of system.facilities) {
      if (facility.type === type && facility.owner === faction) total++;
    }
  }
  return total;
}

/**
 * Camps dig, mills refine (spec 4.2.1-2).
 *
 * Output on a disloyal island can be siphoned off by smugglers and end up in
 * the enemy's stockpile instead (spec 4.2.6).
 */
export function runProduction(state: GameState, rng: Rng): void {
  for (const faction of ['empire', 'alliance'] as const) {
    const enemy = otherFaction(faction);
    for (const system of state.systems) {
      if (!isProductive(system, faction)) continue;
      const mines = system.facilities.filter(
        (f) => f.type === 'mine' && f.owner === faction,
      ).length;
      if (mines === 0) continue;

      const support = system.support[faction];
      const output = mines * supportMultiplier(support);
      const smuggleChance = support < 50 ? (50 - support) / 200 : 0;
      if (smuggleChance > 0 && rng.chance(smuggleChance)) {
        state.factions[enemy].raw += output;
        pushEvent(state, {
          text: `Smugglers run a day's stores off ${system.name} and sell them to the enemy.`,
          systemId: system.id,
        });
      } else {
        state.factions[faction].raw += output;
      }
    }
  }

  // Refineries each convert up to one raw into one refined per day.
  for (const faction of ['empire', 'alliance'] as const) {
    let refineries = 0;
    for (const system of state.systems) {
      if (!isProductive(system, faction)) continue;
      refineries += system.facilities.filter(
        (f) => f.type === 'refinery' && f.owner === faction,
      ).length;
    }
    const converted = Math.min(refineries, state.factions[faction].raw);
    state.factions[faction].raw -= converted;
    state.factions[faction].refined += converted;
  }
}

/**
 * Capacity is 50 per matched mine/refinery pair; upkeep is charged on
 * everything else a faction owns (spec 4.2.3-4).
 */
export function recomputeMaintenance(state: GameState): void {
  for (const faction of ['empire', 'alliance'] as const) {
    const mines = facilityCount(state, faction, 'mine');
    const refineries = facilityCount(state, faction, 'refinery');
    state.factions[faction].maintenanceCapacity =
      MAINTENANCE_PER_PAIR * Math.min(mines, refineries);

    let used = 0;
    for (const system of state.systems) {
      if (system.control !== faction) continue;
      for (const facility of system.facilities) {
        if (facility.owner !== faction) continue;
        used += MAINTENANCE_COST[facility.type];
      }
      used += system.garrison * MAINTENANCE_COST.troop;
    }
    state.factions[faction].maintenanceUsed = used;
  }
}

/**
 * Overspend for five straight days and the newest thing on the books is
 * broken up (spec 4.2.5). Facilities go first, newest id wins; if a faction
 * has nothing but troops left, a regiment is disbanded instead.
 */
export function runMaintenance(state: GameState): void {
  recomputeMaintenance(state);
  for (const faction of ['empire', 'alliance'] as const) {
    const fs = state.factions[faction];
    if (fs.maintenanceUsed <= fs.maintenanceCapacity) {
      fs.overCapacityDays = 0;
      continue;
    }
    fs.overCapacityDays += 1;
    if (fs.overCapacityDays < DAYS_OVER_CAPACITY_BEFORE_SCRAP) continue;

    if (scrapNewest(state, faction)) {
      fs.overCapacityDays = 0;
      recomputeMaintenance(state);
    }
  }
}

/** Sort key behind "newest": ids are `fac-<n>` with a monotonic counter. */
function idNumber(id: string): number {
  const n = Number(id.split('-')[1]);
  return Number.isFinite(n) ? n : 0;
}

function scrapNewest(state: GameState, faction: PlayableFaction): boolean {
  let target: { system: System; index: number; order: number } | undefined;
  for (const system of state.systems) {
    if (system.control !== faction) continue;
    system.facilities.forEach((facility, index) => {
      if (facility.owner !== faction) return;
      if (MAINTENANCE_COST[facility.type] === 0) return;
      const order = idNumber(facility.id);
      if (!target || order > target.order) target = { system, index, order };
    });
  }

  if (target) {
    const { system, index } = target;
    const [scrapped] = system.facilities.splice(index, 1);
    pushEvent(state, {
      text: `Upkeep shortfall: the ${FACILITY_LABEL[scrapped.type].toLowerCase()} on ${system.name} has been broken up for salvage.`,
      systemId: system.id,
    });
    return true;
  }

  // No chargeable facilities left — disband a regiment from the largest garrison.
  let biggest: System | undefined;
  for (const system of state.systems) {
    if (system.control !== faction || system.garrison <= 0) continue;
    if (!biggest || system.garrison > biggest.garrison) biggest = system;
  }
  if (!biggest) return false;
  biggest.garrison -= 1;
  pushEvent(state, {
    text: `Upkeep shortfall: a company on ${biggest.name} has been paid off and sent home.`,
    systemId: biggest.id,
  });
  return true;
}
