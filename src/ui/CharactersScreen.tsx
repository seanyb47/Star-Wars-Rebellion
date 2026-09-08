import {
  MISSION_WORK_DAYS,
  TRAVEL_DAYS_CROSS_SECTOR,
  TRAVEL_DAYS_IN_SECTOR,
  successChance,
  type Character,
  type GameState,
} from '../sim';
import { Sheet } from './components';

function statusBadge(character: Character) {
  switch (character.status) {
    case 'available':
      return <span className="badge badge--good">Available</span>;
    case 'on_mission':
      return <span className="badge badge--neutral">On mission</span>;
    case 'injured':
      return (
        <span className="badge badge--warn">Injured {character.injuredDays ?? 0}d</span>
      );
    default:
      return <span className="badge badge--warn">Captured</span>;
  }
}

function missionLine(state: GameState, character: Character): string | null {
  const mission = character.mission;
  if (!mission) return null;
  const target = state.systems.find((s) => s.id === mission.targetSystemId);
  const where = target?.name ?? 'an unknown world';
  return mission.phase === 'travelling'
    ? `In transit to ${where} — ${mission.daysRemaining}d`
    : `Diplomacy on ${where} — ${mission.daysRemaining}d to report`;
}

function Ratings({ character }: { character: Character }) {
  const entries: Array<[string, number]> = [
    ['Dip', character.diplomacy],
    ['Esp', character.espionage],
    ['Cbt', character.combat],
    ['Ldr', character.leadership],
  ];
  return (
    <div className="ratings">
      {entries.map(([label, value]) => (
        <div className="rating" key={label}>
          <div className="rating__value">{value}</div>
          <div className="rating__label">{label}</div>
        </div>
      ))}
    </div>
  );
}

export function CharactersScreen({
  state,
  openId,
  setOpenId,
  onSendOnMission,
  onLocate,
}: {
  state: GameState;
  /** Lifted so the app can auto-pause the clock while the sheet is up. */
  openId: string | null;
  setOpenId: (id: string | null) => void;
  /** Hands control to the galaxy map so the player can tap a destination. */
  onSendOnMission: (characterId: string) => void;
  onLocate: (systemId: string) => void;
}) {
  const crew = state.characters.filter((c) => c.faction === state.player);
  const open = crew.find((c) => c.id === openId) ?? null;

  return (
    <div className="pad stack">
      {crew.map((character) => {
        const location = state.systems.find((s) => s.id === character.locationSystemId);
        return (
          <button
            key={character.id}
            className="card card--tap"
            style={{ display: 'block', width: '100%', textAlign: 'left' }}
            onClick={() => setOpenId(character.id)}
          >
            <div className="row row--between">
              <span style={{ fontWeight: 600 }}>{character.name}</span>
              {statusBadge(character)}
            </div>
            <div className="tiny muted" style={{ marginTop: 3 }}>
              {missionLine(state, character) ?? `At ${location?.name ?? 'unknown'}`}
            </div>
            <Ratings character={character} />
          </button>
        );
      })}

      {open && (
        <CharacterSheet
          state={state}
          character={open}
          onClose={() => setOpenId(null)}
          onSendOnMission={() => {
            setOpenId(null);
            onSendOnMission(open.id);
          }}
          onLocate={() => {
            setOpenId(null);
            onLocate(open.locationSystemId);
          }}
        />
      )}
    </div>
  );
}

function CharacterSheet({
  state,
  character,
  onClose,
  onSendOnMission,
  onLocate,
}: {
  state: GameState;
  character: Character;
  onClose: () => void;
  onSendOnMission: () => void;
  onLocate: () => void;
}) {
  const location = state.systems.find((s) => s.id === character.locationSystemId);

  return (
    <Sheet
      title={character.name}
      subtitle={`At ${location?.name ?? 'unknown'} · ${character.status.replace('_', ' ')}`}
      onClose={onClose}
      actions={
        <>
          <button className="btn btn--flex" onClick={onLocate}>
            Show on map
          </button>
          <button
            className="btn btn--flex btn--primary"
            disabled={character.status !== 'available'}
            onClick={onSendOnMission}
          >
            Send on Diplomacy
          </button>
        </>
      }
    >
      <Ratings character={character} />
      <div className="section-title">Diplomacy briefing</div>
      <div className="card small stack">
        <div className="row row--between">
          <span className="muted">Chance of success</span>
          <b>{Math.round(successChance(character) * 100)}%</b>
        </div>
        <div className="row row--between">
          <span className="muted">Support gained on success</span>
          <b>+{(8 + character.diplomacy / 10).toFixed(1)}</b>
        </div>
        <div className="row row--between">
          <span className="muted">Travel</span>
          <b>
            {TRAVEL_DAYS_IN_SECTOR}d in sector · {TRAVEL_DAYS_CROSS_SECTOR}d beyond
          </b>
        </div>
        <div className="row row--between">
          <span className="muted">Time on station</span>
          <b>{MISSION_WORK_DAYS}d per cycle</b>
        </div>
      </div>
      <p className="muted tiny" style={{ marginTop: 10 }}>
        Ratings are visible to you alone; the enemy cannot see them. Missions to unaligned worlds
        risk detection.
      </p>
    </Sheet>
  );
}
