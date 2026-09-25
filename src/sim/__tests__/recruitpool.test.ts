import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import {
  alreadySentOn,
  hasArrived,
  recruitPool,
  recruitsToCome,
  isRecruitTarget,
} from '../missions';
import { RECRUIT_LAST_DAY } from '../constants';
import type { Character, GameState } from '../types';

/**
 * The roster arrives across the whole war.
 *
 * Sean's playtest: *"'Signing on' is still offered after 'nobody left in the
 * Seven Seas to sign' (Day 107)."* The notice was reading the pool of people
 * *ashore and unclaimed*, which is empty for most of the war: measured across
 * six seeds the eight unaligned turn up on roughly days 1, 1, 70, 135, 205,
 * 275, 350 and 425. Signing the third one on day 80 emptied the pool and
 * produced a notice saying five more were never coming.
 */
const NEUTRALS = (state: GameState): Character[] =>
  state.characters.filter((c) => c.faction === 'neutral');

describe('who is left to sign', () => {
  it('seeds a roster that is still arriving long after the opening', () => {
    for (const seed of [3, 11, 55, 101, 203, 501]) {
      const state = generateGalaxy(seed, 'alliance');
      const days = NEUTRALS(state).map((c) => c.appearsOnDay ?? 1);
      expect(days.filter((d) => d <= 1).length).toBe(2);
      expect(days.filter((d) => d > 107).length).toBeGreaterThanOrEqual(4);
      expect(Math.max(...days)).toBeLessThanOrEqual(RECRUIT_LAST_DAY + 12);
    }
  });

  it('tells apart an empty quay from an emptied world', () => {
    const state = generateGalaxy(11, 'alliance');
    state.day = 107;
    // Everybody who has landed by now is signed; the rest have not arrived.
    for (const person of NEUTRALS(state)) {
      if (hasArrived(state, person)) person.faction = 'alliance';
    }
    expect(recruitPool(state)).toHaveLength(0);
    expect(recruitsToCome(state).length).toBeGreaterThan(0);

    // And once the clock is past the last of them, it is the end of the world's people.
    state.day = RECRUIT_LAST_DAY + 100;
    for (const person of NEUTRALS(state)) person.faction = 'alliance';
    expect(recruitsToCome(state)).toHaveLength(0);
  });

  it('puts signing on back on the list when the next hand comes ashore', () => {
    const state = generateGalaxy(11, 'alliance');
    const island = state.systems.find(
      (s) => s.control === 'alliance' && s.populated && !s.uprising,
    )!;
    island.support = { alliance: 90, empire: 10 };
    state.day = 1;
    for (const person of NEUTRALS(state)) {
      if (hasArrived(state, person)) person.faction = 'alliance';
    }
    expect(isRecruitTarget(state, island, 'alliance')).toBe(false);

    const next = Math.min(...recruitsToCome(state).map((c) => c.appearsOnDay ?? 1));
    state.day = next;
    expect(isRecruitTarget(state, island, 'alliance')).toBe(true);
  });
});

describe('two boats on one errand', () => {
  it('names whoever of yours is already at it, and leaves the leader out', () => {
    const state = generateGalaxy(11, 'alliance');
    const island = state.systems.find((s) => s.control === 'alliance' && s.populated)!;
    const [first, second, leader] = state.characters.filter((c) => c.faction === 'alliance');
    for (const who of [first, second, leader]) {
      who.status = 'on_mission';
      who.mission = {
        type: 'recruit',
        targetSystemId: island.id,
        phase: 'travelling',
        daysRemaining: 4,
      };
    }
    const already = alreadySentOn(state, island, 'alliance', 'recruit', leader.id);
    expect(already.map((c) => c.id).sort()).toEqual([first.id, second.id].sort());

    // A different errand at the same island, or the same errand elsewhere, is
    // not the same table.
    expect(alreadySentOn(state, island, 'alliance', 'sabotage', leader.id)).toEqual([]);
    const elsewhere = state.systems.find((s) => s.id !== island.id)!;
    expect(alreadySentOn(state, elsewhere, 'alliance', 'recruit', leader.id)).toEqual([]);
  });
});
