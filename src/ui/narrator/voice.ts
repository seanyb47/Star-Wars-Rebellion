/**
 * The advisor saying what just happened.
 *
 * Sean, 22 September: *"Can you add sound effects for each notification? And
 * voice also."* The sounds were already there — the audio engine has had a
 * stinger per kind since it was built. The voice is this: a recording of
 * Marlow or Pennywhistle for that kind of news, played over the stinger.
 *
 * Three rules, and they are all about not being annoying:
 *
 * 1. **One voice at a time.** A busy fortnight can land four kinds of news in
 *    one tick. The advisor says the first and the rest are the log's business;
 *    two recordings over each other is somebody talking in a pub.
 * 2. **Never the same line twice running.** Each kind has more than one
 *    recording and the last one played is remembered, so the same sentence
 *    does not come round on consecutive battles.
 * 3. **Silence is a valid answer.** A kind with no recording says nothing and
 *    costs nothing: the manifest is read once, a missing file is never
 *    requested twice, and nothing anywhere waits on audio.
 *
 * The recordings are made by `scripts/render_voicelines.py` off
 * `public/narrator/voicelines.json`, which is the list of what is to be said.
 * Until the voice settings in the world bible are filled in, that renders
 * nothing and this plays nothing — by design, and without a single error in
 * the console.
 */
import type { EventKind } from '../../sim';
import type { NarratorId } from './mood';

const BASE = `${import.meta.env.BASE_URL}narrator/`;

interface VoiceLine {
  id: string;
  character: NarratorId;
  mood: string;
  /** What makes this line play: an advisor's question, or a kind of news. */
  question: string;
  text: string;
  rendered?: boolean;
}

let manifest: Promise<VoiceLine[]> | null = null;

/** The list of lines, fetched once. A missing or broken manifest is no lines. */
function lines(): Promise<VoiceLine[]> {
  if (!manifest) {
    manifest = fetch(`${BASE}voicelines.json`)
      .then((r) => (r.ok ? (r.json() as Promise<VoiceLine[]>) : []))
      .then((all) => (Array.isArray(all) ? all : []))
      .catch(() => []);
  }
  return manifest;
}

/**
 * Whether a recording is actually on the server.
 *
 * The same trap as the idle clips (`assets.ts`): a single-page app answers a
 * missing file with **200 and an HTML document**, not a 404, so `r.ok` alone
 * would hand an index page to an `<audio>` element. The content type is the
 * only test doing any work. Asked once per URL per session.
 */
const probed = new Map<string, Promise<boolean>>();
function clipExists(url: string): Promise<boolean> {
  let p = probed.get(url);
  if (!p) {
    p = fetch(url, { method: 'HEAD' })
      .then((r) => r.ok && (r.headers.get('content-type') ?? '').startsWith('audio/'))
      .catch(() => false);
    probed.set(url, p);
  }
  return p;
}

/** Which line was used last for each kind, so the next one is a different one. */
const lastUsed = new Map<string, string>();

/**
 * Pick the line to play: one the advisor has a recording of, and not the one
 * they said last time. Exported for the test — the choosing is the part with
 * a rule in it, and it should not need an AudioContext to check.
 */
export function chooseLine(
  all: VoiceLine[],
  who: NarratorId,
  kind: EventKind,
  last: string | undefined,
): VoiceLine | null {
  // `news_` on purpose: `war` is both a kind of news and one of the questions
  // the advisor's own sheet answers, and an unprefixed match would have her
  // answering "how is the war going" every time a war ended.
  const cue = `news_${kind}`;
  const mine = all.filter((l) => l.character === who && l.question === cue && l.rendered);
  if (mine.length === 0) return null;
  const fresh = mine.filter((l) => l.id !== last);
  const pool = fresh.length > 0 ? fresh : mine;
  return pool[Math.floor(Math.random() * pool.length)];
}

let playing: HTMLAudioElement | null = null;

/**
 * Say the news, if there is anything recorded to say and nobody is talking.
 *
 * Fire and forget: the caller is a React effect reacting to the day's events
 * and has nothing useful to do with a promise. Every failure — no manifest, no
 * recording, a browser that refuses to play without a gesture — ends as
 * silence rather than an exception.
 */
export function speak(who: NarratorId, kind: EventKind, volume = 0.9): void {
  if (playing && !playing.ended) return;
  void lines().then(async (all) => {
    const line = chooseLine(all, who, kind, lastUsed.get(`${who}/${kind}`));
    if (!line) return;
    const url = `${BASE}audio/${line.id}.mp3`;
    if (!(await clipExists(url))) return;
    if (playing && !playing.ended) return;
    const audio = new Audio(url);
    audio.volume = volume;
    playing = audio;
    lastUsed.set(`${who}/${kind}`, line.id);
    audio.addEventListener('ended', () => {
      if (playing === audio) playing = null;
    });
    // A browser that has not had its gesture yet rejects here; that is the
    // speaker button's problem, not this function's.
    void audio.play().catch(() => {
      if (playing === audio) playing = null;
    });
  });
}

/** Stop whatever is being said. Used when sound is switched off mid-sentence. */
export function hushVoice(): void {
  if (!playing) return;
  playing.pause();
  playing = null;
}
