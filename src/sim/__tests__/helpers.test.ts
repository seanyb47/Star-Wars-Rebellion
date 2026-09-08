import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import {
  applySupportChange,
  getSystem,
  requiredGarrison,
  supportMultiplier,
  systemsInSector,
} from '../helpers';
import { createRng } from '../rng';

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(1234);
    const b = createRng(1234);
    const drawsA = Array.from({ length: 10 }, () => a.next());
    const drawsB = Array.from({ length: 10 }, () => b.next());
    expect(drawsA).toEqual(drawsB);
  });

  it('produces different streams for different seeds', () => {
    const a = Array.from({ length: 10 }, createRng(1).next);
    const b = Array.from({ length: 10 }, createRng(2).next);
    expect(a).not.toEqual(b);
  });

  it('keeps draws inside [0, 1)', () => {
    const rng = createRng(99);
    for (let i = 0; i < 500; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('support maths', () => {
  it('scales mine output from 0.75x at 50 support to 1.0x at 100', () => {
    expect(supportMultiplier(50)).toBeCloseTo(0.75);
    expect(supportMultiplier(100)).toBeCloseTo(1);
    expect(supportMultiplier(0)).toBeCloseTo(0.5);
  });

  it('derives the garrison a restless world needs', () => {
    expect(requiredGarrison(50)).toBe(0);
    expect(requiredGarrison(29)).toBe(3);
    expect(requiredGarrison(0)).toBe(5);
  });
});

describe('sector spillover', () => {
  it('applies 20% of a support change to other populated systems in the sector', () => {
    const state = generateGalaxy(7);
    const sector = state.sectors[1];
    const targets = systemsInSector(state, sector.id).filter((s) => s.populated);
    const target = targets[0];
    const neighbour = targets[1];
    target.support.empire = 20;
    neighbour.support.empire = 20;

    applySupportChange(state, target, 'empire', 10);

    expect(target.support.empire).toBeCloseTo(30);
    expect(neighbour.support.empire).toBeCloseTo(22);
  });

  it('does not spill into other sectors', () => {
    const state = generateGalaxy(7);
    const target = getSystem(state, state.sectors[0].systemIds[1]);
    const outsider = getSystem(state, state.sectors[1].systemIds[0]);
    outsider.support.empire = 40;
    applySupportChange(state, target, 'empire', 10);
    expect(outsider.support.empire).toBe(40);
  });

  it('clamps support to 0-100', () => {
    const state = generateGalaxy(7);
    const target = getSystem(state, state.sectors[0].systemIds[1]);
    target.support.empire = 95;
    applySupportChange(state, target, 'empire', 50);
    expect(target.support.empire).toBe(100);
    applySupportChange(state, target, 'empire', -500);
    expect(target.support.empire).toBe(0);
  });
});
