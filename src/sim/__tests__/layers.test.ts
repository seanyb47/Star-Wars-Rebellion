import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import {
  CHART_LAYERS,
  idleFacilities,
  islandWorth,
  layerMark,
  layerTally,
  showsNumber,
  worthTier,
} from '../layers';
import { GARRISON_FAIR, GARRISON_STRONG, ROOM_AMPLE, ROOM_FAIR } from '../constants';
import { islandIncome } from '../economy';
import { getSystem } from '../helpers';
import { addShip } from '../fleets';
import { buildMenu } from '../build';

function setup(seed = 501) {
  const state = generateGalaxy(seed, 'empire');
  // The opening fleets are not what these tests count.
  state.fleets.length = 0;
  // An island of yours that actually has a yard on it. The first held island
  // is not guaranteed one now that the Crown opens on six and the plan deals
  // facilities round the table.
  const mine = state.systems.find(
    (s) =>
      s.control === 'empire' &&
      s.facilities.some((f) => f.owner === 'empire' && f.type === 'construction_yard' && buildMenu(f, 3).length > 0),
  )!;
  return { state, mine };
}

describe('chart layers', () => {
  it('lights every island on allegiance, which is the resting view', () => {
    const { state } = setup();
    for (const s of state.systems) {
      expect(layerMark(state, s, 'allegiance', 'empire').lit).toBe(true);
    }
    // And reports no tally, because "all of them" is not a finding.
    expect(layerTally(state, 'allegiance', 'empire')).toBe(0);
  });

  it('never lights an island you have not charted', () => {
    const { state } = setup();
    const dark = state.systems.find((s) => !s.explored.empire)!;
    dark.garrison = 5;
    dark.control = 'empire';
    for (const { id } of CHART_LAYERS) {
      if (id === 'allegiance') continue;
      expect(layerMark(state, dark, id, 'empire').lit).toBe(false);
    }
  });

  it('counts a yard as idle only while it has something left to build', () => {
    const { state, mine } = setup();
    // Pick a facility that is actually being counted, or the arithmetic below
    // is testing nothing: a yard with an empty build menu is not idle, it is
    // finished, and setting it to work changes no count.
    const yard = mine.facilities.find(
      (f) => f.owner === 'empire' && f.type === 'construction_yard' && !f.building && buildMenu(f, 3).length > 0,
    )!;
    expect(yard).toBeDefined();
    const before = layerMark(state, mine, 'idleBuildings', 'empire').count ?? 0;
    expect(before).toBeGreaterThan(0);

    // Busy is not idle — and one job puts every yard of that kind on the
    // island to work. Since 19 September the filter is all three kinds at
    // once, so setting the yards going drops the count by exactly the yards
    // and leaves any idle drill hall or slipway still standing.
    const yards = mine.facilities.filter(
      (f) => f.owner === 'empire' && f.type === 'construction_yard' && !f.building,
    ).length;
    yard.building = { item: 'mine', work: 4, workLeft: 4, travel: 0, travelLeft: 0, costGold: 40 };
    expect(layerMark(state, mine, 'idleBuildings', 'empire').count ?? 0).toBe(before - yards);
    yard.building = undefined;
    expect(layerMark(state, mine, 'idleBuildings', 'empire').count ?? 0).toBe(before);

    // Nor is an island in revolt: nothing is being worked there at all.
    mine.uprising = true;
    expect(layerMark(state, mine, 'idleBuildings', 'empire').lit).toBe(false);
  });

  /**
   * A yard at work is not idle, and the count says which kinds are.
   *
   * Sean, 19 September, on an island the chart had marked with a 1: *"This
   * construction yard is making something so it's not idle. Shouldn't be
   * active on idle buildings filter."* Reproduced, and the filter was right —
   * the yard was contributing nothing and the 1 was the slipway standing empty
   * beside it. Pinned here because the reasoning is not obvious from the mark:
   * the island can only say how many, so the moment two kinds of works stand
   * on one island the count stops being attributable by eye.
   *
   * The fix went to the panel, which now tags the works the count is about.
   * This is the half of it that says the arithmetic was never wrong.
   */
  it('drops a whole kind of works from the count while one of that kind is at work', () => {
    // Across seeds rather than one, because not every map deals a single
    // island both kinds — and a test that quietly skips is a test that stops
    // guarding the thing it was written for.
    let state!: ReturnType<typeof generateGalaxy>;
    let island: (typeof state.systems)[number] | undefined;
    for (let seed = 501; seed < 541 && !island; seed++) {
      state = generateGalaxy(seed, 'empire');
      island = state.systems.find(
        (s) =>
          s.control === 'empire' &&
          !s.uprising &&
          s.facilities.some((f) => f.owner === 'empire' && f.type === 'construction_yard') &&
          s.facilities.some((f) => f.owner === 'empire' && f.type === 'shipyard'),
      );
    }
    expect(island, 'no island in forty seeds holds both a yard and a slipway').toBeDefined();
    island = island!;
    const yard = island.facilities.find(
      (f) => f.owner === 'empire' && f.type === 'construction_yard',
    )!;

    const yards = () => idleFacilities(island, 'empire', 'construction_yard');
    const slips = () => idleFacilities(island, 'empire', 'shipyard');
    expect(yards()).toBeGreaterThan(0);
    expect(slips()).toBeGreaterThan(0);
    const both = layerMark(state, island, 'idleBuildings', 'empire').count ?? 0;

    yard.building = { item: 'mine', work: 4, workLeft: 4, travel: 8, travelLeft: 8, costGold: 40 };
    // The working kind drops out whole; the slipway is untouched and is what
    // is left of the count.
    expect(yards()).toBe(0);
    expect(slips()).toBeGreaterThan(0);
    expect(layerMark(state, island, 'idleBuildings', 'empire').count).toBe(both - 1);

    // And a blockade is not idleness: it stops the island earning, not
    // building, so a slipway behind one still wants an order.
    island.blockaded = true;
    expect(layerMark(state, island, 'idleBuildings', 'empire').lit).toBe(true);
  });

  it('lights islands where a crew member is ashore with nothing to do', () => {
    const { state } = setup();
    const officer = state.characters.find((c) => c.faction === 'empire')!;
    const where = getSystem(state, officer.locationSystemId);
    where.explored.empire = true;
    expect(layerMark(state, where, 'idleCrew', 'empire').lit).toBe(true);

    // Busy or hurt is not idle.
    officer.status = 'on_mission';
    const others = state.characters.filter(
      (c) => c.faction === 'empire' && c.locationSystemId === where.id && c.status === 'available',
    ).length;
    expect(layerMark(state, where, 'idleCrew', 'empire').count ?? 0).toBe(others);
  });

  it('counts hulls in harbor, not hulls at sea', () => {
    const { state, mine } = setup();
    addShip(state, mine, 'empire', 'kestrel');
    const fleet = addShip(state, mine, 'empire', 'kestrel');
    expect(layerMark(state, mine, 'fleets', 'empire')).toEqual({ lit: true, count: 2 });

    fleet.voyage = { targetSystemId: mine.id, daysRemaining: 3 };
    expect(layerMark(state, mine, 'fleets', 'empire').lit).toBe(false);
  });

  it('shows production as what an island earns its holder today, and nothing for the idle', () => {
    const { state } = setup();
    const earner = state.systems.find(
      (s) => s.explored.empire && s.control === 'empire' && islandIncome(s, 'empire') > 0,
    )!;
    expect(layerMark(state, earner, 'worth', 'empire')).toEqual({
      lit: true,
      count: Math.round(islandIncome(earner, 'empire')),
    });
    // A blockade stops the trade, and the chart says so.
    earner.blockaded = true;
    expect(layerMark(state, earner, 'worth', 'empire').lit).toBe(false);
    earner.blockaded = false;
    // Nobody's island earns nobody anything.
    const nobodys = state.systems.find((s) => s.explored.empire && s.control === 'neutral')!;
    expect(layerMark(state, nobodys, 'worth', 'empire').lit).toBe(false);
    // Capacity is still measured, for the panels' worth mark.
    expect(islandWorth(earner)).toBe(earner.slots);
  });

  it('grades worth into three, and puts the boundaries where it says', () => {
    const { state } = setup();
    const island = state.systems[0];
    const grade = (slots: number) => {
      island.slots = slots;
      return worthTier(island);
    };
    expect(grade(0)).toBe('none');
    expect(grade(1)).toBe('small');
    expect(grade(5)).toBe('small');
    expect(grade(6)).toBe('medium');
    expect(grade(9)).toBe('medium');
    expect(grade(10)).toBe('large');
    expect(grade(14)).toBe('large');

    // And across a whole world the grades stay a ladder, not a cliff: the
    // prizes are the few, which is the only reason the layer is worth opening.
    const fresh = generateGalaxy(501, 'empire');
    const count = (t: string) => fresh.systems.filter((s) => worthTier(s) === t).length;
    expect(count('large')).toBeGreaterThan(0);
    expect(count('large')).toBeLessThan(count('medium'));
    expect(count('none')).toBeLessThan(count('small'));
  });

  it('tallies only the islands that answer the layer', () => {
    const { state } = setup();
    const byHand = state.systems.filter((s) => layerMark(state, s, 'garrisons', 'empire').lit).length;
    expect(layerTally(state, 'garrisons', 'empire')).toBe(byHand);
    expect(byHand).toBeGreaterThan(0);
  });
});

