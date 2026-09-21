/**
 * Fleets: hulls, where they are, and what happens when two of them meet.
 *
 * Spec section 7, Phase 2. A fleet is one thing that moves as one thing,
 * carrying ships and the companies aboard them, after the original's fleet
 * window rather than a stack of ships with a leader attached elsewhere.
 */
import {
  BREAK_OFF_ODDS,
  PURSUIT_ODDS,
  isWall,
  SHOCK_BATTLE_CEILING,
  SHOCK_BATTLE_FLOOR,
  SHOCK_PER_GUN_SUNK,
  SHOCK_CIVILIAN_FIRE,
  SHOCK_MILITARY_FIRE,
  SHOCK_CONQUEST,
  SHOCK_LIBERATION_LEVEL,
  REPAIR_PER_DAY,
  REPAIR_AT_A_YARD,
  OFFICER_EDGE,
  SCOUT_PER_ISLAND,
  shipSpec,
  hitChanceOn,
  shipClass,
  LONG_GUN_SHARE,
  RETREAT_SHOTS,
} from './constants';
import {
  beastAlive,
  beastAt,
  beastCombatant,
  beastFighter,
  beastGuns,
  landBeastDamage,
  monsterShots,
  monsterStrike,
  sightBeast,
} from './creatures';
import { fireOnce, pickTarget, type Combatant } from './round';
import { exchange, type Fighter } from './cannon';
import type { Ledger, LedgerRow } from './outcome';
import {
  bombard,
  invade,
  islandDefense,
  wallBombardDefense,
  wallInvasionDefense,
  type Fighter as Landed,
  type Shellable,
} from './siege';
import { BOMBARD_CIVILIAN_LOYALTY, BOMBARD_TICKS_MAX, FACILITY_LABEL } from './constants';
import { craftGrade } from './missions';
import { garrisonRoster, landingTroop } from './troops';
import {
  inProse,
  getSystem,
  handOver,
  nextId,
  otherFaction,
  pushEvent,
  requiredGarrison,
  setSupport,
  reachName,
  isPlayable,
} from './helpers';
import factionData from '../data/factions.json';
import { applyShock, landingShock, type Ripple } from './propagate';
import {
  VERDICT_WORD,
  assaultStrategic,
  battleStrategic,
  bombardStrategic,
  forceName,
  tensionOf,
  verdictOf,
  type Fate,
  type ForceTally,
  type OperationReport,
  type PersonRow,
  type Verdict,
} from './outcome';
import { lordPowerAt, restoreLord } from './lords';
import { caughtOnLanding, takePrisoner, travelDays } from './missions';
import type { Rng } from './rng';
import type {
  BattleOutcome,
  Character,
  Facility,
  Fleet,
  GameState,
  PendingBattle,
  PlayableFaction,
  Ship,
  ShipClassId,
  System,
} from './types';

/** A fleet at sea is nowhere, and can neither fight nor be fought. */
export function isAtSea(fleet: Fleet): boolean {
  return fleet.voyage !== undefined;
}

export function fleetsAt(state: GameState, systemId: string): Fleet[] {
  return state.fleets.filter((f) => f.systemId === systemId && !isAtSea(f));
}

export function fleetsOf(state: GameState, faction: PlayableFaction): Fleet[] {
  return state.fleets.filter((f) => f.faction === faction);
}

export function findFleet(state: GameState, fleetId: string): Fleet | undefined {
  return state.fleets.find((f) => f.id === fleetId);
}

/** Guns a hull still brings, which is nothing once it is on the bottom. */
export function shipGuns(ship: Ship): number {
  const spec = shipSpec(ship.classId);
  return ship.damage >= spec.hull ? 0 : spec.guns;
}


export function fleetGuns(fleet: Fleet): number {
  return fleet.ships.reduce((total, ship) => total + shipGuns(ship), 0);
}

/** Companies this fleet could carry if it were empty. */
export function fleetCapacity(fleet: Fleet): number {
  return fleet.ships.reduce((total, ship) => total + shipSpec(ship.classId).carries, 0);
}

/**
 * A fleet sails at the pace of its slowest hull, which is what makes a sloop
 * worth keeping once you own ships of the line.
 */
export function fleetPace(fleet: Fleet): number {
  if (fleet.ships.length === 0) return 1;
  return Math.max(...fleet.ships.map((s) => shipSpec(s.classId).pace));
}

/** The crew serving with a fleet, in the order they came aboard. */
export function officersOf(state: GameState, fleet: Fleet): Character[] {
  return fleet.officerIds
    .map((id) => state.characters.find((c) => c.id === id))
    .filter((c): c is Character => c !== undefined);
}

/**
 * What the best officer aboard is worth, as a fraction added to the fleet's
 * effort. A rating of 100 is worth a quarter again; nobody aboard is worth
 * nothing. Deliberately modest: a good captain should tip a close fight, not
 * decide one against the odds.
 */
export function officerEdge(
  state: GameState,
  fleet: Fleet,
  rating: 'leadership' | 'combat',
): number {
  const best = officersOf(state, fleet).reduce((n, c) => Math.max(n, c[rating]), 0);
  return 1 + (best / 100) * OFFICER_EDGE;
}

export function fleetDamaged(fleet: Fleet): number {
  return fleet.ships.filter((s) => s.damage > 0).length;
}

/** Plain language, as the original states it, rather than an icon. */
export function fleetStatus(state: GameState, fleet: Fleet): string {
  if (fleet.voyage) {
    const target = state.systems.find((s) => s.id === fleet.voyage!.targetSystemId);
    const days = fleet.voyage.daysRemaining;
    return `At sea for ${target?.name ?? 'open water'} — ${days}d`;
  }
  const here = state.systems.find((s) => s.id === fleet.systemId);
  if (here && here.control !== fleet.faction && fortsOf(here).length > 0 && fleetBombard(fleet) > 0) {
    const walls = fortsOf(here).length;
    return `Off the walls — ${walls} ${walls === 1 ? 'battery' : 'batteries'} standing`;
  }
  if (here && here.control !== fleet.faction && here.populated) return 'Blockading';
  return 'At anchor';
}

/**
 * Put a new hull in the water at an island, joining whatever fleet of yours is
 * already lying there so a player does not end up with nine fleets of one.
 */
export function addShip(
  state: GameState,
  system: System,
  faction: PlayableFaction,
  classId: ShipClassId,
): Fleet {
  const ship: Ship = { id: nextId(state, 'shp'), classId, damage: 0 };
  // Join whatever fleet of ours lies here, so a player does not end up with
  // nine fleets of one.
  const existing = fleetsAt(state, system.id).find((f) => f.faction === faction);
  if (existing) {
    existing.ships.push(ship);
    return existing;
  }
  const fleet: Fleet = {
    id: nextId(state, 'flt'),
    // Counting the fleets you have gives the same name twice once one is
    // sunk. `nextFleetName` takes the lowest number nobody is using.
    name: nextFleetName(state, faction),
    faction,
    systemId: system.id,
    ships: [ship],
    troops: 0,
    officerIds: [],
  };
  state.fleets.push(fleet);
  return fleet;
}

/**
 * Splitting a squadron, and joining two.
 *
 * Sean: *"how do I split fleets? I need a way to create a fleet from a unit and
 * move ships between fleets."* There was no way, and it is the one order the
 * fleet layer was missing: a squadron that can only ever be sailed whole is a
 * squadron you cannot use to do two things at once, which is most of what a
 * navy is for.
 *
 * `into` names an existing fleet to join, or is left out for a new one. Both
 * are the same operation from the sim's point of view — hulls leave one fleet
 * and arrive in another lying in the same water — which is why they are one
 * function and not two that drift apart.
 *
 * Companies are the only thing that needs care, and less than it looks: both
 * fleets are at the same island, so moving hulls between them cannot change
 * the total room aboard. Only the distribution changes, and the rule is that
 * each fleet keeps what it can and the rest goes across. Nothing is ever lost.
 */
export function detachError(
  state: GameState,
  fleetId: string,
  shipIds: string[],
  into: string | undefined,
  actor: PlayableFaction,
): string | null {
  const fleet = findFleet(state, fleetId);
  if (!fleet) return 'No such fleet.';
  if (fleet.faction !== actor) return 'That fleet is not yours.';
  if (isAtSea(fleet)) return 'The fleet is at sea. Hulls change squadron at anchor.';
  if (shipIds.length === 0) return 'Nothing chosen.';
  if (shipIds.some((id) => !fleet.ships.some((sh) => sh.id === id))) {
    return 'Those hulls are not in that fleet.';
  }
  if (into === undefined) {
    // Moving everything into a fleet that does not exist yet is a rename, not
    // a split, and it would leave the officers aboard a fleet with no hulls.
    if (shipIds.length === fleet.ships.length) return 'That is the whole squadron.';
    return null;
  }
  const target = findFleet(state, into);
  if (!target) return 'No such fleet.';
  if (target.id === fleet.id) return 'They are already in that squadron.';
  if (target.faction !== actor) return 'That fleet is not yours.';
  if (isAtSea(target)) return 'That squadron is at sea.';
  if (target.systemId !== fleet.systemId) return 'That squadron is at another island.';
  return null;
}

export function detachShips(
  state: GameState,
  fleetId: string,
  shipIds: string[],
  into: string | undefined,
  actor: PlayableFaction,
): Fleet {
  const error = detachError(state, fleetId, shipIds, into, actor);
  if (error) throw new Error(error);
  const fleet = findFleet(state, fleetId)!;
  const moving = fleet.ships.filter((sh) => shipIds.includes(sh.id));
  fleet.ships = fleet.ships.filter((sh) => !shipIds.includes(sh.id));

  let target = into ? findFleet(state, into)! : undefined;
  if (!target) {
    target = {
      id: nextId(state, 'flt'),
      name: nextFleetName(state, actor),
      faction: actor,
      systemId: fleet.systemId,
      ships: [],
      troops: 0,
      officerIds: [],
    };
    state.fleets.push(target);
  }
  target.ships.push(...moving);

  // Companies settle where there is room for them, source first — the fleet
  // you split *from* is the one still doing whatever it was doing.
  const carried = fleet.troops + target.troops;
  fleet.troops = Math.min(carried, fleetCapacity(fleet));
  // And no more into the new squadron than it has berths for. The remainder
  // had nowhere to go and used to be put there anyway.
  target.troops = Math.min(carried - fleet.troops, fleetCapacity(target));

  // A fleet with no hulls left is not a fleet. Whoever was serving with it
  // goes across with the hulls rather than quietly ceasing to exist.
  if (fleet.ships.length === 0) {
    target.officerIds.push(...fleet.officerIds);
    state.fleets = state.fleets.filter((f) => f.id !== fleet.id);
  }
  pushEvent(state, {
    kind: 'order',
    text: `${moving.length} ${moving.length === 1 ? 'hull' : 'hulls'} ${
      into ? `join ${target.name}` : `make up ${target.name}`
    } at ${getSystem(state, target.systemId).name}.`,
    systemId: target.systemId,
    quiet: true,
  });
  return target;
}

/** The next free "Fleet N" for a side, so numbers are not reused. */
export function nextFleetName(state: GameState, faction: PlayableFaction): string {
  const taken = new Set(state.fleets.filter((f) => f.faction === faction).map((f) => f.name));
  for (let n = 1; n < 200; n++) {
    const name = `Fleet ${n}`;
    if (!taken.has(name)) return name;
  }
  return `Fleet ${state.fleets.length + 1}`;
}

/** Other squadrons of yours lying at the same island, for a hull to join. */
export function fleetsToJoin(state: GameState, fleet: Fleet): Fleet[] {
  return state.fleets.filter(
    (f) => f.id !== fleet.id && f.faction === fleet.faction && !isAtSea(f) && f.systemId === fleet.systemId,
  );
}

// --- Orders ----------------------------------------------------------------

/**
 * Orders take the faction giving them rather than assuming the human player.
 * "That fleet is not yours" is a fact about the actor, not about who is
 * holding the phone, and the opponent needs the same rules to sail under.
 */
export function sailError(
  state: GameState,
  fleetId: string,
  targetSystemId: string,
  actor: PlayableFaction,
): string | null {
  const fleet = findFleet(state, fleetId);
  if (!fleet) return 'No such fleet.';
  if (fleet.faction !== actor) return 'That fleet is not yours.';
  if (isAtSea(fleet)) return 'Already at sea.';
  if (fleet.systemId === targetSystemId) return 'Already there.';
  if (!state.systems.some((s) => s.id === targetSystemId)) return 'No such island.';
  if (fleet.ships.length === 0) return 'Nothing left to sail.';
  return null;
}

