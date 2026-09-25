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
    const fleet = addShip(state, port, 'alliance', 'reefwarden');
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
    const fleet = addShip(state, port, 'alliance', 'reefwarden');
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

  it('says captured, and names the cell only where the cell is known', () => {
    // Sean: *"Don't say in irons. Just say Captured at location. If [I don't]
    // know just say captured."*
    const state = generateGalaxy(11, 'alliance');
    const who = ours(state)[0];
    who.status = 'captured';
    const cells = getSystem(state, state.factions.empire.hqSystemId);
    who.locationSystemId = cells.id;
    expect(whereabouts(state, who.name)).toBe(`Captured at ${cells.name}`);

    who.locationSystemId = 'sys-that-is-not-there';
    expect(whereabouts(state, who.name)).toBe('Captured');
  });

  it('never states one of theirs flatly, and says nothing of the unaligned', () => {
    /*
     * Sean: *"With all enemy information we always add a disclaimer it's
     * either unknown whereabouts or it says location and the days since last
     * intelligence so we know the intel is how many days old."* So every
     * enemy line carries one of the two, and none of them is bare.
     */
    const state = generateGalaxy(11, 'alliance');
    let theirs = 0;
    for (const c of state.characters) {
      const line = whereabouts(state, c.name);
      if (c.faction === 'alliance') {
        expect(line).not.toBeNull();
        expect(line).not.toContain('·');
        continue;
      }
      if (c.faction === 'neutral') {
        // Signing on is set against an island, not against whoever is
        // standing on it, so where a recruit is standing means nothing.
        expect(line).toBeNull();
        continue;
      }
      theirs += 1;
      expect(line === 'Unknown whereabouts' || line!.includes(' · ')).toBe(true);
    }
    expect(theirs).toBeGreaterThan(0);
  });

  it('is unknown for one of theirs you have never seen or had a report on', () => {
    const state = generateGalaxy(11, 'alliance');
    const them = state.characters.find((c) => c.faction === 'empire')!;
    // Somewhere of theirs, uncharted: no eyes and no report.
    const dark = state.systems.find((s) => s.control === 'empire')!;
    dark.explored.alliance = false;
    them.locationSystemId = dark.id;
    state.intel = { empire: {}, alliance: {} };
    expect(whereabouts(state, them.name)).toBe('Unknown whereabouts');
  });

  it('says in sight where you can see them for yourself', () => {
    const state = generateGalaxy(11, 'alliance');
    const them = state.characters.find((c) => c.faction === 'empire')!;
    // An island of yours: you do not need a spy to see who is standing on it.
    const mine = state.systems.find((s) => s.control === 'alliance')!;
    them.locationSystemId = mine.id;
    expect(whereabouts(state, them.name)).toBe(`Ashore at ${mine.name} · in sight`);

    them.status = 'captured';
    expect(whereabouts(state, them.name)).toBe(`Captured at ${mine.name} · in sight`);
  });

  it('dates a report, and names the report’s island rather than the true one', () => {
    /*
     * The half that matters. A report is where they *were*; naming where they
     * actually are and calling it twelve days old would be the leak wearing a
     * disclaimer.
     */
    const state = generateGalaxy(11, 'alliance');
    const them = state.characters.find((c) => c.faction === 'empire')!;
    const [seen, actually] = state.systems.filter(
      (s) => s.control === 'empire' && s.id !== state.factions.empire.hqSystemId,
    );
    them.locationSystemId = actually.id;
    actually.explored.alliance = false;
    state.day = 50;
    state.intel = {
      alliance: {
        [seen.id]: {
          day: 38,
          byId: 'x',
          byName: 'A spy',
          island: seen,
          officerIds: [them.id],
          errands: [],
          harbor: [],
          watch: 0,
        },
      },
      empire: {},
    };
    expect(whereabouts(state, them.name)).toBe(`Ashore at ${seen.name} · report 12 days old`);
    expect(whereabouts(state, them.name)).not.toContain(actually.name);

    // A day old reads as a day, and today's reads as today's.
    state.intel.alliance![seen.id]!.day = 49;
    expect(whereabouts(state, them.name)).toBe(`Ashore at ${seen.name} · report 1 day old`);
    state.intel.alliance![seen.id]!.day = 50;
    expect(whereabouts(state, them.name)).toBe(`Ashore at ${seen.name} · reported today`);
  });

  it('prefers the newest report it has of them', () => {
    const state = generateGalaxy(11, 'alliance');
    const them = state.characters.find((c) => c.faction === 'empire')!;
    const [old, fresh] = state.systems.filter((s) => s.control === 'empire');
    them.locationSystemId = fresh.id;
    fresh.explored.alliance = false;
    state.day = 60;
    const page = (island: typeof old, day: number) => ({
      day,
      byId: 'x',
      byName: 'A spy',
      island,
      officerIds: [them.id],
      errands: [],
      harbor: [],
      watch: 0,
    });
    state.intel = { alliance: { [old.id]: page(old, 20), [fresh.id]: page(fresh, 55) }, empire: {} };
    expect(whereabouts(state, them.name)).toBe(`Ashore at ${fresh.name} · report 5 days old`);
  });

  it('says nothing about somebody the draw left out of this war', () => {
    const state = generateGalaxy(11, 'alliance');
    expect(whereabouts(state, 'Nobody At All')).toBeNull();
  });
});
