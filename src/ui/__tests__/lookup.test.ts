import { describe, expect, it } from 'vitest';
import { encyclopediaShip } from '../lookup';
import { SHIP_CLASSES } from '../../sim';
import { ROSTER } from '../../sim/shipdefs';

/**
 * The bridge between the hulls the game sails and the entries the
 * encyclopedia holds.
 *
 * It exists because the Encyclopedia was rebuilt on the Fleet Roster of 18
 * September while the live game still sails the old fleet, and a `?` button
 * that opens the Ships page at the top looks broken. These tests are the guard
 * on that: an entry that does not exist, or a hull silently losing its entry
 * when the roster changes, fails here rather than in somebody's hands.
 */
describe('the encyclopedia bridge', () => {
  it('points every mapped hull at an entry that really exists', () => {
    for (const cls of SHIP_CLASSES) {
      const entry = encyclopediaShip(cls.id);
      if (entry === undefined) continue;
      expect([cls.id, ROSTER.byId.has(entry)]).toEqual([cls.id, true]);
    }
  });

  it('maps every live hull the new roster still has, by name', () => {
    // The names that survived the roster rewrite unchanged must all be
    // mapped: forgetting one is the easy mistake and it is invisible.
    const byName = new Map(ROSTER.ships.map((s) => [s.name, s.id] as const));
    for (const cls of SHIP_CLASSES) {
      if (cls.legend) continue;
      const sameName = byName.get(cls.name);
      if (!sameName) continue;
      expect([cls.name, encyclopediaShip(cls.id)]).toEqual([cls.name, sameName]);
    }
  });

  it('leaves the cut hulls unmapped rather than pointing them somewhere wrong', () => {
    // Razorback, Razorback II, Fluyt II and the Buccaneer have no counterpart
    // in the new fleet. Landing the player on the nearest-looking ship would
    // be worse than landing them at the top of the page.
    for (const id of ['razorback', 'razorback-ii', 'fluyt-ii', 'freebooter']) {
      expect([id, encyclopediaShip(id)]).toEqual([id, undefined]);
    }
  });

  it('knows nothing about a hull that does not exist', () => {
    expect(encyclopediaShip('no-such-ship')).toBeUndefined();
  });
});
