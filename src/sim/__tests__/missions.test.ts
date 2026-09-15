import { describe, expect, it } from 'vitest';
import { generateGalaxy, START_CHARACTERS } from '../galaxy';
import { MISSION_WORK_DAYS, RECRUITS_IN_PLAY } from '../constants';
import {
  advanceMissions,
  continueMission,
  endMission,
  foilChance,
  isDiplomacyTarget,
  isInciteTarget,
  isMissionTarget,
  isRecruitTarget,
  isSabotageTarget,
  isSurveyTarget,
  inciteLoss,
  quality,
  recruitChance,
  missionError,
  missionTypeFor,
  startMission,
  successChance,
  travelDays,
} from '../missions';
import { getCharacter, getSystem } from '../helpers';
import { createRng } from '../rng';
import type { GameState, System } from '../types';


/**
 * No stranger ashore. An island with somebody to sign on offers recruitment
 * before anything else, which is never the errand under test here; with sixty
 * islands the unaligned land on the ones the finders below reach first.
 */
function quiet(state: GameState, s: System): boolean {
  return !state.characters.some((c) => c.faction === 'neutral' && c.locationSystemId === s.id);
}

function setup(seed = 301) {
  const state = generateGalaxy(seed);
  const diplomat = state.characters.find((c) => c.faction === 'empire')!;
  diplomat.diplomacy = 60;
  const home = getSystem(state, diplomat.locationSystemId);
  const sameSector = state.systems.find(
    (s) => s.sectorId === home.sectorId && s.control === 'neutral' && quiet(state, s),
  )!;
  const crossSector = state.systems.find(
    (s) => s.sectorId !== home.sectorId && s.control === 'neutral' && s.isCore && quiet(state, s),
  )!;
  return { state, diplomat, home, sameSector, crossSector };
}

function runDays(state: GameState, days: number, seed: number) {
  const rng = createRng(seed);
  for (let day = 0; day < days; day++) advanceMissions(state, rng);
}

/**
 * Days enough to sail there and work one full cycle.
 *
 * Travel used to be three days inside a Reach and these tests said 18 — three
 * and fifteen — in a dozen places. It is a distance now, so the figure is
 * different for every pair of islands and there is no literal to write. Call
 * this before the officer leaves: it reads their current island.
 */
function cycleDays(state: GameState, characterId: string, toSystemId: string): number {
  const from = getCharacter(state, characterId).locationSystemId;
  return travelDays(state, from, toSystemId) + MISSION_WORK_DAYS;
}

describe('mission eligibility', () => {
  it('accepts neutral and friendly populated worlds', () => {
    const { state, sameSector } = setup();
    expect(isDiplomacyTarget(sameSector, 'empire')).toBe(true);
    const own = state.systems.find((s) => s.control === 'empire')!;
    expect(isDiplomacyTarget(own, 'empire')).toBe(true);
  });

  it('rejects unpopulated and revolting worlds', () => {
    const { state, sameSector, diplomat } = setup();
    const empty = state.systems.find((s) => !s.populated)!;
    empty.explored.empire = true;
    expect(isDiplomacyTarget(empty, 'empire')).toBe(false);
    expect(isInciteTarget(empty, 'empire')).toBe(false);
    expect(isMissionTarget(state, empty, 'empire')).toBe(false);

    sameSector.uprising = true;
    expect(missionError(state, diplomat.id, sameSector.id)).toBe('Nothing to be done there.');
  });

  it('lets the island decide the mission: parley yours, stir up theirs', () => {
    const { state, sameSector } = setup();
    const own = state.systems.find((s) => s.control === 'empire')!;
    // An island of yours with a yard and its people already won over would
    // put the officer to research instead; this test is about parley, so
    // give it something left to be talked round about.
    own.support.empire = 60;
    const enemy = state.systems.find((s) => s.control === 'alliance')!;
    enemy.explored.empire = true;

    expect(missionTypeFor(state, sameSector, 'empire')).toBe('diplomacy');
    expect(missionTypeFor(state, own, 'empire')).toBe('diplomacy');
    expect(missionTypeFor(state, enemy, 'empire')).toBe('incite');
    // You cannot parley with an island they hold, nor stir up one of your own.
    expect(isDiplomacyTarget(enemy, 'empire')).toBe(false);
    expect(isInciteTarget(own, 'empire')).toBe(false);
  });

  it('offers only a survey on an island nobody has charted', () => {
    /**
     * This used to assert that an uncharted island was no target at all, and
     * that was right until Espionage got a mission of its own. The rule is now
     * more precise rather than gone: you cannot parley with, incite, sabotage
     * or recruit on a rumour — but you can go and look at one, and for the
     * Crown, hunting a harbor that moves when it is found, that is the point.
     */
    const { state, diplomat } = setup();
    const enemy = state.systems.find((s) => s.control === 'alliance')!;
    enemy.explored.empire = false;
    expect(missionTypeFor(state, enemy, 'empire')).toBe('survey');
    expect(isDiplomacyTarget(enemy, 'empire')).toBe(false);
    expect(isInciteTarget(enemy, 'empire')).toBe(false);
    expect(isSabotageTarget(enemy, 'empire')).toBe(false);
    expect(missionError(state, diplomat.id, enemy.id)).toBeNull();
  });

  it('rejects a character who is already busy', () => {
    const { state, diplomat, sameSector } = setup();
    diplomat.status = 'on_mission';
    expect(missionError(state, diplomat.id, sameSector.id)).toBe('They are not free to sail.');
  });
});

