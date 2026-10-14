import { describe, expect, it } from 'vitest';

/**
 * A ring on every island says nothing.
 *
 * Sean, 24 September, with a fleet picked and the whole of Sovereign Reach
 * ringed in green: *"I think the green rings are the issue. I don't mind the
 * color change for neutral to yellowish but the rings make it hard to see
 * anyone else. Do we need them?"*
 *
 * The prop's own comment gave the answer away — *"a fleet is choosing where to
 * sail, and it can sail anywhere"* — so in sailing mode the ring was drawn
 * fifteen times out of fifteen, over fifteen names and fifteen loyalty bars,
 * marking a set it was not narrowing at all. The other two picking modes do
 * narrow: a build order lights only islands of yours, a mission only the ones
 * offering it, colour-coded by the kind of work. There the ring is the point.
 *
 * So the condition is the **set**, not the mode: `ringsNarrow`. Both charts
 * ask it, and they have to agree, or a ring appears on zooming in and not on
 * zooming out.
 */
const MAPS = import.meta.glob('../{ChainMap.tsx,GalaxyMap.tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('the pick ring', () => {
  it('is drawn on both charts only where it narrows the choice', () => {
    for (const [file, src] of Object.entries(MAPS)) {
      expect(src, `${file} does not ask whether the ring narrows`).toMatch(
        /const ringsNarrow\s*=/,
      );
      expect(src, `${file} draws the ring without asking`).toMatch(
        /\{ringsNarrow && live && \(/,
      );
    }
  });

  it('never keys the ring off the picking mode alone', () => {
    // The old condition, in both files: true in sailing mode on every island
    // and every chain there is.
    for (const [file, src] of Object.entries(MAPS)) {
      expect(src, `${file} still rings on the mode`).not.toMatch(
        /\{\(sailing \|\| pickingFor \|\| choosing\) && live/,
      );
      expect(src, `${file} still rings on the mode`).not.toMatch(
        /\{\(sailing \|\| choosing \|\| \(pickingFor && targets > 0\)\) &&/,
      );
    }
  });

  it('still requires a picking mode at all, so a resting chart is bare', () => {
    for (const [file, src] of Object.entries(MAPS)) {
      const at = src.indexOf('const ringsNarrow');
      const rule = src.slice(at, at + 220);
      expect(rule, `${file} could ring a chart nobody is picking on`).toMatch(
        /sailing \|\| pickingFor \|\| choosing/,
      );
    }
  });

  it('keeps the colours that say which work a ring means', () => {
    // Brass for signing on, a broken brass ring for covert work. Those carry
    // meaning the green never did, and none of this touches them.
    const chain = MAPS['../ChainMap.tsx'];
    expect(chain).toMatch(/map__pick--incite/);
    expect(chain).toMatch(/map__pick--recruit/);
  });

  it('counts a difference in kind as narrowing, not only a shorter list', () => {
    /*
     * The first cut of this rule asked only whether some island was out of
     * the running, and that threw away a real signal: picking a mission
     * target lights nearly every island — almost anything charted can be
     * spied on — but the rings are not all the same ring. Measured in the
     * browser on a day-40 save, Sovereign Reach draws thirteen green and two
     * broken brass, and those two are the Confederate islands where the work
     * would be covert. Fifteen identical rings are worth nothing; thirteen
     * and two are worth looking at.
     */
    const chain = MAPS['../ChainMap.tsx'];
    expect(chain).toMatch(/const ringKind/);
    expect(chain).toMatch(/new Set\(systems\.filter\(isLive\)\.map\(ringKind\)\)\.size > 1/);
  });
});
