/**
 * Why does a side end a war sitting on a mountain of gold?
 *
 * Task #121 has been open since the Crown was the hoarder; the Confederacy is
 * the hoarder now, ending wars with 22–29k against the Crown's 5–6k. Gold that
 * is never spent is force that was never bought, so this asks what the opponent
 * was doing instead of spending it — how many of its drill grounds and slipways
 * stood idle, what its surplus was, and how far up the research ladder it got.
 *
 *   npx vite-node lab/purse.ts <games> <first-seed>
 */
import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import { craftGrade } from '../src/sim/missions';
import { totalIncome, totalUpkeep } from '../src/sim/economy';
import type { GameState, PlayableFaction } from '../src/sim/types';

const GAMES = Number(process.argv[2] ?? 12);
const FIRST = Number(process.argv[3] ?? 3000);
const CAP = 3000;

interface Tally {
  gold: number[];
  idleYards: number[];
  idleDrills: number[];
  yards: number[];
  drills: number[];
  surplus: number[];
  grade: number[];
  onResearch: number[];
  freeRoom: number[];
}
const blank = (): Tally => ({
  gold: [], idleYards: [], idleDrills: [], yards: [], drills: [],
  surplus: [], grade: [], onResearch: [], freeRoom: [],
});
const tally: Record<PlayableFaction, Tally> = { empire: blank(), alliance: blank() };

function sample(state: GameState, side: PlayableFaction): void {
  const t = tally[side];
  let yards = 0, idleYards = 0, drills = 0, idleDrills = 0, room = 0;
  for (const s of state.systems) {
    if (s.control !== side) continue;
    room += Math.max(0, s.slots - s.facilities.length - (s.deposits?.length ?? 0));
    for (const f of s.facilities) {
      if (f.owner !== side || f.founding) continue;
      if (f.type === 'shipyard') { yards++; if (!f.building) idleYards++; }
      if (f.type === 'training_facility') { drills++; if (!f.building) idleDrills++; }
    }
  }
  t.gold.push(state.factions[side].gold);
  t.yards.push(yards); t.idleYards.push(idleYards);
  t.drills.push(drills); t.idleDrills.push(idleDrills);
  t.surplus.push(totalIncome(state, side) - totalUpkeep(state, side));
  t.grade.push(craftGrade(state.factions[side].craft));
  t.freeRoom.push(room);
  t.onResearch.push(
    state.characters.filter((c) => c.faction === side && c.mission?.type === 'research').length,
  );
}

for (let i = 0; i < GAMES; i++) {
  let state = generateGalaxy(FIRST + i, 'empire');
  state.observing = true;
  for (let d = 0; d < CAP && !state.winner; d++) {
    state = advanceDay(state);
    if (d % 20 === 0) for (const side of ['empire', 'alliance'] as const) sample(state, side);
  }
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
console.log(`\n=== ${GAMES} wars from seed ${FIRST}, sampled every 20 days ===`);
console.log('                   gold   surplus   yards  idle   drills  idle   room   craft  on research');
for (const side of ['empire', 'alliance'] as const) {
  const t = tally[side];
  const pctY = t.yards.length ? (mean(t.idleYards) / Math.max(0.01, mean(t.yards))) * 100 : 0;
  const pctD = t.drills.length ? (mean(t.idleDrills) / Math.max(0.01, mean(t.drills))) * 100 : 0;
  console.log(
    `${side.padEnd(10)} ${mean(t.gold).toFixed(0).padStart(9)} ${mean(t.surplus).toFixed(1).padStart(9)}` +
      ` ${mean(t.yards).toFixed(1).padStart(7)} ${pctY.toFixed(0).padStart(4)}%` +
      ` ${mean(t.drills).toFixed(1).padStart(8)} ${pctD.toFixed(0).padStart(4)}%` +
      ` ${mean(t.freeRoom).toFixed(1).padStart(6)} ${mean(t.grade).toFixed(2).padStart(7)}` +
      ` ${mean(t.onResearch).toFixed(2).padStart(9)}`,
  );
}
