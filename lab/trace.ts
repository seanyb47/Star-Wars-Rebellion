import { advanceDay } from '../src/sim/advanceDay';
import { generateGalaxy } from '../src/sim/galaxy';
import { continueMission } from '../src/sim/missions';
import { fleetsOf, isAtSea } from '../src/sim/fleets';

let state = generateGalaxy(14000, 'empire');
const ai = 'alliance';
let told = 0;
for (let d = 0; d < 600 && !state.winner && told < 12; d++) {
  const before = state.systems.filter((s) => !s.populated && s.control === ai).map((s) => s.id);
  state = advanceDay(state);
  for (const p of [...state.pendingDecisions]) continueMission(state, p.characterId);
  const now = state.systems.filter((s) => !s.populated && s.control === ai);
  for (const s of now) if (!before.includes(s.id)) { told++; console.log(`d${state.day} SETTLED ${s.name} (${s.slots} slots, garrison ${s.garrison})`); }
  for (const id of before) if (!now.some((s) => s.id === id)) { told++; console.log(`d${state.day} LOST ${state.systems.find(s=>s.id===id)?.name} -> ${state.systems.find(s=>s.id===id)?.control}`); }
  // Any fleet heading for an empty island?
  if (state.day % 150 === 0) {
    const heading = fleetsOf(state, ai).filter((f) => isAtSea(f) && !state.systems.find((s) => s.id === f.voyage!.targetSystemId)!.populated);
    console.log(`  d${state.day}: ${fleetsOf(state, ai).length} fleets, ${heading.length} bound for empty ground; explored ${state.systems.filter(s=>s.explored[ai]).length}/${state.systems.length}`);
  }
}