/**
 * How long this fleet would take to get there, in days.
 *
 * Exported because the player is asked to confirm a voyage before it is
 * ordered, and the figure on that sheet has to be the figure the voyage
 * actually takes — not a second calculation that agrees with this one until
 * somebody edits one of them. `sailFleet` uses it too.
 *
 * A fleet is as quick as its slowest hull, so a ship of the line in with the
 * sloops slows the whole squadron: that is `fleetPace`, and it is why the
 * same crossing can cost different fleets different days.
 */
export function sailDays(state: GameState, fleetId: string, targetSystemId: string): number {
  const fleet = findFleet(state, fleetId);
  if (!fleet) return 0;
  return Math.max(
    1,
    Math.round(travelDays(state, fleet.systemId, targetSystemId) * fleetPace(fleet)),
  );
}

/**
 * Companies an island can let go of.
 *
 * What it needs to stay quiet is not spare: strip a garrison below its
 * requirement and the island rises behind the fleet that did it, which is a
 * worse outcome than the landing was worth.
 *
 * But order is not the only thing a garrison is for, and reading this off
 * `requiredGarrison` alone was a real hole. That ladder answers "how many
 * companies stop this island rising", and a firmly loyal island answers
 * *none* — correctly. It was being asked a different question: "how many can
 * sail away". Measured, that emptied the Crown's capital.
 *
 * Highwater at ninety-seven per cent loyal needs nobody standing over it, so
 * the fleet leaving took every company it had; the island sat at a garrison of
 * nought for twenty-three days with nothing in the log about it; one
 * Confederate squadron with four companies aboard walked in on day
 * thirty-five, and the war was over on day thirty-six. Nobody chose any of
 * that — the loading is automatic, because Sean cut the control for it, so it
 * has to be the safe thing rather than the greedy one.
 *
 * Two floors on top of the ladder, then:
 *
 * - **A seat is never stripped.** Losing Highwater loses the Crown the war,
 *   so no automatic anything takes its companies off it.
 * - **The last company never leaves an island you hold.** An empty harbor is
 *   taken by whoever shows up with one company, however loyal its people are.
 */
export function sparedCompanies(system: System, state?: GameState): number {
  if (system.control !== 'empire' && system.control !== 'alliance') return 0;
  // A capital whose fall ends the war keeps everything it has.
  if (state && system.id === state.factions.empire.hqSystemId) return 0;
  const keep = Math.max(
    requiredGarrison(system.support[system.control], system.uprising),
    1,
  );
  return Math.max(0, system.garrison - keep);
}

/**
 * A fleet leaving one of your islands takes the companies it can spare.
 *
 * There used to be a control for this and Sean cut it: *"cut this ashore /
 * aboard thing."* He is right that it was never a decision. Nobody leaves
 * companies standing on a quiet island when the hulls going somewhere have
 * room, and nobody carries them past an island of theirs that could use them —
 * so the two taps only ever had one sensible answer, and a control with one
 * sensible answer is a chore.
 *
 * So it happens by itself, at the two moments it would have been done by hand:
 * load what the island can spare on the way out (see `sparedCompanies`), and
 * put everything ashore on arriving anywhere you hold. Arrive anywhere else
 * and they stay aboard, which is what a landing is made of.
 */
function loadSpareCompanies(state: GameState, fleet: Fleet): void {
  const system = getSystem(state, fleet.systemId);
  if (system.control !== fleet.faction) return;
  const room = fleetCapacity(fleet) - fleet.troops;
  const take = Math.min(room, sparedCompanies(system, state));
  if (take <= 0) return;
  system.garrison -= take;
  fleet.troops += take;
}

/** The other end of it: everything aboard goes ashore on your own island. */
function landCompanies(state: GameState, fleet: Fleet): void {
  const system = getSystem(state, fleet.systemId);
  if (system.control !== fleet.faction || fleet.troops <= 0) return;
  system.garrison += fleet.troops;
  fleet.troops = 0;
}

export function sailFleet(
  state: GameState,
  fleetId: string,
  targetSystemId: string,
  actor: PlayableFaction,
): void {
  const error = sailError(state, fleetId, targetSystemId, actor);
  if (error) throw new Error(error);
  const fleet = findFleet(state, fleetId)!;
  const target = getSystem(state, targetSystemId);
  loadSpareCompanies(state, fleet);
  const days = sailDays(state, fleetId, targetSystemId);
  fleet.voyage = { targetSystemId, daysRemaining: days };
  pushEvent(state, {
    kind: 'order',
    text: `${fleet.name} weighs anchor for ${inProse(target.name)}.`,
    systemId: fleet.systemId,
  });
}

export function embarkError(
  state: GameState,
  fleetId: string,
  companies: number,
  actor: PlayableFaction,
): string | null {
  const fleet = findFleet(state, fleetId);
  if (!fleet) return 'No such fleet.';
  if (fleet.faction !== actor) return 'That fleet is not yours.';
  if (isAtSea(fleet)) return 'The fleet is at sea.';
  const system = getSystem(state, fleet.systemId);
  if (system.control !== fleet.faction) return 'You do not hold this island.';
  if (companies > 0) {
    if (system.garrison < companies) return 'Not enough troops ashore.';
    if (fleet.troops + companies > fleetCapacity(fleet)) return 'No room aboard.';
  } else if (fleet.troops < -companies) {
    return 'Not that many aboard.';
  }
  return null;
}

/**
 * Move companies between the island and the fleet. Positive takes them aboard,
 * negative puts them ashore. Landing on an island that is not yours is an
 * assault, and `landing` handles that rather than this.
 */
export function embark(
  state: GameState,
  fleetId: string,
  companies: number,
  actor: PlayableFaction,
): void {
  const error = embarkError(state, fleetId, companies, actor);
  if (error) throw new Error(error);
  const fleet = findFleet(state, fleetId)!;
  const system = getSystem(state, fleet.systemId);
  system.garrison -= companies;
  fleet.troops += companies;
}

export function boardError(
  state: GameState,
  fleetId: string,
  characterId: string,
  actor: PlayableFaction,
): string | null {
  const fleet = findFleet(state, fleetId);
  if (!fleet) return 'No such fleet.';
  if (fleet.faction !== actor) return 'That fleet is not yours.';
  if (isAtSea(fleet)) return 'The fleet is at sea.';
  const character = state.characters.find((c) => c.id === characterId);
  if (!character) return 'No such crew.';
  if (character.faction !== actor) return 'Not one of yours.';
  if (character.mission) return 'Already away on a parley.';
  if (character.status !== 'available') return `${character.name} is ${character.status}.`;
  if (character.locationSystemId !== fleet.systemId) return 'Not on this island.';
  if (fleet.officerIds.includes(characterId)) return 'Already aboard.';
  // Serving with one squadron, never two.
  //
  // This checked only *this* fleet's roster, which is the same mistake as
  // asking whether a chair is empty instead of whether the person is sitting
  // somewhere. Measured over a full war: the opponent's officer-signing pass
  // runs once per fleet, so one captain ended up crewing thirty-seven
  // squadrons at once and his Leadership was counted in every one of them.
  const serving = state.fleets.find((f) => f.officerIds.includes(characterId));
  if (serving) return `${character.name} is already with the ${serving.name}.`;
  return null;
}

/** Sign a crew member on to a fleet, or put them back ashore. */
export function board(
  state: GameState,
  fleetId: string,
  characterId: string,
  actor: PlayableFaction,
): void {
  const error = boardError(state, fleetId, characterId, actor);
  if (error) throw new Error(error);
  // Taking a deck ends a posting, for the same reason taking an errand does:
  // you have gone. Without this the island went on counting a commander who
  // had sailed away with a squadron — measured over a war, a Lord posted to
  // Avermere was standing in Highwater's harbor while Avermere still had the
  // benefit of her, which is the free lunch the errand rule already closed.
  for (const system of state.systems) {
    if (system.commanderId === characterId) system.commanderId = undefined;
  }
  findFleet(state, fleetId)!.officerIds.push(characterId);
}

export function goAshore(state: GameState, fleetId: string, characterId: string): void {
  const fleet = findFleet(state, fleetId);
  if (!fleet || isAtSea(fleet)) throw new Error('The fleet is at sea.');
  // A Lord used to be refused here, because a Lord was a hull and a hull does
  // not walk down its own gangway. They are people, and they come ashore.
  fleet.officerIds = fleet.officerIds.filter((id) => id !== characterId);
  const character = state.characters.find((c) => c.id === characterId);
  if (character) character.locationSystemId = fleet.systemId;
}

export function assaultError(
  state: GameState,
  fleetId: string,
  actor: PlayableFaction,
): string | null {
  const fleet = findFleet(state, fleetId);
  if (!fleet) return 'No such fleet.';
  if (fleet.faction !== actor) return 'That fleet is not yours.';
  if (isAtSea(fleet)) return 'The fleet is at sea.';
  if (fleet.troops === 0) return 'No troops aboard.';
  const system = getSystem(state, fleet.systemId);
  if (system.control === fleet.faction) return 'The island is already yours.';
  if (fleetsAt(state, system.id).some((f) => f.faction !== fleet.faction && fleetGuns(f) > 0)) {
    return 'Enemy ships hold the harbor.';
  }
  /*
   * The gate the whole siege used to hang on stood here: *"a single fortress
   * on the island prevents the fleet from doing an assault"* (Sean, 15
   * September). It is repealed as of 20 September. You may always land.
   *
   * What a standing wall does instead is add its Invasion Defense to the
   * garrison's die, which makes storming it expensive rather than impossible.
   * That is the better rule for the same reason the bombardment rework is:
   * with the wall as a turnstile there was exactly one order of operations and
   * no decision in it. Now there is a trade — spend ticks and risk the town,
   * or spend companies going over the wall.
   */
  return null;
}

export function assault(
  state: GameState,
  fleetId: string,
  rng: Rng,
  actor: PlayableFaction,
): void {
  const error = assaultError(state, fleetId, actor);
  if (error) throw new Error(error);
  resolveLanding(state, findFleet(state, fleetId)!, rng);
}

// --- The day ---------------------------------------------------------------

/** Tick voyages, then fight and blockade wherever that leaves everyone. */
export function advanceFleets(state: GameState, rng: Rng): void {
  for (const fleet of state.fleets) {
    if (!fleet.voyage) continue;
    fleet.voyage.daysRemaining -= 1;
    if (fleet.voyage.daysRemaining > 0) continue;
    fleet.systemId = fleet.voyage.targetSystemId;
    fleet.voyage = undefined;
    // Home, or somewhere of yours: the companies go ashore. Anywhere else they
    // stay aboard, and the fleet card offers the landing.
    landCompanies(state, fleet);
    const system = getSystem(state, fleet.systemId);
    system.explored[fleet.faction] = true;
    // Whoever is serving with her is where she is.
    for (const officer of officersOf(state, fleet)) officer.locationSystemId = system.id;
    scoutFrom(state, fleet, system);
    pushEvent(state, {
      kind: 'order',
      text: `${fleet.name} has come to anchor off ${inProse(system.name)}.`,
      systemId: system.id,
    });
    // What is in the water is found by going, not by charting. scoutFrom can
    // open half a chain from the masthead and reveals none of this; only the
    // island the boats actually reach gives up what lives off it.
    const sighted = sightBeast(system, fleet.faction);
    if (sighted) {
      pushEvent(state, { kind: 'mission', text: sighted, systemId: system.id });
    }
  }

  resolveBattles(state, rng);
  clearWrecks(state);
}

/**
 * A fleet reduced to nothing is not a fleet.
 *
 * Anyone serving with her is put ashore where she lay, the companies that had
 * no hull left to sit in are drowned, and she goes off the board. Whoever is
 * aboard is dealt with first: quietly deleting a fleet with people on it
 * strands them nowhere, which is what used to happen.
 *
 * Called at the end of the fighting **and** again at the end of the day. The
 * fighting is not the only thing that sinks hulls — a creature takes a fleet
 * in open water long after `advanceFleets` has finished, and a squadron it
 * emptied went on sailing to a destination it could not reach, with a voyage
 * counting down and nothing left to arrive. Measured: one such ghost per war,
 * still under way a fortnight later, and visible to the player as a fleet
 * inbound to an island.
 */
