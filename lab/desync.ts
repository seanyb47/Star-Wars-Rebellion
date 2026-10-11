/**
 * Does this sim give the same war twice? Lockstep PvP is built on yes.
 *
 * Two clients will exchange orders and each run `advanceDay` themselves —
 * nobody sends state, because state is 56-129 KB a day and an order is 106
 * bytes (`lab/wire.ts`). That trade only works if both machines compute the
 * **same** war from the same seed and the same orders. If they ever disagree,
 * the two players are playing different games and nothing on screen says so.
 *
 * So this walks a long war with both sides machine-played, hashes the state
 * every day, and prints checkpoints. Run it twice:
 *
 *   npx vite-node lab/desync.ts > /tmp/a.txt
 *   npx vite-node lab/desync.ts > /tmp/b.txt
 *   diff /tmp/a.txt /tmp/b.txt && echo "same war"
 *
 * Two processes rather than two loops in one, because a loop can agree with
 * itself by sharing something it should not.
 */
import { newGame } from '../src/sim/commands';
import { advanceDay } from '../src/sim/advanceDay';
import { setObserving } from '../src/sim/commands';
import { stateHash } from '../src/sim/sync';

const SEED = Number(process.argv[2] ?? 90210);
const DAYS = Number(process.argv[3] ?? 900);

let state = setObserving(newGame(SEED, 'empire'), true);
console.log(`seed ${SEED}, both sides machine-played`);
console.log(`day 0      ${stateHash(state)}`);

const marks = new Set([1, 2, 3, 10, 50, 100, 250, 500, 750, DAYS]);
while (state.day < DAYS && !state.winner) {
  state = advanceDay(state);
  if (marks.has(state.day)) console.log(`day ${String(state.day).padEnd(6)} ${stateHash(state)}`);
}
console.log(`end day ${state.day}, winner ${state.winner ?? 'none'}`);
console.log(`final      ${stateHash(state)}`);
