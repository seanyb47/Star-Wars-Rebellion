import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { roleMissionBlock, roleMissionsOf, canRecruit, missionsOffered } from '../missions';
import { RECRUIT_MIN_SUPPORT } from '../constants';
import type { Character, GameState, System } from '../types';

/**
 * A mission an officer can do, and cannot do here today, says which.
 *
 * Sean, day 40, the Imperator standing on Highwater with Recruit gone from
 * the sheet: *"Why can't imperator recruit anymore by day 40?"*
 *
 * Nothing was wrong. Eight unaligned hands exist in a war, **two of them
 * ashore on day one** and the rest drifting in across four hundred days, so
 * the pool empties as soon as those two are signed — measured over six wars
 * on both sides, on day 24 to 44 every time, while the capital's allegiance
 * sat at 90 and never came near the threshold. The rule is the design and is
 * unchanged.
 *
 * What was wrong is that the sheet answered by **omission**, and an omission
 * cannot be read. A card that is simply gone looks like a bug; a card that
 * says *nobody unclaimed is ashore anywhere, four more will come* is a thing
 * to plan around. These tests pin each reason to the condition that causes
 * it, so a reason cannot start naming the wrong cause.
 */
function crown(seed = 11): GameState {
  return generateGalaxy(seed, 'empire');
}

/**
 * The Imperator, who is a Recruiter and whose capital this is. By name: the
 * ids in a generated war are the draw's own (`chr-379`), not the roster file's.
 */
function imperator(state: GameState): Character {
  const who = state.characters.find((c) => c.name.includes('Cassian Thorne'));
  expect(who, 'the Imperator is not in the roster').toBeTruthy();
  return who!;
}

function capital(state: GameState): System {
  return state.systems.find((s) => s.id === state.factions.empire.hqSystemId)!;
}

describe('the missions that belong to a role', () => {
  it('names the two, and only for somebody who holds them', () => {
    const state = crown();
    const boy = imperator(state);
    expect(canRecruit(boy)).toBe(true);
    expect(roleMissionsOf(boy)).toContain('recruit');
    // Somebody with neither role is never told they are missing either one:
    // a mission that was never theirs is not theirs to miss.
    const plain = state.characters.find(
      (c) => c.faction === 'empire' && roleMissionsOf(c).length === 0,
    );
    if (plain) {
      expect(roleMissionBlock(state, capital(state), 'empire', 'recruit', plain)).toBeUndefined();
      expect(roleMissionBlock(state, capital(state), 'empire', 'research', plain)).toBeUndefined();
    }
  });

  it('says nothing while the mission is actually on offer', () => {
    const state = crown();
    const hq = capital(state);
    expect(missionsOffered(state, hq, 'empire', imperator(state))).toContain('recruit');
    expect(roleMissionBlock(state, hq, 'empire', 'recruit', imperator(state))).toBeUndefined();
  });
});

describe('why signing on is not on offer', () => {
  it('blames the empty pool when the pool is what is empty', () => {
    // Sean's day 40, reproduced: the capital is loyal, quiet and his, and
    // every unaligned hand ashore has already been signed.
    const state = crown();
    state.day = 40;
    for (const c of state.characters) if (c.faction === 'neutral') c.appearsOnDay = 300;
    const why = roleMissionBlock(state, capital(state), 'empire', 'recruit', imperator(state));
    expect(why).toMatch(/Nobody unclaimed is ashore/);
    // And it counts the ones still to come, because that is the half a player
    // can plan around.
    expect(why).toMatch(/\d+ more will come/);
  });

  it('tells an emptied world apart from an empty quay', () => {
    const state = crown();
    state.day = 40;
    // Everybody has landed and everybody has been signed: nobody is coming.
    for (const c of state.characters) {
      if (c.faction === 'neutral') {
        c.appearsOnDay = 1;
        c.faction = 'empire';
      }
    }
    expect(roleMissionBlock(state, capital(state), 'empire', 'recruit', imperator(state))).toMatch(
      /nobody left in the Seven Seas/,
    );
  });

  it('blames allegiance when allegiance is what is short, and gives both figures', () => {
    const state = crown();
    const hq = capital(state);
    hq.support.empire = RECRUIT_MIN_SUPPORT - 4;
    const why = roleMissionBlock(state, hq, 'empire', 'recruit', imperator(state));
    expect(why).toMatch(/not loyal enough/);
    expect(why).toContain(String(RECRUIT_MIN_SUPPORT - 4));
    expect(why).toContain(String(RECRUIT_MIN_SUPPORT));
  });

  it('blames the revolt when the island has risen', () => {
    const state = crown();
    const hq = capital(state);
    hq.uprising = true;
    expect(roleMissionBlock(state, hq, 'empire', 'recruit', imperator(state))).toMatch(/riot/);
  });

  it('blames the ground when the island is not yours', () => {
    const state = crown();
    const theirs = state.systems.find((s) => s.control === 'alliance')!;
    expect(roleMissionBlock(state, theirs, 'empire', 'recruit', imperator(state))).toMatch(
      /harbor of your own/,
    );
  });
});

describe('why research is not on offer', () => {
  it('blames the missing yard on an island of yours that has none', () => {
    const state = crown();
    const researcher = state.characters.find(
      (c) => c.faction === 'empire' && roleMissionsOf(c).includes('research'),
    );
    if (!researcher) return; // No researcher this draw; the recruit cases carry the rule.
    const hq = capital(state);
    hq.facilities = hq.facilities.filter((f) => f.type !== 'shipyard');
    expect(roleMissionBlock(state, hq, 'empire', 'research', researcher)).toMatch(/to work in/);
  });
});
