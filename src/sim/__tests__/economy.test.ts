import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { recomputeMaintenance, runMaintenance, runProduction } from '../economy';
import { getSystem } from '../helpers';
import { createRng } from '../rng';
import type { GameState, PlayableFaction, System } from '../types';

/** Strip the galaxy down to a single controlled world for a focused test. */
function isolate(state: GameState, faction: PlayableFaction): System {
  const held = state.systems.filter((s) => s.control === faction);
  const keep = held[0];
  for (const system of held.slice(1)) {
    system.control = 'neutral';
    system.facilities = [];
    system.garrison = 0;
  }
  const enemy = faction === 'empire' ? 'alliance' : 'empire';
  for (const system of state.systems.filter((s) => s.control === enemy)) {
    system.control = 'neutral';
    system.facilities = [];
    system.garrison = 0;
  }
  return keep;
}

describe('production', () => {
  it('produces 1 raw per mine scaled by support', () => {
    const state = generateGalaxy(101);
    const system = isolate(state, 'empire');
    system.facilities = [{ id: 'fac-t1', type: 'mine', owner: 'empire' }];
    system.support.empire = 100;
    state.factions.empire.raw = 0;
    runProduction(state, createRng(1));
    // One mine at full loyalty, and no refineries left to consume the ore.
    expect(state.factions.empire.raw).toBeCloseTo(1);
  });

  it('halves output on a world that barely tolerates you', () => {
    const state = generateGalaxy(101);
    const system = isolate(state, 'empire');
    system.facilities = [{ id: 'fac-t1', type: 'mine', owner: 'empire' }];
    system.support.empire = 100;
    state.factions.empire.raw = 0;
    runProduction(state, createRng(1));
    const atFull = state.factions.empire.raw;

    system.support.empire = 0;
    state.factions.empire.raw = 0;
    // Support 0 always smuggles at 25%; seed 4 is a roll that stays home.
    runProduction(state, createRng(4));
    expect(state.factions.empire.raw).toBeCloseTo(atFull * 0.5, 5);
  });

  it('produces nothing while the system is in revolt', () => {
    const state = generateGalaxy(101);
    const system = isolate(state, 'empire');
    system.facilities = [{ id: 'fac-t1', type: 'mine', owner: 'empire' }];
    system.support.empire = 100;
    system.uprising = true;
    state.factions.empire.raw = 0;
    runProduction(state, createRng(1));
    expect(state.factions.empire.raw).toBe(0);
  });

  it('converts up to one raw per refinery into refined', () => {
    const state = generateGalaxy(101);
    const system = isolate(state, 'empire');
    system.facilities = [
      { id: 'fac-t1', type: 'refinery', owner: 'empire' },
      { id: 'fac-t2', type: 'refinery', owner: 'empire' },
    ];
    state.factions.empire.raw = 10;
    state.factions.empire.refined = 0;
    runProduction(state, createRng(1));
    expect(state.factions.empire.raw).toBeCloseTo(8);
    expect(state.factions.empire.refined).toBeCloseTo(2);
  });

  it('cannot refine more than the stockpile holds', () => {
    const state = generateGalaxy(101);
    const system = isolate(state, 'empire');
    system.facilities = [
      { id: 'fac-t1', type: 'refinery', owner: 'empire' },
      { id: 'fac-t2', type: 'refinery', owner: 'empire' },
    ];
    state.factions.empire.raw = 1;
    state.factions.empire.refined = 0;
    runProduction(state, createRng(1));
    expect(state.factions.empire.raw).toBeCloseTo(0);
    expect(state.factions.empire.refined).toBeCloseTo(1);
  });

  it('smuggles a disloyal world’s output to the enemy', () => {
    const state = generateGalaxy(101);
    const system = isolate(state, 'empire');
    system.facilities = [{ id: 'fac-t1', type: 'mine', owner: 'empire' }];
    system.support.empire = 0; // 25% smuggling chance every day
    state.factions.empire.raw = 0;
    state.factions.alliance.raw = 0;

    let smuggledDays = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const before = state.factions.alliance.raw;
      runProduction(state, createRng(seed));
      if (state.factions.alliance.raw > before) smuggledDays++;
    }
    // Around 25% of 200 days; the exact count is seed-determined but bounded.
    expect(smuggledDays).toBeGreaterThan(20);
    expect(smuggledDays).toBeLessThan(80);
  });

  it('never smuggles when support is 50 or better', () => {
    const state = generateGalaxy(101);
    const system = isolate(state, 'empire');
    system.facilities = [{ id: 'fac-t1', type: 'mine', owner: 'empire' }];
    system.support.empire = 50;
    state.factions.alliance.raw = 0;
    for (let seed = 1; seed <= 100; seed++) runProduction(state, createRng(seed));
    expect(state.factions.alliance.raw).toBe(0);
  });
});

