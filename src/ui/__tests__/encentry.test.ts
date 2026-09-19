import { describe, expect, it } from 'vitest';
import { subjectFor, slugOf } from '../Almanac';
import { ROSTER } from '../../sim/shipdefs';
import { CHART_LAYERS, TROOP_TYPES, YARD_BUILDABLE } from '../../sim';
import { orderedLayers } from '../prefs';
import characterRoster from '../../data/characters.json';

/**
 * Which entry a lookup means.
 *
 * `subjectFor` guesses from the shape of the id, because the callers are
 * spread across the game and none of them know about `Subject`: a fleet panel
 * passes a hull's class id, an island panel a works type, a crew card a name.
 * That guessing is the one genuinely fragile thing in the two-layer
 * encyclopedia — a new id space that happens to look like an old one sends a
 * player to the wrong sheet, silently — so every space is pinned here.
 */
describe('resolving a lookup to an entry', () => {
  it('knows a hull by its class id', () => {
    for (const cls of ROSTER.ships) {
      expect(subjectFor(cls.id), cls.name).toEqual({ kind: 'ship', id: cls.id });
    }
  });

  it('knows a company by its id', () => {
    for (const type of TROOP_TYPES) {
      expect(subjectFor(type.id), type.name).toEqual({ kind: 'company', id: type.id });
    }
  });

  it('knows a works by its type', () => {
    for (const type of YARD_BUILDABLE) {
      expect(subjectFor(type), type).toEqual({ kind: 'works', id: type });
    }
  });

  it('knows the two things in the ground', () => {
    expect(subjectFor('forest')).toEqual({ kind: 'resource', id: 'forest' });
    expect(subjectFor('gold')).toEqual({ kind: 'resource', id: 'gold' });
  });

  it('knows every one of the cast by their slug', () => {
    const cast = [
      ...characterRoster.empire,
      ...characterRoster.alliance,
      ...characterRoster.recruits,
    ];
    expect(cast).toHaveLength(26);
    for (const person of cast) {
      expect(subjectFor(slugOf(person.name)), person.name).toEqual({
        kind: 'person',
        id: slugOf(person.name),
      });
    }
  });

  it('gives back nothing rather than a wrong guess', () => {
    // A glossary word, a hull the new roster cut, and the empty case. All
    // three have to return null: the encyclopedia opens at the page and
    // nothing pops over it.
    expect(subjectFor('spec-ops')).toBeNull();
    expect(subjectFor('buccaneer')).toBeNull();
    expect(subjectFor(undefined)).toBeNull();
    expect(subjectFor('')).toBeNull();
  });

  it('keeps the four id spaces from overlapping', () => {
    // The guess is only safe while no id appears in two spaces. If a company
    // is ever called `fort`, or a hull id ever equals a person's slug, this
    // fails here rather than by opening the wrong sheet in somebody's hands.
    const spaces = [
      ROSTER.ships.map((s) => s.id),
      TROOP_TYPES.map((t) => t.id),
      [...YARD_BUILDABLE],
      ['forest', 'gold'],
      [
        ...characterRoster.empire,
        ...characterRoster.alliance,
        ...characterRoster.recruits,
      ].map((c) => slugOf(c.name)),
    ];
    const seen = new Map<string, number>();
    for (const [i, space] of spaces.entries()) {
      for (const id of space) {
        const first = seen.get(id);
        expect(first, `${id} is in two id spaces`).toBeUndefined();
        seen.set(id, i);
      }
    }
  });
});

/**
 * The filter strip in the player's order.
 *
 * Sean, 19 September: *"Add in settings ability to change default order of
 * game filters."* The saved order is ids on the device and the specs belong
 * to the build, so the two have to be reconciled every read — and the cases
 * that matter are the ones that happen between versions, when a filter has
 * been added or taken away since the order was saved.
 */
describe('the filter strip in the order the player set', () => {
  const build = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('leaves the build order alone when nothing is saved', () => {
    expect(orderedLayers(build, []).map((l) => l.id)).toEqual(['a', 'b', 'c']);
  });

  it('honours a saved order', () => {
    expect(orderedLayers(build, ['c', 'a', 'b']).map((l) => l.id)).toEqual(['c', 'a', 'b']);
  });

  it('puts a filter the saved order has never heard of at the end', () => {
    // The version that saved this order did not have `c`. It must appear
    // rather than vanish, and it must not displace what the player chose.
    expect(orderedLayers(build, ['b', 'a']).map((l) => l.id)).toEqual(['b', 'a', 'c']);
  });

  it('drops a filter the build no longer has', () => {
    expect(orderedLayers(build, ['c', 'gone', 'a', 'b']).map((l) => l.id)).toEqual(['c', 'a', 'b']);
  });

  it('survives a saved order with a repeat in it', () => {
    expect(orderedLayers(build, ['a', 'a', 'b']).map((l) => l.id)).toEqual(['a', 'b', 'c']);
  });

  it('always gives back every filter exactly once, whatever it is handed', () => {
    for (const saved of [[], ['room'], ['nope'], CHART_LAYERS.map((l) => l.id).reverse()]) {
      const got = orderedLayers(CHART_LAYERS, saved);
      expect(got).toHaveLength(CHART_LAYERS.length);
      expect(new Set(got.map((l) => l.id)).size).toBe(CHART_LAYERS.length);
    }
  });
});
