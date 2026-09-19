import { describe, expect, it } from 'vitest';
import { ROSTER } from '../shipdefs';
import {
  HULL_STATUS_THRESHOLDS,
  applyHullDamage,
  bombardmentWeight,
  commission,
  dailyMaintenance,
  definitionOf,
  hullFraction,
  isAfloat,
  liftCapacity,
  repairDay,
  spareCapacity,
  statusOf,
  survivors,
  type NavyShip,
} from '../navy';

const MAJESTIC = ROSTER.byId.get('CWN-MAJ-R8-01')!;
const SWIFT = ROSTER.byId.get('CFS-SWI-S01')!;
const CORAL = ROSTER.byId.get('CFS-COR-R8-01')!;
const GOLIATH = ROSTER.byId.get('CFS-URG-R7-01')!;

/**
 * A definition is shared and frozen; an instance is one ship.
 *
 * The split is the point of these two files, so most of what is tested here is
 * that damaging one hull cannot reach any other, and that nothing derived —
 * status, fraction, capacity — is ever stored where it could fall out of step
 * with the hull figure it comes from.
 */
describe('a ship in the water', () => {
  it('is commissioned whole and empty', () => {
    const ship = commission(MAJESTIC, 'maj-1');
    expect(ship.hullRemaining).toBe(MAJESTIC.hull);
    expect(ship.troops).toBe(0);
    expect(statusOf(ship)).toBe('Healthy');
  });

  it('keeps two hulls of one class entirely separate', () => {
    const a = commission(MAJESTIC, 'maj-1');
    const b = commission(MAJESTIC, 'maj-2');
    applyHullDamage(a, 800);
    expect(a.hullRemaining).toBe(800);
    expect(b.hullRemaining).toBe(MAJESTIC.hull);
    // And the definition both share is untouched.
    expect(definitionOf(b).hull).toBe(1600);
  });

  it('never lets damage take a hull below nothing', () => {
    const ship = commission(SWIFT, 'swift-1');
    expect(applyHullDamage(ship, 10_000)).toBe(true);
    expect(ship.hullRemaining).toBe(0);
    expect(hullFraction(ship)).toBe(0);
    expect(isAfloat(ship)).toBe(false);
  });

  it('reports a sinking from the call that caused it', () => {
    const ship = commission(SWIFT, 'swift-1');
    expect(applyHullDamage(ship, SWIFT.hull - 1)).toBe(false);
    expect(applyHullDamage(ship, 1)).toBe(true);
  });

  it('ignores a damage of nothing rather than pretending to work', () => {
    const ship = commission(SWIFT, 'swift-1');
    expect(applyHullDamage(ship, 0)).toBe(false);
    expect(applyHullDamage(ship, -50)).toBe(false);
    expect(ship.hullRemaining).toBe(SWIFT.hull);
  });

  it('throws on an instance whose class has gone', () => {
    const orphan: NavyShip = {
      id: 'x',
      defId: 'NOT-A-CLASS',
      owner: 'Crown Imperium',
      hullRemaining: 10,
      troops: 0,
    };
    expect(() => definitionOf(orphan)).toThrow(/unknown class/);
  });
});

describe('condition', () => {
  /** A hull at exactly this share of whole. */
  function at(fraction: number): NavyShip {
    const ship = commission(MAJESTIC, 'maj-1');
    ship.hullRemaining = MAJESTIC.hull * fraction;
    return ship;
  }

  it('runs the five states from whole to gone', () => {
    expect(statusOf(at(1))).toBe('Healthy');
    expect(statusOf(at(0.8))).toBe('Healthy');
    expect(statusOf(at(0.6))).toBe('Damaged');
    expect(statusOf(at(0.4))).toBe('Heavily Damaged');
    expect(statusOf(at(0.1))).toBe('Critically Damaged');
    expect(statusOf(at(0))).toBe('Destroyed');
  });

  it('is derived, never stored', () => {
    // The point of deriving it: a hull that is mended reports better without
    // anybody having to remember to update a second field.
    const ship = at(0.3);
    expect(statusOf(ship)).toBe('Heavily Damaged');
    ship.hullRemaining = MAJESTIC.hull;
    expect(statusOf(ship)).toBe('Healthy');
  });

  it('puts the bands where the ruling puts them', () => {
    // 'Healthy: 76-100%. Damaged: 51-75%. Heavily Damaged: 26-50%.
    // Critically Damaged: 1-25%. Destroyed: 0%.' Still an argument on every
    // caller so a later ruling is one call site, not a rewrite.
    const ship = at(0.6);
    expect(statusOf(ship)).toBe('Damaged');
    expect(statusOf(ship, ROSTER, { critical: 0.7, heavy: 0.8, damaged: 0.9 })).toBe(
      'Critically Damaged',
    );
    expect(HULL_STATUS_THRESHOLDS.critical).toBeLessThan(HULL_STATUS_THRESHOLDS.heavy);
    expect(HULL_STATUS_THRESHOLDS.heavy).toBeLessThan(HULL_STATUS_THRESHOLDS.damaged);
  });
});

