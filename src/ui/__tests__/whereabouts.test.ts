import { describe, expect, it } from 'vitest';
import { whereabouts } from '../Almanac';
import { generateGalaxy } from '../../sim/galaxy';
import { addShip, board, sailFleet } from '../../sim/fleets';
import { getSystem } from '../../sim/helpers';
import type { Character, GameState, Mission } from '../../sim/types';

/**
 * Sean, 19 September: *"In the encyclopedia (just for crew) say 'Ashore at
 * [location]' / 'Commanding [fleet name / location name]' ... If en route say
 * 'Enroute to [location]'."*
 */
const ours = (state: GameState): Character[] =>
  state.characters.filter((c) => c.faction === state.player);

function errand(phase: Mission['phase'], targetSystemId: string): Mission {
  return { type: 'diplomacy', targetSystemId, phase, daysRemaining: 7 };
}

describe('where one of your crew is', () => {
  it('says ashore at the island they are standing on', () => {
    const state = generateGalaxy(11, 'alliance');
    const who = ours(state)[0];
    const port = getSystem(state, who.locationSystemId);
    expect(whereabouts(state, who.name)).toBe(`Ashore at ${port.name}`);
  });

  it('says commanding, for a chair and for a deck alike', () => {
    const state = generateGalaxy(11, 'alliance');
    const [governor, captain] = ours(state);

    const island = getSystem(state, governor.locationSystemId);
    island.commanderId = governor.id;
    expect(whereabouts(state, governor.name)).toBe(`Commanding ${island.name}`);

    const port = getSystem(state, captain.locationSystemId);
    const fleet = addShip(state, port, 'alliance', 'reefwalker');
    fleet.voyage = undefined;
    board(state, fleet.id, captain.id, 'alliance');
    expect(whereabouts(state, captain.name)).toBe(`Commanding ${fleet.name}`);
  });

  it('says enroute while an errand is still on passage, and ashore once it lands', () => {
    const state = generateGalaxy(11, 'alliance');
    const who = ours(state)[0];
    const target = state.systems.find((s) => s.id !== who.locationSystemId)!;
    who.status = 'on_mission';

    who.mission = errand('travelling', target.id);
    expect(whereabouts(state, who.name)).toBe(`Enroute to ${target.name}`);

    who.mission = errand('working', target.id);
    expect(whereabouts(state, who.name)).toBe(`Ashore at ${target.name}`);
  });

  it('carries a squadron under way, and says where she is bound', () => {
    const state = generateGalaxy(11, 'alliance');
    const who = ours(state)[0];
    const port = getSystem(state, who.locationSystemId);
    const fleet = addShip(state, port, 'alliance', 'reefwalker');
    fleet.voyage = undefined;
    board(state, fleet.id, who.id, 'alliance');
    const away = state.systems.find((s) => s.sectorId !== port.sectorId)!;
    sailFleet(state, fleet.id, away.id, 'alliance');
    expect(whereabouts(state, who.name)).toBe(
      `Commanding ${fleet.name}, enroute to ${away.name}`,
    );
  });

  it('reads the leader’s errand for somebody only along for it', () => {
    const state = generateGalaxy(11, 'alliance');
    const [leader, escort] = ours(state);
    const target = state.systems.find((s) => s.id !== leader.locationSystemId)!;
    leader.status = 'on_mission';
    leader.mission = errand('travelling', target.id);
    leader.mission.party = [escort.id];
    escort.status = 'on_mission';
    escort.escorting = leader.id;
    expect(whereabouts(state, escort.name)).toBe(`Enroute to ${target.name}`);
  });

  it('puts a prisoner in irons rather than ashore', () => {
    const state = generateGalaxy(11, 'alliance');
    const who = ours(state)[0];
    who.status = 'captured';
    const cells = getSystem(state, state.factions.empire.hqSystemId);
    who.locationSystemId = cells.id;
    expect(whereabouts(state, who.name)).toBe(`In irons at ${cells.name}`);
  });

  it('says nothing at all about anybody who is not yours', () => {
    /*
     * The line is intelligence. A reference page that printed "Ashore at
     * Highwater" beside every Crown name would hand over the whole enemy
     * disposition for free — which is what the espionage errand is for.
     */
    const state = generateGalaxy(11, 'alliance');
    for (const c of state.characters) {
      if (c.faction === 'alliance') expect(whereabouts(state, c.name)).not.toBeNull();
      else expect(whereabouts(state, c.name)).toBeNull();
    }
    // Including the Crown's, whose own player would see them and ours must not.
    expect(state.characters.some((c) => c.faction === 'empire')).toBe(true);
    expect(state.characters.some((c) => c.faction === 'neutral')).toBe(true);
  });

  it('says nothing about somebody the draw left out of this war', () => {
    const state = generateGalaxy(11, 'alliance');
    expect(whereabouts(state, 'Nobody At All')).toBeNull();
  });
});
