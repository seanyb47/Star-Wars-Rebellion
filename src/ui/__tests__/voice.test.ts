import { describe, expect, it } from 'vitest';
import lines from '../../../public/narrator/voicelines.json';
import { chooseLine } from '../narrator/voice';
import { isSpoken, makesSound } from '../prefs';
import type { EventKind } from '../../sim';

const KINDS: EventKind[] = ['war', 'flip', 'mutiny', 'battle', 'mission', 'order', 'loss'];
const CAST = ['marlow', 'pennywhistle'] as const;

type Line = { id: string; character: string; mood: string; question: string; text: string };
const ALL = lines as unknown as Line[];

/**
 * The advisor speaking the news: what is written, and which line gets picked.
 *
 * Nothing here touches audio. What can go wrong with a recording is that it is
 * missing, and the player handles that by saying nothing; what can go wrong
 * with the *writing* is a line with a hole in it, a kind nobody covers, or the
 * same sentence twice running — and all three are checkable without a speaker.
 */
describe('what the advisor has to say', () => {
  it('gives both advisors something for every kind of news', () => {
    for (const who of CAST) {
      for (const kind of KINDS) {
        const mine = ALL.filter((l) => l.character === who && l.question === `news_${kind}`);
        // More than one, because the rule below is that she does not repeat
        // herself, and one line makes that impossible to keep.
        expect(mine.length, `${who} on ${kind}`).toBeGreaterThan(1);
      }
    }
  });

  it('carries no templates, because the renderer refuses them', () => {
    // `render_voicelines.py` rejects a text containing a brace or a bracket:
    // a recording is a fixed sentence, so "informants have reported on
    // somewhere" cannot carry the island's name. Sean's own example —
    // *"Informants have provided information on three locations"* — is in
    // there with the variable part taken out rather than filled in.
    for (const line of ALL) {
      expect(line.text, line.id).not.toMatch(/[{}[\]]/);
      expect(line.text.trim().length, line.id).toBeGreaterThan(8);
    }
  });

  it('names every line for its own advisor, and names none of them twice', () => {
    const seen = new Set<string>();
    for (const line of ALL) {
      expect(line.id.startsWith(`${line.character}_`), line.id).toBe(true);
      expect(seen.has(line.id), line.id).toBe(false);
      seen.add(line.id);
    }
  });
});

describe('which line she picks', () => {
  const rendered = ALL.map((l) => ({ ...l, rendered: true }));

  it('picks one of her own, for the kind of news that happened', () => {
    const line = chooseLine(rendered as never, 'marlow', 'battle', undefined)!;
    expect(line).toBeTruthy();
    expect(line.character).toBe('marlow');
    expect(line.question).toBe('news_battle');
  });

  it('never the one she said last time', () => {
    const first = chooseLine(rendered as never, 'marlow', 'battle', undefined)!;
    for (let i = 0; i < 25; i++) {
      expect(chooseLine(rendered as never, 'marlow', 'battle', first.id)!.id).not.toBe(first.id);
    }
  });

  it('says nothing at all when nothing is recorded yet', () => {
    // Which is how the game ships today: the manifest is written and every
    // line is `rendered: false` until the voice settings are locked and
    // `npm run voices` has run. Silence, not an error.
    expect(chooseLine(ALL as never, 'marlow', 'battle', undefined)).toBeNull();
    expect(chooseLine([], 'pennywhistle', 'war', undefined)).toBeNull();
  });

  it('does not answer a question with the news, or the news with a question', () => {
    // `war` is both, which is why the news cues are prefixed. A line written
    // for "how is the war going" must never play because a war ended.
    const questionLine = { ...ALL[0], question: 'war', rendered: true };
    expect(chooseLine([questionLine] as never, questionLine.character as never, 'war', undefined))
      .toBeNull();
  });
});

describe('the three columns decide what happens', () => {
  it('sounds and speaks every kind until somebody says otherwise', () => {
    const fresh = { soundOff: [], narratorOff: [] } as never;
    for (const kind of KINDS) {
      expect(makesSound(fresh, { kind })).toBe(true);
      expect(isSpoken(fresh, { kind })).toBe(true);
    }
  });

  it('and holds its tongue for the kinds that were unticked', () => {
    const quiet = { soundOff: ['order'], narratorOff: ['loss', 'order'] } as never;
    expect(makesSound(quiet, { kind: 'order' })).toBe(false);
    expect(makesSound(quiet, { kind: 'loss' })).toBe(true);
    expect(isSpoken(quiet, { kind: 'loss' })).toBe(false);
    expect(isSpoken(quiet, { kind: 'battle' })).toBe(true);
  });
});
