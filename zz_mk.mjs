import { generateGalaxy } from './src/sim/galaxy.ts';
import { addShip, board } from './src/sim/fleets.ts';
import { getSystem } from './src/sim/helpers.ts';
import { writeFileSync } from 'node:fs';
const s = generateGalaxy(7, 'alliance');
s.fleets.length = 0;
const home = getSystem(s, s.factions.alliance.hqSystemId);
let mine;
for (const c of ['tempest', 'tempest', 'swift', 'swift', 'reef', 'brig']) mine = addShip(s, home, 'alliance', c);
for (const c of ['sovereign', 'sovereign', 'razorback', 'kestrel', 'fluyt']) addShip(s, home, 'empire', c);
// Somebody at the wheel on each side, and companies in the transports.
const ours = s.characters.find((c) => c.faction === 'alliance' && !/Hale|Reyne|Jessup/.test(c.name));
if (ours) { ours.locationSystemId = home.id; ours.leadership = 84; board(s, mine.id, ours.id, 'alliance'); }
for (const f of s.fleets) if (f.faction === 'alliance') f.troops = 3;
s.speed = 'paused';
writeFileSync('/tmp/claude-0/save.json', JSON.stringify(s));
console.log('home', home.name, s.fleets.map(f => [f.faction, f.ships.length, f.officerIds.length]));