describe('mending', () => {
  it('mends a share of whole hull a day, not a share of what is left', () => {
    const ship = commission(CORAL, 'coral-1');
    applyHullDamage(ship, CORAL.hull / 2);
    const before = ship.hullRemaining;
    repairDay(ship);
    expect(ship.hullRemaining - before).toBeCloseTo(CORAL.hull * CORAL.repairRatePerDay);
  });

  it('mends a small hull by a fraction of a point rather than by nothing', () => {
    // The Swift is 70 hull at 1% — seven tenths a day. An integer hull would
    // mend nothing at all for two days and then a point at once.
    const ship = commission(SWIFT, 'swift-1');
    applyHullDamage(ship, 20);
    repairDay(ship);
    expect(ship.hullRemaining).toBeCloseTo(50.7);
  });

  it('never mends past whole', () => {
    const ship = commission(CORAL, 'coral-1');
    applyHullDamage(ship, 1);
    for (let day = 0; day < 100; day++) repairDay(ship);
    expect(ship.hullRemaining).toBe(CORAL.hull);
  });

  it('does not raise a wreck', () => {
    const ship = commission(SWIFT, 'swift-1');
    applyHullDamage(ship, SWIFT.hull);
    repairDay(ship);
    expect(ship.hullRemaining).toBe(0);
    expect(statusOf(ship)).toBe('Destroyed');
  });

  it('does nothing where mending is not allowed', () => {
    // Whether the v2.4 rate carries the live game's conditions — a friendly
    // harbour, a shipyard, never at sea — is unresolved, so the condition is
    // a parameter rather than a rule baked in here.
    const ship = commission(CORAL, 'coral-1');
    applyHullDamage(ship, 100);
    repairDay(ship, ROSTER, false);
    expect(ship.hullRemaining).toBe(CORAL.hull - 100);
  });
});

describe('a squadron', () => {
  const squadron = {
    ships: [commission(CORAL, 'coral-1'), commission(GOLIATH, 'goliath-1'), commission(SWIFT, 'swift-1')],
  };

  it('counts only what is still afloat', () => {
    const wrecked = { ships: squadron.ships.map((s) => ({ ...s })) };
    applyHullDamage(wrecked.ships[2], SWIFT.hull);
    expect(survivors(wrecked)).toHaveLength(2);
    expect(liftCapacity(wrecked)).toBe(CORAL.troopCapacity + GOLIATH.troopCapacity);
    expect(dailyMaintenance(wrecked)).toBeCloseTo(
      CORAL.goldPerDayMaintenance + GOLIATH.goldPerDayMaintenance,
    );
  });

  it('adds up what it can throw at a wall', () => {
    expect(bombardmentWeight(squadron)).toBe(
      CORAL.bombardment + GOLIATH.bombardment + SWIFT.bombardment,
    );
  });

  it('knows what room is left aboard', () => {
    const ship = commission(GOLIATH, 'goliath-2');
    expect(spareCapacity(ship)).toBe(GOLIATH.troopCapacity);
    ship.troops = 4;
    expect(spareCapacity(ship)).toBe(GOLIATH.troopCapacity - 4);
    ship.troops = 999;
    expect(spareCapacity(ship)).toBe(0);
  });
});
