import {
  AI_MISSION_PATIENCE,
  AI_AGITATION_PATIENCE,
  AI_COURTING_PATIENCE,
  FOIL_INJURY_DAYS,
  INCITE_SUPPORT_LOSS,
  FACILITY_LABEL,
  RECRUIT_BASE,
  RECRUIT_CEILING,
  RECRUIT_LEADERSHIP_DIVISOR,
  RECRUIT_LOYALTY_WEIGHT,
  RECRUIT_MIN_SUPPORT,
  RECRUITER_ROLE,
  SABOTAGE_BASE,
  ABDUCT_BASE,
  ABDUCT_RESIST_DIVISOR,
  COMMAND_BASE,
  COMMAND_SUPPORT_GAIN,
  CRAFT_GRADES,
  RESEARCH_BASE,
  RESEARCH_MIN_SUPPORT,
  RESEARCH_PROGRESS,
  CAPTURE_CEILING,
  INCITE_BASE,
  INCITE_LOYALTY_WEIGHT,
  RESCUE_GARRISON_DIVISOR,
  CAPTURE_DIVISOR,
  COVERT_EXPOSURE,
  FOIL_CEILING,
  FOIL_FLOOR,
  OPEN_EXPOSURE,
  SABOTAGE_PRIORITY,
  MOMENTUM_PER_SUCCESS,
  SHOCK_CONVERSION,
  SHOCK_PRINCIPAL,
  SUPPORT_MAX,
  WATCH_FROM_COMMAND,
  WATCH_FROM_LOYALTY,
  watchOf,
  WATCH_PER_ESPIONAGE,
  SURVEY_PER_ISLAND,
  MISSION_PARTY_MAX,
  MISSION_WORK_DAYS,
  TRAVEL_MAX_DAYS,
  TRAVEL_WORLD_SPAN,
  RESCUE_BASE,
  PARLEY_SWING_MAX,
  ESPIONAGE_BASE,
  ESPIONAGE_DIVISOR,
  ESPIONAGE_SECOND_ISLAND,
  ASSUMED_WATCH,
  WORKS_ON,
  mayServe,
} from './constants';
import {
  inProse,
  applyLocalSupport,
  atSea,
  reachName,
  getCharacter,
  getSystem,
  isPlayable,
  handOver,
  otherFaction,
  pushEvent,
  returnDeposit,
} from './helpers';
import { garrisonRoster } from './troops';
import { sightBeast } from './creatures';
import { recomputeLedger } from './economy';
import { resolveControlAndUnrest } from './support';
import { isLord, passageShare, restoreLord } from './lords';
import { inciteStanding, joinChance, parleyStanding, pushMomentum, runCycle } from './politics';
import { applyShock, orderFor } from './propagate';
import factionData from '../data/factions.json';
import type { Rng } from './rng';
import type {
  Character,
  GameState,
  Intel,
  Mission,
  MissionType,
  PlayableFaction,
  System,
} from './types';

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
 * Then the distance is the whole of it: what fraction of the width of the
 * world lies between them, times the two hundred days a crossing of the whole
 * of it takes. Never less than one day, because a voyage that takes no time is
 * a teleport, and never more than two hundred, because that is the ceiling —
 * the generator can place two islands a little past `TRAVEL_WORLD_SPAN` apart
 * and the clamp is what makes the promise true rather than nearly true.
 */
export function travelDays(state: GameState, fromSystemId: string, toSystemId: string): number {
  if (fromSystemId === toSystemId) return 0;
  const from = getSystem(state, fromSystemId);
  const to = getSystem(state, toSystemId);
  const a = worldPlace(state, from);
  const b = worldPlace(state, to);
  const across = Math.hypot(a.x - b.x, a.y - b.y) / TRAVEL_WORLD_SPAN;
  return Math.min(TRAVEL_MAX_DAYS, Math.max(1, Math.round(across * TRAVEL_MAX_DAYS)));
}

/**
 * How long *this* officer's passage takes, which is not the same as how far it
 * is.
 *
 * Sean's dev report: *"Captain Silas Reyne's sail estimate shows the full
 * passage, identical to any other officer. His actual sail is halved at
 * execution... Right now his signature advantage is invisible at the point of
 * decision."* His evidence: the sheet quoted 25 days' sail, the log showed
 * thirteen.
 *
 * Both numbers were correct and they came from two places — `travelDays` in
 * the preview, `travelDays × passageShare` in `startMission` — which is the
 * only way a preview can lie about the thing it previews. One function now,
 * and the sheet calls the same one the order does.
 *
 * The Swallowtail's power is why it exists: Reyne is never off her, so
 * anywhere he *leads* a boat he is there in half the time. Rounded up, and
 * never less than a day — fast is not instant. Standing on the island already
 * is the one case that stays at nought, and it has to: a posting taken in the
 * room you are standing in is taken now, and clamping the halving to a minimum
 * of one without excepting it would send every officer on a day's voyage to
 * the quay they are already standing on.
 */
export function passageDays(
  state: GameState,
  leader: Character,
  toSystemId: string,
): number {
  const passage = travelDays(state, leader.locationSystemId, toSystemId);
  return passage === 0 ? 0 : Math.max(1, Math.ceil(passage * passageShare(leader)));
}

/** An island's place in the world: its Reach's centre, plus its own offset. */
function worldPlace(state: GameState, system: System): { x: number; y: number } {
  const sector = state.sectors.find((s) => s.id === system.sectorId);
  if (!sector) return { x: system.x, y: system.y };
  return { x: sector.x + system.x, y: sector.y + system.y };
}

/**
 * Eligible target: settled, quiet, not the enemy's, and with something left to
 * win (spec 4.5).
 *
 * Sean: *"Parley shouldn't be available if location is 100% your loyalty
 * already."* Every island's regard for the two sides adds up to a hundred, so
 * an island sitting at a hundred for you is one where the other side has
 * nobody at all — there is no argument left to have there, and the errand was
 * offering a fortnight ashore and an 86% chance of moving a bar that cannot
 * move. It becomes worth doing again the moment the island drifts back off the
 * ceiling, which it does on its own within a day or two.
 */
