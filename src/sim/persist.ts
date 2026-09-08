import type { GameState } from './types';

export const SAVE_KEY = 'galactic-rebellion.save.v1';

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
    // A restored game always comes back paused.
    return { ...parsed, speed: 'paused' };
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
