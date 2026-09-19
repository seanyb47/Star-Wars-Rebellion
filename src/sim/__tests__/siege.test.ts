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
  bombardRound,
  fleetBombard,
  fortGuns,
  fortsOf,
  repairOvernight,
  wallCondition,
} from '../fleets';
import { getSystem, requiredGarrison } from '../helpers';
import { orderAssault, orderBombard, orderCeaseFire } from '../commands';
import {
  CAPITAL_GARRISON,
  CAPITAL_WALLS,
  FORT_GUNS,
  FORT_STRENGTH,
  REPAIR_PER_DAY,
  shipSpec,
} from '../constants';
import type { GameState, PlayableFaction, ShipClassId, System } from '../types';

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

describe('the seawall gates the landing', () => {
  it('refuses an assault while any wall stands, and allows it once none does', () => {
    const state = world();
    const isle = walled(state);
    isle.garrison = 2;
    const fleet = put(state, isle, 'alliance', ['reef', 'reef', 'brig']);
    fleet.troops = 6;

    expect(assaultError(state, fleet.id, 'alliance')).toMatch(/seawall/i);
    // Beaten to rubble, and the door is open.
    for (const fort of isle.facilities) if (fort.type === 'fort') fort.damage = FORT_STRENGTH;
    isle.facilities = isle.facilities.filter((f) => f.type !== 'fort');
    expect(assaultError(state, fleet.id, 'alliance')).toBeNull();
  });

  it('will not open fire while their ships are still in the water', () => {
    const state = world();
    const isle = walled(state);
    const mine = put(state, isle, 'alliance', ['reef', 'reef']);
    put(state, isle, 'empire', ['kestrel']);
    expect(bombardError(state, mine.id, 'alliance')).toMatch(/ships hold the harbor/i);
  });

  it('will not open fire with nothing aboard that throws heavy enough', () => {
    const state = world();
    const isle = walled(state);
    const boats = put(state, isle, 'alliance', ['brig', 'brig']);
    expect(fleetBombard(boats)).toBe(0);
    expect(bombardError(state, boats.id, 'alliance')).toMatch(/heavy enough/i);
  });
});

describe('a day of bombardment', () => {
  it('takes the walls down over days, and the battery fires back the whole time', () => {
    const state = world();
    const isle = walled(state);
    const fleet = put(state, isle, 'alliance', ['reef', 'reef']);
    expect(fleetBombard(fleet)).toBe(shipSpec('reef').bombard * 2);
    expect(Math.round(fortGuns(isle))).toBe(FORT_GUNS);

    const rng = createRng(4);
    const before = fleet.ships.reduce((n, s) => n + s.damage, 0);
    bombardRound(state, fleet, rng);
    expect(wallCondition(isle)).toBeLessThan(1);
    // Hurt in the doing of it: the wall shoots at whoever is working it.
    expect(fleet.ships.reduce((n, s) => n + s.damage, 0)).toBeGreaterThan(before);

    // And its gunnery falls with it, so the second day is cheaper than the first.
    expect(fortGuns(isle)).toBeLessThan(FORT_GUNS);

    for (let d = 0; d < 10 && fortsOf(isle).length > 0; d++) bombardRound(state, fleet, rng);
    expect(fortsOf(isle)).toHaveLength(0);
  });

  it('leaves rubble, not a wall that mends itself back into a wall', () => {
    // Measured before this rule: a wall driven to nothing was patched a stone
    // overnight, which put it back under its own strength and therefore back
    // on the list of walls standing. Every siege in eight games ground to two
    // per cent and stayed there for ever.
    const state = world();
    const isle = walled(state);
    const fleet = put(state, isle, 'alliance', ['reef', 'reef', 'reef']);
    const rng = createRng(9);
    for (let d = 0; d < 12 && fortsOf(isle).length > 0; d++) {
      bombardRound(state, fleet, rng);
      repairOvernight(state);
    }
    expect(fortsOf(isle)).toHaveLength(0);
    expect(isle.facilities.some((f) => f.type === 'fort')).toBe(false);
    // The slot the wall stood in is free again.
    expect(isle.facilities.length).toBeLessThan(isle.slots);
  });

  it('reaches the garrison only past the walls, and the whole Reach hears about it', () => {
    const state = world();
    const isle = walled(state, 0);
    isle.garrison = 4;
    // Room to fall: at ninety-ten the second day's larger hit is clipped by
    // the floor and the stacking cannot be seen.
    isle.support = { empire: 60, alliance: 40 };
    const neighbour = state.systems.find(
      (s) => s.sectorId === isle.sectorId && s.id !== isle.id && s.populated,
    )!;
    const nearBefore = neighbour.support.alliance;
    const fleet = put(state, isle, 'alliance', ['reef', 'reef', 'reef']);

    bombardRound(state, fleet, createRng(2));
    expect(isle.garrison).toBeLessThan(4);
    // The people turn against whoever is doing the shelling, here and
    // everywhere else in the Reach that hears of it.
    expect(isle.support.alliance).toBeLessThan(40);
    expect(neighbour.support.alliance).toBeLessThan(nearBefore);
    expect(isle.shelled).toBe(1);

    // And it costs more the second day than the first.
    const firstDay = 40 - isle.support.alliance;
    const was = isle.support.alliance;
    bombardRound(state, fleet, createRng(3));
    expect(was - isle.support.alliance).toBeGreaterThan(firstDay);
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

    const atSea = put(state, mine, 'alliance', ['reef']);
    atSea.ships[0].damage = 20;
    atSea.voyage = { targetSystemId: mine.id, daysRemaining: 3 };
    repairOvernight(state);
    expect(hurt(atSea)).toBe(20);

    atSea.voyage = undefined;
    repairOvernight(state);
    const atAnchor = 20 - hurt(atSea);
    expect(atAnchor).toBeCloseTo(shipSpec('reef').hull * REPAIR_PER_DAY, 5);

    // The same hull, at an island of ours with a yard on it.
    mine.facilities.push({ id: 'fac-yard-test', type: 'shipyard', owner: 'alliance' });
    atSea.ships[0].damage = 20;
    repairOvernight(state);
    expect(20 - hurt(atSea)).toBeCloseTo(atAnchor * 2, 5);
  });

  it('patches a wall under blockade, but the yard does not work', () => {
    const state = world();
    const isle = walled(state);
    isle.blockaded = true;
    const fort = isle.facilities.find((f) => f.type === 'fort')!;
    fort.damage = 30;
    // A hull of theirs in their own blockaded harbor.
    const theirs = put(state, isle, 'empire', ['sovereign']);
    theirs.ships[0].damage = 20;
    isle.facilities.push({ id: 'fac-yard-2', type: 'shipyard', owner: 'empire' });

    repairOvernight(state);
    // Men with shovels work under fire. Shipwrights do not — so the hull mends
    // at the plain rate rather than the yard's.
    expect(fort.damage).toBeLessThan(30);
    expect(20 - theirs.ships[0].damage).toBeCloseTo(shipSpec('sovereign').hull * REPAIR_PER_DAY, 5);
  });
});

