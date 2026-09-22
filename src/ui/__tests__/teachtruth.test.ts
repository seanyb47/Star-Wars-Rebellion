import { describe, expect, it } from 'vitest';
import { CROWN_PRINCIPALS, PIRATE_LORDS } from '../../sim';

/**
 * The tutorial is the one place a player cannot tell they are being lied to.
 *
 * `docs/opening-flow.md`, rule 5: *"Nothing in the flow may lie about a rule.
 * Every sentence about winning, losing or timing is checked against the code,
 * because a tutorial is the one place a player has no way to know it is being
 * told something stale."*
 *
 * It had gone stale, and for a day nobody noticed: the "How you win" card told
 * the Crown *"lose Highwater and you lose the war that day"* and the
 * Confederacy *"take Highwater and the war is over that day"*, and neither had
 * been the rule since the two-principals change of 21 September. A card that
 * teaches a losing player the wrong victory condition is worse than no card.
 *
 * So this reads the card's own source and holds it to the rule `advanceDay.ts`
 * actually enforces. It is deliberately about the *claim* rather than the
 * wording — a rewrite is free, and inventing a new way to say "Highwater ends
 * it" is not.
 */
const RAW = import.meta.glob('../Tutorial.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const SOURCE = RAW['../Tutorial.tsx'];

const ALMANAC = import.meta.glob('../Almanac.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const START = import.meta.glob('../StartScreen.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Just the card, so a mention of Highwater elsewhere is not a false alarm. */
function winCard(): string {
  const start = SOURCE.indexOf("title: 'How you win'");
  expect(start).toBeGreaterThan(-1);
  const end = SOURCE.indexOf('  },', start);
  // As above: the card's own comment quotes the wording it replaced.
  return SOURCE.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('the tutorial tells the truth about winning', () => {
  it('never says that taking or losing Highwater ends the war', () => {
    const card = winCard();
    // Highwater may be named — it is where the Imperator stands, and saying so
    // is the point. What it may not do is claim the island settles the war.
    expect(card).not.toMatch(/Highwater[^`]{0,80}(war is over|lose the war|ends the war)/i);
    expect(card).not.toMatch(/(Take|Lose) Highwater[^`]{0,40}that day/i);
  });

  it('states both of the conditions the rules actually check', () => {
    const card = winCard();
    // The Crown's: all three Lords at once. The `PIRATE_LORDS` interpolation
    // is what names them, so the card cannot drift out of step with the roster.
    expect(card).toMatch(/PIRATE_LORDS/);
    expect(card).toMatch(/three Pirate Lords/);
    expect(card).toMatch(/at the same time|at once/);
    // The Confederacy's: both Crown principals, together.
    expect(card).toMatch(/CROWN_PRINCIPALS|Corvane/);
    expect(card).toMatch(/Imperator/);
  });

  it('is describing a pair and a trio, which is what the rules count', () => {
    // If either list is ever resized the copy above is wrong and somebody has
    // to write new copy rather than let this test pass by accident.
    expect(CROWN_PRINCIPALS).toHaveLength(2);
    expect(PIRATE_LORDS).toHaveLength(3);
  });

  it('leaves Skip drawn on every step, including the last', () => {
    // It used to render an empty label on the last step and leave a live 44px
    // button with nothing in it.
    expect(SOURCE).not.toMatch(/last \? '' : 'Skip'/);
    expect(SOURCE).toMatch(/className="teach__skip"/);
  });

  it('and neither does the Rules page the tutorial sends you to', () => {
    // Same lie lived in the encyclopedia's "How to win" box, which is worse:
    // the last tutorial card tells the player that page opens with how to win,
    // so a reader who wanted the rule went straight to the wrong sentence.
    const src = ALMANAC['../Almanac.tsx'];
    expect(src).toBeTruthy();
    // `howtowin__title` is used for more than one box; the win box is the
    // one whose title is literally "How to win".
    const start = src.indexOf(`howtowin__title">How to win<`);
    expect(start).toBeGreaterThan(-1);
    // Comments stripped first: the box carries a note quoting the sentence it
    // replaced, and a test that cannot tell a quotation from a claim would
    // forbid explaining the fix.
    const box = src.slice(start, start + 2600).replace(/\/\*[\s\S]*?\*\//g, '');
    expect(box).not.toMatch(/Highwater[^`]{0,80}(war is over|lose the war|ends the war)/i);
    expect(box).toMatch(/CROWN_PRINCIPALS/);
    expect(box).toMatch(/PIRATE_LORDS/);
  });

  it('and the start screen does not either', () => {
    // It listed "Lose Highwater and lose everything" among the Crown's
    // weaknesses — the first screen of the game, and the third copy of the
    // same stale rule. Losing the capital costs the Crown the Imperator, who
    // never leaves it, which is one of the two the Confederacy needs.
    const src = (START['../StartScreen.tsx'] ?? '').replace(/\/\/[^\n]*/g, '');
    expect(src).toBeTruthy();
    expect(src).not.toMatch(/Lose Highwater and lose everything/);
  });
});
