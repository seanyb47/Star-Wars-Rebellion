/**
 * Are the two sides' ground troops balanced?
 *
 * Sean's question, 22 September. The roster says the Crown *makes* its soldiers
 * and the Confederacy *recruits* peoples who join it, which is a good story and
 * says nothing about whether one of them wins.
 *
 * So this fights them. `invade` is the real engine: both sides roll their total,
 * the margin is spent cheapest-first, and a unit's own score is what it costs to
 * kill — so a high number is doubly good, once for the roll and once for the
 * body. That is why a table of averages is not an answer and this is.
 *
 *   npx vite-node lab/troops.ts
 */
import { invade, type Fighter } from '../src/sim/siege';
import { TROOP_TYPES } from '../src/sim/troops';
import { createRng } from '../src/sim/rng';

const TRIALS = 2000;
const byName = (n: string) => TROOP_TYPES.find((t) => t.name === n)!;

/** What each side can actually raise once it has reached a given rung. */
const AT_RUNG: Record<string, { empire: string[]; alliance: string[] }> = {
  'day one': {
    empire: ['Crown Marines', "Ship's Company"],
    alliance: ['Island Militia', 'Reefwalkers'],
  },
  'R2': {
    empire: ['Crown Marines', "Ship's Company", 'Fensworn'],
    alliance: ['Island Militia', 'Reefwalkers', 'The Brethren'],
  },
  'R4': {
    empire: ['Crown Marines', "Ship's Company", 'Fensworn', 'The Hushed'],
    alliance: ['Island Militia', 'Reefwalkers', 'The Brethren', 'Bog Witches'],
  },
  'R8, everything': {
    empire: ['Crown Marines', 'Tidewrought', 'The Drowned Guard', 'The Hushed'],
    alliance: ['Island Militia', 'Urskin Berserkers', 'Bog Witches', 'Shoal Wardens'],
  },
};

const stack = (names: string[], n: number, stat: 'attack' | 'invasionDefense'): Fighter[] =>
  Array.from({ length: n }, (_, i) => {
    const t = byName(names[i % names.length]);
    return { id: `${t.id}-${i}`, score: t[stat] };
  });

/** The best single unit each side has for a job, equal counts. */
function duel(aNames: string[], dNames: string[], n: number, wall: number) {
  let taken = 0;
  for (let i = 0; i < TRIALS; i++) {
    const r = invade(stack(aNames, n, 'attack'), stack(dNames, n, 'invasionDefense'), wall, createRng(i * 31 + 7));
    if (r.taken) taken += 1;
  }
  return (taken / TRIALS) * 100;
}

/** Same gold on each beach, rather than the same number of companies. */
function perGold(aNames: string[], dNames: string[], purse: number, wall: number) {
  const fill = (names: string[], stat: 'attack' | 'invasionDefense'): Fighter[] => {
    const out: Fighter[] = [];
    let spent = 0, i = 0;
    for (;;) {
      const t = byName(names[i % names.length]);
      if (spent + t.costGold > purse) break;
      out.push({ id: `${t.id}-${i}`, score: t[stat] });
      spent += t.costGold;
      i += 1;
      if (i > 200) break;
    }
    return out;
  };
  let taken = 0;
  const a = fill(aNames, 'attack'), d = fill(dNames, 'invasionDefense');
  for (let i = 0; i < TRIALS; i++) {
    const r = invade(
      a.map((f) => ({ ...f })),
      d.map((f) => ({ ...f })),
      wall,
      createRng(i * 31 + 7),
    );
    if (r.taken) taken += 1;
  }
  return { win: (taken / TRIALS) * 100, a: a.length, d: d.length };
}

/*
 * What a player actually fields: the best attacker they have against the best
 * defender the other side has. Cycling the whole roster measures roster depth,
 * which matters, but nobody lands their militia alongside their shock troops.
 */
const bestFor = (names: string[], stat: 'attack' | 'invasionDefense') =>
  [names.reduce((a, b) => (byName(b)[stat] > byName(a)[stat] ? b : a))];

console.log('\n=== Best company each side has for the job, 6 v 6, no walls ===\n');
console.log('stage            Crown attacking   Confederacy attacking');
for (const [label, sides] of Object.entries(AT_RUNG)) {
  const crown = duel(bestFor(sides.empire, 'attack'), bestFor(sides.alliance, 'invasionDefense'), 6, 0);
  const confed = duel(bestFor(sides.alliance, 'attack'), bestFor(sides.empire, 'invasionDefense'), 6, 0);
  console.log(
    `${label.padEnd(16)} ${crown.toFixed(0).padStart(13)}%   ${confed.toFixed(0).padStart(19)}%`,
  );
}

console.log('\n=== Equal companies, whole roster cycled, no walls ===\n');
console.log('stage            Crown attacking   Confederacy attacking   (6 v 6)');
for (const [label, sides] of Object.entries(AT_RUNG)) {
  const crown = duel(sides.empire, sides.alliance, 6, 0);
  const confed = duel(sides.alliance, sides.empire, 6, 0);
  console.log(
    `${label.padEnd(16)} ${crown.toFixed(0).padStart(13)}%   ${confed.toFixed(0).padStart(19)}%`,
  );
}

console.log('\n=== Equal gold (400 a side), no walls ===\n');
for (const [label, sides] of Object.entries(AT_RUNG)) {
  const crown = perGold(sides.empire, sides.alliance, 400, 0);
  const confed = perGold(sides.alliance, sides.empire, 400, 0);
  console.log(
    `${label.padEnd(16)} Crown attacking ${crown.win.toFixed(0).padStart(3)}% (${crown.a}v${crown.d})` +
      `   Confederacy attacking ${confed.win.toFixed(0).padStart(3)}% (${confed.a}v${confed.d})`,
  );
}

console.log('\n=== The same, against one Fortress (invasion defense 30) ===\n');
for (const [label, sides] of Object.entries(AT_RUNG)) {
  const crown = duel(sides.empire, sides.alliance, 6, 30);
  const confed = duel(sides.alliance, sides.empire, 6, 30);
  console.log(
    `${label.padEnd(16)} ${crown.toFixed(0).padStart(13)}%   ${confed.toFixed(0).padStart(19)}%`,
  );
}

console.log('\n=== What a company is worth per gold, and per day in the yard ===\n');
console.log(`${'Name'.padEnd(20)} ${'atk'.padStart(4)} ${'def'.padStart(4)} ${'det'.padStart(4)}  ${'gold'.padStart(5)} ${'days'.padStart(5)}  ${'pts/gold'.padStart(9)} ${'pts/day'.padStart(8)}`);
for (const f of ['empire', 'alliance'] as const) {
  for (const t of TROOP_TYPES.filter((x) => x.faction === f)) {
    const pts = t.attack + t.invasionDefense + t.detection;
    console.log(
      `${t.name.padEnd(20)} ${String(t.attack).padStart(4)} ${String(t.invasionDefense).padStart(4)} ` +
        `${String(t.detection).padStart(4)}  ${String(t.costGold).padStart(5)} ${String(t.days).padStart(5)}  ` +
        `${(pts / t.costGold).toFixed(2).padStart(9)} ${(pts / t.days).toFixed(2).padStart(8)}`,
    );
  }
  console.log('');
}
