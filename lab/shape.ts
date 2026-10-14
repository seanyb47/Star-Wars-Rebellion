/**
 * The two faction shapes the troop roster claims, as means over the whole list.
 *
 * `troops.json` states its own design in its header — "the Crown HOLDS ground
 * and the Confederacy TAKES it" — with four numbers to prove it. This reads
 * them back off the data so the claim and the file cannot drift apart, and so
 * a retune can be compared against the one before it in one line.
 */
import troopData from '../src/data/troops.json';

type Row = { faction: string; attack: number; invasionDefense: number; detection: number };
const types = troopData.types as unknown as Row[];

for (const side of ['empire', 'alliance']) {
  const mine = types.filter((t) => t.faction === side);
  const mean = (f: (t: Row) => number) => mine.reduce((n, t) => n + f(t), 0) / mine.length;
  console.log(
    `${side.padEnd(9)} attack ${mean((t) => t.attack).toFixed(1).padStart(5)}` +
      `   hold ${mean((t) => t.invasionDefense).toFixed(1).padStart(5)}` +
      `   watch ${mean((t) => t.detection).toFixed(1).padStart(5)}`,
  );
}
