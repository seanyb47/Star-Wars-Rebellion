/**
 * What a game of this would weigh on a wire, and what an order weighs instead.
 *
 * Written to settle one question before any PvP code was: does a second player
 * get sent the **state** or the **orders**? Both are real architectures —
 * host-authoritative broadcast against deterministic lockstep — and the choice
 * is decided by arithmetic, not taste. A day is one second at Fast
 * (`SPEED_MS`), so whatever crosses the wire has to fit in a second.
 *
 *   npx vite-node lab/wire.ts
 */
import { newGame } from '../src/sim/commands';
import { advanceDay } from '../src/sim/advanceDay';

const kb = (x: unknown) => Buffer.byteLength(JSON.stringify(x), 'utf8') / 1024;

let state = newGame(12345, 'empire');
console.log('day     whole state   events    the rest');
const row = (s: typeof state) =>
  console.log(
    String(s.day).padEnd(8),
    `${kb(s).toFixed(1)} KB`.padEnd(14),
    `${kb(s.events).toFixed(1)} KB`.padEnd(10),
    `${(kb(s) - kb(s.events)).toFixed(1)} KB`,
  );
row(state);
for (const stop of [50, 200, 600, 1200]) {
  while (state.day < stop && !state.winner) state = advanceDay(state);
  row(state);
}

// The lockstep comparison: one order, as it would have to cross.
const order = {
  seat: 'empire',
  day: state.day,
  seq: 7,
  kind: 'orderBuild',
  args: ['fac-123', { kind: 'ship', id: 'majestic' }],
};
console.log('\none order:', Buffer.byteLength(JSON.stringify(order), 'utf8'), 'bytes');
console.log('a day of orders, say six:', Buffer.byteLength(JSON.stringify([order, order, order, order, order, order]), 'utf8'), 'bytes');
