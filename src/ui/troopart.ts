import { paintedTroop } from './painted';

/**
 * Which squad painting belongs to which troop, and how it sits in its box.
 *
 * Every other kind of art in the game is found by slug: drop
 * `src/art/ships/blackfin.webp` in and the Blackfin has a painting, with no
 * table to keep. That could not work here, for two reasons found by checking
 * before the files arrived rather than after:
 *
 * 1. **The files are versioned and the lookup is not.** `paintedTroop` keys on
 *    `slugify(id)`, and every delivered file carries a `-squad-v1` suffix that
 *    nothing strips. All eight would have missed.
 * 2. **Two ids are not the filenames.** Ship's Company is `crown-ships-company`
 *    and the Drowned Guard is `drowned-guard`, against `ships-company-…` and
 *    `the-drowned-guard-…` on disk. Those two would have missed even unsuffixed.
 *
 * Renaming the files to match the ids would fix both and throw away the
 * version, which is the one thing a second draft of this art will need. So the
 * table is the answer, and it earns its keep twice over: it is also where a
 * per-unit `object-position` lives, which is what Sean asked for — *"set it
 * per unit rather than applying one destructive crop to every image."*
 *
 * **Four units are deliberately absent** and fall through to the drawn figure,
 * which is the behaviour that was already there for all twelve:
 *
 * | Unit | Why |
 * |---|---|
 * | The Hushed | squad draft too photographic, needs revision |
 * | Bog Witches | squad draft needs art review |
 * | Shoal Wardens | no squad art made yet |
 * | Urskin Berserkers | no squad art made yet |
 */
export interface SquadArt {
  /** The file's own slug in `src/art/troops/`, version and all. */
  slug: string;
  /**
   * Where the painting sits when a box is a different shape from 4:5 and has
   * to cover it. Absent means centred, which is right for a 4:5 box.
   *
   * The delivered art puts the identifying half in the **top third** — the
   * Reefwalkers' ears and spyglass, the Drowned Guard's plumed shakos, the
   * Tidewrought's helmets — and ground, surf or spray in the bottom third. So
   * where anything does have to give, it gives at the bottom.
   */
  objectPosition?: string;
}

export const SQUAD_ART: Record<string, SquadArt> = {
  'crown-marines': { slug: 'crown-marines-squad-v1' },
  // Not `ships-company`: the troop's id carries the faction prefix and the
  // file does not.
  'crown-ships-company': { slug: 'ships-company-squad-v1' },
  fensworn: { slug: 'fensworn-squad-v1' },
  tidewrought: { slug: 'tidewrought-squad-v1' },
  // Not `the-drowned-guard`: the id drops the article, the file keeps it.
  'drowned-guard': { slug: 'the-drowned-guard-squad-v1' },
  'island-militia': { slug: 'island-militia-squad-v1' },
  reefwalkers: { slug: 'reefwalkers-squad-v1' },
  'the-brethren': { slug: 'the-brethren-squad-v1' },
};

/**
 * This troop's squad painting, or nothing.
 *
 * Nothing is a real answer and always has been: eleven of the twelve had no
 * painting at all until today and drew the figure instead. Four still do.
 */
export function squadArt(troopId: string | undefined): SquadArt | undefined {
  if (!troopId) return undefined;
  const entry = SQUAD_ART[troopId];
  if (!entry) return undefined;
  // The table can name a file that is not on disk — a slug typo, or art pulled
  // back out — and a broken <img> is a worse answer than the drawn figure.
  return paintedTroop(entry.slug) ? entry : undefined;
}

/** The painting itself, for a caller that only wants the url. */
export function squadPainting(troopId: string | undefined): string | undefined {
  const entry = squadArt(troopId);
  return entry ? paintedTroop(entry.slug) : undefined;
}
