import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { canSee } from '../missions';
import { otherFaction } from '../helpers';

/**
 * What a side is allowed to hear about.
 *
 * Sean, 22 September, after `lab/leak.ts` measured the log: *"always your own
 * side + enemy fleets actively at locations you control. Fog of war is
 * everything else. However, you can clear fog of war through detection and
 * espionage/covert ops."*
 *
 * The log used to print `state.events` whole, which is both sides' orders in
 * one list. Playing the Crown and giving no orders, 111 of 145 events belonged
 * to the Confederacy, named: who sailed where and what for, who took command
 * of which island, when their troops finished drilling. Through `canSee` the
 * same twelve games leave **1 of 17**.
 *
 * `canSee` is deliberately derived rather than stored. A `faction` flag on
 * `GameEvent` would have to be set at every push site, and half of them would
 * be wrong within a month; deriving it from the character and the island means
 * an event written next year is fogged correctly without its author knowing
 * this rule exists.
 */
describe('what a side can hear about', () => {
  it('always hears about its own crew, wherever they are', () => {
    const state = generateGalaxy(7, 'empire');
    const mine = state.characters.find((c) => c.faction === 'empire')!;
    // On an enemy island, unexplored, with no report: still yours to know.
    const theirs = state.systems.find((s) => s.control === 'alliance')!;
    theirs.explored.empire = false;
    expect(canSee(state, { characterId: mine.id, systemId: theirs.id }, 'empire')).toBe(true);
  });

  it('hears nothing of enemy crew on an island it cannot see', () => {
    const state = generateGalaxy(7, 'empire');
    const theirs = state.characters.find((c) => c.faction === 'alliance')!;
    const island = state.systems.find((s) => s.control === 'alliance')!;
    island.explored.empire = false;
    state.fleets = state.fleets.filter((f) => f.systemId !== island.id);
    for (const c of state.characters) {
      if (c.faction === 'empire' && c.locationSystemId === island.id) c.locationSystemId = '';
    }
    expect(canSee(state, { characterId: theirs.id, systemId: island.id }, 'empire')).toBe(false);
  });

  it('hears about an enemy on an island it holds', () => {
    const state = generateGalaxy(7, 'empire');
    const theirs = state.characters.find((c) => c.faction === 'alliance')!;
    const mine = state.systems.find((s) => s.control === 'empire')!;
    expect(canSee(state, { characterId: theirs.id, systemId: mine.id }, 'empire')).toBe(true);
  });

  /**
   * And the covert half of the rule: a fortnight of espionage buys the news.
   * This is the reason the mission exists, so it is asserted rather than
   * assumed — the same island, the same event, before and after a report.
   */
  it('hears about a fogged island once espionage has looked at it', () => {
    const state = generateGalaxy(7, 'empire');
    const island = state.systems.find((s) => s.control === 'alliance')!;
    island.explored.empire = true;
    state.fleets = state.fleets.filter((f) => f.systemId !== island.id);
    for (const c of state.characters) {
      if (c.faction === 'empire' && c.locationSystemId === island.id) c.locationSystemId = '';
    }
    const theirs = state.characters.find((c) => c.faction === 'alliance')!;
    const event = { characterId: theirs.id, systemId: island.id };
    expect(canSee(state, event, 'empire')).toBe(false);

    state.intel = {
      ...(state.intel ?? {}),
      empire: {
        ...(state.intel?.empire ?? {}),
        [island.id]: { day: state.day, island, watch: 0 },
      },
    } as typeof state.intel;
    expect(canSee(state, event, 'empire')).toBe(true);
  });

  /** News about nobody and nowhere — the ledger, the end of the war. */
  it('lets through what has no island and no crew', () => {
    const state = generateGalaxy(7, 'empire');
    expect(canSee(state, {}, 'empire')).toBe(true);
  });

  /** The rule is symmetric: the opponent is fogged by exactly the same call. */
  it('fogs both sides alike', () => {
    const state = generateGalaxy(7, 'empire');
    const mineIsland = state.systems.find((s) => s.control === 'empire')!;
    mineIsland.explored.alliance = false;
    const mine = state.characters.find((c) => c.faction === 'empire')!;
    expect(
      canSee(state, { characterId: mine.id, systemId: mineIsland.id }, otherFaction('empire')),
    ).toBe(false);
  });
});
