/**
 * The one background bed.
 *
 * An earlier version gave each of the seven Seas its own tuning and retuned as
 * you panned the chart. It was a nice idea and wrong in practice: a player
 * moves around the map and opens and closes panels constantly, so the sound
 * lurched every few seconds instead of sitting under the game. Background
 * music has to stay in the background.
 *
 * These numbers are therefore chosen to be heard for an hour without being
 * noticed: low, consonant, slow, and sparing with the bell.
 */
export interface BedVoice {
  /** Root frequency in Hz. Low reads as deep, cold water. */
  root: number;
  /** Ratios stacked over the root. Consonant, so it never demands attention. */
  intervals: number[];
  /** Cents of detune between voices — just enough to keep it from sounding synthetic. */
  detune: number;
  /** Low-pass cutoff in Hz. Muffled, like sound over water. */
  cutoff: number;
  /** Seconds of reverb tail. */
  tail: number;
  /** How loud the sea is under the drone, 0-1. */
  swell: number;
  /** Mean seconds between bells. Deliberately long: this plays for hours. */
  bellEvery: number;
  /** Bell pitch in Hz. */
  bell: number;
}

export const BED: BedVoice = {
  root: 110,
  intervals: [1, 1.5, 2],
  detune: 5,
  cutoff: 560,
  tail: 4.5,
  swell: 0.26,
  bellEvery: 40,
  bell: 660,
};