describe('travel', () => {
  it('is the distance, and leaving your own Sea costs more than the distance', () => {
    const { state, home, sameSector, crossSector } = setup();
    const near = travelDays(state, home.id, sameSector.id);
    const far = travelDays(state, home.id, crossSector.id);
    expect(near).toBeGreaterThan(0);
    expect(far).toBeGreaterThan(near);
    expect(travelDays(state, home.id, home.id)).toBe(0);
    // Symmetric, and no pair of islands is a teleport.
    expect(travelDays(state, sameSector.id, home.id)).toBe(near);
    for (const a of state.systems) {
      for (const b of state.systems) {
        if (a.id !== b.id) expect(travelDays(state, a.id, b.id)).toBeGreaterThanOrEqual(1);
      }
    }
    // Two islands the same distance apart are not the same passage if one of
    // them is across open water: the crossing carries a toll of its own.
    const place = (s: System) => {
      const sec = state.sectors.find((x) => x.id === s.sectorId)!;
      return { x: sec.x + s.x, y: sec.y + s.y };
    };
    const gap = (a: System, b: System) => {
      const p = place(a);
      const q = place(b);
      return Math.hypot(p.x - q.x, p.y - q.y);
    };
    expect(far - near).toBeGreaterThan((gap(home, crossSector) - gap(home, sameSector)) / 36);
  });

  it('moves the character on arrival and starts the 15-day work phase', () => {
    const { state, diplomat, sameSector } = setup();
    const passage = travelDays(state, diplomat.locationSystemId, sameSector.id);
    startMission(state, diplomat.id, sameSector.id);
    expect(diplomat.mission!.phase).toBe('travelling');

    runDays(state, passage, 1);
    const arrived = getCharacter(state, diplomat.id);
    expect(arrived.locationSystemId).toBe(sameSector.id);
    expect(arrived.mission!.phase).toBe('working');
    expect(arrived.mission!.daysRemaining).toBe(15);
  });
});

