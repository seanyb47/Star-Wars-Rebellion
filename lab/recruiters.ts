/**
 * How many Recruiters each side actually has on the quay on day one.
 *
 * The roster question Sean asked — two for the Crown, three for the
 * Confederacy — is about the opening bench, not the whole cast: the bags are
 * fourteen and eleven and only four and five are seated. So count what a war
 * opens with, over enough seeds that the answer is the distribution.
 */
import { generateGalaxy } from '../src/sim/galaxy';
import type { PlayableFaction } from '../src/sim/types';

const games = Number(process.argv[2] ?? 400);
const first = Number(process.argv[3] ?? 7000);

for (const side of ['empire', 'alliance'] as PlayableFaction[]) {
  const counts: number[] = [];
  for (let i = 0; i < games; i++) {
    const state = generateGalaxy(first + i, side);
    const mine = state.characters.filter((c) => c.faction === side && !c.recruitable);
    counts.push(mine.filter((c) => c.roles.includes('Recruiter')).length);
  }
  const hist = new Map<number, number>();
  for (const n of counts) hist.set(n, (hist.get(n) ?? 0) + 1);
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const bars = [...hist.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([n, c]) => `${n}: ${((c / games) * 100).toFixed(0)}%`)
    .join('  ');
  console.log(`${side.padEnd(9)} mean ${mean.toFixed(2)} recruiters on day one   ${bars}`);
}
