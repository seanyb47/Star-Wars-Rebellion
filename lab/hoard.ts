/**
 * Why a side ends a war rich with its works standing idle.
 *
 * Playing two wars out on 20 September: the Crown finished on 1,359 gold with
 * **19 idle works**, the Confederacy on 249 with 2. Gold that is never spent
 * is a war that never happens, and nineteen yards with no order on them is
 * the same waste twice over.
 *
 * This does not guess at the cause. It samples both sides every fifty days
 * and prints what `aiBuild` would have been looking at: the surplus it
 * computes, whether that surplus reads as *thin*, how many works stand idle,
 * and — the one the diagnosis turns on — whether there is any unworked ground
 * left to put an earner on. Step 3 of `aiBuild` is the only step with no
 * upkeep gate, so if the deposits run out while the surplus is thin, every
 * other step is shut and the side stops building anything at all.
 *
 *   npx vite-node lab/hoard.ts <games> <first-seed>
 */
import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import { openDeposits } from '../src/sim/build';
import { islandIncome } from '../src/sim/economy';
import { freeSlots } from '../src/sim/helpers';
import { AI_RUNWAY_DAYS, UPKEEP_PER_DAY } from '../src/sim/constants';
import type { FacilityType, GameState, PlayableFaction } from '../src/sim/types';

const GAMES = Number(process.argv[2] ?? 8);
const FIRST = Number(process.argv[3] ?? 9000);
const CAP = 3000;
const EVERY = 50;
/** `AI_SURPLUS_MARGIN` is private to ai.ts; this is the same number. */
const MARGIN = 3;
const YARDS: FacilityType[] = ['construction_yard', 'training_facility', 'shipyard'];

interface Shot {
  day: number;
  gold: number;
  income: number;
  upkeep: number;
  spare: number;
  thin: boolean;
  idle: number;
  standing: number;
  veins: number;
  forests: number;
  berths: number;
  hulls: number;
  islands: number;
}

/** What `surplus()` in ai.ts computes, recomputed from the state. */
function spareFor(state: GameState, ai: PlayableFaction): number {
  const f = state.factions[ai];
  let pending = 0;
  for (const system of state.systems)
    for (const facility of system.facilities)
      if (facility.owner === ai && facility.building && !facility.founding)
        pending += UPKEEP_PER_DAY[facility.building.item];
  return f.income - f.upkeep - pending + f.gold / AI_RUNWAY_DAYS;
}

function sample(state: GameState, ai: PlayableFaction): Shot {
  const held = state.systems.filter((s) => s.control === ai && !s.uprising);
  let idle = 0;
  let standing = 0;
  for (const s of held)
    for (const f of s.facilities)
      if (f.owner === ai && YARDS.includes(f.type) && !f.founding) {
        standing += 1;
        if (!f.building) idle += 1;
      }
  const spare = spareFor(state, ai);
  return {
    day: state.day,
    gold: Math.round(state.factions[ai].gold),
    income: Math.round(state.factions[ai].income),
    upkeep: Math.round(state.factions[ai].upkeep),
    spare: Math.round(spare),
    thin: spare < MARGIN * 2,
    idle,
    standing,
    veins: held.reduce((n, s) => n + openDeposits(state, s, 'gold'), 0),
    forests: held.reduce((n, s) => n + openDeposits(state, s, 'forest'), 0),
    berths: held.reduce((n, s) => n + freeSlots(s), 0),
    hulls: state.fleets.filter((x) => x.faction === ai).reduce((n, x) => n + x.ships.length, 0),
    islands: held.length,
  };
}

const last: Record<PlayableFaction, Shot[]> = { empire: [], alliance: [] };
const thinDays: Record<PlayableFaction, number> = { empire: 0, alliance: 0 };
const noGround: Record<PlayableFaction, number> = { empire: 0, alliance: 0 };
let days = 0;

for (let g = 0; g < GAMES; g += 1) {
  let state = generateGalaxy(FIRST + g, 'empire');
  state.observing = true;
  for (let d = 0; d < CAP && !state.winner; d += 1) {
    state = advanceDay(state);
    days += 1;
    for (const ai of ['empire', 'alliance'] as const) {
      const s = sample(state, ai);
      if (s.thin) thinDays[ai] += 1;
      if (s.veins + s.forests === 0) noGround[ai] += 1;
      if (state.day % EVERY === 0 && g === 0) last[ai].push(s);
    }
  }
  for (const ai of ['empire', 'alliance'] as const) {
    const s = sample(state, ai);
    console.log(
      `seed ${FIRST + g} ${ai.padEnd(8)} end day ${String(state.day).padStart(4)}  ` +
        `gold ${String(s.gold).padStart(5)}  income ${String(s.income).padStart(3)}  upkeep ${String(s.upkeep).padStart(3)}  ` +
        `spare ${String(s.spare).padStart(4)}${s.thin ? ' THIN' : '    '}  ` +
        `idle ${String(s.idle).padStart(2)}/${String(s.standing).padStart(2)}  ` +
        `unworked veins ${s.veins} forests ${s.forests}  berths ${s.berths}  hulls ${s.hulls}  islands ${s.islands}`,
    );
  }
}

