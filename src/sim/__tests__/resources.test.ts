import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import {
  advanceBuilds,
  clearError,
  clearForest,
  planBuild,
  raiseWorks,
  raiseWorksError,
} from '../build';
import { islandIncome } from '../economy';
import { depositsLeft, freeSlots, getSystem, handOver, returnDeposit } from '../helpers';
import { advanceMissions, startMission } from '../missions';
import { createRng } from '../rng';
import { CLEAR_BERTHS, GOLD_PER_DAY, WORKS_ON, YARD_BUILDS } from '../constants';
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
    (s) => s.control === 'empire' && s.facilities.some((f) => f.type === 'training_facility'),
  )!;
  island.deposits = ground.map((type, i) => ({ id: `dep-${i}`, type }));
  island.slots = Math.max(island.slots, island.facilities.length + ground.length + 2);
  state.factions.empire.gold = 5000;
  const yard = island.facilities.find((f) => f.type === 'training_facility')!;
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
   * 40% trees and 10% gold mines"* — and then set the ladder later the same
   * day: *"Gold vein >> 3x, Silver vein >> 2x, Forrest >> mill 1x."*
   *
   * The tenth is still a tenth; it is now split seven parts silver to three
   * gold. So **most islands have some metal** and what makes gold the prize
   * is that most of them do not have *that* — which is the shape the yields
   * ask for, since gold pays triple and silver double.
   *
   * The proportions themselves are measured in `galaxy.test.ts`, against
   * plots rather than islands. What is held here is the shape: timber far and
   * away the common ground, metal on most islands, gold on a minority.
   */
  it('makes timber the common ground and gold the rare one', () => {
    // Counting the ground an island was *given*, worked or not: a settled
    // island opens with some of it already turned into mills, so raw deposits
    // alone would undercount what the roll actually handed out.
    let isles = 0;
    let timber = 0;
    let withMetal = 0;
    let withGold = 0;
    for (let seed = 1; seed <= 12; seed++) {
      for (const s of generateGalaxy(seed, 'empire').systems) {
        isles += 1;
        timber += depositsLeft(s, 'forest') + s.facilities.filter((f) => f.type === 'refinery').length;
        const seams =
          depositsLeft(s, 'silver') + s.facilities.filter((f) => f.type === 'silver_mine').length;
        const veins =
          depositsLeft(s, 'gold') + s.facilities.filter((f) => f.type === 'mine').length;
        if (seams + veins > 0) withMetal += 1;
        if (veins > 0) withGold += 1;
      }
    }
    expect(timber / isles).toBeGreaterThan(1);
    // Metal on a good half of them, and not on all of them.
    expect(withMetal / isles).toBeGreaterThan(0.35);
    expect(withMetal / isles).toBeLessThan(0.85);
    // Gold on a small minority, which is what makes it worth sailing for.
    expect(withGold / isles).toBeLessThan(0.3);
    expect(withGold).toBeLessThan(withMetal);
  });

  it('opens a settled island part-worked and an empty one untouched', () => {
    let settledWorked = 0;
    let settledRaw = 0;
    let settledBare = 0;
    let settled = 0;
    let emptyWorked = 0;
    for (let seed = 1; seed <= 8; seed++) {
      for (const s of generateGalaxy(seed, 'empire').systems) {
        // By what a works *is*, not by naming the two that existed when this
        // was written. Naming them is how this test came to report five bare
        // settled islands the day a third earner was added: the islands were
        // working silver, and the filter could not see a silver mine.
        const worked = s.facilities.filter((f) => WORKS_ON[f.type] !== undefined).length;
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
  it('prices the three rungs apart, in earnings and in days', () => {
    // Sean's ladder of 20 September: *"Gold vein >> 3x, Silver vein >> 2x,
    // Forrest >> mill 1x."* His first pass on gold had corrected itself out
    // loud — *"3x the amount, uh, let's just say 2x"* — and was taken as a
    // correction; this puts the 3x back and pays for it by making gold the
    // scarce rung rather than the common one.
    expect(GOLD_PER_DAY.silver_mine).toBe(GOLD_PER_DAY.refinery * 2);
    expect(GOLD_PER_DAY.mine).toBe(GOLD_PER_DAY.refinery * 3);
    // Deeper ground takes longer to open, in the same order.
    expect(YARD_BUILDS.mine.days).toBeGreaterThan(YARD_BUILDS.silver_mine.days);
    expect(YARD_BUILDS.silver_mine.days).toBeGreaterThan(YARD_BUILDS.refinery.days);
    // And none of the three costs a coin, which is Sean's rule of 17
    // September and the reason the plot is the price.
    expect(YARD_BUILDS.mine.costGold).toBe(0);
    expect(YARD_BUILDS.silver_mine.costGold).toBe(0);
    expect(YARD_BUILDS.refinery.costGold).toBe(0);
  });
});

describe('an earner needs ground under it', () => {
  it('refuses a mill where there is no forest, and a mine where there is no vein', () => {
    const { state, island } = staged(801, ['forest']);
    expect(raiseWorksError(state, island.id, 'refinery', 'empire')).toBeNull();
    expect(raiseWorksError(state, island.id, 'mine', 'empire')).toMatch(/No gold vein/);
  });

  it('refuses a second order against the same single deposit', () => {
    const { state, island } = staged(802, ['gold']);
    expect(raiseWorksError(state, island.id, 'mine', 'empire')).toBeNull();
    raiseWorks(state, island.id, 'mine', 'empire');
    // The vein is taken the day it is ordered, not the day the shaft opens.
    expect(depositsLeft(island, 'gold')).toBe(0);
    expect(raiseWorksError(state, island.id, 'mine', 'empire')).toMatch(/No gold vein/);
  });

  it('takes the deposit when the works finishes, and no berth beside it', () => {
    const { state, island } = staged(803, ['forest', 'forest']);
    const room = freeSlots(island);
    const built = island.facilities.length;
    raiseWorks(state, island.id, 'refinery', 'empire');
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

  it('never sends builders anywhere, because a works is raised where it goes', () => {
    /*
     * This used to be the opposite test. A yard on one island could take an
     * order for ground on another and ship the builders over, which is what
     * kept the opponent from stalling on islands with no yard of their own.
     *
     * Sean cut the yard on 20 September — *"That way buildings are never
     * traveling"* — so the answer to "who builds on that island" is now "that
     * island", and the passage is gone with the question.
     */
    const { state, island } = staged(805, []);
    const there = state.systems.find(
      (s) => s.control === 'empire' && s.id !== island.id && !s.uprising,
    )!;
    there.deposits = [{ id: 'dep-far', type: 'gold' }];
    there.slots = Math.max(there.slots, there.facilities.length + 2);

    // The island with no vein cannot have a mine; the one with the vein can,
    // and neither answer involves the other island at all.
    expect(raiseWorksError(state, island.id, 'mine', 'empire')).toMatch(/No gold vein/);
    expect(raiseWorksError(state, there.id, 'mine', 'empire')).toBeNull();

    const plan = planBuild(state, 'empire', 'mine', there.id);
    expect(plan.error).toBeNull();
    expect(plan.travel).toBe(0);
    expect(plan.fromSystemId).toBe(there.id);

    raiseWorks(state, there.id, 'mine', 'empire');
    for (let d = 0; d < YARD_BUILDS.mine.days + 1; d++) advanceBuilds(state);
    expect(getSystem(state, there.id).facilities.some((f) => f.type === 'mine')).toBe(true);
    expect(depositsLeft(getSystem(state, there.id), 'gold')).toBe(0);
  });

  it('a full island can still work ground it has', () => {
    const { state, island } = staged(806, ['forest']);
    // Not one open plot, and one forest standing.
    island.slots = island.facilities.length + 1;
    expect(freeSlots(island)).toBe(0);
    expect(raiseWorksError(state, island.id, 'shipyard', 'empire')).toMatch(/No room left/);
    expect(raiseWorksError(state, island.id, 'refinery', 'empire')).toBeNull();
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
    const { state, island } = staged(811, ['forest', 'forest']);
    island.slots = island.facilities.length + 2;
    expect(raiseWorksError(state, island.id, 'shipyard', 'empire')).toMatch(/No room left/);
    clearForest(state, island.id, 'empire');
    expect(raiseWorksError(state, island.id, 'shipyard', 'empire')).toBeNull();
  });

  it('will not fell a vein, or a forest an order is already sailing for', () => {
    const { state, island } = staged(812, ['gold']);
    expect(clearError(state, island.id, 'empire')).toMatch(/no forest/i);

    // And a stand a mill is already going up on is gone from the ground the
    // day the order is placed, so there is nothing left to fell.
    const one = staged(813, ['forest']);
    raiseWorks(one.state, one.island.id, 'refinery', 'empire');
    expect(clearError(one.state, one.island.id, 'empire')).toMatch(/no forest/i);
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
    const { state, island } = staged(815, ['forest']);
    const mill = { id: 'f-mill', type: 'refinery' as const, owner: 'empire' as const };
    island.facilities.push(mill);
    handOver(state, island, 'alliance');
    expect(island.facilities.every((f) => f.owner === 'alliance')).toBe(true);
  });

  it('but not what was still being built', () => {
    const { state, island } = staged(816, ['forest']);
    const standing = island.facilities.length;
    raiseWorks(state, island.id, 'refinery', 'empire');
    handOver(state, island, 'alliance');
    // What was finished changes hands; a works half raised does not — it comes
    // down, and the ground it had taken goes back for the new holder.
    expect(island.facilities).toHaveLength(standing);
    expect(island.facilities.every((f) => f.building === undefined)).toBe(true);
    expect(depositsLeft(island, 'forest')).toBe(1);
  });
});

describe('resources never run out', () => {
  it('a worked deposit keeps earning for ever', () => {
    const { state, island } = staged(817, ['forest']);
    raiseWorks(state, island.id, 'refinery', 'empire');
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