export function clearWrecks(state: GameState): void {
  /**
   * Companies go down with the hulls they were riding in.
   *
   * This only ever looked at squadrons sunk to the last hull, so a squadron
   * that lost *some* of its ships kept every company aboard — riding in
   * berths that were on the bottom of the harbor. Measured over twenty-four
   * wars the audit caught it forty-three times, four companies in two berths
   * among them: free lift, and a landing party that should have drowned
   * putting itself ashore.
   *
   * Over the berths that are left, and the rest are lost. Deliberately here
   * rather than in the gunnery: this runs after every action at sea, after a
   * creature has had its turn, and after anything else that can take a hull,
   * so there is one place that says what happens to the people in it.
   */
  for (const fleet of state.fleets) {
    const berths = fleetCapacity(fleet);
    if (fleet.ships.length === 0 || fleet.troops <= berths) continue;
    const drowned = fleet.troops - berths;
    fleet.troops = berths;
    pushEvent(state, {
      kind: 'loss',
      text: `${drowned} ${drowned === 1 ? 'troop goes' : 'troops go'} down with the hulls ${
        fleet.name
      } lost.`,
      systemId: fleet.systemId,
    });
  }

  const gone = state.fleets.filter((f) => f.ships.length === 0);
  if (gone.length === 0) return;
  for (const fleet of gone) {
    for (const officer of officersOf(state, fleet)) officer.locationSystemId = fleet.systemId;
    fleet.officerIds = [];
    if (fleet.troops > 0) {
      pushEvent(state, {
        kind: 'loss',
        text: `${fleet.troops} ${fleet.troops === 1 ? 'troop goes' : 'troops go'} down with the last of ${fleet.name}.`,
        systemId: fleet.systemId,
      });
      fleet.troops = 0;
    }
  }
  state.fleets = state.fleets.filter((f) => f.ships.length > 0);
}

/**
 * What the spy aboard sees while the ship is at anchor.
 *
 * Espionage is the third rating and this is what it is for. Sixty of the
 * hundred islands start dark, and an island you have not charted cannot be
 * parleyed with — so a fleet with a good spy aboard is how the map opens up,
 * which makes ships the way you find things as well as the way you take them.
 */
function scoutFrom(state: GameState, fleet: Fleet, arrived: System): void {
  const best = officersOf(state, fleet).reduce((n, c) => Math.max(n, c.espionage), 0);
  const reach = Math.round(best / SCOUT_PER_ISLAND);
  if (reach <= 0) return;

  // What they can see from here: the rest of this chain, nearest first.
  const dark = state.systems
    .filter(
      (s) =>
        s.sectorId === arrived.sectorId &&
        s.id !== arrived.id &&
        !s.explored[fleet.faction],
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - arrived.x, a.y - arrived.y) -
        Math.hypot(b.x - arrived.x, b.y - arrived.y),
    )
    .slice(0, reach);
  if (dark.length === 0) return;

  for (const system of dark) system.explored[fleet.faction] = true;
  const sector = state.sectors.find((s) => s.id === arrived.sectorId);
  pushEvent(state, {
    kind: 'mission',
    text: `Boats out from ${fleet.name} chart ${dark.length} more ${
      dark.length === 1 ? 'island' : 'islands'
    } of ${sector?.name ?? 'the chain'}.`,
    systemId: arrived.id,
  });
}

/**
 * Wherever two sides lie in the same harbor, they fight — one day's action
 * per day, not one battle to the death, so a player can still withdraw.
 *
 * Deterministic: every roll comes from the seeded RNG carried in the state.
 */
/**
 * The fleets at an island that still have something to fight with.
 *
 * A fleet whose last hull went down in this round is still in `state.fleets`
 * until the day's wrecks are cleared, and counting it is how a finished action
 * goes on looking contested — the bug this exists to stop.
 */
export function fightingAt(state: GameState, systemId: string): Fleet[] {
  return fleetsAt(state, systemId).filter((f) => f.ships.length > 0);
}

/**
 * Is anybody in action at this island?
 *
 * Two ways to be. Two fleets in the same water is the obvious one. And
 * whatever is in the water is nobody's, does not care whose colours are
 * flying, and has anybody anchored there in action whether or not the other
 * side ever turns up.
 *
 * **A fort is not one of them, as of 18 September.** It used to be — *"a fort
 * is a warship that cannot weigh anchor"* — and the result was the screen Sean
 * caught: a squadron lying off Highwater, no enemy ship anywhere, losing a
 * hull a day to forty guns it could not touch, under a heading that called it
 * a broadside. That is not an action; there is nobody to fight. His ruling is
 * that harbor guns answer a bombardment and nothing else, which is also what
 * his own order of operations always said — *their fleet, then the blockade,
 * then the walls, then the landing*. The walls come after their fleet, so they
 * are not part of the fleet action. `bombardRound` is where the wall fires.
 */
export function contestedAt(state: GameState, system: System): boolean {
  const here = fightingAt(state, system.id);
  if (here.length === 0) return false;
  if (beastAlive(system)) return true;
  return here.some((f) => f.faction === 'empire') && here.some((f) => f.faction === 'alliance');
}

/**
 * The day's fighting, everywhere at once.
 *
 * Every contested island trades a round, the way it always has. What is new is
 * only that an action the player's own ships are in is *flagged* —
 * `state.battle` — so the UI can hold the clock and hand them the rest of the
 * fight round by round instead of reading them the result afterwards.
 *
 * The flag is an affordance and nothing more, which is the point of doing it
 * this way. The sim waits for nobody: if days keep passing, as they do in a
 * test or a balance run, the action is fought a round a day exactly as before
 * and the flag is simply overwritten each morning. Only a player holding the
 * clock makes it mean anything.
 *
 * One at a time. If the player is in two actions on the same day the second is
 * still fought — nobody's ships stand idle — but only the first is handed to
 * them; the other turns up in the log. Nobody should be asked to command two
 * battles in the same breath.
 */
export function resolveBattles(state: GameState, rng: Rng): void {
  // A new day: whatever was flagged last night is history. In the UI this is
  // already empty, because the clock does not run while an action is open.
  state.battle = undefined;
  const harbors = new Set(state.fleets.filter((f) => !isAtSea(f)).map((f) => f.systemId));
  for (const systemId of [...harbors].sort()) {
    const system = getSystem(state, systemId);
    if (!contestedAt(state, system)) continue;
    const here = fightingAt(state, systemId);
    // Nobody to hand it to when the player is only watching: observe mode
    // plays their side for them, and a battle sheet nobody answers stops the
    // clock for good. Fought in full either way; what changes is whether it
    // arrives as a question.
    const hand =
      !state.observing && here.some((f) => f.faction === state.player) && !state.battle;
    // Quiet in the dispatch sense only. It still goes in the log; what it does
    // not do is arrive as a card over the top of the battle sheet.
    const tally = fightRound(state, system, here, rng, hand);
    if (!hand) continue;
    // Note what the first exchange cost, but do not let them run from it.
    // Breaking off is a decision taken after you have seen what the other
    // fellow's broadside does, not before — and keeping it out of this path
    // means it only ever happens where the player can watch it, since the
    // rounds after the first are all fought from the battle sheet.
    const pending: PendingBattle = {
      systemId,
      rounds: 1,
      last: tally,
      // Counted before the round is read back, so "committed" means what came
      // to the fight rather than what survived the first broadside. The first
      // exchange has already happened by the time this runs, so the hulls it
      // sank are added back in.
      committed: {
        empire: countAt(state, 'empire', systemId) + tally.empire,
        alliance: countAt(state, 'alliance', systemId) + tally.alliance,
      },
    };
    state.battle = pending;
    pending.aboard = aboardAt(state, systemId);
    pending.settled = outcomeOf(state, system, pending);
    if (pending.settled) settleReport(state, pending, pending.settled);
  }
}

/**
 * Fight one more round of the action the player is in.
 *
 * Called from the battle sheet rather than from the clock, so the pace after
 * the first broadside is the player's. Afterwards three things can be true:
 * the action is over, the other side has had enough and runs, or there is
 * another broadside to trade.
 */
export function fightBattleRound(state: GameState, rng: Rng): void {
  const pending = state.battle;
  if (!pending || pending.settled) return;
  const system = getSystem(state, pending.systemId);
  const tally = fightRound(state, system, fightingAt(state, system.id), rng, true);
  pending.rounds += 1;
  pending.last = tally;
  pending.theyFled = enemyBreaksOff(state, system, rng);
  pending.settled = outcomeOf(state, system, pending);
  if (pending.settled) settleReport(state, pending, pending.settled);
  // The player fights an action round by round, outside the day's own pass,
  // so a squadron sunk here would sit on the board with no hulls until the
  // clock next turned. The wrecks go at the end of the round that made them.
  clearWrecks(state);
}

/**
 * Whether the action is over, and how.
 *
 * `undefined` means there is another broadside to trade. Anything else ends
 * it, and the sheet stays up showing which — the player ordered that round and
 * should see what it bought, rather than have the screen vanish under them.
 * Order matters: losing your last hull here is the answer even if the enemy
 * also broke off in the same round.
 */
function outcomeOf(
  state: GameState,
  system: System,
  pending: PendingBattle,
): BattleOutcome | undefined {
  const here = fightingAt(state, system.id);
  if (!here.some((f) => f.faction === state.player)) return 'lost';
  if (pending.theyFled) return 'they-fled';
  if (pending.last?.beastSlain && !contestedAt(state, system)) return 'beast-slain';
  if (!contestedAt(state, system)) return 'won';
  return undefined;
}

/**
 * Whether the other side has had enough, and runs if so.
 *
 * Their policy is the one a reasonable captain would follow and no cleverer:
 * break off when the guns still firing on the far side are twice yours and
 * there is somewhere to run to. Creatures are not covered by it — what a
 * creature does with a wound is its own business, and `stirBeasts` decides
 * that at the end of the day.
 */
function enemyBreaksOff(state: GameState, system: System, rng: Rng): boolean {
  const them = otherFaction(state.player);
  const theirs = fightingAt(state, system.id).filter((f) => f.faction === them);
  if (theirs.length === 0) return false;
  const theirGuns = theirs.reduce((n, f) => n + fleetGuns(f), 0);
  const mine =
    fightingAt(state, system.id)
      .filter((f) => f.faction === state.player)
      .reduce((n, f) => n + fleetGuns(f), 0);
  if (theirGuns === 0 || mine < theirGuns * BREAK_OFF_ODDS) return false;
  let ran = false;
  for (const fleet of theirs) {
    if (fleeError(state, fleet.id, them)) continue;
    fleeBattle(state, fleet.id, rng, them);
    ran = true;
  }
  return ran;
}

/**
 * Every wall standing on this island for whoever holds it, rubble aside.
 *
 * "Whoever holds it" now includes an island that holds itself. Both this and
 * `fortGuns` used to refuse anything but a side's own island, which was true
 * enough while only the two sides could build — but since 20 September a
 * settled unaligned island can open with a Fortress on it, and a wall that
 * cannot fire because nobody has claimed the ground is not a wall. The
 * `f.owner === system.control` test below is the one that matters and was
 * always the right one: it is the island's own garrison manning its own
 * battery, and `handOver` moves the deed with the island when it changes
 * hands. An abandoned island — control 'none' — still has nothing, because
 * nothing there matches.
 */
export function fortsOf(system: System): Facility[] {
  return system.facilities.filter(
    (f) => isWall(f.type) && f.owner === system.control && !f.building,
  );
}

/*
 * `wallCondition` stood here, and reported what was left of an island's walls
 * as a share of the stone they were built from. There is no such share any
 * more: a wall is standing or it is rubble, and nothing in between, which is
 * the whole of "nothing has hit points" from the change order. What replaced
 * the percentage on the panel is a count of batteries, which is also what the
 * bombardment die is actually rolled against.
 */

/**
 * The harbor's own guns, for whoever holds it.
 *
 * Scaled by what is left of the wall, so a battery that has been worked over
 * for three days fires like what it now is. It means the first day of a siege
 * is the dangerous one and every day after is cheaper, which is the right
 * shape for a siege and comes free with giving the wall a condition.
 */
/*
 * `underTheWall`, `fortGuns` and `wallGuns` stood here and are gone with the
 * daily tick. They existed only to let a wall shoot back during a bombardment
 * round, and per Sean's rule of 18 September — *"guns should be anti
 * bombardment only"* — they were already silent at any fleet not firing. With
 * rounds gone and ships taking no damage from stone, they have no trigger and
 * no target. A fort is an obstacle now, never a danger.
 */

/* ------------------------------------------------------------------- siege */

/**
 * What this squadron throws at the land in a day.
 *
 * A wrecked hull throws nothing, the same as it fires nothing.
 */
export function fleetBombard(fleet: Fleet): number {
  return fleet.ships.reduce((n, ship) => {
    const spec = shipSpec(ship.classId);
    if (ship.damage >= spec.hull) return n;
    // And a hull that has emptied its magazine throws nothing until it has
    // been home. Sean's rule: *"A ship can only bombard 5x before it has to go
    // back to a friendly port to resupply."* Counting it here rather than
    // refusing the whole action gives graceful degradation and correct
    // reinforcement for nothing: a squadron running dry gets weaker by the
    // hull, and a fresh ship joining it is worth exactly what it brings.
    if ((ship.bombardTicks ?? 0) >= BOMBARD_TICKS_MAX) return n;
    return n + spec.bombard;
  }, 0);
}

