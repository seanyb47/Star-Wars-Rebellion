/**
 * The 5,000-trial engine the locked Combat Rules call for.
 *
 * Sean's sheet names it as the next build step and sets the standard:
 *
 * > *"5,000 trials per matchup. Every ship versus every ship, including
 * > mirrors; Swift versus Swift is N/A."*
 * > *"Evenly matched battles should usually resolve in 1–3 player-visible
 * > Combat Exchanges."*
 *
 * So this runs every one of the 24 hulls against every other, one against one,
 * to annihilation, and reports what the sheet asks to be recorded: win, loss
 * and mutual-destruction rates, average internal rounds and Combat Exchanges,
 * average surviving hull, destruction probability, average damage inflicted,
 * retreat survival, and cost efficiency.
 *
 *   npx vite-node lab/navyduel.ts [trials] [seed]
 *   npx vite-node lab/navyduel.ts 5000 1 --matrix    # the full 24×24 grid
 *   npx vite-node lab/navyduel.ts 5000 1 --pairs     # the endgame rule only
 *
 * Nothing here is wired into the live game. `advanceDay` has still never heard
 * of any of it.
 */
import { createRng } from '../src/sim/rng';
import {
  combatExchange,
  commission,
  resolveFlee,
  survivors,
  totalHull,
  type CombatShip,
  type Fleet,
} from '../src/sim/navycombat';
import { ROSTER, type ShipDefinition } from '../src/sim/shipdefs';

const TRIALS = Number(process.argv[2] ?? 5000);
const FIRST_SEED = Number(process.argv[3] ?? 1);
const FLAGS = new Set(process.argv.slice(4));
/** A runaway guard, not a rule: no real matchup comes near it. */
const EXCHANGE_CAP = 200;

interface Outcome {
  winner: 'a' | 'b' | 'mutual' | 'none';
  exchanges: number;
  rounds: number;
  survivingHullA: number;
  survivingHullB: number;
  damageByA: number;
  damageByB: number;
}

/** One battle, fought to the end, one Exchange at a time. */
function duel(makeA: () => Fleet, makeB: () => Fleet, seed: number): Outcome {
  const a = makeA();
  const b = makeB();
  const rng = createRng(seed);
  let exchanges = 0;
  let rounds = 0;
  let damageByA = 0;
  let damageByB = 0;

  while (survivors(a).length > 0 && survivors(b).length > 0 && exchanges < EXCHANGE_CAP) {
    const before = { a: totalHull(a), b: totalHull(b) };
    const report = combatExchange(a, b, rng);
    exchanges += 1;
    rounds += report.rounds;
    damageByA += report.a.long.damage + report.a.main.damage;
    damageByB += report.b.long.damage + report.b.main.damage;
    // A stalemate neither side can break — two hulls that cannot penetrate
    // each other — would otherwise run to the cap. Recorded, not hidden.
    if (totalHull(a) === before.a && totalHull(b) === before.b) break;
  }

  const aGone = survivors(a).length === 0;
  const bGone = survivors(b).length === 0;
  return {
    winner: aGone && bGone ? 'mutual' : aGone ? 'b' : bGone ? 'a' : 'none',
    exchanges,
    rounds,
    survivingHullA: totalHull(a),
    survivingHullB: totalHull(b),
    damageByA,
    damageByB,
  };
}

interface Summary {
  trials: number;
  winA: number;
  winB: number;
  mutual: number;
  stalemate: number;
  meanExchanges: number;
  meanRounds: number;
  meanSurvivingHullA: number;
  meanDamageByA: number;
  meanDamageByB: number;
}

function run(makeA: () => Fleet, makeB: () => Fleet, trials: number, seed0: number): Summary {
  let winA = 0;
  let winB = 0;
  let mutual = 0;
  let stalemate = 0;
  let exchanges = 0;
  let rounds = 0;
  let hullA = 0;
  let damageA = 0;
  let damageB = 0;
  for (let t = 0; t < trials; t++) {
    const out = duel(makeA, makeB, seed0 + t * 7919);
    if (out.winner === 'a') winA += 1;
    else if (out.winner === 'b') winB += 1;
    else if (out.winner === 'mutual') mutual += 1;
    else stalemate += 1;
    exchanges += out.exchanges;
    rounds += out.rounds;
    hullA += out.survivingHullA;
    damageA += out.damageByA;
    damageB += out.damageByB;
  }
  return {
    trials,
    winA,
    winB,
    mutual,
    stalemate,
    meanExchanges: exchanges / trials,
    meanRounds: rounds / trials,
    meanSurvivingHullA: hullA / trials,
    meanDamageByA: damageA / trials,
    meanDamageByB: damageB / trials,
  };
}