describe('garrisons answer with a number and nothing else', () => {
  /**
   * The size band is gone from the chart.
   *
   * Sean, 19 September: *"Change garrison filter to be more like production.
   * Just tell me the number all in same size font. No dots."* This test used
   * to pin three sizes — his own ladder of 14 September — and the ladder was
   * right while the mark was only a dot. Once the numeral arrived on the same
   * day, the band was saying in a second and vaguer channel the thing the
   * numeral said exactly, so a big 4 and a small 2 were a 4 and a 2 twice
   * over. Production never had a band and is the model.
   */
  it('counts the troops ashore and grades nothing', () => {
    const { state } = setup();
    const island = state.systems.find((s) => s.control === 'empire')!;
    const markAt = (troops: number) => {
      island.garrison = troops;
      return layerMark(state, island, 'garrisons', 'empire');
    };
    for (const n of [1, GARRISON_FAIR - 1, GARRISON_FAIR, GARRISON_STRONG, 9]) {
      expect(markAt(n).count, `${n} ashore`).toBe(n);
      expect(markAt(n).size, `${n} ashore`).toBeUndefined();
    }
    // Which is exactly what Production does, and the reason it is the model.
    const earner = state.systems.find(
      (s) => s.explored.empire && s.control === 'empire' && islandIncome(s, 'empire') > 0,
    )!;
    expect(layerMark(state, earner, 'worth', 'empire').size).toBeUndefined();

    // An island holding nobody is not an answer at all, and an island of
    // theirs never is.
    island.garrison = 0;
    expect(layerMark(state, island, 'garrisons', 'empire').lit).toBe(false);
    island.garrison = 4;
    expect(layerMark(state, island, 'garrisons', 'alliance').lit).toBe(false);
  });

  it('still says it with the numeral', () => {
    expect(showsNumber('garrisons')).toBe(true);
  });
});

