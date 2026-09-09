import terms from '../data/terms.json';
import {
  MISSION_WORK_DAYS,
  TRAVEL_DAYS_CROSS_SECTOR,
  TRAVEL_DAYS_IN_SECTOR,
  successChance,
  type Character,
  type GameState,
} from '../sim';
import { CharacterPortrait } from './art';
import { Sheet } from './components';

export function statusBadge(character: Character) {
  switch (character.status) {
    case 'available':
      return <span className="badge badge--good">Available</span>;
    case 'on_mission':
      return <span className="badge badge--neutral">At sea</span>;
    case 'injured':
      return <span className="badge badge--warn">Laid up {character.injuredDays ?? 0}d</span>;
    default:
      return <span className="badge badge--warn">Captured</span>;
  }
}

/** The four ratings, spelled out and bar-charted rather than abbreviated. */
export function Ratings({ character }: { character: Character }) {
  const entries: Array<[string, number]> = [
    ['Diplomacy', character.diplomacy],
    ['Espionage', character.espionage],
    ['Combat', character.combat],
    ['Leadership', character.leadership],
  ];
  return (
    <div className="ratings">
      {entries.map(([label, value]) => (
        <div className="rating" key={label}>
          <span className="rating__label">{label}</span>
          <span className="rating__track">
            <span className="rating__fill" style={{ width: `${value}%` }} />
          </span>
          <span className="rating__value">{value}</span>
        </div>
      ))}
    </div>
  );
}

export function CharacterSheet({
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
      subtitle={`Ashore at ${location?.name ?? 'unknown'}`}
      onClose={onClose}
      stacked
      actions={
        <>
          <button className="btn btn--flex" onClick={onLocate}>
            Show on chart
          </button>
          <button
            className="btn btn--flex btn--primary"
            disabled={character.status !== 'available'}
            onClick={onSendOnMission}
          >
            Send to {terms.parley}
          </button>
        </>
      }
    >
      <div className="row" style={{ gap: 12, alignItems: 'center' }}>
        <CharacterPortrait
          name={character.name}
          faction={character.faction}
          people={character.people}
          size={68}
          dim={character.status !== 'available'}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          {character.people && <div className="tiny muted">{character.people}</div>}
          <div style={{ marginTop: 2 }}>{statusBadge(character)}</div>
        </div>
      </div>

      <Ratings character={character} />

      <div className="section-title">{terms.parley} briefing</div>
      <div className="card small stack">
        <div className="row row--between">
          <span className="muted">Chance of success</span>
          <b>{Math.round(successChance(character) * 100)}%</b>
        </div>
        <div className="row row--between">
          <span className="muted">{terms.allegiance} gained on success</span>
          <b>+{(8 + character.diplomacy / 10).toFixed(1)}</b>
        </div>
        <div className="row row--between">
          <span className="muted">Passage</span>
          <b>
            {TRAVEL_DAYS_IN_SECTOR}d inside the {terms.reach} · {TRAVEL_DAYS_CROSS_SECTOR}d beyond
          </b>
        </div>
        <div className="row row--between">
          <span className="muted">Time ashore</span>
          <b>{MISSION_WORK_DAYS}d per cycle</b>
        </div>
      </div>
      <p className="muted tiny" style={{ marginTop: 10 }}>
        These ratings are yours alone; the enemy cannot see them. A {terms.parley.toLowerCase()} on
        an unaligned island risks being found out.
      </p>
    </Sheet>
  );
}
