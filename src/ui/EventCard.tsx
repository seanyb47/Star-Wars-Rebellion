import { useEffect, useState } from 'react';
import type { EventKind, GameEvent, GameState } from '../sim';
import { EventScene } from './EventScene';

/**
 * One thing that happened, told rather than logged.
 *
 * The original stops you with a headline, a painting and one plain sentence,
 * with arrows to page through the rest of the day. This is that. The log is
 * still there and still the place to look something up; this is the place the
 * war actually happens to you.
 */

/** Kinds worth stopping the player for. The rest belong in the log only. */
const NOTABLE: EventKind[] = ['war', 'flip', 'mutiny', 'battle'];

export function isNotable(event: GameEvent): boolean {
  return NOTABLE.includes(event.kind);
}

/**
 * A headline, in the original's register: a few words in capitals that say
 * what happened before the sentence explains it.
 *
 * Derived from the event rather than stored on it, so nothing in the
 * simulation has to know a card exists.
 */
function headline(state: GameState, event: GameEvent): string {
  const island = state.systems.find((s) => s.id === event.systemId);
  const where = island?.name ?? 'The Seven Seas';
  switch (event.kind) {
    case 'war':
      // 'war' covers both ends of it. Without a winner nobody has lost yet —
      // this is the declaration, and calling that "The War Is Lost" on the
      // opening card is about as wrong as a headline can be.
      if (!state.winner) return 'The War Begins';
      return state.winner === state.player ? 'The War Is Won' : 'The War Is Lost';
    case 'flip':
      return /settled/.test(event.text) ? `${where} Is Settled` : `${where} Changes Hands`;
    case 'mutiny':
      return /quiet|order|returns/i.test(event.text)
        ? `${where} Is Quiet Again`
        : `${where} Rises`;
    case 'battle':
      return /thrown back/i.test(event.text) ? `Repulsed at ${where}` : `Action off ${where}`;
    case 'loss':
      return `A Loss at ${where}`;
    case 'order':
      return `Finished on ${where}`;
    case 'mission':
      if (/report|carried|persuad|won over/i.test(event.text)) return `Word from ${where}`;
      if (/sail|under way|set out|weighs/i.test(event.text)) return `Under Way for ${where}`;
      return `A Parley on ${where}`;
    default:
      return where;
  }
}

/**
 * Whose news it is, which decides the colour behind the picture. Read from the
 * island the event happened on, so an island of yours changing hands glows in
 * the colour of whoever took it.
 */
function tintFor(state: GameState, event: GameEvent): string {
  const island = state.systems.find((s) => s.id === event.systemId);
  if (event.kind === 'war') return `var(--${state.winner ?? state.player})`;
  if (event.kind === 'mutiny') return 'var(--bad)';
  if (!island || island.control === 'neutral' || island.control === 'none') {
    return 'var(--neutral)';
  }
  return `var(--${island.control})`;
}

export function EventCards({
  state,
  events,
  onClose,
  onOpenIsland,
}: {
  state: GameState;
  events: GameEvent[];
  onClose: () => void;
  onOpenIsland?: (systemId: string) => void;
}) {
  const [index, setIndex] = useState(0);
  // A new batch always starts at the front.
  useEffect(() => setIndex(0), [events]);

  if (events.length === 0) return null;
  const at = Math.min(index, events.length - 1);
  const event = events[at];
  const island = state.systems.find((s) => s.id === event.systemId);

  return (
    <>
      <div className="scrim scrim--stacked" onClick={onClose} />
      <div className="dispatch" role="dialog" aria-label={headline(state, event)}>
        <div className="dispatch__head">
          <span className="dispatch__title">{headline(state, event)}</span>
          <button className="iconbtn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <EventScene
          kind={event.kind}
          tint={tintFor(state, event)}
          seed={event.id}
          height={138}
        />

        <p className="dispatch__text serif">{event.text}</p>

        <div className="dispatch__foot">
          <span className="tiny muted">
            Day {event.day}
            {events.length > 1 ? ` · ${at + 1} of ${events.length}` : ''}
          </span>
          <span className="row" style={{ gap: 6 }}>
            {island && onOpenIsland && (
              <button className="btn" onClick={() => onOpenIsland(island.id)}>
                Go there
              </button>
            )}
            {events.length > 1 && (
              <>
                <button
                  className="btn"
                  disabled={at === 0}
                  onClick={() => setIndex(at - 1)}
                  aria-label="Previous dispatch"
                >
                  ↑
                </button>
                <button
                  className="btn"
                  disabled={at === events.length - 1}
                  onClick={() => setIndex(at + 1)}
                  aria-label="Next dispatch"
                >
                  ↓
                </button>
              </>
            )}
            {at === events.length - 1 && (
              <button className="btn btn--primary" onClick={onClose}>
                Carry on
              </button>
            )}
          </span>
        </div>
      </div>
    </>
  );
}
