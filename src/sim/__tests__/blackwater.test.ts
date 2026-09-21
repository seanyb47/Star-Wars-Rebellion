import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';

/**
 * The Crown's admiral starts at sea.
 *
 * Sean, 21 September: *"Admiral Corvus should be on the second fleet that's
 * randomly placed."* He is the game's one named sailor, and leaving him ashore
 * among the seven scattered about made the most obviously naval person in the
 * cast a passenger — while the squadron furthest from home, the one that has
 * to make decisions in the first fortnight, had nobody aboard to make them.
 */
describe('Admiral Blackwater', () => {
  it('opens aboard the Crown squadron that is not at the capital', () => {
    for (const seed of [11, 61, 203, 501, 9000]) {
      const state = generateGalaxy(seed, 'empire');
      const him = state.characters.find((c) => c.name.includes('Blackwater'))!;
      expect(him, `seed ${seed}`).toBeTruthy();

      const aboard = state.fleets.find((f) => f.officerIds.includes(him.id));
      expect(aboard, `seed ${seed}: nobody's deck`).toBeTruthy();
      expect(aboard!.faction).toBe('empire');
      // The forward berth, not the seat: that is the whole point of it.
      expect(aboard!.systemId, `seed ${seed}`).not.toBe(state.factions.empire.hqSystemId);
      // And a person on a deck stands where the deck is.
      expect(him.locationSystemId).toBe(aboard!.systemId);
    }
  });

  /**
   * And it is a different island each war, which is why he is on that
   * squadron rather than the Home Fleet: where the Crown's admiral is on day
   * one is something the Confederacy has to find out.
   */
  it('is not always the same island', () => {
    const where = new Set(
      [11, 61, 203, 501, 9000, 9001, 9002, 9003].map((seed) => {
        const state = generateGalaxy(seed, 'empire');
        const him = state.characters.find((c) => c.name.includes('Blackwater'))!;
        return him.locationSystemId;
      }),
    );
    expect(where.size).toBeGreaterThan(1);
  });
});
