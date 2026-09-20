import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { addShip, fleetCapacity } from '../fleets';
import {
  islandIncome,
  islandTrade,
  smuggledShare,
  scrap,
  scrapValue,
  settleLedger,
  recomputeLedger,
  totalIncome,
  totalUpkeep,
} from '../economy';
import { FORTNIGHT, GOLD_PER_DAY, TROOP_BUILD, UPKEEP_PER_DAY, YARD_BUILDS } from '../constants';
import { createRng } from '../rng';
import type { GameState, PlayableFaction, System } from '../types';

/** Strip the map down to one held island so a test can reason about it.
 *  The starting fleets go too: their upkeep is real, and these tests are about
 *  what an island costs, not what a navy costs. */
function isolate(state: GameState, faction: PlayableFaction): System {
  state.fleets.length = 0;
  const held = state.systems.filter((s) => s.control === faction);
  const keep = held[0];
  for (const system of state.systems) {
    if (system === keep) continue;
    system.control = 'neutral';
    system.facilities = [];
    system.garrison = 0;
  }
  keep.garrison = 0;
  return keep;
}

describe('what buildings do', () => {
  it('splits into things that earn and things that cost', () => {
    expect(GOLD_PER_DAY.mine).toBeGreaterThan(0);
    expect(GOLD_PER_DAY.refinery).toBeGreaterThan(0);
    expect(UPKEEP_PER_DAY.mine).toBe(0);
    expect(UPKEEP_PER_DAY.refinery).toBe(0);

    for (const type of ['construction_yard', 'training_facility', 'shipyard'] as const) {
      expect(GOLD_PER_DAY[type]).toBe(0);
      expect(UPKEEP_PER_DAY[type]).toBeGreaterThan(0);
    }
    expect(UPKEEP_PER_DAY.troop).toBeGreaterThan(0);
  });
});

describe('income', () => {
  it('pays each earner its rate, scaled by allegiance', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [
      { id: 'f1', type: 'mine', owner: 'empire' },
      { id: 'f2', type: 'refinery', owner: 'empire' },
    ];
    const rate = GOLD_PER_DAY.mine + GOLD_PER_DAY.refinery;

    // Firm: the island works at full pace and nothing leaves by the back door.
    island.support.empire = 100;
    expect(islandIncome(island, 'empire')).toBeCloseTo(rate);

    // Thin: half pace for a grudging crew, and a quarter of what is left
    // goes to the other side.
    island.support.empire = 0;
    expect(islandIncome(island, 'empire')).toBeCloseTo(rate * 0.5 * 0.75);
  });

  it('pays nothing from an island in mutiny', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [{ id: 'f1', type: 'mine', owner: 'empire' }];
    island.uprising = true;
    expect(islandIncome(island, 'empire')).toBe(0);
  });

  it('pays nothing for a works, a drill ground or a slipway', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [
      { id: 'f1', type: 'construction_yard', owner: 'empire' },
      { id: 'f2', type: 'training_facility', owner: 'empire' },
      { id: 'f3', type: 'shipyard', owner: 'empire' },
    ];
    expect(islandIncome(island, 'empire')).toBe(0);
  });

  it('adds the day’s takings to the treasury', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [{ id: 'f1', type: 'mine', owner: 'empire' }];
    island.support.empire = 100;
    state.factions.empire.gold = 0;
    settleOnce(state);
    // A fortnight of it, in one payment.
    expect(state.factions.empire.gold).toBeCloseTo(GOLD_PER_DAY.mine * FORTNIGHT);
  });

  it('moves nothing at all on the thirteen days between settlements', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [{ id: 'f1', type: 'mine', owner: 'empire' }];
    island.support.empire = 100;
    state.factions.empire.gold = 0;
    for (let day = 1; day < FORTNIGHT; day += 1) {
      state.day = day;
      settleLedger(state, createRng(day));
      expect(state.factions.empire.gold, `day ${day}`).toBe(0);
    }
    state.day = FORTNIGHT;
    settleLedger(state, createRng(1));
    expect(state.factions.empire.gold).toBeGreaterThan(0);
  });

  it('runs a share of a disloyal island’s trade to the enemy, by band', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [{ id: 'f1', type: 'mine', owner: 'empire' }];

    // Every band, top to bottom: what the holder keeps and what crosses over
    // always add up to the island's whole trade.
    for (const [support, share] of [
      [95, 0],
      [70, 0.15],
      [30, 0.25],
    ] as const) {
      island.support.empire = support;
      const trade = islandTrade(island, 'empire');
      expect(smuggledShare(island, 'empire')).toBe(share);
      // The rates rather than the treasury: what the holder keeps and what
      // crosses over are both inside `totalIncome`, and reading them there
      // says the same thing without waiting a fortnight for it.
      expect(totalIncome(state, 'alliance'), `support ${support}`).toBeCloseTo(trade * share);
      expect(totalIncome(state, 'empire'), `support ${support}`).toBeCloseTo(trade * (1 - share));
    }
  });

  it('takes half of an island in revolt, and gives its holder nothing at all', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [{ id: 'f1', type: 'mine', owner: 'empire' }];
    island.support.empire = 40;
    island.uprising = true;
    const trade = islandTrade(island, 'empire');
    expect(trade).toBeGreaterThan(0);
    expect(totalIncome(state, 'empire')).toBe(0);
    expect(totalIncome(state, 'alliance')).toBeCloseTo(trade * 0.5);
  });

  it('never smuggles from a firm island, and a blockade stops even that', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [{ id: 'f1', type: 'mine', owner: 'empire' }];
    island.support.empire = 90;
    expect(totalIncome(state, 'alliance')).toBe(0);

    // Shut the harbor on a thin island: nothing leaves it either way.
    island.support.empire = 20;
    island.blockaded = true;
    expect(totalIncome(state, 'empire')).toBe(0);
    expect(totalIncome(state, 'alliance')).toBe(0);
  });
});

