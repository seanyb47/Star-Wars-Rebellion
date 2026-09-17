import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { createRng } from '../rng';
import { setSupport } from '../helpers';
import {
  MOMENTUM_CAP,
  MOMENTUM_PER_SUCCESS,
  PARLEY_CEILING,
  SECURITY_PER_COMPANY,
} from '../constants';
import {
  decayMomentum,
  inciteStanding,
  joinChance,
  momentumFor,
  mutinyChance,
  parleyStanding,
  partyPull,
  politicalSecurity,
  pushMomentum,
  runCycle,
  swingOf,
} from '../politics';
import type { Character, GameState } from '../types';

/**
 * Sean's brief of 17 September, clause by clause.
 *
 * The old system was a bar with a line on it: a parley added a fixed amount
 * every fortnight and an unaligned island joined the day the bar touched
 * eighty. Both halves were certain, so the only question a player ever had was
 * how many fortnights. Every test below is one sentence of the memo that
 * replaced it, asked of the code.
 */

function envoy(state: GameState, over: Partial<Character> = {}): Character {
  const base = state.characters.find((c) => c.faction === 'empire')!;
  return { ...base, id: `t-${Math.random()}`, ...over };
}

function neutralIsland(seed = 601) {
  const state = generateGalaxy(seed, 'empire');
  const island = state.systems.find((s) => s.control === 'neutral' && s.populated)!;
  island.garrison = 0;
  delete island.momentum;
  return { state, island };
}

function heldIsland(seed = 601) {
  const state = generateGalaxy(seed, 'empire');
  const island = state.systems.find(
    (s) => s.control === 'alliance' && s.populated && !s.commanderId,
  )!;
  island.garrison = 0;
  island.uprising = false;
  delete island.momentum;
  return { state, island };
}

describe('who is in the boat', () => {
  /**
   * *"Allow multiple characters to participate... however, apply diminishing
   * returns. Do not allow unlimited stacking to create automatic success."*
   */
  it('counts the second and third hand for something, and never for as much', () => {
    const { state } = neutralIsland();
    const good = envoy(state, { diplomacy: 80, roles: [] });
    const one = partyPull([good], 'diplomacy');
    const two = partyPull([good, { ...good, id: 'b' }], 'diplomacy');
    const four = partyPull([good, { ...good, id: 'b' }, { ...good, id: 'c' }, { ...good, id: 'd' }], 'diplomacy');
    expect(two).toBeGreaterThan(one);
    expect(four).toBeGreaterThan(two);
    // Four of the best diplomat in the world are worth two and a half of him.
    expect(four).toBeLessThan(one * 3);
  });

  it('never stacks a party into a certainty', () => {
    const { state, island } = neutralIsland();
    setSupport(island, 'alliance', 95);
    const best = envoy(state, { diplomacy: 100, roles: ['Diplomat'] });
    const boat = [best, { ...best, id: 'b' }, { ...best, id: 'c' }, { ...best, id: 'd' }];
    expect(parleyStanding(island, 'empire', boat).chance).toBeLessThanOrEqual(PARLEY_CEILING);
  });

  /**
   * A Diplomat along for the ride is a good talker, not a second embassy.
   *
   * Whoever is doing the talking is the best hand aboard, not whoever the
   * order was written for, so the bonus follows the rating — a trained envoy
   * out-talked by a better amateur is a passenger for this purpose.
   */
  it('pays the specialist bonus to the one doing the talking and to nobody else', () => {
    const { state } = neutralIsland();
    const plain = envoy(state, { diplomacy: 70, roles: [] });
    const specialist = envoy(state, { diplomacy: 70, roles: ['Diplomat'], id: 'spec' });
    // Leading it: the bonus is paid.
    expect(partyPull([specialist, plain], 'diplomacy', 'Diplomat')).toBeGreaterThan(
      partyPull([plain, { ...plain, id: 'p2' }], 'diplomacy', 'Diplomat'),
    );
    // Out-talked, and along for the ride: it is not.
    const better = envoy(state, { diplomacy: 90, roles: [], id: 'better' });
    expect(partyPull([better, specialist], 'diplomacy', 'Diplomat')).toBe(
      partyPull([better, plain], 'diplomacy', 'Diplomat'),
    );
    // And a boat full of Diplomats is paid it once, not four times.
    const one = partyPull([specialist], 'diplomacy', 'Diplomat');
    const four = partyPull(
      [specialist, { ...specialist, id: 's2' }, { ...specialist, id: 's3' }, { ...specialist, id: 's4' }],
      'diplomacy',
      'Diplomat',
    );
    expect(four - one).toBeLessThan(plain.diplomacy * 2);
  });
});

