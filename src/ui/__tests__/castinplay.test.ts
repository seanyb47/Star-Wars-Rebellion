import { describe, expect, it } from 'vitest';
import { everyone, inThisWar } from '../Almanac';
import { generateGalaxy } from '../../sim/galaxy';
import { START_CHARACTERS } from '../../sim/galaxy';
import characterRoster from '../../data/characters.json';

/**
 * Sean's playtest: *"The Encyclopedia lists Ros Carrow and 'Big' Torvik under
 * 'Yours,' but they never appear in the Crew roster."*
 *
 * They do not, and could not: the bible has seven a side, the opening draw
 * seats four and five, and the undrawn are not put into the recruit pool
 * either — they are simply not in that war. The encyclopedia is a reference to
 * the whole cast and keeps listing them; what it stops doing is flying a flag
 * over them.
 */
describe('the cast the encyclopedia lists against the cast in the game', () => {
  it('lists more people than any one war seats', () => {
    expect(characterRoster.empire.length).toBeGreaterThan(START_CHARACTERS.empire);
    expect(characterRoster.alliance.length).toBeGreaterThan(START_CHARACTERS.alliance);
  });

  it('can tell which of the page’s faces are in the war in front of you', () => {
    for (const seed of [3, 55, 203]) {
      const state = generateGalaxy(seed, 'alliance');
      const present = inThisWar(state);
      const named = everyone().filter((c) => c.side !== 'neutral');
      const absent = named.filter((c) => !present.has(c.name));

      // Exactly the people the draw left out: seven a side, nine seated.
      expect(named.length - absent.length).toBe(
        START_CHARACTERS.empire + START_CHARACTERS.alliance,
      );
      expect(absent.length).toBeGreaterThan(0);

      // And none of them is reachable any other way — not in the pool, not
      // signable, not anywhere in the state.
      for (const who of absent) {
        expect(state.characters.some((c) => c.name === who.name)).toBe(false);
      }
    }
  });
});
