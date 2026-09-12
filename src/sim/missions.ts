import {
  FOIL_CHANCE,
  FOIL_INJURY_DAYS,
  FOIL_PER_WATCHER,
  INCITE_FOIL_CHANCE,
  INCITE_SPILLOVER,
  INCITE_SUCCESS_SCALE,
  INCITE_SUPPORT_LOSS,
  FACILITY_LABEL,
  RECRUIT_QUALITY_DIVISOR,
  SABOTAGE_BASE,
  ABDUCT_BASE,
  ABDUCT_RESIST_DIVISOR,
  CAPTIVE_DAYS,
  COMMAND_BASE,
  COMMAND_SUPPORT_GAIN,
  CRAFT_GRADES,
  RESEARCH_BASE,
  RESEARCH_MIN_SUPPORT,
  RESEARCH_PROGRESS,
  SABOTAGE_PRIORITY,
  SURVEY_PER_ISLAND,
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
import { recomputeLedger } from './economy';
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
 * Whether there is anything here worth breaking.
 *
 * An enemy island with works on it. Not your own — you would be burning your
 * own mill — and not one nobody has built on, because there is nothing to
 * burn. Charted, like everything else: you cannot sabotage a rumour.
 */
export function isSabotageTarget(
  system: System,
  faction: PlayableFaction,
): boolean {
  return (
    system.explored[faction] &&
    system.control === otherFaction(faction) &&
    system.facilities.length > 0
  );
}

/**
 * Somewhere you have not been.
 *
 * Every other mission needs the island charted first — you cannot parley with
 * a rumour — so this is the one that can be sent into the dark, and it is how
 * the Crown is supposed to find a harbour that moves when it is found.
 */
export function isSurveyTarget(system: System, faction: PlayableFaction): boolean {
  return !system.explored[faction];
}

/**
 * A named officer of theirs, standing somewhere they cannot protect.
 *
 * Not one already in irons, not one at sea, and — the rule that matters — not
 * one on an island their own side holds. Letting you lift people off their own
 * quays sounds bolder and plays worse: their whole crew starts at their
 * capital, so their capital would read as an abduction on day one and every
 * day after, and incitement, which is the real answer to an enemy island,
 * would never come up at all. Off their ground they are worth watching for,
 * which is what a raid should feel like.
 */
export function abductOn(
  state: GameState,
  system: System,
  faction: PlayableFaction,
): Character | undefined {
  if (!system.explored[faction]) return undefined;
  if (system.control === otherFaction(faction)) return undefined;
  return state.characters.find(
    (c) =>
      c.faction === otherFaction(faction) &&
      c.locationSystemId === system.id &&
      c.status !== 'captured' &&
      c.status !== 'injured' &&
      !(c.mission && c.mission.phase === 'travelling'),
  );
}

export function isAbductTarget(
  state: GameState,
  system: System,
  faction: PlayableFaction,
): boolean {
  return abductOn(state, system, faction) !== undefined;
}

/**
 * An island of yours that has risen.
 *
 * This was the one place on the chart you could not send anybody. Parley
 * refuses an island in revolt, incitement wants an enemy island, and sabotage
 * wants their works — so your own islands in mutiny, the ones actually costing
 * you something today, were the only islands in the game with no answer. A
 * commander ashore is the answer, and it is the one Rebellion gave too.
 */
export function isCommandTarget(system: System, faction: PlayableFaction): boolean {
  return system.explored[faction] && system.control === faction && system.uprising;
}

/**
 * A yard of yours on an island loyal enough to spare it.
 *
 * The allegiance floor is what keeps this from competing with parley. Below it
 * the island still has something to be talked round about and that is the
 * better use of an officer; above it a parley was busy-work — the bar was
 * already full — and the yards may as well be improving the hulls.
 */
export function isResearchTarget(system: System, faction: PlayableFaction): boolean {
  if (!system.explored[faction] || system.control !== faction || system.uprising) return false;
  if (system.support[faction] < RESEARCH_MIN_SUPPORT) return false;
  return system.facilities.some(
    (f) => f.owner === faction && (f.type === 'shipyard' || f.type === 'construction_yard'),
  );
}

/**
 * What landing here would mean. The island decides, not a menu: you cannot
 * parley with an enemy island and there is nothing to incite on your own.
 *
 * Signing someone on comes first wherever there is someone to sign. They are
 * the scarce thing — an island can be worked again next month, and a person
 * standing on a quay can be gone — and it keeps the rule to one sentence a
 * player can hold in their head.
 *
 * Sabotage comes last, and that placement is the design rather than an
 * afterthought. On an enemy island the better answer is nearly always to turn
 * its people, because an island that rises is an island you can take. Sabotage
 * is what is left when you cannot: the people are already in revolt, or there
 * are no people, and the works are still running. It gives Espionage a use
 * that is not passive and gives a stalled front something to do.
 */
export function missionTypeFor(
  state: GameState,
  system: System,
  faction: PlayableFaction,
): MissionType | null {
  if (isRecruitTarget(state, system, faction)) return 'recruit';
  // A person of theirs caught off their own ground outranks anything that can
  // be done to the island under them: the island will be there next month and
  // they will not.
  if (isAbductTarget(state, system, faction)) return 'abduct';
  // Your own island in revolt has no other answer, and parley refuses it.
  if (isCommandTarget(system, faction)) return 'command';
  // Above parley, and only where parley had nothing left to win.
  if (isResearchTarget(system, faction)) return 'research';
  if (isDiplomacyTarget(system, faction)) return 'diplomacy';
  if (isInciteTarget(system, faction)) return 'incite';
  if (isSabotageTarget(system, faction)) return 'sabotage';
  // Last, and it never competes: everything above requires the island to be
  // charted, and this is the only thing you can do with one that is not.
  if (isSurveyTarget(system, faction)) return 'survey';
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
  if (type === 'sabotage') return isSabotageTarget(system, faction);
  if (type === 'survey') return isSurveyTarget(system, faction);
  if (type === 'abduct') return isAbductTarget(state, system, faction);
  if (type === 'command') return isCommandTarget(system, faction);
  if (type === 'research') return isResearchTarget(system, faction);
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
      : type === 'sabotage'
        ? 'to see what can be broken'
        : type === 'survey'
          ? 'to put it on the chart'
          : type === 'abduct'
            ? `to take ${abductOn(state, target, character.faction as PlayableFaction)!.name} off the quay`
            : type === 'command'
              ? 'to take command and put it back in order'
              : type === 'research'
                ? 'to put its yards to work on the craft'
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

/**
 * What to call an errand, in one place.
 *
 * Three screens were spelling these out in their own nested ternaries and the
 * third one had already fallen behind: a mission type the list did not know
 * about came out as "parley", which is a lie rather than a gap.
 */
export const MISSION_LABEL: Record<MissionType, string> = {
  recruit: 'Signing on',
  diplomacy: 'Parley',
  incite: 'Stirring up trouble',
  sabotage: 'Sabotage',
  survey: 'Survey',
  abduct: 'Abduction',
  command: 'In command',
  research: 'In the yards',
};

/** Chance the mission lands its argument (spec 4.5). */
export function successChance(character: Character, type: MissionType = 'diplomacy'): number {
  // Breaking things is not an argument, so it is not read off Diplomacy. This
  // is the active use Espionage never had: the rating that decides how much of
  // a chain a landing charts now also decides whether a yard burns.
  // A survey is the one thing that always tells you something: an officer who
  // has spent a fortnight ashore has seen the island whether or not they found
  // what they went for. The roll decides how much of the chain comes with it.
  if (type === 'survey') return 1;
  if (type === 'sabotage') return SABOTAGE_BASE + character.espionage / 260;
  // Restoring order is what Leadership is for. It only ever rated how well a
  // company fought until now, which left the best commanders in the game with
  // nothing to do but stand on a deck.
  if (type === 'command') return COMMAND_BASE + character.leadership / 240;
  if (type === 'research') return RESEARCH_BASE + character.espionage / 300;
  // Abduction is set against the person, not the place, and is handled where
  // the target is known. This is the floor.
  if (type === 'abduct') return ABDUCT_BASE + character.espionage / 300;
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
    /**
     * Prisoners come home.
     *
     * Held at the captor's seat, out of the war, and then exchanged — nobody
     * in this setting keeps an officer for good, and a cast of twenty-six
     * cannot afford them to. They come back to their own capital rather than
     * to wherever they were lifted from, because that is where an exchange
     * puts you.
     */
    if (character.status === 'captured') {
      character.injuredDays = Math.max(0, (character.injuredDays ?? 0) - 1);
      if (character.injuredDays === 0) {
        character.status = 'available';
        character.injuredDays = undefined;
        character.locationSystemId = state.factions[character.faction as PlayableFaction].hqSystemId;
        pushEvent(state, {
          kind: 'mission',
          text: `${character.name} has been exchanged and is back in the war.`,
          characterId: character.id,
        });
      }
      continue;
    }

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
            : mission.type === 'abduct'
              ? `${character.name} finds the quay at ${system.name} empty; their mark has sailed.`
              : mission.type === 'command'
                ? `${character.name} lands on ${system.name} to find order already restored.`
                : `${character.name} abandons the talks on ${system.name}; the island is beyond reach.`,
      systemId: system.id,
      characterId: character.id,
    });
    return;
  }

  let success: boolean;
  if (mission.type === 'abduct') {
    // Read again now, not remembered from the order: they may have sailed and
    // somebody else of theirs may have arrived, and either way it is whoever
    // is standing there today who gets carried off.
    const mark = abductOn(state, system, faction)!;
    success = rng.chance(abductChance(character, mark));
    abductOutcome(state, character, mark, system, success);
  } else if (mission.type === 'recruit') {
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
    } else if (mission.type === 'sabotage') {
      sabotageOutcome(state, character, system, success);
    } else if (mission.type === 'survey') {
      surveyOutcome(state, character, system);
    } else if (mission.type === 'command') {
      commandOutcome(state, character, system, success);
    } else if (mission.type === 'research') {
      researchOutcome(state, character, system, success);
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
  // Nothing left standing to break.
  if (type === 'sabotage') return system.facilities.length === 0;
  // Nothing left in the chain to put on the chart.
  if (type === 'survey') {
    return state.systems
      .filter((s) => s.sectorId === system.sectorId)
      .every((s) => s.explored[faction]);
  }
  // Nobody of theirs left on the quay.
  if (type === 'abduct') return !isAbductTarget(state, system, faction);
  // Order restored, which is the whole of the posting.
  if (type === 'command') return !system.uprising;
  // Never: the yards can always be improved on, and it is the player who
  // decides the officer is better used somewhere else.
  if (type === 'research') return false;
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

/**
 * Putting a chain on the chart.
 *
 * The island the officer stood on always goes down — a fortnight ashore is a
 * fortnight ashore — and their Espionage decides how much of the rest of the
 * chain they worked out from it. Nearest first, because that is what somebody
 * asking questions in a harbour would learn: who your neighbours are before
 * who lives four days' sail away.
 */
/**
 * How likely an abduction is to come off, against this particular person.
 *
 * The only success roll in the game that reads two characters. Everything else
 * is an officer against a place, and a place does not have a sword.
 */
export function abductChance(officer: Character, mark: Character): number {
  const resist = Math.max(mark.combat, mark.leadership) / ABDUCT_RESIST_DIVISOR;
  return Math.max(0.05, ABDUCT_BASE + officer.espionage / 300 - resist);
}

/**
 * Taking one of theirs off the board.
 *
 * A captive is not killed and not converted — both were tried on paper and
 * both are worse. Killing removes a name from a small cast permanently and
 * makes the game emptier the longer it runs; converting hands you their best
 * officer for free, which makes one good abduction decide the war. Captured is
 * the middle: they are out of the war for two months, held at your seat, and
 * they come back. It is a tempo weapon, which is what a raid should be.
 */
function abductOutcome(
  state: GameState,
  officer: Character,
  mark: Character,
  system: System,
  success: boolean,
): void {
  const faction = officer.faction as PlayableFaction;
  if (!success) {
    pushEvent(state, {
      kind: 'mission',
      text: `${officer.name} moves on ${mark.name} at ${system.name} and comes away empty-handed.`,
      systemId: system.id,
      characterId: officer.id,
    });
    return;
  }
  mark.status = 'captured';
  mark.injuredDays = CAPTIVE_DAYS;
  mark.mission = undefined;
  mark.locationSystemId = state.factions[faction].hqSystemId;
  const held = getSystem(state, mark.locationSystemId);
  pushEvent(state, {
    kind: 'loss',
    text: `${officer.name} has taken ${mark.name} off the quay at ${system.name}. They are held at ${held.name}.`,
    systemId: system.id,
    characterId: mark.id,
  });
}

/**
 * A commander ashore on an island of yours that has risen.
 *
 * Success puts the revolt down outright; a failed cycle still moves the bar,
 * because a commander standing in the square with a company behind him is not
 * nothing even on a bad fortnight. That is the difference between this and
 * every other mission, where a failure is a wasted cycle: you are on your own
 * ground and the ground is listening.
 */
function commandOutcome(
  state: GameState,
  officer: Character,
  system: System,
  success: boolean,
): void {
  const faction = officer.faction as PlayableFaction;
  const gain = success ? COMMAND_SUPPORT_GAIN + officer.leadership / 9 : COMMAND_SUPPORT_GAIN / 2;
  applySupportChange(state, system, faction, gain);
  if (success) {
    system.uprising = false;
    resolveControlAndUnrest(state);
    recomputeLedger(state);
  }
  pushEvent(state, {
    kind: success ? 'order' : 'mission',
    text: success
      ? `${officer.name} has put ${system.name} back in order.`
      : `${officer.name} holds the square at ${system.name}; the island is still out.`,
    systemId: system.id,
    characterId: officer.id,
  });
}

/** Which grade a side's craft has reached, 0 to 3. */
export function craftGrade(progress: number): number {
  return CRAFT_GRADES.filter((need) => progress >= need).length;
}

/**
 * A cycle in the yards.
 *
 * The event only speaks up when a grade is actually crossed. A line every
 * fortnight saying the number went up by thirty is a line the player learns to
 * skip, and then misses the one that mattered.
 */
function researchOutcome(
  state: GameState,
  officer: Character,
  system: System,
  success: boolean,
): void {
  const faction = officer.faction as PlayableFaction;
  const before = craftGrade(state.factions[faction].craft);
  const gained = success ? RESEARCH_PROGRESS + officer.espionage / 6 : RESEARCH_PROGRESS / 3;
  state.factions[faction].craft += gained;
  const after = craftGrade(state.factions[faction].craft);
  if (after > before) {
    pushEvent(state, {
      kind: 'order',
      text: `The yards at ${system.name} have the measure of it. Shipwright craft is now grade ${after}: every hull is cheaper and quicker to lay down.`,
      systemId: system.id,
      characterId: officer.id,
    });
  }
}

function surveyOutcome(
  state: GameState,
  character: Character,
  system: System,
): void {
  const faction = character.faction as PlayableFaction;
  const opened: string[] = [];
  if (!system.explored[faction]) {
    system.explored[faction] = true;
    opened.push(system.name);
  }
  const extra = Math.floor(character.espionage / SURVEY_PER_ISLAND);
  const neighbours = state.systems
    .filter((s) => s.sectorId === system.sectorId && !s.explored[faction])
    .sort((a, b) => Math.hypot(a.x - system.x, a.y - system.y) - Math.hypot(b.x - system.x, b.y - system.y))
    .slice(0, extra);
  for (const s of neighbours) {
    s.explored[faction] = true;
    opened.push(s.name);
  }
  if (opened.length === 0) {
    pushEvent(state, {
      kind: 'mission',
      text: `${character.name} finds nothing on ${system.name} that the charts did not already have.`,
      systemId: system.id,
      characterId: character.id,
    });
    return;
  }
  pushEvent(state, {
    kind: 'order',
    text:
      opened.length === 1
        ? `${character.name} puts ${opened[0]} on the chart.`
        : `${character.name} charts ${opened[0]} and ${opened.length - 1} more of the chain.`,
    systemId: system.id,
    characterId: character.id,
  });
}

/**
 * Breaking something. Unlike a parley there is no dial to nudge: a facility is
 * standing or it is ash, and the island notices either way.
 *
 * The most valuable works go first — a slipway before a mine — because that is
 * what somebody sent to do this would pick, and because a sabotage that costs
 * the enemy four gold a day is not worth the passage.
 */
function sabotageOutcome(
  state: GameState,
  character: Character,
  system: System,
  success: boolean,
): void {
  if (!success) {
    pushEvent(state, {
      kind: 'mission',
      text: `${character.name} finds ${system.name} too well watched, and comes away with nothing.`,
      systemId: system.id,
      characterId: character.id,
    });
    return;
  }
  const target =
    SABOTAGE_PRIORITY.map((type) => system.facilities.find((f) => f.type === type)).find(Boolean) ??
    system.facilities[0];
  if (!target) return;
  system.facilities = system.facilities.filter((f) => f.id !== target.id);
  pushEvent(state, {
    kind: 'loss',
    text: `${character.name} burns the ${FACILITY_LABEL[target.type].toLowerCase()} on ${system.name}.`,
    systemId: system.id,
    characterId: character.id,
  });
  recomputeLedger(state);
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
