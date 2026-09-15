import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import {
  advanceBuilds,
  buildError,
  cancelBuild,
  findFacility,
  foundWorks,
  foundWorksError,
  planBuild,
  queueBuild,
} from '../build';
import { getSystem } from '../helpers';
import { travelDays } from '../missions';
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

  it('refuses anything that needs a berth when the island is full', () => {
    const state = generateGalaxy(201);
    const { system, facility } = yardOf(state, 'empire');
    state.factions.empire.gold = 500;
    system.slots = system.facilities.length;
    // One pool, so it is the same answer whatever the building is.
    expect(buildError(state, facility.id, 'mine')).toMatch(/^No room left on /);
    expect(buildError(state, facility.id, 'refinery')).toMatch(/^No room left on /);
    // Companies take no room at all.
    expect(buildError(state, facility.id, 'troop')).not.toMatch(/No room/);
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
    empty.slots = 8;
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
      if (system.slots - system.facilities.length >= 1) {
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

describe('orders sent to another island', () => {
  function elsewhere(state: GameState, faction: 'empire' | 'alliance', notId: string) {
    return state.systems.find(
      (s) => s.control === faction && s.id !== notId && !s.uprising && s.slots - s.facilities.length > 0,
    )!;
  }

  it('adds the passage to the clock and lands the thing where it was sent', () => {
    const state = generateGalaxy(201);
    const { system, facility } = yardOf(state, 'empire');
    const there = elsewhere(state, 'empire', system.id);
    state.factions.empire.gold = 500;
    queueBuild(state, facility.id, 'mine', there.id);
    // Passage is a distance now, so ask for the figure rather than knowing it.
    const sail = travelDays(state, system.id, there.id);
    expect(facility.building).toEqual({ item: 'mine', daysRemaining: 8 + sail, costGold: 40, destinationId: there.id });
    const minesBefore = there.facilities.filter((f) => f.type === 'mine').length;
    const hereBefore = system.facilities.length;
    for (let d = 0; d < 8 + sail; d++) advanceBuilds(state);
    expect(facility.building).toBeUndefined();
    expect(there.facilities.filter((f) => f.type === 'mine').length).toBe(minesBefore + 1);
    expect(system.facilities.length).toBe(hereBefore);
  });

  it('sends an order to an island of yours with no works of its own', () => {
    const state = generateGalaxy(201);
    const { system, facility } = yardOf(state, 'empire');
    const bare = state.systems.find(
      (s) => s.control === 'empire' && s.id !== system.id && !s.facilities.some((f) => f.type === 'construction_yard'),
    );
    if (!bare) return; // this seed has a works everywhere; nothing to prove
    state.factions.empire.gold = 500;
    expect(buildError(state, facility.id, 'construction_yard', bare.id)).toBeNull();
  });

  it('counts an order already at sea against the room it is sailing for', () => {
    const state = generateGalaxy(201);
    const { system, facility } = yardOf(state, 'empire');
    const there = elsewhere(state, 'empire', system.id);
    there.slots = there.facilities.length + 1;
    state.factions.empire.gold = 500;
    queueBuild(state, facility.id, 'mine', there.id);
    const other = state.systems
      .flatMap((s) => s.facilities.map((f) => ({ s, f })))
      .find(({ s, f }) => s.control === 'empire' && f.type === 'construction_yard' && f.owner === 'empire' && !f.building);
    if (!other) return;
    expect(buildError(state, other.f.id, 'mine', there.id)).toMatch(/No room left/);
  });

  it('turns back to where it was made if the island is lost on the way', () => {
    const state = generateGalaxy(201);
    const { system, facility } = yardOf(state, 'empire');
    const there = elsewhere(state, 'empire', system.id);
    state.factions.empire.gold = 500;
    queueBuild(state, facility.id, 'mine', there.id);
    const hereBefore = system.facilities.length;
    there.control = 'alliance';
    for (let d = 0; d < 20; d++) advanceBuilds(state);
    expect(facility.building).toBeUndefined();
    expect(system.facilities.length).toBe(hereBefore + 1);
    expect(state.events.some((e) => /turns back/.test(e.text))).toBe(true);
  });

  it('refuses a destination you do not hold', () => {
    const state = generateGalaxy(201);
    const { facility } = yardOf(state, 'empire');
    const theirs = state.systems.find((s) => s.control === 'alliance')!;
    state.factions.empire.gold = 500;
    expect(buildError(state, facility.id, 'mine', theirs.id)).toMatch(/do not hold/);
  });

  it('plans from the nearest free maker and says why when none can', () => {
    const state = generateGalaxy(201);
    const { system, facility } = yardOf(state, 'empire');
    const there = elsewhere(state, 'empire', system.id);
    state.factions.empire.gold = 500;
    const plan = planBuild(state, 'empire', 'mine', there.id);
    expect(plan.error).toBeNull();
    expect(plan.facilityId).not.toBeNull();
    expect(plan.days).toBe(8);
    expect(plan.travel).toBe(
      plan.fromSystemId === null ? 0 : travelDays(state, plan.fromSystemId, there.id),
    );
    // Made on the spot when the island has its own works.
    if (there.facilities.some((f) => f.type === 'construction_yard' && f.owner === 'empire')) {
      expect(plan.travel).toBe(0);
    }
    state.factions.empire.gold = 0;
    expect(planBuild(state, 'empire', 'mine', there.id).error).toMatch(/Needs 40 gold/);
    void facility;
  });
});
