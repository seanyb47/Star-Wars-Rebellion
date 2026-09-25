import { describe, expect, it } from 'vitest';
import { loreShip, shipFlavour, subjectFor, slugOf } from '../Almanac';
import shipFlavourData from '../../data/ship-flavour.json';
import { ROSTER } from '../../sim/shipdefs';
import { CHART_LAYERS, GOLD_PER_DAY, SHIP_CLASSES, TROOP_TYPES, YARD_BUILDABLE } from '../../sim';
import { orderedLayers } from '../prefs';
import characterRoster from '../../data/characters.json';
import { PIRATE_LORDS } from '../../sim';

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
    // Forty since the crew package of 22 September. Twenty-five named
    // principals — fourteen Crown, eleven Confederate — and fifteen unaligned.
    expect(cast).toHaveLength(40);
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

/**
 * Flavour text: one line per hull, and no line without a hull.
 *
 * It lives outside `combat-ships.json` on purpose — that file says in its own
 * header to be changed by re-reading Sean's sheet and never by hand, so a
 * line written in there would be gone on the next import. The cost of keeping
 * it apart is that the two can drift, which is what this catches: a hull
 * added to the sheet with no line written for it, or a line left behind by a
 * hull that was cut or renamed.
 */
describe('what a hull is good and bad against', () => {
  it('has a line for every hull and a hull for every line', () => {
    const written = Object.keys(shipFlavourData.flavour);
    const hulls = ROSTER.ships.map((s) => s.id);
    expect([...written].sort()).toEqual([...hulls].sort());
  });

  it('says something about the hull rather than reading its stats back', () => {
    for (const cls of ROSTER.ships) {
      const line = shipFlavour(cls.id);
      expect(line.length, cls.name).toBeGreaterThan(80);
      // The fault it replaced: the roster's own notes opened by listing the
      // grid — "Heavy Armor 22; 400 Hull; 7 Long and 8 Heavy Guns." The first
      // pass at replacing them still leaned on the figures — *"Twelve light
      // guns is a hail of shot"* — which is the grid wearing a coat, printed
      // directly under the grid. So: no numerals at all. The line names what
      // she beats and what beats her, and the stats above say by how much.
      expect(line, cls.name).not.toMatch(/\d/);
    }
  });

  it('is two sentences at most, so it fits under the stats', () => {
    for (const cls of ROSTER.ships) {
      const sentences = shipFlavour(cls.id).split(/(?<=[.!?])\s+/).filter(Boolean);
      expect(sentences.length, cls.name).toBeLessThanOrEqual(2);
    }
  });
});

/**
 * The three ships nothing builds.
 *
 * Sean, 19 September: *"Move the ships of stories section in ship encyclopedia
 * under the character lore in the crew profile."* They used to be a section at
 * the foot of the Ships page. Moving them means the only thing that finds them
 * now is the Lord they belong to, so the join is pinned: a Lord with no hull
 * would silently drop a ship out of the game's writing altogether.
 */
describe('the hull a Pirate Lord is remembered for', () => {
  it('finds one for every Lord, and none for anybody else', () => {
    for (const lord of PIRATE_LORDS) {
      const hull = loreShip(lord.name);
      expect(hull, lord.name).toBeDefined();
      expect(hull!.id).toBe(lord.ship);
      expect(hull!.legend, lord.name).toBe(true);
      expect(hull!.blurb!.length, lord.name).toBeGreaterThan(40);
    }
    expect(loreShip('Somebody Else Entirely')).toBeUndefined();
  });

  it('accounts for every legend hull, so none is left with nowhere to be read', () => {
    const told = PIRATE_LORDS.map((l) => l.ship).sort();
    const legends = SHIP_CLASSES.filter((c) => c.legend).map((c) => c.id).sort();
    expect(told).toEqual(legends);
  });
});

/**
 * What a building earns, said once.
 *
 * Sean's Day 150 playtest: *"Gold Mine earnings are shown wrong. The build
 * screen says 'Earns 2/day,' but Pa.mine = 9 in code... This is the most
 * important economic choice and the UI gets it wrong."*
 *
 * The build sheet had the two figures typed in by hand — `item === 'mine' ? 2
 * : 3` — next to a table that said 9 and 3. The mill's literal happened to
 * agree and the mine's was out by more than four times, on the one screen
 * where a player chooses between them.
 *
 * So this greps the UI rather than testing a function: the fault was not bad
 * arithmetic, it was a number existing in two places, and only a search finds
 * the second one coming back.
 */
