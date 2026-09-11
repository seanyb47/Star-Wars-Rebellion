import terms from '../data/terms.json';
import { buildLabel, isShipClass, shipsFor, YARD_BUILDABLE, buildSpec } from './constants';
import { addShip } from './fleets';
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
  if (facility.type === 'shipyard' && isPlayable(facility.owner)) {
    return shipsFor(facility.owner).map((c) => c.id);
  }
  return [];
}

/**
 * Why this order cannot be placed, or `null` if it can. The UI uses this to
 * grey out buttons, and `queueBuild` uses it to refuse bad commands.
 */
export function buildError(state: GameState, facilityId: string, item: BuildItem): string | null {
  const found = findFacility(state, facilityId);
  if (!found) return 'No such building.';
  const { system, facility } = found;
  if (!isPlayable(facility.owner)) return 'That facility is not yours.';
  if (!buildMenu(facility).includes(item)) return 'This building cannot make that.';
  if (facility.building) return 'Already building.';
  if (system.control !== facility.owner) return 'You do not hold this island.';
  if (system.uprising) return 'The island is in mutiny.';

  const spec = buildSpec(item);
  if (state.factions[facility.owner].gold < spec.costGold) {
    return `Needs ${spec.costGold} ${terms.gold.toLowerCase()}.`;
  }
  // Companies and hulls take no ground: one drills, the other floats.
  if (item === 'mine' && freeRawSlots(system) < 1) return `No free ${terms.ground.toLowerCase()}.`;
  if (item !== 'mine' && item !== 'troop' && !isShipClass(item) && freeEnergySlots(system) < 1) {
    return `No free ${terms.water.toLowerCase()}.`;
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
  state.factions[facility.owner as PlayableFaction].gold -= spec.costGold;
  facility.building = {
    item,
    daysRemaining: spec.days,
    costGold: spec.costGold,
  };
}

/** Cancel an order. The gold already laid out is not refunded. */
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
      kind: 'order',
      text: `A company has finished its drill on ${system.name}.`,
      systemId: system.id,
    });
    return;
  }

  if (isShipClass(item)) {
    const fleet = addShip(state, system, owner, item);
    pushEvent(state, {
      kind: 'order',
      text: `A ${buildLabel(item)} slides off the stocks at ${system.name} and joins ${fleet.name}.`,
      systemId: system.id,
    });
    return;
  }

  system.facilities.push({ id: nextId(state, 'fac'), type: item, owner });
  pushEvent(state, {
    kind: 'order',
    text: `${buildLabel(item)} completed on ${system.name}.`,
    systemId: system.id,
  });

  // Finishing anything on an empty island settles it (spec 4.3).
  if (!system.populated) {
    system.populated = true;
    system.support[owner] = 100;
    system.support[otherFaction(owner)] = 0;
    system.control = owner;
    pushEvent(state, {
      kind: 'flip',
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
