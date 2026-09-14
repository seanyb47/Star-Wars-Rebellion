import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import {
  advanceBuilds,
  buildError,
  cancelBuild,
  findFacility,
  foundWorks,
  foundWorksError,
  queueBuild,
} from '../build';
import { getSystem } from '../helpers';
import type { GameState } from '../types';

function yardOf(state: GameState, faction: 'empire' | 'alliance') {
  for (const system of state.systems) {
    if (system.control !== faction) continue;
    const facility = system.facilities.find(
      (f) => f.type === 'construction_yard' && f.owner === faction,
    );
    if (facility) return { system, facility };
  }
  throw new Error('no yard');
}

describe('queueing builds', () => {
  it('deducts refined at order time and sets the build clock', () => {
    const state = generateGalaxy(201);
    const { facility } = yardOf(state, 'empire');
    state.factions.empire.gold = 100;
    queueBuild(state, facility.id, 'mine');
    expect(state.factions.empire.gold).toBe(60);
    expect(facility.building).toEqual({ item: 'mine', daysRemaining: 8, costGold: 40 });
  });

  it('refuses an order the treasury cannot cover', () => {
    const state = generateGalaxy(201);
    const { facility } = yardOf(state, 'empire');
    state.factions.empire.gold = 10;
    expect(buildError(state, facility.id, 'mine')).toMatch(/Needs 40 gold/);
    expect(() => queueBuild(state, facility.id, 'mine')).toThrow();
  });

  it('refuses a second order on a busy facility', () => {
    const state = generateGalaxy(201);
    const { facility } = yardOf(state, 'empire');
    state.factions.empire.gold = 500;
    queueBuild(state, facility.id, 'mine');
    expect(buildError(state, facility.id, 'refinery')).toBe('Already building.');
  });

  it('refuses a mine with no free raw slot', () => {
    const state = generateGalaxy(201);
    const { system, facility } = yardOf(state, 'empire');
    state.factions.empire.gold = 500;
    system.rawSlots = system.facilities.filter((f) => f.type === 'mine').length;
    expect(buildError(state, facility.id, 'mine')).toBe('No free ground.');
  });

  it('refuses a facility with no free energy slot', () => {
    const state = generateGalaxy(201);
    const { system, facility } = yardOf(state, 'empire');
    state.factions.empire.gold = 500;
    system.energySlots = system.facilities.filter((f) => f.type !== 'mine').length;
    expect(buildError(state, facility.id, 'refinery')).toBe('No free water.');
  });

  it('refuses to build on a world in revolt', () => {
    const state = generateGalaxy(201);
    const { system, facility } = yardOf(state, 'empire');
    state.factions.empire.gold = 500;
    system.uprising = true;
    expect(buildError(state, facility.id, 'mine')).toBe('The island is in mutiny.');
  });

  it('only lets training facilities build troops', () => {
    const state = generateGalaxy(201);
    const { facility } = yardOf(state, 'empire');
    state.factions.empire.gold = 500;
    expect(buildError(state, facility.id, 'troop')).toBe('This building cannot make that.');

    const training = state.systems
      .flatMap((s) => s.facilities)
      .find((f) => f.type === 'training_facility' && f.owner === 'empire')!;
    expect(buildError(state, training.id, 'troop')).toBeNull();
    expect(buildError(state, training.id, 'mine')).toBe('This building cannot make that.');
  });
});

