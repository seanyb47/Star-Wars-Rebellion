import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import { craftGrade } from '../src/sim/missions';
import type { GameState, PlayableFaction } from '../src/sim/types';

const GAMES = Number(process.argv[2] ?? 12);
const FIRST = Number(process.argv[3] ?? 7000);
const CAP = Number(process.argv[4] ?? 1200);
const sides: PlayableFaction[] = ['empire', 'alliance'];
const t: Record<string, Record<string, number>> = { empire: {}, alliance: {} };
const roster: Record<string, number> = { empire: 0, alliance: 0 };
const craft: Record<string, number> = { empire: 0, alliance: 0 };
let days = 0;

for (let g = 0; g < GAMES; g++) {
  let state: GameState = generateGalaxy(FIRST + g, 'empire');
  state.observing = true;
  for (let d = 0; d < CAP && !state.winner; d++) {
    state = advanceDay(state);
    days++;
    for (const f of sides) {
      for (const c of state.characters.filter((x) => x.faction === f)) {
        const k = c.mission ? c.mission.type : c.status;
        t[f][k] = (t[f][k] ?? 0) + 1;
      }
      roster[f] += state.characters.filter((x) => x.faction === f).length;
    }
  }
  for (const f of sides) craft[f] += craftGrade(state.factions[f].craft);
}
for (const f of sides) {
  const total = Object.values(t[f]).reduce((a, b) => a + b, 0);
  console.log(
    f.padEnd(9),
    'roster', (roster[f] / days).toFixed(1),
    'craft', (craft[f] / GAMES).toFixed(1),
    Object.entries(t[f]).sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${Math.round((v / total) * 100)}%`).join('  '),
  );
}