console.log(`\n--- seed ${FIRST}, one war, every ${EVERY} days ---`);
for (const ai of ['empire', 'alliance'] as const) {
  console.log(`\n${ai}:`);
  console.log('  day   gold  inc  upk  spare  thin  idle/std  veins  forests  berths  hulls  isles');
  for (const s of last[ai])
    console.log(
      `  ${String(s.day).padStart(4)}  ${String(s.gold).padStart(5)}  ${String(s.income).padStart(3)}  ${String(s.upkeep).padStart(3)}  ` +
        `${String(s.spare).padStart(5)}  ${s.thin ? ' yes' : '  no'}  ${String(s.idle).padStart(4)}/${String(s.standing).padEnd(3)}  ` +
        `${String(s.veins).padStart(5)}  ${String(s.forests).padStart(7)}  ${String(s.berths).padStart(6)}  ${String(s.hulls).padStart(5)}  ${String(s.islands).padStart(5)}`,
    );
}
console.log(`\n--- over ${days} side-days ---`);
for (const ai of ['empire', 'alliance'] as const)
  console.log(
    `  ${ai.padEnd(8)} thin on ${((100 * thinDays[ai]) / days).toFixed(1)}% of days, ` +
      `no unworked ground on ${((100 * noGround[ai]) / days).toFixed(1)}%`,
  );

/**
 * And where the bill actually goes, which is the half that matters.
 *
 * Mines and mills cost nothing to keep (`UPKEEP_PER_DAY`), so every gold of
 * *works* upkeep below is a construction yard, a drill ground, a slipway or a
 * wall — the things that do not earn. Set that against income per island, and
 * against the idle count above, and the deadlock is in one line: a side pays
 * rent on yards it cannot afford to give orders to, and that rent is what
 * makes them unaffordable.
 */
function split(state: GameState, f: PlayableFaction) {
  const held = state.systems.filter((s) => s.control === f);
  let works = 0;
  let garrison = 0;
  let hulls = 0;
  let aboard = 0;
  let income = 0;
  for (const s of held) {
    income += islandIncome(s, f);
    for (const fac of s.facilities)
      if (fac.owner === f && !fac.ancient) works += UPKEEP_PER_DAY[fac.type];
    garrison += s.garrison * UPKEEP_PER_DAY.troop;
  }
  for (const fl of state.fleets) {
    if (fl.faction !== f) continue;
    for (const sh of fl.ships) hulls += UPKEEP_PER_DAY[sh.classId];
    aboard += fl.troops * UPKEEP_PER_DAY.troop;
  }
  return { n: held.length, income, works, garrison, hulls, aboard };
}

console.log('\n--- where the bill goes, seed by seed, every 400 days ---');
console.log(' day  side      isles  income  inc/isle |  works  garrison  hulls  aboard  |  upk/isle');
for (let g = 0; g < GAMES; g += 1) {
  let state = generateGalaxy(FIRST + g, 'empire');
  state.observing = true;
  for (let d = 0; d < CAP && !state.winner; d += 1) {
    state = advanceDay(state);
    if (state.day % 400 !== 0) continue;
    for (const f of ['empire', 'alliance'] as const) {
      const s = split(state, f);
      if (!s.n) continue;
      const upk = s.works + s.garrison + s.hulls + s.aboard;
      console.log(
        `${String(state.day).padStart(4)}  ${f.padEnd(8)}  ${String(s.n).padStart(5)}  ` +
          `${String(Math.round(s.income)).padStart(6)}  ${(s.income / s.n).toFixed(1).padStart(8)} |  ` +
          `${String(Math.round(s.works)).padStart(5)}  ${String(Math.round(s.garrison)).padStart(8)}  ` +
          `${String(Math.round(s.hulls)).padStart(5)}  ${String(Math.round(s.aboard)).padStart(6)}  |  ` +
          `${(upk / s.n).toFixed(1).padStart(8)}`,
      );
    }
  }
}
