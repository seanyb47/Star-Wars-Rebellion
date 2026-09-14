import {
  MISSION_LABEL,
  abductOn,
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
  sabotage: 'Break something of theirs on the island — a works, a mill, a slipway.',
  survey: 'Chart the island: who lives on it, what stands on it, whether a garrison would hold it.',
  abduct: 'Carry off the enemy officer ashore here and hold them at your seat.',
  command: 'Take command and put the island back in order.',
  research: 'Put the yards to work on the craft: cheaper, quicker hulls.',
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
  onChoose: (type: MissionType) => void;
  onClose: () => void;
}) {
  const character = state.characters.find((c) => c.id === characterId)!;
  const island = state.systems.find((s) => s.id === systemId)!;
  const faction = character.faction as 'empire' | 'alliance';
  const offered = missionsOffered(state, island, faction);
  const sail = travelDays(state, character.locationSystemId, systemId);
  const recruit = recruitOn(state, island, faction);
  const captive = abductOn(state, island, faction);

  return (
    <Sheet
      title={island.name}
      subtitle={`What should ${character.name} do there? ${sail === 0 ? 'Already ashore' : `${sail} days' sail`}, then ${MISSION_WORK_DAYS} days' work.`}
      onClose={onClose}
      stacked
    >
      <div className="stack">
        {offered.map((type) => {
          const odds = type === 'recruit' ? null : Math.round(successChance(character, type) * 100);
          const what =
            type === 'recruit' && recruit
              ? `Sign on ${recruit.name}, who is ashore here, for good.`
              : type === 'abduct' && captive
                ? `Carry off ${captive.name} and hold them at your seat.`
                : WHAT[type];
          return (
            <button key={type} className="card card--tap choice" onClick={() => onChoose(type)}>
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
