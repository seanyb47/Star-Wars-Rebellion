import { describe, expect, it } from 'vitest';
import { encyclopediaShip } from '../lookup';
import { SHIP_CLASSES } from '../../sim/constants';
import { ROSTER } from '../../sim/shipdefs';

/**
 * The bridge between the hulls the game sails and the entries the
 * encyclopedia holds — which is not a bridge any more.
 *
 * It existed because the Encyclopedia was rebuilt on the Fleet Roster of 18
 * September while the live game went on sailing the old fleet, so a `?` on a
 * ship row had to be translated: Kestrel to Interceptor I, Reef-class to
 * Coral-Class, four hulls with no counterpart at all left deliberately
 * unmapped. The live roster swapped on 21 September and the table went with
 * it. What is left to guard is that the identity really is an identity.
 */
describe('the encyclopedia bridge', () => {
  it('opens every hull the game sails at its own entry', () => {
    const sailed = SHIP_CLASSES.filter((c) => !c.legend);
    expect(sailed).toHaveLength(ROSTER.ships.length);
    for (const cls of sailed) {
      expect([cls.name, encyclopediaShip(cls.id)]).toEqual([cls.name, cls.id]);
    }
  });

  /**
   * And the three the stories tell about still have no entry, which is
   * correct rather than a gap: the Open Deck, the Swallowtail and the Adamant
   * are lore, nothing builds them, and the sheet has never heard of them. A
   * `?` on one lands at the top of the Ships page, which is honest.
   */
  it('sends a legend nowhere rather than somewhere wrong', () => {
    for (const cls of SHIP_CLASSES.filter((c) => c.legend)) {
      expect([cls.id, encyclopediaShip(cls.id)]).toEqual([cls.id, undefined]);
    }
  });

  it('invents nothing for a name the roster has never had', () => {
    expect(encyclopediaShip('buccaneer')).toBeUndefined();
    expect(encyclopediaShip('')).toBeUndefined();
  });
});
