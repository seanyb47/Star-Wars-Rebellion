import { describe, expect, it } from 'vitest';
import { advanceDay } from '../advanceDay';
import { generateGalaxy } from '../galaxy';
import { createRng } from '../rng';
import { isLord } from '../lords';
import {
  advanceMissions,
  bestOf,
  companionsFor,
  craftGrade,
  endMission,
  isAbductTarget,
  isCommandTarget,
  isMissionTarget,
  isResearchTarget,
  isRescueTarget,
  missionTypeFor,
  missionsOffered,
  partyOf,
  partyStrength,
  successChance,
  startMission,
} from '../missions';
import { effectiveSpec, queueBuild } from '../build';
import { buildSpec, shipsFor } from '../constants';
import { CAPTIVE_DAYS, MISSION_PARTY_MAX, MISSION_WORK_DAYS, RESEARCH_MIN_SUPPORT } from '../constants';
import type { Character, GameState, System } from '../types';

function world(seed = 501): GameState {
  return generateGalaxy(seed, 'empire');
}

/** Put a character on an island, ready to be sent. */
function place(state: GameState, who: Character, system: System) {
  who.locationSystemId = system.id;
  who.status = 'available';
  who.mission = undefined;
  // Ashore, not serving with a fleet.
  for (const f of state.fleets) f.officerIds = f.officerIds.filter((id) => id !== who.id);
}

/** Run enough days for a mission started on the spot to land and report. */
function runMission(state: GameState, days = MISSION_WORK_DAYS + 2) {
  const rng = createRng(7);
  for (let i = 0; i < days; i++) advanceMissions(state, rng);
}

describe('abduction', () => {
  it('offers no lift on an island the enemy holds — unless a Lord is standing on it', () => {
    const state = world();
    const theirs = state.systems.find((s) => s.control === 'alliance')!;
    const them = state.characters.find((c) => c.faction === 'alliance' && !isLord(c))!;
    const lord = state.characters.find((c) => c.faction === 'alliance' && isLord(c))!;
    for (const c of state.characters) if (c.faction === 'alliance') place(state, c, state.systems[0]);
    place(state, them, theirs);
    theirs.explored.empire = true;
    // Their own ground, their own garrison. This is what incitement is for,
    // and if abduction took precedence here their capital would never be
    // anything else — every one of their crew starts standing on it.
    expect(isAbductTarget(state, theirs, 'empire')).toBe(false);
    expect(missionTypeFor(state, theirs, 'empire')).not.toBe('abduct');

    // A Lord is the one exception, because a Lord is the war. Without it the
    // Crown has no route to its own victory at all: the three of them stand on
    // Confederate ground, and measured over sixteen wars with their harbor
    // closed the Crown won none of them and took no Lord.
    place(state, lord, theirs);
    expect(isAbductTarget(state, theirs, 'empire')).toBe(true);
    expect(missionTypeFor(state, theirs, 'empire')).toBe('abduct');
  });

  it('takes an enemy officer caught off their own ground, and gives them back later', () => {
    const state = world();
    const mine = state.systems.find((s) => s.control === 'empire' && s.populated)!;
    // Not a Lord: they never leave their ships and cannot be lifted off a quay.
    const them = state.characters.find((c) => c.faction === 'alliance' && !isLord(c))!;
    const me = state.characters.find((c) => c.faction === 'empire')!;
    place(state, them, mine);
    place(state, me, mine);
    me.espionage = 100;
    them.combat = 1;
    them.leadership = 1;

    expect(isAbductTarget(state, mine, 'empire')).toBe(true);
    expect(missionTypeFor(state, mine, 'empire')).toBe('abduct');

    startMission(state, me.id, mine.id);
    runMission(state);
    expect(them.status).toBe('captured');
    // Held at your seat, not left where they were lifted.
    expect(them.locationSystemId).toBe(state.factions.empire.hqSystemId);

    // And they are inert while held: not idle, not sailable, not a target.
    expect(isAbductTarget(state, mine, 'empire')).toBe(false);

    // Two months later they are exchanged and back at their own capital.
    const rng = createRng(3);
    for (let i = 0; i < CAPTIVE_DAYS + 1; i++) advanceMissions(state, rng);
    expect(them.status).toBe('available');
    expect(them.locationSystemId).toBe(state.factions.alliance.hqSystemId);
  });
});

describe('command over an island', () => {
  it('is the answer to your own island in revolt, which nothing else was', () => {
    const state = world();
    const mine = state.systems.find((s) => s.control === 'empire' && s.populated)!;
    mine.uprising = true;
    // Parley refuses a risen island, incitement wants the enemy's, and
    // sabotage wants their works: before this there was no errand at all here.
    expect(isCommandTarget(mine, 'empire')).toBe(true);
    expect(missionTypeFor(state, mine, 'empire')).toBe('command');
  });

  it('puts the revolt down, and moves the bar even on a bad cycle', () => {
    const state = world();
    const mine = state.systems.find((s) => s.control === 'empire' && s.populated)!;
    const me = state.characters.find((c) => c.faction === 'empire')!;
    mine.uprising = true;
    mine.support.empire = 30;
    place(state, me, mine);
    me.leadership = 100;
    const before = mine.support.empire;

    startMission(state, me.id, mine.id);
    runMission(state);
    expect(mine.support.empire).toBeGreaterThan(before);
    expect(mine.uprising).toBe(false);
  });
});

