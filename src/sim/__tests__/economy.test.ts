import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import {
  collectIncome,
  islandIncome,
  payUpkeep,
  recomputeLedger,
  totalIncome,
  totalUpkeep,
} from '../economy';
import { GOLD_PER_DAY, UPKEEP_PER_DAY } from '../constants';
import { createRng } from '../rng';
import type { GameState, PlayableFaction, System } from '../types';

/** Strip the map down to one held island so a test can reason about it. */
function isolate(state: GameState, faction: PlayableFaction): System {
  const held = state.systems.filter((s) => s.control === faction);
  const keep = held[0];
  for (const system of state.systems) {
    if (system === keep) continue;
    system.control = 'neutral';
    system.facilities = [];
    system.garrison = 0;
  }
  keep.garrison = 0;
  return keep;
}

describe('what buildings do', () => {
  it('splits into things that earn and things that cost', () => {
    expect(GOLD_PER_DAY.mine).toBeGreaterThan(0);
    expect(GOLD_PER_DAY.refinery).toBeGreaterThan(0);
    expect(UPKEEP_PER_DAY.mine).toBe(0);
    expect(UPKEEP_PER_DAY.refinery).toBe(0);

    for (const type of ['construction_yard', 'training_facility', 'shipyard'] as const) {
      expect(GOLD_PER_DAY[type]).toBe(0);
      expect(UPKEEP_PER_DAY[type]).toBeGreaterThan(0);
    }
    expect(UPKEEP_PER_DAY.troop).toBeGreaterThan(0);
  });
});

describe('income', () => {
  it('pays each earner its rate, scaled by allegiance', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [
      { id: 'f1', type: 'mine', owner: 'empire' },
      { id: 'f2', type: 'refinery', owner: 'empire' },
    ];
    island.support.empire = 100;
    expect(islandIncome(island, 'empire')).toBeCloseTo(GOLD_PER_DAY.mine + GOLD_PER_DAY.refinery);

    island.support.empire = 0; // 0.5x
    expect(islandIncome(island, 'empire')).toBeCloseTo(
      (GOLD_PER_DAY.mine + GOLD_PER_DAY.refinery) * 0.5,
    );
  });

  it('pays nothing from an island in mutiny', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [{ id: 'f1', type: 'mine', owner: 'empire' }];
    island.uprising = true;
    expect(islandIncome(island, 'empire')).toBe(0);
  });

  it('pays nothing for a works, a drill ground or a slipway', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [
      { id: 'f1', type: 'construction_yard', owner: 'empire' },
      { id: 'f2', type: 'training_facility', owner: 'empire' },
      { id: 'f3', type: 'shipyard', owner: 'empire' },
    ];
    expect(islandIncome(island, 'empire')).toBe(0);
  });

  it('adds the day’s takings to the treasury', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [{ id: 'f1', type: 'mine', owner: 'empire' }];
    island.support.empire = 100;
    state.factions.empire.gold = 0;
    collectIncome(state, createRng(1));
    expect(state.factions.empire.gold).toBeCloseTo(GOLD_PER_DAY.mine);
  });

  it('lets smugglers run a disloyal island’s takings to the enemy', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [{ id: 'f1', type: 'mine', owner: 'empire' }];
    island.support.empire = 0; // a 25% chance every day
    state.factions.alliance.gold = 0;

    let smuggled = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const before = state.factions.alliance.gold;
      collectIncome(state, createRng(seed));
      if (state.factions.alliance.gold > before) smuggled++;
    }
    expect(smuggled).toBeGreaterThan(20);
    expect(smuggled).toBeLessThan(80);
  });

  it('never smuggles from a loyal island', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [{ id: 'f1', type: 'mine', owner: 'empire' }];
    island.support.empire = 50;
    state.factions.alliance.gold = 0;
    for (let seed = 1; seed <= 100; seed++) collectIncome(state, createRng(seed));
    expect(state.factions.alliance.gold).toBe(0);
  });
});

