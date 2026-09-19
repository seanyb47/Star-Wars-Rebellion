/**
 * How each side's corps of officers holds up over a war.
 *
 * The diagnostic that found the longest-standing stall in the game, and the
 * one to run again after anything that touches abduction, rescue, recruiting
 * or the watch. The headline win table hides all of it: a side can be winning
 * on islands while its whole corps sits in somebody else's cells, and the war
 * then freezes rather than ending.
 *
 * Averages only over the wars *still running* at each day, which matters more
 * than it sounds: dividing by every war makes a collapsing corps look like a
 * shrinking one, because the wars that ended stop contributing.
 *
 *   npx vite-node lab/corps.ts [wars] [first-seed]
 */
import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import { canRecruit } from '../src/sim/missions';
import type { PlayableFaction } from '../src/sim/types';

const WARS = Number(process.argv[2] ?? 16);
const FIRST = Number(process.argv[3] ?? 9000);
const AT = [200, 500, 1000, 2000, 3000];

const free: Record<string, number[]> = { empire: [], alliance: [] };
const irons: Record<string, number[]> = { empire: [], alliance: [] };
const noRec: Record<string, number[]> = { empire: [], alliance: [] };
const live: number[] = [];

for (let seed = FIRST; seed < FIRST + WARS; seed++) {
  let state = generateGalaxy(seed, 'empire');
  state.observing = true;
  let i = 0;
  for (let d = 0; d < 3000 && !state.winner; d++) {
    state = advanceDay(state);
    while (i < AT.length && state.day >= AT[i]) {
      live[i] = (live[i] ?? 0) + 1;
      for (const f of ['empire', 'alliance'] as PlayableFaction[]) {
        const mine = state.characters.filter((c) => c.faction === f);
        free[f][i] = (free[f][i] ?? 0) + mine.filter((c) => c.status !== 'captured').length;
        irons[f][i] = (irons[f][i] ?? 0) + mine.filter((c) => c.status === 'captured').length;
        if (!mine.some((c) => c.status !== 'captured' && canRecruit(c))) {
          noRec[f][i] = (noRec[f][i] ?? 0) + 1;
        }
      }
      i++;
    }
  }
}

console.log(`=== ${WARS} wars, both sides played, averaged over those still running ===\n`);
console.log('  day  wars   Crown free  irons  no-rec   Brethren free  irons  no-rec');
for (let i = 0; i < AT.length; i++) {
  const n = live[i] ?? 0;
  if (n === 0) continue;
  const v = (a: number[]) => ((a[i] ?? 0) / n).toFixed(1).padStart(5);
  const pc = (a: number[]) => `${Math.round(((a[i] ?? 0) / n) * 100)}%`.padStart(6);
  console.log(
    `  ${String(AT[i]).padStart(4)}  ${String(n).padStart(4)}  ${v(free.empire)}  ${v(irons.empire)}  ${pc(noRec.empire)}` +
      `        ${v(free.alliance)}  ${v(irons.alliance)}  ${pc(noRec.alliance)}`,
  );
}
console.log(
  '\n"no-rec" is the share of wars in which that side had no Recruiter at large,',
);
console.log('which is the state a side cannot recruit its way out of.');
