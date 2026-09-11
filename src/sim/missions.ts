import {
  FOIL_CHANCE,
  FOIL_INJURY_DAYS,
  FOIL_PER_WATCHER,
  INCITE_FOIL_CHANCE,
  INCITE_SPILLOVER,
  INCITE_SUCCESS_SCALE,
  INCITE_SUPPORT_LOSS,
  RECRUIT_QUALITY_DIVISOR,
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
import type { Character, GameState, MissionType, PlayableFaction, System } from './types';

/** 3 days inside a sector, 10 across (spec 4.5). */
export function travelDays(state: GameState, fromSystemId: string, toSystemId: string): number {
  if (fromSystemId === toSystemId) return 0;
  const from = getSystem(state, fromSystemId);
  const to = getSystem(state, toSystemId);
  return from.sectorId === to.sectorId ? TRAVEL_DAYS_IN_SECTOR : TRAVEL_DAYS_CROSS_SECTOR;
}

/** Eligible target: settled, quiet, and not the enemy's (spec 4.5). */
export function isDiplomacyTarget(system: System, faction: PlayableFaction): boolean {
  if (!system.populated) return false;
  if (system.uprising) return false;
  if (!system.explored[faction]) return false;
  return system.control === 'neutral' || system.control === faction || system.control === 'none';
}

/**
 * Somewhere to stir up trouble: a settled island the enemy holds and you have
 * charted. Already in revolt is no use — it is doing what you wanted.
 */
export function isInciteTarget(system: System, faction: PlayableFaction): boolean {
  if (!system.populated) return false;
  if (system.uprising) return false;
  if (!system.explored[faction]) return false;
  return system.control === otherFaction(faction);
}

/**
 * Somebody on this island the war has not claimed yet, and that you know is
 * there. Whose island it is does not matter — an unaligned harpooner on their
 * ground can still be talked onto your books, it is only far riskier.
 */
export function recruitOn(
  state: GameState,
  system: System,
  faction: PlayableFaction,
): Character | undefined {
  if (!system.explored[faction]) return undefined;
  return state.characters.find(
    (c) =>
      c.faction === 'neutral' &&
      c.locationSystemId === system.id &&
      hasArrived(state, c) &&
      !c.mission,
  );
}

/** Whether one of the unaligned is ashore yet. They are in the world from the
 *  start, seeded by the same draw as everything else, but not yet anybody's. */
export function hasArrived(state: GameState, person: Character): boolean {
  return state.day >= (person.appearsOnDay ?? 1);
}

export function isRecruitTarget(
  state: GameState,
  system: System,
  faction: PlayableFaction,
): boolean {
  return recruitOn(state, system, faction) !== undefined;
}

/**
 * What landing here would mean. The island decides, not a menu: you cannot
 * parley with an enemy island and there is nothing to incite on your own.
 *
 * Signing someone on comes first wherever there is someone to sign. They are
 * the scarce thing — an island can be worked again next month, and a person
 * standing on a quay can be gone — and it keeps the rule to one sentence a
 * player can hold in their head.
 */
export function missionTypeFor(
  state: GameState,
  system: System,
  faction: PlayableFaction,
): MissionType | null {
  if (isRecruitTarget(state, system, faction)) return 'recruit';
  if (isDiplomacyTarget(system, faction)) return 'diplomacy';
  if (isInciteTarget(system, faction)) return 'incite';
  return null;
}

export function isMissionTarget(
  state: GameState,
  system: System,
  faction: PlayableFaction,
): boolean {
  return missionTypeFor(state, system, faction) !== null;
}

/**
 * Whether an errand already under way still has anything to it.
 *
 * Deliberately *not* `missionTypeFor(...) === type`. That asks what a fresh
 * mission to this island would be, and the answer changes under your feet:
 * somebody wandering ashore makes signing on the island's best offer, which
 * would have cancelled a parley already fifteen days in. What matters once an
 * officer is committed is whether their own errand is still there.
 */
export function stillWorthDoing(
  state: GameState,
  system: System,
  faction: PlayableFaction,
  type: MissionType,
): boolean {
  if (type === 'recruit') return isRecruitTarget(state, system, faction);
  if (type === 'incite') return isInciteTarget(system, faction);
  return isDiplomacyTarget(system, faction);
}

/**
 * How likely the work is to be found out.
 *
 * The defenders' own crew do the finding, which is what makes where you leave
 * your people matter: an island with a good spy standing on it is dangerous to
 * meddle with. Stirring up a revolt on enemy soil is far riskier than talking
 * to people who have not chosen a side.
 */
export function foilChance(
  state: GameState,
  system: System,
  faction: PlayableFaction,
  agent?: Character,
): number {
  // Nobody is hunting you on your own island.
  if (system.control === faction) return 0;
  const enemy = otherFaction(faction);
  const watchers = state.characters.filter(
    (c) => c.faction === enemy && c.locationSystemId === system.id && c.status !== 'injured',
  );
  const best = watchers.reduce((n, c) => Math.max(n, c.espionage), 0);
  const base = system.control === enemy ? INCITE_FOIL_CHANCE : FOIL_CHANCE;
  const risk = base + (best / 100) * FOIL_PER_WATCHER;
  // Craft cuts the risk but never to nothing: a careful officer is still a
  // stranger asking questions in someone else's harbour.
  const craft = agent ? 1 - (agent.espionage / 100) * 0.6 : 1;
  return Math.max(0, Math.min(0.85, risk * craft));
}

export function missionError(
  state: GameState,
  characterId: string,
  targetSystemId: string,
): string | null {
  const character = state.characters.find((c) => c.id === characterId);
  if (!character) return 'No such character.';
  if (!isPlayable(character.faction)) return 'That character has no faction.';
  if (character.status !== 'available') return 'They are not free to sail.';
  const system = state.systems.find((s) => s.id === targetSystemId);
  if (!system) return 'No such island.';
  if (!isMissionTarget(state, system, character.faction)) return 'Nothing to be done there.';
  return null;
}

export function canStartMission(
  state: GameState,
  characterId: string,
  targetSystemId: string,
): boolean {
  return missionError(state, characterId, targetSystemId) === null;
}

/** Send a character ashore; the island decides what they do. Mutates `state`. */
export function startMission(state: GameState, characterId: string, targetSystemId: string): void {
  const error = missionError(state, characterId, targetSystemId);
  if (error) throw new Error(error);
  const character = getCharacter(state, characterId);
  const target = getSystem(state, targetSystemId);
  const days = travelDays(state, character.locationSystemId, targetSystemId);
  const type = missionTypeFor(state, target, character.faction as PlayableFaction)!;

  character.status = 'on_mission';
  character.mission = {
    type,
    targetSystemId,
    phase: days > 0 ? 'travelling' : 'working',
    daysRemaining: days > 0 ? days : MISSION_WORK_DAYS,
  };
  const errand =
    type === 'incite'
      ? 'to stir up trouble'
      : type === 'recruit'
        ? `to put it to ${recruitOn(state, target, character.faction as PlayableFaction)!.name}`
        : 'to parley';
  pushEvent(state, {
    kind: 'mission',
    text: `${character.name} sails for ${target.name} ${errand}.`,
    systemId: targetSystemId,
    characterId,
  });
}

/** Chance the mission lands its argument (spec 4.5). */
export function successChance(character: Character, type: MissionType = 'diplomacy'): number {
  const base = 0.4 + character.diplomacy / 200;
  // Talking people round who have nobody to answer to is one thing. Turning
  // them against a governor with a garrison behind him is another.
  return type === 'incite' ? base * INCITE_SUCCESS_SCALE : base;
}

/** How good someone is, for the purposes of how hard they are to sign on. */
export function quality(recruit: Character): number {
  return Math.max(recruit.diplomacy, recruit.espionage, recruit.combat, recruit.leadership);
}

/**
 * Chance of signing a particular person on. Your officer's argument, weighed
 * against how little the other party needs to hear it: somebody worth having
 * knows they are worth having, and has been asked before.
 */
export function recruitChance(officer: Character, recruit: Character): number {
  const base = 0.4 + officer.diplomacy / 200;
  return base * (1 - quality(recruit) / RECRUIT_QUALITY_DIVISOR);
}

/** How far an incitement pushes the holder's grip down, on a landed attempt. */
export function inciteLoss(character: Character): number {
  return INCITE_SUPPORT_LOSS + character.diplomacy / 10;
}

/** How far a parley brings an island round, on a landed attempt. */
export function parleyGain(character: Character): number {
  return 8 + character.diplomacy / 10;
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
          kind: 'mission',
      text: `${character.name} has recovered and is fit for sea.`,
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
      const landed = getSystem(state, mission.targetSystemId);
      // A passage can take ten days, and an island can change hands inside
      // them. Check on landfall rather than letting them spend a whole cycle
      // ashore working at something that is no longer there.
      if (!stillWorthDoing(state, landed, character.faction as PlayableFaction, mission.type)) {
        character.status = 'available';
        character.mission = undefined;
        pushEvent(state, {
          kind: 'mission',
          text: `${character.name} lands on ${landed.name} to find the work already done, and stands by.`,
          systemId: landed.id,
          characterId: character.id,
        });
        continue;
      }
      mission.phase = 'working';
      mission.daysRemaining = MISSION_WORK_DAYS;
      pushEvent(state, {
        kind: 'mission',
      text: `${character.name} has made landfall at ${landed.name}.`,
        systemId: mission.targetSystemId,
        characterId: character.id,
      });
      continue;
    }

    resolveMission(state, character, rng);
  }
}

