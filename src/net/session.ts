import { generateGalaxy } from '../sim/galaxy';
import type { Order } from '../sim/orders';
import { stateHash } from '../sim/sync';
import type { GameState, PlayableFaction, Speed } from '../sim/types';
import { SPEED_MS } from '../sim/constants';
import { otherFaction } from '../sim/helpers';
import type { Hello } from './wire';
import {
  applyTick,
  checkAt,
  dayTurns,
  dueAt,
  firstDisagreement,
  open,
  scheduleOrder,
  type Lockstep,
} from './lockstep';
import { CHECK_EVERY, INPUT_DELAY, type Ack, type Transport, type Wire } from './wire';

/**
 * One player's end of a two-player war.
 *
 * The session owns the war, takes the orders the screens give it, and keeps
 * itself level with the other player. It does **not** own a timer: `pump` is
 * called from outside with the current time, so a test can drive a whole war
 * in a loop and the UI can drive it from a `setInterval`. Everything subtle is
 * in `lockstep.ts`, which has no transport in it at all.
 *
 * One of the two is the **host** — whoever made the link. The difference is
 * narrow and entirely about numbering: the host decides which tick each order
 * lands in and when the day turns, because with two people and no referee
 * somebody has to, and two phones each deciding for themselves is two
 * different wars. It is not an advantage: the host schedules its own orders
 * the same `INPUT_DELAY` ahead as the guest's, so it does not win a race for
 * the same island by sitting closer to the sequence.
 */
export type Role = 'host' | 'guest';

export interface SessionOptions {
  role: Role;
  transport: Transport;
  /** The war, which both sides build from the seed rather than one sending it. */
  seed: number;
  /** Which side this player is on. */
  seat: PlayableFaction;
  /** Rejects a connection between two builds, which would desync on day one. */
  build: string;
  /** Told when the war changes, so a screen can redraw. */
  onChange?: (state: GameState) => void;
  /** Told when something has gone wrong that the player has to know about. */
  onTrouble?: (trouble: Trouble) => void;
}

/**
 * The three things that can go wrong, and all of them are worth a screen.
 *
 * `waiting` is not in here. Waiting is the ordinary condition of a two-player
 * war and the sheet reports it on its own.
 */
export interface Trouble {
  kind: 'desync' | 'mismatched-build' | 'refused-order';
  says: string;
}

export class Session {
  readonly role: Role;
  readonly seat: PlayableFaction;
  private readonly transport: Transport;
  private readonly build: string;
  private readonly onChange?: (state: GameState) => void;
  private readonly onTrouble?: (trouble: Trouble) => void;

  private step: Lockstep;
  /** Host: the next number to stamp on an order within its tick. */
  private seq = 0;
  /** Host: when the day last turned, in the caller's milliseconds. */
  private dayAt = 0;
  /** Host: the last tick the guest said it had applied. */
  private acked = 0;
  /** Host: fingerprints the guest has reported. */
  private theirChecks: Record<number, string> = {};
  /** Guest: orders sent and not yet seen coming back in a tick. */
  private inFlight = 0;
  /** True once the far side has said hello. */
  private joined = false;
  private stopped = false;
  /** Rises with each speed I ask for, so a stale answer is ignored. */
  private asked = 0;
  /** A speed I have asked for and not had an answer to. */
  private mine?: { asked: number; speed: Speed };
  /** A speed they have asked me for, waiting on my answer. */
  private theirs?: { asked: number; speed: Speed; by: PlayableFaction };

  constructor(options: SessionOptions) {
    this.role = options.role;
    this.seat = options.seat;
    this.transport = options.transport;
    this.build = options.build;
    this.onChange = options.onChange;
    this.onTrouble = options.onTrouble;
    // Both sides build the world from the seed. Nothing of the war is sent.
    this.step = open(generateGalaxy(options.seed, options.seat));
    this.step.state.human = ['empire', 'alliance'];
    this.transport.receive((message) => this.heard(message));
    /*
     * Both say hello, and either order works.
     *
     * The host used to be the only one that spoke first, which is fine down a
     * connection somebody has just dialled and wrong down a channel with no
     * replay: whichever side opens second never hears the greeting it missed,
     * so nobody is ever joined and the war never starts. Both greet, and a
     * greeting is answered exactly once — `joined` is the guard that stops two
     * polite clients saying hello to each other for ever.
     */
    this.greeting = {
      kind: 'hello',
      seed: options.seed,
      guestSeat: this.role === 'host' ? otherFaction(options.seat) : options.seat,
      build: this.build,
    };
    this.transport.send(this.greeting);
  }

  /** Our own hello, kept so it can be sent again in answer to theirs. */
  private greeting!: Hello;

  get state(): GameState {
    return this.step.state;
  }

  get tick(): number {
    return this.step.tick;
  }

