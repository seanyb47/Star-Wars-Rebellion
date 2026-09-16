import {
  FOIL_CHANCE,
  FOIL_INJURY_DAYS,
  FOIL_PER_WATCHER,
  COMMANDER_WATCH,
  INCITE_FOIL_CHANCE,
  INCITE_SUCCESS_SCALE,
  INCITE_SUPPORT_LOSS,
  FACILITY_LABEL,
  RECRUIT_QUALITY_DIVISOR,
  SABOTAGE_BASE,
  ABDUCT_BASE,
  ABDUCT_RESIST_DIVISOR,
  COMMAND_BASE,
  COMMAND_SUPPORT_GAIN,
  CRAFT_GRADES,
  RESEARCH_BASE,
  RESEARCH_MIN_SUPPORT,
  RESEARCH_PROGRESS,
  SABOTAGE_PRIORITY,
  SURVEY_PER_ISLAND,
  MISSION_PARTY_MAX,
  MISSION_WORK_DAYS,
  TRAVEL_CAST_OFF,
  TRAVEL_LEAGUE,
  TRAVEL_OPEN_SEA,
  RESCUE_BASE,
  WORKS_ON,
} from './constants';
import {
  applySupportChange,
  getCharacter,
  getSystem,
  isPlayable,
  otherFaction,
  pushEvent,
  returnDeposit,
} from './helpers';
import { sightBeast } from './creatures';
import { recomputeLedger } from './economy';
import { resolveControlAndUnrest } from './support';
import { isLord, passageShare, restoreLord } from './lords';
import type { Rng } from './rng';
import type { Character, GameState, MissionType, PlayableFaction, System } from './types';

/**
 * How many days' sail from one island to another.
 *
 * Measured, not banded. An island's own x and y are relative to its Reach —
 * that is how the chart draws a cluster — so a distance between two islands is
 * only meaningful once each is placed in the world: Reach centre plus island
 * offset. Getting that wrong is a quiet bug rather than a loud one, since two
 * islands in different Reaches would still come out a plausible distance
 * apart, just the wrong one.
 *
 * Then: a fixed cost to cast off at all, a day for every league of open water,
 * and a toll on top for leaving your own Sea. Never less than one day, because
 * a voyage that takes no time is a teleport.
 */
export function travelDays(state: GameState, fromSystemId: string, toSystemId: string): number {
  if (fromSystemId === toSystemId) return 0;
  const from = getSystem(state, fromSystemId);
  const to = getSystem(state, toSystemId);
  const a = worldPlace(state, from);
  const b = worldPlace(state, to);
  const leagues = Math.hypot(a.x - b.x, a.y - b.y) / TRAVEL_LEAGUE;
  const crossing = from.sectorId === to.sectorId ? 0 : TRAVEL_OPEN_SEA;
  return Math.max(1, Math.round(TRAVEL_CAST_OFF + leagues + crossing));
}