/**
 * A cycle ashore has run out. What it was for depends on the island, which the
 * mission remembers; what it costs depends on whose island it is.
 */
function resolveMission(state: GameState, character: Character, rng: Rng): void {
  const faction = character.faction as PlayableFaction;
  const mission = character.mission!;
  const system = getSystem(state, mission.targetSystemId);

  // The island may have changed hands, risen, or been put down while they were
  // at sea. If it is no longer the thing they sailed for, the work is off.
  if (!stillWorthDoing(state, system, faction, mission.type)) {
    character.status = 'available';
    character.mission = undefined;
    pushEvent(state, {
      kind: 'mission',
      text:
        mission.type === 'incite'
          ? `${character.name} finds nothing left to stir on ${system.name} and goes quiet.`
          : mission.type === 'recruit'
            ? `${character.name} lands on ${system.name} to find the berth already taken.`
            : `${character.name} abandons the talks on ${system.name}; the island is beyond reach.`,
      systemId: system.id,
      characterId: character.id,
    });
    return;
  }

  let success: boolean;
  if (mission.type === 'recruit') {
    // Who is standing there is read again now, not remembered from the order:
    // the enemy may have signed them on while this officer was at sea, and the
    // type check above has already let that case fall through to stand-down.
    const recruit = recruitOn(state, system, faction)!;
    success = rng.chance(recruitChance(character, recruit));
    recruitOutcome(state, character, recruit, system, success);
  } else {
    success = rng.chance(successChance(character, mission.type));
    if (mission.type === 'incite') {
      inciteOutcome(state, character, system, success);
    } else {
      parleyOutcome(state, character, system, success);
    }
  }

  // Being found out, which is the price of working on ground that is not yours.
  // Measured before the outcome moved anything: who was watching is what
  // matters, not what they saw.
  if (rng.chance(foilChance(state, system, faction, character))) {
    character.status = 'injured';
    character.injuredDays = FOIL_INJURY_DAYS;
    character.mission = undefined;
    pushEvent(state, {
      kind: 'loss',
      text: `${character.name} was found out on ${system.name} and hurt getting back to the boat.`,
      systemId: system.id,
      characterId: character.id,
    });
    return;
  }

  // Ask the player what to do next; the AI answers its own straight away —
  // it works an island until it has what it came for, then frees the character up.
  if (faction === state.player) {
    state.pendingDecisions.push({ characterId: character.id, systemId: system.id, success });
  } else if (done(state, system, faction, mission.type)) {
    endMission(state, character.id);
  } else {
    continueMission(state, character.id);
  }
}

