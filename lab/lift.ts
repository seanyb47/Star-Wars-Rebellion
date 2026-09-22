/**
 * Are the boats going out empty?
 *
 * `lab/purse.ts` found drill grounds standing **91% idle on both sides**, which
 * is either the opponent having all the companies it needs or the opponent
 * unable to get them to where a landing would happen. The two look identical in
 * a build log and completely different in a war, so this counts the lift: how
 * many companies are afloat, how many hulls are carrying nothing, and how often
 * a squadron sits in an enemy harbor with no one to put ashore.
 *
 *   npx vite-node lab/lift.ts <games> <first-seed>
 */
import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import { fleetCapacity } from '../src/sim/fleets';
import type { GameState, PlayableFaction } from '../src/sim/types';

const GAMES = Number(process.argv[2] ?? 12);
const FIRST = Number(process.argv[3] ?? 3000);
const CAP = 3000;

const t: Record<PlayableFaction, {
  afloat: number[]; berths: number[]; empty: number[]; fleets: number[];
  ashoreSpare: number[]; atTheirs: number[]; atTheirsEmpty: number[];
}> = {
  empire: { afloat: [], berths: [], empty: [], fleets: [], ashoreSpare: [], atTheirs: [], atTheirsEmpty: [] },
  alliance: { afloat: [], berths: [], empty: [], fleets: [], ashoreSpare: [], atTheirs: [], atTheirsEmpty: [] },
};

for (let i = 0; i < GAMES; i++) {
  let state: GameState = generateGalaxy(FIRST + i, 'empire');
  state.observing = true;
  for (let d = 0; d < CAP && !state.winner; d++) {
    state = advanceDay(state);
    if (d % 20) continue;
    for (const side of ['empire', 'alliance'] as const) {
      const mine = state.fleets.filter((f) => f.faction === side && f.ships.length > 0);
      const theirIslands = new Set(
        state.systems.filter((s) => s.control !== side && s.control !== 'neutral').map((s) => s.id),
      );
      const atTheirs = mine.filter((f) => f.systemId && theirIslands.has(f.systemId));
      t[side].fleets.push(mine.length);
      t[side].afloat.push(mine.reduce((n, f) => n + f.troops, 0));
      t[side].berths.push(mine.reduce((n, f) => n + fleetCapacity(f), 0));
      t[side].empty.push(mine.filter((f) => f.troops === 0).length);
      t[side].atTheirs.push(atTheirs.length);
      t[side].atTheirsEmpty.push(atTheirs.filter((f) => f.troops === 0).length);
      // Companies standing on your own islands over what holds them quiet.
      t[side].ashoreSpare.push(
        state.systems
          .filter((s) => s.control === side)
          .reduce((n, s) => n + s.garrison, 0),
      );
    }
  }
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
console.log(`\n=== ${GAMES} wars from seed ${FIRST}, sampled every 20 days ===`);
console.log('           fleets  troops afloat  lift berths  used%  empty fleets  ashore  in their harbors (empty)');
for (const side of ['empire', 'alliance'] as const) {
  const r = t[side];
  const used = (mean(r.afloat) / Math.max(0.01, mean(r.berths))) * 100;
  console.log(
    `${side.padEnd(9)} ${mean(r.fleets).toFixed(1).padStart(6)} ${mean(r.afloat).toFixed(1).padStart(14)}` +
      ` ${mean(r.berths).toFixed(1).padStart(12)} ${used.toFixed(0).padStart(5)}%` +
      ` ${mean(r.empty).toFixed(1).padStart(13)} ${mean(r.ashoreSpare).toFixed(1).padStart(7)}` +
      ` ${mean(r.atTheirs).toFixed(2).padStart(10)} (${mean(r.atTheirsEmpty).toFixed(2)})`,
  );
}