describe('resolution', () => {
  it('scales success chance with the diplomacy rating', () => {
    const { diplomat } = setup();
    diplomat.diplomacy = 50;
    expect(successChance(diplomat)).toBeCloseTo(0.65);
    diplomat.diplomacy = 90;
    expect(successChance(diplomat)).toBeCloseTo(0.85);
  });

  it('raises your support and lowers theirs on a success', () => {
    const { state, diplomat, sameSector } = setup();
    diplomat.diplomacy = 100; // success chance 0.9
    sameSector.support = { empire: 20, alliance: 80 };
    const cycle = cycleDays(state, diplomat.id, sameSector.id);
    startMission(state, diplomat.id, sameSector.id);

    // Seed 2 draws a success on the resolving day.
    runDays(state, cycle, 2);
    const after = getSystem(state, sameSector.id);
    // One balance: what you win is exactly what they lose.
    expect(after.support.empire).toBeCloseTo(38); // 20 + 8 + 100/10
    expect(after.support.alliance).toBeCloseTo(62);
    expect(after.support.empire + after.support.alliance).toBeCloseTo(100);
  });

  it('flips a neutral world once the mission pushes support over the line', () => {
    const { state, diplomat, sameSector } = setup();
    diplomat.diplomacy = 100;
    sameSector.support = { empire: 65, alliance: 35 };
    const cycle = cycleDays(state, diplomat.id, sameSector.id);
    startMission(state, diplomat.id, sameSector.id);
    runDays(state, cycle, 2);
    expect(getSystem(state, sameSector.id).control).toBe('empire');
  });

  it('queues a continue-or-return decision for the player', () => {
    const { state, diplomat, sameSector } = setup();
    const cycle = cycleDays(state, diplomat.id, sameSector.id);
    startMission(state, diplomat.id, sameSector.id);
    runDays(state, cycle, 2);
    expect(state.pendingDecisions).toHaveLength(1);
    expect(state.pendingDecisions[0].characterId).toBe(diplomat.id);
  });

  it('starts another 15-day cycle on continue', () => {
    const { state, diplomat, sameSector } = setup();
    const cycle = cycleDays(state, diplomat.id, sameSector.id);
    startMission(state, diplomat.id, sameSector.id);
    runDays(state, cycle, 2);
    continueMission(state, diplomat.id);
    expect(state.pendingDecisions).toHaveLength(0);
    expect(getCharacter(state, diplomat.id).mission!.daysRemaining).toBe(15);
  });

  it('frees the character on return', () => {
    const { state, diplomat, sameSector } = setup();
    const cycle = cycleDays(state, diplomat.id, sameSector.id);
    startMission(state, diplomat.id, sameSector.id);
    runDays(state, cycle, 2);
    endMission(state, diplomat.id);
    const done = getCharacter(state, diplomat.id);
    expect(done.status).toBe('available');
    expect(done.mission).toBeUndefined();
    expect(done.locationSystemId).toBe(sameSector.id);
  });

  it('injures a foiled agent for 20 days and lets them recover', () => {
    const { diplomat, sameSector } = setup();
    diplomat.diplomacy = 100;

    // Walk seeds until one produces a foil, then verify the whole arc.
    let foiled = false;
    for (let seed = 1; seed <= 60 && !foiled; seed++) {
      const trial = generateGalaxy(301);
      const agent = trial.characters.find((c) => c.id === diplomat.id)!;
      agent.diplomacy = 100;
      // Far from coming over: a parley this good on a warm island flips it
      // in one cycle, and nobody is hunting you on your own ground.
      getSystem(trial, sameSector.id).support = { empire: 5, alliance: 5 };
      const cycle = cycleDays(trial, agent.id, sameSector.id);
      startMission(trial, agent.id, sameSector.id);
      // Somebody of theirs turns up to watch the harbor once the parley is
      // under way — after, or the errand would be to abduct them — so a foil
      // is a live chance rather than a one-in-sixteen on an unwatched island.
      const spy = trial.characters.find((c) => c.faction === 'alliance')!;
      spy.locationSystemId = sameSector.id;
      spy.espionage = 100;
      runDays(trial, cycle, seed);
      const after = getCharacter(trial, agent.id);
      if (after.status === 'injured') {
        foiled = true;
        expect(after.injuredDays).toBe(20);
        expect(after.mission).toBeUndefined();
        expect(trial.pendingDecisions).toHaveLength(0);

        runDays(trial, 19, seed);
        expect(getCharacter(trial, agent.id).status).toBe('injured');
        runDays(trial, 1, seed);
        const healed = getCharacter(trial, agent.id);
        expect(healed.status).toBe('available');
        expect(healed.injuredDays).toBeUndefined();
      }
    }
    expect(foiled).toBe(true);
  });

  it('never foils a mission on a world you already hold', () => {
    const state = generateGalaxy(302);
    const diplomat = state.characters.find((c) => c.faction === 'empire')!;
    const own = state.systems.find(
      (s) => s.control === 'empire' && s.id !== diplomat.locationSystemId,
    )!;
    const cycle = cycleDays(state, diplomat.id, own.id) + 2;
    startMission(state, diplomat.id, own.id);
    for (let seed = 1; seed <= 30; seed++) {
      runDays(state, cycle, seed);
      expect(getCharacter(state, diplomat.id).status).not.toBe('injured');
      state.pendingDecisions = [];
      continueMission(state, diplomat.id);
    }
  });
});

