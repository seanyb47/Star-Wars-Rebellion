import factionData from '../data/factions.json';
import terms from '../data/terms.json';
import {
  buildLabel,
  isShipClass,
  isTroopItem,
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
  WORKS_ON,
  CRAFT_COST_STEP,
  CRAFT_DAYS_STEP,
  UPKEEP_PER_DAY,
} from './constants';
import { postCompanies, raiseReason, raisableTroops, troopBuildAt, troopType } from './troops';
import { craftGrade, travelDays } from './missions';
import { addShip } from './fleets';
import {
  depositsLeft,
  depositsOf,
  freeSlots,
  isPlayable,
  nextId,
  pushEvent,
  returnDeposit,
  setSupport,
  inProse,
} from './helpers';
import type {
  BuildItem,
  Facility,
  FacilityType,
  Faction,
  GameState,
  PlayableFaction,
  ResourceType,
  ShipClassId,
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

/**
 * Which kind of works does this job, or nothing when the island does it itself.
 *
 * Sean cut the construction yard on 20 September — *"Anyone can build on any
 * available land"* — so a **building** has no maker: it is raised in place on
 * the island that is getting it, by `raiseWorks`. Companies and hulls still
 * come off a floor and a slipway, because a drill ground and a shipyard are
 * things you decide to have, not tolls on owning ground.
 */
export function makerFor(item: BuildItem): FacilityType | undefined {
  if (item === 'troop' || isTroopItem(item)) return 'training_facility';
  if (isShipClass(item)) return 'shipyard';
  return undefined;
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

/**
 * Hulls on the stocks that will come to anchor in this harbor.
 *
 * Sean, 22 September: *"ships under construction need to appear like any other
 * ship... so I should be able to see them."* They were only ever visible as a
 * line on the shipyard that happened to be building them, which means a player
 * looking at a harbor — the screen that answers *what have I got here* — was
 * shown everything except what was about to arrive in it.
 *
 * "Will come here" is the question, not "is being built here", and the two are
 * different: a hull laid down at Kingsward for a squadron at Highwater belongs
 * in Highwater's harbor with its passage counted, and not in Kingsward's. So
 * the destination decides, falling back to the island the yard stands on.
 *
 * `daysToDeliver` already answers the rest — work left over how many yards are
 * on it, plus the crossing — so this is a search rather than any new
 * arithmetic.
 */
export interface HullOnTheStocks {
  /** The works carrying the order. Stable, and unique per hull in flight. */
  facilityId: string;
  classId: ShipClassId;
  /** Days until she is lying in this harbor: the work and then the passage. */
  days: number;
  /** Where she is being built, for a hull coming from somewhere else. */
  madeOn: System;
  owner: PlayableFaction;
}

export function hullsBuildingFor(
  state: GameState,
  systemId: string,
  faction: PlayableFaction,
): HullOnTheStocks[] {
  const out: HullOnTheStocks[] = [];
  for (const system of state.systems) {
    for (const facility of system.facilities) {
      const order = facility.building;
      if (!order || facility.owner !== faction) continue;
      if (!isShipClass(order.item)) continue;
      if ((order.destinationId ?? system.id) !== systemId) continue;
      out.push({
        facilityId: facility.id,
        classId: order.item,
        days: daysToDeliver(system, facility),
        madeOn: system,
        owner: faction,
      });
    }
  }
  // Soonest first: the one you are waiting on is the one at the top.
  return out.sort((a, b) => a.days - b.days);
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
export function buildMenu(facility: Facility, grade: ShipGrade, on?: System): BuildItem[] {
  // A works waits on the shipwrights too now, for exactly one building: see
  // `FACILITY_CRAFT`. Everything else a yard has always been able to raise.
  if (facility.type === 'training_facility') {
    if (!isPlayable(facility.owner)) return [];
    // Every company the side has unlocked *and* this island can actually
    // raise. Where the island is not known — the chart's idle marks ask about
    // the works, not about an order — the side's whole unlocked list answers,
    // so a drill ground never reads as having nothing to do.
    const here = raisableTroops(facility.owner, grade, on);
    return here.length > 0 ? here.map((t) => t.id as BuildItem) : ['troop'];
  }
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
 * **Everything you build**, since Sean's ruling of 21 September: *"Just make
 * research the mission. And it applies to buildings, ships, and troops. Keep
 * it simple."*
 *
 * It used to be hulls alone, on the reasoning that the research mission was
 * shipwright craft and nothing else, and that one effect is easier to notice
 * than three. That was a rule about *what research is* rather than about what
 * a player wants from it — and it left the mission worth nothing at all to a
 * side that was not building ships that month. One grade now takes its cut off
 * a mine, a wall, a troop and a first-rate alike.
 *
 * Rounded up rather than down, and floored at a day: three grades of a 13%
 * cut is a real saving, not a free hull.
 */
export function effectiveSpec(
  state: GameState,
  faction: PlayableFaction,
  item: BuildItem,
  on?: System,
): { costGold: number; days: number } {
  /*
   * A company is priced by who it is, since 21 September.
   *
   * Every troop in the game used to cost 25 gold and seven days whoever they
   * were, which made the Shoal Wardens — the whole point of whom is that they
   * are the cheapest bodies in the world and can be raised in eight days —
   * cost exactly what the Drowned Guard cost. The island already knows who it
   * raises, so the price simply follows.
   *
   * It does not return here, and that is the whole of the merge. The ground
   * roster priced troops and left `if (!isShipClass(item)) return` standing
   * above the craft cut, so the comment on this function said research applies
   * to a mine, a wall, a troop and a first-rate alike and the body applied it
   * to hulls only. Sean's ruling is the comment: *"Just make research the
   * mission. And it applies to buildings, ships, and troops."* So a company
   * gets its own price **and then** the cut, like everything else.
   */
  const spec =
    item === 'troop' && on ? (troopBuildAt(on, faction) ?? buildSpec(item)) : buildSpec(item);
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
  return item !== 'troop' && !isTroopItem(item) && !isShipClass(item);
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
/**
 * What this island is already making, if anything.
 *
 * Sean, 22 September: *"let's also make it to where you can only build one
 * thing at a time on an island. We don't want to just be able to spam like
 * five things that are all being made simultaneously."*
 *
 * The rule before was one job per *kind* — a shipyard, a barracks and a
 * building could all be going at once, so a developed island ran three
 * queues. That is the spam he is describing, and it is also why an island's
 * output scaled with how many different sorts of works stood on it rather
 * than with any decision.
 *
 * One job per island, full stop. Several works of the same kind still pull on
 * the same job and still finish it faster — that is the build divisor and it
 * is untouched — but a second *order* waits for the first.
 *
 * Counts anything the island is carrying: a hull or a troop on a works, and a
 * works being laid down. Only the owner's own, so an island changing hands
 * mid-build does not deadlock the new holder on somebody else's order.
 */
export function islandBusy(
  system: System,
  owner: PlayableFaction,
): { label: string } | null {
  for (const f of system.facilities) {
    if (f.owner !== owner) continue;
    if (f.founding) return { label: FACILITY_LABEL[f.type] };
    if (f.building) return { label: buildLabel(f.building.item) };
  }
  return null;
}

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
  if (!buildMenu(facility, grade, system).includes(item)) {
    /*
     * A drill ground always takes `'troop'`, whatever its menu says.
     *
     * The menu is the *picker's* list — the named companies this island can
     * raise today — and `'troop'` is deliberately not on it, because offering
     * "Troop" beside "Crown Marines" and "Fensworn" would be offering the same
     * thing twice. But `'troop'` is still a legal order and means *whatever
     * this island raises*: it is what the opponent asks for, and what an order
     * placed before companies had names meant. Refusing it here would have
     * stopped the opponent raising a single company for the rest of the war.
     */
    if (item === 'troop' && facility.type === 'training_facility') {
      // Falls through to the checks below rather than returning.
    } else if (isTroopItem(item) && facility.type === 'training_facility') {
      const t = troopType(item);
      const why = t ? raiseReason(t, grade, system) : null;
      return why ?? 'This building cannot make that.';
    } else if (isShipClass(item) && shipClass(item).faction === facility.owner) {
      return `${shipClass(item).name} needs ${craftNeeded(item)} ${craftNeeded(item) === 1 ? 'grade' : 'grades'} of shipwright craft.`;
    } else {
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
  // And one job per island, whatever kind of works it is on. See `islandBusy`.
  const elsewhere = islandBusy(system, facility.owner);
  if (elsewhere) return `${inProse(system.name)} is already making ${elsewhere.label}.`;
  if (system.control !== facility.owner) return 'You do not hold this island.';
  if (system.uprising) return 'The island is in mutiny.';

  const landing = destinationId ? state.systems.find((s) => s.id === destinationId) : system;
  if (!landing) return 'No such island.';
  const spec = effectiveSpec(state, facility.owner, item, landing);
  if (state.factions[facility.owner].gold < spec.costGold) {
    return `Needs ${spec.costGold} ${terms.gold.toLowerCase()}.`;
  }

  if (landing.control !== facility.owner) return `You do not hold ${inProse(landing.name)}.`;
  if (landing.uprising) return `${landing.name} is in mutiny.`;

  // The ground first. Sean's rule, 16 September: a mill goes on a forest and a
  // mine on a vein, or it goes nowhere — "it doesn't make sense that you can
  // just put gold mines anywhere and print money." The works takes the
  // deposit's own berth, so it needs no free plot beside it.
  const wants = needsResource(item);
  if (wants) {
    if (openDeposits(state, landing, wants) < 1) {
      return depositsLeft(landing, wants) > 0
        ? `Every ${RESOURCE_LABEL[wants].toLowerCase()} on ${inProse(landing.name)} is spoken for.`
        : `No ${RESOURCE_LABEL[wants].toLowerCase()} on ${inProse(landing.name)}.`;
    }
    return null;
  }

  // Companies and hulls take no ground: one drills, the other floats.
  const held = reservedSlots(state, landing.id);
  if (takesRoom(item) && freeSlots(landing) - held < 1) {
    return `No room left on ${inProse(landing.name)}.`;
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
  const landing = destinationId ? state.systems.find((s) => s.id === destinationId) : system;
  const spec = effectiveSpec(state, facility.owner as PlayableFaction, item, landing ?? system);
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
  if (!type) {
    /*
     * A building. Nothing to choose between and nowhere to sail: since the
     * construction yard was cut it is raised in place, so the only question
     * left is whether the island will take it.
     */
    return {
      facilityId: null,
      fromSystemId: destinationId,
      days: spec.days,
      travel: 0,
      costGold: spec.costGold,
      upkeep,
      error: raiseWorksError(state, destinationId, item as FacilityType, faction),
    };
  }
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
    text: `The timber on ${inProse(system.name)} has been felled and the ground cleared. There is a plot open where the forest stood.`,
    systemId: system.id,
  });
}

/** Cancel an order. The gold already laid out is not refunded. */
export function cancelBuild(state: GameState, facilityId: string): void {
  const found = findFacility(state, facilityId);
  if (!found?.facility.building) return;
  // A works that was only ever an order comes down with it — and the ground it
  // was standing on goes back, since `raiseWorks` took it up front.
  if (found.facility.founding) {
    found.system.facilities = found.system.facilities.filter((f) => f.id !== facilityId);
    const ground = WORKS_ON[found.facility.type];
    if (ground) returnDeposit(state, found.system, ground);
    return;
  }
  found.facility.building = undefined;
}

/**
 * Raise a building on an island you hold. The only way buildings are built.
 *
 * Sean, 20 September: *"Cut construction yards completely. Anyone can build on
 * any available land... That way buildings are never traveling... So gold
 * becomes building constraint not the yard."*
 *
 * This was `foundWorks`, the one order that needed no builder, kept for
 * islands taken in the war that had no yard and could therefore never have
 * anything. It is now the general case and the special case is gone with the
 * yard itself. Three things follow, and all three are the point:
 *
 *  - **Nothing travels.** A building is raised where it is going. The old
 *    path let a yard on one island build for another and ship the result, so
 *    an order carried a passage and could arrive somewhere that had since
 *    changed hands.
 *  - **Gold is the brake.** Not the 120 and the 34 days a yard cost before
 *    anything else could begin on newly taken ground.
 *  - **The works stands in its plot from the day it is ordered**, so the
 *    ground cannot be promised twice and the player can see what is coming.
 */
export function raiseWorksError(
  state: GameState,
  systemId: string,
  type: FacilityType,
  owner: PlayableFaction,
): string | null {
  const system = state.systems.find((s) => s.id === systemId);
  if (!system) return 'No such island.';
  if (system.control !== owner) return 'You do not hold this island.';
  if (system.uprising) return 'The island is in mutiny.';

  const wantsCraft = FACILITY_CRAFT[type] ?? 0;
  if (wantsCraft > gradeOf(state, owner)) {
    return `${FACILITY_LABEL[type]} needs ${wantsCraft} ${wantsCraft === 1 ? 'grade' : 'grades'} of shipwright craft.`;
  }

  const cost = YARD_BUILDS[type].costGold;
  if (state.factions[owner].gold < cost) {
    return `Needs ${cost} ${terms.gold.toLowerCase()}.`;
  }

  // An earner goes on its own ground and takes that plot; everything else
  // wants a plot of its own. Sean's rule of 16 September either way.
  const wants = WORKS_ON[type];
  if (wants) {
    if (openDeposits(state, system, wants) < 1) {
      return depositsLeft(system, wants) > 0
        ? `Every ${RESOURCE_LABEL[wants].toLowerCase()} on ${inProse(system.name)} is spoken for.`
        : `No ${RESOURCE_LABEL[wants].toLowerCase()} on ${inProse(system.name)}.`;
    }
  } else if (freeSlots(system) - reservedSlots(state, system.id) < 1) {
    return `No room left on ${inProse(system.name)}.`;
  }

  // One job per island, the same rule a hull or a troop answers to — asked
  // last on purpose. Every reason above is a fact about the island that will
  // still be true tomorrow; this one clears itself the day the current job
  // lands. Told "already making a Lumber Mill" a player waits, and a player
  // who waits for a vein that was never there waits forever.
  const busy = islandBusy(system, owner);
  if (busy) return `${inProse(system.name)} is already making ${busy.label}.`;
  return null;
}

export function raiseWorks(
  state: GameState,
  systemId: string,
  type: FacilityType,
  owner: PlayableFaction,
): void {
  const error = raiseWorksError(state, systemId, type, owner);
  if (error) throw new Error(error);
  const system = state.systems.find((s) => s.id === systemId)!;
  const spec = YARD_BUILDS[type];
  state.factions[owner].gold -= spec.costGold;
  /*
   * An earner takes its ground the day it is ordered, not the day it opens.
   *
   * Measured the hard way: without this the island counts the half-built
   * works *and* the deposit under it, so it goes over its own plot count —
   * and worse, the vein still reads as open, so the opponent orders another
   * mine onto it every tick. Twelve wars came back with thirty-five thousand
   * over-built islands and a treasury of 2.8 million.
   *
   * Taking it up front is also just what the rest of the rule says: the works
   * stands in its plot from the day it is ordered so the ground cannot be
   * promised twice. A cancelled order puts it back.
   */
  const ground = WORKS_ON[type];
  if (ground) {
    const at = depositsOf(system).findIndex((d) => d.type === ground);
    if (at >= 0) system.deposits = depositsOf(system).filter((_, i) => i !== at);
  }
  system.facilities.push({
    id: `fac-${++state.nextId}`,
    type,
    owner,
    founding: true,
    building: {
      item: type,
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
        /*
         * A works being laid down is building *itself*, so there is no crew of
         * others to divide the job between — one day's work a day, flat. That
         * was already true of the only founding order there used to be; since
         * the construction yard was cut it is true of every building, which is
         * the whole reason their times went up (see `YARD_BUILDS`).
         */
        const hands = facility.founding
          ? 1
          : crewOn(system, facility.type, facility.owner);
        order.workLeft = Math.max(0, order.workLeft - hands);
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
          text:
            facility.owner === state.player
              ? `${landing.name} is no longer yours; the ${buildLabel(order.item).toLowerCase()} bound for it turns back to ${inProse(system.name)}.`
              : `${landing.name} has changed hands; the ${buildLabel(order.item).toLowerCase()} bound for it turns back to ${inProse(system.name)}.`,
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
      //
      // A **founding** works is exempt from both, and has to be: it has stood
      // in its own plot since the day it was ordered and an earner took its
      // deposit then too, so asking again finds the plot full and the ground
      // gone and the works can never finish. That is not a hypothetical — it
      // held every raised mine at nought days left for ever, and the only
      // thing that showed it was a dispatch that never arrived.
      const wants = needsResource(order.item);
      if (facility.founding) {
        // Nothing to check. The ground and the plot were taken up front.
      } else if (wants) {
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
          text: `A ${FACILITY_LABEL[facility.type].toLowerCase()} now stands on ${inProse(system.name)}.`,
          systemId: system.id,
        });
        // And a rock with something finished on it is a rock no longer.
        settleOnCompletion(state, system, facility.owner as PlayableFaction);
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
  /*
   * A company arrives as *itself*.
   *
   * `'troop'` still means "whatever this island raises", which is what the
   * opponent orders and what an order placed before companies had names meant;
   * it is settled here, on delivery, by asking the island. A named order keeps
   * the name it was given. Either way the island's roster gains a real entry
   * rather than the count going up by one and the mix being re-invented.
   */
  if (item === 'troop' || isTroopItem(item)) {
    const kind = item === 'troop' ? (troopBuildAt(system, owner)?.id ?? item) : item;
    postCompanies(system, kind);
    const name = buildLabel(kind as BuildItem);
    pushEvent(state, {
      kind: 'order',
      text: shipped
        ? `${name} drilled on ${inProse(madeOn.name)} have landed on ${inProse(system.name)}.`
        : `${name} have finished their drill on ${inProse(system.name)}.`,
      systemId: system.id,
    });
    return;
  }

  if (isShipClass(item)) {
    const fleet = addShip(state, system, owner, item);
    pushEvent(state, {
      kind: 'order',
      text: shipped
        ? `A ${buildLabel(item)} off the stocks at ${inProse(madeOn.name)} has come in to ${inProse(system.name)} and joins ${fleet.name}.`
        : `A ${buildLabel(item)} slides off the stocks at ${inProse(system.name)} and joins ${fleet.name}.`,
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
  system.facilities.push({ id: nextId(state, 'fac'), type: item as FacilityType, owner });
  pushEvent(state, {
    kind: 'order',
    text: shipped
      ? `${buildLabel(item)} raised on ${inProse(system.name)} by builders from ${inProse(madeOn.name)}.`
      : `${buildLabel(item)} completed on ${inProse(system.name)}.`,
    systemId: system.id,
  });

  settleOnCompletion(state, system, owner);
}

/**
 * Finishing anything on an empty island settles it (spec 4.3).
 *
 * Its own function because there are two ways a building finishes now. A hull
 * or a company still comes off a works and lands through `completeBuild`; a
 * **building** is raised in place and finishes where it stands, which skips
 * that path entirely — and took the settling with it until this was pulled
 * out. Measured by a test that asked whether the dispatch appeared at all.
 */
function settleOnCompletion(state: GameState, system: System, owner: PlayableFaction): void {
  if (!system.populated) {
    system.populated = true;
    setSupport(system, owner, 100);
    system.control = owner;
    pushEvent(state, {
      kind: 'flip',
      // Whose people they are depends on who did the settling. Sean's
      // playtest: *"'Rime Island has been settled... they are yours' appeared
      // when the CROWN settled it."* One log serves both sides, so anything
      // written in the second person has to ask first.
      text:
        owner === state.player
          ? `${system.name} has been settled. There are people on it now, and they are yours.`
          : `${system.name} has been settled. There are people on it now, and they answer to the ${factionData[owner].shortName}.`,
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
