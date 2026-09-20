import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import {
  advanceBuilds,
  buildError,
  cancelBuild,
  daysToFinish,
  findFacility,
  planBuild,
  queueBuild,
  raiseWorks,
  raiseWorksError,
} from '../build';
import { depositsLeft, freeSlots, getSystem, returnDeposit } from '../helpers';
// The day counts come from the spec rather than being written out again here.
// Sean retunes build rates — ships forever, buildings medium, companies fast —
// and a test that repeats the numbers fails for that alone, saying nothing
// about whether the machinery still works. Seven of these did exactly that the
// first time the rates moved.
import { TROOP_BUILD, YARD_BUILDS, shipsFor } from '../constants';
import { travelDays } from '../missions';
import type { GameState, System } from '../types';

/**
 * How a thing gets built, since Sean cut the construction yard on 20 September.
 *
 * > Cut construction yards completely. Anyone can build on any available land.
 * > That way buildings are never traveling... just increase their time to
 * > build. So gold becomes building constraint not the yard.
 *
 * Two paths now, and the split is the point of the file:
 *
 *  - **A building** is raised in place by `raiseWorks`, on any island you
 *    hold. No maker, no passage, one flat pace, and the price is the gate.
 *  - **A hull or a company** still comes off a slipway or a drill ground,
 *    still goes faster with more of that kind on the island, and still sails
 *    to wherever it was ordered for.
 */

/** An island of ours with ground to spare and a maker on it. */
function siteOf(state: GameState, faction: 'empire' | 'alliance') {
  for (const system of state.systems) {
    if (system.control !== faction || system.uprising) continue;
    const facility = system.facilities.find(
      (f) => f.type === 'training_facility' && f.owner === faction,
    );
    if (facility) {
      timber(state, system);
      return { system, facility };
    }
  }
  throw new Error('no drill ground');
}

/** An island of ours with no maker on it at all. */
function bareOf(state: GameState, faction: 'empire' | 'alliance'): System {
  const system = state.systems.find(
    (s) => s.control === faction && !s.uprising && s.facilities.length === 0,
  ) ?? state.systems.find((s) => s.control === faction && !s.uprising)!;
  system.facilities = [];
  timber(state, system);
  return system;
}

/** Two stands of timber and a vein, so an earner has somewhere to go. */
function timber(state: GameState, system: System) {
  returnDeposit(state, system, 'forest');
  returnDeposit(state, system, 'forest');
  returnDeposit(state, system, 'gold');
  system.slots = Math.max(system.slots, system.facilities.length + (system.deposits?.length ?? 0) + 2);
}

const hullFor = (faction: 'empire' | 'alliance') => shipsFor(faction)[0].id;

