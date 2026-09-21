import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { buildMenu, gradeOf } from '../build';
import { craftNeeded, shipClass, shipsAt, shipsFor } from '../constants';
import type { PlayableFaction } from '../types';

/**
 * Sean, 20 September: *"Only starting ships should appear in fleets. Nothing
 * that requires research mission."*
 *
 * Two halves, and only one of them was broken. Nothing a side opens the war
 * with has ever needed a grade of shipwright craft — but the Build sheet was
 * listing every hull the side has designs for, research or no research, so a
 * Bulwark and a Buccaneer sat in the menu from day one and were refused on the
 * way out. A hull you cannot lay down should not be on the list you lay hulls
 * down from. Both halves are pinned here so neither can drift back.
 */
describe('nothing in the opening waits on the shipwrights', () => {
  it('opens both navies with hulls that need no research', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const state = generateGalaxy(seed, 'alliance');
      for (const fleet of state.fleets) {
        for (const ship of fleet.ships) {
          expect(
            craftNeeded(ship.classId),
            `seed ${seed}: ${fleet.name} opens with a ${shipClass(ship.classId).name}`,
          ).toBe(0);
        }
      }
    }
  });

  it('offers a yard only the hulls that side can lay down today', () => {
    for (const faction of ['empire', 'alliance'] as PlayableFaction[]) {
      const state = generateGalaxy(4, faction);
      const grade = gradeOf(state, faction);
      // Day one is grade nought, so the menu is the no-research hulls exactly.
      expect(grade).toBe(0);
      const yard = state.systems
        .flatMap((s) => s.facilities)
        .find((f) => f.type === 'shipyard' && f.owner === faction)!;
      const menu = buildMenu(yard, grade);
      expect(menu.length).toBeGreaterThan(0);
      for (const item of menu) expect(craftNeeded(item as never)).toBe(0);
      // Non-vacuity: the side does have designs it cannot build yet, so the
      // menu is shorter than the roster rather than the whole roster.
      expect(shipsFor(faction).length).toBeGreaterThan(shipsAt(faction, 0).length);
      expect(menu).toHaveLength(shipsAt(faction, 0).length);
    }
  });

  it('gives the Confederacy one Swift, not four', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const home = generateGalaxy(seed, 'alliance').fleets.find((f) => f.faction === 'alliance')!;
      const swifts = home.ships.filter((s) => s.classId === 'swift');
      expect(swifts).toHaveLength(1);
    }
  });
});
