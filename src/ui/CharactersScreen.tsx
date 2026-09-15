import terms from '../data/terms.json';
import { MISSION_LABEL } from '../sim';
import type { Character, GameState } from '../sim';
import { CharacterPainting } from './art';
import { statusBadge } from './CharacterSheet';

/** "Aboard the Swallowtail, at Rime Island" for anyone serving with a fleet. */
/**
 * Where somebody is. There are two answers and no others: on a fleet, or on
 * an island. A fleet lying at an island is still a fleet, so the line names
 * the ship and then where she is — it does not invent a harbor to stand in.
 */
function aboardLine(state: GameState, character: Character): string | null {
  const ship = state.fleets.find((f) => f.officerIds.includes(character.id));
  if (!ship) return null;
  const here = state.systems.find((s) => s.id === ship.systemId);
  return ship.voyage
    ? `On the ${ship.name}, at sea`
    : `On the ${ship.name}, at ${here?.name ?? 'unknown'}`;
}

function missionLine(state: GameState, character: Character): string | null {
  // Somebody along on another officer's errand carries no errand of their own,
  // so read it off whoever is leading them. Without this a companion's card
  // wore the badge for being away and a line saying they were still at home.
  if (character.escorting) {
    const leader = state.characters.find((c) => c.id === character.escorting);
    const line = leader ? missionLine(state, leader) : null;
    if (leader && line) return `${line}, with ${leader.name.split(' ').slice(-1)[0]}`;
  }
  const mission = character.mission;
  if (!mission) return null;
  const target = state.systems.find((s) => s.id === mission.targetSystemId);
  const where = target?.name ?? 'an unknown island';
  return mission.phase === 'travelling'
    ? `At sea for ${where} — ${mission.daysRemaining}d`
    : `${
        mission.type === 'incite' ? terms.incite
        : mission.type === 'diplomacy' ? terms.parley
        : MISSION_LABEL[mission.type]
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
              {missionLine(state, character) ??
                (character.status === 'captured'
                  ? `In irons at ${location?.name ?? 'unknown'}`
                  : aboardLine(state, character) ?? `On ${location?.name ?? 'unknown'}`)}
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