describe('what a works earns is read and never retyped', () => {
  /*
   * Through Vite's raw glob, the way `vocabulary.test.ts` already does it —
   * not `node:fs`, which passes under vitest and then fails the typecheck
   * because the app carries no Node types.
   */
  const SOURCES = import.meta.glob('../*.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const ui = Object.entries(SOURCES).map(([path, text]) => ({
    file: path.replace('../', ''),
    text,
  }));

  it('never writes an earnings figure as a literal beside the word Earns', () => {
    for (const { file, text } of ui) {
      // `label="Earns" n={...}` where the value is a bare number.
      const typed = [...text.matchAll(/label="Earns"\s+n=\{\s*(\d+(?:\.\d+)?)\s*\}/g)];
      expect(typed.map((m) => m[0]), file).toEqual([]);
      // Nor the shape that started it: a ternary of two bare numbers.
      const ternary = [...text.matchAll(/label="Earns"\s+n=\{[^}]*\?\s*\d+\s*:\s*\d+\s*\}/g)];
      expect(ternary.map((m) => m[0]), file).toEqual([]);
    }
  });

  it('agrees with the table for the three works that earn', () => {
    // One, two, three since Sean set the ladder: *"Gold vein >> 3x, Silver
    // vein >> 2x, Forrest >> mill 1x."* Pinned as the ratios as well as the
    // numbers, because the ratios are the rule and the numbers are only where
    // it currently sits.
    expect(GOLD_PER_DAY.refinery).toBe(3);
    expect(GOLD_PER_DAY.silver_mine).toBe(6);
    expect(GOLD_PER_DAY.mine).toBe(9);
    expect(GOLD_PER_DAY.silver_mine).toBe(GOLD_PER_DAY.refinery * 2);
    expect(GOLD_PER_DAY.mine).toBe(GOLD_PER_DAY.refinery * 3);
  });
});

/**
 * The encyclopedia does not carry notices about itself.
 *
 * A banner stood at the top of the Ships page for four days warning that the
 * roster and the fleet the game sailed were not yet the same thing — *"the war
 * you are playing still sails the old fleet and fights it the old way until
 * the engine swap lands."* The swap landed on 21 September. The banner stayed,
 * and went on telling players that the page under it could not be trusted.
 *
 * Sean cut it on the 22nd: *"cut this text at top, not necessary."*
 *
 * The lesson is worth a test rather than a comment, because it is the second
 * time: a sentence about work in progress has an expiry date, nothing in the
 * build knows when it passes, and the page it sits on is the one a player
 * opens precisely when they do not already know the answer. So the reference
 * pages state what is true and never what is temporary — if a fact needs a
 * migration notice beside it, the fact is not ready to be in here.
 */
const ALMANAC_SOURCE = import.meta.glob('../Almanac.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const GLOSSARY_SOURCE = import.meta.glob('../Glossary.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('the encyclopedia states what is true, not what is temporary', () => {
  it('carries no migration notice on any page', () => {
    const source = ALMANAC_SOURCE['../Almanac.tsx'];
    expect(source).toBeTruthy();
    // Strip the comments: this file explains at length why the banner went,
    // and a rule that its own explanation trips is a rule nobody can keep.
    const rendered = source
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    for (const stale of [
      'This is the new fleet',
      'engine swap',
      'until the engine',
      'not be a name in your harbor',
    ]) {
      expect(rendered, `a notice about work in progress: "${stale}"`).not.toContain(stale);
    }
  });

  /**
   * And no reference page states the landing gate that was repealed.
   *
   * Until 20 September a standing fortress forbade an invasion outright.
   * `resolveLanding` repealed it in as many words — *"that gate is repealed:
   * you may always land, and the walls swell the defender's die instead"* —
   * and three pieces of reader-facing text went on describing the old rule:
   * the Troops page's explainer, the Glossary's own Invasion entry, and the
   * Rules page's line about landing "more troops than are holding it".
   *
   * That is worse than the stale banner above, because a banner only wastes a
   * line. This told a player that a Fortress was a locked door, which is a
   * plan they would make and lose a fleet to.
   *
   * The phrasings are pinned rather than the idea, since the idea cannot be
   * grepped. If a rewrite trips this test on wording that is actually correct,
   * the fix is to change the phrase here — after checking `resolveLanding`,
   * not instead of.
   */
  it('states no rule the sim repealed', () => {
    const source = ALMANAC_SOURCE['../Almanac.tsx'];
    const glossary = GLOSSARY_SOURCE['../Glossary.tsx'];
    const strip = (text: string) =>
      text
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
    for (const [name, text] of [
      ['Almanac.tsx', strip(source)],
      ['Glossary.tsx', strip(glossary)],
    ] as const) {
      for (const repealed of [
        'while a Fortress still stands',
        'while a seawall stands',
        'no landing at all',
        'more troops than are holding',
      ]) {
        expect(text, `${name} states the repealed gate: "${repealed}"`).not.toContain(repealed);
      }
    }
  });
});
