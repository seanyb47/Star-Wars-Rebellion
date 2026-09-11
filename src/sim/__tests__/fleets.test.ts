import { describe, expect, it } from 'vitest';
import { advanceDay } from '../advanceDay';
import { queueBuild } from '../build';
import { SHIP_ROLES, shipClass, shipSpec } from '../constants';
import { islandIncome, totalUpkeep } from '../economy';
import {
  addShip,
  advanceFleets,
  assaultError,
  embark,
  embarkError,
  fleetCapacity,
  fleetGuns,
  fleetsAt,
  isBlockaded,
  resolveLanding,
  sailError,
  sailFleet,
  updateBlockades,
} from '../fleets';
import { generateGalaxy } from '../galaxy';
import { getSystem } from '../helpers';
import { createRng } from '../rng';
import type { GameState, PlayableFaction, ShipClassId, System } from '../types';

/** A game with the player holding a known island, for orders to act on. */
function setup(seed = 7): { state: GameState; home: System } {
  const state = generateGalaxy(seed, 'empire');
  const home = getSystem(state, state.factions.empire.hqSystemId);
  return { state, home };
}

function put(
  state: GameState,
  system: System,
  faction: PlayableFaction,
  classes: ShipClassId[],
) {
  let fleet = addShip(state, system, faction, classes[0]);
  for (const id of classes.slice(1)) fleet = addShip(state, system, faction, id);
  return fleet;
}

describe('ship classes', () => {
  it('balances the two fleets identically, role for role', () => {
    for (const role of ['escort', 'capital', 'transport'] as const) {
      const empire = shipSpec(
        (['sovereign', 'kestrel', 'fluyt'] as ShipClassId[]).find(
          (id) => shipClass(id).role === role,
        )!,
      );
      const alliance = shipSpec(
        (['tempest', 'swift', 'brig'] as ShipClassId[]).find(
          (id) => shipClass(id).role === role,
        )!,
      );
      expect({ ...empire, label: '' }).toEqual({ ...alliance, label: '' });
    }
  });

  it('gives only transports and capitals room for companies', () => {
    expect(SHIP_ROLES.escort.carries).toBe(0);
    expect(SHIP_ROLES.transport.carries).toBeGreaterThan(0);
    expect(SHIP_ROLES.capital.carries).toBeGreaterThan(0);
  });
});

describe('building a hull', () => {
  it('a slipway lays one down, and it joins a fleet at that island', () => {
    const { state, home } = setup();
    home.facilities.push({ id: 'yard-test', type: 'shipyard', owner: 'empire' });
    state.factions.empire.gold = 500;

    queueBuild(state, 'yard-test', 'kestrel');
    expect(state.factions.empire.gold).toBe(500 - shipSpec('kestrel').costGold);

    let next = state;
    for (let day = 0; day < shipSpec('kestrel').days; day++) next = advanceDay(next);

    const fleets = fleetsAt(next, home.id).filter((f) => f.faction === 'empire');
    expect(fleets).toHaveLength(1);
    expect(fleets[0].ships).toHaveLength(1);
    expect(fleets[0].ships[0].classId).toBe('kestrel');
  });

  it('takes no island slot, because a hull floats', () => {
    const { state, home } = setup();
    home.facilities.push({ id: 'yard-test', type: 'shipyard', owner: 'empire' });
    state.factions.empire.gold = 500;
    // Fill every water slot; a hull should still be orderable.
    home.energySlots = home.facilities.filter((f) => f.type !== 'mine').length;
    expect(() => queueBuild(state, 'yard-test', 'kestrel')).not.toThrow();
  });

  it('charges upkeep for hulls and for the companies aboard them', () => {
    const { state, home } = setup();
    const before = totalUpkeep(state, 'empire');
    const fleet = put(state, home, 'empire', ['sovereign']);
    fleet.troops = 2;
    const after = totalUpkeep(state, 'empire');
    expect(after).toBe(before + SHIP_ROLES.capital.upkeep + 2);
  });
});

