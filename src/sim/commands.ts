/**
 * The command layer the UI talks to. Every command takes a state, returns a
 * new state, and never throws: failures come back as `error` so a mistimed tap
 * can never crash the game.
 */
import { cancelBuild, queueBuild } from './build';
import { generateGalaxy } from './galaxy';
import { cloneState } from './helpers';
import { continueMission, endMission, startMission } from './missions';
import { resolveControlAndUnrest } from './support';
import type { BuildItem, GameState, PlayableFaction, Speed } from './types';

export interface CommandResult {
  state: GameState;
  error?: string;
}

function run(state: GameState, fn: (draft: GameState) => void): CommandResult {
  const draft = cloneState(state);
  try {
    fn(draft);
  } catch (err) {
    return { state, error: err instanceof Error ? err.message : String(err) };
  }
  return { state: draft };
}

export function newGame(seed = Date.now() >>> 0, player: PlayableFaction = 'empire'): GameState {
  return generateGalaxy(seed, player);
}

export function setSpeed(state: GameState, speed: Speed): GameState {
  if (state.speed === speed) return state;
  const next = cloneState(state);
  next.speed = state.winner ? 'paused' : speed;
  return next;
}

export function orderBuild(
  state: GameState,
  facilityId: string,
  item: BuildItem,
): CommandResult {
  return run(state, (draft) => queueBuild(draft, facilityId, item));
}

export function cancelOrder(state: GameState, facilityId: string): CommandResult {
  return run(state, (draft) => cancelBuild(draft, facilityId));
}

export function sendDiplomat(
  state: GameState,
  characterId: string,
  targetSystemId: string,
): CommandResult {
  return run(state, (draft) => startMission(draft, characterId, targetSystemId));
}

export function resolvePendingMission(
  state: GameState,
  characterId: string,
  choice: 'continue' | 'return',
): CommandResult {
  return run(state, (draft) => {
    if (choice === 'continue') continueMission(draft, characterId);
    else endMission(draft, characterId);
    resolveControlAndUnrest(draft);
  });
}
