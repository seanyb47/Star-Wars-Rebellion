/**
 * Fleets: hulls, where they are, and what happens when two of them meet.
 *
 * Spec section 7, Phase 2. A fleet is one thing that moves as one thing,
 * carrying ships and the companies aboard them, after the original's fleet
 * window rather than a stack of ships with a leader attached elsewhere.
 */
import { SHIP_ROLES, shipClass } from './constants';
import { getSystem, nextId, otherFaction, pushEvent } from './helpers';
import { travelDays } from './missions';
import type { Rng } from './rng';
import type {
  Fleet,
  GameState,
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
  const spec = SHIP_ROLES[shipClass(ship.classId).role];
  return ship.damage >= spec.hull ? 0 : spec.guns;
}

export function fleetGuns(fleet: Fleet): number {
  return fleet.ships.reduce((total, ship) => total + shipGuns(ship), 0);
}

/** Companies this fleet could carry if it were empty. */
export function fleetCapacity(fleet: Fleet): number {
  return fleet.ships.reduce(
    (total, ship) => total + SHIP_ROLES[shipClass(ship.classId).role].carries,
    0,
  );
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
  const existing = fleetsAt(state, system.id).find((f) => f.faction === faction);
  if (existing) {
    existing.ships.push(ship);
    return existing;
  }
  const fleet: Fleet = {
    id: nextId(state, 'flt'),
    name: `Fleet ${state.fleets.filter((f) => f.faction === faction).length + 1}`,
    faction,
    systemId: system.id,
    ships: [ship],
    troops: 0,
  };
  state.fleets.push(fleet);
  return fleet;
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

export function sailFleet(
  state: GameState,
  fleetId: string,
  targetSystemId: string,
  actor: PlayableFaction,
): void {
  const error = sailError(state, fleetId, targetSystemId, actor);
  if (error) throw new Error(error);
  const fleet = findFleet(state, fleetId)!;
  const days = travelDays(state, fleet.systemId, targetSystemId);
  const target = getSystem(state, targetSystemId);
  fleet.voyage = { targetSystemId, daysRemaining: Math.max(1, days) };
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
    return 'Enemy ships hold the harbour.';
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
    const system = getSystem(state, fleet.systemId);
    system.explored[fleet.faction] = true;
    pushEvent(state, {
      kind: 'order',
      text: `${fleet.name} has come to anchor off ${system.name}.`,
      systemId: system.id,
    });
  }

  resolveBattles(state, rng);
  // A fleet reduced to nothing is not a fleet.
  state.fleets = state.fleets.filter((f) => f.ships.length > 0);
}

/**
 * Wherever two sides lie in the same harbour, they fight — one day's action
 * per day, not one battle to the death, so a player can still withdraw.
 *
 * Deterministic: every roll comes from the seeded RNG carried in the state.
 */
export function resolveBattles(state: GameState, rng: Rng): void {
  const harbours = new Set(state.fleets.filter((f) => !isAtSea(f)).map((f) => f.systemId));
  for (const systemId of [...harbours].sort()) {
    const here = fleetsAt(state, systemId);
    const empire = here.filter((f) => f.faction === 'empire');
    const alliance = here.filter((f) => f.faction === 'alliance');
    if (empire.length === 0 || alliance.length === 0) continue;
    fightRound(state, getSystem(state, systemId), empire, alliance, rng);
  }
}

/** One day's exchange of fire between the two sides in a harbour. */
function fightRound(
  state: GameState,
  system: System,
  empire: Fleet[],
  alliance: Fleet[],
  rng: Rng,
): void {
  const before = {
    empire: empire.reduce((n, f) => n + f.ships.length, 0),
    alliance: alliance.reduce((n, f) => n + f.ships.length, 0),
  };
  const gunsEmpire = empire.reduce((n, f) => n + fleetGuns(f), 0);
  const gunsAlliance = alliance.reduce((n, f) => n + fleetGuns(f), 0);

  applyFire(gunsAlliance, empire, rng);
  applyFire(gunsEmpire, alliance, rng);

  for (const fleet of [...empire, ...alliance]) sinkAndDrown(state, fleet);

  const after = {
    empire: empire.reduce((n, f) => n + f.ships.length, 0),
    alliance: alliance.reduce((n, f) => n + f.ships.length, 0),
  };
  const lostEmpire = before.empire - after.empire;
  const lostAlliance = before.alliance - after.alliance;
  if (lostEmpire === 0 && lostAlliance === 0) return;

  const tally = (n: number) => `${n} ${n === 1 ? 'hull' : 'hulls'}`;
  pushEvent(state, {
    kind: 'battle',
    text: `Action off ${system.name}. The Imperium loses ${tally(lostEmpire)}, the Confederacy ${tally(lostAlliance)}.`,
    systemId: system.id,
  });
}

/** Spread a side's guns over the enemy hulls, a point of damage at a time. */
function applyFire(guns: number, targets: Fleet[], rng: Rng): void {
  const hulls = targets.flatMap((f) => f.ships.filter((s) => s.damage < hullOf(s)));
  if (hulls.length === 0 || guns <= 0) return;
  // Half the guns tell, rounded by a roll, so an even match is not a stalemate.
  const hits = Math.max(1, Math.round(guns / 2 + (rng.next() - 0.5)));
  for (let i = 0; i < hits; i++) {
    const live = hulls.filter((s) => s.damage < hullOf(s));
    if (live.length === 0) return;
    live[rng.int(live.length)].damage += 1;
  }
}

function hullOf(ship: Ship): number {
  return SHIP_ROLES[shipClass(ship.classId).role].hull;
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
  const defenders = system.garrison;
  const attackers = fleet.troops;
  // Both sides lose companies; the smaller force is spent entirely.
  const spent = Math.min(attackers, defenders);
  const roll = rng.next();
  const attackerWins = attackers > defenders || (attackers === defenders && roll > 0.5);

  fleet.troops -= spent;
  system.garrison -= spent;

  if (!attackerWins) {
    pushEvent(state, {
      kind: 'battle',
      text: `The landing on ${system.name} is thrown back into the sea.`,
      systemId: system.id,
    });
    return;
  }

  // Whatever is left of the landing force holds the island.
  const holding = fleet.troops;
  fleet.troops = 0;
  system.garrison = holding;
  const taken = otherFaction(fleet.faction);
  system.control = fleet.faction;
  system.uprising = false;
  system.explored[fleet.faction] = true;
  // An island taken at gunpoint does not love you for it.
  system.support[fleet.faction] = Math.max(system.support[fleet.faction], 35);
  system.support[taken] = Math.min(system.support[taken], 55);

  pushEvent(state, {
    kind: 'flip',
    text: `${system.name} is carried by storm. ${holding} ${holding === 1 ? 'company holds' : 'companies hold'} it, and the people are sullen.`,
    systemId: system.id,
  });
}

/**
 * An enemy fleet lying off an island you hold stops its trade. The island
 * still costs you upkeep; it simply stops paying.
 */
export function isBlockaded(state: GameState, system: System): boolean {
  if (system.control !== 'empire' && system.control !== 'alliance') return false;
  const enemy = otherFaction(system.control);
  return fleetsAt(state, system.id).some((f) => f.faction === enemy && fleetGuns(f) > 0);
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
        ? `Enemy sail off ${system.name}. Nothing is getting out of that harbour.`
        : `The blockade of ${system.name} is lifted.`,
      systemId: system.id,
    });
  }
}
