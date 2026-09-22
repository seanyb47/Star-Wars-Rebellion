import {
  AI_BUILD_INTERVAL,
  AI_FLEET_INTERVAL,
  AI_MISSION_INTERVAL,
  AI_MISSION_PARTIES,
  AI_FIRST_YARD_BONUS,
  AI_HUNTERS,
  AI_WATCH_CAUTION,
  AI_CORPS_COMFORT,
  AI_SCARCITY_MAX,
  AI_RESCUE_PARTIES,
  AI_NEAR_BONUS,
  AI_ABDUCT_BONUS,
  AI_LORD_BOUNTY,
  AI_CLOSING_BOUNTY,
  AI_RESCUE_BONUS,
  AI_LORD_RESCUE_BONUS,
  AI_RECRUIT_BONUS,
  AI_COURT_BONUS,
  AI_JOIN_WEIGHT,
  AI_INCITE_BONUS,
  AI_RESEARCH_BONUS,
  AI_SURVEY_BONUS,
  AI_SURVEY_HUNGER,
  AI_SURVEY_DARK,
  AI_PLOT_WORTH,
  AI_COMFORTABLE,
  AI_RUNWAY_DAYS,
  AI_SHIP_RESERVE,
  AI_TROOP_POOL,
  AI_LANDING_POOL,
  HELD_SUPPORT_LEVEL,
  INCITE_PRIORITY_PENALTY,
  loyaltyBand,
  TROOP_BUILD,
  UPKEEP_PER_DAY,
  needsResource,
  AI_KEEP_TIMBER,
  YARD_BUILDS,
  shipSpec,
  shipsAt,
} from './constants';
import { inciteStanding, joinChance, parleyStanding } from './politics';
import {
  buildMenu,
  canQueueBuild,
  clearError,
  clearForest,
  gradeOf,
  openDeposits,
  raiseWorks,
  raiseWorksError,
  queueBuild,
} from './build';
import { craftGrade } from './missions';
import type { BuildItem } from './types';
import { raisableTroops } from './troops';
import { follows } from './doctrine';
import { expectedDamage } from './cannon';
import { islandDefense } from './siege';
import { shipClass } from './constants';
import {
  assault,
  assaultError,
  bombardError,
  bombardNow,
  bombardOdds,
  islandDefenders,
  fleetBombard,
  fortsOf,
  board,
  boardError,
  embark,
  embarkError,
  sparedCompanies,
  fleetCapacity,
  fleetGuns,
  fleetsAt,
  fleetsOf,
  isAtSea,
  sailError,
  sailFleet,
} from './fleets';
import { isPrincipal, lords, powerOf } from './lords';
import {
  depositsLeft,
  freeSlots,
  getSystem,
  otherFaction,
  requiredGarrison,
} from './helpers';
import {
  canStartMission,
  endMission,
  isCovert,
  isMissionTarget,
  abductOn,
  isRecruitTarget,
  isRescueTarget,
  isResearchTarget,
  isSurveyTarget,
  missionsOffered,
  missionTypeFor,
  quality,
  recruitChance,
  canRecruit,
  canRecruitAt,
  startMission,
  captiveOn,
  travelDays,
  knownWatch,
  sightOf,
  isEspionageTarget,
} from './missions';
import type { Rng } from './rng';
import type {
  Character,
  FacilityType,
  Fleet,
  MissionType,
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
  // And what is in the bank, spread over a long campaign.
  //
  // This read the daily ledger alone, which is right about bankruptcy and
  // blind about savings: a faction can hold a hundred and seventy thousand
  // gold, a thin daily surplus, and therefore build nothing at all. Measured
  // over sixty wars, that is exactly what happened — the Confederacy took
  // forty-one islands of sixty-three, banked 172,000, and then could not
  // afford the two first-rates it needed to open Highwater's seawall, so the
  // war ran to three thousand days and stopped without ending.
  //
  // Upkeep is paid out of the treasury and nothing breaks until it is empty
  // (see `payUpkeep`), so a deficit a big bank can carry for a year is not a
  // deficit worth refusing an order over.
  // Doctrine: `spend-the-bank`. A plain opponent reads the daily ledger and
  // nothing else, and so sits on its savings.
  const bank = follows(state, 'spend-the-bank') ? f.gold / AI_RUNWAY_DAYS : 0;
  return f.income - f.upkeep - pending + bank;
}
/** Kept clear over and above whatever the next order will cost to run. */
const AI_SURPLUS_MARGIN = 3;
/**
 * And what it keeps clear instead while it is saving for the war's last act.
 *
 * Wide enough that nothing with a wage gets ordered until the ledger is
 * genuinely in the black, which is the only way a side at equilibrium ever
 * accumulates anything.
 */
const AI_WARCHEST_MARGIN = 12;

/**
 * Whether this side cannot yet storm the island that would end the war.
 *
 * The deadlock this exists to break, measured on seed 1 after the ground went
 * to three rungs: the Confederacy holds **forty islands, income 347, upkeep
 * 347, ninety-one gold**, and stays there for fifteen hundred days. Its strike
 * fleet is stuck at 113 guns against Highwater's bar of 165, and it cannot buy
 * the hulls to close the gap because it has no surplus, and it has no surplus
 * because it spent every penny of income on garrisons, drill grounds and walls
 * across forty islands. Forty-two of sixty-three islands and the war cannot be
 * finished.
 *
 * This is the same failure the `spend-the-bank` doctrine was written for — the
 * note on `surplus` describes a side that banked 172,000 and still could not
 * afford two first-rates — except from the other side of the ledger. That one
 * could not see its savings; this one has none to see, because nothing ever
 * told it to stop spending.
 *
 * So: a side that cannot win the war it is in stops building post offices. It
 * keeps raising earners, which cost nothing and are how the surplus comes
 * back, and it keeps buying hulls, which is the thing it is short of. Anything
 * with a wage that is neither waits.
 */
function savingForTheStrike(state: GameState, ai: PlayableFaction): boolean {
  const enemy = otherFaction(ai);
  const capital = state.systems.find((s) => s.id === state.factions[enemy].hqSystemId);
  if (!capital || capital.control !== enemy) return false;
  // The same bar `aiStrikeCapital` will hold the fleet to when it comes to
  // sail, read here so the build order is working towards the same number
  // rather than towards a different idea of "enough".
  const guarded = fleetsAt(state, capital.id)
    .filter((f) => f.faction === enemy)
    .reduce((n, f) => n + fleetGuns(f), 0);
  // Ships only. A fort used to be counted here as though it shot back, and it
  // does not any more — a wall is an obstacle to a landing and to a
  // bombardment, and never a danger to a fleet lying off it.
  const wall = guarded * 1.25;
  const best = Math.max(0, ...fleetsOf(state, ai).map(fleetGuns));
  return best < wall;
}
/** Orders the opponent may place in one build tick, gold permitting. */
/**
 * Orders the opponent may place in one build tick, gold permitting.
 *
 * Three every five days was set when a side held nine islands. It conquers
 * now, and a side holding twenty-five has three times the berths and three
 * times the bill — so the same three orders left it further behind every week
 * it won. Measured at day 300 of one war: twenty-eight to thirty-two works
 * standing idle across both sides, against two to four working.
 *
 * Six. The real brakes are still the ones that should be — the surplus, the
 * treasury, and whether there is ground to build on at all.
 */
