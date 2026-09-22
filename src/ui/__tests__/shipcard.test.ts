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
    // No hull carries exactly one any more — v4.2 took the Resolute from 1 to
    // 3 and she was the last. The branch stays, and is asserted above rather
    // than exercised here, because troop capacity is data: the next roster
    // revision can put a 1 back and nobody will remember to look. What this
    // checks is that the pair is real and the data has not quietly gone all
    // one way, which would make the plural the only thing anyone ever sees.
    const carried = SHIPS.map((s) => Number(s['Troop Capacity']));
    expect(new Set(carried).size, 'every hull carries the same number').toBeGreaterThan(2);
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

/**
 * The sheet between the fleet row and the encyclopedia is gone.
 *
 * Sean, 22 September, with three screenshots: *"the middle screen doesn't need
 * to exist. First image is encyclopedia. That's fine. Click on ship from the
 * fleet panel and it takes you to the encyclopedia entry. No need for the
 * middle page if you simply move the status of the ship and any damage
 * indications into the fleet screen in lieu of the hull area."*
 *
 * What that sheet held, item by item: the word *Sound*; the same figures the
 * fleet row already printed; a paragraph of repair rules; and a button through
 * to the encyclopedia. Three of the four were duplicates of something one tap
 * away in either direction, and the fourth — the repair rules — moved into the
 * Glossary's `Repair` entry earlier the same day, which is why cutting this
 * loses nothing.
 *
 * Per-hull detail is not lost either: untick *Group alike* and each hull is
 * its own row with its own condition.
 */
const FLEET = import.meta.glob('../FleetPanel.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('a hull goes straight to its entry', () => {
  const src = FLEET['../FleetPanel.tsx'];

  it('has no ship sheet left to open', () => {
    const all = import.meta.glob('../*.tsx', { eager: true }) as Record<string, unknown>;
    expect(Object.keys(all).some((f) => f.endsWith('ShipSheet.tsx'))).toBe(false);
    expect(src).not.toContain('onOpenShip');
  });

  it('opens the encyclopedia from the row itself', () => {
    expect(src).toContain("onClick={() => lookUp?.('ships', encyclopediaShip(cls.id))}");
    // And the second control to the same page went with the sheet.
    expect(src).not.toContain('className="shiprow__ask"');
  });

  /** A sound hull says so; a hurt one shows what it has left. */
  it('says Sound when whole and gives the figures when hurt', () => {
    const stats = src.slice(src.indexOf('<span className="shiprow__stats">'));
    expect(stats).toContain('{hurt > 0 ? (');
    expect(stats).toContain('<span className="muted">Sound</span>');
    expect(stats).toContain('{whole - hurt}/{whole}');
  });
});

/**
 * Set sail sits opposite the fleet's name.
 *
 * Sean, 22 September: *"move the set sail button to the top right corner of
 * the fleet tab so that it's across the screen from the name of the fleet."*
 *
 * It was the last thing in the orders stack, under Bombardment and Invasion —
 * so the commonest order on the card was the one furthest down it, behind two
 * you give rarely.
 *
 * The slot opposite the name was already free, and could only ever be free:
 * the `ControlBadge` drawn there is for fleets that are **not** yours, and
 * those are exactly the fleets you cannot give orders to. The two can never
 * want the same corner, which is why this needed no layout negotiation.
 *
 * Measured in Chromium: name and button share a row (both at y=486), and the
 * button's right edge sits at 403 inside a card ending at 416.
 */
describe('where Set sail lives', () => {
  const src = FLEET['../FleetPanel.tsx'];

  it('is in the card header, not the orders stack', () => {
    const header = src.slice(src.indexOf('<div className="card fleet">'), src.indexOf('fleet__orders'));
    expect(header).toContain('className="btn fleet__sail"');
    expect(header).toContain('onClick={() => onSail(fleet.id)}');
    // And only once — it must not be left behind in the stack as well.
    expect(src.split('onSail(fleet.id)').length - 1).toBe(1);
  });

  it('is gated exactly as the orders were', () => {
    // A fleet at sea, or somebody else's, has no Set sail — the same
    // condition the orders block uses, not a looser one.
    const header = src.slice(src.indexOf('<div className="card fleet">'), src.indexOf('fleet__orders'));
    expect(header).toContain('{canOrder && !atSea && (');
  });

  /** Compact, because `.btn` is full-width everywhere else on this card. */
  it('does not stretch across the header', () => {
    const CSS = import.meta.glob('../styles.css', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    expect(CSS['../styles.css']).toMatch(/\.fleet__sail \{[^}]*width: auto/);
  });
});