describe('incitement', () => {
  /** An enemy island the empire has charted, with a given grip on it. */
  function withEnemyIsland(allianceSupport: number, seed = 311) {
    const state = generateGalaxy(seed);
    const agent = state.characters.find((c) => c.faction === 'empire')!;
    agent.diplomacy = 100;
    agent.espionage = 0; // measure the risk undiluted by craft
    const island = state.systems.find(
      (s) => s.control === 'alliance' && s.populated && quiet(state, s),
    )!;
    island.explored.empire = true;
    island.uprising = false;
    island.support = { empire: 100 - allianceSupport, alliance: allianceSupport };
    return { state, agent, island };
  }

  it('is harder than a parley, and every point it takes off the holder is yours', () => {
    const { state, agent, island } = withEnemyIsland(70);
    expect(successChance(agent, 'incite')).toBeLessThan(successChance(agent, 'diplomacy'));

    startMission(state, agent.id, island.id);
    expect(getCharacter(state, agent.id).mission!.type).toBe('incite');

    const before = { ...island.support };
    // Long enough to travel and work a cycle. Seeds walked until one lands.
    let landed = false;
    for (let seed = 1; seed <= 40 && !landed; seed++) {
      const trial = generateGalaxy(311);
      const who = trial.characters.find((c) => c.id === agent.id)!;
      who.diplomacy = 100;
      const where = trial.systems.find((s) => s.id === island.id)!;
      where.explored.empire = true;
      where.support = { ...before };
      const cycle = cycleDays(trial, who.id, where.id) + 8;
      startMission(trial, who.id, where.id);
      runDays(trial, cycle, seed);
      const after = getSystem(trial, island.id);
      if (after.support.alliance < before.alliance) {
        landed = true;
        // Their grip falls by the officer's measure, and there is no third
        // place for an angry island to go, so all of it lands on you.
        const lost = before.alliance - after.support.alliance;
        expect(lost).toBeGreaterThanOrEqual(inciteLoss(who) - 0.001);
        expect(after.support.empire - before.empire).toBeCloseTo(lost);
        expect(after.support.empire + after.support.alliance).toBeCloseTo(100);
      }
    }
    expect(landed).toBe(true);
  });

  it('sets an island alight once the governor drops under the threshold', () => {
    const { state, agent, island } = withEnemyIsland(34);
    island.garrison = 0;
    const sailAndWork = cycleDays(state, agent.id, island.id) + 12;
    startMission(state, agent.id, island.id);
    // Work it until it rises, answering its own continue decisions.
    let rose = false;
    for (let cycle = 0; cycle < 8 && !rose; cycle++) {
      runDays(state, sailAndWork, 7 + cycle);
      rose = getSystem(state, island.id).uprising;
      if (!rose && state.pendingDecisions.length > 0) {
        state.pendingDecisions = [];
        continueMission(state, agent.id);
      }
      if (getCharacter(state, agent.id).status === 'injured') break;
    }
    expect(rose).toBe(true);
  });

  it('is far more dangerous than a parley, and worse with a spy watching', () => {
    const { state, agent, island } = withEnemyIsland(70);
    const neutral = state.systems.find((s) => s.control === 'neutral' && s.populated)!;
    neutral.explored.empire = true;

    const onEnemySoil = foilChance(state, island, 'empire');
    const onNeutral = foilChance(state, neutral, 'empire');
    expect(onEnemySoil).toBeGreaterThan(onNeutral);

    // Park one of their officers on it and the risk climbs again.
    const watcher = state.characters.find((c) => c.faction === 'alliance')!;
    watcher.espionage = 100;
    watcher.locationSystemId = island.id;
    watcher.status = 'available';
    expect(foilChance(state, island, 'empire')).toBeGreaterThan(onEnemySoil);

    // An officer with craft of their own is safer doing the same work.
    expect(foilChance(state, island, 'empire', { ...agent, espionage: 100 })).toBeLessThan(
      foilChance(state, island, 'empire', { ...agent, espionage: 0 }),
    );
  });

  it('calls the work off if the island changes hands while they are at sea', () => {
    const { state, agent, island } = withEnemyIsland(70);
    startMission(state, agent.id, island.id);
    runDays(state, 2, 5);
    expect(getCharacter(state, agent.id).mission!.phase).toBe('travelling');
    // It comes over to you on its own; there is nothing left to stir.
    getSystem(state, island.id).control = 'empire';

    // They are stood down on landfall, not after a wasted cycle ashore.
    runDays(state, travelDays(state, agent.locationSystemId, island.id), 5);
    const after = getCharacter(state, agent.id);
    expect(after.mission).toBeUndefined();
    expect(after.status).toBe('available');
    expect(after.locationSystemId).toBe(island.id);
  });
});

