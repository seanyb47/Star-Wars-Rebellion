import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import {
  ASSESSMENT_CUTS,
  BASE_HIT_CHANCE,
  EXCHANGE_STOP_SHARE,
  GUNS,
  GUN_KINDS,
  HIT_CEILING,
  HIT_FLOOR,
  assess,
  assignTargets,
  combatExchange,
  commission,
  effectiveArmor,
  enemyWillFlee,
  expectedDamage,
  fightingStrength,
  fireCannon,
  hitChance,
  internalRound,
  rawVolley,
  resolveFlee,
  survivors,
  totalHull,
  type CombatShip,
  type CombatStats,
} from '../navycombat';
import { ROSTER } from '../shipdefs';

/**
 * The locked Combat Rules, tested against the sheet's own arithmetic.
 *
 * The strongest check available is that the sheet does not only state the
 * rules, it also publishes a **Combat Derived Stats** table: every hull's hit
 * chances and average volleys, worked out by Sean. So the accuracy tests below
 * are not my reading of the matrices — they are his numbers, and if my reading
 * were wrong they would not agree.
 */

let seq = 0;
function ship(over: Partial<CombatStats> & { hull: number }): CombatShip {
  seq += 1;
  return commission(`s${seq}`, {
    size: 'Medium',
    speed: 'Normal',
    guns: { longGuns: 0, heavyGuns: 0, lightGuns: 0 },
    armor: 0,
    combatantType: 'Warship',
    ...over,
  });
}

const guns = (long: number, heavy: number, light: number) => ({
  longGuns: long,
  heavyGuns: heavy,
  lightGuns: light,
});

const hulk = (hull: number) => ship({ hull, guns: guns(0, 0, 0), combatantType: 'Noncombat' });

describe('the cannon model', () => {
  it('has no ship-level Firepower anywhere in it', () => {
    // The sentence the whole model hangs on: *"There is no ship-level
    // Firepower stat. Every individual cannon makes its own attack using the
    // rules for its gun type."* This is the test that the blocking item is
    // dissolved rather than quietly reintroduced by an adapter.
    const stats = ship({ hull: 100 }).stats;
    expect('firepower' in stats).toBe(false);
    expect(Object.keys(stats).sort()).toEqual(
      ['armor', 'combatantType', 'guns', 'hull', 'size', 'speed'].sort(),
    );
  });

  it('gives each gun kind its own dice, penetration and accuracy', () => {
    expect(GUNS.Light).toEqual({ dice: 2, penetration: 0, accuracy: 10 });
    expect(GUNS.Heavy).toEqual({ dice: 4, penetration: 0.5, accuracy: 0 });
    expect(GUNS.Long).toEqual({ dice: 2, penetration: 0.5, accuracy: 0 });
  });

  it('fires once per cannon, so ten guns are ten attacks', () => {
    const rng = createRng(7);
    const shooter = ship({ hull: 100, guns: guns(0, 0, 10) });
    const target = ship({ hull: 100000 });
    const assignments = assignTargets([shooter], [target], ['Light'], rng);
    expect(assignments).toHaveLength(10);
  });
});

