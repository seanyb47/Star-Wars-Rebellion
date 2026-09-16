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
  BOOM_BLOCKADE_GUNS,
  BOOM_DEFENCE,
  FORT_GUNS,
  FORT_STRENGTH,
  FORT_REPAIR_PER_DAY,
  BOMBARD_PER_COMPANY,
  CIVILIAN_LOYALTY_HIT,
  CIVILIAN_REACH_HIT,
  CIVILIAN_STACK,
  CIVILIAN_STACK_MAX,
  REPAIR_PER_DAY,
  REPAIR_AT_A_YARD,
  OFFICER_EDGE,
  SCOUT_PER_ISLAND,
  shipSpec,
  GUN_DECKS,
  HIT_CHANCE,
  hitChanceOn,
  aimAt,
  shipClass,
  LONG_GUN_SHARE,
  RETREAT_SHOTS,
} from './constants';
import {
  beastAlive,
  beastAt,
  beastCombatant,
  beastGuns,
  monsterShots,
  monsterStrike,
  sightBeast,
} from './creatures';
import { fireOnce, pickTarget, type Combatant } from './round';
import {
  getSystem,
  nextId,
  otherFaction,
  pushEvent,
  requiredGarrison,
  setSupport,
} from './helpers';
import { lordPowerAt } from './lords';
import { travelDays } from './missions';
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
  if (fleet.bombarding && here) {
    const walls = fortsOf(here).length;
    return walls > 0
      ? `Working the walls — ${Math.round(wallCondition(here) * 100)}% standing`
      : 'Shelling the town';
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
  target.troops = carried - fleet.troops;

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
    text: `${fleet.name} weighs anchor for ${target.name}.`,
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
    if (system.garrison < companies) return 'Not enough companies ashore.';
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
  if (fleet.troops === 0) return 'No companies aboard.';
  const system = getSystem(state, fleet.systemId);
  if (system.control === fleet.faction) return 'The island is already yours.';
  if (fleetsAt(state, system.id).some((f) => f.faction !== fleet.faction && fleetGuns(f) > 0)) {
    return 'Enemy ships hold the harbor.';
  }
  // The gate the whole siege hangs on. Boats do not go in under a battery
  // that is still firing, so the walls come down first and the only thing
  // that brings them down is weight of shot.
  const walls = fortsOf(system).length;
  if (walls > 0) {
    return `The seawall still stands. ${walls === 1 ? 'It has' : 'They have'} to be beaten down first.`;
  }
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
      text: `${fleet.name} has come to anchor off ${system.name}.`,
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
  const gone = state.fleets.filter((f) => f.ships.length === 0);
  if (gone.length === 0) return;
  for (const fleet of gone) {
    for (const officer of officersOf(state, fleet)) officer.locationSystemId = fleet.systemId;
    fleet.officerIds = [];
    if (fleet.troops > 0) {
      pushEvent(state, {
        kind: 'loss',
        text: `${fleet.troops} ${fleet.troops === 1 ? 'company goes' : 'companies go'} down with the last of ${fleet.name}.`,
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
 * Three ways to be. Two fleets in the same water is the obvious one. A fort is
 * a warship that cannot weigh anchor, so an enemy fleet lying off a fortified
 * harbor is in action whether or not a fleet meets it. And whatever is in the
 * water is nobody's, does not care whose colours are flying, and has anybody
 * anchored there in action whether or not the other side ever turns up.
 */
export function contestedAt(state: GameState, system: System): boolean {
  const here = fightingAt(state, system.id);
  if (here.length === 0) return false;
  if (beastAlive(system)) return true;
  if (here.some((f) => f.faction === 'empire') && here.some((f) => f.faction === 'alliance')) {
    return true;
  }
  if (system.control !== 'empire' && system.control !== 'alliance') return false;
  return fortGuns(system) > 0 && here.some((f) => f.faction === otherFaction(system.control as PlayableFaction));
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
    const hand = here.some((f) => f.faction === state.player) && !state.battle;
    // Quiet in the dispatch sense only. It still goes in the log; what it does
    // not do is arrive as a card over the top of the battle sheet.
    const tally = fightRound(state, system, here, rng, hand);
    if (!hand) continue;
    // Note what the first exchange cost, but do not let them run from it.
    // Breaking off is a decision taken after you have seen what the other
    // fellow's broadside does, not before — and keeping it out of this path
    // means it only ever happens where the player can watch it, since the
    // rounds after the first are all fought from the battle sheet.
    const pending: PendingBattle = { systemId, rounds: 1, last: tally };
    state.battle = pending;
    pending.settled = outcomeOf(state, system, pending);
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
      .reduce((n, f) => n + fleetGuns(f), 0) + (system.control === state.player ? fortGuns(system) : 0);
  if (theirGuns === 0 || mine < theirGuns * BREAK_OFF_ODDS) return false;
  let ran = false;
  for (const fleet of theirs) {
    if (fleeError(state, fleet.id, them)) continue;
    fleeBattle(state, fleet.id, rng, them);
    ran = true;
  }
  return ran;
}

/** Every wall standing on this island for whoever holds it, rubble aside. */
export function fortsOf(system: System): Facility[] {
  if (system.control !== 'empire' && system.control !== 'alliance') return [];
  return system.facilities.filter(
    (f) =>
      f.type === 'fort' &&
      f.owner === system.control &&
      !f.building &&
      (f.damage ?? 0) < FORT_STRENGTH,
  );
}

/** What is left of the walls, as a share of what they were. */
export function wallCondition(system: System): number {
  const forts = system.facilities.filter(
    (f) => f.type === 'fort' && f.owner === system.control && !f.building,
  );
  if (forts.length === 0) return 0;
  const whole = forts.length * FORT_STRENGTH;
  const left = forts.reduce((n, f) => n + Math.max(0, FORT_STRENGTH - (f.damage ?? 0)), 0);
  return left / whole;
}

/**
 * The harbor's own guns, for whoever holds it.
 *
 * Scaled by what is left of the wall, so a battery that has been worked over
 * for three days fires like what it now is. It means the first day of a siege
 * is the dangerous one and every day after is cheaper, which is the right
 * shape for a siege and comes free with giving the wall a condition.
 */
export function fortGuns(system: System): number {
  if (system.control !== 'empire' && system.control !== 'alliance') return 0;
  const forts = system.facilities.filter(
    (f) => f.type === 'fort' && f.owner === system.control && !f.building,
  );
  return forts.reduce((n, f) => {
    const left = Math.max(0, FORT_STRENGTH - (f.damage ?? 0)) / FORT_STRENGTH;
    return n + FORT_GUNS * left;
  }, 0);
}

/* ------------------------------------------------------------------- siege */

/**
 * What this squadron throws at the land in a day.
 *
 * A wrecked hull throws nothing, the same as it fires nothing.
 */
export function fleetBombard(fleet: Fleet): number {
  return fleet.ships.reduce((n, ship) => {
    const spec = shipSpec(ship.classId);
    return n + (ship.damage >= spec.hull ? 0 : spec.bombard);
  }, 0);
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
  if (fleetBombard(fleet) <= 0) return 'Nothing aboard throws heavy enough to matter.';
  return null;
}

/**
 * One day of bombardment: the walls first, the garrison only after.
 *
 * Sean cut deliberate targeting and he is right — he has played Rebellion for
 * years and never once found shelling a granary worth doing, and a target
 * picker on a phone is a menu in the middle of a decision. So there is one
 * button and a hierarchy. Shot goes at the walls while any stand. Only when
 * none do can it reach the garrison, and shot that goes looking for companies
 * in a town finds the town: the island's regard falls hard, every other island
 * in the Reach hears of it, and each further day costs more than the last.
 *
 * The wall fires back the whole time, which is what makes the first day of a
 * siege the expensive one.
 */
export function bombardRound(state: GameState, fleet: Fleet, rng: Rng): void {
  const system = getSystem(state, fleet.systemId);
  let weight = fleetBombard(fleet);
  if (weight <= 0) return;
  const mine = fleet.faction === state.player;

  // The wall answers first, at what it still has.
  const wall = Math.round(fortGuns(system));
  if (wall > 0) {
    const targets: Combatant[] = fleet.ships
      .filter((sh) => sh.damage < shipSpec(sh.classId).hull)
      .map((ship) => {
        const spec = shipSpec(ship.classId);
        return {
          guns: spec.guns,
          left: spec.hull - ship.damage,
          whole: spec.hull,
          role: shipClass(ship.classId).role,
          hitChance: hitChanceOn(shipClass(ship.classId).role),
          hurt: (amount: number) => {
            ship.damage += amount;
            return ship.damage >= spec.hull;
          },
        };
      });
    const target = pickTarget(targets, rng);
    if (target) fireOnce({ guns: wall }, target, rng);
    sinkAndDrown(state, fleet);
  }

  // Then the walls take what is thrown at them, worst first: a battery already
  // half down is finished rather than a fresh one started, because a wall only
  // stops mattering when it is rubble.
  const standing = fortsOf(system).sort((a, b) => (b.damage ?? 0) - (a.damage ?? 0));
  const rubble: string[] = [];
  for (const fort of standing) {
    if (weight <= 0) break;
    const left = FORT_STRENGTH - (fort.damage ?? 0);
    const put = Math.min(weight, left);
    fort.damage = (fort.damage ?? 0) + put;
    weight -= put;
    if (fort.damage >= FORT_STRENGTH) rubble.push(fort.id);
  }
  // A wall beaten to nothing is rubble, and rubble does not mend.
  //
  // It used to stay on the island at full damage, and the night's repair took
  // a stone off it — which put it back under its own strength and therefore
  // back on the list of walls standing. Measured: every siege drove the walls
  // to two per cent and stuck there for ever, bombarding and being rebuilt in
  // the same breath, and not one siege in eight games ever finished. Patching
  // a battery under fire is one thing; raising it again out of nothing is a
  // build order, which is exactly what a blockade prevents.
  const felled = rubble.length;
  if (felled > 0) system.facilities = system.facilities.filter((f) => !rubble.includes(f.id));

  if (felled > 0 && mine) {
    pushEvent(state, {
      kind: 'battle',
      text: fortsOf(system).length === 0
        ? `The last of the seawall at ${system.name} is down. The landing is open.`
        : `A battery at ${system.name} is beaten to rubble.`,
      systemId: system.id,
    });
  } else if (standing.length > 0 && mine) {
    pushEvent(state, {
      kind: 'battle',
      text: `${fleet.name} works the walls of ${system.name}. ${Math.round(wallCondition(system) * 100)}% of them still stand.`,
      systemId: system.id,
    });
  }

  // Past the walls. Only now can the guns reach the companies, and only at a
  // price the whole Reach pays.
  if (fortsOf(system).length > 0 || weight <= 0) return;
  shellTheTown(state, system, fleet, weight);
}

/** Shot that goes looking for companies, and what it finds instead. */
function shellTheTown(state: GameState, system: System, fleet: Fleet, weight: number): void {
  if (system.garrison <= 0) return;
  const broken = Math.min(system.garrison, Math.floor(weight / BOMBARD_PER_COMPANY));
  system.garrison -= broken;

  const already = system.shelled ?? 0;
  system.shelled = already + 1;
  const stack = 1 + Math.min(already * CIVILIAN_STACK, CIVILIAN_STACK_MAX);
  const enemy = otherFaction(fleet.faction);
  if (system.populated) {
    setSupport(system, enemy, system.support[enemy] + CIVILIAN_LOYALTY_HIT * stack);
    for (const other of state.systems) {
      if (other.id === system.id || other.sectorId !== system.sectorId || !other.populated) continue;
      setSupport(other, enemy, other.support[enemy] + CIVILIAN_REACH_HIT * stack);
    }
  }

  if (fleet.faction === state.player) {
    pushEvent(state, {
      kind: 'battle',
      text: system.populated
        ? `${fleet.name} shells ${system.name} itself. ${
            broken > 0
              ? `${broken} ${broken === 1 ? 'company is' : 'companies are'} broken`
              : 'The garrison holds'
          }, the quarter behind the quay is burning, and word of it is running through the Reach.`
        : `${fleet.name} works over ${system.name}. ${broken} ${broken === 1 ? 'company is' : 'companies are'} broken.`,
      systemId: system.id,
    });
  }
}

/**
 * Every squadron under standing orders to bombard fires once, and the orders
 * end the moment they cannot be carried out.
 */
export function advanceSieges(state: GameState, rng: Rng): void {
  for (const fleet of [...state.fleets]) {
    if (!fleet.bombarding) continue;
    if (bombardError(state, fleet.id, fleet.faction) !== null) {
      fleet.bombarding = undefined;
      continue;
    }
    bombardRound(state, fleet, rng);
    // Walls down and nothing worth shelling: the order has done its job.
    const system = getSystem(state, fleet.systemId);
    if (fortsOf(system).length === 0 && system.garrison <= 0) fleet.bombarding = undefined;
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
  for (const system of state.systems) {
    for (const fort of system.facilities) {
      if (fort.type !== 'fort' || fort.building || !fort.damage) continue;
      fort.damage = Math.max(0, fort.damage - FORT_STRENGTH * FORT_REPAIR_PER_DAY);
      if (fort.damage === 0) delete fort.damage;
    }
  }
}

/** Companies' worth of chain across the harbor mouth. */
export function boomDefence(system: System): number {
  if (system.control !== 'empire' && system.control !== 'alliance') return 0;
  return (
    system.facilities.filter((f) => f.type === 'boom' && f.owner === system.control && !f.building)
      .length * BOOM_DEFENCE
  );
}

/** One day's exchange of fire between the two sides in a harbor. */
/**
 * Everything at an island that can shoot, on one side, as combatants.
 *
 * A hull, a fort on the wall and a creature in the water all take a shot and
 * all take damage, so the round does not care which is which. What differs is
 * only how hard each is to hit and what happens when it dies, and both of
 * those live on the combatant.
 */
function hullsOf(fleets: Fleet[]): Combatant[] {
  const out: Combatant[] = [];
  for (const fleet of fleets) {
    for (const ship of fleet.ships) {
      const spec = shipSpec(ship.classId);
      out.push({
        guns: spec.guns,
        left: spec.hull - ship.damage,
        whole: spec.hull,
        role: shipClass(ship.classId).role,
        hitChance: hitChanceOn(shipClass(ship.classId).role),
        hurt: (amount) => {
          ship.damage += amount;
          return ship.damage >= spec.hull;
        },
      });
    }
  }
  return out;
}

/** The island's own guns, which fire for whoever holds it and cannot be sunk. */
function wallOf(system: System, side: PlayableFaction): Combatant[] {
  const guns = system.control === side ? fortGuns(system) : 0;
  if (guns <= 0) return [];
  return [
    {
      guns,
      // A fort is not a target a fleet action can remove: it is masonry, and
      // taking it is a landing. It shoots and is not shot at.
      left: Infinity,
      whole: Infinity,
      hitChance: HIT_CHANCE,
      hurt: () => false,
    },
  ];
}

/**
 * One hull's shots for the round, each carrying its share of her weight.
 *
 * A first-rate lays three decks on three different marks rather than emptying
 * herself into one sloop; a sloop has the one gun. The shots share the hull's
 * condition, so a ship sunk halfway through a round stops firing the rest.
 */
function decksOf(gun: Combatant): Combatant[] {
  const decks = gun.role ? GUN_DECKS[gun.role] : 1;
  if (decks <= 1) return [gun];
  const each = gun.guns / decks;
  return Array.from({ length: decks }, () => ({
    ...gun,
    // Her weight, shared out. Read live off the hull, so a ship sunk halfway
    // through a round does not go on firing the decks she has left.
    get guns() { return gun.left > 0 ? each : 0; },
    get left() { return gun.left; },
  }));
}

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
      text: `${beast.name} is killed off ${system.name}. The water there is only water now.`,
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
        text: `${beast.name} is at the hulls off ${system.name}. ${damage} taken and nothing sunk${
          system.beastDamage ? `; it has ${system.beastDamage} of ${beast.hull} in it` : ''
        }.`,
        systemId: system.id,
        quiet,
      });
    }
    return;
  }
  const tally = (n: number) => `${n} ${n === 1 ? 'hull' : 'hulls'}`;
  const against = beast && beastAlive(system) ? ` against ${beast.name}` : '';
  pushEvent(state, {
    kind: 'battle',
    text: `Action off ${system.name}${against}. The Imperium loses ${tally(lostEmpire)}, the Confederacy ${tally(lostAlliance)}.`,
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
      shore: fortGuns(system),
      holder: system.control,
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
  };

  // The three parties. Forts shoot for the side that holds the island; the
  // creature shoots for nobody and is shot at by everybody.
  const empireGuns = [...hullsOf(empire), ...wallOf(system, 'empire')];
  const allianceGuns = [...hullsOf(alliance), ...wallOf(system, 'alliance')];
  const monster = beastCombatant(system);

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

  // Everyone shoots once, and everyone shoots at the same moment: the volleys
  // are worked out against the state at the start of the round, so a hull that
  // goes down still got its shot off. Simultaneous fire is what keeps a battle
  // from being decided by who is listed first.
  const volleys: Array<{ from: Combatant; at: Combatant[]; edge: number }> = [];
  for (const gun of empireGuns) {
    for (const shot of decksOf(gun)) {
      volleys.push({ from: shot, at: monster ? [...allianceGuns, monster] : allianceGuns, edge: empireEdge });
    }
  }
  for (const gun of allianceGuns) {
    for (const shot of decksOf(gun)) {
      volleys.push({ from: shot, at: monster ? [...empireGuns, monster] : empireGuns, edge: allianceEdge });
    }
  }
  if (monster) {
    // It is nobody's, so it fires on everything and picks its own way — a
    // Kraken does not shoot, it takes hold of something.
    for (let i = 0; i < monsterShots(system); i++) {
      volleys.push({ from: monster, at: [...empireGuns, ...allianceGuns], edge: 1 });
    }
  }

  for (const volley of volleys) {
    if (volley.from.left <= 0) continue;
    const target = pickTarget(volley.at, rng);
    if (!target) continue;
    if (monster && volley.from === monster) monsterStrike(state, system, target, rng);
    else {
      // What this shooter manages against that target. A heavy battery laid
      // for pounding stone does not train round fast enough to catch a sloop,
      // which is the rule that makes a fleet of nothing but ships of the line
      // a fleet with a hole in it.
      const aim = target.role ? aimAt(volley.from.role ?? 'shore', target.role) : 1;
      fireOnce(volley.from, target, rng, volley.edge * aim);
    }
  }

  const killed = monster !== undefined && monster.left <= 0 && !system.beastSlain;
  if (killed) {
    const fromEmpire = empireGuns.reduce((n, g) => n + g.guns, 0);
    const fromAlliance = allianceGuns.reduce((n, g) => n + g.guns, 0);
    system.beastSlain = fromEmpire >= fromAlliance ? 'empire' : 'alliance';
    system.beastDamage = beastAt(system)!.hull;
  }

  for (const fleet of [...empire, ...alliance]) sinkAndDrown(state, fleet);
  reportRound(state, system, empire, alliance, before, killed, quiet);
  const after = fleetsAt(state, system.id);
  const count = (side: PlayableFaction) =>
    after.filter((f) => f.faction === side).reduce((n, f) => n + f.ships.length, 0);
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
      text: `${lost} ${lost === 1 ? 'company goes' : 'companies go'} down with ${fleet.name}.`,
    });
  }
}

