/**
 * Painted art, where it exists.
 *
 * The game draws everything in code and always has, which is why it is 95KB
 * and why an island's shape comes out of its own name. Painted illustration is
 * a different pipeline entirely: raster files, one per subject, made outside
 * the repo and dropped in.
 *
 * Rather than choose, this lets both run at once. Drop a file into
 * `src/art/portraits/` named after the character and that character is painted
 * from then on; every character without one keeps the drawn cameo. Nothing
 * needs registering — the glob below finds whatever is there at build time —
 * so the art can arrive one piece at a time and the game is never broken or
 * half-finished in between.
 *
 * File names are slugs of the subject: `admiral-corvus-blackwater.webp`.
 */

/** Vite inlines these at build time; a missing folder yields an empty object. */
const PORTRAITS = import.meta.glob('../art/portraits/*.{webp,png,jpg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const SHIPS = import.meta.glob('../art/ships/*.{webp,png,jpg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const ISLANDS = import.meta.glob('../art/islands/*.{webp,png,jpg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const SCENES = import.meta.glob('../art/scenes/*.{webp,png,jpg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** The head, cropped square out of the portrait. What the medallion wants: a
 *  three-quarter figure shrunk into a 44px circle is a smudge. */
const FACES = import.meta.glob('../art/faces/*.{webp,png,jpg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const CREATURES = import.meta.glob('../art/creatures/*.{webp,png,jpg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** The chart's own ground. One file, but it goes through the same door as the
 *  rest so the chart keeps working before it arrives. */
const CHART = import.meta.glob('../art/chart/*.{webp,png,jpg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/**
 * A file name from a subject's name. Quotes and punctuation go, because a
 * nickname in quotes should not decide whether a painting is found:
 * `Anselm "Big" Torvik` and `Anselm Big Torvik` are the same person.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/["'’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Index a glob result by slug, ignoring folder and extension. */
function bySlug(files: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, url] of Object.entries(files)) {
    const base = path.split('/').pop()!.replace(/\.[^.]+$/, '');
    out[slugify(base)] = url;
  }
  return out;
}

const PORTRAIT_URLS = bySlug(PORTRAITS);
const SHIP_URLS = bySlug(SHIPS);
const ISLAND_URLS = bySlug(ISLANDS);
const SCENE_URLS = bySlug(SCENES);
const CHART_URLS = bySlug(CHART);
const FACE_URLS = bySlug(FACES);
const CREATURE_URLS = bySlug(CREATURES);

export function paintedPortrait(name: string): string | undefined {
  return PORTRAIT_URLS[slugify(name)];
}

export function paintedShip(role: string): string | undefined {
  return SHIP_URLS[slugify(role)];
}

/**
 * Islands are painted by archetype, not one apiece: a hundred of them cannot
 * each have their own painting, and they do not need one. An island names its
 * archetype and shares that painting with every other island like it.
 */
export function paintedIsland(archetype: string): string | undefined {
  return ISLAND_URLS[slugify(archetype)];
}

export function paintedScene(kind: string): string | undefined {
  return SCENE_URLS[slugify(kind)];
}

export function paintedChart(name: string): string | undefined {
  return CHART_URLS[slugify(name)];
}

/** The head alone. Falls through to the full portrait so a character with one
 *  and not the other still shows a painting rather than a drawn cameo. */
export function paintedFace(name: string): string | undefined {
  return FACE_URLS[slugify(name)] ?? PORTRAIT_URLS[slugify(name)];
}

export function paintedCreature(name: string): string | undefined {
  return CREATURE_URLS[slugify(name)];
}

/** What has arrived so far, for the contact sheet to report honestly. */
export function paintedCounts() {
  return {
    portraits: Object.keys(PORTRAIT_URLS).length,
    ships: Object.keys(SHIP_URLS).length,
    islands: Object.keys(ISLAND_URLS).length,
    scenes: Object.keys(SCENE_URLS).length,
    chart: Object.keys(CHART_URLS).length,
    faces: Object.keys(FACE_URLS).length,
    creatures: Object.keys(CREATURE_URLS).length,
  };
}
