import { isNotable } from '../EventCard';
import type { GameEvent } from '../../sim';
import missionsSource from '../../sim/missions.ts?raw';
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

/**
 * Losing somebody is news, and a mine running dry is not.
 *
 * Sean's dev report: *"My officer (Pryor) was carried off Ulverne by an enemy
 * while parleying undefended (~day 16). No dispatch card — the only trace was
 * a Log line. Losing an officer is a real setback and currently has no
 * surfaced notification."*
 *
 * The reason was structural rather than an oversight: a card is chosen by the
 * event's *kind*, and a capture is a `loss` — the same kind as a gold
 * shortfall, a burned mill and a sunk hull. Widening the kind would have
 * raised a card every time a mine ran dry, which is why nobody had.
 *
 * So `notable` is the inverse of the `quiet` flag that already existed: an
 * event may ask for a card its kind would not get. This pins both directions,
 * because the failure mode of the fix is a game that interrupts constantly.
 */
describe('which losses stop the player', () => {
  const event = (over: Partial<GameEvent>): GameEvent => ({
    id: 'e1',
    day: 10,
    kind: 'loss',
    text: 'something happened',
    ...over,
  });

  it('raises a card for an event that asks for one, whatever its kind', () => {
    expect(isNotable(event({ notable: true }))).toBe(true);
  });

  it('still says nothing for the ordinary run of losses', () => {
    expect(isNotable(event({}))).toBe(false);
    expect(isNotable(event({ kind: 'mission' }))).toBe(false);
  });

  it('lets quiet win, so a hand-fought action is not reported twice', () => {
    // `quiet` is set on the rounds of a battle the player is watching; a
    // notable flag must not punch through the screen already telling them.
    expect(isNotable(event({ notable: true, quiet: true }))).toBe(false);
  });

  it('marks a capture, a rescue and an abduction in the shipped rules', () => {
    // Against the sim rather than a fixture: these are the three the report
    // asked for, and a rename of the event text must not quietly drop them.
    const marked = missionsSource.match(/notable: true/g) ?? [];
    expect(marked.length).toBeGreaterThanOrEqual(3);
  });
});
