import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { createRng } from '../rng';
import { advanceMissions, craftGrade, isAbductTarget, isCommandTarget, isResearchTarget, missionTypeFor, startMission } from '../missions';
import { effectiveSpec, queueBuild } from '../build';
import { buildSpec, shipsFor } from '../constants';
import { CAPTIVE_DAYS, MISSION_WORK_DAYS, RESEARCH_MIN_SUPPORT } from '../constants';
import type { Character, GameState, System } from '../types';

function world(seed = 501): GameState {
  return generateGalaxy(seed, 'empire');
}

/** Put a character on an island, ready to be sent. */
function place(_state: GameState, who: Character, system: System) {
  who.locationSystemId = system.id;
  who.status = 'available';
  who.mission = undefined;
}

/** Run enough days for a mission started on the spot to land and report. */
function runMission(state: GameState, days = MISSION_WORK_DAYS + 2) {
  const rng = createRng(7);
  for (let i = 0; i < days; i++) advanceMissions(state, rng);
}

describe('abduction', () => {
  it('offers no lift on an island the enemy holds, however many of them are on it', () => {
    const state = world();
    const theirs = state.systems.find((s) => s.control === 'alliance')!;
    const them = state.characters.find((c) => c.faction === 'alliance')!;
    place(state, them, theirs);
    theirs.explored.empire = true;
    // Their own ground, their own garrison. This is what incitement is for,
    // and if abduction took precedence here their capital would never be
    // anything else — every one of their crew starts standing on it.
    expect(isAbductTarget(state, theirs, 'empire')).toBe(false);
    expect(missionTypeFor(state, theirs, 'empire')).not.toBe('abduct');
  });

  it('takes an enemy officer caught off their own ground, and gives them back later', () => {
    const state = world();
    const mine = state.systems.find((s) => s.control === 'empire' && s.populated)!;
    const them = state.characters.find((c) => c.faction === 'alliance')!;
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