const AI_ORDERS_PER_TICK = 6;
/**
 * Above this the opponent is hoarding, not saving: by day 400 it sat on
 * thousands of gold with no cadence to spend it. Rich, it places twice the
 * orders a tick and lays down a hull at every free slipway rather than one.
 */
const AI_RICH = 600;

/**
 * A day's thinking for one side.
 *
 * `side` defaults to the opponent, which is every ordinary game. Passing the
 * player's own side is what observe mode does: the same brain, run twice, and
 * a war neither of us is playing.
 */
export function runAI(
  state: GameState,
  rng: Rng,
  side?: PlayableFaction,
  /**
   * Act today whatever the cadence says.
   *
   * The opponent works to a rhythm — orders every fifth day, errands every
   * tenth, fleets every twelfth — and on every other day `runAI` is a no-op.
   * That is right inside a running war and wrong at the one moment a human
   * hands their side over to watch: they may have done it on day 43, and the
   * next thing scheduled to happen was seven days away. `setObserving` passes
   * this so the handover itself is a move. Nothing else does.
   */
  now = false,
): void {
  const ai = side ?? otherFaction(state.player);
  if (now || state.day % AI_BUILD_INTERVAL === 0) {
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
  if (now || state.day % AI_MISSION_INTERVAL === 0) {
    // Postings before errands, so a Lord it wants in a chair is in the chair
    // before the errand pass can send them somewhere else. Doctrine:
    // `seat-your-principals` — a plain opponent leaves its people on the quay.
    if (follows(state, 'seat-your-principals')) aiPostLords(state, ai);
    aiMission(state, ai);
  }
  if (now || state.day % AI_FLEET_INTERVAL === 0) aiFleet(state, ai, rng);
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
  // Hulls are exempt: they are bought further down against the plain margin,
  // because they are the one thing this side of the rule is saving *for*.
  const margin = savingForTheStrike(state, ai) ? AI_WARCHEST_MARGIN : AI_SURPLUS_MARGIN;
  const canCarry = (item: FacilityType | 'troop') =>
    spare - UPKEEP_PER_DAY[item] >= margin;
  // A thin surplus is spent on earners before anything that eats: islands
  // taken and won over keep adding garrisons to the bill, and the only
  // answer to that is income.
  const thin = spare < AI_SURPLUS_MARGIN * 2;

  /**
   * Which company this side drills on that island.
   *
   * `'troop'` still works and means "whatever the island raises", but the
   * opponent asking for it would leave the research ladder buying nothing:
   * four rungs on each side open companies, and a side that never names one
   * garrisons with its day-one line unit for the whole war while the player
   * fields the Hushed. So the opponent names one too.
   *
   * What it wants from a company is that it *holds*, since almost every one it
   * drills is going into a square to keep an island quiet — so the best
   * invasion defence it can pay the daily bill on wins, and the cheaper one
   * breaks a tie. That is also the rule that makes the cheap natives worth
   * something to it: a Shoal Warden holds nearly as well as a Marine for a
   * third of the keep, on the islands where Shoal-folk live.
   */
  const drillChoice = (system: System): BuildItem => {
    const raisable = raisableTroops(ai, craftGrade(state.factions[ai].craft), system)
      .filter((t) => spare - t.upkeep >= margin)
      .sort((a, b) => b.invasionDefense - a.invasionDefense || a.costGold - b.costGold);
    return (raisable[0]?.id as BuildItem) ?? 'troop';
  };

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
      const want = drillChoice(system);
      if (drill && canQueueBuild(state, drill.id, want)) {
        queueBuild(state, drill.id, want);
        return true;
      }
    }
    /*
     * And a drill ground on an island that has all the companies it needs
     * still drills, for the side rather than for the island under it.
     *
     * Companies are raised where a drill ground stands and stay there until a
     * hull carries them, so "this island is short" was the only reason to
     * drill at all — which meant the islands that *had* the drill grounds, the
     * long-held quiet ones, were exactly the islands never short of anything.
     * Idle drill grounds for the rest of the war, and no companies to land
     * with. A pool on top of what the island needs is what a landing is made
     * of, and the cap keeps it from becoming a garrison bill of its own.
     */
    const pooled = held.filter((s) => s.garrison < target(s) + AI_LANDING_POOL);
    for (const system of pooled) {
      const drill = system.facilities.find(
        (f) => f.owner === ai && f.type === 'training_facility' && !f.building,
      );
      const want = drillChoice(system);
      if (drill && canQueueBuild(state, drill.id, want)) {
        queueBuild(state, drill.id, want);
        return true;
      }
    }
  }

  // 2. Then the buildings it is missing entirely: somewhere to drill, and a
  //    slipway, without which none of its fleet rules can ever fire.
  const countOf = (type: FacilityType) =>
    held.reduce((n, s) => n + s.facilities.filter((f) => f.owner === ai && f.type === type).length, 0);
  const wanted: FacilityType[] = [];
  /**
   * Drill grounds, and why two was never enough.
   *
   * A company can only be raised where a drill ground stands, and it stays on
   * that island: two of them for the whole faction is two islands that can
   * ever put a company in the field. A side that conquers widely then cannot
   * keep conquering, because every island it takes holds the one company its
   * allegiance asks for and can spare nothing — measured, a Crown that had
   * taken fifty-six islands of sixty-three sat on seventy-seven hulls in
   * three squadrons with not one company aboard any of them, facing seven
   * Confederate islands most of which had no wall at all. The war was over
   * and could not be ended.
   *
   * One for every six islands, which keeps the early game as it was and lets
   * a big holding raise what it needs to use it.
   */
  const drills = countOf('training_facility');
  if (drills < 2 || (drills * 6 < held.length && gold > AI_RICH))
    wanted.push('training_facility');
  /**
   * Slipways, and how many is enough.
   *
   * It used to stop at three for the whole faction, which is a ceiling on the
   * navy rather than a budget: measured over twelve wars of twelve hundred
   * days, both sides finished with six or seven slipways, twenty-two islands
   * and five to thirteen thousand gold sitting in the vault doing nothing,
   * because a hull takes a month to build and there were not enough berths to
   * spend the income in. Gold that is never spent is a war that never
   * happens. One berth for every four islands, as far as the treasury will
   * carry it.
   */
  const slipways = countOf('shipyard');
  /*
   * And a floor under it, because a berth for every four islands is a navy
   * budgeted off acreage — which is the right rule for a side that wins by
   * taking ground and exactly the wrong one for a side that does not.
   *
   * Measured: both sides open with two slipways. By day three hundred the
   * Crown has **4.9 and eighteen hulls**; the Confederacy has **1.2 and four**,
   * with eighteen free berths and the gold to build on them. It was not short
   * of room or of money — it holds five islands, so `slipways * 4 < held`
   * wanted two slipways and it built none. The Confederacy's whole war is one
   * amphibious assault on the strongest fortress in the world, and this rule
   * denied it the fleet to make it with, forever, by arithmetic on land it has
   * no intention of taking.
   */
  if (slipways < 1) wanted.push('shipyard');
  else if (slipways < 2 && gold > AI_SHIP_RESERVE * 3) wanted.push('shipyard');
  else if (slipways * 4 < held.length && gold > AI_RICH * 2) wanted.push('shipyard');
  // Rich, it also fortifies: a battery on each held port that has none, so a
  // treasury with nothing to buy turns into something a raider has to reckon with.
  const walls = countOf('fort') + countOf('heavy_fort');
  if (gold > AI_RICH * 2 && walls < Math.ceil(held.length / 3)) wanted.push('fort');

  for (const rawItem of wanted) {
    // Which wall, decided by *where* rather than by what it can afford.
    //
    // Both tiers take the same one berth, so "is there room" was never the
    // question and the first version of this rule — build heavy when the
    // islands are built out — measured at zero Heavy Fortresses in twelve
    // wars, because with twenty-odd islands there is always a roomy one.
    //
    // The real question is what the berth is worth on that island, and a
    // human answers it the same way every time: the seat of your government
    // and a place with two plots left get the expensive wall, a backwater
    // gets the cheap one. So the spot is chosen first and the wall second.
    const item = rawItem === 'fort' ? wallFor(state, ai, gold) : rawItem;
    if (thin || gold < YARD_BUILDS[item].costGold || !canCarry(item)) continue;
    const spot = bestSpotFor(state, ai, item);
    if (spot) {
      raiseWorks(state, spot, item, ai);
      return true;
    }
    // Nowhere with an open plot, and it wants this thing. Timber can be felled
    // for it — that is what the rule is for — but only where there are trees to
    // spare: clearing destroys the stand for the rest of the war, and a drill
    // ground is not worth the last forest on an island.
    const boxedIn = held
      .filter((s) => freeSlots(s) < 1 && depositsLeft(s, 'forest') >= AI_KEEP_TIMBER + 1)
      .filter((s) => clearError(state, s.id, ai) === null)
      .sort((a, b) => depositsLeft(b, 'forest') - depositsLeft(a, 'forest'))[0];
    if (boxedIn) {
      clearForest(state, boxedIn.id, ai);
      return true;
    }
  }

  // 3. Otherwise grow the economy — and the ground decides, not the ledger.
  //    An earner can only go on a deposit, so the question is not "which of
  //    the four am I short of" but "where is there ground still standing".
  //
  //    This used to route through `planBuild` to find the quickest yard in
  //    the faction and ship builders to the island, because most islands the
  //    opponent took had no yard of their own and it never thought to send
  //    anybody — measured, it finished wars on eleven thousand gold with two
  //    forests an island still standing. The yard is cut, so there is nobody
  //    to send: the island raises its own.
  //
  //    Richest first, so the gold that is there goes on the best rung open.
  const earners: FacilityType[] = ['mine', 'silver_mine', 'refinery', 'coral_kiln'];
  for (const item of earners) {
    if (gold < YARD_BUILDS[item].costGold) continue;
    const want = needsResource(item)!;
    const ground = held
      .filter((s) => openDeposits(state, s, want) > 0)
      .sort((a, b) => openDeposits(state, b, want) - openDeposits(state, a, want));
    for (const island of ground) {
      if (raiseWorksError(state, island.id, item, ai) !== null) continue;
      raiseWorks(state, island.id, item, ai);
      return true;
    }
  }

  /*
   * 4. was: lay a construction yard down on the emptiest island, because an
   *    island with no yard could never build anything and every island taken
   *    after the starting ones was a garrison bill and nothing else.
   *
   *    Sean cut the yard on 20 September, so the dead end it existed to
   *    unblock is gone with it: every island of yours can raise anything the
   *    moment you hold it. There is nothing left to do here.
   */
  return false;
}

