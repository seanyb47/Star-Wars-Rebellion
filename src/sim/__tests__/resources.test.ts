import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import {
  advanceBuilds,
  buildError,
  clearError,
  clearForest,
  openDeposits,
  planBuild,
  queueBuild,
} from '../build';
import { islandIncome } from '../economy';
import { depositsLeft, freeSlots, getSystem, handOver, returnDeposit } from '../helpers';
import { advanceMissions, startMission, travelDays } from '../missions';
import { createRng } from '../rng';
import { CLEAR_BERTHS, GOLD_PER_DAY, YARD_BUILDS } from '../constants';
import type { GameState, System } from '../types';

/**
 * Sean's rule, 16 September:
 *
 * > All islands should have raw resources on them — forests, gold. These
 * > should be randomly assigned to each island, and Lumber Mills and Gold
 * > Mines can only be deployed on them. They replace the raw resource.
 * > Because it doesn't make sense that you can just put gold mines anywhere
 * > and print money.
 */

/** An island of ours with a yard on it, and known ground. */
function staged(seed: number, ground: Array<'forest' | 'gold'>) {
  const state = generateGalaxy(seed, 'empire');
  const island = state.systems.find(
    (s) => s.control === 'empire' && s.facilities.some((f) => f.type === 'construction_yard'),
  )!;
  island.deposits = ground.map((type, i) => ({ id: `dep-${i}`, type }));
  island.slots = Math.max(island.slots, island.facilities.length + ground.length + 2);
  state.factions.empire.gold = 5000;
  const yard = island.facilities.find((f) => f.type === 'construction_yard')!;
  return { state, island, yard };
}

describe('what is in the ground', () => {
  it('gives every island something, and leaves every island somewhere to build', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const state = generateGalaxy(seed, 'empire');
      for (const s of state.systems) {
        expect(s.deposits, s.name).toBeDefined();
        // Never so much ground that the island cannot raise the works that
        // would work it.
        expect(freeSlots(s), s.name).toBeGreaterThanOrEqual(0);
        expect(s.slots - (s.deposits?.length ?? 0), s.name).toBeGreaterThanOrEqual(CLEAR_BERTHS);
      }
    }
  });

  /**
   * Timber is common and gold is the *smaller share*, which is not the same
   * as scarce.
   *
   * This test asked for gold on about one island in four until 20 September,
   * when Sean set the ground by share instead of by flat count — *"on average
   * 50% of available land should be either gold mines or trees slash coral...
   * 40% trees and 10% gold mines"*. Ten per cent of a nine-plot island is
   * about one vein, so **most islands now have some gold** and what makes it
   * the lesser resource is how much of the island it is, not how many islands
   * it is on. The old bound said the opposite and would have failed the new
   * rule for being the new rule.
   *
   * The proportions themselves are measured in `galaxy.test.ts`, against
   * plots rather than islands. What is held here is the shape: timber four to
   * one over gold, and gold on most islands but never much of one.
   */
  it('makes timber the common ground and gold the lesser share', () => {
    // Counting the ground an island was *given*, worked or not: a settled
    // island opens with some of it already turned into mills, so raw deposits
    // alone would undercount what the roll actually handed out.
    let isles = 0;
    let timber = 0;
    let withGold = 0;
    for (let seed = 1; seed <= 12; seed++) {
      for (const s of generateGalaxy(seed, 'empire').systems) {
        isles += 1;
        timber += depositsLeft(s, 'forest') + s.facilities.filter((f) => f.type === 'refinery').length;
        const veins =
          depositsLeft(s, 'gold') + s.facilities.filter((f) => f.type === 'mine').length;
        if (veins > 0) withGold += 1;
      }
    }
    expect(timber / isles).toBeGreaterThan(2);
    // On most islands, and not on all of them.
    expect(withGold / isles).toBeGreaterThan(0.5);
    expect(withGold / isles).toBeLessThan(0.9);
  });

  it('opens a settled island part-worked and an empty one untouched', () => {
    let settledWorked = 0;
    let settledRaw = 0;
    let settledBare = 0;
    let settled = 0;
    let emptyWorked = 0;
    for (let seed = 1; seed <= 8; seed++) {
      for (const s of generateGalaxy(seed, 'empire').systems) {
        const worked = s.facilities.filter(
          (f) => f.type === 'mine' || f.type === 'refinery',
        ).length;
        if (!s.populated) {
          // Nobody's, and nobody on it. A side's *own* starting island can be
          // an uninhabited rock, and since 20 September those carry timber
          // like anywhere else, so the opening deal will put a mill on one —
          // which earns, because `isProductive` asks who holds an island
          // rather than who lives on it. That is a holder working their own
          // ground, not the generator touching the frontier, and counting it
          // here made this read as three untouched islands touched.
          if (s.control === 'neutral') emptyWorked += worked;
          continue;
        }
        if (s.control !== 'neutral') continue;
        settled += 1;
        settledWorked += worked;
        settledRaw += (s.deposits ?? []).length;
        if (worked === 0) settledBare += 1;
      }
    }
    // Some of it, not all of it: every settled island is working, and every
    // one of them has something left for a new holder to do.
    expect(settledWorked / settled).toBeGreaterThan(1);
    expect(settledRaw / settled).toBeGreaterThan(1);
    expect(settledBare).toBe(0);
    // And nobody has touched the frontier: an island with no people on it has
    // nobody to work its ground, however much of it there now is.
    expect(emptyWorked).toBe(0);
  });

  /**
   * A vein is worth more than a stand of timber, and since Sean's word of
   * 17 September neither costs anything to work. What separates them now is
   * what they earn and how long they take to raise — the price was the third
   * lever and it is gone, because the early game is meant to be short of
   * time and ground rather than of coin.
   */
  it('prices a vein above a stand of timber, in earnings and in days', () => {
    // Double, exactly, since 20 September. Sean: *"it produces like, you
    // know, 3x the amount, uh, let's just say 2x the amount."* It was three
    // times, which was priced for a world holding twelve veins; there are
    // four times as many now, so the multiple came down as the count went up.
    expect(GOLD_PER_DAY.mine).toBe(GOLD_PER_DAY.refinery * 2);
    expect(YARD_BUILDS.mine.days).toBeGreaterThan(YARD_BUILDS.refinery.days);
    expect(YARD_BUILDS.mine.costGold).toBe(0);
    expect(YARD_BUILDS.refinery.costGold).toBe(0);
  });
});