/** An island's place in the world: its Reach's centre, plus its own offset. */
function worldPlace(state: GameState, system: System): { x: number; y: number } {
  const sector = state.sectors.find((s) => s.id === system.sectorId);
  if (!sector) return { x: system.x, y: system.y };
  return { x: sector.x + system.x, y: sector.y + system.y };
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
 * the Crown is supposed to find a harbor that moves when it is found.
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
  // Their own harbor is worth going into for one of three people and nobody
  // else. An ordinary officer caught off their ground is a chance you take;
  // sailing into their anchorage to lift a clerk is not a war aim, and if it
  // were, abduction would outrank inciting on every enemy island in the game
  // and the chart would have one answer everywhere.
  //
  // A Lord is the exception because a Lord is the war. This is the Crown's
  // whole route to victory: measured over sixteen wars with the old rule, it
  // won none of them and never took a single Lord, because the three of them
  // stand on Confederate ground and Confederate ground was closed. It is
  // priced, not free — working on enemy soil carries the higher foil chance,
  // so a raid into their harbor is how officers get hurt.
  const theirs = system.control === otherFaction(faction);

  // Only somebody actually on the quay: an officer aboard a ship in the
  // harbor is not there to be taken.
  //
  // A Lord is, now. That line used to end "and a Lord never is", because a
  // Lord was a hull and you took the hull. They are people, so they are taken
  // the way people are taken — which is the reason every errand the Brethren
  // send one on is a risk worth weighing.
  const aboard = new Set(state.fleets.flatMap((f) => f.officerIds));
  return state.characters.find(
    (c) =>
      c.faction === otherFaction(faction) &&
      c.locationSystemId === system.id &&
      c.status !== 'captured' &&
      c.status !== 'injured' &&
      !aboard.has(c.id) &&
      !(c.mission && c.mission.phase === 'travelling') &&
      (!theirs || isLord(c)),
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
/**
 * One of yours held here. Captives are kept at the captor's seat, so this is
 * only ever the enemy capital — and only once you have found it.
 */
export function captiveOn(
  state: GameState,
  system: System,
  faction: PlayableFaction,
): Character | undefined {
  if (!system.explored[faction]) return undefined;
  return state.characters.find(
    (c) => c.faction === faction && c.status === 'captured' && c.locationSystemId === system.id,
  );
}

export function isRescueTarget(
  state: GameState,
  system: System,
  faction: PlayableFaction,
): boolean {
  return captiveOn(state, system, faction) !== undefined;
}

/**
 * Somewhere of yours to post an officer.
 *
 * This used to be "an island of yours that is in revolt", and Command was a
 * one-shot errand that went and put the revolt down. It is a posting now, at
 * Sean's word — you set a crew member to command a location or a fleet, and
 * they hold it until relieved — so any island of yours will take one, quiet or
 * not. Putting down a revolt is what a commander does on arrival rather than
 * the only reason to send one.
 */
export function isCommandTarget(system: System, faction: PlayableFaction): boolean {
  return system.explored[faction] && system.control === faction;
}

/**
 * Who can be posted to hold a place.
 *
 * Sean, on whether command ranks should gate anything: *"Naw. But only certain
 * units can command."* So it is not a rank system — nobody is promoted, and no
 * other order is gated — it is one question asked of one errand, the way the
 * world bible already answers it: a character's `roles` say what they are for,
 * and holding an island is what a Leader or a General is for.
 *
 * `roles` had been display only since it was written. This is the first rule
 * that reads it, which is also why the twelve unaligned were given roles at
 * the same time: without them, nobody you signed on could ever hold anything.
 */
export const COMMAND_ROLES = ['Leader', 'General'] as const;

export function canCommand(character: Character): boolean {
  return (character.roles ?? []).some((r) => COMMAND_ROLES.includes(r as 'Leader' | 'General'));
}

/** The officer holding an island, if anyone is. */
export function commanderOf(state: GameState, system: Pick<System, 'commanderId'>) {
  return system.commanderId
    ? state.characters.find((c) => c.id === system.commanderId)
    : undefined;
}

/** Squadrons lying at an island that an officer could be posted to command. */
export function fleetsToCommand(state: GameState, systemId: string, faction: PlayableFaction) {
  return state.fleets.filter((f) => f.faction === faction && !f.voyage && f.systemId === systemId);
}

/**
 * Give up a post: off the deck, or out of the governor's chair.
 *
 * Instant, because they are already standing there — the cost of a posting is
 * the officer being tied up while it lasts, not the paperwork of ending it.
 */
/**
 * Somebody goes into the cells.
 *
 * One place, because there are two ways in now: lifted off a quay by an
 * abduction, or caught on an island when it is stormed. Sean, 16 September:
 * *"when you assault an island you should capture any personnel on the island,
 * including those on missions"* — which also means that taking every island
 * takes every Lord, and the Crown's victory condition stops being a manhunt
 * you can never quite close.
 *
 * No counter: captivity ends when somebody comes for them and not before.
 * Whatever they were holding they are not holding now — without `relieve` an
 * island went on counting a commander who was in a cell three Reaches away,
 * and went on being harder to infiltrate for it.
 */
export function takePrisoner(
  state: GameState,
  mark: Character,
  captor: PlayableFaction,
): void {
  mark.status = 'captured';
  mark.injuredDays = undefined;
  mark.mission = undefined;
  relieve(state, mark.id);
  mark.locationSystemId = state.factions[captor].hqSystemId;
}

/**
 * Everyone of theirs standing on this island when the boats come in.
 *
 * Not the ones at sea: an officer who sailed yesterday still carries this
 * island as their location until they arrive somewhere, and they are plainly
 * not on the beach. Everyone else is — including officers in the middle of an
 * errand here, who are exactly the people worth catching.
 */
export function caughtOnLanding(
  state: GameState,
  system: System,
  taker: PlayableFaction,
): Character[] {
  return state.characters.filter(
    (c) =>
      c.faction !== taker &&
      c.faction !== 'neutral' &&
      c.locationSystemId === system.id &&
      c.status !== 'captured' &&
      !(c.status === 'on_mission' && c.mission?.phase === 'travelling'),
  );
}

export function relieve(state: GameState, characterId: string): void {
  for (const fleet of state.fleets) {
    fleet.officerIds = fleet.officerIds.filter((id) => id !== characterId);
  }
  for (const system of state.systems) {
    if (system.commanderId === characterId) system.commanderId = undefined;
  }
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
  // One of your own in their cells outranks anything done to the island
  // holding them: two months out of the war is two months you get back.
  if (isRescueTarget(state, system, faction)) return 'rescue';
  // A person of theirs caught off their own ground outranks anything that can
  // be done to the island under them: the island will be there next month and
  // they will not.
  if (isAbductTarget(state, system, faction)) return 'abduct';
  // Your own island in revolt has no other answer, and parley refuses it. Any
  // island of yours will take a commander now, but a posting is a deliberate
  // thing — it spends an officer indefinitely — so it is offered everywhere
  // and defaulted to only where it is plainly the answer.
  if (system.uprising && isCommandTarget(system, faction)) return 'command';
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
 * Everything an officer could do on this island, best first.
 *
 * `missionTypeFor` answers with one errand, which is what the opponent and
 * the chart's pick rings want. The player gets the whole list, the way the
 * original offered a menu when a character was dropped on a planet: an
 * enemy island with their officer ashore and a works running is an
 * abduction, an incitement and a sabotage, and which of the three is the
 * player's call.
 */
export function missionsOffered(
  state: GameState,
  system: System,
  faction: PlayableFaction,
  /** Whose list this is. Omitted where the question is about the island alone
   *  — the chart's pick rings, the opponent's survey of what is worth doing —
   *  and given wherever an actual officer is about to be sent. */
  officer?: Character,
): MissionType[] {
  const out: MissionType[] = [];
  if (isRecruitTarget(state, system, faction)) out.push('recruit');
  if (isRescueTarget(state, system, faction)) out.push('rescue');
  if (isAbductTarget(state, system, faction)) out.push('abduct');
  if (isCommandTarget(system, faction) && (!officer || canCommand(officer))) out.push('command');
  if (isResearchTarget(system, faction)) out.push('research');
  if (isDiplomacyTarget(system, faction)) out.push('diplomacy');
  if (isInciteTarget(system, faction)) out.push('incite');
  if (isSabotageTarget(system, faction)) out.push('sabotage');
  if (isSurveyTarget(system, faction)) out.push('survey');
  return out;
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
  if (type === 'rescue') return isRescueTarget(state, system, faction);
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
  // A posted commander is the other half of what leadership is for. Espionage
  // is the officer who happens to be standing there and notices you; command
  // is the one whose whole job is that nothing happens on this island without
  // them hearing of it. It was the gap in the faction profile — the Crown's
  // leadership edge bought it nothing defensively — and this is where it pays.
  const held = commanderOf(state, system);
  const watch = held && held.faction === enemy && held.status !== 'injured'
    ? (held.leadership / 100) * COMMANDER_WATCH
    : 0;
  const risk = base + (best / 100) * FOIL_PER_WATCHER + watch;
  // Craft cuts the risk but never to nothing: a careful officer is still a
  // stranger asking questions in someone else's harbor.
  const craft = agent ? 1 - (agent.espionage / 100) * 0.6 : 1;
  return Math.max(0, Math.min(0.85, risk * craft));
}

/**
 * Officers who could go along on an errand leaving from where this one stands.
 *
 * Same side, free, and at the same island. There is no third place in this
 * game: you are on a fleet or you are on an island, and a fleet lying at an
 * island is at that island — so both count and the test is one comparison. A
 * Lord may not go along: their absence pins their own ship, and that cost
 * should be theirs to choose rather than somebody else's to pay.
 */
export function companionsFor(state: GameState, leader: Character): Character[] {
  const here = leader.locationSystemId;
  return state.characters.filter(
    (c) =>
      c.id !== leader.id &&
      c.faction === leader.faction &&
      c.status === 'available' &&
      !c.mission &&
      !c.escorting &&
      // A Lord may ride in somebody else's boat now. They are personnel and
      // nothing else, and putting two of the three in one party is a way to
      // lose a war in an afternoon — which is the player's risk to take.
      c.locationSystemId === here,
  );
}

/** Everyone on this officer's errand, the officer first. */
export function partyOf(state: GameState, leader: Character): Character[] {
  const ids = leader.mission?.party ?? [];
  return [
    leader,
    ...ids
      .map((id) => state.characters.find((c) => c.id === id))
      .filter((c): c is Character => c !== undefined),
  ];
}

/**
 * What the boat is worth at each thing, which is what its best hand is worth.
 *
 * A party is not a committee: you bring the forger for the forging and the
 * talker for the talking, and the errand goes as well as the best person on it
 * could have made it go alone. Adding a second-best nobody changes nothing,
 * which is the right incentive — take who the job needs, not everybody.
 */
export function partyStrength(state: GameState, leader: Character): Character {
  return bestOf(partyOf(state, leader));
}

/**
 * The same question asked of a boat that has not sailed yet, so the sheet can
 * show the odds moving as people are added to it.
 */
export function bestOf(members: Character[]): Character {
  const [first, ...rest] = members;
  if (rest.length === 0) return first;
  return {
    ...first,
    diplomacy: Math.max(...members.map((c) => c.diplomacy)),
    espionage: Math.max(...members.map((c) => c.espionage)),
    combat: Math.max(...members.map((c) => c.combat)),
    leadership: Math.max(...members.map((c) => c.leadership)),
  };
}

/**
 * Put the boat's crew back where their errand left them.
 *
 * Companions carry no Mission of their own, so nothing in the day's tick moves
 * or frees them; this does, once a day, off the leader's state. Run rather
 * than hooked into the six places an errand can end, for the same reason the
 * Lords are reseated the same way: five would have been remembered.
 */
export function syncMissionParties(state: GameState): void {
  for (const c of state.characters) {
    if (!c.escorting) continue;
    const leader = state.characters.find((x) => x.id === c.escorting);
    const mission = leader?.mission;
    if (!leader || !mission || !mission.party?.includes(c.id)) {
      // The errand is over, however it ended. They are free where they stand.
      c.escorting = undefined;
      if (c.status === 'on_mission') c.status = 'available';
      continue;
    }
    // Still out: they are wherever the errand is.
    c.status = 'on_mission';
    c.locationSystemId = leader.locationSystemId;
  }
}

export function missionError(
  state: GameState,
  characterId: string,
  targetSystemId: string,
  type?: MissionType,
): string | null {
  const character = state.characters.find((c) => c.id === characterId);
  if (!character) return 'No such character.';
  if (!isPlayable(character.faction)) return 'That character has no faction.';
  if (character.status !== 'available') return 'They are not free to sail.';
  const system = state.systems.find((s) => s.id === targetSystemId);
  if (!system) return 'No such island.';
  if (!isMissionTarget(state, system, character.faction)) return 'Nothing to be done there.';
  if (type === 'command' && !canCommand(character)) {
    return `${character.name} is not one to hold a place. Send a Leader or a General.`;
  }
  if (type && !missionsOffered(state, system, character.faction, character).includes(type)) {
    return `${MISSION_LABEL[type]} is not on offer there.`;
  }
  return null;
}

export function canStartMission(
  state: GameState,
  characterId: string,
  targetSystemId: string,
): boolean {
  return missionError(state, characterId, targetSystemId) === null;
}

/**
 * Send a character ashore. The island decides what they do unless the player
 * chose from what it offered. Mutates `state`.
 */
export function startMission(
  state: GameState,
  characterId: string,
  targetSystemId: string,
  chosen?: MissionType,
  companionIds: string[] = [],
  /** Which squadron a Command posting is for, when it is not the island. */
  targetFleetId?: string,
): void {
  const error = missionError(state, characterId, targetSystemId, chosen);
  if (error) throw new Error(error);
  const character = getCharacter(state, characterId);
  const target = getSystem(state, targetSystemId);
  // The Swallowtail's power: Reyne is never off her, so anywhere he leads a
  // boat he is there in half the time. Rounded up, and never less than a day —
  // fast is not the same as instant.
  //
  // Standing on the island already is the one case that stays at nought. It
  // has to: a posting taken in the room you are standing in is taken now (see
  // the `days === 0` branch below), and clamping the halving to a minimum of
  // one without excepting it would have sent every officer on a day's voyage
  // to the quay they were already on.
  const passage = travelDays(state, character.locationSystemId, targetSystemId);
  const days = passage === 0 ? 0 : Math.max(1, Math.ceil(passage * passageShare(character)));
  const type = chosen ?? missionTypeFor(state, target, character.faction as PlayableFaction)!;

  // Whoever is actually allowed in the boat, capped at a boatful. Anybody
  // named who cannot go is dropped rather than refusing the whole errand: the
  // sheet offers only the eligible, so a stale id is a race, not an order.
  const allowed = new Set(companionsFor(state, character).map((c) => c.id));
  const party = companionIds.filter((id) => allowed.has(id)).slice(0, MISSION_PARTY_MAX - 1);

  // Whoever was serving aboard a fleet here goes over the side for the boat:
  // an officer away at a parley is not also commanding a squadron.
  //
  // Nor an island. A posting used to survive its holder walking down the quay
  // and sailing off on another errand — the island went on counting a
  // commander who was three Reaches away, and went on being harder to
  // infiltrate for it. Sean raised the general shape of this: in Rebellion a
  // ranked officer is *in the way* when you want to move people. Here the
  // answer is that you simply send them, and the posting ends because they
  // have gone. There is nothing to undo first.
  const aboard = new Set([character.id, ...party]);
  for (const id of aboard) {
    for (const system of state.systems) {
      if (system.commanderId === id) system.commanderId = undefined;
    }
  }
  for (const fleet of state.fleets) {
    fleet.officerIds = fleet.officerIds.filter((id) => !aboard.has(id));
  }
  character.status = 'on_mission';
  character.mission = {
    type,
    targetSystemId,
    phase: days > 0 ? 'travelling' : 'working',
    daysRemaining: days > 0 ? days : MISSION_WORK_DAYS,
    party: party.length > 0 ? party : undefined,
    targetFleetId: type === 'command' ? targetFleetId : undefined,
  };
  for (const id of party) {
    const mate = getCharacter(state, id);
    mate.status = 'on_mission';
    mate.escorting = character.id;
  }
  // Already standing there. Every other errand still needs its fortnight of
  // work, but a posting is taken the moment you are in the room — and without
  // this it would fall through to the wrong outcome a fortnight later.
  if (type === 'command' && days === 0) {
    takePost(state, character, target, targetFleetId);
    return;
  }
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
              ? 'to take command there'
              : type === 'research'
                ? 'to put its yards to work on the craft'
                : type === 'recruit'
                  ? `to put it to ${recruitOn(state, target, character.faction as PlayableFaction)!.name}`
                  : type === 'rescue'
                    ? `to break ${captiveOn(state, target, character.faction as PlayableFaction)!.name} out`
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
  rescue: 'Rescue',
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
  if (type === 'rescue') return RESCUE_BASE + character.espionage / 250;
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
  /*
   * Drop answers nobody can give any more.
   *
   * An officer waiting on orders can be lifted off the island by their
   * abductors while they wait. The question goes with them: there is nothing
   * to continue and nobody to continue it. Without this the decision outlives
   * the errand, and — because a pending decision pauses its officer — it would
   * pause a prisoner's captivity along with it and leave them in the cells for
   * the rest of the war.
   */
  state.pendingDecisions = state.pendingDecisions.filter((d) => {
    const who = state.characters.find((c) => c.id === d.characterId);
    return who !== undefined && who.status === 'on_mission' && who.mission !== undefined;
  });

  for (const character of state.characters) {
    /*
     * An officer who has reported and is waiting on orders does nothing.
     *
     * This was hidden until the clock stopped waiting for a decision. The hold
     * froze the world the instant one was raised, so the next cycle never came
     * round; with the clock running, the same errand resolved again every
     * fifteen days and pushed another decision for the same officer. Measured
     * at 209 of them for one character over two hundred days.
     *
     * The fix is the fiction: they have made their report and they are
     * standing there waiting for an answer. Their errand is paused until they
     * get one, and not answering costs you their time — which is the honest
     * price of not deciding, and exactly what the frozen clock was concealing.
     */
    if (
      character.status === 'on_mission' &&
      state.pendingDecisions.some((d) => d.characterId === character.id)
    ) {
      continue;
    }

    /**
     * A prisoner stays a prisoner.
     *
     * They used to walk free after sixty days. Sean, 16 September: *"Why would
     * anyone be released without a rescue mission?"* — and there is no answer.
     * Nobody hands back the leader of the rebellion because two months have
     * passed. The old reasoning was about the cast: *"nobody in this setting
     * keeps an officer for good, and a cast of twenty-six cannot afford them
     * to."* But the game has had a rescue errand the whole time. A prisoner is
     * not a character removed from the war; they are a character sitting in a
     * cell on a named island, waiting for somebody to come for them, which is
     * a better thing to be than a countdown.
     *
     * So: nothing happens here. Captivity ends one way, in `rescueOutcome`.
     * Wounds still heal below — a body mends on its own and a gaoler does not
     * open the door on its own.
     */
    if (character.status === 'captured') continue;

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
      // Setting foot on the place is what reveals what lives off it, and a
      // boat's crew rowing an officer in counts as much as a squadron coming
      // to anchor. Fires before the errand is reconsidered below: they saw it
      // on the way in whether or not there is still work to do.
      const sighted = sightBeast(landed, character.faction as PlayableFaction);
      if (sighted) {
        pushEvent(state, { kind: 'mission', text: sighted, systemId: landed.id });
      }
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
      // A posting is not an errand: they arrive and they are in post. No
      // fortnight of work and no roll — taking command of your own island or
      // your own squadron is not a thing you can fail at. What it costs is the
      // officer, who is now tied up until relieved.
      if (mission.type === 'command') {
        takePost(state, character, landed, mission.targetFleetId);
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
              : mission.type === 'rescue'
                ? `${character.name} finds the cells at ${system.name} empty; the exchange came first.`
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
    // The boat's best hand at the thing, not the officer who signed for it.
    success = rng.chance(successChance(partyStrength(state, character), mission.type));
    if (mission.type === 'incite') {
      inciteOutcome(state, character, system, success);
    } else if (mission.type === 'sabotage') {
      sabotageOutcome(state, character, system, success);
    } else if (mission.type === 'rescue') {
      rescueOutcome(state, character, system, success);
    } else if (mission.type === 'survey') {
      surveyOutcome(state, character, system);
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
    // Never twice for the same officer: one report, one answer.
    if (!state.pendingDecisions.some((d) => d.characterId === character.id)) {
      state.pendingDecisions.push({ characterId: character.id, systemId: system.id, success });
    }
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
  // Nobody of yours left in the cells.
  if (type === 'rescue') return !isRescueTarget(state, system, faction);
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
 * asking questions in a harbor would learn: who your neighbours are before
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
  takePrisoner(state, mark, faction);
  const held = getSystem(state, mark.locationSystemId);
  pushEvent(state, {
    kind: 'loss',
    text: `${officer.name} has taken ${mark.name} off the quay at ${system.name}. They are held at ${held.name}.`,
    systemId: system.id,
    characterId: mark.id,
  });
}

/**
 * Breaking one of yours out.
 *
 * The captive goes home the way an exchange would send them — to their own
 * seat, fit for sea — rather than standing on the enemy quay beside the
 * officer who freed them, which would be two of yours in the lion's mouth.
 */
function rescueOutcome(
  state: GameState,
  officer: Character,
  system: System,
  success: boolean,
): void {
  const faction = officer.faction as PlayableFaction;
  const captive = captiveOn(state, system, faction)!;
  if (!success) {
    pushEvent(state, {
      kind: 'mission',
      text: `${officer.name} cannot reach ${captive.name} in the cells at ${system.name}. Not this fortnight.`,
      systemId: system.id,
      characterId: officer.id,
    });
    return;
  }
  captive.status = 'available';
  captive.injuredDays = undefined;
  captive.mission = undefined;
  captive.locationSystemId = state.factions[faction].hqSystemId;
  pushEvent(state, {
    kind: 'mission',
    text: `${officer.name} has ${captive.name} out of the cells at ${system.name} and away. They are home and fit for sea.`,
    systemId: system.id,
    characterId: captive.id,
  });
  restoreLord(state, captive);
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
/**
 * An officer takes up a post and stays in it.
 *
 * Either the deck of a squadron lying here — which is what signing on used to
 * be, except that it now costs a voyage rather than being a tap on an island
 * you happen to be standing on — or the island itself.
 *
 * Arriving is worth something on its own: an island that was out comes back in
 * hand, and the officer's leadership tells on its allegiance. After that the
 * post is the point, not the arrival.
 */
export function takePost(
  state: GameState,
  officer: Character,
  system: System,
  fleetId?: string,
): void {
  const faction = officer.faction as PlayableFaction;
  officer.mission = undefined;
  officer.status = 'available';
  officer.locationSystemId = system.id;
  relieve(state, officer.id);

  const fleet = fleetId ? state.fleets.find((f) => f.id === fleetId) : undefined;
  if (fleet && fleet.faction === faction && !fleet.voyage && fleet.systemId === system.id) {
    fleet.officerIds.push(officer.id);
    pushEvent(state, {
      kind: 'order',
      text: `${officer.name} has the ${fleet.name}.`,
      systemId: system.id,
      characterId: officer.id,
    });
    return;
  }

  // The island. Whoever was holding it before is relieved by the arrival.
  const before = system.commanderId;
  if (before && before !== officer.id) {
    const old = state.characters.find((c) => c.id === before);
    if (old) old.locationSystemId = system.id;
  }
  system.commanderId = officer.id;
  applySupportChange(state, system, faction, COMMAND_SUPPORT_GAIN + officer.leadership / 9);
  const wasOut = system.uprising;
  if (wasOut) {
    system.uprising = false;
    resolveControlAndUnrest(state);
    recomputeLedger(state);
  }
  pushEvent(state, {
    kind: 'order',
    text: wasOut
      ? `${officer.name} takes command of ${system.name} and puts it back in order.`
      : `${officer.name} takes command of ${system.name}.`,
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
  // Burning a mill does not burn the forest behind it.
  const back = WORKS_ON[target.type];
  if (back) returnDeposit(state, system, back);
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
  // One change, because allegiance is one balance: what you win is what they
  // lose, and saying it twice would carry the island twice as fast.
  const gain = parleyGain(character);
  applySupportChange(state, system, faction, gain);
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
 * rises on its own — which stops their works, their drilling and their harbor
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
  // Everything you take off the governor is yours, whether the island means
  // it that way or not: there is no third place for an angry island to go.
  const loss = inciteLoss(character);
  applySupportChange(state, system, holder, -loss);
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