describe('research', () => {
  it('waits until the island has nothing left to be talked round about', () => {
    const state = world();
    const yard = state.systems.find(
      (s) =>
        s.control === 'empire' &&
        s.facilities.some((f) => f.type === 'shipyard' || f.type === 'construction_yard'),
    )!;
    yard.support.empire = RESEARCH_MIN_SUPPORT - 10;
    expect(isResearchTarget(yard, 'empire')).toBe(false);
    // Below the floor there is still a parley worth having, and it wins.
    expect(missionTypeFor(state, yard, 'empire')).toBe('diplomacy');

    yard.support.empire = RESEARCH_MIN_SUPPORT + 5;
    expect(isResearchTarget(yard, 'empire')).toBe(true);
    expect(missionTypeFor(state, yard, 'empire')).toBe('research');
  });

  it('makes hulls cheaper and quicker, and only hulls', () => {
    const state = world();
    const hull = shipsFor('empire')[0].id;
    const before = effectiveSpec(state, 'empire', hull);
    expect(before).toEqual({ costGold: buildSpec(hull).costGold, days: buildSpec(hull).days });

    state.factions.empire.craft = 1000; // well past grade three
    expect(craftGrade(state.factions.empire.craft)).toBe(3);
    const after = effectiveSpec(state, 'empire', hull);
    expect(after.costGold).toBeLessThan(before.costGold);
    expect(after.days).toBeLessThan(before.days);
    expect(after.days).toBeGreaterThan(0);

    // A mine is a mine whatever the shipwrights have learned.
    expect(effectiveSpec(state, 'empire', 'mine')).toEqual({
      costGold: buildSpec('mine').costGold,
      days: buildSpec('mine').days,
    });
  });

  it('charges the discounted price, not the sticker price', () => {
    const state = world();
    state.factions.empire.craft = 1000;
    const yard = state.systems.find((s) =>
      s.facilities.some((f) => f.owner === 'empire' && f.type === 'shipyard'),
    );
    if (!yard) return; // no slipway in this opening; the sums above still hold
    const slipway = yard.facilities.find((f) => f.owner === 'empire' && f.type === 'shipyard')!;
    const hull = shipsFor('empire')[0].id;
    const purse = state.factions.empire.gold;
    const spec = effectiveSpec(state, 'empire', hull);
    queueBuild(state, slipway.id, hull);
    expect(state.factions.empire.gold).toBe(purse - spec.costGold);
    expect(slipway.building!.daysRemaining).toBe(spec.days);
  });
});

describe('rescue', () => {
  it('breaks one of yours out of the enemy seat and sends them home', () => {
    const state = world();
    const empireHq = state.systems.find((s) => s.id === state.factions.empire.hqSystemId)!;
    const allianceHq = state.systems.find((s) => s.id === state.factions.alliance.hqSystemId)!;
    const [held, rescuer] = state.characters.filter((c) => c.faction === 'alliance');
    // Held at the Crown's seat, as an abduction leaves them.
    held.status = 'captured';
    held.injuredDays = CAPTIVE_DAYS;
    held.mission = undefined;
    held.locationSystemId = empireHq.id;
    // Not on offer until the seat is known.
    empireHq.explored.alliance = false;
    expect(isRescueTarget(state, empireHq, 'alliance')).toBe(false);
    empireHq.explored.alliance = true;
    expect(isRescueTarget(state, empireHq, 'alliance')).toBe(true);
    expect(missionsOffered(state, empireHq, 'alliance')).toContain('rescue');
    // Outranks stirring the Crown's own capital.
    expect(missionTypeFor(state, empireHq, 'alliance')).toBe('rescue');

    place(state, rescuer, allianceHq);
    rescuer.espionage = 100;
    // Seven in ten with a master spy; a handful of seeds finds a landing.
    let freed = false;
    for (let seed = 1; seed <= 12 && !freed; seed++) {
      const trial = structuredClone(state);
      const who = trial.characters.find((c) => c.id === rescuer.id)!;
      const them = trial.characters.find((c) => c.id === held.id)!;
      startMission(trial, who.id, empireHq.id, 'rescue');
      expect(who.mission?.type).toBe('rescue');
      const rng = createRng(seed);
      for (let d = 0; d < 40 && them.status === 'captured'; d++) advanceMissions(trial, rng);
      if (them.status === 'available') {
        freed = true;
        // Home, not standing on the enemy quay.
        expect(them.locationSystemId).toBe(allianceHq.id);
        expect(trial.events.some((e) => /out of the cells/.test(e.text))).toBe(true);
      }
    }
    expect(freed).toBe(true);
  });
});

