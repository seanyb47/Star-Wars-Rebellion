import { describe, expect, it } from 'vitest';
import { allegianceSegments, segmentsFor } from '../allegiance';
import type { System } from '../../sim';

const island = (control: System['control'], empire: number, alliance: number) =>
  ({ control, support: { empire, alliance } }) as System;

describe('allegiance bar', () => {
  it('puts the faction that holds the island first, whoever has more support', () => {
    // Held by the Crown despite the rebels being more popular: the Crown leads.
    const segments = allegianceSegments(island('empire', 20, 70));
    expect(segments[0].faction).toBe('empire');
    expect(segments[1].faction).toBe('alliance');
  });

  it('puts the rebels first on an island they hold', () => {
    expect(allegianceSegments(island('alliance', 70, 20))[0].faction).toBe('alliance');
  });

  it('leads with the larger share when nobody holds it', () => {
    expect(allegianceSegments(island('neutral', 10, 40))[0].faction).toBe('alliance');
    expect(allegianceSegments(island('neutral', 40, 10))[0].faction).toBe('empire');
  });

  it('gives the undecided remainder to neutral', () => {
    const segments = allegianceSegments(island('empire', 30, 20));
    expect(segments.map((s) => s.faction)).toEqual(['empire', 'alliance', 'neutral']);
    expect(segments[2].pct).toBe(50);
  });

  it('never runs past the end of the bar', () => {
    for (const [e, a] of [[100, 0], [0, 100], [50, 50], [0, 0], [120, -5]]) {
      const total = segmentsFor(e, a, null).reduce((n, s) => n + s.pct, 0);
      expect(total).toBeLessThanOrEqual(100.0001);
    }
  });

  it('drops a side that has no support rather than drawing nothing', () => {
    expect(allegianceSegments(island('empire', 100, 0)).map((s) => s.faction)).toEqual(['empire']);
  });
});
