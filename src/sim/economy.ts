import { FACILITY_LABEL, GOLD_PER_DAY, UPKEEP_PER_DAY } from './constants';
import { otherFaction, pushEvent, supportMultiplier } from './helpers';
import type { Rng } from './rng';
import type { GameState, PlayableFaction, System } from './types';

/** An island contributes to the economy only while it is held and quiet. */
export function isProductive(system: System, faction: PlayableFaction): boolean {
  return system.control === faction && !system.uprising;
}

/** What a single island earns you in a day, before smugglers take their cut. */
export function islandIncome(system: System, faction: PlayableFaction): number {
  if (!isProductive(system, faction)) return 0;
  const rate = system.facilities
    .filter((f) => f.owner === faction)
    .reduce((total, f) => total + GOLD_PER_DAY[f.type], 0);
  // A grudging population works slowly, and skims on the way.
  return rate * supportMultiplier(system.support[faction]);
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
  return upkeep;
}

export function totalIncome(state: GameState, faction: PlayableFaction): number {
  return state.systems.reduce((total, system) => total + islandIncome(system, faction), 0);
}

/**
 * A day's earnings. Everything a faction owns that earns, earns; on an island
 * whose allegiance is thin, smugglers may run the day's takings to the enemy
 * instead (spec 4.2.6).
 */
export function collectIncome(state: GameState, rng: Rng): void {
  for (const faction of ['empire', 'alliance'] as const) {
    const enemy = otherFaction(faction);
    for (const system of state.systems) {
      const earned = islandIncome(system, faction);
      if (earned <= 0) continue;

      const allegiance = system.support[faction];
      const smuggleChance = allegiance < 50 ? (50 - allegiance) / 200 : 0;
      if (smuggleChance > 0 && rng.chance(smuggleChance)) {
        state.factions[enemy].gold += earned;
        pushEvent(state, {
          kind: 'loss',
      text: `Smugglers run a day's takings off ${system.name} and sell them to the enemy.`,
          systemId: system.id,
        });
      } else {
        state.factions[faction].gold += earned;
      }
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
