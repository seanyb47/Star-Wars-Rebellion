import terms from '../data/terms.json';
import { isLord } from '../sim';
import type { GameState } from '../sim';
import { CharacterFace } from './art';
import { useLookUp } from './lookup';
import { slugOf } from './Almanac';
import { glossaryAnchor, glossaryWords } from './Glossary';
import { statusBadge } from './CharacterSheet';

/*
 * `aboardLine` and `missionLine` stood here and are gone with the line they
 * fed. The card showed where somebody was under their name; Sean's crew card
 * of 19 September is the face, the role and the four numbers, and nothing
 * else. Whether they are busy is still said — by the badge over the face and
 * by the card dimming — and *where* they are is a question `CharacterSheet`
 * answers, one tap away behind Orders.
 */

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
/** The square the face fills. One a row on a phone, so it is the column. */
const FACE = 300;

/**
 * One role tag, and a way into the glossary if the glossary has the word.
 *
 * The same rule the encyclopedia's `RoleTags` follows, and deliberately the
 * same look: a tag that can be opened wears the brass and a border, one that
 * cannot stays flat. A player should be able to see which tags are worth a tap
 * without tapping them all to find out.
 */
function RoleChip({ role }: { role?: string }) {
  const lookUp = useLookUp();
  if (!role) return null;
  if (!lookUp || !glossaryWords().has(role.toLowerCase())) {
    return <span className="crewcard__roletag roletag">{role}</span>;
  }
  return (
    <button
      type="button"
      className="crewcard__roletag roletag roletag--tap"
      onClick={() => lookUp('glossary', glossaryAnchor(role))}
      aria-label={`What is a ${role}?`}
    >
      {role}
    </button>
  );
}

export function CharactersScreen({
  state,
  onOpen,
}: {
  state: GameState;
  onOpen: (characterId: string) => void;
}) {
  const lookUp = useLookUp();
  const crew = state.characters.filter((c) => c.faction === state.player);
  const inIrons = crew.some((c) => c.status === 'captured');

  return (
    <>
    <div className="pad crewgrid">
      {crew.map((character) => {
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
          <div
            key={character.id}
            className={`crewcard${idle ? '' : ' crewcard--busy'}`}
          >
            {/*
              The card is the face and three facts, and tapping it goes to the
              encyclopedia.

              Sean, 19 September: *"Cut the fancy frames and put in a square
              one. Just show me face, stats, and role tag. Click for
              encyclopedia entry."* So the brass Lord frame is gone, the ringed
              medallion is gone, and what is left is a square crop of the face
              filling the card's width.

              The name stays, which is the one thing on his list I did not
              take him literally on: a roster you scan to find a particular
              person is unusable without it, and it is identity rather than
              decoration. Everything else went — the location line, the
              three-quarter figure, the frames.
            */}
            <button
              className="crewcard__tap"
              onClick={() => lookUp?.('people', slugOf(character.name))}
              aria-label={`${character.name} — what they are`}
            >
              <span className="crewcard__art">
                <CharacterFace
                  name={character.name}
                  faction={character.faction === 'empire' || character.faction === 'alliance' ? character.faction : 'neutral'}
                  people={character.people}
                  size={FACE}
                />
                {/* Only when they are not free. What you scan this screen for
                    is who is already busy. */}
                {!idle && <span className="crewcard__badge">{statusBadge(character)}</span>}
              </span>
              <span className="crewcard__name">
                {character.name}
                {lord && <span className="crewcard__lordmark"> · {terms.lord}</span>}
              </span>
              <span className="crewcard__stats">
                <b>D</b>{character.diplomacy} <b>E</b>{character.espionage}{' '}
                <b>C</b>{character.combat} <b>L</b>{character.leadership}
              </span>
            </button>
            {/*
              The role tag, and it is its own control now.

              Sean, 19 September: *"make their role tags clickable to glossary
              term."* It cannot stay inside the card's own button — a button
              inside a button is invalid and the inner one never fires — so it
              comes out and sits between the card and Orders, which is the
              same split `crewcard__orders` already uses and for the same
              reason. Tap the face for the person, the tag for the word.

              First role only, as before: it is what they are for, and five of
              them in a row is a paragraph again.
            */}
            <RoleChip role={character.roles?.[0]} />
            {/*
              And the orders.

              Sending somebody on an errand lives behind `CharacterSheet`, and
              this card was the way to it — so pointing the card at the
              encyclopedia would have made "Send on mission" unreachable from
              the one screen the crew are on. A second, explicit control keeps
              the loop, and is one tap shorter than it used to be.
            */}
            <button
              className="crewcard__orders"
              onClick={() => onOpen(character.id)}
              aria-label={`Orders for ${character.name}`}
            >
              Orders
            </button>
          </div>
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