/**
 * One settlement.
 *
 * The books are done every fourteenth day since 20 September, so a test that
 * wants money to move has to land on one. Everything below that used to call
 * `collectIncome` or `payUpkeep` for a single day's worth now either asks the
 * rate directly — `totalIncome` and `totalUpkeep` are the rates, unchanged —
 * or settles once and expects fourteen days of it.
 */
function settleOnce(state: GameState, rng = createRng(1)): void {
  state.day = FORTNIGHT;
  settleLedger(state, rng);
}

describe('upkeep', () => {
  it('charges for buildings that do not earn, and for companies', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [
      { id: 'f1', type: 'mine', owner: 'empire' },
      { id: 'f2', type: 'construction_yard', owner: 'empire' },
      { id: 'f3', type: 'shipyard', owner: 'empire' },
    ];
    island.garrison = 3;
    expect(totalUpkeep(state, 'empire')).toBe(
      UPKEEP_PER_DAY.construction_yard + UPKEEP_PER_DAY.shipyard + 3 * UPKEEP_PER_DAY.troop,
    );
  });

  it('takes the day’s upkeep out of the treasury', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [{ id: 'f1', type: 'construction_yard', owner: 'empire' }];
    state.factions.empire.gold = 1000;
    settleOnce(state);
    expect(state.factions.empire.gold).toBe(1000 - UPKEEP_PER_DAY.construction_yard * FORTNIGHT);
  });

  it('reports income and upkeep for the top bar without moving money', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [
      { id: 'f1', type: 'mine', owner: 'empire' },
      { id: 'f2', type: 'construction_yard', owner: 'empire' },
    ];
    island.support.empire = 100;
    state.factions.empire.gold = 500;
    recomputeLedger(state);
    expect(state.factions.empire.gold).toBe(500);
    expect(state.factions.empire.income).toBeCloseTo(GOLD_PER_DAY.mine);
    expect(state.factions.empire.upkeep).toBe(UPKEEP_PER_DAY.construction_yard);
  });
});