describe('a boat with more than one in it', () => {
  it('takes who is in the same harbor, ashore or afloat, and nobody else', () => {
    const state = generateGalaxy(21, 'empire');
    const leader = state.characters.find((c) => c.faction === 'empire')!;
    const here = leader.locationSystemId;
    const eligible = companionsFor(state, leader);
    for (const c of eligible) {
      expect(c.locationSystemId).toBe(here);
      expect(c.faction).toBe('empire');
      expect(c.status).toBe('available');
      expect(c.id).not.toBe(leader.id);
    }
    // Somebody on another island is not in the boat.
    const far = state.characters.find(
      (c) => c.faction === 'empire' && c.locationSystemId !== here,
    );
    if (far) expect(eligible.map((c) => c.id)).not.toContain(far.id);
    // Nor is one of theirs.
    const theirs = state.characters.find((c) => c.faction === 'alliance')!;
    expect(eligible.map((c) => c.id)).not.toContain(theirs.id);
  });

  it('carries four at most, and the extras are simply not in it', () => {
    const state = generateGalaxy(21, 'empire');
    const leader = state.characters.find((c) => c.faction === 'empire')!;
    const mates = companionsFor(state, leader);
    const target = state.systems.find(
      (s) => s.id !== leader.locationSystemId && isMissionTarget(state, s, 'empire'),
    )!;
    startMission(state, leader.id, target.id, undefined, mates.map((c) => c.id));
    const party = partyOf(state, leader);
    expect(party.length).toBeLessThanOrEqual(MISSION_PARTY_MAX);
    expect(party[0].id).toBe(leader.id);
    for (const mate of party.slice(1)) {
      expect(mate.status).toBe('on_mission');
      expect(mate.escorting).toBe(leader.id);
      // A companion carries no errand of their own, so the day resolves one.
      expect(mate.mission).toBeUndefined();
    }
  });

  it('is worth its best hand at each thing, not its average', () => {
    const state = generateGalaxy(21, 'empire');
    const leader = state.characters.find((c) => c.faction === 'empire')!;
    const mates = companionsFor(state, leader);
    if (mates.length === 0) return;
    const target = state.systems.find(
      (s) => s.id !== leader.locationSystemId && isMissionTarget(state, s, 'empire'),
    )!;
    startMission(state, leader.id, target.id, undefined, mates.map((c) => c.id));
    const all = partyOf(state, leader);
    const boat = partyStrength(state, leader);
    for (const ability of ['diplomacy', 'espionage', 'combat', 'leadership'] as const) {
      expect(boat[ability]).toBe(Math.max(...all.map((c) => c[ability])));
    }
  });

  it('is lifted by a specialist and unmoved by a passenger', () => {
    const state = generateGalaxy(21, 'empire');
    const leader = state.characters.find((c) => c.faction === 'empire')!;
    const better = { ...leader, id: 'chr-ace', espionage: leader.espionage + 25 };
    const worse = { ...leader, id: 'chr-dud', espionage: 1, diplomacy: 1, combat: 1, leadership: 1 };

    // A better spy raises what the boat can do; a worse one changes nothing.
    expect(bestOf([leader, better]).espionage).toBe(leader.espionage + 25);
    expect(bestOf([leader, worse]).espionage).toBe(leader.espionage);
    expect(successChance(bestOf([leader, better]), 'sabotage')).toBeGreaterThan(
      successChance(leader, 'sabotage'),
    );
    expect(successChance(bestOf([leader, worse]), 'sabotage')).toBe(
      successChance(leader, 'sabotage'),
    );
  });

  it('brings everybody home when the errand ends, wherever it ended', () => {
    let state = generateGalaxy(21, 'empire');
    const leaderId = state.characters.find((c) => c.faction === 'empire')!.id;
    const leader = state.characters.find((c) => c.id === leaderId)!;
    const mates = companionsFor(state, leader).slice(0, 2);
    if (mates.length === 0) return;
    const mateIds = mates.map((c) => c.id);
    const target = state.systems.find(
      (s) => s.id !== leader.locationSystemId && isMissionTarget(state, s, 'empire'),
    )!;
    startMission(state, leaderId, target.id, undefined, mateIds);

    state = advanceDay(state);
    for (const id of mateIds) {
      expect(state.characters.find((c) => c.id === id)!.status).toBe('on_mission');
    }
    // End it however it ends, then let a day pass.
    endMission(state, leaderId);
    state = advanceDay(state);
    for (const id of mateIds) {
      const mate = state.characters.find((c) => c.id === id)!;
      expect(mate.status).toBe('available');
      expect(mate.escorting).toBeUndefined();
    }
  });
});
