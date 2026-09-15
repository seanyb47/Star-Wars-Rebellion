/**
 * Fleets: hulls, where they are, and what happens when two of them meet.
 *
 * Spec section 7, Phase 2. A fleet is one thing that moves as one thing,
 * carrying ships and the companies aboard them, after the original's fleet
 * window rather than a stack of ships with a leader attached elsewhere.
 */
import {
  BOOM_BLOCKADE_GUNS,
  BOOM_DEFENCE,
  FORT_GUNS,
  OFFICER_EDGE,
  SCOUT_PER_ISLAND,
  shipSpec,
} from './constants';
import { getSystem, nextId, otherFaction, pushEvent, setSupport } from './helpers';
import { captureLord, isLord, isLordShip, shipPower } from './lords';
import { travelDays } from './missions';
import type { Rng } from './rng';
import type {
  Character,
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
  // Join whatever fleet of ours lies here, preferring one that is not a
  // Lord's own so new hulls do not quietly tie themselves to the Swallowtail.
  const here = fleetsAt(state, system.id).filter((f) => f.faction === faction);
  const existing = here.find((f) => !f.ships.some(isLordShip)) ?? here[0];
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
    officerIds: [],
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
  if (isLord(character)) return `${character.name} does not leave their own ship.`;
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
  findFleet(state, fleetId)!.officerIds.push(characterId);
}

export function goAshore(state: GameState, fleetId: string, characterId: string): void {
  const fleet = findFleet(state, fleetId);
  if (!fleet || isAtSea(fleet)) throw new Error('The fleet is at sea.');
  const who = state.characters.find((c) => c.id === characterId);
  if (who && isLord(who)) throw new Error(`${who.name} does not leave their own ship.`);
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
    // Whoever is serving with her is where she is.
    for (const officer of officersOf(state, fleet)) officer.locationSystemId = system.id;
    scoutFrom(state, fleet, system);
    pushEvent(state, {
      kind: 'order',
      text: `${fleet.name} has come to anchor off ${system.name}.`,
      systemId: system.id,
    });
  }

  resolveBattles(state, rng);
  // A fleet reduced to nothing is not a fleet. Anyone serving with her is put
  // ashore where she lay rather than quietly ceasing to exist.
  for (const fleet of state.fleets.filter((f) => f.ships.length === 0)) {
    for (const officer of officersOf(state, fleet)) officer.locationSystemId = fleet.systemId;
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
 * Wherever two sides lie in the same harbour, they fight — one day's action
 * per day, not one battle to the death, so a player can still withdraw.
 *
 * Deterministic: every roll comes from the seeded RNG carried in the state.
 */
export function resolveBattles(state: GameState, rng: Rng): void {
  const harbours = new Set(state.fleets.filter((f) => !isAtSea(f)).map((f) => f.systemId));
  for (const systemId of [...harbours].sort()) {
    const system = getSystem(state, systemId);
    const here = fleetsAt(state, systemId);
    const empire = here.filter((f) => f.faction === 'empire');
    const alliance = here.filter((f) => f.faction === 'alliance');
    // A fort is a warship that cannot weigh anchor, so an enemy fleet lying
    // off a fortified harbour is in action whether or not a fleet meets it.
    const shore = fortGuns(system);
    const contested =
      (empire.length > 0 && alliance.length > 0) ||
      (shore > 0 && here.some((f) => f.faction === otherFaction(system.control as PlayableFaction)));
    if (!contested) continue;
    fightRound(state, system, empire, alliance, rng);
  }
}

/** The harbour's own guns, for whoever holds it. */
export function fortGuns(system: System): number {
  if (system.control !== 'empire' && system.control !== 'alliance') return 0;
  return (
    system.facilities.filter((f) => f.type === 'fort' && f.owner === system.control && !f.building)
      .length * FORT_GUNS
  );
}

/** Companies' worth of chain across the harbour mouth. */
export function boomDefence(system: System): number {
  if (system.control !== 'empire' && system.control !== 'alliance') return 0;
  return (
    system.facilities.filter((f) => f.type === 'boom' && f.owner === system.control && !f.building)
      .length * BOOM_DEFENCE
  );
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
  // Leadership tells here: a well-handled squadron gets more out of the same
  // guns. This is the first thing in the game that reads the rating at all.
  // The harbour's forts fire for whoever holds it, on top of any fleet.
  const shore = fortGuns(system);
  const gunsEmpire =
    empire.reduce((n, f) => n + fleetGuns(f) * officerEdge(state, f, 'leadership'), 0) +
    (system.control === 'empire' ? shore : 0);
  // The Ironback's power: every Confederate fleet in her harbour fights with
  // the Admiral's edge, not only her own.
  const line = alliance.find((f) => f.ships.some((sh) => shipPower(sh.classId) === 'line' && sh.damage < hullOf(sh)));
  const lineEdge = line ? officerEdge(state, line, 'leadership') : 1;
  const gunsAlliance =
    alliance.reduce(
      (n, f) => n + fleetGuns(f) * Math.max(officerEdge(state, f, 'leadership'), lineEdge),
      0,
    ) +
    (system.control === 'alliance' ? shore : 0);

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
    battle: {
      sides: {
        empire: { hulls: before.empire, lost: lostEmpire, guns: Math.round(gunsEmpire) },
        alliance: { hulls: before.alliance, lost: lostAlliance, guns: Math.round(gunsAlliance) },
      },
      shore,
      holder: system.control,
    },
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
    // The Swallowtail's power: while another hull of her side floats in the
    // harbour, the shot finds that one.
    const cover = live.filter((s) => shipPower(s.classId) !== 'runner');
    const pool = cover.length > 0 ? cover : live;
    pool[rng.int(pool.length)].damage += 1;
  }
}

function hullOf(ship: Ship): number {
  return shipSpec(ship.classId).hull;
}

/** Clear the wrecks, and drown whatever companies were aboard them. */
function sinkAndDrown(state: GameState, fleet: Fleet): void {
  const survivors = fleet.ships.filter((s) => s.damage < hullOf(s));
  if (survivors.length === fleet.ships.length) return;
  // A Lord's ship does not sink: she strikes, and the Lord goes in irons.
  for (const ship of fleet.ships) {
    if (ship.damage >= hullOf(ship) && isLordShip(ship)) captureLord(state, fleet, ship);
  }
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

  // Whatever is left of the landing force holds the island.
  const holding = fleet.troops;
  fleet.troops = 0;
  system.garrison = holding;
  system.control = fleet.faction;
  system.uprising = false;
  system.explored[fleet.faction] = true;
  // An island taken at gunpoint does not love you for it: enough regard to
  // hold it above a revolt, and no more. The rest of the island's feeling is
  // the other side's, which is what taking a place by storm buys you.
  setSupport(system, fleet.faction, Math.max(system.support[fleet.faction], 35));

  pushEvent(state, {
    kind: 'flip',
    text: `${system.name} is carried by storm. ${holding} ${holding === 1 ? 'company holds' : 'companies hold'} it, and the people are sullen.`,
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
        ? `Enemy sail off ${system.name}. Nothing is getting out of that harbour.`
        : `The blockade of ${system.name} is lifted.`,
      systemId: system.id,
    });
  }
}
