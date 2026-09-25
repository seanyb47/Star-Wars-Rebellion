import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { advanceDay } from '../advanceDay';
import { createRng } from '../rng';
import {
  addShip,
  advanceSieges,
  assault,
  assaultError,
  bombardError,
  bombardNow,
  bombardOdds,
  fleetBombard,
  fortsOf,
  islandBombardDefense,
  repairOvernight,
} from '../fleets';
import { getSystem, requiredGarrison } from '../helpers';
import { orderAssault, orderBombard } from '../commands';
import {
  BOMBARD_TICKS_MAX,
  CAPITAL_GARRISON,
  CAPITAL_WALLS,
  FORT_BOMBARD_DEFENSE,
  REPAIR_PER_DAY,
  shipSpec,
} from '../constants';
import type { GameState, PlayableFaction, ShipClassId, System } from '../types';

/**
 * The siege, after 21 September.
 *
 * Most of this file used to be about a standing order that fired once a
 * morning and ground a wall's hit points down over a fortnight, with the
 * battery firing back the whole time and patching itself overnight. None of
 * that exists. What is here now is two ordered actions with dice in them, and
 * the tests are about the sequence and the refusals rather than about an
 * arithmetic of attrition.
 */

function world(seed = 7): GameState {
  const state = generateGalaxy(seed, 'alliance');
  state.fleets.length = 0;
  return state;
}
function put(state: GameState, system: System, faction: PlayableFaction, classes: ShipClassId[]) {
  let fleet = addShip(state, system, faction, classes[0]);
  for (const id of classes.slice(1)) fleet = addShip(state, system, faction, id);
  return fleet;
}
/** A Crown island with a wall on it, and nobody's fleet in the water. */
function walled(state: GameState, forts = 1) {
  const isle = state.systems.find(
    (s) => s.control === 'empire' && s.populated && s.id !== state.factions.empire.hqSystemId,
  )!;
  isle.explored.alliance = true;
  isle.facilities = isle.facilities.filter((f) => f.type !== 'fort');
  for (let i = 0; i < forts; i++) {
    isle.facilities.push({ id: `fac-test-${i}`, type: 'fort', owner: 'empire' });
  }
  isle.slots = Math.max(isle.slots, isle.facilities.length);
  return isle;
}

describe('the sequence of orders', () => {
  /**
   * The gate is repealed. Sean, 15 September: *"a single fortress on the
   * island prevents the fleet from doing an assault"* — gone on 20 September,
   * because with the wall as a turnstile there was exactly one order of
   * operations and no decision anywhere in it. A standing wall adds its
   * Invasion Defense to the garrison's die instead, so storming it is
   * expensive rather than impossible and bombardment becomes softening.
   */
  it('lets the boats go in with the wall still standing, and charges for it', () => {
    const state = world();
    const isle = walled(state);
    isle.garrison = 2;
    const fleet = put(state, isle, 'alliance', ['coral-dreadnaught', 'brigantine']);
    fleet.troops = 6;
    expect(assaultError(state, fleet.id, 'alliance')).toBeNull();
  });

  it('will not open fire while their ships are still in the water', () => {
    const state = world();
    const isle = walled(state);
    const mine = put(state, isle, 'alliance', ['coral-dreadnaught', 'coral-dreadnaught']);
    put(state, isle, 'empire', ['interceptor-i']);
    expect(bombardError(state, mine.id, 'alliance')).toMatch(/ships hold the harbor/i);
  });

  it('will not open fire with nothing aboard that throws heavy enough', () => {
    const state = world();
    const isle = walled(state);
    const boats = put(state, isle, 'alliance', ['brigantine', 'brigantine']);
    expect(fleetBombard(boats)).toBe(0);
    expect(bombardError(state, boats.id, 'alliance')).toMatch(/heavy enough/i);
  });
});

