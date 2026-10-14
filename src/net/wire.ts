import type { Dispatch } from '../sim/orders';
import type { PlayableFaction, Speed } from '../sim/types';

/**
 * What crosses between two people playing the same war.
 *
 * Nothing here carries the world. The state is 56 KB on the opening day and
 * 129 KB by day 600 (`lab/wire.ts`), a day is one second at Fast, and an order
 * is 106 bytes — so both phones hold the whole war, both run `advanceDay`
 * themselves, and what travels is the handful of bytes saying *what somebody
 * did*. That is the bargain the whole of PvP rests on and the reason this file
 * is small.
 *
 * ## Why there are ticks at all
 *
 * The obvious design is wrong and worth writing down so nobody re-derives it:
 * *apply my own order at once, send it over, let them apply it when it
 * arrives.* That desynchronises on the first simultaneous pair of orders. He
 * taps build; ten milliseconds later she taps sail. His client applies build
 * then sail; hers applies sail then build. Two different sequences, two
 * different wars, and neither screen says so.
 *
 * So there is one agreed order of events and both clients follow it. The side
 * that made the link numbers everything — orders *and* the turning of the day
 * — into a stream of **ticks**, and both sides apply tick `n` before tick
 * `n+1`. Nobody applies anything the moment they tap it, including the host.
 *
 * A tick is **not** a game day. It is a short, fixed slice of real time, so an
 * order you give is applied `INPUT_DELAY` ticks later — a fifth of a second —
 * whatever speed the war is running at. Scheduling against the game day
 * instead would mean waiting up to thirty seconds at Very Slow to watch your
 * own build order land.
 *
 * ## Why the host does not get to go first
 *
 * Its orders travel no distance, so without care its tap always lands in an
 * earlier tick than the guest's, and it wins every race for the same island.
 * It schedules its own orders the same `INPUT_DELAY` ahead as it schedules the
 * guest's, which costs it nothing and takes the edge away.
 */

/** How long one slice of the sequence lasts, in real milliseconds. */
export const TICK_MS = 100;

/**
 * How many ticks ahead an order is scheduled.
 *
 * The round trip has to fit inside it, or the host would be sequencing an
 * order for a tick the guest has already applied. Two ticks is 200 ms, which
 * covers an ordinary mobile round trip and is well under the threshold where
 * anybody notices their own tap.
 */
export const INPUT_DELAY = 2;

/** How often the two of them check they are still playing the same war. */
export const CHECK_EVERY = 20;

/**
 * The opening handshake: which war this is, and who is sitting where.
 *
 * The seed is the whole of the world — `generateGalaxy(seed, seat)` builds the
 * same islands, deposits and opening fleets everywhere — so this is all that
 * has to be agreed before either of them can play. It is in the link.
 */
export interface Hello {
  kind: 'hello';
  /** The war. Both sides generate it rather than one of them sending it. */
  seed: number;
  /** Which side the **guest** is playing. The host has the other. */
  guestSeat: PlayableFaction;
  /** Refuses a connection between two different builds, which would desync. */
  build: string;
}

/**
 * Guest to host: I did this, please put it in the sequence.
 *
 * It carries no number. Numbering is exactly the thing the guest cannot do on
 * its own, which is why there is a host at all.
 */
export interface Request {
  kind: 'request';
  by: PlayableFaction;
  /** The dispatch minus its `seq`, which the host fills in. */
  order: Dispatch['order'];
}

/**
 * Host to guest: here is slice `n` of the war.
 *
 * Both apply the same slices in the same order, so both land on the same war.
 * `day` is how the clock travels — the host decides when enough real time has
 * passed for a day to turn, and the turning is part of the sequence rather
 * than something each client works out for itself from its own wall clock.
 */
export interface Tick {
  kind: 'tick';
  n: number;
  /** What happened in this slice. Usually nothing. */
  orders: Dispatch[];
  /** Whether the day turns at the end of it. */
  day: boolean;
}

/**
 * Guest to host: I have applied up to here, and my war looks like this.
 *
 * Two jobs, and the second is the important one. The acknowledgement is what
 * makes the war **wait** — Sean's ruling of 14 October, asked what should
 * happen when somebody closes the tab: *"The war waits."* The host stops
 * emitting ticks once the guest is more than `INPUT_DELAY` behind, so a phone
 * in a tunnel stops time rather than falling behind and catching up with a
 * fortnight of war it did not watch.
 *
 * The fingerprint is the desync alarm. Nobody is authoritative, so when two
 * wars drift apart there is no referee to notice: his fleet sinks, hers sails
 * on, and both screens look perfectly convincing. Checked every `CHECK_EVERY`
 * ticks against `stateHash`.
 */
export interface Ack {
  kind: 'ack';
  n: number;
  /** `stateHash` after applying tick `n`, on the ticks that are checked. */
  hash?: string;
}

/**
 * Either side: I would like the war to run at this speed.
 *
 * Sean's ruling of 11 October, and the only part of the war that is negotiated
 * rather than ordered: *"In PvP when one player changes speed, the other
 * player gets a popup 'the [other faction] requests the speed to be [speed]'
 * and they can accept or decline. The game always works on mutual consent."*
 *
 * So speed is not an `Order`. An order is a thing you do and the other player
 * finds out about; this is a thing you ask for and they may refuse. It travels
 * on its own, outside the tick sequence, because it changes nothing until it
 * is answered — and when it is answered the change goes through the sequence
 * like anything else, so both clocks turn over on the same slice.
 *
 * Carries the asker so a stale reply cannot be mistaken for an answer to a
 * newer request: tap Fast, tap Medium, and the Fast reply must not land on the
 * Medium question.
 */
export interface SpeedRequest {
  kind: 'speed-request';
  by: PlayableFaction;
  speed: Speed;
  /** Rises with each request, so an answer names the question it answers. */
  asked: number;
}

/** The other side's answer to a speed request. */
export interface SpeedReply {
  kind: 'speed-reply';
  asked: number;
  agreed: boolean;
}

/** Host to guest: we are no longer playing the same war, and here is where. */
export interface Desync {
  kind: 'desync';
  n: number;
  hostHash: string;
  guestHash: string;
}

export type Wire = Hello | Request | Tick | Ack | Desync | SpeedRequest | SpeedReply;

/**
 * A way to get a message to the other player, and nothing else.
 *
 * Deliberately this small. Two tabs on one machine talk through a
 * `BroadcastChannel`; two phones talk through a direct connection between
 * them; a test talks through a function call. None of that is the session's
 * business, which is why the session can be tested without a network — and
 * this container's egress policy refuses both the public introduction service
 * and a connection test, so being able to prove the whole machine without one
 * is not a convenience.
 */
export interface Transport {
  send(message: Wire): void;
  /** Register the only handler. Called with every message from the far side. */
  receive(handler: (message: Wire) => void): void;
  close(): void;
}
