/**
 * The Pirate Lords: three people, three ships, one thing each.
 *
 * Sean's rule, 14 September: the Confederacy has no base. It has three Lords,
 * each bound to a ship with a power of its own. The Crown wins by taking all
 * three; the Confederacy wins by taking Highwater. Everything here is the
 * plumbing that keeps a Lord and their ship one unit — aboard from the first
 * day, never ashore, taken together, and given back together.
 */
import { CAPTIVE_DAYS, PIRATE_LORDS, shipClass, type PirateLord } from './constants';
import { getSystem, nextId, pushEvent } from './helpers';
import type { Character, Fleet, GameState, LordPower, Ship, ShipClassId } from './types';

export function lordOfName(name: string): PirateLord | undefined {
  return PIRATE_LORDS.find((l) => l.name === name);
}

export function isLord(character: Character): boolean {
  return lordOfName(character.name) !== undefined;
}

export function isLordShip(ship: Ship): boolean {
  return PIRATE_LORDS.some((l) => l.ship === ship.classId);
}

/** The Lord a hull belongs to, by class. */
export function lordOfShip(classId: ShipClassId): PirateLord | undefined {
  return PIRATE_LORDS.find((l) => l.ship === classId);
}

export function shipPower(classId: ShipClassId): LordPower | undefined {
  return shipClass(classId).power;
}

/** The characters who are Lords, in the bible's order. */
export function lords(state: GameState): Character[] {
  return PIRATE_LORDS.map((l) => state.characters.find((c) => c.name === l.name)).filter(
    (c): c is Character => c !== undefined,
  );
}

/** The fleet a Lord's ship is sailing with, while she floats. */
export function lordFleet(state: GameState, lord: PirateLord): Fleet | undefined {
  return state.fleets.find((f) => f.faction === 'alliance' && f.ships.some((s) => s.classId === lord.ship));
}

/** Every fleet with a Lord's ship in it. */
export function lordFleets(state: GameState): Fleet[] {
  return state.fleets.filter((f) => f.faction === 'alliance' && f.ships.some(isLordShip));
}

/** A fleet at anchor at this island carrying this power. */
export function powerAt(state: GameState, systemId: string, power: LordPower): Fleet | undefined {
  return state.fleets.find(
    (f) =>
      f.faction === 'alliance' &&
      !f.voyage &&
      f.systemId === systemId &&
      f.ships.some((s) => shipPower(s.classId) === power && s.damage < shipClass(s.classId).hull!),
  );
}

/** Whether every Lord is in irons at once — the Crown's victory. */
export function allLordsTaken(state: GameState): boolean {
  const held = lords(state);
  return held.length === PIRATE_LORDS.length && held.every((c) => c.status === 'captured');
}

/**
 * A Lord's ship has struck. The Crown wants the Lord alive, so the ship is
 * not sunk but taken as a prize and the Lord goes in irons to Highwater.
 * Returns the ship's class so the caller can drop the hull from the water.
 */
export function captureLord(state: GameState, fleet: Fleet, ship: Ship): void {
  const lord = lordOfShip(ship.classId);
  if (!lord) return;
  const character = state.characters.find((c) => c.name === lord.name);
  const here = getSystem(state, fleet.systemId);
  const cells = getSystem(state, state.factions.empire.hqSystemId);
  fleet.officerIds = fleet.officerIds.filter((id) => id !== character?.id);
  if (character) {
    character.status = 'captured';
    character.injuredDays = CAPTIVE_DAYS;
    character.mission = undefined;
    character.locationSystemId = cells.id;
  }
  pushEvent(state, {
    kind: 'war',
    text: `The ${shipClass(ship.classId).name} strikes her colours off ${here.name}. ${lord.name} is taken in irons to ${cells.name}.`,
    systemId: here.id,
    characterId: character?.id,
  });
}

/**
 * A Lord comes home — exchanged or broken out — and their ship with them,
 * cut out of the Crown's harbour the same night. The ship is the Lord; one
 * without the other would be a person with nothing to do.
 */
export function restoreLord(state: GameState, character: Character): void {
  const lord = lordOfName(character.name);
  if (!lord) return;
  const home = getSystem(state, state.factions.alliance.hqSystemId);
  character.locationSystemId = home.id;
  const existing = lordFleet(state, lord);
  if (existing) {
    if (!existing.officerIds.includes(character.id)) existing.officerIds.push(character.id);
    return;
  }
  const fleet: Fleet = {
    id: nextId(state, 'flt'),
    name: shipClass(lord.ship).name,
    faction: 'alliance',
    systemId: home.id,
    ships: [{ id: nextId(state, 'shp'), classId: lord.ship, damage: 0 }],
    troops: 0,
    officerIds: [character.id],
  };
  state.fleets.push(fleet);
  pushEvent(state, {
    kind: 'order',
    text: `The ${fleet.name} is cut out of the Crown's harbour and comes in to ${home.name} with ${lord.name} aboard.`,
    systemId: home.id,
    characterId: character.id,
  });
}

/**
 * Where the Confederacy goes home to. It has no seat; it has the Free Harbor,
 * and failing her whichever Lord's ship is at anchor, and failing them all the
 * island that loves it best. Never an island the Crown holds.
 */
export function syncHome(state: GameState): void {
  const candidates = [
    lordFleet(state, PIRATE_LORDS[0]),
    ...lordFleets(state),
  ].filter((f): f is Fleet => f !== undefined && !f.voyage);
  for (const fleet of candidates) {
    const here = getSystem(state, fleet.systemId);
    if (here.control !== 'empire') {
      state.factions.alliance.hqSystemId = here.id;
      return;
    }
  }
  const held = state.systems
    .filter((s) => s.control === 'alliance' && !s.uprising)
    .sort((a, b) => b.support.alliance - a.support.alliance);
  if (held[0]) state.factions.alliance.hqSystemId = held[0].id;
}
