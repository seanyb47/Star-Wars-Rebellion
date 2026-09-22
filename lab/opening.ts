/**
 * What day one looks like, seed by seed.
 *
 * Sean, 22 September: *"I noticed upkeep starts differently every game. I guess
 * that means that the random seed of income producing stuff changes right? Is
 * that a big deal or no?"* The answer wants a spread, not a shrug, so this
 * prints the opening books for both sides over many seeds and reports how wide
 * each figure runs.
 *
 *   npx vite-node lab/opening.ts <games> <first-seed>
 */
import { generateGalaxy } from '../src/sim/galaxy';
import { totalUpkeep, totalIncome } from '../src/sim/economy';
import type { GameState, PlayableFaction } from '../src/sim/types';

const GAMES = Number(process.argv[2] ?? 60);
const FIRST = Number(process.argv[3] ?? 3000);

type Row = { upkeep: number; income: number; earners: number; troops: number; hulls: number };

function readOff(state: GameState, side: PlayableFaction): Row {
  let earners = 0;
  let troops = 0;
  for (const system of state.systems) {
    if (system.control !== side) continue;
    for (const f of system.facilities) {
      if (f.owner === side && (f.type === 'mine' || f.type === 'silver_mine' || f.type === 'refinery')) earners += 1;
    }
    troops += system.garrison;
  }
  let hulls = 0;
  for (const fleet of state.fleets) if (fleet.faction === side) hulls += fleet.ships.length;
  return {
    upkeep: totalUpkeep(state, side),
    income: totalIncome(state, side),
    earners,
    troops,
    hulls,
  };
}

function report(name: string, xs: number[]): string {
  const sorted = [...xs].sort((a, b) => a - b);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const spread = mean === 0 ? 0 : ((max - min) / mean) * 100;
  return `${name.padEnd(9)} min ${min.toFixed(0).padStart(6)}  median ${sorted[Math.floor(sorted.length / 2)].toFixed(0).padStart(6)}  max ${max.toFixed(0).padStart(6)}  mean ${mean.toFixed(1).padStart(7)}  spread ${spread.toFixed(0)}% of mean`;
}

for (const side of ['empire', 'alliance'] as const) {
  const rows: Row[] = [];
  for (let i = 0; i < GAMES; i++) rows.push(readOff(generateGalaxy(FIRST + i, side), side));
  console.log(`\n=== ${side}, day one, ${GAMES} seeds from ${FIRST} ===`);
  console.log(report('upkeep', rows.map((r) => r.upkeep)));
  console.log(report('income', rows.map((r) => r.income)));
  console.log(report('surplus', rows.map((r) => r.income - r.upkeep)));
  console.log(report('earners', rows.map((r) => r.earners)));
  console.log(report('troops', rows.map((r) => r.troops)));
  console.log(report('hulls', rows.map((r) => r.hulls)));
}

/*
 * And the question behind the question: does the opening roll decide the war?
 *
 * A spread is only interesting if it predicts something. So play each seed out
 * with both sides machine-played — the same harness `duel.ts` uses — and sort
 * the wars by how big the Crown's opening surplus edge was. If the roll is
 * load-bearing, the seeds where the Crown opened richest are the seeds the
 * Crown wins.
 */
if (process.argv[4] === 'play') {
  const { advanceDay } = await import('../src/sim/advanceDay');
  const CAP = 3000;
  const played: Array<{ seed: number; edge: number; winner: string }> = [];
  for (let i = 0; i < GAMES; i++) {
    const seed = FIRST + i;
    const opening = generateGalaxy(seed, 'empire');
    const edge =
      totalIncome(opening, 'empire') - totalUpkeep(opening, 'empire') -
      (totalIncome(opening, 'alliance') - totalUpkeep(opening, 'alliance'));
    let state = generateGalaxy(seed, 'empire');
    state.observing = true;
    for (let d = 0; d < CAP && !state.winner; d++) state = advanceDay(state);
    played.push({ seed, edge, winner: state.winner ?? 'none' });
  }
  played.sort((a, b) => a.edge - b.edge);
  const half = Math.floor(played.length / 2);
  const tally = (rows: typeof played) => {
    const e = rows.filter((r) => r.winner === 'empire').length;
    const a = rows.filter((r) => r.winner === 'alliance').length;
    return `Crown ${e} — Confederacy ${a}${rows.length - e - a ? ` — unfinished ${rows.length - e - a}` : ''}`;
  };
  console.log(`\n=== does the opening roll decide it? ${GAMES} wars ===`);
  console.log(`Crown opening surplus edge: ${played[0].edge.toFixed(1)}/day worst … ${played.at(-1)!.edge.toFixed(1)}/day best`);
  console.log(`worst half for the Crown  ${tally(played.slice(0, half))}`);
  console.log(`best half for the Crown   ${tally(played.slice(half))}`);
}
