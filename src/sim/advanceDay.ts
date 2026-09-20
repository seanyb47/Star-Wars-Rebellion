import { PIRATE_LORDS } from './constants';
import factionData from '../data/factions.json';
import { runAI } from './ai';
import { advanceBuilds } from './build';
import { stirBeasts } from './creatures';
import { advanceFleets, advanceSieges, clearWrecks, repairOvernight, updateBlockades } from './fleets';
import { allLordsTaken, holdTheMoot, syncHome } from './lords';
import { recomputeLedger, settleLedger } from './economy';
import { cloneState, getSystem, otherFaction, pushEvent } from './helpers';
import { advanceMissions, syncMissionParties, takePrisoner } from './missions';
import { decayMomentum } from './politics';
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
  // Yesterday's politics, a day further from mattering.
  decayMomentum(next);
  // Once a day, with the dice: this is the only call that can raise a mutiny.
  // Every other call re-derives control after something moved allegiance, and
  // a revolt should be a morning's news rather than something re-rolled six
  // times a day because six things touched the same island.
  resolveControlAndUnrest(next, rng);
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
  /*
   * The books, once a fortnight.
   *
   * Income and upkeep used to move every morning — a trickle in, a trickle
   * out, and a chance of something falling down on any day the trickle out
   * was bigger. Sean, 20 September: *"let's change from daily to fortnight...
   * otherwise people are going to be looking at it like a stock chart."* So
   * this is a no-op on thirteen days in fourteen, and on the fourteenth it
   * pays fourteen days of both at once and settles what cannot be paid.
   */
  settleLedger(next, rng);
  recomputeLedger(next);
  runAI(next, rng);
  // Observing: the player's side is played too, by the same rules and the same
  // doctrine. The opponent moves first, which is the order it has always moved
  // in — the watcher's side is the one that used to be waiting for a human.
  if (next.observing) runAI(next, rng, next.player);
  // Last, so the day ends with home somewhere the Confederacy actually holds.
  // It used to be worked out first thing, and then an island could fall in the
  // evening — to drift, to a rising, or to the opponent's own landing after
  // the ledger was cut — leaving home sitting on Crown ground until morning.
  syncHome(next);
  roundUpTheLandless(next);
  checkVictory(next);

  next.rngSeed = rng.seed;
  if (next.events.length > MAX_EVENTS) {
    next.events = next.events.slice(next.events.length - MAX_EVENTS);
  }
  return next;
}

/**
 * Nowhere left to stand.
 *
 * Sean, on a landing taking everyone ashore: *"effectively capturing all
 * islands means you captured all lords."* It did not, and the gap was a war
 * that could not be ended. Measured, seed 11021: on day 2,301 the Crown held
 * all sixty-three islands in the world, and the Confederacy — with no ground,
 * no harbor, no hull and no income — still had two Lords at large, walking
 * from one Crown island to the next stirring up revolts, while a fourth
 * officer broke the third out of the cells at Highwater as fast as the Crown
 * could put him back in. Nothing in the rules could finish it, because the
 * only thing that removes a person is a landing and there was nothing left to
 * land on.
 *
 * So this is the consequence of Sean's sentence rather than a new rule beside
 * it: a side that holds no island at all has nowhere to put anybody, and
 * everyone of theirs still at large is taken where they stand. The victory
 * check below then reads exactly as it always has — all three Lords in irons
 * — and the war ends for the reason it had already been won.
 *
 * Deliberately symmetric, though only one side can reach it: were the Crown
 * ever to hold nothing, Highwater would have fallen and the war would be over
 * on the line above anyway.
 */
function roundUpTheLandless(state: GameState): void {
  for (const side of ['empire', 'alliance'] as const) {
    if (state.systems.some((s) => s.control === side)) continue;
    const taker = otherFaction(side);
    for (const person of state.characters) {
      if (person.faction !== side || person.status === 'captured') continue;
      takePrisoner(state, person, taker);
      pushEvent(state, {
        kind: 'loss',
        // Every capture raises a card. See `notable` on GameEvent.
        notable: true,
        text: `${person.name} is taken up on ${
          getSystem(state, person.locationSystemId).name
        }. There is no harbor left anywhere that will have them.`,
        characterId: person.id,
      });
    }
  }
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