describe('an earner needs ground under it', () => {
  it('refuses a mill where there is no forest, and a mine where there is no vein', () => {
    const { state, yard } = staged(801, ['forest']);
    expect(buildError(state, yard.id, 'refinery')).toBeNull();
    expect(buildError(state, yard.id, 'mine')).toMatch(/No gold vein/);
  });

  it('refuses a second order against the same single deposit', () => {
    const { state, island, yard } = staged(802, ['gold']);
    expect(buildError(state, yard.id, 'mine')).toBeNull();
    queueBuild(state, yard.id, 'mine');
    expect(openDeposits(state, island, 'gold')).toBe(0);
    const other = state.systems
      .flatMap((s) => s.facilities)
      .find((f) => f.type === 'construction_yard' && f.owner === 'empire' && !f.building);
    if (other) expect(buildError(state, other.id, 'mine', island.id)).toMatch(/spoken for/);
  });

  it('takes the deposit when the works finishes, and no berth beside it', () => {
    const { state, island, yard } = staged(803, ['forest', 'forest']);
    const room = freeSlots(island);
    const built = island.facilities.length;
    queueBuild(state, yard.id, 'refinery');
    for (let d = 0; d < YARD_BUILDS.refinery.days + 1; d++) advanceBuilds(state);
    const after = getSystem(state, island.id);
    expect(after.facilities).toHaveLength(built + 1);
    expect(depositsLeft(after, 'forest')).toBe(1);
    // The mill stands where the forest stood: the island is no fuller.
    expect(freeSlots(after)).toBe(room);
  });

  it('gives the ground back when somebody burns the works', () => {
    // Somebody else's island in revolt, with one mill on it and nothing else
    // worth burning: the shape sabotage is for.
    const state = generateGalaxy(804, 'empire');
    const island = state.systems.find((s) => s.control === 'alliance' && s.populated)!;
    island.uprising = true;
    island.facilities = [{ id: 'f-mill', type: 'refinery', owner: 'alliance' }];
    island.deposits = [];
    island.explored.empire = true;
    const agent = state.characters.find((c) => c.faction === 'empire' && c.status === 'available')!;
    agent.espionage = 100;
    agent.locationSystemId = island.id;

    // Seeds until one lands: the point is what is left behind, not the odds.
    let burnt = false;
    for (let seed = 1; seed <= 80 && !burnt; seed++) {
      const copy: GameState = JSON.parse(JSON.stringify(state));
      const isle = getSystem(copy, island.id);
      startMission(copy, agent.id, island.id, 'sabotage');
      const rng = createRng(seed);
      for (let d = 0; d < 80 && isle.facilities.length > 0; d++) advanceMissions(copy, rng);
      if (isle.facilities.length === 0) {
        burnt = true;
        // The mill burned; the forest it was cutting is standing again.
        expect(depositsLeft(isle, 'forest')).toBe(1);
      }
    }
    expect(burnt).toBe(true);
  });

  it('lets a yard send builders to ground on another island', () => {
    const { state, island, yard } = staged(805, []);
    const there = state.systems.find(
      (s) => s.control === 'empire' && s.id !== island.id && !s.uprising,
    )!;
    there.deposits = [{ id: 'dep-far', type: 'gold' }];
    there.slots = Math.max(there.slots, there.facilities.length + 2);
    expect(buildError(state, yard.id, 'mine')).toMatch(/No gold vein/);
    expect(buildError(state, yard.id, 'mine', there.id)).toBeNull();

    const plan = planBuild(state, 'empire', 'mine', there.id);
    expect(plan.error).toBeNull();
    queueBuild(state, plan.facilityId!, 'mine', there.id);
    const total = YARD_BUILDS.mine.days + travelDays(state, island.id, there.id) + 10;
    for (let d = 0; d < total; d++) advanceBuilds(state);
    expect(getSystem(state, there.id).facilities.some((f) => f.type === 'mine')).toBe(true);
    expect(depositsLeft(getSystem(state, there.id), 'gold')).toBe(0);
  });

  it('a full island can still work ground it has', () => {
    const { state, island, yard } = staged(806, ['forest']);
    // Not one open plot, and one forest standing.
    island.slots = island.facilities.length + 1;
    expect(freeSlots(island)).toBe(0);
    expect(buildError(state, yard.id, 'shipyard')).toMatch(/No room left/);
    expect(buildError(state, yard.id, 'refinery')).toBeNull();
  });
});

