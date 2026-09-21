/**
 * When does each rung of shipwright craft actually arrive?
 *
 * Sean's ruling of 21 September, and the first hard target the ladder has ever
 * had: *"assuming that you use research capable units from day 1 to research...
 * then late game units like magestic should be coming available around 80% of
 * the average length of a game in days."*
 *
 * So this harness answers two questions the eight invented thresholds in
 * `CRAFT_GRADES` have never been asked. First, how long a war is. Second, the
 * day each side first crosses each rung — and in particular rung 8, which has
 * to land near four fifths of the way through.
 *
 *   npx vite-node lab/ladder.ts <games> <first-seed>
 *
 * It plays the same wars `duel.ts` does, with both sides machine-played, and
 * watches `craftGrade` every morning rather than only at the end. A rung that
 * is never reached is recorded as never reached rather than quietly dropped,
 * because "the Majestic arrives on day 800" and "the Majestic arrives in one
 * war in nine, on day 800" are different answers to Sean's question.
 */
import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import { craftGrade, isResearchTarget } from '../src/sim/missions';
import { CRAFT_GRADES } from '../src/sim/constants';
import type { GameState, PlayableFaction } from '../src/sim/types';

const GAMES = Number(process.argv[2] ?? 16);
const FIRST = Number(process.argv[3] ?? 2000);
const CAP = 3000;
const RUNGS = CRAFT_GRADES.length;

interface Row {
  seed: number;
  days: number;
  finished: boolean;
  /** Day each rung was first crossed, per side; undefined if never. */
  reached: Record<PlayableFaction, Array<number | undefined>>;
  progress: Record<PlayableFaction, number>;
  /** Share of days with at least one officer actually in the yards. */
  atYards: Record<PlayableFaction, number>;
  /** Share of days the side HAD an island it could research at. */
  couldResearch: Record<PlayableFaction, number>;
}

function play(seed: number): Row {
  let state: GameState = generateGalaxy(seed, 'empire');
  state.observing = true;
  const reached: Row['reached'] = {
    empire: new Array(RUNGS).fill(undefined),
    alliance: new Array(RUNGS).fill(undefined),
  };
  const working = { empire: 0, alliance: 0 };
  const possible = { empire: 0, alliance: 0 };
  for (let d = 0; d < CAP && !state.winner; d++) {
    state = advanceDay(state);
    for (const f of ['empire', 'alliance'] as const) {
      const grade = craftGrade(state.factions[f].craft);
      for (let r = 0; r < grade; r++) if (reached[f][r] === undefined) reached[f][r] = state.day;
      if (state.characters.some((c) => c.faction === f && c.mission?.type === 'research'))
        working[f] += 1;
      if (state.systems.some((sys) => sys.control === f && isResearchTarget(state, sys, f)))
        possible[f] += 1;
    }
  }
  return {
    seed,
    days: state.day,
    finished: Boolean(state.winner),
    reached,
    progress: {
      empire: Math.round(state.factions.empire.craft),
      alliance: Math.round(state.factions.alliance.craft),
    },
    atYards: {
      empire: working.empire / Math.max(1, state.day),
      alliance: working.alliance / Math.max(1, state.day),
    },
    couldResearch: {
      empire: possible.empire / Math.max(1, state.day),
      alliance: possible.alliance / Math.max(1, state.day),
    },
  };
}

const rows: Row[] = [];
for (let i = 0; i < GAMES; i++) rows.push(play(FIRST + i));

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

const lengths = rows.filter((r) => r.finished).map((r) => r.days);
const meanLength = mean(lengths);
const target = meanLength * 0.8;

console.log(`\n=== ${GAMES} wars, seeds ${FIRST}-${FIRST + GAMES - 1} ===`);
console.log(
  `war length: mean ${Math.round(meanLength)}  median ${median(lengths)}  ` +
    `(${rows.length - lengths.length} unfinished)`,
);
console.log(`Sean's target for rung ${RUNGS}: day ${Math.round(target)} (80% of mean)\n`);
console.log(`rung  threshold  reached by      mean day   median day   vs target`);

for (let r = 0; r < RUNGS; r++) {
  const days: number[] = [];
  let sides = 0;
  for (const row of rows) {
    for (const f of ['empire', 'alliance'] as const) {
      sides += 1;
      const day = row.reached[f][r];
      if (day !== undefined) days.push(day);
    }
  }
  const share = sides ? (days.length / sides) * 100 : 0;
  const m = days.length ? Math.round(mean(days)) : undefined;
  // Only the top rung has a stated target; the rest are printed against the
  // even spacing that target implies, so the shape of the climb is visible.
  const want = Math.round((target * (r + 1)) / RUNGS);
  const delta = m === undefined ? '—' : `${m - want > 0 ? '+' : ''}${m - want}`;
  console.log(
    `  ${String(r + 1).padEnd(3)} ${String(CRAFT_GRADES[r]).padStart(8)}  ` +
      `${share.toFixed(0).padStart(3)}% of sides  ` +
      `${(m === undefined ? '—' : String(m)).padStart(8)}  ` +
      `${(days.length ? String(median(days)) : '—').padStart(10)}  ` +
      `${String(want).padStart(6)} ${delta.padStart(6)}`,
  );
}

for (const f of ['empire', 'alliance'] as const) {
  console.log(
    `\n${f} craft progress at the end: mean ${Math.round(mean(rows.map((x) => x.progress[f])))}` +
      ` of ${CRAFT_GRADES[RUNGS - 1]}` +
      `, somebody in the yards ${(mean(rows.map((x) => x.atYards[f])) * 100).toFixed(0)}% of days` +
      `, a yard to work at on ${(mean(rows.map((x) => x.couldResearch[f])) * 100).toFixed(0)}%`,
  );
}
