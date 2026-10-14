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

  /**
   * The ledger plaque this used to guard is gone — Sean cut it on 21
   * September for one that shows gold and the delta and hides the rest behind
   * a tap, which is what made the width fight go away rather than winning it.
   *
   * What replaced it has a subtler version of the same trap. The purse panel
   * is absolutely positioned, so it needs a positioned ancestor, and the
   * obvious one is wrong: `.console` scrolls sideways with `overflow-y:
   * hidden`, so a panel anchored there is clipped the instant it drops below
   * the row. It hangs off `.topbar` instead. Neither fact shows up in a build
   * or a type check, and both show up as a panel nobody can see.
   */
  it('hangs the purse off the header, not off the console that scrolls', () => {
    expect(CSS).toMatch(/\.topbar \{[^}]*position: relative/);
    expect(CSS).toMatch(/\.purse \{[^}]*position: absolute/);
    // The console still scrolls, which is exactly why the purse is not in it.
    expect(CSS).toMatch(/\.console \{[^}]*overflow-x: auto/);
    const purse = CSS.indexOf('.purse {');
    const console_ = CSS.indexOf('.console {');
    expect(purse, 'the purse rule is there at all').toBeGreaterThan(-1);
    expect(console_).toBeGreaterThan(-1);
    /*
     * And no rules left behind for a plaque that no longer exists — checked
     * against the stylesheet with its comments stripped, because the note
     * explaining the *old* CLEAR bug still names `.plaque--ledger` and should:
     * it is the record of why the narrow-screen block sits where it sits.
     * A guard that cannot tell a rule from a comment about a rule would have
     * forced that history to be deleted to stay green.
     */
    const rules = CSS.replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(rules).not.toContain('.plaque--ledger');
    expect(rules).not.toContain('.ledger__col');
  });
});

/**
 * No sheet rises behind the status bar.
 *
 * Sean, 22 September: *"I can't close encyclopedia entries because X is too
 * high."* The ✕ was sitting on the clock and the battery, so the tap went to
 * iOS instead of to the sheet — a close button that cannot be pressed, which
 * is as stuck as a screen gets.
 *
 * The arithmetic on a 932pt phone, and the reason a percentage was the wrong
 * unit for this: a sheet is anchored to the **bottom**, above the tab bar, so
 * its top is whatever is left over. `932 − 64 (tab bar) − 839 (90%) = 29`,
 * against a 59pt status bar. The base `.sheet` is 82% and lands at 104, which
 * is why nothing else showed the fault; only `.sheet--flow` raised it to 90%,
 * and `.sheet--flow .sheet__head { padding-top: 0 }` removed the inset that
 * might have caught it.
 *
 * So the ceiling is written as what is left — everything minus the bar it sits
 * above, the inset it must clear, and a little air — and cannot be wrong on a
 * screen nobody has measured on. Verified in Chromium with the inset forced to
 * 59: the sheet lands at 67 and the ✕ at 100.
 */
describe('sheet geometry', () => {
  const CSS = import.meta.glob('../styles.css', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const css = CSS['../styles.css'];

  it('caps the flowing sheet against the inset and the tab bar, not at a percentage', () => {
    const rule = css.slice(css.indexOf('.sheet--flow {'), css.indexOf('}', css.indexOf('.sheet--flow {')));
    expect(rule).toContain('var(--safe-top)');
    expect(rule).toContain('var(--tabbar-h');
    // The bare percentage ceiling is what put it under the notch.
    expect(rule).not.toMatch(/max-height:\s*90%/);
  });

  /**
   * And the base sheet still stops at the tab bar rather than the floor, which
   * is the other half of the same rule and was its own bug once: a sheet that
   * ran under the bar hid the mission report's own orders behind the tabs.
   */
  it('keeps every sheet above the tab bar', () => {
    // Matched on the declaration rather than by slicing to the first
    // `.sheet {`: there is more than one, and the first draft of this test
    // sliced a narrow-screen override that has no `bottom` at all — which
    // would have failed for a reason that had nothing to do with the rule.
    expect(css).toContain('bottom: var(--tabbar-h, 64px); z-index: 20;');
  });
});