/** How many shots this squadron has left in it, as pips for the screen. */
export function fleetTicksLeft(fleet: Fleet): Array<{ shipId: string; left: number }> {
  return fleet.ships.map((ship) => ({
    shipId: ship.id,
    left: Math.max(0, BOMBARD_TICKS_MAX - (ship.bombardTicks ?? 0)),
  }));
}

/** Everything the island has that shot can be spent on, walls before men. */
export function islandDefenders(system: System): Shellable[] {
  const out: Shellable[] = fortsOf(system).map((f) => ({
    kind: 'wall' as const,
    cost: wallBombardDefense(f.type),
    ref: f.id,
  }));
  // A garrison is a number rather than a list of records, so the roster is
  // what says who each of those companies actually is — and therefore what it
  // costs a broadside to break.
  const roster = garrisonRoster(system);
  for (let i = 0; i < system.garrison; i++) {
    out.push({ kind: 'troop', cost: roster[i]?.bombardDefense ?? 2, ref: `troop-${i}` });
  }
  return out;
}

/** What the island stands at today — the number a player is owed beforehand. */
export function islandBombardDefense(system: System): number {
  return islandDefense(islandDefenders(system));
}

/**
 * Why this squadron cannot open fire on the island, if it cannot.
 *
 * The order of operations is Sean's and it is a sequence, not a menu: their
 * fleet, then the blockade, then the walls, then the landing. Each step is the
 * price of the next, which is why a defending squadron — however poor — is
 * worth keeping in the harbor: while it floats, nothing is being bombarded.
 */
export function bombardError(
  state: GameState,
  fleetId: string,
  actor: PlayableFaction,
): string | null {
  const fleet = findFleet(state, fleetId);
  if (!fleet) return 'No such fleet.';
  if (fleet.faction !== actor) return 'That fleet is not yours.';
  if (isAtSea(fleet)) return 'The fleet is at sea.';
  const system = getSystem(state, fleet.systemId);
  if (system.control === fleet.faction) return 'The island is already yours.';
  if (!system.populated && fortsOf(system).length === 0) return 'Nothing here to fire on.';
  if (fleetsAt(state, system.id).some((f) => f.faction !== fleet.faction && fleetGuns(f) > 0)) {
    return 'Their ships hold the harbor. Beat them first.';
  }
  // Two named refusals, and neither is a defeat. Sean's §6: *"the player
  // should not receive a generic 'Defeat' screen when the operation simply
  // failed to accomplish its bombardment objective."* A squadron out of shot
  // is a supply problem with an obvious answer; a squadron with nothing heavy
  // aboard never had the guns for it.
  if (fleet.ships.length > 0 && fleet.ships.every((sh) => (sh.bombardTicks ?? 0) >= BOMBARD_TICKS_MAX)) {
    return 'This squadron is out of shot. Put in at a port of yours to resupply.';
  }
  if (fleetBombard(fleet) <= 0) return 'Nothing aboard throws heavy enough to matter.';
  return null;
}

/**
 * What the player is told before a tick is spent, and the reason it must be
 * told: the top of the die *is* the fleet's bombardment score, so a squadron
 * under the island's number has no chance rather than poor odds.
 *
 * > "your squadron rolls at most 32; these walls stand at 40."
 */
export function bombardOdds(
  state: GameState,
  fleet: Fleet,
): { rolls: number; against: number; hopeless: boolean } {
  const system = getSystem(state, fleet.systemId);
  const defenders = islandDefenders(system);
  const against = islandDefense(defenders);
  const cheapest = Math.min(...defenders.map((d) => d.cost), Infinity);
  const rolls = fleetBombard(fleet);
  // To break anything at all you must roll the island's whole total plus the
  // cheapest thing on it.
  return { rolls, against, hopeless: rolls <= against + (Number.isFinite(cheapest) ? cheapest : 0) };
}

/**
 * One bombardment: ordered, rolled and over, in the moment you order it.
 *
 * Sean cut deliberate targeting and he is right — he has played Rebellion for
 * years and never once found shelling a granary worth doing, and a target
 * picker on a phone is a menu in the middle of a decision. So there is one
 * button and a hierarchy: shot goes at the walls while any stand, and only
 * when none do can it reach the garrison.
 *
 * What changed on 21 September is the pacing. This was a standing order that
 * fired once a morning and ground a wall's hit points down over a fortnight;
 * it is now a die roll that cascades. The fleet rolls 1d(its bombardment
 * score) against the island's total. Beat it and the margin is spent breaking
 * things cheapest-first; every wall that falls lowers the total, so the next
 * roll is easier and a hot streak levels an island in one action. Roll under
 * it and the action is over.
 *
 * One action, one tick from every ship that took part, however many rolls the
 * cascade ran.
 */
export function bombardNow(state: GameState, fleet: Fleet, rng: Rng): void {
  const system = getSystem(state, fleet.systemId);
  const wallsBefore = fortsOf(system).length;
  const score = fleetBombard(fleet);
  /*
   * Nothing to fire with, which is a *failed* operation and not a lost one.
   *
   * Sean's §6 is explicit that these are different screens: *"the player
   * should not receive a generic 'Defeat' screen when the operation simply
   * failed to accomplish its bombardment objective."*
   */
  if (score <= 0) {
    if (fleet.faction === state.player) {
      pushEvent(state, {
        kind: 'battle',
        text: `${fleet.name} can put nothing into the walls of ${inProse(system.name)}.`,
        systemId: system.id,
        report: bombardReport(state, system, 'defeat', {
          wallsDown: 0,
          wallsLeft: wallsBefore,
          companies: 0,
          civilian: 0,
          ripples: [],
          why: `${fleet.name} has not the guns left to work a wall.`,
        }),
      });
    }
    return;
  }

  /**
   * Whose news this is.
   *
   * It used to be "my fleet is doing it", which meant a player watching their
   * own capital being battered down was told nothing at all until the last
   * battery fell — the one thing in the game most worth knowing, and the log
   * was silent on it. A siege is news to both sides.
   */
  const mine = fleet.faction === state.player || system.control === state.player;

  const result = bombard(score, islandDefenders(system), rng);

  // One tick per ship that took part, whatever the cascade did.
  for (const ship of fleet.ships) {
    if (ship.damage >= shipSpec(ship.classId).hull) continue;
    if ((ship.bombardTicks ?? 0) >= BOMBARD_TICKS_MAX) continue;
    ship.bombardTicks = (ship.bombardTicks ?? 0) + 1;
  }

  // Stone first. A wall beaten down is rubble, and rubble does not mend —
  // patching a battery under fire is one thing, raising it again out of
  // nothing is a build order, which is exactly what a blockade prevents.
  const felled = result.destroyed.filter((d) => d.kind === 'wall');
  if (felled.length > 0) {
    const gone = new Set(felled.map((d) => d.ref));
    system.facilities = system.facilities.filter((f) => !gone.has(f.id));
  }
  // Then the men, once there was no stone left to stop the shot.
  const broken = result.destroyed.filter((d) => d.kind === 'troop').length;
  if (broken > 0) system.garrison = Math.max(0, system.garrison - broken);

  const ripples: Ripple[] = [];
  if (felled.length > 0 && mine) {
    pushEvent(state, {
      kind: system.control === state.player ? 'loss' : 'battle',
      text:
        fortsOf(system).length === 0
          ? `The last of the seawall at ${inProse(system.name)} is down. The landing is open.`
          : `A battery at ${inProse(system.name)} is beaten to rubble.`,
      systemId: system.id,
    });
  }
  if (felled.length > 0) {
    /*
     * Read as a military success rather than an atrocity. Sean's §14: shot
     * that destroys the enemy's soldiers without touching the town reads as
     * *"defeating the enemy military rather than attacking civilians"*, and is
     * worth a little goodwill instead of costing a lot.
     */
    ripples.push(
      ...applyShock(
        state,
        {
          systemId: system.id,
          faction: fleet.faction,
          scope: 'regional',
          local: SHOCK_MILITARY_FIRE.local,
          regional: SHOCK_MILITARY_FIRE.regional,
          news: `The batteries of ${inProse(system.name)} are down, and the town behind them is untouched. It is being told that way up and down ${reachName(state, system)}.`,
        },
        rng,
      ),
    );
  }

  /*
   * And the one thing in the game the whole world hears about.
   *
   * A flat one action in twenty, rolled once however long the cascade ran, and
   * five loyalty off every island in the Reach. It replaces a penalty that
   * escalated with how many days a town had been shelled — which was also a
   * real bug, because the counter was written and never cleared, so a town's
   * penalty latched at its cap and followed the island through changing hands.
   *
   * The shape of the political rule is unchanged and is Sean's §13: a large
   * loss on the island, a moderate shock through the Reach, and a very small
   * one everywhere else, because *"people across the region hear about the
   * destruction"* and not because every island changes sides.
   */
  if (result.civilian && system.populated) {
    ripples.push(
      ...applyShock(
        state,
        {
          systemId: system.id,
          faction: otherFaction(fleet.faction),
          scope: 'global',
          local: BOMBARD_CIVILIAN_LOYALTY,
          regional: BOMBARD_CIVILIAN_LOYALTY,
          global: SHOCK_CIVILIAN_FIRE.global,
          news: `${inProse(system.name)} was shelled over the heads of its people. The story is going everywhere a ship goes.`,
        },
        rng,
      ),
    );
    if (mine) {
      pushEvent(state, {
        kind: system.control === state.player ? 'loss' : 'battle',
        text: `Shot from ${fleet.name} finds the quarter behind the quay at ${inProse(system.name)}, and word of it runs through ${reachName(state, system)}.`,
        systemId: system.id,
      });
    }
  }

  if (fleet.faction !== state.player) return;
  const verdict: Verdict =
    fortsOf(system).length === 0 && wallsBefore > 0
      ? 'victory'
      : felled.length > 0 || broken > 0
        ? 'draw'
        : 'defeat';
  pushEvent(state, {
    kind: 'battle',
    text:
      verdict === 'victory'
        ? `${fleet.name} has silenced the harbor at ${inProse(system.name)}.`
        : `${fleet.name} works the walls of ${inProse(system.name)}.`,
    systemId: system.id,
    report: bombardReport(state, system, verdict, {
      wallsDown: felled.length,
      wallsLeft: fortsOf(system).length,
      companies: broken,
      civilian: result.civilian && system.populated ? 1 : 0,
      ripples,
      ledger: islandLedger(state, system, felled.length, broken),
      why:
        verdict === 'defeat'
          ? `${fleet.name} rolls at most ${score}; ${inProse(system.name)} stands at ${result.rolls[0]?.against ?? 0}.`
          : undefined,
    }),
  });
}

/**
 * What is left on the island and what went, as two columns.
 *
 * Counted by *kind* rather than listed one by one, which is the only way it
 * reads on a phone: "2 Fortresses" beats two rows saying Fortress. The
 * garrison's kinds come off the roster, which is the same list the Defenses
 * panel prints, so the screen and the panel never disagree about who was
 * standing there.
 */
function islandLedger(
  state: GameState,
  system: System,
  wallsDown: number,
  troopsBroken: number,
): Ledger[] {
  void state;
  const tally = (rows: Array<{ label: string }>): LedgerRow[] => {
    const seen = new Map<string, number>();
    for (const r of rows) seen.set(r.label, (seen.get(r.label) ?? 0) + 1);
    return [...seen].map(([label, count]) => ({ label, count }));
  };
  const standingWalls = fortsOf(system).map((f) => ({ label: FACILITY_LABEL[f.type] }));
  // Which walls went is not recorded kind by kind, and saying "1 Fortress"
  // when it was the Heavy one would be worse than saying "1 battery".
  const lostWalls: LedgerRow[] =
    wallsDown > 0 ? [{ label: wallsDown === 1 ? 'Battery' : 'Batteries', count: wallsDown }] : [];
  const roster = garrisonRoster(system);
  return [
    {
      side: system.name,
      faction: isPlayable(system.control) ? system.control : undefined,
      standing: [...tally(standingWalls), ...tally(roster.map((t) => ({ label: t.name })))],
      lost: [
        ...lostWalls,
        ...(troopsBroken > 0 ? [{ label: 'Troops broken', count: troopsBroken }] : []),
      ],
    },
  ];
}

/**
 * A bombardment's own outcome screen.
 *
 * Three states and none of them is "defeat" in the ordinary sense — a
 * bombardment either silences the harbor, knocks stones about without
 * silencing it, or achieves nothing at all. See §5 to §7.
 */
