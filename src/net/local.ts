import type { Transport, Wire } from './wire';

/**
 * Two transports with no network between them, for the cases that have none.
 *
 * `pair()` is a function call in each direction, used by the tests: a whole
 * two-player war, orders, battles and desync alarms, driven in a loop with no
 * browser and no connection. That is not a convenience here — this container's
 * egress policy refuses both the public introduction service and any
 * connection test, so the only way to prove the machine is to prove it without
 * a wire.
 *
 * `channel()` is two tabs of the same browser, which is the rig for playing
 * both sides by hand and finding the things a test cannot: a sheet that reads
 * wrong from one chair, a stall nobody notices, a button that does not come
 * back. Not a feature anybody would use — you cannot text a tab to a friend.
 */

/**
 * Two ends of a direct call, each delivering to the other.
 *
 * Delivery is **asynchronous**, by `queueMicrotask`, deliberately. A direct
 * synchronous call would let a message arrive in the middle of sending one,
 * which a real connection never does, and the session would pass a test it
 * would fail on a wire.
 */
export function pair(): [Transport, Transport] {
  const handlers: Array<((m: Wire) => void) | undefined> = [undefined, undefined];
  const live = [true, true];
  const make = (me: number, them: number): Transport => ({
    send(message) {
      if (!live[me]) return;
      // Copied the way a wire copies it, so a session cannot accidentally hand
      // the other side a reference to its own state and have the test pass on
      // shared memory.
      const posted = JSON.parse(JSON.stringify(message)) as Wire;
      queueMicrotask(() => {
        if (live[them]) handlers[them]?.(posted);
      });
    },
    receive(handler) {
      handlers[me] = handler;
    },
    close() {
      live[me] = false;
    },
  });
  return [make(0, 1), make(1, 0)];
}

/**
 * Two tabs of one browser, over `BroadcastChannel`.
 *
 * Every tab on the channel hears everything, including itself, so each message
 * carries the id of the tab that sent it and a tab ignores its own. Without
 * that the host would apply its own ticks twice.
 */
export function channel(name: string): Transport {
  const me = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const bus = new BroadcastChannel(name);
  let handler: ((m: Wire) => void) | undefined;
  bus.onmessage = (event: MessageEvent<{ from: string; message: Wire }>) => {
    if (event.data?.from === me) return;
    handler?.(event.data.message);
  };
  return {
    send(message) {
      bus.postMessage({ from: me, message });
    },
    receive(next) {
      handler = next;
    },
    close() {
      bus.close();
    },
  };
}
