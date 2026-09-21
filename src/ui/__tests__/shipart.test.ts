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
const SOURCE = (
  import.meta.glob('../Almanac.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
)['../Almanac.tsx'];
const DOC = (
  import.meta.glob('../../../docs/ship-art-direction.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../../../docs/ship-art-direction.md'];

const ASSETS = (manifest as { assets: Record<string, { version: number }> }).assets;
const SHIPS = (combatShips as { ships: Array<Record<string, string | number>> }).ships;

/** The slug each hull's painting is filed under, read off the card's own map. */
function slugOf(shipId: string): string {
  const block = SOURCE.slice(SOURCE.indexOf('ART_SLUG'));
  const table = block.slice(0, block.indexOf('};'));
  const found = new RegExp(`'${shipId}':\\s*'([a-z0-9-]+)'`).exec(table);
  return found ? found[1] : shipId;
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

  /**
   * And the sheet shows the whole painting.
   *
   * Sean, 21 September: *"Encyclopedia ships need to be resized to fit
   * properly without cutting off image. All should be 4:3."* The plate had a
   * `height: 40vh` on phone width with the aspect ratio released, and 40vh of
   * a phone is taller than 4:3, so `object-fit: cover` cropped every hull to
   * fill it. Every painting in `src/art/ships` is 640 x 480, so the fix is to
   * fix the ratio and let the height follow.
   *
   * Read off the stylesheet because `App.tsx` has no seam to render in a test
   * — the same reason `console.test.ts` reads it. What it pins is the rule
   * that was wrong, not the pixels.
   */
  it('shows the whole hull rather than cropping it to a height', () => {
    const css = (
      import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }) as Record<
        string,
        string
      >
    )['../styles.css'];
    expect(css).toBeTruthy();
    const narrow = css.slice(css.indexOf('@media (max-width: 560px)'));
    const plate = narrow.slice(0, narrow.indexOf('\n}\n', narrow.indexOf('--plate')) + 3);
    expect(plate, 'the plate is back on a fixed height').not.toMatch(/--plate[^}]*height:\s*\d+vh/);
    expect(plate, 'the plate is not 4:3').toMatch(/aspect-ratio:\s*4\s*\/\s*3/);
    expect(plate, 'the painting is still cropped to fill').toMatch(/object-fit:\s*contain/);
  });

  it('claims nothing the register does not have', () => {
    const claimed = [...DOC.matchAll(/src\/art\/ships\/([a-z0-9-]+)\.webp/g)].map((m) => m[1]);
    expect(claimed.length).toBeGreaterThan(0);
    const phantom = [...new Set(claimed)].filter((slug) => !ASSETS[`ships/${slug}`]);
    expect(phantom, `marked PAINTED with no asset: ${phantom.join(', ')}`).toEqual([]);
  });
});