describe('upkeep', () => {
  it('charges for buildings that do not earn, and for companies', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [
      { id: 'f1', type: 'mine', owner: 'empire' },
      { id: 'f2', type: 'construction_yard', owner: 'empire' },
      { id: 'f3', type: 'shipyard', owner: 'empire' },
    ];
    island.garrison = 3;
    expect(totalUpkeep(state, 'empire')).toBe(
      UPKEEP_PER_DAY.construction_yard + UPKEEP_PER_DAY.shipyard + 3 * UPKEEP_PER_DAY.troop,
    );
  });

  it('takes the day’s upkeep out of the treasury', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [{ id: 'f1', type: 'construction_yard', owner: 'empire' }];
    state.factions.empire.gold = 100;
    payUpkeep(state, createRng(1));
    expect(state.factions.empire.gold).toBe(100 - UPKEEP_PER_DAY.construction_yard);
  });

  it('reports income and upkeep for the top bar without moving money', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [
      { id: 'f1', type: 'mine', owner: 'empire' },
      { id: 'f2', type: 'construction_yard', owner: 'empire' },
    ];
    island.support.empire = 100;
    state.factions.empire.gold = 500;
    recomputeLedger(state);
    expect(state.factions.empire.gold).toBe(500);
    expect(state.factions.empire.income).toBeCloseTo(GOLD_PER_DAY.mine);
    expect(state.factions.empire.upkeep).toBe(UPKEEP_PER_DAY.construction_yard);
  });
});

describe('going broke', () => {
  it('breaks things down gradually rather than all at once', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.energySlots = 12;
    island.facilities = Array.from({ length: 6 }, (_, i) => ({
      id: `f${i}`,
      type: 'construction_yard' as const,
      owner: 'empire' as const,
    }));
    state.factions.empire.gold = 0; // nothing coming in, nothing saved

    payUpkeep(state, createRng(7));
    // At most one thing goes in a day, never the whole lot.
    expect(island.facilities.length).toBeGreaterThanOrEqual(5);
  });

  it('walks the ledger back to equilibrium and then stops', () => {
    const state = generateGalaxy(102);
    const island = isolate(state, 'empire');
    island.rawSlots = 12;
    island.energySlots = 12;
    island.support.empire = 100;
    island.facilities = [
      { id: 'm1', type: 'mine', owner: 'empire' },
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `y${i}`,
        type: 'construction_yard' as const,
        owner: 'empire' as const,
      })),
    ];
    state.factions.empire.gold = 0;

    const rng = createRng(3);
    for (let day = 0; day < 400; day++) {
      collectIncome(state, rng);
      payUpkeep(state, rng);
    }

    // The mine earns; yards are shed until what is left can be paid for.
    expect(totalUpkeep(state, 'empire')).toBeLessThanOrEqual(
      Math.ceil(totalIncome(state, 'empire')),
    );
    expect(island.facilities.some((f) => f.type === 'mine')).toBe(true);
  });

  it('leaves a solvent faction entirely alone', () => {
    const state = generateGalaxy(103);
    const island = isolate(state, 'empire');
    island.facilities = [
      { id: 'f1', type: 'mine', owner: 'empire' },
      { id: 'f2', type: 'construction_yard', owner: 'empire' },
    ];
    island.garrison = 2;
    state.factions.empire.gold = 10000;
    const rng = createRng(5);
    for (let day = 0; day < 200; day++) payUpkeep(state, rng);
    expect(island.facilities).toHaveLength(2);
    expect(island.garrison).toBe(2);
  });

  it('can disband a company as readily as a building', () => {
    const state = generateGalaxy(104);
    const island = isolate(state, 'empire');
    island.facilities = [];
    island.garrison = 5;
    state.factions.empire.gold = 0;
    const rng = createRng(9);
    for (let day = 0; day < 200; day++) payUpkeep(state, rng);
    expect(island.garrison).toBe(0);
  });
});
