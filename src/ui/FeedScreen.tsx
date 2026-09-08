import type { GameEvent, GameState } from '../sim';

export function FeedScreen({
  state,
  lastSeen,
  onJumpToSystem,
  onJumpToCharacter,
}: {
  state: GameState;
  /** Highest event ordinal the player has already read. */
  lastSeen: number;
  onJumpToSystem: (systemId: string) => void;
  onJumpToCharacter: (characterId: string) => void;
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
          onClick={() => {
            if (event.systemId) onJumpToSystem(event.systemId);
            else if (event.characterId) onJumpToCharacter(event.characterId);
          }}
        >
          <span className="event__day">Day {event.day}</span>
          <span className="event__text">{event.text}</span>
        </button>
      ))}
    </div>
  );
}
