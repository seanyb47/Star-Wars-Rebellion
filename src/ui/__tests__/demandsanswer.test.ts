import { describe, expect, it } from 'vitest';

/**
 * A sheet whose every button is an order must not have a hidden one.
 *
 * The mission report's close handler was `choose('return')` — the same call as
 * the "Set sail" button. So tapping the dark area outside the sheet, or the ✕,
 * recalled the officer irreversibly and spent the fortnight, with no
 * confirmation and no way back. It is the first thing a new player does when a
 * sheet they do not understand appears, which made it the worst bug on the
 * screen and the hardest to notice, because from the outside it looks like the
 * game simply taking an order.
 *
 * `App.tsx` and `components.tsx` are both single large components with no seam
 * to render in a test, so this reads their source the way `backtoreach.test.ts`
 * reads App's. What it pins is the shape: the report declares itself a
 * question, and the Sheet honours that by withholding both dismissals.
 */
const FILES = import.meta.glob('../*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const APP = FILES['../App.tsx'];
const COMPONENTS = FILES['../components.tsx'];

describe('a sheet that demands an answer', () => {
  it('never lets the mission report close itself into an order', () => {
    expect(APP).toBeTruthy();
    // The recall lives on its button and nowhere else. Matched as a call
    // site rather than as a string, since the comment explaining all this
    // quotes the old handler and should be allowed to.
    const orders = APP.match(/=\{\(\) => choose\('return'\)\}/g) ?? [];
    expect(orders.length, "handlers wired to choose('return')").toBe(1);
    expect(APP).toContain("onClick={() => choose('return')}");
    expect(APP).toContain("onClose={() => {}}");
    expect(APP).toMatch(/demands=\{`\$\{character\.name\} is waiting on your word\.`\}/);
  });

  it('withholds the cross and the scrim when a sheet demands one', () => {
    expect(COMPONENTS).toBeTruthy();
    // The scrim routes through `dismiss`, which is the thing that knows.
    expect(COMPONENTS).toContain('onClick={dismiss}');
    expect(COMPONENTS).toContain(
      'const dismiss = () => (demands ? setNudged(true) : props.onClose());',
    );
    // Both crosses — the header's and flow mode's collapsed bar — are gated.
    const gates = COMPONENTS.match(/\{!demands && \(/g) ?? [];
    expect(gates.length, 'close controls gated on `demands`').toBe(2);
  });

  /**
   * And it says so rather than doing nothing. A tap that is simply swallowed
   * teaches the player that taps are unreliable, which is a worse lesson than
   * the one they opened the sheet for.
   */
  it('answers the tap it refuses', () => {
    expect(COMPONENTS).toContain('sheet__demand');
    expect(COMPONENTS).toContain('sheet--nudged');
    expect(COMPONENTS).toContain('role="status"');
  });
});

/**
 * And the chrome stays reachable and visible behind a sheet.
 *
 * Three rules in `styles.css` have to agree for this and they are in three
 * different places, so the numbers are pinned here rather than trusted: the
 * scrims sit below the chrome, the chrome below the sheets, and a sheet stops
 * at the top of the tab bar instead of running under it.
 */
const CSS = (
  import.meta.glob('../styles.css', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../styles.css'];

describe('the chrome behind a sheet', () => {
  /*
   * The z-index a selector is given.
   *
   * Every one of these names is declared more than once — `.sheet` has a
   * width rule in the print block as well as the real one — so this takes the
   * first declaration that actually sets a z-index rather than the first
   * declaration at all.
   */
  const zOf = (rule: string) => {
    for (let at = CSS.indexOf(rule); at !== -1; at = CSS.indexOf(rule, at + 1)) {
      const body = CSS.slice(at, CSS.indexOf('}', at));
      const found = /z-index:\s*(\d+)/.exec(body);
      if (found) return Number(found[1]);
    }
    throw new Error(`no z-index on ${rule} in styles.css`);
  };

  it('puts the scrims under the chrome and the chrome under the sheets', () => {
    const scrim = zOf('.scrim {');
    const chrome = zOf('.tabbar {');
    const topbar = zOf('.topbar {');
    const sheet = zOf('.sheet {');
    expect(chrome, 'the tab bar sits above the scrim, so taps reach it').toBeGreaterThan(scrim);
    expect(topbar, 'and so does the top bar').toBeGreaterThan(scrim);
    expect(sheet, 'a sheet draws over the chrome, never under it').toBeGreaterThan(chrome);
    // A dispatch card owns the screen and beats all of them.
    expect(zOf('.dispatch {')).toBeGreaterThan(sheet);
  });

  it('stops a sheet at the top of the tab bar', () => {
    // Without this the sheet runs under the bar and hides its own buttons —
    // on the mission report, the two orders it exists to offer.
    expect(CSS).toContain('bottom: var(--tabbar-h, 64px)');
    // Which only works because the bar measures itself.
    const TABBAR = (
      import.meta.glob('../TabBar.tsx', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>
    )['../TabBar.tsx'];
    expect(TABBAR).toContain("setProperty('--tabbar-h'");
    expect(TABBAR).toContain('ResizeObserver');
    // And the sheet no longer paints 160px of itself below its own edge,
    // which is what used to land on the tabs.
    expect(CSS).not.toContain('.sheet::after {');
  });

  it('closes what is open before it navigates, except on a decision', () => {
    expect(APP).toContain('const closePanels = useCallback(() => {');
    expect(APP).toContain('if (decision) return false;');
    // Every chrome route that changes screens goes through it.
    const guards = APP.match(/if \(!closePanels\(\)\) return;/g) ?? [];
    expect(guards.length, 'chrome handlers that stand aside for a decision').toBeGreaterThanOrEqual(4);
  });
});
