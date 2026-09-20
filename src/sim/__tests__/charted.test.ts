import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { summariseReach, summariseSea } from '../reach';
import type { GameState, PlayableFaction } from '../types';

/**
 * A Reach summary counts what you have been to.
 *
 * Sean's playtest: *"Coral Reach summary said 'Unaligned 1' while every other
 * island there was unexplored. Possible info leak."* It was one. The four
 * counts, the mutiny badge and the mean allegiance were all taken over every
 * island in the chain, charted or not, so the summary handed a player the
 * shape of water their boats had never entered.
 */
function darkReach(state: GameState, faction: PlayableFaction) {
  return state.sectors.find((sector) => {
    const here = state.systems.filter((s) => s.sectorId === sector.id);
    // And one of those dark islands has to belong in a count when it is
    // charted. An unsettled rock has `control: 'none'`, which is none of
    // held, enemy-held or unaligned, so charting one moves the uncharted
    // figure and nothing else — and the half of the test below that watches a
    // count go up would be watching a number that cannot move.
    return here.length > 1 && here.some((s) => !s.explored[faction] && s.control !== 'none');
  })!;
}

describe('a Reach summary is what has been charted', () => {
  it('leaves an uncharted island out of the counts and says how many are left', () => {
    const state = generateGalaxy(55, 'alliance');
    const sector = darkReach(state, 'alliance');
    const here = state.systems.filter((s) => s.sectorId === sector.id);
    const dark = here.filter((s) => !s.explored.alliance);
    expect(dark.length).toBeGreaterThan(0);

    const summary = summariseReach(state, sector.id, 'alliance');
    expect(summary.uncharted).toBe(dark.length);
    expect(summary.held + summary.enemyHeld + summary.unaligned).toBe(here.length - dark.length);

    // Chart one of them and it joins whichever count it belongs in — one that
    // somebody holds, for the reason in `darkReach` above.
    const found = dark.find((s) => s.control !== 'none')!;
    const was = summary;
    found.explored.alliance = true;
    const now = summariseReach(state, sector.id, 'alliance');
    expect(now.uncharted).toBe(was.uncharted - 1);
    const owner =
      found.control === 'alliance' ? 'held' : found.control === 'empire' ? 'enemyHeld' : 'unaligned';
    expect(now[owner]).toBe(was[owner] + 1);
  });

  it('does not average an uncharted island into the Reach’s allegiance', () => {
    const state = generateGalaxy(55, 'alliance');
    const sector = darkReach(state, 'alliance');
    const dark = state.systems.find((s) => s.sectorId === sector.id && !s.explored.alliance)!;
    dark.populated = true;
    dark.support = { alliance: 100, empire: 0 };
    const before = summariseReach(state, sector.id, 'alliance').allegiance.alliance;
    dark.support = { alliance: 0, empire: 100 };
    expect(summariseReach(state, sector.id, 'alliance').allegiance.alliance).toBe(before);

    // And once it is charted, it counts like everything else.
    dark.support = { alliance: 100, empire: 0 };
    dark.explored.alliance = true;
    const settled = state.systems.filter(
      (s) => s.sectorId === sector.id && s.populated && s.explored.alliance,
    );
    const mean = settled.reduce((n, s) => n + s.support.alliance, 0) / settled.length;
    expect(summariseReach(state, sector.id, 'alliance').allegiance.alliance).toBeCloseTo(mean, 6);
    expect(mean).toBeGreaterThan(0);
  });

  it('keeps a mutiny in the dark out of the badge', () => {
    const state = generateGalaxy(55, 'alliance');
    const sector = darkReach(state, 'alliance');
    const dark = state.systems.find((s) => s.sectorId === sector.id && !s.explored.alliance)!;
    const before = summariseReach(state, sector.id, 'alliance').mutinies;
    dark.uprising = true;
    expect(summariseReach(state, sector.id, 'alliance').mutinies).toBe(before);
  });

  it('adds up the same way across a whole Sea', () => {
    const state = generateGalaxy(55, 'alliance');
    const sea = state.sectors[0].sea;
    const summary = summariseSea(state, sea, 'alliance');
    const counted = summary.held + summary.enemyHeld + summary.unaligned + summary.uncharted;
    expect(counted).toBe(summary.islands);
  });
});
