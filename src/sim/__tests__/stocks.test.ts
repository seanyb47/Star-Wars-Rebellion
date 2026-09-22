import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { hullsBuildingFor, queueBuild, advanceBuilds } from '../build';
import { shipsFor } from '../constants';
import type { GameState, System } from '../types';

/** A Crown island with a slipway and the gold to use it. */
function stage(seed: number): { state: GameState; island: System; yard: string } {
  const state = generateGalaxy(seed, 'empire');
  const island = state.systems.find((s) => s.control === 'empire' && !s.uprising)!;
  island.facilities = island.facilities.filter((f) => f.type !== 'shipyard');
  island.facilities.push({ id: 'slip-1', type: 'shipyard', owner: 'empire' });
  island.slots = Math.max(island.slots, island.facilities.length + 4);
  state.factions.empire.gold = 9000;
  return { state, island, yard: 'slip-1' };
}

describe('a hull on the stocks is visible in the harbor she will come to', () => {
  it('shows nothing before anything is laid down', () => {
    const { state, island } = stage(1000);
    expect(hullsBuildingFor(state, island.id, 'empire')).toEqual([]);
  });

  it('names the class and counts the days to delivery', () => {
    const { state, island, yard } = stage(1001);
    const hull = shipsFor('empire')[0].id;
    queueBuild(state, yard, hull);
    const [onStocks] = hullsBuildingFor(state, island.id, 'empire');
    expect(onStocks.classId).toBe(hull);
    expect(onStocks.days).toBeGreaterThan(0);
    // Built here, so no passage and no "from somewhere else" to report.
    expect(onStocks.madeOn.id).toBe(island.id);
  });

  /**
   * The rule that makes this a harbor question rather than a building one: a
   * hull belongs in the harbor she is *bound for*, with her crossing counted,
   * not the one she is being built in.
   */
  it('puts her in the harbor she is bound for, not the one building her', () => {
    const { state, island, yard } = stage(1002);
    const target = state.systems.find((s) => s.control === 'empire' && s.id !== island.id)!;
    const hull = shipsFor('empire')[0].id;
    queueBuild(state, yard, hull, target.id);
    expect(hullsBuildingFor(state, island.id, 'empire')).toEqual([]);
    const [onStocks] = hullsBuildingFor(state, target.id, 'empire');
    expect(onStocks.classId).toBe(hull);
    expect(onStocks.madeOn.id).toBe(island.id);
  });

  it('is only ever your own — a harbor does not report their stocks', () => {
    const { state, island, yard } = stage(1003);
    queueBuild(state, yard, shipsFor('empire')[0].id);
    expect(hullsBuildingFor(state, island.id, 'empire').length).toBe(1);
    expect(hullsBuildingFor(state, island.id, 'alliance')).toEqual([]);
  });

  it('leaves the list the day she comes to anchor', () => {
    const { state, island, yard } = stage(1004);
    queueBuild(state, yard, shipsFor('empire')[0].id);
    const before = state.fleets.filter((f) => f.faction === 'empire').reduce((n, f) => n + f.ships.length, 0);
    for (let d = 0; d < 900 && hullsBuildingFor(state, island.id, 'empire').length > 0; d++) {
      advanceBuilds(state);
    }
    expect(hullsBuildingFor(state, island.id, 'empire')).toEqual([]);
    const after = state.fleets.filter((f) => f.faction === 'empire').reduce((n, f) => n + f.ships.length, 0);
    // She left the list because she arrived, not because the order vanished.
    expect(after).toBe(before + 1);
  });

  it('a works that is not a slipway never appears — a fort is not a ship', () => {
    const { state, island } = stage(1005);
    island.facilities.push({ id: 'drill-1', type: 'training_facility', owner: 'empire' });
    queueBuild(state, 'drill-1', 'troop');
    expect(hullsBuildingFor(state, island.id, 'empire')).toEqual([]);
  });
});