describe('what troops are for', () => {
  /**
   * *"A garrison should not directly increase allegiance. Instead, it should
   * make political subversion harder. Troops do not make people love the
   * government. They make it harder for political opposition to act."*
   */
  it('keeps companies out of a parley entirely', () => {
    const { state, island } = neutralIsland();
    const boat = [envoy(state, { diplomacy: 70 })];
    const bare = parleyStanding(island, 'empire', boat).chance;
    island.garrison = 8;
    expect(parleyStanding(island, 'empire', boat).chance).toBe(bare);
  });

  it('puts them in the way of an incitement', () => {
    const { state, island } = heldIsland();
    const boat = [envoy(state, { leadership: 70 })];
    const bare = inciteStanding(state, island, 'empire', boat).chance;
    island.garrison = 6;
    expect(inciteStanding(state, island, 'empire', boat).chance).toBeLessThan(bare);
  });

  it('counts an officer in the chair as security too', () => {
    const { state, island } = heldIsland();
    const bare = politicalSecurity(state, island);
    const officer = state.characters.find((c) => c.faction === 'alliance')!;
    officer.status = 'available';
    island.commanderId = officer.id;
    expect(politicalSecurity(state, island)).toBeGreaterThan(bare);
    // And what he is worth is what he is: a better officer holds it harder.
    const weak = politicalSecurity(state, island);
    officer.leadership = 100;
    expect(politicalSecurity(state, island)).toBeGreaterThan(weak);
  });

  it('prices a company at what a company is worth', () => {
    const { state, island } = heldIsland();
    island.garrison = 3;
    expect(politicalSecurity(state, island)).toBeCloseTo(3 * SECURITY_PER_COMPANY, 5);
  });
});

describe('the two errands', () => {
  /**
   * *"Inciting an enemy-held island should generally be more difficult than
   * diplomatically converting a neutral island."*
   */
  it('makes stirring up an island harder than talking one round', () => {
    const { state, island } = neutralIsland();
    const { island: theirs } = heldIsland();
    // The same person, the same numbers on either side of the argument.
    const talker = envoy(state, { diplomacy: 70, leadership: 70, roles: [] });
    setSupport(island, 'alliance', 40);
    setSupport(theirs, 'alliance', 40);
    const parley = parleyStanding(island, 'empire', [talker]).chance;
    const incite = inciteStanding(state, theirs, 'empire', [talker]).chance;
    expect(incite).toBeLessThan(parley);
  });

  it('says how it looks in words, and the words follow the odds', () => {
    const { state, island } = neutralIsland();
    setSupport(island, 'alliance', 95);
    const hard = parleyStanding(island, 'empire', [envoy(state, { diplomacy: 10, roles: [] })]);
    setSupport(island, 'alliance', 10);
    const easy = parleyStanding(island, 'empire', [envoy(state, { diplomacy: 95, roles: ['Diplomat'] })]);
    expect(hard.band).toBe('very-difficult');
    expect(easy.band).toBe('very-favorable');
    expect(easy.chance).toBeGreaterThan(hard.chance);
  });

  /** The sheet draws pluses. Every factor has to be one of seven values. */
  it('breaks down into marks a sheet can draw and never into a figure', () => {
    const { state, island } = heldIsland();
    island.garrison = 4;
    island.commanderId = state.characters.find((c) => c.faction === 'alliance')!.id;
    pushMomentum(island, 'empire', 10);
    const standing = inciteStanding(state, island, 'empire', [envoy(state, { leadership: 60 })]);
    expect(standing.factors.length).toBeGreaterThan(2);
    for (const factor of standing.factors) {
      expect(Number.isInteger(factor.weight), factor.label).toBe(true);
      expect(Math.abs(factor.weight), factor.label).toBeLessThanOrEqual(3);
      expect(factor.label).not.toMatch(/\d/);
    }
  });
});

describe('momentum', () => {
  /**
   * *"Successful Parley increases it toward the acting faction... momentum
   * gradually decays... it should not become permanent."*
   */
  it('builds toward whoever earned it and reads back the other way for the other side', () => {
    const { island } = neutralIsland();
    pushMomentum(island, 'empire', MOMENTUM_PER_SUCCESS);
    expect(momentumFor(island, 'empire')).toBeGreaterThan(0);
    expect(momentumFor(island, 'alliance')).toBeLessThan(0);
  });

  it('is capped, so no number of good fortnights becomes a guarantee', () => {
    const { island } = neutralIsland();
    for (let i = 0; i < 50; i++) pushMomentum(island, 'empire', MOMENTUM_PER_SUCCESS);
    expect(momentumFor(island, 'empire')).toBe(MOMENTUM_CAP);
  });

  it('is forgotten if nobody keeps it up', () => {
    const { state, island } = neutralIsland();
    pushMomentum(island, 'empire', MOMENTUM_CAP);
    for (let d = 0; d < 400; d++) decayMomentum(state);
    expect(island.momentum).toBeUndefined();
  });

  it('makes the next fortnight on the same island a better one', () => {
    const { state, island } = neutralIsland();
    const boat = [envoy(state, { diplomacy: 60, roles: [] })];
    const cold = parleyStanding(island, 'empire', boat).chance;
    pushMomentum(island, 'empire', MOMENTUM_CAP);
    expect(parleyStanding(island, 'empire', boat).chance).toBeGreaterThan(cold);
  });
});

