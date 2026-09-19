import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { createRng } from '../rng';
import {
  addShip,
  advanceSieges,
  fortGuns,
  fortsOf,
  wallCondition,
} from '../fleets';
import { advanceDay } from '../advanceDay';
import { buildError, buildMenu } from '../build';
import {
  FORT_GUNS,
  FORT_STRENGTH,
  HEAVY_FORT_GUNS,
  HEAVY_FORT_STRENGTH,
  YARD_BUILDS,
  UPKEEP_PER_DAY,
  FACILITY_LABEL,
  BUILDING_ORDER,
  CRAFT_GRADES,
  FACILITY_CRAFT,
  isWall,
  wallGuns,
  wallStrength,
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

    // Per berth, it is more than twice the harbor.
    expect(HEAVY_FORT_GUNS).toBeGreaterThan(FORT_GUNS * 2);
    expect(HEAVY_FORT_STRENGTH).toBeGreaterThan(FORT_STRENGTH * 2);

    // Per gold and per day of upkeep, it is the worse buy — which is what
    // stops it being simply the better building.
    expect(HEAVY_FORT_GUNS / heavy.costGold).toBeLessThan(FORT_GUNS / light.costGold);
    expect(HEAVY_FORT_GUNS / UPKEEP_PER_DAY.heavy_fort).toBeLessThan(
      FORT_GUNS / UPKEEP_PER_DAY.fort,
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
    for (const type of ['mine', 'refinery', 'shipyard', 'construction_yard'] as FacilityType[]) {
      expect(isWall(type), type).toBe(false);
    }
    expect(wallGuns('fort')).toBe(FORT_GUNS);
    expect(wallGuns('heavy_fort')).toBe(HEAVY_FORT_GUNS);
    expect(wallStrength('fort')).toBe(FORT_STRENGTH);
    expect(wallStrength('heavy_fort')).toBe(HEAVY_FORT_STRENGTH);
  });

  it('fires its own weight of guns, and less of them as it is worked over', () => {
    const state = world();
    state.fleets.length = 0;
    const port = bare(state);
    wall(port, 'heavy_fort');
    expect(fortGuns(port)).toBe(HEAVY_FORT_GUNS);

    // Half beaten down is half the guns — the same rule the Fortress uses,
    // measured against its own stone rather than a Fortress's.
    port.facilities.at(-1)!.damage = HEAVY_FORT_STRENGTH / 2;
    expect(fortGuns(port)).toBeCloseTo(HEAVY_FORT_GUNS / 2);
    expect(wallCondition(port)).toBeCloseTo(0.5);
  });

  it('weighs the walls by stone rather than by count', () => {
    const state = world();
    const port = bare(state);
    // One of each, the Heavy untouched and the Fortress rubble-but-standing.
    wall(port, 'heavy_fort');
    wall(port, 'fort', FORT_STRENGTH - 1);
    // By count that would read as half. By stone it is nearly all of it, which
    // is the truth: the Heavy Fortress is most of this island's defence.
    const whole = HEAVY_FORT_STRENGTH + FORT_STRENGTH;
    expect(wallCondition(port)).toBeCloseTo((HEAVY_FORT_STRENGTH + 1) / whole);
    expect(wallCondition(port)).toBeGreaterThan(0.7);
  });

  it('takes a longer siege than a Fortress and shoots harder while it lasts', () => {
    const state = world();
    state.fleets.length = 0;
    const port = bare(state);
    wall(port, 'heavy_fort');
    expect(fortGuns(port)).toBe(HEAVY_FORT_GUNS);

    // A squadron that would be a nuisance to a Fortress is in real trouble
    // here — once it opens fire. Since 18 September the battery answers a
    // bombardment and nothing else, so the order is what puts it in range.
    const raider = addShip(state, port, 'alliance', 'reef');
    raider.bombarding = true;
    const before = raider.ships[0].damage;
    advanceSieges(state, createRng(3));
    expect(raider.ships.length === 0 || raider.ships[0].damage > before).toBe(true);
  });

  it('patches at the same share of itself a night, so more stone a night', () => {
    const state = world();
    state.fleets.length = 0;
    const port = bare(state);
    const heavy = wall(port, 'heavy_fort', HEAVY_FORT_STRENGTH / 2);
    const light = wall(port, 'fort', FORT_STRENGTH / 2);
    const heavyId = heavy.id;
    const lightId = light.id;
    const hurtBefore = { heavy: heavy.damage!, light: light.damage! };

    const next = advanceDay(state);
    const after = next.systems.find((s) => s.id === port.id)!;
    const h = after.facilities.find((f) => f.id === heavyId)!;
    const l = after.facilities.find((f) => f.id === lightId)!;
    const mendedHeavy = hurtBefore.heavy - (h.damage ?? 0);
    const mendedLight = hurtBefore.light - (l.damage ?? 0);
    expect(mendedHeavy).toBeGreaterThan(0);
    expect(mendedHeavy).toBeGreaterThan(mendedLight);
    // The same *share*, which is what keeps a siege the same shape at both tiers.
    expect(mendedHeavy / HEAVY_FORT_STRENGTH).toBeCloseTo(mendedLight / FORT_STRENGTH);
  });

  it('is a thing a yard can be told to build, on any ground', () => {
    const state = world();
    const port = state.systems.find(
      (s) =>
        s.control === 'empire' &&
        s.facilities.some((f) => f.type === 'construction_yard' && f.owner === 'empire'),
    )!;
    port.slots = port.facilities.length + (port.deposits?.length ?? 0) + 2;
    state.factions.empire.gold = 5000;
    // Behind the research errand since 17 September: one grade of shipwright
    // craft, which is a fortnight or two of somebody's time in your own yards.
    state.factions.empire.craft = CRAFT_GRADES[0];
    const yard = port.facilities.find(
      (f) => f.type === 'construction_yard' && f.owner === 'empire' && !f.building,
    )!;
    expect(buildMenu(yard, 3)).toContain('heavy_fort');
    // A wall needs no forest and no vein under it, unlike the earners.
    expect(buildError(state, yard.id, 'heavy_fort')).toBeNull();
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
        s.facilities.some((f) => f.type === 'construction_yard' && f.owner === 'empire'),
    )!;
    port.slots = port.facilities.length + (port.deposits?.length ?? 0) + 2;
    state.factions.empire.gold = 5000;
    state.factions.empire.craft = 0;
    const yard = port.facilities.find(
      (f) => f.type === 'construction_yard' && f.owner === 'empire' && !f.building,
    )!;
    expect(buildMenu(yard, 0)).not.toContain('heavy_fort');
    // And it says so in a way the player can act on, rather than refusing.
    expect(buildError(state, yard.id, 'heavy_fort')).toMatch(/shipwright craft/);
    // The plain Fortress is untouched: a wall you can always throw up.
    expect(buildMenu(yard, 0)).toContain('fort');
    expect(FACILITY_CRAFT.fort ?? 0).toBe(0);

    // One grade, and it is on the menu.
    state.factions.empire.craft = CRAFT_GRADES[0];
    expect(buildError(state, yard.id, 'heavy_fort')).toBeNull();
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

  it('stops a landing the same way, and is rubble when it is beaten', () => {
    const state = world();
    const port = bare(state);
    const heavy = wall(port, 'heavy_fort');
    expect(fortsOf(port)).toHaveLength(1);
    // One stone short of gone is still a wall, and a landing is still barred.
    heavy.damage = HEAVY_FORT_STRENGTH - 1;
    expect(fortsOf(port)).toHaveLength(1);
    heavy.damage = HEAVY_FORT_STRENGTH;
    expect(fortsOf(port)).toHaveLength(0);
    expect(fortGuns(port)).toBe(0);
  });
});
