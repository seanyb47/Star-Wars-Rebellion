/**
 * Why a Recruiter stops being offered the mission.
 *
 * Sean, day 40, the Imperator standing on Highwater: *"Why can't imperator
 * recruit anymore by day 40?"* He is a Recruiter and Highwater is the Crown's
 * own capital, so one of `canRecruitAt`'s five conditions is failing. This
 * asks which, every day, for both sides' capitals.
 *
 *   npx vite-node lab/recruitgate.ts <games> <first-seed> <days>
 */
import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import { recruitPool } from '../src/sim/missions';
import { RECRUIT_MIN_SUPPORT } from '../src/sim/constants';
import type { GameState, PlayableFaction } from '../src/sim/types';

const GAMES = Number(process.argv[2] ?? 6);
const FIRST = Number(process.argv[3] ?? 9000);
const DAYS = Number(process.argv[4] ?? 200);

/** Which condition is shutting the mission off, in order of the check. */
function why(state: GameState, faction: PlayableFaction): string {
  const hq = state.systems.find((s) => s.id === state.factions[faction].hqSystemId);
  if (!hq) return 'no capital';
  if (hq.control !== faction) return 'capital lost';
  if (!hq.populated) return 'unsettled';
  if (hq.uprising) return 'in revolt';
  if (hq.support[faction] < RECRUIT_MIN_SUPPORT) return `support ${hq.support[faction].toFixed(1)}`;
  if (recruitPool(state, faction).length === 0) return 'pool empty';
  return 'open';
}

for (const faction of ['empire', 'alliance'] as const) {
  const tally = new Map<string, number>();
  const firstShut = new Map<string, number[]>();
  const supportAt: number[] = [];
  const poolAt: number[] = [];
  for (let i = 0; i < GAMES; i++) {
    let state = generateGalaxy(FIRST + i, faction);
    state.observing = true;
    let shutOn: number | undefined;
    for (let d = 0; d < DAYS; d++) {
      state = advanceDay(state);
      const reason = why(state, faction);
      tally.set(reason, (tally.get(reason) ?? 0) + 1);
      if (reason !== 'open' && shutOn === undefined) {
        shutOn = state.day;
        const key = reason.startsWith('support') ? 'support' : reason;
        firstShut.set(key, [...(firstShut.get(key) ?? []), state.day]);
      }
      if (state.day === 40) {
        const hq = state.systems.find((s) => s.id === state.factions[faction].hqSystemId)!;
        supportAt.push(hq.support[faction]);
        poolAt.push(recruitPool(state, faction).length);
      }
    }
  }
  const total = [...tally.values()].reduce((a, b) => a + b, 0);
  const open = tally.get('open') ?? 0;
  console.log(`\n=== ${faction}, ${GAMES} wars, ${DAYS} days, capital only ===`);
  console.log(`open on ${((open / total) * 100).toFixed(0)}% of days`);
  for (const [k, n] of [...tally].sort((a, b) => b[1] - a[1])) {
    if (k === 'open') continue;
    console.log(`  shut, ${k.startsWith('support') ? 'support below 65' : k}: ${((n / total) * 100).toFixed(0)}% of days`);
  }
  for (const [k, days] of firstShut) {
    console.log(`  first shut by ${k}: day ${days.sort((a, b) => a - b).join(', ')}`);
  }
  console.log(`  at day 40: support ${supportAt.map((x) => x.toFixed(0)).join('/')}  pool ${poolAt.join('/')}`);
}
