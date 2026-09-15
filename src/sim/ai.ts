import {
  AI_BUILD_INTERVAL,
  AI_FLEET_INTERVAL,
  AI_MISSION_INTERVAL,
  AI_MISSION_PARTIES,
  AI_NEAR_BONUS,
  AI_ABDUCT_BONUS,
  AI_LORD_BOUNTY,
  AI_RECRUIT_BONUS,
  AI_RESEARCH_BONUS,
  AI_SHIP_RESERVE,
  AI_TROOP_POOL,
  HELD_SUPPORT_LEVEL,
  INCITE_PRIORITY_PENALTY,
  loyaltyBand,
  TROOP_BUILD,
  UPKEEP_PER_DAY,
  YARD_BUILDS,
  shipSpec,
  shipsFor,
} from './constants';
import { buildMenu, canQueueBuild, foundWorks, foundWorksError, queueBuild } from './build';
import {
  assault,
  assaultError,
  board,
  boardError,
  boomDefence,
  embark,
  embarkError,
  sparedCompanies,
  fortGuns,
  fleetCapacity,
  fleetGuns,
  fleetsAt,
  fleetsOf,
  isAtSea,
  sailError,
  sailFleet,
} from './fleets';
import { isLord, lords, powerOf } from './lords';
import {
  freeSlots,
  getSystem,
  otherFaction,
  requiredGarrison,
} from './helpers';
import {
  canStartMission,
  isMissionTarget,
  abductOn,
  isRecruitTarget,
  isResearchTarget,
  missionsOffered,
  quality,
  recruitOn,
  startMission,
  captiveOn,
  travelDays,
} from './missions';
import type { Rng } from './rng';
import type {
  Character,
  FacilityType,
  Fleet,
  ShipClassId,
  GameState,
  PlayableFaction,
  System,
} from './types';

/**
 * Deliberately simple opponent (spec 4.7): keep the mine/refinery count level,
 * and keep the best diplomat working the most promising world.
 */
/**
 * What the opponent clears a day after everything it owns is paid for.
 *
 * The upkeep ceiling. Measured over a year of play the opponent used to run
 * its treasury dry by day 180 on either side — every island it took added
 * a garrison to feed, every hull a crew, and nothing ever asked whether the
 * ledger could carry it. It won land-grabs while bankrupt, with its works
 * falling down behind it. So: nothing that costs upkeep is ordered unless
 * the surplus can carry it with room to spare, and when the surplus is thin
 * the only thing it builds is an earner.
 */
function surplus(state: GameState, ai: PlayableFaction): number {
  const f = state.factions[ai];
  // Orders still on the stocks are wages not yet on the ledger. Without
  // counting them, six orders in one tick each saw the same surplus and the
  // opponent committed to more than it could carry.
  let pending = 0;
  for (const system of state.systems) {
    for (const facility of system.facilities) {
      if (facility.owner === ai && facility.building && !facility.founding) {
        pending += UPKEEP_PER_DAY[facility.building.item];
      }
    }
  }
  return f.income - f.upkeep - pending;
}
/** Kept clear over and above whatever the next order will cost to run. */
const AI_SURPLUS_MARGIN = 3;
/** Orders the opponent may place in one build tick, gold permitting. */
const AI_ORDERS_PER_TICK = 3;
/**
 * Above this the opponent is hoarding, not saving: by day 400 it sat on
 * thousands of gold with no cadence to spend it. Rich, it places twice the
 * orders a tick and lays down a hull at every free slipway rather than one.
 */
const AI_RICH = 600;