function bombardReport(
  state: GameState,
  system: System,
  verdict: Verdict,
  input: {
    wallsDown: number;
    wallsLeft: number;
    companies: number;
    civilian: number;
    ripples: Ripple[];
    why?: string;
    ledger?: Ledger[];
  },
): OperationReport {
  const { wallsDown, wallsLeft, companies, civilian, ripples, why, ledger } = input;
  const report: OperationReport = {
    kind: 'bombardment',
    verdict,
    headline:
      verdict === 'victory'
        ? 'Bombardment complete'
        : verdict === 'defeat'
          ? 'Bombardment failed'
          : 'Inconclusive',
    operation: 'Bombardment',
    title: `The guns off ${inProse(system.name)}`,
    systemId: system.id,
    day: state.day,
    people: [],
    damage: [
      { label: 'Batteries beaten down', value: wallsDown },
      { label: 'Batteries still standing', value: wallsLeft },
      { label: 'Defending troops broken', value: companies },
      { label: 'Shot into the town', value: civilian, civilian: true },
    ],
    control: isPlayable(system.control)
      ? `${factionData[system.control].shortName} holds ${inProse(system.name)}`
      : undefined,
    strategic: bombardStrategic({
      verdict,
      where: system.name,
      wallsDown,
      wallsLeft,
      companies,
      civilian,
      why,
    }),
    political: ripples,
    ledger,
  };
  report.tension =
    verdict !== 'victory' && civilian > 0
      ? 'Little taken, and a town that will not forget how it was done.'
      : tensionOf(report);
  return report;
}


/**
 * What a day does to a siege now, which is: nothing.
 *
 * There was a standing-order loop here — every squadron told to bombard fired
 * once each morning, and the order ended when it could no longer be carried
 * out. It is gone with the daily tick, and this is what is left of it: a ship
 * that has put in at a friendly port fills its magazine again.
 *
 * Sean: *"A ship can only bombard 5x before it has to go back to a friendly
 * port to resupply."* Going back is the whole cost, and it is a real one —
 * the squadron is off the island while it does, and the wall it left standing
 * is still standing when it returns.
 */
export function advanceSieges(state: GameState, rng: Rng): void {
  void rng;
  for (const fleet of state.fleets) {
    if (isAtSea(fleet)) continue;
    const here = state.systems.find((s) => s.id === fleet.systemId);
    if (!here || here.control !== fleet.faction || here.blockaded) continue;
    for (const ship of fleet.ships) if (ship.bombardTicks) ship.bombardTicks = undefined;
  }
  clearWrecks(state);
}

/**
 * What mends overnight.
 *
 * Nothing at sea — a squadron carries what was done to it until it stops
 * fighting. At anchor a hull comes back at a per cent of itself a day, twice
 * that at an island of yours with a yard that is working. A yard under
 * blockade is not working; the walls are patched anyway, because men with
 * shovels do their job under fire and shipwrights do not.
 */
export function repairOvernight(state: GameState): void {
  for (const fleet of state.fleets) {
    if (isAtSea(fleet)) continue;
    const here = state.systems.find((s) => s.id === fleet.systemId);
    const atAYard =
      here !== undefined &&
      here.control === fleet.faction &&
      !here.blockaded &&
      !here.uprising &&
      here.facilities.some((f) => f.type === 'shipyard' && f.owner === fleet.faction && !f.building);
    const rate = atAYard ? REPAIR_AT_A_YARD : REPAIR_PER_DAY;
    for (const ship of fleet.ships) {
      if (ship.damage <= 0) continue;
      ship.damage = Math.max(0, ship.damage - shipSpec(ship.classId).hull * rate);
    }
  }
  // Walls used to be patched here, a share of their own stone a night. There
  // is nothing to patch: a wall is standing or it is rubble, and rubble does
  // not mend. The percentage-patch against a flat bombardment was also the
  // cause of a silent bug worth remembering — any fleet throwing under 1.2 a
  // day could never scratch a Fortress and nothing anywhere said so, so a lone
  // Chimera would besiege an island until the end of the war.
}


/** One day's exchange of fire between the two sides in a harbor. */
/**
 * Everything at an island that can shoot, on one side, as combatants.
 *
 * A `Fighter` is a value with a mutable hull, so the exchange can work on it
 * without knowing anything about fleets, and `land` is what writes the result
 * back afterwards. The `combatant` beside it is the same hull in the older
 * shape, kept for the one thing that still speaks it: a creature's strike,
 * which takes a whole hull rather than firing at one.
 */
interface LineShip {
  /** What the guns see. */
  fighter: Fighter;
  /** The same hull as the old round saw it, for a creature's strike. */
  combatant: Combatant;
  /** Land the exchange's result back on the ship. */
  land: () => void;
}

function lineOf(fleets: Fleet[]): LineShip[] {
  const out: LineShip[] = [];
  for (const fleet of fleets) {
    for (const ship of fleet.ships) {
      const cls = shipClass(ship.classId);
      const spec = shipSpec(ship.classId);
      const fighter: Fighter = {
        id: ship.id,
        name: cls.name,
        size: cls.size ?? 'Medium',
        speed: cls.speedCategory ?? 'Normal',
        armor: cls.armor ?? 0,
        guns: { long: cls.longGuns ?? 0, heavy: cls.heavyGuns ?? 0, light: cls.lightGuns ?? 0 },
        // A hull with nothing aboard that fires is shot at last, which is
        // what makes a transport worth escorting.
        combatantType: spec.guns > 0 ? 'Warship' : 'Noncombat',
        wholeHull: spec.hull,
        hull: Math.max(0, spec.hull - ship.damage),
      };
      out.push({
        fighter,
        combatant: {
          guns: spec.guns,
          left: fighter.hull,
          whole: spec.hull,
          role: cls.role,
          hitChance: hitChanceOn(cls.role),
          hurt: (amount) => {
            ship.damage += amount;
            return ship.damage >= spec.hull;
          },
        },
        land: () => {
          ship.damage = Math.max(ship.damage, spec.hull - fighter.hull);
        },
      });
    }
  }
  return out;
}


/*
 * `wallOf` used to stand here, and put the island's own guns into the fleet
 * action as a combatant with an infinite hull that shot and could not be shot
 * at. It is gone with Sean's ruling of 18 September: harbor guns are answered
 * only by a bombardment, and a bombardment is the one place they fire. The
 * fort has not been weakened — `bombardRound` still opens with *"the wall
 * answers first, at what it still has"*, at full weight and against a fleet
 * that can now actually shoot back at it.
 */


/** Total damage standing on every hull in these fleets. */
function hurtIn(fleets: Fleet[]): number {
  return fleets.reduce((n, f) => n + f.ships.reduce((m, s) => m + s.damage, 0), 0);
}

/** The best leadership edge anywhere in a side's squadrons at this island. */
function bestEdge(state: GameState, fleets: Fleet[], rating: 'leadership' | 'combat'): number {
  return fleets.reduce((n, f) => Math.max(n, officerEdge(state, f, rating)), 1);
}

/**
 * What the day's action came to, in the log.
 *
 * Reported whenever anything happened at all — a hull lost, damage taken, or a
 * creature killed. Two fleets trading shot without a loss used to be a silent
 * day; it is not any more, because with real damage a round that sinks nothing
 * can still decide the next one.
 */
function reportRound(
  state: GameState,
  system: System,
  empire: Fleet[],
  alliance: Fleet[],
  before: { empire: number; alliance: number; hurt: number },
  killedBeast: boolean,
  quiet: boolean,
): void {
  const beast = beastAt(system);
  if (killedBeast && beast) {
    pushEvent(state, {
      kind: 'battle',
      text: `${beast.name} is killed off ${inProse(system.name)}. The water there is only water now.`,
      systemId: system.id,
      quiet,
    });
  }
  const after = {
    empire: empire.reduce((n, f) => n + f.ships.length, 0),
    alliance: alliance.reduce((n, f) => n + f.ships.length, 0),
  };
  const lostEmpire = before.empire - after.empire;
  const lostAlliance = before.alliance - after.alliance;
  if (lostEmpire === 0 && lostAlliance === 0) {
    // Two fleets trading shot without sinking anything is a quiet day and the
    // log has always left it out. A creature is not: it can chew a squadron
    // for a week without taking a hull down, and a player watching damage
    // climb with nothing in the log has no way to find out why.
    const damage = hurtIn([...empire, ...alliance]) - before.hurt;
    if (beast && beastAlive(system) && damage > 0) {
      pushEvent(state, {
        kind: 'battle',
        text: `${beast.name} is at the hulls off ${inProse(system.name)}. ${damage} taken and nothing sunk${
          system.beastDamage ? `; it has ${system.beastDamage} of ${beast.hull} in it` : ''
        }.`,
        systemId: system.id,
        quiet,
      });
    }
    return;
  }
  const tally = (n: number) => `${n} ${n === 1 ? 'hull' : 'hulls'}`;
  // In the action, rather than alive at the end of it. A creature killed by
  // the same broadside it struck back with was in the fight and belongs on the
  // card — it used to drop off the report of its own last round, which read as
  // an ordinary action that cost two hulls for no reason anybody could see.
  const alive = beast !== undefined && (beastAlive(system) || killedBeast);
  // Mid-sentence, so the creature's article goes lowercase: "against the
  // Derelict", not "against The Derelict". Same rule and the same miss as the
  // rumour line in `creatures.ts` — a name with a definite article in it needs
  // `inProse` everywhere it is not the first word.
  const against = alive ? ` against ${inProse(beast!.name)}` : '';
  // Only the sides that were actually in the water get named. A squadron
  // alone with a creature is one faction and a monster, and saying "the
  // Confederacy loses 0 hulls" about a side that never sailed reads as an
  // enemy fleet that came through untouched.
  const wasThere: Array<[PlayableFaction, number]> = [
    ['empire', lostEmpire],
    ['alliance', lostAlliance],
  ];
  const losses = wasThere
    .filter(([side]) => before[side] > 0)
    .map(([side, lost]) => `the ${factionData[side].shortName} ${tally(lost)}`)
    .join(', ');
  pushEvent(state, {
    kind: 'battle',
    text: `Action off ${inProse(system.name)}${against}. ${losses ? `${losses[0].toUpperCase()}${losses.slice(1)} lost.` : 'Nothing afloat on either side.'}`,
    systemId: system.id,
    quiet,
    battle: {
      sides: {
        empire: {
          hulls: before.empire,
          lost: lostEmpire,
          guns: empire.reduce((n, f) => n + fleetGuns(f), 0),
        },
        alliance: {
          hulls: before.alliance,
          lost: lostAlliance,
          guns: alliance.reduce((n, f) => n + fleetGuns(f), 0),
        },
      },
      holder: system.control,
      beast:
        alive && beast
          ? {
              name: beast.name,
              guns: beastGuns(system),
              damage: system.beastDamage ?? 0,
              hull: beast.hull,
            }
          : undefined,
    },
  });
}

/**
 * One day's exchange of fire at an island, and what it cost.
 *
 * `quiet` keeps the round out of the dispatch cards — not out of the log. It
 * is set for the action the player is being handed, where the battle sheet is
 * the report and a card over the top of it would be the same news twice.
 */
