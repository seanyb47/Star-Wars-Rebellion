import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { checkVictory } from '../advanceDay';
import { LEADERS } from '../constants';

describe('how the war ends', () => {
  it('is won by taking the enemy seat while both their leaders are in irons', () => {
    const state = generateGalaxy(501, 'empire');
    const seat = state.systems.find((s) => s.id === state.factions.alliance.hqSystemId)!;
    const heads = LEADERS.alliance.map((n) => state.characters.find((c) => c.name === n)!);
    expect(heads.every(Boolean)).toBe(true);

    // The seat alone is not enough.
    seat.control = 'empire';
    checkVictory(state);
    expect(state.winner).toBeUndefined();

    // One leader is not enough.
    heads[0].status = 'captured';
    checkVictory(state);
    expect(state.winner).toBeUndefined();

    // Both, and the seat: the war is over.
    heads[1].status = 'captured';
    checkVictory(state);
    expect(state.winner).toBe('empire');
    expect(state.speed).toBe('paused');
    expect(state.events.at(-1)!.kind).toBe('war');
  });

  it('needs the seat as well as the people — a raid is not a war', () => {
    const state = generateGalaxy(501, 'empire');
    for (const n of LEADERS.alliance) state.characters.find((c) => c.name === n)!.status = 'captured';
    checkVictory(state);
    expect(state.winner).toBeUndefined();
  });

  it('cuts both ways, and names real people on both sides', () => {
    const state = generateGalaxy(7, 'alliance');
    for (const f of ['empire', 'alliance'] as const) {
      for (const n of LEADERS[f]) expect(state.characters.some((c) => c.name === n), n).toBe(true);
    }
    const seat = state.systems.find((s) => s.id === state.factions.empire.hqSystemId)!;
    seat.control = 'alliance';
    for (const n of LEADERS.empire) state.characters.find((c) => c.name === n)!.status = 'captured';
    checkVictory(state);
    expect(state.winner).toBe('alliance');
  });
});