describe('maintenance', () => {
  it('grants 50 capacity per matched mine/refinery pair', () => {
    const state = generateGalaxy(101);
    const system = isolate(state, 'empire');
    system.facilities = [
      { id: 'fac-t1', type: 'mine', owner: 'empire' },
      { id: 'fac-t2', type: 'mine', owner: 'empire' },
      { id: 'fac-t3', type: 'mine', owner: 'empire' },
      { id: 'fac-t4', type: 'refinery', owner: 'empire' },
    ];
    system.garrison = 0;
    recomputeMaintenance(state);
    expect(state.factions.empire.maintenanceCapacity).toBe(50);
  });

  it('charges upkeep for facilities and troops but not mines or refineries', () => {
    const state = generateGalaxy(101);
    const system = isolate(state, 'empire');
    system.facilities = [
      { id: 'fac-t1', type: 'mine', owner: 'empire' },
      { id: 'fac-t2', type: 'refinery', owner: 'empire' },
      { id: 'fac-t3', type: 'construction_yard', owner: 'empire' },
      { id: 'fac-t4', type: 'shipyard', owner: 'empire' },
    ];
    system.garrison = 2;
    recomputeMaintenance(state);
    expect(state.factions.empire.maintenanceUsed).toBe(20 + 30 + 16);
  });

  it('scraps the newest facility after five straight days over capacity', () => {
    const state = generateGalaxy(101);
    const system = isolate(state, 'empire');
    system.energySlots = 10;
    system.facilities = [
      { id: 'fac-1', type: 'construction_yard', owner: 'empire' },
      { id: 'fac-9', type: 'shipyard', owner: 'empire' },
    ];
    system.garrison = 0;
    // No mines or refineries, so capacity is 0 and upkeep is 50.
    for (let day = 0; day < 4; day++) {
      runMaintenance(state);
      expect(system.facilities).toHaveLength(2);
    }
    runMaintenance(state);
    expect(system.facilities.map((f) => f.id)).toEqual(['fac-1']);
    expect(state.factions.empire.overCapacityDays).toBe(0);
  });

  it('resets the over-capacity counter once upkeep fits again', () => {
    const state = generateGalaxy(101);
    const system = isolate(state, 'empire');
    system.facilities = [{ id: 'fac-1', type: 'construction_yard', owner: 'empire' }];
    system.garrison = 0;
    runMaintenance(state);
    runMaintenance(state);
    expect(state.factions.empire.overCapacityDays).toBe(2);

    system.facilities.push(
      { id: 'fac-2', type: 'mine', owner: 'empire' },
      { id: 'fac-3', type: 'refinery', owner: 'empire' },
    );
    runMaintenance(state);
    expect(state.factions.empire.overCapacityDays).toBe(0);
  });

  it('disbands a regiment when there are no chargeable facilities left', () => {
    const state = generateGalaxy(101);
    const system = isolate(state, 'empire');
    system.facilities = [];
    system.garrison = 3;
    for (let day = 0; day < 5; day++) runMaintenance(state);
    expect(getSystem(state, system.id).garrison).toBe(2);
  });
});
