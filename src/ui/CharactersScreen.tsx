import terms from '../data/terms.json';
import type { Character, GameState } from '../sim';
import { CharacterPainting } from './art';
import { statusBadge } from './CharacterSheet';

function missionLine(state: GameState, character: Character): string | null {
  const mission = character.mission;
  if (!mission) return null;
  const target = state.systems.find((s) => s.id === mission.targetSystemId);
  const where = target?.name ?? 'an unknown island';
  return mission.phase === 'travelling'
    ? `At sea for ${where} — ${mission.daysRemaining}d`
    : `${
        mission.type === 'recruit'
          ? 'Signing on'
          : mission.type === 'survey'
            ? 'Surveying'
            : mission.type === 'sabotage'
            ? 'Sabotaging'
            : mission.type === 'incite'
            ? terms.incite
            : terms.parley
      } on ${where} — ${mission.daysRemaining}d to report`;
}

/**
 * Your crew, as portraits.
 *
 * This was a list of rows: a 46px medallion, a name, and four rating bars that
 * took two thirds of every card. The bars were the loudest thing on the screen
 * and the least worth looking at — you do not choose who to send by reading a
 * bar chart, you choose by remembering who somebody is, and the paintings do
 * that in a way four numbers never will.
 *
 * So the painting is the card now and everything else is caption. The ratings
 * are still all four, still exact, in one line of small figures: complete, and
 * no longer shouting. Two to a row, because seven officers then fit in a screen
 * and a half and each face is two hundred pixels rather than forty-six.
 */
export function CharactersScreen({
  state,
  onOpen,
}: {
  state: GameState;
  onOpen: (characterId: string) => void;
}) {
  const crew = state.characters.filter((c) => c.faction === state.player);

  return (
    <div className="pad crewgrid">
      {crew.map((character) => {
        const location = state.systems.find((s) => s.id === character.locationSystemId);
        const idle = character.status === 'available';
        return (
          <button
            key={character.id}
            className={`crewcard${idle ? '' : ' crewcard--busy'}`}
            onClick={() => onOpen(character.id)}
          >
            <span className="crewcard__art">
              <CharacterPainting
                name={character.name}
                faction={character.faction === 'empire' || character.faction === 'alliance' ? character.faction : 'neutral'}
                people={character.people}
                height={196}
              />
              {/* Only when they are not free. "Available" on all seven cards
                  said nothing and covered seven faces to say it; what you
                  actually scan this screen for is who is already busy. */}
              {!idle && <span className="crewcard__badge">{statusBadge(character)}</span>}
            </span>
            <span className="crewcard__name">{character.name}</span>
            <span className="crewcard__where">
              {missionLine(state, character) ?? `Ashore at ${location?.name ?? 'unknown'}`}
            </span>
            {/* All four, exact, and quiet. */}
            <span className="crewcard__stats">
              <b>D</b>{character.diplomacy} <b>E</b>{character.espionage}{' '}
              <b>C</b>{character.combat} <b>L</b>{character.leadership}
            </span>
          </button>
        );
      })}
    </div>
  );
}