describe('going broke', () => {
  it('breaks things down gradually rather than all at once', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.slots = 12;
    island.facilities = Array.from({ length: 6 }, (_, i) => ({
      id: `f${i}`,
      type: 'construction_yard' as const,
      owner: 'empire' as const,
    }));
    state.factions.empire.gold = 0; // nothing coming in, nothing saved

    settleOnce(state, createRng(7));
    // Enough is sold to cover the bill and no more. Six yards at three a day
    // is 252 for the fortnight and a yard raises 60, so five go and one is
    // left — where the old daily version shed exactly one a day and took a
    // week to get here.
    expect(island.facilities.length).toBeGreaterThan(0);
    expect(island.facilities.length).toBeLessThan(6);
  });

  it('walks the ledger back to equilibrium and then stops', () => {
    const state = generateGalaxy(102);
    const island = isolate(state, 'empire');
    island.slots = 24;
    island.support.empire = 100;
    island.facilities = [
      { id: 'm1', type: 'mine', owner: 'empire' },
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `y${i}`,
        type: 'construction_yard' as const,
        owner: 'empire' as const,
      })),
    ];
    state.factions.empire.gold = 0;

    const rng = createRng(3);
    for (let day = 1; day <= 400; day++) {
      state.day = day;
      settleLedger(state, rng);
    }

    // The mine earns; yards are shed until what is left can be paid for.
    expect(totalUpkeep(state, 'empire')).toBeLessThanOrEqual(
      Math.ceil(totalIncome(state, 'empire')),
    );
    expect(island.facilities.some((f) => f.type === 'mine')).toBe(true);
  });

  it('leaves a solvent faction entirely alone', () => {
    const state = generateGalaxy(103);
    const island = isolate(state, 'empire');
    island.facilities = [
      { id: 'f1', type: 'mine', owner: 'empire' },
      { id: 'f2', type: 'construction_yard', owner: 'empire' },
    ];
    island.garrison = 2;
    state.factions.empire.gold = 10000;
    const rng = createRng(5);
    for (let day = 1; day <= 200; day++) {
      state.day = day;
      settleLedger(state, rng);
    }
    expect(island.facilities).toHaveLength(2);
    expect(island.garrison).toBe(2);
  });

  it('can disband a company as readily as a building', () => {
    const state = generateGalaxy(104);
    const island = isolate(state, 'empire');
    island.facilities = [];
    island.garrison = 5;
    state.factions.empire.gold = 0;
    const rng = createRng(9);
    for (let day = 1; day <= 200; day++) {
      state.day = day;
      settleLedger(state, rng);
    }
    expect(island.garrison).toBe(0);
  });
});

/**
 * Scrap, and the shortfall that does it for you.
 *
 * Sean, 20 September: *"Scrap basically is where you can destroy the unit to
 * get money back and you get 50% of what you paid for it. But the additional
 * advantage though, is that you don't pay the upkeep cost anymore... This is a
 * great way to clear old things to make room for new things."* And when the
 * fortnight comes round and the bill cannot be met: *"the game randomly
 * selects units and basically blows them up to get you the gold back... So you
 * can either actively do it or the game's going to do it for you."*
 */