describe('recruitment', () => {
  /** A charted island with exactly one unaligned person standing on it. */
  function withRecruit(seed = 321) {
    const state = generateGalaxy(seed);
    const officer = state.characters.find((c) => c.faction === 'empire')!;
    officer.diplomacy = 100;
    const recruit = state.characters.find((c) => c.faction === 'neutral')!;
    const island = getSystem(state, recruit.locationSystemId);
    island.explored.empire = true;
    island.uprising = false;
    return { state, officer, recruit, island };
  }

  it('puts unaligned people on the map, away from either seat', () => {
    const state = generateGalaxy(5);
    const loose = state.characters.filter((c) => c.faction === 'neutral');
    expect(loose).toHaveLength(RECRUITS_IN_PLAY);
    const seats = [state.factions.empire.hqSystemId, state.factions.alliance.hqSystemId];
    for (const person of loose) {
      const where = getSystem(state, person.locationSystemId);
      expect(where.populated).toBe(true);
      expect(seats).not.toContain(where.id);
      expect(person.status).toBe('available');
    }
    // One apiece: two people on one island would hide one of them.
    expect(new Set(loose.map((c) => c.locationSystemId)).size).toBe(loose.length);
  });

  it('belongs to neither side until signed, and never shows up as crew', () => {
    const state = generateGalaxy(6);
    for (const faction of ['empire', 'alliance'] as const) {
      const roster = state.characters.filter((c) => c.faction === faction);
      expect(roster).toHaveLength(START_CHARACTERS[faction]);
      // The point of the test: nobody unaligned has quietly been counted as
      // one of the side's own.
      for (const who of roster) expect(who.appearsOnDay).toBeUndefined();
    }
    expect(state.characters.some((c) => c.faction === 'neutral')).toBe(true);
  });

  it('is what an island offers when somebody is standing on it', () => {
    const { state, island } = withRecruit();
    expect(missionTypeFor(state, island, 'empire')).toBe('recruit');
    // Signing someone on comes before whatever else the island was good for.
    island.control = 'neutral';
    expect(isDiplomacyTarget(island, 'empire')).toBe(true);
    expect(missionTypeFor(state, island, 'empire')).toBe('recruit');
  });

  it('stays hidden on an island you have not charted', () => {
    const { state, island, officer } = withRecruit();
    island.explored.empire = false;
    expect(isRecruitTarget(state, island, 'empire')).toBe(false);
    // You may still sail there, but to survey it — you cannot sign on somebody
    // you have no idea is standing on the quay. Finding them is what the trip
    // is for.
    expect(missionTypeFor(state, island, 'empire')).toBe('survey');
    expect(missionError(state, officer.id, island.id)).toBeNull();
  });

  it('is harder to sign on the better they are', () => {
    const { officer, recruit } = withRecruit();
    const plain = { ...recruit, diplomacy: 40, espionage: 40, combat: 40, leadership: 40 };
    const star = { ...recruit, diplomacy: 40, espionage: 40, combat: 40, leadership: 95 };
    expect(quality(star)).toBe(95);
    expect(recruitChance(officer, star)).toBeLessThan(recruitChance(officer, plain));
    // And a better negotiator does better on the same person.
    expect(recruitChance({ ...officer, diplomacy: 100 }, star)).toBeGreaterThan(
      recruitChance({ ...officer, diplomacy: 20 }, star),
    );
  });

  it('adds them to your roster for good, and ends the mission', () => {
    let signed = false;
    for (let seed = 1; seed <= 40 && !signed; seed++) {
      const { state, officer, recruit, island } = withRecruit();
      const before = state.characters.filter((c) => c.faction === 'empire').length;
      const cycle = cycleDays(state, officer.id, island.id) + 12;
      startMission(state, officer.id, island.id);
      expect(getCharacter(state, officer.id).mission!.type).toBe('recruit');
      runDays(state, cycle, seed);

      const after = getCharacter(state, recruit.id);
      if (after.faction !== 'empire') continue;
      signed = true;
      expect(state.characters.filter((c) => c.faction === 'empire')).toHaveLength(before + 1);
      expect(after.status).toBe('available');
      expect(after.locationSystemId).toBe(island.id);
      // Nothing left to do there, so the island stops offering it.
      expect(isRecruitTarget(state, island, 'empire')).toBe(false);
    }
    expect(signed).toBe(true);
  });

  it('does not cancel a parley because a stranger wandered ashore', () => {
    // Signing someone on outranks a parley when choosing where to send an
    // officer. It must not outrank one already fifteen days under way: what
    // matters once they are committed is whether their own errand still exists.
    const { state } = withRecruit();
    const officer = state.characters.filter((c) => c.faction === 'empire')[1];
    // Nobody's, charted, and with nobody ashore to sign on — or the errand
    // would already be a recruitment.
    const quiet = state.systems.find(
      (s) =>
        s.control === 'neutral' &&
        s.populated &&
        s.explored.empire &&
        !state.characters.some((c) => c.faction === 'neutral' && c.locationSystemId === s.id),
    )!;
    startMission(state, officer.id, quiet.id);
    expect(getCharacter(state, officer.id).mission!.type).toBe('diplomacy');

    // Somebody turns up on the island while the boat is out.
    const wanderer = state.characters.find((c) => c.faction === 'neutral')!;
    wanderer.locationSystemId = quiet.id;
    wanderer.appearsOnDay = 1;
    expect(missionTypeFor(state, quiet, 'empire')).toBe('recruit');

    runDays(state, travelDays(state, officer.locationSystemId, quiet.id) + 1, 4);
    const after = getCharacter(state, officer.id);
    expect(after.mission?.type).toBe('diplomacy');
    expect(after.mission?.phase).toBe('working');
  });

  it('stands the officer down if the other side signs them first', () => {
    const { state, officer, recruit, island } = withRecruit();
    startMission(state, officer.id, island.id);
    expect(getCharacter(state, officer.id).mission!.phase).toBe('travelling');

    // The Alliance gets to them while the boat is still out.
    getCharacter(state, recruit.id).faction = 'alliance';

    const rng = createRng(3);
    for (let day = 0; day < travelDays(state, officer.locationSystemId, island.id) + 2; day++) {
      advanceMissions(state, rng);
    }
    const after = getCharacter(state, officer.id);
    expect(after.mission).toBeUndefined();
    expect(after.status).toBe('available');
  });
});


