import { useEffect, useRef } from 'react';
import type { GameEvent, GameState } from '../sim';

export function FeedScreen({
  state,
  lastSeen,
  focusId,
  onJumpToCharacter,
  onRead,
}: {
  state: GameState;
  /** Highest event ordinal the player has already read. */
  lastSeen: number;
  /**
   * The entry the log was opened at, from a line in the running report.
   *
   * A log is a long page and the thing you tapped is somewhere down it. It is
   * scrolled to and marked rather than filtered to, because what you usually
   * want next is what happened *around* it.
   */
  focusId?: string | null;
  onJumpToCharacter: (characterId: string) => void;
  /** Open the card for a dispatch worth seeing as a picture. */
  onRead: (eventId: string) => void;
}) {
  const events = [...state.events].reverse();
  const focus = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (focusId) focus.current?.scrollIntoView({ block: 'center' });
  }, [focusId]);

  if (events.length === 0) {
    return <div className="empty">The log is empty. Start the clock.</div>;
  }

  const order = (event: GameEvent) => Number(event.id.split('-')[1]) || 0;

  // One heading a day, the way a log is kept, rather than the day repeated
  // down the margin of every line.
  const days: Array<{ day: number; events: GameEvent[] }> = [];
  for (const event of events) {
    const last = days[days.length - 1];
    if (last && last.day === event.day) last.events.push(event);
    else days.push({ day: event.day, events: [event] });
  }

  return (
    <div className="pad">
      {days.map(({ day, events: entries }) => (
        <section key={day} className="logday">
          <h3 className="logday__head serif">Day {day}</h3>
          {entries.map((event) => (
            <button
              key={event.id}
              ref={event.id === focusId ? focus : undefined}
              className={`event event--${event.kind}${
                order(event) > lastSeen ? ' event--unread' : ''
              }${event.id === focusId ? ' event--focus' : ''}`}
              // Every dispatch has a card, and the card has a way through to the
              // island. Being *notable* decides only whether the game stops you for
              // it unasked — not whether it is worth a picture when you go looking.
              onClick={() => {
                if (event.characterId && !event.systemId) onJumpToCharacter(event.characterId);
                else onRead(event.id);
              }}
            >
              <span className="event__kind" aria-hidden="true" />
              <span className="event__text">{event.text}</span>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}
