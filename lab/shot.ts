/**
 * How often does a bombardment beat the island's total and still kill nothing?
 *
 * Sean's ruling of 21 September — *"bombardment is either successful or not.
 * if its successful at least 1 thing died"* — has one gap in it, and this
 * measures the gap. A roll that beats the total but cannot afford the cheapest
 * thing standing destroys nothing, and the cascade rolls on.
 */
import { bombard, type Shellable } from '../src/sim/siege';
import { createRng } from '../src/sim/rng';

const TRIALS = 20000;
function run(fleetScore: number, defenders: Shellable[], label: string) {
  let cleared = 0, killedSomething = 0, hollow = 0, rolls = 0;
  for (let i = 0; i < TRIALS; i++) {
    const r = bombard(fleetScore, defenders, createRng(i * 7 + 1));
    rolls += r.rolls.length;
    if (r.destroyed.length > 0) killedSomething += 1;
    if (r.destroyed.length >= defenders.length) cleared += 1;
    // A bombardment where at least one roll beat the total and nothing at all died.
    if (r.destroyed.length === 0 && r.rolls.some((x) => x.rolled > x.against)) hollow += 1;
  }
  const pct = (n: number) => ((n / TRIALS) * 100).toFixed(1);
  console.log(
    `${label}: cleared ${pct(cleared)}%  killed something ${pct(killedSomething)}%  ` +
      `beat the total and killed nothing ${pct(hollow)}%  mean rolls ${(rolls / TRIALS).toFixed(2)}`,
  );
}

const wall = (n: number, cost: number): Shellable[] =>
  Array.from({ length: n }, (_, i) => ({ kind: 'wall' as const, cost, ref: `w${i}` }));
const troops = (n: number, cost: number): Shellable[] =>
  Array.from({ length: n }, (_, i) => ({ kind: 'troop' as const, cost, ref: `t${i}` }));

run(32, [...wall(1, 8), ...troops(4, 4)], '1d32 vs one Fortress + 4 troops');
run(32, [...wall(2, 8), ...troops(4, 4)], '1d32 vs two Fortresses + 4 troops');
run(16, [...wall(1, 8), ...troops(4, 4)], '1d16 vs one Fortress + 4 troops');
run(48, [...wall(2, 8), ...troops(6, 4)], '1d48 vs two Fortresses + 6 troops');
