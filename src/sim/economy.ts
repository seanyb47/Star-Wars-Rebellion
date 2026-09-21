import {
  FACILITY_LABEL,
  FORTNIGHT,
  GARRISON_SMUGGLING_CUT,
  GOLD_PER_DAY,
  SCRAP_RETURN,
  SMUGGLED_SHARE,
  TROOP_BUILD,
  UPKEEP_PER_DAY,
  WORKS_ON,
  YARD_BUILDS,
  loyaltyBand,
  shipSpec,
} from './constants';
import { garrisonRoster, landingTroop } from './troops';
import { craftGrade } from './missions';
import { clearWrecks, fleetCapacity, isAtSea } from './fleets';
import { getSystem, inProse, otherFaction, pushEvent, returnDeposit, supportMultiplier } from './helpers';
import type { Rng } from './rng';
import type { BuildItem, GameState, PlayableFaction, System } from './types';

/**
 * An island contributes only while it is held, quiet, and open. A blockade
 * does not take the island from you — it simply stops anything leaving the
 * harbor, so the island still costs you its upkeep and pays you nothing.
 */
export function isProductive(system: System, faction: PlayableFaction): boolean {
  return system.control === faction && !system.uprising && !system.blockaded;
}

/**
 * Everything an island's works put on the quay in a day, before anybody
 * decides where it goes.
 *
 * Held and open: a blockade stops the trade dead, but a revolt does not — the
 * works keep working, the harbor keeps loading, and none of it reaches you.
 */
export function islandTrade(system: System, faction: PlayableFaction): number {
  if (system.control !== faction || system.blockaded) return 0;
  const rate = system.facilities
    .filter((f) => f.owner === faction)
    .reduce((total, f) => total + GOLD_PER_DAY[f.type], 0);
  // A grudging population works slowly.
  return rate * supportMultiplier(system.support[faction]);
}

/**
 * The share of this island's trade that goes out the back to the enemy.
 *
 * Allegiance sets the rate and companies ashore work it down: every one of
 * them takes a tenth off what the smugglers were running, so ten close the
 * harbor's back door however little the island thinks of you.
 */
export function smuggledShare(system: System, faction: PlayableFaction): number {
  if (system.control !== faction) return 0;
  const rate = SMUGGLED_SHARE[loyaltyBand(system.support[faction], system.uprising)];
  const watched = Math.max(0, 1 - GARRISON_SMUGGLING_CUT * system.garrison);
  return rate * watched;
}

/** What the smugglers actually hand the other side, in gold a day. */
export function smuggledOff(system: System, faction: PlayableFaction): number {
  return islandTrade(system, faction) * smuggledShare(system, faction);
}

/** What a single island earns you in a day, after the smugglers take theirs. */
export function islandIncome(system: System, faction: PlayableFaction): number {
  if (!isProductive(system, faction)) return 0;
  return islandTrade(system, faction) - smuggledOff(system, faction);
}

/** What everything a faction owns costs to keep standing for a day. */
export function totalUpkeep(state: GameState, faction: PlayableFaction): number {
  let upkeep = 0;
  for (const system of state.systems) {
    if (system.control !== faction) continue;
    for (const facility of system.facilities) {
      // The walls the world opened with are the city's, not the Crown's.
      if (facility.owner === faction && !facility.ancient) {
        upkeep += UPKEEP_PER_DAY[facility.type];
      }
    }
    // Per company, by who they are. It was a flat gold a day for every troop
    // in the game, which priced a Shoal Warden and a Drowned Guard the same
    // and made the garrison ladder — the whole reason a mass-producible troop
    // exists — cost identical money whichever unit held the island.
    upkeep += garrisonRoster(system).reduce((n, t) => n + t.upkeep, 0);
  }
  // A hull costs the same whether it is fighting or lying at anchor, and the
  // companies aboard it eat wherever they are.
  for (const fleet of state.fleets) {
    if (fleet.faction !== faction) continue;
    for (const ship of fleet.ships) upkeep += UPKEEP_PER_DAY[ship.classId];
    // Companies aboard are the side's landing troop, which is who a landing
    // actually puts on a beach.
    upkeep += fleet.troops * landingTroop(fleet.faction, craftGrade(state.factions[fleet.faction].craft)).upkeep;
  }
  return upkeep;
}