describe('raising a building', () => {
  it('charges the treasury at order time and starts the clock', () => {
    const state = generateGalaxy(300, 'empire');
    const island = bareOf(state, 'empire');
    state.factions.empire.gold = 5000;
    raiseWorks(state, island.id, 'fort', 'empire');
    expect(state.factions.empire.gold).toBe(5000 - YARD_BUILDS.fort.costGold);
    const going = island.facilities.find((f) => f.founding)!;
    expect(going.building!.workLeft).toBe(YARD_BUILDS.fort.days);
    expect(going.building!.travel).toBe(0);
  });

  it('takes nothing at all for a mine or a mill', () => {
    const state = generateGalaxy(301, 'empire');
    const island = bareOf(state, 'empire');
    state.factions.empire.gold = 5000;
    raiseWorks(state, island.id, 'refinery', 'empire');
    expect(state.factions.empire.gold).toBe(5000);
  });

  it('refuses an order the treasury cannot cover', () => {
    const state = generateGalaxy(302, 'empire');
    const island = bareOf(state, 'empire');
    state.factions.empire.gold = 0;
    expect(raiseWorksError(state, island.id, 'fort', 'empire')).toMatch(/needs/i);
    expect(() => raiseWorks(state, island.id, 'fort', 'empire')).toThrow();
  });

  it('refuses an island that is full, in mutiny, or not yours', () => {
    const state = generateGalaxy(303, 'empire');
    const island = bareOf(state, 'empire');
    state.factions.empire.gold = 5000;

    island.slots = island.facilities.length + (island.deposits ?? []).length;
    expect(raiseWorksError(state, island.id, 'fort', 'empire')).toMatch(/no room/i);

    island.slots += 2;
    island.uprising = true;
    expect(raiseWorksError(state, island.id, 'fort', 'empire')).toMatch(/mutiny/i);
    island.uprising = false;

    const theirs = state.systems.find((s) => s.control !== 'empire')!;
    expect(raiseWorksError(state, theirs.id, 'fort', 'empire')).toMatch(/do not hold/i);
  });

  it('stands in its plot from the day it is ordered, and opens when the clock runs out', () => {
    const state = generateGalaxy(304, 'empire');
    const island = bareOf(state, 'empire');
    state.factions.empire.gold = 5000;
    const before = freeSlots(island);

    raiseWorks(state, island.id, 'fort', 'empire');
    expect(freeSlots(island)).toBe(before - 1);
    const going = island.facilities.find((f) => f.founding)!;

    for (let day = 0; day < YARD_BUILDS.fort.days - 1; day += 1) advanceBuilds(state);
    expect(going.founding).toBe(true);
    advanceBuilds(state);
    expect(going.founding).toBeUndefined();
    expect(going.building).toBeUndefined();
    expect(island.facilities.filter((f) => f.type === 'fort')).toHaveLength(1);
  });

  it('comes down again if the order is cancelled', () => {
    const state = generateGalaxy(305, 'empire');
    const island = bareOf(state, 'empire');
    state.factions.empire.gold = 5000;
    raiseWorks(state, island.id, 'fort', 'empire');
    const going = island.facilities.find((f) => f.founding)!;
    cancelBuild(state, going.id);
    expect(island.facilities.some((f) => f.founding)).toBe(false);
    expect(island.facilities.some((f) => f.type === 'fort')).toBe(false);
  });

  it('stops while the island is in mutiny and picks up again after', () => {
    const state = generateGalaxy(306, 'empire');
    const island = bareOf(state, 'empire');
    state.factions.empire.gold = 5000;
    raiseWorks(state, island.id, 'fort', 'empire');
    const going = island.facilities.find((f) => f.founding)!;

    island.uprising = true;
    const stuck = going.building!.workLeft;
    for (let day = 0; day < 5; day += 1) advanceBuilds(state);
    expect(going.building!.workLeft).toBe(stuck);

    island.uprising = false;
    advanceBuilds(state);
    expect(going.building!.workLeft).toBe(stuck - 1);
  });

  it('needs no works of any kind on the island — which is the whole change', () => {
    const state = generateGalaxy(307, 'empire');
    const island = bareOf(state, 'empire');
    state.factions.empire.gold = 5000;
    expect(island.facilities).toHaveLength(0);
    expect(raiseWorksError(state, island.id, 'fort', 'empire')).toBeNull();
    // And it is planned on the island itself, with nothing to cross.
    const plan = planBuild(state, 'empire', 'fort', island.id);
    expect(plan.travel).toBe(0);
    expect(plan.fromSystemId).toBe(island.id);
  });
});

describe('a hull and a company still come off a works', () => {
  it('deducts at order time and sets the build clock', () => {
    const state = generateGalaxy(310, 'empire');
    const { facility } = siteOf(state, 'empire');
    state.factions.empire.gold = 5000;
    queueBuild(state, facility.id, 'troop');
    expect(state.factions.empire.gold).toBe(5000 - TROOP_BUILD.costGold);
    expect(facility.building!.workLeft).toBe(TROOP_BUILD.days);
  });

  it('refuses a second order on works already at that kind of work', () => {
    const state = generateGalaxy(311, 'empire');
    const { facility } = siteOf(state, 'empire');
    state.factions.empire.gold = 5000;
    queueBuild(state, facility.id, 'troop');
    expect(buildError(state, facility.id, 'troop')).toBeTruthy();
  });

  it('only lets a drill ground drill, and a slipway lay down', () => {
    const state = generateGalaxy(312, 'empire');
    const { system, facility } = siteOf(state, 'empire');
    state.factions.empire.gold = 5000;
    expect(buildError(state, facility.id, hullFor('empire'))).toBeTruthy();
    system.facilities.push({ id: 'slip-x', type: 'shipyard', owner: 'empire' });
    expect(buildError(state, 'slip-x', 'troop')).toBeTruthy();
    expect(buildError(state, 'slip-x', hullFor('empire'))).toBeNull();
  });

  it('raises the garrison when a company finishes', () => {
    const state = generateGalaxy(313, 'empire');
    const { system, facility } = siteOf(state, 'empire');
    state.factions.empire.gold = 5000;
    const before = system.garrison;
    queueBuild(state, facility.id, 'troop');
    for (let day = 0; day < TROOP_BUILD.days; day += 1) advanceBuilds(state);
    expect(system.garrison).toBe(before + 1);
  });

  it('adds the passage and lands the thing where it was sent', () => {
    const state = generateGalaxy(314, 'empire');
    const { system, facility } = siteOf(state, 'empire');
    state.factions.empire.gold = 5000;
    const away = state.systems.find(
      (s) => s.control === 'empire' && s.id !== system.id && !s.uprising,
    )!;
    const passage = travelDays(state, system.id, away.id);
    expect(passage).toBeGreaterThan(0);
    const before = away.garrison;

    queueBuild(state, facility.id, 'troop', away.id);
    expect(daysToFinish(system, facility)).toBe(TROOP_BUILD.days);
    for (let day = 0; day < TROOP_BUILD.days + passage; day += 1) advanceBuilds(state);
    expect(away.garrison).toBe(before + 1);
    expect(findFacility(state, facility.id)!.facility.building).toBeUndefined();
  });

  it('refuses a destination you do not hold', () => {
    const state = generateGalaxy(315, 'empire');
    const { facility } = siteOf(state, 'empire');
    state.factions.empire.gold = 5000;
    const theirs = state.systems.find((s) => s.control !== 'empire')!;
    expect(buildError(state, facility.id, 'troop', theirs.id)).toBeTruthy();
  });
});

