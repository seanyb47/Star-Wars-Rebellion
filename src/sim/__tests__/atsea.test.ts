import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { addShip, board, sailFleet } from '../fleets';
import { ashoreAt, atSea, getSystem } from '../helpers';
import { companionsFor, caughtOnLanding } from '../missions';
import { summariseReach } from '../reach';
import { layerMark } from '../layers';
import type { Character, GameState } from '../types';

/**
 * Where somebody is, as against where they last set foot.
 *
 * `locationSystemId` only moves when a boat touches a beach, so for the whole
 * of a passage a crew member is still filed under the port they left. Sean's
 * playtest: *"Crew and fleets at sea still appear to be at their departure
 * port. After Fleet 2 sailed from Vagrano, Isolde Marrow still showed as
 * available at Vagrano and was offered as a party member there."* Fleets were
 * already right — a sailing squadron is in no harbor — and people were not.
 */
function crewOf(state: GameState): Character[] {
  return state.characters.filter((c) => c.faction === 'alliance' && c.status === 'available');
}

/** Two of theirs on one island, one squadron under them, and a voyage out. */
function setUp(seed = 11) {
  const state = generateGalaxy(seed, 'alliance');
  const crew = crewOf(state);
  const [rider, ashoreToo] = crew;
  const port = getSystem(state, rider.locationSystemId);
  ashoreToo.locationSystemId = port.id;
  const fleet = addShip(state, port, 'alliance', 'reefwarden');
  fleet.voyage = undefined;
  board(state, fleet.id, rider.id, 'alliance');
  const away = state.systems.find((s) => s.id !== port.id && s.sectorId !== port.sectorId)!;
  return { state, rider, ashoreToo, port, fleet, away };
}

describe('a crew member under way is at no island', () => {
  it('is at sea the day the squadron sails, and ashore again when it anchors', () => {
    const { state, rider, fleet, away } = setUp();
    expect(atSea(state, rider)).toBe(false);
    sailFleet(state, fleet.id, away.id, 'alliance');
    expect(atSea(state, rider)).toBe(true);
  });

  it('is not offered as a companion from the port it left', () => {
    const { state, rider, ashoreToo, fleet, away } = setUp();
    // Before she sails, she is exactly the companion the sheet should offer.
    expect(companionsFor(state, ashoreToo).map((c) => c.id)).toContain(rider.id);
    sailFleet(state, fleet.id, away.id, 'alliance');
    expect(companionsFor(state, ashoreToo).map((c) => c.id)).not.toContain(rider.id);
    // And she cannot lead a boat out of an island she is not standing on.
    expect(companionsFor(state, rider)).toEqual([]);
  });

  it('is off the island’s crew list, its idle count and its Reach tally', () => {
    const { state, rider, port, fleet, away } = setUp();
    const before = {
      ashore: ashoreAt(state, port.id, 'alliance').length,
      idle: layerMark(state, port, 'idleCrew', 'alliance').count ?? 0,
      reach: summariseReach(state, port.sectorId, 'alliance').perIsland.find(
        (i) => i.systemId === port.id,
      )!.missions,
    };
    sailFleet(state, fleet.id, away.id, 'alliance');
    const after = {
      ashore: ashoreAt(state, port.id, 'alliance').length,
      idle: layerMark(state, port, 'idleCrew', 'alliance').count ?? 0,
      reach: summariseReach(state, port.sectorId, 'alliance').perIsland.find(
        (i) => i.systemId === port.id,
      )!.missions,
    };
    expect(after.ashore).toBe(before.ashore - 1);
    expect(after.idle).toBe(before.idle - 1);
    expect(after.reach).toBe(before.reach - 1);
    // And the record of where she sailed from is kept, because that is what
    // the fate lists and the recall read.
    expect(rider.locationSystemId).toBe(port.id);
  });

  it('is not taken prisoner when the island she sailed from falls', () => {
    const { state, rider, port, fleet, away } = setUp();
    sailFleet(state, fleet.id, away.id, 'alliance');
    const caught = caughtOnLanding(state, getSystem(state, port.id), 'empire').map((c) => c.id);
    expect(caught).not.toContain(rider.id);
  });
});