describe('a bombardment', () => {
  /**
   * One action, resolved on the press. Sean, on the old pacing: *"The once
   * per day mechanic will be annoying tbh. It means you have to sit and
   * wait."*
   */
  it('is over the moment it is ordered', () => {
    const state = world();
    const isle = walled(state, 1);
    isle.garrison = 0;
    // Enough weight to be sure of the one wall: it stands at 4, so anything
    // over 8 can break it and a Dreadnaught and a Goliath roll 12.
    const fleet = put(state, isle, 'alliance', ['coral-dreadnaught', 'urskin-goliath']);
    expect(fleetBombard(fleet)).toBeGreaterThan(FORT_BOMBARD_DEFENSE.fort * 2);
    let down = 0;
    for (let i = 0; i < 40; i++) {
      const fresh = world();
      const target = walled(fresh, 1);
      target.garrison = 0;
      const squadron = put(fresh, target, 'alliance', ['coral-dreadnaught', 'urskin-goliath']);
      bombardNow(fresh, squadron, createRng(i + 1));
      if (fortsOf(target).length === 0) down += 1;
    }
    // Most single actions take the wall outright, which is the whole point of
    // it being an action rather than a fortnight.
    expect(down).toBeGreaterThan(20);
  });

  /**
   * > A ship may bombard FIVE TIMES before returning to a friendly port,
   * > where its ticks clear in full. A spent ship adds nothing to the fleet
   * > score but still blockades normally.
   */
  it('empties a magazine in five, and fills it again at home', () => {
    const state = world();
    const isle = walled(state, 3);
    isle.garrison = 6;
    const fleet = put(state, isle, 'alliance', ['coral-dreadnaught']);
    const full = fleetBombard(fleet);
    expect(full).toBeGreaterThan(0);
    for (let i = 0; i < BOMBARD_TICKS_MAX; i++) {
      if (bombardError(state, fleet.id, 'alliance') === null) {
        bombardNow(state, fleet, createRng(50 + i));
      }
    }
    expect(fleet.ships[0].bombardTicks).toBe(BOMBARD_TICKS_MAX);
    // Out of shot: no weight, and a refusal that says so rather than reading
    // as a defeat.
    expect(fleetBombard(fleet)).toBe(0);
    expect(bombardError(state, fleet.id, 'alliance')).toMatch(/out of shot/i);

    // Home to a port of theirs, and the magazine fills.
    const home = state.systems.find((s) => s.control === 'alliance' && !s.blockaded)!;
    fleet.systemId = home.id;
    advanceSieges(state, createRng(1));
    expect(fleet.ships[0].bombardTicks).toBeUndefined();
    expect(fleetBombard(fleet)).toBe(full);
  });

  /**
   * > Because the top of the die IS the fleet's bombardment score, a fleet
   * > under that number has ZERO chance rather than poor odds — so say so
   * > before a tick is spent.
   *
   * This is the readout the UI owes the player, and the reason the opponent
   * stopped besieging things it could never break: measured on 21 September,
   * the Crown shelled Freeport every day from day 214 to the end of the war
   * and never once got through the wall.
   */
  it('says plainly when a squadron cannot break anything at all', () => {
    const state = world();
    const isle = walled(state, 3);
    isle.garrison = 0;
    // Three Fortresses stand at 12; to break one you must roll 12 + 4.
    expect(islandBombardDefense(isle)).toBe(FORT_BOMBARD_DEFENSE.fort * 3);
    const small = put(state, isle, 'alliance', ['marauder']);
    const odds = bombardOdds(state, small);
    expect(odds.rolls).toBeLessThan(odds.against + FORT_BOMBARD_DEFENSE.fort);
    expect(odds.hopeless).toBe(true);
    // And it really is hopeless, not merely unlikely.
    for (let i = 0; i < 60; i++) {
      const before = fortsOf(isle).length;
      bombardNow(state, small, createRng(200 + i));
      expect(fortsOf(isle)).toHaveLength(before);
    }
  });

  /**
   * > Walls while any stand; once they are all rubble, the garrison.
   */
  it('cannot reach the garrison while a wall is standing', () => {
    const state = world();
    const isle = walled(state, 1);
    isle.garrison = 4;
    const before = isle.garrison;
    const fleet = put(state, isle, 'alliance', ['coral-dreadnaught']);
    // A roll that breaks the wall and nothing else still leaves four ashore;
    // a roll that cascades past it may reach them. What is impossible is
    // reaching them with the wall still up.
    bombardNow(state, fleet, createRng(11));
    if (fortsOf(isle).length > 0) expect(isle.garrison).toBe(before);
  });

  it('leaves rubble, not a wall that mends itself back into a wall', () => {
    // Measured before the walls went binary: a wall driven to nothing was
    // patched a stone overnight, which put it back under its own strength and
    // therefore back on the list of walls standing. Every siege in eight games
    // ground to two per cent and stayed there for ever.
    const state = world();
    const isle = walled(state);
    const fleet = put(state, isle, 'alliance', ['coral-dreadnaught', 'urskin-goliath', 'ironback']);
    for (let d = 0; d < BOMBARD_TICKS_MAX && fortsOf(isle).length > 0; d++) {
      bombardNow(state, fleet, createRng(9 + d));
      repairOvernight(state);
    }
    expect(fortsOf(isle)).toHaveLength(0);
    expect(isle.facilities.some((f) => f.type === 'fort')).toBe(false);
    // The berth the wall stood in is free again.
    expect(isle.facilities.length).toBeLessThan(isle.slots);
  });
});

