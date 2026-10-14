import { describe, expect, it } from 'vitest';
import book from '../../data/characters.json';
import { slugify } from '../painted';

/**
 * A renamed crew member keeps their painting.
 *
 * Found on 25 September while stripping the character sheet back to portrait,
 * name and stats — Sean opened the Imperator and got the drawn cameo. Fourteen
 * of forty have no painting at all and need art. **The fifteenth did not.**
 * Halvard Corvane was painted, shipped and registered as *Lord Regent Halvard
 * Corvane*; he is *Grand Admiral* Halvard Corvane now, and since art is found
 * by `slugify(name)` the rename silently dropped his portrait and his face
 * crop on the floor. Same disease as the Lords' ship names a day earlier: the
 * fact lives in two places, nothing failed when they diverged.
 *
 * So this one guards the direction the other tests do not: not *is the art
 * there* — most of it legitimately is not yet — but **is a painting that
 * exists wired to somebody**. A portrait in the folder that no crew member
 * answers to is either a rename that lost its art or art paid for and unused,
 * and both are worth a failing test.
 */
const ALL = [...book.empire, ...book.alliance, ...book.recruits] as Array<{ name: string }>;

const shipped = (glob: Record<string, string>) =>
  new Set(Object.keys(glob).map((p) => p.split('/').pop()!.replace(/\.[^.]+$/, '')));

const PORTRAITS = shipped(
  import.meta.glob('../../art/portraits/*.webp', { query: '?url', import: 'default', eager: true }),
);
const FACES = shipped(
  import.meta.glob('../../art/faces/*.webp', { query: '?url', import: 'default', eager: true }),
);

describe('crew art belongs to somebody', () => {
  const roster = new Set(ALL.map((c) => slugify(c.name)));

  it('has a crew member for every portrait shipped', () => {
    for (const slug of PORTRAITS) {
      expect(
        roster.has(slug),
        `src/art/portraits/${slug}.webp answers to no crew member — a rename that lost its art, or art nobody uses`,
      ).toBe(true);
    }
  });

  it('has a crew member for every face crop shipped', () => {
    for (const slug of FACES) {
      expect(
        roster.has(slug),
        `src/art/faces/${slug}.webp answers to no crew member`,
      ).toBe(true);
    }
  });

  it('gives anybody with a portrait their face crop too', () => {
    // The two are separate assets and the crop is what every list and garrison
    // slot draws. A portrait with no crop is a person who looks finished on
    // their own sheet and drawn everywhere else.
    for (const slug of PORTRAITS) {
      expect(FACES.has(slug), `${slug} has a portrait but no face crop`).toBe(true);
    }
  });
});
