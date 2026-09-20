import { describe, expect, it } from 'vitest';
import reaches from '../../data/reaches.json';
import { slugify } from '../painted';

/**
 * The island paintings Sean sent on 20 September, one per named island.
 *
 * `paintedIsle(name)` is a filename lookup: drop `src/art/isles/<slug>.webp`
 * in and that island wears it, in front of its archetype. Nothing checks the
 * slug, so a painting filed under a misremembered or misspelt island name is
 * dead weight that ships in the bundle and never appears — silently, which is
 * the worst way for art to fail. This is the check.
 */
const ISLES = import.meta.glob('../../art/isles/*.webp', { eager: true, query: '?url' });

/** Freeport is not in `reaches.json`: it is a name the game gives at runtime to
 *  one uncharted outer island, and it has a painting of its own. */
const RUNTIME_NAMES = ['Freeport'];

function islandSlugs(): Set<string> {
  const names = reaches.reaches.flatMap((r) => r.islands.map((i) => i.name));
  return new Set([...names, ...RUNTIME_NAMES].map(slugify));
}

function paintedSlugs(): string[] {
  return Object.keys(ISLES).map((p) => p.split('/').pop()!.replace('.webp', ''));
}

describe("an island's own painting", () => {
  it('is filed under a name some island actually has', () => {
    const real = islandSlugs();
    for (const slug of paintedSlugs()) {
      expect(real.has(slug), `src/art/isles/${slug}.webp matches no island`).toBe(true);
    }
  });

  it('is there at all, and not vacuously few', () => {
    // Thirty-two arrived in the four packs. A drop below that is a deletion
    // somebody did not mean, and this test passing on an empty folder would
    // have been worthless.
    expect(paintedSlugs().length).toBeGreaterThanOrEqual(32);
  });

  it('gives the capital and the meeting place their own', () => {
    const painted = new Set(paintedSlugs());
    expect(painted.has('the-aldermain')).toBe(true);
    expect(painted.has('freeport')).toBe(true);
    expect(painted.has('coralhome')).toBe(true);
  });
});