/**
 * Put companies ashore against a garrison. Numbers decide it, with a roll for
 * the surf: the attacker needs to outnumber the defence to carry the island.
 */
export function resolveLanding(state: GameState, fleet: Fleet, rng: Rng): void {
  const system = getSystem(state, fleet.systemId);
  // A boom is cut under fire before anybody is ashore, and it costs the
  // landing what a company would. The chain does not die with the garrison:
  // it is spent from the attacker only.
  const chain = boomDefence(system);
  const defenders = system.garrison + chain;
  // Combat tells here, for the same reason: companies led ashore by somebody
  // who knows the business go further than the same companies alone.
  const attackers = fleet.troops * officerEdge(state, fleet, 'combat');
  // Both sides lose companies; the smaller force is spent entirely.
  const spent = Math.min(Math.round(attackers), defenders);
  const roll = rng.next();
  const attackerWins = attackers > defenders || (attackers === defenders && roll > 0.5);

  const landed = fleet.troops;
  const garrisonBefore = system.garrison;
  fleet.troops = Math.max(0, fleet.troops - spent);
  system.garrison = Math.max(0, system.garrison - Math.max(0, spent - chain));
  const report = {
    attacker: fleet.faction,
    landed,
    defenders: garrisonBefore,
    boom: chain,
    lost: landed - fleet.troops,
    defendersLost: garrisonBefore - system.garrison,
    taken: attackerWins,
  };

  if (!attackerWins) {
    pushEvent(state, {
      kind: 'battle',
      text: `The landing on ${system.name} is thrown back into the sea.`,
      systemId: system.id,
      landing: report,
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
  system.explored[fleet.faction] = true;
  // A landing that only just carried the place has not brought enough to sit
  // on it, and the island says so at once rather than a fortnight later.
  system.uprising = holding < hold;
  // An island taken at gunpoint does not love you for it: enough regard to
  // hold it above a revolt, and no more. The rest of the island's feeling is
  // the other side's, which is what taking a place by storm buys you.
  setSupport(system, fleet.faction, Math.max(system.support[fleet.faction], 35));

  pushEvent(state, {
    kind: 'flip',
    text: `${system.name} is carried by storm. ${holding} ${holding === 1 ? 'company holds' : 'companies hold'} it${
      fleet.troops > 0 ? `, ${fleet.troops} more stay aboard` : ''
    }, and the people are sullen.`,
    systemId: system.id,
    landing: report,
  });
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
  // Under the boom's floor a raider is a nuisance, not a siege.
  const floor = boomDefence(system) > 0 ? BOOM_BLOCKADE_GUNS : 1;
  return hostile >= floor;
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
        ? `Enemy sail off ${system.name}. Nothing is getting out of that harbor.`
        : `The blockade of ${system.name} is lifted.`,
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
  if (!enemies && !beastAlive(system) && fortGuns(system) === 0) return 'Nothing to break off from.';
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

  // Everything at this island that can reach a fleet under way. A fort can:
  // it is a battery on the harbor wall and you have to sail past it. A hull
  // can only if she carries long guns. A creature always can — it is in the
  // water with you, and being unable to outswim the Kraken is the point of it.
  const reaching: Array<{ guns: number }> = [];
  const wall = system.control !== fleet.faction ? fortGuns(system) : 0;
  if (wall > 0) reaching.push({ guns: Math.round(wall * LONG_GUN_SHARE) });
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
          ? `${fleet.name} breaks off from ${system.name} under long guns and loses ${lost} ${lost === 1 ? 'hull' : 'hulls'} getting clear.`
          : `${fleet.name} breaks off from ${system.name} under long guns and gets clear.`,
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
      text: `${fleet.name} runs for ${refuge.name}.`,
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
  /** Guns on the harbor wall, and whose they are. */
  shore: number;
  shoreIsMine: boolean;
  beast?: { name: string; damage: number; hull: number; guns: number };
  odds: BattleOdds;
  /** Which of your fleets could break off, if any. */
  fleeable: string[];
  fleeBlockedBecause: string | null;
  last?: PendingBattle['last'];
  theyFled: boolean;
  settled?: BattleOutcome;
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
  const shore = fortGuns(system);
  const shoreIsMine = system.control === state.player;
  const beast = beastAt(system);
  const alive = beastAlive(system);

  const mine = sideOf(state, mineFleets);
  const theirs = sideOf(state, theirFleets);
  // Guns bearing on each side, for the assessment only: the wall fires for
  // whoever holds the island, and the creature fires on everybody, so it
  // counts against both.
  const beastGunsHere = alive && beast ? beastGuns(system) : 0;
  const forMe = mine.guns + (shoreIsMine ? shore : 0);
  const againstMe = theirs.guns + (shoreIsMine ? 0 : shore) + beastGunsHere;

  const fleeable = mineFleets.filter((f) => fleeError(state, f.id, state.player) === null);
  const firstReason = mineFleets.length === 0 ? null : fleeError(state, mineFleets[0].id, state.player);

  return {
    system,
    rounds: pending.rounds,
    mine,
    theirs,
    shore,
    shoreIsMine,
    beast:
      beast && alive
        ? { name: beast.name, damage: system.beastDamage ?? 0, hull: beast.hull, guns: beastGunsHere }
        : undefined,
    odds: battleOdds(forMe, againstMe),
    fleeable: fleeable.map((f) => f.id),
    fleeBlockedBecause: fleeable.length > 0 ? null : firstReason,
    last: pending.last,
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

