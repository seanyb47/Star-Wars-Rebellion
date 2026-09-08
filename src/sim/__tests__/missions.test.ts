import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import {
  advanceMissions,
  continueMission,
  endMission,
  isDiplomacyTarget,
  missionError,
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

  it('rejects enemy-held, unpopulated and revolting worlds', () => {
    const { state, sameSector, diplomat } = setup();
    const enemy = state.systems.find((s) => s.control === 'alliance')!;
    enemy.explored.empire = true;
    expect(isDiplomacyTarget(enemy, 'empire')).toBe(false);

    const empty = state.systems.find((s) => !s.populated)!;
    empty.explored.empire = true;
    expect(isDiplomacyTarget(empty, 'empire')).toBe(false);

    sameSector.uprising = true;
    expect(missionError(state, diplomat.id, sameSector.id)).toBe('Not a valid diplomatic target.');
  });

  it('rejects a character who is already busy', () => {
    const { state, diplomat, sameSector } = setup();
    diplomat.status = 'on_mission';
    expect(missionError(state, diplomat.id, sameSector.id)).toBe('Character is not available.');
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
    const { state, diplomat, sameSector } = setup();
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
