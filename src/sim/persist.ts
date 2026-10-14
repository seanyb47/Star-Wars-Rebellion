import { isPlayable } from './helpers';
import type { GameState } from './types';

/**
 * Bumped when the shape of a saved game changes. v2 replaced the two-resource
 * economy with gold; v3 replaced the Confederacy's base with the three Pirate
 * Lords and their ships; v4 made an island's room one pool instead of two; v5
 * took the Lords off the water and made them personnel, which leaves a v4 save
 * carrying three hulls of classes that no longer have numbers; v6 gave the
 * land a say — walls with a condition, bombardment, and hull damage that mends
 * — so a v5 save has an unwalled capital and a war that cannot be fought the
 * way this one is; v7 made a build order a job in works-days with the passage
 * kept separate, so a v6 save's orders count down a number that no longer
 * exists and every yard on it would sit at work forever; v8 put raw resources
 * in the ground and made the two earners need them, so a v7 save is a world of
 * barren islands on which no mill or mine could ever be raised again.
 * An older save cannot be read and is not offered.
 *
 * The Boom's removal is deliberately *not* a version bump. It takes something
 * away rather than changing the shape of anything, so a v8 save still loads
 * and simply comes back without its chains — see `loadGame`.
 */
export const SAVE_KEY = 'seven-seas.save.v8';

/** Saving is just `JSON.stringify` — the whole game is one plain object. */
export function saveGame(state: GameState, storage: Storage | undefined = globalThis.localStorage): void {
  if (!storage) return;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing or a full quota: not worth breaking the game over.
  }
}

/**
 * Names that moved, and a game in progress that still uses the old ones.
 *
 * A save carries its own `sectors[].name` and `systems[].name`, but the chart
 * is looked up by `ReachName/IslandName` against `chart.json`, which ships with
 * the build. So renaming a Reach or an island silently breaks every save made
 * before it: the lookup misses, and `GalaxyMap`'s `fallbackSpot` scatters the
 * chain in a ring round the middle of the sea. Sean's day-33 game on 21
 * September showed exactly that — Cinder, Whalers' and Wreckers' floating off
 * the painted land while the three Reaches that were not renamed sat correctly
 * on theirs.
 *
 * Renames are cheap in the data and expensive in a save, which is the opposite
 * of the intuition. **Anything renamed on the chart belongs in this table**,
 * for as long as saves from before it might still be opened.
 */
const RENAMED_REACHES: Record<string, string> = {
  "Whalers' Reach": 'Windward Reach',
  "Wreckers' Reach": 'Sunken Reach',
  'Cinder Reach': 'Mire Reach',
};
const RENAMED_SEAS: Record<string, string> = {
  'The Merchant Sea': 'The Long Sea',
};
const RENAMED_ISLANDS: Record<string, string> = {
  // 21 September, with the three Reaches above.
  Ashcombe: 'Starpath',
  Oakhanger: 'Shellhouse',
  Sawtry: 'Outrigger Bay',
  Pitchcombe: 'Longreef',
  Tarmouth: 'Palmfall',
  Tamalu: 'Reedmoot',
  // And the seat, which went back to being the port rather than the landmass
  // the same morning.
  'The Aldermain': 'Highwater',
  // 21 September, and the canonical roster's doing rather than the lore
  // package's. The sheet has a Confederate hull called the Chimera, and
  // Sean's rule is that no ship may open on the same four letters as an
  // island — a ship and a place read a minute apart are easy to confuse and
  // there is a test that fails the build over it. The ship's name is locked
  // canon and the island's was not, so the island moved. It keeps its
  // shells: the wind-chimes still hang in every doorway.
  Chimehouse: 'Shellhouse',
};