/**
 * What a faction banks in a day: its own islands after smuggling, plus what
 * the enemy's smugglers bring it. The second half is why the figure in the
 * banner can stay healthy while a Reach of yours goes sour — somebody else's
 * sour Reach is paying you.
 */
export function totalIncome(state: GameState, faction: PlayableFaction): number {
  const enemy = otherFaction(faction);
  return state.systems.reduce(
    (total, system) => total + islandIncome(system, faction) + smuggledOff(system, enemy),
    0,
  );
}


/** Refresh the display figures without moving any money. */
export function recomputeLedger(state: GameState): void {
  for (const faction of ['empire', 'alliance'] as const) {
    state.factions[faction].income = totalIncome(state, faction);
    state.factions[faction].upkeep = totalUpkeep(state, faction);
  }
}


/* ------------------------------------------------------------- the ledger */

/**
 * Half of what a thing cost to build.
 *
 * Earners are free to raise, so they are free to pull down: half of nothing is
 * nothing, and the reason to scrap a mill was never the coin — it is the plot
 * it is standing on.
 */
export function scrapValue(item: BuildItem): number {
  if (item === 'troop') return Math.floor(TROOP_BUILD.costGold * SCRAP_RETURN);
  const yard = YARD_BUILDS[item as keyof typeof YARD_BUILDS];
  if (yard) return Math.floor(yard.costGold * SCRAP_RETURN);
  return Math.floor(shipSpec(item as never).costGold * SCRAP_RETURN);
}

/**
 * One thing a side owns that costs it something to keep, and can be sold.
 *
 * By id, never by object or index.
 *
 * The first cut of this carried a facility's array index, which is fine until
 * something is scrapped: the splice shifts every later index down and the next
 * entry in a shuffled list points at the wrong building — or off the end. A
 * shortfall scraps several things in a row, so that is not a corner case, it
 * is the normal path. Ids also mean the UI can name a target without reaching
 * into the state it is drawing.
 */
export type ScrapTarget =
  | { kind: 'facility'; systemId: string; facilityId: string }
  | { kind: 'troop'; systemId: string }
  | { kind: 'ship'; fleetId: string; shipId: string };

function everythingOnTheBooks(state: GameState, faction: PlayableFaction): ScrapTarget[] {
  const out: ScrapTarget[] = [];
  for (const system of state.systems) {
    if (system.control !== faction) continue;
    for (const facility of system.facilities) {
      // Nothing that is not on the books can be sold off it. A city's own
      // ancient walls are not the Crown's to scrap, and an earner costs
      // nothing to keep, so scrapping one raises nothing and saves nothing.
      if (facility.owner !== faction || facility.ancient) continue;
      if (UPKEEP_PER_DAY[facility.type] <= 0) continue;
      out.push({ kind: 'facility', systemId: system.id, facilityId: facility.id });
    }
    for (let i = 0; i < system.garrison; i += 1) out.push({ kind: 'troop', systemId: system.id });
  }
  for (const fleet of state.fleets) {
    if (fleet.faction !== faction) continue;
    for (const ship of fleet.ships) out.push({ kind: 'ship', fleetId: fleet.id, shipId: ship.id });
  }
  return out;
}

/** What a thing is called in a sentence — read before it is broken up. */
export function scrapLabel(state: GameState, what: ScrapTarget): string {
  if (what.kind === 'troop') {
    const system = state.systems.find((s) => s.id === what.systemId);
    return `a ${TROOP_BUILD.label.toLowerCase()} on ${system?.name ?? 'an island'}`;
  }
  if (what.kind === 'facility') {
    const system = state.systems.find((s) => s.id === what.systemId);
    const facility = system?.facilities.find((f) => f.id === what.facilityId);
    const name = facility ? FACILITY_LABEL[facility.type].toLowerCase() : 'works';
    return `the ${name} on ${system?.name ?? 'an island'}`;
  }
  const fleet = state.fleets.find((f) => f.id === what.fleetId);
  const ship = fleet?.ships.find((sh) => sh.id === what.shipId);
  return ship ? `the ${shipSpec(ship.classId).label}` : 'a hull';
}

