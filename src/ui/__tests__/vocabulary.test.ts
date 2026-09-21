import { describe, expect, it } from 'vitest';
import terms from '../../data/terms.json';
import { CHART_LAYERS } from '../../sim/layers';

/**
 * One word per idea, at Sean's word of 17 September.
 *
 * *"Is it 'crew', 'officer' or 'personnel'? Let's make it crew. Is it
 * 'diplomacy' or 'parley'? Let's make it parley. Is it island or port? Let's
 * make it: World Map / Reach Map / Location."*
 *
 * The rule the whole pass settled on: **a label uses the agreed word, and
 * prose keeps its voice.** In a sentence a location is still an island,
 * because in this world it is one — what is forbidden is a second word for the
 * same idea in a label. So these tests guard the labels and the vocabulary
 * file rather than sweeping every string, which would flatten the period voice
 * into interface English.
 */

/**
 * Every interface file, as text.
 *
 * Read through Vite's own raw glob rather than `node:fs`, which keeps the test
 * inside the same module graph as the code it is checking and off the Node
 * types the app does not otherwise need. StyleTest is the one exemption: it is
 * a swatch page for the art pipeline that nobody reaches from the game.
 */
const SOURCES = import.meta.glob('../*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/**
 * The sim's player-facing strings, which are not in `src/ui` at all.
 *
 * The 21 September reversal found a Pirate Lord's power blurb — *"Any errand
 * he leads makes the passage in half the time"* — sitting in
 * `src/sim/constants.ts`, where no guard in this file had ever looked. The
 * sweep below reads `src/ui`; the chart filters were already known to live in
 * the sim and were checked one at a time through `CHART_LAYERS`, which is the
 * shape of an exception that should have been a rule.
 *
 * The sim has no JSX, so only its quoted strings are read.
 */
const SIM = import.meta.glob('../../sim/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function simSources(): Array<{ file: string; text: string }> {
  return Object.entries(SIM).map(([path, text]) => ({
    file: path.replace('../../', ''),
    text,
  }));
}

function uiSources(): Array<{ file: string; text: string }> {
  return Object.entries(SOURCES)
    .map(([path, text]) => ({ file: path.replace('../', ''), text }))
    .filter(({ file }) => !file.startsWith('StyleTest'));
}

/**
 * The quoted strings of a source file, with every comment taken out first.
 *
 * The comments have to go before the strings are matched rather than after,
 * because the files are full of Sean's own memos quoted back at the code —
 * *"only show this section when personnel status is relevant"* — and those
 * citations are quotations of the brief, not words the game says to anybody.
 * Rewording them to satisfy a lint would be falsifying the record of why the
 * code is the way it is.
 */
/**
 * The prose that lives in the data files, as strings.
 *
 * A playtest on 20 September found *company* — the word the 19 September
 * ruling retired — on the Build sheet three times over: the Training Facility
 * blurb in `terms.json` said it drilled *companies*, and three hull blurbs in
 * `ships.json` said what they *land companies* for. Every one of those is
 * read by the player, and none of them is a `.tsx` file, so the sweep above
 * never looked at them. The vocabulary file being the one place the rule is
 * written down and also a place it was broken is the part worth remembering:
 * a test that reads only the code checks only where the code says the words.
 *
 * Keys are skipped and values kept. `_comment` is the exception in both
 * directions — it is the dev note that explains which word was retired, so it
 * has to be allowed to name it.
 */
const DATA = import.meta.glob('../../data/*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function dataText(): Array<{ file: string; said: string }> {
  const out: Array<{ file: string; said: string }> = [];
  for (const [path, raw] of Object.entries(DATA)) {
    const file = path.replace('../../', '');
    // `doctrine.json` is the opponent's rulebook: read by `src/sim/ai.ts` and
    // by the lab, never rendered. Its articles are written for whoever is
    // tuning the machine, which makes them dev prose like a comment.
    if (file.endsWith('doctrine.json')) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { continue; }
    const walk = (node: unknown, key?: string) => {
      if (typeof node === 'string') {
        if (key === '_comment') return;
        // Ids, slugs and file stems are code. Prose has spaces in it.
        if (!/\s/.test(node)) return;
        out.push({ file, said: node });
        return;
      }
      if (Array.isArray(node)) { for (const n of node) walk(n); return; }
      if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node as Record<string, unknown>)) walk(v, k);
      }
    };
    walk(parsed);
  }
  return out;
}

