import { describe, expect, it } from 'vitest';
import shipLoreData from '../../data/ship-lore.json';
import combatShips from '../../data/combat-ships.json';
import { shipLore } from '../Almanac';

/**
 * Part 4 of the combat master, written in the repo because the master never
 * arrived — the Drive cleanup of 19 September trashed the Ship Lore & Visual
 * Identity tab before its replacement was uploaded, and it is not in Drive,
 * owned or shared.
 *
 * These entries are **awaiting Sean's approval** and are superseded the day the
 * real tab turns up. What this test guards is the shape: every hull has one,
 * nothing is orphaned, and no entry quietly drifts into saying the things the
 * standing rules say it must not.
 */
const LORE = shipLoreData.lore as Record<string, { entry: string; identity: string }>;
const SHIPS = (combatShips as { ships: Array<Record<string, string | number>> }).ships;

describe('every hull has an encyclopedia entry', () => {
  it('covers all 25 and orphans none', () => {
    const ids = new Set(SHIPS.map((s) => String(s['Ship ID'])));
    expect(ids.size).toBe(25);
    for (const id of ids) expect(Object.keys(LORE), `missing ${id}`).toContain(id);
    for (const id of Object.keys(LORE)) expect(ids, `orphan ${id}`).toContain(id);
  });

  it('says something, in both fields', () => {
    for (const [id, l] of Object.entries(LORE)) {
      expect(l.entry.length, id).toBeGreaterThan(120);
      expect(l.identity.length, id).toBeGreaterThan(60);
      expect(shipLore(id)).toBe(l.entry);
    }
  });
});

describe('the standing rules the entries have to obey', () => {
  const byId = new Map(SHIPS.map((s) => [String(s['Ship ID']), s]));
  const CORAL = new Set(['CFS-TID-S04', 'CFS-REE-R4-01', 'CFS-COR-R8-01']);

  /**
   * CANON §5A and the Peoples Art Guide's own cross-check: *"Visible living
   * coral belongs to Reef folk and the Confederacy only. It is never normal
   * Crown construction or ornament."*
   */
  it('never gives the Crown a coral hull', () => {
    for (const [id, l] of Object.entries(LORE)) {
      if (byId.get(id)!['Faction'] !== 'Crown Imperium') continue;
      const said = `${l.entry} ${l.identity}`;
      // The Crown may be described as *failing* to grow coral — that is the
      // line between the two navies, and it is worth saying. What it may not
      // have is coral on it.
      expect(/coral-(grown|sheathed)|living coral hull|grown coral/i.test(said), id).toBe(false);
    }
  });

  it('keeps coral to the three Reef-folk hulls', () => {
    for (const [id, l] of Object.entries(LORE)) {
      if (CORAL.has(id)) continue;
      if (byId.get(id)!['Faction'] !== 'Free Confederacy') continue;
      expect(/coral/i.test(l.identity), `${id} identity`).toBe(false);
    }
    for (const id of CORAL) expect(/coral|carapace|sung|grow/i.test(LORE[id].identity + LORE[id].entry), id).toBe(true);
  });

  /**
   * CANON §6: green sails mark a **V2 ship**, not an elite one, and the
   * Confederacy has no standardised II programme.
   */
  it('puts green sails only on the three Crown II hulls', () => {
    for (const [id, l] of Object.entries(LORE)) {
      const isV2 = String(byId.get(id)!['Ship']).includes('II');
      const green = /green sails|Imperial-green sails/i.test(l.identity);
      expect(green, `${id} green=${green} v2=${isV2}`).toBe(isV2);
      if (isV2) expect(byId.get(id)!['Faction']).toBe('Crown Imperium');
    }
  });

  /**
   * Sean's standing presentation rule: the back-end math stays hidden, and
   * strength is carried by in-world flavour rather than by the stat grid read
   * back in a sentence. So no entry quotes a number off the roster.
   */
  it('never reads the stat grid back at the player', () => {
    for (const [id, l] of Object.entries(LORE)) {
      expect(/\b\d+\s*(hull|armou?r|guns?|knots)\b/i.test(l.entry), id).toBe(false);
    }
  });

  /** The standing negative prompt, minus the Confederacy's own crest. */
  it('never asks an artist for a jolly roger', () => {
    for (const [id, l] of Object.entries(LORE)) {
      expect(/jolly roger|crossbones/i.test(l.identity), id).toBe(false);
    }
  });
});
