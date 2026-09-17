import { Fragment, useState } from 'react';
import {
  bestOf,
  companionsFor,
  fleetsToCommand,
  MISSION_LABEL,
  MISSION_PARTY_MAX,
  abductOn,
  captiveOn,
  missionsOffered,
  foilChance,
  isCovert,
  missionOdds,
  inciteStanding,
  parleyStanding,
  joinChance,
  BAND_LABEL,
  travelDays,
  MISSION_WORK_DAYS,
  type Factor,
  type GameState,
  type MissionType,
  type Standing,
} from '../sim';
import { Sheet } from './components';
import { CategoryIcon } from './art';
import { paintedMission } from './painted';

/**
 * The painting of the errand, where a generic envelope used to be.
 *
 * Sean's contact sheet, 17 September: nine paintings of the object an errand
 * *is* — a glass at a dark harbour, a sealed letter passed across a table, a
 * lit fuse in a powder keg. The sheet drew the same envelope beside all nine
 * choices, which told a player nothing about the one they were about to spend
 * an officer on. Falls back to the envelope for anything with no painting yet.
 */
function MissionTile({ type }: { type: string }) {
  const painting = paintedMission(type);
  return (
    <span className={`choice__icon${painting ? ' choice__icon--art' : ''}`}>
      {painting ? (
        <img src={painting} alt="" loading="lazy" />
      ) : (
        <CategoryIcon kind="missions" size={22} />
      )}
    </span>
  );
}

/**
 * Pluses and minuses, because a figure would be the wrong promise.
 *
 * Sean's brief, 17 September: *"the exact probability should NOT be directly
 * exposed to the player... provide a tooltip such as: PARLEY — FAVORABLE /
 * Diplomat: +++ / Island allegiance: ++ / Enemy political presence: - / Local
 * conditions: +"*. So a parley and an incitement say how they look and what is
 * making them look that way, and never what the dice are. A player can see
 * that their envoy is the strong part and the island's own mind is the weak
 * one, and still not know what the fortnight will do — which is the whole
 * difference between judging a situation and doing arithmetic on it.
 */
function Marks({ factors }: { factors: Factor[] }) {
  return (
    <span className="factors">
      {factors.map((factor) => (
        <span className="factor" key={factor.label}>
          <span className="factor__label">{factor.label}</span>
          <span className={`factor__mark factor__mark--${factor.weight < 0 ? 'bad' : 'good'}`}>
            {factor.weight === 0
              ? '·'
              : (factor.weight < 0 ? '−' : '+').repeat(Math.abs(factor.weight))}
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * The original's mission menu. Drop a character on a planet and it asked
 * what they were there to do; here the island usually answers for itself,
 * but where it offers more than one errand the player chooses. One card per
 * errand: what it is, what it would do, and the officer's odds of landing it.
 */
const WHAT: Record<MissionType, string> = {
  diplomacy: 'Talk the island round. Its allegiance to you rises with every landed argument.',
  incite: 'Set its people against their holder. Push them far enough and the island rises.',
  recruit:
    'Keep an open table here for a fortnight and see who signs the articles. A Recruiter leads it; what they are worth as a leader and how much this island loves you decide whether anybody worth having sits down.',
  sabotage: 'Break something of theirs on the island — a yard, a mill, a shipyard.',
  survey: 'Chart the island: who lives on it, what stands on it, whether a garrison would hold it.',
  espionage:
    'Count what is on the island and write it down — companies, works, hulls, their people, and what they have under way here.',
  abduct: 'Carry off the enemy officer ashore here and hold them at your seat.',
  command: 'Take command and put the island back in order.',
  research: 'Put the yards to work on the craft: cheaper, quicker hulls.',
  rescue: 'Break one of yours out of the cells and get them home.',
};

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
  // Squadrons of yours lying here, each of them a post an officer can be sent
  // to take, listed under Command alongside the island itself.
  const squadrons = fleetsToCommand(state, systemId, faction);
  const sail = travelDays(state, character.locationSystemId, systemId);
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
  // The odds on each card are the boat's, not the officer's, so adding the
  // right person visibly moves them before you commit to anything.
  const party = [character, ...mates.filter((m) => taking.includes(m.id))];
  const boat = bestOf(party);
  /*
   * Talking is the one thing a whole boat does together.
   *
   * Every other errand is settled by the best hand aboard and a passenger is
   * decoration; a parley and an incitement take the whole party with
   * diminishing returns, so the second and third name you tick are worth
   * something and never worth as much as the first. The sheet therefore hands
   * the party itself to `parleyStanding`, not `bestOf` of it, and a player
   * watching the pluses move as they add people is watching the real rule.
   */
  const standingFor = (type: MissionType): Standing | null =>
    type === 'diplomacy'
      ? parleyStanding(island, faction, party)
      : type === 'incite'
        ? inciteStanding(state, island, faction, party)
        : null;
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
      title={island.name}
      subtitle={`What should ${character.name} do there? ${sail === 0 ? 'Already ashore' : `${sail} days' sail`}, then ${MISSION_WORK_DAYS} days' work.`}
      onClose={onClose}
      stacked
    >
      {mates.length > 0 && (
        <>
          <div className="section-title">Who else goes</div>
          <p className="tiny muted" style={{ margin: '0 0 8px' }}>
            Anyone at this island, on it or on a fleet here. Four go at most, and they are
            only as good as the best hand among them at the job — take who the work needs.
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

      <div className="stack">
        {offered.map((type) => {
          /**
           * Two numbers, because there are two stages.
           *
           * Getting through the island's watch unseen, and then doing the job
           * once nobody has. One figure could not say why a raid on a loyal
           * capital is a bad idea — the work is as likely to come off there as
           * anywhere; it is the getting in and out that kills you — and that
           * is the thing a player most needs to see before spending an
           * officer. Only for covert work: nobody hides a parley.
           */
          const standing = standingFor(type);
          const odds =
            type === 'recruit' || standing
              ? null
              : Math.round(missionOdds(state, boat, island, faction, type) * 100);
          const unseen = isCovert(type)
            ? Math.round((1 - foilChance(state, island, faction, boat, type)) * 100)
            : null;
          const what =
            type === 'abduct' && captive
              ? `Carry off ${captive.name} and hold them at your seat.`
              : type === 'rescue' && held
                ? `Break ${held.name} out of the cells and get them home.`
                : WHAT[type];
          return (
            <Fragment key={type}>
              <button className="card card--tap choice" onClick={() => onChoose(type, taking)}>
                <MissionTile type={type} />
                <span className="choice__body">
                  <span className="row row--between">
                    <b className="choice__name">
                      {type === 'command' ? 'Command the island' : MISSION_LABEL[type]}
                    </b>
                    {standing ? (
                      <span className={`tiny band band--${standing.band}`}>
                        {BAND_LABEL[standing.band]}
                      </span>
                    ) : (
                      odds !== null &&
                      type !== 'command' && (
                        <span className="tiny muted">
                          {unseen !== null && <>{unseen}% unseen · </>}
                          {odds}% to land it
                        </span>
                      )
                    )}
                  </span>
                  <span className="tiny muted choice__what">
                    {what}
                    {type === 'diplomacy' && island.control === 'neutral' && ` ${willingness()}`}
                  </span>
                  {standing && <Marks factors={standing.factors} />}
                </span>
              </button>
              {/* A posting can be to a deck instead of to the island, so every
                  squadron of yours lying here is its own line. Taking one is
                  the same errand — the voyage out, then the post — which is
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
                        <b className="choice__name">Command the {fleet.name}</b>
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
      </div>
    </Sheet>
  );
}
