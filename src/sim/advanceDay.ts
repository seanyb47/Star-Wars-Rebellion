import { PIRATE_LORDS } from './constants';
import factionData from '../data/factions.json';
import { runAI } from './ai';
import { advanceBuilds } from './build';
import { stirBeasts } from './creatures';
import { advanceFleets, advanceSieges, clearWrecks, repairOvernight, updateBlockades } from './fleets';
import { allLordsTaken, holdTheMoot, syncHome } from './lords';
import { collectIncome, payUpkeep, recomputeLedger } from './economy';
import { cloneState, pushEvent } from './helpers';
import { advanceMissions, syncMissionParties } from './missions';
import { createRng } from './rng';
import {
  driftSupport,
  leakInformation,
  loyaltyBands,
  reportLoyaltySlips,
  resolveControlAndUnrest,
} from './support';
import type { GameState } from './types';

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

  // Fleets move and fight before anything is counted, so a harbor shut this
  // morning pays nothing this evening.
  advanceFleets(next, rng);
  // The siege, after the day's fighting and before anything is counted: a wall
  // beaten down this morning is a wall that is not firing this evening.
  advanceSieges(next, rng);
  holdTheMoot(next);
  updateBlockades(next);
  collectIncome(next, rng);
  advanceBuilds(next);
  // What every island's allegiance was worth this morning, so the evening can
  // say which ones slipped.
  const bands = loyaltyBands(next);
  advanceMissions(next, rng);
  // Everyone else out in a boat moves and comes home with whoever is leading
  // them; only the leader carries the errand. After the errands run, so a
  // party lands and is freed on the same day its leader is rather than the
  // morning after.
  syncMissionParties(next);
  // Opinion cools before control is re-derived, so a hold nobody is keeping up
  // can be the thing that loses an island this morning.
  driftSupport(next);
  resolveControlAndUnrest(next);
  // What is in the water takes its turn after the fighting, so a creature
  // that has just been hurt can decide to break off from it.
  stirBeasts(next, rng);
  // Last, because a creature in open water sinks hulls after the fighting is
  // over, and a squadron it emptied must not go on sailing.
  clearWrecks(next);
  // And what the night puts right. After everything that could hurt a hull or
  // a wall, so a day's repair is never undone by the same day's shooting.
  repairOvernight(next);
  reportLoyaltySlips(next, bands);
  leakInformation(next, rng);
  payUpkeep(next, rng);
  recomputeLedger(next);
  runAI(next, rng);
  // Last, so the day ends with home somewhere the Confederacy actually holds.
  // It used to be worked out first thing, and then an island could fall in the
  // evening — to drift, to a rising, or to the opponent's own landing after
  // the ledger was cut — leaving home sitting on Crown ground until morning.
  syncHome(next);
  checkVictory(next);

  next.rngSeed = rng.seed;
  if (next.events.length > MAX_EVENTS) {
    next.events = next.events.slice(next.events.length - MAX_EVENTS);
  }
  return next;
}

/**
 * Two ways the war ends, one each, and nothing else.
 *
 * The Confederacy wins the day it holds Highwater. The Crown wins the day all
 * three Pirate Lords are in irons at once — it has to find the three of them
 * out in the Reaches and carry them off a quay, which is the hunt the whole
 * design points at.
 */
export function checkVictory(state: GameState): void {
  const capital = state.systems.find((s) => s.id === state.factions.empire.hqSystemId);
  if (capital && capital.control === 'alliance') {
    state.winner = 'alliance';
    state.speed = 'paused';
    pushEvent(state, {
      kind: 'war',
      text: `${capital.name} has fallen to the ${factionData.alliance.name}. The Crown is finished; the war is over.`,
      systemId: capital.id,
    });
    return;
  }
  if (allLordsTaken(state)) {
    state.winner = 'empire';
    state.speed = 'paused';
    pushEvent(state, {
      kind: 'war',
      text: `${PIRATE_LORDS.map((l) => l.name).join(', ')} are all in irons at once. The ${factionData.alliance.name} has no one left to lead it; the ${factionData.empire.name} has won the war.`,
    });
  }
}