export function isDiplomacyTarget(system: System, faction: PlayableFaction): boolean {
  if (!system.populated) return false;
  if (system.uprising) return false;
  if (!system.explored[faction]) return false;
  if (system.support[faction] >= SUPPORT_MAX) return false;
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
export function recruitPool(state: GameState, faction?: PlayableFaction): Character[] {
  return state.characters.filter(
    (c) =>
      c.faction === 'neutral' &&
      hasArrived(state, c) &&
      // Sworn peoples. An Urskin will not sign Crown articles and a Bog-folk
      // will not sign Confederate ones, so each side's pool is smaller than
      // the roster and they are not the same pool. Omitting `faction` asks
      // the old question — who is unclaimed at all — which is what the
      // "nobody left to sign" notice wants.
      (faction === undefined || mayServe(c.people, faction)),
  );
}

/**
 * Whether this officer is the sort who can sign anybody on.
 *
 * Sean's memo: *"recruitment is restricted to specific major characters... the
 * Empire has fewer recruiters."* Ours are marked in the bible, and the draw
 * guarantees each side one: the Crown always has the Regent, the Confederacy
 * always has its three Lords, and Hale and Reyne are both Recruiters. So a
 * side can always grow, and a side whose recruiter is in irons cannot — which
 * is the right reason to go and get them out.
 */
export function canRecruit(officer: Character): boolean {
  return Boolean(officer.roles?.includes(RECRUITER_ROLE));
}

/**
 * Whether this island is somewhere signing on could be attempted today.
 *
 * Yours, settled, quiet, and loyal enough to be worth the trip — and somebody
 * left in the world to sign. Nothing about who is standing on the island: the
 * pool is the pool and this is the condition, which is the whole of the
 * change.
 */
export function canRecruitAt(
  state: GameState,
  system: System,
  faction: PlayableFaction,
): boolean {
  return (
    system.control === faction &&
    system.populated &&
    !system.uprising &&
    system.support[faction] >= RECRUIT_MIN_SUPPORT &&
    recruitPool(state, faction).length > 0
  );
}

/** Whether one of the unaligned is ashore yet. They are in the world from the
 *  start, seeded by the same draw as everything else, but not yet anybody's. */
export function hasArrived(state: GameState, person: Character): boolean {
  return state.day >= (person.appearsOnDay ?? 1);
}

/**
 * Unclaimed hands who have not turned up yet.
 *
 * The roster arrives across the whole war — two on the first morning and the
 * rest spread out to `RECRUIT_LAST_DAY` — so an empty pool is usually a gap
 * between arrivals rather than the end of the world's people. Measured over
 * six seeds: eight unaligned in all, arriving on roughly days 1, 1, 70, 135,
 * 205, 275, 350 and 425, which leaves a two-month hole after each one signs.
 */
export function recruitsToCome(state: GameState): Character[] {
  return state.characters.filter((c) => c.faction === 'neutral' && !hasArrived(state, c));
}

/**
 * Crew of yours already committed to this errand at this island.
 *
 * Sean's playtest: *"Two recruiters on one island: 'Silvaine Crow lands on
 * Freeport to find the berth already taken.' The UI should block or warn
 * before sending the second one."* The rule is not that the second one is
 * forbidden — an island can be parleyed by two boats and be the better for
 * it — but that signing on and a few others are one table, and a player
 * about to spend a month on a duplicate should be told before they spend it.
 */
export function alreadySentOn(
  state: GameState,
  system: System,
  faction: PlayableFaction,
  type: MissionType,
  except?: string,
): Character[] {
  return state.characters.filter(
    (c) =>
      c.faction === faction &&
      c.id !== except &&
      !c.escorting &&
      c.mission?.type === type &&
      c.mission.targetSystemId === system.id,
  );
}

export function isRecruitTarget(
  state: GameState,
  system: System,
  faction: PlayableFaction,
): boolean {
  return canRecruitAt(state, system, faction);
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
 * Somewhere worth counting the guns on.
 *
 * The other half of the pair, and for a long time the missing one. Explore
 * answers *is there an island here* and never asks again; this asks *what is
 * on it today*, and the answer goes stale the moment it is written. Sean's
 * memo draws the line: reconnaissance charts the place, espionage reports its
 * contents — "enemy characters, ground troops, facilities, fleets, ships in
 * orbit, enemy missions currently being conducted".
 *
 * Offered on any island already charted, theirs or neutral or your own. Your
 * own is not a mistake and is the memo's best trick: *"you can conduct
 * espionage on your own planets... it can reveal enemy covert activity."* An
 * island of yours with a Confederate officer quietly at work on it looks
 * exactly like an island of yours, until somebody goes and looks.
 */
export function isEspionageTarget(system: System, faction: PlayableFaction): boolean {
  // Somewhere with something to count. A bare rock nobody holds and nobody
  // lives on has no companies, no works and no harbor talk, so a fortnight
  // spent on it would produce a report saying what the chart already says.
  return (
    system.explored[faction] &&
    (system.populated || system.control === 'empire' || system.control === 'alliance')
  );
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
      // Officers at sea are not caught, because they are at sea — whether
      // that is an errand still on passage or a squadron that has sailed.
      !atSea(state, c),
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
export function isResearchTarget(
  state: GameState,
  system: System,
  faction: PlayableFaction,
): boolean {
  /*
   * Nothing left for the shipwrights to learn.
   *
   * There are three grades and `craftGrade` stops counting at the third, so
   * past it every further fortnight in the yards buys a number that no rule
   * reads. This had no such guard, and research is deliberately exempt from
   * the patience rule that ends every other errand — so an officer sent to the
   * yards of a side that had finished its craft stayed there for the rest of
   * the war, working on nothing. Measured over ten wars: yard errands running
   * a median of 64 days and a maximum of 1,390, which is the whole war, and
   * the Pirate Lords spending more of their time in a shipyard than on any
   * other errand there is.
   */
  if (system.support[faction] < RESEARCH_MIN_SUPPORT) return false;
  return researchStillPossible(state, system, faction);
}

/**
 * Whether the shipwrights can still be working — as against whether the errand
 * was worth choosing in the first place.
 *
 * These were one function until Sean's Day 150 playtest, and that is the whole
 * bug: *"'In the yards' errand fails with a parley message... Craft stayed 0
 * all game (Crown hit 34)."*
 *
 * Reproduced exactly. The Lord Regent put in at Highwater on day 2 with the
 * island at 99.5 and worked its yards for a hundred and four days; on day 106
 * Highwater drifted to 72.9, a fraction under the seventy-five floor, and the
 * entire errand was thrown out. Across three wars the Confederacy's craft
 * finished on 0.0 every time.
 *
 * The floor is a rule about *choosing*: below it the island still has an
 * argument to be won and a parley is the better use of an officer. It was
 * never a rule about the work becoming impossible — a shipwright does not put
 * down their tools because the harbour has gone two points cooler — and
 * re-checking it every cycle made a long errand fragile in proportion to how
 * long it was, which is exactly backwards.
 *
 * So what can genuinely stop the work stays: the island changing hands, rising,
 * losing its yards, or the craft topping out. The allegiance floor does not.
 */
export function researchStillPossible(
  state: GameState,
  system: System,
  faction: PlayableFaction,
): boolean {
  /*
   * Nothing left for the shipwrights to learn: three grades, and `craftGrade`
   * stops counting at the third.
   */
  if (craftGrade(state.factions[faction].craft) >= CRAFT_GRADES.length) return false;
  if (!system.explored[faction] || system.control !== faction || system.uprising) return false;
  // A slipway, and only a slipway. It used to accept a construction yard too,
  // which was the wider net while the yard was the thing every island had;
  // shipwright craft was always the shipyard's business.
  return system.facilities.some((f) => f.owner === faction && f.type === 'shipyard');
}

/**
 * What landing here would mean. The island decides, not a menu: you cannot
 * parley with an enemy island and there is nothing to incite on your own.
 *
 * Signing on is deliberately *not* in this list, and was until 17 September.
 * It used to come first, which was right when it meant a particular stranger
 * was standing on this particular quay and could be gone next month. It is not
 * a person any more, it is a standing condition of every loyal harbor you
 * hold — so defaulting to it would make "recruit" the answer to every good
 * island you own, silently pre-empting the yards and the chair. It is offered
 * everywhere it is legal and chosen on purpose, like a posting and like a
 * report.
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
  // Espionage is deliberately not in this list at all, though it is offered
  // on nearly every island. Same reasoning as a posting and then some: a
  // report is a thing you decide you need, and defaulting to it would send
  // officers off to count the guns on their own capital every time an island
  // of theirs ran out of work. The opponent is sent spying by a rule of its
  // own in `ai.ts`, which can weigh whether it actually wants to know.
  // Above parley, and only where parley had nothing left to win.
  if (isResearchTarget(state, system, faction)) return 'research';
  if (isDiplomacyTarget(system, faction)) return 'diplomacy';
  if (isInciteTarget(system, faction)) return 'incite';
  if (isSabotageTarget(system, faction)) return 'sabotage';
  // Last, and it never competes: everything above requires the island to be
  // charted, and this is the only thing you can do with one that is not.
  if (isSurveyTarget(system, faction)) return 'survey';
  return null;
}

/**
 * Is there anything at all to do here.
 *
 * This used to ask `missionTypeFor` — what the island's *default* errand would
 * be — which is a different question, and the difference only showed once a
 * wholly loyal island stopped offering a parley. Command is offered on any
 * island of yours and is deliberately never the default (a posting spends an
 * officer for good and should be asked for), so an island with nothing else
 * left answered null, and this said "nothing to be done there" about ground
 * you hold with a chair standing empty in it. You could not post a commander
 * to your own capital.
 *
 * The list is the answer. Anything offered means there is something to do.
 */
export function isMissionTarget(
  state: GameState,
  system: System,
  faction: PlayableFaction,
): boolean {
  return missionsOffered(state, system, faction).length > 0;
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
  // Only a Recruiter is offered it, the way only a commander is offered a
  // posting. Sean's memo: *"recruitment is restricted to specific major
  // characters."* Asked of the island alone, it stays on the list — the chart's
  // rings are about what the island is for, not who happens to be free.
  if (isRecruitTarget(state, system, faction) && (!officer || canRecruit(officer))) {
    out.push('recruit');
  }
  if (isRescueTarget(state, system, faction)) out.push('rescue');
  if (isAbductTarget(state, system, faction)) out.push('abduct');
  if (isCommandTarget(system, faction) && (!officer || canCommand(officer))) out.push('command');
  if (isResearchTarget(state, system, faction)) out.push('research');
  if (isDiplomacyTarget(system, faction)) out.push('diplomacy');
  if (isInciteTarget(system, faction)) out.push('incite');
  if (isSabotageTarget(system, faction)) out.push('sabotage');
  if (isEspionageTarget(system, faction)) out.push('espionage');
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
  if (type === 'espionage') return isEspionageTarget(system, faction);
  if (type === 'abduct') return isAbductTarget(state, system, faction);
  if (type === 'rescue') return isRescueTarget(state, system, faction);
  if (type === 'command') return isCommandTarget(system, faction);
  // The yards keep working through a dip in allegiance; see the note there.
  if (type === 'research') return researchStillPossible(state, system, faction);
  return isDiplomacyTarget(system, faction);
}

/** The parts of an island's watch, named, so the sheet can show its working. */
export interface Watch {
  /** Companies ashore, at what each of them sees. */
  garrison: number;
  /** Their officers standing about on it with nothing else to do. */
  idle: number;
  /** Whoever holds the chair, on their Leadership. */
  commander: number;
  /** The island's own people, by how much they are with whoever holds it. */
  people: number;
  total: number;
}

/**
 * Everything on this island that might notice somebody working against it.
 *
 * `against` is the side doing the working, so the watch is everybody *else's*
 * — the holder's companies, the holder's officers standing idle on it, the
 * holder's commander in the chair, and the holder's standing with the people
 * who live there.
 *
 * An island nobody holds still has a garrison and still has people, and they
 * still notice: the unaligned are not on your side either.
 */
export function watchOn(state: GameState, system: System, against: PlayableFaction): Watch {
  const holder = system.control;
  const theirs = holder !== against && (holder === 'empire' || holder === 'alliance');

  const garrison = garrisonRoster(system).reduce((n, company) => n + company.watch, 0);

  // Only the ones standing about. Somebody away on an errand of their own is
  // not watching the quay, which is Sean's rule and is also the interesting
  // half of it: an island whose officers are all out working is an island
  // with its guard down.
  const idle = state.characters
    .filter(
      (c) =>
        c.faction !== against &&
        c.faction !== 'neutral' &&
        c.locationSystemId === system.id &&
        c.status === 'available' &&
        c.id !== system.commanderId &&
        // Not somebody three days out aboard a squadron that left from here.
        !atSea(state, c),
    )
    .reduce((n, c) => n + watchOf(c), 0);

  const held = commanderOf(state, system);
  const commander =
    held && held.faction !== against && held.status !== 'injured' && held.status !== 'captured'
      ? Math.round(held.leadership * WATCH_FROM_COMMAND)
      : 0;

  // The people. Only where somebody holds the island and somebody lives on it
  // — an empty rock has nobody to mention you to anybody.
  const people =
    theirs && system.populated
      ? Math.round((system.support[holder] / SUPPORT_MAX) * WATCH_FROM_LOYALTY)
      : 0;

  return { garrison, idle, commander, people, total: garrison + idle + commander + people };
}

/** The errands that are done out of sight, and are therefore worth hiding. */
export const COVERT: MissionType[] = ['incite', 'sabotage', 'abduct', 'rescue', 'survey', 'espionage'];

export function isCovert(type: MissionType): boolean {
  return COVERT.includes(type);
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
  type: MissionType = 'diplomacy',
): number {
  // Nobody is hunting you on your own island. Still true, and still the
  // reason yard work and a posting are safe errands.
  if (system.control === faction) return 0;

  const seen = watchOn(state, system, faction).total;
  // What the errand has to hide. Creeping about somebody's powder store is
  // not the same as talking to people in daylight, and the island's watch is
  // one number either way — what changes is how much of it is pointed at you.
  const exposure = isCovert(type) ? COVERT_EXPOSURE : OPEN_EXPOSURE;
  // And what the party can shrug off, on its best Espionage. This is the
  // memo's first stage entire: Espionage is what gets you through the door,
  // whatever the errand turns out to need once you are inside.
  const craft = (agent ? agent.espionage : 0) * WATCH_PER_ESPIONAGE;
  const risk = (seen * exposure - craft) / 100;
  return Math.max(FOIL_FLOOR, Math.min(FOIL_CEILING, risk));
}

/**
 * What the island can do to somebody it has caught.
 *
 * The memo's third layer: detection and consequence are different questions,
 * and the second one is settled by what is standing there rather than by who
 * was watching. Companies fight, a commander leads them, and the officer has
 * their own Combat to get back to the boat with.
 *
 * Only on covert work, and only on ground somebody else holds. Being noticed
 * at a parley is an awkward afternoon; being caught in a powder store is how
 * people end up in irons, which is the price Sean attached to incitement:
 * *"it exposes your crew to being detected and potentially captured."*
 */
export function captureChance(
  state: GameState,
  system: System,
  faction: PlayableFaction,
  agent?: Character,
): number {
  /**
   * Only on ground the enemy actually holds.
   *
   * An island that has not chosen a side has no gaol of yours to put anybody
   * in and no reason to hand a stranger to the Crown — being caught there is
   * being run off the quay. The first cut of this asked only "is it not
   * mine", which made every unaligned island in the world a Crown prison the
   * moment a Confederate officer was noticed on it: measured over ten wars,
   * forty-eight Confederate officers taken against thirty-four of the
   * Crown's, and *not one* Confederate officer merely hurt and away, because
   * their whole trade is worked on neutral ground.
   */
  const holder = system.control;
  if (holder !== otherFaction(faction)) return 0;
  const muscle =
    garrisonRoster(system).reduce((n, company) => n + company.offense, 0) +
    (() => {
      const held = commanderOf(state, system);
      return held && held.faction !== faction && held.status === 'available' ? held.combat : 0;
    })();
  const fight = agent ? agent.combat : 0;
  return Math.max(0, Math.min(CAPTURE_CEILING, (muscle - fight) / CAPTURE_DIVISOR));
}

/**
 * Officers who could go along on an errand leaving from where this one stands.
 *
 * Same side, free, and at the same island. There is no third place in this
 * game: you are on a fleet or you are on an island, and a fleet lying at an
 * island is at that island — so both count and the test is one comparison. A
 * Lord may not go along: their absence pins their own ship, and that cost
 * should be theirs to choose rather than somebody else's to pay.
 *
 * A fleet *under way* is the exception the comparison misses, and Sean's
 * playtest found it: *"After Fleet 2 sailed from Vagrano, Isolde Marrow still
 * showed as available at Vagrano and was offered as a party member there."*
 * She was aboard and three days out. Nobody at sea is at any island, and
 * nobody can be put in a boat from an island they are not standing on.
 */
export function companionsFor(state: GameState, leader: Character): Character[] {
  const here = leader.locationSystemId;
  if (atSea(state, leader)) return [];
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
      c.locationSystemId === here &&
      !atSea(state, c),
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
 * Why they sailed, in the log's words, one line per errand.
 *
 * Was a nine-deep nested ternary until espionage would have made it ten. A
 * table reads the same and does not have to be re-indented every time the game
 * learns to do something new.
 */
const ERRAND_PURPOSE: Record<
  MissionType,
  (state: GameState, target: System, faction: PlayableFaction) => string
> = {
  incite: () => 'to stir up trouble',
  sabotage: () => 'to see what can be broken',
  survey: () => 'to put it on the chart',
  espionage: () => 'to see what is on it',
  abduct: (state, target, faction) =>
    `to take ${abductOn(state, target, faction)!.name} off the quay`,
  command: () => 'to take command there',
  research: () => 'to put its yards to work on the craft',
  recruit: () => 'to keep an open table and see who sits down',
  rescue: (state, target, faction) =>
    `to break ${captiveOn(state, target, faction)!.name} out`,
  diplomacy: () => 'to parley',
};

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
  const days = passageDays(state, character, targetSystemId);
  // No type and no default is not an errand. `missionError` above lets an
  // island through when *anything* is offered, and Command is offered on your
  // own ground without ever being the default — so "let the island decide" has
  // a case with nothing to decide, and it used to make a mission with no type
  // in it rather than saying so.
  const fallen = missionTypeFor(state, target, character.faction as PlayableFaction);
  const type = chosen ?? fallen;
  if (!type) throw new Error('Nothing to be done there.');

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
  const errand = ERRAND_PURPOSE[type](state, target, character.faction as PlayableFaction);
  pushEvent(state, {
    kind: 'mission',
    text: `${character.name} sails for ${inProse(target.name)} ${errand}.`,
    systemId: targetSystemId,
    characterId,
  });
}

/**
 * What a cycle ashore came to, in that errand's own words.
 *
 * Sean's Day 150 playtest: *"Mission report dialogs use parley wording for
 * every errand type. Recruiting, sabotage and exploring all report 'The talks
 * on X went well / went nowhere.' Reyne burned Wrightsport's shipyard and the
 * report said 'talks went well.'"*
 *
 * He is quoting the code accurately. The report sheet had one ternary with a
 * special case for incitement and the parley line for everything else, so
 * eight of the ten errands reported as a negotiation — including the ones
 * where the officer had just set fire to something.
 *
 * Here rather than in the sheet so the log and the dialog cannot drift, which
 * is the fault that produced the single ternary in the first place.
 */
export function missionReport(type: MissionType, success: boolean, place: string): string {
  const lines: Record<MissionType, [string, string]> = {
    diplomacy: [
      `The talks on ${place} went well. Opinion has shifted your way.`,
      `The talks on ${place} went nowhere this time.`,
    ],
    incite: [
      `Word is spreading on ${place}. The governor's hold is slipping.`,
      `${place} will not be moved this time; the governor still has them.`,
    ],
    recruit: [
      `The table on ${place} was worth keeping: somebody worth having has signed.`,
      `A fortnight of open table on ${place} and nobody worth the ink sat down.`,
    ],
    sabotage: [
      `It burned. ${place} is short of what it had this morning.`,
      `Nothing took on ${place} — too many eyes, and the job was left alone.`,
    ],
    survey: [
      `${place} is on your charts now, and something of what lies round it.`,
      `Fog, foul ground and no landing: ${place} keeps its secrets a while longer.`,
    ],
    espionage: [
      `The count from ${place} is in: what stands there, and what is under way.`,
      `No way in on ${place}. Whatever is there is still theirs to know.`,
    ],
    abduct: [
      `Taken off the quay at ${place} quietly, and away before the alarm.`,
      `The lift on ${place} failed; their man is still standing there.`,
    ],
    rescue: [
      `Out of the cells at ${place} and away — one of yours is coming home.`,
      `The cells at ${place} held. Whoever is in them is in them still.`,
    ],
    command: [
      `${place} answers again. Order restored, and somebody in the chair.`,
      `${place} is still in uproar; the chair is not worth sitting in yet.`,
    ],
    research: [
      `The shipwrights on ${place} have something to show for the fortnight.`,
      `A fortnight in the yards on ${place} and nothing came of it.`,
    ],
  };
  const pair = lines[type];
  return pair ? pair[success ? 0 : 1] : `${place}: the work is done for now.`;
}

/**
 * What to call an errand, in one place.
 *
 * Three screens were spelling these out in their own nested ternaries and the
 * third one had already fallen behind: a mission type the list did not know
 * about came out as "parley", which is a lie rather than a gap.
 */
export const MISSION_LABEL: Record<MissionType, string> = {
  // Sean, 19 September, renaming the four on the errand sheet: *"Recruit."*
  // It was "Signing on", which is the in-world phrase for the thing and reads
  // well in a sentence — but this is a label on a button beside Espionage and
  // Command, and a label wants the word for the job.
  recruit: 'Recruit',
  diplomacy: 'Parley',
  incite: 'Stirring up trouble',
  sabotage: 'Sabotage',
  // Sean, 17 September: *"our game will call Reconnaissance = explore."* The
  // type stays `survey` — it is in saved games — and what a player reads is
  // Explore, here and in `terms.json`, which is the one place the rest of the
  // interface takes its word from.
  survey: 'Explore',
  espionage: 'Espionage',
  abduct: 'Abduction',
  command: 'In command',
  research: 'In the yards',
  rescue: 'Rescue',
};

/** Chance the mission lands its argument (spec 4.5). */
export function successChance(character: Character, type: MissionType = 'diplomacy'): number {
  // A survey is the one thing that always tells you something: an officer who
  // has spent a fortnight ashore has seen the island whether or not they found
  // what they went for. The roll decides how much of the chain comes with it.
  if (type === 'survey') return 1;
  /**
   * Each errand on the rating that should settle it — Sean's cheat sheet, and
   * for three of them this is a change.
   *
   * Sabotage was Espionage alone; it is Espionage *and* Combat now, weighted
   * evenly, because getting in and wrecking the place are two different jobs
   * and a 90/20 is a fine spy and a poor saboteur. Rescue was Espionage; it is
   * Combat, set against the garrison holding the cells (see `missionOdds`).
   * Incitement was Diplomacy discounted; it is Leadership against the island's
   * loyalty, which is what makes softening an island a thing you *do* rather
   * than a thing that happens.
   *
   * Espionage has not lost anything by this. It is the whole of the first
   * stage now, on every covert errand there is, which is a great deal more
   * than being the only rating three of them read.
   */
  if (type === 'sabotage') {
    return SABOTAGE_BASE + (character.espionage + character.combat) / 2 / 260;
  }
  if (type === 'rescue') return RESCUE_BASE + character.combat / 250;
  // Restoring order is what Leadership is for. It only ever rated how well a
  // company fought until now, which left the best commanders in the game with
  // nothing to do but stand on a deck.
  if (type === 'command') return COMMAND_BASE + character.leadership / 240;
  if (type === 'research') return RESEARCH_BASE + character.espionage / 300;
  // The one errand Espionage settles at both stages, which is the memo's whole
  // answer to "what stat determines espionage success": Espionage, and
  // Espionage again. Getting in is the hard half; once in, a good spy counts
  // what is there.
  if (type === 'espionage') return ESPIONAGE_BASE + character.espionage / ESPIONAGE_DIVISOR;
  // Abduction is set against the person, not the place, and is handled where
  // the target is known. This is the floor.
  if (type === 'abduct') return ABDUCT_BASE + character.combat / 300;
  if (type === 'incite') return INCITE_BASE + character.leadership / 200;
  return 0.4 + character.diplomacy / 200;
}

/**
 * The same question with the island in it.
 *
 * Two errands are set against what is standing on the ground rather than
 * against a flat number: breaking somebody out is set against the garrison
 * holding them, and stirring up an island is set against how much that island
 * likes whoever holds it. Everything else is the officer alone, and falls
 * through to `successChance`.
 *
 * Kept apart from the first stage on purpose. The watch decides whether
 * anybody sees you; this decides whether the work comes off once nobody has.
 */
export function missionOdds(
  state: GameState,
  party: Character,
  system: System,
  faction: PlayableFaction,
  type: MissionType,
): number {
  if (type === 'rescue') {
    const bars = garrisonRoster(system).reduce((n, company) => n + company.defense, 0);
    return Math.max(0.05, successChance(party, 'rescue') - bars / RESCUE_GARRISON_DIVISOR);
  }
  if (type === 'incite') {
    // Their grip on the place, which is the whole of what you are arguing
    // against. An island at a hundred for them has nobody left to talk to; one
    // at fifty-five is halfway to yours already.
    const holder = system.control;
    const theirs =
      holder === 'empire' || holder === 'alliance' ? system.support[holder] : SUPPORT_MAX / 2;
    return Math.max(
      0.05,
      successChance(party, 'incite') - (theirs / SUPPORT_MAX) * INCITE_LOYALTY_WEIGHT,
    );
  }
  void state;
  void faction;
  return successChance(party, type);
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
export function recruitChance(
  officer: Character,
  system: System,
  faction: PlayableFaction,
): number {
  if (!canRecruit(officer)) return 0;
  const loyalty = Math.max(0, system.support[faction] - RECRUIT_MIN_SUPPORT);
  const span = Math.max(1, SUPPORT_MAX - RECRUIT_MIN_SUPPORT);
  return Math.min(
    RECRUIT_CEILING,
    RECRUIT_BASE +
      officer.leadership / RECRUIT_LEADERSHIP_DIVISOR +
      (loyalty / span) * RECRUIT_LOYALTY_WEIGHT,
  );
}

/**
 * Who walks in, once somebody has agreed to come.
 *
 * Success is binary — Sean's memo is explicit that it is, and that a failure
 * costs nothing but the fortnight — so this is not a second test. It is which
 * of the pool turns up, and it is the one place the recruiter and the harbor
 * are paid a second time: a strong officer in a devoted port draws from three
 * names and keeps the best of them, an indifferent one in a lukewarm harbor
 * gets whoever answered the notice. Somebody worth having is still rarer than
 * somebody ordinary, which is what `quality` was always for.
 */
function whoSignsOn(
  pool: Character[],
  officer: Character,
  system: System,
  faction: PlayableFaction,
  rng: Rng,
): Character {
  const pull = Math.max(0, Math.min(1, (officer.leadership + system.support[faction]) / 200));
  const draws = 1 + Math.floor(pull * 2);
  let best = rng.pick(pool);
  for (let i = 1; i < draws; i++) {
    const other = rng.pick(pool);
    if (quality(other) > quality(best)) best = other;
  }
  return best;
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
          text: `${character.name} lands on ${inProse(landed.name)} to find the work already done, and stands by.`,
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
      text: `${character.name} has made landfall at ${inProse(landed.name)}.`,
        systemId: mission.targetSystemId,
        characterId: character.id,
      });
      continue;
    }

    resolveMission(state, character, rng);
  }
}

