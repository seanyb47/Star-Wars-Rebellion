import terms from '../data/terms.json';
import {
  MISSION_WORK_DAYS,
  TRAVEL_DAYS_CROSS_SECTOR,
  TRAVEL_DAYS_IN_SECTOR,
  inciteLoss,
  parleyGain,
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
            Send ashore
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

      <div className="section-title">Going ashore</div>
      {/* Two things an officer can do ashore, and the island decides which: you
          parley where nobody has chosen a side, and stir up trouble where the
          enemy has. Both are shown because where you send them is the choice. */}
      <div className="card small stack">
        <div className="row row--between">
          <span className="muted">{terms.parley} · unaligned or your own</span>
          <b>
            {Math.round(successChance(character, 'diplomacy') * 100)}% · +
            {parleyGain(character).toFixed(1)}
          </b>
        </div>
        <div className="row row--between">
          <span className="muted">{terms.incite} · islands they hold</span>
          <b>
            {Math.round(successChance(character, 'incite') * 100)}% · −
            {inciteLoss(character).toFixed(1)}
          </b>
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
        These ratings are yours alone; the enemy cannot see them. Work on ground that is not yours
        risks being found out — far more so on an island they hold, and more still with one of their
        own officers standing on it. Espionage is what keeps your officer out of their hands.
      </p>
    </Sheet>
  );
}