function playerText(source: string): string[] {
  return (
    source
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n')
      .match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g)
      // `${officer.name}` is a variable, not a word the game says. Taking the
      // interpolations out leaves only the text between them, which is the
      // only part anybody reads.
      ?.map((s) => s.slice(1, -1).replace(/\$\{[^}]*\}/g, ' ')) ?? []
  );
}

/**
 * The text *between* the tags, which is the other half of what a player reads.
 *
 * `playerText` only sees quoted strings, and that turned out to be a real hole
 * rather than a theoretical one: the 19 September pass that retired *company*
 * found forty-eight occurrences in plain JSX — whole paragraphs of the
 * encyclopedia and the island panel — that every guard here had been walking
 * straight past since the vocabulary pass was written.
 *
 * Comments, strings and `{expressions}` come out first, leaving the words.
 */
function jsxText(source: string): string[] {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
    .join('\n')
    .replace(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g, ' ')
    .replace(/\{[^{}]*\}/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .split('\n');
}

describe('one word per idea', () => {
  it('names the three things a player can be looking at', () => {
    expect(terms.worldMap).toBe('World Map');
    expect(terms.reachMap).toBe('Reach Map');
    expect(terms.island).toBe('Location');
    expect(terms.islands).toBe('Locations');
    // And the first of them is what the tab bar calls it, so the word a player
    // taps is the word the rest of the interface uses.
    expect(terms.tabs.map).toBe(terms.worldMap);
  });

  it('calls a person of yours crew, and never anything else', () => {
    expect(terms.crew).toBe('Crew');
    // No tabs.characters any more: Sean cut the crew tab off the console on
    // 19 September, and a label for a tab that does not exist is a word the
    // file promises and the game never says.
    expect('characters' in terms.tabs).toBe(false);
    expect(terms.crewOne).toBe('crew member');
  });

  it('calls talking a place round a parley, and never diplomacy', () => {
    expect(terms.parley).toBe('Parley');
  });
});

describe('the words that were retired', () => {
  /**
   * `personnel` is the easy one: it was never in a player-facing string, only
   * in comments and CSS, and this keeps it that way.
   */
  it('never says personnel to the player', () => {
    for (const { file, text } of uiSources()) {
      for (const said of playerText(text)) {
        expect(said.toLowerCase(), `${file}: ${said}`).not.toContain('personnel');
      }
    }
  });

  /**
   * `officer` as a *category* is retired in favour of crew — in any position,
   * not only after an article. The first cut of this test looked for the noun
   * behind *an/the/your*, and the tutorial's very first card slipped through
   * it saying *"ships, officers and islands of its own"*, which is exactly the
   * use the pass exists to kill.
   */
  it('never calls one of your crew an officer', () => {
    const bare = /\bofficers?\b/i;
    for (const { file, text } of uiSources()) {
      for (const said of playerText(text)) {
        expect(bare.test(said), `${file}: ${said}`).toBe(false);
      }
    }
  });

  /**
   * `company` is the newest retirement and the one that reverses an earlier
   * ruling. On 17 September the ground unit became a **Company** and *troops*
   * was the retired word; on 19 September Sean turned it round — *"rename
   * 'company' to 'troop(s)' through game when talking about ground units"* —
   * so it is a **Troop** now and company is what must not come back.
   *
   * Two exemptions, and both are idioms rather than the category. **Ship's
   * Company** is the unit sailors ashore are called, and it is a real naval
   * idiom for the crew of a vessel rather than a word for a ground unit in
   * general. **Boarding company** is the same kind of thing, and it appears
   * only in the Wraith's and the Marauder's encyclopedia entries, which are
   * transcribed verbatim from `COMBAT-MASTER-v4.3.md` and checked against it
   * field for field by `shiplore.test.ts`. Rewording either would either
   * invent a unit name Sean never asked for or put the lore out of step with
   * the document that is its master. Everything else says Troop.
   */
  it('calls a ground unit a troop, and never a company', () => {
    expect(terms.troop).toBe('Troop');
    expect(terms.troops).toBe('Troops');
    const bare = /\bcompan(y|ies)\b/i;
    for (const { file, text } of uiSources()) {
      for (const said of playerText(text)) {
        if (/ship.s company/i.test(said)) continue;
        // A literal that is *only* the word is an id, not a sentence: the
        // encyclopedia route `'companies'` and the entry kind `'company'`
        // are both passed around the game and neither is ever read by
        // anybody. Prose always has other words in it.
        if (/^compan(y|ies)$/i.test(said.trim())) continue;
        // And a slug is an id too. `crown-ships-company` is a troop type's
        // key and the name of its painting on disk; renaming it would have
        // renamed a file for the sake of a word nobody sees.
        if (/^[a-z0-9-]+$/.test(said.trim())) continue;
        expect(bare.test(said), `${file}: ${said}`).toBe(false);
      }
      // And the prose between the tags, which is most of the encyclopedia.
      for (const said of jsxText(text)) {
        expect(bare.test(said), `${file}: ${said.trim()}`).toBe(false);
      }
    }
    // And the data files, which is where the playtest found it.
    for (const { file, said } of dataText()) {
      if (/(ship.s|boarding) compan(y|ies)/i.test(said)) continue;
      expect(bare.test(said), `${file}: ${said.slice(0, 120)}`).toBe(false);
    }
  });

  /**
   * And not abbreviated, either.
   *
   * The build card counted a hull's landing capacity as *"1 co."* — the
   * retired word with a full stop after it, which is how it walked past a
   * check written for `\bcompany\b`. Pinned separately because an
   * abbreviation is what a stat tile reaches for when it is short of room,
   * and that pressure is still there.
   */
  it('does not abbreviate it either', () => {
    for (const { file, text } of uiSources()) {
      for (const said of [...playerText(text), ...jsxText(text)]) {
        expect(/\bco\.(?!\w)/i.test(said), `${file}: ${said.slice(0, 120)}`).toBe(false);
      }
    }
  });

  /**
   * Non-vacuity for the sim sweep, for the same reason the data one has it: a
   * glob that stops resolving turns its guard green by looking at nothing.
   */
  it('is actually reading the sim files', () => {
    const files = simSources();
    expect(files.length, 'files found in src/sim').toBeGreaterThan(15);
    const said = files.flatMap(({ text }) => playerText(text));
    expect(said.length, 'strings found in src/sim').toBeGreaterThan(500);
  });

  /**
   * Non-vacuity: the data sweep is reading real prose rather than an empty
   * glob. If `import.meta.glob` ever stops resolving these the test above goes
   * green by looking at nothing.
   */
  it('is actually reading the data files', () => {
    const said = dataText();
    expect(said.length, 'strings found in src/data').toBeGreaterThan(500);
    expect(new Set(said.map((s) => s.file)).size, 'data files read').toBeGreaterThan(4);
  });

  /**
   * And `errand` — retired on 21 September, which reverses the ruling that
   * retired `mission` on the 17th.
   *
   * Sean: *"I don't like errands. Mission is the word we want to use."* The
   * same shape as the Company/Troop reversal two days earlier, and the reason
   * this file is written the way it is: the rule is *one word per idea*, not
   * *this particular word forever*, so a reversal should cost a value in
   * `terms.json` and a direction here, and nothing else.
   *
   * It very nearly did. The 17 September pass had already been careful to
   * leave `mission` alone everywhere it was code — `MissionType`, `on_mission`
   * as a status, `'mission'` as an event kind, `missionsOffered`, the
   * `missions` chart-layer id, `missions.ts`, `MissionChoiceSheet.tsx` — on
   * the grounds that none of it is read by anybody. That judgement is what
   * made this reversal cheap: the code never stopped saying mission, so only
   * the words a player reads had to turn round.
   *
   * The keys `errand` and `errands` stay in `terms.json` for the same reason.
   * A key is code.
   */
  it('calls a thing a crew member is sent to do a mission', () => {
    expect(terms.errand).toBe('Mission');
    expect(terms.errands).toBe('Missions');
    const bare = /\berrands?\b/i;
    for (const { file, text } of [...uiSources(), ...simSources()]) {
      for (const said of [...playerText(text), ...jsxText(text)]) {
        /*
         * An identifier on its own is code: an id, a key, a css class. But
         * *capitalised* on its own is a label, and telling those apart matters
         * — this rule read `/^[A-Za-z_]\w*$/` and so walked straight past the
         * Glossary's own section heading, `title: 'Errands'`, and the entry
         * named `'Errand'` directly under it. A whole encyclopedia page about
         * the retired word, invisible to the guard written to retire it,
         * because a single word looks like a variable.
         *
         * So: a lower-case single word is an id and is skipped; a capitalised
         * one is a label and is checked.
         */
        if (/^[a-z_][a-zA-Z0-9_]*$/.test(said.trim())) continue;
        if (/^[a-z0-9-]+$/.test(said.trim())) continue;
        // `jsxText` takes everything between the tags, and a `{...}` block in
        // the middle of a component is code that happens to sit there. Prose
        // does not have arrows and semicolons in it.
        if (/&&|\|\||=>|===|!==|\?\.|\.\w+\(|\)\s*[,;]|\bconst\b|\breturn\b/.test(said)) continue;
        // A field on an interface, which `jsxText` leaves behind as
        // `errands: Array ;` once it has eaten the `<{...}>`. The arrows and
        // semicolons rule above misses it because there is no paren in it.
        // Any typed member would land here, so it is skipped by shape rather
        // than by name: a word, then a colon, then something that starts like
        // a type. Prose that opens `Recruit · somewhere loyal` does not.
        if (/^\w+\??:\s*(Array|Record|Map|Set|Partial|Readonly|string|number|boolean|[A-Z]\w*)\b/.test(said.trim())) continue;
        expect(bare.test(said), `${file}: ${said.trim().slice(0, 120)}`).toBe(false);
      }
    }
    // The chart filters are written in the sim, not the interface.
    for (const { said } of dataText()) {
      expect(bare.test(said), `src/data: ${said.slice(0, 120)}`).toBe(false);
    }
    expect(CHART_LAYERS.some((l) => /errand/i.test(l.label) || /errand/i.test(l.hint)), 'a chart filter still says it').toBe(false);
    expect(CHART_LAYERS.some((l) => l.label === terms.errands), 'the missions filter is there').toBe(true);
  });

  /**
   * And `Diplomacy` as a name — the rating, the errand, the heading. Lower-case
   * `diplomacy` survives as the mission type's own id and as a field on a
   * character, which are code rather than words shown to anybody.
   */
  it('never shows the word Diplomacy', () => {
    for (const { file, text } of uiSources()) {
      for (const said of playerText(text)) {
        expect(said, `${file}: ${said}`).not.toMatch(/\bDiplomacy\b/);
      }
    }
  });

  /**
   * And the person who does it. A crew member who can talk is a *Negotiator*
   * on their sheet, which is the word the advisor already used when asked who
   * to send; `diplomat` was the role chip, two tutorial cards and nothing else.
   */
  it('never calls a talker a diplomat', () => {
    for (const { file, text } of uiSources()) {
      for (const said of playerText(text)) {
        expect(said, `${file}: ${said}`).not.toMatch(/\bdiplomats?\b/i);
      }
    }
  });
});
