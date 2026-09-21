import { crownPrincipals } from '../lords';
import { describe, expect, it } from 'vitest';
import reachData from '../../data/reaches.json';
import { advanceDay, checkVictory } from '../advanceDay';
import { MISSION_WORK_DAYS, YARD_BUILDS } from '../constants';
import { generateGalaxy, START_GOLD } from '../galaxy';
import { newGame, orderBuild, orderRaiseWorks, sendCrew, setSpeed } from '../commands';
import { clearSave, loadGame, saveGame } from '../persist';
import { freeSlots } from '../helpers';
import { getSystem, setSupport } from '../helpers';
import { travelDays } from '../missions';
import type { GameState } from '../types';

/** The map has grown twice this month; the data is the one place it is true. */
const ISLAND_COUNT = reachData.reaches.reduce((n, r) => n + r.islands.length, 0);

/** What a new game starts with; kept here so the test states the intent. */

function tick(state: GameState, days: number): GameState {
  let next = state;
  for (let day = 0; day < days; day++) next = advanceDay(next);
  return next;
}

describe('advanceDay', () => {
  it('does not mutate the state it was given', () => {
    const state = generateGalaxy(401);
    const snapshot = JSON.stringify(state);
    advanceDay(state);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('advances the day counter by one', () => {
    const state = generateGalaxy(401);
    expect(advanceDay(state).day).toBe(state.day + 1);
  });

  it('is deterministic for a given seed', () => {
    const a = tick(generateGalaxy(402), 60);
    const b = tick(generateGalaxy(402), 60);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it('accumulates resources over time', () => {
    const state = generateGalaxy(403);
    const after = tick(state, 30);
    expect(after.factions.empire.gold).toBeGreaterThan(state.factions.empire.gold);
  });

  it('survives a long run without throwing or corrupting the galaxy', () => {
    const after = tick(generateGalaxy(404), 400);
    expect(after.systems).toHaveLength(ISLAND_COUNT);
    expect(after.day).toBeGreaterThan(1);
    for (const system of after.systems) {
      expect(system.support.empire).toBeGreaterThanOrEqual(0);
      expect(system.support.empire).toBeLessThanOrEqual(100);
      expect(system.facilities.filter((f) => f.type === 'mine').length).toBeLessThanOrEqual(
        system.slots,
      );
    }
  });

  it('caps the event feed so saves stay small', () => {
    const after = tick(generateGalaxy(405), 500);
    expect(after.events.length).toBeLessThanOrEqual(400);
  });
});

describe('the opponent AI', () => {
  it('places a build order within its first few cycles', () => {
    const state = tick(generateGalaxy(406), 12);
    const aiOrders = state.systems
      .filter((s) => s.control === 'alliance')
      .flatMap((s) => s.facilities)
      .filter((f) => f.building);
    const aiFacilities = state.systems
      .filter((s) => s.control === 'alliance')
      .flatMap((s) => s.facilities).length;
    // Either an order is in flight, or one already finished and added a facility.
    expect(aiOrders.length + aiFacilities).toBeGreaterThan(0);
    expect(aiOrders.length).toBeGreaterThan(0);
  });

  it('sends a crew member out on their errand cycle', () => {
    const state = tick(generateGalaxy(407), 11);
    const busy = state.characters.filter((c) => c.faction === 'alliance' && c.mission);
    expect(busy.length).toBeGreaterThan(0);
  });

  it('answers its own continue-or-return prompts without queuing them', () => {
    const state = tick(generateGalaxy(408), 90);
    for (const decision of state.pendingDecisions) {
      const character = state.characters.find((c) => c.id === decision.characterId)!;
      expect(character.faction).toBe(state.player);
    }
  });
});

describe('victory', () => {
  it('declares the Confederacy the winner with both Crown principals in irons', () => {
    const state = generateGalaxy(409);
    // Highwater is not the war since 21 September; the two people are.
    const capital = state.systems.find((s) => s.id === state.factions.empire.hqSystemId)!;
    capital.control = 'alliance';
    checkVictory(state);
    expect(state.winner).toBeUndefined();

    for (const who of crownPrincipals(state)) who.status = 'captured';
    checkVictory(state);
    expect(state.winner).toBe('alliance');
    expect(state.speed).toBe('paused');
  });

  it('declares nobody at the start of a game', () => {
    const state = generateGalaxy(409);
    checkVictory(state);
    expect(state.winner).toBeUndefined();
  });

  it('freezes the clock once the war is over', () => {
    const state = generateGalaxy(409);
    state.winner = 'alliance';
    expect(advanceDay(state)).toBe(state);
    expect(setSpeed(state, 'fast').speed).toBe('paused');
  });
});

describe('commands', () => {
  it('returns the original state and an error for an illegal order', () => {
    const state = newGame(410);
    const yard = state.systems
      .flatMap((s) => s.facilities)
      .find((f) => f.type === 'training_facility' && f.owner === 'empire')!;
    state.factions.empire.gold = 0;
    const result = orderBuild(state, yard.id, 'shipyard');
    expect(result.error).toBeTruthy();
    expect(result.state).toBe(state);
  });

  it('applies a legal order to a fresh copy', () => {
    const state = newGame(410);
    // A wall, on an island, because since the construction yard was cut a
    // building is raised in place and there is no works to give the order to.
    // The two earners cost nothing to raise, so a wall is what tests that the
    // treasury is charged — and charged on the new state alone.
    const where = state.systems.find(
      (s) => s.control === 'empire' && !s.uprising && freeSlots(s) > 0,
    )!;
    const result = orderRaiseWorks(state, where.id, 'fort');
    expect(result.error).toBeUndefined();
    expect(result.state).not.toBe(state);
    expect(state.factions.empire.gold).toBe(START_GOLD);
    expect(result.state.factions.empire.gold).toBe(START_GOLD - YARD_BUILDS.fort.costGold);
  });

  it('runs a diplomacy mission end to end through the command layer', () => {
    let state = newGame(411);
    const diplomat = state.characters.find((c) => c.faction === 'empire')!;
    const home = getSystem(state, diplomat.locationSystemId);
    // An island of our own, on purpose: there is no foil risk on ground you
    // hold, so this exercises the command layer rather than a lucky roll. On a
    // neutral island the officer can be found out and come home hurt, which is
    // a perfectly good outcome but not the one this test is about. Any Crown
    // island will do — the Crown's other holdings are not always in the seat's
    // own chain — so the clock runs for the real passage plus the work.
    const target = state.systems.find((s) => s.control === 'empire' && s.id !== home.id)!;
    // Under the research floor, so the island asks for a parley and not for
    // its yards to be put to work.
    target.support.empire = 60;

    const sent = sendCrew(state, diplomat.id, target.id);
    expect(sent.error).toBeUndefined();
    // Exactly the passage plus the work: the clock pauses on a decision in
    // play, and a test that runs past it sees the same decision raised again.
    state = tick(sent.state, travelDays(state, home.id, target.id) + MISSION_WORK_DAYS);

    /*
     * And nobody is asked anything. A parley runs itself until the island is
     * wholly yours or something stops it — Sean's rule, 17 September — so the
     * end-to-end test is that the talks carry on by themselves and stop when
     * there is nobody left to talk round.
     */
    expect(state.pendingDecisions).toHaveLength(0);
    expect(state.characters.find((c) => c.id === diplomat.id)!.mission?.type).toBe('diplomacy');

    /*
     * Cycle after cycle, unasked.
     *
     * The island is put back under the ceiling first, and deliberately. This
     * used to rely on a parley on your own ground never getting there by
     * itself — opinion drifts back toward `HELD_SUPPORT_LEVEL` every day, so
     * it settles into a tug of war in the sixties — which held until the
     * opening changed underneath it and the draw handed this seed the Lord
     * Regent, who argues at fifteen points a fortnight and reached a hundred
     * in three. The talks ending there is the rule working, and it is the
     * *next* assertion's job. This one is about them not asking.
     */
    for (const s of state.systems) if (s.id === target.id) setSupport(s, 'empire', 60);
    state = tick(state, MISSION_WORK_DAYS * 2);
    expect(state.pendingDecisions).toHaveLength(0);
    expect(state.characters.find((c) => c.id === diplomat.id)!.mission?.type).toBe('diplomacy');

    /*
     * And they stop when there is nobody left to talk round. Set outright
     * rather than argued up to: on an island you already hold, opinion drifts
     * back toward `HELD_SUPPORT_LEVEL` every day, so a parley on your own
     * ground settles into a tug of war in the sixties and never reaches the
     * ceiling by itself. Reaching it is a thing that happens on a neutral
     * island being won over, or with the drift beaten by something else — and
     * either way this is the rule for what happens when it does.
     */
    /* Held at the ceiling for the whole window rather than set once. Opinion
       drifts back toward `HELD_SUPPORT_LEVEL` a quarter-point a day, so a
       single set is only true on the morning it is made — and whether the
       cycle happens to end before the drift has eaten a quarter point is a
       matter of where the day's other business left the dice. The rule under
       test is "talks end when there is nobody left to talk round", not "they
       end within one cycle of a number that is already sliding". */
    for (let day = 0; day < MISSION_WORK_DAYS + 1; day++) {
      for (const s of state.systems) if (s.id === target.id) setSupport(s, 'empire', 100);
      state = advanceDay(state);
    }
    const freed = state.characters.find((c) => c.id === diplomat.id)!;
    expect(freed.mission).toBeUndefined();
    expect(freed.status).toBe('available');
  });
});

describe('save and load', () => {
  /** Minimal in-memory Storage stand-in so the test runs outside a browser. */
  function memoryStorage(): Storage {
    const map = new Map<string, string>();
    return {
      get length() {
        return map.size;
      },
      clear: () => map.clear(),
      getItem: (k: string) => map.get(k) ?? null,
      key: (i: number) => [...map.keys()][i] ?? null,
      removeItem: (k: string) => void map.delete(k),
      setItem: (k: string, v: string) => void map.set(k, v),
    } as Storage;
  }

  it('round-trips a game through storage', () => {
    const storage = memoryStorage();
    const state = tick(generateGalaxy(412), 25);
    saveGame(state, storage);
    const loaded = loadGame(storage)!;
    expect(loaded.day).toBe(state.day);
    expect(loaded.systems).toHaveLength(ISLAND_COUNT);
    expect(JSON.stringify({ ...loaded, speed: state.speed })).toEqual(JSON.stringify(state));
  });

  it('always comes back paused', () => {
    const storage = memoryStorage();
    const state = { ...generateGalaxy(412), speed: 'fast' as const };
    saveGame(state, storage);
    expect(loadGame(storage)!.speed).toBe('paused');
  });

  it('returns null when there is nothing saved, and after clearing', () => {
    const storage = memoryStorage();
    expect(loadGame(storage)).toBeNull();
    saveGame(generateGalaxy(1), storage);
    clearSave(storage);
    expect(loadGame(storage)).toBeNull();
  });

  it('ignores corrupt save data instead of crashing', () => {
    const storage = memoryStorage();
    storage.setItem('galactic-rebellion.save.v1', '{not json');
    expect(loadGame(storage)).toBeNull();
  });
});
