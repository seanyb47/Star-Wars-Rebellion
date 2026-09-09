import { describe, expect, it } from 'vitest';
import { advanceDay, checkVictory } from '../advanceDay';
import { YARD_BUILDS } from '../constants';
import { generateGalaxy } from '../galaxy';
import { newGame, orderBuild, resolvePendingMission, sendDiplomat, setSpeed } from '../commands';
import { clearSave, loadGame, saveGame } from '../persist';
import { getSystem } from '../helpers';
import type { GameState } from '../types';

/** What a new game starts with; kept here so the test states the intent. */
const START_GOLD = 150;

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
    expect(after.systems).toHaveLength(100);
    expect(after.day).toBeGreaterThan(1);
    for (const system of after.systems) {
      expect(system.support.empire).toBeGreaterThanOrEqual(0);
      expect(system.support.empire).toBeLessThanOrEqual(100);
      expect(system.facilities.filter((f) => f.type === 'mine').length).toBeLessThanOrEqual(
        system.rawSlots,
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

  it('sends a diplomat out on its mission cycle', () => {
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
  it('declares a winner at 60% of populated systems', () => {
    const state = generateGalaxy(409);
    const populated = state.systems.filter((s) => s.populated);
    for (const system of populated.slice(0, Math.ceil(populated.length * 0.6))) {
      system.control = 'empire';
    }
    checkVictory(state);
    expect(state.winner).toBe('empire');
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
      .find((f) => f.type === 'construction_yard' && f.owner === 'empire')!;
    state.factions.empire.gold = 0;
    const result = orderBuild(state, yard.id, 'shipyard');
    expect(result.error).toBeTruthy();
    expect(result.state).toBe(state);
  });

  it('applies a legal order to a fresh copy', () => {
    const state = newGame(410);
    const yard = state.systems
      .flatMap((s) => s.facilities)
      .find((f) => f.type === 'construction_yard' && f.owner === 'empire')!;
    const result = orderBuild(state, yard.id, 'mine');
    expect(result.error).toBeUndefined();
    expect(result.state).not.toBe(state);
    // The order is paid for out of the treasury, and only on the new state.
    expect(state.factions.empire.gold).toBe(START_GOLD);
    expect(result.state.factions.empire.gold).toBe(START_GOLD - YARD_BUILDS.mine.costGold);
  });

  it('runs a diplomacy mission end to end through the command layer', () => {
    let state = newGame(411);
    const diplomat = state.characters.find((c) => c.faction === 'empire')!;
    const home = getSystem(state, diplomat.locationSystemId);
    const target = state.systems.find(
      (s) => s.sectorId === home.sectorId && s.control === 'neutral',
    )!;

    const sent = sendDiplomat(state, diplomat.id, target.id);
    expect(sent.error).toBeUndefined();
    state = tick(sent.state, 18);
    expect(state.pendingDecisions).toHaveLength(1);

    const resolved = resolvePendingMission(state, diplomat.id, 'return');
    expect(resolved.error).toBeUndefined();
    expect(resolved.state.pendingDecisions).toHaveLength(0);
    const freed = resolved.state.characters.find((c) => c.id === diplomat.id)!;
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
    expect(loaded.systems).toHaveLength(100);
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
