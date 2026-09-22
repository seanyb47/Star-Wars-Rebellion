/**
 * The command layer the UI talks to. Every command takes a state, returns a
 * new state, and never throws: failures come back as `error` so a mistimed tap
 * can never crash the game.
 */
import { cancelBuild, clearForest, queueBuild, raiseWorks } from './build';
import { recomputeLedger, scrap, scrapError, type ScrapTarget } from './economy';
import {
  bombardError,
  assault,
  breakOffBattle,
  closeBattle,
  detachShips,
  fightBattleRound,
  fleeBattle,
  sailFleet,
  bombardNow,
  findFleet,
} from './fleets';
import { createRng } from './rng';
import { runAI } from './ai';
import { generateGalaxy } from './galaxy';
import { cloneState } from './helpers';
import { moveBlock } from './order';
import { companiesOn } from './troops';
import { continueMission, endMission, relieve, startMission } from './missions';
import { resolveControlAndUnrest } from './support';
import { syncHome } from './lords';
import type { BuildItem, FacilityType, GameState, MissionType, PlayableFaction, Speed } from './types';

export interface CommandResult {
  state: GameState;
  error?: string;
}

function run(state: GameState, fn: (draft: GameState) => void): CommandResult {
  // Watching, not playing. Every order in the game comes through here, so this
  // is the whole of the lock — and the clock, which does not, stays yours.
  if (state.observing) return { state, error: 'Observing. The machine has your side; take it back to give orders.' };
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

/**
 * Hand your side over, or take it back.
 *
 * Not a `run` command, because `run` is exactly what it turns off.
 */
export function setObserving(state: GameState, observing: boolean): GameState {
  if (Boolean(state.observing) === observing) return state;
  const next = cloneState(state);
  if (!observing) {
    delete next.observing;
    return next;
  }
  next.observing = true;
  /**
   * And something happens straight away, which it did not before.
   *
   * Sean, 18 September: *"when I do observe mode. Nothing is happening. Idle
   * personnel and facilities stay idle."* He was right and the sim was fine —
   * the opponent works to a cadence. Errands are given out every tenth day and
   * fleets sail every twelfth, so a watcher who switched over on, say, day 43
   * had fifty seconds of medium-speed staring before a single officer moved,
   * and the idle chips he was watching sat still the whole time. Playing, you
   * never notice: your own orders fill the gap.
   *
   * So the handover runs one pass for each side on the spot rather than
   * waiting for the cadence to come round. It costs nothing anywhere else —
   * this is the only place it is called, and it is called when a human has just
   * said they would rather watch than play.
   */
  const rng = createRng(next.rngSeed);
  runAI(next, rng, undefined, true);
  runAI(next, rng, next.player, true);
  return next;
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

/**
 * Fell a forest to make room for something that is not a mill.
 *
 * Destructive and not undoable, so the UI asks before it calls this.
 */
export function orderClearForest(state: GameState, systemId: string): CommandResult {
  return run(state, (draft) => clearForest(draft, systemId, draft.player));
}

/**
 * Break one thing of your own up for half its price.
 *
 * Destructive and not undoable, so the UI asks first — the same treatment
 * felling a forest gets. The ledger is recomputed on the spot because the
 * whole point of the order is the upkeep it takes off the books, and a player
 * who cannot see that happen has no reason to believe it did.
 */
export function orderScrap(state: GameState, what: ScrapTarget): CommandResult {
  return run(state, (draft) => {
    const error = scrapError(draft, draft.player, what);
    if (error) throw new Error(error);
    scrap(draft, draft.player, what);
    recomputeLedger(draft);
  });
}

/**
 * Raise a building on an island you hold.
 *
 * The only way a building is built since Sean cut the construction yard: no
 * maker to pick, no passage, and the island itself is the order's address.
 */
export function orderRaiseWorks(
  state: GameState,
  systemId: string,
  type: FacilityType,
): CommandResult {
  return run(state, (draft) => raiseWorks(draft, systemId, type, draft.player));
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
    const current = system.garrisonOrder ?? [...new Set(companiesOn(system).map((t) => t.id))];
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
 * Put the companies aboard ashore against a garrison that does not want them.
 * Rolls from the state's own seed and advances it, so a landing is as
 * reproducible as any other day.
 */
/** Sign a crew member on to a fleet lying off the island they are standing on. */
/**
 * Give up a post.
 *
 * The other half of Command, and the only instant one: taking a post costs a
 * voyage, leaving it costs nothing, because they are already standing there.
 * A Pirate Lord cannot be relieved of their own deck — that is not a posting,
 * it is who they are.
 */
export function orderRelieve(state: GameState, characterId: string): CommandResult {
  return run(state, (draft) => {
    const who = draft.characters.find((c) => c.id === characterId);
    if (!who) throw new Error('No such crew.');
    if (who.faction !== draft.player) throw new Error('Not one of yours.');
    const fleet = draft.fleets.find((f) => f.officerIds.includes(characterId));
    if (fleet && fleet.voyage) throw new Error('The fleet is at sea.');
    relieve(draft, characterId);
  });
}

/** Break off a fight: take the parting volley, run for the nearest holding. */
export function orderFlee(state: GameState, fleetId: string): CommandResult {
  return run(state, (draft) => fleeBattle(draft, fleetId, createRng(draft.rngSeed), draft.player));
}

/**
 * Take hulls out of one squadron and into another — an existing one lying in
 * the same water, or a new one when `into` is left out.
 */
export function orderDetach(
  state: GameState,
  fleetId: string,
  shipIds: string[],
  into?: string,
): CommandResult {
  return run(state, (draft) => {
    detachShips(draft, fleetId, shipIds, into, draft.player);
  });
}

/** One more broadside in the action the battle sheet is showing. */
export function orderFightRound(state: GameState): CommandResult {
  return run(state, (draft) => {
    const rng = createRng(draft.rngSeed);
    fightBattleRound(draft, rng);
    draft.rngSeed = rng.seed;
  });
}

/** Dismiss a settled action and let the clock start again. */
export function orderCloseBattle(state: GameState): CommandResult {
  return run(state, (draft) => closeBattle(draft));
}

/** Break off the whole action: everything of yours that can run, runs. */
export function orderBreakOff(state: GameState): CommandResult {
  return run(state, (draft) => {
    const rng = createRng(draft.rngSeed);
    breakOffBattle(draft, rng);
    draft.rngSeed = rng.seed;
  });
}

/**
 * Open fire on the island: one action, resolved now.
 *
 * This used to set a standing order and the squadron fired once a morning
 * until the walls came down. Sean: *"The once per day mechanic will be
 * annoying tbh. It means you have to sit and wait."* So the whole thing —
 * roll, cascade, and whatever it knocks down — happens on the press, and costs
 * one shot out of each ship's magazine of five.
 */
export function orderBombard(state: GameState, fleetId: string): CommandResult {
  return run(state, (draft) => {
    const error = bombardError(draft, fleetId, draft.player);
    if (error) throw new Error(error);
    const rng = createRng(draft.rngSeed);
    bombardNow(draft, findFleet(draft, fleetId)!, rng);
    draft.rngSeed = rng.seed;
  });
}

/**
 * There is nothing to call off any more, so this is kept only so a save or a
 * screen written against the old standing order does not throw. It does
 * nothing, deliberately.
 */
export function orderCeaseFire(state: GameState, fleetId: string): CommandResult {
  return run(state, (draft) => {
    if (!draft.fleets.some((f) => f.id === fleetId)) throw new Error('No such fleet.');
  });
}

export function orderAssault(state: GameState, fleetId: string): CommandResult {
  return run(state, (draft) => {
    const rng = createRng(draft.rngSeed);
    assault(draft, fleetId, rng, draft.player);
    draft.rngSeed = rng.seed;
    // A landing changes who holds an island, and where the Confederacy calls
    // home is worked out from that. The day's own pass does it last thing at
    // night, which is right for everything the world does on its own and wrong
    // for an order given at noon: measured, a player taking the island the
    // Confederacy was calling home left home sitting on Crown ground until the
    // following morning, and a Lord exchanged in between was landed inside the
    // enemy's harbor.
    syncHome(draft);
  });
}

/**
 * Send one of your crew off on an errand.
 *
 * Named for what it does rather than for the one errand it was first written
 * for: it was `sendDiplomat` when parley was the only thing a person could be
 * sent to do, and it has sent people to spy, incite, sabotage, research,
 * recruit and take command for a long time since.
 */
export function sendCrew(
  state: GameState,
  characterId: string,
  targetSystemId: string,
  type?: MissionType,
  companionIds: string[] = [],
  /** Which squadron a Command posting is for, when it is not the island. */
  fleetId?: string,
): CommandResult {
  return run(state, (draft) =>
    startMission(draft, characterId, targetSystemId, type, companionIds, fleetId),
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