/**
 * Found out, and what it costs.
 *
 * Two things, in the memo's order: the watch notices, and then the people who
 * noticed try to lay hands on you. On open work — a parley, a posting — the
 * worst of it is an awkward afternoon and a fortnight lost. On covert work on
 * somebody else's island it can be irons, which is the price Sean attached to
 * incitement and the rest: *"it exposes your crew to being detected and
 * potentially captured."*
 *
 * The party takes it, not only its leader, because the party is what walked
 * into the harbor. Companions are turned loose with the errand; whoever was
 * leading it carries the consequence.
 */
function caughtAshore(
  state: GameState,
  character: Character,
  system: System,
  faction: PlayableFaction,
  party: Character,
  rng: Rng,
): void {
  const covert = isCovert(character.mission!.type);
  const taken =
    covert && rng.chance(captureChance(state, system, faction, party));
  character.mission = undefined;
  if (taken) {
    const captor = otherFaction(faction);
    takePrisoner(state, character, captor);
    pushEvent(state, {
      kind: 'loss',
      // A card, not a log line: losing a crew member is a setback on the scale
      // of an island changing hands, and it used to pass in silence.
      notable: true,
      text: `${character.name} was taken on ${inProse(system.name)} with the work half done, and is held at ${
        getSystem(state, character.locationSystemId).name
      }.`,
      systemId: system.id,
      characterId: character.id,
    });
    return;
  }
  character.status = 'injured';
  character.injuredDays = FOIL_INJURY_DAYS;
  pushEvent(state, {
    kind: 'loss',
    text: covert
      ? `${character.name} was found out on ${inProse(system.name)} and hurt getting back to the boat.`
      : `${character.name} is turned off ${inProse(system.name)}; the talks are over before they began.`,
    systemId: system.id,
    characterId: character.id,
  });
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
          ? `${character.name} finds nothing left to stir on ${inProse(system.name)} and goes quiet.`
          : mission.type === 'recruit'
            ? recruitPool(state, faction).length === 0
              ? `${character.name} keeps a table on ${inProse(system.name)} and nobody unclaimed is left ashore to sit at it.`
              : `${character.name} lands on ${inProse(system.name)} to find it will not hold a table for them any more.`
            : mission.type === 'abduct'
              ? `${character.name} finds the quay at ${inProse(system.name)} empty; their mark has sailed.`
              : mission.type === 'rescue'
                ? `${character.name} finds the cells at ${inProse(system.name)} empty; the exchange came first.`
              : mission.type === 'command'
                ? `${character.name} lands on ${inProse(system.name)} to find order already restored.`
              : mission.type === 'research'
                // Not "the island is beyond reach", which is what this said
                // until Sean's playtest found it: a yards errand that stops
                // being possible has lost its yards or its island, and saying
                // so as a failed negotiation was nonsense twice over.
                ? `${character.name} finds no yard left working on ${inProse(system.name)}.`
                : mission.type === 'sabotage' || mission.type === 'espionage'
                  ? `${character.name} finds nothing worth the risk on ${inProse(system.name)}.`
                  : mission.type === 'survey'
                    ? `${character.name} finds ${inProse(system.name)} already charted.`
                : system.support[faction] >= SUPPORT_MAX
                  // Not a failure: they arrived to find the argument already
                  // won. "Beyond reach" is for an island that went the other
                  // way, and reading it over a hundred-per-cent island of your
                  // own would be nonsense.
                  ? `${character.name} finds ${inProse(system.name)} wholly yours already, and nothing left to argue.`
                  : `${character.name} abandons the talks on ${inProse(system.name)}; the island is beyond reach.`,
      systemId: system.id,
      characterId: character.id,
    });
    return;
  }

  /**
   * The door, and then the job.
   *
   * Sean's memo on how Rebellion does this: *"a covert mission generally has
   * two separate problems. Can the team get through the target's security
   * without being detected? If it gets through, can the team actually
   * accomplish the mission?"* — and the order matters, because a party that
   * is caught on the way in never gets to attempt the work at all. This used
   * to run the other way round: the errand resolved in full and *then* the
   * foil roll happened, so an officer could burn a shipyard down and be found
   * out doing it, which is two outcomes for one fortnight.
   *
   * Espionage is the whole of this stage whatever the errand is. What the
   * errand needs once inside is settled below, and is a different rating.
   */
  const party = partyStrength(state, character);
  if (rng.chance(foilChance(state, system, faction, party, mission.type))) {
    caughtAshore(state, character, system, faction, party, rng);
    return;
  }

  let success: boolean;
  if (mission.type === 'abduct') {
    // Read again now, not remembered from the order: they may have sailed and
    // somebody else of theirs may have arrived, and either way it is whoever
    // is standing there today who gets carried off.
    const mark = abductOn(state, system, faction)!;
    success = rng.chance(abductChance(character, mark));
    abductOutcome(state, character, mark, system, success, rng);
  } else if (mission.type === 'recruit') {
    // The pool is read again now, not remembered from the order: the other
    // side may have signed the last of them on while this officer was at sea.
    const pool = recruitPool(state, faction);
    success = pool.length > 0 && rng.chance(recruitChance(character, system, faction));
    recruitOutcome(
      state,
      character,
      success ? whoSignsOn(pool, character, system, faction, rng) : undefined,
      system,
      success,
    );
  } else {
    // The boat's best hand at the thing, not the officer who signed for it.
    // The two political errands settle themselves: their odds and the size of
    // what they win are one model in `politics.ts`, and a single shared
    // pass/fail roll cannot carry both.
    if (mission.type === 'incite') {
      inciteOutcome(state, character, system, partyOf(state, character), rng);
      success = true;
    } else if (mission.type === 'diplomacy') {
      parleyOutcome(state, character, system, partyOf(state, character), rng);
      success = true;
    } else {
    success = rng.chance(missionOdds(state, party, system, faction, mission.type));
    if (mission.type === 'sabotage') {
      sabotageOutcome(state, character, system, success);
    } else if (mission.type === 'rescue') {
      rescueOutcome(state, character, system, success, rng);
    } else if (mission.type === 'survey') {
      surveyOutcome(state, character, system);
    } else if (mission.type === 'espionage') {
      espionageOutcome(state, character, system, success);
    } else if (mission.type === 'research') {
      researchOutcome(state, character, system, success);
    }
    }
  }

  /**
   * Ask the player what to do next; the AI answers its own straight away —
   * it works an island until it has what it came for, then frees the
   * character up.
   *
   * Unless nobody is asking. In observe mode the player's side is played by
   * the machine, and this line did not know it: every Crown officer who
   * finished a spell ashore was handed to a player who was not there, and
   * stood on that quay for the rest of the war. An officer standing on
   * foreign ground can be lifted off it by anyone who turns up, so the
   * Confederacy simply farmed them — measured over eight wars, forty Crown
   * officers carried off against four of theirs, a corps ninety per cent in
   * irons, and not one war won in twenty-four. It read as a balance problem
   * for a day. It was this line.
   */
  /**
   * A parley never asks. Sean: *"parley mission should keep going
   * automatically until loyalty is 100% yours or you're interrupted —
   * blockade, abduction attempt, garrisons find you."*
   *
   * It is the one errand with an end state you can see coming and no decision
   * in the middle of it: talks go on until the island is wholly yours or
   * something stops them. Asking every fortnight was a prompt whose answer was
   * always the same, and measured, it was the single most consequential thing
   * a player could get wrong — answering "come home" every time took twelve
   * piloted wars from Crown 4 — Confederacy 5 to Crown 1 — Confederacy 8.
   *
   * The interruptions are all real events and all handled elsewhere: the watch
   * finding them ends the errand in `caughtAshore`, an attempt on the officer
   * ends it by taking or hurting them, and a blockade or the island changing
   * hands ends it through `stillWorthDoing` at the top of this function.
   */
  const machinePlayed = faction !== state.player || Boolean(state.observing);
  if (mission.type === 'diplomacy') {
    // The opponent still gives up on talks that are going nowhere — its
    // patience is what stopped its officers standing on foreign quays for a
    // year being farmed, and that measured as forty carried off against four.
    // A player sets a parley and forgets it; the machine has other calls on
    // the same officer and no way to notice it is wasting one.
    if (done(state, system, faction, mission.type) || (machinePlayed && outOfPatience(system, mission))) {
      endMission(state, character.id);
    } else {
      continueMission(state, character.id);
    }
  } else if (!machinePlayed) {
    // Never twice for the same officer: one report, one answer.
    if (!state.pendingDecisions.some((d) => d.characterId === character.id)) {
      state.pendingDecisions.push({ characterId: character.id, systemId: system.id, success });
    }
  } else if (done(state, system, faction, mission.type) || outOfPatience(system, mission)) {
    endMission(state, character.id);
  } else {
    continueMission(state, character.id);
  }
}

