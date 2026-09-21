import { describe, expect, it } from 'vitest';
import { crewStatus } from '../CharacterSheet';
import { generateGalaxy } from '../../sim/galaxy';
import { addShip, board, sailFleet } from '../../sim/fleets';
import { getSystem } from '../../sim/helpers';
import type { Character, GameState, Mission } from '../../sim/types';

/**
 * Sean's playtest: *"Crew status reads AT SEA while the crew member is working
 * ashore on a mission."* An errand is a passage and then a fortnight ashore,
 * and `on_mission` covers both; the badge used to print the passage's word
 * over the whole of it.
 */
function errand(phase: Mission['phase'], targetSystemId: string): Mission {
  return { type: 'diplomacy', targetSystemId, phase, daysRemaining: 7 };
}

function anyone(state: GameState): Character {
  return state.characters.find((c) => c.faction === 'alliance')!;
}

describe('what the crew badge says', () => {
  it('says ashore for the half of an errand that is spent ashore', () => {
    const state = generateGalaxy(11, 'alliance');
    const person = anyone(state);
    person.status = 'on_mission';

    person.mission = errand('travelling', person.locationSystemId);
    expect(crewStatus(person, state).label).toBe('At sea');

    person.mission = errand('working', person.locationSystemId);
    expect(crewStatus(person, state).label).toBe('Ashore');
  });

  it('reads the leader’s phase for somebody only along for the errand', () => {
    const state = generateGalaxy(11, 'alliance');
    const [leader, escort] = state.characters.filter((c) => c.faction === 'alliance');
    leader.status = 'on_mission';
    leader.mission = errand('working', leader.locationSystemId);
    leader.mission.party = [escort.id];
    escort.status = 'on_mission';
    escort.escorting = leader.id;
    expect(crewStatus(escort, state).label).toBe('Ashore');

    leader.mission.phase = 'travelling';
    expect(crewStatus(escort, state).label).toBe('At sea');
  });

  it('says at sea for somebody free but aboard a squadron under way', () => {
    const state = generateGalaxy(11, 'alliance');
    const person = anyone(state);
    const port = getSystem(state, person.locationSystemId);
    const fleet = addShip(state, port, 'alliance', 'reefwarden');
    fleet.voyage = undefined;
    board(state, fleet.id, person.id, 'alliance');
    expect(crewStatus(person, state).label).toBe('Available');

    const away = state.systems.find((s) => s.sectorId !== port.sectorId)!;
    sailFleet(state, fleet.id, away.id, 'alliance');
    expect(crewStatus(person, state).label).toBe('At sea');
  });

  it('leaves the other three states alone', () => {
    const state = generateGalaxy(11, 'alliance');
    const person = anyone(state);
    expect(crewStatus(person, state)).toEqual({ label: 'Available', tone: 'good' });
    person.status = 'injured';
    person.injuredDays = 9;
    expect(crewStatus(person, state)).toEqual({ label: 'Laid up 9d', tone: 'warn' });
    person.status = 'captured';
    expect(crewStatus(person, state)).toEqual({ label: 'Captured', tone: 'warn' });
  });
});