describe('sailing', () => {
  it('refuses a fleet that is not yours, and one already at sea', () => {
    const { state, home } = setup();
    const mine = put(state, home, 'empire', ['kestrel']);
    const theirs = put(state, home, 'alliance', ['swift']);
    const elsewhere = state.systems.find((s) => s.id !== home.id)!;

    expect(sailError(state, theirs.id, elsewhere.id, 'empire')).toBe('That fleet is not yours.');
    expect(sailError(state, mine.id, home.id, 'empire')).toBe('Already there.');
    expect(sailError(state, mine.id, elsewhere.id, 'empire')).toBeNull();

    sailFleet(state, mine.id, elsewhere.id, 'empire');
    expect(sailError(state, mine.id, elsewhere.id, 'empire')).toBe('Already at sea.');
  });

  it('takes days, and arrives at the island it was sent to', () => {
    const { state, home } = setup();
    const fleet = put(state, home, 'empire', ['kestrel']);
    const target = state.systems.find((s) => s.sectorId === home.sectorId && s.id !== home.id)!;

    sailFleet(state, fleet.id, target.id, 'empire');
    const days = fleet.voyage!.daysRemaining;
    expect(days).toBeGreaterThan(0);

    const rng = createRng(1);
    for (let day = 0; day < days - 1; day++) advanceFleets(state, rng);
    expect(fleet.systemId).toBe(home.id);

    advanceFleets(state, rng);
    expect(fleet.voyage).toBeUndefined();
    expect(fleet.systemId).toBe(target.id);
    // Sailing somewhere charts it.
    expect(getSystem(state, target.id).explored.empire).toBe(true);
  });
});

describe('battle', () => {
  it('resolves when two sides share a harbour, and costs hulls', () => {
    const { state, home } = setup();
    put(state, home, 'empire', ['sovereign', 'kestrel']);
    put(state, home, 'alliance', ['tempest', 'swift']);

    const rng = createRng(42);
    let rounds = 0;
    while (fleetsAt(state, home.id).length > 1 && rounds < 50) {
      advanceFleets(state, rng);
      rounds++;
    }
    // Somebody was sunk: the harbour does not hold both sides forever.
    expect(rounds).toBeLessThan(50);
    const sides = new Set(fleetsAt(state, home.id).map((f) => f.faction));
    expect(sides.size).toBeLessThanOrEqual(1);
  });

  it('is deterministic: the same seed fights the same battle', () => {
    const fight = () => {
      const { state, home } = setup(11);
      put(state, home, 'empire', ['sovereign', 'kestrel']);
      put(state, home, 'alliance', ['tempest', 'swift']);
      const rng = createRng(99);
      for (let i = 0; i < 12; i++) advanceFleets(state, rng);
      return state.fleets.map((f) => `${f.faction}:${f.ships.map((s) => s.damage).join(',')}`);
    };
    expect(fight()).toEqual(fight());
  });

  it('drowns companies whose transport goes down', () => {
    const { state, home } = setup();
    const fleet = put(state, home, 'empire', ['fluyt']);
    fleet.troops = fleetCapacity(fleet);
    expect(fleet.troops).toBeGreaterThan(0);
    // An overwhelming enemy: the transport has no guns of its own.
    put(state, home, 'alliance', ['tempest', 'tempest', 'tempest']);

    const rng = createRng(5);
    for (let i = 0; i < 20 && state.fleets.some((f) => f.faction === 'empire'); i++) {
      advanceFleets(state, rng);
    }
    expect(state.fleets.some((f) => f.faction === 'empire')).toBe(false);
  });

  it('leaves a lone fleet alone', () => {
    const { state, home } = setup();
    const fleet = put(state, home, 'empire', ['kestrel']);
    const rng = createRng(3);
    for (let i = 0; i < 10; i++) advanceFleets(state, rng);
    expect(fleet.ships).toHaveLength(1);
    expect(fleet.ships[0].damage).toBe(0);
  });
});

describe('blockade', () => {
  it('shuts an island you hold and stops it earning', () => {
    const { state, home } = setup();
    home.facilities.push({ id: 'mine-test', type: 'mine', owner: 'empire' });
    home.support.empire = 100;
    const earning = islandIncome(home, 'empire');
    expect(earning).toBeGreaterThan(0);

    put(state, home, 'alliance', ['tempest']);
    updateBlockades(state);

    expect(isBlockaded(state, home)).toBe(true);
    expect(home.blockaded).toBe(true);
    expect(islandIncome(home, 'empire')).toBe(0);
  });

  it('lifts when the enemy leaves', () => {
    const { state, home } = setup();
    const enemy = put(state, home, 'alliance', ['tempest']);
    updateBlockades(state);
    expect(home.blockaded).toBe(true);

    const elsewhere = state.systems.find((s) => s.id !== home.id)!;
    sailFleet(state, enemy.id, elsewhere.id, 'alliance');
    updateBlockades(state);
    expect(home.blockaded).toBe(false);
  });

  it('is not raised by an unarmed transport', () => {
    const { state, home } = setup();
    put(state, home, 'alliance', ['brig']);
    expect(fleetGuns(state.fleets[0])).toBe(0);
    updateBlockades(state);
    expect(home.blockaded).toBe(false);
  });
});

