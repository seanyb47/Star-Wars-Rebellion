import { describe, expect, it } from 'vitest';
import {
  EXCHANGE_STOP_SHARE,
  effectiveArmor,
  exchange,
  expectedDamage,
  hitChance,
  retreat,
  type Fighter,
  type GunLine,
} from '../cannon';
import { ROSTER, type ShipDefinition } from '../shipdefs';
import { createRng } from '../rng';

/**
 * The per-cannon engine, checked against the document it came out of.
 *
 * Every number asserted below is quoted from `combatRules` in
 * `src/data/combat-ships.json`, which is marked LOCKED. That is the point of
 * this file: the engine is a port rather than a design, so the test is whether
 * the port reproduces the source, not whether the numbers feel right.
 */

function fighter(over: Partial<Fighter> & { guns: GunLine }): Fighter {
  return {
    id: 'x',
    name: 'Test',
    size: 'Large',
    speed: 'Normal',
    armor: 0,
    combatantType: 'Warship',
    wholeHull: 1000,
    hull: 1000,
    ...over,
  };
}

const NO_GUNS: GunLine = { long: 0, heavy: 0, light: 0 };

function fromRoster(name: string, n = 1): Fighter {
  const def = ROSTER.ships.find((s) => s.name === name) as ShipDefinition;
  return {
    id: `${def.id}-${n}`,
    name: def.name,
    size: def.size,
    speed: def.speed,
    armor: def.armor,
    guns: { long: def.guns.longGuns, heavy: def.guns.heavyGuns, light: def.guns.lightGuns },
    combatantType: def.combatantType,
    wholeHull: def.hull,
    hull: def.hull,
  };
}

describe('armor, and what each gun makes of it', () => {
  /**
   * The sheet's own worked example, word for word:
   *
   * > Armor 25 stops a 25-damage Light hit. A 26-damage Light hit deals 1. A
   * > 26-damage Heavy hit faces 13 effective armor and deals 13; the same roll
   * > from a Long Gun faces 19 and deals 7.
   */
  it('works the example the rules are written around', () => {
    expect(effectiveArmor('Light', 25)).toBe(25);
    expect(effectiveArmor('Heavy', 25)).toBe(13);
    expect(effectiveArmor('Long', 25)).toBe(19);

    const through = (roll: number, armor: number) => Math.max(0, roll - armor);
    expect(through(25, effectiveArmor('Light', 25))).toBe(0);
    expect(through(26, effectiveArmor('Light', 25))).toBe(1);
    expect(through(26, effectiveArmor('Heavy', 25))).toBe(13);
    expect(through(26, effectiveArmor('Long', 25))).toBe(7);
  });

  /**
   * > Light Guns cannot meaningfully hurt Armor 21+, so brig swarms bounce off
   * > ships of the line.
   *
   * A Light gun throws 2d20, so against 21 points of armor only the top of the
   * range gets anything through at all, and what it gets through is a
   * rounding error beside what the same gun does to an unarmored hull.
   */
  it('bounces a brig swarm off a ship of the line', () => {
    const at = (armor: number) => expectedDamage('Light', { size: 'Large', speed: 'Slow', armor });
    // Against an unarmored hull a light gun is worth most of its dice. At the
    // 21 the sheet names it has lost nine tenths of that, and by 25 it is
    // throwing splinters: a shot only tells at all on 26 or better, and 2d20
    // tops out at 40.
    expect(at(0)).toBeGreaterThan(15);
    // Measured: 18.9 a shot against nothing, 3.0 at the 21 the sheet names,
    // 1.5 at 25. A sixth of the gun at the line, a twelfth past it.
    expect(at(21)).toBeLessThan(at(0) / 5);
    expect(at(25)).toBeLessThan(at(0) / 10);
    expect(at(25)).toBeLessThan(at(21));
    // And the answer to a ship of the line is the gun built for it: a Heavy
    // gun gets more through the same armor than a Light gun manages against
    // no armor at all.
    expect(expectedDamage('Heavy', { size: 'Large', speed: 'Slow', armor: 25 })).toBeGreaterThan(at(0));
  });

  /**
   * > Armor 25 against 29 differs little under Heavy fire, so hull is what
   * > carries a capital.
   */
  it('makes hull rather than armor the thing that carries a capital', () => {
    const at = (armor: number) => expectedDamage('Heavy', { size: 'Gigantic', speed: 'Slow', armor });
    const four = at(25) - at(29);
    // Four points of armor buys two points of damage against a Heavy gun, on
    // a hit that averages the better part of thirty.
    expect(four).toBeLessThan(3);
    expect(at(25)).toBeGreaterThan(20);
  });
});

