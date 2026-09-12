import type { GameState } from './types';

/**
 * Bumped when the shape of a saved game changes. v2 replaced the two-resource
 * economy with gold, so a v1 save cannot be read and is simply not offered.
 */
export const SAVE_KEY = 'seven-seas.save.v2';

/** Saving is just `JSON.stringify` — the whole game is one plain object. */
export function saveGame(state: GameState, storage: Storage | undefined = globalThis.localStorage): void {
  if (!storage) return;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing or a full quota: not worth breaking the game over.
  }
}

export function loadGame(storage: Storage | undefined = globalThis.localStorage): GameState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SAVE_KEY);
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
    const systems = parsed.systems.map((s) => ({ ...s, blockaded: !!s.blockaded }));
    // Craft arrived the same way fleets did. A save from before it is a side
    // that has researched nothing, which is true.
    const factions = {
      empire: { ...parsed.factions.empire, craft: parsed.factions.empire.craft ?? 0 },
      alliance: { ...parsed.factions.alliance, craft: parsed.factions.alliance.craft ?? 0 },
    };
    // A restored game always comes back paused.
    return { ...parsed, fleets, systems, factions, speed: 'paused' };
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
