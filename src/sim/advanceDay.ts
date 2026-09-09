import { VICTORY_CONTROL_FRACTION } from './constants';
import factionData from '../data/factions.json';
import { runAI } from './ai';
import { advanceBuilds } from './build';
import { collectIncome, payUpkeep, recomputeLedger } from './economy';
import { cloneState, pushEvent } from './helpers';
import { advanceMissions } from './missions';
import { createRng } from './rng';
import { controlTally } from './support';
import { resolveControlAndUnrest } from './support';
import type { GameState, PlayableFaction } from './types';

/** Events kept in the feed; older ones are dropped so saves stay small. */
const MAX_EVENTS = 400;

/**
 * Advance the simulation by one day.
 *
 * Pure with respect to its argument: the incoming state is never touched, a
 * clone is mutated and returned. The UI calls this on a timer (spec 2).
 */
export function advanceDay(state: GameState): GameState {
  if (state.winner) return state;

  const next = cloneState(state);
  const rng = createRng(next.rngSeed);
  next.day += 1;

  collectIncome(next, rng);
  advanceBuilds(next);
  advanceMissions(next, rng);
  resolveControlAndUnrest(next);
  payUpkeep(next, rng);
  recomputeLedger(next);
  runAI(next);
  checkVictory(next);

  next.rngSeed = rng.seed;
  if (next.events.length > MAX_EVENTS) {
    next.events = next.events.slice(next.events.length - MAX_EVENTS);
  }
  return next;
}

/** Hold 60% of the settled islands and the war is over (spec 4.6). */
export function checkVictory(state: GameState): void {
  const tally = controlTally(state);
  if (tally.populated === 0) return;
  const threshold = tally.populated * VICTORY_CONTROL_FRACTION;
  for (const faction of ['empire', 'alliance'] as const) {
    if (tally[faction] >= threshold) {
      state.winner = faction as PlayableFaction;
      state.speed = 'paused';
      pushEvent(state, {
        kind: 'war',
      text: `The ${factionData[faction].name} holds the Seven Seas. The war is over.`,
      });
      return;
    }
  }
}
