import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { setSupport } from '../helpers';
import { watchOf } from '../constants';
import {
  captureChance,
  foilChance,
  isCovert,
  missionOdds,
  takePost,
  watchOn,
} from '../missions';

/**
 * Sean's rule, 17 September, in one sentence of his own: *"all garrisons have
 * a detection score. So do all crew members... If a crew member is idle their
 * detection score is added to the island's overall detection score. Loyalty
 * also improves detection. And a crew member set to command improves the
 * overall detection score of the island by a factor of their leadership.
 * Therefore covert action is more easily succeeded when enemy loyalty is low.
 * There is no commander or crew on the island. There are few garrisons."*
 *
 * Four terms, and this is each of them.
 */
describe('the watch', () => {
  function enemyIsland(seed = 501) {
    const state = generateGalaxy(seed, 'empire');
    const island = state.systems.find((s) => s.control === 'alliance' && s.populated)!;
    island.explored.empire = true;
    island.uprising = false;
    // Nobody standing about on it to begin with, so each term can be added.
    for (const c of state.characters) {
      if (c.locationSystemId === island.id) c.locationSystemId = state.systems[0].id;
    }
    return { state, island };
  }

  it('counts the companies ashore, and counts more of them for more of them', () => {
    const { state, island } = enemyIsland();
    island.garrison = 1;
    const thin = watchOn(state, island, 'empire');
    island.garrison = 6;
    const thick = watchOn(state, island, 'empire');
    expect(thin.garrison).toBeGreaterThan(0);
    expect(thick.garrison).toBeGreaterThan(thin.garrison);
  });

  it('rises with the holder’s loyalty, which is what makes stirring an island pay twice', () => {
    const { state, island } = enemyIsland();
    setSupport(island, 'alliance', 100);
    const loyal = watchOn(state, island, 'empire').people;
    setSupport(island, 'alliance', 40);
    const sullen = watchOn(state, island, 'empire').people;
    expect(loyal).toBeGreaterThan(sullen);
    // Incitement pushes their grip down, which lowers the watch *and* makes
    // the next incitement easier. That chain is the whole design.
    setSupport(island, 'alliance', 90);
    const hard = watchOn(state, island, 'empire').total;
    setSupport(island, 'alliance', 55);
    expect(watchOn(state, island, 'empire').total).toBeLessThan(hard);
  });

  it('counts their crew only while they are standing about', () => {
    const { state, island } = enemyIsland();
    const idler = state.characters.find((c) => c.faction === 'alliance')!;
    idler.locationSystemId = island.id;
    idler.status = 'available';
    idler.mission = undefined;
    const watching = watchOn(state, island, 'empire').idle;
    expect(watching).toBe(watchOf(idler));

    // Away on an errand of their own: not watching the quay. An island whose
    // officers are all out working is an island with its guard down.
    idler.status = 'on_mission';
    expect(watchOn(state, island, 'empire').idle).toBe(0);
  });

  it('counts whoever holds the chair, on their leadership', () => {
    const { state, island } = enemyIsland();
    const boss = state.characters.find(
      (c) => c.faction === 'alliance' && (c.roles ?? []).some((r) => r === 'Leader' || r === 'General'),
    )!;
    boss.locationSystemId = island.id;
    boss.status = 'available';
    boss.mission = undefined;
    const idling = watchOn(state, island, 'empire');
    takePost(state, boss, island);
    const seated = watchOn(state, island, 'empire');
    // A chair is the whole of the job, not a side effect of being there.
    expect(seated.commander).toBeGreaterThan(idling.idle);
    expect(seated.total).toBeGreaterThan(idling.total);
  });

  it('is what a covert errand has to get past, and open work barely notices', () => {
    const { state, island } = enemyIsland();
    island.garrison = 6;
    const agent = state.characters.find((c) => c.faction === 'empire')!;
    agent.espionage = 30;
    const sneaking = foilChance(state, island, 'empire', agent, 'incite');
    const talking = foilChance(state, island, 'empire', agent, 'diplomacy');
    expect(sneaking).toBeGreaterThan(talking);

    // And espionage is the whole of the first stage, whatever the errand needs
    // once inside.
    agent.espionage = 95;
    expect(foilChance(state, island, 'empire', agent, 'incite')).toBeLessThan(sneaking);

    // Never on your own ground: nobody is hunting you at home.
    const home = state.systems.find((s) => s.control === 'empire')!;
    expect(foilChance(state, home, 'empire', agent, 'sabotage')).toBe(0);
  });

  it('takes you only where somebody could hold you', () => {
    const { state, island } = enemyIsland();
    const agent = state.characters.find((c) => c.faction === 'empire')!;
    agent.combat = 20;
    island.garrison = 8;
    expect(captureChance(state, island, 'empire', agent)).toBeGreaterThan(0);

    // An island that has not chosen a side has no gaol of yours to put anybody
    // in and no reason to hand a stranger to the Crown.
    const neutral = state.systems.find((s) => s.control === 'neutral' && s.populated)!;
    neutral.garrison = 8;
    expect(captureChance(state, neutral, 'empire', agent)).toBe(0);
  });

  it('names the five errands done out of sight, and only those', () => {
    for (const covert of ['incite', 'sabotage', 'abduct', 'rescue', 'survey'] as const) {
      expect(isCovert(covert), covert).toBe(true);
    }
    for (const open of ['diplomacy', 'recruit', 'command', 'research'] as const) {
      expect(isCovert(open), open).toBe(false);
    }
  });

  it('sets a rescue against the gaolers and an incitement against the loyalty', () => {
    const { state, island } = enemyIsland();
    const agent = state.characters.find((c) => c.faction === 'empire')!;
    agent.combat = 90;
    agent.leadership = 90;

    island.garrison = 1;
    const thinGaol = missionOdds(state, agent, island, 'empire', 'rescue');
    island.garrison = 8;
    expect(missionOdds(state, agent, island, 'empire', 'rescue')).toBeLessThan(thinGaol);

    setSupport(island, 'alliance', 95);
    const tight = missionOdds(state, agent, island, 'empire', 'incite');
    setSupport(island, 'alliance', 55);
    expect(missionOdds(state, agent, island, 'empire', 'incite')).toBeGreaterThan(tight);
  });
});
