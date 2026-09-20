import { describe, expect, it } from 'vitest';

/**
 * The narrow-screen console rules have to come last, and this is why.
 *
 * Found by measuring the live page at 393px rather than by reading: the ledger
 * plaque wanted 84px and had 76, so **CLEAR was cut off by its own border** on
 * the exact phone width the top bar was designed for. Two separate causes, the
 * same mistake:
 *
 * - `@media (max-width: 400px) { .topbar .iconbtn { width: 34px } }` sat
 *   *above* the plain `.topbar .iconbtn { width: 38px }`. Same specificity,
 *   so source order decided and the wide rule won. Four buttons at four
 *   pixels over is the sixteen the ledger was short.
 * - `.plaque--ledger { flex: none }` lost to `.console .plaque { flex: 0 1
 *   auto }`, which is one class more specific. The plaque written not to
 *   shrink was the one shrinking.
 *
 * Neither shows up in a build, a type check or a render test; both show up as
 * a clipped word on a phone. So the test reads the stylesheet and checks the
 * order, which is the thing that was actually wrong.
 */
const CSS = (
  import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
)['../styles.css'];

/** Where a rule starts, or -1. */
const at = (needle: string): number => CSS.indexOf(needle);

describe('the console at phone width', () => {
  it('has one narrow-screen block, and it comes after the rules it beats', () => {
    expect(CSS).toBeTruthy();
    const narrow = [...CSS.matchAll(/@media \(max-width: 400px\)/g)].map((m) => m.index ?? -1);
    expect(narrow, 'one block, not several scattered up the file').toHaveLength(1);
    const block = narrow[0];
    expect(at('.topbar .iconbtn {'), 'the icon button width').toBeLessThan(block);
    expect(at('.topbar .speed {'), 'the speed control padding').toBeLessThan(block);
  });

  it('keeps the ledger plaque from shrinking, specifically enough to mean it', () => {
    // `.plaque--ledger` alone loses to `.console .plaque`; it has to be
    // written at least as specifically to hold its width.
    expect(CSS).toContain('.console .plaque--ledger { flex: none; }');
    expect(CSS).not.toMatch(/^\.plaque--ledger \{ flex: none; \}/m);
  });
});
