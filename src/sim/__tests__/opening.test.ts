import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { START_ISLANDS_PER_SIDE } from '../galaxy';
import { CORALHOME, CORAL_REACH, MIRE_REACH, SUNKEN_REACH } from '../constants';
import type { GameState, PlayableFaction } from '../types';

/**
 * The hand each side is dealt, and it is a hand rather than a range.
 *
 * Sean, 25 September: *"Total each side gets 6 only. Exactly."* Before this it
 * was ten against eight or nine — the Crown three in Sovereign, two a side in
 * each of three contested Reaches, Coralhome by name on top, and the
 * Confederacy one or two in Sovereign plus Freeport. Measured over eight
 * seeds: Crown 10 every time, Confederacy 8 or 9. Two sides holding a fifth of
 * the world between them before anybody sailed, with the Crown two islands up.
 *
 * | | Sovereign | Coral | Mire + Sunken | Freeport | total |
 * |---|---|---|---|---|---|
 * | Crown | 3 | 1, always Coralhome | 2 | — | **6** |
 * | Confederacy | 2 | 1 | 2 | 1 | **6** |
 *
 * Twenty seeds rather than a handful, because the Mire/Sunken split is rolled
 * per side and the failure this guards against is a rare one — a Reach running
 * short of neutral islands and a side quietly getting five.
 */
const SEEDS = [3, 11, 17, 55, 101, 203, 307, 501, 613, 777, 911, 1234, 2000, 3141, 4096, 5000, 6180, 7777, 9000, 12345];

const held = (s: GameState, f: PlayableFaction) => s.systems.filter((x) => x.control === f);
const inReach = (s: GameState, f: PlayableFaction, reach: string) =>
  held(s, f).filter((x) => s.sectors.find((r) => r.id === x.sectorId)?.name === reach);

describe('the opening deals each side six islands', () => {
  it('exactly six, both sides, every seed', () => {
    for (const seed of SEEDS) {
      const s = generateGalaxy(seed, 'empire');
      for (const f of ['empire', 'alliance'] as const) {
        expect(held(s, f).length, `${f} on seed ${seed}`).toBe(START_ISLANDS_PER_SIDE);
      }
    }
  });

  it('gives the Crown three in Sovereign and the Confederacy two', () => {
    for (const seed of SEEDS) {
      const s = generateGalaxy(seed, 'empire');
      const sovereign = s.sectors.find((r) => r.systemIds.length > 0 && inReach(s, 'empire', r.name).length > 0);
      expect(sovereign, `seed ${seed} has no Crown Reach`).toBeTruthy();
      expect(inReach(s, 'empire', 'Sovereign Reach').length, `Crown Sovereign, seed ${seed}`).toBe(3);
      expect(inReach(s, 'alliance', 'Sovereign Reach').length, `Confederacy Sovereign, seed ${seed}`).toBe(2);
    }
  });

  it('gives the Crown exactly Coralhome in Coral, and the Confederacy one', () => {
    for (const seed of SEEDS) {
      const s = generateGalaxy(seed, 'empire');
      const crown = inReach(s, 'empire', CORAL_REACH);
      expect(crown.length, `Crown Coral, seed ${seed}`).toBe(1);
      expect(crown[0].name, `Crown's Coral island, seed ${seed}`).toBe(CORALHOME);
      expect(inReach(s, 'alliance', CORAL_REACH).length, `Confederacy Coral, seed ${seed}`).toBe(1);
    }
  });

  it('splits two a side across Mire and Sunken, nought to two in either', () => {
    const shapes = new Set<string>();
    for (const seed of SEEDS) {
      const s = generateGalaxy(seed, 'empire');
      for (const f of ['empire', 'alliance'] as const) {
        const mire = inReach(s, f, MIRE_REACH).length;
        const sunken = inReach(s, f, SUNKEN_REACH).length;
        expect(mire + sunken, `${f} outer total, seed ${seed}`).toBe(2);
        expect(mire).toBeGreaterThanOrEqual(0);
        expect(mire).toBeLessThanOrEqual(2);
        shapes.add(`${f}:${mire}-${sunken}`);
      }
    }
    // All three splits should actually turn up across twenty seeds, or the
    // roll is not doing what the table says it does.
    for (const shape of ['2-0', '1-1', '0-2']) {
      expect(
        [...shapes].some((x) => x.endsWith(shape)),
        `no war in twenty seeds split ${shape} across Mire and Sunken`,
      ).toBe(true);
    }
  });

  it('gives the Confederacy Freeport, outside the four dealt Reaches', () => {
    for (const seed of SEEDS) {
      const s = generateGalaxy(seed, 'empire');
      const freeport = held(s, 'alliance').find((x) => x.name === 'Freeport');
      expect(freeport, `seed ${seed} dealt no Freeport`).toBeTruthy();
      const reach = s.sectors.find((r) => r.id === freeport!.sectorId)!.name;
      expect([CORAL_REACH, MIRE_REACH, SUNKEN_REACH, 'Sovereign Reach']).not.toContain(reach);
    }
  });
});
