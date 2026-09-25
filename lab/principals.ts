/**
 * Where the Crown's two principals stand on day one, and whether that is one
 * island or two.
 *
 * The Confederate win is both of them in irons at once. If they open on the
 * same quay, that condition collapses back into "storm Highwater", which is
 * the afternoon's work the 21 September change was written to stop.
 */
import { generateGalaxy } from '../src/sim/galaxy';
import { CROWN_PRINCIPALS } from '../src/sim/constants';

const games = Number(process.argv[2] ?? 300);
let together = 0;
const where = new Map<string, number>();
for (let i = 0; i < games; i++) {
  const state = generateGalaxy(5000 + i, 'empire');
  const pair = state.characters.filter((c) => CROWN_PRINCIPALS.includes(c.name));
  const seats = pair.map((c) => c.locationSystemId ?? 'nowhere');
  if (seats.length === 2 && seats[0] === seats[1]) together++;
  for (const c of pair) {
    const at = state.systems.find((s) => s.id === c.locationSystemId);
    const key = `${c.name} @ ${at ? at.name : 'nowhere'}`;
    where.set(key, (where.get(key) ?? 0) + 1);
  }
}
console.log(`both on the same quay on day one: ${((together / games) * 100).toFixed(0)}% of ${games} worlds`);
for (const [k, n] of [...where.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
  console.log(`  ${((n / games) * 100).toFixed(0).padStart(3)}%  ${k}`);
}
