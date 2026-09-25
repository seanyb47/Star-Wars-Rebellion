/**
 * Sean's benchmark for the Sovereign, 22 September.
 *
 * > It will literally fuck up anything that it fights with early on. You don't
 * > want to fuck with the Sovereign. Like, even if you combined the entire
 * > starting fleet for the Confederacy, they probably still wouldn't defeat
 * > the Sovereign.
 *
 * That is a measurable claim, so it gets measured. The Confederacy's opening
 * is its whole navy on day one — three Chimeras, a Tidestalker, the Brigantine
 * and one Swift — and this fights it against one ship of the line, a hundred
 * times, and reports who is left.
 *
 *   npx vite-node lab/sovereign.ts
 */
import { combatExchange, commission, survivors } from '../src/sim/navycombat';
import { ROSTER } from '../src/sim/shipdefs';
import { createRng } from '../src/sim/rng';

const CONFED_OPENING: Array<[string, number]> = [
  ['CFS-CHI-S03', 3],
  ['CFS-TID-S04', 1],
  ['CFS-BRI-S02', 1],
  ['CFS-SWI-S01', 1],
];

function fight(crownIds: Array<[string, number]>, theirs: Array<[string, number]>, trials = 200) {
  let crownWins = 0, crownLossesTotal = 0, theirLossesTotal = 0, crownHullLeft = 0;
  for (let t = 0; t < trials; t++) {
    const rng = createRng(t * 977 + 13);
    const crown = crownIds.flatMap(([id, n]) =>
      Array.from({ length: n }, (_, i) => commission(`c${id}${i}`, ROSTER.byId.get(id)!)),
    );
    const them = theirs.flatMap(([id, n]) =>
      Array.from({ length: n }, (_, i) => commission(`t${id}${i}`, ROSTER.byId.get(id)!)),
    );
    const crownStart = crown.length, themStart = them.length;
    const hullStart = crown.reduce((n, s) => n + s.hullRemaining, 0);
    let rounds = 0;
    while (survivors(crown).length > 0 && survivors(them).length > 0 && rounds < 80) {
      combatExchange(crown, them, rng);
      rounds += 1;
    }
    if (survivors(crown).length > 0 && survivors(them).length === 0) crownWins += 1;
    crownLossesTotal += crownStart - survivors(crown).length;
    theirLossesTotal += themStart - survivors(them).length;
    crownHullLeft += survivors(crown).reduce((n, s) => n + s.hullRemaining, 0) / Math.max(1, hullStart);
  }
  return {
    win: (crownWins / trials) * 100,
    hullLeft: (crownHullLeft / trials) * 100,
    theirLosses: theirLossesTotal / trials,
    ourLosses: crownLossesTotal / trials,
  };
}

function report(label: string, crown: Array<[string, number]>, theirs: Array<[string, number]>) {
  const r = fight(crown, theirs);
  console.log(
    `${label.padEnd(44)} wins ${r.win.toFixed(0).padStart(3)}%` +
      `  hull left ${r.hullLeft.toFixed(0).padStart(3)}%` +
      `  kills ${r.theirLosses.toFixed(1)}  loses ${r.ourLosses.toFixed(1)}`,
  );
}

console.log('\nThe Sovereign against the Confederacy, day one:\n');
report('Sovereign  vs their whole opening navy', [['CWN-SOV-S04', 1]], CONFED_OPENING);
report('Sovereign  vs 3 Chimera', [['CWN-SOV-S04', 1]], [['CFS-CHI-S03', 3]]);
report('Sovereign  vs 6 Chimera', [['CWN-SOV-S04', 1]], [['CFS-CHI-S03', 6]]);
report('Morningstar vs their whole opening navy', [['CWN-MOR-S03', 1]], CONFED_OPENING);
console.log('\nAnd the progression, so a later capital is still worth having:\n');
report('Sovereign II vs Sovereign', [['CWN-SOV-R7-02', 1]], [['CWN-SOV-S04', 1]]);
report('Majestic vs Sovereign', [['CWN-MAJ-R8-01', 1]], [['CWN-SOV-S04', 1]]);
report('Sovereign vs Coral-Class', [['CWN-SOV-S04', 1]], [['CFS-COR-R8-01', 1]]);
report('Sovereign vs Urskin Goliath', [['CWN-SOV-S04', 1]], [['CFS-URG-R7-01', 1]]);

/*
 * And the price question the build side asked on 22 September: a Sovereign is
 * 1,940 gold and a Justiciar is 850, so two Justiciars and change buy one
 * Sovereign. Is she worth it?
 */
console.log('\nThe Sovereign against what her gold buys instead:\n');
report('Sovereign vs 1 Justiciar', [['CWN-SOV-S04', 1]], [['CWN-JUS-R6-01', 1]]);
report('Sovereign vs 2 Justiciars', [['CWN-SOV-S04', 1]], [['CWN-JUS-R6-01', 2]]);
report('Sovereign vs 7 Vanguards (equal gold)', [['CWN-SOV-S04', 1]], [['CWN-VAN-R1-01', 7]]);
