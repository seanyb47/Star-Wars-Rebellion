import terms from '../data/terms.json';
import {
  buildLabel,
  isShipClass,
  shipsFor,
  YARD_BUILDABLE,
  YARD_BUILDS,
  buildSpec,
  CRAFT_COST_STEP,
  CRAFT_DAYS_STEP,
} from './constants';
import { craftGrade } from './missions';
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
 * What an order actually costs this side today, craft included.
 *
 * Only hulls. The research errand is shipwright craft and nothing else, so a
 * mine costs what a mine has always cost — which also keeps the effect legible:
 * a player who notices their ships got cheaper has exactly one thing to thank
 * for it.
 *
 * Rounded up rather than down, and floored at a day: three grades of a 13%
 * cut is a real saving, not a free hull.
 */
export function effectiveSpec(
  state: GameState,
  faction: PlayableFaction,
  item: BuildItem,
): { costGold: number; days: number } {
  const spec = buildSpec(item);
  if (!isShipClass(item)) return { costGold: spec.costGold, days: spec.days };
  const grade = craftGrade(state.factions[faction].craft);
  if (grade === 0) return { costGold: spec.costGold, days: spec.days };
  return {
    costGold: Math.ceil(spec.costGold * (1 - CRAFT_COST_STEP * grade)),
    days: Math.max(1, Math.ceil(spec.days * (1 - CRAFT_DAYS_STEP * grade))),
  };
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

  const spec = effectiveSpec(state, facility.owner, item);
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
  const spec = effectiveSpec(state, facility.owner as PlayableFaction, item);
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
  if (!found?.facility.building) return;
  // A works that was only ever an order comes down with it.
  if (found.facility.founding) {
    found.system.facilities = found.system.facilities.filter((f) => f.id !== facilityId);
    return;
  }
  found.facility.building = undefined;
}

/**
 * Lay down a works on a held island that has none.
 *
 * Everything else is raised by a works standing on the same island, which
 * left an island taken in the war a dead end: nothing could ever be built on
 * it, by the player or the opponent, and both economies stalled the day their
 * starting islands filled. This is the one order that needs no builder. It
 * costs what a works costs and takes as long; the works stands in its slot
 * from the day it is ordered so nothing else can take the ground.
 */
export function foundWorksError(
  state: GameState,
  systemId: string,
  owner: PlayableFaction,
): string | null {
  const system = state.systems.find((s) => s.id === systemId);
  if (!system) return 'No such island.';
  if (system.control !== owner) return 'You do not hold this island.';
  if (system.uprising) return 'The island is in mutiny.';
  if (system.facilities.some((f) => f.owner === owner && f.type === 'construction_yard')) {
    return `There is already a ${terms.facilities.construction_yard.toLowerCase()} here.`;
  }
  if (freeEnergySlots(system) < 1) return `No free ${terms.water.toLowerCase()}.`;
  const cost = YARD_BUILDS.construction_yard.costGold;
  if (state.factions[owner].gold < cost) return `Needs ${cost} gold.`;
  return null;
}

export function foundWorks(state: GameState, systemId: string, owner: PlayableFaction): void {
  const error = foundWorksError(state, systemId, owner);
  if (error) throw new Error(error);
  const system = state.systems.find((s) => s.id === systemId)!;
  const spec = YARD_BUILDS.construction_yard;
  state.factions[owner].gold -= spec.costGold;
  system.facilities.push({
    id: `fac-${++state.nextId}`,
    type: 'construction_yard',
    owner,
    founding: true,
    building: { item: 'construction_yard', daysRemaining: spec.days, costGold: spec.costGold },
  });
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
      if (facility.founding) {
        // The works is the thing that was being built.
        delete facility.founding;
        pushEvent(state, {
          kind: 'order',
          text: `A ${terms.facilities.construction_yard.toLowerCase()} now stands on ${system.name}. Anything can be raised here.`,
          systemId: system.id,
        });
        continue;
      }
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
