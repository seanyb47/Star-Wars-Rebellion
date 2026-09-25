/** Which troop types ever actually stand in a garrison over a whole war. */
import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import { companiesOn, troopsOf } from '../src/sim/troops';
import type { GameState } from '../src/sim/types';

const seen = new Set<string>();
for (let seed = 3000; seed < 3006; seed++) {
  let state: GameState = generateGalaxy(seed, 'empire');
  state.observing = true;
  for (let d = 0; d < 3000 && !state.winner; d++) {
    state = advanceDay(state);
    if (d % 25 === 0) for (const s of state.systems) for (const t of companiesOn(s)) seen.add(t.id);
  }
  for (const s of state.systems) for (const t of companiesOn(s)) seen.add(t.id);
}
for (const f of ['empire', 'alliance'] as const) {
  console.log(`\n${f}:`);
  for (const t of troopsOf(f)) {
    console.log(`  ${seen.has(t.id) ? 'GARRISONED' : 'never seen '}  ${t.name.padEnd(20)} unlock=${t.unlock}`);
  }
}