/** Whether the island has given the mission what it came for. */
function done(
  state: GameState,
  system: System,
  faction: PlayableFaction,
  type: MissionType,
): boolean {
  if (type === 'recruit') return !isRecruitTarget(state, system, faction);
  if (type === 'incite') return system.uprising;
  return system.control === faction;
}

/**
 * Signing someone on. Unlike the other two this either happens or it does not:
 * there is no support bar to nudge, and once they have put their name to it
 * they are yours for the rest of the war.
 */
function recruitOutcome(
  state: GameState,
  officer: Character,
  recruit: Character,
  system: System,
  success: boolean,
): void {
  const faction = officer.faction as PlayableFaction;
  if (!success) {
    pushEvent(state, {
      kind: 'mission',
      text: `${recruit.name} hears ${officer.name} out on ${system.name}, and says no.`,
      systemId: system.id,
      characterId: officer.id,
    });
    return;
  }
  recruit.faction = faction;
  recruit.status = 'available';
  pushEvent(state, {
    kind: 'order',
    text: `${recruit.name} has signed on at ${system.name}. ${recruit.blurb ?? ''}`.trim(),
    systemId: system.id,
    characterId: recruit.id,
  });
}

/** Talking an island round: your own standing up, theirs down. */
function parleyOutcome(
  state: GameState,
  character: Character,
  system: System,
  success: boolean,
): void {
  const faction = character.faction as PlayableFaction;
  if (!success) {
    pushEvent(state, {
      kind: 'mission',
      text: `${character.name} makes no headway on ${system.name}.`,
      systemId: system.id,
      characterId: character.id,
    });
    return;
  }
  const gain = parleyGain(character);
  applySupportChange(state, system, faction, gain);
  applySupportChange(state, system, otherFaction(faction), -MISSION_SUPPORT_LOSS);
  pushEvent(state, {
    kind: 'mission',
    text: `${character.name} sways ${system.name}: allegiance up ${gain.toFixed(1)} points.`,
    systemId: system.id,
    characterId: character.id,
  });
  resolveControlAndUnrest(state);
}

