import terms from '../data/terms.json';
import {
  buildLabel,
  isShipClass,
  shipsFor,
  YARD_BUILDABLE,
  YARD_BUILDS,
  buildSpec,
  FACILITY_LABEL,
  CRAFT_COST_STEP,
  CRAFT_DAYS_STEP,
  UPKEEP_PER_DAY,
} from './constants';
import { craftGrade, travelDays } from './missions';
import { addShip } from './fleets';
import {
  freeSlots,
  isPlayable,
  nextId,
  pushEvent,
  setSupport,
} from './helpers';
import type {
  BuildItem,
  Facility,
  FacilityType,
  Faction,
  GameState,
  PlayableFaction,
  System,
} from './types';

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

/**
 * How many works of this kind are standing on the island and able to work.
 *
 * Sean's rule, 16 September: *"if you have multiples on the same island they
 * work together and increase the speed proportionally. If something were to
 * take 60 days to build at a construction yard then three of them would
 * complete the task in 20 days... and that will also change in the middle of
 * the task."* So this is asked every morning rather than once when the order
 * is placed, and a yard finished today shortens a job that started a month ago.
 *
 * A works still being laid down does not count — it is not there yet. Never
 * less than one, because the order to lay down the island's first works has no
 * works behind it by definition.
 */
export function crewOn(system: System, type: FacilityType, owner: Faction): number {
  const hands = system.facilities.filter(
    (f) => f.type === type && f.owner === owner && !f.founding,
  ).length;
  return Math.max(1, hands);
}

/** Which kind of works does this job: the one whose menu offers it. */
export function makerFor(item: BuildItem): FacilityType {
  if (item === 'troop') return 'training_facility';
  if (isShipClass(item)) return 'shipyard';
  return 'construction_yard';
}

/**
 * Days until the thing is finished, not counting the passage — and days until
 * it is where it is going, counting it.
 *
 * Both are worked out from today's crew, so they move when a yard is finished
 * or lost rather than being a promise made on the day of the order.
 */
export function daysToFinish(system: System, facility: Facility): number {
  const order = facility.building;
  if (!order) return 0;
  if (order.workLeft <= 0) return 0;
  return Math.ceil(order.workLeft / crewOn(system, facility.type, facility.owner));
}

export function daysToDeliver(system: System, facility: Facility): number {
  const order = facility.building;
  if (!order) return 0;
  return daysToFinish(system, facility) + order.travelLeft;
}

/**
 * The works on this island already at this kind of work, if any.
 *
 * One job of a kind at a time, per island: an island with a yard, a slipway
 * and a drill ground can have three things on the go and no more. The order
 * sits on one works of the kind and the rest of them work on it.
 */