function fightRound(
  state: GameState,
  system: System,
  here: Fleet[],
  rng: Rng,
  quiet = false,
): NonNullable<PendingBattle['last']> {
  const empire = here.filter((f) => f.faction === 'empire');
  const alliance = here.filter((f) => f.faction === 'alliance');
  const before = {
    empire: empire.reduce((n, f) => n + f.ships.length, 0),
    alliance: alliance.reduce((n, f) => n + f.ships.length, 0),
    hurt: hurtIn([...empire, ...alliance]),
    // In guns, for the politics of it: Sean's §15 scales a fleet action's
    // political weight by the importance of what went down, and a sloop and a
    // first-rate are not the same news.
    empireGuns: empire.reduce((n, f) => n + fleetGuns(f), 0),
    allianceGuns: alliance.reduce((n, f) => n + fleetGuns(f), 0),
  };

  // The two navies, as the per-cannon engine wants them: a hull with a size,
  // a speed, an armor belt and three kinds of gun, and a way back to the ship
  // it came from so the damage can be landed when the firing stops.
  const empireLine = lineOf(empire);
  const allianceLine = lineOf(alliance);
  const beast = beastFighter(system);

  // Leadership tells here, as it always has: a well-handled squadron gets more
  // out of the same guns. It is a hit-chance edge now rather than a multiplier
  // on a pool, which is the same idea at the level the round actually works.
  const empireEdge = bestEdge(state, empire, 'leadership');
  // The Admiral's power, and it is a posting now rather than a hull: while
  // Jessup holds this island, every Confederate fleet in its harbor fights
  // under his command whether or not he is aboard any of them.
  const admiral = lordPowerAt(state, system.id, 'line');
  const allianceEdge = Math.max(
    bestEdge(state, alliance, 'leadership'),
    admiral ? 1 + (admiral.leadership / 100) * OFFICER_EDGE : 1,
  );

  /*
   * One Combat Exchange, by the locked rules: long guns first and on their
   * own, then light and heavy together, both phases simultaneous, and the
   * whole thing stopping when a side has lost thirty per cent of the hull it
   * came in with. Eight or so internal rounds, which is what the sheet's own
   * simulator reports and what `cannon.test.ts` measures this against.
   *
   * A day is one Exchange. The old round was one shot per hull per day, which
   * is the same shape at a different grain — what changed is that the grain is
   * now the one the roster was priced on.
   */
  if (empireLine.length > 0 && allianceLine.length > 0) {
    exchange(
      empireLine.map((l) => l.fighter),
      allianceLine.map((l) => l.fighter),
      rng,
      100,
      { a: empireEdge, b: allianceEdge },
    );
  }

  /*
   * And then the thing in the water, which is nobody's.
   *
   * It is resolved after the fleet action and against everybody at once,
   * because it is on no side and the Exchange has two of them. Every hull
   * still afloat fires at it; it answers with `monsterStrike`, which is the
   * whole of its offence and is not a broadside — the Kraken takes a hull
   * down entire, sound or not, and no amount of armor is any use against that.
   */
  let killed = false;
  if (beast) {
    const guns = [...empireLine, ...allianceLine].filter((l) => l.fighter.hull > 0);
    if (guns.length > 0) {
      exchange(guns.map((l) => l.fighter), [beast], rng, 1, { a: 1, b: 1 });
      landBeastDamage(system, beast);
      killed = beast.hull <= 0 && !system.beastSlain;
    }
    // It strikes whether or not that broadside finished it, for the same
    // reason a hull sunk in a phase still fires: it was alive when the round
    // opened. Without this a creature met by anything heavy enough to kill it
    // outright never touched anybody, and a squadron that lost nothing was
    // reported as a line with no tally on it.
    const targets = [...empireLine, ...allianceLine]
      .filter((l) => l.fighter.hull > 0)
      .map((l) => l.combatant);
    for (let i = 0; i < monsterShots(system) && targets.length > 0; i++) {
      const target = pickTarget(targets, rng);
      if (target) monsterStrike(state, system, target, rng);
    }
  }

  // The firing is over; land it on the ships.
  for (const line of [...empireLine, ...allianceLine]) line.land();

  if (killed) {
    const fromEmpire = empireLine.reduce((n, l) => n + l.fighter.guns.long + l.fighter.guns.heavy + l.fighter.guns.light, 0);
    const fromAlliance = allianceLine.reduce((n, l) => n + l.fighter.guns.long + l.fighter.guns.heavy + l.fighter.guns.light, 0);
    system.beastSlain = fromEmpire >= fromAlliance ? 'empire' : 'alliance';
    system.beastDamage = beastAt(system)!.hull;
  }

  for (const fleet of [...empire, ...alliance]) sinkAndDrown(state, fleet);
  reportRound(state, system, empire, alliance, before, killed, quiet);
  const after = fleetsAt(state, system.id);
  const count = (side: PlayableFaction) =>
    after.filter((f) => f.faction === side).reduce((n, f) => n + f.ships.length, 0);
  /*
   * And who, if anybody, won something worth talking about.
   *
   * Sean's propagation memo, §15: *"destroying a significant enemy capital
   * fleet should produce a regional political effect... destroying a small
   * patrol should have negligible political impact; destroying a major battle
   * fleet should have substantial regional impact."* So it is weighed in guns
   * that went to the bottom rather than hulls, floored so a sloop run down in
   * a corner is nobody's business, and capped so one enormous afternoon does
   * not decide the political war on its own.
   *
   * The side that came off better is the one the news favours, and it is the
   * *difference* that counts: two fleets that wrecked each other are a
   * bloodbath, not a victory, and the Reach has nothing to say about it.
   */
  const lost = {
    empire: before.empireGuns - here.filter((f) => f.faction === 'empire').reduce((n, f) => n + fleetGuns(f), 0),
    alliance: before.allianceGuns - here.filter((f) => f.faction === 'alliance').reduce((n, f) => n + fleetGuns(f), 0),
  };
  const margin = Math.abs(lost.empire - lost.alliance);
  if (margin >= SHOCK_BATTLE_FLOOR && before.empire > 0 && before.alliance > 0) {
    const victor: PlayableFaction = lost.empire < lost.alliance ? 'empire' : 'alliance';
    applyShock(
      state,
      {
        systemId: system.id,
        faction: victor,
        scope: 'regional',
        local: 0,
        regional: Math.min(SHOCK_BATTLE_CEILING, margin * SHOCK_PER_GUN_SUNK),
        news: `The ${factionData[victor].shortName} has the better of an action off ${inProse(system.name)}, and ${reachName(state, system)} is counting the wrecks.`,
      },
      rng,
    );
  }

  return {
    empire: before.empire - count('empire'),
    alliance: before.alliance - count('alliance'),
    hurt: hurtIn(after) - before.hurt,
    beastSlain: killed,
  };
}


function hullOf(ship: Ship): number {
  return shipSpec(ship.classId).hull;
}

/** Clear the wrecks, and drown whatever companies were aboard them. */
function sinkAndDrown(state: GameState, fleet: Fleet): void {
  const survivors = fleet.ships.filter((s) => s.damage < hullOf(s));
  if (survivors.length === fleet.ships.length) return;
  fleet.ships = survivors;
  const room = fleetCapacity(fleet);
  if (fleet.troops > room) {
    const lost = fleet.troops - room;
    fleet.troops = room;
    pushEvent(state, {
      kind: 'loss',
      text: `${lost} ${lost === 1 ? 'troop goes' : 'troops go'} down with ${fleet.name}.`,
    });
  }
}

/**
 * Put companies ashore against a garrison. Numbers decide it, with a roll for
 * the surf: the attacker needs to outnumber the defence to carry the island.
 */
export function resolveLanding(state: GameState, fleet: Fleet, rng: Rng): void {
  const system = getSystem(state, fleet.systemId);
  /*
   * A landing, by the rules of 20 September.
   *
   * > ATTACK = 1d(sum of Attack across every landed troop)
   * > DEFENSE = 1d(sum of Invasion Defense across defending troops, PLUS every
   * > standing wall)
   *
   * It used to be a comparison of two counts with a coin toss for the tie, and
   * a standing fortress forbade the landing outright. That gate is repealed:
   * you may always land, and the walls swell the defender's die instead. So
   * bombardment is softening rather than a turnstile, and the two systems
   * finally trade against each other — six Crown Marines take a militia island
   * 74% of the time with a Heavy Fortress standing and 98% with it in rubble.
   */
  const grade = craftGrade(state.factions[fleet.faction].craft);
  const kind = landingTroop(fleet.faction, grade);
  // Combat tells here, for the same reason it always has: companies led
  // ashore by somebody who knows the business go further than the same
  // companies alone. It weights the die rather than the count.
  const edge = officerEdge(state, fleet, 'combat');
  const landed = fleet.troops;
  const garrisonBefore = system.garrison;
  const roster = garrisonRoster(system);
  const mine: Landed[] = Array.from({ length: landed }, () => ({
    score: Math.max(1, Math.round(kind.attack * edge)),
    id: kind.id,
  }));
  const theirs: Landed[] = Array.from({ length: garrisonBefore }, (_, i) => ({
    score: roster[i]?.invasionDefense ?? 20,
    id: roster[i]?.id ?? 'garrison',
  }));
  const walls = fortsOf(system).reduce((n, f) => n + wallInvasionDefense(f.type), 0);
  const fought = invade(mine, theirs, walls, rng);

  const attackerWins = fought.taken;
  fleet.troops = fought.attackers.length;
  system.garrison = fought.defenders.length;
  const report = {
    attacker: fleet.faction,
    landed,
    defenders: garrisonBefore,
    lost: landed - fleet.troops,
    defendersLost: garrisonBefore - system.garrison,
    taken: attackerWins,
  };

  if (!attackerWins) {
    /*
     * Thrown back — but not necessarily *beaten*, and that is Sean's §10.
     *
     * A landing that failed and left nothing aboard is a defeat: there is
     * nothing ashore and nothing left to try again with, and the defender has
     * decisively prevailed. A landing that failed with companies still in the
     * hold is **inconclusive** — *"both forces remain capable of continuing
     * operations... the assault objective was not achieved"* — and it must not
     * be presented as the same thing. It is the same rule that already lives
     * in `resolveLanding`; what is new is that the screen now says which of
     * the two happened rather than printing "thrown back" for both.
     */
    const again = fleet.troops > 0;
    pushEvent(state, {
      kind: 'battle',
      text: again
        ? `The landing on ${inProse(system.name)} is thrown back, and the boats pull for the ships.`
        : `The landing on ${inProse(system.name)} is thrown back into the sea.`,
      systemId: system.id,
      landing: report,
      ...(fleet.faction === state.player || system.control === state.player
        ? {
            report: assaultReport(state, system, again ? 'draw' : 'defeat', {
              attacker: fleet.faction,
              landed,
              lost: landed - fleet.troops,
              ashore: 0,
              aboard: fleet.troops,
              defenders: garrisonBefore,
              defendersLost: garrisonBefore - system.garrison,
              ripples: [],
              kind: kind.name,
              holdingKind: roster[0]?.name,
            }),
          }
        : {}),
    });
    return;
  }

  // Enough ashore to hold it quiet, and the rest stay aboard.
  //
  // Sean: *"a number of troops required to occupy it without uprising will be
  // automatically deployed there, or it'll go into uprising if there's not
  // enough remaining, and whatever overflow there is will stay on the fleet."*
  // Every surviving company used to go over the side, which emptied a squadron
  // at the first island it took and ended the campaign there.
  const survivors = fleet.troops;
  // A stormed island is sullen, so what holds it quiet is read at what its
  // regard will be once it is yours, not what it was under them.
  const hold = Math.max(1, requiredGarrison(35));
  const holding = Math.min(survivors, hold);
  fleet.troops = survivors - holding;
  system.garrison = holding;
  system.control = fleet.faction;
  // And everything standing on it. What was being built when the boats came
  // in is lost with the old holder.
  handOver(state, system, fleet.faction);

  /**
   * And everyone standing on it.
   *
   * Sean's rule, 16 September. An officer caught on an island the moment it is
   * stormed goes into the cells with the garrison — including one in the
   * middle of an errand there, which is most of the point: the people worth
   * catching are the ones doing something. Officers at sea are not caught,
   * because they are at sea.
   *
   * The consequence is the interesting part, and it is the one Sean drew:
   * taking every island takes every Lord. The Crown's victory condition used
   * to be a manhunt it could never quite close — hold all three at once, while
   * the Brethren come for each one in turn — and a Crown that had conquered
   * sixty-three islands of sixty-four still had no way to end the war. Now the
   * conquest *is* the manhunt's last move.
   */
  for (const caught of caughtOnLanding(state, system, fleet.faction)) {
    takePrisoner(state, caught, fleet.faction);
    pushEvent(state, {
      kind: 'loss',
      // Every capture raises a card. See `notable` on GameEvent.
      notable: true,
      text: `${caught.name} was taken on ${inProse(system.name)} when it fell, and is held at ${
        getSystem(state, caught.locationSystemId).name
      }.`,
      systemId: system.id,
      characterId: caught.id,
    });
  }
  /**
   * And your own, out of the cells.
   *
   * An island holding your people is a rescue you can do with a fleet instead
   * of an officer. Storming the gaol is the oldest rescue there is and it
   * would be strange for the one thing a landing could not free to be a
   * prisoner sitting in the building you just took.
   */
  for (const freed of state.characters) {
    if (freed.faction !== fleet.faction || freed.status !== 'captured') continue;
    if (freed.locationSystemId !== system.id) continue;
    freed.status = 'available';
    freed.injuredDays = undefined;
    pushEvent(state, {
      kind: 'mission',
      // And every rescue. Sean asked for *"captures (and probably rescues)"*.
      notable: true,
      text: `${freed.name} is out of the cells at ${inProse(system.name)}, freed by the landing.`,
      systemId: system.id,
      characterId: freed.id,
    });
    restoreLord(state, freed);
  }
  system.explored[fleet.faction] = true;
  // A landing that only just carried the place has not brought enough to sit
  // on it, and the island says so at once rather than a fortnight later.
  //
  // Unless there is nobody on it. Sean's playtest: *"Coralhome (uninhabited)
  // shows MUTINY, and the assault report says 'the people did not want
  // this.'"* A rock with a landing party on it and no islanders has nobody to
  // rise, whatever the garrison a populated island of that size would want.
  system.uprising = system.populated && holding < hold;
  // An island taken at gunpoint does not love you for it: enough regard to
  // hold it above a revolt, and no more. The rest of the island's feeling is
  // the other side's, which is what taking a place by storm buys you.
  const welcome = system.support[fleet.faction];
  setSupport(system, fleet.faction, Math.max(system.support[fleet.faction], 35));

  /*
   * And the Reach makes up its mind about how it was done.
   *
   * Sean's §11 and §12 are one rule with a sign, and the sign is what the
   * island itself wanted. Landing on people who were already yours is a
   * liberation and *"nearby islands receive a smaller positive effect"*;
   * landing on people who were not is a conquest, and the neighbours *"become
   * somewhat less supportive of the invader"* — the political cost of taking
   * a place by storm. The same two hundred marines, a day's sail apart, and a
   * different piece of news each time.
   */
  const ripples: Ripple[] = [];
  if (system.populated) {
    ripples.push(
      ...applyShock(
        state,
        landingShock(
          state,
          { ...system, support: { ...system.support, [fleet.faction]: welcome } } as System,
          fleet.faction,
          SHOCK_CONQUEST.local,
          SHOCK_CONQUEST.regional,
          SHOCK_LIBERATION_LEVEL,
        ),
        rng,
      ),
    );
  }

  const aboardStill = fleet.troops > 0 ? `, ${fleet.troops} more stay aboard` : '';
  pushEvent(state, {
    kind: 'flip',
    text: system.populated
      ? `${system.name} is carried by storm. ${holding} ${holding === 1 ? 'troop holds' : 'troops hold'} it${aboardStill}, and the people are sullen.`
      : `${system.name} is occupied. ${holding} ${holding === 1 ? 'troop is' : 'troops are'} ashore on an empty island${aboardStill}, and there is nobody on it to mind.`,
    systemId: system.id,
    landing: report,
    ...(fleet.faction === state.player || system.control === state.player
      ? {
          report: assaultReport(state, system, 'victory', {
            attacker: fleet.faction,
            landed,
            lost: landed - survivors,
            ashore: holding,
            aboard: fleet.troops,
            defenders: garrisonBefore,
            defendersLost: garrisonBefore,
            ripples,
            kind: kind.name,
            holdingKind: roster[0]?.name,
          }),
        }
      : {}),
  });
}

