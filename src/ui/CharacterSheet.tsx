import terms from '../data/terms.json';
import {
  atSea as atSeaNow,
  MISSION_LABEL,
  MISSION_WORK_DAYS,
  inciteLoss,
  parleyGain,
  recruitChance,
  canRecruit,
  isPlayable,
  RECRUIT_MIN_SUPPORT,
  successChance,
  LORD_POWER_LABEL,
  lordOfName,
  shipClass,
  LORD_POWER_TEXT,
  powerOf,
  type Character,
  type GameState,
  type PlayableFaction,
  type System,
} from '../sim';
import { CharacterPainting } from './art';
import { Sheet } from './components';

/**
 * An island's name in the line that says where somebody is, as a way to the
 * chart. Absent rather than plain when the island is unknown: a word that is
 * not a place cannot be shown on a chart, and an underline promising it could
 * would be a lie.
 */
function Where({
  system,
  onLocate,
}: {
  system: { name: string } | undefined;
  onLocate: () => void;
}) {
  if (!system) return <>unknown</>;
  return (
    <button className="linkish linkish--inline" onClick={onLocate} title="Show on the chart">
      {system.name}
    </button>
  );
}

/**
 * Yardsticks for the signing-on range.
 *
 * Two harbors rather than two strangers, since Sean's memo of 17 September:
 * the errand is set against the island now, not against whoever happened to be
 * standing on it. The easy end is a harbor that adores you, the hard end the
 * least loyal harbor that will hold a table at all. Only `support` and
 * `control` are read, so the rest is filler.
 */
function harborAt(faction: PlayableFaction, standing: number): System {
  return {
    support: { empire: 0, alliance: 0, [faction]: standing } as System['support'],
    control: faction,
  } as System;
}

/**
 * What somebody is doing, in two words.
 *
 * "At sea" used to stand for the whole of `on_mission`, which covers the
 * passage out *and* the fortnight ashore doing the thing. Sean's playtest:
 * *"Crew status reads AT SEA while the crew member is working ashore on a
 * mission."* An errand has a phase; the badge reads it. Somebody aboard a
 * squadron under way is at sea too, and that one needs the fleets, so `state`
 * is passed where the caller has it.
 */
export type CrewStatus = { label: string; tone: 'good' | 'neutral' | 'warn' };

/** The badge's words and colour, apart from the badge, so they can be read. */
export function crewStatus(character: Character, state?: GameState): CrewStatus {
  switch (character.status) {
    case 'available':
      return state && atSeaNow(state, character)
        ? { label: 'At sea', tone: 'neutral' }
        : { label: 'Available', tone: 'good' };
    case 'on_mission':
      return errandPhase(character, state) === 'working'
        ? { label: 'Ashore', tone: 'neutral' }
        : { label: 'At sea', tone: 'neutral' };
    case 'injured':
      return { label: `Laid up ${character.injuredDays ?? 0}d`, tone: 'warn' };
    default:
      return { label: 'Captured', tone: 'warn' };
  }
}

export function statusBadge(character: Character, state?: GameState) {
  const { label, tone } = crewStatus(character, state);
  return <span className={`badge badge--${tone}`}>{label}</span>;
}

/**
 * Which half of an errand somebody is in — their own, or the leader's if they
 * are only along for it. Unknown without the state, and the passage is the
 * safer guess: a card that says "at sea" about somebody ashore is the bug,
 * and one that says it about somebody whose leader we cannot find is a
 * card we have no better answer for.
 */
export function errandPhase(character: Character, state?: GameState): 'travelling' | 'working' {
  if (character.mission) return character.mission.phase;
  if (!state || !character.escorting) return 'travelling';
  const leader = state.characters.find((c) => c.id === character.escorting);
  return leader?.mission?.phase ?? 'travelling';
}

/** The four ratings, spelled out and bar-charted rather than abbreviated. */
export function Ratings({ character }: { character: Character }) {
  const entries: Array<[string, number]> = [
    [terms.parley, character.diplomacy],
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
  // A Lord is a person, and the sheet treats them as one — no special
  // disabling, no hull waiting on them. What is different is the paragraph
  // below: the one thing they can do that nobody else can.
  const power = powerOf(character);
  // The hull in the stories. Lore, and only ever lore.
  const lordShip = power ? shipClass(lordOfName(character.name)!.ship) : undefined;
  // Along on somebody else's errand: they have no mission of their own to read.
  const escorting = character.escorting
    ? state.characters.find((c) => c.id === character.escorting)
    : undefined;
  const atSea = Boolean(ship?.voyage);
  // A post held: a deck, or an island. Taking one is an errand that costs a
  // voyage; giving one up is instant, because they are already standing there.
  const holding = state.systems.find((s) => s.commanderId === character.id);
  const posted = Boolean(holding) || Boolean(ship);

  return (
    <Sheet
      title={character.name}
      subtitle={
        /* Where they are, and the island name in it goes to the chart.
           Sean: "where it says 'On [location]' can you make the location
           clickable". It replaces a "Show Freeport on the chart" link that
           used to sit below the painting doing exactly this — one control,
           on the words that already name the place, rather than two a
           thumb's width apart saying the same thing. */
        character.status === 'captured' ? (
          <>In irons at <Where system={location} onLocate={onLocate} /></>
        ) : escorting ? (
          `Away with ${escorting.name}`
        ) : ship ? (
          <>
            On the {ship.name}
            {ship.voyage ? ', at sea' : <>, at <Where system={location} onLocate={onLocate} /></>}
          </>
        ) : (
          <>On <Where system={location} onLocate={onLocate} /></>
        )
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
            disabled={character.status !== 'available'}
            onClick={onSendOnMission}
          >
            Send on mission
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
        framed
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
        {statusBadge(character, state)}
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

      {/* What a Lord brings, said plainly, because it is a rule and not a
          flourish. Two of the three are paid for by a posting, which is where
          the decision is: the power costs you the officer, and the other side
          can see where you spent them. The ship is named because the story is
          the reason the rule exists — it is on the Lore tab and nowhere near
          the water. */}
      {power && (
        <p className="tiny" style={{ color: 'var(--brass)', marginTop: 10 }}>
          <b>{LORD_POWER_LABEL[power]}.</b> {LORD_POWER_TEXT[power]} They are one of three, and the
          Crown needs all three in irons at once.
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

      {/* And the ship the stories give them. This is where the Lords' hulls
          went when they stopped being game pieces: a paragraph under the bio.
          It is not a fleet you command, it never appears in a harbor, and it
          is the reason the rule above is the rule it is. */}
      {lordShip && (
        <p className="charsheet__lore serif">
          <b>The {lordShip.name}.</b> {lordShip.blurb}
        </p>
      )}

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
          <span className="muted">{MISSION_LABEL.recruit} · somewhere loyal of your own</span>
          {/* A range, because it depends on the harbor: the numbers are for a
              port that will just about hold a table and for one that adores
              you. Only a Recruiter may lead one at all, so anybody else reads
              a dash rather than a number they cannot use. */}
          <b>
            {canRecruit(character) && isPlayable(character.faction) ? (
              <>
                {Math.round(
                  recruitChance(character, harborAt(character.faction as PlayableFaction, RECRUIT_MIN_SUPPORT), character.faction as PlayableFaction) * 100,
                )}
                –
                {Math.round(recruitChance(character, harborAt(character.faction as PlayableFaction, 100), character.faction as PlayableFaction) * 100)}%
              </>
            ) : (
              'Not a Recruiter'
            )}
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
