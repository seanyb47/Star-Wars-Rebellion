import { Fragment, useState } from 'react';
import {
  alreadySentOn,
  companionsFor,
  fleetsToCommand,
  MISSION_LABEL,
  MISSION_PARTY_MAX,
  abductOn,
  captiveOn,
  missionsOffered,
  joinChance,
  passageDays,
  MISSION_WORK_DAYS,
  type GameState,
  type MissionType,
  inProse,
  chartedName,
  MISSION_GIST,
  roleMissionBlock,
  roleMissionsOf,
  type PlayableFaction,
} from '../sim';
import { Info, SectionHead, Sheet } from './components';
import { CategoryIcon } from './art';
import { paintedMission } from './painted';
import { missionTint } from './missiontint';

/**
 * The painting of the errand, where a generic envelope used to be.
 *
 * Sean's contact sheet, 17 September: nine paintings of the object an errand
 * *is* — a glass at a dark harbour, a sealed letter passed across a table, a
 * lit fuse in a powder keg. The sheet drew the same envelope beside all nine
 * choices, which told a player nothing about the one they were about to spend
 * an officer on. Falls back to the envelope for anything with no painting yet.
 */
export function MissionTile({ type }: { type: MissionType }) {
  const painting = paintedMission(type);
  return (
    /* Ringed in the mission's own colour, which is the same colour the crew
       tile wears while they are away on it and the same dot the log gives the
       report when it lands. Sean, 24 September: *"color type of the mission
       from the log and thumbnail."* One colour, three places it can be met. */
    <span
      className={`choice__icon choice__icon--tint${painting ? ' choice__icon--art' : ''}`}
      style={{ ['--tint' as string]: missionTint(type) }}
    >
      {painting ? (
        <img src={painting} alt="" loading="lazy" />
      ) : (
        <CategoryIcon kind="missions" size={22} />
      )}
    </span>
  );
}

/**
 * The original's mission menu. Drop a character on a planet and it asked
 * what they were there to do; here the island usually answers for itself,
 * but where it offers more than one errand the player chooses. One card per
 * errand: what it is, what it would do, and the officer's odds of landing it.
 */

/**
 * Errands where a second boat on the same island is simply wasted.
 *
 * Signing on is one table; a rescue or an abduction is one person to carry;
 * research is the island's yards, and they can only be put to work once. A
 * parley or an incitement is not on the list: two boats arguing the same case
 * is a real tactic, and the sheet says who else is at it without calling it a
 * mistake.
 */
const ONE_AT_A_TIME: MissionType[] = ['recruit', 'rescue', 'abduct', 'research', 'command'];

