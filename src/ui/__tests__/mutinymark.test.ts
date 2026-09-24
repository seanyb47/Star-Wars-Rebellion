import { describe, expect, it } from 'vitest';

/**
 * An island in revolt says so, loudly, on both charts.
 *
 * Sean, 24 September: *"We need a mutiny icon like the fleet icon. A charm
 * above any island in mutiny. Or maybe the loyalty bar is on fire lol.
 * Something needs to indicate oh shit. This is in mutiny."*
 *
 * There *was* a mark, and the fact that he asked for one is the whole verdict
 * on it: a small pennant in flat red with no outline, which over a painting is
 * invisible against half the islands in the game.
 */
const UI = import.meta.glob('../{ChainMap.tsx,GalaxyMap.tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const CSS = (
  import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }) as Record<
    string,
    string
  >
)['../styles.css'];

describe('the mark an island in mutiny flies', () => {
  it('is on both charts', () => {
    for (const [file, src] of Object.entries(UI)) {
      expect(src, `${file} draws no mutiny mark`).toMatch(/system\.uprising && explored/);
      expect(src, `${file} does not paint it loudly`).toMatch(/chainmap__flame/);
    }
  });

  it('is drawn in three passes, so it reads on any island', () => {
    // A pale halo outside a dark keyline outside the fill: one of the two is
    // always the one doing the work, whether the island under it is dark water
    // or sunlit rock. The old mark had a flat fill and nothing else.
    for (const [file, src] of Object.entries(UI)) {
      const at = src.indexOf('system.uprising && explored');
      const block = src.slice(at, at + 1600);
      expect(block, `${file} is not three passes`).toMatch(/rgba\(233,244,248/);
      expect(block, `${file} has no keyline`).toMatch(/#04121a/);
      expect(block, `${file} is not in the alarm colour`).toMatch(/var\(--bad\)/);
    }
  });

  it('pulses, and stops for anybody who asked it to', () => {
    expect(CSS).toMatch(/\.chainmap__flame \{[^}]*animation: flame/);
    expect(CSS).toMatch(/@keyframes flame/);
    expect(CSS).toMatch(
      /prefers-reduced-motion: reduce\) \{\s*\.chainmap__flame \{ animation: none; \}/,
    );
  });

  it('goes with everything else under the None filter', () => {
    // Sean's own ruling of 23 September: None leaves island names and nothing.
    expect(UI['../ChainMap.tsx']).toMatch(/system\.uprising && explored && !bare/);
  });

  it('is never flown over an island nobody of yours has seen', () => {
    // You do not know what is happening ashore on an island you have never
    // been to. `explored` is the guard and it is in both.
    for (const src of Object.values(UI)) {
      expect(src).not.toMatch(/system\.uprising && !explored/);
    }
  });
});