export function runAI(state: GameState, rng: Rng): void {
  const ai = otherFaction(state.player);
  if (state.day % AI_BUILD_INTERVAL === 0) {
    // More than one order a tick. One every five days could not keep up
    // with a war that hands the opponent an island a week, each with a
    // garrison to feed: the earners it needed sat unordered behind the
    // cadence, not the treasury. It keeps ordering while it has the gold
    // and something to order, a few at a time.
    const orders = state.factions[ai].gold > AI_RICH ? AI_ORDERS_PER_TICK * 2 : AI_ORDERS_PER_TICK;
    for (let n = 0; n < orders; n++) {
      if (!aiBuild(state, ai)) break;
    }
  }
  if (state.day % AI_MISSION_INTERVAL === 0) {
    // Postings before errands, so a Lord it wants in a chair is in the chair
    // before the errand pass can send them somewhere else.
    aiPostLords(state, ai);
    aiMission(state, ai);
  }
  if (state.day % AI_FLEET_INTERVAL === 0) aiFleet(state, ai, rng);
}

/**
 * What the opponent puts its gold into, in priority order.
 *
 * It used to queue nothing but mines and refineries, which meant it never
 * built a Slipway, never put a hull in the water and never drilled a company
 * past the ones it started with. Measured over a 700-day war it finished with
 * zero ships and its opening eight companies — so every naval rule it was
 * given was unreachable, and the war was one-sided in a way nothing on screen
 * admitted.
 *
 * It now holds what it has, then drills, then builds a yard, then grows.
 */
function aiBuild(state: GameState, ai: PlayableFaction): boolean {
  const gold = state.factions[ai].gold;
  const held = state.systems.filter((s) => s.control === ai && !s.uprising);
  const spare = surplus(state, ai);
  const canCarry = (item: FacilityType | 'troop') =>
    spare - UPKEEP_PER_DAY[item] >= AI_SURPLUS_MARGIN;
  // A thin surplus is spent on earners before anything that eats: islands
  // taken and won over keep adding garrisons to the bill, and the only
  // answer to that is income.
  const thin = spare < AI_SURPLUS_MARGIN * 2;

  // 1. Companies. A drill ground raises them on its own island and nowhere
  //    else, so this works outward from the drill grounds rather than from the
  //    islands that are short — the short ones usually have no drill ground on
  //    them, which is exactly why an earlier version of this never drilled at
  //    all. Each keeps what holds its island quiet plus a small pool, because
  //    an opponent with no spare companies can never land on anything.
  if (!thin && gold >= TROOP_BUILD.costGold && canCarry('troop')) {
    const target = (s: System) => Math.max(requiredGarrison(s.support[ai]), 1) + AI_TROOP_POOL;
    const short = held
      .filter((s) => s.garrison < target(s))
      .sort((a, b) => target(b) - b.garrison - (target(a) - a.garrison));
    for (const system of short) {
      const drill = system.facilities.find(
        (f) => f.owner === ai && f.type === 'training_facility' && !f.building,
      );
      if (drill && canQueueBuild(state, drill.id, 'troop')) {
        queueBuild(state, drill.id, 'troop');
        return true;
      }
    }
  }

  // 2. Then the buildings it is missing entirely: somewhere to drill, and a
  //    slipway, without which none of its fleet rules can ever fire.
  const countOf = (type: FacilityType) =>
    held.reduce((n, s) => n + s.facilities.filter((f) => f.owner === ai && f.type === type).length, 0);
  const wanted: FacilityType[] = [];
  if (countOf('training_facility') < 2) wanted.push('training_facility');
  if (countOf('shipyard') < 1) wanted.push('shipyard');
  else if (countOf('shipyard') < 2 && gold > AI_SHIP_RESERVE * 3) wanted.push('shipyard');
  else if (countOf('shipyard') < 3 && gold > AI_RICH * 2) wanted.push('shipyard');
  // Rich, it also fortifies: a battery on each held port that has none, so a
  // treasury with nothing to buy turns into something a raider has to reckon with.
  if (gold > AI_RICH * 2 && countOf('fort') < Math.ceil(held.length / 3)) wanted.push('fort');

  for (const item of wanted) {
    if (thin || gold < YARD_BUILDS[item].costGold || !canCarry(item)) continue;
    const spot = bestSpotFor(state, ai, item);
    if (spot) {
      queueBuild(state, spot, item);
      return true;
    }
  }

  // 3. Otherwise grow the economy, keeping the two earners level as before.
  const item = countOf('mine') <= countOf('refinery') ? 'mine' : 'refinery';
  if (gold < YARD_BUILDS[item].costGold) return false;
  const spot = bestSpotFor(state, ai, item);
  if (spot) {
    queueBuild(state, spot, item);
    return true;
  }

  // 4. No works with ground left beside it: lay one down on the held island
  //    with the most room, so the next earner has somewhere to go. This is
  //    what used to stop the opponent dead the day its starting islands
  //    filled — every island it took after that was a garrison bill and
  //    nothing else.
  if (gold < YARD_BUILDS.construction_yard.costGold || !canCarry('construction_yard')) return false;
  const open = held
    .filter((s) => foundWorksError(state, s.id, ai) === null)
    .sort((a, b) => freeSlots(b) - freeSlots(a));
  if (open.length > 0 && freeSlots(open[0]) >= 3) {
    foundWorks(state, open[0].id, ai);
    return true;
  }
  return false;
}

