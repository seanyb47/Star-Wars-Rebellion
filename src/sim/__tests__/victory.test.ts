import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { checkVictory } from '../advanceDay';
import { PIRATE_LORDS } from '../constants';
import { lords } from '../lords';

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

  it('is won by the Confederacy the day it holds Highwater, and by nothing less', () => {
    const state = generateGalaxy(7, 'alliance');
    // Holding most of the world is not the war.
    for (const s of state.systems) if (s.populated && s.control !== 'empire') s.control = 'alliance';
    checkVictory(state);
    expect(state.winner).toBeUndefined();
    const capital = state.systems.find((s) => s.id === state.factions.empire.hqSystemId)!;
    expect(capital.name).toBe('Highwater');
    capital.control = 'alliance';
    checkVictory(state);
    expect(state.winner).toBe('alliance');
  });

  it('names real people: every Lord is in the cast, aboard their own ship', () => {
    const state = generateGalaxy(3, 'alliance');
    for (const lord of PIRATE_LORDS) {
      const who = state.characters.find((c) => c.name === lord.name)!;
      expect(who, lord.name).toBeDefined();
      const ship = state.fleets.find((f) => f.ships.some((s) => s.classId === lord.ship))!;
      expect(ship, lord.ship).toBeDefined();
      expect(ship.officerIds).toContain(who.id);
    }
  });
});
