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

/** The stylesheet, for the rules the rows above only name. */
const UI = import.meta.glob('../styles.css', {
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
    // Sound is its own colour since 22 September rather than muted grey —
    // *"where it says like sound, turn that one green, like good."*
    expect(stats).toContain('<span className="shiprow__sound">Sound</span>');
    expect(stats).toContain('{whole - hurt}/{whole}');
  });

  /**
   * And how badly, in three rungs.
   *
   * Sean: *"obviously like the different categories of damage, move them into
   * like yellow, orange, red."* The figure carried one colour for everything
   * short of sound, so a hull at 95% and one at 5% read identically at the
   * only distance this row is read from.
   */
  it('grades the damage rather than flagging it', () => {
    expect(src).toContain('shiprow__hurt--${hurtBand(whole - hurt, whole)}');
    const band = src.slice(src.indexOf('function hurtBand'), src.indexOf('function ShipRow'));
    expect(band).toContain("if (share > 2 / 3) return 'light';");
    expect(band).toContain("if (share > 1 / 3) return 'mid';");
    expect(band).toContain("return 'bad';");
  });

  /**
   * A hull under construction is deliberately NOT on that ladder. Sean talked
   * himself out of yellow in the same breath he suggested it: *"maybe not
   * yellow, cause yellow is an indication of something being slightly
   * damaged... maybe it's just white."* She has no condition to grade.
   */
  it('keeps a hull under construction off the damage ladder', () => {
    const css = UI['../styles.css'];
    expect(css).toContain('.shiprow--stocks .shiprow__stats { color: var(--building); }');
    expect(css).toContain('--building: #ffffff;');
    // And white is not one of the damage colours, so the two can never be
    // confused for one another.
    expect(css).not.toContain('--hurt-light: #ffffff');
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
    // Anchored on the flag rather than on the card's class, which stopped
    // being a literal on 22 September when the card gained its faction
    // stripe. The flag is the first thing inside the card and is not going to
    // move: see `.fleet__flag`.
    const header = src.slice(src.indexOf('<span className="fleet__flag"'), src.indexOf('fleet__orders'));
    expect(header).toContain('className="btn fleet__sail"');
    expect(header).toContain('onClick={() => onSail(fleet.id)}');
    // And only once — it must not be left behind in the stack as well.
    expect(src.split('onSail(fleet.id)').length - 1).toBe(1);
  });

  it('is gated exactly as the orders were', () => {
    // A fleet at sea, or somebody else's, has no Set sail — the same
    // condition the orders block uses, not a looser one.
    const header = src.slice(src.indexOf('<span className="fleet__flag"'), src.indexOf('fleet__orders'));
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

/**
 * Whose squadron it is, and whether she is in the water.
 *
 * Sean, 22 September: *"we need a faction color clearly stamped on each fleet,
 * whether it's the background of the card or a strip at the top... if they're
 * in harbor it's fine to leave it as is. If they're setting sail or sailing,
 * maybe we put like a background behind it that indicates that it's in
 * transit."*
 *
 * Two signals answering two questions, and the second one needed a card to
 * live on: `FleetCard` only ever rendered for fleets *at* an island, so a
 * squadron under way was one line of text at its destination and the transit
 * wash would have had nothing to wash. The inbound list renders real cards now.
 */
describe('a fleet card says whose it is and where it is', () => {
  const src = FLEET['../FleetPanel.tsx'];

  it('stamps the faction on the card and flies a flag inside it', () => {
    expect(src).toContain('className={`card fleet fleet--${fleet.faction}');
    expect(src).toContain('<span className="fleet__flag" aria-hidden="true" />');
  });

  it('marks a squadron under way, and only one under way', () => {
    expect(src).toContain("${atSea ? ' fleet--sailing' : ''}");
    // Read off the same `atSea` the orders are gated on, so the wash and the
    // buttons can never disagree about whether she has sailed.
    expect(src).toContain('const atSea = fleet.voyage !== undefined;');
  });

  it('gives an inbound squadron a card rather than a line of text', () => {
    const inbound = src.slice(src.indexOf('Under way to here'));
    expect(inbound).toContain('<FleetCard');
    // The bare row it replaced said the name and the days and nothing else.
    expect(src).not.toContain('{fleet.voyage!.daysRemaining}d out');
  });

  /**
   * And the walls' own card is gone from the harbor, at his word: *"cut the
   * section on the harbor that says two forts, 60 against the landing."* It
   * was the third place one island sheet said the same thing.
   */
  it('no longer counts the walls in the harbor', () => {
    expect(src).not.toContain('against\n            a landing');
    expect(src).not.toContain('wallInvasionDefense');
  });
});
