import { useState } from 'react';
import {
  bestOf,
  companionsFor,
  MISSION_LABEL,
  MISSION_PARTY_MAX,
  abductOn,
  captiveOn,
  missionsOffered,
  recruitOn,
  successChance,
  travelDays,
  MISSION_WORK_DAYS,
  type GameState,
  type MissionType,
} from '../sim';
import { Sheet } from './components';
import { CategoryIcon } from './art';

/**
 * The original's mission menu. Drop a character on a planet and it asked
 * what they were there to do; here the island usually answers for itself,
 * but where it offers more than one errand the player chooses. One card per
 * errand: what it is, what it would do, and the officer's odds of landing it.
 */
const WHAT: Record<MissionType, string> = {
  diplomacy: 'Talk the island round. Its allegiance to you rises with every landed argument.',
  incite: 'Set its people against their holder. Push them far enough and the island rises.',
  recruit: 'Sign on the unaligned officer ashore here, for good.',
  sabotage: 'Break something of theirs on the island — a yard, a mill, a shipyard.',
  survey: 'Chart the island: who lives on it, what stands on it, whether a garrison would hold it.',
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
  onChoose: (type: MissionType, companionIds: string[]) => void;
  onClose: () => void;
}) {
  const character = state.characters.find((c) => c.id === characterId)!;
  const island = state.systems.find((s) => s.id === systemId)!;
  const faction = character.faction as 'empire' | 'alliance';
  const offered = missionsOffered(state, island, faction);
  const sail = travelDays(state, character.locationSystemId, systemId);
  const recruit = recruitOn(state, island, faction);
  const captive = abductOn(state, island, faction);
  const held = captiveOn(state, island, faction);

  // Who else is in this harbour and free to get in the boat. Up to four go,
  // the officer leading it included.
  const mates = companionsFor(state, character);
  const [taking, setTaking] = useState<string[]>([]);
  const full = taking.length >= MISSION_PARTY_MAX - 1;
  const toggle = (id: string) =>
    setTaking((was) =>
      was.includes(id) ? was.filter((x) => x !== id) : full ? was : [...was, id],
    );
  // The odds on each card are the boat's, not the officer's, so adding the
  // right person visibly moves them before you commit to anything.
  const boat = bestOf([character, ...mates.filter((m) => taking.includes(m.id))]);

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
            Anyone in this harbour, ashore or aboard a hull lying off it. Four in the boat at
            most, and it is only as good as its best hand at the job — take who the work needs.
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
          const odds = type === 'recruit' ? null : Math.round(successChance(boat, type) * 100);
          const what =
            type === 'recruit' && recruit
              ? `Sign on ${recruit.name}, who is ashore here, for good.`
              : type === 'abduct' && captive
                ? `Carry off ${captive.name} and hold them at your seat.`
                : type === 'rescue' && held
                  ? `Break ${held.name} out of the cells and get them home.`
                  : WHAT[type];
          return (
            <button key={type} className="card card--tap choice" onClick={() => onChoose(type, taking)}>
              <span className="choice__icon">
                <CategoryIcon kind="missions" size={22} />
              </span>
              <span className="choice__body">
                <span className="row row--between">
                  <b className="choice__name">{MISSION_LABEL[type]}</b>
                  {odds !== null && <span className="tiny muted">{odds}% to land it</span>}
                </span>
                <span className="tiny muted choice__what">{what}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