describe('sabotage', () => {
  /** An enemy island the empire has charted, with works standing on it. */
  function withWorks(seed = 311) {
    const state = generateGalaxy(seed);
    const agent = state.characters.find((c) => c.faction === 'empire')!;
    agent.espionage = 100;
    const island = state.systems.find(
      (s) => s.control === 'alliance' && s.facilities.length > 0 && quiet(state, s),
    )!;
    island.explored.empire = true;
    return { state, agent, island };
  }

  it('is offered on enemy works and nowhere else', () => {
    const { state, island } = withWorks();
    expect(isSabotageTarget(island, 'empire')).toBe(true);
    // Not your own works, however much you dislike them.
    const mine = state.systems.find((s) => s.control === 'empire' && s.facilities.length > 0)!;
    expect(isSabotageTarget(mine, 'empire')).toBe(false);
    // Not an island nobody has built on.
    const bare = { ...island, facilities: [] };
    expect(isSabotageTarget(bare, 'empire')).toBe(false);
    // Not a rumour.
    const unseen = { ...island, explored: { empire: false, alliance: true } };
    expect(isSabotageTarget(unseen, 'empire')).toBe(false);
  });

  it('reads off Espionage rather than Diplomacy', () => {
    const { agent } = withWorks();
    const talker = { ...agent, espionage: 10, diplomacy: 100 };
    const spy = { ...agent, espionage: 100, diplomacy: 10 };
    expect(successChance(spy, 'sabotage')).toBeGreaterThan(successChance(talker, 'sabotage'));
    // And the other way round for a parley, so the two want different people.
    expect(successChance(talker, 'diplomacy')).toBeGreaterThan(successChance(spy, 'diplomacy'));
  });

  it('comes last: an island you could turn is worth turning instead', () => {
    const { state, island } = withWorks();
    // Populated and worth inciting -> incite wins.
    island.populated = true;
    island.uprising = false;
    island.support = { empire: 5, alliance: 70 };
    expect(missionTypeFor(state, island, 'empire')).toBe('incite');
    // Already in revolt: there is nothing left to stir, so break the works.
    island.uprising = true;
    expect(missionTypeFor(state, island, 'empire')).toBe('sabotage');
  });

  it('takes the most valuable works first, and finishes when none are left', () => {
    const { state, agent, island } = withWorks();
    island.uprising = true;
    island.facilities = [
      { id: 'f-mine', type: 'mine', owner: 'alliance' },
      { id: 'f-yard', type: 'shipyard', owner: 'alliance' },
    ];
    startMission(state, agent.id, island.id);
    expect(getCharacter(state, agent.id).mission!.type).toBe('sabotage');

    // Walk seeds until one lands, the way the incitement tests do: the point
    // is which building goes, not how often.
    let burnt: string | null = null;
    for (let seed = 1; seed <= 60 && !burnt; seed++) {
      const trial = generateGalaxy(311);
      const who = trial.characters.find((c) => c.id === agent.id)!;
      who.espionage = 100;
      const where = trial.systems.find((s) => s.id === island.id)!;
      where.explored.empire = true;
      where.uprising = true;
      where.facilities = [
        { id: 'f-mine', type: 'mine', owner: 'alliance' },
        { id: 'f-yard', type: 'shipyard', owner: 'alliance' },
      ];
      startMission(trial, who.id, where.id);
      const rng = createRng(seed);
      for (let day = 0; day < 60 && where.facilities.length === 2; day++) {
        advanceMissions(trial, rng);
      }
      if (where.facilities.length < 2) burnt = where.facilities.map((f) => f.type).join(',');
    }
    // The slipway, not the mine: burning a yard costs them the hulls they have
    // not laid down yet.
    expect(burnt).toBe('mine');
  });
});


