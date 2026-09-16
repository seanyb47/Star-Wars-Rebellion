import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import type { GameState, PlayableFaction } from '../src/sim/types';

const GAMES = Number(process.argv[2] ?? 6);
const FIRST = Number(process.argv[3] ?? 9000);
const CAP = Number(process.argv[4] ?? 600);
const sides: PlayableFaction[] = ['empire', 'alliance'];

const bucket = [0, 50, 100, 200, 300, 450, 600];
const tally: Record<string, Record<string, number>> = {};
const roster: Record<string, number[]> = { empire: [], alliance: [] };

for (let g = 0; g < GAMES; g++) {
  let state = generateGalaxy(FIRST + g, 'empire');
  state.observing = true;
  for (let d = 0; d < CAP && !state.winner; d++) {
    state = advanceDay(state);
    const b = bucket.filter((x) => x <= state.day).pop()!;
    for (const s of sides) {
      const mine = state.characters.filter((c) => c.faction === s);
      for (const c of mine) {
        const key = `${b}|${s}`;
        tally[key] = tally[key] ?? {};
        const k = c.mission ? `on_${c.mission.type}` : c.status;
        tally[key][k] = (tally[key][k] ?? 0) + 1;
      }
    }
  }
  for (const s of sides) roster[s].push(state.characters.filter((c) => c.faction === s).length);
}
for (const b of bucket) {
  for (const s of sides) {
    const t = tally[`${b}|${s}`];
    if (!t) continue;
    const total = Object.values(t).reduce((a, x) => a + x, 0);
    const e = Object.entries(t).sort((a, x) => x[1] - a[1])
      .map(([k, v]) => `${k} ${Math.round((v / total) * 100)}%`).join('  ');
    console.log(`day ${String(b).padStart(3)} ${s.padEnd(9)} ${e}`);
  }
}
console.log('final roster sizes', roster);
