import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { CHART_LAYERS, islandWorth, layerMark, layerTally } from '../layers';
import { getSystem } from '../helpers';
import { addShip } from '../fleets';
import { buildMenu } from '../build';

function setup(seed = 501) {
  const state = generateGalaxy(seed, 'empire');
  // The opening fleets are not what these tests count.
  state.fleets.length = 0;
  const mine = state.systems.find((s) => s.control === 'empire' && s.facilities.length > 0)!;
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
      (f) => f.owner === 'empire' && !f.building && buildMenu(f).length > 0,
    )!;
    expect(yard).toBeDefined();
    const before = layerMark(state, mine, 'idleWorks', 'empire').count ?? 0;
    expect(before).toBeGreaterThan(0);

    // Busy is not idle.
    yard.building = { item: 'mine', daysRemaining: 4, costGold: 40 };
    expect(layerMark(state, mine, 'idleWorks', 'empire').count ?? 0).toBe(before - 1);
    yard.building = undefined;

    // Nor is an island in revolt: nothing is being worked there at all.
    mine.uprising = true;
    expect(layerMark(state, mine, 'idleWorks', 'empire').lit).toBe(false);
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

  it('measures worth as ground plus works, and leaves bare rock dark', () => {
    const { state } = setup();
    const rich = state.systems.find(
      (s) => s.explored.empire && s.rawSlots + s.energySlots > 0,
    )!;
    expect(layerMark(state, rich, 'worth', 'empire')).toEqual({
      lit: true,
      count: rich.rawSlots + rich.energySlots,
    });
    expect(islandWorth(rich)).toBe(rich.rawSlots + rich.energySlots);

    // Worth is about the island, not about who holds it: taking it changes
    // nothing here. That is the whole point of the layer — it says where is
    // worth having, which is a question you ask about somebody else's island.
    const before = layerMark(state, rich, 'worth', 'empire').count;
    rich.control = rich.control === 'empire' ? 'alliance' : 'empire';
    expect(layerMark(state, rich, 'worth', 'empire').count).toBe(before);

    // Bare rock answers nothing, however well charted.
    rich.rawSlots = 0;
    rich.energySlots = 0;
    expect(layerMark(state, rich, 'worth', 'empire').lit).toBe(false);
  });

  it('tallies only the islands that answer the layer', () => {
    const { state } = setup();
    const byHand = state.systems.filter((s) => layerMark(state, s, 'garrisons', 'empire').lit).length;
    expect(layerTally(state, 'garrisons', 'empire')).toBe(byHand);
    expect(byHand).toBeGreaterThan(0);
  });
});