describe('joining', () => {
  /**
   * *"As allegiance becomes strongly favorable, the probability of the island
   * peacefully joining should increase... but none of these should guarantee
   * conversion."*
   */
  it('climbs with warmth and stops short of certainty at any number', () => {
    const { island } = neutralIsland();
    setSupport(island, 'empire', 60);
    const warmish = joinChance(island, 'empire');
    setSupport(island, 'empire', 85);
    const warm = joinChance(island, 'empire');
    setSupport(island, 'empire', 100);
    const total = joinChance(island, 'empire');
    expect(warm).toBeGreaterThan(warmish);
    expect(total).toBeGreaterThan(warm);
    expect(total).toBeLessThan(1);
  });

  it('is nothing at all on cold ground', () => {
    const { island } = neutralIsland();
    setSupport(island, 'empire', 20);
    expect(joinChance(island, 'empire')).toBe(0);
  });

  it('is never asked of an island somebody already holds', () => {
    const { island } = heldIsland();
    setSupport(island, 'empire', 100);
    expect(joinChance(island, 'empire')).toBe(0);
  });
});

describe('mutiny', () => {
  /**
   * *"Do not make allegiance under thirty an automatic Mutiny trigger. Treat
   * thirty as a major warning threshold... actual Mutiny should be determined
   * by the combination of allegiance, garrison, officer presence, and Incite
   * pressure."*
   */
  it('has no line: a sullen island is a chance, not a morning', () => {
    const { state } = neutralIsland();
    const mine = state.systems.find((s) => s.control === 'empire' && s.populated)!;
    mine.garrison = 0;
    mine.uprising = false;
    setSupport(mine, 'empire', 31);
    const above = mutinyChance(state, mine);
    setSupport(mine, 'empire', 29);
    const below = mutinyChance(state, mine);
    expect(above).toBeGreaterThan(0);
    expect(below).toBeGreaterThan(above);
    expect(below).toBeLessThan(0.2);
  });

  it('is put out by companies in the square', () => {
    const { state } = neutralIsland();
    const mine = state.systems.find((s) => s.control === 'empire' && s.populated)!;
    mine.uprising = false;
    setSupport(mine, 'empire', 10);
    mine.garrison = 0;
    expect(mutinyChance(state, mine)).toBeGreaterThan(0);
    mine.garrison = 10;
    expect(mutinyChance(state, mine)).toBe(0);
  });

  it('is stoked by what agitators have lately been doing there', () => {
    const { state } = neutralIsland();
    const mine = state.systems.find((s) => s.control === 'empire' && s.populated)!;
    mine.uprising = false;
    mine.garrison = 0;
    setSupport(mine, 'empire', 35);
    const quiet = mutinyChance(state, mine);
    pushMomentum(mine, 'alliance', MOMENTUM_CAP);
    expect(mutinyChance(state, mine)).toBeGreaterThan(quiet);
  });

  it('never asks the question of an island nobody holds', () => {
    const { state, island } = neutralIsland();
    setSupport(island, 'empire', 1);
    expect(mutinyChance(state, island)).toBe(0);
  });
});

describe('a fortnight ashore', () => {
  /** *"Do not make failure automatically catastrophic."* */
  it('is usually just a bad fortnight when it goes wrong', () => {
    const standing = { chance: 0.4, band: 'moderate' as const, factors: [] };
    const rng = createRng(4);
    let failures = 0;
    let backfires = 0;
    for (let i = 0; i < 4000; i++) {
      const cycle = runCycle(standing, rng);
      if (!cycle.landed) {
        failures++;
        if (cycle.backfired) backfires++;
      }
    }
    expect(failures).toBeGreaterThan(1000);
    expect(backfires / failures).toBeLessThan(0.4);
  });

  /** Weak, normal, strong, exceptional — as a continuum, not four buckets. */
  it('is worth a different amount every time it lands', () => {
    const standing = { chance: 0.6, band: 'favorable' as const, factors: [] };
    const rng = createRng(5);
    const swings = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const cycle = runCycle(standing, rng);
      if (cycle.landed) swings.add(Math.round(cycle.swing * 100));
    }
    expect(swings.size).toBeGreaterThan(50);
    // A fortnight that barely came off is worth least; one that went
    // beautifully is worth most; and neither is ever nothing.
    expect(swingOf(0.6, 0.599)).toBeLessThan(swingOf(0.6, 0.001));
    expect(swingOf(0.6, 0.599)).toBeGreaterThan(0);
  });
});
