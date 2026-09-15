import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { advanceDay } from '../advanceDay';
import {
  commanderOf,
  fleetsToCommand,
  foilChance,
  isCommandTarget,
  missionTypeFor,
  missionsOffered,
  relieve,
  startMission,
  takePost,
} from '../missions';
import { orderRelieve, sendDiplomat } from '../commands';
import { UPRISING_SUPPORT } from '../constants';

function world(seed = 501) {
  const state = generateGalaxy(seed, 'empire');
  const home = state.systems.find(
    (s) => s.control === 'empire' && state.characters.some((c) => c.locationSystemId === s.id),
  )!;
  const officer = state.characters.find(
    (c) => c.faction === 'empire' && c.locationSystemId === home.id && c.status === 'available',
  )!;
  return { state, home, officer };
}

describe('a posting, not an errand', () => {
  it('offers Command on any island of yours, not only one in revolt', () => {
    const { state, home } = world();
    expect(home.uprising).toBe(false);
    expect(isCommandTarget(home, 'empire')).toBe(true);
    expect(missionsOffered(state, home, 'empire')).toContain('command');
    // But it is never the default on a quiet island: a posting spends an
    // officer for good and should be asked for.
    expect(missionTypeFor(state, home, 'empire')).not.toBe('command');
    home.uprising = true;
    expect(missionTypeFor(state, home, 'empire')).toBe('command');
  });

  it('is taken at once when the officer is already there', () => {
    const { state, home, officer } = world();
    startMission(state, officer.id, home.id, 'command');
    expect(home.commanderId).toBe(officer.id);
    expect(commanderOf(state, home)!.id).toBe(officer.id);
    // In post, not away: they are standing on the island, not on an errand.
    expect(officer.mission).toBeUndefined();
    expect(officer.status).toBe('available');
  });

  it('costs a voyage when the officer is somewhere else', () => {
    const { state, officer } = world();
    const far = state.systems.find(
      (s) => s.control === 'empire' && s.id !== officer.locationSystemId,
    )!;
    startMission(state, officer.id, far.id, 'command');
    expect(officer.mission?.type).toBe('command');
    expect(officer.mission?.phase).toBe('travelling');
    expect(far.commanderId).toBeUndefined();

    let world2 = state;
    const post = () => world2.systems.find((s) => s.id === far.id)!;
    for (let i = 0; i < 40 && !post().commanderId; i++) world2 = advanceDay(world2);
    expect(post().commanderId).toBe(officer.id);
  });

  it('takes a deck instead, when a squadron is named', () => {
    const { state, home, officer } = world();
    const squadrons = fleetsToCommand(state, home.id, 'empire');
    expect(squadrons.length).toBeGreaterThan(0);
    const fleet = squadrons[0];
    startMission(state, officer.id, home.id, 'command', [], fleet.id);
    expect(fleet.officerIds).toContain(officer.id);
    expect(home.commanderId).toBeUndefined();
  });

  it('holds an island quiet that would otherwise rise', () => {
    const { state, home, officer } = world();
    home.support.empire = UPRISING_SUPPORT - 10;
    home.support.alliance = 100 - home.support.empire;
    home.garrison = 0;
    // Without a commander it goes out.
    let loose = advanceDay(state);
    expect(loose.systems.find((s) => s.id === home.id)!.uprising).toBe(true);

    // With one, it does not.
    const held = generateGalaxy(501, 'empire');
    const same = held.systems.find((s) => s.id === home.id)!;
    same.support.empire = UPRISING_SUPPORT - 10;
    same.support.alliance = 100 - same.support.empire;
    same.garrison = 0;
    takePost(held, held.characters.find((c) => c.id === officer.id)!, same);
    same.support.empire = UPRISING_SUPPORT - 10;
    const quiet = advanceDay(held);
    expect(quiet.systems.find((s) => s.id === home.id)!.uprising).toBe(false);
  });

  it('makes an island far harder to work against', () => {
    const { state, officer } = world();
    // An island the Confederacy holds, which the Crown might send an agent to.
    const theirs = state.systems.find((s) => s.control === 'alliance')!;
    const bare = foilChance(state, theirs, 'empire');
    theirs.commanderId = officer.id;
    officer.faction = 'alliance';
    officer.locationSystemId = theirs.id;
    officer.leadership = 100;
    expect(foilChance(state, theirs, 'empire')).toBeGreaterThan(bare);
  });

  it('is given up instantly, and never at sea', () => {
    const { state, home, officer } = world();
    startMission(state, officer.id, home.id, 'command');
    expect(home.commanderId).toBe(officer.id);
    const freed = orderRelieve(state, officer.id);
    expect(freed.error).toBeUndefined();
    expect(freed.state.systems.find((s) => s.id === home.id)!.commanderId).toBeUndefined();

    // On a deck that is under way, they stay where they are.
    const sailing = generateGalaxy(501, 'empire');
    const who = sailing.characters.find((c) => c.id === officer.id)!;
    const fleet = fleetsToCommand(sailing, who.locationSystemId, 'empire')[0];
    fleet.officerIds.push(who.id);
    fleet.voyage = { targetSystemId: home.id, daysRemaining: 3 };
    expect(orderRelieve(sailing, who.id).error).toBe('The fleet is at sea.');
  });

  it('relieves the officer who was already holding the post', () => {
    const { state, home, officer } = world();
    const second = state.characters.find(
      (c) => c.faction === 'empire' && c.id !== officer.id && c.status === 'available',
    )!;
    takePost(state, officer, home);
    takePost(state, second, home);
    expect(home.commanderId).toBe(second.id);
    // And the first is not still counted as holding anything.
    relieve(state, officer.id);
    expect(state.systems.filter((s) => s.commanderId === officer.id)).toHaveLength(0);
  });

  it('never leaves a Command posting to resolve as something else', () => {
    // The bug this guards: a posting ordered where the officer already stands
    // used to fall through to the parley outcome a fortnight later.
    const { state, home, officer } = world();
    // Commands hand back a new state rather than editing this one, so the
    // posting is in the result and not in `state`.
    const ordered = sendDiplomat(state, officer.id, home.id, 'command');
    expect(ordered.error).toBeUndefined();
    let ran = ordered.state;
    for (let i = 0; i < 20; i++) ran = advanceDay(ran);
    const after = ran.systems.find((s) => s.id === home.id)!;
    // Still in post a fortnight later, which is the whole difference between a
    // posting and an errand — and never quietly finished as a parley, which is
    // where it used to land once the work days ran out.
    expect(after.commanderId).toBe(officer.id);
    const them = ran.characters.find((c) => c.id === officer.id)!;
    expect(them.mission).toBeUndefined();
    expect(ran.events.some((e) => /talked .* round|parley/i.test(e.text) && e.characterId === officer.id)).toBe(false);
  });
});
