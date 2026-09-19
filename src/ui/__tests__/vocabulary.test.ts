import { describe, expect, it } from 'vitest';
import terms from '../../data/terms.json';

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
    expect(terms.tabs.characters).toBe(terms.crew);
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
   * One exemption, and it is a name rather than the category: **Ship's
   * Company** is the unit sailors ashore are called, and it is a real naval
   * idiom for the crew of a vessel rather than a word for a ground unit in
   * general. Renaming it would have invented a unit name Sean never asked
   * for. Everything else says Troop.
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