describe('taking the island', () => {
  it('lands enough to hold it quiet and keeps the rest aboard', () => {
    const state = world();
    const isle = walled(state, 0);
    isle.garrison = 1;
    const fleet = put(state, isle, 'alliance', ['reef', 'reef', 'brig']);
    fleet.troops = 9;
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
  it('walls and mans the Aldermain in every world', () => {
    for (const seed of [3, 11, 29, 101]) {
      const state = generateGalaxy(seed, 'alliance');
      const seat = getSystem(state, state.factions.empire.hqSystemId);
      expect(seat.name, `seed ${seed}`).toBe('The Aldermain');
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
    let next = advanceDay(state);
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

describe('the siege as standing orders', () => {
  it('fires once a day and stops itself when there is nothing left to fire on', () => {
    const state = world();
    const isle = walled(state);
    isle.garrison = 0;
    const fleet = put(state, isle, 'alliance', ['reef', 'reef', 'reef']);
    fleet.bombarding = true;
    const rng = createRng(6);
    for (let d = 0; d < 20 && fleet.bombarding; d++) advanceSieges(state, rng);
    expect(fortsOf(isle)).toHaveLength(0);
    expect(fleet.bombarding).toBeUndefined();
  });
});

describe('a siege, end to end, through the orders a player gives', () => {
  it('blockade, walls, landing — and the island changes hands', () => {
    let state = world(21);
    state.player = 'alliance';
    const isleId = walled(state).id;
    const at = (s: GameState) => s.systems.find((x) => x.id === isleId)!;
    at(state).garrison = 3;
    // Weight enough to be through the wall and still be afloat after. Two of
    // the line and a transport was cutting it fine, and once the world's
    // islands were rolled differently the squadron started dying on the third
    // day with the wall at thirteen per cent — which is the doctrine's own
    // point about not dabbling, and a bad fixture for a test about the
    // sequence of orders.
    const fleet = put(state, at(state), 'alliance', ['reef', 'reef', 'reef', 'brig']);
    fleet.troops = 6;
    const fleetId = fleet.id;

    // The landing is shut while the wall stands, and the guns are the only
    // way to open it.
    expect(orderAssault(state, fleetId).error).toMatch(/seawall/i);
    const opened = orderBombard(state, fleetId);
    expect(opened.error).toBeUndefined();
    state = opened.state;
    expect(state.fleets.find((f) => f.id === fleetId)!.bombarding).toBe(true);

    // Days pass. The squadron works the walls on its own, and takes fire.
    for (let d = 0; d < 30 && fortsOf(at(state)).length > 0; d++) state = advanceDay(state);
    expect(fortsOf(at(state))).toHaveLength(0);
    // Standing orders end themselves once there is nothing left to fire on.
    const after = state.fleets.find((f) => f.id === fleetId);
    expect(after).toBeDefined();

    // And now the boats go in.
    const landing = orderAssault(state, fleetId);
    expect(landing.error).toBeUndefined();
    state = landing.state;
    expect(at(state).control).toBe('alliance');
    expect(state.events.some((e) => /carried by storm/i.test(e.text))).toBe(true);
  });

  it('calls the guns off when told, and they stay off', () => {
    let state = world(21);
    state.player = 'alliance';
    const isleId = walled(state).id;
    const fleet = put(state, state.systems.find((s) => s.id === isleId)!, 'alliance', ['reef', 'reef']);
    state = orderBombard(state, fleet.id).state;
    state = orderCeaseFire(state, fleet.id).state;
    expect(state.fleets.find((f) => f.id === fleet.id)!.bombarding).toBeUndefined();
    const before = wallCondition(state.systems.find((s) => s.id === isleId)!);
    state = advanceDay(state);
    // Untouched, and mending.
    expect(wallCondition(state.systems.find((s) => s.id === isleId)!)).toBeGreaterThanOrEqual(before);
  });
});
