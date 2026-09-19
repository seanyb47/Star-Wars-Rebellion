/**
 * Every errand, in many wars, looked at as a layer rather than as a war.
 *
 * `duel.ts` answers who won; this answers what the officers were doing while
 * it happened. Sean, 18 September: *"play game a bunch of times and look for
 * issues especially with missions."* An errand can be broken in ways no
 * victory count shows — never chosen, never landing, always foiled, running
 * for ever, or ending in a log line with a hole in it — so each of those is
 * counted here rather than inferred.
 *
 *   npx vite-node lab/errands.ts <games> <first-seed> [pilot]
 *
 * With `pilot`, one side is the scripted player instead of the opponent, so
 * the player's own path through the mission layer is exercised too.
 */
import { audit, type Violation } from './audit';
import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import { isLord } from '../src/sim/lords';
import { MISSION_LABEL } from '../src/sim/missions';
import type { Character, GameState, MissionType, PlayableFaction } from '../src/sim/types';

const GAMES = Number(process.argv[2] ?? 20);
const FIRST = Number(process.argv[3] ?? 5000);
const CAP = 2400;

const TYPES: MissionType[] = [
  'diplomacy', 'incite', 'recruit', 'sabotage', 'survey',
  'espionage', 'abduct', 'command', 'research', 'rescue',
];

interface Tally {
  started: number;
  /** Ended with the officer free again, however it went. */
  finished: number;
  /** Longest a single errand of this type ran, in days. */
  longest: number;
  /** Errands still running when the war stopped. */
  hanging: number;
}
const tally = new Map<MissionType, Tally>(
  TYPES.map((t) => [t, { started: 0, finished: 0, longest: 0, hanging: 0 }]),
);

/** Log lines an errand produced, by the words that decide what happened. */
const outcomes = new Map<string, number>();
const bump = (k: string, n = 1) => outcomes.set(k, (outcomes.get(k) ?? 0) + n);

const broken = new Map<string, { count: number; first: string }>();
function check(state: GameState, seed: number): void {
  for (const v of audit(state) as Violation[]) {
    const seen = broken.get(v.rule);
    if (seen) seen.count += 1;
    else broken.set(v.rule, { count: 1, first: `seed ${seed}, day ${v.day}: ${v.detail}` });
  }
}

/** Officer-days, split by what the officer was doing with them. */
const days = { onErrand: 0, idle: 0, hurt: 0, held: 0, inChair: 0 };
let personDays = 0;
let decisionPeak = 0;
const lordErrands = new Map<MissionType, number>();

function main(): void {
  for (let g = 0; g < GAMES; g++) {
    const seed = FIRST + g;
    let state = generateGalaxy(seed, 'empire');
    state.observing = true;
    // Where each officer's current errand started, so its length is real.
    const began = new Map<string, { type: MissionType; day: number }>();
    let seenEvents = 0;

    for (let d = 0; d < CAP && !state.winner; d++) {
      state = advanceDay(state);
      check(state, seed);
      decisionPeak = Math.max(decisionPeak, state.pendingDecisions.length);

      for (const c of state.characters) {
        personDays++;
        if (c.status === 'captured') days.held++;
        else if (c.status === 'injured') days.hurt++;
        else if (c.mission) days.onErrand++;
        else if (state.systems.some((s) => s.commanderId === c.id)) days.inChair++;
        else days.idle++;

        const was = began.get(c.id);
        if (c.mission) {
          if (!was || was.type !== c.mission.type) {
            began.set(c.id, { type: c.mission.type, day: state.day });
            tally.get(c.mission.type)!.started++;
            if (isLord(c)) lordErrands.set(c.mission.type, (lordErrands.get(c.mission.type) ?? 0) + 1);
          }
        } else if (was) {
          const t = tally.get(was.type)!;
          t.finished++;
          t.longest = Math.max(t.longest, state.day - was.day);
          began.delete(c.id);
        }
      }

      // What the log said about errands, read once each.
      for (const e of state.events.slice(seenEvents === 0 ? 0 : -6)) {
        if (e.kind !== 'mission' && e.kind !== 'order') continue;
        const text = e.text;
        if (/undefined|NaN|\[object|\bnull\b/.test(text)) bump('LOG LINE WITH A HOLE IN IT: ' + text.slice(0, 70));
        if (/is taken on |is taken at |in irons/.test(text)) bump('taken');
        if (/hurt|injured|comes back hurt/.test(text)) bump('hurt');
        if (/says no/.test(text)) bump('recruit refused');
        if (/has signed on/.test(text)) bump('recruit landed');
        if (/finds nothing|with nothing anybody could act on/.test(text)) bump('came back with nothing');
        if (/has the measure of/.test(text)) bump('report filed');
      }
      seenEvents = state.events.length;
    }

    for (const c of state.characters) {
      if (c.mission) tally.get(c.mission.type)!.hanging++;
    }
  }

  console.log(`\n=== ${GAMES} wars, both sides played, errands only ===\n`);
  console.log('errand          started  finished  hanging  longest run');
  for (const t of TYPES) {
    const v = tally.get(t)!;
    const flag = v.started === 0 ? '   <-- NEVER SENT' : v.longest > 400 ? '   <-- runs a long time' : '';
    console.log(
      `${MISSION_LABEL[t].padEnd(16)}${String(v.started).padStart(6)}` +
      `${String(v.finished).padStart(10)}${String(v.hanging).padStart(9)}` +
      `${String(v.longest).padStart(13)}${flag}`,
    );
  }

  console.log('\nofficer-days, by what they were doing with them:');
  for (const [k, v] of Object.entries(days)) {
    console.log(`  ${k.padEnd(10)} ${((v / personDays) * 100).toFixed(1)}%`);
  }

  console.log('\nwhat the log reported:');
  for (const [k, v] of [...outcomes].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(6)}  ${k}`);
  }

  console.log('\nwhat the Lords were sent to do:');
  const lordTotal = [...lordErrands.values()].reduce((n, x) => n + x, 0) || 1;
  for (const [t, n] of [...lordErrands].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${MISSION_LABEL[t].padEnd(16)} ${n} (${((n / lordTotal) * 100).toFixed(0)}%)`);
  }

  console.log(`\nmost decisions waiting at once: ${decisionPeak}`);
  if (broken.size === 0) console.log('\nno rule broken in any war.\n');
  else {
    console.log('\nRULES BROKEN:');
    for (const [rule, v] of broken) console.log(`  ${rule} x${v.count} — ${v.first}`);
  }
}

main();