describe('what mends overnight', () => {
  it('mends nothing at sea, a little at anchor, and twice that at a yard', () => {
    const state = world();
    const mine = state.systems.find((s) => s.control === 'alliance' && s.populated)!;
    // No yard here to begin with: the test is about the difference a yard
    // makes, so it must not start with one whichever island the dice picked.
    mine.facilities = mine.facilities.filter((f) => f.type !== 'shipyard');
    const hurt = (f: { ships: { damage: number }[] }) => f.ships[0].damage;

    // A thousand points of damage rather than twenty: the canonical roster
    // put hulls on a scale where a Dreadnaught has 11,700 of them, so twenty
    // is inside a night's mending and the test measured nothing.
    const START_DAMAGE = 1000;
    const atSea = put(state, mine, 'alliance', ['coral-dreadnaught']);
    atSea.ships[0].damage = START_DAMAGE;
    atSea.voyage = { targetSystemId: mine.id, daysRemaining: 3 };
    repairOvernight(state);
    expect(hurt(atSea)).toBe(START_DAMAGE);

    atSea.voyage = undefined;
    repairOvernight(state);
    const atAnchor = START_DAMAGE - hurt(atSea);
    expect(atAnchor).toBeCloseTo(shipSpec('coral-dreadnaught').hull * REPAIR_PER_DAY, 5);

    // The same hull, at an island of ours with a yard on it.
    mine.facilities.push({ id: 'fac-yard-test', type: 'shipyard', owner: 'alliance' });
    atSea.ships[0].damage = START_DAMAGE;
    repairOvernight(state);
    expect(START_DAMAGE - hurt(atSea)).toBeCloseTo(atAnchor * 2, 5);
  });

  /**
   * And nothing mends stone, because there is no stone to mend. A wall is
   * standing or it is rubble; the percentage-patch is gone with the hit
   * points, and with it a silent bug — because the patch was a percentage and
   * the bombardment a flat subtraction, any fleet under 1.2 a day could never
   * scratch a Fortress and nothing anywhere said so.
   */
  it('mends a hull in a blockaded harbor, and never mends a wall', () => {
    const state = world();
    const isle = walled(state);
    isle.blockaded = true;
    const fort = isle.facilities.find((f) => f.type === 'fort')!;
    const theirs = put(state, isle, 'empire', ['sovereign']);
    theirs.ships[0].damage = 1000;
    isle.facilities.push({ id: 'fac-yard-2', type: 'shipyard', owner: 'empire' });

    repairOvernight(state);
    // Shipwrights do not work under fire, so the hull mends at the plain rate
    // rather than the yard's.
    expect(1000 - theirs.ships[0].damage).toBeCloseTo(shipSpec('sovereign').hull * REPAIR_PER_DAY, 5);
    // And the wall is exactly as it was, because a wall has no condition.
    expect(fort.damage).toBeUndefined();
  });
});

