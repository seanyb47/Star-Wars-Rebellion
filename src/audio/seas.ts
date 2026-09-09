/**
 * Each Sea sounds like itself.
 *
 * The bed is a small stack of tuned oscillators over filtered noise. These
 * numbers are what make the Crown Sea sound ordered and the Bone Sea sound
 * wrong: the root note, the intervals stacked on it, how far the voices are
 * pulled out of tune with each other, how open the filter is, how long the
 * reverb tail runs, and how often a bell rings out of the dark.
 */
export interface SeaVoice {
  /** Root frequency in Hz. Lower reads as colder and deeper water. */
  root: number;
  /** Ratios stacked over the root. Consonant ratios read as settled. */
  intervals: number[];
  /** Cents of detune between voices. A little warms it; a lot unsettles it. */
  detune: number;
  /** Low-pass cutoff in Hz. Low is muffled and heavy, high is thin and clear. */
  cutoff: number;
  /** Seconds of reverb tail. */
  tail: number;
  /** How loud the sea itself is under the drone, 0-1. */
  swell: number;
  /** Mean seconds between bells. Higher is emptier. */
  bellEvery: number;
  /** Bell pitch in Hz. */
  bell: number;
}

const CROWN: SeaVoice = {
  root: 110, intervals: [1, 1.5, 2], detune: 4,
  cutoff: 620, tail: 3.2, swell: 0.22, bellEvery: 26, bell: 660,
};

export const SEA_VOICES: Record<string, SeaVoice> = {
  // Inner Seas: ordered, warm, consonant.
  'The Crown Sea': CROWN,
  'The Merchant Sea': {
    root: 123.5, intervals: [1, 1.25, 1.5], detune: 6,
    cutoff: 780, tail: 2.6, swell: 0.24, bellEvery: 22, bell: 740,
  },
  'The Amber Sea': {
    root: 146.8, intervals: [1, 1.25, 2], detune: 7,
    cutoff: 900, tail: 2.2, swell: 0.3, bellEvery: 19, bell: 880,
  },

  // Outer Seas: colder, stranger, emptier.
  'The Far Sea': {
    root: 82.4, intervals: [1, 1.5, 3], detune: 3,
    cutoff: 420, tail: 4.5, swell: 0.34, bellEvery: 34, bell: 494,
  },
  'The Sea of Storms': {
    root: 98, intervals: [1, 1.2, 1.5, 1.8], detune: 12,
    cutoff: 1100, tail: 2.0, swell: 0.46, bellEvery: 16, bell: 587,
  },
  // Water that holds sound for miles: thin, still, enormous tail.
  'The Glass Sea': {
    root: 196, intervals: [1, 2, 3], detune: 2,
    cutoff: 1600, tail: 8, swell: 0.08, bellEvery: 40, bell: 1175,
  },
  // Detuned by a semitone against itself, so it never quite settles.
  'The Bone Sea': {
    root: 92.5, intervals: [1, 1.0595, 1.5], detune: 22,
    cutoff: 500, tail: 5.5, swell: 0.3, bellEvery: 30, bell: 415,
  },
};

export function voiceFor(sea: string | null): SeaVoice {
  return (sea && SEA_VOICES[sea]) || CROWN;
}