/**
 * A landing's own outcome screen.
 *
 * §8's sentence is the one that decides the shape of it: *"military capture
 * does not automatically equal political allegiance."* So an island carried by
 * storm shows **who holds it** and, separately, **what its people think** —
 * *Occupied — politically hostile* — and the two are never conflated. The
 * other two states are §9 and §10: thrown back with nothing left to try again
 * with, against thrown back with the boats still full.
 */
function assaultReport(
  state: GameState,
  system: System,
  verdict: Verdict,
  input: {
    attacker: PlayableFaction;
    landed: number;
    lost: number;
    ashore: number;
    aboard: number;
    defenders: number;
    defendersLost: number;
    ripples: Ripple[];
    kind?: string;
    holdingKind?: string;
  },
): OperationReport {
  const { attacker, landed, lost, ashore, aboard, defenders, defendersLost, ripples } = input;
  const defender = otherFaction(attacker);
  const holder = isPlayable(system.control) ? factionData[system.control].shortName : 'Nobody';
  const report: OperationReport = {
    kind: 'assault',
    verdict,
    headline:
      verdict === 'victory'
        ? 'Island taken'
        : verdict === 'defeat'
          ? 'Assault repulsed'
          : 'Assault inconclusive',
    operation: 'Assault',
    title: `The assault of ${inProse(system.name)}`,
    systemId: system.id,
    day: state.day,
    mine: {
      faction: attacker,
      name: forceName(attacker, 'assault'),
      committed: landed,
      destroyed: lost,
      damaged: 0,
      surviving: ashore + aboard,
      roster: [],
    },
    theirs: {
      faction: defender,
      name: `${factionData[defender].shortName} garrison`,
      committed: defenders,
      destroyed: defendersLost,
      damaged: 0,
      surviving: Math.max(0, defenders - defendersLost),
      roster: [],
    },
    people: [],
    damage: [
      { label: 'Troops ashore, holding', value: ashore },
      { label: 'Troops still aboard', value: aboard },
    ],
    control: `${holder} holds ${inProse(system.name)}`,
    strategic: assaultStrategic({
      verdict,
      where: system.name,
      holder,
      aboard,
      allegiance: Math.round(system.support[attacker]),
      populated: system.populated,
    }),
    political: ripples,
    /*
     * Both sides, standing and lost. Sean's ask of 21 September: *"you can see
     * both sides, like what was destroyed and what was still there."*
     *
     * A landing force is counted in companies of one kind — whoever the side
     * puts in the boats — and the defenders in whatever the island raises, so
     * the two columns name units rather than saying "6" and "4".
     */
    ledger: [
      {
        side: forceName(attacker, 'assault'),
        faction: attacker,
        standing: ashore + aboard > 0 ? [{ label: input.kind ?? 'Troops', count: ashore + aboard }] : [],
        lost: lost > 0 ? [{ label: input.kind ?? 'Troops', count: lost }] : [],
      },
      {
        side: forceName(defender, 'assault'),
        faction: defender,
        standing:
          defenders - defendersLost > 0
            ? [{ label: input.holdingKind ?? 'Troops', count: defenders - defendersLost }]
            : [],
        lost: defendersLost > 0 ? [{ label: input.holdingKind ?? 'Troops', count: defendersLost }] : [],
      },
    ],
  };
  report.tension =
    verdict === 'victory' && system.populated && system.support[attacker] < 40
      ? 'The island is yours and its people are not, which is two different problems.'
      : tensionOf(report);
  return report;
}

/**
 * An enemy fleet lying off an island you hold stops its trade. The island
 * still costs you upkeep; it simply stops paying.
 */
export function isBlockaded(state: GameState, system: System): boolean {
  if (system.control !== 'empire' && system.control !== 'alliance') return false;
  const enemy = otherFaction(system.control);
  const hostile = fleetsAt(state, system.id)
    .filter((f) => f.faction === enemy)
    .reduce((n, f) => n + fleetGuns(f), 0);
  // Any enemy gun in the water shuts the port. There used to be a floor here,
  // held up by the chain across the harbor mouth; the chain is gone.
  return hostile >= 1;
}

/** Stamp today's blockades onto the islands, so the economy can read them. */
export function updateBlockades(state: GameState): void {
  for (const system of state.systems) {
    const shut = isBlockaded(state, system);
    if (shut === !!system.blockaded) continue;
    system.blockaded = shut;
    pushEvent(state, {
      kind: shut ? 'loss' : 'order',
      text: shut
        ? `Enemy sail off ${inProse(system.name)}. Nothing is getting out of that harbor.`
        : `The blockade of ${inProse(system.name)} is lifted.`,
      systemId: system.id,
    });
  }
}

// --- Breaking off ----------------------------------------------------------

/**
 * Where a beaten fleet runs to: the nearest island you hold.
 *
 * Sean's rule, and it is the right one — "flee" in a game with a chart has to
 * mean somewhere, and the only answer that never needs a second question is
 * home ground. Nearest by the water, not by the chart's chain structure, so a
 * squadron broken off in the Bone Sea runs to the Bone Sea holding rather than
 * back across the world.
 */
export function refugeFor(state: GameState, fleet: Fleet): System | undefined {
  const here = getSystem(state, fleet.systemId);
  const mine = state.systems.filter((s) => s.control === fleet.faction && s.id !== here.id);
  if (mine.length === 0) return undefined;
  return mine.reduce((best, s) =>
    Math.hypot(s.x - here.x, s.y - here.y) < Math.hypot(best.x - here.x, best.y - here.y) ? s : best,
  );
}

export function fleeError(state: GameState, fleetId: string, actor: PlayableFaction): string | null {
  const fleet = findFleet(state, fleetId);
  if (!fleet) return 'No such fleet.';
  if (fleet.faction !== actor) return 'That fleet is not yours.';
  if (isAtSea(fleet)) return 'The fleet is already at sea.';
  const system = getSystem(state, fleet.systemId);
  const enemies = fleetsAt(state, system.id).some(
    (f) => f.faction !== fleet.faction && fleetGuns(f) > 0,
  );
  // A fort is never something to break off from. It was, while a wall fired
  // back at a squadron bombarding it; a wall is an obstacle now and fires at
  // nobody, so there is nothing to run from but ships and what is in the water.
  if (!enemies && !beastAlive(system)) {
    return 'Nothing to break off from.';
  }
  if (!refugeFor(state, fleet)) return 'Nowhere to run to.';
  // Cut off. A squadron four times your weight, with something fast enough to
  // stay with you, does not stand and watch you go.
  const hunters = fleetsAt(state, system.id).filter((f) => f.faction !== fleet.faction);
  const theirGuns = hunters.reduce((n, f) => n + fleetGuns(f), 0);
  const mine = fleetGuns(fleet);
  const fastest = Math.max(0, ...fleet.ships.map((sh) => shipSpec(sh.classId).speed));
  const chaser = hunters.some((f) => f.ships.some((sh) => shipSpec(sh.classId).speed >= fastest));
  if (mine > 0 && theirGuns >= mine * PURSUIT_ODDS && chaser) {
    return 'They have the weather gauge and the legs. There is no getting clear of this.';
  }
  return null;
}

/**
 * Break off: take the parting volley, then run for the nearest island you hold.
 *
 * Fleeing always works — there is no roll that keeps you in a fight you have
 * decided to leave. What it costs is the run itself. Only guns that reach can
 * touch a fleet already going, which is what makes Long Guns worth building
 * and early disengagement nearly free; and how many shots each hull eats is
 * its speed, which is what makes a first-rate an expensive thing to have to
 * withdraw.
 */
export function fleeBattle(
  state: GameState,
  fleetId: string,
  rng: Rng,
  actor: PlayableFaction,
): void {
  const error = fleeError(state, fleetId, actor);
  if (error) throw new Error(error);
  const fleet = findFleet(state, fleetId)!;
  const system = getSystem(state, fleet.systemId);
  const refuge = refugeFor(state, fleet)!;

  // Everything at this island that can reach a fleet under way. A hull can
  // reach only if she carries long guns. A creature always can — it is in the
  // water with you, and being unable to outswim the Kraken is the point.
  //
  // A wall used to be on this list, at a share of its guns, for a squadron
  // that had opened on it. Walls do not fire any more.
  const reaching: Array<{ guns: number }> = [];
  for (const other of fleetsAt(state, system.id)) {
    if (other.faction === fleet.faction) continue;
    for (const ship of other.ships) {
      const spec = shipSpec(ship.classId);
      if (!spec.longGuns) continue;
      reaching.push({ guns: Math.round(spec.guns * LONG_GUN_SHARE) });
    }
  }
  const monster = beastCombatant(system);
  if (monster) reaching.push({ guns: Math.round(monster.guns * LONG_GUN_SHARE) });

  if (reaching.length > 0) {
    for (const ship of [...fleet.ships]) {
      const spec = shipSpec(ship.classId);
      const band = RETREAT_SHOTS[Math.max(1, Math.min(10, spec.speed))] ?? [1, 1];
      const shots = band[0] + (band[1] > band[0] ? rng.int(band[1] - band[0] + 1) : 0);
      const target: Combatant = {
        guns: spec.guns,
        left: spec.hull - ship.damage,
        whole: spec.hull,
        role: shipClass(ship.classId).role,
        hitChance: hitChanceOn(shipClass(ship.classId).role),
        hurt: (amount) => {
          ship.damage += amount;
          return ship.damage >= spec.hull;
        },
      };
      for (let i = 0; i < shots && target.left > 0; i++) {
        const gun = reaching[rng.int(reaching.length)];
        const done = fireOnce(gun, target, rng);
        target.left -= done;
      }
    }
    const lost = fleet.ships.filter((s) => s.damage >= shipSpec(s.classId).hull).length;
    sinkAndDrown(state, fleet);
    if (fleet.faction === state.player) {
      pushEvent(state, {
        kind: 'battle',
        text: lost > 0
          ? `${fleet.name} breaks off from ${inProse(system.name)} under long guns and loses ${lost} ${lost === 1 ? 'hull' : 'hulls'} getting clear.`
          : `${fleet.name} breaks off from ${inProse(system.name)} under long guns and gets clear.`,
        systemId: system.id,
      });
    }
  }

  if (fleet.ships.length === 0) {
    state.fleets = state.fleets.filter((f) => f.id !== fleet.id);
    return;
  }
  fleet.voyage = { targetSystemId: refuge.id, daysRemaining: sailDays(state, fleet.id, refuge.id) };
  if (fleet.faction === state.player) {
    pushEvent(state, {
      kind: 'order',
      text: `${fleet.name} runs for ${inProse(refuge.name)}.`,
      systemId: system.id,
    });
  }
}

/* ---------------------------------------------------------------- the sheet */

export type BattleOdds =
  | 'overwhelming'
  | 'favorable'
  | 'even'
  | 'unfavorable'
  | 'desperate';

export const BATTLE_ODDS_LABEL: Record<BattleOdds, string> = {
  overwhelming: 'Overwhelmingly favorable',
  favorable: 'Favorable',
  even: 'Even',
  unfavorable: 'Unfavorable',
  desperate: 'Desperate',
};

