import { describe, expect, it } from 'vitest';
import { advanceDay } from '../advanceDay';
import { queueBuild } from '../build';
import { SHIP_CLASSES, shipClass, shipSpec, shipsFor } from '../constants';
import { islandIncome, totalIncome, totalUpkeep } from '../economy';
import {
  addShip,
  board,
  boardError,
  advanceFleets,
  assaultError,
  embark,
  embarkError,
  clearWrecks,
  fleetCapacity,
  fleetGuns,
  fleetsAt,
  isBlockaded,
  resolveLanding,
  sailDays,
  sailError,
  sailFleet,
  updateBlockades,
} from '../fleets';
import { generateGalaxy } from '../galaxy';
import {
  allLordsTaken,
  holdTheMoot,
  lordPowerAt,
  lords,
  passageShare,
  syncHome,
} from '../lords';
import { PIRATE_LORDS } from '../constants';
import { isDiplomacyTarget, startMission, travelDays } from '../missions';
import { getSystem } from '../helpers';
import { createRng } from '../rng';
import type { GameState, PlayableFaction, ShipClassId, System } from '../types';

/** A game with the player holding a known island, for orders to act on.
 *
 * Cleared of the fleets the game now starts with. Those are the opening
 * position and are tested as such in `the opening position` below; every test
 * here is about what happens to a fleet it puts on the water itself, and would
 * otherwise be counting the Home Fleet's hulls as well as its own. */
