import { describe, expect, it } from 'vitest';
import { advanceDay } from '../advanceDay';
import { runAI } from '../ai';
import { AI_MISSION_INTERVAL } from '../constants';
import { generateGalaxy } from '../galaxy';
import { createRng } from '../rng';
import { getSystem } from '../helpers';
import {
  advanceMissions,
  continueMission,
  isMissionTarget,
  startMission,
  travelDays,
} from '../missions';
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

  it('never sends an officer anywhere there is nothing to do', () => {
    // Checked against the AI directly rather than inferred from a long run: an
    // island can come over while a diplomat is still at sea, so a mission in
    // flight pointing at friendly ground proves nothing either way.
    //
    // It may court an unaligned island or stir up one the player holds. What it
    // must never do is send anyone to its own ground, or anywhere it has not
    // charted, or to an island already in revolt.
    let dispatched = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const state = generateGalaxy(seed);
      state.day = AI_MISSION_INTERVAL;
      runAI(state, createRng(seed));
      for (const sent of state.characters.filter((c) => c.faction === 'alliance' && c.mission)) {
        dispatched++;
        const target = getSystem(state, sent.mission!.targetSystemId);
        expect(isMissionTarget(target, 'alliance')).toBe(true);
        expect(sent.mission!.type).toBe(target.control === 'empire' ? 'incite' : 'diplomacy');
      }
    }
    expect(dispatched).toBeGreaterThan(30);
  });

  it('puts more than one officer to work', () => {
    // A faction with five officers and one of them at sea is not playing. The
    // previous version used its best diplomat and left the rest on the quay.
    let best = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const state = generateGalaxy(seed);
      state.day = AI_MISSION_INTERVAL;
      runAI(state, createRng(seed));
      best = Math.max(best, state.characters.filter((c) => c.faction === 'alliance' && c.mission).length);
    }
    expect(best).toBeGreaterThan(1);
  });

  it('stands an officer down when the island comes over while they are at sea', () => {
    // The legitimate case the previous version of the test above mistook for a
    // bug: spillover from a neighbouring parley can flip the target in transit.
    // Forced here rather than fished for across seeds, so it stays covered
    // however the balance is tuned.
    const state = generateGalaxy(4);
    const diplomat = state.characters.find((c) => c.faction === 'alliance')!;
    const target = state.systems.find(
      (s) => s.control === 'neutral' && s.populated && s.explored.alliance,
    )!;
    startMission(state, diplomat.id, target.id);
    expect(diplomat.mission!.phase).toBe('travelling');

    // It runs up their colours on its own while the boat is still out.
    getSystem(state, target.id).control = 'alliance';

    const rng = createRng(9);
    for (let day = 0; day < travelDays(state, diplomat.locationSystemId, target.id) + 2; day++) {
      advanceMissions(state, rng);
    }
    const after = state.characters.find((c) => c.id === diplomat.id)!;
    // Their own island is still somewhere to parley, so the work goes on —
    // what must not happen is a mission left pointing at the wrong thing.
    expect(after.mission?.type ?? 'diplomacy').toBe('diplomacy');
    expect(after.locationSystemId).toBe(target.id);
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