describe('available land', () => {
  it('lights an island of yours with berths still open, and grades how many', () => {
    const state = generateGalaxy(7, 'empire');
    const island = state.systems.find((s) => s.control === 'empire')!;
    island.uprising = false;
    // Room is berths with nothing on them, and a deposit is something. This
    // test is about the grading, so the ground is cleared and the berth count
    // is set outright.
    island.deposits = [];

    const free = () => layerMark(state, island, 'room', 'empire');
    // One berth open: something, but not much.
    island.slots = island.facilities.length + 1;
    expect(free()).toEqual({ lit: true, count: 1, size: 'small' });
    island.slots = island.facilities.length + ROOM_FAIR;
    expect(free().size).toBe('medium');
    island.slots = island.facilities.length + ROOM_AMPLE;
    expect(free().size).toBe('large');

    // Built out: no room, so nothing to say.
    island.slots = island.facilities.length;
    expect(free().lit).toBe(false);
  });

  it('says nothing about ground that is not yours to build on', () => {
    const state = generateGalaxy(7, 'empire');
    const island = state.systems.find((s) => s.control === 'empire')!;
    island.slots = island.facilities.length + 4;

    // An island in revolt takes no orders, whatever room it has.
    island.uprising = true;
    expect(layerMark(state, island, 'room', 'empire').lit).toBe(false);
    island.uprising = false;

    // Nor is room on somebody else's island room you have.
    expect(layerMark(state, island, 'room', 'alliance').lit).toBe(false);

    // Nor room on an island you have never charted.
    island.explored.empire = false;
    expect(layerMark(state, island, 'room', 'empire').lit).toBe(false);
  });

  it('answers in a size and a number, and comes last in the strip', () => {
    expect(showsNumber('room')).toBe(true);
    expect(CHART_LAYERS.find((l) => l.id === 'room')!.label).toBe('Available land');
    // *"Move idle land to last."* Pinned, because the order of this array is
    // the swipe order and nothing else says so.
    expect(CHART_LAYERS[CHART_LAYERS.length - 1].id).toBe('room');
  });
});

describe('which layers count and which grade', () => {
  it('puts a number on every idle layer and on Production', () => {
    for (const layer of ['idleCrew', 'idleBuildings', 'worth'] as const) {
      expect(showsNumber(layer), layer).toBe(true);
    }
  });

  it('counts the two that were graded only, and leaves the rest', () => {
    for (const layer of ['garrisons', 'room'] as const) {
      expect(showsNumber(layer), layer).toBe(true);
    }
    for (const layer of ['allegiance', 'none', 'fleets', 'missions'] as const) {
      expect(showsNumber(layer), layer).toBe(false);
    }
  });

  it('gives the idle layers a count to draw, one per thing waiting for an order', () => {
    const state = generateGalaxy(61, 'empire');
    const yard = state.systems.find(
      (s) => s.control === 'empire' && s.facilities.some((f) => f.type === 'construction_yard'),
    )!;
    yard.uprising = false;
    const mark = layerMark(state, yard, 'idleBuildings', 'empire');
    expect(mark.lit).toBe(true);
    expect(mark.count).toBe(
      yard.facilities.filter(
        (f) =>
          ['construction_yard', 'training_facility', 'shipyard'].includes(f.type) &&
          !f.building &&
          !f.founding,
      ).length,
    );
    expect(mark.count).toBeGreaterThan(0);
    // A number, not a size: the two never appear on the same mark.
    expect(mark.size).toBeUndefined();
  });
});
