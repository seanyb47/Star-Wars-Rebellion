/**
 * A theme for each side, written out as notes and played by the browser.
 *
 * The synthesised bed is weather — it has no key, no pulse and nothing to
 * remember, and played on its own for an hour it is a hum however carefully it
 * is tuned. This is the other thing: an actual piece, with a progression, a
 * melody and a beat, scheduled a bar at a time out of the same AudioContext.
 *
 * It is written here as data rather than recorded as audio for the reason
 * everything else in this game is synthesised — the whole thing installs and
 * plays with no signal, and a pair of theme files is several megabytes. It is
 * also the only version that can duck, key-change and stop on a dime. If a
 * real recording is dropped into `src/audio/music/`, that wins and this stands
 * down; see music.ts.
 */

/** MIDI note to hertz. Middle C is 60, A440 is 69. */
export function hz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** One note: where in the bar it starts, what it is, how long it holds. */
export type Note = [beat: number, midi: number, beats: number];

export interface Theme {
  /** Slow. This plays under a strategy game for hours, not over a trailer. */
  bpm: number;
  /**
   * Chords as MIDI notes, lowest first — the first is the bass, the rest are
   * the pad. Two bars each, so four chords is an eight-bar turn.
   */
  chords: number[][];
  /** Eight bars of melody, one entry per bar. An empty bar is a rest, and the
   *  rests are load-bearing: a line that never stops is a line you stop
   *  hearing. */
  melody: Note[][];
  /** Which chord tones the pluck picks out, as beat and index into the chord
   *  (indices past the end wrap up an octave). One bar, repeated. */
  pluck: Array<[beat: number, tone: number]>;
  /** Where the drum falls, and how hard. */
  drum: Array<[beat: number, force: number]>;
  /** Cutoff for the pad, in hertz. Lower is further away. */
  padCutoff: number;
  /** Lead timbre: how much of the second harmonic is mixed in. */
  leadEdge: number;
}

/**
 * The Crown Imperium — D minor, i-VI-III-VII, and slow enough to be ceremony.
 *
 * No leading tone anywhere: the seventh stays flat, which is what keeps it
 * modal and old rather than classical and resolved. An empire that thinks it
 * has always been here does not need to resolve.
 */
const CROWN: Theme = {
  bpm: 56,
  chords: [
    [50, 62, 65, 69], // Dm
    [46, 58, 62, 65], // Bb
    [53, 65, 69, 72], // F
    [48, 60, 64, 67], // C
  ],
  melody: [
    [[0, 69, 2], [2, 74, 2]],
    [[0, 72, 1], [1, 70, 3]],
    [[0, 69, 3.5]],
    [],
    [[0, 65, 2], [2, 69, 2]],
    [[0, 72, 3]],
    [[0, 74, 1], [1, 72, 1], [2, 70, 2]],
    [[0, 69, 3.5]],
  ],
  /* Struck on every beat. An earlier pattern skipped beats 1 and 2 for a
     looser, more ambient feel, and it measured with no detectable pulse at all
     — onset autocorrelation flat at the beat, which is the definition of the
     drone we were trying to get away from. Stately wants a steady tread; it is
     the tempo that makes it ceremony rather than weather. */
  pluck: [
    [0, 0],
    [1, 2],
    [1.5, 3],
    [2, 1],
    [3, 2],
    [3.5, 4],
  ],
  drum: [
    [0, 1],
    [2, 0.62],
  ],
  padCutoff: 900,
  leadEdge: 0.18,
};

/**
 * The Free Confederacy — A minor over the Andalusian fall, Am-G-F-E.
 *
 * The same four chords as every sea song ever sung, because that is the point:
 * this side is folk music and the other is a state occasion. The major E at the
 * turn is the one bright chord in it, and the melody takes the G sharp with it.
 */
const CONFEDERACY: Theme = {
  bpm: 74,
  chords: [
    [45, 57, 60, 64], // Am
    [43, 55, 59, 62], // G
    [41, 53, 57, 60], // F
    [40, 52, 56, 59], // E major
  ],
  melody: [
    [[0, 81, 1], [1, 79, 1], [2, 77, 2]],
    [[0, 76, 3]],
    [[0, 79, 1], [1, 77, 1], [2, 76, 2]],
    [],
    [[0, 77, 1], [1, 76, 1], [2, 74, 2]],
    [[0, 72, 3]],
    [[0, 71, 1], [1, 72, 1], [2, 80, 2]],
    [[0, 76, 3.5]],
  ],
  pluck: [
    [0, 0],
    [0.5, 2],
    [1, 1],
    [1.5, 3],
    [2, 2],
    [2.5, 4],
    [3, 1],
    [3.5, 3],
  ],
  drum: [
    [0, 1],
    [1.5, 0.4],
    [2, 0.7],
    [3, 0.45],
  ],
  padCutoff: 1250,
  leadEdge: 0.3,
};

export const THEMES: Record<string, Theme> = {
  empire: CROWN,
  alliance: CONFEDERACY,
};

/** Bars in a turn of the whole thing. Two bars a chord, four chords. */
export const PHRASE_BARS = 8;

/**
 * Whether the lead plays over this turn of the phrase.
 *
 * Three turns with the melody, one without. A theme that never lets go of its
 * tune is the reason game music gets muted, and the bar where it drops out is
 * the bar you notice the sea again.
 */
export function leadPlays(turn: number): boolean {
  return turn % 4 !== 3;
}