/**
 * How the action looks from your quarterdeck, in five words.
 *
 * Rebellion prints one of these over every battle and it is most of what the
 * screen is for: a player who has to add up two columns of guns to find out
 * whether to run is being given arithmetic instead of a decision. Guns still
 * firing, both sides, the shore counted for whoever holds it and the creature
 * counted against everybody.
 */
export function battleOdds(mine: number, theirs: number): BattleOdds {
  if (theirs <= 0) return 'overwhelming';
  const ratio = mine / theirs;
  if (ratio >= 2.5) return 'overwhelming';
  if (ratio >= 1.4) return 'favorable';
  if (ratio >= 0.72) return 'even';
  if (ratio >= 0.4) return 'unfavorable';
  return 'desperate';
}

/** A class of hull present, and how many of them, for the roster. */
export interface BattleHulls {
  classId: ShipClassId;
  count: number;
  /** Guns and hull for all of them together, so the row adds up. */
  guns: number;
  left: number;
  whole: number;
}

export interface BattleSide {
  hulls: number;
  guns: number;
  /** Hull points left, and out of how many, across everything present. */
  left: number;
  whole: number;
  /** What those hulls actually are, heaviest first. */
  roster: BattleHulls[];
  /** Officers with the fleets here, best first by leadership. */
  officers: Character[];
  /** Companies embarked, which go down with the hulls carrying them. */
  troops: number;
  /** What the best officer here is worth to the guns, as a multiplier. */
  edge: number;
}

export interface BattleView {
  system: System;
  rounds: number;
  mine: BattleSide;
  theirs: BattleSide;
  /*
   * There is no `shore` here. The harbor's guns do not fire in a fleet action
   * and so are not part of the decision this sheet exists to put in front of
   * the player: fight on, or run. They are a bombardment's problem.
   */
  beast?: { name: string; damage: number; hull: number; guns: number };
  odds: BattleOdds;
  /** Which of your fleets could break off, if any. */
  fleeable: string[];
  fleeBlockedBecause: string | null;
  last?: PendingBattle['last'];
  theyFled: boolean;
  settled?: BattleOutcome;
  /** The full report, once it is over. The sheet swaps itself for this. */
  report?: OperationReport;
}

/**
 * One side of the action, in enough detail to decide with.
 *
 * Totals are what the assessment is made of; the roster is what the player
 * actually reasons about. "Two hulls, sixty guns" and "two ships of the line"
 * are the same fact, and only one of them tells you that breaking off is the
 * sensible thing to do.
 */
function sideOf(state: GameState, fleets: Fleet[]): BattleSide {
  const ships = fleets.flatMap((f) => f.ships);
  const byClass = new Map<ShipClassId, BattleHulls>();
  for (const ship of ships) {
    const spec = shipSpec(ship.classId);
    const row = byClass.get(ship.classId) ?? {
      classId: ship.classId,
      count: 0,
      guns: 0,
      left: 0,
      whole: 0,
    };
    row.count += 1;
    row.guns += spec.guns;
    // Whole numbers on the sheet. Damage is fractional so a hull can mend by
    // a per cent of itself; nobody wants to read "17.4 of 18".
    row.left += Math.max(0, Math.round(spec.hull - ship.damage));
    row.whole += spec.hull;
    byClass.set(ship.classId, row);
  }
  const officers = fleets
    .flatMap((f) => officersOf(state, f))
    .sort((a, b) => b.leadership - a.leadership);
  return {
    hulls: ships.length,
    guns: fleets.reduce((n, f) => n + fleetGuns(f), 0),
    left: ships.reduce((n, sh) => n + Math.max(0, hullOf(sh) - sh.damage), 0),
    whole: ships.reduce((n, sh) => n + hullOf(sh), 0),
    // Heaviest first: the thing that decides the action goes at the top of the
    // list, not wherever it happens to have been built.
    roster: [...byClass.values()].sort((a, b) => b.guns / b.count - a.guns / a.count),
    officers,
    troops: fleets.reduce((n, f) => n + f.troops, 0),
    edge: bestEdge(state, fleets, 'leadership'),
  };
}

/**
 * Everything the battle sheet draws, worked out in one place.
 *
 * The sheet asks a question — fight on or run — and every figure here exists
 * to answer it. Nothing is stored: this is read off the live state each time,
 * so it is the same numbers the next round will actually be fought with.
 */
export function battleView(state: GameState): BattleView | undefined {
  const pending = state.battle;
  if (!pending) return undefined;
  const system = state.systems.find((s) => s.id === pending.systemId);
  if (!system) return undefined;
  const here = fightingAt(state, system.id);
  const mineFleets = here.filter((f) => f.faction === state.player);
  const theirFleets = here.filter((f) => f.faction === otherFaction(state.player));
  const beast = beastAt(system);
  const alive = beastAlive(system);

  const mine = sideOf(state, mineFleets);
  const theirs = sideOf(state, theirFleets);
  // Guns bearing on each side, for the assessment only. The wall is not in it:
  // it does not fire in a fleet action. The creature fires on everybody, so it
  // counts against both.
  const beastGunsHere = alive && beast ? beastGuns(system) : 0;
  const forMe = mine.guns;
  const againstMe = theirs.guns + beastGunsHere;

  const fleeable = mineFleets.filter((f) => fleeError(state, f.id, state.player) === null);
  const firstReason = mineFleets.length === 0 ? null : fleeError(state, mineFleets[0].id, state.player);

  return {
    system,
    rounds: pending.rounds,
    mine,
    theirs,
    beast:
      beast && alive
        ? { name: beast.name, damage: system.beastDamage ?? 0, hull: beast.hull, guns: beastGunsHere }
        : undefined,
    odds: battleOdds(forMe, againstMe),
    fleeable: fleeable.map((f) => f.id),
    fleeBlockedBecause: fleeable.length > 0 ? null : firstReason,
    last: pending.last,
    report: pending.report,
    theyFled: Boolean(pending.theyFled),
    settled: pending.settled,
  };
}

/**
 * Break off the whole action: every fleet of yours here runs for the nearest
 * island you hold, each taking its own parting fire.
 *
 * Anything that cannot run — a fleet with companies ashore, or one with
 * nowhere to go — stays, and so does the battle, which is the honest outcome
 * rather than a silent half-retreat.
 */
export function breakOffBattle(state: GameState, rng: Rng): void {
  const pending = state.battle;
  if (!pending) return;
  const system = getSystem(state, pending.systemId);
  for (const fleet of fightingAt(state, system.id).filter((f) => f.faction === state.player)) {
    if (fleeError(state, fleet.id, state.player)) continue;
    fleeBattle(state, fleet.id, rng, state.player);
  }
  if (!fightingAt(state, system.id).some((f) => f.faction === state.player)) {
    pending.settled = 'you-fled';
  }
  clearWrecks(state);
}

/** Dismiss a settled action. The clock starts again when this clears. */
export function closeBattle(state: GameState): void {
  if (state.battle?.settled) state.battle = undefined;
}


/* ------------------------------------------------------- outcome reporting */

/**
 * One side's butcher's bill, for the outcome screen.
 *
 * `committed` cannot be worked out after the fact from a board that only holds
 * what is still afloat, so it is read from the snapshot the action took when
 * it opened. Everything else is the water as it stands now.
 */
function tallyFor(
  state: GameState,
  faction: PlayableFaction,
  systemId: string,
  committed: number,
): ForceTally {
  const ships = fleetsOf(state, faction)
    .filter((f) => !isAtSea(f) && f.systemId === systemId)
    .flatMap((f) => f.ships);
  const byClass = new Map<ShipClassId, number>();
  for (const ship of ships) byClass.set(ship.classId, (byClass.get(ship.classId) ?? 0) + 1);
  return {
    faction,
    name: forceName(faction, 'battle'),
    committed,
    destroyed: Math.max(0, committed - ships.length),
    damaged: ships.filter((s) => s.damage > 0).length,
    surviving: ships.length,
    roster: [...byClass].map(([classId, count]) => ({ classId, count })),
  };
}

/**
 * What became of the people who were aboard.
 *
 * Sean's specification asks for this *"only when personnel status is
 * relevant"*, and a name with nothing beside it is worse than no section at
 * all — so an officer who was never in the water does not appear, and a side
 * that had nobody out produces an empty list and no heading.
 *
 * The fates are read off the world rather than tracked through the fight: an
 * officer whose squadron hauled off has *escaped*, one still lying in that
 * water has *survived*, one in the cells was *captured*, and one who is hurt
 * is *wounded*. A Lord taken is called out as the loss it is.
 */
function peopleFor(state: GameState, systemId: string, wereAboard: string[]): PersonRow[] {
  const rows: PersonRow[] = [];
  for (const id of wereAboard) {
    const person = state.characters.find((c) => c.id === id);
    if (!person || !isPlayable(person.faction)) continue;
    const fate: Fate =
      person.status === 'captured'
        ? 'captured'
        : person.status === 'injured'
          ? 'wounded'
          : person.locationSystemId === systemId
            ? 'survived'
            : 'escaped';
    rows.push({
      id: person.id,
      name: person.name,
      faction: person.faction as PlayableFaction,
      fate,
      // Taken is the one fate that removes somebody from the map, which
      // Sean's §3 asks to be shown prominently rather than listed.
      ...(fate === 'captured' ? { grave: true as const } : {}),
    });
  }
  return rows;
}

/**
 * The report an action leaves behind.
 *
 * Built once, when the action settles, from what the water looks like then —
 * so the screen is a record of a thing that happened rather than a live view
 * that keeps changing under the player while they read it.
 */
export function buildBattleReport(
  state: GameState,
  pending: PendingBattle,
  outcome: BattleOutcome,
  ripples: Ripple[],
  wereAboard: string[],
): OperationReport {
  const system = getSystem(state, pending.systemId);
  const me = state.player;
  const them = otherFaction(me);
  const verdict = verdictOf(outcome);
  const committed = pending.committed ?? { empire: 0, alliance: 0 };
  const mine = tallyFor(state, me, system.id, committed[me]);
  const theirs = tallyFor(state, them, system.id, committed[them]);

  // Where the survivors went, if they went. Read off the world rather than
  // assumed: a squadron that broke off is at sea for somewhere, and the
  // player wants to know where before they decide what to do next.
  const away = fleetsOf(state, me).find((f) => isAtSea(f) && f.voyage);
  const withdrewTo =
    verdict !== 'victory' && away?.voyage
      ? state.systems.find((s) => s.id === away.voyage!.targetSystemId)?.name
      : undefined;

  const holder = isPlayable(system.control)
    ? system.control === me
      ? `${system.name} is still yours.`
      : `${system.name} itself stays under the ${factionData[them].shortName}; nothing at sea changes who is standing on it.`
    : `${system.name} answers to nobody, and still does.`;

  const report: OperationReport = {
    kind: 'battle',
    verdict,
    headline:
      outcome === 'beast-slain'
        ? 'The water is clear'
        : outcome === 'they-fled'
          ? 'They break off'
          : VERDICT_WORD[verdict],
    operation: 'Fleet action',
    title: `Action off ${inProse(system.name)}`,
    systemId: system.id,
    day: state.day,
    mine,
    theirs: theirs.committed > 0 || theirs.surviving > 0 ? theirs : undefined,
    people: peopleFor(state, system.id, wereAboard),
    damage: [],
    strategic: battleStrategic({
      verdict,
      where: system.name,
      theirs: factionData[them].shortName,
      withdrewTo,
      ashore: holder,
      theyFled: outcome === 'they-fled',
      wiped: outcome === 'lost',
    }),
    political: ripples,
  };
  report.tension = tensionOf(report);
  return report;
}

/** Hulls of a side lying at an island right now. */
function countAt(state: GameState, faction: PlayableFaction, systemId: string): number {
  return fleetsOf(state, faction)
    .filter((f) => !isAtSea(f) && f.systemId === systemId)
    .reduce((n, f) => n + f.ships.length, 0);
}

/** Everybody serving with a squadron in this water, by id. */
function aboardAt(state: GameState, systemId: string): string[] {
  return state.fleets
    .filter((f) => !isAtSea(f) && f.systemId === systemId)
    .flatMap((f) => f.officerIds ?? []);
}

/**
 * Write the report, once and only once.
 *
 * An action settles on the round that settles it, and the sheet then stays up
 * showing the result — so this must not run again on a re-render or on a
 * second look at the same settled action, or the tallies would be rebuilt
 * against a world that has moved on since.
 */
function settleReport(state: GameState, pending: PendingBattle, outcome: BattleOutcome): void {
  if (pending.report) return;
  pending.report = buildBattleReport(state, pending, outcome, pending.ripples ?? [], pending.aboard ?? []);
}
