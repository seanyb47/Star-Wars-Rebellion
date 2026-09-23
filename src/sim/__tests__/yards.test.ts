import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import {
  advanceBuilds,
  cancelBuild,
  crewOn,
  daysToDeliver,
  makerFor,
  planBuild,
  queueBuild,
  raiseWorks,
  raiseWorksError,
  islandBusy,
  laneOf,
} from '../build';
import { travelDays } from '../missions';
import { YARD_BUILDS, shipsFor } from '../constants';
import { depositsLeft, freeSlots } from '../helpers';
import type { Facility, GameState, System } from '../types';

/**
 * Sean's ruling of 16 September, and what is left of it.
 *
 * > Only one thing can be produced by a construction yard, a shipyard or a
 * > troop training facility at a time. If you have multiples on the same
 * > island they work together and increase the speed proportionally.
 *
 * On 20 September he cut the construction yard: *"Cut construction yards
 * completely. Anyone can build on any available land... That way buildings are
 * never traveling... just increase their time to build. So gold becomes
 * building constraint not the yard."*
 *
 * So the rule above still holds, for the two makers that remain — a slipway
 * for hulls and a drill ground for companies. **Buildings are no longer made
 * by anything.** They are raised in place on the island that is getting them,
 * at one flat pace, and what stops you is the price and the ground. This file
 * holds both halves: what the yards rule still governs, and what replaced it.
 */

/** An island of ours with room, stripped back to a known set of works. */
function stage(seed: number, slipways: number): { state: GameState; island: System; yard: Facility } {
  const state = generateGalaxy(seed, 'empire');
  const island = state.systems.find(
    (s) => s.control === 'empire' && !s.uprising && s.slots >= 6,
  )!;
  island.facilities = island.facilities.filter((f) => f.type !== 'shipyard');
  for (let i = 0; i < slipways; i++) {
    island.facilities.push({ id: `slip-${i}`, type: 'shipyard', owner: 'empire' });
  }
  island.deposits = [
    ...Array.from({ length: 4 }, (_, i) => ({ id: `stage-f${i}`, type: 'forest' as const })),
    { id: 'stage-g', type: 'gold' as const },
  ];
  island.slots = Math.max(island.slots, island.facilities.length + island.deposits.length + 3);
  state.factions.empire.gold = 5000;
  return { state, island, yard: island.facilities.find((f) => f.type === 'shipyard')! };
}

/** The cheapest hull this side can lay down, for the pace tests. */
function anyHull(_state: GameState) {
  return shipsFor('empire')[0].id;
}

