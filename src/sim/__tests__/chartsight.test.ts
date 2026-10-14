import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { layerMark } from '../layers';
import { fileReport, sightOf, writeReport } from '../missions';
import type { GameState, System } from '../types';

/**
 * The chart may not know more than the island sheet does.
 *
 * Sean, 20 September, with a screenshot of the World Map: *"When I look at map
 * it says imperium fleet in the wreckers reach but when I click on the island
 * it says no reports."* Two screens reading two different sources. The sheet
 * has gone dark on unreported enemy ground since the watch went in; the chart
 * layers were counting off the live world, which handed back for free exactly
 * what espionage is sold as buying.
 *
 * So the rule under test is not "the Fleets layer hides the Crown" — it is
 * that no layer lights an island with something `sightOf` says this side
 * cannot see. Written that way so a layer added later is covered by it.
 */
const enemyIsland = (state: GameState, sight: 'none' | 'eyes'): System | undefined =>
  state.systems.find(
    (s) => s.control === 'empire' && s.explored.alliance && sightOf(state, s, 'alliance') === sight,
  );

describe('the chart knows exactly what the island sheet knows', () => {
  it('does not count enemy hulls on an island with no report', () => {
    let checked = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const state = generateGalaxy(seed, 'alliance');
      for (const system of state.systems) {
        if (system.control !== 'empire' || !system.explored.alliance) continue;
        if (sightOf(state, system, 'alliance') !== 'none') continue;
        // Their whole navy could be lying there; the chart must not say so.
        const enemyHulls = state.fleets
          .filter((f) => f.faction === 'empire' && f.systemId === system.id && !f.voyage)
          .reduce((n, f) => n + f.ships.length, 0);
        if (enemyHulls === 0) continue;
        checked += 1;
        const mark = layerMark(state, system, 'fleets', 'alliance');
        expect(mark.count ?? 0, `seed ${seed}: ${system.name} carries ${enemyHulls}`).toBe(0);
      }
    }
    // Non-vacuity: this has to have been a real opportunity to leak.
    expect(checked).toBeGreaterThan(0);
  });

  it('still counts your own hulls wherever they lie', () => {
    const state = generateGalaxy(3, 'alliance');
    const home = state.fleets.find((f) => f.faction === 'alliance')!;
    const island = state.systems.find((s) => s.id === home.systemId)!;
    const mark = layerMark(state, island, 'fleets', 'alliance');
    expect(mark.count).toBe(home.ships.length);
  });

  it('shows their hulls once you have a squadron lying there', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const state = generateGalaxy(seed, 'alliance');
      const dark = enemyIsland(state, 'none');
      if (!dark) continue;
      const enemyHulls = state.fleets
        .filter((f) => f.faction === 'empire' && f.systemId === dark.id && !f.voyage)
        .reduce((n, f) => n + f.ships.length, 0);
      if (enemyHulls === 0) continue;
      expect(layerMark(state, dark, 'fleets', 'alliance').count ?? 0).toBe(0);
      // Sail one of yours in and the harbor is no longer a secret.
      const mine = state.fleets.find((f) => f.faction === 'alliance')!;
      mine.systemId = dark.id;
      delete mine.voyage;
      expect(sightOf(state, dark, 'alliance')).toBe('eyes');
      expect(layerMark(state, dark, 'fleets', 'alliance').count).toBe(
        enemyHulls + mine.ships.length,
      );
      return;
    }
    throw new Error('no dark enemy island with hulls in twenty worlds');
  });

  it('counts what a report said lay there, and does not update it', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const state = generateGalaxy(seed, 'alliance');
      const dark = enemyIsland(state, 'none');
      if (!dark) continue;
      const theirs = state.fleets.filter(
        (f) => f.faction === 'empire' && f.systemId === dark.id && !f.voyage,
      );
      const hulls = theirs.reduce((n, f) => n + f.ships.length, 0);
      if (hulls === 0) continue;
      expect(layerMark(state, dark, 'fleets', 'alliance').count ?? 0).toBe(0);

      // Somebody goes and looks.
      const spy = state.characters.find((c) => c.faction === 'alliance')!;
      fileReport(state, 'alliance', writeReport(state, 'alliance', dark, spy));
      expect(sightOf(state, dark, 'alliance')).toBe('report');
      expect(layerMark(state, dark, 'fleets', 'alliance').count).toBe(hulls);

      // And then the squadron sails. The chart keeps saying what the report
      // said, because that is all this side has been told — the whole point
      // of a report being dated rather than live.
      for (const f of theirs) f.systemId = state.factions.empire.hqSystemId;
      expect(layerMark(state, dark, 'fleets', 'alliance').count).toBe(hulls);
      return;
    }
    throw new Error('no dark enemy island with hulls in twenty worlds');
  });

  it('does not price an enemy island it has never had a report on', () => {
    let checked = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const state = generateGalaxy(seed, 'alliance');
      for (const system of state.systems) {
        if (system.control !== 'empire' || !system.explored.alliance) continue;
        if (sightOf(state, system, 'alliance') !== 'none') continue;
        checked += 1;
        expect(layerMark(state, system, 'worth', 'alliance').count ?? 0).toBe(0);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('prices one you can see for yourself', () => {
    const state = generateGalaxy(5, 'empire');
    const own = state.systems.find(
      (s) => s.control === 'empire' && s.facilities.some((f) => f.type === 'refinery'),
    )!;
    expect(layerMark(state, own, 'worth', 'empire').count ?? 0).toBeGreaterThan(0);
  });
});
