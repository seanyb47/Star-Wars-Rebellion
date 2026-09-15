import {
  FACILITY_LABEL,
  GARRISON_SMUGGLING_CUT,
  GOLD_PER_DAY,
  SMUGGLED_SHARE,
  UPKEEP_PER_DAY,
  loyaltyBand,
} from './constants';
import { otherFaction, pushEvent, supportMultiplier } from './helpers';
import type { Rng } from './rng';
import type { GameState, PlayableFaction, System } from './types';

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
      if (facility.owner === faction) upkeep += UPKEEP_PER_DAY[facility.type];
    }
    upkeep += system.garrison * UPKEEP_PER_DAY.troop;
  }
  // A hull costs the same whether it is fighting or lying at anchor, and the
  // companies aboard it eat wherever they are.
  for (const fleet of state.fleets) {
    if (fleet.faction !== faction) continue;
    for (const ship of fleet.ships) upkeep += UPKEEP_PER_DAY[ship.classId];
    upkeep += fleet.troops * UPKEEP_PER_DAY.troop;
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

/**
 * A day's earnings, and a day's losses.
 *
 * Every island works; where its takings end up is the question. The holder
 * banks what is left after the smugglers, and the smugglers' share crosses
 * the water to the other side the same day. No event is pushed for it: it
 * happens on most islands most days, and a feed that said so would say
 * nothing else. The island's own panel carries the number, and the banner
 * carries the total.
 */
export function collectIncome(state: GameState, _rng: Rng): void {
  for (const faction of ['empire', 'alliance'] as const) {
    const enemy = otherFaction(faction);
    for (const system of state.systems) {
      const kept = islandIncome(system, faction);
      if (kept > 0) state.factions[faction].gold += kept;
      const lost = smuggledOff(system, faction);
      if (lost > 0) state.factions[enemy].gold += lost;
    }
  }
}

/**
 * Pay the day's upkeep, and deal with not being able to.
 *
 * A shortfall does not wipe you out at once: each day you cannot pay in full,
 * something you own may break down for want of maintenance, chosen at random.
 * The bigger the gap, the likelier it happens, so the ledger walks itself back
 * to equilibrium over days rather than falling off a cliff.
 */
export function payUpkeep(state: GameState, rng: Rng): void {
  for (const faction of ['empire', 'alliance'] as const) {
    const fs = state.factions[faction];
    fs.income = totalIncome(state, faction);
    fs.upkeep = totalUpkeep(state, faction);

    if (fs.upkeep <= 0) continue;

    if (fs.gold >= fs.upkeep) {
      fs.gold -= fs.upkeep;
      continue;
    }

    const shortfall = fs.upkeep - fs.gold;
    fs.gold = 0;
    if (rng.chance(Math.min(1, shortfall / fs.upkeep))) {
      breakSomethingDown(state, faction, rng);
      fs.upkeep = totalUpkeep(state, faction);
    }
  }
}

/** Everything a faction owns that costs upkeep, as breakdown candidates. */
function chargeableThings(state: GameState, faction: PlayableFaction) {
  const candidates: Array<{ system: System; facilityIndex?: number }> = [];
  for (const system of state.systems) {
    if (system.control !== faction) continue;
    system.facilities.forEach((facility, index) => {
      if (facility.owner !== faction) return;
      if (UPKEEP_PER_DAY[facility.type] <= 0) return;
      candidates.push({ system, facilityIndex: index });
    });
    for (let i = 0; i < system.garrison; i++) candidates.push({ system });
  }
  return candidates;
}

function breakSomethingDown(state: GameState, faction: PlayableFaction, rng: Rng): void {
  const candidates = chargeableThings(state, faction);
  if (candidates.length === 0) return;

  const picked = rng.pick(candidates);
  if (picked.facilityIndex === undefined) {
    picked.system.garrison = Math.max(0, picked.system.garrison - 1);
    pushEvent(state, {
      kind: 'loss',
      text: `Unpaid and unfed, a company on ${picked.system.name} has melted away.`,
      systemId: picked.system.id,
    });
    return;
  }

  const [broken] = picked.system.facilities.splice(picked.facilityIndex, 1);
  pushEvent(state, {
    kind: 'loss',
      text: `For want of maintenance, the ${FACILITY_LABEL[broken.type].toLowerCase()} on ${picked.system.name} has fallen apart.`,
    systemId: picked.system.id,
  });
}

/** Refresh the display figures without moving any money. */
export function recomputeLedger(state: GameState): void {
  for (const faction of ['empire', 'alliance'] as const) {
    state.factions[faction].income = totalIncome(state, faction);
    state.factions[faction].upkeep = totalUpkeep(state, faction);
  }
}
