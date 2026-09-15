/**
 * The command layer the UI talks to. Every command takes a state, returns a
 * new state, and never throws: failures come back as `error` so a mistimed tap
 * can never crash the game.
 */
import { cancelBuild, foundWorks, queueBuild } from './build';
import { assault, board, embark, goAshore, sailFleet } from './fleets';
import { createRng } from './rng';
import { generateGalaxy } from './galaxy';
import { cloneState } from './helpers';
import { moveBlock } from './order';
import { garrisonRoster } from './troops';
import { continueMission, endMission, startMission } from './missions';
import { resolveControlAndUnrest } from './support';
import type { BuildItem, GameState, MissionType, PlayableFaction, Speed } from './types';

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
  destinationId?: string,
): CommandResult {
  return run(state, (draft) => queueBuild(draft, facilityId, item, destinationId));
}

/** Lay down a works on a held island with none; see foundWorks. */
export function orderFoundWorks(state: GameState, systemId: string): CommandResult {
  return run(state, (draft) => foundWorks(draft, systemId, draft.player));
}

export function cancelOrder(state: GameState, facilityId: string): CommandResult {
  return run(state, (draft) => cancelBuild(draft, facilityId));
}

/**
 * Put things in the order the player wants them.
 *
 * Every one of these moves the game's own array rather than a view's index,
 * so the order saves with the game and cannot drift from what is there. One
 * step per call, up or down; `ids` is a block, because a grouped row is
 * several hulls on one line.
 */
export function reorderShips(
  state: GameState,
  fleetId: string,
  shipIds: string[],
  dir: -1 | 1,
): CommandResult {
  return run(state, (draft) => {
    const fleet = draft.fleets.find((f) => f.id === fleetId);
    if (!fleet) throw new Error('No such fleet.');
    const set = new Set(shipIds);
    fleet.ships = moveBlock(fleet.ships, (ship) => set.has(ship.id), dir);
  });
}

export function reorderOfficers(
  state: GameState,
  fleetId: string,
  characterIds: string[],
  dir: -1 | 1,
): CommandResult {
  return run(state, (draft) => {
    const fleet = draft.fleets.find((f) => f.id === fleetId);
    if (!fleet) throw new Error('No such fleet.');
    const set = new Set(characterIds);
    fleet.officerIds = moveBlock(fleet.officerIds, (id) => set.has(id), dir);
  });
}

export function reorderFacilities(
  state: GameState,
  systemId: string,
  facilityIds: string[],
  dir: -1 | 1,
): CommandResult {
  return run(state, (draft) => {
    const system = draft.systems.find((s) => s.id === systemId);
    if (!system) throw new Error('No such island.');
    const set = new Set(facilityIds);
    system.facilities = moveBlock(system.facilities, (f) => set.has(f.id), dir);
  });
}

/**
 * Crew are ordered in the roster itself, which is what every list of people
 * filters, so moving somebody moves them on the island panel and the crew
 * screen alike — one order, everywhere they are listed.
 */
export function reorderCrew(state: GameState, characterIds: string[], dir: -1 | 1): CommandResult {
  return run(state, (draft) => {
    const set = new Set(characterIds);
    draft.characters = moveBlock(draft.characters, (c) => set.has(c.id), dir);
  });
}

/**
 * A garrison has no per-company identity to move — it is a count, and a roster
 * derived from it — so what is remembered here is the order of the kinds.
 */
export function reorderGarrison(
  state: GameState,
  systemId: string,
  typeIds: string[],
  dir: -1 | 1,
): CommandResult {
  return run(state, (draft) => {
    const system = draft.systems.find((s) => s.id === systemId);
    if (!system) throw new Error('No such island.');
    const current = system.garrisonOrder ?? [...new Set(garrisonRoster(system).map((t) => t.id))];
    const set = new Set(typeIds);
    system.garrisonOrder = moveBlock(current, (id) => set.has(id), dir);
  });
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
/** Sign a crew member on to a fleet lying off the island they are standing on. */
export function orderBoard(
  state: GameState,
  fleetId: string,
  characterId: string,
): CommandResult {
  return run(state, (draft) => board(draft, fleetId, characterId, draft.player));
}

export function orderAshore(
  state: GameState,
  fleetId: string,
  characterId: string,
): CommandResult {
  return run(state, (draft) => goAshore(draft, fleetId, characterId));
}

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
  type?: MissionType,
  companionIds: string[] = [],
): CommandResult {
  return run(state, (draft) =>
    startMission(draft, characterId, targetSystemId, type, companionIds),
  );
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
