import { generateGalaxy } from '../src/sim/galaxy';
import { addShip, advanceFleets, fleetsOf } from '../src/sim/fleets';
import { createRng } from '../src/sim/rng';
import type { ShipClassId } from '../src/sim/types';

/** Fight A against B a hundred times and say who wins. */
function duel(a: ShipClassId[], b: ShipClassId[], runs = 150) {
  let aWins = 0, bWins = 0, draws = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const state = generateGalaxy(500, 'empire');
    state.fleets.length = 0;
    const isle = state.systems.find((s) => s.control === 'none' && !s.beast)!;
    isle.facilities = [];
    for (const c of a) addShip(state, isle, 'empire', c);
    for (const c of b) addShip(state, isle, 'alliance', c);
    const rng = createRng(seed);
    for (let r = 0; r < 12; r++) {
      advanceFleets(state, rng);
      const ea = fleetsOf(state, 'empire').reduce((n, f) => n + f.ships.length, 0);
      const eb = fleetsOf(state, 'alliance').reduce((n, f) => n + f.ships.length, 0);
      if (ea === 0 || eb === 0) { if (ea > 0) aWins++; else if (eb > 0) bWins++; else draws++; break; }
      if (r === 11) draws++;
    }
  }
  return `${aWins}-${bWins}${draws ? ` (${draws} undecided)` : ''}`;
}
const cost: Record<string, number> = { kestrel: 45, razorback: 85, sovereign: 150, fluyt: 55 };
console.log('one to one:');
console.log(`  1 first-rate (150g) vs 1 sloop (45g):      ${duel(['CWN-SOV-S04'], ['CFS-SWI-S01'])}`);
console.log(`  1 first-rate vs 1 frigate (85g):           ${duel(['CWN-SOV-S04'], ['CFS-TEM-R3-01'])}`);
console.log('\nby the purse — even gold each side:');
console.log(`  1 first-rate (150g) vs 3 sloops (135g):    ${duel(['CWN-SOV-S04'], ['CFS-SWI-S01','CFS-SWI-S01','CFS-SWI-S01'])}`);
console.log(`  1 first-rate (150g) vs 4 sloops (180g):    ${duel(['CWN-SOV-S04'], ['CFS-SWI-S01','CFS-SWI-S01','CFS-SWI-S01','CFS-SWI-S01'])}`);
console.log(`  2 first-rates (300g) vs 7 sloops (315g):   ${duel(['CWN-SOV-S04','CWN-SOV-S04'], Array(7).fill('CFS-SWI-S01'))}`);
console.log(`  2 frigates (170g) vs 4 sloops (180g):      ${duel(['CWN-VAN-R1-01','CWN-VAN-R1-01'], Array(4).fill('CFS-SWI-S01'))}`);
console.log(`  2 first-rates (300g) vs 3 frigates (255g): ${duel(['CWN-SOV-S04','CWN-SOV-S04'], ['CFS-TEM-R3-01','CFS-TEM-R3-01','CFS-TEM-R3-01'])}`);
console.log(`  balanced 1 large+2 med (320g) vs 7 sloops: ${duel(['CWN-SOV-S04','CWN-VAN-R1-01','CWN-VAN-R1-01'], Array(7).fill('CFS-SWI-S01'))}`);
void cost;
