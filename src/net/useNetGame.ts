import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState, Speed } from '../sim/types';
import type { Order } from '../sim/orders';
import { Session, type Trouble } from './session';
import { codeFromLink, linkFor, tabsFromLink } from './link';
import type { Joining, LinkState } from './peer';
import { channel } from './local';
import { TICK_MS, type Transport } from './wire';

/**
 * Two tabs of one browser, as a door in the address bar.
 *
 * `#tabs=host` and `#tabs=guest` play each other through a `BroadcastChannel`
 * with no introduction service and no internet. Nobody would use it — you
 * cannot text a tab to a friend — and it is here because it is the only way
 * the whole chain can be checked from inside this container, whose egress
 * policy refuses the broker and any connection test. Everything above the wire
 * runs through it: the lobby, the seam every order passes, the sequence, the
 * clock, two fogs of war, a battle answered from two sides.
 *
 * The seed is fixed so the two tabs agree without a handshake deciding it.
 */
const TAB_CHANNEL = 'seven-seas.tabs.v1';
const TAB_SEED = 20261014;

/**
 * Where a two-player war has got to.
 *
 * `none` is every game this app has ever played, and nothing in `App` behaves
 * differently for it.
 */
export type Phase =
  /** Not in a two-player war at all. */
  | { at: 'none' }
  /** Waiting for a friend to open the link. */
  | { at: 'hosting'; code: string; link: string; says?: string }
  /** Opened somebody's link, or opening a lobby; finding the other end. */
  | { at: 'joining'; code: string; says?: string }
  /** Both here. */
  | { at: 'playing' }
  /** It ended badly enough to say so and stop. */
  | { at: 'broken'; says: string };

/** A connection state as something to read on a screen. */
function wording(link: LinkState): string {
  switch (link.at) {
    case 'opening':
      return 'Fetching what two phones need to find each other.';
    case 'waiting':
      return 'Ready and waiting. Keep this screen open until they join.';
    case 'connecting':
      return 'Found them — opening a line.';
    case 'connected':
      return 'Through. Setting the war up.';
    case 'failed':
      return link.why;
  }
}

export interface NetGame {
  phase: Phase;
  /** The war, once there is one. */
  state: GameState | null;
  /** Give an order; it lands a fifth of a second later, on both phones. */
  order: (order: Order) => void;
  /** Ask for a speed. The other player accepts or declines. */
  requestSpeed: (speed: Speed) => void;
  /** A speed they have asked for, waiting on an answer. */
  speedAsked: { speed: Speed; by: GameState['player'] } | undefined;
  /** A speed I have asked for and am waiting on. */
  speedPending: Speed | undefined;
  answerSpeed: (agreed: boolean) => void;
  /** Is the war held up on the other player rather than on a decision? */
  waiting: boolean;
  /** Open a lobby and get a link to text. */
  invite: () => void;
  /** Give up: leave the war, or close the lobby. */
  leave: () => void;
}

