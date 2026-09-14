import { LEADERS, VICTORY_CONTROL_FRACTION } from './constants';
import factionData from '../data/factions.json';
import { runAI } from './ai';
import { advanceBuilds } from './build';
import { advanceFleets, seatAfloat, syncSeat, updateBlockades } from './fleets';
import { collectIncome, payUpkeep, recomputeLedger } from './economy';
import { cloneState, otherFaction, pushEvent } from './helpers';
import { advanceMissions } from './missions';
import { createRng } from './rng';
import { controlTally } from './support';
import { driftSupport, resolveControlAndUnrest } from './support';
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

  // Fleets move and fight before anything is counted, so a harbour shut this
  // morning pays nothing this evening.
  advanceFleets(next, rng);
  syncSeat(next);
  updateBlockades(next);
  collectIncome(next, rng);
  advanceBuilds(next);
  advanceMissions(next, rng);
  // Opinion cools before control is re-derived, so a hold nobody is keeping up
  // can be the thing that loses an island this morning.
  driftSupport(next);
  resolveControlAndUnrest(next);
  payUpkeep(next, rng);
  recomputeLedger(next);
  runAI(next, rng);
  checkVictory(next);

  next.rngSeed = rng.seed;
  if (next.events.length > MAX_EVENTS) {
    next.events = next.events.slice(next.events.length - MAX_EVENTS);
  }
  return next;
}

/**
 * Two ways the war ends.
 *
 * Take the enemy's seat and hold both their leaders at once — Rebellion's own
 * condition, and the one the whole design points at: the Crown has to *find*
 * the Free Harbour first, the Confederacy has to get past Highwater's guns.
 * Or hold 60% of the settled islands, which is what a war of attrition looks
 * like when nobody manages the first.
 */
export function checkVictory(state: GameState): void {
  for (const faction of ['empire', 'alliance'] as const) {
    const enemy = otherFaction(faction);
    const seat = state.systems.find((s) => s.id === state.factions[enemy].hqSystemId);
    const heads = LEADERS[enemy].map((name) => state.characters.find((c) => c.name === name));
    const allTaken = heads.length > 0 && heads.every((c) => c?.status === 'captured');
    // The Crown's seat is taken by holding Highwater; the Confederacy's by
    // sinking the Free Harbor, since their seat is a ship.
    const seatTaken = enemy === 'alliance' ? !seatAfloat(state) : seat?.control === faction;
    if (seatTaken && allTaken) {
      state.winner = faction;
      state.speed = 'paused';
      pushEvent(state, {
        kind: 'war',
        text:
          enemy === 'alliance'
            ? `The Free Harbor is on the seabed and ${LEADERS[enemy].join(' and ')} are in irons. The ${factionData[faction].name} has won the war.`
            : `${seat?.name ?? 'Highwater'} has fallen and ${LEADERS[enemy].join(' and ')} are in irons. The ${factionData[faction].name} has won the war.`,
      });
      return;
    }
  }

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