/**
 * The held island best placed to take this order, and a works on it to give it.
 *
 * "Best placed" used to mean the most empty berths, which is the right
 * question for a yard or a wall and the wrong one for an earner: a mill goes on
 * a forest, and an island with eight bare plots and no trees can never take
 * one. So a works that needs ground is ranked by how much of that ground is
 * standing, and everything else by room, as before.
 *
 * `canQueueBuild` is still the gate either way, so this can only ever pick
 * something the rules already allow.
 */
/**
 * Which wall to raise, given where the next one is going.
 *
 * `bestSpotFor` has already decided the island; this only decides what stands
 * on the plot, and it answers the way a player does. The seat of the war is
 * worth the expensive wall whatever it costs — losing it loses everything. An
 * island down to its last plot or two is worth it as well, because the berth
 * will not come again and a Fortress there is a plot spent on twenty guns
 * when it could have been spent on forty-five. Anywhere else, the cheap wall
 * is the better buy and there is room to build a second one beside it.
 *
 * Gated on a real surplus, because a Heavy Fortress is two and a half
 * Fortresses of gold and the opponent should not be fortifying a backwater
 * with money its fleet needs.
 */
function wallFor(state: GameState, ai: PlayableFaction, gold: number): FacilityType {
  if (gold < YARD_BUILDS.heavy_fort.costGold + AI_RICH) return 'fort';
  const spot = bestSpotFor(state, ai, 'fort');
  if (!spot) return 'fort';
  const island = state.systems.find((s) => s.facilities.some((f) => f.id === spot));
  if (!island) return 'fort';
  const seat = island.id === state.factions[ai].hqSystemId;
  return seat || freeSlots(island) <= 2 ? 'heavy_fort' : 'fort';
}