/** The held island with the most room to grow that can take this order. */
function bestSpotFor(
  state: GameState,
  ai: PlayableFaction,
  item: FacilityType,
): string | undefined {
  let best: { facilityId: string; slots: number } | undefined;
  for (const system of state.systems) {
    if (system.control !== ai || system.uprising) continue;
    const slots = freeSlots(system);
    if (slots < 1) continue;
    for (const facility of system.facilities) {
      if (facility.owner !== ai || facility.building) continue;
      if (!buildMenu(facility).includes(item)) continue;
      if (!canQueueBuild(state, facility.id, item)) continue;
      if (!best || slots > best.slots) best = { facilityId: facility.id, slots };
    }
  }
  return best?.facilityId;
}

/**
 * Where the opponent puts its two seated Lords.
 *
 * Two of the three powers are bought with a Command posting, which means they
 * are worth exactly as much as the island they are spent on — and the opponent
 * had no way to spend them at all. It never took a posting of any kind: over
 * eight wars and 2,620 days, commanders held a chair on zero island-days.
 *
 * So it seats them, on the island where each power does the most:
 *
 * - **The Moot** goes where there is allegiance left to win. An island already
 *   at a hundred for the Confederacy gains nothing from an argument, so she
 *   takes the nearest-to-flipping island that is not already theirs, and never
 *   one the enemy holds — the power would work, and she would be lifted off
 *   the quay inside a month.
 * - **The Admiral** goes to the harbor with the most of its own hulls in it.
 *   His edge is worth a share of every gun lying there, so it is worth most
 *   where the guns are.
 *
 * Reyne is never seated: his power is the passage, and it is spent by sending
 * him, which the errand pass below does on its own.
 */
function aiPostLords(state: GameState, ai: PlayableFaction): void {
  for (const lord of lords(state)) {
    if (lord.faction !== ai || lord.status !== 'available') continue;
    if (state.systems.some((s) => s.commanderId === lord.id)) continue;
    const power = powerOf(lord);
    if (power === 'runner') continue;

    // Ground it actually holds. A posting is "an island of yours" — Command
    // is not on offer anywhere else — and asking for it on a neutral island
    // threw out of `startMission`, which in a real game is a crash rather than
    // a bad decision. Checked against what the island itself offers, so this
    // cannot drift away from the rule again.
    const seats = state.systems.filter(
      (s) =>
        s.populated &&
        s.control === ai &&
        canStartMission(state, lord.id, s.id) &&
        missionsOffered(state, s, ai, lord).includes('command'),
    );
    const score = (s: System) =>
      power === 'moot'
        ? s.support[ai] >= 100
          ? -1
          : s.support[ai]
        : state.fleets
            .filter((f) => f.faction === ai && f.systemId === s.id && !f.voyage)
            .reduce((n, f) => n + f.ships.length, 0);
    const want = seats.sort((a, b) => score(b) - score(a))[0];
    if (!want || score(want) <= 0) continue;
    startMission(state, lord.id, want.id, 'command');
  }
}