export function busyAt(
  system: System,
  type: FacilityType,
  owner: Faction,
): Facility | undefined {
  return system.facilities.find((f) => f.type === type && f.owner === owner && f.building);
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

/** Whether an order for this item takes a slot on the island it lands on. */
/** Whether this order needs a berth on the island it lands on. */
function takesRoom(item: BuildItem): boolean {
  return item !== 'troop' && !isShipClass(item);
}

/**
 * Slots on an island already spoken for by orders still on their way — from
 * any works, this island's own included. Without this two works could both
 * send builders to the last free berth and one crew would arrive to nothing.
 */
export function reservedSlots(state: GameState, systemId: string): number {
  let held = 0;
  for (const system of state.systems) {
    for (const facility of system.facilities) {
      const order = facility.building;
      if (!order || facility.founding) continue;
      const landsOn = order.destinationId ?? system.id;
      if (landsOn !== systemId) continue;
      if (takesRoom(order.item)) held += 1;
    }
  }
  return held;
}

/**
 * Why this order cannot be placed, or `null` if it can. The UI uses this to
 * grey out buttons, and `queueBuild` uses it to refuse bad commands.
 *
 * `destinationId` is where the thing lands: another island of yours, reached
 * by sea, or (absent) the island the facility stands on.
 */
export function buildError(
  state: GameState,
  facilityId: string,
  item: BuildItem,
  destinationId?: string,
): string | null {
  const found = findFacility(state, facilityId);
  if (!found) return 'No such building.';
  const { system, facility } = found;
  if (!isPlayable(facility.owner)) return 'That facility is not yours.';
  if (!buildMenu(facility).includes(item)) return 'This building cannot make that.';
  // One job of a kind at a time, per island — not per works. The rest of the
  // island's yards of that kind are not idle hands to give another job to;
  // they are already on this one, which is why it goes faster.
  const busy = busyAt(system, facility.type, facility.owner);
  if (busy) {
    return busy.founding
      ? `The ${FACILITY_LABEL[facility.type].toLowerCase()} is still being laid down.`
      : `${FACILITY_LABEL[facility.type]} busy: ${buildLabel(busy.building!.item)}.`;
  }
  if (system.control !== facility.owner) return 'You do not hold this island.';
  if (system.uprising) return 'The island is in mutiny.';

  const spec = effectiveSpec(state, facility.owner, item);
  if (state.factions[facility.owner].gold < spec.costGold) {
    return `Needs ${spec.costGold} ${terms.gold.toLowerCase()}.`;
  }

  const landing = destinationId ? state.systems.find((s) => s.id === destinationId) : system;
  if (!landing) return 'No such island.';
  if (landing.control !== facility.owner) return `You do not hold ${landing.name}.`;
  if (landing.uprising) return `${landing.name} is in mutiny.`;
  // Companies and hulls take no ground: one drills, the other floats.
  const held = reservedSlots(state, landing.id);
  if (takesRoom(item) && freeSlots(landing) - held < 1) {
    return `No room left on ${landing.name}.`;
  }
  return null;
}

export function canQueueBuild(
  state: GameState,
  facilityId: string,
  item: BuildItem,
  destinationId?: string,
): boolean {
  return buildError(state, facilityId, item, destinationId) === null;
}

/**
 * Place a build order on a facility. Refined is deducted immediately (spec 4.4).
 * Mutates `state` in place; callers working from UI code go through `commands`.
 *
 * Sent to another island, the order takes the passage on top of the work:
 * three days inside a Reach, ten beyond, the same sea everyone else sails.
 */
export function queueBuild(
  state: GameState,
  facilityId: string,
  item: BuildItem,
  destinationId?: string,
): void {
  const error = buildError(state, facilityId, item, destinationId);
  if (error) throw new Error(error);
  const { system, facility } = findFacility(state, facilityId)!;
  const spec = effectiveSpec(state, facility.owner as PlayableFaction, item);
  state.factions[facility.owner as PlayableFaction].gold -= spec.costGold;
  const away = destinationId && destinationId !== system.id ? destinationId : undefined;
  const passage = away ? travelDays(state, system.id, away) : 0;
  facility.building = {
    item,
    work: spec.days,
    workLeft: spec.days,
    travel: passage,
    travelLeft: passage,
    costGold: spec.costGold,
    ...(away ? { destinationId: away } : {}),
  };
}

/**
 * The order as the player will see it before placing it: which island's works
 * would make the thing, how long the work takes there, how long the passage
 * after it, and why not if not.
 *
 * The *quickest* island wins rather than the nearest, which is new and is the
 * whole point of yards working together: four slipways a fortnight away will
 * have a first-rate in the water before one slipway next door, and before this
 * the order went to the one next door every time. A maker that could take the
 * order but for gold still reports, so the reason shown is the gold and not
 * "nothing can build it".
 */
export interface BuildPlan {
  facilityId: string | null;
  /** The island the thing is made on. */
  fromSystemId: string | null;
  /** Days of work. */
  days: number;
  /** Days at sea after that, zero when made on the spot. */
  travel: number;
  costGold: number;
  upkeep: number;
  error: string | null;
}

export function planBuild(
  state: GameState,
  faction: PlayableFaction,
  item: BuildItem,
  destinationId: string,
): BuildPlan {
  const spec = effectiveSpec(state, faction, item);
  const upkeep = UPKEEP_PER_DAY[item];
  const type = makerFor(item);
  // One works of each kind speaks for its island: the rest of them are the
  // crew, not separate offers. Taking the first keeps the order somewhere
  // stable, and `crewOn` counts the others.
  const seen = new Set<string>();
  const makers = producerFacilities(state, faction).filter(({ system, facility }) => {
    if (facility.founding || !buildMenu(facility).includes(item)) return false;
    if (seen.has(system.id)) return false;
    seen.add(system.id);
    return true;
  });
  const wanted = makers
    .map(({ system, facility }) => ({
      system,
      facility,
      days: Math.ceil(spec.days / crewOn(system, type, faction)),
      travel: travelDays(state, system.id, destinationId),
      error: buildError(state, facility.id, item, destinationId),
    }))
    .sort((a, b) => a.days + a.travel - (b.days + b.travel));
  const free = wanted.find((m) => m.error === null);
  if (free) {
    return {
      facilityId: free.facility.id,
      fromSystemId: free.system.id,
      days: free.days,
      travel: free.travel,
      costGold: spec.costGold,
      upkeep,
      error: null,
    };
  }
  const nearest = wanted[0];
  const maker = terms.facilities[type];
  return {
    facilityId: null,
    fromSystemId: nearest?.system.id ?? null,
    days: nearest?.days ?? spec.days,
    travel: nearest?.travel ?? 0,
    costGold: spec.costGold,
    upkeep,
    error:
      makers.length === 0
        ? `No ${maker.toLowerCase()} of yours can make that yet.`
        : wanted.every((m) => m.error?.startsWith(FACILITY_LABEL[type]) || m.error?.endsWith('laid down.'))
          ? `Every ${maker.toLowerCase()} of yours is at work.`
          : nearest.error,
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
  if (freeSlots(system) < 1) return 'No room left on this island.';
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
    building: {
      item: 'construction_yard',
      work: spec.days,
      workLeft: spec.days,
      travel: 0,
      travelLeft: 0,
      costGold: spec.costGold,
    },
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

      // The work first, at whatever pace the island's works of this kind can
      // manage today; then, when it is built, the passage. Kept in that order
      // so a hull bound across the world is finished on the day the yard says
      // and at sea from the morning after.
      if (order.workLeft > 0) {
        order.workLeft = Math.max(0, order.workLeft - crewOn(system, facility.type, facility.owner));
        if (order.workLeft > 0) continue;
        // Finished today. Anything with a crossing ahead of it sets out
        // tomorrow; anything made here is done now.
        if (order.travelLeft > 0) continue;
      } else if (order.travelLeft > 0) {
        order.travelLeft -= 1;
        if (order.travelLeft > 0) continue;
      }

      // Where it lands. An island lost while the order was at sea sends the
      // thing back to where it was made.
      let landing = order.destinationId
        ? state.systems.find((s) => s.id === order.destinationId) ?? system
        : system;
      if (landing.id !== system.id && landing.control !== facility.owner) {
        pushEvent(state, {
          kind: 'loss',
          text: `${landing.name} is no longer yours; the ${buildLabel(order.item).toLowerCase()} bound for it turns back to ${system.name}.`,
          systemId: system.id,
        });
        landing = system;
      }
      // Builders sent to an island with no room left wait on the quay.
      if (landing.id !== system.id && takesRoom(order.item) && freeSlots(landing) < 1) continue;

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
      completeBuild(state, landing, facility.owner as PlayableFaction, order.item, system);
    }
  }
}

