/**
 * The Pirate Lords: three people, three ships, one thing each.
 *
 * Sean's rule, 14 September: the Confederacy has no base. It has three Lords,
 * each bound to a ship with a power of its own. The Crown wins by taking all
 * three; the Confederacy wins by taking Highwater.
 *
 * Amended 15 September: a Lord is a ship when idle and a person on an errand.
 * They can be sent to parley, to spy, to sign somebody on — and the moment
 * they step onto the quay they are an officer like any other, who can be found
 * out, hurt, and carried off to Highwater. Their ship lies where they left it,
 * cannot sail without them, and her power sleeps until they are back aboard.
 *
 * That is the whole of the Confederacy's dilemma and it is meant to hurt: the
 * three best people they have are also three of their best hulls, and early on
 * there is nothing else to send. Every errand is a squadron out of the war and
 * a third of the war's losing condition standing on somebody else's beach.
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

/**
 * Whether this Lord is standing on their own deck.
 *
 * Away means away for any reason: on an errand, hurt and recovering ashore,
 * or in the Crown's cells. Only an aboard Lord sails their ship and works
 * her power; the tests for both ask this rather than assuming, because for
 * a day and a half after this rule went in they assumed.
 */
export function lordAboard(state: GameState, lord: PirateLord): Character | undefined {
  const who = state.characters.find((c) => c.name === lord.name);
  if (!who) return undefined;
  return who.status === 'available' && !who.mission ? who : undefined;
}

/** The Lord this hull answers to, if they are off it and it cannot sail. */
export function awayLordOfShip(state: GameState, ship: Ship): Character | undefined {
  const lord = lordOfShip(ship.classId);
  if (!lord) return undefined;
  if (lordAboard(state, lord)) return undefined;
  return state.characters.find((c) => c.name === lord.name);
}

/** The first Lord keeping a fleet at anchor by being somewhere else. */
export function fleetHeldAshore(state: GameState, fleet: Fleet): Character | undefined {
  for (const ship of fleet.ships) {
    const away = awayLordOfShip(state, ship);
    if (away) return away;
  }
  return undefined;
}

/**
 * Put every Lord back on their own deck, and take off the ones who are not
 * there any more.
 *
 * Run once a day rather than hooked into each of the six places a mission can
 * end, because five of those places would have been remembered and the sixth
 * would have quietly left the Commodore standing on a beach with her ship
 * three Reaches away.
 */
export function reseatLords(state: GameState): void {
  for (const lord of PIRATE_LORDS) {
    const who = state.characters.find((c) => c.name === lord.name);
    if (!who || who.status === 'captured') continue;
    const fleet = lordFleet(state, lord);
    if (!fleet) continue;
    const home = lordAboard(state, lord);
    if (home) {
      if (!fleet.officerIds.includes(who.id)) fleet.officerIds.push(who.id);
      // A Lord aboard is wherever their ship is, even mid-voyage.
      who.locationSystemId = fleet.systemId;
    } else {
      fleet.officerIds = fleet.officerIds.filter((id) => id !== who.id);
    }
  }
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

/**
 * A fleet at anchor at this island carrying this power — and carrying the
 * Lord who works it. An empty deck is a fine hull and nothing more: the Moot
 * does not sit without the Commodore, and the Admiral cannot command a
 * harbour he is not in.
 */
export function powerAt(state: GameState, systemId: string, power: LordPower): Fleet | undefined {
  return state.fleets.find(
    (f) =>
      f.faction === 'alliance' &&
      !f.voyage &&
      f.systemId === systemId &&
      f.ships.some(
        (s) =>
          shipPower(s.classId) === power &&
          s.damage < shipClass(s.classId).hull! &&
          !awayLordOfShip(state, s),
      ),
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
  // The ship can strike with nobody aboard her, now that a Lord can be off on
  // an errand. Then she is a prize and no more: you cannot put irons on a
  // quarterdeck. The Lord hears about it wherever they are.
  if (!lordAboard(state, lord)) {
    const here = getSystem(state, fleet.systemId);
    pushEvent(state, {
      kind: 'war',
      text: `The ${shipClass(ship.classId).name} strikes her colours off ${here.name} with ${lord.name} ashore. The Crown has the ship; it does not have the Lord.`,
      systemId: here.id,
    });
    return;
  }
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
  const existing = lordFleet(state, lord);
  if (existing) {
    // Her ship still floats — she was taken off a beach, not off a deck — so
    // she goes back to it wherever it is lying, not to the Confederacy's
    // nominal home.
    character.locationSystemId = existing.systemId;
    if (!existing.officerIds.includes(character.id)) existing.officerIds.push(character.id);
    return;
  }
  character.locationSystemId = home.id;
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