/**
 * The opponent's officers.
 *
 * It keeps more than one of them at sea — a faction with five officers and one
 * on a boat is not playing — and it weighs all three errands on the same scale,
 * so an enemy island whose governor is barely hanging on is worth a visit even
 * when there are neutrals left to woo, and somebody worth signing on outranks
 * both. Otherwise the player would have the run of the unaligned.
 */
function aiMission(state: GameState, ai: PlayableFaction): void {
  const enemy = otherFaction(ai);
  // Lords are in the pool now. The line here used to read `&& !isLord(c)`,
  // which was honest about the old design — a Lord was a hull, and a hull does
  // not walk onto a quay — and it was why the opponent never used any of the
  // three powers in sixteen measured wars. They are people; they take errands.
  //
  // Anyone already holding a posting is not: a chair is a job, and the errand
  // pass would otherwise walk every commander it appointed straight back out
  // of the room (`startMission` ends a posting when its holder leaves).
  const posted = new Set(state.systems.map((s) => s.commanderId).filter(Boolean) as string[]);
  const idle = state.characters
    .filter((c) => c.faction === ai && c.status === 'available' && !posted.has(c.id))
    .sort((a, b) => b.diplomacy - a.diplomacy);
  if (idle.length === 0) return;

  // Unaligned islands to court, enemy islands to stir up, and anywhere at all
  // with somebody standing on it worth signing on — its own ground included,
  // which is the one reason it has to send anyone to an island it already holds.
  // Unaligned islands to court, enemy islands to stir up, anywhere at all with
  // somebody worth signing on — and now its own ground when its own ground has
  // stopped paying: an island of yours in revolt earns you nothing and hands
  // the enemy half its trade, and a thin one hands them a quarter. Before this
  // the opponent would let a Reach rot and wonder where the gold went.
  const failing = (s: System) =>
    s.control === ai && (s.uprising || loyaltyBand(s.support[ai]) === 'thin');
  const open = state.systems.filter(
    (s) =>
      isMissionTarget(state, s, ai) &&
      (s.control === 'neutral' ||
        s.control === enemy ||
        failing(s) ||
        isRecruitTarget(state, s, ai) ||
        // A yard of its own on loyal ground. The list was neutral islands,
        // enemy islands, and its own in trouble — and research lives on its
        // own islands doing *well*, so it fell through every clause and the
        // whole mechanic never fired.
        isResearchTarget(s, ai) ||
        // Its own ground too, when one of theirs is standing on it: an enemy
        // officer in your own harbor is the easiest prize in the game and the
        // opponent used to walk straight past it.
        abductOn(state, s, ai) !== undefined),
  );
  if (open.length === 0) return;

  /**
   * What a trip is worth, on one scale for all three errands.
   *
   * Courting keeps a premium over inciting — an island won outright is worth
   * more than one merely made angry — but it is a premium and not a veto, which
   * is the whole difference: with a flat preference the opponent never incited
   * anything. A person outranks either, because people are scarce and permanent
   * and an island can be worked again next month.
   */
  const worth = (officer: Character, s: System) => {
    const home = state.systems.find((x) => x.id === officer.locationSystemId)?.sectorId;
    const close = s.sectorId === home ? AI_NEAR_BONUS : 0;
    // Somebody of theirs standing on a quay, and one of them is the war.
    // This is new: the opponent had no term for abduction at all, so across
    // sixteen measured games it never once tried it — while somebody was
    // liftable somewhere on 95% of days. With the Lords made personnel, that
    // was the Crown's whole route to victory going unused.
    const mark = abductOn(state, s, ai);
    if (mark) {
      return close + AI_ABDUCT_BONUS + quality(mark) + (isLord(mark) ? AI_LORD_BOUNTY : 0);
    }
    const recruit = recruitOn(state, s, ai);
    if (recruit) return close + AI_RECRUIT_BONUS + quality(recruit);
    // Its own yards, when there is nothing louder to do with the officer.
    if (isResearchTarget(s, ai)) return close + AI_RESEARCH_BONUS;
    // One of its own in the enemy's cells: worth more than any island.
    const held = captiveOn(state, s, ai);
    if (held) return close + AI_RECRUIT_BONUS + quality(held);
    // Its own, and slipping: worth more the further it has slipped, and an
    // island in open revolt outranks any island it might merely win over.
    if (s.control === ai) return close + (s.uprising ? 110 : (HELD_SUPPORT_LEVEL - s.support[ai]) * 1.5);
    if (s.control === 'neutral') return close + s.support[ai];
    // The weaker their hold, the nearer the uprising threshold, the better.
    return close + (100 - s.support[enemy]) - INCITE_PRIORITY_PENALTY;
  };

  const taken = new Set(
    state.characters
      .filter((c) => c.faction === ai && c.mission)
      .map((c) => c.mission!.targetSystemId),
  );

  // The best officer takes the best island, and so on down, so the opponent's
  // strongest diplomat is not left courting a backwater.
  for (const officer of idle.slice(0, AI_MISSION_PARTIES)) {
    const target = open
      .filter((s) => !taken.has(s.id) && canStartMission(state, officer.id, s.id))
      .sort((a, b) => worth(officer, b) - worth(officer, a))[0];
    if (!target) continue;
    taken.add(target.id);
    startMission(state, officer.id, target.id);
  }
}

