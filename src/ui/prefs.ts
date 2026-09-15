import { useCallback, useEffect, useState } from 'react';

/**
 * How the player likes their lists, kept on the device rather than in the
 * game.
 *
 * The difference matters. The *order* of a fleet's hulls is the game's own
 * array and saves with the game, because it is a fact about that fleet. Whether
 * identical hulls are folded into "4 x Kestrel" is not a fact about anything —
 * it is how this person likes to read a list, and it should hold across every
 * game they start rather than being set again each time.
 *
 * Wrapped in try/catch because a private window will throw on the first touch,
 * and a preference is never worth breaking a screen over.
 */
const KEY = 'seven-seas.prefs.v1';

export interface Prefs {
  /** Fold identical hulls and companies into one line with a count. */
  group: boolean;
  /** Show the up and down arrows that put lists in order. */
  reorder: boolean;
}

const DEFAULTS: Prefs = { group: true, reorder: false };

function read(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return DEFAULTS;
  }
}

/**
 * One shared copy, so two panels open at once agree — a React state per
 * component would let the island sheet and the crew screen disagree about
 * whether grouping is on.
 */
let current = read();
const listeners = new Set<(p: Prefs) => void>();

export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  const [prefs, setPrefs] = useState(current);
  useEffect(() => {
    listeners.add(setPrefs);
    return () => void listeners.delete(setPrefs);
  }, []);
  const update = useCallback((patch: Partial<Prefs>) => {
    current = { ...current, ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      // Private browsing. The preference still holds for this session.
    }
    for (const listener of listeners) listener(current);
  }, []);
  return [prefs, update];
}