describe('scrapping', () => {
  it('gives back half of what a thing cost', () => {
    expect(scrapValue('construction_yard')).toBe(Math.floor(YARD_BUILDS.construction_yard.costGold / 2));
    expect(scrapValue('troop')).toBe(Math.floor(TROOP_BUILD.costGold / 2));
    // An earner is free to raise, so half of nothing is nothing. The reason to
    // pull a mill down was never the coin — it is the plot it stands on.
    expect(scrapValue('mine')).toBe(0);
    expect(scrapValue('refinery')).toBe(0);
  });

  it('takes the building off the island, the upkeep off the books, and puts the ground back', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.facilities = [{ id: 'f1', type: 'construction_yard', owner: 'empire' }];
    island.deposits = [];
    state.factions.empire.gold = 0;
    const before = totalUpkeep(state, 'empire');
    expect(before).toBe(UPKEEP_PER_DAY.construction_yard);

    const got = scrap(state, 'empire', {
      kind: 'facility',
      system: island,
      facilityId: 'f1',
      label: 'construction yard',
    });
    expect(got).toBe(scrapValue('construction_yard'));
    expect(state.factions.empire.gold).toBe(got);
    expect(island.facilities).toHaveLength(0);
    expect(totalUpkeep(state, 'empire')).toBe(0);
  });

  it('puts the deposit back when an earner comes down', () => {
    const state = generateGalaxy(101);
    const island = isolate(state, 'empire');
    island.slots = 10;
    island.facilities = [{ id: 'f1', type: 'refinery', owner: 'empire' }];
    island.deposits = [];
    scrap(state, 'empire', {
      kind: 'facility',
      system: island,
      facilityId: 'f1',
      label: 'lumber mill',
    });
    // The mill goes; the trees it was cutting are still standing. Same rule as
    // a works falling apart unpaid — a long war must not grind the world down
    // to land that can never earn again.
    expect((island.deposits ?? []).some((d) => d.type === 'forest')).toBe(true);
  });

  it('sells a side down when the fortnight cannot be paid, and stops when it can', () => {
    const state = generateGalaxy(105);
    const island = isolate(state, 'empire');
    island.slots = 30;
    island.facilities = Array.from({ length: 10 }, (_, i) => ({
      id: `y${i}`,
      type: 'construction_yard' as const,
      owner: 'empire' as const,
    }));
    state.factions.empire.gold = 0;
    settleOnce(state, createRng(11));

    // Something went, and not everything: the sale stops the moment the bill
    // is covered rather than emptying the island.
    expect(island.facilities.length).toBeGreaterThan(0);
    expect(island.facilities.length).toBeLessThan(10);
    // And the books say so, in one line rather than one per building.
    const told = state.events.filter((e) => e.text.includes('would not balance'));
    expect(told).toHaveLength(1);
  });

  it('puts the troops ashore when the hull under them is broken up', () => {
    const state = generateGalaxy(107);
    const island = isolate(state, 'empire');
    // Two hulls, loaded to the last berth, then one of them sold.
    const fleet = addShip(state, island, 'empire', 'reefwalker');
    addShip(state, island, 'empire', 'reefwalker');
    fleet.troops = fleetCapacity(fleet);
    expect(fleet.troops).toBeGreaterThan(1);
    const aboard = fleet.troops;
    island.garrison = 0;
    state.factions.empire.gold = 0;

    const got = scrap(state, 'empire', {
      kind: 'ship',
      fleetId: fleet.id,
      shipId: fleet.ships[0].id,
    });
    expect(got).toBe(scrapValue('reefwalker'));
    expect(fleet.ships).toHaveLength(1);
    // Nobody rides in a berth that is on the breaker's slip.
    expect(fleet.troops).toBeLessThanOrEqual(fleetCapacity(fleet));
    // And breaking a ship up in your own harbor is not sinking it: the men
    // walk down the gangway rather than drowning at anchor.
    expect(fleet.troops + island.garrison).toBe(aboard);
  });

  it('takes the last hull of a squadron off the board, crew and all', () => {
    const state = generateGalaxy(108);
    const island = isolate(state, 'empire');
    const fleet = addShip(state, island, 'empire', 'reefwalker');
    const officer = state.characters.find((c) => c.faction === 'empire')!;
    // Serving at sea rather than standing on the island, so "put ashore"
    // means something the assertion can see.
    officer.locationSystemId = state.systems.find((sys) => sys.id !== island.id)!.id;
    fleet.officerIds = [officer.id];
    fleet.troops = 1;

    scrap(state, 'empire', { kind: 'ship', fleetId: fleet.id, shipId: fleet.ships[0].id });

    // No squadron with no ships, and nobody serving with one that is gone.
    expect(state.fleets.find((f) => f.id === fleet.id)).toBeUndefined();
    expect(officer.locationSystemId).toBe(island.id);
  });

  it('leaves a side that can pay entirely alone', () => {
    const state = generateGalaxy(106);
    const island = isolate(state, 'empire');
    island.facilities = [
      { id: 'f1', type: 'mine', owner: 'empire' },
      { id: 'f2', type: 'construction_yard', owner: 'empire' },
    ];
    island.garrison = 2;
    state.factions.empire.gold = 10_000;
    settleOnce(state, createRng(5));
    expect(island.facilities).toHaveLength(2);
    expect(island.garrison).toBe(2);
    expect(state.events.filter((e) => e.text.includes('would not balance'))).toHaveLength(0);
  });
});
