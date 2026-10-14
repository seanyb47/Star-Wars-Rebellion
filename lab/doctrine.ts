/**
 * What each article of doctrine is actually worth.
 *
 * `src/data/doctrine.json` says what the opponent knows and `src/sim/doctrine.ts`
 * lets a game switch one article off. So every claim in that file is testable:
 * play N wars with the whole book, then N more with exactly one article
 * withheld, and the difference is what the article buys. What comes back is
 * written into the file as `measured`, which is the "updates as it learns" half
 * of the ask — the prose stays the prose, and the numbers under it are always
 * from the last time somebody ran this.
 *
 *   npx vite-node lab/doctrine.ts [games-per-arm] [first-seed] [--write]
 *
 * Without `--write` it only reports. It also checks the file against the code:
 * an article the code never asks about is a claim nothing is enforcing, and a
 * `follows()` call with no article behind it is a gate that can never close.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { playGame, type Run } from './play';
import { ARTICLES, TIERS, articlesFor, type Tier } from '../src/sim/doctrine';
import type { PlayableFaction } from '../src/sim/types';

const N = Number(process.argv[2] ?? 12);
const BASE = Number(process.argv[3] ?? 7000);
const WRITE = process.argv.includes('--write');

const FILE = new URL('../src/data/doctrine.json', import.meta.url).pathname;
const AI_SRC = new URL('../src/sim/ai.ts', import.meta.url).pathname;

/** Which articles the code actually asks about, read out of the code itself. */
function gatesInCode(): Set<string> {
  const src = readFileSync(AI_SRC, 'utf8');
  return new Set([...src.matchAll(/follows\(state, '([^']+)'\)/g)].map((m) => m[1]));
}

interface Arm {
  runs: Run[];
  wins: Record<'empire' | 'alliance' | 'none', number>;
  /**
   * The only figure that reads as difficulty. Crown-against-Confederacy is a
   * balance question and the seat alternates game by game, so a tier that beat
   * the board 8–8 could be a monster on one side and hopeless on the other.
   * This is how often the opponent won its own war.
   */
  aiWins: number;
  medianDays: number;
  gold: number;
  islands: number;
  hulls: number;
  dark: number;
  colonies: number;
  bombard: number;
  posted: number;
  research: number;
  sieges: number;
  abductions: number;
  /** The siege figures, over the wars the opponent held the Confederacy in —
   *  Highwater is the only walled island either side has to take. */
  confBombard: number;
  confSiegeDays: number;
  confWars: number;
  confWins: number;
  mix: string;
}

function play(without: string[], tier: Tier = 'ruthless'): Arm {
  const runs: Run[] = [];
  for (let i = 0; i < N; i++) {
    const player: PlayableFaction = i % 2 === 0 ? 'empire' : 'alliance';
    runs.push(
      playGame(BASE + i, player, {
        // Auditing every day of every arm triples the cost of a sweep that
        // already plays thousands of wars; the campaign report is where
        // invariants are checked, and this is where behaviour is.
        auditEvery: 25,
        doctrine: { tier, without },
      }),
    );
  }
  const wins = { empire: 0, alliance: 0, none: 0 };
  for (const r of runs) wins[r.winner ?? 'none']++;
  const aiWins = runs.filter((r) => r.winner === r.ai).length;
  const lens = runs.filter((r) => r.winner).map((r) => r.days).sort((a, b) => a - b);
  const avg = (f: (r: Run) => number) => runs.reduce((n, r) => n + f(r), 0) / runs.length;
  const sum = (k: string) => runs.reduce((n, r) => n + (r.counts[k] ?? 0), 0);
  const mixOf = (role: 'small' | 'medium' | 'large' | 'transport') =>
    avg((r) => r.hullMixEnd[role]).toFixed(1);
  return {
    runs,
    wins,
    aiWins,
    medianDays: lens.length ? lens[Math.floor(lens.length / 2)] : 0,
    gold: avg((r) => r.goldEnd[r.ai]),
    islands: avg((r) => r.islandsEnd[r.ai]),
    hulls: avg((r) => r.hullsPeak[r.ai]),
    dark: avg((r) => r.darkEnd),
    colonies: avg((r) => r.coloniesEnd),
    bombard: avg((r) => r.bombardEnd),
    posted: sum('lord-posted-moot') + sum('lord-posted-line'),
    research: sum('text-research'),
    sieges: sum('siege-days'),
    abductions: sum('text-lifted'),
    mix: `${mixOf('small')}/${mixOf('medium')}/${mixOf('large')}/${mixOf('transport')}`,
    ...(() => {
      const conf = runs.filter((r) => r.ai === 'alliance');
      const mean = (f: (r: Run) => number) =>
        conf.length ? conf.reduce((n, r) => n + f(r), 0) / conf.length : 0;
      return {
        confBombard: mean((r) => r.bombardEnd),
        confSiegeDays: mean((r) => r.counts['siege-days'] ?? 0),
        confWars: conf.length,
        confWins: conf.filter((r) => r.winner === 'alliance').length,
      };
    })(),
  };
}

/**
 * The sentence written back into the file for one article.
 *
 * Each article gets the two or three figures its own claim is about, because a
 * blanket win-rate says nothing useful about, say, research: a side that never
 * puts an officer in its own yards still wins wars, it just wins them with the
 * ships it started the war knowing how to build.
 */
const PROBE: Record<string, (on: Arm, off: Arm) => string> = {
  'spend-the-bank': (on, off) =>
    `holding ${on.gold.toFixed(0)} gold and ${on.hulls.toFixed(1)} hulls at the end, against ` +
    `${off.gold.toFixed(0)} gold and ${off.hulls.toFixed(1)} hulls when savings do not count toward what it can afford`,
  'expand-when-the-bill-grows': (on, off) =>
    `${on.colonies.toFixed(1)} colonies a war with the frontier priced against the ledger, ` +
    `${off.colonies.toFixed(1)} when it is priced the same however tight things are`,
  'balanced-fleet': (on, off) =>
    `ends with ${on.mix} sloops/frigates/first-rates/transports, against ${off.mix} buying the heaviest hull it can pay for`,
  'weight-before-berths': (on, off) =>
    `over the ${on.confWars} wars it held the Confederacy, its heaviest broadside against a wall was ` +
    `${on.confBombard.toFixed(0)} at the end, against ${off.confBombard.toFixed(0)} when berths are read first`,
  'commit-to-the-siege': (on, off) =>
    `holding the Confederacy it spends ${on.confSiegeDays.toFixed(0)} days a war with its guns on the walls and takes ` +
    `${on.confWins} of ${on.confWars} of those wars; dabbling instead, ${off.confSiegeDays.toFixed(0)} days and ${off.confWins} of ${off.confWars}`,
  'seat-your-principals': (on, off) =>
    `${(on.posted / N).toFixed(0)} island-days with a principal in a chair, ${(off.posted / N).toFixed(0)} without the article`,
  'hunt-the-principals': (on, off) =>
    `${(on.abductions / N).toFixed(1)} people lifted off a quay a war and ${on.aiWins} of ${N} wars won; ` +
    `${(off.abductions / N).toFixed(1)} and ${off.aiWins} of ${N} when their quays are left alone`,
  'research-your-own-yards': (on, off) =>
    `${(on.research / N).toFixed(1)} mentions of craft a war, ${(off.research / N).toFixed(1)} without it`,
};

function line(label: string, a: Arm): string {
  return (
    `${label.padEnd(30)} AI won ${String(a.aiWins).padStart(2)}/${N}` +
    `  C${String(a.wins.empire).padStart(2)}/F${String(a.wins.alliance).padStart(2)}` +
    `/–${String(a.wins.none).padStart(2)}  d${String(a.medianDays).padStart(4)}` +
    `  isles ${a.islands.toFixed(1).padStart(5)}  gold ${a.gold.toFixed(0).padStart(6)}` +
    `  hulls ${a.hulls.toFixed(1).padStart(5)}  dark ${a.dark.toFixed(1).padStart(4)}` +
    `  col ${a.colonies.toFixed(1).padStart(4)}  bomb ${a.bombard.toFixed(0).padStart(4)}`
  );
}

// ---- The file against the code
const gates = gatesInCode();
const ids = new Set(ARTICLES.map((a) => a.id));
const orphanGates = [...gates].filter((g) => !ids.has(g));
const unenforced = ARTICLES.filter((a) => !gates.has(a.id)).map((a) => a.id);
console.log(`${ARTICLES.length} articles, ${gates.size} of them switchable in the opponent's code.`);
if (orphanGates.length) console.log(`  !! code asks about articles the file does not have: ${orphanGates.join(', ')}`);
if (unenforced.length) console.log(`  (not switchable, so not measured here: ${unenforced.join(', ')})`);

// ---- The sweep
console.log(`\n${N} wars an arm, seeds ${BASE}–${BASE + N - 1}, seats alternating.\n`);
const baseline = play([]);
console.log(line('the whole book', baseline));

// ---- The difficulties
//
// The point of the tiers: a plain opponent should be a sparring partner and a
// ruthless one should be work. Reported rather than written back, because it is
// a fact about the three tiers rather than about any one article.
console.log('\n--- THE THREE DIFFICULTIES ---');
const byTier: Record<string, Arm> = { ruthless: baseline };
for (const tier of TIERS) {
  const arm = tier === 'ruthless' ? baseline : play([], tier);
  byTier[tier] = arm;
  console.log(line(`${tier} (${articlesFor(tier).length} articles)`, arm));
}

const measured: Record<string, string> = {};
for (const id of ARTICLES.map((a) => a.id).filter((id) => gates.has(id))) {
  const off = play([id]);
  console.log(line(`without ${id}`, off));
  const probe = PROBE[id];
  measured[id] = probe
    ? `Measured over ${N} wars an arm: ${probe(baseline, off)}. ` +
      `The opponent won ${baseline.aiWins} of ${N} with the article and ${off.aiWins} without it.`
    : `Measured over ${N} wars an arm: the opponent won ${baseline.aiWins} of ${N} with the article, ` +
      `${off.aiWins} without it.`;
}

console.log('\n--- WHAT EACH ARTICLE IS WORTH ---');
for (const [id, text] of Object.entries(measured)) console.log(`  ${id}\n    ${text}`);

if (!WRITE) {
  console.log('\n(reporting only — pass --write to put these back into src/data/doctrine.json)');
} else {
  const file = JSON.parse(readFileSync(FILE, 'utf8'));
  file.measuredOn = new Date().toISOString().slice(0, 10);
  for (const a of file.articles) if (measured[a.id]) a.measured = measured[a.id];
  writeFileSync(FILE, JSON.stringify(file, null, 2) + '\n');
  console.log(`\nwritten into ${FILE}`);
}