/**
 * The opponent's navy, in the same spirit as the rest of it: no plan beyond
 * the next order, but enough that the player faces sail rather than an empty
 * sea. It lays down hulls when it can spare the gold, takes companies aboard,
 * and sends fleets at the islands you earn most from.
 *
 * Every order goes through the same checks the player's do — the AI has no
 * private rules, so anything it can do, you can do.
 */
function aiFleet(state: GameState, ai: PlayableFaction, rng: Rng): void {
  aiConsolidate(state, ai);
  aiLayDownHull(state, ai);
  // The Confederacy's one way to win is Highwater. One fleet is always the
  // one meant for it, and it does nothing else.
  const strike = ai === 'alliance' ? aiStrikeCapital(state, rng) : undefined;

  for (const fleet of fleetsOf(state, ai)) {
    if (isAtSea(fleet)) continue;
    if (fleet.id === strike) continue;
    aiSignOn(state, fleet, ai);
    if (aiLandTroops(state, fleet, ai, rng)) continue;
    aiLoadAndSail(state, fleet, ai);
  }
}


/**
 * Squadrons of its own lying in the same harbor become one squadron.
 *
 * A new hull joins whatever fleet of yours is already at the island — unless
 * that fleet happens to be at sea when the yard finishes, and then it is a
 * squadron of one. Nothing ever put them back together, and for the opponent,
 * which builds all war and sails constantly, they never stopped accumulating:
 * measured over one war the Crown finished with forty-four hulls in
 * thirty-seven squadrons, most of them a single sloop. Confetti, not a navy —
 * no squadron of it could fight anything or carry a landing.
 *
 * Deliberately the opponent's habit and not a rule of the world. Splitting a
 * squadron is an order the player gives on purpose, and a world that merged
 * them back every morning would be undoing that order.
 */
function aiConsolidate(state: GameState, ai: PlayableFaction): void {
  const byIsland = new Map<string, Fleet[]>();
  for (const fleet of fleetsOf(state, ai)) {
    if (isAtSea(fleet)) continue;
    byIsland.set(fleet.systemId, [...(byIsland.get(fleet.systemId) ?? []), fleet]);
  }
  for (const [, here] of byIsland) {
    if (here.length < 2) continue;
    // Into the strongest, so the squadron that keeps its name is the one the
    // rest of the AI's reasoning is already about.
    const [keep, ...rest] = [...here].sort((a, b) => b.ships.length - a.ships.length);
    for (const other of rest) {
      keep.ships.push(...other.ships);
      keep.troops += other.troops;
      for (const id of other.officerIds) if (!keep.officerIds.includes(id)) keep.officerIds.push(id);
      other.ships = [];
      other.troops = 0;
      other.officerIds = [];
    }
    // Companies never fit better than the hulls allow; anything over the side
    // was never really aboard.
    keep.troops = Math.min(keep.troops, fleetCapacity(keep));
  }
  state.fleets = state.fleets.filter((f) => f.ships.length > 0);
}