describe('taking the island', () => {
  it('lands enough to hold it quiet and keeps the rest aboard', () => {
    const state = world();
    const isle = walled(state, 0);
    isle.garrison = 1;
    const fleet = put(state, isle, 'alliance', ['coral-dreadnaught', 'coral-dreadnaught', 'brigantine']);
    fleet.troops = 12;
    expect(assaultError(state, fleet.id, 'alliance')).toBeNull();

    assault(state, fleet.id, createRng(5), 'alliance');
    expect(isle.control).toBe('alliance');
    // Ashore: what a sullen island asks for. Aboard: the rest, so the
    // squadron can go on to the next island instead of ending its campaign.
    expect(isle.garrison).toBe(Math.max(1, requiredGarrison(35)));
    expect(fleet.troops).toBeGreaterThan(0);
  });
});

describe('the Crown opens behind its own seawalls', () => {
  it('walls and mans Highwater in every world', () => {
    for (const seed of [3, 11, 29, 101]) {
      const state = generateGalaxy(seed, 'alliance');
      const seat = getSystem(state, state.factions.empire.hqSystemId);
      expect(seat.name, `seed ${seed}`).toBe('Highwater');
      expect(fortsOf(seat), `seed ${seed}`).toHaveLength(CAPITAL_WALLS);
      expect(seat.garrison, `seed ${seed}`).toBe(CAPITAL_GARRISON);
    }
  });
});

describe('nobody ashore, and the people decide', () => {
  it('hands an empty island to whoever its people prefer', () => {
    const state = world();
    const isle = state.systems.find(
      (s) => s.control === 'empire' && s.populated && s.id !== state.factions.empire.hqSystemId,
    )!;
    isle.garrison = 0;
    isle.support = { empire: 15, alliance: 85 };
    const next = advanceDay(state);
    const after = next.systems.find((s) => s.id === isle.id)!;
    expect(after.control).toBe('alliance');
    expect(next.events.some((e) => /nobody ashore to argue/i.test(e.text))).toBe(true);
  });

  it('leaves it alone while somebody is standing on it', () => {
    const state = world();
    const isle = state.systems.find(
      (s) => s.control === 'empire' && s.populated && s.id !== state.factions.empire.hqSystemId,
    )!;
    isle.garrison = 1;
    isle.support = { empire: 15, alliance: 85 };
    isle.commanderId = undefined;
    const next = advanceDay(state);
    const after = next.systems.find((s) => s.id === isle.id)!;
    // It may riot — it is thinly held and its people hate them — but it is
    // still theirs, because a garrison is what control is.
    expect(after.control).toBe('empire');
  });
});

describe('a siege, end to end, through the orders a player gives', () => {
  it('blockade, walls, landing — and the island changes hands', () => {
    let state = world(21);
    state.player = 'alliance';
    const isleId = walled(state).id;
    const at = (s: GameState) => s.systems.find((x) => x.id === isleId)!;
    at(state).garrison = 3;
    const fleet = put(state, at(state), 'alliance', [
      'coral-dreadnaught',
      'urskin-goliath',
      'ironback',
      'brigantine',
    ]);
    fleet.troops = 10;
    const fleetId = fleet.id;

    // The landing is open from the first minute now — that is the repealed
    // rule — but going in over a standing wall is dearer, so the guns come
    // first if the squadron has them.
    // `orderAssault` reports no error by leaving the field out.
    expect(orderAssault(state, fleetId).error).toBeUndefined();
    for (let n = 0; n < BOMBARD_TICKS_MAX && fortsOf(at(state)).length > 0; n++) {
      const opened = orderBombard(state, fleetId);
      if (opened.error) break;
      state = opened.state;
    }
    expect(fortsOf(at(state))).toHaveLength(0);

    // And now the boats go in against nothing but the garrison.
    const landing = orderAssault(state, fleetId);
    expect(landing.error).toBeUndefined();
    state = landing.state;
    expect(at(state).control).toBe('alliance');
    expect(state.events.some((e) => /carried by storm/i.test(e.text))).toBe(true);
  });
});
