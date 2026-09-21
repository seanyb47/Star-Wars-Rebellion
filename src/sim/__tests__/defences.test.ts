import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { createRng } from '../rng';
import {
  addShip,
  bombardError,
  contestedAt,
  bombardNow,
  fortsOf,
  islandBombardDefense,
  isBlockaded,
  resolveBattles,
} from '../fleets';
import { requiredGarrison } from '../helpers';
import {
  CAPITAL_GARRISON,
  CORALHOME,
  CORALHOME_GARRISON,
  CORALHOME_SUPPORT,
  FORT_BOMBARD_DEFENSE,
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
  it('opens the Crown on ten islands, one of them sullen, and the Confederacy on eight or nine', () => {
    for (const seed of [17, 501, 7, 99]) {
      const state = world(seed);
      const crown = state.systems.filter((s) => s.control === 'empire');
      const confed = state.systems.filter((s) => s.control === 'alliance');
      // Three in the home Reach, two in each of the three contested ones, and
      // Coralhome — Crown-held on day one since the lore package, and kept out
      // of its Reach's deal so the count is the same ten whether Coral is
      // inside the charts or outside them.
      expect(crown).toHaveLength(10);
      expect(crown.map((s) => s.name)).toContain(CORALHOME);
      // One or two in the home Reach, two in each of the three contested ones,
      // and Freeport, which flies Confederate colours from day one the way
      // Highwater flies the Crown's. Still no base: losing it costs nothing.
      expect(confed.length).toBeGreaterThanOrEqual(8);
      expect(confed.length).toBeLessThanOrEqual(9);
      /*
       * Two sullen now, not one: the dealt one in the home Reach, and
       * Coralhome, which is sullen on purpose and by a distance — the Crown
       * cleared its reef and the people have not forgiven it.
       *
       * The inner rule used to read `support >= 30`, the uprising line, as a
       * way of saying *day one is an occupation and not a revolt*. That held
       * only because nothing had ever been dealt below the line. Coralhome is
       * dealt at twelve and is still not in revolt, because it is garrisoned
       * above what the line asks for — which is the actual rule, and is what
       * this checks now. A support floor was a proxy for it.
       */
      const sullen = crown.filter((s) => s.support.empire < 50);
      expect(sullen).toHaveLength(2);
      expect(sullen.map((s) => s.name)).toContain(CORALHOME);
      for (const s of sullen) {
        expect(s.uprising, s.name).toBe(false);
        expect(s.garrison, s.name).toBeGreaterThanOrEqual(requiredGarrison(s.support.empire));
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
        // Coralhome is its own rule too, and for the opposite reason to the
        // seat's: it is held against its people rather than by them. The
        // loyalty rule would give it a garrison sized to how it feels about
        // the Crown, which is the wrong question on the one island the Crown
        // took and cleared. It opens manned like a capital.
        if (s.name === CORALHOME) {
          expect(s.garrison, s.name).toBe(CORALHOME_GARRISON);
          expect(s.support.empire, s.name).toBe(CORALHOME_SUPPORT);
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
        // Four, not five. The Confederate Home Fleet lost three Swifts on 20
        // September — *"1 swift is all the swifts you need"* — and came back
        // as one Swift, two Tempests and the Brig, so four hulls is now the
        // smaller of the two openings rather than six.
        expect(fleet.ships.length).toBeGreaterThanOrEqual(4);
        for (const s of state.systems.filter((x) => x.control === f)) {
          const free = s.slots - s.facilities.length;
          expect(free, `${s.name}`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('forts', () => {
  /**
   * A wall does not fire at all any more.
   *
   * Sean, 18 September: *"guns should be anti bombardment only."* That first
   * narrowed a battery to answering only a squadron that had opened on it —
   * and on 20 September, when a bombardment stopped being a round of fire and
   * became a die roll, the battery lost its last trigger. `FORT_GUNS`,
   * `HEAVY_FORT_GUNS`, `wallGuns`, `fortGuns` and `underTheWall` are all gone
   * with it. A fort is an obstacle now, and never a danger.
   *
   * What it does instead is stand in the way twice over: it is what a
   * bombardment has to break before it can reach anybody, and while it stands
   * it adds its Invasion Defense to whoever is holding the island.
   */
  it('never fires at a fleet, whatever that fleet is doing', () => {
    const state = world();
    state.fleets.length = 0;
    const port = mineWithWater(state);
    port.facilities = port.facilities.filter((f) => f.type !== 'fort');
    build(port, 'fort');
    build(port, 'fort');
    const raider = addShip(state, port, 'alliance', 'coral-dreadnaught');
    const before = raider.ships[0].damage;
    // Lying there.
    resolveBattles(state, createRng(3));
    expect(raider.ships[0].damage).toBe(before);
    // And firing on it, which used to be the moment the whole battery
    // answered at full weight.
    expect(bombardError(state, raider.id, 'alliance')).toBeNull();
    bombardNow(state, raider, createRng(3));
    expect(raider.ships).toHaveLength(1);
    expect(raider.ships[0].damage).toBe(before);
    // Not an action at all: there is nobody in the water to fight.
    expect(contestedAt(state, port)).toBe(false);
  });

  it('counts for whoever holds the island, and only once finished', () => {
    const state = world();
    const port = mineWithWater(state);
    port.facilities = port.facilities.filter((f) => f.type !== 'fort');
    build(port, 'fort');
    // A wall still going up is not a wall.
    port.facilities.at(-1)!.building = {
      item: 'fort', work: 3, workLeft: 3, travel: 0, travelLeft: 0, costGold: 100,
    };
    expect(fortsOf(port)).toHaveLength(0);
    port.facilities.at(-1)!.building = undefined;
    expect(fortsOf(port)).toHaveLength(1);
    expect(islandBombardDefense(port)).toBe(FORT_BOMBARD_DEFENSE.fort);
    // The island changes hands: the wall belongs to whoever holds the ground.
    port.control = 'alliance';
    expect(fortsOf(port)).toHaveLength(0);
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
    // The Brigantine, not the Swift: since the roster swap the Swift is the
    // one hull in the game with no guns at all, and a blockade is raised by a
    // gun. Six light guns is still the smallest thing that can shut a port,
    // which is what this rule is about.
    addShip(state, port, 'alliance', 'brigantine');
    expect(isBlockaded(state, port)).toBe(true);
  });
});