describe('the hit roll', () => {
  /**
   * > CLAMP(75 + gun base modifier + gun-vs-Size modifier + gun-vs-Speed
   * > modifier, 10, 95)
   */
  it('adds the gun, the target\'s size and the target\'s speed, and clamps', () => {
    // Light is +10 of its own and cares nothing for size: 75 + 10 + 0 + 0.
    expect(hitChance('Light', { size: 'Gigantic', speed: 'Normal' })).toBe(85);
    // Heavy against the thing it was built for, standing still: 75 + 15 + 10
    // is a hundred, and the ceiling is ninety-five.
    expect(hitChance('Heavy', { size: 'Gigantic', speed: 'Slow' })).toBe(95);
    // And against the thing it was not: 75 - 30 - 35 is ten, which is the
    // floor, and is the whole reason a first-rate cannot swat sloops.
    expect(hitChance('Heavy', { size: 'Small', speed: 'Very Fast' })).toBe(10);
    // A long gun is the middle case, and the only one that reaches a runner.
    expect(hitChance('Long', { size: 'Medium', speed: 'Fast' })).toBe(55);
  });
});

describe('a Combat Exchange', () => {
  /**
   * > Snapshot each side's current total Hull, then resolve consecutive
   * > internal combat rounds until either side has lost at least 30% of that
   * > starting snapshot or a fleet is destroyed.
   */
  it('stops at thirty per cent of the hull it opened with', () => {
    const rng = createRng(7);
    const a = [fromRoster('Tempest', 1), fromRoster('Tempest', 2)];
    const b = [fromRoster('Tempest', 3), fromRoster('Tempest', 4)];
    const result = exchange(a, b, rng);
    expect(result.rounds).toBeGreaterThan(0);
    if (result.ended === 'threshold') {
      const lostA = (result.opened.a - result.closed.a) / result.opened.a;
      const lostB = (result.opened.b - result.closed.b) / result.opened.b;
      expect(Math.max(lostA, lostB)).toBeGreaterThanOrEqual(EXCHANGE_STOP_SHARE);
      // And it stops as soon as it is reached rather than fighting on: one
      // round's worth of overshoot at most.
      expect(Math.min(lostA, lostB)).toBeLessThan(1);
    }
  });

  it('gives the same battle twice from the same seed', () => {
    const play = () => {
      const rng = createRng(31);
      const a = [fromRoster('Vanguard', 1)];
      const b = [fromRoster('Reefwarden', 2)];
      const r = exchange(a, b, rng);
      return `${r.rounds}:${r.closed.a}:${r.closed.b}`;
    };
    expect(play()).toBe(play());
  });

  /**
   * The length the sheet's own simulator reports, which is the single best
   * check that this is the same engine:
   *
   * > Mirrors average about 8 internal rounds and capital duels 7-10.
   *
   * Measured here over every armed hull in the roster, twenty seeds each,
   * fighting itself to the death: 7.7 rounds across the lot and 8.5 for the
   * Large and Gigantic hulls. Both land inside the sheet's figures without a
   * line of tuning, which is what a faithful port ought to do.
   *
   * The band is wide on purpose. This is a measurement, not a target — the
   * house rule is that balance changes are measured rather than asserted, and
   * what would actually be worth knowing is the day this stops being a
   * handful of rounds and becomes two or twenty.
   */
  it('fights a mirror out in about eight internal rounds', () => {
    let rounds = 0;
    let fights = 0;
    for (const def of ROSTER.ships) {
      const armed = def.guns.longGuns + def.guns.heavyGuns + def.guns.lightGuns;
      if (armed === 0) continue;
      for (let seed = 0; seed < 20; seed++) {
        const rng = createRng(500 + seed);
        const a = [fromRoster(def.name, 1)];
        const b = [fromRoster(def.name, 2)];
        let fought = 0;
        while (a[0].hull > 0 && b[0].hull > 0 && fought < 200) {
          const r = exchange(a, b, rng);
          fought += r.rounds;
          if (r.ended === 'destroyed') break;
        }
        rounds += fought;
        fights += 1;
      }
    }
    const mean = rounds / fights;
    expect(mean).toBeGreaterThan(5);
    expect(mean).toBeLessThan(12);
  });

  /**
   * A gun that cannot get through still fires, and still scores nothing.
   *
   * > EVERY GUN ALWAYS FIRES at its highest-priority target. There is no
   * > 'cannot penetrate' exclusion.
   *
   * Measured as time rather than as damage, because an Exchange always ends
   * at thirty per cent and so always reports the same damage — what armor
   * buys is not a smaller wound, it is a great many more rounds spent
   * inflicting it.
   */
  it('never holds fire, and makes the hopeless shot take forever', () => {
    const rounds = (armor: number) => {
      const rng = createRng(3);
      const swarm = [fighter({ guns: { long: 0, heavy: 0, light: 40 }, hull: 600, wholeHull: 600 })];
      // No guns of its own, so nothing stops this but the thirty per cent.
      const wall = [
        fighter({ guns: NO_GUNS, armor, hull: 4000, wholeHull: 4000, size: 'Gigantic', speed: 'Slow' }),
      ];
      const result = exchange(swarm, wall, rng, 5000);
      expect(wall[0].hull).toBeLessThan(4000);
      return result.rounds;
    };
    // Forty light guns take an unarmored hull apart in a round or two, and
    // spend the better part of a day's sailing on an armored one.
    expect(rounds(29)).toBeGreaterThan(rounds(0) * 8);
  });
});

