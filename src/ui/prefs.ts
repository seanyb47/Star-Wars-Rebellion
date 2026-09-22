import { useCallback, useEffect, useState } from 'react';
import type { EventKind, GameEvent } from '../sim';

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
  /**
   * Kinds of news that are NOT to interrupt, stored as the exceptions.
   *
   * Sean, 22 September: *"let's add some kind of toggle filter in the log on
   * which ones you want to be pop-ups, which ones you want to be like alerts
   * ... or you could uncheck both boxes and have no notifications, and then
   * the notification will just go to the log itself."*
   *
   * The exceptions rather than the list, and that is the whole reason it is
   * shaped this way: `DEFAULTS` merges shallowly, so a saved record of every
   * kind would freeze this player's settings at the kinds that existed the day
   * they last touched the panel, and a kind added later would arrive silenced
   * for them and loud for everybody else. Storing what has been turned *off*
   * means a new kind is on for everyone until somebody says otherwise, which
   * is the right default for news.
   */
  popupOff: EventKind[];
  /**
   * And the other way round for sound, which nothing plays yet.
   *
   * Sean: *"there should be ones that just make sounds. And we can add sound
   * files later. You can just gray that one out for now, just leave a spot for
   * it."* So the column is in the panel and disabled, and this is where its
   * answers will go when there is something to play. Opt-in, because a game
   * that starts making noises at somebody who never asked is worse than one
   * that stays quiet.
   */
  soundOn: EventKind[];
  /**
   * And a third column: which kinds the advisor says out loud.
   *
   * Sean, 22 September: *"for notifications, we can also add 'Narrator'. we
   * will record each narrator saying various expressions like 'Informants have
   * provided information on [location, or 3 locations]' ... Sound just means
   * the notification or mission type"* — which settles what the two columns
   * are for. **Sound** is a noise that tells you a thing of that kind has
   * happened. **Narrator** is Marlow or Pennywhistle telling you what it was,
   * in their own voice, from a line recorded for that kind of news.
   *
   * Same shape as `soundOn` and for the same reason: opt-in, and nothing reads
   * it until there are recordings to play. The clips do not exist yet.
   */
  narratorOn: EventKind[];
}

const DEFAULTS: Prefs = {
  group: true,
  layerOrder: [],
  popupOff: [],
  soundOn: [],
  narratorOn: [],
};

/**
 * Whether this piece of news is allowed to appear on the screen.
 *
 * One question asked in one place, by both layers that put news on the screen
 * — the dispatch cards that stop you and the running strip that does not. They
 * are two presentations of the same decision, and a player unchecking "Battles"
 * means it in both.
 */
export function popsUp(prefs: Prefs, event: Pick<GameEvent, 'kind'>): boolean {
  return !prefs.popupOff.includes(event.kind);
}

/** The same question for sound. Nothing reads it yet; see `soundOn`. */
export function makesSound(prefs: Prefs, event: Pick<GameEvent, 'kind'>): boolean {
  return prefs.soundOn.includes(event.kind);
}

/** And for the advisor's voice. Nothing reads it yet; see `narratorOn`. */
export function isSpoken(prefs: Prefs, event: Pick<GameEvent, 'kind'>): boolean {
  return prefs.narratorOn.includes(event.kind);
}

/** Flip one kind in one of the two lists, for the checkboxes in the log. */
export function withKind(list: EventKind[], kind: EventKind, on: boolean): EventKind[] {
  return on ? list.filter((k) => k !== kind) : [...new Set([...list, kind])];
}

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