/** What breaking this up would put in the treasury. */
export function scrapReturn(state: GameState, what: ScrapTarget): number {
  if (what.kind === 'troop') return scrapValue('troop');
  if (what.kind === 'facility') {
    const system = state.systems.find((s) => s.id === what.systemId);
    const facility = system?.facilities.find((f) => f.id === what.facilityId);
    return facility ? scrapValue(facility.type) : 0;
  }
  const fleet = state.fleets.find((f) => f.id === what.fleetId);
  const ship = fleet?.ships.find((sh) => sh.id === what.shipId);
  return ship ? scrapValue(ship.classId) : 0;
}

/**
 * Why the player may not break this particular thing up.
 *
 * A player gate, and only a player gate: `scrap` itself asks none of this,
 * because the fortnightly shortfall has to be able to reach anything on the
 * books — a squadron at sea very much included. The difference is the same one
 * the game draws everywhere else: what you may order, and what happens to you.
 */
export function scrapError(
  state: GameState,
  faction: PlayableFaction,
  what: ScrapTarget,
): string | null {
  if (what.kind === 'ship') {
    const fleet = state.fleets.find((f) => f.id === what.fleetId);
    if (!fleet || !fleet.ships.some((sh) => sh.id === what.shipId)) return 'No such ship.';
    if (fleet.faction !== faction) return 'Not yours to break up.';
    // A ship is broken up on a slip, not in open water, and certainly not
    // while somebody is firing at it.
    if (isAtSea(fleet)) return 'She is at sea. Bring her in first.';
    if (state.battle) return 'Not in the middle of an action.';
    const where = state.systems.find((s) => s.id === fleet.systemId);
    if (!where || where.control !== faction) return 'Not in a harbor of yours.';
    return null;
  }

  const system = state.systems.find((s) => s.id === what.systemId);
  if (!system) return 'No such island.';
  if (system.control !== faction) return 'You do not hold this island.';
  if (system.uprising) return 'The island is in mutiny.';

  if (what.kind === 'troop') {
    if (system.garrison <= 0) return 'There is nobody ashore to disband.';
    return null;
  }

  const facility = system.facilities.find((f) => f.id === what.facilityId);
  if (!facility) return 'Nothing of the kind stands here.';
  if (facility.owner !== faction) return 'Not yours to break up.';
  if (facility.ancient) return 'Older than the Imperium, and not yours to pull down.';
  // An order half-run is cancelled, not scrapped: cancelling is the thing the
  // player means and it is already there.
  if (facility.founding) return 'It is still being laid down. Cancel the order instead.';
  if (facility.building) return 'Something is being built here. Cancel that first.';
  return null;
}

/**
 * Destroy one thing of your own and take half its price back.
 *
 * Sean's mechanic of 20 September, and it has two uses rather than one. The
 * obvious one is the coin. The other is the berth: *"a great way to clear old
 * things to make room for new things, or clear out facilities that you don't
 * need anymore to build more facilities."*
 *
 * Returns the gold recovered, or null if the thing was not there to scrap.
 */
