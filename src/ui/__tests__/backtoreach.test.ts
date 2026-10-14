import { describe, expect, it } from 'vitest';

/**
 * Closing a Location goes back to the Reach Map it was opened from.
 *
 * Found by playing: a Location opens *in place of* the Reach Map rather than
 * on top of it — one sheet at a time is the shape of this screen — so the
 * cross used to drop you all the way out to the World Map. Reading a chain
 * island by island, which is most of what looking at the chart is for, then
 * cost two taps each time: reach, island, close, reach again, island.
 *
 * `App.tsx` is one large component with no seam to render in a test, so this
 * reads the source the way `shipcard.test.ts` reads the Almanac's: what it
 * checks is that the crumb is taken, honoured, and dropped on every other way
 * in. A test that rendered it would be better; a test that pretends to is not.
 */
const SOURCE = (
  import.meta.glob('../App.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
)['../App.tsx'];

describe('closing a Location', () => {
  it('remembers where the island was opened from', () => {
    expect(SOURCE).toBeTruthy();
    expect(SOURCE).toMatch(/const \[cameFrom, setCameFrom\] = useState</);
    // Taken in `openIslandTab`, which is the one path in from a chain.
    expect(SOURCE).toMatch(
      /setCameFrom\(\s*\n?\s*openReachId \? \{ kind: 'reach', id: openReachId \}/,
    );
  });

  it('puts that sheet back when the cross is tapped', () => {
    expect(SOURCE).toContain("if (cameFrom?.kind === 'reach') setOpenReachId(cameFrom.id);");
    expect(SOURCE).toContain("if (cameFrom?.kind === 'list') setOpenListId(cameFrom.id);");
    // And the crumb is eaten, so a second close does not bounce you back in.
    const onClose = SOURCE.slice(SOURCE.indexOf('setOpenSystemId(null);\n            if (cameFrom'));
    expect(onClose.slice(0, 400)).toContain('setCameFrom(null);');
  });

  /**
   * The other ways an island opens — from the World Map, from a jump, from the
   * log, from the build sheet — have no chain behind them, and a stale crumb
   * there would send the cross somewhere the player never was. Counted rather
   * than named: the number is the point, and a new way in that forgets to
   * clear it should fail this.
   */
  it('drops the crumb on every other way into an island', () => {
    const opens = SOURCE.match(/setOpenSystemId\((?!null)/g) ?? [];
    const clears = SOURCE.match(/setCameFrom\(null\);/g) ?? [];
    expect(opens.length, 'ways into an island sheet').toBeGreaterThanOrEqual(5);
    // One clear per non-chain opener, plus the one in onClose and the one in
    // startNewGame.
    expect(clears.length).toBeGreaterThanOrEqual(opens.length);
  });
});
