import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { CHART_LAYERS, islandWorth, layerMark, layerTally, worthTier } from '../layers';
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
      s.facilities.some((f) => f.owner === 'empire' && f.type === 'construction_yard' && buildMenu(f).length > 0),
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
      (f) => f.owner === 'empire' && f.type === 'construction_yard' && !f.building && buildMenu(f).length > 0,
    )!;
    expect(yard).toBeDefined();
    const before = layerMark(state, mine, 'idleYards', 'empire').count ?? 0;
    expect(before).toBeGreaterThan(0);

    // Busy is not idle.
    yard.building = { item: 'mine', daysRemaining: 4, costGold: 40 };
    expect(layerMark(state, mine, 'idleYards', 'empire').count ?? 0).toBe(before - 1);
    yard.building = undefined;

    // Nor is an island in revolt: nothing is being worked there at all.
    mine.uprising = true;
    expect(layerMark(state, mine, 'idleYards', 'empire').lit).toBe(false);
  });

  it('lights islands where an officer is ashore with nothing to do', () => {
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

  it('counts hulls in harbour, not hulls at sea', () => {
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
    expect(islandWorth(earner)).toBe(earner.rawSlots + earner.energySlots);
  });

  it('grades worth into three, and puts the boundaries where it says', () => {
    const { state } = setup();
    const island = state.systems[0];
    const grade = (raw: number) => {
      island.rawSlots = raw;
      island.energySlots = 0;
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
