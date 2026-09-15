import { describe, expect, it } from 'vitest';
import { allegianceSegments, segmentsFor } from '../allegiance';
import type { System } from '../../sim';

const island = (control: System['control'], empire: number, alliance: number) =>
  ({ control, support: { empire, alliance } }) as System;

describe('allegiance bar', () => {
  it('orders by size, largest first', () => {
    expect(segmentsFor(30, 70).map((s) => s.faction)).toEqual(['alliance', 'empire']);
    expect(segmentsFor(70, 30).map((s) => s.faction)).toEqual(['empire', 'alliance']);
  });

  it('ignores who holds the island', () => {
    // The same two numbers must draw the same way whoever is flying a flag
    // over them, or the bar cannot be read without checking a third thing.
    const held = allegianceSegments(island('empire', 20, 70));
    const contested = allegianceSegments(island('alliance', 20, 70));
    const nobody = allegianceSegments(island('neutral', 20, 70));
    expect(held).toEqual(contested);
    expect(held).toEqual(nobody);
    expect(held[0].faction).toBe('alliance');
  });

  it('has no undecided share to sort: the two always fill the bar', () => {
    // Nobody has made their mind up here, so blue leads.
    expect(segmentsFor(20, 10).map((s) => s.faction)).toEqual(['empire', 'alliance']);
    expect(segmentsFor(20, 10).reduce((n, x) => n + x.pct, 0)).toBeCloseTo(100);
  });

  it('drops a share of nothing rather than drawing a sliver', () => {
    expect(segmentsFor(100, 0).map((s) => s.faction)).toEqual(['empire']);
    expect(segmentsFor(60, 40).map((s) => s.faction)).toEqual(['empire', 'alliance']);
  });

  it('never runs past the end of the bar', () => {
    for (const [e, a] of [[100, 0], [0, 100], [50, 50], [0, 0], [120, -5], [80, 80]]) {
      const total = segmentsFor(e, a).reduce((n, s) => n + s.pct, 0);
      expect(total).toBeLessThanOrEqual(100.0001);
    }
  });

  it('breaks ties the same way every time', () => {
    expect(segmentsFor(50, 50).map((s) => s.faction)).toEqual(['empire', 'alliance']);
  });
});

describe('when both sides are popular at once', () => {
  it('shows the balance between them rather than overflowing', () => {
    // Support is two independent 0–100 numbers; nothing stops both being high.
    const segments = segmentsFor(80, 80);
    expect(segments.reduce((n, s) => n + s.pct, 0)).toBeCloseTo(100);
    expect(segments).toHaveLength(2);
    expect(segments[0].pct).toBeCloseTo(50);
  });

  it('keeps the stronger side first when it scales them', () => {
    const segments = segmentsFor(70, 60);
    expect(segments[0].faction).toBe('empire');
    expect(segments[0].pct).toBeGreaterThan(segments[1].pct);
    expect(segments.reduce((n, s) => n + s.pct, 0)).toBeCloseTo(100);
  });
});
