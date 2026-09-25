import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import {
  applyLocalSupport,
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

  it('asks for companies by band: none when firm, a token when steady, four when thin, six in a revolt', () => {
    expect(requiredGarrison(95)).toBe(0);
    expect(requiredGarrison(65)).toBe(1);
    expect(requiredGarrison(59)).toBe(4);
    expect(requiredGarrison(0)).toBe(4);
    expect(requiredGarrison(20, true)).toBe(6);
  });
});

/**
 * The flat spill is gone, at Sean's propagation memo of 17 September: *"do not
 * make every allegiance change affect the region."* What is left in helpers is
 * the plain, local move, and everything that reaches further goes through
 * `applyShock`, which knows how far the news carries and to whom.
 */
describe('moving one island\'s allegiance', () => {
  it('moves that island and nobody else in its chain', () => {
    const state = generateGalaxy(7);
    const sector = state.sectors[1];
    const targets = systemsInSector(state, sector.id).filter((s) => s.populated);
    const target = targets[0];
    const neighbour = targets[1];
    target.support.empire = 20;
    neighbour.support.empire = 20;

    applyLocalSupport(target, 'empire', 10);

    expect(target.support.empire).toBeCloseTo(30);
    expect(neighbour.support.empire).toBeCloseTo(20);
  });

  it('is one balance: what one side wins the other loses', () => {
    const state = generateGalaxy(7);
    const target = getSystem(state, state.sectors[0].systemIds[1]);
    target.support.empire = 40;
    applyLocalSupport(target, 'empire', 15);
    expect(target.support.empire).toBe(55);
    expect(target.support.alliance).toBe(45);
  });

  it('clamps to 0-100, and reports what actually moved', () => {
    const state = generateGalaxy(7);
    const target = getSystem(state, state.sectors[0].systemIds[1]);
    target.support.empire = 95;
    // Five points of room, fifty asked for: five is what moves and five is
    // what comes back, which is what the outcome report prints.
    expect(applyLocalSupport(target, 'empire', 50)).toBe(5);
    expect(target.support.empire).toBe(100);
    expect(applyLocalSupport(target, 'empire', -500)).toBe(-100);
    expect(target.support.empire).toBe(0);
  });
});

