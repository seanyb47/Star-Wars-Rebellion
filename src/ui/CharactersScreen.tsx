import terms from '../data/terms.json';
import type { Character, GameState } from '../sim';
import { CharacterPortrait } from './art';
import { Ratings, statusBadge } from './CharacterSheet';

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
          : mission.type === 'sabotage'
            ? 'Sabotaging'
            : mission.type === 'incite'
            ? terms.incite
            : terms.parley
      } on ${where} — ${mission.daysRemaining}d to report`;
}

export function CharactersScreen({
  state,
  onOpen,
}: {
  state: GameState;
  onOpen: (characterId: string) => void;
}) {
  const crew = state.characters.filter((c) => c.faction === state.player);

  return (
    <div className="pad stack">
      {crew.map((character) => {
        const location = state.systems.find((s) => s.id === character.locationSystemId);
        return (
          <button
            key={character.id}
            className="card card--tap"
            style={{ display: 'block', width: '100%', textAlign: 'left' }}
            onClick={() => onOpen(character.id)}
          >
            <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
              <CharacterPortrait
                name={character.name}
                faction={character.faction}
                people={character.people}
                size={46}
                dim={character.status !== 'available'}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row row--between">
                  <span style={{ fontWeight: 600 }}>{character.name}</span>
                  {statusBadge(character)}
                </div>
                <div className="tiny muted" style={{ marginTop: 3 }}>
                  {missionLine(state, character) ?? `Ashore at ${location?.name ?? 'unknown'}`}
                </div>
              </div>
            </div>
            <Ratings character={character} />
          </button>
        );
      })}
    </div>
  );
}