/** One hull at a time, and never at the expense of the economy. */
function aiLayDownHull(state: GameState, ai: PlayableFaction): void {
  if (state.factions[ai].gold < AI_SHIP_RESERVE) return;
  const classes = shipsFor(ai);
  const afloat = fleetsOf(state, ai).flatMap((f) => f.ships);
  // Keep roughly two fighting hulls to every transport.
  const transports = afloat.filter((s) => s.classId === classes.find((c) => c.role === 'transport')!.id);
  const capital = getSystem(state, state.factions.empire.hqSystemId);
  const carryAll = fleetsOf(state, ai).reduce((n, f) => n + fleetCapacity(f), 0);
  // Two clear of what the capital holds, so a landing is possible at all after
  // the losses on the way in.
  const shortOfLift = ai === 'alliance' && carryAll < capital.garrison + boomDefence(capital) + 3;
  const wantTransport = transports.length * 3 < afloat.length + 1 || shortOfLift;
  // Fighting hulls as big as it can afford; a transport when it is short of one.
  const spare = surplus(state, ai);
  const carried = (id: ShipClassId) => spare - UPKEEP_PER_DAY[id] >= AI_SURPLUS_MARGIN;
  const affordable = classes
    .filter((c) => c.role !== 'transport')
    .filter((c) => carried(c.id))
    .filter((c) => shipSpec(c.id).costGold + AI_SHIP_RESERVE <= state.factions[ai].gold)
    .sort((a, b) => shipSpec(b.id).costGold - shipSpec(a.id).costGold);
  const pick = wantTransport
    ? classes.find((c) => c.role === 'transport')
    : (affordable[0] ?? classes.find((c) => c.role === 'small'));
  if (!pick || !carried(pick.id)) return;

  // One hull, or — with gold to burn — one at every slipway standing idle.
  let laid = 0;
  for (const system of state.systems) {
    if (system.control !== ai || system.uprising) continue;
    for (const facility of system.facilities) {
      if (facility.type !== 'shipyard' || facility.owner !== ai || facility.building) continue;
      if (!buildMenu(facility).includes(pick.id)) continue;
      if (!canQueueBuild(state, facility.id, pick.id)) continue;
      if (laid > 0 && state.factions[ai].gold < AI_RICH + shipSpec(pick.id).costGold) return;
      if (laid > 0 && surplus(state, ai) - UPKEEP_PER_DAY[pick.id] < AI_SURPLUS_MARGIN) return;
      queueBuild(state, facility.id, pick.id);
      laid += 1;
    }
  }
}

/** Companies aboard and an island in reach that cannot hold: land them. */
function aiLandTroops(state: GameState, fleet: Fleet, ai: PlayableFaction, rng: Rng): boolean {
  if (fleet.troops === 0) return false;
  if (assaultError(state, fleet.id, ai) !== null) return false;
  const here = getSystem(state, fleet.systemId);
  // Only where it expects to win; a thrown-back landing is companies wasted.
  if (fleet.troops <= here.garrison) return false;
  assault(state, fleet.id, rng, ai);
  return true;
}