describe('survey', () => {
  it('is the only thing you can do with an island you have not charted', () => {
    const state = generateGalaxy(311);
    const dark = state.systems.find((s) => !s.explored.empire)!;
    expect(isSurveyTarget(dark, 'empire')).toBe(true);
    expect(missionTypeFor(state, dark, 'empire')).toBe('survey');
    // Everything else needs the island charted first, so nothing competes.
    dark.explored.empire = true;
    expect(isSurveyTarget(dark, 'empire')).toBe(false);
  });

  it('always charts the island stood on, and more of the chain for a better spy', () => {
    const run = (espionage: number) => {
      const state = generateGalaxy(311);
      const agent = state.characters.find((c) => c.faction === 'empire')!;
      agent.espionage = espionage;
      const dark = state.systems.find((s) => !s.explored.empire)!;
      startMission(state, agent.id, dark.id);
      expect(getCharacter(state, agent.id).mission!.type).toBe('survey');
      const rng = createRng(4);
      for (let day = 0; day < 60 && !dark.explored.empire; day++) advanceMissions(state, rng);
      return state.systems.filter((s) => s.sectorId === dark.sectorId && s.explored.empire).length;
    };
    const poor = run(10);
    const good = run(100);
    // A fortnight ashore always puts that island on the chart, whoever went.
    expect(poor).toBeGreaterThan(0);
    // And a good spy works out the neighbours as well.
    expect(good).toBeGreaterThan(poor);
  });
});

describe('choosing among what an island offers', () => {
  it('lists every errand an enemy island with a works offers, and starts the chosen one', async () => {
    const { generateGalaxy } = await import('../galaxy');
    const { missionsOffered, startMission, missionError } = await import('../missions');
    const state = generateGalaxy(77, 'empire');
    // Somewhere the Confederacy holds that the Crown has charted, with something
    // to break; one of theirs is walked ashore so there is someone to carry off.
    const theirs = state.systems.find(
      (s) => s.control === 'alliance' && s.explored.empire && !s.uprising && s.facilities.length > 0,
    )!;
    expect(theirs).toBeDefined();
    // Their own ground offers no abduction — that is only off it — but it
    // offers both an incitement and a sabotage, and the player picks.
    const offered = missionsOffered(state, theirs, 'empire');
    expect(offered).toEqual(expect.arrayContaining(['incite', 'sabotage']));
    expect(offered.length).toBeGreaterThanOrEqual(2);
    const officer = state.characters.find((c) => c.faction === 'empire' && c.status === 'available')!;
    // A choice the island does not offer is refused; one it does is taken as chosen.
    expect(missionError(state, officer.id, theirs.id, 'diplomacy')).toMatch(/not on offer/);
    startMission(state, officer.id, theirs.id, 'incite');
    expect(officer.mission?.type).toBe('incite');
  });
});
