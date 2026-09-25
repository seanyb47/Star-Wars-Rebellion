import { describe, expect, it } from 'vitest';
import islandArt from '../../data/island-art.json';
import reaches from '../../data/reaches.json';

/**
 * Sean, 20 September, looking at the encyclopedia's Locations grid:
 *
 * > *"Looks like encyclopedia can fit about 8 per scroll. Let's try to space
 * > unique art so that for most part you're not seeing tons of duplicates in
 * > same 8 location block. A few is fine. But shouldn't be a bunch."*
 *
 * Thirty-two paintings for sixty-three islands means repeats are unavoidable;
 * what is avoidable is several of them on screen at once. `island_art.py` walks
 * the islands in the order the grid shows them — alphabetically — and hands
 * each borrower the painting that has been off screen longest. This holds that
 * result, because the failure is silent: nothing breaks, the page just looks
 * cheap again.
 */
const WINDOW = islandArt.window;
const ART = islandArt.art as Record<string, string>;
const NAMES = reaches.reaches.flatMap((r) => r.islands.map((i) => i.name)).sort();

describe('paintings are spaced down the Locations grid', () => {
  it('covers every island exactly once', () => {
    expect(Object.keys(ART).sort()).toEqual(NAMES);
  });

  it('never shows the same painting more than twice in one screen of eight', () => {
    const arts = NAMES.map((n) => ART[n]);
    for (let start = 0; start + WINDOW <= arts.length; start += 1) {
      const win = arts.slice(start, start + WINDOW);
      const counts = new Map<string, number>();
      for (const a of win) counts.set(a, (counts.get(a) ?? 0) + 1);
      const worst = Math.max(...counts.values());
      expect(worst, `${NAMES[start]}…: ${win.join(', ')}`).toBeLessThanOrEqual(2);
      // And at most one repeated painting in the window, so a screen never
      // reads as a wall of the same picture.
      expect(new Set(win).size, `${NAMES[start]}…`).toBeGreaterThanOrEqual(WINDOW - 1);
    }
  });

  it('is not vacuous: most islands really are distinct across a screen', () => {
    expect(NAMES.length).toBeGreaterThan(60);
    expect(islandArt.worstDistinctPerWindow).toBeGreaterThanOrEqual(WINDOW - 1);
    expect(islandArt.meanDistinctPerWindow).toBeGreaterThan(7.5);
  });

  /** Never two neighbours in the grid wearing the same picture. */
  it('never puts the same painting on two islands side by side', () => {
    const arts = NAMES.map((n) => ART[n]);
    for (let i = 1; i < arts.length; i += 1) {
      expect(arts[i], `${NAMES[i - 1]} then ${NAMES[i]}`).not.toBe(arts[i - 1]);
    }
  });

  /**
   * `island_art.py` keeps its own copy of the sim's LOOKS table, because a
   * Python script cannot import a TypeScript constant. A copy is a thing that
   * drifts, and the drift would be invisible: islands would quietly start
   * borrowing paintings made for the wrong kind of place. So the copy is
   * checked against the original rather than trusted.
   */
  it('borrows against the same archetype table the world is built from', () => {
    const galaxy = (
      import.meta.glob('../../sim/galaxy.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    )['../../sim/galaxy.ts'];
    const script = (
      import.meta.glob('../../../scripts/island_art.py', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    )['../../../scripts/island_art.py'];
    expect(galaxy && script).toBeTruthy();

    const table = (src: string, open: string) => {
      const body = src.slice(src.indexOf(open) + open.length);
      const rows = body.slice(0, body.indexOf('}')).matchAll(/'([^']+)':\s*\[([^\]]+)\]/g);
      return Object.fromEntries(
        [...rows].map(([, sea, list]) => [sea, list.match(/'([^']+)'/g)!.map((s) => s.slice(1, -1))]),
      );
    };
    const fromSim = table(galaxy, 'const LOOKS: Record<string, IslandArchetype[]> = {');
    const fromScript = table(script, 'LOOKS = {');
    expect(Object.keys(fromSim)).toHaveLength(7);
    expect(fromScript).toEqual(fromSim);
  });
});
