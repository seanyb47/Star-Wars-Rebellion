/**
 * What the economy actually looks like, before and after a change to it.
 *
 * Total income is the one figure a resource rule moves, and it moves
 * everything downstream — how many hulls a side can keep, how long a war runs.
 * So: play N wars, and report the shape of the money at four points.
 */
import { advanceDay } from '../src/sim/advanceDay';
import { generateGalaxy } from '../src/sim/galaxy';
import { totalIncome, totalUpkeep, islandIncome } from '../src/sim/economy';
import { GOLD_PER_DAY } from '../src/sim/constants';
import type { GameState, PlayableFaction } from '../src/sim/types';

const N = Number(process.argv[2] ?? 12);
const BASE = Number(process.argv[3] ?? 4000);
const MARKS = [1, 200, 600, 1200];

const rows: Record<number, { income: number[]; upkeep: number[]; earners: number[]; best: number[] }> =
  Object.create(null);
for (const m of MARKS) rows[m] = { income: [], upkeep: [], earners: [], best: [] };

for (let i = 0; i < N; i++) {
  const player: PlayableFaction = i % 2 === 0 ? 'empire' : 'alliance';
  let state: GameState = generateGalaxy(BASE + i, player);
  for (let d = 1; d <= Math.max(...MARKS) && !state.winner; d++) {
    state = advanceDay(state);
    if (!MARKS.includes(d)) continue;
    for (const side of ['empire', 'alliance'] as const) {
      rows[d].income.push(totalIncome(state, side));
      rows[d].upkeep.push(totalUpkeep(state, side));
      rows[d].earners.push(
        state.systems
          .filter((s) => s.control === side)
          .reduce(
            (n, s) => n + s.facilities.filter((f) => GOLD_PER_DAY[f.type] > 0 && !f.building).length,
            0,
          ),
      );
      const held = state.systems.filter((s) => s.control === side);
      rows[d].best.push(Math.max(0, ...held.map((s) => islandIncome(s, side))));
    }
  }
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
console.log(`${N} wars, seeds ${BASE}–${BASE + N - 1}, both sides counted.\n`);
console.log('day   income   upkeep      net   earners   best island');
for (const m of MARKS) {
  const r = rows[m];
  console.log(
    `${String(m).padStart(4)} ${mean(r.income).toFixed(1).padStart(8)} ${mean(r.upkeep)
      .toFixed(1)
      .padStart(8)} ${(mean(r.income) - mean(r.upkeep)).toFixed(1).padStart(8)} ${mean(r.earners)
      .toFixed(1)
      .padStart(9)} ${mean(r.best).toFixed(1).padStart(13)}`,
  );
}