/**
 * When the opponent gives up on an errand that is going nowhere.
 *
 * Talking only counts as finished when the island comes over, and yard work
 * never finishes at all, so an opponent's officer used to land somewhere and
 * stay there for the rest of the war. That is not patience, it is a hole: an
 * officer standing on ground that is not theirs can be lifted off the quay by
 * anybody who turns up, and standing there for six hundred days means being
 * lifted. Measured over eight wars with both sides played, forty Crown
 * officers were carried off against four of the Brethren's, the Crown's
 * corps ended ninety per cent in irons, and it lost every war — not to a
 * fleet, to a farm.
 *
 * So an errand has a patience, and only the opponent's does: the player is
 * asked after every spell ashore and can sit somewhere for a year if they
 * judge it worth it. Yard work is exempt because it is done on your own
 * island, where nobody is hunting you and the work genuinely never runs out.
 */
function outOfPatience(system: System, mission: Mission): boolean {
  if (mission.type === 'research' || mission.type === 'command') return false;
  /*
   * A parley on unaligned ground is the exception, and it was costing whole
   * islands.
   *
   * Courting an island nobody holds is a long argument. Each spell ashore
   * moves it a few points and then asks it, at a chance that climbs with how
   * warm it has become, whether it will come over — so a cold island is
   * several visits from joining however good the diplomat is, and walking away
   * at four throws away the two months that bought the warmth. Measured over
   * four hundred days of machine play under the old patience: the two sides
   * between them converted *seven* neutral islands, because the opponent kept
   * leaving one cycle short of the ground it had already paid for.
   *
   * So while the island is still worth courting, the talks go on. Not for
   * ever: the moment it stops being a flip target — it joined, somebody took
   * it, or it turned on them — the ordinary rules above end the errand.
   */
  if (mission.type === 'diplomacy' && system.control === 'neutral') {
    return (mission.cycles ?? 1) >= AI_COURTING_PATIENCE;
  }
  /*
   * And stirring an island toward a rising is the same shape of campaign, for
   * the same reason.
   *
   * Driving a harbor from where drift settles it down to where its people
   * start thinking about rising is twenty points, which is three or four
   * landed fortnights against a drift that is always pulling back — so at a
   * patience of four the opponent walked away from every one of them a cycle
   * or two short. Measured over six wars of six hundred days with both sides
   * played: **not one island rose**, in either direction, ever. The whole
   * mutiny half of the political model — and the end of Sean's own chain,
   * *"espionage to discover defenses, sabotage to weaken them, incite uprising
   * to destabilise, then diplomacy"* — was unreachable for want of a number.
   *
   * So while the island is still going the right way, the work goes on. The
   * ordinary rules above end it the moment it stops being an incitement
   * target — it rose, somebody took it, or it turned back.
   */
  if (mission.type === 'incite') {
    return (mission.cycles ?? 1) >= AI_AGITATION_PATIENCE;
  }
  return (mission.cycles ?? 1) >= AI_MISSION_PATIENCE;
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
  // Talks are finished when there is nobody left to talk round, which is the
  // island wholly yours — not merely flying your colours. Sean's rule, and it
  // is what makes a parley an errand you set and forget: *"keep going
  // automatically until loyalty is 100% yours."* The island coming over on
  // the way is a milestone, not the end.
  return system.support[faction] >= SUPPORT_MAX;
}

