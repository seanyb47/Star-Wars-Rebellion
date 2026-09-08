import { describe, expect, it } from 'vitest';
import { advanceDay } from '../advanceDay';
import { generateGalaxy } from '../galaxy';
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

  it('never sends a diplomat to a world it already holds', () => {
    let state = generateGalaxy(4);
    for (let day = 0; day < 300; day++) {
      state = advanceDay(state);
      for (const decision of [...state.pendingDecisions]) {
        continueMission(state, decision.characterId);
      }
      for (const character of state.characters) {
        if (character.faction !== 'alliance' || !character.mission) continue;
        const target = state.systems.find((s) => s.id === character.mission!.targetSystemId)!;
        // A world may come over mid-mission; what must never happen is the AI
        // *starting* a fresh mission on ground it already owns.
        if (character.mission.phase === 'travelling') {
          expect(target.control).not.toBe('alliance');
        }
      }
    }
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