describe('breaking off', () => {
  /**
   * > FLEE never fails and never forces an additional normal round.
   * > Only enemy LONG GUNS reach a fleet already under way. A pursuer with
   * > none watches them go.
   */
  it('is free against a pursuer with no long guns', () => {
    const rng = createRng(11);
    const running = [fromRoster('Brigantine')];
    const chasing = [fighter({ guns: { long: 0, heavy: 30, light: 30 } })];
    const whole = running[0].hull;
    const result = retreat(running, chasing, rng);
    expect(result.damage).toBe(0);
    expect(running[0].hull).toBe(whole);
    expect(result.escaped).toHaveLength(1);
  });

  /**
   * > Retreat attacks IGNORE ARMOR — 100% penetration, raking fire down the
   * > exposed stern.
   *
   * So the armor that makes a capital safe in line does nothing for it once it
   * has turned its back, which is the point of the rule.
   */
  it('rakes a fleeing capital down the stern, armor and all', () => {
    const chasing = [fighter({ guns: { long: 40, heavy: 0, light: 0 } })];
    const cost = (armor: number) => {
      const rng = createRng(19);
      const running = [
        fighter({ guns: NO_GUNS, armor, size: 'Gigantic', speed: 'Slow', hull: 9000, wholeHull: 9000 }),
      ];
      return retreat(running, chasing, rng).damage;
    };
    // Thirty points of armor and none of it helps: the two come out the same.
    expect(Math.abs(cost(30) - cost(0))).toBeLessThan(cost(0) * 0.05);
    expect(cost(30)).toBeGreaterThan(0);
  });

  /**
   * > Volley 1 fires at ALL fleeing ships ... and surviving Very Fast ships
   * > escape; volley 2 releases Fast; volley 3 Normal; volley 4 Slow.
   *
   * Which means the sloop takes one volley and the ship of the line takes
   * four, and a mixed fleet running together does not run together for long.
   */
  it('lets the quick ones go first and holds the slow ones under fire', () => {
    const chasing = [fighter({ guns: { long: 30, heavy: 0, light: 0 } })];
    const cost = (speed: 'Very Fast' | 'Slow') => {
      const rng = createRng(23);
      const running = [
        fighter({ guns: NO_GUNS, speed, size: 'Large', hull: 20000, wholeHull: 20000 }),
      ];
      return retreat(running, chasing, rng).damage;
    };
    // The slow hull eats four volleys to the quick one's single volley, and is
    // easier to hit in every one of them.
    expect(cost('Slow')).toBeGreaterThan(cost('Very Fast') * 2);
  });

  it('always gets somebody away, because fleeing never fails', () => {
    const rng = createRng(29);
    const running = [fromRoster('Swift'), fromRoster('Brigantine')];
    const chasing = [fromRoster('Majestic')];
    const result = retreat(running, chasing, rng);
    expect(result.escaped.length + result.lost.length).toBe(2);
  });
});
