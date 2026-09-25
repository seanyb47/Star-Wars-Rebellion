/** Every distinct log line a long war produces, so the shapes can be read. */
import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
const seen = new Map<string, string>();
for (let g = 0; g < 6; g++) {
  let state = generateGalaxy(700 + g, 'empire');
  for (let d = 0; d < 900 && !state.winner; d++) state = advanceDay(state);
  for (const e of state.events) {
    const shape = e.text.replace(/\d+(\.\d+)?/g, 'N');
    if (!seen.has(shape)) seen.set(shape, `[${e.kind}] ${e.text}`);
  }
}
for (const [, sample] of [...seen].sort()) console.log(sample);
console.log(`\n${seen.size} distinct shapes.`);
