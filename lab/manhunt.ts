/**
 * Why the Crown does not find the Lords.
 *
 * #125: three wars in forty stall with the Crown well ahead on ground and one
 * Lord still at large. Sean's word, 21 September: *"Let me measure first, then
 * propose."* So this harness measures the manhunt rather than the war — where
 * the three of them actually stand, how often the Crown can see one, how often
 * it goes after one, and what happens when it does.
 *
 * Four things can be wrong and they want different fixes:
 *
 *   - **Cannot see them.** The Lords stand on ground the Crown never charts.
 *   - **Cannot reach them.** Charted, but the Crown never has anybody free and
 *     near enough to be sent.
 *   - **Never tries.** Liftable and passed over — a scoring problem.
 *   - **Tries and fails.** Sent and foiled, which is a rates problem.
 *
 *   npx vite-node lab/manhunt.ts <games> <first-seed>
 */
import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import { isLord } from '../src/sim/lords';
import { abductOn } from '../src/sim/missions';
import type { Character, GameState, PlayableFaction } from '../src/sim/types';

const GAMES = Number(process.argv[2] ?? 20);
const FIRST = Number(process.argv[3] ?? 9000);
const CAP = 3000;
const HUNTER: PlayableFaction = 'empire';

/** Where a Lord is standing today, in the four ways that matter to a hunter. */
type Standing = 'aboard' | 'travelling' | 'at-large' | 'taken';

function standingOf(state: GameState, lord: Character): Standing {
  if (lord.status === 'captured') return 'taken';
  if (state.fleets.some((f) => f.officerIds.includes(lord.id))) return 'aboard';
  if (lord.mission?.phase === 'travelling') return 'travelling';
  return 'at-large';
}

interface Row {
  seed: number;
  winner: PlayableFaction | 'none';
  days: number;
  crownIslands: number;
  lordsTaken: number;
  /** Share of days at least one Lord was liftable by the Crown. */
  visible: number;
  /** Share of days the Crown had an abduction running at all. */
  hunting: number;
  /** Days at least one Lord was liftable and the Crown had nobody after one. */
  passedOver: number;
  /** Abductions the Crown sent at a Lord, and how they ended. */
  sent: number;
  took: number;
  /** Share of the world the Crown has charted at the end. */
  charted: number;
  /** Where the three of them spend their days, as shares. */
  where: Record<Standing, number>;
  /** Share of days each Lord's island was charted by the Crown. */
  lordIslandCharted: number;
  /** The most Lords the Crown ever held at one time. */
  bestHeld: number;
  /** Days it held two of the three — one rescue away from the war. */
  daysAtTwo: number;
  /** Lords freed out of the Crown's cells. */
  rescued: number;
  /** Mean days a Lord spent in irons per spell. */
  ironDays: number;
}

function play(seed: number): Row {
  let state = generateGalaxy(seed, HUNTER);
  state.observing = true;

  let days = 0;
  let visible = 0;
  let hunting = 0;
  let passedOver = 0;
  let sent = 0;
  let took = 0;
  let lordIslandCharted = 0;
  let lordDays = 0;
  const where: Record<Standing, number> = { aboard: 0, travelling: 0, 'at-large': 0, taken: 0 };
  // An abduction is counted once, when it is launched: a mission object that
  // was not there yesterday and is there today.
  let running = new Set<string>();
  let takenBefore = 0;
  let bestHeld = 0;
  let daysAtTwo = 0;
  let rescued = 0;
  let ironDays = 0;
  let spells = 0;
  const inIrons = new Set<string>();

  for (let d = 0; d < CAP && !state.winner; d++) {
    state = advanceDay(state);
    days += 1;

    const lords = state.characters.filter(isLord);
    for (const lord of lords) {
      const at = standingOf(state, lord);
      where[at] += 1;
      lordDays += 1;
      const island = state.systems.find((s) => s.id === lord.locationSystemId);
      if (island?.explored[HUNTER]) lordIslandCharted += 1;
    }

    const liftable = state.systems.some((s) => {
      const mark = abductOn(state, s, HUNTER);
      return mark !== undefined && isLord(mark);
    });
    if (liftable) visible += 1;

    const hunts = state.characters.filter(
      (c) => c.faction === HUNTER && c.mission?.type === 'abduct',
    );
    if (hunts.length > 0) hunting += 1;
    if (liftable && hunts.length === 0) passedOver += 1;

    // Launches: an abduction on somebody's books today that was not yesterday.
    const now = new Set(hunts.map((c) => c.id));
    for (const id of now) if (!running.has(id)) sent += 1;
    running = now;

    const takenNow = lords.filter((l) => l.status === 'captured').length;
    if (takenNow > takenBefore) took += takenNow - takenBefore;
    takenBefore = takenNow;
    if (takenNow > bestHeld) bestHeld = takenNow;
    if (takenNow === 2) daysAtTwo += 1;
    // How long a spell in irons runs, and how it ends. The Crown's whole
    // victory is three at once, so a Lord going back out of the cells is the
    // event that undoes it.
    for (const lord of lords) {
      if (lord.status === 'captured') {
        inIrons.add(lord.id);
        ironDays += 1;
      } else if (inIrons.has(lord.id)) {
        inIrons.delete(lord.id);
        rescued += 1;
        spells += 1;
      }
    }
  }

  const share = (n: number) => (days === 0 ? 0 : n / days);
  return {
    seed,
    winner: state.winner ?? 'none',
    days: state.day,
    crownIslands: state.systems.filter((s) => s.control === 'empire').length,
    lordsTaken: state.characters.filter((c) => isLord(c) && c.status === 'captured').length,
    visible: share(visible),
    hunting: share(hunting),
    passedOver: share(passedOver),
    sent,
    took,
    charted: state.systems.filter((s) => s.explored[HUNTER]).length / state.systems.length,
    where: {
      aboard: where.aboard / Math.max(1, lordDays),
      travelling: where.travelling / Math.max(1, lordDays),
      'at-large': where['at-large'] / Math.max(1, lordDays),
      taken: where.taken / Math.max(1, lordDays),
    },
    lordIslandCharted: lordIslandCharted / Math.max(1, lordDays),
    bestHeld,
    daysAtTwo,
    rescued,
    ironDays: ironDays / Math.max(1, spells + inIrons.size),
  };
}

