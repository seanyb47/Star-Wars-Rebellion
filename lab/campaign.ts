import { playGame, type Run, type Answer } from './play';
import type { PlayableFaction } from '../src/sim/types';

const N = Number(process.argv[2] ?? 20);
const BASE = Number(process.argv[3] ?? 1000);
const ANSWER = (process.argv[4] ?? 'carry-on') as Answer;
const PLAY = process.argv[5] === 'play';

const runs: Run[] = [];
for (let i = 0; i < N; i++) {
  const player: PlayableFaction = i % 2 === 0 ? 'empire' : 'alliance';
  const r = playGame(BASE + i, player, { answer: ANSWER, play: PLAY });
  runs.push(r);
  const vs = Object.keys(r.counts).filter((k) => k.startsWith('violation-'));
  process.stdout.write(
    `${BASE + i} ${player.padEnd(8)} -> ${(r.winner ?? 'unfinished').padEnd(10)} ` +
    `d${String(r.days).padStart(4)} ${String(r.ms).padStart(5)}ms` +
    (vs.length ? `  !! ${vs.map((k) => k.slice(10) + '×' + r.counts[k]).join(' ')}` : '') + '\n',
  );
}

// ---- Report
const sum = (k: string) => runs.reduce((n, r) => n + (r.counts[k] ?? 0), 0);
const allKeys = new Set<string>();
for (const r of runs) for (const k of Object.keys(r.counts)) allKeys.add(k);

const wins = { empire: 0, alliance: 0, none: 0 };
for (const r of runs) wins[r.winner ?? 'none']++;
const lens = runs.filter((r) => r.winner).map((r) => r.days).sort((a, b) => a - b);
const med = (xs: number[]) => (xs.length ? xs[Math.floor(xs.length / 2)] : 0);

console.log(`\n=== ${N} games, answering "${ANSWER}"${PLAY ? ', with a pilot at the wheel' : ', player idle'} ===`);
console.log(`Crown ${wins.empire} — Confederacy ${wins.alliance} — unfinished ${wins.none}`);
console.log(`length: min ${lens[0] ?? '-'}  median ${med(lens)}  max ${lens.at(-1) ?? '-'}`);
const crownWins = runs.filter((r) => r.winner === 'empire').map((r) => r.days).sort((a,b)=>a-b);
const confWins = runs.filter((r) => r.winner === 'alliance').map((r) => r.days).sort((a,b)=>a-b);
console.log(`  Crown wins: median ${med(crownWins)} (${crownWins.length})   Confederacy wins: median ${med(confWins)} (${confWins.length})`);
console.log(`perf: total ${(runs.reduce((n,r)=>n+r.ms,0)/1000).toFixed(1)}s, worst single day ${Math.max(...runs.map(r=>r.worstDayMs))}ms`);

const stalled = runs.filter((r) => r.stall);
if (stalled.length) {
  console.log(`\n--- WARS THAT NEVER ENDED (${stalled.length}) ---`);
  for (const r of stalled) console.log(`  ${r.seed} (${r.player}): ${r.stall}`);
}

const violations = [...allKeys].filter((k) => k.startsWith('violation-')).sort();
console.log(`\n--- INVARIANTS ---`);
if (violations.length === 0) console.log('clean across every day of every game');
else for (const k of violations) {
  const games = runs.filter((r) => r.counts[k]).length;
  const ex = runs.flatMap((r) => r.violations).find((v) => `violation-${v.rule}` === k);
  console.log(`  ${k.slice(10).padEnd(26)} ${String(sum(k)).padStart(7)} day-hits in ${games}/${N} games   e.g. d${ex?.day} ${ex?.detail}`);
}

console.log(`\n--- WHAT THE RULES ACTUALLY DID (totals over ${N} games) ---`);
const show = (label: string, key: string, per = true) => {
  const t = sum(key);
  const games = runs.filter((r) => r.counts[key]).length;
  console.log(`  ${label.padEnd(30)} ${String(t).padStart(8)}${per ? `  (${(t / N).toFixed(1)}/game, in ${games}/${N})` : ''}`);
};
for (const k of ['event-flip','event-mutiny','event-battle','event-loss','event-order','event-mission','event-war'])
  show(k.replace('event-','log: '), k);
console.log('');
for (const k of ['text-abduction','text-rising','text-sabotage','text-creature','text-rescue','text-survey','text-research','text-recruit','text-blockade'])
  show(k.replace('text-',''), k);
console.log('');
for (const k of ['player-battle-rounds','battle-won','battle-lost','battle-they-fled','battle-you-fled','battle-beast-slain','battle-runaway','player-decisions','answered-home','answered-carry-on'])
  show(k, k);
console.log('');
for (const k of ['siege-days','walled-island-days','town-shelled-islands','text-bombard','text-shelling','text-storm'])
  show(k, k);
console.log('');
for (const k of ['confederacy-landless-days','crown-landless-days','no-safe-ground-days'])
  show(k, k);
console.log('');
for (const k of ['lord-posted-moot','lord-posted-line','lord-posted-runner','runner-days','uprising-days','captive-days','injured-days','idle-days','beast-slain-days','fleet-at-sea-days','blockade-days'])
  show(k, k);

console.log(`\n--- ECONOMY AND FORCES AT THE END ---`);
const avg = (f: (r: Run) => number) => (runs.reduce((n, r) => n + f(r), 0) / N).toFixed(0);
console.log(`  gold at end     Crown ${avg((r)=>r.goldEnd.empire).padStart(7)}   Confederacy ${avg((r)=>r.goldEnd.alliance).padStart(7)}`);
console.log(`  gold peak       Crown ${avg((r)=>r.goldPeak.empire).padStart(7)}   Confederacy ${avg((r)=>r.goldPeak.alliance).padStart(7)}`);
console.log(`  days in the red Crown ${avg((r)=>r.goldBrokeDays.empire).padStart(7)}   Confederacy ${avg((r)=>r.goldBrokeDays.alliance).padStart(7)}`);
console.log(`  islands at end  Crown ${avg((r)=>r.islandsEnd.empire).padStart(7)}   Confederacy ${avg((r)=>r.islandsEnd.alliance).padStart(7)}`);
console.log(`  peak hulls      Crown ${avg((r)=>r.hullsPeak.empire).padStart(7)}   Confederacy ${avg((r)=>r.hullsPeak.alliance).padStart(7)}`);

const orderKeys = [...allKeys].filter((k) => k.startsWith('order-')).sort();
if (orderKeys.length) {
  console.log(`\n--- WHAT THE PILOT DID ---`);
  for (const k of orderKeys) {
    const t = sum(k);
    console.log(`  ${k.slice(6).padEnd(30)} ${String(t).padStart(8)}  (${(t / N).toFixed(1)}/game)`);
  }
}

const never = [
  'text-abduction','text-rising','text-sabotage','text-creature','text-rescue',
  'text-survey','text-research','text-recruit','text-blockade',
  'battle-you-fled','battle-beast-slain','beast-slain-days',
].filter((k) => sum(k) === 0);
if (never.length) console.log(`\n!! NEVER HAPPENED IN ${N} GAMES: ${never.join(', ')}`);
