import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import {
  advanceBuilds,
  buildError,
  crewOn,
  daysToDeliver,
  daysToFinish,
  makerFor,
  planBuild,
  queueBuild,
} from '../build';
import { travelDays } from '../missions';
import { YARD_BUILDS, shipsFor, shipSpec } from '../constants';
import type { Facility, GameState, System } from '../types';

/**
 * Sean's ruling, 16 September:
 *
 * > Only one thing can be produced by a construction yard, a shipyard or a
 * > troop training facility at a time. If you have multiples on the same
 * > island they work together and increase the speed proportionally — if
 * > something were to take 60 days at a construction yard then three of them
 * > would complete the task in 20 days. And that will also change in the
 * > middle of the task… on any given island it is possible to have three
 * > things being built maximum.
 */

/** An island of ours with room, stripped back to a known set of works. */
function stage(seed: number, yards: number): { state: GameState; island: System; yard: Facility } {
  const state = generateGalaxy(seed, 'empire');
  const island = state.systems.find(
    (s) => s.control === 'empire' && !s.uprising && s.slots >= 6,
  )!;
  island.facilities = island.facilities.filter((f) => f.type !== 'construction_yard');
  for (let i = 0; i < yards; i++) {
    island.facilities.push({ id: `yard-${i}`, type: 'construction_yard', owner: 'empire' });
  }
  // Earners need a deposit under them now, and these tests order them to
  // exercise the yard rule rather than the resource rule.
  island.deposits = [
    ...Array.from({ length: 4 }, (_, i) => ({ id: `stage-f${i}`, type: 'forest' as const })),
    { id: 'stage-g', type: 'gold' as const },
  ];
  island.slots = Math.max(island.slots, island.facilities.length + island.deposits.length + 3);
  state.factions.empire.gold = 5000;
  return { state, island, yard: island.facilities.find((f) => f.type === 'construction_yard')! };
}

describe('works of a kind work together', () => {
  it('counts every finished works of its kind, and never fewer than one', () => {
    const { state, island } = stage(701, 3);
    expect(crewOn(island, 'construction_yard', 'empire')).toBe(3);
    expect(crewOn(island, 'shipyard', 'empire')).toBe(1);
    void state;
  });

  it('three yards finish a job in a third of the days', () => {
    const one = stage(701, 1);
    queueBuild(one.state, one.yard.id, 'refinery');
    const alone = daysToFinish(one.island, one.yard);

    const three = stage(701, 3);
    queueBuild(three.state, three.yard.id, 'refinery');
    expect(daysToFinish(three.island, three.yard)).toBe(Math.ceil(alone / 3));

    // And it is not only the quoted figure: run the clock.
    let days = 0;
    while (three.yard.building && days < 200) {
      advanceBuilds(three.state);
      days += 1;
    }
    expect(days).toBe(Math.ceil(YARD_BUILDS.refinery.days / 3));
  });

  it('a yard finished mid-task shortens what is left from that morning', () => {
    // Sean's own example: a job with days left on it, a second works arrives,
    // and the remaining time halves.
    const { state, island, yard } = stage(702, 1);
    queueBuild(state, yard.id, 'construction_yard');
    for (let d = 0; d < 6; d++) advanceBuilds(state);
    const leftAlone = daysToFinish(island, yard);
    expect(leftAlone).toBe(YARD_BUILDS.construction_yard.days - 6);

    island.facilities.push({ id: 'yard-late', type: 'construction_yard', owner: 'empire' });
    expect(daysToFinish(island, yard)).toBe(Math.ceil(leftAlone / 2));
  });

  it('one job of a kind at a time on an island, however many works stand on it', () => {
    const { state, island, yard } = stage(703, 3);
    queueBuild(state, yard.id, 'mine');
    // Every other yard on the island is on that job, not idle.
    for (const other of island.facilities.filter((f) => f.type === 'construction_yard')) {
      expect(buildError(state, other.id, 'refinery')).toMatch(/busy: /);
    }
  });

  it('but a yard, a slipway and a drill ground are three separate jobs', () => {
    const { state, island, yard } = stage(704, 1);
    island.facilities.push({ id: 'sy', type: 'shipyard', owner: 'empire' });
    island.facilities.push({ id: 'tf', type: 'training_facility', owner: 'empire' });
    const hull = shipsFor('empire').find((c) => c.role === 'small')!.id;
    queueBuild(state, yard.id, 'mine');
    queueBuild(state, 'sy', hull);
    queueBuild(state, 'tf', 'troop');
    expect(island.facilities.filter((f) => f.building)).toHaveLength(3);
    expect(makerFor('mine')).toBe('construction_yard');
    expect(makerFor(hull)).toBe('shipyard');
    expect(makerFor('troop')).toBe('training_facility');
  });
});

describe('the work and the passage are different questions', () => {
  function elsewhere(state: GameState, notId: string): System {
    return state.systems.find(
      (s) => s.control === 'empire' && s.id !== notId && !s.uprising && s.slots > s.facilities.length,
    )!;
  }

  it('builds first, then sails, and says how long each takes', () => {
    const { state, island, yard } = stage(705, 2);
    const there = elsewhere(state, island.id);
    // The island the builders sail to needs a plot for what they are raising.
    there.slots = Math.max(there.slots, there.facilities.length + (there.deposits?.length ?? 0) + 1);
    const sail = travelDays(state, island.id, there.id);
    queueBuild(state, yard.id, 'shipyard', there.id);

    const work = Math.ceil(YARD_BUILDS.shipyard.days / 2);
    expect(daysToFinish(island, yard)).toBe(work);
    expect(daysToDeliver(island, yard)).toBe(work + sail);

    // The work runs out first and the thing is at sea, not delivered.
    for (let d = 0; d < work; d++) advanceBuilds(state);
    expect(yard.building).toBeDefined();
    expect(yard.building!.workLeft).toBe(0);
    expect(daysToFinish(island, yard)).toBe(0);
    expect(daysToDeliver(island, yard)).toBe(sail);

    const before = there.facilities.length;
    for (let d = 0; d < sail; d++) advanceBuilds(state);
    expect(yard.building).toBeUndefined();
    expect(there.facilities.length).toBe(before + 1);
  });

  it('a works made where it is wanted has no passage at all', () => {
    const { state, island, yard } = stage(706, 1);
    queueBuild(state, yard.id, 'mine');
    expect(yard.building!.travel).toBe(0);
    expect(daysToDeliver(island, yard)).toBe(daysToFinish(island, yard));
  });
});

