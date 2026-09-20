import { describe, expect, it } from 'vitest';
import {
  BUILDING_ORDER,
  FACILITY_BLURB,
  FACILITY_LABEL,
  GOLD_PER_DAY,
  RESOURCE_BLURB,
  RESOURCE_LABEL,
  RESOURCE_TYPES,
  UPKEEP_PER_DAY,
  WORKS_ON,
  YARD_BUILDABLE,
  YARD_BUILDS,
} from '../constants';
import type { FacilityType, ResourceType } from '../types';

/**
 * Every hand-written list of every kind of thing is actually every kind.
 *
 * Adding the Silver Mine cost four separate bugs of exactly one shape, and
 * none of them were type errors:
 *
 * - it was missing from `YARD_BUILDABLE`, so it could not be built at all and
 *   the Build sheet simply did not mention it;
 * - the Buildings board and the encyclopedia each wrote `['forest', 'gold']
 *   as const` and so drew two kinds of ground out of three;
 * - `resources.test.ts` counted earners as `type === 'mine' || type ===
 *   'refinery'` and reported five settled islands as bare, because they were
 *   working silver and the filter could not see it.
 *
 * A `Record<FacilityType, …>` is checked by the compiler and cannot go
 * stale. A `FacilityType[]` is just an array and will happily be short by one
 * forever. So the arrays are checked here, against the records — which is the
 * only enumeration of the union that exists at runtime.
 */
const EVERY_WORKS = Object.keys(FACILITY_LABEL) as FacilityType[];

describe('every list of works covers every works', () => {
  it('has more than a couple, so this is not passing on an empty set', () => {
    expect(EVERY_WORKS.length).toBeGreaterThan(5);
    expect(RESOURCE_TYPES.length).toBeGreaterThan(2);
  });

  it('can order every one of them from a yard', () => {
    expect([...YARD_BUILDABLE].sort()).toEqual([...EVERY_WORKS].sort());
  });

  it('has a place in the display order for every one of them', () => {
    expect([...BUILDING_ORDER].sort()).toEqual([...EVERY_WORKS].sort());
  });

  it('prices, pays and names every one of them', () => {
    for (const type of EVERY_WORKS) {
      expect(YARD_BUILDS[type], type).toBeTruthy();
      expect(FACILITY_BLURB[type], type).toBeTruthy();
      expect(typeof GOLD_PER_DAY[type], type).toBe('number');
      expect(typeof UPKEEP_PER_DAY[type], type).toBe('number');
    }
  });
});

describe('every list of ground covers every kind of ground', () => {
  it('names and describes each one', () => {
    const named = Object.keys(RESOURCE_LABEL) as ResourceType[];
    expect([...RESOURCE_TYPES].sort()).toEqual([...named].sort());
    for (const type of RESOURCE_TYPES) expect(RESOURCE_BLURB[type], type).toBeTruthy();
  });

  it('gives every kind of ground exactly one works that can work it', () => {
    for (const type of RESOURCE_TYPES) {
      const works = EVERY_WORKS.filter((w) => WORKS_ON[w] === type);
      expect(works, `nothing can work ${type}`).toHaveLength(1);
      // And it earns something, or there would be no reason to raise it.
      expect(GOLD_PER_DAY[works[0]], works[0]).toBeGreaterThan(0);
    }
  });

  it('keeps the earners a ladder, poorest ground first', () => {
    const yields = RESOURCE_TYPES.map(
      (type) => GOLD_PER_DAY[EVERY_WORKS.find((w) => WORKS_ON[w] === type)!],
    );
    // Sorted, so `RESOURCE_TYPES` really is in the order it claims.
    expect(yields).toEqual([...yields].sort((a, b) => a - b));

    /*
     * Three rungs, not four.
     *
     * Timber and living coral share the bottom one on purpose — Sean's deposit
     * math brackets them as one outcome, *"forest / living coral (coral reef
     * only)"*, because coral is not a fourth kind of ground so much as what
     * the staple is called in the one Reach where nothing grows. So the rule
     * is about the distinct heights, and what the test forbids is a rung
     * nobody can tell from its neighbour by anything but its name.
     */
    const rungs = [...new Set(yields)].sort((a, b) => a - b);
    expect(rungs).toHaveLength(3);
    expect(rungs[1]).toBe(rungs[0] * 2);
    expect(rungs[2]).toBe(rungs[0] * 3);

    // And the two that share a rung are the two that are meant to.
    const bottom = RESOURCE_TYPES.filter(
      (t) => GOLD_PER_DAY[EVERY_WORKS.find((w) => WORKS_ON[w] === t)!] === rungs[0],
    );
    expect([...bottom].sort()).toEqual(['coral', 'forest']);
  });
});
