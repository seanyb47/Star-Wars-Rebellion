import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { chartedName } from '../helpers';

/**
 * The Crown has to *find* the meeting place.
 *
 * Sean, 21 September: *"If I play imperium it tells me where free port is
 * lol."* Opening any unexplored island in the frontier put **Freeport** in the
 * Location header, so the one thing the whole Crown campaign is about could be
 * answered by tapping round the map — no hull, no mission, no day spent.
 *
 * The cause is that the island really is renamed: the game draws an uncharted
 * island each war, calls it Freeport and keeps the painted name in
 * `chartName`. The name *is* the secret, and it was being printed.
 *
 * So the rule is the same as for everything else about an island you have not
 * been to: you learn what it is called by going there.
 */
describe('the Confederacy’s base is not named on the Crown’s charts', () => {
  it('reads as an ordinary island until the Crown has been there', () => {
    for (const seed of [11, 61, 203, 501, 9000]) {
      const state = generateGalaxy(seed, 'empire');
      const base = state.systems.find((s) => s.id === state.factions.alliance.hqSystemId)!;

      // Precondition: it really is renamed, and really is dark to the Crown.
      expect(base.name, `seed ${seed}`).toBe('Freeport');
      expect(base.chartName, `seed ${seed}`).toBeTruthy();
      expect(base.explored.empire, `seed ${seed}`).toBe(false);

      expect(chartedName(base, 'empire'), `seed ${seed}`).toBe(base.chartName);
      expect(chartedName(base, 'empire'), `seed ${seed}`).not.toBe('Freeport');
    }
  });

  it('reads as Freeport to the Confederacy, who signed the articles on it', () => {
    const state = generateGalaxy(501, 'alliance');
    const base = state.systems.find((s) => s.id === state.factions.alliance.hqSystemId)!;
    expect(base.explored.alliance).toBe(true);
    expect(chartedName(base, 'alliance')).toBe('Freeport');
  });

  it('gives the Crown the name once it has explored the island', () => {
    const state = generateGalaxy(501, 'empire');
    const base = state.systems.find((s) => s.id === state.factions.alliance.hqSystemId)!;
    expect(chartedName(base, 'empire')).not.toBe('Freeport');
    base.explored.empire = true;
    expect(chartedName(base, 'empire')).toBe('Freeport');
  });

  /**
   * And it changes nothing for the ordinary islands, which are the other
   * sixty-eight: they have no `chartName`, so the helper is the identity on
   * them whether they are charted or not.
   */
  it('leaves every other island reading the same either way', () => {
    const state = generateGalaxy(501, 'empire');
    const others = state.systems.filter((s) => s.id !== state.factions.alliance.hqSystemId);
    expect(others.length).toBeGreaterThan(60);
    for (const s of others) {
      expect(chartedName(s, 'empire'), s.name).toBe(s.name);
      expect(chartedName(s, 'alliance'), s.name).toBe(s.name);
    }
  });
});