  /** Is the other player with us? */
  get connected(): boolean {
    return this.joined && !this.stopped;
  }

  /**
   * Is the war held up on the other player rather than on anybody's decision?
   *
   * Sean, asked what happens when somebody closes the tab: *"The war
   * waits."* This is that, made visible — the host will not run ahead of a
   * guest that has gone quiet, and the screen says so instead of looking
   * frozen for no reason.
   */
  get waitingForPeer(): boolean {
    if (!this.joined) return true;
    if (this.role === 'guest') return false;
    return this.step.tick - this.acked > INPUT_DELAY;
  }

  /**
   * A speed the other player has asked for, and has not been answered.
   *
   * The dialog reads this. Sean's rule: *"the other player gets a popup 'the
   * [other faction] requests the speed to be [speed]' and they can accept or
   * decline. The game always works on mutual consent."*
   */
  get speedAsked(): { speed: Speed; by: PlayableFaction } | undefined {
    return this.theirs;
  }

  /** A speed I have asked for and am waiting on, for the screen to say so. */
  get speedPending(): Speed | undefined {
    return this.mine?.speed;
  }

  /**
   * Ask for a different speed.
   *
   * Nothing happens yet, and that is the rule rather than a limitation: the
   * clock is the one thing in the war that is shared outright, so it moves
   * only when both of them want it to.
   */
  requestSpeed(speed: Speed): void {
    if (this.stopped || speed === this.step.state.speed) return;
    this.asked += 1;
    this.mine = { asked: this.asked, speed };
    this.transport.send({ kind: 'speed-request', by: this.seat, speed, asked: this.asked });
  }

  /** Answer the speed they asked for. */
  answerSpeed(agreed: boolean): void {
    const question = this.theirs;
    if (!question) return;
    this.theirs = undefined;
    this.transport.send({ kind: 'speed-reply', asked: question.asked, agreed });
    // The host is the one that can put anything in the sequence, so if that is
    // us and we have just agreed, the change goes in now. If we are the guest,
    // the host does it when our reply reaches it.
    if (agreed && this.role === 'host') this.schedule({ kind: 'setSpeed', speed: question.speed }, question.by);
  }

  /**
   * An order from this player's screens.
   *
   * It does not happen yet, and that is the point. Nobody applies their own
   * tap on the spot — not even the host — because two clients applying their
   * own taps immediately and each other's on arrival put the same two orders
   * in two different sequences, which is a desync on the first simultaneous
   * pair. It lands `INPUT_DELAY` ticks later, a fifth of a second, whatever
   * speed the war is at.
   */
  order(order: Order): void {
    if (this.stopped) return;
    if (this.role === 'host') {
      this.schedule(order, this.seat);
    } else {
      this.inFlight += 1;
      this.transport.send({ kind: 'request', by: this.seat, order });
    }
  }

  /**
   * Host: emit the next slice of the war, if there is one to emit.
   *
   * Called from a timer, every `TICK_MS`. The guest does nothing here — it
   * applies what arrives.
   */
  pump(nowMs: number): void {
    if (this.stopped || this.role !== 'host' || !this.joined) return;
    // The war waits. Not a timeout and not a forfeit: the clock simply does
    // not turn until the other player is back with us.
    if (this.waitingForPeer) return;
    if (this.dayAt === 0) this.dayAt = nowMs;

    const n = this.step.tick + 1;
    const speed = SPEED_MS[this.step.state.speed as Speed];
    /*
     * The day turns only when the other player is level with us.
     *
     * `waitingForPeer` above already stops the sequence once they are more
     * than `INPUT_DELAY` behind, but that is a few slices of slack — and a
     * slice carrying a day turn inside that slack means the clock moves once
     * more after somebody has closed the tab. One day is not much and it is
     * still not what *"the war waits"* means, so the clock is held to the
     * stricter test: nothing of the war's time passes until they have
     * confirmed everything sent so far.
     *
     * It costs a round trip per day, which at the fastest speed is a tenth of
     * a second against a thousand, and buys an exact rule instead of an
     * approximate one.
     */
    const level = this.acked >= this.step.tick;
    const turns = level && dayTurns(this.step.state, nowMs - this.dayAt, speed);
    const tick = { kind: 'tick' as const, n, orders: dueAt(this.step, n), day: turns };
    // Sent before it is applied, so the guest is never behind by more than the
    // wire. Both then apply the identical slice.
    this.transport.send(tick);
    this.take(tick);
    if (turns) this.dayAt = nowMs;
  }

  /** Give up this war. Nothing is forfeited; the connection simply closes. */
  leave(): void {
    this.stopped = true;
    this.transport.close();
  }

  // ---------------------------------------------------------------- internals

