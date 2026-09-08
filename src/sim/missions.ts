import {
  FOIL_CHANCE,
  FOIL_INJURY_DAYS,
  MISSION_SUPPORT_LOSS,
  MISSION_WORK_DAYS,
  TRAVEL_DAYS_CROSS_SECTOR,
  TRAVEL_DAYS_IN_SECTOR,
} from './constants';
import {
  applySupportChange,
  getCharacter,
  getSystem,
  isPlayable,
  otherFaction,
  pushEvent,
} from './helpers';
import { resolveControlAndUnrest } from './support';
import type { Rng } from './rng';
import type { Character, GameState, PlayableFaction, System } from './types';

/** 3 days inside a sector, 10 across (spec 4.5). */
export function travelDays(state: GameState, fromSystemId: string, toSystemId: string): number {
  if (fromSystemId === toSystemId) return 0;
  const from = getSystem(state, fromSystemId);
  const to = getSystem(state, toSystemId);
  return from.sectorId === to.sectorId ? TRAVEL_DAYS_IN_SECTOR : TRAVEL_DAYS_CROSS_SECTOR;
}

/** Eligible target: populated, quiet, and not the enemy's (spec 4.5). */
export function isDiplomacyTarget(system: System, faction: PlayableFaction): boolean {
  if (!system.populated) return false;
  if (system.uprising) return false;
  if (!system.explored[faction]) return false;
  return system.control === 'neutral' || system.control === faction || system.control === 'none';
}

export function missionError(
  state: GameState,
  characterId: string,
  targetSystemId: string,
): string | null {
  const character = state.characters.find((c) => c.id === characterId);
  if (!character) return 'No such character.';
  if (!isPlayable(character.faction)) return 'That character has no faction.';
  if (character.status !== 'available') return 'Character is not available.';
  const system = state.systems.find((s) => s.id === targetSystemId);
  if (!system) return 'No such system.';
  if (!isDiplomacyTarget(system, character.faction)) return 'Not a valid diplomatic target.';
  return null;
}

export function canStartMission(
  state: GameState,
  characterId: string,
  targetSystemId: string,
): boolean {
  return missionError(state, characterId, targetSystemId) === null;
}

/** Send a character on Diplomacy. Mutates `state` in place. */
export function startMission(state: GameState, characterId: string, targetSystemId: string): void {
  const error = missionError(state, characterId, targetSystemId);
  if (error) throw new Error(error);
  const character = getCharacter(state, characterId);
  const target = getSystem(state, targetSystemId);
  const days = travelDays(state, character.locationSystemId, targetSystemId);

  character.status = 'on_mission';
  character.mission = {
    type: 'diplomacy',
    targetSystemId,
    phase: days > 0 ? 'travelling' : 'working',
    daysRemaining: days > 0 ? days : MISSION_WORK_DAYS,
  };
  pushEvent(state, {
    text: `${character.name} departs for ${target.name} on a diplomatic mission.`,
    systemId: targetSystemId,
    characterId,
  });
}

/** Chance the mission lands its argument (spec 4.5). */
export function successChance(character: Character): number {
  return 0.4 + character.diplomacy / 200;
}

/** Tick travel, work, and injury timers; resolve anything that finishes. */
export function advanceMissions(state: GameState, rng: Rng): void {
  for (const character of state.characters) {
    if (character.status === 'injured') {
      character.injuredDays = Math.max(0, (character.injuredDays ?? 0) - 1);
      if (character.injuredDays === 0) {
        character.status = 'available';
        character.injuredDays = undefined;
        pushEvent(state, {
          text: `${character.name} has recovered and is available again.`,
          characterId: character.id,
        });
      }
      continue;
    }

    const mission = character.mission;
    if (character.status !== 'on_mission' || !mission) continue;

    mission.daysRemaining -= 1;
    if (mission.daysRemaining > 0) continue;

    if (mission.phase === 'travelling') {
      character.locationSystemId = mission.targetSystemId;
      mission.phase = 'working';
      mission.daysRemaining = MISSION_WORK_DAYS;
      pushEvent(state, {
        text: `${character.name} has arrived at ${getSystem(state, mission.targetSystemId).name}.`,
        systemId: mission.targetSystemId,
        characterId: character.id,
      });
      continue;
    }

    resolveDiplomacy(state, character, rng);
  }
}

function resolveDiplomacy(state: GameState, character: Character, rng: Rng): void {
  const faction = character.faction as PlayableFaction;
  const mission = character.mission!;
  const system = getSystem(state, mission.targetSystemId);

  if (!isDiplomacyTarget(system, faction)) {
    character.status = 'available';
    character.mission = undefined;
    pushEvent(state, {
      text: `${character.name} abandons the talks on ${system.name}; the world is beyond reach.`,
      systemId: system.id,
      characterId: character.id,
    });
    return;
  }

  const wasNeutral = system.control === 'neutral';
  const success = rng.chance(successChance(character));
  if (success) {
    const gain = 8 + character.diplomacy / 10;
    applySupportChange(state, system, faction, gain);
    applySupportChange(state, system, otherFaction(faction), -MISSION_SUPPORT_LOSS);
    pushEvent(state, {
      text: `${character.name} sways ${system.name}: support up ${gain.toFixed(1)} points.`,
      systemId: system.id,
      characterId: character.id,
    });
    resolveControlAndUnrest(state);
  } else {
    pushEvent(state, {
      text: `${character.name} makes no headway on ${system.name}.`,
      systemId: system.id,
      characterId: character.id,
    });
  }

  // Foilers only watch worlds that have not picked a side yet (spec 4.5).
  if (wasNeutral && rng.chance(FOIL_CHANCE)) {
    character.status = 'injured';
    character.injuredDays = FOIL_INJURY_DAYS;
    character.mission = undefined;
    pushEvent(state, {
      text: `${character.name} was detected on ${system.name} and is injured escaping.`,
      systemId: system.id,
      characterId: character.id,
    });
    return;
  }

  // Ask the player what to do next; the AI answers its own straight away —
  // it keeps working a world until it comes over, then frees the character up.
  if (faction === state.player) {
    state.pendingDecisions.push({ characterId: character.id, systemId: system.id, success });
  } else if (system.control === faction) {
    endMission(state, character.id);
  } else {
    continueMission(state, character.id);
  }
}

/** "Continue": another 15-day cycle on the same world (spec 4.5). */
export function continueMission(state: GameState, characterId: string): void {
  const character = getCharacter(state, characterId);
  const mission = character.mission;
  state.pendingDecisions = state.pendingDecisions.filter((d) => d.characterId !== characterId);
  if (!mission) return;
  const faction = character.faction as PlayableFaction;
  const system = getSystem(state, mission.targetSystemId);
  if (!isDiplomacyTarget(system, faction)) {
    endMission(state, characterId);
    return;
  }
  mission.phase = 'working';
  mission.daysRemaining = MISSION_WORK_DAYS;
  character.status = 'on_mission';
}

/** "Return": the mission ends and the character is free where they stand. */
export function endMission(state: GameState, characterId: string): void {
  const character = getCharacter(state, characterId);
  state.pendingDecisions = state.pendingDecisions.filter((d) => d.characterId !== characterId);
  character.mission = undefined;
  if (character.status === 'on_mission') character.status = 'available';
}
