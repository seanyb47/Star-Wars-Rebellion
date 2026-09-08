import { FACILITY_LABEL, YARD_BUILDABLE, buildSpec } from './constants';
import {
  freeEnergySlots,
  freeRawSlots,
  isPlayable,
  nextId,
  otherFaction,
  pushEvent,
} from './helpers';
import type { BuildItem, Facility, GameState, PlayableFaction, System } from './types';

export function findFacility(
  state: GameState,
  facilityId: string,
): { system: System; facility: Facility } | undefined {
  for (const system of state.systems) {
    const facility = system.facilities.find((f) => f.id === facilityId);
    if (facility) return { system, facility };
  }
  return undefined;
}

/** What a given facility is allowed to queue (spec 4.4). */
export function buildMenu(facility: Facility): BuildItem[] {
  if (facility.type === 'construction_yard') return [...YARD_BUILDABLE];
  if (facility.type === 'training_facility') return ['troop'];
  return [];
}

/**
 * Why this order cannot be placed, or `null` if it can. The UI uses this to
 * grey out buttons, and `queueBuild` uses it to refuse bad commands.
 */
export function buildError(state: GameState, facilityId: string, item: BuildItem): string | null {
  const found = findFacility(state, facilityId);
  if (!found) return 'No such facility.';
  const { system, facility } = found;
  if (!isPlayable(facility.owner)) return 'That facility is not yours.';
  if (!buildMenu(facility).includes(item)) return 'This facility cannot build that.';
  if (facility.building) return 'Already building.';
  if (system.control !== facility.owner) return 'You do not control this system.';
  if (system.uprising) return 'The island is in mutiny.';

  const spec = buildSpec(item);
  if (state.factions[facility.owner].refined < spec.costRefined) {
    return `Needs ${spec.costRefined} refined.`;
  }
  if (item === 'mine' && freeRawSlots(system) < 1) return 'No free raw slot.';
  if (item !== 'mine' && item !== 'troop' && freeEnergySlots(system) < 1) {
    return 'No free energy slot.';
  }
  return null;
}

export function canQueueBuild(state: GameState, facilityId: string, item: BuildItem): boolean {
  return buildError(state, facilityId, item) === null;
}

/**
 * Place a build order on a facility. Refined is deducted immediately (spec 4.4).
 * Mutates `state` in place; callers working from UI code go through `commands`.
 */
export function queueBuild(state: GameState, facilityId: string, item: BuildItem): void {
  const error = buildError(state, facilityId, item);
  if (error) throw new Error(error);
  const { facility } = findFacility(state, facilityId)!;
  const spec = buildSpec(item);
  state.factions[facility.owner as PlayableFaction].refined -= spec.costRefined;
  facility.building = {
    item,
    daysRemaining: spec.days,
    costRefined: spec.costRefined,
  };
}

/** Cancel an order. Refined is not refunded. */
export function cancelBuild(state: GameState, facilityId: string): void {
  const found = findFacility(state, facilityId);
  if (found?.facility.building) found.facility.building = undefined;
}

/** Tick every in-progress order and resolve the ones that finish (spec 2). */
export function advanceBuilds(state: GameState): void {
  for (const system of state.systems) {
    // Snapshot: completions push new facilities onto the same array.
    for (const facility of [...system.facilities]) {
      const order = facility.building;
      if (!order) continue;
      if (system.uprising) continue; // Nothing works on an island in mutiny.
      order.daysRemaining -= 1;
      if (order.daysRemaining > 0) continue;

      facility.building = undefined;
      completeBuild(state, system, facility.owner as PlayableFaction, order.item);
    }
  }
}

function completeBuild(
  state: GameState,
  system: System,
  owner: PlayableFaction,
  item: BuildItem,
): void {
  if (item === 'troop') {
    system.garrison += 1;
    pushEvent(state, {
      text: `A company has finished its drill on ${system.name}.`,
      systemId: system.id,
    });
    return;
  }

  system.facilities.push({ id: nextId(state, 'fac'), type: item, owner });
  pushEvent(state, {
    text: `${FACILITY_LABEL[item]} completed on ${system.name}.`,
    systemId: system.id,
  });

  // Finishing anything on an empty island settles it (spec 4.3).
  if (!system.populated) {
    system.populated = true;
    system.support[owner] = 100;
    system.support[otherFaction(owner)] = 0;
    system.control = owner;
    pushEvent(state, {
      text: `${system.name} has been settled. There are people on it now, and they are yours.`,
      systemId: system.id,
    });
  }
  system.explored[owner] = true;
}

/** Convenience for the UI: every yard/training facility a faction can order from. */
export function producerFacilities(state: GameState, faction: PlayableFaction) {
  const out: Array<{ system: System; facility: Facility }> = [];
  for (const system of state.systems) {
    if (system.control !== faction) continue;
    for (const facility of system.facilities) {
      if (facility.owner === faction && buildMenu(facility).length > 0) {
        out.push({ system, facility });
      }
    }
  }
  return out;
}
