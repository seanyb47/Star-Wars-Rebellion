import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import { abductOn } from '../src/sim/missions';
import { otherFaction } from '../src/sim/helpers';
import type { PlayableFaction } from '../src/sim/types';

const GAMES = Number(process.argv[2] ?? 6);
const FIRST = Number(process.argv[3] ?? 9000);
const CAP = Number(process.argv[4] ?? 600);
const sides: PlayableFaction[] = ['empire', 'alliance'];
const exposed: Record<string, number> = { empire: 0, alliance: 0 };
const free: Record<string, number> = { empire: 0, alliance: 0 };
const passes: Record<string, number> = { empire: 0, alliance: 0 };
const noIdle: Record<string, number> = { empire: 0, alliance: 0 };
let days = 0;

for (let g = 0; g < GAMES; g++) {
  let state = generateGalaxy(FIRST + g, 'empire');
  state.observing = true;
  for (let d = 0; d < CAP && !state.winner; d++) {
    state = advanceDay(state);
    days++;
    for (const s of sides) {
      // mine standing where the enemy could take them
      const foe = otherFaction(s);
      const marks = new Set(
        state.systems.map((x) => abductOn(state, x, foe)?.id).filter(Boolean) as string[],
      );
      const mine = state.characters.filter((c) => c.faction === s);
      exposed[s] += mine.filter((c) => marks.has(c.id)).length;
      free[s] += mine.filter((c) => c.status === 'available').length;
      if (state.day % 10 === 0) {
        passes[s]++;
        if (!mine.some((c) => c.status === 'available')) noIdle[s]++;
      }
    }
  }
}
for (const s of sides) {
  console.log(
    s.padEnd(9),
    'exposed/day', (exposed[s] / days).toFixed(2),
    ' idle/day', (free[s] / days).toFixed(2),
    ' passes with nobody free', Math.round((noIdle[s] / Math.max(1, passes[s])) * 100) + '%',
  );
}
