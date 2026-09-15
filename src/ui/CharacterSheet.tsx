import terms from '../data/terms.json';
import {
  MISSION_WORK_DAYS,
  inciteLoss,
  parleyGain,
  recruitChance,
  successChance,
  isLord,
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
          {/* A rating can pass a hundred: the swing off a high base is allowed
              to carry somebody above what anyone has a right to be. The track
              cannot show it, so it fills and turns brass instead, and the
              figure beside it says how far past. */}
          <span className="rating__track">
            <span
              className={`rating__fill${value > 100 ? ' rating__fill--over' : ''}`}
              style={{ width: `${Math.min(100, value)}%` }}
            />
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
  onRelieve,
}: {
  state: GameState;
  character: Character;
  onClose: () => void;
  onSendOnMission: () => void;
  onLocate: () => void;
  onRelieve?: (characterId: string) => void;
}) {
  const location = state.systems.find((s) => s.id === character.locationSystemId);
  const ship = state.fleets.find((f) => f.officerIds.includes(character.id));
  // A Lord is their ship when idle and a person on an errand. Sending one
  // ashore is allowed now, and costs: the hull waits at anchor and its power
  // sleeps until they are back aboard. The button says so, because the cost
  // is the whole point of the choice.
  const lord = isLord(character);
  // Along on somebody else's errand: they have no mission of their own to read.
  const escorting = character.escorting
    ? state.characters.find((c) => c.id === character.escorting)
    : undefined;
  const atSea = Boolean(ship?.voyage);
  // A post held: a deck, or an island. Taking one is an errand that costs a
  // voyage; giving one up is instant, because they are already standing there.
  const holding = state.systems.find((s) => s.commanderId === character.id);
  const posted = Boolean(holding) || Boolean(ship && !lord);

  return (
    <Sheet
      title={character.name}
      subtitle={
        character.status === 'captured'
          ? `In irons at ${location?.name ?? 'unknown'}`
          : escorting
            ? `Away with ${escorting.name}`
          : ship
            ? `On the ${ship.name}${ship.voyage ? ', at sea' : `, at ${location?.name ?? 'unknown'}`}`
            : `On ${location?.name ?? 'unknown'}`
      }
      onClose={onClose}
      stacked
      actions={
        /* One thing to do with an officer. "Show on chart" was sitting beside
           it as an equal, which it is not — finding somebody is a way of
           looking, not an order — so it is a quiet link on the line that says
           where they are, and this row is the order. */
        <>
          <button
            className="btn btn--flex btn--primary"
            disabled={character.status !== 'available' || (lord && atSea)}
            onClick={onSendOnMission}
          >
            {lord && atSea ? 'At sea' : 'Send on mission'}
          </button>
          {posted && onRelieve && (
            <button
              className="btn btn--flex"
              disabled={atSea}
              onClick={() => onRelieve(character.id)}
            >
              {atSea ? 'At sea' : 'Relieve'}
            </button>
          )}
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
          {location && (
            <button className="linkish" onClick={onLocate}>
              Show {location.name} on the chart
            </button>
          )}
          {character.epithet && (
            <div className="serif charsheet__epithet">&ldquo;{character.epithet}&rdquo;</div>
          )}
          {character.people && <div className="tiny muted">{character.people}</div>}
        </div>
        {statusBadge(character)}
      </div>

      {posted && (
        <p className="tiny" style={{ color: 'var(--good)', marginTop: 10 }}>
          {holding ? (
            <>
              <b>In command of {holding.name}.</b> It will not rise while they hold it, and anyone
              working against it is far likelier to be caught. They are not available for anything
              else until relieved.
            </>
          ) : (
            <>
              <b>In command of the {ship?.name}.</b> Her fighting, her landings and what she charts
              at each landfall are all the better for it. They are not available for anything else
              until relieved.
            </>
          )}
        </p>
      )}

      {lord && (
        <p className="tiny" style={{ color: 'var(--brass)', marginTop: 10 }}>
          A Pirate Lord is their ship when idle and a person on an errand. Send{' '}
          {character.name.split(' ').slice(-1)[0]} ashore and the {ship?.name ?? 'their ship'} lies
          at anchor until they are back aboard — she cannot sail and her power sleeps — and
          ashore they can be found out, hurt, or carried off to Highwater in irons. The Crown
          needs all three of them at once.
        </p>
      )}

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

      <div className="section-title">On a mission</div>
      {/* Three things an officer can do on an island, and the island decides which:
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
          {/* No single number to print any more: passage is the distance,
              so the sheet gives the shape of it and the target picker gives
              the figure for the island actually chosen. */}
          <b>By the distance · a toll for open sea</b>
        </div>
        <div className="row row--between">
          <span className="muted">Time on the island</span>
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