describe('felling timber', () => {
  it('opens the plot, and the forest does not come back', () => {
    const { state, island } = staged(810, ['forest', 'forest', 'gold']);
    island.slots = island.facilities.length + 3;
    expect(freeSlots(island)).toBe(0);

    expect(clearError(state, island.id, 'empire')).toBeNull();
    clearForest(state, island.id, 'empire');
    expect(depositsLeft(island, 'forest')).toBe(1);
    expect(freeSlots(island)).toBe(1);
    // Gone for good: nothing puts a cleared stand back.
    for (let d = 0; d < 400; d++) advanceBuilds(state);
    expect(depositsLeft(island, 'forest')).toBe(1);
  });

  it('makes room for something that is not a mill', () => {
    const { state, island, yard } = staged(811, ['forest', 'forest']);
    island.slots = island.facilities.length + 2;
    expect(buildError(state, yard.id, 'shipyard')).toMatch(/No room left/);
    clearForest(state, island.id, 'empire');
    expect(buildError(state, yard.id, 'shipyard')).toBeNull();
  });

  it('will not fell a vein, or a forest an order is already sailing for', () => {
    const { state, island, yard } = staged(812, ['gold']);
    expect(clearError(state, island.id, 'empire')).toMatch(/no forest/i);

    const one = staged(813, ['forest']);
    queueBuild(one.state, one.yard.id, 'refinery');
    expect(clearError(one.state, one.island.id, 'empire')).toMatch(/spoken for/);
    void yard;
  });

  it('is refused on ground that is not yours, or in revolt', () => {
    const { state, island } = staged(814, ['forest']);
    island.uprising = true;
    expect(clearError(state, island.id, 'empire')).toMatch(/mutiny/);
    island.uprising = false;
    island.control = 'alliance';
    expect(clearError(state, island.id, 'empire')).toMatch(/do not hold/);
  });
});

describe('an island changes hands with what is on it', () => {
  it('hands the works to whoever takes the island', () => {
    const { island } = staged(815, ['forest']);
    const mill = { id: 'f-mill', type: 'refinery' as const, owner: 'empire' as const };
    island.facilities.push(mill);
    handOver(island, 'alliance');
    expect(island.facilities.every((f) => f.owner === 'alliance')).toBe(true);
  });

  it('but not what was still being built', () => {
    const { state, island, yard } = staged(816, ['forest']);
    queueBuild(state, yard.id, 'refinery');
    const built = island.facilities.length;
    handOver(island, 'alliance');
    // The yard stands and changes hands; its order does not.
    expect(island.facilities).toHaveLength(built);
    expect(island.facilities.every((f) => f.building === undefined)).toBe(true);
    // And the forest it was going to cut is still there for the new holder.
    expect(depositsLeft(island, 'forest')).toBe(1);
  });
});

describe('resources never run out', () => {
  it('a worked deposit keeps earning for ever', () => {
    const { state, island, yard } = staged(817, ['forest']);
    queueBuild(state, yard.id, 'refinery');
    for (let d = 0; d < YARD_BUILDS.refinery.days + 1; d++) advanceBuilds(state);
    const live = getSystem(state, island.id);
    const mill = live.facilities.find((f) => f.type === 'refinery')!;
    const early = islandIncome(live, 'empire');
    expect(early).toBeGreaterThan(0);
    // Two thousand days later it is the same mill earning the same money.
    for (let d = 0; d < 2000; d++) advanceBuilds(state);
    expect(live.facilities.some((f) => f.id === mill.id)).toBe(true);
    expect(islandIncome(live, 'empire')).toBeCloseTo(early, 5);
  });
});

describe('the opponent reads the ground', () => {
  it('works nearly all of it, and does not sit on a purse instead', () => {
    // A long war, then look at what is left standing on the ground it holds.
    let state: GameState = generateGalaxy(807, 'empire');
    for (let d = 0; d < 500 && !state.winner; d++) state = advanceDayFor(state);
    const theirs = state.systems.filter((s) => s.control === 'alliance');
    const standing = theirs.reduce((n, s: System) => n + depositsLeft(s, 'forest'), 0);
    const worked = theirs.reduce(
      (n, s) => n + s.facilities.filter((f) => f.type === 'refinery' || f.type === 'mine').length,
      0,
    );
    expect(worked).toBeGreaterThan(standing);
  });
});

// Imported late so the describe blocks above read as the rule they are about.
import { advanceDay as advanceDayFor } from '../advanceDay';
void returnDeposit;
