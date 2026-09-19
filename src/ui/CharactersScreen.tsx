import terms from '../data/terms.json';
import { MISSION_LABEL, isLord } from '../sim';
import type { Character, GameState } from '../sim';
import { CharacterPainting } from './art';
import { statusBadge } from './CharacterSheet';

/** "Aboard the Home Fleet, at Rime Island" for anyone serving with a fleet. */
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
  const inIrons = crew.some((c) => c.status === 'captured');

  return (
    <>
    <div className="pad crewgrid">
      {crew.map((character) => {
        const location = state.systems.find((s) => s.id === character.locationSystemId);
        const idle = character.status === 'available';
        /**
         * Three of these cards are a third of the war each.
         *
         * Sean: *"the pirate lords need a more bold frame. And subtle Pirate
         * Lord."* On a grid of identical cards they read as ordinary officers,
         * and they are the only people on the screen whose capture ends it —
         * so the frame is heavier and the rank is said, quietly, where a rank
         * belongs: above the name, in the brass the chrome already uses.
         */
        const lord = isLord(character);
        return (
          <button
            key={character.id}
            className={`crewcard${idle ? '' : ' crewcard--busy'}${lord ? ' crewcard--lord' : ''}`}
            onClick={() => onOpen(character.id)}
          >
            <span className="crewcard__art">
              {/* One to a row on a phone, so the painting gets the whole
                  width and the face is a face rather than a crop. See
                  `.crewgrid`. */}
              <CharacterPainting
                name={character.name}
                faction={character.faction === 'empire' || character.faction === 'alliance' ? character.faction : 'neutral'}
                people={character.people}
                height={420}
              />
              {/* Only when they are not free. "Available" on all seven cards
                  said nothing and covered seven faces to say it; what you
                  actually scan this screen for is who is already busy. */}
              {!idle && <span className="crewcard__badge">{statusBadge(character)}</span>}
            </span>
            {lord && <span className="crewcard__rank">{terms.lord}</span>}
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
    {/*
      Sean asked it twice: *"I don't think we have the recruit mission do
      we? How do we get more free?"*, and then, once it existed but had been
      rebuilt out from under the old chart filter, *"as imperium… how do I
      recruit more personnel?"* Both times the answer was yes-but-nowhere-is-
      it-written. This is where the question gets asked, so this is where it is
      answered — and it has to be written down now rather than pointed at,
      because nothing on the chart marks a recruiting harbor any more.
    */}
    <p className="pad tiny muted" style={{ paddingTop: 0, lineHeight: 1.45 }}>
      A crew grows one way. Send a <b>Recruiter</b> of yours to any island you
      hold that is loyal enough, and they keep an open table there for a
      fortnight: officers the war has not claimed hear of it and some of them
      sign the articles. What settles it is the Recruiter&rsquo;s{' '}
      <b>Leadership</b> and how much that island loves you — a devoted home
      harbor is worth keeping for exactly this — and nothing is certain, but a
      fortnight that comes to nothing costs only the fortnight. There are only
      so many hands left in the Seven Seas, and the other side is signing them
      too.
      {inIrons && (
        <>
          {' '}
          Anyone of yours in irons stays there until you send somebody to break
          them out; nobody comes home on their own.
        </>
      )}
    </p>
    </>
  );
}
