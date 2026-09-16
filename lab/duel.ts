/**
 * Both sides played by the machine, which is the only way to see the war.
 *
 * Every campaign harness before this one left the player idle, so one side did
 * nothing and lost differently from a side that is actually playing. It read
 * 12-12 all day and hid the fact that a Crown which is *played* loses 21-0.
 *
 *   npx vite-node lab/duel.ts <games> <first-seed>
 */
import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import { isLord } from '../src/sim/lords';
import { craftGrade } from '../src/sim/missions';
import type { GameState, PlayableFaction } from '../src/sim/types';

const GAMES = Number(process.argv[2] ?? 24);
const FIRST = Number(process.argv[3] ?? 9000);
const CAP = 3000;

interface Row {
  seed: number;
  winner: PlayableFaction | 'none';
  days: number;
  islands: Record<PlayableFaction, number>;
  hulls: Record<PlayableFaction, number>;
  gold: Record<PlayableFaction, number>;
  grade: Record<PlayableFaction, number>;
  lordsHeld: number;
  why: string;
}

const held = (s: GameState, f: PlayableFaction) => s.systems.filter((x) => x.control === f).length;
const hulls = (s: GameState, f: PlayableFaction) =>
  s.fleets.filter((x) => x.faction === f).reduce((n, x) => n + x.ships.length, 0);

function play(seed: number): Row {
  let state = generateGalaxy(seed, 'empire');
  state.observing = true;
  for (let d = 0; d < CAP && !state.winner; d++) state = advanceDay(state);
  const lordsHeld = state.characters.filter((c) => isLord(c) && c.status === 'captured').length;
  const why = state.winner
    ? 'decided'
    : `Crown ${held(state, 'empire')} islands, ${lordsHeld}/3 Lords`;
  return {
    seed,
    winner: state.winner ?? 'none',
    days: state.day,
    islands: { empire: held(state, 'empire'), alliance: held(state, 'alliance') },
    hulls: { empire: hulls(state, 'empire'), alliance: hulls(state, 'alliance') },
    gold: {
      empire: Math.round(state.factions.empire.gold),
      alliance: Math.round(state.factions.alliance.gold),
    },
    grade: {
      empire: craftGrade(state.factions.empire.craft),
      alliance: craftGrade(state.factions.alliance.craft),
    },
    lordsHeld,
    why,
  };
}

const rows: Row[] = [];
for (let i = 0; i < GAMES; i++) rows.push(play(FIRST + i));

const wins = { empire: 0, alliance: 0, none: 0 };
for (const r of rows) wins[r.winner] += 1;
const decided = rows.filter((r) => r.winner !== 'none').map((r) => r.days).sort((a, b) => a - b);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

console.log(`\n=== ${GAMES} wars, both sides played ===`);
console.log(`Crown ${wins.empire} — Confederacy ${wins.alliance} — unfinished ${wins.none}`);
if (decided.length) {
  console.log(
    `length: min ${decided[0]}  median ${decided[Math.floor(decided.length / 2)]}  max ${decided.at(-1)}`,
  );
}
for (const f of ['empire', 'alliance'] as const) {
  console.log(
    `${f.padEnd(9)} at the end: ${mean(rows.map((r) => r.islands[f])).toFixed(1)} islands, ` +
      `${mean(rows.map((r) => r.hulls[f])).toFixed(1)} hulls, ` +
      `${Math.round(mean(rows.map((r) => r.gold[f])))} gold, ` +
      `craft ${mean(rows.map((r) => r.grade[f])).toFixed(1)}`,
  );
}
console.log(`Lords in irons at the end: ${mean(rows.map((r) => r.lordsHeld)).toFixed(2)} of 3`);
const stuck = rows.filter((r) => r.winner === 'none');
if (stuck.length) {
  console.log(`\n--- never ended (${stuck.length}) ---`);
  for (const r of stuck) console.log(`  ${r.seed}: ${r.why}`);
}
