import { advanceDay } from '../sim/advanceDay';
import { applyAll, type Dispatch, type Order } from '../sim/orders';
import { stateHash } from '../sim/sync';
import type { GameState, PlayableFaction } from '../sim/types';
import { CHECK_EVERY, type Tick } from './wire';

/**
 * The part of two-player play that has no network in it.
 *
 * One agreed sequence of ticks, applied to one war. Both phones run this, both
 * feed it the same ticks, and because `advanceDay` is pure and every roll
 * comes off `rngSeed` they land on the same war — which
 * `src/sim/__tests__/seatblind.test.ts` already proves holds for four hundred
 * days from either chair.
 *
 * Kept free of the transport, the clock and React on purpose. Everything that
 * can go subtly and silently wrong about lockstep is in here, and all of it
 * can be driven from a test with no browser and no connection. The timers and
 * the wire live in `session.ts`.
 */
export interface Lockstep {
  /** The war as it stands after the last applied tick. */
  state: GameState;
  /** The last tick applied. Ticks are applied in order with no gaps. */
  tick: number;
  /** Orders scheduled for a tick that has not come round yet. */
  scheduled: Dispatch[];
  /** Fingerprints of the checked ticks, for the far side to compare. */
  checks: Record<number, string>;
}

export function open(state: GameState): Lockstep {
  return { state, tick: 0, scheduled: [], checks: {} };
}

/** A tick's fingerprint, where this is one of the ticks that carries one. */
export function checkAt(step: Lockstep): string | undefined {
  return step.tick % CHECK_EVERY === 0 ? stateHash(step.state) : undefined;
}

/**
 * Put an order into a future tick.
 *
 * Only the host calls this — numbering is the thing the guest cannot do, which
 * is the whole reason one of them is the host. `seq` orders the orders *within*
 * a tick, so two taps in the same hundredth of a second still resolve the same
 * way on both phones.
 */
export function scheduleOrder(
  step: Lockstep,
  order: Order,
  by: PlayableFaction,
  atTick: number,
  seq: number,
): Lockstep {
  return {
    ...step,
    scheduled: [...step.scheduled, { seq, day: atTick, by, order }],
  };
}

/** Everything scheduled for this tick, in the order it will be applied. */
export function dueAt(step: Lockstep, tick: number): Dispatch[] {
  return step.scheduled.filter((d) => d.day === tick).sort((a, b) => a.seq - b.seq);
}

/**
 * Apply one tick: its orders, then the day if the day turns on it.
 *
 * Orders before the day, which is the order the two things happen in anyway —
 * you give an order and then time passes — and more to the point it is *an*
 * order, fixed, and both clients follow it.
 *
 * A tick out of sequence is refused rather than applied. There is no useful
 * way to apply tick 9 to a war that has only seen tick 7: the orders in tick 8
 * are missing and the war would be quietly wrong from then on, which is the
 * one failure this whole design exists to prevent. The caller is expected to
 * have the ticks in order, because the transport delivers them in order and
 * the host does not emit the next one until this one is acknowledged.
 */
export function applyTick(
  step: Lockstep,
  tick: Tick,
): { step: Lockstep; refused: Array<{ seq: number; error: string }>; error?: string } {
  if (tick.n !== step.tick + 1) {
    return { step, refused: [], error: `tick ${tick.n} arrived with ${step.tick} applied` };
  }
  const { state, refused } = applyAll(step.state, tick.orders);
  const next: Lockstep = {
    ...step,
    state: tick.day ? advanceDay(state) : state,
    tick: tick.n,
    // Anything scheduled for this tick has happened; anything still in the
    // future stays. Dropping the past keeps the list from growing all war.
    scheduled: step.scheduled.filter((d) => d.day > tick.n),
  };
  const hash = checkAt(next);
  return {
    step: hash ? { ...next, checks: { ...next.checks, [tick.n]: hash } } : next,
    refused,
  };
}

/**
 * Should the day turn on the next tick?
 *
 * The host answers this and puts the answer in the tick, so the clock is part
 * of the agreed sequence rather than something each phone works out from its
 * own wall clock. Two clocks would drift, and a drifting clock in a lockstep
 * game is a desync with a slow fuse.
 *
 * Three things hold time still, and the first two are the same rule the single
 * player game already keeps:
 *
 * - **Paused**, which is a speed like any other (`SPEED_MS.paused` is
 *   infinite).
 * - **An action waiting to be answered.** Sean's ruling is that both sides
 *   answer each round, so the clock cannot turn while a battle sheet is up —
 *   and with two people it must not turn while *either* of them is still
 *   deciding.
 * - **The war is over.**
 */
export function dayTurns(state: GameState, sinceLastDayMs: number, speedMs: number): boolean {
  if (state.winner) return false;
  if (state.battle) return false;
  if (!Number.isFinite(speedMs)) return false;
  return sinceLastDayMs >= speedMs;
}

/**
 * Have the two of them come apart, as far as the fingerprints can tell?
 *
 * Returns the first tick they disagree about. Only ticks both have reported
 * are compared, because a tick one of them has not reached yet is not a
 * disagreement.
 */
export function firstDisagreement(
  mine: Record<number, string>,
  theirs: Record<number, string>,
): { n: number; mine: string; theirs: string } | undefined {
  const shared = Object.keys(mine)
    .map(Number)
    .filter((n) => theirs[n] !== undefined)
    .sort((a, b) => a - b);
  for (const n of shared) {
    if (mine[n] !== theirs[n]) return { n, mine: mine[n], theirs: theirs[n] };
  }
  return undefined;
}