export function scrap(state: GameState, faction: PlayableFaction, what: ScrapTarget): number | null {
  if (what.kind === 'troop') {
    const system = state.systems.find((s) => s.id === what.systemId);
    if (!system || system.garrison <= 0) return null;
    system.garrison -= 1;
    const back = scrapValue('troop');
    state.factions[faction].gold += back;
    return back;
  }
  if (what.kind === 'facility') {
    const system = state.systems.find((s) => s.id === what.systemId);
    const at = system?.facilities.findIndex((f) => f.id === what.facilityId) ?? -1;
    const facility = !system || at < 0 ? undefined : system.facilities[at];
    if (!system || !facility || facility.owner !== faction) return null;
    system.facilities.splice(at, 1);
    // The yard comes down; the ground under it is still ground. Same rule as
    // a works falling apart unpaid — a long war must not grind the world down
    // to land that can never earn again.
    const ground = WORKS_ON[facility.type];
    if (ground) returnDeposit(state, system, ground);
    const back = scrapValue(facility.type);
    state.factions[faction].gold += back;
    return back;
  }
  const fleet = state.fleets.find((f) => f.id === what.fleetId);
  const at = fleet?.ships.findIndex((s) => s.id === what.shipId) ?? -1;
  if (!fleet || at < 0) return null;
  const [hull] = fleet.ships.splice(at, 1);
  const back = scrapValue(hull.classId);
  state.factions[faction].gold += back;

  /*
   * A hull taken off the books takes its berths with it, and the first cut of
   * this forgot that: the audit caught four troops riding in one berth, crew
   * serving with a squadron that had no ships, and empty squadrons still
   * sailing somewhere. Breaking a ship up is not sinking it, so the people in
   * it get the one thing a sinking never offers them — a quay to step onto.
   */
  const berths = fleetCapacity(fleet);
  if (fleet.troops > berths && !isAtSea(fleet)) {
    const system = getSystem(state, fleet.systemId);
    if (system.control === faction) {
      const ashore = fleet.troops - berths;
      fleet.troops = berths;
      system.garrison += ashore;
      pushEvent(state, {
        kind: 'order',
        text: `${ashore} ${ashore === 1 ? 'troop marches' : 'troops march'} off ${fleet.name} onto ${inProse(system.name)}.`,
        systemId: system.id,
      });
    }
  }
  // Whatever had no quay to step onto is the sinking's problem after all, and
  // the same sweep lands the crew and takes an emptied squadron off the board.
  clearWrecks(state);
  return back;
}

/**
 * The fortnightly settlement, and what happens when it cannot be met.
 *
 * Fourteen days of income in, fourteen days of upkeep out, once. Between
 * settlements nothing moves and the banner's figures do not change, which is
 * the point of doing it this way at all.
 *
 * A **shortfall** is the settlement you cannot pay. Sean: *"the game randomly
 * selects units and basically blows them up to get you the gold back to pay
 * the cost that you couldn't have... So you can either actively do it or the
 * game's going to do it for you."* So the treasury goes to nothing and the
 * side is sold down until the bill is covered or there is nothing left on the
 * books — which is the same auto-rebalancing the old daily version did one
 * broken works at a time, except that now it pays for itself and the player
 * could have done it first.
 */
export function settleLedger(state: GameState, rng: Rng): void {
  if (state.day % FORTNIGHT !== 0) return;
  for (const faction of ['empire', 'alliance'] as const) {
    const fs = state.factions[faction];
    fs.income = totalIncome(state, faction);
    fs.upkeep = totalUpkeep(state, faction);
    const net = (fs.income - fs.upkeep) * FORTNIGHT;
    if (net >= 0) {
      fs.gold += net;
      continue;
    }
    const owed = -net;
    if (fs.gold >= owed) {
      fs.gold -= owed;
      continue;
    }

    let short = owed - fs.gold;
    fs.gold = 0;
    const sold: string[] = [];
    // Randomly, because the player who did not choose does not get to choose.
    for (const what of rng.shuffle(everythingOnTheBooks(state, faction))) {
      if (short <= 0) break;
      // Named before the sale, not after it: by then the building is already
      // off the island and there is nothing left to read the name from.
      const named = scrapLabel(state, what);
      const got = scrap(state, faction, what);
      if (got === null) continue;
      sold.push(named);
      // What the sale raised goes straight back out again against the bill.
      short -= got;
      fs.gold = Math.max(0, fs.gold - got);
    }
    fs.upkeep = totalUpkeep(state, faction);
    if (sold.length > 0) {
      pushEvent(state, {
        kind: 'loss',
        text:
          `The books would not balance. ${sold.length} thing${sold.length === 1 ? ' was' : 's were'} ` +
          `broken up to pay the fortnight's bill.`,
      });
    }
  }
}
