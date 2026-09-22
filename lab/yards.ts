/**
 * Why does one side climb the shipwright ladder twice as fast as the other?
 *
 * Measured 22 September: the Crown reaches craft 5.5 with a mean 0.76 officers
 * on research; the Confederacy reaches 3.2 with 0.91. More effort, less result,
 * which is the shape of a mission that is being run and not landing rather than
 * one nobody is running. This counts the cycles and how they end.
 *
 *   npx vite-node lab/yards.ts <games> <first-seed>
 */
import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import { RESEARCH_MIN_SUPPORT } from '../src/sim/constants';
import type { GameState, PlayableFaction } from '../src/sim/types';

const GAMES = Number(process.argv[2] ?? 12);
const FIRST = Number(process.argv[3] ?? 3000);
const CAP = 3000;

const t: Record<PlayableFaction, {
  where: number[]; held: number[]; craft: number[]; onIt: number[]; travelling: number[];
}> = {
  empire: { where: [], held: [], craft: [], onIt: [], travelling: [] },
  alliance: { where: [], held: [], craft: [], onIt: [], travelling: [] },
};

for (let i = 0; i < GAMES; i++) {
  let state: GameState = generateGalaxy(FIRST + i, 'empire');
  state.observing = true;
  for (let d = 0; d < CAP && !state.winner; d++) {
    state = advanceDay(state);
    if (d % 20) continue;
    for (const side of ['empire', 'alliance'] as const) {
      const held = state.systems.filter((s) => s.control === side && !s.uprising);
      t[side].held.push(held.length);
      // Somewhere the yards can actually work: yours, quiet, loyal enough.
      t[side].where.push(held.filter((s) => s.support[side] >= RESEARCH_MIN_SUPPORT).length);
      t[side].craft.push(state.factions[side].craft);
      const on = state.characters.filter((c) => c.faction === side && c.mission?.type === 'research');
      t[side].onIt.push(on.length);
      t[side].travelling.push(on.filter((c) => c.mission?.phase === 'travelling').length);
    }
  }
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
console.log(`\n=== ${GAMES} wars from seed ${FIRST}, sampled every 20 days ===`);
console.log(`a yard can work on an island you hold quietly with support >= ${RESEARCH_MIN_SUPPORT}\n`);
console.log('           islands held  of those, loyal enough  %   on research  of those, still at sea   craft');
for (const side of ['empire', 'alliance'] as const) {
  const r = t[side];
  const pct = (mean(r.where) / Math.max(0.01, mean(r.held))) * 100;
  console.log(
    `${side.padEnd(9)} ${mean(r.held).toFixed(1).padStart(12)} ${mean(r.where).toFixed(1).padStart(22)}` +
      ` ${pct.toFixed(0).padStart(3)}% ${mean(r.onIt).toFixed(2).padStart(12)}` +
      ` ${mean(r.travelling).toFixed(2).padStart(22)} ${mean(r.craft).toFixed(0).padStart(7)}`,
  );
}
