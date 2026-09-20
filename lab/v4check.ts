/**
 * The engine against v3's own published simulation results.
 *
 * The Fleet Roster v3 tab carries a KEY SIM RESULTS block: nine matchups run
 * at 5,000 trials in Sean's own tool, with win, loss and mutual rates. That is
 * the one check available that is not the engine marking its own homework —
 * the same fight, the same rules, worked independently — so after the v3
 * import it is run here head to head.
 *
 *   npx vite-node lab/v3check.ts [trials] [seed]
 */
import { createRng } from '../src/sim/rng';
import {
  combatExchange,
  commission,
  resolveFlee,
  survivors,
  totalHull,
  type Fleet,
} from '../src/sim/navycombat';
import { ROSTER } from '../src/sim/shipdefs';

const TRIALS = Number(process.argv[2] ?? 5000);
const SEED0 = Number(process.argv[3] ?? 1);
const EXCHANGE_CAP = 200;

const fleet = (...ids: string[]): Fleet =>
  ids.map((id, i) => commission(`${id}-${i}`, ROSTER.byId.get(id)!));

function duel(makeA: () => Fleet, makeB: () => Fleet, seed: number) {
  const a = makeA();
  const b = makeB();
  const rng = createRng(seed);
  let exchanges = 0;
  let rounds = 0;
  while (survivors(a).length > 0 && survivors(b).length > 0 && exchanges < EXCHANGE_CAP) {
    const before = { a: totalHull(a), b: totalHull(b) };
    rounds += combatExchange(a, b, rng).rounds;
    exchanges += 1;
    if (totalHull(a) === before.a && totalHull(b) === before.b) break;
  }
  const aGone = survivors(a).length === 0;
  const bGone = survivors(b).length === 0;
  return { winner: aGone && bGone ? 'mutual' : aGone ? 'b' : bGone ? 'a' : 'none', exchanges, rounds };
}

function run(makeA: () => Fleet, makeB: () => Fleet) {
  let winA = 0, winB = 0, mutual = 0, none = 0, exchanges = 0, rounds = 0;
  for (let t = 0; t < TRIALS; t++) {
    const out = duel(makeA, makeB, SEED0 + t * 7919);
    if (out.winner === 'a') winA += 1;
    else if (out.winner === 'b') winB += 1;
    else if (out.winner === 'mutual') mutual += 1;
    else none += 1;
    exchanges += out.exchanges;
    rounds += out.rounds;
  }
  const pc = (n: number) => (n / TRIALS) * 100;
  return {
    a: pc(winA), b: pc(winB), mutual: pc(mutual), none: pc(none),
    ex: exchanges / TRIALS, rounds: rounds / TRIALS,
  };
}

