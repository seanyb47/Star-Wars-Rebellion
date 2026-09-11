/**
 * The command layer the UI talks to. Every command takes a state, returns a
 * new state, and never throws: failures come back as `error` so a mistimed tap
 * can never crash the game.
 */
import { cancelBuild, queueBuild } from './build';
import { assault, embark, sailFleet } from './fleets';
import { createRng } from './rng';
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

/** Order a fleet to weigh anchor for another island. */
export function orderSail(
  state: GameState,
  fleetId: string,
  targetSystemId: string,
): CommandResult {
  return run(state, (draft) => sailFleet(draft, fleetId, targetSystemId, draft.player));
}

/**
 * Move companies between an island and a fleet lying off it. Positive takes
 * them aboard, negative puts them back ashore.
 */
export function orderEmbark(
  state: GameState,
  fleetId: string,
  companies: number,
): CommandResult {
  return run(state, (draft) => embark(draft, fleetId, companies, draft.player));
}

/**
 * Put the companies aboard ashore against a garrison that does not want them.
 * Rolls from the state's own seed and advances it, so a landing is as
 * reproducible as any other day.
 */
export function orderAssault(state: GameState, fleetId: string): CommandResult {
  return run(state, (draft) => {
    const rng = createRng(draft.rngSeed);
    assault(draft, fleetId, rng, draft.player);
    draft.rngSeed = rng.seed;
  });
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