export function MissionChoiceSheet({
  state,
  characterId,
  systemId,
  onChoose,
  onClose,
}: {
  state: GameState;
  characterId: string;
  systemId: string;
  onChoose: (type: MissionType, companionIds: string[], fleetId?: string) => void;
  onClose: () => void;
}) {
  const character = state.characters.find((c) => c.id === characterId)!;
  const island = state.systems.find((s) => s.id === systemId)!;
  const faction = character.faction as 'empire' | 'alliance';
  const offered = missionsOffered(state, island, faction, character);
  /*
   * The role missions this officer holds but is not being offered here, each
   * with the reason.
   *
   * Sean, day 40, the Imperator on his own capital: *"Why can't imperator
   * recruit anymore by day 40?"* Nothing was wrong — the recruit pool empties
   * around day 24 to 44 in every war, which is the design — but the sheet
   * answered by leaving the card out, and an omission cannot be read. A card
   * that is simply gone looks like a bug; a card that says *nobody unclaimed
   * is ashore anywhere, four more will come* is a thing to plan around.
   *
   * Only the two role missions, and only for somebody who holds the role. The
   * other eight are gated on the island alone and their absence is the
   * island's own plain answer — nobody wonders why there is no rescue on an
   * island with no cells. These two are the ones a player was told are
   * special, which is exactly why they are the ones that need explaining.
   */
  const blocked = roleMissionsOf(character)
    .map((type) => ({ type, why: roleMissionBlock(state, island, faction, type, character) }))
    .filter((x): x is { type: MissionType; why: string } => Boolean(x.why));
  // Squadrons of yours lying here, each of them a post an officer can be sent
  // to take, listed under Command alongside the island itself.
  const squadrons = fleetsToCommand(state, systemId, faction);
  // The leader's passage, not the distance: Reyne halves it, and the sheet has
  // to say so or his power is invisible exactly where it is chosen.
  const sail = passageDays(state, character, systemId);
  const captive = abductOn(state, island, faction);
  const held = captiveOn(state, island, faction);

  // Who else is at this island and free to go. There is no third place: you
  // are on a fleet or you are on an island, and either way you are here.
  // Up to four go, the officer leading it included.
  const mates = companionsFor(state, character);
  const [taking, setTaking] = useState<string[]>([]);
  const full = taking.length >= MISSION_PARTY_MAX - 1;
  const toggle = (id: string) =>
    setTaking((was) =>
      was.includes(id) ? was.filter((x) => x !== id) : full ? was : [...was, id],
    );
  /** How near an unaligned island is to simply throwing in with you. */
  const willingness = (): string => {
    const chance = joinChance(island, faction);
    if (chance <= 0.02) return 'It is nowhere near declaring for you yet.';
    if (chance < 0.2) return 'It is beginning to listen. It will not declare for you yet.';
    if (chance < 0.45) return 'It is warm to you. A good meeting might carry it.';
    return 'It is all but yours. The next good meeting may well carry it.';
  };

  return (
    <Sheet
      title={chartedName(island, character.faction as PlayableFaction)}
      subtitle={`What should ${character.name} do there? ${sail === 0 ? 'Already ashore' : `${sail} days' sail`}, then ${MISSION_WORK_DAYS} days' work.`}
      onClose={onClose}
      stacked
    >
      {/*
          One line a card, and the ℹ carries the rest.

          Sean, 19 September, and this sheet is his own example of the rule:
          *"keep game clean and minimize text blocks but add ℹ️ info that links
          to encyclopedia or rules or glossary when needed."* Up to ten errands
          are offered at once, so a second sentence on each is a screen of
          prose standing between a player and the one decision they opened this
          to make. The Missions page of the encyclopedia has had the long form
          since 21 September; this is the link to it that was missing.
      */}
      <SectionHead
        title={`What ${character.name} could do`}
        to="missions"
        help="What each mission is, and what decides whether it comes off"
      />
      <div className="stack">
        {offered.map((type) => {
          /*
           * No percentages on the errand sheet.
           *
           * Sean, 19 September: *"Cut % chance."* This line used to carry two
           * of them — the odds of getting through the island's watch unseen,
           * and the odds of the work coming off once nobody had. The reasoning
           * for showing both still holds (a raid on a loyal capital is a bad
           * idea because of the getting in and out, not because of the work),
           * but it is a rule to feel rather than a pair of numbers to read off
           * before spending a crew member. The parley bands stay: a band is a
           * judgement, not a percentage, and it is the one thing on this sheet
           * that says which island will actually listen.
           *
           * The sim still computes both — `missionOdds` and `foilChance` are
           * what settle the errand — and the espionage sheet after the fact
           * still reports what happened. This is only what is shown before.
           */
          /*
           * Somebody of yours is already doing this here.
           *
           * Sean's playtest: *"Two recruiters on one island: 'Silvaine Crow
           * lands on Freeport to find the berth already taken.' The UI should
           * block or warn before sending the second one."* Warn rather than
           * block: a second parley on the same island is a reasonable thing
           * to want, and a second table at the same harbor is not, and the
           * player is the one who should decide which of those they are
           * doing. The month is theirs to spend either way — but not to spend
           * without being told.
           */
          const doubling = alreadySentOn(state, island, faction, type, character.id);
          const what =
            type === 'abduct' && captive
              ? `Carry off ${captive.name} and hold them at your seat.`
              : type === 'rescue' && held
                ? `Break ${held.name} out of the cells and get them home.`
                : MISSION_GIST[type];
          return (
            <Fragment key={type}>
              <button className="card card--tap choice" onClick={() => onChoose(type, taking)}>
                <MissionTile type={type} />
                <span className="choice__body">
                  <span className="row row--between">
                    {/* Sean, 19 September: *"Command [location]."* The island
                        is named rather than called "the island", because the
                        line below it about a fleet names the fleet, and two
                        postings that read differently for no reason is two
                        things to work out instead of one. */}
                    <b className="choice__name">
                      {type === 'command' ? `Command ${inProse(island.name)}` : MISSION_LABEL[type]}
                    </b>
                    {/* The FAVORABLE / EVEN / POOR chip stood here, and the
                        plus-and-minus factors under the blurb below. Both are
                        gone at Sean's word of 21 September: *"Cut the
                        'favorable' etc from missions."* Where you send
                        somebody is the choice; a verdict printed on it does
                        the choosing. */}
                  </span>
                  <span className="tiny muted choice__what">
                    {what}
                    {type === 'diplomacy' && island.control === 'neutral' && ` ${willingness()}`}
                  </span>
                  {doubling.length > 0 && (
                    <span className="tiny choice__doubling">
                      {doubling.map((c) => c.name).join(' and ')}{' '}
                      {doubling.length === 1 ? 'is' : 'are'} already on this here
                      {ONE_AT_A_TIME.includes(type) ? ', and there is only the one to do' : ''}.
                    </span>
                  )}
                </span>
              </button>
              {/* A posting can be to a deck instead of to the island, so every
                  squadron of yours lying here is its own line. Taking one is
                  the same mission — the voyage out, then the post — which is
                  why they sit under Command rather than being an order you
                  give from the harbor the way signing on used to be. */}
              {type === 'command' &&
                squadrons.map((fleet) => (
                  <button
                    key={fleet.id}
                    className="card card--tap choice"
                    onClick={() => onChoose('command', taking, fleet.id)}
                  >
                    <MissionTile type="command" />
                    <span className="choice__body">
                      <span className="row row--between">
                        <b className="choice__name">Command {fleet.name}</b>
                        <span className="tiny muted">
                          {fleet.ships.length} {fleet.ships.length === 1 ? 'hull' : 'hulls'}
                        </span>
                      </span>
                      <span className="tiny muted choice__what">
                        Take her quarterdeck. Her fighting, her landings and what she charts at
                        each landfall are all the better for it.
                      </span>
                    </span>
                  </button>
                ))}
            </Fragment>
          );
        })}
        {/* Theirs to do, and not today. A dimmed card rather than a line of
            prose: it is the same shape as the thing it is standing in for, so
            it reads as *this is missing and here is why* rather than as a
            footnote about something else. Not a button — there is nothing to
            tap — so it is a div, and the reason takes the place of the gist. */}
        {blocked.map(({ type, why }) => (
          <div key={type} className="card choice choice--shut">
            <MissionTile type={type} />
            <span className="choice__body">
              <span className="row row--between">
                <b className="choice__name">{MISSION_LABEL[type]}</b>
                <span className="tiny muted">Not today</span>
              </span>
              <span className="tiny choice__what choice__why">{why}</span>
            </span>
          </div>
        ))}
      </div>

      {/*
        * The party comes after the work, not before it.
        *
        * Found by playing on 20 September: this block led the sheet, so the
        * first thing asked of you was which four people to send and the last
        * was what they were going to do. Its own copy gives the game away —
        * *take who the work needs* — which you cannot do until you have seen
        * the work. The errand is the decision and the escort is the
        * refinement, so the escort sits under it, where a second look at the
        * parley bands moving as you tick names is worth something.
        */}
      {mates.length > 0 && (
        <>
          <SectionHead
            title="Who else goes"
            to="missions"
            at="party"
            help="How an escort is picked, and which of them the work is settled on"
          />
          <p className="tiny muted" style={{ margin: '0 0 8px' }}>
            Up to {MISSION_PARTY_MAX}, and the best hand among them does the job.{' '}
            <Info to="missions" at="party">
              How an escort works
            </Info>
          </p>
          <div className="chips" style={{ marginBottom: 12 }}>
            {mates.map((mate) => {
              const on = taking.includes(mate.id);
              return (
                <button
                  key={mate.id}
                  className={`chip${on ? ' chip--on' : ''}`}
                  disabled={!on && full}
                  onClick={() => toggle(mate.id)}
                >
                  {mate.name.split(' ').slice(-1)[0]}
                </button>
              );
            })}
          </div>
        </>
      )}
    </Sheet>
  );
}
