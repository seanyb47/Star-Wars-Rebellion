import { describe, expect, it } from 'vitest';
import { HELD_SUPPORT_LEVEL, SUPPORT_FIRM, SUPPORT_STEADY, loyaltyBand } from '../constants';
import { islandTrade, smuggledShare, totalIncome } from '../economy';
import { generateGalaxy } from '../galaxy';
import { setSupport } from '../helpers';
import { driftSupport, leakInformation, loyaltyBands, reportLoyaltySlips } from '../support';
import { createRng } from '../rng';

describe('the three bands', () => {
  it('reads firm at ninety, steady at sixty, thin below it, and a revolt as its own', () => {
    expect(loyaltyBand(100)).toBe('firm');
    expect(loyaltyBand(SUPPORT_FIRM)).toBe('firm');
    expect(loyaltyBand(SUPPORT_FIRM - 1)).toBe('steady');
    expect(loyaltyBand(SUPPORT_STEADY)).toBe('steady');
    expect(loyaltyBand(SUPPORT_STEADY - 1)).toBe('thin');
    expect(loyaltyBand(0)).toBe('thin');
    // A revolt outranks the number, however well liked you were yesterday.
    expect(loyaltyBand(100, true)).toBe('uprising');
  });

  it('settles a governed island inside the steady band, not below it', () => {
    // Otherwise the thin band — a quarter of everything smuggled — would be
    // the resting state of every island in the game.
    expect(HELD_SUPPORT_LEVEL).toBeGreaterThanOrEqual(SUPPORT_STEADY);
    expect(HELD_SUPPORT_LEVEL).toBeLessThan(SUPPORT_FIRM);
    // Drift alone, with nobody arguing the other way: an island left to
    // itself climbs out of the thin band and stops inside steady.
    const state = generateGalaxy(5, 'empire');
    const island = state.systems.find((s) => s.control === 'empire')!;
    setSupport(island, 'empire', 40);
    for (let d = 0; d < 400; d++) driftSupport(state);
    expect(island.support.empire).toBeCloseTo(HELD_SUPPORT_LEVEL);
    expect(island.support.alliance).toBeCloseTo(100 - HELD_SUPPORT_LEVEL);
    expect(loyaltyBand(island.support.empire, island.uprising)).toBe('steady');
  });
});

describe('what a leaky harbour costs', () => {
  it('counts the enemy’s smuggled gold as income, so the banner adds up', () => {
    const state = generateGalaxy(101, 'empire');
    const theirs = state.systems.find(
      (s) => s.control === 'alliance' && islandTrade(s, 'alliance') > 0,
    )!;
    theirs.support.alliance = 30; // thin: a quarter comes our way
    const before = totalIncome(state, 'empire');
    theirs.support.alliance = 95; // firm: nothing does
    const after = totalIncome(state, 'empire');
    expect(before).toBeGreaterThan(after);
    expect(smuggledShare(theirs, 'alliance')).toBe(0);
  });

  it('puts a thin island of yours on the enemy’s charts, and the chain with it', () => {
    const state = generateGalaxy(101, 'empire');
    // Every Confederate island starts inside a Reach the Crown has charted,
    // so these are islands of theirs taken later, out past the charts.
    const held = state.systems.filter((s) => s.control === 'alliance');
    const thin = held[0];
    const neighbour = held.find((s) => s.sectorId === thin.sectorId && s.id !== thin.id);
    for (const s of held) s.explored.empire = false;
    for (const s of held) s.support.alliance = 95;
    thin.support.alliance = 20;

    let leaked = 0;
    for (let seed = 1; seed <= 300 && !thin.explored.empire; seed++) {
      leakInformation(state, createRng(seed));
      if (thin.explored.empire) leaked = seed;
    }
    expect(leaked).toBeGreaterThan(0);
    expect(state.events.some((e) => /has talked/.test(e.text))).toBe(true);
    // A harbour that talks talks about its neighbours: anything of theirs in
    // the same chain goes on the charts with it, however firm it is itself.
    if (neighbour) expect(neighbour.explored.empire).toBe(true);

    // A firm island in a chain of its own never says a word.
    const quiet = held.find((s) => s.sectorId !== thin.sectorId && !s.explored.empire);
    if (quiet) {
      for (const s of state.systems) {
        if (s.control === 'alliance' && s.sectorId === quiet.sectorId) s.support.alliance = 95;
      }
      for (let seed = 1; seed <= 300; seed++) leakInformation(state, createRng(seed));
      expect(quiet.explored.empire).toBe(false);
    }
  });

  it('says so the day an island slips a band, and says nothing on the days it holds', () => {
    const state = generateGalaxy(101, 'empire');
    const island = state.systems.find((s) => s.control === 'empire')!;
    island.support.empire = 95;
    const before = loyaltyBands(state);

    reportLoyaltySlips(state, before);
    expect(state.events.filter((e) => /customs books/.test(e.text))).toHaveLength(0);

    island.support.empire = 40;
    reportLoyaltySlips(state, before);
    const said = state.events.filter((e) => /customs books/.test(e.text));
    expect(said).toHaveLength(1);
    expect(said[0].text).toContain('25%');
    expect(said[0].systemId).toBe(island.id);
  });
});