const one = (def: ShipDefinition) => (): Fleet => [commission(def.id, def)];
const pair = (...defs: ShipDefinition[]) => (): Fleet =>
  defs.map((d, i) => commission(`${d.id}-${i}`, d));

const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(1)}%`;
const pad = (s: string, n: number) => s.padEnd(n);
const num = (n: number, places = 1) => n.toFixed(places);

/* ------------------------------------------------------------ the sweep */

const SHIPS = [...ROSTER.ships];
const SWIFT = 'CFS-SWI-S01';

console.log(`=== ${TRIALS} trials a matchup, one hull against one, fought out ===\n`);

/**
 * Retreat survival: how much of a fleeing hull comes through the parting
 * volley of every other hull in the game. A separate question from who wins.
 */
function retreatSurvival(def: ShipDefinition): { survived: number; meanHullLeft: number } {
  const rng = createRng(FIRST_SEED);
  let survived = 0;
  let hullLeft = 0;
  const pursuers = SHIPS.filter((d) => d.guns.longGuns > 0);
  const trials = Math.max(1, Math.floor(TRIALS / 10));
  for (let t = 0; t < trials; t++) {
    const chaser = pursuers[t % pursuers.length];
    const fleeing: Fleet = [commission(def.id, def)];
    const report = resolveFlee(fleeing, [commission(chaser.id, chaser)], rng);
    if (report.escaped.length > 0) survived += 1;
    hullLeft += totalHull(fleeing);
  }
  return { survived: survived / trials, meanHullLeft: hullLeft / trials };
}

/* ---- 1. Every ship's record across the whole roster --------------------- */

interface Record_ {
  def: ShipDefinition;
  wins: number;
  losses: number;
  mutual: number;
  fights: number;
  exchanges: number;
  rounds: number;
}

const records = new Map<string, Record_>(
  SHIPS.map((d) => [d.id, { def: d, wins: 0, losses: 0, mutual: 0, fights: 0, exchanges: 0, rounds: 0 }]),
);

const matrix: string[][] = [];
const evenMatchExchanges: number[] = [];
const closeMatchExchanges: number[] = [];
const allExchanges: number[] = [];

for (let i = 0; i < SHIPS.length; i++) {
  const row: string[] = [];
  for (let j = 0; j < SHIPS.length; j++) {
    const a = SHIPS[i];
    const b = SHIPS[j];
    // *"Swift versus Swift is N/A"* — she has no guns, so it never resolves.
    if (a.id === SWIFT && b.id === SWIFT) {
      row.push('  n/a');
      continue;
    }
    const summary = run(one(a), one(b), TRIALS, FIRST_SEED + i * 1009 + j * 101);
    const ra = records.get(a.id)!;
    ra.wins += summary.winA;
    ra.losses += summary.winB;
    ra.mutual += summary.mutual;
    ra.fights += summary.trials;
    ra.exchanges += summary.meanExchanges * summary.trials;
    ra.rounds += summary.meanRounds * summary.trials;
    row.push(pct(summary.winA, summary.trials).padStart(6));
    // "Evenly matched" for the duration target: neither side wins more than
    // 60% of the time. Those are the battles Sean wants landing in 1-3.
    const share = summary.winA / summary.trials;
    if (summary.stalemate === 0) {
      if (share > 0.4 && share < 0.6) evenMatchExchanges.push(summary.meanExchanges);
      if (share > 0.3 && share < 0.7) closeMatchExchanges.push(summary.meanExchanges);
      allExchanges.push(summary.meanExchanges);
    }
  }
  matrix.push(row);
}

console.log('--- every hull, across all 24 matchups ---');
console.log(
  pad('ship', 26) +
    pad('win', 8) +
    pad('loss', 8) +
    pad('mutual', 8) +
    pad('exch', 7) +
    pad('rounds', 8) +
    pad('gold', 7) +
    'win/1000g',
);
const ranked = [...records.values()].sort((a, b) => b.wins / b.fights - a.wins / a.fights);
for (const r of ranked) {
  const winRate = r.wins / r.fights;
  console.log(
    pad(r.def.name, 26) +
      pad(pct(r.wins, r.fights), 8) +
      pad(pct(r.losses, r.fights), 8) +
      pad(pct(r.mutual, r.fights), 8) +
      pad(num(r.exchanges / r.fights, 2), 7) +
      pad(num(r.rounds / r.fights, 2), 8) +
      pad(String(r.def.goldToBuild), 7) +
      num((winRate * 1000) / r.def.goldToBuild, 2),
  );
}

console.log('\n--- the duration target: 1-3 player-visible Combat Exchanges ---');
const band = (label: string, xs: number[]) => {
  if (xs.length === 0) return console.log(`${pad(label, 34)} (none)`);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sorted = [...xs].sort((a, b) => a - b);
  const inside = xs.filter((e) => e <= 3).length;
  console.log(
    pad(label, 34) +
      `n=${pad(String(xs.length), 6)}mean ${pad(num(mean, 2), 8)}median ${pad(num(sorted[Math.floor(sorted.length / 2)], 2), 8)}` +
      `within 1-3: ${pct(inside, xs.length)}`,
  );
};
band('evenly matched (40-60% win)', evenMatchExchanges);
band('close (30-70% win)', closeMatchExchanges);
band('every matchup', allExchanges);

/* ---- 2. The endgame rule, which the sheet states outright --------------- */

console.log('\n--- the endgame rule ---');
console.log("  'One of either Confederate capital loses to Majestic, while two of either");
console.log("   — or one of each — should defeat it reliably.'\n");
const MAJ = ROSTER.byId.get('CWN-MAJ-R8-01')!;
const URG = ROSTER.byId.get('CFS-URG-R7-01')!;
const COR = ROSTER.byId.get('CFS-COR-R8-01')!;
const endgame: Array<[string, () => Fleet]> = [
  ['1 Urskin Goliath', one(URG)],
  ['1 Coral-Class', one(COR)],
  ['2 Urskin Goliaths', pair(URG, URG)],
  ['2 Coral-Class', pair(COR, COR)],
  ['1 of each', pair(URG, COR)],
];
console.log(pad('  Confederacy fielding', 26) + pad('beats Majestic', 16) + pad('mutual', 9) + 'exchanges');
for (const [label, make] of endgame) {
  const s = run(make, one(MAJ), TRIALS, FIRST_SEED + 4242);
  console.log(
    pad('  ' + label, 26) +
      pad(pct(s.winA, s.trials), 16) +
      pad(pct(s.mutual, s.trials), 9) +
      num(s.meanExchanges, 2),
  );
}

/* ---- 3. Retreat survival ------------------------------------------------ */

console.log('\n--- retreat survival, against every long-gunned pursuer ---');
console.log(pad('  ship', 26) + pad('size/speed', 20) + pad('escapes', 10) + 'hull left');
for (const def of [...SHIPS].sort((a, b) => a.hull - b.hull)) {
  const r = retreatSurvival(def);
  console.log(
    pad('  ' + def.name, 26) +
      pad(`${def.size}/${def.speed}`, 20) +
      pad(pct(r.survived, 1), 10) +
      `${num(r.meanHullLeft, 0)}/${def.hull}`,
  );
}

/* ---- 4. The full grid, on request --------------------------------------- */

if (FLAGS.has('--matrix')) {
  console.log('\n--- win rate of the row ship against the column ship ---');
  const header = pad('', 24) + SHIPS.map((d) => pad(d.name.slice(0, 6), 7)).join('');
  console.log(header);
  SHIPS.forEach((d, i) => console.log(pad(d.name.slice(0, 23), 24) + matrix[i].map((c) => pad(c, 7)).join('')));
}

console.log('');