export function loadGame(
  storage: Storage | undefined = globalThis.localStorage,
  /** Which slot. The bare key is the save from before there were several. */
  key: string = SAVE_KEY,
): GameState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || !Array.isArray(parsed.systems) || parsed.systems.length === 0) return null;
    if (typeof parsed.factions?.empire?.gold !== 'number') return null;
    // Fleets arrived after this save version. Rather than throw away a game in
    // progress over an additive change, a save without them is a game with no
    // ships in the water, which is exactly what it is.
    const fleets = (Array.isArray(parsed.fleets) ? parsed.fleets : []).map((f) => ({
      ...f,
      officerIds: Array.isArray(f.officerIds) ? f.officerIds : [],
    }));
    const systems = parsed.systems.map((s) => ({
      ...s,
      // See RENAMED_ISLANDS: a save from before a rename still says the old
      // name, and the chart no longer answers to it. `chartName` goes too —
      // Freeport is renamed at runtime and keeps its painted name there, so
      // that, not `name`, is what the lookup actually uses for it.
      name: RENAMED_ISLANDS[s.name] ?? s.name,
      ...(s.chartName ? { chartName: RENAMED_ISLANDS[s.chartName] ?? s.chartName } : {}),
      blockaded: !!s.blockaded,
      // Creatures moved out to the frontier after this save version. A game
      // from before it has nothing in any water, which is a duller world than
      // the one it was saved from but not a broken one.
      beastSeen: s.beastSeen ?? { empire: false, alliance: false },
      // The Boom was cut on 16 September, and a v8 save from that morning can
      // still have chains across its harbors. They come out on load rather
      // than costing somebody a war in progress: a facility of a type nothing
      // in the game knows about any more has no name, no picture and no rule,
      // and would sit on an island's board as a blank tile for ever.
      facilities: s.facilities.filter((f) => (f.type as string) !== 'boom'),
    }));
    // Craft arrived the same way fleets did. A save from before it is a side
    // that has researched nothing, which is true.
    const factions = {
      empire: { ...parsed.factions.empire, craft: parsed.factions.empire.craft ?? 0 },
      alliance: { ...parsed.factions.alliance, craft: parsed.factions.alliance.craft ?? 0 },
    };
    const sectors = (parsed.sectors ?? []).map((sec) => ({
      ...sec,
      name: RENAMED_REACHES[sec.name] ?? sec.name,
      sea: RENAMED_SEAS[sec.sea] ?? sec.sea,
    }));
    /*
     * Who is playing, for a save written when that was two fields.
     *
     * `human` replaced the pair of them — `player` for the only side a person
     * could be, and an `observing` flag to say "actually, nobody" — because
     * two sides can be people now and `faction !== player` called the second
     * one a machine. A save from before carries the old pair, and the old pair
     * says exactly what the new field needs: watching means nobody, anything
     * else means the one side that was yours.
     *
     * A save written *after* has `human` and keeps it, which is what lets a
     * PvP game be reopened as one rather than quietly becoming a game against
     * the machine.
     */
    const legacy = parsed as GameState & { observing?: boolean };
    const human = Array.isArray(parsed.human)
      ? parsed.human.filter(isPlayable)
      : legacy.observing
        ? []
        : [parsed.player];
    // A restored game always comes back paused.
    return { ...parsed, fleets, systems, sectors, factions, human, speed: 'paused' };
  } catch {
    return null;
  }
}

