/**
 * The score, when there is one.
 *
 * Everything else the game makes noise with is synthesised — oscillators,
 * filtered noise, an impulse response built at startup — so the whole thing
 * installs and plays offline. Music is the one thing that cannot be, so it is
 * kept separate and treated as optional: drop a file into `src/audio/music/`
 * named after a faction and that side's theme plays. With no files the game
 * sounds exactly as it does now.
 *
 * Naming, the same slug rule as the art:
 *
 *   music/empire.opus          the Crown Imperium's theme
 *   music/alliance.opus        the Free Confederacy's
 *   music/empire-intro.opus    optional: played once, then the loop
 *
 * Any format the browser can decode. Opus in .ogg or AAC in .m4a are both
 * small and both play everywhere this game runs; a raw .wav will work and will
 * be thirty times the size.
 */

const FILES = import.meta.glob('./music/*.{opus,ogg,m4a,mp3,aac,wav}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const BY_NAME: Record<string, string> = {};
for (const [path, url] of Object.entries(FILES)) {
  BY_NAME[path.split('/').pop()!.replace(/\.[^.]+$/, '').toLowerCase()] = url;
}

export function themeUrl(faction: string): string | undefined {
  return BY_NAME[faction.toLowerCase()];
}
export function introUrl(faction: string): string | undefined {
  return BY_NAME[`${faction.toLowerCase()}-intro`];
}
export function hasMusic(): boolean {
  return Object.keys(BY_NAME).length > 0;
}

/**
 * Where a track can be looped without a seam.
 *
 * A theme written as a piece of music ends; looped whole it thuds every time
 * it wraps. Rather than send the composer back, this looks for the point late
 * in the track whose sound best matches a point early in it, and loops between
 * the two — which is what a musician would pick by ear.
 *
 * The comparison is on a coarse energy envelope rather than the samples: two
 * musically identical bars are never sample-identical, and correlating raw
 * audio finds phase, not phrase. Sixteen buckets a second is enough to tell
 * one bar from another and cheap enough to run over a four-minute track.
 *
 * Returns null when nothing matches well, and the caller loops the whole file
 * — a seam is better than a loop that lands mid-phrase.
 */
export function findLoop(buffer: AudioBuffer): { start: number; end: number } | null {
  const RATE = 16;
  const data = buffer.getChannelData(0);
  const step = Math.floor(buffer.sampleRate / RATE);
  const n = Math.floor(data.length / step);
  if (n < RATE * 20) return null; // under twenty seconds: not worth it

  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = i * step; j < (i + 1) * step; j += 8) sum += data[j] * data[j];
    env[i] = Math.sqrt(sum / (step / 8));
  }

  // Skip an intro: start the loop after the first eighth, where a piece has
  // usually arrived at its own material.
  const from = Math.floor(n * 0.12);
  const window = RATE * 4; // four seconds of context
  const earliestEnd = from + RATE * 20;
  let best = { at: -1, score: Infinity };
  for (let end = Math.max(earliestEnd, Math.floor(n * 0.55)); end < n - 2; end++) {
    let diff = 0;
    for (let k = 0; k < window; k++) {
      const a = env[from + k];
      const b = env[end - window + k];
      diff += Math.abs(a - b);
    }
    diff /= window;
    if (diff < best.score) best = { at: end, score: diff };
  }
  // The scale is RMS amplitude, so the threshold is a fraction of the track's
  // own loudness rather than an absolute number.
  const loudness = env.reduce((t, v) => t + v, 0) / n;
  if (best.at < 0 || best.score > loudness * 0.22) return null;
  return { start: from / RATE, end: best.at / RATE };
}