/**
 * Signing someone on. Unlike the other two this either happens or it does not:
 * there is no support bar to nudge, and once they have put their name to it
 * they are yours for the rest of the war.
 */
function recruitOutcome(
  state: GameState,
  officer: Character,
  recruit: Character | undefined,
  system: System,
  success: boolean,
): void {
  const faction = officer.faction as PlayableFaction;
  if (!success || !recruit) {
    pushEvent(state, {
      kind: 'mission',
      text: `${officer.name} keeps an open table on ${inProse(system.name)} for a fortnight, and nobody worth the articles sits down at it.`,
      systemId: system.id,
      characterId: officer.id,
    });
    return;
  }
  recruit.faction = faction;
  recruit.status = 'available';
  // Both of them stand where the papers were signed. Sean's memo: *"keeps both
  // characters at the recruiting island"* — the new hand is at the harbor they
  // joined at, not wherever the world happened to park them, and can be given
  // an errand from there the same morning.
  recruit.locationSystemId = system.id;
  pushEvent(state, {
    kind: 'order',
    text: `${recruit.name} has signed the articles on ${inProse(system.name)}, put there by ${inProse(officer.name)}. ${recruit.blurb ?? ''}`.trim(),
    systemId: system.id,
    characterId: recruit.id,
  });
  // The last of them — and only when it really is the last of them.
  //
  // Sean's memo asked the game to say when the roster is exhausted, because
  // from that morning a recruiter is only a recruiter in name. It was saying
  // it whenever nobody unclaimed happened to be *ashore*, which on day 107 of
  // his Confederacy run was five of the eight still to come. Measured across
  // six seeds: the unaligned arrive on roughly days 1, 1, 70, 135, 205, 275,
  // 350 and 425, so the pool is empty for most of the war and permanently
  // empty only at the very end of it. Telling a player their recruiters are
  // finished when six names are still to turn up retires the verb by mistake,
  // which is what happened.
  if (recruitPool(state).length === 0) {
    const coming = recruitsToCome(state).length;
    pushEvent(state, {
      kind: 'order',
      text:
        coming === 0
          ? `There is nobody left in the Seven Seas to sign. Every hand not already in the war is in it now — whoever you have is whoever you will have.`
          : `That is everybody currently ashore and unclaimed. The Seas are not done making people: others will come up out of them as the war goes on, and a recruiter will have a table to keep again.`,
      systemId: system.id,
    });
  }
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
  // Combat both ways, at Sean's word: *"Abduction is much simpler. You're
  // attempting to capture an enemy character... Your team's Combat capability
  // vs target's Combat capability."* It used to be the party's Espionage
  // against the better of the mark's Combat and Leadership, which priced the
  // snatch off the rating that had already been spent getting through the
  // door — one number doing two jobs, and Vader's bodyguard counting for
  // nothing. Leadership no longer helps a mark resist: being followed is not
  // being hard to carry.
  const resist = mark.combat / ABDUCT_RESIST_DIVISOR;
  return Math.max(0.05, ABDUCT_BASE + officer.combat / 300 - resist);
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
  rng: Rng,
): void {
  const faction = officer.faction as PlayableFaction;
  if (!success) {
    pushEvent(state, {
      kind: 'mission',
      text: `${officer.name} moves on ${mark.name} at ${inProse(system.name)} and comes away empty-handed.`,
      systemId: system.id,
      characterId: officer.id,
    });
    return;
  }
  const famous = isLord(mark);
  takePrisoner(state, mark, faction);
  const held = getSystem(state, mark.locationSystemId);
  pushEvent(state, {
    kind: 'loss',
    notable: true,
    text: `${officer.name} has taken ${mark.name} off the quay at ${inProse(system.name)}. They are held at ${held.name}.`,
    systemId: system.id,
    characterId: mark.id,
  });
  /*
   * And if it was one of the three, the Reach hears about it.
   *
   * Sean's propagation memo, §16: *"exceptional character events may also
   * produce regional effects — capturing a famous enemy commander... these
   * should be rare. Do not allow ordinary character missions to create
   * galaxy-wide political effects."* A Pirate Lord is the only person in the
   * game famous enough, and there are three of them, so this fires a handful
   * of times a war at most. Lifting an ordinary officer off a quay is a good
   * day's work and stays a good day's work.
   */
  if (famous) {
    applyShock(
      state,
      {
        systemId: system.id,
        faction,
        scope: 'regional',
        local: SHOCK_PRINCIPAL.local,
        regional: SHOCK_PRINCIPAL.regional,
        news: `${mark.name} is in irons. There is not a harbor in ${reachName(state, system)} that has not heard it by nightfall.`,
      },
      rng,
    );
  }
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
  rng: Rng,
): void {
  const faction = officer.faction as PlayableFaction;
  const captive = captiveOn(state, system, faction)!;
  if (!success) {
    pushEvent(state, {
      kind: 'mission',
      text: `${officer.name} cannot reach ${captive.name} in the cells at ${inProse(system.name)}. Not this fortnight.`,
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
    // The other half of a capture, and just as worth stopping for: Sean asked
    // for *"captures (and probably rescues)"*.
    notable: true,
    text: `${officer.name} has ${captive.name} out of the cells at ${inProse(system.name)} and away. They are home and fit for sea.`,
    systemId: system.id,
    characterId: captive.id,
  });
  restoreLord(state, captive);
  /*
   * And a famous one getting out is news too. Sean's §16 lists *"successful
   * rescue of a famous leader"* beside capturing one, and it is the same rule
   * with the sign reversed: it happens where the cells were, so the Reach that
   * was holding them is the Reach that has to explain itself.
   */
  if (isLord(captive)) {
    applyShock(
      state,
      {
        systemId: system.id,
        faction,
        scope: 'regional',
        local: SHOCK_PRINCIPAL.local,
        regional: SHOCK_PRINCIPAL.regional,
        news: `${captive.name} is out of the cells at ${inProse(system.name)} and gone. ${reachName(state, system)} is enjoying the story.`,
      },
      rng,
    );
  }
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
  // Local, like everything ordinary. Sean's memo lists "local officer
  // activity" and "local garrison changes" among the things that stay put.
  applyLocalSupport(system, faction, COMMAND_SUPPORT_GAIN + officer.leadership / 9);
  const wasOut = system.uprising;
  if (wasOut) {
    system.uprising = false;
    resolveControlAndUnrest(state);
    recomputeLedger(state);
  }
  pushEvent(state, {
    kind: 'order',
    text: wasOut
      ? `${officer.name} takes command of ${inProse(system.name)} and puts it back in order.`
      : `${officer.name} takes command of ${inProse(system.name)}.`,
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
      text: `The yards at ${inProse(system.name)} have the measure of it. Shipwright craft is now grade ${after}: every hull is cheaper and quicker to lay down.`,
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
      text: `${character.name} finds nothing on ${inProse(system.name)} that the charts did not already have.`,
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
        : `${character.name} charts ${inProse(opened[0])} and ${opened.length - 1} more of the chain.`,
    systemId: system.id,
    characterId: character.id,
  });
}

/**
 * Write down everything one officer could learn standing on an island.
 *
 * The report is a photograph and never a feed: what the island was, that day,
 * with the day on it. The island itself is copied whole rather than summarised,
 * so the sheet reads a remembered island with the same functions it reads a
 * live one — a garrison roster off a remembered `garrison` count, a required
 * garrison off a remembered loyalty, room left off remembered facilities.
 */
export function writeReport(
  state: GameState,
  faction: PlayableFaction,
  system: System,
  by: Character,
  secondHand?: true,
): Intel {
  const theirs = otherFaction(faction);
  const aboard = new Set(state.fleets.flatMap((f) => f.officerIds));

  // Their people standing on it — not ones aboard a hull lying off it, which
  // are counted with the hull, and not ones still at sea for it, which the
  // errands below are the record of.
  const ashore = state.characters.filter(
    (c) =>
      c.faction === theirs &&
      c.locationSystemId === system.id &&
      c.status !== 'captured' &&
      !aboard.has(c.id) &&
      !(c.mission && c.mission.phase === 'travelling'),
  );

  /**
   * Their errands aimed at this island, wherever the officer running one
   * happens to be today.
   *
   * The memo's counter-intelligence half, and the reason to spy on your own
   * ground: *"if the Empire has sent agents to one of your planets, an
   * espionage mission can potentially identify those enemy missions. You can
   * then send abduction or sabotage against the actual mission team."* Both of
   * those already work on anybody standing ashore — what was missing was ever
   * knowing they were there.
   *
   * A party's companions are not listed separately. They carry no mission of
   * their own, and a report that named the same raid four times would read as
   * four raids.
   */
  const errands = state.characters
    .filter((c) => c.faction === theirs && c.mission?.targetSystemId === system.id && !c.escorting)
    .map((c) => ({
      type: c.mission!.type,
      byId: c.id,
      byName: c.name,
      daysRemaining: c.mission!.daysRemaining,
    }));

  // What is in the water. Anything lying here, and anything at sea for here —
  // the memo's "units currently travelling toward the system", which is what
  // makes a report on your own island an early warning rather than a stocktake.
  const harbor = state.fleets
    .filter(
      (f) =>
        (!f.voyage && f.systemId === system.id) || f.voyage?.targetSystemId === system.id,
    )
    .map((f) => ({
      id: f.id,
      name: f.name,
      faction: f.faction,
      ships: f.ships.length,
      troops: f.troops,
      inbound: f.voyage ? f.voyage.daysRemaining : undefined,
    }));

  return {
    day: state.day,
    byId: by.id,
    byName: by.name,
    secondHand,
    island: JSON.parse(JSON.stringify(system)) as System,
    officerIds: ashore.map((c) => c.id),
    errands,
    harbor,
    watch: watchOn(state, system, faction).total,
  };
}

/** File a report, replacing whatever that side held on that island before. */
export function fileReport(state: GameState, faction: PlayableFaction, report: Intel): void {
  if (!state.intel) state.intel = { empire: {}, alliance: {} };
  state.intel[faction][report.island.id] = report;
}

/** The report that side is holding on an island, if any. */
export function reportOn(
  state: GameState,
  system: System | string,
  faction: PlayableFaction,
): Intel | undefined {
  const id = typeof system === 'string' ? system : system.id;
  return state.intel?.[faction]?.[id];
}

/**
 * How well this side can see an island today, and on what.
 *
 * The rule espionage exists to be the answer to. Until now an island answered
 * one question — charted or not — and a charted island told you everything
 * about itself for ever, live, free: its companies, its commander, its works,
 * its harbor and, since the watch, the exact number a covert errand would have
 * to beat. There was no way to want a report.
 *
 * Three answers now, and only on ground the enemy holds:
 *
 *   'eyes'   — you hold it, or you have a hull lying at it, or one of your
 *              people is standing on it. What you can see for yourself is
 *              live, and always has been. This is also why an assault tells
 *              you what you are assaulting: the squadron is there.
 *   'report' — you have been told. The island as your last spy left it, with
 *              the day on it, and it does not update.
 *   'none'   — a name on the chart and whose flag flies over it, which is what
 *              anyone can see from a passing deck.
 *
 * Neutral ground stays open once charted, deliberately. That is where parley
 * happens and where most of the game's early decisions are made, and putting
 * the whole unaligned world behind reports would be a second, much larger
 * change wearing this one's clothes. The decision worth making dark is the one
 * about an island somebody is defending.
 */
export type Sight = 'eyes' | 'report' | 'none';

export function sightOf(
  state: GameState,
  system: System,
  faction: PlayableFaction,
): Sight {
  if (!system.explored[faction]) return 'none';
  // Yours, or nobody's, or the unaligned's: open.
  if (system.control !== otherFaction(faction)) return 'eyes';
  // A hull lying at it, not one at sea for it — a squadron three days out
  // cannot count companies.
  if (state.fleets.some((f) => f.faction === faction && !f.voyage && f.systemId === system.id)) {
    return 'eyes';
  }
  // Somebody of yours ashore, on an errand or in their cells. A prisoner sees
  // the harbor from a window, which is a better argument for going to get them
  // than it sounds.
  if (
    state.characters.some(
      (c) =>
        c.faction === faction &&
        c.locationSystemId === system.id &&
        !(c.mission && c.mission.phase === 'travelling'),
    )
  ) {
    return 'eyes';
  }
  return reportOn(state, system, faction) ? 'report' : 'none';
}

/**
 * The watch on an island, as far as this side has any way of knowing it.
 *
 * Its own report where it has one, the live figure where it can see for
 * itself, and an assumption where it has neither. The assumption is what makes
 * looking worth a fortnight: a guess is a number you can act on and be wrong
 * about, where a blank is a decision you cannot make at all, and the opponent
 * has to be able to make it before it has learned anything.
 */
export function knownWatch(
  state: GameState,
  system: System,
  faction: PlayableFaction,
): number {
  const sight = sightOf(state, system, faction);
  if (sight === 'eyes') return watchOn(state, system, faction).total;
  if (sight === 'report') return reportOn(state, system, faction)!.watch;
  return ASSUMED_WATCH;
}

/**
 * The island as this side knows it: live, remembered, or not at all.
 *
 * The one call anything outside the island sheet should be making about an
 * enemy island's contents. A Reach's list of islands counts companies and
 * works down its right-hand edge, and counting them off the live world would
 * have handed back for free, on a list, exactly what the sheet had just
 * stopped giving away.
 */
export function knownIsland(
  state: GameState,
  system: System,
  faction: PlayableFaction,
): System | undefined {
  const sight = sightOf(state, system, faction);
  if (sight === 'eyes') return system;
  if (sight === 'report') return reportOn(state, system, faction)!.island;
  return undefined;
}

/**
 * A fortnight spent counting somebody else's guns.
 *
 * Failure here is not being caught — being caught happened at the door, a
 * fortnight ago, and ended the errand there. This is the officer who got in,
 * spent two weeks in the wrong taverns and came out with nothing worth
 * writing down, which is the memo's distinction exactly: *"a failed mission
 * doesn't necessarily mean your spy was detected."*
 */
function espionageOutcome(
  state: GameState,
  character: Character,
  system: System,
  success: boolean,
): void {
  const faction = character.faction as PlayableFaction;
  if (!success) {
    pushEvent(state, {
      kind: 'mission',
      text: `${character.name} comes away from ${inProse(system.name)} with nothing anybody could act on.`,
      systemId: system.id,
      characterId: character.id,
    });
    return;
  }

  const party = partyStrength(state, character);
  fileReport(state, faction, writeReport(state, faction, system, character));

  // The second island, out of somebody's dispatches rather than seen.
  const bonus =
    party.espionage >= ESPIONAGE_SECOND_ISLAND && system.control === otherFaction(faction)
      ? secondIsland(state, system, faction)
      : undefined;
  if (bonus) fileReport(state, faction, writeReport(state, faction, bonus, character, true));

  const held = watchOn(state, system, faction).total;
  pushEvent(state, {
    kind: 'order',
    text: bonus
      ? `${character.name} has the measure of ${inProse(system.name)} — ${countOf(system)}, and a watch of ${held} — and came away with ${inProse(bonus.name)}'s dispatches besides.`
      : `${character.name} has the measure of ${inProse(system.name)}: ${countOf(system)}, and a watch of ${held}.`,
    systemId: system.id,
    characterId: character.id,
  });
}

/** The one line a report is worth in the log; the sheet carries the rest. */
function countOf(system: System): string {
  const troops = system.garrison;
  const works = system.facilities.filter((f) => !f.building).length;
  return `${troops} ${troops === 1 ? 'troop' : 'troops'} and ${works} ${works === 1 ? 'works' : 'works'}`;
}

/**
 * Whose dispatches the spy happened to be reading.
 *
 * Another island the same side holds, charted, that the spy's own side has no
 * fresh report on — a bonus that told you again what you already knew would be
 * no bonus. Never their capital: the memo's restriction on the free planet,
 * and the reason for it is ours as well. The Confederate capital is the
 * Crown's entire war aim, and a war aim that can arrive as a side effect of a
 * lucky roll somewhere else is not a war aim.
 *
 * Nearest first, because a spy on Kestrel Bar reads Kestrel Bar's mail, and
 * what comes into Kestrel Bar is news of its neighbours.
 */
function secondIsland(
  state: GameState,
  from: System,
  faction: PlayableFaction,
): System | undefined {
  const theirs = otherFaction(faction);
  const seat = state.factions[theirs].hqSystemId;
  const hidingALord = new Set(
    state.characters
      .filter((c) => isLord(c) && c.faction === theirs && c.status !== 'captured')
      .map((c) => c.locationSystemId),
  );
  return state.systems
    .filter(
      (s) =>
        s.id !== from.id &&
        s.id !== seat &&
        !hidingALord.has(s.id) &&
        s.control === theirs &&
        s.explored[faction] &&
        reportOn(state, s, faction) === undefined,
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y),
    )[0];
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
      text: `${character.name} finds ${inProse(system.name)} too well watched, and comes away with nothing.`,
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
    text: `${character.name} burns the ${FACILITY_LABEL[target.type].toLowerCase()} on ${inProse(system.name)}.`,
    systemId: system.id,
    characterId: character.id,
  });
  recomputeLedger(state);
}