/** Take companies aboard where there are spare, then go and make a nuisance. */
function aiLoadAndSail(state: GameState, fleet: Fleet, ai: PlayableFaction): void {
  const here = getSystem(state, fleet.systemId);
  const room = fleetCapacity(fleet) - fleet.troops;
  if (room > 0 && here.control === ai) {
    // The same rule the player's fleets follow now that the stepper is gone:
    // whatever the island can spare above what it needs to stay quiet. It had
    // its own figure here — everything over two — which was a private rule,
    // and the opponent is not allowed those.
    const take = Math.min(room, sparedCompanies(here, state));
    if (take > 0 && embarkError(state, fleet.id, take, ai) === null) {
      embark(state, fleet.id, take, ai);
    }
  }

  // Somewhere worth going: an enemy island, richest first. With companies
  // aboard, prefer one it can actually carry.
  const enemy = otherFaction(ai);
  // The Lords are people now, so there is no hull to sail at: the Crown takes
  // them off a quay with an officer, not out of the water with a squadron.
  // What the navy is for is islands.
  const targets = state.systems.filter(
    (s) => s.control === enemy && s.populated,
  );
  // The hunt. The Crown cannot win without finding the Lords, and they are
  // out past its charts: with nothing worth sailing at, or with a fleet that
  // has no companies aboard while none of its others is already out looking,
  // the fleet goes and charts the nearest dark island instead.
  if (ai === 'empire' && aiScout(state, fleet, targets.length === 0)) return;
  if (targets.length === 0) return;
  const worth = (s: System) =>
    s.facilities.filter((f) => f.owner === enemy).length * 10 -
    s.garrison * (fleet.troops > 0 ? 6 : 0);
  const target = [...targets].sort((a, b) => worth(b) - worth(a))[0];
  if (target.id === fleet.systemId) return;
  if (fleetGuns(fleet) === 0 && fleet.troops === 0) return; // nothing to offer
  if (sailError(state, fleet.id, target.id, ai) !== null) return;
  sailFleet(state, fleet.id, target.id, ai);
}

/** Day before which the Admiral's ship is not committed to the strike. */

/**
 * The strike on Highwater.
 *
 * The Confederate opponent's whole war ends there, so its strongest fleet
 * without a Lord aboard is kept for it. It stages at the island of the
 * Confederacy's with the most companies to spare, takes them aboard until it
 * carries more than the capital's garrison and boom together, and then sails
 * — but not into a harbor where the Crown's guns outweigh its own. Returns
 * the strike fleet's id so the general routine leaves it alone.
 */
function aiStrikeCapital(state: GameState, rng: Rng): string | undefined {
  const capital = getSystem(state, state.factions.empire.hqSystemId);
  if (capital.control !== 'empire') return undefined;
  // Every hull is committable now: there are no Lords' ships to hold back,
  // and the thing the Confederacy cannot afford to lose walks about on land.
  const candidates = fleetsOf(state, 'alliance').filter((f) => fleetCapacity(f) > 0);
  if (candidates.length === 0) return undefined;
  const fleet = [...candidates].sort((a, b) => fleetGuns(b) - fleetGuns(a))[0];
  if (isAtSea(fleet)) return fleet.id;

  const need = capital.garrison + boomDefence(capital) + 1;
  const crownGuns = fleetsAt(state, capital.id)
    .filter((f) => f.faction === 'empire')
    .reduce((n, f) => n + fleetGuns(f), 0);
  const here = getSystem(state, fleet.systemId);

  // Everything of ours lying in this harbor folds into the strike, and while
  // it is short of guns or of berths the rest are called in from wherever they
  // are. Guns are not the only shortage that matters: a squadron that cannot
  // carry more companies than the capital has ashore will never sail, however
  // many hulls it has, and the whole navy will gather behind it and wait out
  // the war.
  const wall = (crownGuns + fortGuns(capital)) * 1.25;
  const outgunned = fleetGuns(fleet) < wall;
  const needLift = fleetCapacity(fleet) < need;
  for (const other of fleetsOf(state, 'alliance')) {
    if (other.id === fleet.id || isAtSea(other)) continue;
    if (other.systemId === fleet.systemId) {
      fleet.ships.push(...other.ships);
      fleet.troops += other.troops;
      fleet.officerIds.push(...other.officerIds);
      other.ships = [];
      other.troops = 0;
      other.officerIds = [];
    } else if (
      ((outgunned && fleetGuns(other) > 0) || (needLift && fleetCapacity(other) > 0)) &&
      sailError(state, other.id, fleet.systemId, 'alliance') === null
    ) {
      sailFleet(state, other.id, fleet.systemId, 'alliance');
    }
  }
  state.fleets = state.fleets.filter((f) => f.ships.length > 0);

  // Off the capital already: go ashore if it can carry the island. If it
  // cannot, it does not lie there hoping — there are no companies to be had
  // in the enemy's harbor, so it falls through and goes to fetch some.
  if (here.id === capital.id) {
    if (
      fleet.troops > capital.garrison + boomDefence(capital) &&
      assaultError(state, fleet.id, 'alliance') === null
    ) {
      assault(state, fleet.id, rng, 'alliance');
      return fleet.id;
    }
  } else if (fleet.troops >= need && fleetCapacity(fleet) >= need && !outgunned) {
    // Enough aboard and the harbor is not a death trap: go.
    if (sailError(state, fleet.id, capital.id, 'alliance') === null) {
      sailFleet(state, fleet.id, capital.id, 'alliance');
    }
    return fleet.id;
  }

  // Otherwise fill up: take what is spare here, then go where more is spare.
  const spareOn = (s: System) => sparedCompanies(s, state);
  const room = fleetCapacity(fleet) - fleet.troops;
  if (here.control === 'alliance' && room > 0 && spareOn(here) > 0) {
    const take = Math.min(room, spareOn(here));
    if (embarkError(state, fleet.id, take, 'alliance') === null) embark(state, fleet.id, take, 'alliance');
    return fleet.id;
  }
  if (room > 0 || fleet.troops < need) {
    const depot = state.systems
      .filter((s) => s.control === 'alliance' && !s.uprising && s.id !== here.id && spareOn(s) > 0)
      .sort((a, b) => spareOn(b) - spareOn(a) || travelDays(state, here.id, a.id) - travelDays(state, here.id, b.id))[0];
    if (depot && sailError(state, fleet.id, depot.id, 'alliance') === null) {
      sailFleet(state, fleet.id, depot.id, 'alliance');
    }
  }
  return fleet.id;
}