describe('works of a kind work together', () => {
  it('counts every finished works of its kind, and never fewer than one', () => {
    const { island } = stage(701, 3);
    expect(crewOn(island, 'shipyard', 'empire')).toBe(3);
    expect(crewOn(island, 'training_facility', 'empire')).toBe(1);
  });

  it('three slipways finish a hull in a third of the days', () => {
    const one = stage(701, 1);
    const hull = anyHull(one.state);
    queueBuild(one.state, one.yard.id, hull);
    const three = stage(701, 3);
    queueBuild(three.state, three.yard.id, hull);

    const run = (s: GameState, f: Facility) => {
      let days = 0;
      while (f.building && days < 400) {
        advanceBuilds(s);
        days += 1;
      }
      return days;
    };
    const slow = run(one.state, one.yard);
    const fast = run(three.state, three.yard);
    expect(fast).toBe(Math.ceil(slow / 3));
  });

  it('one job of a kind at a time on an island, however many works stand on it', () => {
    const { state, island, yard } = stage(704, 3);
    const hull = anyHull(state);
    queueBuild(state, yard.id, hull);
    const idle = island.facilities.filter((f) => f.type === 'shipyard' && !f.building);
    expect(idle.length).toBe(2);
    // The other two are the crew on this job, not two more offers.
    for (const other of idle) {
      expect(() => queueBuild(state, other.id, hull)).toThrow();
    }
  });

  /*
   * This rule has now been written three ways, and the third is the one that
   * is about a decision rather than about arithmetic.
   *
   * It began as one job per *works*, so a developed island ran a queue per
   * building and its output scaled with how many sorts of works stood on it.
   * Sean cut that to one job per island on 22 September — *"we don't want to
   * just be able to spam like five things that are all being made
   * simultaneously"* — and that went a step too far the other way: a Sovereign
   * takes eight months, so a slipway laying one down also stopped the barracks
   * raising a company and the island raising a mill. A developed island did
   * one thing a season.
   *
   * 23 September, and this is the shape: *"It should be only 1 ship, 1
   * building, 1 troop at a time."* Three lanes, and they do not block each
   * other. A second order in the same lane still waits, which is the spam he
   * was cutting; the lanes are what stops it also being a queue of one.
   */
  it('lets a hull and a company be made at once, and a second hull wait', () => {
    const { state, island, yard } = stage(705, 1);
    island.facilities.push({ id: 'drill-1', type: 'training_facility', owner: 'empire' });
    island.facilities.push({ id: 'yard-2', type: 'shipyard', owner: 'empire' });
    queueBuild(state, yard.id, anyHull(state));
    // Different lane: goes ahead.
    queueBuild(state, 'drill-1', 'troop');
    expect(island.facilities.filter((f) => f.building).length).toBe(2);
    // Same lane on a second slipway: waits. Slipways of a kind are one crew,
    // so this is refused by the works-level check before the lane check even
    // runs — either way the answer is no, and it names the hull in the way.
    expect(() => queueBuild(state, 'yard-2', anyHull(state))).toThrow(/busy|one hull at a time/i);
  });

  it('and a works being laid down holds only the works lane', () => {
    const { state, island, yard } = stage(716, 1);
    raiseWorks(state, island.id, 'fort', 'empire');
    expect(island.facilities.some((f) => f.founding)).toBe(true);
    // A second building waits behind the first.
    expect(raiseWorksError(state, island.id, 'refinery', 'empire')).toMatch(/one building at a time/i);
    // A hull does not. Laying down a fort is not work the shipwrights do.
    expect(() => queueBuild(state, yard.id, anyHull(state))).not.toThrow();
  });

  it('and a lane is free again the day its own job lands', () => {
    const { state, island } = stage(717, 1);
    raiseWorks(state, island.id, 'fort', 'empire');
    expect(raiseWorksError(state, island.id, 'refinery', 'empire')).toMatch(/one building at a time/i);
    // The day it lands: a works stops being founding *and* drops its order —
    // it carries both while it is going up, which is what `islandBusy` reads.
    const founding = island.facilities.find((f) => f.founding)!;
    founding.founding = undefined;
    founding.building = undefined;
    expect(raiseWorksError(state, island.id, 'refinery', 'empire')).toBeNull();
  });
});

describe('a hull still comes from somewhere and sails', () => {
  it('builds first, then sails, and says how long each takes', () => {
    const { state, island, yard } = stage(706, 1);
    const target = state.systems.find(
      (s) => s.control === 'empire' && s.id !== island.id,
    )!;
    const hull = anyHull(state);
    const plan = planBuild(state, 'empire', hull, target.id);
    expect(plan.error).toBeNull();
    expect(plan.travel).toBe(travelDays(state, plan.fromSystemId!, target.id));
    queueBuild(state, yard.id, hull, target.id);
    expect(daysToDeliver(island, yard)).toBe(plan.days + plan.travel);
  });
});

describe('a building is raised where it is going', () => {
  it('has no maker at all, where a hull and a company still do', () => {
    expect(makerFor('fort')).toBeUndefined();
    expect(makerFor('refinery')).toBeUndefined();
    expect(makerFor('troop')).toBe('training_facility');
    expect(makerFor(shipsFor('empire')[0].id)).toBe('shipyard');
  });

  it('is planned on the island itself, with nothing to cross', () => {
    const { state, island } = stage(710, 1);
    // An island far from everything of ours, so a passage would show up.
    const far = [...state.systems]
      .filter((s) => s.control === 'empire' && s.id !== island.id)
      .sort((a, b) => travelDays(state, island.id, b.id) - travelDays(state, island.id, a.id))[0];
    const plan = planBuild(state, 'empire', 'fort', far.id);
    expect(plan.error).toBeNull();
    expect(plan.fromSystemId).toBe(far.id);
    expect(plan.travel).toBe(0);
    expect(plan.days).toBe(YARD_BUILDS.fort.days);
  });

  it('goes up at one pace, whatever else is standing there', () => {
    const { state, island } = stage(711, 4);
    raiseWorks(state, island.id, 'fort', 'empire');
    const going = island.facilities.find((f) => f.founding)!;
    let days = 0;
    while (going.building && days < 500) {
      advanceBuilds(state);
      days += 1;
    }
    // Four slipways on the island and not one of them helps: a works being
    // laid down is building itself.
    expect(days).toBe(YARD_BUILDS.fort.days);
  });

  it('needs the island, the ground and the gold, and nothing else', () => {
    const { state, island } = stage(712, 0);
    const theirs = state.systems.find((s) => s.control !== 'empire')!;
    expect(raiseWorksError(state, theirs.id, 'fort', 'empire')).toMatch(/do not hold/i);

    state.factions.empire.gold = 0;
    expect(raiseWorksError(state, island.id, 'fort', 'empire')).toMatch(/needs/i);
    state.factions.empire.gold = 5000;
    expect(raiseWorksError(state, island.id, 'fort', 'empire')).toBeNull();

    // An earner wants its own ground and takes no plot beside it.
    island.deposits = [];
    expect(raiseWorksError(state, island.id, 'refinery', 'empire')).toMatch(/no forest/i);
  });
});

