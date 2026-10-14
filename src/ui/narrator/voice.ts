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
  return pickFrom(all.filter((l) => l.rendered), who, kind, last);
}

/**
 * The same pick, over the lines whether or not anybody has recorded them.
 *
 * This is what the read-aloud fallback below uses: the text is written and
 * checked into the repo, so it can be said long before it can be played.
 */
export function chooseWritten(
  all: VoiceLine[],
  who: NarratorId,
  kind: EventKind,
  last: string | undefined,
): VoiceLine | null {
  return pickFrom(all, who, kind, last);
}

function pickFrom(
  all: VoiceLine[],
  who: NarratorId,
  kind: EventKind,
  last: string | undefined,
): VoiceLine | null {
  // `news_` on purpose: `war` is both a kind of news and one of the questions
  // the advisor's own sheet answers, and an unprefixed match would have her
  // answering "how is the war going" every time a war ended.
  const cue = `news_${kind}`;
  const mine = all.filter((l) => l.character === who && l.question === cue);
  if (mine.length === 0) return null;
  const fresh = mine.filter((l) => l.id !== last);
  const pool = fresh.length > 0 ? fresh : mine;
  return pool[Math.floor(Math.random() * pool.length)];
}

let playing: HTMLAudioElement | null = null;

/**
 * The read-aloud stand-in, so the advisor is not mute while the booth is empty.
 *
 * Sean, 23 September: *"I don't hear narrator voice."* He was right, and the
 * reason was not a bug: the manifest is written, the player works, and every
 * line is `rendered: false` because no recording has been made — the voice
 * settings in the world bible are still blank and there is no key to render
 * with. Correct behaviour, and completely indistinguishable from broken.
 *
 * So the browser reads the line instead. It is the same sentence from the
 * same manifest, picked by the same rule; only the throat is different. The
 * moment a real recording lands in `public/narrator/audio/`, `speak` below
 * prefers it and this is never reached again — nothing has to be unwired.
 *
 * The two advisors get different pitch and pace so they are still two people
 * on a phone speaker with one system voice installed, and a named voice is
 * chosen per advisor when the device has more than one going.
 */
const SPEECH: Record<NarratorId, { pitch: number; rate: number }> = {
  marlow: { pitch: 0.85, rate: 0.92 },
  pennywhistle: { pitch: 1.15, rate: 1.0 },
};

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

/** A steady voice per advisor: the same device always gives them the same one. */
function voiceFor(who: NarratorId, api: SpeechSynthesis): SpeechSynthesisVoice | null {
  const all = api.getVoices().filter((v) => v.lang.startsWith('en'));
  // getVoices() is empty until the list loads on some browsers; that is fine,
  // an unset `voice` means the system default, which still speaks.
  if (all.length === 0) return null;
  const seat = who === 'marlow' ? 0 : 1 % all.length;
  return all[seat] ?? all[0];
}

function readAloud(who: NarratorId, text: string, volume: number): boolean {
  const api = synth();
  if (!api) return false;
  if (api.speaking || api.pending) return false;
  const say = new SpeechSynthesisUtterance(text);
  const tone = SPEECH[who];
  say.pitch = tone.pitch;
  say.rate = tone.rate;
  say.volume = volume;
  const v = voiceFor(who, api);
  if (v) say.voice = v;
  try {
    api.speak(say);
  } catch {
    return false;
  }
  return true;
}

/**
 * Say the news, if there is anything to say and nobody is talking.
 *
 * Fire and forget: the caller is a React effect reacting to the day's events
 * and has nothing useful to do with a promise. Every failure — no manifest, no
 * recording, a browser that refuses to play without a gesture — ends as
 * silence rather than an exception.
 *
 * A real recording wins. Only when there is none does the browser read the
 * written line, which is the whole of the difference between the shipped game
 * and the game after `npm run voices`.
 */
export function speak(who: NarratorId, kind: EventKind, volume = 0.9): void {
  if (playing && !playing.ended) return;
  if (synth()?.speaking) return;
  void lines().then(async (all) => {
    const seat = `${who}/${kind}`;
    const recorded = chooseLine(all, who, kind, lastUsed.get(seat));
    if (recorded) {
      const url = `${BASE}audio/${recorded.id}.mp3`;
      if (await clipExists(url)) {
        if (playing && !playing.ended) return;
        const audio = new Audio(url);
        audio.volume = volume;
        playing = audio;
        lastUsed.set(seat, recorded.id);
        audio.addEventListener('ended', () => {
          if (playing === audio) playing = null;
        });
        // A browser that has not had its gesture yet rejects here; that is the
        // speaker button's problem, not this function's.
        void audio.play().catch(() => {
          if (playing === audio) playing = null;
        });
        return;
      }
    }
    const written = chooseWritten(all, who, kind, lastUsed.get(seat));
    if (written && readAloud(who, written.text, volume)) lastUsed.set(seat, written.id);
  });
}

/** Stop whatever is being said. Used when sound is switched off mid-sentence. */
export function hushVoice(): void {
  synth()?.cancel();
  if (!playing) return;
  playing.pause();
  playing = null;
}
