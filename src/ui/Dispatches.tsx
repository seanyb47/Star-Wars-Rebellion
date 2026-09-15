import { useEffect, useRef, useState } from 'react';
import type { GameEvent, GameState } from '../sim';

/**
 * The running report: what has just gone into the log, said on the screen.
 *
 * Sean: *"we need a running place where messages post. So anytime somebody's
 * posted the log, there's an alert that pops up on the screen while you're
 * playing. And then you can click on it to open the log to that entry."*
 *
 * Half the log had no presence on the screen at all. The loud half — an island
 * changing hands, a rising, an action, the war ending — stops the player with a
 * dispatch card, and always has. The quiet half is everything you actually set
 * in motion yourself: an order finishing, an officer reporting, something taken
 * from you. It went into the log silently, and the only way to learn any of it
 * was to stop playing and go and read.
 *
 * So this is the other half, and the division is the existing one: **notable
 * news gets a card, everything else gets a line here.** Nothing is told twice.
 *
 * It overlays rather than sits in the flow. A strip that pushed the chart down
 * every time a mill finished would move the thing under the player's thumb, and
 * a report that rearranges the map to deliver itself is worse than no report.
 */
const MAX_ON_SCREEN = 3;
/** How long a line stays up. Long enough to read at a glance, short enough
 *  that a fast day does not bury the chart. */
const LIFE_MS = 5200;
/** How often the sweep runs. Finer than the eye needs, coarse enough to cost
 *  nothing. */
const SWEEP_MS = 250;

export function Dispatches({
  state,
  hidden,
  onOpen,
}: {
  state: GameState;
  /** Something louder owns the screen — an action, a dispatch card, or a
   *  panel the player opened. */
  hidden: boolean;
  /** Open the log at this entry. */
  onOpen: (eventId: string) => void;
}) {
  const [lines, setLines] = useState<GameEvent[]>([]);
  /**
   * Everything already posted when this mounted.
   *
   * A game resumed on day four hundred has four hundred days of news in it and
   * none of it just happened. Only what posts from here on is a report.
   */
  const seen = useRef<Set<string> | null>(null);
  /**
   * How long each line has actually spent on the screen.
   *
   * In a ref rather than in state because it moves four times a second and
   * nothing on the screen changes until a line reaches the end of it. Putting
   * it in state would re-render the chart at that rate to show nothing.
   */
  const age = useRef(new Map<string, number>());

  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(state.events.map((e) => e.id));
      return;
    }
    const fresh = state.events.filter((e) => !seen.current!.has(e.id) && reports(e));
    for (const e of state.events) seen.current.add(e.id);
    if (fresh.length === 0) return;
    // The cap applies to what is waiting as well as what is up. A card read at
    // leisure could have a hundred quiet days behind it, and the answer to
    // that is the three most recent, not a hundred lines to sit through.
    setLines((up) => [...up, ...fresh].slice(-MAX_ON_SCREEN));
  }, [state.events]);

  /**
   * Lines age only while they are on the screen.
   *
   * The obvious version starts a five-second timer the moment a line posts,
   * and then a dispatch card held open for a minute, or a long look at an
   * island, expires every report behind it — news that was never read, quietly
   * thrown away. This counts the time a line was actually visible, because the
   * sweep only runs while it is: a report waits for you.
   */
  useEffect(() => {
    if (hidden || lines.length === 0) return;
    let last = Date.now();
    const sweep = window.setInterval(() => {
      const now = Date.now();
      const step = now - last;
      last = now;
      let done = false;
      for (const line of lines) {
        const spent = (age.current.get(line.id) ?? 0) + step;
        age.current.set(line.id, spent);
        if (spent >= LIFE_MS) done = true;
      }
      if (!done) return;
      setLines((up) => {
        const left = up.filter((l) => (age.current.get(l.id) ?? 0) < LIFE_MS);
        for (const l of up) if (!left.includes(l)) age.current.delete(l.id);
        return left;
      });
    }, SWEEP_MS);
    return () => window.clearInterval(sweep);
  }, [hidden, lines]);

  if (hidden || lines.length === 0) return null;

  return (
    /* The slot takes no height at all and the strip hangs out of it, so the
       report sits under the utility bar wherever that bar's own height lands
       — two rows, a notch, a home indicator — rather than at a number this
       file guessed. */
    <div className="reports-slot">
      <div className="reports" role="status" aria-live="polite">
        {lines.map((event) => (
          <button
            key={event.id}
            className={`report report--${event.kind}`}
            onClick={() => {
              age.current.delete(event.id);
              setLines((up) => up.filter((l) => l.id !== event.id));
              onOpen(event.id);
            }}
          >
            <span className="report__kind" aria-hidden="true" />
            <span className="report__text">{event.text}</span>
            <span className="report__chev" aria-hidden="true">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Whether this line is this strip's to tell.
 *
 * The complement of `isNotable`, and deliberately written as its own rule
 * rather than as its negation: what the strip reports is the log minus
 * whatever is already being shouted, and a `quiet` event is one the battle
 * sheet is already narrating round by round.
 */
function reports(event: GameEvent): boolean {
  if (event.quiet) return false;
  return event.kind === 'order' || event.kind === 'mission' || event.kind === 'loss';
}
