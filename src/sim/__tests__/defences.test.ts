import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { createRng } from '../rng';
import { addShip, fortGuns, isBlockaded, resolveBattles } from '../fleets';
import { requiredGarrison } from '../helpers';
import {
  CAPITAL_GARRISON,
  FORT_GUNS,
  START_GARRISON_MAX,
  START_GARRISON_SPARE,
} from '../constants';
import type { GameState, System } from '../types';

function world(seed = 501): GameState {
  return generateGalaxy(seed, 'empire');
}
function mineWithWater(state: GameState): System {
  return state.systems.find((s) => s.control === 'empire' && s.slots - s.facilities.length > 0)!;
}
function build(system: System, type: 'fort' | 'heavy_fort', owner: 'empire' | 'alliance' = 'empire') {
  system.facilities.push({ id: `fac-${type}-${system.facilities.length}`, type, owner });
}

describe('the opening, against Rebellion', () => {
  it('opens the Crown on nine islands, one of them sullen, and the Confederacy on eight or nine', () => {
    for (const seed of [17, 501, 7, 99]) {
      const state = world(seed);
      const crown = state.systems.filter((s) => s.control === 'empire');
      const confed = state.systems.filter((s) => s.control === 'alliance');
      // Three in the home Reach and two in each of the three contested ones.
      expect(crown).toHaveLength(9);
      // One or two in the home Reach, two in each of the three contested ones,
      // and Freeport, which flies Confederate colours from day one the way
      // Highwater flies the Crown's. Still no base: losing it costs nothing.
      expect(confed.length).toBeGreaterThanOrEqual(8);
      expect(confed.length).toBeLessThanOrEqual(9);
      const sullen = crown.filter((s) => s.support.empire < 50);
      expect(sullen).toHaveLength(1);
      for (const s of sullen) {
        // Above the uprising line, so day one is an occupation, not a revolt.
        expect(s.support.empire).toBeGreaterThanOrEqual(30);
        expect(s.uprising).toBe(false);
      }
      for (const s of confed) expect(s.support.alliance).toBeGreaterThanOrEqual(65);
    }
  });

  it('garrisons every held island by the rule the uprising check uses, capped at six', () => {
    const state = world(17);
    for (const f of ['empire', 'alliance'] as const) {
      for (const s of state.systems.filter((x) => x.control === f)) {
        const capital = s.id === state.factions[f].hqSystemId;
        // The Crown's seat is its own rule: it opens walled and manned,
        // because losing it loses the war and a siege is the point of it.
        if (s.id === state.factions.empire.hqSystemId) {
          expect(s.garrison, s.name).toBe(CAPITAL_GARRISON);
          continue;
        }
        const want = Math.min(START_GARRISON_MAX, Math.max(1, requiredGarrison(s.support[f]) + START_GARRISON_SPARE + (capital ? 1 : 0)));
        expect(s.garrison, s.name).toBe(want);
        // And it is enough: nothing you hold is under the line on day one.
        expect(s.garrison).toBeGreaterThanOrEqual(requiredGarrison(s.support[f]));
      }
    }
    // A sullen Crown island really does open with more companies than a loyal one.
    const crown = state.systems.filter((s) => s.control === 'empire' && s.id !== state.factions.empire.hqSystemId);
    const sullen = crown.filter((s) => s.support.empire < 50);
    const loyal = crown.filter((s) => s.support.empire >= 65);
    expect(Math.min(...sullen.map((s) => s.garrison))).toBeGreaterThan(Math.max(...loyal.map((s) => s.garrison)));
  });

  it('opens both sides solvent, with a heavier fleet than before and free ground everywhere', () => {
    for (const seed of [17, 501, 7, 99]) {
      const state = world(seed);
      for (const f of ['empire', 'alliance'] as const) {
        expect(state.factions[f].income, `${f} seed ${seed}`).toBeGreaterThan(state.factions[f].upkeep);
        const fleet = state.fleets.find((x) => x.faction === f)!;
        expect(fleet.ships.length).toBeGreaterThanOrEqual(5);
        for (const s of state.systems.filter((x) => x.control === f)) {
          const free = s.slots - s.facilities.length;
          expect(free, `${s.name}`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('forts', () => {
  it('fire on an enemy fleet lying off the harbor even with no fleet of their own', () => {
    const state = world();
    state.fleets.length = 0;
    const port = mineWithWater(state);
    // Exactly two walls, whatever the island opened with.
    port.facilities = port.facilities.filter((f) => f.type !== 'fort');
    build(port, 'fort');
    build(port, 'fort');
    expect(fortGuns(port)).toBe(2 * FORT_GUNS);
    const raider = addShip(state, port, 'alliance', 'swift');
    const rng = createRng(3);
    const before = raider.ships[0].damage;
    resolveBattles(state, rng);
    // Ten guns against one sloop: it is hit, on day one, by a harbor with no navy.
    const hurt = raider.ships.length === 0 || raider.ships[0].damage > before;
    expect(hurt).toBe(true);
  });

  it('count only for whoever holds the island, and only once finished', () => {
    const state = world();
    const port = mineWithWater(state);
    port.facilities = port.facilities.filter((f) => f.type !== 'fort');
    build(port, 'fort');
    port.facilities.at(-1)!.building = {
      item: 'fort', work: 3, workLeft: 3, travel: 0, travelLeft: 0, costGold: 100,
    };
    expect(fortGuns(port)).toBe(0);
    port.facilities.at(-1)!.building = undefined;
    expect(fortGuns(port)).toBe(FORT_GUNS);
    // The island changes hands: the guns do not fire for the side that built them.
    port.control = 'alliance';
    expect(fortGuns(port)).toBe(0);
  });
});

describe('a port with nothing in the water but the enemy', () => {
  it('is shut by any enemy gun at all, now the chain is gone', () => {
    const state = world();
    state.fleets.length = 0;
    const port = mineWithWater(state);
    expect(isBlockaded(state, port)).toBe(false);
    // One sloop. There used to be a floor here, held up by a boom across the
    // harbor mouth; Sean cut the boom on 16 September and the floor with it.
    addShip(state, port, 'alliance', 'swift');
    expect(isBlockaded(state, port)).toBe(true);
  });
});
