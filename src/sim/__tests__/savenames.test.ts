import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { advanceDay } from '../advanceDay';
import { loadGame, saveGame } from '../persist';
import chartData from '../../data/chart.json';
import type { GameState } from '../types';

/**
 * A game in progress, opened after the names moved.
 *
 * Sean, 21 September, on a day-33 Crown game: *"Whoa!!!! All island broke in
 * wrong spots now."* The chart showed **Cinder Reach**, **Whalers' Reach** and
 * **Wreckers' Reach** as loose clusters of dots floating off the painted land,
 * while Sovereign, Coral and Salt — the three not renamed that morning — sat
 * correctly on theirs.
 *
 * The cause is the split between what a save carries and what the build
 * carries. A save has its own `sectors[].name` and `systems[].name`; the chart
 * is `src/data/chart.json`, which ships with the build and is keyed
 * `ReachName/IslandName`. Rename either half and every older save misses the
 * lookup, and `GalaxyMap`'s `fallbackSpot` rings the chain around the middle
 * of the sea — visibly wrong, and no error anywhere.
 *
 * So renames are cheap in the data and expensive in a save, and the guard has
 * to live on the load. These tests are the reason `persist.ts` keeps a rename
 * table at all.
 */

/** A save written before the 21 September renames, as the old build wrote it. */
function oldSave(): string {
  const state = generateGalaxy(501, 'empire');
  const asOld = JSON.parse(JSON.stringify(state)) as GameState;
  const reaches: Record<string, string> = {
    'Windward Reach': "Whalers' Reach",
    'Sunken Reach': "Wreckers' Reach",
    'Mire Reach': 'Cinder Reach',
  };
  const isles: Record<string, string> = {
    Starpath: 'Ashcombe',
    Chimehouse: 'Oakhanger',
    'Outrigger Bay': 'Sawtry',
    Longreef: 'Pitchcombe',
    Palmfall: 'Tarmouth',
    Reedmoot: 'Tamalu',
    Highwater: 'The Aldermain',
  };
  for (const sec of asOld.sectors) {
    if (reaches[sec.name]) sec.name = reaches[sec.name];
    if (sec.sea === 'The Long Sea') sec.sea = 'The Merchant Sea';
  }
  for (const sys of asOld.systems) if (isles[sys.name]) sys.name = isles[sys.name];
  return JSON.stringify(asOld);
}

function storageWith(raw: string): Storage {
  const map = new Map<string, string>([['seven-seas.save.v8', raw]]);
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

/** Exactly the key `GalaxyMap` and `ChainMap` look a position up by. */
const PLACED = new Set(
  chartData.reaches.flatMap((r) => r.islands.map((i) => `${r.reach}/${i.name}`)),
);
const REACHES = new Set(chartData.reaches.map((r) => r.reach));

describe('a save made before the names moved', () => {
  it('comes back with every Reach and island the chart can place', () => {
    const loaded = loadGame(storageWith(oldSave()))!;
    expect(loaded).not.toBeNull();
    for (const sector of loaded.sectors) {
      expect(REACHES.has(sector.name), `Reach ${sector.name} is not on the chart`).toBe(true);
      for (const id of sector.systemIds) {
        const island = loaded.systems.find((s) => s.id === id)!;
        // The same key the interface uses. `chartName` matters: Freeport is
        // renamed at runtime and keeps its painted name there, so an island
        // can be called one thing and charted under another.
        const key = `${sector.name}/${island.chartName ?? island.name}`;
        expect(PLACED.has(key), `${key} has no painted position`).toBe(true);
      }
    }
  });

  it('keeps the seat findable by name after it was renamed', () => {
    const loaded = loadGame(storageWith(oldSave()))!;
    const seat = loaded.systems.find((s) => s.id === loaded.factions.empire.hqSystemId)!;
    expect(seat.name).toBe('Highwater');
  });

  it('still plays: the restored world runs days without breaking', () => {
    let state = loadGame(storageWith(oldSave()))!;
    for (let day = 0; day < 20; day++) state = advanceDay(state);
    expect(state.day).toBeGreaterThan(1);
  });

  /**
   * Non-vacuity, and the proof that the fixture is really a *broken* save:
   * without the migration these names are exactly what the chart cannot place.
   */
  it('is testing a save that would genuinely have broken', () => {
    const raw = JSON.parse(oldSave()) as GameState;
    const lost = raw.sectors.filter((sec) => !REACHES.has(sec.name));
    expect(lost.map((s) => s.name).sort()).toEqual([
      'Cinder Reach',
      "Whalers' Reach",
      "Wreckers' Reach",
    ]);
  });

  /** And a save written by today's build is untouched by the table. */
  it('leaves a current save exactly as it was', () => {
    const state = generateGalaxy(501, 'empire');
    const storage = storageWith('');
    saveGame(state, storage);
    const loaded = loadGame(storage)!;
    expect(JSON.stringify({ ...loaded, speed: state.speed })).toEqual(JSON.stringify(state));
  });
});