describe('armor, which is back', () => {
  it('is a flat subtraction after penetration', () => {
    // The sheet's own worked example: *"Armor 25 stops a 25-damage Light hit.
    // A 26-damage Light hit deals 1. A 26-damage Heavy hit faces 13 effective
    // armor and deals 13."*
    const target = ship({ hull: 500, armor: 25 }).stats;
    expect(effectiveArmor('Light', target)).toBe(25);
    expect(effectiveArmor('Heavy', target)).toBe(13); // ceil(25 × 0.5)
    expect(effectiveArmor('Long', target)).toBe(13);
  });

  it('rounds effective armor up before subtracting', () => {
    const odd = ship({ hull: 100, armor: 29 }).stats;
    expect(effectiveArmor('Heavy', odd)).toBe(15); // ceil(14.5), not 14
  });

  it('lets a Light Gun do nothing at all to enough armor', () => {
    // 2d20 maxes at 40; against Armor 30 that is 10 through at best, and
    // against the theoretical 40 it is nothing. Expected damage is what the
    // targeting algorithm reads, and it has to be able to reach zero.
    const majestic = ship({ hull: 1600, armor: 30 }).stats;
    expect(expectedDamage('Light', majestic)).toBeGreaterThan(0);
    expect(expectedDamage('Light', ship({ hull: 10, armor: 40 }).stats)).toBe(0);
    // And the same armor is half as much trouble for a penetrating gun.
    expect(expectedDamage('Heavy', majestic)).toBeGreaterThan(expectedDamage('Light', majestic));
  });

  it('never drives damage below zero', () => {
    const rng = createRng(3);
    const wall = ship({ hull: 100, armor: 30 }).stats;
    for (let i = 0; i < 400; i++) {
      const damage = fireCannon('Light', wall, rng);
      if (damage !== undefined) expect(damage).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('accuracy, against the target', () => {
  it('reads the size and speed of whoever is being shot at', () => {
    const small = ship({ hull: 90, size: 'Small', speed: 'Very Fast' }).stats;
    const huge = ship({ hull: 1600, size: 'Gigantic', speed: 'Slow' }).stats;
    expect(hitChance('Heavy', small)).toBeLessThan(hitChance('Heavy', huge));
  });

  it('matches the sheet Combat Derived Stats table, hull by hull', () => {
    // Sean's own published figures. Every one of these is 75 + the gun's base
    // + its size column + its speed column, clamped — and if my reading of
    // either matrix were wrong, one of these would miss.
    const expected: Record<string, [number, number, number]> = {
      // id: [Light, Long, Heavy] hit chance against that hull
      'CWN-WAY-S01': [85, 70, 60], // Medium, Normal
      'CWN-INT-S02': [65, 40, 10], // Small, Very Fast — Heavy floors out
      'CWN-MOR-S03': [90, 80, 85], // Large, Slow
      'CWN-SOV-S04': [90, 90, 95], // Gigantic, Slow — Heavy clamps at 95
      'CWN-VAN-R1-01': [85, 75, 75], // Large, Normal
      'CWN-RES-R2-01': [75, 55, 40], // Medium, Fast
      'CWN-INT-R5-02': [65, 40, 10], // Small, Very Fast
      'CWN-SOV-R7-02': [85, 85, 90], // Gigantic, Normal
      'CWN-MAJ-R8-01': [90, 90, 95], // Gigantic, Slow
      'CFS-SWI-S01': [65, 40, 10], // Small, Very Fast
      'CFS-CHI-S03': [90, 75, 70], // Medium, Slow
      'CFS-MAR-R1-01': [75, 50, 25], // Small, Fast
      'CFS-CUT-R2-01': [85, 65, 45], // Small, Normal
      'CFS-BLA-R6-01': [75, 55, 40], // Medium, Fast
      'CFS-URG-R7-01': [90, 90, 95], // Gigantic, Slow
      'CFS-COR-R8-01': [85, 85, 90], // Gigantic, Normal
    };
    for (const [id, [light, long, heavy]] of Object.entries(expected)) {
      const def = ROSTER.byId.get(id)!;
      expect([id, hitChance('Light', def)]).toEqual([id, light]);
      expect([id, hitChance('Long', def)]).toEqual([id, long]);
      expect([id, hitChance('Heavy', def)]).toEqual([id, heavy]);
    }
  });

  it('clamps between ten and ninety-five', () => {
    const worst = ship({ hull: 1, size: 'Small', speed: 'Very Fast' }).stats;
    const best = ship({ hull: 1, size: 'Gigantic', speed: 'Slow' }).stats;
    expect(hitChance('Heavy', worst)).toBe(HIT_FLOOR); // 75 − 30 − 35 = 10
    expect(hitChance('Heavy', best)).toBe(HIT_CEILING); // 75 + 15 + 10 = 100 → 95
    expect(BASE_HIT_CHANCE).toBe(75);
  });

  it('matches the sheet average raw volleys', () => {
    // Also his: 2d20 averages 21 a cannon and 4d20 averages 42.
    const expected: Record<string, number> = {
      'CWN-WAY-S01': 42,
      'CWN-MOR-S03': 462,
      'CWN-MAJ-R8-01': 1092,
      'CWN-JUS-R6-01': 672,
      'CWN-SOV-R7-02': 777,
      'CFS-URG-R7-01': 693,
      'CFS-COR-R8-01': 672,
      'CFS-SWI-S01': 0,
    };
    for (const [id, volley] of Object.entries(expected)) {
      expect([id, rawVolley(commission(id, ROSTER.byId.get(id)!))]).toEqual([id, volley]);
    }
  });
});

describe('the phase order, which is what First Strike now means', () => {
  it('sinks with Long Guns before the sunk ship can fire Light or Heavy', () => {
    const rng = createRng(11);
    // A long-gun battery against a paper hull that carries a big main battery.
    const sniper = ship({ hull: 900, armor: 20, guns: guns(20, 0, 0), size: 'Large' });
    const fragile = ship({ hull: 10, guns: guns(0, 12, 0), size: 'Gigantic', speed: 'Slow' });
    const report = internalRound([sniper], [fragile], rng);
    expect(report.a.sank).toEqual([fragile.id]);
    // She died in Phase 1, so she never got a main-battery shot away.
    expect(report.b.main.shots).toBe(0);
  });

  it('still lets a ship sunk in Phase 2 fire in Phase 2', () => {
    const rng = createRng(5);
    const a = ship({ hull: 10, guns: guns(0, 0, 8), size: 'Gigantic', speed: 'Slow' });
    const b = ship({ hull: 10, guns: guns(0, 0, 8), size: 'Gigantic', speed: 'Slow' });
    const report = internalRound([a], [b], rng);
    // Simultaneous: both fired their main batteries, whatever happened after.
    expect(report.a.main.shots).toBe(8);
    expect(report.b.main.shots).toBe(8);
  });

  it('is the same round twice for the same seed', () => {
    const run = () => {
      const a = [ship({ hull: 400, armor: 10, guns: guns(2, 3, 4), size: 'Large' })];
      const b = [ship({ hull: 400, armor: 10, guns: guns(2, 3, 4), size: 'Large' })];
      internalRound(a, b, createRng(99));
      return [totalHull(a), totalHull(b)];
    };
    expect(run()).toEqual(run());
  });
});

describe('the Combat Exchange', () => {
  it('runs internal rounds until a side has given up thirty per cent', () => {
    expect(EXCHANGE_STOP_SHARE).toBe(0.3);
    const rng = createRng(21);
    // Two armored fleets that chip slowly, so the Exchange must run several
    // rounds before either has lost 30% — which is the point of a
    // proportional stop rather than a fixed round count.
    const a = [ship({ hull: 1600, armor: 25, guns: guns(0, 4, 0), size: 'Gigantic', speed: 'Slow' })];
    const b = [ship({ hull: 1600, armor: 25, guns: guns(0, 4, 0), size: 'Gigantic', speed: 'Slow' })];
    const report = combatExchange(a, b, rng);
    expect(report.rounds).toBeGreaterThan(1);
    const lost = Math.max(report.snapshot.a - report.remaining.a, report.snapshot.b - report.remaining.b);
    expect(lost).toBeGreaterThanOrEqual(report.snapshot.a * EXCHANGE_STOP_SHARE);
    expect(report.outcome).toBe('both-stand');
  });

  it('stops the moment a fleet is gone, however little that cost', () => {
    const rng = createRng(4);
    const a = [ship({ hull: 900, guns: guns(0, 12, 0), size: 'Large' })];
    const b = [ship({ hull: 6, size: 'Gigantic', speed: 'Slow', guns: guns(0, 0, 1) })];
    const report = combatExchange(a, b, rng);
    expect(report.rounds).toBe(1);
    expect(report.outcome).toBe('b-destroyed');
  });

  it('records mutual destruction as its own result', () => {
    const rng = createRng(8);
    const a = [ship({ hull: 4, guns: guns(0, 0, 6), size: 'Gigantic', speed: 'Slow' })];
    const b = [ship({ hull: 4, guns: guns(0, 0, 6), size: 'Gigantic', speed: 'Slow' })];
    const report = combatExchange(a, b, rng);
    expect(report.outcome).toBe('mutual-destruction');
    expect(survivors(a)).toHaveLength(0);
    expect(survivors(b)).toHaveLength(0);
  });

  it('does not spin for ever when neither side can hurt the other', () => {
    const rng = createRng(2);
    // Light Guns against armor they cannot touch, both ways.
    const a = [ship({ hull: 500, armor: 40, guns: guns(0, 0, 4) })];
    const b = [ship({ hull: 500, armor: 40, guns: guns(0, 0, 4) })];
    const report = combatExchange(a, b, rng);
    expect(report.rounds).toBe(1);
    expect(report.outcome).toBe('both-stand');
  });

  it('carries damage out of the Exchange, and no repair happens inside it', () => {
    const rng = createRng(13);
    const a = [ship({ hull: 800, armor: 5, guns: guns(0, 6, 0), size: 'Large' })];
    const b = [ship({ hull: 800, armor: 5, guns: guns(0, 6, 0), size: 'Large' })];
    combatExchange(a, b, rng);
    const after = totalHull(b);
    expect(after).toBeLessThan(800);
    combatExchange(a, b, rng);
    expect(totalHull(b)).toBeLessThan(after);
  });
});

describe('the optimal targeting algorithm', () => {
  it('prefers the target that removes the most threat per shot', () => {
    const rng = createRng(6);
    const shooter = ship({ hull: 500, guns: guns(0, 0, 12), size: 'Large' });
    // Same hull, wildly different threat. The dangerous one should draw fire.
    const dangerous = ship({ hull: 200, guns: guns(0, 0, 12), size: 'Large', speed: 'Slow' });
    const harmless = ship({ hull: 200, guns: guns(0, 0, 1), size: 'Large', speed: 'Slow' });
    const at = assignTargets([shooter], [dangerous, harmless], ['Light'], rng);
    const atDangerous = at.filter((x) => x.target.id === dangerous.id).length;
    expect(atDangerous).toBeGreaterThan(at.length / 2);
  });

  it('spreads fire rather than piling into an expected kill', () => {
    const rng = createRng(12);
    // Twenty Light Guns against two identical paper hulls: once the first is
    // expected dead the rest must go to the second.
    const shooter = ship({ hull: 500, guns: guns(0, 0, 20), size: 'Large' });
    const one = ship({ hull: 40, guns: guns(0, 0, 2), size: 'Large', speed: 'Slow' });
    const two = ship({ hull: 40, guns: guns(0, 0, 2), size: 'Large', speed: 'Slow' });
    const at = assignTargets([shooter], [one, two], ['Light'], rng);
    const onOne = at.filter((x) => x.target.id === one.id).length;
    expect(onOne).toBeGreaterThan(0);
    expect(onOne).toBeLessThan(at.length);
  });

  it('will not waste shots on armor it cannot penetrate while anything else floats', () => {
    const rng = createRng(9);
    const shooter = ship({ hull: 300, guns: guns(0, 0, 10), size: 'Large' });
    const impervious = ship({ hull: 900, armor: 40, guns: guns(0, 0, 9), size: 'Large', speed: 'Slow' });
    const soft = ship({ hull: 300, armor: 0, guns: guns(0, 0, 1), size: 'Large', speed: 'Slow' });
    const at = assignTargets([shooter], [impervious, soft], ['Light'], rng);
    expect(at.every((x) => x.target.id === soft.id)).toBe(true);
  });

  it('leaves an unarmed hull alone until nothing armed is left', () => {
    const rng = createRng(15);
    const shooter = ship({ hull: 300, guns: guns(0, 0, 6), size: 'Large' });
    const armed = ship({ hull: 300, guns: guns(0, 0, 3), size: 'Large', speed: 'Slow' });
    const transport = hulk(300);
    const at = assignTargets([shooter], [armed, transport], ['Light'], rng);
    expect(at.every((x) => x.target.id === armed.id)).toBe(true);
    // And once the escort is gone the transport is the only thing left.
    armed.hullRemaining = 0;
    const after = assignTargets([shooter], [armed, transport], ['Light'], rng);
    expect(after.every((x) => x.target.id === transport.id)).toBe(true);
  });

  it('never points a gun at a wreck', () => {
    const rng = createRng(17);
    const shooter = ship({ hull: 300, guns: guns(0, 0, 4), size: 'Large' });
    const sunk = ship({ hull: 300, guns: guns(0, 0, 9), size: 'Large' });
    sunk.hullRemaining = 0;
    const alive = ship({ hull: 300, guns: guns(0, 0, 1), size: 'Large' });
    const at = assignTargets([shooter], [sunk, alive], ['Light'], rng);
    expect(at.every((x) => x.target.id === alive.id)).toBe(true);
  });
});

describe('breaking off', () => {
  it('always succeeds, and never forces another round', () => {
    const rng = createRng(19);
    const fleeing = [ship({ hull: 150, size: 'Small', speed: 'Very Fast', guns: guns(0, 0, 4) })];
    const pursuers = [ship({ hull: 1600, guns: guns(10, 16, 10), size: 'Gigantic' })];
    const report = resolveFlee(fleeing, pursuers, rng);
    expect(report.lost.length + report.escaped.length).toBe(1);
    // Only Long Guns fired: ten of them, and not the sixteen Heavy or ten Light.
    expect(report.volley.shots).toBe(10);
  });

  it('takes nothing at all from a pursuer with no Long Guns', () => {
    const rng = createRng(23);
    const fleeing = [ship({ hull: 100, guns: guns(0, 0, 1) })];
    const pursuers = [ship({ hull: 500, guns: guns(0, 12, 12), size: 'Large' })];
    const report = resolveFlee(fleeing, pursuers, rng);
    expect(report.volley.shots).toBe(0);
    expect(report.volley.damage).toBe(0);
    expect(report.escaped).toHaveLength(1);
  });

  it('is harder on a slow giant than on a fast sloop', () => {
    const rng = createRng(31);
    let hitSlow = 0;
    let hitFast = 0;
    for (let i = 0; i < 300; i++) {
      const slow = [ship({ hull: 100000, size: 'Gigantic', speed: 'Slow', guns: guns(0, 0, 1) })];
      const fast = [ship({ hull: 100000, size: 'Small', speed: 'Very Fast', guns: guns(0, 0, 1) })];
      const chaser = () => [ship({ hull: 500, guns: guns(4, 0, 0), size: 'Large' })];
      hitSlow += resolveFlee(slow, chaser(), rng).volley.hits;
      hitFast += resolveFlee(fast, chaser(), rng).volley.hits;
    }
    // 90% against the giant, 40% against the sloop.
    expect(hitSlow).toBeGreaterThan(hitFast * 1.8);
  });
});

describe('fleet strength and the assessment', () => {
  it('adds up surviving volley against surviving hull', () => {
    const fleet = [ship({ hull: 400, guns: guns(0, 0, 2) }), ship({ hull: 400, guns: guns(0, 0, 2) })];
    const both = fightingStrength(fleet);
    fleet[1].hullRemaining = 0;
    expect(fightingStrength(fleet)).toBeCloseTo(both / 2);
  });

  it('runs the five bands from a walkover to a rout', () => {
    const big = () => [ship({ hull: 1000, guns: guns(0, 0, 10) })];
    const small = () => [ship({ hull: 100, guns: guns(0, 0, 1) })];
    expect(assess(big(), small())).toBe('OVERWHELMINGLY FAVORABLE');
    expect(assess(small(), big())).toBe('DESPERATE');
    const even = () => [ship({ hull: 500, guns: guns(0, 0, 5) })];
    expect(assess(even(), even())).toBe('EVEN');
    expect(ASSESSMENT_CUTS.overwhelming).toBeGreaterThan(ASSESSMENT_CUTS.favorable);
    expect(ASSESSMENT_CUTS.unfavorable).toBeLessThan(ASSESSMENT_CUTS.even);
  });

  it('makes the enemy break off only when the position is desperate', () => {
    const big = [ship({ hull: 1000, guns: guns(0, 0, 10) })];
    const small = [ship({ hull: 100, guns: guns(0, 0, 1) })];
    expect(enemyWillFlee(small, big)).toBe(true);
    expect(enemyWillFlee(big, small)).toBe(false);
  });
});

describe('what the locked rules do not contain', () => {
  const source = GUN_KINDS.join(' ');

  it('has exactly three gun kinds and no fourth number', () => {
    expect(source).toBe('Long Heavy Light');
  });

  it('has no boarding, no morale and no retreat roll', () => {
    // §17 of the superseded document listed these among the mechanics not to
    // add, and the locked rules do not add them back. Proven where it shows:
    // a hull with no Long Guns cannot stop anybody leaving, however large she
    // is and however small they are, because there is no roll to escape.
    const rng = createRng(1);
    const fleeing = [ship({ hull: 100, size: 'Gigantic', speed: 'Slow' })];
    const goliath = [ship({ hull: 5000, armor: 30, guns: guns(0, 40, 40), size: 'Gigantic' })];
    const report = resolveFlee(fleeing, goliath, rng);
    expect(report.volley.shots).toBe(0);
    expect(report.escaped).toHaveLength(1);
    expect(report.lost).toHaveLength(0);
  });

  it('has no size-class damage triangle — size changes accuracy only', () => {
    // A Heavy Gun against a Small hull is not doing reduced damage; it is
    // missing. The dice are the same dice whatever it is shooting at.
    const small = ship({ hull: 500, size: 'Small', speed: 'Slow', armor: 0 }).stats;
    const huge = ship({ hull: 500, size: 'Gigantic', speed: 'Slow', armor: 0 }).stats;
    expect(expectedDamage('Heavy', small)).toBe(expectedDamage('Heavy', huge));
    expect(hitChance('Heavy', small)).not.toBe(hitChance('Heavy', huge));
  });
});

describe('the roster feeds the engine with no conversion', () => {
  it('takes a ShipDefinition straight, because it satisfies CombatStats', () => {
    const majestic = ROSTER.byId.get('CWN-MAJ-R8-01')!;
    const ship = commission('maj-1', majestic);
    expect(ship.hullRemaining).toBe(1600);
    expect(rawVolley(ship)).toBe(1092);
    expect(hitChance('Heavy', majestic)).toBe(95);
  });

  it('fights a real matchup from the roster end to end', () => {
    const rng = createRng(2026);
    const crown = [commission('maj', ROSTER.byId.get('CWN-MAJ-R8-01')!)];
    const confed = [
      commission('urw', ROSTER.byId.get('CFS-URG-R7-01')!),
      commission('cor', ROSTER.byId.get('CFS-COR-R8-01')!),
    ];
    let exchanges = 0;
    while (survivors(crown).length > 0 && survivors(confed).length > 0 && exchanges < 50) {
      combatExchange(crown, confed, rng);
      exchanges += 1;
    }
    expect(exchanges).toBeLessThan(50);
    // Sean's endgame rule: one of either Confederate capital loses to a
    // Majestic, but a pair beats her. The pair is what is fielded here.
    expect(survivors(confed).length).toBeGreaterThan(0);
    expect(survivors(crown)).toHaveLength(0);
  });
});
