import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { CHART_LAYERS, islandWorth, layerMark, layerTally, showsNumber, worthTier } from '../layers';
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
    const before = layerMark(state, mine, 'idleYards', 'empire').count ?? 0;
    expect(before).toBeGreaterThan(0);

    // Busy is not idle — and one job puts every yard on the island to work,
    // so an island with an order on it has no idle hands at all.
    yard.building = { item: 'mine', work: 4, workLeft: 4, travel: 0, travelLeft: 0, costGold: 40 };
    expect(layerMark(state, mine, 'idleYards', 'empire').lit).toBe(false);
    yard.building = undefined;
    expect(layerMark(state, mine, 'idleYards', 'empire').count ?? 0).toBe(before);

    // Nor is an island in revolt: nothing is being worked there at all.
    mine.uprising = true;
    expect(layerMark(state, mine, 'idleYards', 'empire').lit).toBe(false);
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

describe('garrisons answer in three sizes', () => {
  it('draws under three companies small, three to five medium, six and up large', () => {
    const { state } = setup();
    const island = state.systems.find((s) => s.control === 'empire')!;
    const sizeAt = (companies: number) => {
      island.garrison = companies;
      return layerMark(state, island, 'garrisons', 'empire').size;
    };
    expect(sizeAt(1)).toBe('small');
    expect(sizeAt(GARRISON_FAIR - 1)).toBe('small');
    expect(sizeAt(GARRISON_FAIR)).toBe('medium');
    expect(sizeAt(GARRISON_STRONG - 1)).toBe('medium');
    expect(sizeAt(GARRISON_STRONG)).toBe('large');
    expect(sizeAt(9)).toBe('large');

    // An island holding nobody is not an answer at all, and an island of
    // theirs never is.
    island.garrison = 0;
    expect(layerMark(state, island, 'garrisons', 'empire').lit).toBe(false);
    island.garrison = 4;
    expect(layerMark(state, island, 'garrisons', 'alliance').lit).toBe(false);
  });

  it('says it with the dot and not with a numeral as well', () => {
    expect(showsNumber('garrisons')).toBe(false);
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

  it('answers in sizes, not numerals: the chart keeps its one dot', () => {
    expect(showsNumber('room')).toBe(false);
    expect(CHART_LAYERS.map((l) => l.id)).toContain('room');
    expect(CHART_LAYERS.find((l) => l.id === 'room')!.label).toBe('Available land');
  });
});

describe('which layers count and which grade', () => {
  it('puts a number on every idle layer and on Production', () => {
    for (const layer of ['idleCrew', 'idleYards', 'idleDrills', 'idleSlips', 'worth'] as const) {
      expect(showsNumber(layer), layer).toBe(true);
    }
  });

  it('grades the rest by dot size instead', () => {
    for (const layer of ['allegiance', 'none', 'garrisons', 'room', 'fleets', 'missions'] as const) {
      expect(showsNumber(layer), layer).toBe(false);
    }
  });

  it('gives the idle layers a count to draw, one per thing waiting for an order', () => {
    const state = generateGalaxy(61, 'empire');
    const yard = state.systems.find(
      (s) => s.control === 'empire' && s.facilities.some((f) => f.type === 'construction_yard'),
    )!;
    yard.uprising = false;
    const mark = layerMark(state, yard, 'idleYards', 'empire');
    expect(mark.lit).toBe(true);
    expect(mark.count).toBe(
      yard.facilities.filter((f) => f.type === 'construction_yard' && !f.building).length,
    );
    expect(mark.count).toBeGreaterThan(0);
    // A number, not a size: the two never appear on the same mark.
    expect(mark.size).toBeUndefined();
  });
});
