import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { createRng } from '../rng';
import { addShip, bombardNow, fortsOf, islandBombardDefense } from '../fleets';
import { raiseWorksError } from '../build';
import {
  FORT_BOMBARD_DEFENSE,
  FORT_INVASION_DEFENSE,
  YARD_BUILDS,
  UPKEEP_PER_DAY,
  FACILITY_LABEL,
  BUILDING_ORDER,
  CRAFT_GRADES,
  FACILITY_CRAFT,
  isWall,
} from '../constants';
import type { FacilityType, GameState, System } from '../types';

function world(seed = 501): GameState {
  return generateGalaxy(seed, 'empire');
}
/** An island of mine with the walls cleared off it, so a test sets its own. */
function bare(state: GameState): System {
  const system = state.systems.find(
    (s) => s.control === 'empire' && s.slots - s.facilities.length > 1,
  )!;
  system.facilities = system.facilities.filter((f) => !isWall(f.type));
  return system;
}
function wall(system: System, type: 'fort' | 'heavy_fort', damage?: number) {
  system.facilities.push({
    id: `fac-${type}-${system.facilities.length}`,
    type,
    owner: system.control as 'empire' | 'alliance',
    ...(damage ? { damage } : {}),
  });
  return system.facilities.at(-1)!;
}

describe('the Heavy Fortress, as a second tier', () => {
  it('is a berth spent better and a coin spent worse', () => {
    // Sean's rule, and the whole reason it is a decision rather than an
    // upgrade: more wall and more guns on the one plot, at a slightly worse
    // rate per gold and per day of upkeep than simply building two Fortresses.
    const heavy = YARD_BUILDS.heavy_fort;
    const light = YARD_BUILDS.fort;

    // Per berth, it is worth exactly two Fortresses in both defences. No bulk
    // discount, which is right: one big wall is harder to cascade through than
    // two small ones, because a cascade has to clear the island's whole total
    // plus the thing it is killing.
    expect(FORT_BOMBARD_DEFENSE.heavy_fort).toBe(FORT_BOMBARD_DEFENSE.fort * 2);
    expect(FORT_INVASION_DEFENSE.heavy_fort).toBe(FORT_INVASION_DEFENSE.fort * 2);

    // And per gold and per day of upkeep it is the worse buy — two and a half
    // Fortresses of money for two Fortresses of wall — which is what stops it
    // being simply the better building.
    expect(FORT_INVASION_DEFENSE.heavy_fort / heavy.costGold).toBeLessThan(
      FORT_INVASION_DEFENSE.fort / light.costGold,
    );
    expect(FORT_INVASION_DEFENSE.heavy_fort / UPKEEP_PER_DAY.heavy_fort).toBeLessThan(
      FORT_INVASION_DEFENSE.fort / UPKEEP_PER_DAY.fort,
    );

    // And it is not free in time either: dearer and slower than one Fortress,
    // but not so slow that it never lands inside a war.
    expect(heavy.costGold).toBeGreaterThan(light.costGold);
    expect(heavy.days).toBeGreaterThan(light.days);
    expect(heavy.days).toBeLessThan(light.days * 2);
  });

  it('answers the three wall questions for both kinds and nothing else', () => {
    expect(isWall('fort')).toBe(true);
    expect(isWall('heavy_fort')).toBe(true);
    for (const type of ['mine', 'refinery', 'shipyard', 'training_facility'] as FacilityType[]) {
      expect(isWall(type), type).toBe(false);
    }
    // A wall's two numbers, and it has no others: it does not fire and it has
    // no condition.
    expect(FORT_BOMBARD_DEFENSE.fort).toBeGreaterThan(0);
    expect(FORT_BOMBARD_DEFENSE.heavy_fort).toBeGreaterThan(FORT_BOMBARD_DEFENSE.fort);
  });





  it('is a thing a yard can be told to build, on any ground', () => {
    const state = world();
    const port = state.systems.find(
      (s) =>
        s.control === 'empire' &&
        s.facilities.some((f) => f.type === 'training_facility' && f.owner === 'empire'),
    )!;
    port.slots = port.facilities.length + (port.deposits?.length ?? 0) + 2;
    state.factions.empire.gold = 5000;
    // Behind the research errand since 17 September: one grade of shipwright
    // craft, which is a fortnight or two of somebody's time in your own yards.
    state.factions.empire.craft = CRAFT_GRADES[0];
    const yard = port.facilities.find(
      (f) => f.type === 'training_facility' && f.owner === 'empire' && !f.building,
    )!;
    // A wall needs no forest and no vein under it, unlike the earners — and
    // since the construction yard was cut it needs no works either, only the
    // island, the ground and the craft.
    void yard;
    expect(raiseWorksError(state, port.id, 'heavy_fort', 'empire')).toBeNull();
  });

  /**
   * Sean, 17 September: *"Heavy Fortress needs to be gated by Research
   * mission."* It is the only building in the game that waits on anything, and
   * a side that has put nobody in its yards cannot have one at any price.
   */
  it('is not on the menu until somebody has been in the yards', () => {
    const state = world();
    const port = state.systems.find(
      (s) =>
        s.control === 'empire' &&
        s.facilities.some((f) => f.type === 'training_facility' && f.owner === 'empire'),
    )!;
    port.slots = port.facilities.length + (port.deposits?.length ?? 0) + 2;
    state.factions.empire.gold = 5000;
    state.factions.empire.craft = 0;
    const yard = port.facilities.find(
      (f) => f.type === 'training_facility' && f.owner === 'empire' && !f.building,
    )!;
    void yard;
    // It says so in a way the player can act on, rather than refusing flatly.
    expect(raiseWorksError(state, port.id, 'heavy_fort', 'empire')).toMatch(/shipwright craft/);
    // The plain Fortress is untouched: a wall you can always throw up.
    expect(raiseWorksError(state, port.id, 'fort', 'empire')).toBeNull();
    expect(FACILITY_CRAFT.fort ?? 0).toBe(0);

    // One grade, and it can be raised.
    state.factions.empire.craft = CRAFT_GRADES[0];
    expect(raiseWorksError(state, port.id, 'heavy_fort', 'empire')).toBeNull();
  });

  it('is named, and stands beside its lighter sibling on the board', () => {
    expect(FACILITY_LABEL.fort).toBe('Fortress');
    expect(FACILITY_LABEL.heavy_fort).toBe('Heavy Fortress');
    // Grouped with the defences, heavier first: an island's board should read
    // strongest wall down.
    const at = (t: FacilityType) => BUILDING_ORDER.indexOf(t);
    expect(at('heavy_fort')).toBeGreaterThanOrEqual(0);
    expect(at('heavy_fort')).toBeLessThan(at('fort'));
  });

  /**
   * What a Heavy Fortress is *for*, now that it neither fires nor crumbles:
   * it is twice the wall to break and twice the wall to climb, and it takes
   * one berth to do both.
   */
  it('is twice the obstacle, and takes a heavier squadron to break', () => {
    const state = world();
    state.fleets.length = 0;
    const port = bare(state);
    wall(port, 'heavy_fort');
    expect(islandBombardDefense(port)).toBe(FORT_BOMBARD_DEFENSE.heavy_fort);

    // A squadron that would be through a Fortress is not through this one: to
    // break it a roll has to beat 8 and then afford another 8, so anything
    // under 16 on the die cannot touch it however long it lies there.
    const raider = addShip(state, port, 'alliance', 'marauder');
    for (let i = 0; i < 40; i++) bombardNow(state, raider, createRng(300 + i));
    expect(fortsOf(port)).toHaveLength(1);
  });
});
