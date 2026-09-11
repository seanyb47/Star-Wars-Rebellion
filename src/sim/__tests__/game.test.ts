import { describe, expect, it } from 'vitest';
import { advanceDay } from '../advanceDay';
import { runAI } from '../ai';
import { AI_MISSION_INTERVAL } from '../constants';
import { generateGalaxy } from '../galaxy';
import { createRng } from '../rng';
import { getSystem } from '../helpers';
import { continueMission } from '../missions';
import { controlTally } from '../support';
import type { GameState, PlayableFaction } from '../types';

/**
 * Play a whole game out with the human side idle: the opponent AI should be
 * able to win on its own. Whichever character reports in is told to carry on,
 * standing in for a player who never touches the prompt.
 */
function playOut(seed: number, player: PlayableFaction, maxDays = 3000): GameState {
  let state = generateGalaxy(seed, player);
  for (let day = 0; day < maxDays && !state.winner; day++) {
    state = advanceDay(state);
    for (const decision of [...state.pendingDecisions]) {
      continueMission(state, decision.characterId);
    }
  }
  return state;
}

describe('a full game', () => {
  it('lets the opponent win when the player does nothing', () => {
    const state = playOut(1, 'empire');
    expect(state.winner).toBe('alliance');
    expect(state.day).toBeLessThan(1500);
  });

  it('works the same way with the sides swapped', () => {
    const state = playOut(1, 'alliance');
    expect(state.winner).toBe('empire');
  });

  it('ends with the winner over the 60% threshold', () => {
    const state = playOut(2, 'empire');
    const tally = controlTally(state);
    expect(tally.alliance).toBeGreaterThanOrEqual(tally.populated * 0.6);
  });
});

describe('the opponent expands', () => {
  it('takes worlds over by diplomacy alone', () => {
    let state = generateGalaxy(1);
    const before = state.systems.filter((s) => s.control === 'alliance').length;
    for (let day = 0; day < 400; day++) {
      state = advanceDay(state);
      for (const decision of [...state.pendingDecisions]) {
        continueMission(state, decision.characterId);
      }
    }
    const after = state.systems.filter((s) => s.control === 'alliance').length;
    expect(after).toBeGreaterThan(before + 5);
  });

  it('only ever opens a parley on an unaligned island', () => {
    // Checked against the AI directly rather than inferred from a long run: an
    // island can come over while a diplomat is still at sea, so a mission in
    // flight pointing at friendly ground proves nothing either way.
    let dispatched = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const state = generateGalaxy(seed);
      state.day = AI_MISSION_INTERVAL;
      runAI(state, createRng(seed));
      const sent = state.characters.find((c) => c.faction === 'alliance' && c.mission);
      if (!sent) continue;
      dispatched++;
      expect(getSystem(state, sent.mission!.targetSystemId).control).toBe('neutral');
    }
    expect(dispatched).toBeGreaterThan(30);
  });

  it('lets an island come over while its diplomat is still at sea', () => {
    // The legitimate case the previous version of the test above mistook for a
    // bug: spillover from a neighbouring parley can flip the target in transit.
    let state = generateGalaxy(4);
    let sawFlipInTransit = false;
    for (let day = 0; day < 400 && !sawFlipInTransit; day++) {
      state = advanceDay(state);
      for (const decision of [...state.pendingDecisions]) {
        continueMission(state, decision.characterId);
      }
      sawFlipInTransit = state.characters.some(
        (c) =>
          c.faction === 'alliance' &&
          c.mission?.phase === 'travelling' &&
          getSystem(state, c.mission.targetSystemId).control === 'alliance',
      );
    }
    expect(sawFlipInTransit).toBe(true);
  });
});

describe('inhabited worlds', () => {
  it('are all winnable: every populated world starts neutral or owned', () => {
    const state = generateGalaxy(9);
    for (const system of state.systems) {
      if (!system.populated) continue;
      expect(system.control).not.toBe('none');
    }
  });

  it('leaves empty worlds unclaimed until someone garrisons them', () => {
    const state = generateGalaxy(9);
    for (const system of state.systems.filter((s) => !s.populated)) {
      expect(system.control).toBe('none');
    }
  });
});
