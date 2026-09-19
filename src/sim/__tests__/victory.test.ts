import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { advanceDay, checkVictory } from '../advanceDay';
import { PIRATE_LORDS } from '../constants';
import { lords, powerOf } from '../lords';

describe('how the war ends', () => {
  it('is won by the Crown when all three Pirate Lords are in irons at once', () => {
    const state = generateGalaxy(501, 'empire');
    const heads = lords(state);
    expect(heads).toHaveLength(PIRATE_LORDS.length);

    // Two are not enough.
    heads[0].status = 'captured';
    heads[1].status = 'captured';
    checkVictory(state);
    expect(state.winner).toBeUndefined();

    // Three, together: the war is over.
    heads[2].status = 'captured';
    checkVictory(state);
    expect(state.winner).toBe('empire');
    expect(state.speed).toBe('paused');
    expect(state.events.at(-1)!.kind).toBe('war');
  });

  it('is won by the Confederacy the day it holds the Aldermain, and by nothing less', () => {
    const state = generateGalaxy(7, 'alliance');
    // Holding most of the world is not the war.
    for (const s of state.systems) if (s.populated && s.control !== 'empire') s.control = 'alliance';
    checkVictory(state);
    expect(state.winner).toBeUndefined();
    const capital = state.systems.find((s) => s.id === state.factions.empire.hqSystemId)!;
    expect(capital.name).toBe('The Aldermain');
    capital.control = 'alliance';
    checkVictory(state);
    expect(state.winner).toBe('alliance');
  });

  /**
   * Sean: *"effectively capturing all islands means you captured all lords."*
   * It did not, and the gap was a war nobody could end — seed 11021 ran to
   * day 2,301 with the Crown holding all sixty-three islands in the world and
   * two Lords still walking about on them stirring up revolts.
   */
  it('gives the landless nowhere to stand, which is how a finished war finishes', () => {
    const state = generateGalaxy(501, 'empire');
    // The Crown has taken the world. Every populated island, every outpost.
    for (const s of state.systems) if (s.control === 'alliance') s.control = 'empire';
    // Their people are still at large, standing on Crown ground.
    const theirs = state.characters.filter((c) => c.faction === 'alliance');
    for (const c of theirs) {
      c.status = 'available';
      c.mission = undefined;
      c.locationSystemId = state.factions.empire.hqSystemId;
    }
    expect(theirs.length).toBeGreaterThan(0);
    const end = advanceDay(state);
    for (const c of end.characters.filter((c) => c.faction === 'alliance')) {
      expect(c.status, c.name).toBe('captured');
    }
    expect(end.winner).toBe('empire');
  });

  it('names real people: every Lord is in the cast, ashore, with a power of their own', () => {
    const state = generateGalaxy(3, 'alliance');
    const powers = new Set<string>();
    for (const lord of PIRATE_LORDS) {
      const who = state.characters.find((c) => c.name === lord.name);
      expect(who, lord.name).toBeDefined();
      expect(who!.faction).toBe('alliance');
      // Ashore, not aboard. The losing condition is a manhunt now, not a
      // search for three hulls.
      expect(state.fleets.some((f) => f.officerIds.includes(who!.id))).toBe(false);
      // Each brings something the other two do not.
      expect(powerOf(who!)).toBe(lord.power);
      powers.add(lord.power);
    }
    expect(powers.size).toBe(PIRATE_LORDS.length);
  });
});