function completeBuild(
  state: GameState,
  system: System,
  owner: PlayableFaction,
  item: BuildItem,
  madeOn: System,
): void {
  const shipped = madeOn.id !== system.id;
  if (item === 'troop') {
    system.garrison += 1;
    pushEvent(state, {
      kind: 'order',
      text: shipped
        ? `A company drilled on ${madeOn.name} has landed on ${system.name}.`
        : `A company has finished its drill on ${system.name}.`,
      systemId: system.id,
    });
    return;
  }

  if (isShipClass(item)) {
    const fleet = addShip(state, system, owner, item);
    pushEvent(state, {
      kind: 'order',
      text: shipped
        ? `A ${buildLabel(item)} off the stocks at ${madeOn.name} has come in to ${system.name} and joins ${fleet.name}.`
        : `A ${buildLabel(item)} slides off the stocks at ${system.name} and joins ${fleet.name}.`,
      systemId: system.id,
    });
    return;
  }

  system.facilities.push({ id: nextId(state, 'fac'), type: item, owner });
  pushEvent(state, {
    kind: 'order',
    text: shipped
      ? `${buildLabel(item)} raised on ${system.name} by builders from ${madeOn.name}.`
      : `${buildLabel(item)} completed on ${system.name}.`,
    systemId: system.id,
  });

  // Finishing anything on an empty island settles it (spec 4.3).
  if (!system.populated) {
    system.populated = true;
    setSupport(system, owner, 100);
    system.control = owner;
    pushEvent(state, {
      kind: 'flip',
      text: `${system.name} has been settled. There are people on it now, and they are yours.`,
      systemId: system.id,
    });
  }
  system.explored[owner] = true;
}

/**
 * Every works a faction could order from, island by island. More than one of a
 * kind on the same island all appear: the caller decides whether it wants the
 * island's offer (the first) or all the hands on it.
 */
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
