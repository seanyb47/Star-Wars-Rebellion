import type { GameEvent, GameState } from '../sim';

export function FeedScreen({
  state,
  lastSeen,
  onJumpToCharacter,
  onRead,
}: {
  state: GameState;
  /** Highest event ordinal the player has already read. */
  lastSeen: number;
  onJumpToCharacter: (characterId: string) => void;
  /** Open the card for a dispatch worth seeing as a picture. */
  onRead: (eventId: string) => void;
}) {
  const events = [...state.events].reverse();

  if (events.length === 0) {
    return <div className="empty">The log is empty. Start the clock.</div>;
  }

  const order = (event: GameEvent) => Number(event.id.split('-')[1]) || 0;

  return (
    <div className="pad">
      {events.map((event) => (
        <button
          key={event.id}
          className={`event${order(event) > lastSeen ? ' event--unread' : ''}`}
          // Every dispatch has a card, and the card has a way through to the
          // island. Being *notable* decides only whether the game stops you for
          // it unasked — not whether it is worth a picture when you go looking.
          onClick={() => {
            if (event.characterId && !event.systemId) onJumpToCharacter(event.characterId);
            else onRead(event.id);
          }}
        >
          <span className="event__day">Day {event.day}</span>
          <span className="event__text">{event.text}</span>
        </button>
      ))}
    </div>
  );
}
