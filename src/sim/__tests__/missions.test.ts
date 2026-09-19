import { describe, expect, it } from 'vitest';
import { generateGalaxy, START_CHARACTERS } from '../galaxy';
import { MISSION_WORK_DAYS, RECRUIT_CEILING, RECRUIT_MIN_SUPPORT } from '../constants';
import {
  advanceMissions,
  continueMission,
  endMission,
  foilChance,
  isDiplomacyTarget,
  isInciteTarget,
  isMissionTarget,
  canRecruit,
  canRecruitAt,
  recruitPool,
  isSabotageTarget,
  isSurveyTarget,

  recruitChance,
  missionError,

  missionTypeFor,
  missionsOffered,
  startMission,
  successChance,
  travelDays,
} from '../missions';
import { getCharacter, getSystem, setSupport } from '../helpers';
import { createRng } from '../rng';
import { resolveControlAndUnrest } from '../support';
import { inciteStanding } from '../politics';
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

/**
 * Days, the way `advanceDay` spends them — the errands *and* the daily pass
 * that re-derives control.
 *
 * It used to be the errands alone, which was fine while a revolt was a
 * threshold the mission itself could cross. Mutiny is a roll taken once a day
 * now, in the control pass, so a loop that never ran that pass could stir an
 * island as far as it liked and never see it rise.
 */
