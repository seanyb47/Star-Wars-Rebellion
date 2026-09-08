/**
 * Seeded RNG (mulberry32). Deterministic: the same seed always produces the
 * same stream, which is what makes the simulation tests reproducible.
 *
 * The generator carries its seed forward in `seed`; callers write that back
 * into `GameState.rngSeed` when they are done with a tick.
 */
export interface Rng {
  /** Current seed, advanced by every draw. */
  seed: number;
  /** Uniform float in [0, 1). */
  next(): number;
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Integer in [min, max] inclusive. */
  range(min: number, max: number): number;
  /** True with probability `p`. */
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Fisher-Yates copy; leaves the input untouched. */
  shuffle<T>(items: readonly T[]): T[];
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const rng: Rng = {
    get seed() {
      return s;
    },
    set seed(value: number) {
      s = value >>> 0;
    },
    next() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(maxExclusive) {
      return Math.floor(rng.next() * maxExclusive);
    },
    range(min, max) {
      return min + Math.floor(rng.next() * (max - min + 1));
    },
    chance(p) {
      return rng.next() < p;
    },
    pick(items) {
      return items[rng.int(items.length)];
    },
    shuffle(items) {
      const copy = items.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
  return rng;
}
