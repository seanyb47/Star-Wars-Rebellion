/**
 * How many of your crew can lead a Research mission, over a lot of worlds.
 *
 * Sean, 23 September: *"Only a small number of units should be able to
 * research. Like 4 max in game."* Nine of the forty carry a research role and
 * a side seats four or five, so this is the distribution that produces — on
 * day one, and again once the recruits have had a war to arrive in.
 */
import { generateGalaxy } from '../src/sim/galaxy';
import { canResearch } from '../src/sim/missions';
import type { PlayableFaction } from '../src/sim/types';

const games = Number(process.argv[2] ?? 300);
for (const side of ['empire', 'alliance'] as PlayableFaction[]) {
  const counts: number[] = [];
  let pool = 0;
  for (let i = 0; i < games; i++) {
    const state = generateGalaxy(6000 + i, side);
    const mine = state.characters.filter((c) => c.faction === side && !c.recruitable);
    counts.push(mine.filter(canResearch).length);
    pool = state.characters.filter((c) => c.faction === 'neutral' && canResearch(c)).length;
  }
  const hist = new Map<number, number>();
  for (const n of counts) hist.set(n, (hist.get(n) ?? 0) + 1);
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const bars = [...hist.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([n, c]) => `${n}: ${((c / games) * 100).toFixed(0)}%`)
    .join('  ');
  console.log(`${side.padEnd(9)} day one mean ${mean.toFixed(2)}   ${bars}   (+${pool} findable in the pool)`);
}
