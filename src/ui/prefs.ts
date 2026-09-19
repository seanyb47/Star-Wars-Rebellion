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
  /** Fold identical hulls and troops into one line with a count. */
  group: boolean;
  /*
   * `reorder` stood here and is gone.
   *
   * It switched the up-and-down arrows on, and Sean cut the switch on 19
   * September: *"No need for group and reorder."* The arrows are simply
   * there now on any list long enough to have an order — a mode you have to
   * turn on before you can move a thing is one more step than moving it.
   */
  /**
   * The chart filters, in the order this player wants to swipe through them.
   *
   * Sean, 19 September: *"Add in settings ability to change default order of
   * game filters."* Which filters matter is a question about how somebody
   * plays rather than about the game, so it belongs here with grouping rather
   * than in the save: a player who lives on Idle buildings wants it first in
   * every war they start, not just this one.
   *
   * Stored as ids and deliberately not validated on write. A build that adds
   * a filter, or drops one, must not strand somebody with a saved order that
   * no longer matches — `orderedLayers` reconciles it at read time instead.
   */
  layerOrder: string[];
}

const DEFAULTS: Prefs = { group: true, layerOrder: [] };

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

/**
 * The filter strip in this player's order, reconciled with the build's.
 *
 * Three things can have happened since the order was saved: a filter was
 * added, a filter was removed, or neither. All three are the same operation —
 * take the saved ids that still exist, then append anything the build has
 * that the saved order does not, in the build's own order. A new filter
 * appears at the end rather than vanishing, and a retired one is dropped
 * without comment.
 *
 * That is why the preference stores ids and not specs: the spec is the
 * build's to own, and only the sequence is the player's.
 */
export function orderedLayers<T extends { id: string }>(all: readonly T[], order: string[]): T[] {
  const byId = new Map(all.map((l) => [l.id, l]));
  const out: T[] = [];
  for (const id of order) {
    const found = byId.get(id);
    if (found && !out.includes(found)) out.push(found);
  }
  for (const l of all) if (!out.includes(l)) out.push(l);
  return out;
}