const rows: Row[] = [];
for (let i = 0; i < GAMES; i++) {
  const row = play(FIRST + i);
  rows.push(row);
  console.log(
    `seed ${row.seed}\t${row.winner}\t${row.days}d\tCrown ${row.crownIslands}\tLords ${row.lordsTaken}/3\t` +
      `visible ${(row.visible * 100).toFixed(0)}%\thunting ${(row.hunting * 100).toFixed(0)}%\t` +
      `passed ${(row.passedOver * 100).toFixed(0)}%\tsent ${row.sent}\ttook ${row.took}\t` +
      `charted ${(row.charted * 100).toFixed(0)}%\tbest ${row.bestHeld}/3\t2-of-3 ${row.daysAtTwo}d\tfreed ${row.rescued}\tirons ${row.ironDays.toFixed(0)}d`,
  );
}

const mean = (pick: (r: Row) => number) => rows.reduce((n, r) => n + pick(r), 0) / rows.length;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

const stalled = rows.filter((r) => r.winner === 'none');
const crown = rows.filter((r) => r.winner === 'empire');

console.log('\n--- the manhunt, %d wars ---', rows.length);
console.log('Crown %d, Confederacy %d, stalled %d', crown.length, rows.filter((r) => r.winner === 'alliance').length, stalled.length);
console.log('Lords taken per war      %s', mean((r) => r.lordsTaken).toFixed(2));
console.log('abductions sent at all   %s', mean((r) => r.sent).toFixed(1));
console.log('a Lord liftable          %s of days', pct(mean((r) => r.visible)));
console.log('a hunt running           %s of days', pct(mean((r) => r.hunting)));
console.log('liftable and nobody sent %s of days', pct(mean((r) => r.passedOver)));
console.log('world charted by Crown   %s', pct(mean((r) => r.charted)));
console.log("Lord's island charted    %s of Lord-days", pct(mean((r) => r.lordIslandCharted)));
console.log('most held at once        %s of 3', mean((r) => r.bestHeld).toFixed(2));
console.log('days holding two of three %s', mean((r) => r.daysAtTwo).toFixed(0));
console.log('freed out of the cells   %s a war', mean((r) => r.rescued).toFixed(1));
console.log('a spell in irons         %s days', mean((r) => r.ironDays).toFixed(0));
console.log(
  'where a Lord stands      at large %s, aboard %s, travelling %s, taken %s',
  pct(mean((r) => r.where['at-large'])),
  pct(mean((r) => r.where.aboard)),
  pct(mean((r) => r.where.travelling)),
  pct(mean((r) => r.where.taken)),
);

if (stalled.length > 0) {
  console.log('\n--- the stalled wars only ---');
  const sMean = (pick: (r: Row) => number) =>
    stalled.reduce((n, r) => n + pick(r), 0) / stalled.length;
  console.log('seeds                    %s', stalled.map((r) => r.seed).join(', '));
  console.log('Crown islands            %s', sMean((r) => r.crownIslands).toFixed(1));
  console.log('Lords taken              %s', sMean((r) => r.lordsTaken).toFixed(2));
  console.log('a Lord liftable          %s of days', pct(sMean((r) => r.visible)));
  console.log('liftable and nobody sent %s of days', pct(sMean((r) => r.passedOver)));
  console.log('abductions sent          %s', sMean((r) => r.sent).toFixed(1));
  console.log("Lord's island charted    %s of Lord-days", pct(sMean((r) => r.lordIslandCharted)));
  console.log(
    'where a Lord stands      at large %s, aboard %s, travelling %s, taken %s',
    pct(sMean((r) => r.where['at-large'])),
    pct(sMean((r) => r.where.aboard)),
    pct(sMean((r) => r.where.travelling)),
    pct(sMean((r) => r.where.taken)),
  );
}
