import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import type { GameState, PlayableFaction } from '../src/sim/types';

const GAMES = Number(process.argv[2] ?? 12);
const FIRST = Number(process.argv[3] ?? 7000);
const CAP = Number(process.argv[4] ?? 1200);
const sides: PlayableFaction[] = ['empire', 'alliance'];
const acc: Record<string, number[]> = {};
const push = (k: string, v: number) => { (acc[k] = acc[k] ?? []).push(v); };

for (let g = 0; g < GAMES; g++) {
  let state: GameState = generateGalaxy(FIRST + g, 'empire');
  state.observing = true;
  for (let d = 0; d < CAP && !state.winner; d++) state = advanceDay(state);
  for (const f of sides) {
    const held = state.systems.filter((s) => s.control === f);
    const count = (t: string) =>
      held.reduce((n, s) => n + s.facilities.filter((x) => x.owner === f && x.type === t).length, 0);
    push(`${f} gold`, state.factions[f].gold);
    push(`${f} islands`, held.length);
    push(`${f} hulls`, state.fleets.filter((x) => x.faction === f).reduce((n, x) => n + x.ships.length, 0));
    push(`${f} slipways`, count('shipyard'));
    push(`${f} drill grounds`, count('training_facility'));
    push(`${f} yards`, count('construction_yard'));
    push(`${f} walls`, count('fort') + count('heavy_fort'));
    push(`${f} mines`, count('mine'));
    push(`${f} mills`, count('refinery'));
    push(`${f} companies`, held.reduce((n, s) => n + s.garrison, 0));
  }
}
for (const k of Object.keys(acc)) {
  const v = acc[k];
  console.log(k.padEnd(24), (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1));
}
