/**
 * How hard is each side's ground to work covertly?
 *
 * The Confederacy wins by putting two Crown principals in irons, so the watch
 * on Crown islands is not a detail — it is the thing standing between them and
 * the war. `watchOn` reads the garrison's detection, every idle crew member
 * standing there, and the island's commander at 0.9 of their leadership. That
 * last term is why a change to the CREW roster moves the GROUND war.
 */
import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import { watchOn } from '../src/sim/missions';
import type { GameState, PlayableFaction } from '../src/sim/types';

const GAMES = Number(process.argv[2] ?? 8);
const DAY = Number(process.argv[3] ?? 300);
const sums: Record<PlayableFaction, number[]> = { empire: [], alliance: [] };
const caps: Record<PlayableFaction, number[]> = { empire: [], alliance: [] };

for (let g = 0; g < GAMES; g++) {
  let state: GameState = generateGalaxy(2000 + g, 'empire');
  state.observing = true;
  for (let d = 0; d < DAY; d++) state = advanceDay(state);
  for (const f of ['empire', 'alliance'] as const) {
    const other = f === 'empire' ? 'alliance' : 'empire';
    const mine = state.systems.filter((s) => s.control === f && s.populated);
    for (const s of mine) sums[f].push(watchOn(state, s, other).total);
    const seat = state.systems.find((s) => s.id === state.factions[f].hqSystemId);
    if (seat) caps[f].push(watchOn(state, seat, other).total);
  }
}
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
console.log(`\nDay ${DAY}, ${GAMES} wars — what it costs to work on their ground:\n`);
for (const f of ['empire', 'alliance'] as const) {
  console.log(
    `${f.padEnd(9)} mean island watch ${mean(sums[f]).toFixed(1).padStart(6)}` +
      `   their seat ${mean(caps[f]).toFixed(1).padStart(6)}   (${sums[f].length} islands)`,
  );
}
