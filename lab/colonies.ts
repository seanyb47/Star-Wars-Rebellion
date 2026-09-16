import { advanceDay } from '../src/sim/advanceDay';
import { generateGalaxy } from '../src/sim/galaxy';
import { continueMission } from '../src/sim/missions';

let darkStart = 0, darkEnd = 0, colonies = 0, games = 0, incomeEnd = 0, plots = 0;
for (let i = 0; i < 10; i++) {
  let state = generateGalaxy(14000 + i, i % 2 ? 'alliance' : 'empire');
  const ai = state.player === 'empire' ? 'alliance' : 'empire';
  // The frontier as it was on day one, so a colony can be recognised later.
  const wasEmpty = new Set(state.systems.filter((s) => !s.populated).map((s) => s.id));
  darkStart += state.systems.filter((s) => !s.explored[ai]).length;
  for (let d = 0; d < 700 && !state.winner; d++) {
    state = advanceDay(state);
    for (const p of [...state.pendingDecisions]) continueMission(state, p.characterId);
  }
  darkEnd += state.systems.filter((s) => !s.explored[ai]).length;
  const mine = state.systems.filter((s) => wasEmpty.has(s.id) && s.control === ai);
  colonies += mine.length;
  plots += mine.reduce((n, s) => n + s.slots, 0);
  incomeEnd += state.factions[ai].income;
  games++;
}
console.log(`the opponent, over ${games} wars:`);
console.log(`  islands dark to it: ${(darkStart/games).toFixed(1)} at the start → ${(darkEnd/games).toFixed(1)} at the end`);
console.log(`  frontier colonies held at the end: ${(colonies/games).toFixed(1)} a war, ${(plots/games).toFixed(0)} plots of new ground`);
console.log(`  income at the end: ${(incomeEnd/games).toFixed(1)}`);
