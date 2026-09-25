import { describe, expect, it } from 'vitest';
import reachData from '../../data/reaches.json';

/**
 * Every place the player is told about is a place on the chart.
 *
 * The second of these guards, written for the same reason as the first.
 * `shipnames.test.ts` was written on 24 September because a Lord's ship name
 * lived in four files and only one of them was checked. This is the same
 * failure one layer out: an **island chain's** name lives in `reaches.json`,
 * in `CANON.md`'s map table, in `persist.ts`'s save migration, and in whatever
 * crew entry happens to say where somebody was born — and on 21 September
 * three of the seven were renamed in the first and the third and nowhere else.
 *
 * What that had cost by the time this file was written, measured rather than
 * guessed:
 *
 * | Where | What it said |
 * |---|---|
 * | `CANON.md` §3, the map table | **three of seven rows** naming Reaches off no chart |
 * | `characters.json`, ten crew | born in Whalers' / Wreckers' / Cinder Reach, or the Merchant Sea |
 * | `characters.json`, two crew | out of the **Drowned Reach**, cut entirely in v4.0 |
 * | `CANON.md` §10, its only link | `COMBAT-MASTER-v4.2.md`, a file the repo does not carry |
 *
 * None of that was a decision anybody got wrong. Each was a rename that landed
 * in the code on the day it was made and then sat in a document nobody had a
 * reason to re-read. The rename itself was careful — it even migrates old saves
 * — which is what makes the case worth remembering: **carefulness at the point
 * of change does not reach the copies**, and only a test does.
 *
 * So the rules, in the order they catch things:
 *
 * 1. Shipped data may not name a Reach or a Sea the chart has not got.
 * 2. `CANON.md`'s map table is the chart, row for row, both ways round.
 * 3. Islands `CANON.md` names are islands the chart holds.
 * 4. Links in `CANON.md` point at files that exist.
 */

const REACHES = new Set(reachData.reaches.map((r) => r.name));
const SEAS = new Set(reachData.reaches.map((r) => r.sea));
const ISLANDS = new Set(reachData.reaches.flatMap((r) => r.islands).map((i) => i.name));

const DATA = import.meta.glob('../../data/*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const CANON = Object.values(
  import.meta.glob('../../../CANON.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>,
)[0];

const REPO_FILES = new Set(
  Object.keys(
    import.meta.glob('../../../*.md', { query: '?raw', import: 'default', eager: true }),
  ).map((p) => p.split('/').pop()!),
);

/**
 * Every string a data file ships, minus its own `_comment`.
 *
 * The comment is design history and has to be able to name what does *not*
 * exist: `reaches.json`'s own opening line says Sugar, Whalers' and Mirage are
 * held back for the larger maps, which is true and is the reason those Reaches
 * are absent. A player never reads it. Everything else in the file, they can.
 */
function shippedStrings(raw: string): string[] {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === 'string') out.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') {
      for (const [key, inner] of Object.entries(value)) {
        if (key === '_comment') continue;
        walk(inner);
      }
    }
  };
  walk(JSON.parse(raw));
  return out;
}