function bestSpotFor(
  state: GameState,
  ai: PlayableFaction,
  item: FacilityType,
): string | undefined {
  /*
   * An **island**, not a works on one. Since the construction yard was cut a
   * building is raised in place, so there is no builder to find and no
   * passage to count — the only question is which of your islands the thing
   * is worth most on, and that is the ground: open deposits for an earner,
   * open plots for anything else.
   */
  const wants = needsResource(item);
  let best: { systemId: string; worth: number } | undefined;
  for (const system of state.systems) {
    if (system.control !== ai || system.uprising) continue;
    const worth = wants ? openDeposits(state, system, wants) : freeSlots(system);
    if (worth < 1) continue;
    if (raiseWorksError(state, system.id, item, ai) !== null) continue;
    if (!best || worth > best.worth) best = { systemId: system.id, worth };
  }
  return best?.systemId;
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
 * Break off talks and go and get your own people.
 *
 * Nobody comes back on their own — a prisoner is held until somebody sails for
 * them — and the errand pass only ever looks at officers standing idle. A side
 * with its whole corps ashore somewhere therefore has no way to mount a rescue
 * at all, and the hole that leaves is not a small one: measured over six wars
 * with both sides played, the Crown had two thirds of its officers in cells by
 * day two hundred, never once tried to free any of them, and lost every war.
 * The spiral has no floor without this — fewer officers is fewer recruits is
 * no research is worse hulls is lost ground — and a rescue is the floor.
 *
 * Not every errand stops. A posting is a job and an officer at sea is
 * committed; talking, charting, courting and yard work are interruptible, and
 * they come off in that order, worst first. Freeing them is all this does: the
 * ranking below is what actually sends them, on the same scale as everything
 * else, so a rescue still has to be worth more than what is left ashore.
 */
function recallForRescue(state: GameState, ai: PlayableFaction, posted: Set<string>): void {
  const cells = state.systems.filter((s) => isRescueTarget(state, s, ai)).length;
  if (cells === 0) return;
  const free = state.characters.filter(
    (c) => c.faction === ai && c.status === 'available' && !posted.has(c.id),
  ).length;
  let want = Math.min(cells, AI_RESCUE_PARTIES) - free;
  if (want <= 0) return;
  // Worst first: charting is the cheapest thing to drop, signing somebody on
  // the dearest — a new officer is the same scarce thing the rescue is for.
  const order: MissionType[] = ['survey', 'research', 'sabotage', 'incite', 'diplomacy', 'recruit'];
  const ashore = state.characters
    .filter(
      (c) =>
        c.faction === ai &&
        c.status === 'on_mission' &&
        c.mission !== undefined &&
        c.mission.phase === 'working' &&
        order.includes(c.mission.type),
    )
    .sort((a, b) => order.indexOf(a.mission!.type) - order.indexOf(b.mission!.type));
  for (const officer of ashore) {
    if (want <= 0) return;
    endMission(state, officer.id);
    want--;
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
  recallForRescue(state, ai, posted);
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
  /**
   * Somebody of theirs standing here worth going for.
   *
   * Doctrine: `hunt-the-principals` — but never a Lord. The article is ruthless
   * because lifting an ordinary officer off a quay is a good habit rather than
   * an obvious one; taking the three Lords is the *only* way the Crown wins the
   * war. Gating both behind the same article made a plain or sharp Crown
   * literally unable to win: measured, it took none of sixteen wars and nine
   * of them ran three thousand days and stopped. A gentler opponent is one that
   * passes up cheap prizes, not one with its victory condition removed.
   */
  const liftable = (s: System) => {
    const mark = abductOn(state, s, ai);
    if (!mark) return undefined;
    return isPrincipal(mark) || follows(state, 'hunt-the-principals') ? mark : undefined;
  };
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
        (follows(state, 'research-your-own-yards') && isResearchTarget(state, s, ai)) ||
        // And the outer Reaches. An island nobody lives on is `none`, which
        // matched no clause here at all, so the whole frontier — a third of
        // the world, and the only free land in it — was invisible.
        isSurveyTarget(s, ai) ||
        // Its own ground too, when one of theirs is standing on it: an enemy
        // officer in your own harbor is the easiest prize in the game and the
        // opponent used to walk straight past it.
        liftable(s) !== undefined ||
        // And anywhere it has somebody in a cell. A prisoner is held until
        // somebody comes for them now, so this is not a nicety: an officer
        // left in the cells is an officer gone for good, and a Lord left there
        // is a third of the enemy's victory condition handed over.
        isRescueTarget(state, s, ai)),
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
  /**
   * What a quiet errand on this island is likely to cost.
   *
   * Sean's memo is a strategy as much as a mechanic — *"espionage to discover
   * defenses, sabotage to weaken them, incite uprising to destabilise, then
   * diplomacy"* — and the first thing that strategy requires is the sense to
   * see that a raid on a loyal capital with six companies in it is not a raid,
   * it is a way of losing an officer. Measured the day the watch went in, with
   * nothing here: the Confederacy went on sending people into Highwater the
   * way it always had, and *every single one of them* that was caught went
   * into irons rather than merely being hurt — forty-eight taken to the
   * Crown's thirty-four, and not one Confederate officer hurt and got away in
   * ten wars. The Crown is the side with garrisons; without this, that alone
   * won it the war.
   *
   * So covert work is priced against what the island sees. The effect is the
   * chain Sean drew, arrived at by the opponent on its own: a hard island is
   * not worth raiding, an island whose loyalty has been stirred down is, and
   * incitement is the thing that moves one into the other.
   */
  /**
   * And it prices that off what it *knows*, not off what is true.
   *
   * Doctrine: `look-before-you-land`. Until espionage existed there was no
   * difference between the two — every charted island told both sides its
   * watch, live and for nothing — and this line read it straight off the
   * world. An opponent that knows the strength of every island in the
   * archipelago to the digit, always, is not playing the same game the player
   * is, and once the player could be made to spy for that number it was the
   * only line in the file that still had it free.
   *
   * So: its own report where it has one, its own eyes where it has a hull in
   * the water or somebody ashore, and an assumption where it has neither —
   * which is what the errand below is for.
   */
  const caution = (s: System, type: MissionType | null | undefined) => {
    if (!type || !isCovert(type)) return 0;
    return knownWatch(state, s, ai) * AI_WATCH_CAUTION * scarcity;
  };

  /**
   * How thin the corps is.
   *
   * One at ease and rising as the hands run out — see `AI_CORPS_COMFORT`. It
   * is read by two things and they are the same thought twice: a side short of
   * officers is more careful about being seen, and a side whose people are
   * mostly in irons wants them back more than it wants a new prize.
   */
  const handsFree = state.characters.filter(
    (c) => c.faction === ai && c.status !== 'captured',
  ).length;
  const scarcity = Math.max(
    1,
    Math.min(AI_SCARCITY_MAX, AI_CORPS_COMFORT / Math.max(1, handsFree)),
  );

  const atTheYards = state.characters.some(
    (c) => c.faction === ai && c.mission?.type === 'research',
  );

  /**
   * What an island of its own is worth, and which errand that worth is for.
   *
   * Three things a held island can want, weighed against each other rather
   * than in a fixed order: its yards put to work on the craft, a harbor loyal
   * enough to keep a recruiting table at, and — worth most of all — order
   * restored where the island has risen. Returns the best of them with the
   * errand attached, so the scoring pass and the pass that names the errand
   * cannot disagree about which one it was.
   */
  /* Declared here rather than beside the assignment loop below, because the
     scoring closures read it: an island's worth depends on who is actually
     free to go to it, not on one arbitrary hand. */
  const free = [...idle];

  const ownGround = (
    hands: Character[],
    s: System,
  ): { type: MissionType; worth: number } | null => {
    const options: Array<{ type: MissionType; worth: number }> = [];
    // The first hand in the yards outranks everything on the chart; every
    // hand after that is worth what yard work has always been worth.
    if (isResearchTarget(state, s, ai)) {
      options.push({
        type: 'research',
        worth: AI_RESEARCH_BONUS + (atTheYards ? 0 : AI_FIRST_YARD_BONUS),
      });
    }
    // A harbor loyal enough to sign hands on at — a condition rather than a
    // person since Sean's memo, and only if the officer who would go is the
    // sort who can. The officer and the island are both in the price, so the
    // one Recruiter a side has goes to the harbor that loves it most.
    /*
     * Asked of the whole boat's worth of free hands rather than of one of
     * them, and that is not a nicety. Only a Recruiter may lead this errand;
     * the island is scored before the hand is chosen; so asking a single
     * arbitrary officer meant a side whose first idle hand was not a Recruiter
     * never scored a single harbor as a recruiting harbor. Measured with that
     * bug in: not one hand signed on across six wars, and the corps stood
     * idle 47% of the time because the islands it *had* scored kept coming
     * back as errands nobody present could actually start.
     */
    const recruiter = hands
      .filter(canRecruit)
      .sort((a, b) => b.leadership - a.leadership)[0];
    if (recruiter && canRecruitAt(state, s, ai)) {
      options.push({
        type: 'recruit',
        worth: AI_RECRUIT_BONUS * recruitChance(recruiter, s, ai),
      });
    }
    // Its own, and slipping: worth more the further it has slipped, and an
    // island in open revolt outranks any island it might merely win over.
    if (s.control === ai) {
      options.push({
        type: s.uprising ? 'command' : 'diplomacy',
        worth: s.uprising ? 110 : (HELD_SUPPORT_LEVEL - s.support[ai]) * 1.5,
      });
    }
    if (options.length === 0) return null;
    return options.reduce((best, o) => (o.worth > best.worth ? o : best));
  };
  const worth = (officer: Character, s: System) => {
    const home = state.systems.find((x) => x.id === officer.locationSystemId)?.sectorId;
    const close = s.sectorId === home ? AI_NEAR_BONUS : 0;
    // Somebody of theirs standing on a quay, and one of them is the war.
    // This is new: the opponent had no term for abduction at all, so across
    // sixteen measured games it never once tried it — while somebody was
    // liftable somewhere on 95% of days. With the Lords made personnel, that
    // was the Crown's whole route to victory going unused.
    // Our own, in their cells. Before the prize for taking one of theirs:
    // getting a Lord back is worth more than taking one, because the one in
    // the cell is already lost and the one on the quay is only at risk.
    const prisoner = captiveOn(state, s, ai);
    if (prisoner) {
      return (
        close +
        AI_RESCUE_BONUS +
        quality(prisoner) +
        (isPrincipal(prisoner) ? AI_LORD_RESCUE_BONUS : 0) -
        caution(s, 'rescue')
      );
    }
    const mark = liftable(s);
    if (mark) {
      return (
        close +
        AI_ABDUCT_BONUS +
        quality(mark) +
        (isPrincipal(mark) ? AI_LORD_BOUNTY * closingOn(state, ai) : 0) -
        caution(s, 'abduct')
      );
    }
    // Somewhere nobody has been. Worth more the tighter the ledger: a side
    // with money to spare would rather court an island than chart one, and a
    // side feeling its upkeep should be out looking for ground.
    if (isSurveyTarget(s, ai)) {
      // Doctrine: `expand-when-the-bill-grows`. Without it the frontier is
      // worth the same whether the ledger is comfortable or drowning.
      const hunger = follows(state, 'expand-when-the-bill-grows')
        ? Math.max(0, AI_COMFORTABLE - surplus(state, ai)) * AI_SURVEY_HUNGER
        : 0;
      // And how much of the world it still cannot see, which is a reason to
      // look that has nothing to do with the purse. See `AI_SURVEY_DARK`.
      const dark =
        state.systems.filter((x) => !x.explored[ai]).length / Math.max(1, state.systems.length);
      return close + AI_SURVEY_BONUS + hunger + dark * AI_SURVEY_DARK;
    }
    // Its own ground, which since 17 September offers up to three different
    // things at once and must be priced as the best of them rather than as
    // whichever the list happened to check first. Signing on is the new one
    // and it is exactly the kind that would have broken this: a loyal harbor
    // is a recruiting harbor, most of a side's own islands are loyal, and a
    // branch returning early on it sent the whole corps home and left the
    // chart unspied and the yards unworked — measured, zero espionage errands
    // in three full wars.
    const own = ownGround(free, s);
    if (own) return close + own.worth;
    /*
     * An unaligned island: a whole island for a fortnight ashore.
     *
     * Two halves, because there are two questions now and they are not the
     * same one. How likely is this fortnight to land at all — which is the
     * envoy against what the island already thinks, and the reason the right
     * officer should go to the hard island rather than the near one — and how
     * near the island is to simply declaring, which is what the fortnight is
     * being spent to reach. Under the old term there was only allegiance, so
     * a poor talker and a great one were sent to the same places.
     */
    if (s.control === 'neutral') {
      return (
        close +
        AI_COURT_BONUS * parleyStanding(s, ai, [officer]).chance +
        joinChance(s, ai) * AI_JOIN_WEIGHT
      );
    }
    // The weaker their hold, the nearer the uprising threshold, the better.
    /*
     * And incitement is *not* discounted for what the island sees, which is
     * the one exception and the point of the whole chain. Stirring an island
     * down is how its watch is lowered — the people are a third of what sees
     * you — so pricing it off the watch would have the opponent refuse to
     * soften the one island it most needs softened. Measured with the
     * discount on it: the Crown stopped working Freeport at all and three
     * wars in twenty-four ran to the cap with the Lords untouched.
     */
    return close + AI_INCITE_BONUS * inciteStanding(state, s, ai, [officer]).chance - INCITE_PRIORITY_PENALTY;
  };

  /**
   * Islands it already has somebody working, so it does not send two officers
   * to do the same job — a person included. Letting two go after the same
   * mark sounds like what a manhunt is and measured worse across forty wars:
   * Crown 14 — Confederacy 19 became Crown 7 — Confederacy 23, because the
   * second boat mostly finds the quay empty and the officer on it was the one
   * that should have been somewhere else.
   */
  const taken = new Set(
    state.characters
      .filter((c) => c.faction === ai && c.mission)
      .map((c) => c.mission!.targetSystemId),
  );

  /**
   * How many it already has out after people, and how many more it will send.
   * Rescue is not counted: getting your own back is not a hunt, and a side
   * that has just lost three officers should be allowed to want all three.
   */
  let hunters =
    AI_HUNTERS -
    state.characters.filter((c) => c.faction === ai && c.mission?.type === 'abduct').length;

  /**
   * Doctrine: `hunt-the-principals`, the other half of it.
   *
   * An errand takes its kind from the island unless the order names one, and
   * an island with one of theirs standing on it answers "abduct" before it
   * answers anything else. So withholding the article from the scoring above
   * only stopped the opponent *seeking* marks — measured, it still lifted
   * seven people a war by turning up somewhere else and finding somebody
   * there. An opponent that does not know to hunt people asks the island for
   * its next-best errand instead, and passes over an island that has nothing
   * else to offer.
   *
   * Undefined means "let the island decide", which is what it always did.
   */
  const errandAt = (officer: Character, s: System): MissionType | null | undefined => {
    /**
     * Doctrine: `look-before-you-land`. Somewhere held against it that it
     * cannot see and is about to do something quiet on: look first.
     *
     * This is the whole of Sean's chain — *"espionage to discover defenses,
     * then sabotage, then incite uprising, then diplomacy"* — arrived at by
     * the opponent rather than written into it. It spends a fortnight and an
     * officer to turn a guess into a number, and the pass after this one
     * prices the raid off the number. An island it has already looked at is
     * skipped, so this costs one trip per island and not one a month.
     */
    if (
      follows(state, 'look-before-you-land') &&
      sightOf(state, s, ai) === 'none' &&
      isEspionageTarget(s, ai) &&
      isCovert(missionTypeFor(state, s, ai) ?? 'diplomacy')
    ) {
      return 'espionage';
    }
    if (liftable(s)) return undefined;
    /*
     * Ground of its own, where more than one thing is on offer and neither is
     * a default any more.
     *
     * Signing on stopped being the island's automatic answer on 17 September —
     * it is a standing condition of every loyal harbor now rather than a
     * stranger on a quay, so `missionTypeFor` would make "recruit" the answer
     * to most of a side's own islands and quietly pre-empt the yards. The
     * scoring pass already decided which of the three this island was picked
     * *for*; this says so out loud rather than asking the island again and
     * getting a different answer.
     */
    const own = ownGround([officer, ...free], s);
    if (own && (own.type === 'recruit' || own.type === 'research')) return own.type;
    // Nothing the island answers on its own. Command is on offer on any
    // ground of ours and is never a default — a posting spends an officer for
    // good — so a wholly loyal island with no yard and nobody ashore has
    // something a player may choose and nothing the opponent should be handed.
    if (missionTypeFor(state, s, ai) === null) return null;
    if (missionTypeFor(state, s, ai) !== 'abduct') return undefined;
    return (
      missionsOffered(state, s, ai, officer).find(
        (t) => t !== 'abduct' && t !== 'command',
      ) ?? null
    );
  };

  /**
   * The best island first, and then the right officer for what it needs.
   *
   * This used to go the other way round — the best diplomat picked first and
   * took whatever was worth most — which meant the officer least suited to a
   * raid was the one sent on it. An abduction is set against espionage, so
   * the Crown's diplomat walked into the Confederate anchorage after a Lord
   * with a rating of forty-six and both the snatch and the getting out again
   * priced off it. Measured over twelve wars, a quarter of the Crown's
   * officer-days were spent in irons and another fourteenth injured, against
   * eight and three per cent of the Confederacy's, and its route to winning
   * the war is the raid.
   *
   * So the island is chosen first and the hand second, on the rating the
   * errand is actually settled by: talking on Diplomacy, everything covert on
   * Espionage, a posting on Leadership. Proximity breaks a tie, so the pass
   * still prefers somebody who is already near.
   */
  const settledBy = (type: MissionType): keyof Pick<
    Character,
    'diplomacy' | 'espionage' | 'leadership'
  > => {
    // Signing on moved to Leadership on 17 September — *"the primary attribute
    // governing recruitment is Leadership"* — and it had been picking the best
    // talker for it, who is very often not the officer allowed to go at all.
    if (type === 'command' || type === 'recruit') return 'leadership';
    if (type === 'diplomacy' || type === 'incite') return 'diplomacy';
    return 'espionage';
  };
  // Islands are worth what they are worth to whoever ends up going; the only
  // officer-dependent term is the nearness bonus, so rank once on the first
  // hand and let the tie-break below do the rest.
  const ranked = [...open]
    .filter((s) => !taken.has(s.id))
    .sort((a, b) => worth(free[0], b) - worth(free[0], a));
  let started = 0;
  for (const target of ranked) {
    if (started >= AI_MISSION_PARTIES || free.length === 0) break;
    const able = free.filter((o) => canStartMission(state, o.id, target.id));
    if (able.length === 0) continue;
    // What the island would have this errand be, asked of the hand most
    // likely to be sent — every officer gets the same answer bar the party
    // filter inside `missionsOffered`, and that one only drops `command`.
    const kind = errandAt(able[0], target);
    // Nothing it is willing to do here; try the next island down.
    if (kind === null) continue;
    // Already enough of them out after people. The island's own answer is
    // an abduction while somebody of theirs is standing on it, so this is
    // where the detail is held to its size — try the next island down
    // rather than sending a fourth officer after the same three Lords.
    const type = kind ?? missionTypeFor(state, target, ai)!;
    const hunt = type === 'abduct';
    if (hunt && hunters <= 0) continue;
    const rating = settledBy(type);
    const near = (o: Character) =>
      state.systems.find((x) => x.id === o.locationSystemId)?.sectorId === target.sectorId ? 1 : 0;
    // Some errands only certain people may lead. Filtering here rather than
    // trusting the ranking is what stops the pass naming an errand and then
    // handing it to somebody the rules will refuse — which spends the island
    // and the tick and starts nothing.
    const fit = type === 'recruit' ? able.filter(canRecruit) : able;
    if (fit.length === 0) continue;
    const officer = fit.sort(
      (a, b) => b[rating] - a[rating] || near(b) - near(a),
    )[0];
    taken.add(target.id);
    startMission(state, officer.id, target.id, kind);
    free.splice(free.indexOf(officer), 1);
    started++;
    if (hunt) hunters--;
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
    // The walls before the boats. A squadron lying off a fortified island
    // with the harbor to itself opens fire and keeps firing; there is nothing
    // else it can usefully do there, and sailing away wastes every day of it
    // because the walls are patched while nobody is working them.
    if (aiBeginSiege(state, fleet, ai, rng)) continue;
    if (aiLandTroops(state, fleet, ai, rng)) continue;
    if (aiSettle(state, fleet, ai, rng)) continue;
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
  // What its shipwrights can actually draw, not what the side has names for.
  // This list is sorted by cost and the dearest affordable hull is picked, so
  // handing it the whole roster had it ordering a Majestic on day one, being
  // refused by `buildError` every time, and never putting a hull in the water
  // again — two seeds that had always finished stopped finishing at all.
  const grade = gradeOf(state, ai);
  const classes = shipsAt(ai, grade);
  const afloat = fleetsOf(state, ai).flatMap((f) => f.ships);
  /*
   * Lift, since 21 September, is a number on every hull rather than a kind of
   * hull. The canonical roster gives troop capacity to a survey ship, a ship
   * of the line and a smuggler's brigantine alike, and only one hull in the
   * whole fleet — the Confederacy's Swift — is a Noncombat at all. So this
   * counts berths instead of counting transports, which is what it was
   * always really asking, and it stopped being able to ask the old way the
   * day the Crown had no transport class to find.
   */
  const bestLifter = [...classes].sort((a, b) => shipSpec(b.id).carries - shipSpec(a.id).carries)[0];
  const berths = afloat.reduce((n, s) => n + shipSpec(s.classId).carries, 0);
  const capital = getSystem(state, state.factions.empire.hqSystemId);
  const carryAll = fleetsOf(state, ai).reduce((n, f) => n + fleetCapacity(f), 0);
  // Two clear of what the capital holds, so a landing is possible at all after
  // the losses on the way in.
  const shortOfLift = ai === 'alliance' && carryAll < capital.garrison + 3;
  /**
   * Weight of shot before berths.
   *
   * The lift test chases the capital's garrison, and the Crown grows that
   * garrison all war — so the Confederacy could sit permanently "short of
   * lift" and build nothing but transports for three thousand days. Measured:
   * forty-one islands of sixty-three, a hundred and sixty-five thousand gold,
   * eleven hulls, and a bombard total of **zero**, because every one of them
   * was a brig. It could not have opened a seawall if it had tried.
   *
   * Berths are no use without something to put them ashore behind, so this
   * comes first: while it cannot break the walls of the one island it has to
   * take, what it builds is a ship of the line.
   */
  const noSiegeTrain =
    follows(state, 'weight-before-berths') &&
    ai === 'alliance' &&
    fortsOf(capital).length > 0 &&
    Math.max(0, ...fleetsOf(state, ai).map(fleetBombard)) < siegeWeightFor(capital);
  // Roughly one berth for every hull afloat, which is the same ratio the old
  // "two fighting hulls to every transport" worked out at when a transport
  // carried three companies and nothing else carried any.
  const wantTransport =
    !noSiegeTrain && bestLifter !== undefined && (berths < afloat.length + 1 || shortOfLift);
  // Fighting hulls as big as it can afford; a transport when it is short of one.
  const spare = surplus(state, ai);
  const carried = (id: ShipClassId) => spare - UPKEEP_PER_DAY[id] >= AI_SURPLUS_MARGIN;
  // Doctrine: `balanced-fleet`. Frigates take sloops, sloops take ships of the
  // line, ships of the line take frigates, so a fleet of one kind has a hole in
  // it the other side can aim at — and it fills a kind it has none of before it
  // buys another of what it already has. Deliberately only that: forcing the
  // three kinds to equal numbers caps its ships of the line at a third of the
  // fleet, and measured that cost it a fifth of its weight of shot against
  // Highwater's walls and three hundred days on the war. A plain opponent skips
  // the test and buys the heaviest thing it can pay for.
  const roleOf = (id: ShipClassId) => classes.find((c) => c.id === id)?.role;
  const missing = (c: (typeof classes)[number]) =>
    follows(state, 'balanced-fleet') && !afloat.some((s) => roleOf(s.classId) === c.role)
      ? 1000
      : 0;
  /*
   * Guns on the water per day of yard time, rather than the dearest hull it
   * can pay for.
   *
   * "Dearest affordable" was a mild preference while the whole fleet cost
   * between 45 and 150 gold and took between eight and twenty-two days. The
   * canonical roster turned it into a trap: a Majestic is 522 gold and a
   * hundred days against an Interceptor's 28 and four, so a side following
   * the old rule spends an entire war laying down three capitals while the
   * other fields thirty sloops — and under the per-cannon rules thirty hulls
   * firing is a great deal more shot than three.
   *
   * Measured before this change, twenty-four wars with both sides played: the
   * Crown ended on seventeen hulls to the Confederacy's thirty-two and lost
   * every single war. The Confederacy was not out-designed, it was
   * out-built, and the reason was on the Crown's own side of the keyboard.
   *
   * Weight of shot per build-day is the plainest statement of what a navy
   * wants from a slipway. It still buys big — a Morningstar is fifty guns in
   * fifteen days and beats an Interceptor's ten in four — it simply stops
   * buying the thing that will not be in the water until the war is decided.
   */
  const perDay = (id: ShipClassId) => {
    const spec = shipSpec(id);
    const cls = shipClass(id);
    // Shot that actually gets through, not shot fired. Counting guns alone
    // sent the Crown to the slipway for Interceptors — ten light guns in four
    // days looks like the best deal in the fleet and is the worst buy it has,
    // because a light gun does almost nothing to anything plated. Measured at
    // equal gold against the whole Confederate roster: the Interceptor I wins
    // 15% of the time and the Vanguard 96%.
    //
    // So each gun is worth what the engine says it is worth against a hull
    // worth shooting at, which is `expectedDamage` — the same function the
    // targeting uses, asked about a reference target rather than a real one.
    const REFERENCE = { size: 'Large', speed: 'Normal', armor: 18 } as const;
    const worth =
      (cls.longGuns ?? 0) * expectedDamage('Long', REFERENCE) +
      (cls.heavyGuns ?? 0) * expectedDamage('Heavy', REFERENCE) +
      (cls.lightGuns ?? 0) * expectedDamage('Light', REFERENCE);
    return worth / Math.max(1, spec.days);
  };
  const affordable = classes
    .filter((c) => shipSpec(c.id).guns > 0)
    .filter((c) => carried(c.id))
    .filter((c) => shipSpec(c.id).costGold + AI_SHIP_RESERVE <= state.factions[ai].gold)
    .sort((a, b) => missing(b) + perDay(b.id) - (missing(a) + perDay(a.id)));
  const pick = wantTransport
    ? bestLifter
    : (affordable[0] ?? classes.find((c) => c.role === 'small') ?? classes[0]);
  if (!pick || !carried(pick.id)) return;

  // One hull, or — with gold to burn — one at every slipway standing idle.
  let laid = 0;
  for (const system of state.systems) {
    if (system.control !== ai || system.uprising) continue;
    for (const facility of system.facilities) {
      if (facility.type !== 'shipyard' || facility.owner !== ai || facility.building) continue;
      if (!buildMenu(facility, grade).includes(pick.id)) continue;
      if (!canQueueBuild(state, facility.id, pick.id)) continue;
      if (laid > 0 && state.factions[ai].gold < AI_RICH + shipSpec(pick.id).costGold) return;
      if (laid > 0 && surplus(state, ai) - UPKEEP_PER_DAY[pick.id] < AI_SURPLUS_MARGIN) return;
      queueBuild(state, facility.id, pick.id);
      laid += 1;
    }
  }
}

/**
 * How close this side is to having the whole set, as a multiplier.
 *
 * One when it holds none of them, three when it holds two of three: the last
 * name on the list is the war, and the opponent should price it that way.
 */
function closingOn(state: GameState, ai: PlayableFaction): number {
  const theirs = state.characters.filter(
    (c) => c.faction === otherFaction(ai) && isPrincipal(c),
  );
  if (theirs.length === 0) return 1;
  const held = theirs.filter((c) => c.status === 'captured').length;
  return 1 + held * AI_CLOSING_BOUNTY * (theirs.length / Math.max(1, theirs.length - held));
}

/**
 * Free ground, and going to get it.
 *
 * An island nobody lives on is taken by putting one company on the beach —
 * there is nothing there to fight — and it comes with four to ten plots to
 * build on. That is the cheapest capital in the game and the opponent had no
 * idea it existed: the frontier is a third of the world and every island in it
 * ended every war exactly as it began.
 *
 * Scored against what the island offers and what the ledger needs. A side with
 * money to spare expands because land is land; a side feeling its upkeep
 * expands because it has to, and will cross half the world to do it.
 */
function aiSettle(state: GameState, fleet: Fleet, ai: PlayableFaction, rng: Rng): boolean {
  const here = getSystem(state, fleet.systemId);
  // What it would be carrying by the time it got there. Companies come aboard
  // by themselves when a squadron sails from ground of ours, so asking whether
  // it has one *now* is asking the wrong question — a squadron sitting at home
  // with an empty hold is exactly the one that should be going.
  const willCarry =
    fleet.troops +
    (here.control === ai
      ? Math.min(fleetCapacity(fleet) - fleet.troops, sparedCompanies(here, state))
      : 0);
  if (willCarry < 1) return false;
  // Standing on it already: put somebody ashore and it is ours.
  if (!here.populated && here.control === 'none' && here.explored[ai] && fleet.troops >= 1) {
    if (assaultError(state, fleet.id, ai) === null) {
      assault(state, fleet.id, rng, ai);
      return true;
    }
  }
  const hunger = Math.max(0, AI_COMFORTABLE - surplus(state, ai));
  const worth = (s: System) => s.slots * AI_PLOT_WORTH + hunger * AI_PLOT_WORTH
    - travelDays(state, fleet.systemId, s.id) * 2;
  const prize = state.systems
    .filter((s) => !s.populated && s.control === 'none' && s.explored[ai] && s.id !== fleet.systemId)
    .filter((s) => sailError(state, fleet.id, s.id, ai) === null)
    .sort((a, b) => worth(b) - worth(a))[0];
  if (!prize || worth(prize) <= 0) return false;
  sailFleet(state, fleet.id, prize.id, ai);
  return true;
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

/**
 * Open fire, where that is the thing to do.
 *
 * Returns true when the squadron has just spent an action on the walls and
 * should be left where it is rather than sent elsewhere this tick.
 *
 * It used to set a standing order and return early for ever after, because a
 * siege was a race against the wall being patched at two per cent a day and
 * the one thing a squadron must not do was wander off and come back. There is
 * no race now and no standing order: a bombardment is one action with a die in
 * it, and the only question is whether this fleet can do anything with one.
 */
function aiBeginSiege(state: GameState, fleet: Fleet, ai: PlayableFaction, rng: Rng): boolean {
  if (bombardError(state, fleet.id, ai) !== null) return false;
  const here = getSystem(state, fleet.systemId);
  // Only against walls. Shelling a town to break its companies is a thing a
  // player may decide is worth the Reach turning against them; the opponent
  // does not do it, because it cannot weigh that and would only ever wreck its
  // own standing everywhere it went.
  if (fortsOf(here).length === 0) return false;
  /*
   * And only where it can actually break something.
   *
   * The top of the die *is* the fleet's bombardment score, so a squadron under
   * the island's total plus the cheapest thing on it has no chance at all
   * rather than poor odds — and a fleet that opens fire under that number is
   * not fighting a slow siege, it is spending its magazine on nothing. Which
   * is exactly what the Crown was measured doing to Freeport on 21 September:
   * shelling it every single day from day 214, its upkeep bleeding it white
   * and its own Reach turning against it over the civilian penalty, and the
   * walls no nearer down at the end of it than at the start.
   */
  if (bombardOdds(state, fleet).hopeless) return false;
  bombardNow(state, fleet, rng);
  return true;
}

/**
 * The weight of shot it takes to be worth opening fire at all.
 *
 * It used to be "enough to be through the walls inside `AI_SIEGE_DAYS`, on top
 * of what they patch every night", which was the right question to ask of a
 * daily grind and is meaningless against a die. The number now is the one the
 * rules put in front of the player: the island's whole defence plus the
 * cheapest wall standing on it, because that is the roll it takes to break
 * anything at all.
 */
function siegeWeightFor(system: System): number {
  const defenders = islandDefenders(system);
  const walls = defenders.filter((d) => d.kind === 'wall');
  if (walls.length === 0) return 0;
  return islandDefense(defenders) + Math.min(...walls.map((d) => d.cost));
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

  /**
   * Nothing aboard: go where there are companies before going where they are
   * wanted.
   *
   * A squadron loads what the island it is lying at can spare and then sails
   * at the enemy whether or not it loaded anything, which works while a side
   * is small and fails the moment it is large: a Crown holding fifty-five
   * islands keeps a company on every one of them to stay quiet and can spare
   * nothing anywhere, so measured, it finished wars with forty-two hulls in
   * six squadrons, a hundred and seven companies ashore, and not one company
   * at sea — cruising past eight Confederate islands, five of them without a
   * wall, unable to land on any of them. The war was over and could not be
   * ended.
   *
   * The Confederacy already staged its one strike this way, gathering at the
   * island with the most to spare. This is the same habit for everybody:
   * ones and twos from a dozen quiet islands are a landing party, and the
   * only thing stopping them being one was that nobody went to collect them.
   */
  if (fleet.troops === 0 && fleetCapacity(fleet) > 0) {
    const muster = state.systems
      .filter((s) => s.control === ai && s.id !== fleet.systemId)
      .map((s) => ({ s, spare: sparedCompanies(s, state) }))
      .filter((x) => x.spare > 0)
      .sort(
        (a, b) =>
          b.spare - a.spare ||
          travelDays(state, fleet.systemId, a.s.id) - travelDays(state, fleet.systemId, b.s.id),
      )[0];
    if (muster && sailError(state, fleet.id, muster.s.id, ai) === null) {
      sailFleet(state, fleet.id, muster.s.id, ai);
      return;
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
 * carries more than the capital's garrison, and then sails
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

  const need = capital.garrison + 1;
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
  const wall = crownGuns * 1.25;
  const outgunned = fleetGuns(fleet) < wall;
  const needLift = fleetCapacity(fleet) < need;
  // And the third shortage, which is the one that used to send a lone
  // first-rate to die under Highwater's batteries: weight of shot for the
  // walls. Guns and berths are no use against stone.
  const needWeight = fleetBombard(fleet) < siegeWeightFor(capital);
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
      ((outgunned && fleetGuns(other) > 0) ||
        (needLift && fleetCapacity(other) > 0) ||
        (needWeight && fleetBombard(other) > 0)) &&
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
    // The walls first. The strike fleet is the one squadron this loop skips —
    // `aiFleet` hands it to this function whole — so the siege has to be
    // opened here or nowhere. It was nowhere: measured, a fourteen-hull
    // squadron with fifty-six weight of shot and thirty-eight companies sat
    // off Highwater for two thousand days while one seawall stood, because
    // the only thing it knew how to do was land and landing was shut.
    if (aiBeginSiege(state, fleet, 'alliance', rng)) return fleet.id;
    if (
      fleet.troops > capital.garrison &&
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