describe('an earner takes the ground it stands on', () => {
  it('and the island is never over its own plot count while it goes up', () => {
    const state = generateGalaxy(320, 'empire');
    const island = bareOf(state, 'empire');
    const forests = depositsLeft(island, 'forest');
    const before = freeSlots(island);

    raiseWorks(state, island.id, 'refinery', 'empire');
    expect(depositsLeft(island, 'forest')).toBe(forests - 1);
    // The mill stands where the trees did: no plot gained, none lost.
    expect(freeSlots(island)).toBe(before);
    expect(island.facilities.length + (island.deposits ?? []).length)
      .toBeLessThanOrEqual(island.slots);
  });

  it('and the works actually opens when the clock runs out', () => {
    /*
     * The obvious thing to test, and it was not obvious until it broke.
     *
     * Completion re-checks that the ground is still there before letting a
     * works land — right for builders shipped in from elsewhere, fatal for one
     * raised in place, because `raiseWorks` took the deposit on the day of the
     * order. Every raised mine and mill sat at nought days left for ever, and
     * nothing in the suite noticed: the fort tests passed, the ordering tests
     * passed, and the only thing that showed it was a dispatch about settling
     * that never arrived.
     */
    const state = generateGalaxy(323, 'empire');
    const island = bareOf(state, 'empire');
    raiseWorks(state, island.id, 'refinery', 'empire');
    for (let day = 0; day < YARD_BUILDS.refinery.days; day += 1) advanceBuilds(state);
    expect(island.facilities.some((f) => f.founding)).toBe(false);
    expect(island.facilities.filter((f) => f.type === 'refinery')).toHaveLength(1);
  });

  it('and the ground comes back if the order is cancelled', () => {
    const state = generateGalaxy(321, 'empire');
    const island = bareOf(state, 'empire');
    const forests = depositsLeft(island, 'forest');
    raiseWorks(state, island.id, 'refinery', 'empire');
    cancelBuild(state, island.facilities.find((f) => f.founding)!.id);
    expect(depositsLeft(island, 'forest')).toBe(forests);
  });

  it('and refuses an island with none of that ground', () => {
    const state = generateGalaxy(322, 'empire');
    const island = bareOf(state, 'empire');
    island.deposits = [];
    expect(raiseWorksError(state, island.id, 'refinery', 'empire')).toMatch(/no forest/i);
  });
});

describe('settling', () => {
  it('settles an uninhabited island when a building completes there', () => {
    const state = generateGalaxy(330, 'empire');
    const rock = state.systems.find((s) => !s.populated && s.control === 'none')!;
    rock.control = 'empire';
    rock.slots = Math.max(rock.slots, 3);
    rock.facilities = [];
    rock.deposits = [];
    state.factions.empire.gold = 5000;

    raiseWorks(state, rock.id, 'fort', 'empire');
    for (let day = 0; day < YARD_BUILDS.fort.days; day += 1) advanceBuilds(state);
    expect(getSystem(state, rock.id).facilities.some((f) => f.type === 'fort')).toBe(true);
  });
});
