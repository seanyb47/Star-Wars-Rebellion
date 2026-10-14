import Peer, { type DataConnection } from 'peerjs';
import { peerIdFor } from './link';
import { newGameCode } from './link';
import { buffered } from './wire';
import type { Transport, Wire } from './wire';

/**
 * A connection between two phones, and the one piece of this that needs the
 * outside world.
 *
 * Two phones cannot find each other. Neither has a fixed address on the
 * internet — yours changes as you move between wifi and a mobile network — and
 * both sit behind a router that ignores strangers. So before any order can
 * cross, something out there has to make the introduction: *he is reachable
 * here, she is reachable there.* That is all the broker does. It is a few
 * hundred bytes, once, at the start. **The war itself never goes through it:**
 * once the introduction is made the two phones hold a direct connection and
 * everything after that is between them.
 *
 * **None of this can be tested from inside the container**, because the egress
 * policy refuses both the broker and any connection test — `403` from the
 * proxy. Everything above this file is provable without a wire, which is why
 * `src/net/__tests__/lockstep.test.ts` drives two whole sessions through a war
 * with no network at all. This file is where the unproven part lives, and the
 * first time it ran for real it did not work.
 *
 * ## What was wrong with it, which is worth keeping written down
 *
 * **1. The first message was thrown away.** `connection.on('data')` was
 * attached here, but the function that reads those messages is attached by the
 * `Session`, which is built a microtask later inside a `.then`. Anything that
 * arrived in between hit an `undefined` handler and vanished. Both sides open
 * with a `hello` and neither side repeated it, so the ordinary case — their
 * greeting arriving while our session is still being constructed — left both
 * players waiting for each other for ever, with nothing on either screen to
 * say why. Messages are now **buffered** until somebody is listening.
 *
 * **2. Nothing was ever said twice.** One lost greeting deadlocked the pair.
 * The session now repeats its greeting until the other side answers.
 *
 * **3. The host's lobby died when they went to send the link.** The flow is
 * *open a game → switch to Messages → send the link*, and switching apps on a
 * phone suspends the page and with it the socket holding the lobby open. By
 * the time the friend tapped the link there was nobody there to find. The
 * lobby now reconnects whenever the page comes back to the front.
 *
 * **4. A failure said nothing useful.** *"Could not find a game"* covers a
 * closed lobby, a dead broker, a phone with no signal and a typo. Each one now
 * says which it was, because the one thing worse than a bug is a bug nobody
 * can describe.
 */

/** How far along a connection is, in words a player can act on. */
export type LinkState =
  /** Fetching what two phones need to find each other. */
  | { at: 'opening' }
  /** The broker has us and we are waiting for the other player. */
  | { at: 'waiting'; code: string }
  /** Dialling the other phone. */
  | { at: 'connecting'; code: string }
  /** Through. */
  | { at: 'connected' }
  /** Stopped, with a reason and whether trying again is worth it. */
  | { at: 'failed'; why: string; again: boolean };

export interface Joining {
  /** The code to put in a link, once the broker has accepted us. */
  code: string;
  /** Resolves when the other player is connected. */
  transport: Promise<Transport>;
  /** Told every time the connection gets further, or stops. */
  watch(see: (state: LinkState) => void): void;
  /** Give up. */
  cancel(): void;
}

/**
 * What a PeerJS failure actually means, for somebody holding a phone.
 *
 * The library's types are accurate and useless at the sharp end: `peer-
 * unavailable` is four different situations and the player can only do
 * something about three of them.
 */
function explain(error: unknown): { why: string; again: boolean } {
  const type = (error as { type?: string })?.type ?? '';
  const says = (error as { message?: string })?.message ?? String(error);
  switch (type) {
    case 'peer-unavailable':
      return {
        why: 'Nobody is there under that code. Either they have not opened the game yet, or they closed it — ask them to open a new one and send a fresh link.',
        again: true,
      };
    case 'unavailable-id':
      return { why: 'That code is already in use. Open a new game.', again: false };
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed':
      return {
        why: 'Cannot reach the service that introduces the two phones. Check the signal and try again.',
        again: true,
      };
    case 'webrtc':
      return {
        why: 'The two phones found each other but could not open a line between them. This is the case a mobile network sometimes refuses outright; on wifi it usually works.',
        again: true,
      };
    case 'browser-incompatible':
      return { why: 'This browser cannot do it. Safari or Chrome will.', again: false };
    case 'disconnected':
      return { why: 'Lost the broker. Trying again may pick it back up.', again: true };
    default:
      return { why: says || 'It did not connect, and did not say why.', again: true };
  }
}

/**
 * Wrap a live `DataConnection` as the only thing the session wants.
 */
function transportOver(peer: Peer, connection: DataConnection): Transport {
  let handler: ((m: Wire) => void) | undefined;
  connection.on('data', (data) => {
    // Whatever arrives is the far side's, which is somebody else's browser: it
    // is data, never trusted, and an unknown `kind` is nothing. A malformed
    // message must not take the war down.
    try {
      const message = typeof data === 'string' ? (JSON.parse(data) as Wire) : (data as Wire);
      if (message && typeof message.kind === 'string') handler?.(message);
    } catch {
      /* a message we cannot read is a message we did not get */
    }
  });
  // `buffered` is what keeps the first message, and it is shared with every
  // other transport so the property is tested rather than written twice.
  return buffered({
    send(message) {
      if (connection.open) connection.send(JSON.stringify(message));
    },
    receive(next) {
      handler = next;
    },
    close() {
      connection.close();
      peer.destroy();
    },
  });
}