/** Talking an island round: your own standing up, theirs down. */
/**
 * A fortnight of talking, and what the harbor made of it.
 *
 * The odds and the size of the result both come from `politics.ts` now, and
 * neither is fixed: the old rule added `8 + Diplomacy/10` every cycle without
 * fail, so a player could work out in advance exactly how many fortnights an
 * island would take. Sean's brief: *"the player should never know with
 * certainty that the next mission cycle will succeed."*
 */
function parleyOutcome(
  state: GameState,
  character: Character,
  system: System,
  party: Character[],
  rng: Rng,
): void {
  const faction = character.faction as PlayableFaction;
  const standing = parleyStanding(system, faction, party);
  const cycle = runCycle(standing, rng);

  if (!cycle.landed) {
    if (cycle.backfired) {
      // The other side has something to point at now. Not a catastrophe —
      // about a point, and the room remembers it for a while.
      applyLocalSupport(system, otherFaction(faction), 1);
      pushMomentum(system, otherFaction(faction), MOMENTUM_PER_SUCCESS / 2);
    }
    pushEvent(state, {
      kind: 'mission',
      text: cycle.backfired
        ? `${character.name} is heard out on ${inProse(system.name)} and answered; the room goes the other way.`
        : `${character.name} makes no headway on ${inProse(system.name)}.`,
      systemId: system.id,
      characterId: character.id,
    });
    resolveControlAndUnrest(state);
    return;
  }

  /*
   * One change, on one island.
   *
   * Two things at once. Allegiance is one balance — what you win is what they
   * lose, so saying it twice would carry the island twice as fast. And it is
   * *local*: this used to spill a fifth of every point onto all nine of the
   * Reach's other islands, so a routine fortnight moved a whole chain. Sean's
   * propagation memo forbids exactly that — *"do not make every allegiance
   * change affect the region"* — and a successful parley is his first example
   * of an event that stays where it happened. What carries down the chain is
   * the island *declaring*, below.
   */
  applyLocalSupport(system, faction, cycle.swing);
  pushMomentum(system, faction, MOMENTUM_PER_SUCCESS);

  /*
   * And then the island decides — or does not.
   *
   * The replacement for the eighty-point line. Asked only here, after a
   * meeting that went well, so joining is a thing that happens *at* a meeting
   * rather than overnight when a number is crossed, and it is never certain at
   * any standing.
   */
  if (rng.chance(joinChance(system, faction))) {
    const order = orderFor(state, system);
    system.control = faction;
    handOver(state, system, faction);
    system.uprising = false;
    delete system.momentum;
    pushEvent(state, {
      kind: 'flip',
      text: `${system.name} has declared for the ${factionData[faction].shortName}. ${character.name} was in the room.`,
      systemId: system.id,
      characterId: character.id,
    });
    /*
     * And the Reach hears about it. Sean's propagation memo, §3: a peaceful
     * political conversion is the first of his major events, and *"the player
     * should occasionally experience: I took ONE island and suddenly the whole
     * region started moving."* Whether it does is not up to this line — the
     * neighbours get a few points each and what they do with them is their own
     * business, which is the whole of §21.
     */
    applyShock(
      state,
      {
        systemId: system.id,
        faction,
        scope: 'regional',
        local: SHOCK_CONVERSION.local,
        regional: SHOCK_CONVERSION.regional,
        order,
        news: `${system.name} has come over to the ${factionData[faction].shortName} of its own accord, and every harbor in ${reachName(state, system)} is talking about it.`,
      },
      rng,
    );
    resolveControlAndUnrest(state);
    return;
  }

  pushEvent(state, {
    kind: 'mission',
    text:
      cycle.swing >= PARLEY_SWING_MAX * 0.8
        ? `${character.name} carries the room on ${inProse(system.name)}: allegiance up ${cycle.swing.toFixed(1)} points.`
        : `${character.name} sways ${inProse(system.name)}: allegiance up ${cycle.swing.toFixed(1)} points.`,
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
  party: Character[],
  rng: Rng,
): void {
  const faction = character.faction as PlayableFaction;
  const holder = otherFaction(faction);
  const standing = inciteStanding(state, system, faction, party);
  const cycle = runCycle(standing, rng);

  if (!cycle.landed) {
    pushEvent(state, {
      kind: 'mission',
      text: cycle.backfired
        ? `${character.name} finds no ear for it on ${inProse(system.name)}, and the wrong people hear about the asking.`
        : `${character.name} finds no ear for it on ${inProse(system.name)}.`,
      systemId: system.id,
      characterId: character.id,
    });
    if (cycle.backfired) pushMomentum(system, holder, MOMENTUM_PER_SUCCESS / 2);
    resolveControlAndUnrest(state);
    return;
  }

  // Everything you take off the governor is yours, whether the island means
  // it that way or not: there is no third place for an angry island to go.
  // Local. Stirring an island down is his "successful Incite" — the first
  // list, the one that stays on the island it happened on. What the Reach
  // hears about is the island actually rising, and that is raised where the
  // revolt is: see `resolveControlAndUnrest`.
  applyLocalSupport(system, holder, -cycle.swing);
  pushMomentum(system, faction, MOMENTUM_PER_SUCCESS);
  pushEvent(state, {
    kind: 'mission',
    text: `${character.name} stirs up ${inProse(system.name)}: the governor's hold falls ${cycle.swing.toFixed(1)} points.`,
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
  mission.cycles = (mission.cycles ?? 1) + 1;
  character.status = 'on_mission';
}

/** "Return": the mission ends and the character is free where they stand. */
export function endMission(state: GameState, characterId: string): void {
  const character = getCharacter(state, characterId);
  state.pendingDecisions = state.pendingDecisions.filter((d) => d.characterId !== characterId);
  character.mission = undefined;
  if (character.status === 'on_mission') character.status = 'available';
}