export function clearSave(storage: Storage | undefined = globalThis.localStorage): void {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------- more than one game */

/**
 * Several wars at once, each with a name.
 *
 * Sean, 14 October: *"shouldn't I be able to have multiple games going at
 * once? Like a save and name game kinda thing?"* There was one slot and one
 * button that said *Continue your game*, so starting a second war destroyed
 * the first — and the title screen warned about it, which is an apology rather
 * than a feature.
 *
 * Kept as an **index plus a slot each**, rather than one object holding every
 * war. A war is around 130 KB and the index is a few hundred bytes, so the
 * title screen can list what you have without reading, parsing and holding
 * four complete worlds in memory to do it. It also means a single corrupt save
 * costs that one war instead of all of them.
 */
const GAMES_KEY = 'seven-seas.games.v1';

/** What the title screen needs to list a war without loading it. */
export interface SavedGame {
  id: string;
  name: string;
  /** Where it had got to, so the list reads as wars rather than as files. */
  day: number;
  side: GameState['player'];
  /** Epoch milliseconds, for "yesterday" and for the order of the list. */
  savedAt: number;
}

function slotKey(id: string): string {
  return `${SAVE_KEY}.${id}`;
}

function readIndex(storage: Storage): SavedGame[] {
  try {
    const raw = storage.getItem(GAMES_KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedGame[]) : [];
    return Array.isArray(parsed) ? parsed.filter((g) => g && typeof g.id === 'string') : [];
  } catch {
    return [];
  }
}

function writeIndex(storage: Storage, games: SavedGame[]): void {
  try {
    storage.setItem(GAMES_KEY, JSON.stringify(games));
  } catch {
    /* a full quota is reported by `saveGameAs`, which is the call that matters */
  }
}

/** A name for a war nobody has named: the side, and the day it was begun. */
export function defaultGameName(state: GameState): string {
  const side = state.player === 'empire' ? 'Crown' : 'Confederacy';
  const when = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${side}, ${when}`;
}

export function newGameId(): string {
  return `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Every war you have, newest first — and the one from before there were slots.
 *
 * The legacy single save is adopted the first time this is called, so somebody
 * mid-war through the old build opens this one and finds their game in the
 * list rather than a title screen offering them nothing. It is moved rather
 * than copied: left where it was, the next autosave of a *different* war would
 * have written over it.
 */
export function listGames(storage: Storage | undefined = globalThis.localStorage): SavedGame[] {
  if (!storage) return [];
  const games = readIndex(storage);
  const legacy = storage.getItem(SAVE_KEY);
  if (legacy && !games.some((g) => g.id === 'legacy')) {
    const state = loadGame(storage);
    if (state) {
      const adopted: SavedGame = {
        id: 'legacy',
        name: defaultGameName(state),
        day: state.day,
        side: state.player,
        savedAt: Date.now(),
      };
      try {
        storage.setItem(slotKey('legacy'), legacy);
        storage.removeItem(SAVE_KEY);
      } catch {
        /* if it cannot be moved it is left alone and simply not listed */
      }
      const next = [adopted, ...games];
      writeIndex(storage, next);
      return next;
    }
  }
  return [...games].sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Write a war to its own slot, and say whether it got there.
 *
 * Unlike `saveGame` this reports failure, because with several wars a full
 * quota is a thing that actually happens and a player who is told can delete
 * one. Silence was defensible when losing the save meant losing the only game;
 * it is not when it means the autosave has quietly stopped working.
 */
export function saveGameAs(
  id: string,
  name: string,
  state: GameState,
  storage: Storage | undefined = globalThis.localStorage,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(slotKey(id), JSON.stringify(state));
  } catch {
    return false;
  }
  const games = readIndex(storage).filter((g) => g.id !== id);
  writeIndex(storage, [
    { id, name, day: state.day, side: state.player, savedAt: Date.now() },
    ...games,
  ]);
  return true;
}

export function loadGameById(
  id: string,
  storage: Storage | undefined = globalThis.localStorage,
): GameState | null {
  if (!storage) return null;
  // `loadGame` holds every migration a save needs, so it is read through that
  // rather than parsed here — one place where an old save becomes a new one.
  return loadGame(storage, slotKey(id));
}

export function deleteGame(id: string, storage: Storage | undefined = globalThis.localStorage): void {
  if (!storage) return;
  try {
    storage.removeItem(slotKey(id));
  } catch {
    /* ignore */
  }
  writeIndex(storage, readIndex(storage).filter((g) => g.id !== id));
}

export function renameGame(
  id: string,
  name: string,
  storage: Storage | undefined = globalThis.localStorage,
): void {
  if (!storage) return;
  writeIndex(
    storage,
    readIndex(storage).map((g) => (g.id === id ? { ...g, name } : g)),
  );
}