function runDays(state: GameState, days: number, seed: number) {
  const rng = createRng(seed);
  for (let day = 0; day < days; day++) {
    advanceMissions(state, rng);
    resolveControlAndUnrest(state, rng);
  }
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
    setSupport(own, 'empire', 70);
    expect(isDiplomacyTarget(own, 'empire')).toBe(true);
  });

  /**
   * Sean: *"Parley shouldn't be available if location is 100% your loyalty
   * already."* Opinion adds up to a hundred across the two sides, so an island
   * at a hundred for you is one the other side has nobody on — a fortnight
   * ashore to move a bar that cannot move.
   */
  it('refuses an island already wholly yours, and takes it back the moment it drifts', () => {
    const { state } = setup();
    const own = state.systems.find((s) => s.control === 'empire')!;
    setSupport(own, 'empire', 100);
    expect(isDiplomacyTarget(own, 'empire')).toBe(false);
    setSupport(own, 'empire', 99.5);
    expect(isDiplomacyTarget(own, 'empire')).toBe(true);
  });

  it('rejects unpopulated and revolting worlds', () => {
    const { state, sameSector, diplomat } = setup();
    const empty = state.systems.find((s) => !s.populated)!;
    empty.explored.empire = true;
    expect(isDiplomacyTarget(empty, 'empire')).toBe(false);
    expect(isInciteTarget(empty, 'empire')).toBe(false);
    expect(isMissionTarget(state, empty, 'empire')).toBe(false);

    /**
     * An island in revolt has nothing anybody can *do* to it — no parley, no
     * incitement, no posting on ground that is not yours — but it still has
     * something to look at, so the default errand is nothing while the offered
     * list is a report. That gap is the point of the pair: `missionTypeFor`
     * answers what an officer sent here would end up doing, and espionage is
     * never that answer, because a report is a thing you decide you want.
     */
    sameSector.uprising = true;
    expect(missionTypeFor(state, sameSector, 'empire')).toBeNull();
    expect(missionsOffered(state, sameSector, 'empire')).toEqual(['espionage']);
    expect(missionError(state, diplomat.id, sameSector.id, 'diplomacy')).toBe(
      'Parley is not on offer there.',
    );
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

  /**
   * Allegiance is still one balance, whatever the cycle happened to roll: what
   * you win is exactly what they lose. The figure is no longer predictable —
   * it used to be a flat `8 + Diplomacy/10` every single time — so this asks
   * the rule rather than the arithmetic.
   */
  it('moves one balance: what you win is exactly what they lose', () => {
    const { state, diplomat, sameSector } = setup();
    diplomat.diplomacy = 100;
    sameSector.support = { empire: 20, alliance: 80 };
    const before = getSystem(state, sameSector.id).support.empire;
    const cycle = cycleDays(state, diplomat.id, sameSector.id);
    startMission(state, diplomat.id, sameSector.id);
    runDays(state, cycle, 2);
    const after = getSystem(state, sameSector.id);
    expect(after.support.empire + after.support.alliance).toBeCloseTo(100);
    // A cycle either lands or it does not; either way the island is not left
    // somewhere between the two sides' books.
    expect(after.support.empire).not.toBe(before + 18);
  });

  /**
   * The eighty-point line is gone. Sean's brief: *"as allegiance becomes
   * strongly favorable, the probability of the island peacefully joining
   * should increase... but none of these should guarantee conversion."*
   *
   * So a warm island does not join on a number, and a cold one cannot be
   * talked over at all. Given enough meetings, a warm one does come across.
   */
  it('lets a warm island decide to join, in its own time and never on a number', () => {
    const { state, diplomat, sameSector } = setup();
    diplomat.diplomacy = 100;
    sameSector.support = { empire: 88, alliance: 12 };
    // Crossing eighty does nothing by itself: no meeting, no decision.
    resolveControlAndUnrest(state);
    expect(getSystem(state, sameSector.id).control).toBe('neutral');

    startMission(state, diplomat.id, sameSector.id);
    const cycle = cycleDays(state, diplomat.id, sameSector.id);
    runDays(state, cycle + MISSION_WORK_DAYS * 8, 2);
    expect(getSystem(state, sameSector.id).control).toBe('empire');
  });

  /**
   * Sean: *"parley mission should keep going automatically until loyalty is
   * 100% yours or you're interrupted."* It is the one errand with an end you
   * can see coming and no decision in the middle of it, and asking every
   * fortnight was a prompt whose answer was always the same.
   */
  it('never asks about a parley: the talks run themselves', () => {
    const { state, diplomat, sameSector } = setup();
    const cycle = cycleDays(state, diplomat.id, sameSector.id);
    startMission(state, diplomat.id, sameSector.id);
    runDays(state, cycle, 2);
    expect(state.pendingDecisions).toHaveLength(0);
    expect(getCharacter(state, diplomat.id).mission?.type).toBe('diplomacy');
    expect(getCharacter(state, diplomat.id).mission!.daysRemaining).toBe(MISSION_WORK_DAYS);
  });

  it('queues a continue-or-return decision on an errand that has one', () => {
    const { state, diplomat } = setup();
    // Charting a chain is a decision every time: there is always more dark
    // water, and whether it is worth another fortnight is the player's call.
    const dark = state.systems.find((s) => !s.explored.empire)!;
    const cycle = cycleDays(state, diplomat.id, dark.id);
    startMission(state, diplomat.id, dark.id, 'survey');
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
    // Incitement is settled on Leadership now, not Diplomacy.
    agent.leadership = 100;
    // And Espionage is what gets them through the door before any of that is
    // asked. Covert work by somebody who cannot hide is caught, which is the
    // design: the risk tests below pass no agent at all and so still measure
    // the island's watch undiluted.
    agent.espionage = 90;
    const island = state.systems.find(
      (s) => s.control === 'alliance' && s.populated && quiet(state, s),
    )!;
    island.explored.empire = true;
    island.uprising = false;
    island.support = { empire: 100 - allianceSupport, alliance: allianceSupport };
    return { state, agent, island };
  }

  it('is harder the tighter their grip, and every point it takes off them is yours', () => {
    const { state, agent, island } = withEnemyIsland(70);
    /*
     * Sean's rule, off the memo: incitement is Leadership *modified by the
     * island's loyalty*, so the island is half the sum and the same officer is
     * a different proposition on a wavering holding and on a wholly loyal one.
     * It used to be a flat discount on Diplomacy, which made an enemy capital
     * exactly as easy to stir as a frontier outpost.
     */
    const tight = inciteStanding(state, island, 'empire', [agent]).chance;
    island.support = { empire: 45, alliance: 55 };
    const wavering = inciteStanding(state, island, 'empire', [agent]).chance;
    island.support = { empire: 30, alliance: 70 };
    expect(wavering).toBeGreaterThan(tight);

    startMission(state, agent.id, island.id);
    expect(getCharacter(state, agent.id).mission!.type).toBe('incite');

    const before = { ...island.support };
    // Long enough to travel and work a cycle. Seeds walked until one lands.
    let landed = false;
    for (let seed = 1; seed <= 40 && !landed; seed++) {
      const trial = generateGalaxy(311);
      const who = trial.characters.find((c) => c.id === agent.id)!;
      who.diplomacy = 100;
      who.leadership = 100;
      const where = trial.systems.find((s) => s.id === island.id)!;
      where.explored.empire = true;
      where.support = { ...before };
      const cycle = cycleDays(trial, who.id, where.id) + 8;
      startMission(trial, who.id, where.id);
      runDays(trial, cycle, seed);
      const after = getSystem(trial, island.id);
      if (after.support.alliance < before.alliance) {
        landed = true;
        /*
         * How far their grip falls is no longer a figure anybody can predict —
         * a landed cycle is worth somewhere between a couple of points and ten,
         * read off how well the roll went. What has not changed, and is what
         * this is for, is that there is no third place for an angry island to
         * go: every point taken off the governor lands on you.
         */
        const lost = before.alliance - after.support.alliance;
        expect(lost).toBeGreaterThan(0);
        expect(after.support.empire - before.empire).toBeCloseTo(lost);
        expect(after.support.empire + after.support.alliance).toBeCloseTo(100);
      }
    }
    expect(landed).toBe(true);
  });

  it('sets an island alight once the governor drops under the threshold', () => {
    const { state, agent, island } = withEnemyIsland(34);
    // One company, not none. An island its holder has left completely empty
    // does not riot now — it changes hands outright, because loyalty decides
    // where nobody is standing. Incitement is about the other case: a place
    // held too thinly for what its people think of it.
    island.garrison = 1;
    const sailAndWork = cycleDays(state, agent.id, island.id) + 12;
    startMission(state, agent.id, island.id);
    /*
     * Work it until it rises, answering its own continue decisions — and
     * sending the officer back when the watch turns them off the island,
     * which is what a player does and what the rule now requires. Being found
     * out ends the errand outright since 17 September: the two stages are the
     * door and the job, and a party caught at the door never gets to the job.
     * The test used to give up at the first setback, which measured luck.
     */
    let rose = false;
    for (let cycle = 0; cycle < 12 && !rose; cycle++) {
      runDays(state, sailAndWork, 7 + cycle);
      rose = getSystem(state, island.id).uprising;
      if (rose) break;
      const who = getCharacter(state, agent.id);
      expect(who.status, 'taken on a one-company island').not.toBe('captured');
      if (who.status === 'injured') {
        who.status = 'available';
        who.injuredDays = undefined;
        startMission(state, who.id, island.id);
        continue;
      }
      if (state.pendingDecisions.length > 0) {
        state.pendingDecisions = [];
        continueMission(state, agent.id);
      }
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

/**
 * Signing on, rebuilt to Sean's Rebellion memo of 17 September.
 *
 * The old model was a manhunt: eight strangers scattered on eight islands, a
 * chart filter that pinned every one of them, and an errand that meant sailing
 * to wherever a particular person happened to be standing — often ground you
 * did not hold. *"The game does not force the player to travel around the
 * galaxy looking for specific people... the character pool determines who is
 * available; the recruiting location determines the conditions."*
 *
 * So: a pool, a harbor of your own that is loyal enough, a Recruiter to keep
 * the table, Leadership to settle it, and nothing certain.
 */
describe('recruitment', () => {
  /** A loyal harbor of the Crown's, and a Recruiter standing in it. */
  function withHarbor(seed = 321) {
    const state = generateGalaxy(seed);
    const officer = state.characters.find((c) => c.faction === 'empire' && canRecruit(c))!;
    const island = state.systems.find(
      (s) => s.control === 'empire' && s.populated && !s.uprising,
    )!;
    setSupport(island, 'empire', 90);
    officer.locationSystemId = island.id;
    return { state, officer, island };
  }

  it('belongs to neither side until signed, and never shows up as crew', () => {
    const state = generateGalaxy(6);
    for (const faction of ['empire', 'alliance'] as const) {
      const roster = state.characters.filter((c) => c.faction === faction);
      expect(roster).toHaveLength(START_CHARACTERS[faction]);
      for (const who of roster) expect(who.appearsOnDay).toBeUndefined();
    }
    expect(state.characters.some((c) => c.faction === 'neutral')).toBe(true);
  });

  /** Both sides can always grow: the Regent and the three Lords are drawn into
   *  every war, and the Crown's Regent and two of the Lords are Recruiters. */
  it('leaves each side at least one crew member who can keep a table', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const state = generateGalaxy(seed);
      for (const faction of ['empire', 'alliance'] as const) {
        expect(
          state.characters.some((c) => c.faction === faction && canRecruit(c)),
          `seed ${seed}, ${faction}`,
        ).toBe(true);
      }
    }
  });

  it('is offered at a loyal harbor of your own and at no other kind of island', () => {
    const { state, island, officer } = withHarbor();
    expect(canRecruitAt(state, island, 'empire')).toBe(true);
    expect(missionsOffered(state, island, 'empire', officer)).toContain('recruit');

    // Not somebody else's island, however warm it is to you.
    const theirs = state.systems.find((s) => s.control === 'alliance' && s.populated)!;
    setSupport(theirs, 'empire', 100);
    expect(canRecruitAt(state, theirs, 'empire')).toBe(false);

    // Not an unaligned one either. You sign articles in your own harbor.
    const nobody = state.systems.find((s) => s.control === 'neutral' && s.populated)!;
    setSupport(nobody, 'empire', 100);
    expect(canRecruitAt(state, nobody, 'empire')).toBe(false);
  });

  it('wants a harbor that is loyal, not merely held', () => {
    const { state, island } = withHarbor();
    setSupport(island, 'empire', RECRUIT_MIN_SUPPORT - 1);
    expect(canRecruitAt(state, island, 'empire')).toBe(false);
    setSupport(island, 'empire', RECRUIT_MIN_SUPPORT);
    expect(canRecruitAt(state, island, 'empire')).toBe(true);
    // And nobody signs articles on an island in revolt.
    island.uprising = true;
    expect(canRecruitAt(state, island, 'empire')).toBe(false);
  });

  it('is led by a Recruiter and by nobody else', () => {
    const { state, island, officer } = withHarbor();
    const other = state.characters.find(
      (c) => c.faction === 'empire' && c.id !== officer.id && !canRecruit(c),
    )!;
    expect(missionsOffered(state, island, 'empire', officer)).toContain('recruit');
    expect(missionsOffered(state, island, 'empire', other)).not.toContain('recruit');
    expect(recruitChance(other, island, 'empire')).toBe(0);
  });

  /** *"The primary attribute governing recruitment is Leadership."* */
  it('is settled by Leadership and by the harbor, and never by certainty', () => {
    const { officer, island } = withHarbor();
    const strong = { ...officer, leadership: 100 };
    const weak = { ...officer, leadership: 20 };
    expect(recruitChance(strong, island, 'empire')).toBeGreaterThan(
      recruitChance(weak, island, 'empire'),
    );
    // Diplomacy is not what this errand is about any more.
    expect(recruitChance({ ...officer, diplomacy: 100 }, island, 'empire')).toBe(
      recruitChance({ ...officer, diplomacy: 10 }, island, 'empire'),
    );
    // A devoted harbor beats a merely adequate one, with the same officer.
    const devoted = { ...island, support: { empire: 100, alliance: 0 } };
    const adequate = { ...island, support: { empire: RECRUIT_MIN_SUPPORT, alliance: 100 - RECRUIT_MIN_SUPPORT } };
    expect(recruitChance(officer, devoted, 'empire')).toBeGreaterThan(
      recruitChance(officer, adequate, 'empire'),
    );
    expect(recruitChance(strong, devoted, 'empire')).toBeLessThanOrEqual(RECRUIT_CEILING);
  });

  it('adds somebody to your roster for good, and stands them at the harbor', () => {
    let signed = false;
    for (let seed = 1; seed <= 40 && !signed; seed++) {
      const { state, officer, island } = withHarbor();
      const before = state.characters.filter((c) => c.faction === 'empire').length;
      const pool = recruitPool(state).map((c) => c.id);
      startMission(state, officer.id, island.id, 'recruit');
      expect(getCharacter(state, officer.id).mission!.type).toBe('recruit');
      runDays(state, cycleDays(state, officer.id, island.id) + 12, seed);
      const roster = state.characters.filter((c) => c.faction === 'empire');
      if (roster.length === before) continue;
      signed = true;
      expect(roster).toHaveLength(before + 1);
      const joined = roster.find((c) => pool.includes(c.id))!;
      expect(joined.status).toBe('available');
      // Sean's memo: both of them stay where the papers were signed.
      expect(joined.locationSystemId).toBe(island.id);
    }
    expect(signed).toBe(true);
  });

  it('stops being offered once there is nobody left in the world to sign', () => {
    const { state, island, officer } = withHarbor();
    for (const person of recruitPool(state)) person.faction = 'alliance';
    expect(recruitPool(state)).toHaveLength(0);
    expect(canRecruitAt(state, island, 'empire')).toBe(false);
    expect(missionsOffered(state, island, 'empire', officer)).not.toContain('recruit');
  });

  /** *"Unsuccessful recruitment can be attempted again immediately."* A
   *  fortnight that came to nothing costs the fortnight and nothing else. */
  it('costs nothing but the fortnight when nobody signs', () => {
    const { state, officer, island } = withHarbor();
    const before = { ...state.factions.empire };
    startMission(state, officer.id, island.id, 'recruit');
    runDays(state, cycleDays(state, officer.id, island.id) + 2, 77);
    const after = getCharacter(state, officer.id);
    expect(after.status).not.toBe('captured');
    expect(after.status).not.toBe('injured');
    expect(state.factions.empire.gold).toBe(before.gold);
    // Still standing in their own harbor, free to try again.
    expect(after.locationSystemId).toBe(island.id);
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
      const runs = travelDays(state, agent.locationSystemId, dark.id) + MISSION_WORK_DAYS + 10;
      for (let day = 0; day < runs && !dark.explored.empire; day++) advanceMissions(state, rng);
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