  private schedule(order: Order, by: PlayableFaction): void {
    // `+ INPUT_DELAY` from the tick the host is *about* to emit, so the slice
    // this lands in has not been sent to anybody yet.
    const at = this.step.tick + 1 + INPUT_DELAY;
    this.seq += 1;
    this.step = scheduleOrder(this.step, order, by, at, this.seq);
  }

  private take(tick: Parameters<typeof applyTick>[1]): void {
    const { step, refused, error } = applyTick(this.step, tick);
    if (error) {
      this.trouble({ kind: 'desync', says: error });
      return;
    }
    this.step = step;
    for (const { error: why } of refused) {
      // Not a desync: a refusal is deterministic, so both sides refuse the
      // same thing for the same reason and stay level. Worth telling the
      // player whose order it was, though — it was probably their tap.
      this.trouble({ kind: 'refused-order', says: why });
    }
    if (this.role === 'guest') {
      const ack: Ack = { kind: 'ack', n: this.step.tick };
      const hash = checkAt(this.step);
      if (hash) ack.hash = hash;
      this.transport.send(ack);
    }
    this.onChange?.(this.step.state);
  }

  private heard(message: Wire): void {
    if (this.stopped) return;
    switch (message.kind) {
      case 'hello': {
        /*
         * Refuse a stranger's build before anything else.
         *
         * Pages ships on every push, so one of them having reloaded and the
         * other not is the ordinary case rather than a strange one — and two
         * different builds would come apart on day one with nothing on either
         * screen to say why.
         */
        if (message.build !== this.build) {
          this.trouble({
            kind: 'mismatched-build',
            says: `They are on a different build of the game (${message.build} against ${this.build}). Both of you reload, then try again.`,
          });
          return;
        }
        // Answered once. A second greeting is the far side answering ours.
        if (this.joined) return;
        this.joined = true;
        if (this.role === 'guest') {
          // The guest learns which war it is in and which side it has, and
          // builds the world itself rather than being sent sixty kilobytes of
          // it. The host's word on both: it made the link.
          this.step = open(generateGalaxy(message.seed, message.guestSeat));
          this.step.state.human = ['empire', 'alliance'];
          // So the host knows somebody is there and may start. Without this
          // first acknowledgement it waits for ever, by design.
          this.transport.send({ kind: 'ack', n: 0, hash: stateHash(this.step.state) });
        }
        this.transport.send(this.greeting);
        this.onChange?.(this.step.state);
        return;
      }
      case 'request': {
        // Guest's order, numbered by the host and put in a tick like its own.
        if (this.role === 'host') this.schedule(message.order, message.by);
        return;
      }
      case 'tick': {
        if (this.role === 'guest') {
          if (this.inFlight > 0) this.inFlight -= Math.min(this.inFlight, message.orders.length);
          this.take(message);
        }
        return;
      }
      case 'ack': {
        if (this.role !== 'host') return;
        this.acked = Math.max(this.acked, message.n);
        if (message.hash) {
          this.theirChecks[message.n] = message.hash;
          const apart = firstDisagreement(this.step.checks, this.theirChecks);
          if (apart) {
            this.transport.send({
              kind: 'desync',
              n: apart.n,
              hostHash: apart.mine,
              guestHash: apart.theirs,
            });
            this.reportDesync(apart.n);
          }
        }
        return;
      }
      case 'speed-request': {
        // Theirs to ask, mine to answer. Held rather than applied.
        this.theirs = { asked: message.asked, speed: message.speed, by: message.by };
        this.onChange?.(this.step.state);
        return;
      }
      case 'speed-reply': {
        // Only the answer to the question I am actually waiting on: tap Fast,
        // tap Medium, and the Fast answer must not land on the Medium question.
        if (!this.mine || this.mine.asked !== message.asked) return;
        const wanted = this.mine.speed;
        this.mine = undefined;
        if (message.agreed && this.role === 'host') {
          this.schedule({ kind: 'setSpeed', speed: wanted }, this.seat);
        }
        this.onChange?.(this.step.state);
        return;
      }
      case 'desync': {
        this.reportDesync(message.n);
        return;
      }
    }
  }

  /**
   * Stop, and say so.
   *
   * No attempt to recover. Two wars that have come apart cannot be reconciled
   * from inside either of them — there is no referee and no record of which
   * one is right — and carrying on would mean two people playing different
   * games while both screens look convincing. That is the one outcome this
   * whole design exists to prevent, so it ends the session loudly instead.
   */
  private reportDesync(n: number): void {
    this.stopped = true;
    this.trouble({
      kind: 'desync',
      says: `The two of you stopped playing the same war around tick ${n}. Nothing from here would be trustworthy, so this game has stopped. Start a new one.`,
    });
  }

  private trouble(trouble: Trouble): void {
    this.onTrouble?.(trouble);
  }
}

/** How often a fingerprint crosses, re-exported so a screen can explain it. */
export { CHECK_EVERY };
