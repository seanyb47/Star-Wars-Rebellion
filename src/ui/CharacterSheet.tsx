import terms from '../data/terms.json';
import {
  atSea as atSeaNow,
  commandingAt,
  type Character,
  type GameState,
} from '../sim';
import { CharacterPainting } from './art';
import { Info, Sheet } from './components';
import { slugOf } from './Almanac';

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
 * A passage, said as an errand rather than as a state.
 *
 * Sean, 24 September: *"Dont say at sea. Say 'Making for port, due in X
 * days'."* *At sea* is where somebody is and gives a player nothing to plan
 * around; *due in six days* is the fact the decision turns on. A badge is too
 * narrow for the whole sentence, so it carries the short form and the days —
 * the same shape the badge beside it already uses for **Laid up 4d** — and
 * `fleetStatus` carries the full sentence where there is room for it.
 *
 * The days come from whichever passage they are on: their own errand, the
 * leader's if they are only along for it, or the squadron's voyage.
 */
function underWay(state: GameState | undefined, character: Character): string {
  const own = character.mission?.phase === 'travelling' ? character.mission.daysRemaining : undefined;
  const leader =
    own === undefined && state && character.escorting
      ? state.characters.find((c) => c.id === character.escorting)?.mission
      : undefined;
  const led = leader?.phase === 'travelling' ? leader.daysRemaining : undefined;
  const boat =
    own === undefined && led === undefined && state
      ? state.fleets.find((f) => f.voyage && f.officerIds.includes(character.id))?.voyage
          ?.daysRemaining
      : undefined;
  const days = own ?? led ?? boat;
  return days === undefined ? 'Making for port' : `Making port ${days}d`;
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
      if (state && atSeaNow(state, character)) return { label: underWay(state, character), tone: 'neutral' };
      /*
       * Holding an island is a posting, and this badge used to miss it.
       *
       * Sean, 24 September: *"When I assign a commander to an island it
       * doesn't reduce the filter for available crew. He isn't available now
       * bc he's on a mission commanding."* This sheet was saying both things
       * in one screen — a green **Available** over a paragraph reading *"They
       * are not available for anything else until relieved"* — because command
       * is stored on the island and `status` never hears about it.
       *
       * Neutral rather than good: it is not a warning, and it is not a free
       * pair of hands either. See `commandingAt`.
       */
      if (state && commandingAt(state, character.id)) {
        return { label: 'In command', tone: 'neutral' };
      }
      return { label: 'Available', tone: 'good' };
    case 'on_mission':
      return errandPhase(character, state) === 'working'
        ? { label: 'Ashore', tone: 'neutral' }
        : { label: underWay(state, character), tone: 'neutral' };
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
  /*
   * A Lord's power and their hull both used to be paragraphs here. Both are in
   * the encyclopedia — the hull under their bio in the crew entry, the three
   * powers together on the Rules page — so neither is read off the character
   * any more and `powerOf`, `lordOfName` and `shipClass` are no longer needed
   * on this sheet. A Lord is a person and this sheet treats them as one, which
   * was always the intent; now it also looks like it.
   */
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
            {ship.voyage
              ? `, making for port, due in ${ship.voyage.daysRemaining} ${
                  ship.voyage.daysRemaining === 1 ? 'day' : 'days'
                }`
              : <>, at <Where system={location} onLocate={onLocate} /></>}
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
            Assign {terms.errand}
          </button>
          {posted && onRelieve && (
            <button
              className="btn btn--flex"
              disabled={atSea}
              onClick={() => onRelieve(character.id)}
            >
              {atSea ? 'Under way' : 'Relieve'}
            </button>
          )}
        </>
      }
    >
      {/* The painting, and then the numbers. Nothing else.

          Sean, 25 September: *"We just need portrait name and stats. And link
          to encyclopedia. No need for a bunch of fluff than they can also read
          in the encyclopedia."* Five blocks came off this sheet and every one
          of them is in the crew entry already, word for word: the bio
          (`who.bio`), the Lord's hull with its thumbnail and blurb
          (`encfull__hull`), the role badges (`RoleTags`), the people, and the
          Lord powers, which the Rules page lists for all three. This is the
          fourth time the same ruling has been made — the odds table on 21
          September, the RECRUIT explainer, *"This explanation text is good in
          glossary. But not here"* — so it is a rule rather than a preference:
          **a screen you act from carries what you are acting on; the reference
          carries the rest, one tap away.** */}
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

      <div className="row row--between" style={{ marginTop: 10, alignItems: 'center' }}>
        {/* One tap to everything that was cut. */}
        <Info to="people" at={slugOf(character.name)}>
          Read their entry
        </Info>
        {statusBadge(character, state)}
      </div>

      {/*
        The one paragraph that did not go to the encyclopedia, cut to one line.

        It is not lore — it is a consequence of the button directly below it.
        Sending a posted officer anywhere ends the posting, and a player who
        taps Assign Mission without knowing that loses a commander they meant
        to keep. What went with the rest was the rules essay around it: three
        sentences on what a commander does for an island, which is the
        encyclopedia's job and is on the Rules page.
      */}
      {posted && (
        <p className="tiny" style={{ color: 'var(--good)', margin: '8px 0 0' }}>
          In command of {holding ? holding.name : ship?.name} — sending them anywhere else ends
          the posting.
        </p>
      )}

      <Ratings character={character} />

      {/*
       * The odds table that stood here is gone, at Sean's word of 21
       * September: *"Cut this entire section. This should be in rules not
       * character block."*
       *
       * It listed every mission's chance and gain — Parley 60% +12.0,
       * Incitement 99% −13.0, Recruit's range, the passage rule, the days
       * ashore — on the sheet of a person who might be sent on none of them.
       * Those are the *rules of missions*, identical for everybody with the
       * same ratings, so they belong where the rules live: the encyclopedia's
       * Missions section. What is left here is this crew member: who they are,
       * what they are good at, and where they are.
       */}
    </Sheet>
  );
}