describe('the plan the player is shown before ordering', () => {
  it('sends the order to the quickest island, not the nearest', () => {
    const state = generateGalaxy(707, 'empire');
    state.factions.empire.gold = 5000;
    const held = state.systems.filter((s) => s.control === 'empire' && !s.uprising);
    const target = held[0];
    // Strip every yard, then give a further island a great many of them.
    for (const s of held) s.facilities = s.facilities.filter((f) => f.type !== 'construction_yard');
    const others = [...held]
      .filter((s) => s.id !== target.id)
      .sort((a, b) => travelDays(state, a.id, target.id) - travelDays(state, b.id, target.id));
    const near = others[0];
    /*
     * Further, but not the ends of the earth.
     *
     * This used to pick the farthest island of the lot, and that stopped
     * working on 19 September when a crossing of the world went from about
     * five weeks to two hundred days: eight yards save 36 days of building
     * and no number of yards saves 150 days of sailing, so the near island
     * genuinely wins now and the plan is right to say so. The rule under test
     * is *quickest, not nearest*, and to test it the two have to be able to
     * disagree — so the many yards go somewhere the extra passage is worth
     * paying for, and the sum is worked out here rather than assumed.
     */
    const far = others[1];
    near.facilities.push({ id: 'near-1', type: 'construction_yard', owner: 'empire' });
    for (let i = 0; i < 8; i++) {
      far.facilities.push({ id: `far-${i}`, type: 'construction_yard', owner: 'empire' });
    }

    const build = YARD_BUILDS.shipyard.days;
    const nearTotal = build + travelDays(state, near.id, target.id);
    const farTotal = Math.ceil(build / 8) + travelDays(state, far.id, target.id);
    // The setup is only a test of the rule while the further island is
    // genuinely the quicker one.
    expect(farTotal).toBeLessThan(nearTotal);
    expect(travelDays(state, far.id, target.id)).toBeGreaterThan(
      travelDays(state, near.id, target.id),
    );

    const plan = planBuild(state, 'empire', 'shipyard', target.id);
    expect(plan.error).toBeNull();
    expect(plan.fromSystemId).toBe(far.id);
    expect(plan.days).toBe(Math.ceil(build / 8));
  });

  it('will not cross the world to save a month of building', () => {
    // The other half of the same rule, and the half the rescaling created.
    // Sean, 19 September: *"Travel time is still way too fast."* Now that it
    // is not, a yard on the far side of the world is not a yard you can use:
    // whatever it saves in building it loses many times over in passage, and
    // the plan has to prefer the one lonely yard next door.
    const state = generateGalaxy(707, 'empire');
    state.factions.empire.gold = 5000;
    const held = state.systems.filter((s) => s.control === 'empire' && !s.uprising);
    const target = held[0];
    for (const s of held) s.facilities = s.facilities.filter((f) => f.type !== 'construction_yard');
    const others = [...held]
      .filter((s) => s.id !== target.id)
      .sort((a, b) => travelDays(state, a.id, target.id) - travelDays(state, b.id, target.id));
    const near = others[0];
    const far = others[others.length - 1];
    expect(travelDays(state, far.id, target.id)).toBeGreaterThan(
      travelDays(state, near.id, target.id) + YARD_BUILDS.shipyard.days,
    );
    near.facilities.push({ id: 'near-1', type: 'construction_yard', owner: 'empire' });
    for (let i = 0; i < 8; i++) {
      far.facilities.push({ id: `far-${i}`, type: 'construction_yard', owner: 'empire' });
    }

    const plan = planBuild(state, 'empire', 'shipyard', target.id);
    expect(plan.error).toBeNull();
    expect(plan.fromSystemId).toBe(near.id);
  });

  it('quotes the days that island will actually take', () => {
    const { state, island, yard } = stage(708, 4);
    void yard;
    const plan = planBuild(state, 'empire', 'refinery', island.id);
    expect(plan.fromSystemId).toBe(island.id);
    expect(plan.days).toBe(Math.ceil(YARD_BUILDS.refinery.days / 4));
    expect(plan.travel).toBe(0);
  });

  it('says every works of that kind is at work when they all are', () => {
    const state = generateGalaxy(709, 'empire');
    state.factions.empire.gold = 5000;
    for (const s of state.systems) {
      if (s.control !== 'empire') continue;
      for (const f of s.facilities) {
        if (f.type !== 'construction_yard') continue;
        if (!f.building) {
          f.building = {
            item: 'mine',
            work: 8,
            workLeft: 8,
            travel: 0,
            travelLeft: 0,
            costGold: 40,
          };
        }
      }
    }
    const where = state.systems.find((s) => s.control === 'empire')!;
    const plan = planBuild(state, 'empire', 'mine', where.id);
    expect(plan.error).toMatch(/at work/);
    void shipSpec;
  });
});
