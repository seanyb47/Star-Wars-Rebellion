import { UPKEEP_PER_DAY } from './constants';
import { islandIncome } from './economy';
import type { GameState, PlayableFaction, System } from './types';

/**
 * What a Reach amounts to at a glance: what it earns you, who its islands
 * lean toward, and how much of your strength is sitting in it.
 *
 * This is the summary the Reach panel shows above its list of islands, and
 * the per-island counts behind that list's three icons.
 */
export interface IslandSummary {
  systemId: string;
  /** Your characters standing on it, plus any of yours sailing to it. */
  missions: number;
  /** Companies ashore, whoever holds the island. */
  military: number;
  /** Buildings standing on it. */
  facilities: number;
  /** Buildings of yours part-way through an order. */
  building: number;
}

export interface ReachSummary {
  sectorId: string;
  islands: number;
  settled: number;
  held: number;
  enemyHeld: number;
  unaligned: number;
  /** Gold your holdings here earn in a day, at the allegiance they have now. */
  goldPerDay: number;
  /** Gold your holdings here cost to keep for a day. */
  upkeepPerDay: number;
  /** Mean allegiance across the settled islands of the Reach. */
  allegiance: { empire: number; alliance: number };
  /** Your companies ashore across the Reach. */
  garrison: number;
  mutinies: number;
  perIsland: IslandSummary[];
}

/** Characters of yours on, or on their way to, this island. */
function missionCount(state: GameState, system: System, faction: PlayableFaction): number {
  return state.characters.filter(
    (c) =>
      c.faction === faction &&
      (c.locationSystemId === system.id || c.mission?.targetSystemId === system.id),
  ).length;
}

export function summariseReach(
  state: GameState,
  sectorId: string,
  faction: PlayableFaction,
): ReachSummary {
  const enemy = faction === 'empire' ? 'alliance' : 'empire';
  const systems = state.systems.filter((s) => s.sectorId === sectorId);
  const settled = systems.filter((s) => s.populated);

  let goldPerDay = 0;
  let upkeepPerDay = 0;
  let garrison = 0;

  for (const system of systems) {
    goldPerDay += islandIncome(system, faction);
    if (system.control !== faction) continue;
    garrison += system.garrison;
    for (const facility of system.facilities) {
      if (facility.owner === faction) upkeepPerDay += UPKEEP_PER_DAY[facility.type];
    }
    upkeepPerDay += system.garrison * UPKEEP_PER_DAY.troop;
  }

  const mean = (of: PlayableFaction) =>
    settled.length === 0
      ? 0
      : settled.reduce((total, s) => total + s.support[of], 0) / settled.length;

  return {
    sectorId,
    islands: systems.length,
    settled: settled.length,
    held: systems.filter((s) => s.control === faction).length,
    enemyHeld: systems.filter((s) => s.control === enemy).length,
    unaligned: systems.filter((s) => s.control === 'neutral').length,
    goldPerDay,
    upkeepPerDay,
    allegiance: { empire: mean('empire'), alliance: mean('alliance') },
    garrison,
    mutinies: systems.filter((s) => s.uprising).length,
    perIsland: systems.map((system) => ({
      systemId: system.id,
      missions: missionCount(state, system, faction),
      military: system.garrison,
      facilities: system.facilities.length,
      building: system.facilities.filter((f) => f.owner === faction && f.building).length,
    })),
  };
}

/** The Seas, in the order their Reaches appear on the chart. */
export function seasOf(state: GameState): string[] {
  const seen: string[] = [];
  for (const sector of state.sectors) {
    if (!seen.includes(sector.sea)) seen.push(sector.sea);
  }
  return seen;
}

export function reachesOfSea(state: GameState, sea: string) {
  return state.sectors.filter((s) => s.sea === sea);
}

export interface SeaSummary {
  sea: string;
  reaches: number;
  islands: number;
  settled: number;
  held: number;
  enemyHeld: number;
  unaligned: number;
  goldPerDay: number;
  upkeepPerDay: number;
  garrison: number;
  mutinies: number;
  allegiance: { empire: number; alliance: number };
  /** One entry per Reach, in chart order. */
  perReach: ReachSummary[];
}

/**
 * A whole Sea, by adding up its Reaches. Allegiance is re-averaged over the
 * Sea's settled islands rather than averaged over Reach averages, which would
 * quietly overweight a Reach that happens to have fewer settled islands.
 */
export function summariseSea(
  state: GameState,
  sea: string,
  faction: PlayableFaction,
): SeaSummary {
  const perReach = reachesOfSea(state, sea).map((sector) =>
    summariseReach(state, sector.id, faction),
  );
  const settledIslands = state.systems.filter(
    (s) => s.populated && perReach.some((r) => r.sectorId === s.sectorId),
  );
  const mean = (of: PlayableFaction) =>
    settledIslands.length === 0
      ? 0
      : settledIslands.reduce((total, s) => total + s.support[of], 0) / settledIslands.length;
  const sum = (pick: (r: ReachSummary) => number) =>
    perReach.reduce((total, r) => total + pick(r), 0);

  return {
    sea,
    reaches: perReach.length,
    islands: sum((r) => r.islands),
    settled: sum((r) => r.settled),
    held: sum((r) => r.held),
    enemyHeld: sum((r) => r.enemyHeld),
    unaligned: sum((r) => r.unaligned),
    goldPerDay: sum((r) => r.goldPerDay),
    upkeepPerDay: sum((r) => r.upkeepPerDay),
    garrison: sum((r) => r.garrison),
    mutinies: sum((r) => r.mutinies),
    allegiance: { empire: mean('empire'), alliance: mean('alliance') },
    perReach,
  };
}