describe('embarking', () => {
  it('will not load more companies than there is room for', () => {
    const { state, home } = setup();
    const fleet = put(state, home, 'empire', ['fluyt']);
    home.garrison = 10;
    const room = fleetCapacity(fleet);

    expect(embarkError(state, fleet.id, room + 1, 'empire')).toBe('No room aboard.');
    embark(state, fleet.id, room, 'empire');
    expect(fleet.troops).toBe(room);
    expect(home.garrison).toBe(10 - room);
  });

  it('will not load companies that are not there', () => {
    const { state, home } = setup();
    const fleet = put(state, home, 'empire', ['fluyt']);
    home.garrison = 0;
    expect(embarkError(state, fleet.id, 1, 'empire')).toBe('Not enough companies ashore.');
  });

  it('puts them back ashore again', () => {
    const { state, home } = setup();
    const fleet = put(state, home, 'empire', ['fluyt']);
    home.garrison = 4;
    embark(state, fleet.id, 2, 'empire');
    embark(state, fleet.id, -2, 'empire');
    expect(fleet.troops).toBe(0);
    expect(home.garrison).toBe(4);
  });
});

describe('assault', () => {
  it('needs companies aboard, and an island that is not already yours', () => {
    const { state, home } = setup();
    const fleet = put(state, home, 'empire', ['fluyt']);
    expect(assaultError(state, fleet.id, 'empire')).toBe('No companies aboard.');
    fleet.troops = 2;
    expect(assaultError(state, fleet.id, 'empire')).toBe('The island is already yours.');
  });

  it('will not land while enemy guns hold the harbour', () => {
    const { state } = setup();
    const target = state.systems.find((s) => s.control === 'alliance' && s.populated)!;
    const fleet = put(state, target, 'empire', ['fluyt']);
    fleet.troops = 2;
    put(state, target, 'alliance', ['tempest']);
    expect(assaultError(state, fleet.id, 'empire')).toBe('Enemy ships hold the harbour.');
  });

  it('takes the island when the landing force outnumbers the garrison', () => {
    const { state } = setup();
    const target = state.systems.find((s) => s.control === 'alliance' && s.populated)!;
    target.garrison = 1;
    const fleet = put(state, target, 'empire', ['sovereign', 'sovereign']);
    fleet.troops = 4;

    resolveLanding(state, fleet, createRng(1));

    expect(target.control).toBe('empire');
    expect(target.garrison).toBe(3); // four landed, one spent against the defence
    expect(fleet.troops).toBe(0);
  });

  it('is thrown back when the garrison is the stronger', () => {
    const { state } = setup();
    const target = state.systems.find((s) => s.control === 'alliance' && s.populated)!;
    target.garrison = 5;
    const fleet = put(state, target, 'empire', ['sovereign']);
    fleet.troops = 2;

    resolveLanding(state, fleet, createRng(1));

    expect(target.control).toBe('alliance');
    expect(target.garrison).toBe(3);
    expect(fleet.troops).toBe(0);
  });

  it('leaves an island taken by force sullen rather than loyal', () => {
    const { state } = setup();
    const target = state.systems.find((s) => s.control === 'alliance' && s.populated)!;
    target.garrison = 0;
    target.support.empire = 0;
    const fleet = put(state, target, 'empire', ['sovereign']);
    fleet.troops = 2;

    resolveLanding(state, fleet, createRng(1));

    expect(target.control).toBe('empire');
    // Carried at gunpoint: held, but nowhere near loyal.
    expect(target.support.empire).toBeLessThan(60);
    expect(target.support.empire).toBeGreaterThan(0);
  });
});

describe('the opponent uses its navy', () => {
  it('lays down hulls, puts to sea, and eventually fights', () => {
    // Give the opponent a yard and the gold for it, then let the war run.
    let state = generateGalaxy(3, 'empire');
    const theirs = state.systems.find((s) => s.control === 'alliance' && s.populated)!;
    theirs.facilities.push({ id: 'ai-yard', type: 'shipyard', owner: 'alliance' });
    state.factions.alliance.gold = 4000;

    let sailed = false;
    for (let day = 0; day < 400 && !state.winner; day++) {
      state = advanceDay(state);
      if (state.fleets.some((f) => f.faction === 'alliance' && f.voyage)) sailed = true;
    }

    expect(state.fleets.some((f) => f.faction === 'alliance')).toBe(true);
    expect(sailed).toBe(true);
  });

  it('plays by the same rules the player does', () => {
    const { state, home } = setup();
    const theirs = put(state, home, 'alliance', ['swift']);
    // The opponent's fleet is not the player's to order, and vice versa.
    expect(sailError(state, theirs.id, home.id, 'empire')).toBe('That fleet is not yours.');
    expect(sailError(state, theirs.id, home.id, 'alliance')).toBe('Already there.');
  });
});
