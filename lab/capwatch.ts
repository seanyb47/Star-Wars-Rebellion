/**
 * What it costs to work against the Crown's capital, on day one.
 *
 * The number this reports moved twice in two days for reasons that had nothing
 * to do with covert play — once when the Marines were labelled `line` and
 * garrisoned every rock the Crown holds, and again when the economy went to
 * the sheet's own scale and the opening gained a second barracks and a second
 * slipway. Both times it was worth knowing, so it gets a harness.
 *
 *   npx vite-node lab/capwatch.ts <seeds>
 */
import { generateGalaxy } from '../src/sim/galaxy';
import { getSystem } from '../src/sim/helpers';
import { watchOn } from '../src/sim/missions';

const SEEDS = Number(process.argv[2] ?? 32);
const keys = ['garrison', 'idle', 'commander', 'people', 'total'] as const;
const cols: Record<string, number[]> = { garrison: [], idle: [], commander: [], people: [], total: [] };
for (let seed = 1; seed <= SEEDS; seed++) {
  const state = generateGalaxy(seed, 'alliance');
  const capital = getSystem(state, state.factions.empire.hqSystemId);
  const w = watchOn(state, capital, 'alliance');
  for (const k of keys) cols[k].push(w[k]);
}
console.log(`Highwater's watch against the Confederacy, day one, ${SEEDS} seeds:`);
for (const k of keys) {
  const v = cols[k];
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const sorted = [...v].sort((a, b) => a - b);
  console.log(
    `  ${k.padEnd(10)} mean ${mean.toFixed(1).padStart(6)}  median ${sorted[Math.floor(SEEDS / 2)].toFixed(1).padStart(6)}  range ${sorted[0].toFixed(1)}-${sorted[SEEDS - 1].toFixed(1)}`,
  );
}
