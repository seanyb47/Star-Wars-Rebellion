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
  /**
   * Level per voice, matching `intervals`.
   *
   * These used to be 0.3 / (index + 1), which put the drone well over the sea
   * and produced exactly what it sounds like: a hum. The drone is now a floor
   * under the water rather than the thing you hear.
   */
  levels: number[];
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
  /**
   * Chords the upper two voices wander between, as ratios over the root.
   *
   * Three sustained oscillators that never change are a hum however well they
   * are tuned. Moving them slowly between consonant positions is the whole
   * difference between a drone and something that sounds alive; the root stays
   * put so the movement is harmonic rather than a key change.
   */
  chords: number[][];
  /** Mean seconds between drifts. */
  driftEvery: number;
  /** Seconds a drift takes to arrive. Long enough that you notice it has moved, never that it moved. */
  driftGlide: number;
}

export const BED: BedVoice = {
  root: 110,
  intervals: [1, 1.5, 2],
  levels: [0.12, 0.065, 0.045],
  detune: 5,
  cutoff: 560,
  tail: 4.5,
  swell: 0.26,
  bellEvery: 40,
  bell: 660,
  chords: [
    [1.5, 2],      // open fifth and octave — home
    [1.3348, 2],   // fourth
    [1.5, 2.4],    // minor third over the octave
    [1.2, 1.5],    // minor triad, closed up
    [1.5, 2.5],    // major third over the octave
    [1.3348, 1.8], // suspended, unresolved
  ],
  driftEvery: 38,
  driftGlide: 12,
};
