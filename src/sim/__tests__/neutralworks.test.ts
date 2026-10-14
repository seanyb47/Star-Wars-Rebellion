import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { NEUTRAL_WORKS, NEUTRAL_WORKS_ONE, NEUTRAL_WORKS_TWO, FACILITY_CRAFT } from '../constants';
import type { System } from '../types';

/**
 * Sean, 20 September: *"Neutral islands also should have infrastructure.
 * Should have a 20% chance of having 1 of each starting (non research
 * dependent) structure, including fortress (standard not heavy) and a 5%
 * chance of having 2."*
 *
 * The rates are the whole of the instruction, so they are what is measured.
 * The first cut of this came out at nine to twelve per cent because the works
 * were being placed only where a berth happened to be spare, and a settled
 * island is mostly spoken for already — which is exactly the kind of quiet
 * shortfall a comment claiming "one in five" would never have caught.
 */
const settled = (seeds: number): System[] => {
  const out: System[] = [];
  for (let seed = 1; seed <= seeds; seed++) {
    for (const s of generateGalaxy(seed, 'empire').systems) {
      if (s.populated && s.control === 'neutral') out.push(s);
    }
  }
  return out;
};

describe('a settled island nobody owns has built something', () => {
  const islands = settled(40);
  const want = NEUTRAL_WORKS_ONE + 2 * NEUTRAL_WORKS_TWO;

  it('carries each works at the rate it was asked for', () => {
    expect(islands.length).toBeGreaterThan(900);
    for (const type of NEUTRAL_WORKS) {
      const each = islands.map((s) => s.facilities.filter((f) => f.type === type).length);
      const mean = each.reduce((n, v) => n + v, 0) / islands.length;
      // 0.30 per island: a fifth of them with one and a twentieth with two.
      expect(mean, type).toBeGreaterThan(want - 0.05);
      expect(mean, type).toBeLessThan(want + 0.05);
      // And never three.
      expect(Math.max(...each), type).toBeLessThanOrEqual(2);
    }
  });

  it('never gives one the works that waits on research', () => {
    const gated = Object.keys(FACILITY_CRAFT);
    expect(gated).toContain('heavy_fort');
    for (const s of islands) {
      for (const f of s.facilities) expect(gated).not.toContain(f.type);
    }
  });

  it('leaves every one of them a berth to build on', () => {
    for (const s of islands) {
      expect(s.slots, s.name).toBeGreaterThan(s.facilities.length + (s.deposits ?? []).length - 1);
    }
  });

  it('keeps the works off the islands the two sides are dealt', () => {
    // The rule is about islands that stay neutral. Running it during
    // generation, when every island is briefly unaligned, put yards and walls
    // on the sides' own openings and took the Crown from 75 upkeep to 91
    // against an unchanged income of 83 — both sides opening insolvent.
    for (let seed = 1; seed <= 12; seed++) {
      const state = generateGalaxy(seed, 'empire');
      for (const f of ['empire', 'alliance'] as const) {
        expect(state.factions[f].income, `${f} seed ${seed}`).toBeGreaterThan(
          state.factions[f].upkeep,
        );
      }
    }
  });
});
