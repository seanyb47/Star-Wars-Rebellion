import { describe, expect, it } from 'vitest';
import manifest from '../../../art-manifest.json';
import combatShips from '../../data/combat-ships.json';

/**
 * The art register and the art direction have to agree about what is painted.
 *
 * On 20 September I told Sean thirteen hulls were still on drawn silhouettes.
 * Every one of the twenty-eight had a painting and had had for a day. The
 * count came off the **PAINTED** markers in `docs/ship-art-direction.md`,
 * which are written by hand, where `art-manifest.json` is written by the tool
 * that installs the art — so the doc had drifted thirteen hulls behind and
 * nothing in the build compared the two.
 *
 * This is that comparison. It is deliberately about the *roster* rather than
 * about either file on its own: the question worth failing the build over is
 * "does every hull in the game have a painting, and does the page a person
 * reads say so", and neither file answers that alone.
 */
const DOC = (
  import.meta.glob('../../../docs/ship-art-direction.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../../../docs/ship-art-direction.md'];

const ASSETS = (manifest as { assets: Record<string, { version: number }> }).assets;
const SHIPS = (combatShips as { ships: Array<Record<string, string | number>> }).ships;

/**
 * The slug each hull's painting is filed under.
 *
 * This used to scrape an `ART_SLUG` table out of `Almanac.tsx`, which was a
 * second hand-maintained copy of the crosswalk `roster.ts` already keeps. Two
 * copies drift, and on 22 September this one had: five hulls still pointed at
 * the filenames their paintings had *before* the roster renamed them, so the
 * Interceptors, the Brigantine, the Reefwarden and the Coral-Class fell
 * through to the drawn silhouette in the live game while their paintings sat
 * on disk. The table is gone and both ends read the roster now, so the test
 * and the game cannot disagree about where a painting lives.
 */
import { ROSTER_CLASSES, slugOf as rosterSlug } from '../../sim/roster';

function slugOf(shipId: string): string {
  return rosterSlug(shipId) ?? shipId;
}

describe('every hull in the roster has a painting, and the page says so', () => {
  it('has art installed for all of them', () => {
    expect(SHIPS.length).toBe(28);
    const missing = SHIPS.filter((s) => !ASSETS[`ships/${slugOf(String(s['Ship ID']))}`]).map((s) => String(s['Ship']));
    expect(missing, `no painting in the register: ${missing.join(', ')}`).toEqual([]);
  });

  it('marks all of them PAINTED in the art direction', () => {
    expect(DOC).toBeTruthy();
    const unmarked = SHIPS.filter(
      (s) => !DOC.includes(`src/art/ships/${slugOf(String(s['Ship ID']))}.webp`),
    ).map((s) => String(s['Ship']));
    expect(unmarked, `painted but not marked in the doc: ${unmarked.join(', ')}`).toEqual([]);
  });

  it('claims nothing the register does not have', () => {
    const claimed = [...DOC.matchAll(/src\/art\/ships\/([a-z0-9-]+)\.webp/g)].map((m) => m[1]);
    expect(claimed.length).toBeGreaterThan(0);
    const phantom = [...new Set(claimed)].filter((slug) => !ASSETS[`ships/${slug}`]);
    expect(phantom, `marked PAINTED with no asset: ${phantom.join(', ')}`).toEqual([]);
  });
});

/**
 * And the path the *game* takes to a painting, which the checks above missed.
 *
 * The three above all ask the same question through the encyclopedia's own
 * crosswalk, so when that crosswalk went stale they went stale with it and
 * passed for a day while five hulls drew silhouettes in the fleet lists. The
 * fix was to delete the crosswalk; this is the test that would have caught it
 * either way, because it compares the roster against the filenames on disk
 * with nothing in between.
 */
describe('the file on disk is named what the game asks for', () => {
  const FILES = new Set(
    Object.keys(
      import.meta.glob('../../art/ships/*.{webp,png,jpg}', { eager: true }) as Record<string, unknown>,
    ).map((p) => p.replace(/^.*\//, '').replace(/\.(webp|png|jpg)$/, '')),
  );

  it('has a painting filed under every hull id in the live roster', () => {
    const missing = ROSTER_CLASSES.filter((c) => !FILES.has(c.id)).map((c) => `${c.name} (${c.id})`);
    expect(missing, `falls back to a silhouette in game: ${missing.join(', ')}`).toEqual([]);
  });

  /**
   * The leftovers are named rather than counted, because every one of them is
   * either lore or a hull the roster cut — and a *new* unused file is almost
   * always a painting filed under the wrong name, which is exactly the bug
   * this describe block exists for.
   */
  it('leaves nothing unused but the lore ships and the old roster', () => {
    const used = new Set<string>(ROSTER_CLASSES.map((c) => c.id));
    const spare = [...FILES].filter((f) => !used.has(f)).sort();
    expect(spare).toEqual([
      // The two Pirate Lords' legend ships. Nothing builds or sails them.
      'adamant',
      // Cut by the v4.3 roster rather than renamed by it.
      'fluyt',
      'fluyt-ii',
      'freebooter',
      // Not a ship: the harbor plate the fleet list draws when a berth is empty.
      'harbor',
      'razorback',
      'razorback-ii',
      'reef-class',
      'swallowtail',
    ]);
  });
});
