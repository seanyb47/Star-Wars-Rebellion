/**
 * Both sides played by the machine, which is the only way to see the war.
 *
 * Every campaign harness before this one left the player idle, so one side did
 * nothing and lost differently from a side that is actually playing. It read
 * 12-12 all day and hid the fact that a Crown which is *played* loses 21-0.
 *
 *   npx vite-node lab/duel.ts <games> <first-seed>
 *
 * HOW MANY WARS IS ENOUGH, because twenty-four has been the default since this
 * file was written and nobody ever justified it.
 *
 * A war has one winner, so a side's win count over `n` decided wars is a coin
 * flip and its standard deviation is `sqrt(n)/2`. At twenty-four that is 2.45,
 * which means two runs of the *same code* on different seeds land three wins
 * apart without anything being wrong. That is not a thought experiment — it is
 * what happened on 21 September: this tree read Crown 11 — 11 on seeds 9000
 * and Crown 8 — 12 on seeds 2000, and two sessions spent an afternoon
 * explaining a difference that was noise.
 *
 * So: twenty-four wars can detect a rout and nothing finer. Forty-eight halves
 * the error and is the least worth quoting a win table from. **A win count
 * within about two of even is not a finding**, and the honest report of one is
 * "no difference this run can see" rather than a score.
 *
 * The other two columns are cheaper to be sure about, and are usually the more
 * interesting answers anyway. Wars that never end and the count of Lords taken
 * are not coin flips — they are rates with a much smaller spread — so a change
 * in them shows up at twenty-four wars when a change in the win table does not.
 */
import { audit, type Violation } from './audit';
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

/** Every rule that must hold, checked every day of every war. */
const broken = new Map<string, { count: number; first: string }>();
function check(state: GameState, seed: number): void {
  for (const v of audit(state) as Violation[]) {
    const seen = broken.get(v.rule);
    if (seen) seen.count += 1;
    else broken.set(v.rule, { count: 1, first: `seed ${seed}, day ${v.day}: ${v.detail}` });
  }
}

const held = (s: GameState, f: PlayableFaction) => s.systems.filter((x) => x.control === f).length;
const hulls = (s: GameState, f: PlayableFaction) =>
  s.fleets.filter((x) => x.faction === f).reduce((n, x) => n + x.ships.length, 0);

function play(seed: number): Row {
  let state = generateGalaxy(seed, 'empire');
  state.observing = true;
  for (let d = 0; d < CAP && !state.winner; d++) {
    state = advanceDay(state);
    check(state, seed);
  }
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
if (broken.size) {
  console.log(`\n--- rules broken (${broken.size}) ---`);
  for (const [rule, { count, first }] of broken) console.log(`  ${rule} x${count} — ${first}`);
} else {
  console.log('\nno rule broken in any war.');
}

const stuck = rows.filter((r) => r.winner === 'none');
if (stuck.length) {
  console.log(`\n--- never ended (${stuck.length}) ---`);
  for (const r of stuck) console.log(`  ${r.seed}: ${r.why}`);
}