/**
 * Stirring up a revolt: you do not win the island, you cost the enemy their
 * grip on it. Drive their standing under the uprising threshold and the island
 * rises on its own — which stops their works, their drilling and their harbour
 * dead, and leaves it ripe for a landing.
 */
function inciteOutcome(
  state: GameState,
  character: Character,
  system: System,
  success: boolean,
): void {
  const faction = character.faction as PlayableFaction;
  const holder = otherFaction(faction);
  if (!success) {
    pushEvent(state, {
      kind: 'mission',
      text: `${character.name} finds no ear for it on ${system.name}.`,
      systemId: system.id,
      characterId: character.id,
    });
    return;
  }
  const loss = inciteLoss(character);
  applySupportChange(state, system, holder, -loss);
  // Some of what you take off them you do not get: a stirred-up island is angry
  // at its governor, not fond of you.
  applySupportChange(state, system, faction, loss * INCITE_SPILLOVER);
  pushEvent(state, {
    kind: 'mission',
    text: `${character.name} stirs up ${system.name}: the governor's hold falls ${loss.toFixed(1)} points.`,
    systemId: system.id,
    characterId: character.id,
  });
  resolveControlAndUnrest(state);
}

/** "Continue": another 15-day cycle on the same world (spec 4.5). */
export function continueMission(state: GameState, characterId: string): void {
  const character = getCharacter(state, characterId);
  const mission = character.mission;
  state.pendingDecisions = state.pendingDecisions.filter((d) => d.characterId !== characterId);
  if (!mission) return;
  const faction = character.faction as PlayableFaction;
  const system = getSystem(state, mission.targetSystemId);
  if (!stillWorthDoing(state, system, faction, mission.type)) {
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
