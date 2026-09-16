import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import { isLord } from '../src/sim/lords';
import type { GameState, PlayableFaction } from '../src/sim/types';

const GAMES = Number(process.argv[2] ?? 8);
const FIRST = Number(process.argv[3] ?? 9000);
const CAP = Number(process.argv[4] ?? 2000);
const held = (s: GameState, f: PlayableFaction) => s.systems.filter((x) => x.control === f).length;

for (let g = 0; g < GAMES; g++) {
  let state = generateGalaxy(FIRST + g, 'empire');
  state.observing = true;
  let bestIrons = 0;
  let ironDays = 0;
  for (let d = 0; d < CAP && !state.winner; d++) {
    state = advanceDay(state);
    const irons = state.characters.filter((c) => isLord(c) && c.status === 'captured').length;
    bestIrons = Math.max(bestIrons, irons);
    if (irons >= 2) ironDays++;
  }
  const lords = state.characters.filter(isLord);
  console.log(
    String(FIRST + g),
    (state.winner ?? 'none').padEnd(9),
    String(state.day).padStart(5),
    `Crown ${String(held(state, 'empire')).padStart(2)}  Breth ${String(held(state, 'alliance')).padStart(2)}`,
    `| most Lords held at once ${bestIrons}, days with two or more ${ironDays}`,
    '|',
    lords.map((l) => `${l.name.split(' ')[0]}:${l.status}`).join(' '),
  );
}