describe('an earner takes its ground the day it is ordered', () => {
  /*
   * Measured the hard way. Without this the half-built works and the deposit
   * under it both count against the island, so it goes over its own plot
   * count — and the vein still reads as open, so the opponent orders another
   * mine onto it every tick. Twelve wars came back with thirty-five thousand
   * over-built islands and a treasury of 2.8 million gold.
   */
  it('so the island never holds more than it has room for', () => {
    const { state, island } = stage(713, 0);
    const room = island.slots;
    const forests = depositsLeft(island, 'forest');
    expect(forests).toBeGreaterThan(0);
    const before = freeSlots(island);

    raiseWorks(state, island.id, 'refinery', 'empire');
    expect(depositsLeft(island, 'forest')).toBe(forests - 1);
    // The works stands where the trees did: no plot gained, none lost.
    expect(freeSlots(island)).toBe(before);
    expect(island.facilities.length + (island.deposits ?? []).length).toBeLessThanOrEqual(room);
  });

  it('so the same stand cannot be promised to two mills', () => {
    const { state, island } = stage(714, 0);
    island.deposits = [{ id: 'only-one', type: 'forest' }];
    raiseWorks(state, island.id, 'refinery', 'empire');
    expect(raiseWorksError(state, island.id, 'refinery', 'empire')).toMatch(/no forest/i);
  });

  it('and cancelling the order gives the ground back', () => {
    const { state, island } = stage(715, 0);
    const forests = depositsLeft(island, 'forest');
    raiseWorks(state, island.id, 'refinery', 'empire');
    const going = island.facilities.find((f) => f.founding)!;
    cancelBuild(state, going.id);
    expect(island.facilities.some((f) => f.founding)).toBe(false);
    expect(depositsLeft(island, 'forest')).toBe(forests);
  });
});

describe('one ship, one building, one troop', () => {
  /*
   * The three lanes, asked of the sim rather than through a works.
   *
   * Sean, 23 September: *"It should be only 1 ship, 1 building, 1 troop at a
   * time."* `laneOf` is the whole of that rule and everything else reads it,
   * so it is worth pinning on its own: a hull is a hull whichever class it is,
   * a named company and the generic order are both the troop lane, and
   * everything else is a building.
   */
  it('sorts every kind of order into its own lane', () => {
    expect(laneOf('troop')).toBe('troop');
    expect(laneOf('crown-marines')).toBe('troop');
    expect(laneOf(shipsFor('empire')[0].id)).toBe('ship');
    expect(laneOf('fort')).toBe('works');
    expect(laneOf('shipyard')).toBe('works');
    expect(laneOf('refinery')).toBe('works');
  });

  it('reports a busy lane only to the lane that is busy', () => {
    const { state, island, yard } = stage(730, 1);
    island.facilities.push({ id: 'drill-9', type: 'training_facility', owner: 'empire' });
    queueBuild(state, yard.id, anyHull(state));
    expect(islandBusy(island, 'empire', 'ship')).not.toBeNull();
    expect(islandBusy(island, 'empire', 'troop')).toBeNull();
    expect(islandBusy(island, 'empire', 'works')).toBeNull();
    // And asked without a lane it still answers "something is being made",
    // which is what the chart's idle filter wants to know.
    expect(islandBusy(island, 'empire')).not.toBeNull();
  });
});
