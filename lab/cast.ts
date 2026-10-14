import { generateGalaxy } from '../src/sim/galaxy';
import { CROWN_PRINCIPAL, PIRATE_LORDS } from '../src/sim/constants';
let regent = 0, lords = 0;
for (let i = 0; i < 60; i++) {
  const s = generateGalaxy(20000 + i, 'empire');
  if (s.characters.some((c) => c.name === CROWN_PRINCIPAL)) regent++;
  if (PIRATE_LORDS.every((l) => s.characters.some((c) => c.name === l.name))) lords++;
}
console.log(`over 60 worlds: the Regent present in ${regent}, all three Lords in ${lords}`);
