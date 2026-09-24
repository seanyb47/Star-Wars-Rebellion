import { describe, expect, it } from 'vitest';
import { TROOP_TYPES } from '../../sim';
import { SQUAD_ART } from '../troopart';

/**
 * The squad thumbnails, and the four units still on the drawn figure.
 *
 * Sean, 24 September, with eight of twelve painted. What these guard is the
 * join, because it is the part that would break silently: the art is found by
 * a **table** here rather than by slug, and a table can drift from both ends —
 * a troop renamed, or a file replaced by a v2.
 *
 * Two mismatches found by checking before the files arrived, and both would
 * have shipped as a missing painting with no error anywhere:
 *
 * - every delivered file carries a `-squad-v1` suffix that nothing strips;
 * - Ship's Company is `crown-ships-company` and the Drowned Guard is
 *   `drowned-guard`, against `ships-company-…` and `the-drowned-guard-…`.
 */
const ART = import.meta.glob('../../art/troops/*.webp', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const shipped = new Set(
  Object.keys(ART).map((p) => p.split('/').pop()!.replace(/\.webp$/, '')),
);

/** The four Sean is holding back, and why. */
const AWAITING: Record<string, string> = {
  'the-hushed': 'squad draft too photographic, needs revision',
  'bog-witches': 'squad draft needs art review',
  'shoal-wardens': 'no squad art made yet',
  'urskin-berserkers': 'no squad art made yet',
};

describe('the squad art table', () => {
  it('names a troop that exists for every entry', () => {
    const ids = new Set(TROOP_TYPES.map((t) => t.id));
    for (const id of Object.keys(SQUAD_ART)) {
      expect(ids.has(id), `${id} is not a troop in the game`).toBe(true);
    }
  });

  it('names a file that is actually shipped for every entry', () => {
    for (const [id, art] of Object.entries(SQUAD_ART)) {
      expect(shipped.has(art.slug), `${id} points at a missing ${art.slug}.webp`).toBe(true);
    }
  });

  it('ships no squad painting that nothing points at', () => {
    // A file in the folder with no unit on it is art paid for and not used.
    const used = new Set(Object.values(SQUAD_ART).map((a) => a.slug));
    for (const slug of shipped) {
      expect(used.has(slug), `${slug}.webp is in the game and wired to nobody`).toBe(true);
    }
  });

  it('covers exactly the eight, and holds the four back', () => {
    expect(Object.keys(SQUAD_ART).sort()).toEqual(
      [
        'crown-marines',
        'crown-ships-company',
        'drowned-guard',
        'fensworn',
        'island-militia',
        'reefwalkers',
        'the-brethren',
        'tidewrought',
      ].sort(),
    );
    for (const id of Object.keys(AWAITING)) {
      expect(SQUAD_ART[id], `${id} was wired up: ${AWAITING[id]}`).toBeUndefined();
    }
  });

  it('leaves every troop either painted or on the figure, and none in between', () => {
    for (const type of TROOP_TYPES) {
      const painted = Boolean(SQUAD_ART[type.id]);
      const held = type.id in AWAITING;
      expect(painted !== held, `${type.id} is neither painted nor listed as awaiting art`).toBe(
        true,
      );
    }
  });
});

describe('the shape the art is shown at', () => {
  it('gives the encyclopedia cells the art’s own 4:5 rather than cutting it', () => {
    /*
     * The one real display-size finding. The grid cell was `aspect-ratio: 4/3`
     * with centred `object-fit: contain`, which is right for a tall narrow
     * glyph and letterboxes a 4:5 painting — drawing the squad *smaller* than
     * the figure it replaced, which is the opposite of the ask.
     */
    const css = (
      import.meta.glob('../styles.css', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>
    )['../styles.css'];
    expect(css).toMatch(/\.encmini__art--squad \{[^}]*aspect-ratio: 4 \/ 5/);
    expect(css).toMatch(/\.encfull__art--squad \{[^}]*aspect-ratio: 4 \/ 5/);
    // And the figure cell matches, so a row with both in it still lines up.
    expect(css).toMatch(/\.encmini__art--figure \{[^}]*aspect-ratio: 4 \/ 5/);
  });

  it('crops nothing, per unit or globally', () => {
    // Sean: "if a crop or object-position adjustment is needed, set it per unit
    // rather than applying one destructive crop to every image." None is
    // needed — every box the art is shown in is 4:5, so `cover` and `contain`
    // agree — and the field exists for the day one is.
    for (const art of Object.values(SQUAD_ART)) {
      expect(art.objectPosition).toBeUndefined();
    }
  });
});
