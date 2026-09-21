import { describe, expect, it } from 'vitest';
import { advanceDay } from '../advanceDay';
import { generateGalaxy } from '../galaxy';
import { inProse } from '../helpers';

/**
 * A label keeps its capital; a sentence gets the article it wants.
 *
 * The 19 September rename made the Crown's seat **the Aldermain**, and the
 * opening dispatch — the most-read sentence in the game, since every Crown
 * game starts with it — immediately read *"hold The Aldermain, whatever
 * else."* Four islands had the same problem before it and nobody had noticed,
 * because none of them was named as often as a capital is.
 *
 * The seat is **Highwater** again since 21 September — Sean: *"Aldermain is
 * the big island not the port! Revert the port back to the name Highwater"* —
 * and carries no article at all, so the sentence that started this no longer
 * exists. The rule outlived it: The Kettles, The Shoals, The Terraces and The
 * White Flats are still named as often as anything else on the chart, and the
 * war-long sweep at the bottom is what actually guards them.
 */
describe('an island name inside a sentence', () => {
  it('drops the article to lower case, and touches nothing else', () => {
    expect(inProse('The Kettles')).toBe('the Kettles');
    expect(inProse('The Shoals')).toBe('the Shoals');
    expect(inProse('The White Flats')).toBe('the White Flats');
    // Not a leading article, so not its business. Thebes would be a fine name
    // for an island and this must not eat its T.
    expect(inProse('Theydon Cay')).toBe('Theydon Cay');
    expect(inProse('Gibbet Rock')).toBe('Gibbet Rock');
    expect(inProse('Hearsay Cay')).toBe('Hearsay Cay');
  });

  it('reads right in the opening dispatch, for both sides', () => {
    for (const side of ['empire', 'alliance'] as const) {
      const state = generateGalaxy(11, side);
      const opening = state.events.map((e) => e.text).join(' ');
      expect(opening).not.toMatch(/hold The /);
      // Mid-sentence only: "The Free Confederacy is formed..." and "The Imperium
      // will come looking" are proper nouns opening a sentence and are right.
      expect(opening).not.toMatch(/[^.!?\u2014]\s(The [A-Z])/);
    }
  });

  /**
   * And an island is still called what it is called. The helper is for
   * sentences; the data, the chart and the tab keep the capital.
   *
   * The seat is the wrong island to check that on now — Highwater has no
   * article to keep — so it checks both halves: the seat reads plainly, and an
   * island that *does* wear one still has it in the data.
   */
  it('leaves an island itself named with its capital article', () => {
    const state = generateGalaxy(11, 'empire');
    const seat = state.systems.find((s) => s.id === state.factions.empire.hqSystemId)!;
    expect(seat.name).toBe('Highwater');
    const kettles = state.systems.find((s) => s.name.endsWith('Kettles'))!;
    expect(kettles.name).toBe('The Kettles');
  });

  /**
   * And the whole log, not just the opening.
   *
   * The opening dispatch was the line that showed the problem, but it was not
   * the only one carrying it: a played-out war turned up eight more — the
   * customs books, a fleet weighing anchor, four errand reports, a charting
   * report and a creature sighting. They were found by playing wars and
   * reading every line, rather than by grepping for `${'$'}{system.name}` and
   * guessing which of the hundred and thirty-eight sites were mid-sentence,
   * so this test does the same thing and keeps doing it.
   */
  it('never leaves a capital article mid-sentence anywhere in a war', () => {
    const article = /[^.!?"'(\u2014\u2013-]\s(The [A-Z])/;
    // Six seeds rather than two.
    //
    // Two was enough to catch the island names this was written for, and not
    // enough to catch a *creature* named "the Derelict": on 20 September the
    // ground went proportional, the worlds behind seeds 3 and 17 changed, and
    // seed 3 promptly turned up "Rumours of The Derelict are spreading in the
    // Far Sea." The bug was a year old in everything but discovery — one line
    // of `creatures.ts` out of six puts a beast anywhere but the start of a
    // sentence, and it was the one without `inProse` on it. More seeds is the
    // cheap half of not relying on luck twice.
    for (const seed of [3, 11, 17, 23, 29, 31]) {
      let state = generateGalaxy(seed, seed % 2 ? 'empire' : 'alliance');
      const seen = new Set<string>();
      const caught: string[] = [];
      for (let day = 0; day < 250; day++) {
        state = advanceDay(state);
        for (const e of state.events) {
          if (seen.has(e.id)) continue;
          seen.add(e.id);
          if (article.test(e.text)) caught.push(e.text);
        }
      }
      // Non-vacuity: a war this long always writes plenty of lines.
      expect(seen.size).toBeGreaterThan(50);
      expect(caught, `seed ${seed}`).toEqual([]);
    }
  });
});