describe('a place the player is told about is a place on the chart', () => {
  it('names no Reach the world has not got', () => {
    /*
     * One or two capitalised words before "Reach". Several islands are named
     * that way too — Preston's Reach in Coral Reach, Northreach with no space
     * — so an island name passes: it is a real place, just not a chain.
     */
    const pattern = /\b([A-Z][\w']*(?: [A-Z][\w']*)?) Reach\b/g;
    for (const [path, raw] of Object.entries(DATA)) {
      for (const line of shippedStrings(raw)) {
        for (const [whole, name] of line.matchAll(pattern)) {
          expect(
            REACHES.has(whole) || ISLANDS.has(whole) || ISLANDS.has(name),
            `${path} sends the player to the ${whole}, which is on no chart`,
          ).toBe(true);
        }
      }
    }
  });

  it('names no Sea the world has not got', () => {
    /*
     * Sentence-cased in prose ("out of the Amber Sea") and title-cased in the
     * chart data, so the article is matched loosely and compared loosely — but
     * the **name** has to be capitalised, because a sea is also a plain noun.
     * Matching this case-insensitively caught the Brethren's own entry, *"they
     * come in the quantity the sea sends them"*, and reported a place called
     * the Quantity.
     */
    const pattern = /\b[Tt]he ([A-Z][\w']*(?: (?:of )?[A-Z][\w']*)?) Sea\b/g;
    const known = new Set([...SEAS].map((s) => s.toLowerCase()));
    for (const [path, raw] of Object.entries(DATA)) {
      for (const line of shippedStrings(raw)) {
        for (const [, core] of line.matchAll(pattern)) {
          expect(
            known.has(`the ${core} sea`.toLowerCase()),
            `${path} sends the player to the ${core} Sea, which is on no chart`,
          ).toBe(true);
        }
      }
    }
  });

  it('names no Reach that was renamed or cut', () => {
    /*
     * Belt and braces on the first two: a rename to another name that happens
     * to be a real island would slip past them, and the Drowned Reach was not
     * renamed at all — it was cut on 19 September (`CANON.md` §12) and the
     * Hushed's origin is Sean's to give (§11 Q1). Until he gives it, their
     * entries name no homeland rather than a dead one.
     *
     * `persist.ts` is the one place these names belong, because a save written
     * before 21 September still carries them and has to be read. That is code,
     * not shipped prose, and this test does not look at it.
     */
    const gone = [
      "Whalers' Reach",
      "Wreckers' Reach",
      'Cinder Reach',
      'Drowned Reach',
      'Merchant Sea',
    ];
    for (const [path, raw] of Object.entries(DATA)) {
      for (const line of shippedStrings(raw)) {
        for (const name of gone) {
          expect(line.includes(name), `${path} still says ${name}: "${line.slice(0, 90)}…"`).toBe(
            false,
          );
        }
      }
    }
  });
});

describe('CANON.md describes the world the game draws', () => {
  /** §3's map table, as rows of `[reach, sea, tier]`. */
  const rows = [...CANON.matchAll(/^\| *([\w' ]+ Reach) *\| *(The [\w' ]+) *\| *(\w+)[^|]*\|/gm)]
    .map(([, reach, sea, tier]) => [reach.trim(), sea.trim(), tier.trim()] as const);

  it('tabulates all seven Reaches and no eighth', () => {
    // The table is the thing most likely to be read by somebody deciding what
    // the world is, and the thing least likely to be re-read by somebody
    // renaming a Reach. It was wrong in three rows of seven on 25 September.
    expect(rows).toHaveLength(reachData.reaches.length);
    expect(new Set(rows.map((r) => r[0]))).toEqual(REACHES);
  });

  it('gives each Reach its own Sea and its own tier', () => {
    for (const [name, sea, tier] of rows) {
      const reach = reachData.reaches.find((r) => r.name === name);
      expect(reach, `CANON.md tabulates a ${name} the chart has not got`).toBeTruthy();
      expect(sea, `CANON.md puts ${name} in the wrong Sea`).toBe(reach!.sea);
      expect(tier, `CANON.md puts ${name} in the wrong tier`).toBe(reach!.tier);
    }
  });

  it('names only islands that exist, where it names islands', () => {
    /*
     * §3's "Named islands of note" is a parenthesised list — `Ballmoor
     * (foundries…), Gorley (site of…)` — so the names are what stands before
     * each bracket. It is the roll call somebody writing lore reads to find
     * out what the world has in it, and a renamed island would leave a ghost
     * in it exactly as the Reaches did.
     */
    const at = CANON.indexOf('**Named islands of note');
    expect(at, 'CANON.md no longer lists the islands of note').toBeGreaterThan(-1);
    const list = CANON.slice(at, CANON.indexOf('\n\n', at));
    const named = [...list.matchAll(/([A-Z][\w']*(?: [A-Z][\w']*)*) \(/g)].map((m) => m[1]);
    expect(named.length, 'the islands of note stopped parsing').toBeGreaterThan(15);
    for (const island of named) {
      expect(ISLANDS.has(island), `CANON.md names an island called ${island}, off the chart`).toBe(
        true,
      );
    }
  });

  it('links only to files the repo carries', () => {
    /*
     * §10's one link pointed at `COMBAT-MASTER-v4.2.md` while the repo carried
     * v4.3 — a dead link in the paragraph that tells the next reader where
     * combat canon lives, which is the worst possible place for one.
     */
    for (const [, target] of CANON.matchAll(/\]\(([^)#][^)]*)\)/g)) {
      if (/^[a-z]+:/.test(target)) continue; // an http link is not ours to check
      expect(
        REPO_FILES.has(target.split('/').pop()!),
        `CANON.md links to ${target}, which is not in the repo`,
      ).toBe(true);
    }
  });
});
