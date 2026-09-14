import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import {
  collectIncome,
  islandIncome,
  islandTrade,
  smuggledShare,
  payUpkeep,
  recomputeLedger,
  totalIncome,
  totalUpkeep,
} from '../economy';
import { GOLD_PER_DAY, UPKEEP_PER_DAY } from '../constants';
import { createRng } from '../rng';
import type { GameState, PlayableFaction, System } from '../types';

/** Strip the map down to one held island so a test can reason about it.
 *  The starting fleets go too: their upkeep is real, and these tests are about
 *  what an island costs, not what a navy costs. */
function isolate(state: GameState, faction: PlayableFaction): System {
  state.fleets.length = 0;
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
    const rate = GOLD_PER_DAY.mine + GOLD_PER_DAY.refinery;

    // Firm: the island works at full pace and nothing leaves by the back door.
    island.support.empire = 100;
    expect(islandIncome(island, 'empire')).toBeCloseTo(rate);

    // Thin: half pace for a grudging crew, and a quarter of what is left
    // goes to the other side.
    island.support.empire = 0;
    expect(islandIncome(island, 'empire')).toBeCloseTo(rate * 0.5 * 0.75);
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

  it('runs a share of a disloyal island’s trade to the enemy, by band', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [{ id: 'f1', type: 'mine', owner: 'empire' }];

    // Every band, top to bottom: what the holder keeps and what crosses over
    // always add up to the island's whole trade.
    for (const [support, share] of [
      [95, 0],
      [70, 0.15],
      [30, 0.25],
    ] as const) {
      island.support.empire = support;
      const trade = islandTrade(island, 'empire');
      expect(smuggledShare(island, 'empire')).toBe(share);
      state.factions.empire.gold = 0;
      state.factions.alliance.gold = 0;
      collectIncome(state, createRng(1));
      expect(state.factions.alliance.gold, `support ${support}`).toBeCloseTo(trade * share);
      expect(state.factions.empire.gold, `support ${support}`).toBeCloseTo(trade * (1 - share));
    }
  });

  it('takes half of an island in revolt, and gives its holder nothing at all', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [{ id: 'f1', type: 'mine', owner: 'empire' }];
    island.support.empire = 40;
    island.uprising = true;
    const trade = islandTrade(island, 'empire');
    expect(trade).toBeGreaterThan(0);
    state.factions.empire.gold = 0;
    state.factions.alliance.gold = 0;
    collectIncome(state, createRng(1));
    expect(state.factions.empire.gold).toBe(0);
    expect(state.factions.alliance.gold).toBeCloseTo(trade * 0.5);
  });

  it('never smuggles from a firm island, and a blockade stops even that', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [{ id: 'f1', type: 'mine', owner: 'empire' }];
    island.support.empire = 90;
    state.factions.alliance.gold = 0;
    for (let seed = 1; seed <= 100; seed++) collectIncome(state, createRng(seed));
    expect(state.factions.alliance.gold).toBe(0);

    // Shut the harbour on a thin island: nothing leaves it either way.
    island.support.empire = 20;
    island.blockaded = true;
    state.factions.empire.gold = 0;
    collectIncome(state, createRng(1));
    expect(state.factions.empire.gold).toBe(0);
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
