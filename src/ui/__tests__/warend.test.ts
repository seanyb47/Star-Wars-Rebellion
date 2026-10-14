import { describe, expect, it } from 'vitest';

/**
 * The line that says who won is not covered by the news.
 *
 * Found by playing a war out to day 972. The dispatch strip floats over the
 * top of the chart with the last three notable events in it, and `.verdict` —
 * one bordered line of 13px text, the whole of what the game says about
 * winning — renders directly underneath. So the screen at the end of a
 * thirty-two-month war showed three captures and nothing else.
 *
 * The strip is already silent for a battle, for a dispatch card and for an
 * open panel, on the rule that those own the screen. A won war owns it too.
 *
 * `App.tsx` has no seam to render in a test, so this reads the source the way
 * `shipcard.test.ts` reads the Almanac's. What it pins is the condition, not
 * the pixels: a rendering test would be better, and a test that claimed to be
 * one would not.
 */
const SOURCE = (
  import.meta.glob('../App.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
)['../App.tsx'];

describe('the end of a war', () => {
  it('silences the dispatch strip once there is a winner', () => {
    expect(SOURCE).toBeTruthy();
    const call = SOURCE.slice(SOURCE.indexOf('<Dispatches'), SOURCE.indexOf('<Dispatches') + 900);
    expect(call, 'the strip is not gated on the winner').toMatch(/hidden=\{[^}]*Boolean\(state\.winner\)/);
    // And the three older reasons are still there: a battle, a card, a panel.
    for (const reason of ['state.battle', 'cards.length > 0', 'panelOpen']) {
      expect(call, `${reason} stopped hiding it`).toContain(reason);
    }
  });

  it('still has a verdict to uncover', () => {
    expect(SOURCE).toContain('The Seven Seas are yours. Victory.');
    expect(SOURCE).toMatch(/verdict--\$\{state\.winner === state\.player \? 'win' : 'lose'\}/);
  });

  /**
   * And the verdict line is now the way back in.
   *
   * The closing screen is shown once and dismissed, because a full screen
   * that cannot be put away locks the player out of the world they just spent
   * thirty-two months in. That only works if there is a way to open it again,
   * and the obvious one is the line that is already saying the war is over.
   * A dismissable screen with no handle is a screen you get one look at.
   */
  it('opens the closing screen, and can get back to it', () => {
    expect(SOURCE).toContain('<WarEnd');
    expect(SOURCE, 'the screen is gated on the report and on having been seen').toMatch(
      /endReport && !warEndSeen/,
    );
    const verdict = SOURCE.slice(SOURCE.indexOf('className={`verdict'));
    expect(
      verdict.slice(0, 400),
      'the verdict line does not reopen the screen',
    ).toContain('setWarEndSeen(false)');
  });

  /**
   * The stack, in Sean's order: *"Both, stacked."* Told, shown, then given
   * the evidence — and the order is the whole of the answer, so a screen
   * that grew a table above its headline would be a different answer.
   */
  it('stacks the dispatch above the figures above the evidence', () => {
    const screen = (
      import.meta.glob('../WarEnd.tsx', { query: '?raw', import: 'default', eager: true }) as Record<
        string,
        string
      >
    )['../WarEnd.tsx'];
    expect(screen).toBeTruthy();
    const word = screen.indexOf('warend__word');
    const dispatch = screen.indexOf('warend__dispatch');
    const ledger = screen.indexOf('warend__ledger');
    const deciding = screen.indexOf('report.deciding.map');
    expect(word).toBeGreaterThan(-1);
    expect(dispatch).toBeGreaterThan(word);
    expect(ledger).toBeGreaterThan(dispatch);
    expect(deciding).toBeGreaterThan(ledger);
  });
});
