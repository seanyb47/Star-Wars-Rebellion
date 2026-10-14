/** A save sitting on a crew member's report, for driving the UI to that sheet. */
import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import { startMission, missionTypeFor, isMissionTarget } from '../src/sim/missions';
import { saveGame } from '../src/sim/persist';

const store: Record<string, string> = {};
const fake = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => {},
  key: () => null,
  length: 0,
} as unknown as Storage;

let state = generateGalaxy(4, 'empire');
const who = state.characters.find((c) => c.faction === 'empire' && c.status === 'available')!;
const target = state.systems.find((s) => isMissionTarget(state, s, 'empire'))!;
const type = missionTypeFor(state, target, 'empire')!;
startMission(state, who.id, target.id, type);
for (let d = 0; d < 400 && state.pendingDecisions.length === 0; d++) state = advanceDay(state);
if (state.pendingDecisions.length === 0) throw new Error('no decision in 400 days');
saveGame(state, fake);
console.log(JSON.stringify({ key: 'seven-seas.save.v8', value: store['seven-seas.save.v8'] }));
