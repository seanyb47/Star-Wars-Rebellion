import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { createRng } from '../rng';
import {
  addShip,
  advanceSieges,
  bombardError,
  contestedAt,
  fortGuns,
  isBlockaded,
  resolveBattles,
} from '../fleets';
import { requiredGarrison } from '../helpers';
import {
  CAPITAL_GARRISON,
  CORALHOME,
  CORALHOME_GARRISON,
  CORALHOME_SUPPORT,
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
        /*
         * Three, not four, and not because the opening got lighter.
         *
         * Sean named it hull by hull on 21 September and the Crown's Home
         * Fleet is a Sovereign and two Interceptors. One Sovereign is 4,600
         * of hull and seventy-four guns where the whole old six-hull Home
         * Fleet was 119 guns, so what counting hulls measures here is the
         * roster's scale rather than the fleet's weight. What the line is
         * still for is catching an opening that quietly comes up empty.
         */
        expect(fleet.ships.length).toBeGreaterThanOrEqual(2);
        for (const s of state.systems.filter((x) => x.control === f)) {
          const free = s.slots - s.facilities.length;
          expect(free, `${s.name}`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('forts', () => {
  it('hold their fire at a fleet that is only lying there', () => {
    // Sean, 18 September: *"guns should be anti bombardment only."* A harbor
    // battery used to fight any enemy hull in the water, which made a
    // fortified island grind down a squadron that had not fired a shot and
    // could not fire back — the walls cannot be sunk in a fleet action. The
    // battery is silent now until it is given something to answer.
    const state = world();
    state.fleets.length = 0;
    const port = mineWithWater(state);
    port.facilities = port.facilities.filter((f) => f.type !== 'fort');
    build(port, 'fort');
    build(port, 'fort');
    expect(fortGuns(port)).toBe(2 * FORT_GUNS);
    const raider = addShip(state, port, 'alliance', 'CFS-SWI-S01');
    const before = raider.ships[0].damage;
    resolveBattles(state, createRng(3));
    expect(raider.ships).toHaveLength(1);
    expect(raider.ships[0].damage).toBe(before);
    // Not an action at all, which is why nothing was fought: there is nobody
    // in the water to fight.
    expect(contestedAt(state, port)).toBe(false);
  });

  it('answer the moment that fleet opens on the walls', () => {
    // The other half of the same ruling, and the reason it is not a nerf: a
    // squadron that starts throwing shot gets the whole battery back, at full
    // weight, exactly as it always did.
    const state = world();
    state.fleets.length = 0;
    const port = mineWithWater(state);
    port.facilities = port.facilities.filter((f) => f.type !== 'fort');
    build(port, 'fort');
    build(port, 'fort');
    // A hull that throws heavy enough for the order to be allowed at all.
    // The Reefwarden is not one: forty-four guns and a Bombardment of **zero**
    // on the sheet, which is the roster saying she is a fleet ship and not a
    // siege train. Bombardment is its own column now and the Ironback is where
    // the Confederacy keeps it.
    const raider = addShip(state, port, 'alliance', 'CFS-IRB-R5-01');
    expect(bombardError(state, raider.id, 'alliance')).toBeNull();
    raider.bombarding = true;
    const before = raider.ships[0].damage;
    advanceSieges(state, createRng(3));
    expect(raider.ships.length === 0 || raider.ships[0].damage > before).toBe(true);
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
    // One armed sloop. There used to be a floor here, held up by a boom
    // across the harbor mouth; Sean cut the boom on 16 September and the
    // floor with it. A Marauder rather than a Swift, because the Swift is the
    // one hull on the v4.3 sheet with no guns at all — *any* gun shuts a
    // port, and a ship with none is not one.
    addShip(state, port, 'alliance', 'CFS-MAR-R1-01');
    expect(isBlockaded(state, port)).toBe(true);
  });
});
