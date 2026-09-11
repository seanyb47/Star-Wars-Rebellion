import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { RECRUITS_IN_PLAY } from '../constants';
import {
  advanceMissions,
  continueMission,
  endMission,
  foilChance,
  isDiplomacyTarget,
  isInciteTarget,
  isMissionTarget,
  isRecruitTarget,
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
import type { GameState } from '../types';

function setup(seed = 301) {
  const state = generateGalaxy(seed);
  const diplomat = state.characters.find((c) => c.faction === 'empire')!;
  diplomat.diplomacy = 60;
  const home = getSystem(state, diplomat.locationSystemId);
  const sameSector = state.systems.find(
    (s) => s.sectorId === home.sectorId && s.control === 'neutral',
  )!;
  const crossSector = state.systems.find(
    (s) => s.sectorId !== home.sectorId && s.control === 'neutral' && s.isCore,
  )!;
  return { state, diplomat, home, sameSector, crossSector };
}

/** Run enough days for travel plus a full working cycle. */
function runDays(state: GameState, days: number, seed: number) {
  const rng = createRng(seed);
  for (let day = 0; day < days; day++) advanceMissions(state, rng);
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
    const enemy = state.systems.find((s) => s.control === 'alliance')!;
    enemy.explored.empire = true;

    expect(missionTypeFor(state, sameSector, 'empire')).toBe('diplomacy');
    expect(missionTypeFor(state, own, 'empire')).toBe('diplomacy');
    expect(missionTypeFor(state, enemy, 'empire')).toBe('incite');
    // You cannot parley with an island they hold, nor stir up one of your own.
    expect(isDiplomacyTarget(enemy, 'empire')).toBe(false);
    expect(isInciteTarget(own, 'empire')).toBe(false);
  });

  it('will not send anyone to an island they have never charted', () => {
    const { state, diplomat } = setup();
    const enemy = state.systems.find((s) => s.control === 'alliance')!;
    enemy.explored.empire = false;
    expect(isMissionTarget(state, enemy, 'empire')).toBe(false);
    expect(missionError(state, diplomat.id, enemy.id)).toBe('Nothing to be done there.');
  });

  it('rejects a character who is already busy', () => {
    const { state, diplomat, sameSector } = setup();
    diplomat.status = 'on_mission';
    expect(missionError(state, diplomat.id, sameSector.id)).toBe('They are not free to sail.');
  });
});

describe('travel', () => {
  it('takes 3 days inside a sector and 10 across sectors', () => {
    const { state, home, sameSector, crossSector } = setup();
    expect(travelDays(state, home.id, sameSector.id)).toBe(3);
    expect(travelDays(state, home.id, crossSector.id)).toBe(10);
  });

  it('moves the character on arrival and starts the 15-day work phase', () => {
    const { state, diplomat, sameSector } = setup();
    startMission(state, diplomat.id, sameSector.id);
    expect(diplomat.mission!.phase).toBe('travelling');

    runDays(state, 3, 1);
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
    sameSector.support = { empire: 20, alliance: 30 };
    startMission(state, diplomat.id, sameSector.id);

    // Seed 2 draws a success on the resolving day.
    runDays(state, 18, 2);
    const after = getSystem(state, sameSector.id);
    expect(after.support.empire).toBeCloseTo(38); // 20 + 8 + 100/10
    expect(after.support.alliance).toBeCloseTo(26);
  });

  it('flips a neutral world once the mission pushes support over the line', () => {
    const { state, diplomat, sameSector } = setup();
    diplomat.diplomacy = 100;
    sameSector.support = { empire: 52, alliance: 10 };
    startMission(state, diplomat.id, sameSector.id);
    runDays(state, 18, 2);
    expect(getSystem(state, sameSector.id).control).toBe('empire');
  });

  it('queues a continue-or-return decision for the player', () => {
    const { state, diplomat, sameSector } = setup();
    startMission(state, diplomat.id, sameSector.id);
    runDays(state, 18, 2);
    expect(state.pendingDecisions).toHaveLength(1);
    expect(state.pendingDecisions[0].characterId).toBe(diplomat.id);
  });

  it('starts another 15-day cycle on continue', () => {
    const { state, diplomat, sameSector } = setup();
    startMission(state, diplomat.id, sameSector.id);
    runDays(state, 18, 2);
    continueMission(state, diplomat.id);
    expect(state.pendingDecisions).toHaveLength(0);
    expect(getCharacter(state, diplomat.id).mission!.daysRemaining).toBe(15);
  });

  it('frees the character on return', () => {
    const { state, diplomat, sameSector } = setup();
    startMission(state, diplomat.id, sameSector.id);
    runDays(state, 18, 2);
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
      startMission(trial, agent.id, sameSector.id);
      runDays(trial, 18, seed);
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
    startMission(state, diplomat.id, own.id);
    for (let seed = 1; seed <= 30; seed++) {
      runDays(state, 20, seed);
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
    const island = state.systems.find((s) => s.control === 'alliance' && s.populated)!;
    island.explored.empire = true;
    island.uprising = false;
    island.support = { empire: 5, alliance: allianceSupport };
    return { state, agent, island };
  }

  it('is harder than a parley and takes support off the holder, not onto you', () => {
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
      startMission(trial, who.id, where.id);
      runDays(trial, 26, seed);
      const after = getSystem(trial, island.id);
      if (after.support.alliance < before.alliance) {
        landed = true;
        // Their grip falls by the officer's measure, and only part of it comes
        // to you — an angry island is not a friendly one.
        const lost = before.alliance - after.support.alliance;
        expect(lost).toBeGreaterThanOrEqual(inciteLoss(who) - 0.001);
        expect(after.support.empire - before.empire).toBeLessThan(lost);
        expect(after.support.empire - before.empire).toBeGreaterThan(0);
      }
    }
    expect(landed).toBe(true);
  });

  it('sets an island alight once the governor drops under the threshold', () => {
    const { state, agent, island } = withEnemyIsland(34);
    island.garrison = 0;
    startMission(state, agent.id, island.id);
    // Work it until it rises, answering its own continue decisions.
    let rose = false;
    for (let cycle = 0; cycle < 8 && !rose; cycle++) {
      runDays(state, 30, 7 + cycle);
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
      expect(roster).toHaveLength(7);
    }
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
    expect(missionError(state, officer.id, island.id)).toBe('Nothing to be done there.');
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
      startMission(state, officer.id, island.id);
      expect(getCharacter(state, officer.id).mission!.type).toBe('recruit');
      runDays(state, 30, seed);

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
    const quiet = state.systems.find(
      (s) => s.control === 'neutral' && s.populated && s.explored.empire,
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