describe('completing builds', () => {
  it('adds the facility on the day the order runs out', () => {
    const state = generateGalaxy(202);
    const { system, facility } = yardOf(state, 'empire');
    state.factions.empire.gold = 500;
    const before = system.facilities.length;
    queueBuild(state, facility.id, 'mine');

    for (let day = 0; day < 7; day++) advanceBuilds(state);
    expect(getSystem(state, system.id).facilities).toHaveLength(before);

    advanceBuilds(state);
    const after = getSystem(state, system.id);
    expect(after.facilities).toHaveLength(before + 1);
    expect(after.facilities.at(-1)!.type).toBe('mine');
    expect(findFacility(state, facility.id)!.facility.building).toBeUndefined();
  });

  it('raises the garrison when a troop regiment finishes', () => {
    const state = generateGalaxy(202);
    const training = state.systems
      .flatMap((s) => s.facilities)
      .find((f) => f.type === 'training_facility' && f.owner === 'empire')!;
    const host = state.systems.find((s) => s.facilities.some((f) => f.id === training.id))!;
    state.factions.empire.gold = 500;
    const before = host.garrison;
    queueBuild(state, training.id, 'troop');
    for (let day = 0; day < 5; day++) advanceBuilds(state);
    expect(getSystem(state, host.id).garrison).toBe(before + 1);
  });

  it('settles an unpopulated world when a facility completes there', () => {
    const state = generateGalaxy(203);
    const empty = state.systems.find((s) => !s.populated)!;
    empty.control = 'empire';
    empty.garrison = 1;
    empty.energySlots = 4;
    empty.rawSlots = 4;
    empty.facilities = [{ id: 'fac-test', type: 'construction_yard', owner: 'empire' }];
    state.factions.empire.gold = 500;
    queueBuild(state, 'fac-test', 'mine');
    for (let day = 0; day < 8; day++) advanceBuilds(state);

    const settled = getSystem(state, empty.id);
    expect(settled.populated).toBe(true);
    expect(settled.support).toEqual({ empire: 100, alliance: 0 });
    expect(settled.control).toBe('empire');
  });

  it('freezes construction while a world is in revolt', () => {
    const state = generateGalaxy(204);
    const { system, facility } = yardOf(state, 'empire');
    state.factions.empire.gold = 500;
    queueBuild(state, facility.id, 'mine');
    system.uprising = true;
    for (let day = 0; day < 20; day++) advanceBuilds(state);
    expect(findFacility(state, facility.id)!.facility.building!.daysRemaining).toBe(8);
  });
});

describe('laying down a works', () => {
  function bare(state: GameState, faction: 'empire' | 'alliance') {
    // A held island with no works on it: the shape of every island taken in the war.
    for (const system of state.systems) {
      if (system.control !== faction) continue;
      system.facilities = system.facilities.filter((f) => f.type !== 'construction_yard');
      if (system.energySlots - system.facilities.filter((f) => f.type !== 'mine').length >= 1) {
        return system;
      }
    }
    throw new Error('no bare island');
  }

  it('stands in its slot at once and is done when the clock runs out', () => {
    const state = generateGalaxy(301);
    const island = bare(state, 'empire');
    state.factions.empire.gold = 200;
    expect(foundWorksError(state, island.id, 'empire')).toBeNull();
    foundWorks(state, island.id, 'empire');
    expect(state.factions.empire.gold).toBe(80);
    const works = island.facilities.find((f) => f.type === 'construction_yard')!;
    expect(works.founding).toBe(true);
    expect(works.building?.daysRemaining).toBe(20);
    for (let d = 0; d < 20; d++) advanceBuilds(state);
    expect(works.building).toBeUndefined();
    expect(works.founding).toBeUndefined();
    // One works, not two: finishing the order must not raise a second one.
    expect(island.facilities.filter((f) => f.type === 'construction_yard')).toHaveLength(1);
  });

  it('refuses where a works already stands, where there is no room, and when broke', () => {
    const state = generateGalaxy(301);
    const island = bare(state, 'empire');
    state.factions.empire.gold = 50;
    expect(foundWorksError(state, island.id, 'empire')).toMatch(/Needs 120 gold/);
    state.factions.empire.gold = 500;
    foundWorks(state, island.id, 'empire');
    expect(foundWorksError(state, island.id, 'empire')).toMatch(/already/);
    const other = state.systems.find((s) => s.control === 'alliance')!;
    expect(foundWorksError(state, other.id, 'empire')).toMatch(/do not hold/);
  });

  it('comes down again if the order is cancelled', () => {
    const state = generateGalaxy(301);
    const island = bare(state, 'empire');
    state.factions.empire.gold = 500;
    foundWorks(state, island.id, 'empire');
    const works = island.facilities.find((f) => f.type === 'construction_yard')!;
    cancelBuild(state, works.id);
    expect(island.facilities.find((f) => f.id === works.id)).toBeUndefined();
  });
});
