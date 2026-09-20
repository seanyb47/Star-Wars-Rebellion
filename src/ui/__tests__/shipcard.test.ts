import { describe, expect, it } from 'vitest';
import combatShips from '../../data/combat-ships.json';

/**
 * Every ship card has the same skeleton.
 *
 * Sean, 20 September: *"The ship cards all have different stats in different
 * places, and we're hiding some stats when the answer is none. Just write
 * none, and keep the stat cards identical so everything is displayed… the
 * outline of the cards should be identical."*
 *
 * The card used to drop any stat whose value was zero, and drop the whole
 * Firepower group on a hull with no guns, so the Swift showed six tiles and
 * the Majestic ten and nothing lined up. This reads the source rather than
 * rendering it — the sheet is deep inside a switch in a large component — and
 * checks the two things that broke: no stat is conditional, and the grid is a
 * fixed three columns rather than one that sizes itself to the data.
 */
const SOURCE = (
  import.meta.glob('../Almanac.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
)['../Almanac.tsx'];
const SHIPS = (combatShips as { ships: Array<Record<string, string | number>> }).ships;

describe('the ship card is the same shape on every hull', () => {
  it('draws all ten stats unconditionally', () => {
    expect(SOURCE).toBeTruthy();
    for (const label of ['Hull', 'Armor', 'Repairs', 'Size', 'Speed', 'Carries',
                         'Long guns', 'Heavy guns', 'Light guns', 'Bombardment']) {
      expect(SOURCE, `${label} is missing`).toContain(`label="${label}"`);
    }
    // The old shape: `{cls.armor > 0 && (`, `{total > 0 && (`, and so on. Any
    // `> 0 &&` guard around a stat is the bug coming back.
    const guards = SOURCE.match(/\{\s*(?:cls\.[A-Za-z.]+|total)\s*>\s*0\s*&&/g) ?? [];
    expect(guards, `conditional stats: ${guards.join(', ')}`).toEqual([]);
  });

  /**
   * The other half of the fix is a fixed three-column grid in `styles.css`,
   * replacing an `auto-fit` that sized itself to however many stats a hull
   * happened to have. That one is **not** asserted here: Vitest stubs CSS out,
   * so a raw import of the stylesheet comes back empty and a test written
   * against it would pass whatever the file said. Saying so is better than a
   * green tick that checks nothing.
   */
  it.skip('cannot check the stylesheet from here — Vitest stubs CSS', () => {});

  it('writes None for a zero rather than leaving a gap', () => {
    expect(SOURCE).toContain("return value === 0 ? 'None' : value;");
  });

  /**
   * And the bars are gone.
   *
   * They were scaled against the highest in the game and drawn under every
   * numeric stat. Sean's instruction on the morning of 20 September took them
   * off the categorical ones — *"remove decorative progress bars from
   * categorical stats"* — and the mockup he sent that afternoon has none
   * under Hull or Armor either. Asserted rather than assumed, because a bar
   * is the kind of thing that creeps back one stat at a time.
   */
  it('draws no bars at all', () => {
    expect(SOURCE).not.toContain('shipstat__bar');
    expect(SOURCE).not.toContain('share=');
  });

  /**
   * Every tile carries a symbol from the sheet Sean sent with the mockup, and
   * each is the one that belongs to that stat rather than whatever was
   * nearest to hand.
   */
  it('gives each stat its own symbol', () => {
    for (const [label, icon] of [
      ['Hull', 'hull'], ['Armor', 'armor'], ['Repairs', 'repairs'],
      ['Size', 'size'], ['Speed', 'speed'], ['Carries', 'carries'],
      ['Long guns', 'long-guns'], ['Heavy guns', 'heavy-guns'],
      ['Light guns', 'light-guns'], ['Bombardment', 'bombardment'],
    ] as const) {
      // Whitespace-tolerant: a tile that grows a third prop gets wrapped by
      // the formatter, and a test that breaks on that is testing the
      // formatter rather than the card.
      const pair = new RegExp(`label="${label}"\\s+icon="${icon}"`);
      expect(pair.test(SOURCE), `${label} has no symbol`).toBe(true);
    }
  });

  /**
   * Sean, 20 September: *"For 'Carries' change # to '# troops'."*
   *
   * Carries is the one figure whose unit is not in its own label, and it is
   * the stat a player reads when working out whether a squadron can take an
   * island. Pinned as a pair rather than a word plus an `s`, because the
   * fleet really does have hulls that carry exactly one.
   */
  it('counts what Carries carries, and gets the singular right', () => {
    expect(SOURCE).toMatch(/unit=\{\[terms\.troop\.toLowerCase\(\), terms\.troops\.toLowerCase\(\)\]\}/);
    expect(SOURCE).toContain('value === 1 ? unit[0] : unit[1]');
    // Non-vacuity for the singular: at least one hull carries exactly one.
    expect(SHIPS.filter((s) => Number(s['Troop Capacity']) === 1).length).toBeGreaterThan(0);
    // And a zero still reads None rather than "None troops".
    expect(SOURCE).toContain('typeof value === \'number\' && value > 0');
  });

  /**
   * Non-vacuity: the hulls this actually changes. If the roster ever loses
   * them, the test above is guarding a case that no longer exists.
   */
  it('is guarding hulls that really do have zeroes', () => {
    const zeroes = (field: string) => SHIPS.filter((s) => Number(s[field]) === 0).length;
    expect(zeroes('Long Guns'), 'hulls with no long guns').toBeGreaterThan(5);
    expect(zeroes('Heavy Guns'), 'hulls with no heavy guns').toBeGreaterThan(5);
    expect(zeroes('Light Guns'), 'hulls with no light guns').toBeGreaterThan(1);
    expect(zeroes('Armor'), 'hulls with no armor').toBeGreaterThan(2);
    expect(zeroes('Troop Capacity'), 'hulls that carry nobody').toBeGreaterThan(10);
    expect(zeroes('Bombardment'), 'hulls that cannot bombard').toBeGreaterThan(5);
    // The Swift is the extreme case: no guns of any kind.
    const swift = SHIPS.find((s) => s['Ship'] === 'Swift')!;
    expect(Number(swift['Long Guns']) + Number(swift['Heavy Guns']) + Number(swift['Light Guns'])).toBe(0);
  });
});
