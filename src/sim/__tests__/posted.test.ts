import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { commandingAt, isFreeCrew } from '../missions';
import { layerMark } from '../layers';
import type { Character, GameState } from '../types';

/**
 * Somebody holding an island is posted, not free.
 *
 * Sean, 24 September: *"When I assign a commander to an island it doesn't
 * reduce the filter for available crew. He isn't available now bc he's on a
 * mission commanding."*
 *
 * The cause is worth pinning as well as the symptom. Command is stored on the
 * **island** (`system.commanderId`), and every screen that asked *is this one
 * free* asked the **person** — `status === 'available'` and no mission — both
 * of which a commander still answers yes to, because holding a place is not a
 * mission and does not change a status. The character sheet was printing the
 * contradiction in one screen: a green *Available* badge over a paragraph
 * saying they were not available for anything else.
 *
 * The AI never had the bug — it keeps a `posted` set and filters on it — which
 * is the other half of the tell: the rule existed, and only the player's side
 * of the glass did not know it.
 */
function crewOn(state: GameState, systemId: string): Character[] {
  return state.characters.filter(
    (c) => c.faction === state.player && c.locationSystemId === systemId && c.status === 'available',
  );
}

function withCrew(): { state: GameState; systemId: string; who: Character } {
  for (let seed = 300; seed < 380; seed++) {
    const state = generateGalaxy(seed, 'empire');
    const island = state.systems.find(
      (s) => s.control === 'empire' && !s.uprising && crewOn(state, s.id).length > 0,
    );
    if (island) return { state, systemId: island.id, who: crewOn(state, island.id)[0] };
  }
  throw new Error('no island in eighty seeds opens with crew of yours ashore');
}

describe('a crew member in the chair', () => {
  it('is not free, though nothing about the person changed', () => {
    const { state, systemId, who } = withCrew();
    expect(isFreeCrew(state, who)).toBe(true);

    const island = state.systems.find((s) => s.id === systemId)!;
    island.commanderId = who.id;

    // The person is untouched — that is the whole point.
    expect(who.status).toBe('available');
    expect(who.mission).toBeUndefined();
    expect(isFreeCrew(state, who)).toBe(false);
    expect(commandingAt(state, who.id)?.id).toBe(systemId);
  });

  it('stops lighting the Idle crew filter from the chair', () => {
    const { state, systemId, who } = withCrew();
    const island = state.systems.find((s) => s.id === systemId)!;
    const before = layerMark(state, island, 'idleCrew', 'empire').count ?? 0;
    expect(before).toBeGreaterThan(0);

    island.commanderId = who.id;
    expect(layerMark(state, island, 'idleCrew', 'empire').count ?? 0).toBe(before - 1);
  });

  it('is free again the moment they are relieved', () => {
    const { state, systemId, who } = withCrew();
    const island = state.systems.find((s) => s.id === systemId)!;
    island.commanderId = who.id;
    expect(isFreeCrew(state, who)).toBe(false);
    island.commanderId = undefined;
    expect(isFreeCrew(state, who)).toBe(true);
  });

});