/**
 * Sail for the nearest island the Crown has not charted. One picket at a time
 * unless there is nothing else to do, so the raiding goes on while the
 * looking does. Returns whether the fleet was sent.
 */
function aiScout(state: GameState, fleet: Fleet, idle: boolean): boolean {
  const dark = state.systems.filter((s) => !s.explored.empire);
  if (dark.length === 0) return false;
  const alreadyOut = fleetsOf(state, 'empire').some(
    (f) => f.voyage && !getSystem(state, f.voyage.targetSystemId).explored.empire,
  );
  if (!idle && (fleet.troops > 0 || alreadyOut)) return false;
  const here = getSystem(state, fleet.systemId);
  const nearest = [...dark].sort(
    (a, b) =>
      travelDays(state, here.id, a.id) - travelDays(state, here.id, b.id) ||
      Math.hypot(a.x - here.x, a.y - here.y) - Math.hypot(b.x - here.x, b.y - here.y),
  )[0];
  if (sailError(state, fleet.id, nearest.id, 'empire') !== null) return false;
  sailFleet(state, fleet.id, nearest.id, 'empire');
  return true;
}

/**
 * One officer per fleet, the most useful crew member standing where she lies.
 * Without this the opponent would sail with nobody aboard and never scout,
 * never fight better and never carry a close landing — all three ratings would
 * be the player's alone.
 */
function aiSignOn(state: GameState, fleet: Fleet, ai: PlayableFaction): void {
  if (fleet.officerIds.length > 0) return;
  // Not somebody already holding an island. Taking a deck ends a posting, so
  // signing on the best officer available would pick whichever Lord it had
  // just seated and undo its own appointment every few days.
  const posted = new Set(state.systems.map((s) => s.commanderId).filter(Boolean) as string[]);
  const worth = (c: { leadership: number; combat: number; espionage: number }) =>
    c.leadership + c.combat + c.espionage;
  const best = state.characters
    .filter((c) => !posted.has(c.id) && boardError(state, fleet.id, c.id, ai) === null)
    .sort((a, b) => worth(b) - worth(a))[0];
  if (best) board(state, fleet.id, best.id, ai);
}
