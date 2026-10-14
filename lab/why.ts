import { generateGalaxy } from '../src/sim/galaxy';
const s = generateGalaxy(31, 'empire');
const empty = s.systems.filter((x) => !x.populated);
console.log('control values on empty islands:', [...new Set(empty.map((x) => x.control))].join(', '));
console.log('sample:', empty.slice(0, 4).map((x) => `${x.name}[${x.control}] pop=${x.populated} slots=${x.slots}`).join('  '));
