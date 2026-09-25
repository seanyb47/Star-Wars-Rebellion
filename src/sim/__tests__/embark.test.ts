import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { embark, embarkError, fleetCapacity } from '../fleets';
import { orderEmbark } from '../commands';
import type { GameState } from '../types';

/**
 * Troops from the quay into the boats, by hand.
 *
 * Sean, 24 September: *"How do I move troops from an island into a fleet? I
 * should be able to click on any troop and move any number of them into a
 * fleet up to fleet troop limit."*
 *
 * The answer until now was that you could not, and that is his own ruling of
 * 22 September coming back round — *"cut this ashore / aboard thing"* — after
 * which the boats load themselves. **That behaviour stays**, because it is
 * right about the common case. What it cannot do is the uncommon one, which is
 * the one he hit: automatic loading takes only what an island can *spare*
 * above its wanted garrison, so an island that is short — Anchorite Rock, in
 * revolt, three ashore of six wanted — will never give a troop up, however
 * much you would rather have those three aboard than lose them with the island.
 */
function harbor(): { state: GameState; fleetId: string; systemId: string } {
  for (let seed = 500; seed < 560; seed++) {
    const state = generateGalaxy(seed, 'empire');
    const fleet = state.fleets.find((f) => f.faction === 'empire' && !f.voyage);
    if (!fleet) continue;
    const island = state.systems.find((s) => s.id === fleet.systemId);
    if (!island || island.control !== 'empire') continue;
    island.garrison = 5;
    fleet.troops = 0;
    return { state, fleetId: fleet.id, systemId: island.id };
  }
  throw new Error('no seed in sixty opens with a squadron in a harbor of yours');
}

describe('putting troops aboard by hand', () => {
  it('moves the number asked for, and no other', () => {
    const { state, fleetId, systemId } = harbor();
    const island = state.systems.find((s) => s.id === systemId)!;
    const fleet = state.fleets.find((f) => f.id === fleetId)!;

    embark(state, fleetId, 2, 'empire');
    expect(fleet.troops).toBe(2);
    expect(island.garrison).toBe(3);
  });

  it('will strip an island bare, because that is sometimes the right call', () => {
    // Under the wanted garrison the island stirs, and an empty harbor falls to
    // whoever shows up — both real prices, and the whole reason to have the
    // control rather than leaving it to the automatic loading.
    const { state, fleetId, systemId } = harbor();
    const island = state.systems.find((s) => s.id === systemId)!;
    expect(embarkError(state, fleetId, island.garrison, 'empire')).toBeNull();
    embark(state, fleetId, 5, 'empire');
    expect(island.garrison).toBe(0);
  });

  it('stops at the holds, not at the quay', () => {
    const { state, fleetId, systemId } = harbor();
    const fleet = state.fleets.find((f) => f.id === fleetId)!;
    const island = state.systems.find((s) => s.id === systemId)!;
    const room = fleetCapacity(fleet);
    island.garrison = room + 3;
    expect(embarkError(state, fleetId, room + 1, 'empire')).toMatch(/room/i);
    expect(embarkError(state, fleetId, room, 'empire')).toBeNull();
  });

  it('refuses what is not there, and what is not yours', () => {
    const { state, fleetId, systemId } = harbor();
    const island = state.systems.find((s) => s.id === systemId)!;
    island.garrison = 1;
    expect(embarkError(state, fleetId, 2, 'empire')).toMatch(/not enough/i);
    expect(embarkError(state, fleetId, 1, 'alliance')).toMatch(/not yours/i);
  });

  it('puts them back ashore when the number is negative', () => {
    const { state, fleetId, systemId } = harbor();
    const island = state.systems.find((s) => s.id === systemId)!;
    const fleet = state.fleets.find((f) => f.id === fleetId)!;
    embark(state, fleetId, 3, 'empire');
    expect(fleet.troops).toBe(3);
    embark(state, fleetId, -2, 'empire');
    expect(fleet.troops).toBe(1);
    expect(island.garrison).toBe(4);
  });

  it('goes through the one wrapper every order passes through', () => {
    // Not `embark` straight from the screen: the command layer is what keeps a
    // failed order from half-applying, and what the player's side is checked
    // against.
    const { state, fleetId } = harbor();
    const ok = orderEmbark(state, fleetId, 2);
    expect(ok.error).toBeUndefined();
    expect(ok.state.fleets.find((f) => f.id === fleetId)!.troops).toBe(2);
    // And the state handed in is not the state handed back.
    expect(state.fleets.find((f) => f.id === fleetId)!.troops).toBe(0);

    const tooMany = orderEmbark(state, fleetId, 999);
    expect(tooMany.error).toBeTruthy();
  });
});