/** What the master publishes, as written, so the comparison is against it. */
const CASES: Array<{ label: string; a: string[]; b: string[]; want: [number, number, number] }> = [
  { label: 'Majestic vs Urskin Goliath (1v1)', a: ['CWN-MAJ-R8-01'], b: ['CFS-URG-R7-01'], want: [100, 0, 0] },
  { label: 'Majestic vs Coral-Class (1v1)', a: ['CWN-MAJ-R8-01'], b: ['CFS-COR-R8-01'], want: [84.6, 1.2, 14.2] },
  { label: 'Coral-Class vs Urskin Goliath (1v1)', a: ['CFS-COR-R8-01'], b: ['CFS-URG-R7-01'], want: [100, 0, 0] },
  { label: 'Majestic vs 2x Goliath', a: ['CWN-MAJ-R8-01'], b: ['CFS-URG-R7-01', 'CFS-URG-R7-01'], want: [0, 100, 0] },
  { label: 'Majestic vs 2x Coral', a: ['CWN-MAJ-R8-01'], b: ['CFS-COR-R8-01', 'CFS-COR-R8-01'], want: [0, 100, 0] },
  { label: 'Sovereign vs 14x Marauder', a: ['CWN-SOV-S04'], b: Array(14).fill('CFS-MAR-R1-01'), want: [100, 0, 0] },
  { label: 'Reefwarden vs Vanguard II', a: ['CFS-REE-R4-01'], b: ['CWN-VAN-R4-02'], want: [100, 0, 0] },
  { label: 'Ironback vs Bulwark', a: ['CFS-IRB-R5-01'], b: ['CWN-BUL-R3-01'], want: [0, 100, 0] },
  { label: 'Interceptor II vs Blackfin', a: ['CWN-INT-R5-02'], b: ['CFS-BLA-R6-01'], want: [83, 4, 13] },
  { label: 'Blackfin vs Marauder', a: ['CFS-BLA-R6-01'], b: ['CFS-MAR-R1-01'], want: [100, 0, 0] },
  // New in v4, and its three new hulls are the ones worth checking hardest: a
  // published number on a ship this engine has never simmed is the strongest
  // evidence the import is faithful rather than merely self-consistent.
  { label: 'Wraith vs Marauder', a: ['CWN-WRA-R5-03'], b: ['CFS-MAR-R1-01'], want: [100, 0, 0] },
  { label: 'Wraith vs Brigantine', a: ['CWN-WRA-R5-03'], b: ['CFS-BRI-S02'], want: [100, 0, 0] },
  { label: 'Witchlight vs Swift', a: ['CFS-WIT-R2-02'], b: ['CFS-SWI-S01'], want: [100, 0, 0] },
  { label: 'Witchlight vs Interceptor I', a: ['CFS-WIT-R2-02'], b: ['CWN-INT-S02'], want: [63, 7, 30] },
  { label: 'Fenrunner vs Witchlight', a: ['CWN-FEN-R1-02'], b: ['CFS-WIT-R2-02'], want: [67, 5, 28] },
  { label: 'Fenrunner vs Marauder', a: ['CWN-FEN-R1-02'], b: ['CFS-MAR-R1-01'], want: [0, 79, 21] },
  { label: 'Fenrunner vs Swift', a: ['CWN-FEN-R1-02'], b: ['CFS-SWI-S01'], want: [100, 0, 0] },
  { label: 'Fenrunner vs Interceptor I', a: ['CWN-FEN-R1-02'], b: ['CWN-INT-S02'], want: [88, 1, 11] },
  { label: 'Fenrunner vs Brigantine', a: ['CWN-FEN-R1-02'], b: ['CFS-BRI-S02'], want: [86, 1, 13] },
];

console.log(`${TRIALS} trials per matchup, seed ${SEED0}\n`);
const pad = (s: string, n: number) => s.padEnd(n).slice(0, n);
const num = (n: number) => `${n.toFixed(1)}%`.padStart(7);
console.log(pad('Matchup', 36) + pad('  A', 8) + pad('  B', 8) + pad(' mutual', 8) + pad('  sheet A/B/mut', 22) + '  ex');
let worst = 0;
for (const c of CASES) {
  const r = run(() => fleet(...c.a), () => fleet(...c.b));
  const gap = Math.max(Math.abs(r.a - c.want[0]), Math.abs(r.b - c.want[1]), Math.abs(r.mutual - c.want[2]));
  worst = Math.max(worst, gap);
  console.log(
    pad(c.label, 36) + num(r.a) + num(r.b) + num(r.mutual) +
    pad(`   ${c.want[0]}/${c.want[1]}/${c.want[2]}`, 22) +
    `  ${r.ex.toFixed(1)}` + (gap > 5 ? `   <-- off by ${gap.toFixed(1)}pp` : ''),
  );
}
console.log(`\nworst gap against the sheet: ${worst.toFixed(1)} percentage points`);

/*
 * Pacing, against v3 section 11: *"mirrors average ~8 internal rounds; capital
 * duels 7-10 rounds; evenly matched battles resolve in a handful of
 * player-visible Exchanges."* That supersedes the older sheet's "1-3
 * Exchanges" line, which was the standard the v2 import was measured against.
 */
const MIRRORS = ['CWN-MAJ-R8-01', 'CWN-SOV-R7-02', 'CWN-VAN-R4-02', 'CFS-TEM-R3-01', 'CFS-MAR-R1-01', 'CFS-COR-R8-01'];
console.log('\nmirror duels — the master wants ~8 internal rounds and a handful of Exchanges');
let exSum = 0;
let roundSum = 0;
for (const id of MIRRORS) {
  const r = run(() => fleet(id), () => fleet(id));
  exSum += r.ex;
  roundSum += r.rounds;
  console.log(
    `  ${pad(ROSTER.byId.get(id)!.name, 26)} ${r.rounds.toFixed(1)} rounds   ` +
    `${r.ex.toFixed(2)} exchanges   mutual ${r.mutual.toFixed(0)}%`,
  );
}
console.log(`  mean ${(roundSum / MIRRORS.length).toFixed(1)} internal rounds, ${(exSum / MIRRORS.length).toFixed(2)} Exchanges`);

