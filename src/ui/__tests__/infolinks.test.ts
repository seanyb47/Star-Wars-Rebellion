import { describe, expect, it } from 'vitest';

/**
 * An ℹ that lands at the top of a long page is a broken link that never says so.
 *
 * The anchor on one of these is a bare string at both ends: a screen writes
 * `at="party"` and the Almanac writes `id="enc-party"` to receive it, and if
 * the two ever disagree the reader is quietly dropped at the top of the
 * Missions page with no error anywhere. That already happened once and went
 * unnoticed for days — every ship lookup in the game landed at the top of the
 * Ships page from the moment the roster went in, because one end lower-cased
 * the slug and `getElementById` does not.
 *
 * So: every literal anchor any screen links to must exist in the Almanac.
 * This is the cheap half of the typed-anchor idea — it catches the mistake
 * that actually gets made, which is writing the link and forgetting the
 * target, and it costs nothing to keep.
 */
const UI = import.meta.glob('../*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const ALMANAC = UI['../Almanac.tsx'];

describe('every ℹ lands on something', () => {
  it('finds a target in the encyclopedia for each anchor a screen links to', () => {
    expect(ALMANAC).toBeTruthy();
    const links: { file: string; at: string }[] = [];
    for (const [file, source] of Object.entries(UI)) {
      if (file === '../Almanac.tsx') continue;
      for (const m of source.matchAll(/\bat="([a-z0-9-]+)"/g)) {
        links.push({ file, at: m[1] });
      }
    }
    // If this drops to nothing the test has stopped testing anything — the
    // links were the point of freeing `Info` and `SectionHead` from the
    // Almanac in the first place.
    expect(links.length, 'ℹ links from game screens').toBeGreaterThan(0);
    for (const link of links) {
      expect(ALMANAC, `${link.file} links to "${link.at}"`).toContain(`id="enc-${link.at}"`);
    }
  });

  /**
   * And the mechanism itself is worth pinning, since the whole cleanup rests
   * on it: the marks are importable from `components.tsx` rather than trapped
   * in the two-thousand-line encyclopedia they were written in.
   */
  it('keeps the marks where any screen can reach them', () => {
    const COMPONENTS = UI['../components.tsx'];
    expect(COMPONENTS).toContain('export function SectionHead({');
    expect(COMPONENTS).toContain('export function Info({');
    // And the Almanac uses the same ones rather than keeping copies.
    expect(ALMANAC).not.toContain('function SectionHead({');
    expect(ALMANAC).not.toContain('function Info({');
    expect(ALMANAC).toContain("from './components'");
  });
});
