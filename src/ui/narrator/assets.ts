/**
 * Where the narrator's pictures live, and which of them exist.
 *
 * Everything under `public/narrator/` is served verbatim, so a URL is just
 * the base path plus the file's name — and the names are fixed by the plan
 * (docs/narrator-build.md, D5). The stills are always there and carry the
 * whole performance: speaking is a gesture done in CSS, per mood. An idle
 * clip is optional polish; the sheet probes for one and falls back to the
 * still, so nothing here assumes a clip exists.
 */
import { NARRATOR_IDS, NARRATOR_MOODS, type NarratorId, type NarratorMood } from './mood';

const BASE = `${import.meta.env.BASE_URL}narrator/`;

/** The 512×640 web copy of a still, made by `npm run narrator:web`. */
export const stillUrl = (id: NarratorId, mood: NarratorMood) =>
  `${BASE}stills/web/${id}_${mood}.webp`;

/** The tab-bar crop of a mood still: same box on all three, so only the face changes. */
export const tabUrl = (id: NarratorId, mood: NarratorMood = 'neutral') =>
  `${BASE}stills/web/${id}_tab_${mood}.webp`;

export const idleUrl = (id: NarratorId, mood: NarratorMood) =>
  `${BASE}video/${id}_${mood}_idle.mp4`;

/** Every clip the plan allows for, whether or not it has been made yet. */
export function allClipUrls(id: NarratorId): string[] {
  return NARRATOR_MOODS.map((m) => idleUrl(id, m));
}

const probed = new Map<string, Promise<boolean>>();

/**
 * Whether a clip is actually on the server. Asked once per URL per session;
 * a missing file is a plain 404 on GitHub Pages and on `vite preview`. The
 * dev server answers a missing public file with a 404 too, as long as the
 * request is not asking for HTML — which a fetch is not.
 */
export function clipExists(url: string): Promise<boolean> {
  let p = probed.get(url);
  if (!p) {
    p = fetch(url, { method: 'HEAD' })
      .then((r) => r.ok && (r.headers.get('content-type') ?? '').startsWith('video/'))
      .catch(() => false);
    probed.set(url, p);
  }
  return p;
}

/**
 * Warm the browser's cache for every clip that exists (plan F5), so the first
 * mood change does not stall on a download. Runs in the background; nothing
 * waits on it.
 */
export function preloadClips(id: NarratorId): void {
  for (const url of allClipUrls(id)) {
    void clipExists(url).then((ok) => {
      if (ok) void fetch(url, { cache: 'force-cache' }).catch(() => undefined);
    });
  }
}

export const narratorIdFor = (faction: 'empire' | 'alliance'): NarratorId =>
  faction === 'empire' ? NARRATOR_IDS[0] : NARRATOR_IDS[1];
