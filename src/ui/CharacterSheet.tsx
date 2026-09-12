import terms from '../data/terms.json';
import {
  MISSION_WORK_DAYS,
  TRAVEL_DAYS_CROSS_SECTOR,
  TRAVEL_DAYS_IN_SECTOR,
  inciteLoss,
  parleyGain,
  recruitChance,
  successChance,
  type Character,
  type GameState,
} from '../sim';
import { CharacterPainting } from './art';
import { Sheet } from './components';

/** Yardsticks for the signing-on range: how a star and an ordinary hand would
 *  answer this officer. Only their ratings are read, so the rest is filler. */
const YARDSTICK = {
  id: '', name: '', faction: 'neutral', locationSystemId: '', status: 'available',
} as const;
/** Someone worth having, who knows it — the hard end of the range. */
const STAR_HAND: Character = {
  ...YARDSTICK, diplomacy: 95, espionage: 95, combat: 95, leadership: 95,
};
/** An ordinary hand off a quay — the easy end. */
const GREEN_HAND: Character = {
  ...YARDSTICK, diplomacy: 50, espionage: 50, combat: 50, leadership: 50,
};

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
      {/* The painting, full width and full height, and the lore under it.
          This used to be a 68px medallion beside a stack of labels, which
          wasted the one thing on the screen anybody wants to look at. Who
          somebody is, is the reason to send them; the ratings are only how it
          goes once you have. */}
      <CharacterPainting
        name={character.name}
        faction={
          character.faction === 'empire' || character.faction === 'alliance'
            ? character.faction
            : 'neutral'
        }
        people={character.people}
        height={232}
      />

      <div className="row row--between" style={{ marginTop: 10, alignItems: 'baseline' }}>
        <div style={{ minWidth: 0 }}>
          {character.epithet && (
            <div className="serif charsheet__epithet">&ldquo;{character.epithet}&rdquo;</div>
          )}
          {character.people && <div className="tiny muted">{character.people}</div>}
        </div>
        {statusBadge(character)}
      </div>

      {character.roles && character.roles.length > 0 && (
        <div className="charsheet__roles">
          {character.roles.map((role) => (
            <span key={role} className="badge">
              {role}
            </span>
          ))}
        </div>
      )}

      {/* Who they were before they signed on. Kept after, because it is the
          only thing distinguishing one set of four numbers from another. */}
      {character.blurb && <p className="charsheet__lore serif">{character.blurb}</p>}

      <Ratings character={character} />

      <div className="section-title">Going ashore</div>
      {/* Three things an officer can do ashore, and the island decides which:
          sign on whoever is standing there, parley where nobody has chosen a
          side, stir up trouble where the enemy has. All three are shown because
          where you send them is the whole of the choice. */}
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
          <span className="muted">Signing on · wherever someone is</span>
          {/* A range, because it depends who is standing there: the numbers are
              for a plain hand and for the best person in the world. */}
          <b>
            {Math.round(recruitChance(character, STAR_HAND) * 100)}–
            {Math.round(recruitChance(character, GREEN_HAND) * 100)}%
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
