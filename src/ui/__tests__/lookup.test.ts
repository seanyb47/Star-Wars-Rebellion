import { isNotable } from '../EventCard';
import type { GameEvent } from '../../sim';
import missionsSource from '../../sim/missions.ts?raw';
import { describe, expect, it } from 'vitest';
import { encyclopediaShip } from '../lookup';
import { SHIP_CLASSES } from '../../sim';
import { ROSTER } from '../../sim/shipdefs';

/**
 * The link from a hull to its encyclopedia entry.
 *
 * This used to guard a hand-kept crosswalk between two rosters — the fleet the
 * game sailed and the fleet the Encyclopedia was built on — and its job was to
 * catch a hull quietly losing its entry when either moved. The rosters are one
 * roster since 21 September, so what is left to check is that every hull still
 * carries the sheet's own key and that the key is one the sheet knows.
 */
describe('the encyclopedia link', () => {
  it('points every hull at an entry that really exists', () => {
    for (const cls of SHIP_CLASSES) {
      const entry = encyclopediaShip(cls.id);
      if (cls.legend) {
        // The three the Pirate Lords are named for are in no roster: nothing
        // builds them and nothing sails them, so there is nothing to open.
        expect([cls.id, entry]).toEqual([cls.id, undefined]);
        continue;
      }
      expect([cls.id, entry !== undefined && ROSTER.byId.has(entry)]).toEqual([cls.id, true]);
    }
  });

  it('leaves no hull in the roster without a way in', () => {
    // The failure this is really watching for: a hull added to the sheet and
    // not given a slug, which would sail with no entry behind it.
    const linked = new Set(SHIP_CLASSES.map((c) => encyclopediaShip(c.id)));
    for (const def of ROSTER.ships) {
      expect([def.name, linked.has(def.id)]).toEqual([def.name, true]);
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
