import { describe, expect, it } from 'vitest';
import shipLoreData from '../../data/ship-lore.json';
import combatShips from '../../data/combat-ships.json';
import { shipLore } from '../Almanac';

/**
 * Part 4 of `COMBAT-MASTER-v4.2.md`, and nothing of mine.
 *
 * v4 arrived on 20 September; it adds three hulls, rewrites the Swift's and
 * Blackfin's entries, and changes no other ship's stats. Because the master
 * is now *in the repo*, the useful test is no longer "does this obey the rules
 * I inferred" but **"is this still what the master says"** — `ship-lore.json`
 * is a parse of a file sitting next to it, and a parse that drifts from its
 * source is the whole failure mode.
 *
 * Read through Vite's raw import rather than `node:fs`: the app has no Node
 * types and this keeps the test inside the same module graph as the code.
 */
const MASTER = (
  import.meta.glob('../../../COMBAT-MASTER-v4.2.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../../../COMBAT-MASTER-v4.2.md'];

const LORE = shipLoreData.lore as Record<string, Record<string, string>>;
const SHIPS = (combatShips as { ships: Array<Record<string, string | number>> }).ships;

const FIELDS: Record<string, string> = {
  entry: 'Encyclopedia',
  identity: 'Visual identity',
  silhouette: 'Silhouette signature',
  materials: 'Construction & materials',
  sails: 'Sail plan & palette',
  detail: 'Signature detail',
  scene: 'Preferred art scene',
  guardrail: 'Distinctness guardrail',
};

describe('the ship encyclopedia is the master, verbatim', () => {
  it('has the master to compare against', () => {
    expect(MASTER, 'COMBAT-MASTER-v4.2.md is missing from the repo').toBeTruthy();
    expect(MASTER).toContain('PART 4 — ENCYCLOPEDIA & ART DIRECTION');
  });

  it('covers all 28 hulls and orphans none', () => {
    const ids = new Set(SHIPS.map((s) => String(s['Ship ID'])));
    expect(ids.size).toBe(28);
    for (const id of ids) expect(Object.keys(LORE), `missing ${id}`).toContain(id);
    for (const id of Object.keys(LORE)) expect(ids, `orphan ${id}`).toContain(id);
  });

  /**
   * Every field of every ship, matched back against the text of the master.
   *
   * Curly apostrophes are normalised on the way in, so they are normalised here
   * too; nothing else is allowed to differ.
   */
  it('matches the master field for field', () => {
    const plain = MASTER.replace(/’/g, "'");
    let checked = 0;
    for (const [id, rec] of Object.entries(LORE)) {
      for (const [key, label] of Object.entries(FIELDS)) {
        const said = rec[key];
        expect(said, `${id}.${key} is empty`).toBeTruthy();
        expect(plain, `${id}.${key} is not in the master`).toContain(`${label}: ${said}`);
        checked += 1;
      }
    }
    // 28 ships x 8 fields. A silent drop to a handful would otherwise pass.
    expect(checked).toBe(224);
  });

  it('is what the ship sheet actually renders', () => {
    for (const [id, rec] of Object.entries(LORE)) expect(shipLore(id)).toBe(rec.entry);
  });
});
