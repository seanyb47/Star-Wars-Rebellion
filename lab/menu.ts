/**
 * What each side may actually order, and where.
 *
 * `raisableTroops` answers the ladder question — which rungs are unlocked —
 * and that is not the question the Build Troops screen asks. A troop with a
 * `home` can only be raised where its people live, so the menu a player sees
 * is the ladder intersected with the island they are standing on. This reports
 * both: the ladder, and the mean menu length across the islands a side holds
 * on day one.
 */
import { generateGalaxy } from '../src/sim/galaxy';
import { raisableTroops, raiseReason } from '../src/sim/troops';
import type { PlayableFaction } from '../src/sim/types';

console.log('--- the ladder, ignoring where you are standing ---');
for (const grade of [0, 2, 4, 6, 8]) {
  for (const side of ['empire', 'alliance'] as PlayableFaction[]) {
    const list = raisableTroops(side, grade);
    console.log(`R${grade} ${side.padEnd(9)} ${list.length}  ${list.map((t) => t.name).join(', ')}`);
  }
}

console.log('\n--- the menu on the islands you hold, over 200 worlds ---');
const games = Number(process.argv[2] ?? 200);
for (const grade of [0, 2, 4, 6, 8]) {
  for (const side of ['empire', 'alliance'] as PlayableFaction[]) {
    let islands = 0;
    let total = 0;
    let barren = 0; // islands where the menu is a single line
    for (let i = 0; i < games; i++) {
      const state = generateGalaxy(4000 + i, side);
      for (const system of state.systems.filter((s) => s.control === side)) {
        const n = raisableTroops(side, grade).filter(
          (t) => !raiseReason(t, grade, system),
        ).length;
        islands++;
        total += n;
        if (n <= 1) barren++;
      }
    }
    console.log(
      `R${grade} ${side.padEnd(9)} mean menu ${(total / islands).toFixed(2)}` +
        `   one choice or none on ${((barren / islands) * 100).toFixed(0)}% of your islands`,
    );
  }
}
