import Peer, { type DataConnection } from 'peerjs';
import { peerIdFor } from './link';
import { newGameCode } from './link';
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
 * `peerjs` is used for the handshake and the data channel because the awkward
 * part is not the connection, it is the negotiation — candidate gathering, the
 * offer and answer, reconnection — and that is a solved problem nobody should
 * solve again in a game about boats. The default broker is free and needs no
 * account, which is why it is the starting point; if a real mobile network
 * defeats it, the fix is a relay of our own and this file is where it is
 * pointed somewhere else.
 *
 * **None of this is tested from inside the container**, because the egress
 * policy refuses both the broker and any connection test — `403` from the
 * proxy. That is the reason everything above this file is provable without a
 * wire: `src/net/__tests__/lockstep.test.ts` drives two real sessions through
 * a whole war, a battle and a desync alarm with no network at all, so what is
 * unproven here is narrowed to *this* file — one send, one receive, and the
 * plumbing around them.
 */

export interface Joining {
  /** The code to put in a link, once the broker has accepted us. */
  code: string;
  /** Resolves when the other player is connected. */
  transport: Promise<Transport>;
  /** Give up waiting. */
  cancel(): void;
}

/** Wrap a live `DataConnection` as the only thing the session wants. */
function transportOver(peer: Peer, connection: DataConnection): Transport {
  let handler: ((m: Wire) => void) | undefined;
  connection.on('data', (data) => {
    // Whatever arrives is the far side's, which is somebody else's browser:
    // it is data, never trusted, and the session treats an unknown `kind` as
    // nothing. A malformed message must not take the war down.
    try {
      const message = typeof data === 'string' ? (JSON.parse(data) as Wire) : (data as Wire);
      if (message && typeof message.kind === 'string') handler?.(message);
    } catch {
      /* ignore it: a message we cannot read is a message we did not get */
    }
  });
  return {
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
  let cancelled = false;
  const transport = new Promise<Transport>((resolve, reject) => {
    peer.on('connection', (connection) => {
      if (cancelled) return;
      connection.on('open', () => resolve(transportOver(peer, connection)));
    });
    peer.on('error', (error) => {
      if (!cancelled) reject(error);
    });
  });
  return {
    code,
    transport,
    cancel() {
      cancelled = true;
      peer.destroy();
    },
  };
}

/** Walk into somebody's lobby: the side that opened the link. */
export function join(code: string): Joining {
  // Our own id is left to the broker — only the host's needs to be guessable.
  const peer = new Peer();
  let cancelled = false;
  const transport = new Promise<Transport>((resolve, reject) => {
    peer.on('open', () => {
      if (cancelled) return;
      const connection = peer.connect(peerIdFor(code), { reliable: true });
      connection.on('open', () => resolve(transportOver(peer, connection)));
      connection.on('error', reject);
    });
    peer.on('error', (error) => {
      if (!cancelled) reject(error);
    });
  });
  return {
    code,
    transport,
    cancel() {
      cancelled = true;
      peer.destroy();
    },
  };
}