/*
 * And the Stern Rake, whose costs v4.2 publishes **with the pursuits**.
 *
 * v3 named the costs and not the scenarios, so on 20 September they were
 * searched for: which hulls were running, and above all which were chasing,
 * since retreat damage is close to linear in the pursuer's Long Gun count.
 * Four plausible pursuits were found that hit the four published figures, and
 * the note here said plainly that hitting them was evidence the engine
 * matched the sim, not proof those were the pursuits.
 *
 * v4.2 settles it. It re-ran the Stern Rake against v4 hulls and printed the
 * fleets: *"mid-game mixed fleet (Reefwarden/Tempest/Marauder/Witchlight
 * fleeing Justiciar+Bulwark) ~25% of fleet hull; late slow fleet
 * (Goliath+Ironback fleeing Majestic+Sovereign II) ~21%; a lone fleeing
 * Majestic ~27%; a lone Witchlight ~34% of her small hull, escaping after
 * volley 1; a lone Marauder fleeing pursuit corvettes ~63%."*
 *
 * So the guesses are gone and these are the sheet's own scenarios, which makes
 * this a real check rather than a search. Two of them also settle an argument
 * the old note had with itself: the lone Majestic is ~27% here, which is what
 * the *earlier* two-pursuer guess produced before it was "corrected" to 41% by
 * adding a third. The 41% was the wrong target all along — v3's figure came
 * off v3 hulls, and the hulls changed.
 */
function rakeCost(fleeIds: string[], chaseIds: string[]): number {
  let lost = 0;
  let started = 0;
  for (let t = 0; t < TRIALS; t++) {
    const f = fleet(...fleeIds);
    const before = totalHull(f);
    resolveFlee(f, fleet(...chaseIds), createRng(SEED0 + t * 7919));
    started += before;
    lost += before - totalHull(f);
  }
  return (lost / started) * 100;
}

console.log('\nStern Rake — share of fleeing hull lost (v4.2 publishes the pursuits)');
const RAKES: Array<[string, string[], string[], number]> = [
  // Early: the openers have no Long Guns between them, so nothing reaches.
  ['early game (no Long Guns yet)', ['CFS-BRI-S02', 'CFS-CHI-S03'], ['CWN-WAY-S01', 'CWN-MOR-S03'], 0],
  [
    'mid-game mixed fleet',
    ['CFS-REE-R4-01', 'CFS-TEM-R3-01', 'CFS-MAR-R1-01', 'CFS-WIT-R2-02'],
    ['CWN-JUS-R6-01', 'CWN-BUL-R3-01'],
    25,
  ],
  [
    'late slow fleet',
    ['CFS-URG-R7-01', 'CFS-IRB-R5-01'],
    ['CWN-MAJ-R8-01', 'CWN-SOV-R7-02'],
    21,
  ],
  ['a lone fleeing Majestic', ['CWN-MAJ-R8-01'], ['CFS-COR-R8-01', 'CFS-URG-R7-01'], 27],
  // The last two share a pursuit, and that is the argument for it. v4.2 names
  // the chasers only once, in the Marauder's clause — "a lone Marauder fleeing
  // pursuit corvettes ~63%" — and the Witchlight sits in the same sentence
  // with no pursuit of her own. Three Interceptor IIs, the Crown's pursuit
  // corvette, put the Marauder on 63.0 against ~63 and the Witchlight on 33.7
  // against ~34. One squadron, two figures, both landed: better evidence than
  // two separately-fitted pursuits would have been.
  ['a lone Witchlight', ['CFS-WIT-R2-02'], ['CWN-INT-R5-02', 'CWN-INT-R5-02', 'CWN-INT-R5-02'], 34],
  [
    'a lone Marauder, chased by corvettes',
    ['CFS-MAR-R1-01'],
    ['CWN-INT-R5-02', 'CWN-INT-R5-02', 'CWN-INT-R5-02'],
    63,
  ],
];
for (const [label, flee, chase, want] of RAKES) {
  const got = rakeCost(flee, chase);
  const exact = want === 0;
  const flag = exact && Math.abs(got - want) > 0.01 ? '   <-- must be exact' : '';
  console.log(`  ${pad(label, 32)} ${got.toFixed(1)}%   sheet ~${want}%${flag}`);
}