export function useNetGame(build: string): NetGame {
  const [phase, setPhase] = useState<Phase>({ at: 'none' });
  const [state, setState] = useState<GameState | null>(null);
  /** Bumped whenever the session changes something a screen reads off it. */
  const [, nudge] = useState(0);
  const session = useRef<Session | null>(null);
  const lobby = useRef<Joining | null>(null);

  const trouble = useCallback((t: Trouble) => {
    // A desync or a build mismatch ends the war: there is nothing to carry on
    // with. A refused order is ordinary and belongs in the usual notice line,
    // which `App` passes in through `onRefused`.
    if (t.kind === 'refused-order') return;
    setPhase({ at: 'broken', says: t.says });
  }, []);

  const begin = useCallback(
    (role: 'host' | 'guest', transport: Transport, seed: number, seat: GameState['player']) => {
      const live = new Session({
        role,
        transport,
        seed,
        seat,
        build,
        onChange: (next) => {
          setState(next);
          nudge((n) => n + 1);
        },
        onTrouble: trouble,
      });
      session.current = live;
      setState(live.state);
      setPhase({ at: 'playing' });
    },
    [build, trouble],
  );

  /*
   * Opened from a link: find them and sit down.
   *
   * The seed and the side come from the host in `hello`, so the link carries
   * only the code — short enough to text, and nothing in it goes stale except
   * the lobby itself.
   */
  useEffect(() => {
    // The two-tab door first, since it needs no lobby at all.
    const tabs = tabsFromLink();
    if (tabs) {
      const transport = channel(TAB_CHANNEL);
      begin(tabs, transport, TAB_SEED, tabs === 'host' ? 'empire' : 'alliance');
      return () => transport.close();
    }
    const code = codeFromLink();
    if (!code) return;
    setPhase({ at: 'joining', code });
    let gone = false;
    /*
     * The connection library is loaded here rather than imported.
     *
     * It is 81 KB of WebRTC plumbing and the overwhelming majority of launches
     * never play a friend — so it is fetched by the two people who are about
     * to, and never by anybody else. `link.ts` is what every launch needs in
     * order to notice `#join=` at all, and it has no library in it.
     */
    const ready = import('./peer').then(({ join }) => {
      const waiting = join(code);
      lobby.current = waiting;
      // Every step, on the screen. "Struggling to connect" has to become a
      // sentence somebody can read out, or there is nothing to fix.
      waiting.watch((link) => {
        if (gone) return;
        if (link.at === 'failed') setPhase({ at: 'broken', says: link.why });
        else setPhase({ at: 'joining', code, says: wording(link) });
      });
      return waiting;
    });
    ready
      .then((waiting) => waiting.transport)
      .then((transport) => {
        if (gone) return;
        // Seat and seed are overwritten by the host's `hello`; these are only
        // what the session is built with before it hears anything.
        begin('guest', transport, 0, 'alliance');
      })
      // The watcher above has already said what went wrong and in more detail
      // than a rejection carries, so this only has to stop the chain.
      .catch(() => {});
    return () => {
      gone = true;
      void ready.then((waiting) => waiting.cancel()).catch(() => {});
    };
  }, [begin]);

  /*
   * The clock, which in a two-player war belongs to the sequence rather than
   * to either phone.
   *
   * `App`'s own clock counts real time into a day and calls `advanceDay`. Here
   * the host counts real time into a *slice*, and whether the day turns is
   * part of the slice both sides apply — because two phones each deciding for
   * themselves when a day turns is two clocks, and two clocks drift.
   */
  useEffect(() => {
    if (phase.at !== 'playing') return;
    const timer = window.setInterval(() => {
      // Both ends, not just the host: the guest does nothing to the sequence
      // here but it is where it repeats its greeting until the host answers,
      // which is what stops one lost message deadlocking the pair.
      session.current?.pump(performance.now());
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [phase.at]);

  const invite = useCallback(() => {
    setPhase({ at: 'joining', code: '' });
    void import('./peer')
      .then(({ host }) => {
        const open = host();
        lobby.current = open;
        open.watch((link) => {
          if (link.at === 'failed') setPhase({ at: 'broken', says: link.why });
          else if (link.at === 'opening') setPhase({ at: 'joining', code: '' });
          else {
            setPhase({
              at: 'hosting',
              code: open.code,
              link: linkFor(open.code),
              says: wording(link),
            });
          }
        });
        return open.transport;
      })
      .then((transport) => begin('host', transport, Date.now() >>> 0, 'empire'))
      .catch(() => {});
  }, [begin]);

  const leave = useCallback(() => {
    session.current?.leave();
    session.current = null;
    lobby.current?.cancel();
    lobby.current = null;
    setState(null);
    setPhase({ at: 'none' });
  }, []);

  return {
    phase,
    state,
    order: useCallback((order: Order) => session.current?.order(order), []),
    requestSpeed: useCallback((speed: Speed) => {
      session.current?.requestSpeed(speed);
      // The asking changes nothing in the war, so nothing redraws on its own —
      // and the one thing the player needs now is the line saying they are
      // waiting on an answer.
      nudge((n) => n + 1);
    }, []),
    speedAsked: session.current?.speedAsked,
    speedPending: session.current?.speedPending,
    answerSpeed: useCallback((agreed: boolean) => {
      session.current?.answerSpeed(agreed);
      nudge((n) => n + 1);
    }, []),
    waiting: Boolean(session.current?.waitingForPeer),
    invite,
    leave,
  };
}
