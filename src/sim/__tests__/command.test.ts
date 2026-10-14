import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { advanceDay } from '../advanceDay';
import {
  canCommand,
  commanderOf,
  fleetsToCommand,
  foilChance,
  isCommandTarget,
  missionError,
  missionTypeFor,
  missionsOffered,
  relieve,
  startMission,
  takePost,
  canRecruitAt,
} from '../missions';
import { orderRelieve, sendCrew } from '../commands';
import { setSupport } from '../helpers';
import { UPRISING_SUPPORT } from '../constants';

function world(seed = 501) {
  const state = generateGalaxy(seed, 'empire');
  // Somebody who can actually take a posting, standing on an island of ours.
  // The opening cast is a draw of four now, so neither "the first officer" nor
  // "the first island with anyone on it" is safe to assume.
  const officer = state.characters.find(
    (c) =>
      c.faction === 'empire' &&
      c.status === 'available' &&
      canCommand(c) &&
      state.systems.find((s) => s.id === c.locationSystemId)?.control === 'empire',
  )!;
  const home = state.systems.find((s) => s.id === officer.locationSystemId)!;
  return { state, home, officer };
}

describe('a posting, not an errand', () => {
  it('offers Command on any island of yours, not only one in revolt', () => {
    const { state, home, officer } = world();
    expect(home.uprising).toBe(false);
    expect(isCommandTarget(home, 'empire')).toBe(true);
    expect(missionsOffered(state, home, 'empire')).toContain('command');
    // But it never jumps the queue on a quiet island: a posting spends an
    // officer for good and should be asked for, so anything the island can
    // still offer comes first.
    setSupport(home, 'empire', 70);
    expect(missionTypeFor(state, home, 'empire')).not.toBe('command');
    home.uprising = true;
    expect(missionTypeFor(state, home, 'empire')).toBe('command');

    /*
     * Never the default, but always available — and those are two different
     * questions. An island of yours with nothing else left (wholly loyal, so
     * no parley; no yard, no stranger ashore, nobody in its cells) has no
     * default errand at all, and the eligibility check used to ask for one.
     * So you could not post a commander to your own capital the day it came
     * round to a hundred.
     */
    home.uprising = false;
    setSupport(home, 'empire', 100);
    // "Nothing else left" has to be built rather than hoped for. This island
    // happened to have nothing that offered another errand and the case held
    // by luck; the opening deal moved twice since and it started offering
    // Research instead, which is the island having something else left rather
    // than the rule being wrong. Research wants a slipway — it took a
    // construction yard too until the yard was cut — so the slipway is what
    // has to go for the precondition above to be true.
    home.facilities = home.facilities.filter((f) => f.type !== 'shipyard');
    expect(missionTypeFor(state, home, 'empire')).toBeNull();
    // And a report on your own capital, always: the memo's counter-intelligence
    // trick is that an island of yours is exactly where you cannot see what
    // the other side has quietly got working on it.
    // Signing on is there too, at a hundred: a devoted harbor of yours is
    // exactly where a Recruiter keeps a table, since Sean's memo of 17
    // September. Still never a default — `missionTypeFor` is null above.
    const offered = missionsOffered(state, home, 'empire');
    expect(offered).toContain('command');
    expect(offered).toContain('espionage');
    // Signing on is there too when there is anybody to sign — a devoted harbor
    // of yours is exactly where a Recruiter keeps a table. Asserted against the
    // pool rather than pinned into the list: the unaligned arrive on their own
    // days, so whether one is ashore on day 1 is the draw, and pinning it made
    // this test fail the next time the world generator moved.
    expect(offered.includes('recruit')).toBe(canRecruitAt(state, home, 'empire'));
    expect(missionError(state, officer.id, home.id, 'command')).toBeNull();
  });

  it('is taken at once when they are already there', () => {
    const { state, home, officer } = world();
    startMission(state, officer.id, home.id, 'command');
    expect(home.commanderId).toBe(officer.id);
    expect(commanderOf(state, home)!.id).toBe(officer.id);
    // In post, not away: they are standing on the island, not on an errand.
    expect(officer.mission).toBeUndefined();
    expect(officer.status).toBe('available');
  });

  it('costs a voyage when they are somewhere else', () => {
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
    /*
     * A revolt is a roll taken once a day now rather than a threshold crossed
     * on a particular morning, so this asks how *often* rather than whether.
     *
     * It used to assert that an officer in the chair prevented one outright,
     * for two hundred days, absolutely — and that stopped being true the day
     * agitators started being sent. Momentum from an incitement is pressure
     * like any other: enough of it beats any one officer's Leadership, and it
     * should. What a posting buys is that a revolt becomes rare and needs
     * somebody to work for it, not that the island is sealed. Measured over
     * six wars with the chair held, one island in six went out inside two
     * hundred days, against every one of them left to itself.
     */
    const seeds = [501, 502, 503, 504, 505, 506];
    /** How many days it took this island to rise, or 200 if it never did. */
    const runUp = (seed: number, seat: boolean) => {
      const world = generateGalaxy(seed, 'empire');
      // Not the seat. Emptying Highwater's square does not start a revolt, it
      // ends the war — the Confederacy wins the day it holds the capital — so
      // the island under test has to be an ordinary holding.
      const plain = world.systems.find(
        (x) => x.control === 'empire' && x.populated && x.id !== world.factions.empire.hqSystemId,
      )!;
      if (seat) {
        const officer = world.characters.find(
          (c) => c.faction === 'empire' && c.status === 'available',
        )!;
        plain.garrison = 1;
        takePost(world, officer, plain);
      }
      let now = world;
      for (let d = 0; d < 200; d++) {
        const island = now.systems.find((x) => x.id === plain.id)!;
        // Hold it where it was put: drift would carry it back to easy.
        island.support.empire = UPRISING_SUPPORT - 10;
        island.support.alliance = 100 - island.support.empire;
        island.garrison = 1;
        if (island.uprising) return d;
        now = advanceDay(now);
      }
      return 200;
    };

    const bare = seeds.map((seed) => runUp(seed, false));
    const held = seeds.map((seed) => runUp(seed, true));
    // Left to itself, a sullen island with one company in the square goes out.
    expect(bare.filter((d) => d < 200).length).toBeGreaterThan(seeds.length / 2);
    // With somebody in the chair, most of them never do.
    expect(held.filter((d) => d < 200).length).toBeLessThan(bare.filter((d) => d < 200).length);
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

  it('relieves whoever was already holding the post', () => {
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
    const ordered = sendCrew(state, officer.id, home.id, 'command');
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
