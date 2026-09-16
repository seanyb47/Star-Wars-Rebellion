import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import { craftGrade } from '../src/sim/missions';
import type { GameState, PlayableFaction } from '../src/sim/types';

const GAMES = Number(process.argv[2] ?? 16);
const FIRST = Number(process.argv[3] ?? 9000);
const GIFT = Number(process.argv[4] ?? 0); // extra Crown officers
const CAP = 2000;

const held = (s: GameState, f: PlayableFaction) => s.systems.filter((x) => x.control === f).length;
let e = 0, a = 0, none = 0;
const days: number[] = [];
const cap: Record<string, number[]> = { empire: [], alliance: [] };
const craft: Record<string, number[]> = { empire: [], alliance: [] };
const isles: Record<string, number[]> = { empire: [], alliance: [] };

for (let g = 0; g < GAMES; g++) {
  let state = generateGalaxy(FIRST + g, 'empire');
  state.observing = true;
  if (GIFT) {
    const hq = state.factions.empire.hqSystemId;
    const spare = state.characters.filter((c) => c.faction === 'neutral').slice(0, GIFT);
    for (const c of spare) {
      c.faction = 'empire';
      c.locationSystemId = hq;
      c.status = 'available';
    }
  }
  for (let d = 0; d < CAP && !state.winner; d++) state = advanceDay(state);
  if (state.winner === 'empire') e++; else if (state.winner === 'alliance') a++; else none++;
  days.push(state.day);
  for (const f of ['empire', 'alliance'] as PlayableFaction[]) {
    const mine = state.characters.filter((c) => c.faction === f);
    cap[f].push(mine.filter((c) => c.status === 'captured').length / Math.max(1, mine.length));
    craft[f].push(craftGrade(state.factions[f].craft));
    isles[f].push(held(state, f));
  }
}
const avg = (x: number[]) => (x.reduce((n, v) => n + v, 0) / x.length);
const med = (x: number[]) => [...x].sort((p, q) => p - q)[Math.floor(x.length / 2)];
console.log(`gift ${GIFT}: Crown ${e} — Confederacy ${a} — unfinished ${none}  median ${med(days)} days`);
for (const f of ['empire', 'alliance'] as PlayableFaction[]) {
  console.log(`  ${f.padEnd(9)} islands ${avg(isles[f]).toFixed(1)}  craft ${avg(craft[f]).toFixed(1)}  in irons ${(avg(cap[f]) * 100).toFixed(0)}%`);
}