/**
 * Keep the lobby alive across the thing the player has to do next.
 *
 * Bug 3. Opening a game and then leaving the app to send the link is not an
 * edge case, it is the only way the link ever gets sent — and a suspended page
 * drops the socket that holds the lobby open. PeerJS keeps the peer alive
 * while only the *signalling* connection is gone, so coming back to the front
 * can simply pick it up again.
 */
function keepAlive(peer: Peer): () => void {
  const wake = () => {
    if (document.visibilityState !== 'visible') return;
    if (peer.destroyed || !peer.disconnected) return;
    try {
      peer.reconnect();
    } catch {
      /* nothing to be done about it here; the watcher reports the failure */
    }
  };
  document.addEventListener('visibilitychange', wake);
  peer.on('disconnected', () => {
    // Immediately if we are on screen, otherwise when we come back to it.
    wake();
  });
  return () => document.removeEventListener('visibilitychange', wake);
}

/** The scaffolding both ends share: a watcher, a cancel, and the tidy-up. */
function opening(peer: Peer, code: string) {
  let see: ((state: LinkState) => void) | undefined;
  let last: LinkState = { at: 'opening' };
  const stopKeepingAlive = keepAlive(peer);
  let cancelled = false;
  const say = (state: LinkState) => {
    last = state;
    see?.(state);
  };
  return {
    say,
    get cancelled() {
      return cancelled;
    },
    watch(next: (state: LinkState) => void) {
      see = next;
      next(last);
    },
    cancel() {
      cancelled = true;
      stopKeepingAlive();
      peer.destroy();
    },
    code,
  };
}

/**
 * Open a lobby and wait for a friend: the side that makes the link.
 *
 * The code *is* the address, so the link can be written before anybody has
 * connected — which is the whole point, since it has to be textable.
 */
export function host(): Joining {
  const code = newGameCode();
  const peer = new Peer(peerIdFor(code));
  const shared = opening(peer, code);
  const transport = new Promise<Transport>((resolve, reject) => {
    peer.on('open', () => shared.say({ at: 'waiting', code }));
    peer.on('connection', (connection) => {
      if (shared.cancelled) return;
      shared.say({ at: 'connecting', code });
      // `open` can have fired before we got here, on a fast local connection.
      if (connection.open) {
        shared.say({ at: 'connected' });
        resolve(transportOver(peer, connection));
        return;
      }
      connection.on('open', () => {
        shared.say({ at: 'connected' });
        resolve(transportOver(peer, connection));
      });
    });
    peer.on('error', (error) => {
      if (shared.cancelled) return;
      const { why, again } = explain(error);
      shared.say({ at: 'failed', why, again });
      // A lost broker is survivable — the lobby reconnects — so it is reported
      // without giving up on the game.
      if ((error as { type?: string })?.type !== 'disconnected') reject(error);
    });
  });
  return { code, transport, watch: shared.watch, cancel: shared.cancel };
}

/**
 * Walk into somebody's lobby: the side that opened the link.
 *
 * Dialled more than once, because the two obvious reasons it fails the first
 * time both cure themselves in a second or two: the host's phone has not quite
 * finished registering its lobby, or it has just been woken up and is
 * reconnecting its own socket. Giving up on the first `peer-unavailable` is
 * what makes the link feel broken when it is only slow.
 */
export function join(code: string, tries = 4): Joining {
  const peer = new Peer();
  const shared = opening(peer, code);
  const transport = new Promise<Transport>((resolve, reject) => {
    let left = tries;
    const dial = () => {
      if (shared.cancelled) return;
      shared.say({ at: 'connecting', code });
      const connection = peer.connect(peerIdFor(code), { reliable: true });
      const settled = { done: false };
      connection.on('open', () => {
        settled.done = true;
        shared.say({ at: 'connected' });
        resolve(transportOver(peer, connection));
      });
      const retry = (error: unknown) => {
        if (settled.done || shared.cancelled) return;
        settled.done = true;
        left -= 1;
        if (left > 0) {
          window.setTimeout(dial, 1200);
          return;
        }
        const { why, again } = explain(error);
        shared.say({ at: 'failed', why, again });
        reject(error);
      };
      connection.on('error', retry);
      // A connection that never opens and never errors is the commonest shape
      // of this failing, so it is given a deadline of its own.
      window.setTimeout(() => retry({ type: 'peer-unavailable' }), 9000);
    };
    peer.on('open', () => {
      shared.say({ at: 'connecting', code });
      dial();
    });
    peer.on('error', (error) => {
      if (shared.cancelled) return;
      // `peer-unavailable` here is the host not being found, which `dial`
      // already retries; anything else is ours and is fatal.
      if ((error as { type?: string })?.type === 'peer-unavailable') return;
      const { why, again } = explain(error);
      shared.say({ at: 'failed', why, again });
      reject(error);
    });
  });
  return { code, transport, watch: shared.watch, cancel: shared.cancel };
}
