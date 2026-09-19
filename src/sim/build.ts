import terms from '../data/terms.json';
import {
  buildLabel,
  isShipClass,
  shipsAt,
  shipClass,
  craftNeeded,
  YARD_BUILDABLE,
  FACILITY_CRAFT,
  YARD_BUILDS,
  buildSpec,
  FACILITY_LABEL,
  RESOURCE_LABEL,
  needsResource,
  CRAFT_COST_STEP,
  CRAFT_DAYS_STEP,
  UPKEEP_PER_DAY,
} from './constants';
import { craftGrade, travelDays } from './missions';
import { addShip } from './fleets';
import {
  depositsLeft,
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
  ResourceType,
  ShipGrade,
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
/**
 * What this works will take an order for.
 *
 * `grade` is the side's shipwright craft, and it only ever matters to a
 * shipyard: the better hulls are designs nobody on this side can build yet.
 *
 * Deliberately not optional. It was, for about an hour, defaulting to nothing
 * researched — and two call sites forgot it, so the opponent picked a hull its
 * grade allowed, checked it against a menu that pretended it had researched
 * nothing, found it missing and quietly skipped every shipyard it owned.
 * Seventy-eight thousand gold, seven slipways and not one hull in the water.
 * Callers that only want to know whether a works has anything at all to do
 * pass `ANY_GRADE` and say so.
 */
export function buildMenu(facility: Facility, grade: ShipGrade): BuildItem[] {
  // A works waits on the shipwrights too now, for exactly one building: see
  // `FACILITY_CRAFT`. Everything else a yard has always been able to raise.
  if (facility.type === 'construction_yard') {
    return YARD_BUILDABLE.filter((type) => (FACILITY_CRAFT[type] ?? 0) <= grade);
  }
  if (facility.type === 'training_facility') return ['troop'];
  if (facility.type === 'shipyard' && isPlayable(facility.owner)) {
    return shipsAt(facility.owner, grade).map((c) => c.id);
  }
  return [];
}

/** The side's shipwright craft, as a grade, for a build menu. */
export function gradeOf(state: GameState, faction: PlayableFaction): ShipGrade {
  return craftGrade(state.factions[faction].craft) as ShipGrade;
}

/**
 * For the callers asking "has this works anything left to do at all" rather
 * than "may this side order that hull today" — the idle marks on the chart,
 * the advisor's nagging, the panel's empty state. Everything, so the answer
 * is about the works and not about the research.
 */
export const ANY_GRADE: ShipGrade = 3;

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
 *
 * An order for a mill or a mine takes no berth of its own: it lands on the
 * deposit and takes that one. What it does spoken-for is the deposit, and
 * `reservedDeposits` counts those.
 */
export function reservedSlots(state: GameState, systemId: string): number {
  let held = 0;
  for (const system of state.systems) {
    for (const facility of system.facilities) {
      const order = facility.building;
      if (!order || facility.founding) continue;
      const landsOn = order.destinationId ?? system.id;
      if (landsOn !== systemId) continue;
      if (takesRoom(order.item) && !needsResource(order.item)) held += 1;
    }
  }
  return held;
}

/**
 * Deposits of one kind already promised to an order in progress.
 *
 * The same problem as berths and the same answer: two yards on two islands
 * could each send builders for the last forest, and the second crew would
 * arrive to a mill already standing on it.
 */
export function reservedDeposits(
  state: GameState,
  systemId: string,
  type: ResourceType,
): number {
  let held = 0;
  for (const system of state.systems) {
    for (const facility of system.facilities) {
      const order = facility.building;
      if (!order || facility.founding) continue;
      if ((order.destinationId ?? system.id) !== systemId) continue;
      if (needsResource(order.item) === type) held += 1;
    }
  }
  return held;
}

/**
 * Deposits of a kind an island can still take an order against: what is in the
 * ground, less what is already promised.
 */
export function openDeposits(
  state: GameState,
  system: System,
  type: ResourceType,
): number {
  return depositsLeft(system, type) - reservedDeposits(state, system.id, type);
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
  const grade = gradeOf(state, facility.owner);
  if (!buildMenu(facility, grade).includes(item)) {
    // Told apart on purpose: a shipyard that cannot build a Sovereign II yet
    // is a different problem from a training ground being asked for a hull,
    // and the first one has an answer — put somebody on the research.
    if (isShipClass(item) && shipClass(item).faction === facility.owner) {
      return `${shipClass(item).name} needs ${craftNeeded(item)} ${craftNeeded(item) === 1 ? 'grade' : 'grades'} of shipwright craft.`;
    }
    // Same answer for the one building that waits on the yards: it is not
    // "this works cannot make that", it is "not yet", and the difference is
    // whether the player has something to go and do about it.
    const wants = YARD_BUILDABLE.includes(item as FacilityType)
      ? (FACILITY_CRAFT[item as FacilityType] ?? 0)
      : 0;
    if (wants > grade) {
      return `${FACILITY_LABEL[item as FacilityType]} needs ${wants} ${wants === 1 ? 'grade' : 'grades'} of shipwright craft.`;
    }
    return 'This building cannot make that.';
  }
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

  // The ground first. Sean's rule, 16 September: a mill goes on a forest and a
  // mine on a vein, or it goes nowhere — "it doesn't make sense that you can
  // just put gold mines anywhere and print money." The works takes the
  // deposit's own berth, so it needs no free plot beside it.
  const wants = needsResource(item);
  if (wants) {
    if (openDeposits(state, landing, wants) < 1) {
      return depositsLeft(landing, wants) > 0
        ? `Every ${RESOURCE_LABEL[wants].toLowerCase()} on ${landing.name} is spoken for.`
        : `No ${RESOURCE_LABEL[wants].toLowerCase()} on ${landing.name}.`;
    }
    return null;
  }

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
    if (facility.founding || !buildMenu(facility, gradeOf(state, faction)).includes(item)) return false;
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

/**
 * Fell a forest and leave the ground bare.
 *
 * Sean, 16 September: *"Forests can be cleared to make room for other
 * facilities, not just mills. But if cleared it's destroyed."* So this is the
 * one thing in the game that takes something out of the world and does not put
 * it back — a deposit returns when the works on it comes down, and a cleared
 * forest does not return at all.
 *
 * Only timber. A vein of gold is in the rock and cannot be tidied away, which
 * is also why an island with gold on it and no room is a genuine problem
 * rather than a decision.
 */
export function clearError(
  state: GameState,
  systemId: string,
  actor: PlayableFaction,
): string | null {
  const system = state.systems.find((s) => s.id === systemId);
  if (!system) return 'No such island.';
  if (system.control !== actor) return 'You do not hold this island.';
  if (system.uprising) return 'The island is in mutiny.';
  if (depositsLeft(system, 'forest') < 1) return 'There is no forest here to clear.';
  // Not one somebody is already sailing to cut into a mill.
  if (openDeposits(state, system, 'forest') < 1) {
    return 'Every forest here is already spoken for by an order.';
  }
  return null;
}

export function clearForest(state: GameState, systemId: string, actor: PlayableFaction): void {
  const error = clearError(state, systemId, actor);
  if (error) throw new Error(error);
  const system = state.systems.find((s) => s.id === systemId)!;
  const held = [...(system.deposits ?? [])];
  held.splice(held.findIndex((d) => d.type === 'forest'), 1);
  system.deposits = held;
  pushEvent(state, {
    kind: 'order',
    text: `The timber on ${system.name} has been felled and the ground cleared. There is a plot open where the forest stood.`,
    systemId: system.id,
  });
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
      // Room is checked again on the day the thing is finished, not only on
      // the day it was ordered, and for an order made here as much as one
      // sailed in. Measured: an island of six berths finished with seven
      // buildings on it, because it changed hands with a yard of the old
      // holder's already at work — the new holder's yard filled the last plot
      // and the old order landed on top of it. Anything that finds no room
      // waits on the quay; the order can be cancelled if it never comes.
      const wants = needsResource(order.item);
      if (wants) {
        // An earner stands on its deposit, so it needs ground rather than a
        // plot — and the ground can be gone if the island changed hands and
        // somebody else worked it while these builders were at sea.
        if (depositsLeft(landing, wants) < 1) continue;
      } else if (takesRoom(order.item) && freeSlots(landing) < 1) {
        continue;
      }

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
        ? `A troop drilled on ${madeOn.name} has landed on ${system.name}.`
        : `A troop has finished its drill on ${system.name}.`,
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

  // The works takes the deposit's ground: the forest becomes the mill, the
  // vein becomes the mine, and the island's total built does not go up.
  const wants = needsResource(item);
  if (wants) {
    const held = [...(system.deposits ?? [])];
    const at = held.findIndex((d) => d.type === wants);
    if (at >= 0) held.splice(at, 1);
    system.deposits = held;
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
      if (facility.owner === faction && buildMenu(facility, ANY_GRADE).length > 0) {
        out.push({ system, facility });
      }
    }
  }
  return out;
}
