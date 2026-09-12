import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { createRng } from '../rng';
import { addShip, boomDefence, fortGuns, isBlockaded, resolveBattles, resolveLanding } from '../fleets';
import { requiredGarrison } from '../helpers';
import { BOOM_BLOCKADE_GUNS, BOOM_DEFENCE, FORT_GUNS, START_GARRISON_MAX, START_GARRISON_SPARE } from '../constants';
import type { GameState, System } from '../types';

function world(seed = 501): GameState {
  return generateGalaxy(seed, 'empire');
}
function mineWithWater(state: GameState): System {
  return state.systems.find((s) => s.control === 'empire' && s.energySlots - s.facilities.filter((f) => f.type !== 'mine').length > 0)!;
}
function build(system: System, type: 'fort' | 'boom', owner: 'empire' | 'alliance' = 'empire') {
  system.facilities.push({ id: `fac-${type}-${system.facilities.length}`, type, owner });
}

describe('the opening, against Rebellion', () => {
  it('gives the Crown six islands, two of them sullen, and the Confederacy four that mean it', () => {
    for (const seed of [17, 501, 7, 99]) {
      const state = world(seed);
      const crown = state.systems.filter((s) => s.control === 'empire');
      const confed = state.systems.filter((s) => s.control === 'alliance');
      expect(crown).toHaveLength(6);
      expect(confed).toHaveLength(4);
      const sullen = crown.filter((s) => s.support.empire < 50);
      expect(sullen).toHaveLength(2);
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
          const free = s.rawSlots + s.energySlots - s.facilities.length;
          expect(free, `${s.name}`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('forts', () => {
  it('fire on an enemy fleet lying off the harbour even with no fleet of their own', () => {
    const state = world();
    state.fleets.length = 0;
    const port = mineWithWater(state);
    build(port, 'fort');
    build(port, 'fort');
    expect(fortGuns(port)).toBe(2 * FORT_GUNS);
    const raider = addShip(state, port, 'alliance', 'swift');
    const rng = createRng(3);
    const before = raider.ships[0].damage;
    resolveBattles(state, rng);
    // Ten guns against one sloop: it is hit, on day one, by a harbour with no navy.
    const hurt = raider.ships.length === 0 || raider.ships[0].damage > before;
    expect(hurt).toBe(true);
  });

  it('count only for whoever holds the island, and only once finished', () => {
    const state = world();
    const port = mineWithWater(state);
    build(port, 'fort');
    port.facilities.at(-1)!.building = { item: 'fort', daysRemaining: 3, costGold: 100 };
    expect(fortGuns(port)).toBe(0);
    port.facilities.at(-1)!.building = undefined;
    expect(fortGuns(port)).toBe(FORT_GUNS);
    // The island changes hands: the guns do not fire for the side that built them.
    port.control = 'alliance';
    expect(fortGuns(port)).toBe(0);
  });
});

describe('booms', () => {
  it('cost a landing what companies would, and are not spent from the garrison', () => {
    const state = world();
    state.fleets.length = 0;
    const port = mineWithWater(state);
    port.garrison = 2;
    build(port, 'boom');
    expect(boomDefence(port)).toBe(BOOM_DEFENCE);
    const landing = addShip(state, port, 'alliance', 'brig');
    landing.troops = 3; // beats 2 companies alone; not 2 + the chain
    const rng = createRng(5);
    resolveLanding(state, landing, rng);
    expect(port.control).toBe('empire');
    // The chain took the first two, the garrison lost at most one.
    expect(port.garrison).toBeGreaterThanOrEqual(1);
  });

  it('keep the port open under a lone raider, and closed under a real squadron', () => {
    const state = world();
    state.fleets.length = 0;
    const port = mineWithWater(state);
    build(port, 'boom');
    const raider = addShip(state, port, 'alliance', 'swift'); // 2 guns
    expect(isBlockaded(state, port)).toBe(false);
    // Bring the enemy up to the floor and it closes.
    let guns = 2;
    while (guns < BOOM_BLOCKADE_GUNS) { addShip(state, port, 'alliance', 'swift'); guns += 2; }
    expect(isBlockaded(state, port)).toBe(true);
    void raider;
  });
});