function setup(seed = 7): { state: GameState; home: System } {
  const state = generateGalaxy(seed, 'empire');
  state.fleets.length = 0;
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

describe('the roster on the water', () => {
  /**
   * What replaced "even in weight".
   *
   * This used to weigh four hulls a side and demand they came within a tenth
   * of each other on guns, hull, gold and berths — a rule written when the two
   * navies were one navy in two colours with different names on the classes.
   * The v4.3 sheet is not built that way and says so: the Crown's doctrine is
   * *"standardized combined-arms fleets ... strong Heavy Guns and capital
   * ships"* and the Confederacy's is *"asymmetric specialists, fast raiders
   * ... ships that trade standardization for unusual strategic advantages"*.
   * A rule demanding they match is a rule against the design.
   *
   * What still has to hold is that neither ladder is simply the other one with
   * the numbers turned up, so this reads the whole of each side's roster and
   * checks the two doctrines are actually in it.
   */
  it('gives the Crown the heavy metal and the Confederacy the speed', () => {
    const heavy = (f: PlayableFaction) =>
      shipsFor(f).reduce((n, c) => n + (c.heavyGuns ?? 0), 0);
    const quick = (f: PlayableFaction) =>
      shipsFor(f).filter((c) => c.pointOfSail === 'Fast' || c.pointOfSail === 'Very Fast').length;
    expect(heavy('empire')).toBeGreaterThan(heavy('alliance'));
    expect(quick('alliance')).toBeGreaterThanOrEqual(quick('empire'));
  });

  /**
   * Every hull states its own numbers, and that is the point of the swap.
   *
   * `SHIP_ROLES` used to carry four archetypes and most hulls took their
   * figures from one of them, so the tests that stood here checked the
   * archetypes: bigger hits harder, costs more, sails slower. There are no
   * archetypes any more — the sheet gives all twenty-eight their own Size,
   * point of sail, three gun counts, Armor, Hull, cost, days and maintenance —
   * and the role is a label for a silhouette. So the thing worth failing the
   * build over is that nothing on the water is falling back to a default.
   */
  it('takes every figure from the sheet and none from an archetype', () => {
    for (const cls of SHIP_CLASSES) {
      if (cls.legend) continue;
      for (const key of ['hull', 'costGold', 'days', 'upkeep', 'size', 'pointOfSail'] as const) {
        expect(cls[key], `${cls.name} has no ${key} of its own`).toBeDefined();
      }
      expect(cls.hull, cls.name).toBeGreaterThan(0);
    }
  });

  /**
   * And the old shape survives inside the new numbers: a bigger hull really is
   * slower and dearer and harder to sink, hull by hull rather than by
   * archetype.
   */
  it('still makes size a trade', () => {
    const bySize = (size: string) => SHIP_CLASSES.filter((c) => !c.legend && c.size === size);
    const mean = (cs: typeof SHIP_CLASSES, pick: (c: (typeof SHIP_CLASSES)[number]) => number) =>
      cs.reduce((n, c) => n + pick(c), 0) / cs.length;
    const small = bySize('Small');
    const big = [...bySize('Large'), ...bySize('Gigantic')];
    expect(mean(small, (c) => c.hull ?? 0)).toBeLessThan(mean(big, (c) => c.hull ?? 0));
    expect(mean(small, (c) => c.costGold ?? 0)).toBeLessThan(mean(big, (c) => c.costGold ?? 0));
    expect(mean(small, (c) => c.pace ?? 0)).toBeLessThan(mean(big, (c) => c.pace ?? 0));
    // And smaller is harder to catch, which is the other half of the trade.
    expect(mean(small, (c) => c.speed ?? 0)).toBeGreaterThan(mean(big, (c) => c.speed ?? 0));
  });
});

describe('building a hull', () => {
  it('a slipway lays one down, and it joins a fleet at that island', () => {
    const { state, home } = setup();
    home.facilities.push({ id: 'yard-test', type: 'shipyard', owner: 'empire' });
    state.factions.empire.gold = 500;

    queueBuild(state, 'yard-test', 'CWN-INT-S02');
    expect(state.factions.empire.gold).toBe(500 - shipSpec('CWN-INT-S02').costGold);

    let next = state;
    for (let day = 0; day < shipSpec('CWN-INT-S02').days; day++) next = advanceDay(next);

    const fleets = fleetsAt(next, home.id).filter((f) => f.faction === 'empire');
    expect(fleets).toHaveLength(1);
    expect(fleets[0].ships).toHaveLength(1);
    expect(fleets[0].ships[0].classId).toBe('CWN-INT-S02');
  });

  it('takes no island slot, because a hull floats', () => {
    const { state, home } = setup();
    home.facilities.push({ id: 'yard-test', type: 'shipyard', owner: 'empire' });
    state.factions.empire.gold = 500;
    // Fill every water slot; a hull should still be orderable.
    home.slots = home.facilities.length;
    expect(() => queueBuild(state, 'yard-test', 'CWN-INT-S02')).not.toThrow();
  });

  it('charges upkeep for hulls and for the troops aboard them', () => {
    const { state, home } = setup();
    const before = totalUpkeep(state, 'empire');
    const fleet = put(state, home, 'empire', ['CWN-SOV-S04']);
    fleet.troops = 2;
    const after = totalUpkeep(state, 'empire');
    expect(after).toBe(before + shipSpec('CWN-SOV-S04').upkeep + 2);
  });
});

describe('sailing', () => {
  it('refuses a fleet that is not yours, and one already at sea', () => {
    const { state, home } = setup();
    const mine = put(state, home, 'empire', ['CWN-INT-S02']);
    const theirs = put(state, home, 'alliance', ['CFS-SWI-S01']);
    const elsewhere = state.systems.find((s) => s.id !== home.id)!;

    expect(sailError(state, theirs.id, elsewhere.id, 'empire')).toBe('That fleet is not yours.');
    expect(sailError(state, mine.id, home.id, 'empire')).toBe('Already there.');
    expect(sailError(state, mine.id, elsewhere.id, 'empire')).toBeNull();

    sailFleet(state, mine.id, elsewhere.id, 'empire');
    expect(sailError(state, mine.id, elsewhere.id, 'empire')).toBe('Already at sea.');
  });

  it('takes days, and arrives at the island it was sent to', () => {
    const { state, home } = setup();
    const fleet = put(state, home, 'empire', ['CWN-INT-S02']);
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
  it('resolves when two sides share a harbor, and costs hulls', () => {
    const { state, home } = setup();
    put(state, home, 'empire', ['CWN-SOV-S04', 'CWN-INT-S02']);
    put(state, home, 'alliance', ['CFS-TEM-R3-01', 'CFS-SWI-S01']);

    const rng = createRng(42);
    let rounds = 0;
    while (fleetsAt(state, home.id).length > 1 && rounds < 50) {
      advanceFleets(state, rng);
      rounds++;
    }
    // Somebody was sunk: the harbor does not hold both sides forever.
    expect(rounds).toBeLessThan(50);
    const sides = new Set(fleetsAt(state, home.id).map((f) => f.faction));
    expect(sides.size).toBeLessThanOrEqual(1);
    // And the action carries its tally for the card: what each side brought
    // and lost, and the harbor's guns.
    const action = state.events.find((e) => e.kind === 'battle' && e.battle);
    expect(action).toBeDefined();
    expect(action!.battle!.sides.empire.hulls).toBe(2);
    expect(action!.battle!.sides.alliance.hulls).toBe(2);
    expect(action!.battle!.sides.empire.lost + action!.battle!.sides.alliance.lost).toBeGreaterThan(0);
  });

  it('is deterministic: the same seed fights the same battle', () => {
    const fight = () => {
      const { state, home } = setup(11);
      put(state, home, 'empire', ['CWN-SOV-S04', 'CWN-INT-S02']);
      put(state, home, 'alliance', ['CFS-TEM-R3-01', 'CFS-SWI-S01']);
      const rng = createRng(99);
      for (let i = 0; i < 12; i++) advanceFleets(state, rng);
      return state.fleets.map((f) => `${f.faction}:${f.ships.map((s) => s.damage).join(',')}`);
    };
    expect(fight()).toEqual(fight());
  });

  it('drowns companies whose transport goes down', () => {
    const { state, home } = setup();
    const fleet = put(state, home, 'empire', ['CWN-WAY-S01']);
    fleet.troops = fleetCapacity(fleet);
    expect(fleet.troops).toBeGreaterThan(0);
    // An overwhelming enemy: the transport has no guns of its own.
    put(state, home, 'alliance', ['CFS-TEM-R3-01', 'CFS-TEM-R3-01', 'CFS-TEM-R3-01']);

    const rng = createRng(5);
    for (let i = 0; i < 20 && state.fleets.some((f) => f.faction === 'empire'); i++) {
      advanceFleets(state, rng);
    }
    expect(state.fleets.some((f) => f.faction === 'empire')).toBe(false);
  });

  it('leaves a lone fleet alone', () => {
    const { state, home } = setup();
    const fleet = put(state, home, 'empire', ['CWN-INT-S02']);
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

    put(state, home, 'alliance', ['CFS-TEM-R3-01']);
    updateBlockades(state);

    expect(isBlockaded(state, home)).toBe(true);
    expect(home.blockaded).toBe(true);
    expect(islandIncome(home, 'empire')).toBe(0);
  });

  it('lifts when the enemy leaves', () => {
    const { state, home } = setup();
    const enemy = put(state, home, 'alliance', ['CFS-TEM-R3-01']);
    updateBlockades(state);
    expect(home.blockaded).toBe(true);

    const elsewhere = state.systems.find((s) => s.id !== home.id)!;
    sailFleet(state, enemy.id, elsewhere.id, 'alliance');
    updateBlockades(state);
    expect(home.blockaded).toBe(false);
  });

  it('is not raised by a hull with nothing to fire', () => {
    // The Swift, which is the one Noncombat hull on the whole roster: no Long,
    // Heavy or Light guns at all. It was a Brigantine here, and a Brigantine
    // has six Light Guns on the v4.3 sheet — carrying is a column now rather
    // than a class, so "transport" is no longer a synonym for "unarmed".
    const { state, home } = setup();
    put(state, home, 'alliance', ['CFS-SWI-S01']);
    expect(fleetGuns(state.fleets[0])).toBe(0);
    updateBlockades(state);
    expect(home.blockaded).toBe(false);
  });
});

describe('embarking', () => {
  it('will not load more companies than there is room for', () => {
    const { state, home } = setup();
    const fleet = put(state, home, 'empire', ['CWN-WAY-S01']);
    home.garrison = 10;
    const room = fleetCapacity(fleet);

    expect(embarkError(state, fleet.id, room + 1, 'empire')).toBe('No room aboard.');
    embark(state, fleet.id, room, 'empire');
    expect(fleet.troops).toBe(room);
    expect(home.garrison).toBe(10 - room);
  });

  it('will not load troops that are not there', () => {
    const { state, home } = setup();
    const fleet = put(state, home, 'empire', ['CWN-WAY-S01']);
    home.garrison = 0;
    expect(embarkError(state, fleet.id, 1, 'empire')).toBe('Not enough troops ashore.');
  });

  it('puts them back ashore again', () => {
    const { state, home } = setup();
    const fleet = put(state, home, 'empire', ['CWN-WAY-S01']);
    home.garrison = 4;
    embark(state, fleet.id, 2, 'empire');
    embark(state, fleet.id, -2, 'empire');
    expect(fleet.troops).toBe(0);
    expect(home.garrison).toBe(4);
  });
});

describe('assault', () => {
  it('needs troops aboard, and an island that is not already yours', () => {
    const { state, home } = setup();
    const fleet = put(state, home, 'empire', ['CWN-WAY-S01']);
    expect(assaultError(state, fleet.id, 'empire')).toBe('No troops aboard.');
    fleet.troops = 2;
    expect(assaultError(state, fleet.id, 'empire')).toBe('The island is already yours.');
  });

  it('will not land while enemy guns hold the harbor', () => {
    const { state } = setup();
    const target = state.systems.find((s) => s.control === 'alliance' && s.populated)!;
    const fleet = put(state, target, 'empire', ['CWN-WAY-S01']);
    fleet.troops = 2;
    put(state, target, 'alliance', ['CFS-TEM-R3-01']);
    expect(assaultError(state, fleet.id, 'empire')).toBe('Enemy ships hold the harbor.');
  });

  it('takes the island when the landing force outnumbers the garrison', () => {
    const { state } = setup();
    const target = state.systems.find((s) => s.control === 'alliance' && s.populated)!;
    target.garrison = 1;
    const fleet = put(state, target, 'empire', ['CWN-SOV-S04', 'CWN-SOV-S04']);
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
    const fleet = put(state, target, 'empire', ['CWN-SOV-S04']);
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
    const fleet = put(state, target, 'empire', ['CWN-SOV-S04']);
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
    const theirs = put(state, home, 'alliance', ['CFS-SWI-S01']);
    // The opponent's fleet is not the player's to order, and vice versa.
    expect(sailError(state, theirs.id, home.id, 'empire')).toBe('That fleet is not yours.');
    expect(sailError(state, theirs.id, home.id, 'alliance')).toBe('Already there.');
  });
});

describe('pace', () => {
  it('a fleet sails at the speed of its slowest hull', () => {
    const { state, home } = setup();
    const target = state.systems.find((s) => s.sectorId === home.sectorId && s.id !== home.id)!;

    const sloops = put(state, home, 'empire', ['CWN-INT-S02']);
    sailFleet(state, sloops.id, target.id, 'empire');
    const quick = sloops.voyage!.daysRemaining;

    const heavy = addShip(state, home, 'empire', 'CWN-SOV-S04');
    // addShip joined the fleet at anchor, so make a second one to compare.
    const slowFleet = state.fleets.find((f) => f.id === heavy.id && f.id !== sloops.id) ?? heavy;
    slowFleet.systemId = home.id;
    slowFleet.voyage = undefined;
    sailFleet(state, slowFleet.id, target.id, 'empire');
    expect(slowFleet.voyage!.daysRemaining).toBeGreaterThan(quick);
  });

  it('one first-rate slows a squadron of sloops', () => {
    const { state, home } = setup();
    const target = state.systems.find((s) => s.sectorId === home.sectorId && s.id !== home.id)!;
    const fleet = put(state, home, 'empire', ['CWN-INT-S02', 'CWN-INT-S02', 'CWN-SOV-S04']);
    sailFleet(state, fleet.id, target.id, 'empire');
    const withHeavy = fleet.voyage!.daysRemaining;

    const { state: s2, home: h2 } = setup();
    const t2 = s2.systems.find((s) => s.sectorId === h2.sectorId && s.id !== h2.id)!;
    const light = put(s2, h2, 'empire', ['CWN-INT-S02', 'CWN-INT-S02']);
    sailFleet(s2, light.id, t2.id, 'empire');
    expect(withHeavy).toBeGreaterThan(light.voyage!.daysRemaining);
  });
});

describe('the opponent builds toward its navy', () => {
  it('lays down a slipway and puts hulls in the water in a plain game', () => {
    // No help: the opponent has to build its own way to a fleet, which it
    // could not do at all until its build order had a priority list.
    // Measured at the peak rather than the end, from the days when the
    // opponent ran its treasury dry and its yards fell down; it no longer
    // does, but the question is the same: did it build more yards than it
    // started with, and put hulls in the water from them.
    //
    // The Crown is the opponent here because the Crown has to fight a long
    // war: it wins by hunting three ships across the Reaches, which takes
    // years. The Confederate opponent is not measured for this because on
    // most seeds it takes Highwater inside eight months and wins the war
    // with the hulls it started with — a navy it never needed to build.
    // Over six worlds rather than one.
    //
    // This read seed 1 alone until 20 September, when moving the opening's
    // second construction yard shifted the random stream and seed 1 came up an
    // unlucky world: the Crown raised **seventeen slipways and laid down not
    // one hull** in seven hundred days, with income 240 against upkeep 227.
    // Seventeen berths at four gold a day is sixty-eight of that income spent
    // on the room to build, leaving nothing to build with — which is the
    // economy's own problem (see `lab/hoard.ts`) and not this rule's. The rule
    // is about what the opponent does in general, so it is now measured in
    // general, and the outlier is recorded rather than legislated away.
    const yardsOf = (s: GameState) =>
      s.systems.flatMap((x) =>
        x.facilities.filter((f) => f.owner === 'empire' && f.type === 'shipyard' && !f.building),
      ).length;
    const hullsOf = (s: GameState) =>
      s.fleets.filter((f) => f.faction === 'empire').reduce((n, f) => n + f.ships.length, 0);
    let builtYards = 0;
    let builtHulls = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      let state = generateGalaxy(seed, 'alliance');
      const startYards = yardsOf(state);
      const startHulls = hullsOf(state);
      let peakYards = startYards;
      let peakHulls = startHulls;
      for (let d = 0; d < 700 && !state.winner; d++) {
        state = advanceDay(state);
        peakYards = Math.max(peakYards, yardsOf(state));
        peakHulls = Math.max(peakHulls, hullsOf(state));
      }
      if (peakYards > startYards) builtYards += 1;
      if (peakHulls > startHulls) builtHulls += 1;
    }
    expect(builtYards, 'worlds where the Crown raised a slipway').toBe(6);
    expect(builtHulls, 'worlds where the Crown put a hull in the water').toBeGreaterThanOrEqual(5);
  });

  it('drills companies rather than living on the ones it started with', () => {
    /**
     * Peak, not the final count. The stock of companies is production minus
     * losses, and an opponent that is winning spends them: it ends a long game
     * holding two dozen islands on a handful of companies because it threw the
     * rest at taking them. Netting the two together measures the war, not the
     * drilling, and it broke the day both sides started with troops aboard.
     */
    let state = generateGalaxy(2, 'empire');
    const companies = (s: typeof state) =>
      s.systems.filter((x) => x.control === 'alliance').reduce((n, x) => n + x.garrison, 0) +
      s.fleets.filter((f) => f.faction === 'alliance').reduce((n, f) => n + f.troops, 0);
    const before = companies(state);
    let peak = before;
    for (let d = 0; d < 400 && !state.winner; d++) {
      state = advanceDay(state);
      peak = Math.max(peak, companies(state));
    }
    expect(peak).toBeGreaterThan(before);
  });
});

describe('crew', () => {
  it('will not sign on somebody who is not standing where the fleet is', () => {
    const { state, home } = setup();
    const fleet = put(state, home, 'empire', ['CWN-INT-S02']);
    const crew = state.characters.find((c) => c.faction === 'empire')!;
    const elsewhere = state.systems.find((s) => s.id !== home.id)!;
    crew.locationSystemId = elsewhere.id;
    expect(boardError(state, fleet.id, crew.id, 'empire')).toBe('Not on this island.');

    crew.locationSystemId = home.id;
    expect(boardError(state, fleet.id, crew.id, 'empire')).toBeNull();
    board(state, fleet.id, crew.id, 'empire');
    expect(boardError(state, fleet.id, crew.id, 'empire')).toBe('Already aboard.');
  });

  it('carries them along when the fleet sails', () => {
    const { state, home } = setup();
    const fleet = put(state, home, 'empire', ['CWN-INT-S02']);
    const crew = state.characters.find(
      (c) => c.faction === 'empire' && c.locationSystemId === home.id,
    )!;
    board(state, fleet.id, crew.id, 'empire');

    const target = state.systems.find((s) => s.sectorId === home.sectorId && s.id !== home.id)!;
    sailFleet(state, fleet.id, target.id, 'empire');
    // Capture the count first: the loop is decrementing the thing it reads.
    const days = fleet.voyage!.daysRemaining;
    const rng = createRng(1);
    for (let i = 0; i < days; i++) advanceFleets(state, rng);

    expect(fleet.systemId).toBe(target.id);
    expect(crew.locationSystemId).toBe(target.id);
  });

  it('makes leadership tell in a fight', () => {
    // The same battle twice, once with a good officer aboard and once without.
    // Measure what the enemy has left, not the damage on it: a sunk ship is
    // removed, so counting damage reads zero exactly when you hurt them most.
    const hullLeft = (withOfficer: boolean, seed: number) => {
      const { state, home } = setup(21);
      // Highwater's own batteries fire for whoever holds it, and forty guns a
      // round drown out what an officer aboard is worth. The question here is
      // the officer, so the action is fought where there is no wall.
      home.facilities = home.facilities.filter((f) => f.type !== 'fort');
      const mine = put(state, home, 'empire', ['CWN-SOV-S04', 'CWN-SOV-S04', 'CWN-SOV-S04']);
      put(state, home, 'alliance', ['CFS-REE-R4-01', 'CFS-REE-R4-01', 'CFS-REE-R4-01']);
      if (withOfficer) {
        const crew = state.characters.find((c) => c.faction === 'empire')!;
        crew.locationSystemId = home.id;
        crew.leadership = 100;
        board(state, mine.id, crew.id, 'empire');
      }
      const rng = createRng(seed);
      for (let i = 0; i < 2; i++) advanceFleets(state, rng);
      return state.fleets
        .filter((f) => f.faction === 'alliance')
        // Each hull's own number, not the size's: a Reef-class carries more
        // frame than a large hull generally does, and reading the size's
        // figure off her made this count nonsense.
        .reduce(
          (n, f) => n + f.ships.reduce((h, s) => h + (shipSpec(s.classId).hull - s.damage), 0),
          0,
        );
    };
    // Over a spread of seeds, not one. A fleet action is two or three rounds of
    // dice and an officer is a thumb on the scale, not a guarantee — on any
    // single seed the thumb loses often enough that asserting it never does
    // is asserting the dice. Ten actions is enough to see the thumb.
    const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const led = SEEDS.reduce((n, seed) => n + hullLeft(true, seed), 0);
    const unled = SEEDS.reduce((n, seed) => n + hullLeft(false, seed), 0);
    expect(led, `led ${led} vs unled ${unled}`).toBeLessThan(unled);
  });

  it('makes combat tell in a landing', () => {
    const land = (withOfficer: boolean) => {
      const { state } = setup(5);
      const target = state.systems.find((s) => s.control === 'alliance' && s.populated)!;
      target.garrison = 3;
      const fleet = put(state, target, 'empire', ['CWN-SOV-S04', 'CWN-SOV-S04']);
      fleet.troops = 3;
      if (withOfficer) {
        const crew = state.characters.find((c) => c.faction === 'empire')!;
        crew.locationSystemId = target.id;
        crew.combat = 100;
        fleet.officerIds.push(crew.id);
      }
      resolveLanding(state, fleet, createRng(9));
      return target.control;
    };
    // Three against three is a coin toss; three led by a fighter carries it.
    expect(land(true)).toBe('empire');
    expect(land(false)).toBe('alliance');
  });

  it('puts them ashore rather than drowning them when the fleet is sunk', () => {
    const { state, home } = setup();
    const doomed = put(state, home, 'empire', ['CWN-INT-S02']);
    const crew = state.characters.find((c) => c.faction === 'empire')!;
    crew.locationSystemId = home.id;
    board(state, doomed.id, crew.id, 'empire');
    put(state, home, 'alliance', ['CFS-REE-R4-01', 'CFS-REE-R4-01', 'CFS-REE-R4-01']);

    const rng = createRng(2);
    for (let i = 0; i < 25 && state.fleets.some((f) => f.faction === 'empire'); i++) {
      advanceFleets(state, rng);
    }
    expect(state.fleets.some((f) => f.faction === 'empire')).toBe(false);
    expect(crew.locationSystemId).toBe(home.id);
  });
});

describe('espionage charts the map', () => {
  it('a spy aboard opens islands the fleet did not anchor at', () => {
    const chart = (espionage: number) => {
      const { state, home } = setup(13);
      const fleet = put(state, home, 'empire', ['CWN-INT-S02']);
      // Somewhere with dark water around it.
      const target = state.systems.find(
        (s) => !s.explored.empire && s.sectorId !== home.sectorId,
      )!;
      const chain = target.sectorId;
      if (espionage > 0) {
        const spy = state.characters.find((c) => c.faction === 'empire')!;
        spy.locationSystemId = home.id;
        spy.espionage = espionage;
        board(state, fleet.id, spy.id, 'empire');
      }
      sailFleet(state, fleet.id, target.id, 'empire');
      const days = fleet.voyage!.daysRemaining;
      const rng = createRng(1);
      for (let i = 0; i < days; i++) advanceFleets(state, rng);
      return state.systems.filter((s) => s.sectorId === chain && s.explored.empire).length;
    };

    // With nobody aboard you chart exactly the island you anchored at.
    expect(chart(0)).toBe(1);
    // A middling spy sees a little further; a good one opens most of the chain.
    expect(chart(50)).toBeGreaterThan(chart(0));
    expect(chart(100)).toBeGreaterThan(chart(50));
  });

  it('charts nothing it has already charted, and never leaves the chain', () => {
    const { state, home } = setup(13);
    const fleet = put(state, home, 'empire', ['CWN-INT-S02']);
    const spy = state.characters.find((c) => c.faction === 'empire')!;
    spy.locationSystemId = home.id;
    spy.espionage = 100;
    board(state, fleet.id, spy.id, 'empire');

    const target = state.systems.find(
      (s) => !s.explored.empire && s.sectorId !== home.sectorId,
    )!;
    const elsewhere = state.systems
      .filter((s) => s.sectorId !== target.sectorId && !s.explored.empire)
      .map((s) => s.id);

    sailFleet(state, fleet.id, target.id, 'empire');
    const days = fleet.voyage!.daysRemaining;
    const rng = createRng(1);
    for (let i = 0; i < days; i++) advanceFleets(state, rng);

    // Nothing outside the chain it anchored in was touched.
    for (const id of elsewhere) {
      expect(getSystem(state, id).explored.empire).toBe(false);
    }
  });

  it('opens islands you can then actually parley with', () => {
    /**
     * Two claims, and they need different kinds of test.
     *
     * Making landfall in an uncharted chain always charts islands — that is
     * the mechanic, and it holds on every arrangement.
     *
     * Whether that turns into somewhere new to parley does not, and should
     * not: the chain you land in may already be charted, or the islands you
     * open may be nobody's to win over. This used to be pinned to one seed and
     * broke the day the map changed shape, which was the test being brittle
     * rather than the game being wrong. Across arrangements it holds four
     * times in five, and that is the honest claim — measured over sixty of
     * them, because twelve is few enough that the rate wanders into the
     * sixties on an unlucky draw and the test fails for being under-sampled
     * rather than for anything being wrong.
     */
    const run = (seed: number) => {
      const { state, home } = setup(seed);
      const fleet = put(state, home, 'empire', ['CWN-INT-S02']);
      const spy = state.characters.find((c) => c.faction === 'empire')!;
      spy.locationSystemId = home.id;
      spy.espionage = 100;
      board(state, fleet.id, spy.id, 'empire');

      const target = state.systems.find(
        (s) => !s.explored.empire && s.sectorId !== home.sectorId && s.populated,
      );
      if (!target) return null;
      const chartedBefore = state.systems.filter((s) => s.explored.empire).length;
      const parleyBefore = state.systems.filter((s) => isDiplomacyTarget(s, 'empire')).length;

      sailFleet(state, fleet.id, target.id, 'empire');
      const days = fleet.voyage!.daysRemaining;
      const rng = createRng(1);
      for (let i = 0; i < days; i++) advanceFleets(state, rng);

      return {
        charted: state.systems.filter((s) => s.explored.empire).length - chartedBefore,
        parley: state.systems.filter((s) => isDiplomacyTarget(s, 'empire')).length - parleyBefore,
      };
    };

    const runs = Array.from({ length: 60 }, (_, i) => run(i + 1)).filter(Boolean);
    expect(runs.length).toBeGreaterThan(40);
    // Landfall always charts something.
    for (const r of runs) expect(r!.charted).toBeGreaterThan(0);
    // And usually that is somewhere new worth sending an envoy.
    expect(runs.filter((r) => r!.parley > 0).length / runs.length).toBeGreaterThan(0.7);
  });
});


describe('the opening position', () => {
  /**
   * Sean's opening, 18 September: *"Imperium should start with a powerful fleet
   * on Highwater and a medium fleet on another inner reach. Confederacy fleet
   * is its Freeport only and it's medium sized. Should rival the medium fleet
   * from imperium."*
   *
   * The asymmetry that matters is not the weight of shot, it is the number of
   * places each side has to be at once.
   */
  it('puts a fleet on the water for both sides on day one', () => {
    const state = generateGalaxy(7, 'empire');
    for (const faction of ['empire', 'alliance'] as const) {
      const fleets = state.fleets.filter((f) => f.faction === faction);
      // Two apiece since 21 September: Sean gave the Confederacy a second
      // squadron when he named the opening hull by hull.
      expect(fleets).toHaveLength(2);
      // Every side's first squadron lies at its seat.
      expect(fleets[0].systemId).toBe(state.factions[faction].hqSystemId);
      for (const fleet of fleets) {
        // Two or three, not four or more. The v4.3 roster puts far more ship
        // in a hull — one Sovereign is 4,600 of hull and seventy-four guns,
        // where the whole old six-hull Home Fleet was 119 guns — so the
        // opening got shorter without getting lighter.
        expect(fleet.ships.length).toBeGreaterThanOrEqual(2);
        // Never more aboard than there is room for, which is the rule that
        // matters and the one the opening was quietly breaking.
        expect(fleet.troops).toBeLessThanOrEqual(fleetCapacity(fleet));
      }
      /*
       * Companies on the water somewhere, so the first landing does not wait
       * on a hull being built for it — but not on *every* squadron any more.
       *
       * Sean's Confederate second squadron is a Chimera and a Tidestalker, and
       * on the v4.3 sheet neither of them has a hold at all: Troop Capacity 0
       * apiece. It is a raiding pair by the sheet's own numbers, so it opens
       * empty rather than opening with two companies it has nowhere to put.
       */
      expect(fleets.reduce((n, f) => n + f.troops, 0)).toBeGreaterThan(0);
      {
      }
    }
  });

  it('berths the Crown\'s second squadron out of its own Reach', () => {
    for (const seed of [7, 19, 41]) {
      const state = generateGalaxy(seed, 'empire');
      const [home, forward] = state.fleets.filter((f) => f.faction === 'empire');
      const seat = state.systems.find((s) => s.id === home.systemId)!;
      const station = state.systems.find((s) => s.id === forward.systemId)!;
      expect(station.id).not.toBe(seat.id);
      expect(station.sectorId).not.toBe(seat.sectorId);
      expect(station.control).toBe('empire');
    }
  });

  /**
   * What each side opens with, hull by hull, at Sean's word.
   *
   *   *"Crown Fleet 1 @ Highwater: 1x Sovereign, 2x Interceptors. Fleet 2 @
   *    random Imperium location: 1x Wayfinder, 1x Morningstar.
   *    Confederacy Fleet 1 @ Freeport: Swift, 2x Brigantine. Fleet 2 @ random
   *    Confederate location: Chimera, Tidestalker."*
   *
   * The rule this replaced was that the Confederacy's one squadron had to
   * match the Crown's *second* within a quarter either way, and that the Crown
   * had to be in two seas at once while the Brethren were in one. Both are
   * gone: he gave the Confederacy a second squadron and named every hull, so
   * the opening is a specification rather than a balance rule now, and the
   * test's job is to hold the game to what he wrote.
   */
  it('opens with the hulls Sean named, in the berths he named', () => {
    const state = generateGalaxy(7, 'empire');
    const ids = (side: PlayableFaction, nth: number) =>
      state.fleets.filter((f) => f.faction === side)[nth].ships.map((s) => s.classId).sort();
    expect(ids('empire', 0)).toEqual(['CWN-INT-S02', 'CWN-INT-S02', 'CWN-SOV-S04']);
    expect(ids('empire', 1)).toEqual(['CWN-MOR-S03', 'CWN-WAY-S01']);
    expect(ids('alliance', 0)).toEqual(['CFS-BRI-S02', 'CFS-BRI-S02', 'CFS-SWI-S01']);
    expect(ids('alliance', 1)).toEqual(['CFS-CHI-S03', 'CFS-TID-S04']);
    // Every one of the eight is an S-rung, which is what makes them a legal
    // opening: nothing here waits on research.
    for (const side of ['empire', 'alliance'] as const) {
      for (const fleet of state.fleets.filter((f) => f.faction === side)) {
        for (const ship of fleet.ships) {
          expect(shipClass(ship.classId).craft ?? 0, ship.classId).toBe(0);
        }
      }
    }
  });

  it('gives each side a yard that can lay down a hull', () => {
    const state = generateGalaxy(7, 'empire');
    for (const faction of ['empire', 'alliance'] as const) {
      const yards = state.systems
        .filter((s) => s.control === faction)
        .flatMap((s) => s.facilities)
        .filter((f) => f.type === 'shipyard');
      expect(yards.length).toBeGreaterThan(0);
    }
  });

  it('leaves both sides solvent on day one', () => {
    // A navy you cannot pay for is not an opening position, it is a countdown.
    const state = generateGalaxy(7, 'empire');
    for (const faction of ['empire', 'alliance'] as const) {
      expect(totalIncome(state, faction)).toBeGreaterThan(totalUpkeep(state, faction));
    }
  });
});

describe('the Pirate Lords', () => {
  it('are three people ashore at the meeting place, and no hull of theirs is on the water', () => {
    const state = generateGalaxy(7, 'alliance');
    const three = lords(state);
    expect(three).toHaveLength(3);
    for (const lord of three) {
      expect(lord.faction).toBe('alliance');
      expect(lord.status).toBe('available');
      expect(lord.locationSystemId).toBe(state.factions.alliance.hqSystemId);
    }
    // The ships are legends. They are in the bible so a bio has something to
    // name, and nowhere else: not buildable, and not floating.
    for (const lord of PIRATE_LORDS) {
      expect(shipClass(lord.ship).legend).toBe(true);
      expect(shipsFor('alliance').some((c) => c.id === lord.ship)).toBe(false);
      expect(state.fleets.some((f) => f.ships.some((sh) => sh.classId === lord.ship))).toBe(false);
    }
  });

  it("halves the passage for Reyne's errands and nobody else's", () => {
    const state = generateGalaxy(7, 'alliance');
    const named = (n: string) => state.characters.find((c) => c.name === n)!;
    expect(passageShare(named(PIRATE_LORDS[1].name))).toBe(0.5);
    expect(passageShare(named(PIRATE_LORDS[0].name))).toBe(1);
    expect(passageShare(named(PIRATE_LORDS[2].name))).toBe(1);

    // And it shows in the errand: the same crossing, ordered by each of them.
    const target = state.systems.find(
      (s) => s.control === 'neutral' && s.populated && s.explored.alliance,
    )!;
    const reyne = named(PIRATE_LORDS[1].name);
    const hale = named(PIRATE_LORDS[0].name);
    startMission(state, reyne.id, target.id);
    startMission(state, hale.id, target.id);
    expect(reyne.mission!.daysRemaining).toBeLessThan(hale.mission!.daysRemaining);
  });

  it('brings an island round a point a day wherever Hale is posted, the Crown\'s included', () => {
    const state = generateGalaxy(7, 'alliance');
    const hale = state.characters.find((c) => c.name === PIRATE_LORDS[0].name)!;
    // A Crown island, which the old rule would not touch at all.
    const theirs = state.systems.find((s) => s.control === 'empire' && s.populated)!;
    const before = theirs.support.alliance;

    // Merely standing there does nothing. The power is bought with a posting.
    hale.locationSystemId = theirs.id;
    holdTheMoot(state);
    expect(theirs.support.alliance).toBe(before);

    theirs.commanderId = hale.id;
    holdTheMoot(state);
    expect(theirs.support.alliance).toBe(before + 1);
    expect(theirs.support.empire).toBe(100 - (before + 1));
  });

  it('never moves the Confederacy home onto a Crown island', () => {
    const state = generateGalaxy(7, 'alliance');
    const mine = state.systems.filter((s) => s.control === 'alliance' && !s.uprising);
    syncHome(state);
    expect(mine.some((s) => s.id === state.factions.alliance.hqSystemId)).toBe(true);
    expect(state.factions.alliance.hqSystemId).not.toBe(state.factions.empire.hqSystemId);
  });

  it('ends the Confederacy only when all three are in irons at once', () => {
    const state = generateGalaxy(7, 'alliance');
    const three = lords(state);
    expect(allLordsTaken(state)).toBe(false);
    three[0].status = 'captured';
    three[1].status = 'captured';
    expect(allLordsTaken(state)).toBe(false);
    three[2].status = 'captured';
    expect(allLordsTaken(state)).toBe(true);
    // One of them out of the cells and the cause is alive again.
    three[1].status = 'available';
    expect(allLordsTaken(state)).toBe(false);
  });

  it('works a power only while the Lord holding the posting is available', () => {
    const state = generateGalaxy(7, 'alliance');
    const hale = state.characters.find((c) => c.name === PIRATE_LORDS[0].name)!;
    const here = getSystem(state, state.factions.alliance.hqSystemId);
    here.commanderId = hale.id;
    expect(lordPowerAt(state, here.id, 'moot')?.id).toBe(hale.id);
    for (const status of ['on_mission', 'injured', 'captured'] as const) {
      hale.status = status;
      expect(lordPowerAt(state, here.id, 'moot')).toBeUndefined();
    }
    hale.status = 'available';
    expect(lordPowerAt(state, here.id, 'moot')?.id).toBe(hale.id);
  });
});

describe('what the confirm sheet promises', () => {
  it('quotes the days the voyage actually takes, pace and all', () => {
    const state = generateGalaxy(31, 'empire');
    const here = state.systems.find((s) => s.control === 'empire')!;
    const near = state.systems.find((s) => s.sectorId === here.sectorId && s.id !== here.id)!;
    // The farthest island there is, not merely the first one in another Reach.
    // Pace multiplies the crossing and the result is rounded to whole days, so
    // on a short hop a sloop and a first-rate quote the same number and the
    // last assertion here has nothing to see.
    const far = [...state.systems]
      .filter((s) => s.id !== here.id)
      .sort((a, b) => travelDays(state, here.id, b.id) - travelDays(state, here.id, a.id))[0];

    // Nothing else in the water: a new hull joins whatever squadron is already
    // lying at the island, and the Home Fleet has a first-rate in it — so the
    // sloop this test means to sail alone was quietly sailing in company, and
    // the slow hull added at the end changed nothing.
    state.fleets.length = 0;
    const fleet = addShip(state, here, 'empire', 'CWN-INT-S02');
    for (const to of [near, far]) {
      const quoted = sailDays(state, fleet.id, to.id);
      sailFleet(state, fleet.id, to.id, 'empire');
      // The sheet's number and the voyage's number are the same number.
      expect(fleet.voyage!.daysRemaining).toBe(quoted);
      expect(quoted).toBeGreaterThan(0);
      fleet.voyage = undefined;
    }

    // A slow hull in company slows the squadron, and the quote follows it.
    const alone = sailDays(state, fleet.id, far.id);
    // A new hull joins the fleet already lying there.
    const joined = addShip(state, here, 'empire', 'CWN-SOV-S04');
    expect(joined.id).toBe(fleet.id);
    const together = sailDays(state, fleet.id, far.id);
    expect(together).toBeGreaterThan(alone);
    sailFleet(state, fleet.id, far.id, 'empire');
    expect(fleet.voyage!.daysRemaining).toBe(together);
  });

  /**
   * Found by the audit, forty-three times in twenty-four wars: a squadron with
   * four companies aboard and two berths left to put them in. Only a squadron
   * sunk to the last hull ever lost the people in it, so one that lost *some*
   * of its ships kept every company — riding in berths that were on the bottom
   * of the harbor, and putting a landing party ashore that should have
   * drowned.
   */
  it('drowns the companies riding in hulls that have gone down', () => {
    const state = generateGalaxy(31, 'empire');
    const here = state.systems.find((s) => s.control === 'empire')!;
    const fleet = addShip(state, here, 'empire', 'CWN-WAY-S01');
    addShip(state, here, 'empire', 'CWN-WAY-S01');
    const berths = fleetCapacity(fleet);
    expect(berths).toBeGreaterThan(1);
    here.garrison = berths + 20;
    if (fleet.troops < berths) embark(state, fleet.id, berths - fleet.troops, 'empire');
    expect(fleet.troops).toBe(berths);
    // Half the squadron is sunk.
    fleet.ships = fleet.ships.slice(0, 1);
    clearWrecks(state);
    expect(fleet.troops).toBe(fleetCapacity(fleet));
    expect(fleet.troops).toBeLessThan(berths);
    expect(state.events.at(-1)!.text).toMatch(/go down with the hulls/);
  });

  it('never quotes a crossing it would refuse to make', () => {
    const state = generateGalaxy(31, 'empire');
    const here = state.systems.find((s) => s.control === 'empire')!;
    const fleet = addShip(state, here, 'empire', 'CWN-INT-S02');
    // Staying put is not a voyage, and the sheet is never opened for one.
    expect(sailError(state, fleet.id, here.id, 'empire')).not.toBeNull();
    // Nor is somebody else's fleet yours to send.
    expect(sailError(state, fleet.id, here.id, 'alliance')).not.toBeNull();
  });
});
