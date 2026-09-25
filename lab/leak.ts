/**
 * Whose actions reach the player's log when the player does nothing?
 *
 * Sean, 22 September: *"I noticed I just played a game and made zero actions.
 * Yet this is my log. Why are actions being taken?"* This counts the events a
 * do-nothing Crown game produces and attributes each one to a side, so the
 * answer is a number rather than a reading of the code.
 */
import { generateGalaxy } from '../src/sim/galaxy';
import { advanceDay } from '../src/sim/advanceDay';
import { canSee } from '../src/sim/missions';

const DAYS = Number(process.argv[2] ?? 24);
const GAMES = Number(process.argv[3] ?? 12);

const tally = new Map<string, { mine: number; theirs: number; neither: number }>();
let mine = 0, theirs = 0, neither = 0;
const samples: string[] = [];

for (let g = 0; g < GAMES; g++) {
  let state = generateGalaxy(1000 + g, 'empire');
  const side = new Map(state.characters.map((c) => [c.id, c.faction]));
  for (let d = 0; d < DAYS; d++) state = advanceDay(state);
  // Only what the Crown could actually know, which is what the log prints.
  for (const e of state.events.filter((e) => canSee(state, e, 'empire'))) {
    // Fall back to who holds the island it happened on: a build finishing
    // carries no character, and "a troop has finished its drill on Tundvik"
    // is still somebody's business rather than nobody's.
    const onIsland = e.systemId ? state.systems.find((x) => x.id === e.systemId)?.control : undefined;
    const who = (e.characterId ? side.get(e.characterId) : undefined) ?? onIsland;
    const bucket = who === 'empire' ? 'mine' : who === 'alliance' ? 'theirs' : 'neither';
    if (bucket === 'mine') mine++; else if (bucket === 'theirs') theirs++; else neither++;
    const row = tally.get(e.kind) ?? { mine: 0, theirs: 0, neither: 0 };
    row[bucket]++;
    tally.set(e.kind, row);
    if (bucket === 'theirs' && samples.length < 8) samples.push(`[${e.kind}] ${e.text}`);
  }
}

console.log(`${GAMES} games, ${DAYS} days each, playing the Crown, no orders given.`);
console.log('Counting only events `canSee` lets through — what the log actually shows.\n');
console.log('kind            mine  theirs  unattributed');
for (const [kind, row] of [...tally].sort((a, b) => b[1].theirs - a[1].theirs)) {
  console.log(`${kind.padEnd(14)} ${String(row.mine).padStart(5)} ${String(row.theirs).padStart(7)} ${String(row.neither).padStart(13)}`);
}
console.log(`\nTOTAL          ${String(mine).padStart(5)} ${String(theirs).padStart(7)} ${String(neither).padStart(13)}`);
console.log(`\nEnemy actions named in the player's log: ${theirs} of ${mine + theirs + neither} events.`);
console.log('\nSamples of what the player should not be able to see:');
for (const s of samples) console.log('  ' + s);

// And the other half of the question: is anything playing the player's side?
// `runAI(state, rng)` acts for `otherFaction(state.player)`; the player's own
// side is only played when `observing` is set. This asserts it rather than
// trusting the read — if a do-nothing Crown ever issues an order, this prints.
{
  let state = generateGalaxy(4242, 'empire');
  const before = JSON.stringify({
    gold: state.factions.empire.gold,
    orders: state.systems.flatMap((s) => s.facilities.map((f) => f.type)).length,
  });
  for (let d = 0; d < 60; d++) state = advanceDay(state);
  const crewBusy = state.characters.filter((c) => c.faction === 'empire' && c.status === 'on_mission');
  // Build orders live on the works doing them — `facility.building` — not in
  // a queue on the state. The first draft of this check read a `buildOrders`
  // field that does not exist, so `?? []` reported a clean zero for a thing it
  // had never looked at. A count that cannot come out non-zero is not a check.
  const queued = state.systems
    .filter((sys) => sys.control === 'empire')
    .flatMap((sys) => sys.facilities.filter((f) => f.building));
  const theirs = state.systems
    .filter((sys) => sys.control === 'alliance')
    .flatMap((sys) => sys.facilities.filter((f) => f.building));
  console.log(`\nAfter 60 days of a do-nothing Crown (observing = ${Boolean(state.observing)}):`);
  console.log(`  Crown crew sent on missions by nobody: ${crewBusy.length}`);
  console.log(`  Crown build orders placed by nobody:   ${queued.length}`);
  console.log(`  Confederate build orders (the control): ${theirs.length}`);
  console.log(`  (opening state: ${before})`);
}
