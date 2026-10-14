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
 *
 * **That rule stands, and it has one exception.** Derivation needs something
 * to derive from, and an event naming no island and no crew member is shown to
 * everybody. Two of them are nobody's business but one side's: a treasury
 * — *"the books would not balance, so these were sold"* — and day one's
 * briefing, which tells a player what they are playing. `economy.ts` used to
 * keep the treasury private by never writing it down, which worked while one
 * side could be human and, from 11 October, could not: in PvP it stored
 * whichever side the client was sitting on and threw the other away, so each
 * player heard nothing about his own books and the two clients held different
 * wars.
 *
 * So `GameEvent.faction` exists, it is read first, and it is the **exception
 * rather than the mechanism** — set only where there is genuinely nothing to
 * derive from. Leave it alone and the paragraph above is still how fog works.
 * The tests at the foot of this file hold that line.
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

  it('keeps a marked event to the side it belongs to, and only then', () => {
    // The exception, held to being an exception. It answers on its own when
    // set — a treasury has no island to be seen from, so nothing else could
    // answer — and the whole derived rule above applies when it is not.
    const state = generateGalaxy(7, 'empire');
    expect(canSee(state, { faction: 'empire' }, 'empire')).toBe(true);
    expect(canSee(state, { faction: 'empire' }, 'alliance')).toBe(false);
    // Unmarked is the normal case and is unaffected.
    expect(canSee(state, {}, 'alliance')).toBe(true);
  });

  it('marks only what it has to, and never to see past the fog', () => {
    /*
     * The failure mode worth guarding. `faction` is read first, so a mark
     * hands an event to its owner however dark the island is — which is the
     * point for a treasury, and would be a way to leak a sighting if it were
     * put on something that happens somewhere.
     *
     * Day one's briefings do carry an island, so that the card can link to it,
     * and they are the case to watch. They are safe because the mark and the
     * island agree: each side's briefing points at ground that side can
     * already see, so the mark is deciding *whose card this is* and not
     * getting anybody past anything. A third marked event wants the same check
     * before it is written.
     */
    for (const seat of ['empire', 'alliance'] as const) {
      const state = generateGalaxy(31005, seat);
      const marked = state.events.filter((e) => e.faction);
      // Two briefings on day one and nothing else yet.
      expect(marked).toHaveLength(2);
      for (const card of marked) {
        const theirs = card.faction!;
        // Removing the mark must not change the answer for its owner: the
        // island is already theirs to see, so nothing is riding on the mark.
        expect(canSee(state, { systemId: card.systemId }, theirs)).toBe(true);
        expect(canSee(state, card, otherFaction(theirs))).toBe(false);
      }
    }
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
