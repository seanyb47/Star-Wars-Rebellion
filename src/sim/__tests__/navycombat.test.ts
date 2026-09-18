import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { applyDamage, commission, repairDay, statusOf, type NavyShip, type Squadron } from '../navy';
import { ROSTER, type ShipDefinition } from '../shipdefs';
import {
  resolveBoarding,
  resolveRound,
  type GunKind,
  type GunneryModel,
  type ShipOrder,
} from '../navycombat';

const MAJESTIC = ROSTER.byId.get('CWN-MAJ-R9-01')!; // 10 long, 16 heavy, 10 light, armor 95
const FREEBOOTER = ROSTER.byId.get('CFS-FRE-S03')!; // no guns at all, 6 troops, armor 30
const SWIFT = ROSTER.byId.get('CFS-SWI-S01')!; // 70 hull, no armor, no guns
const CUTLASS = ROSTER.byId.get('CFS-CUT-S04')!; // 2 heavy, 5 light, no long guns
const RESOLUTE = ROSTER.byId.get('CWN-RES-R2-01')!; // 2 long, 5 heavy, 6 light

/** A gunnery model that does a flat amount per gun, so a test can do
 *  arithmetic. The real one does not exist: what a gun does is unruled. */
function flat(perGun: number): GunneryModel {
  return { volley: (_s, _t, _k, guns) => guns * perGun };
}
/** One that records what it was asked, for testing the sequence itself. */
function recorder(): GunneryModel & { calls: Array<{ kind: GunKind; shooter: string }> } {
  const calls: Array<{ kind: GunKind; shooter: string }> = [];
  return {
    calls,
    volley: (shooter: ShipDefinition, _t, kind, guns) => {
      calls.push({ kind, shooter: shooter.id });
      return guns;
    },
  };
}
const orders = (...pairs: Array<[string, ShipOrder]>) => new Map(pairs);

describe('armor is an ablative pool', () => {
  it('eats damage a point at a time, then lets the rest into the hull', () => {
    const ship = commission(MAJESTIC, 'maj-1');
    const tally = applyDamage(ship, 100);
    expect(tally.armorLost).toBe(95); // all of it
    expect(tally.hullLost).toBe(5);
    expect(ship.armorRemaining).toBe(0);
    expect(ship.hullRemaining).toBe(MAJESTIC.hull - 5);
  });

  it('keeps the hull whole while any armor stands', () => {
    const ship = commission(MAJESTIC, 'maj-1');
    applyDamage(ship, 60);
    expect(ship.armorRemaining).toBe(35);
    expect(ship.hullRemaining).toBe(MAJESTIC.hull);
    expect(statusOf(ship)).toBe('Healthy');
  });

  it('does not change the status, because armor loss never does', () => {
    // 'Armor loss does not change Status.'
    const ship = commission(MAJESTIC, 'maj-1');
    applyDamage(ship, MAJESTIC.armor);
    expect(ship.armorRemaining).toBe(0);
    expect(statusOf(ship)).toBe('Healthy');
  });

  it('does not come back during a fight', () => {
    const ship = commission(MAJESTIC, 'maj-1');
    applyDamage(ship, 50);
    applyDamage(ship, 10);
    expect(ship.armorRemaining).toBe(35);
  });

  it('works the same whichever gun fired', () => {
    // 'Armor works identically against Long, Heavy, and Light Guns' — so
    // `applyDamage` does not take a gun kind at all, which is the guarantee.
    const a = commission(MAJESTIC, 'a');
    const b = commission(MAJESTIC, 'b');
    expect(applyDamage(a, 120)).toEqual(applyDamage(b, 120));
  });

  it('gives an unarmored ship no protection at all', () => {
    const ship = commission(SWIFT, 'swift-1');
    const tally = applyDamage(ship, 10);
    expect(tally.armorLost).toBe(0);
    expect(tally.hullLost).toBe(10);
  });
});

describe('repair restores hull first, then armor', () => {
  it('spends the day on the hull while the hull needs it', () => {
    const ship = commission(MAJESTIC, 'maj-1');
    applyDamage(ship, 500); // 95 armor then 405 hull
    const budget = MAJESTIC.hull * MAJESTIC.repairRatePerDay;
    repairDay(ship);
    expect(ship.hullRemaining).toBeCloseTo(MAJESTIC.hull - 405 + budget);
    expect(ship.armorRemaining).toBe(0);
  });

  it('puts what the hull did not need into the armor', () => {
    const ship = commission(MAJESTIC, 'maj-1');
    applyDamage(ship, 96); // 95 armor, 1 hull
    repairDay(ship);
    expect(ship.hullRemaining).toBe(MAJESTIC.hull);
    // A day is 16 points; one went to the hull, fifteen to the armor.
    expect(ship.armorRemaining).toBeCloseTo(15);
  });

  it('never mends armor past whole either', () => {
    const ship = commission(MAJESTIC, 'maj-1');
    applyDamage(ship, 20);
    for (let day = 0; day < 50; day++) repairDay(ship);
    expect(ship.armorRemaining).toBe(MAJESTIC.armor);
    expect(ship.hullRemaining).toBe(MAJESTIC.hull);
  });
});

describe('First Strike', () => {
  function pair(): { mine: Squadron; theirs: Squadron; a: NavyShip; b: NavyShip } {
    const a = commission(RESOLUTE, 'res-1');
    const b = commission(CUTLASS, 'cut-1');
    return { mine: { ships: [a] }, theirs: { ships: [b] }, a, b };
  }

  it('fires Long Guns before anything else, and only Long Guns', () => {
    const { mine, theirs, a, b } = pair();
    const gunnery = recorder();
    const result = resolveRound({
      attacker: mine,
      defender: theirs,
      orders: orders([a.id, { kind: 'fire', targetId: b.id }], [b.id, { kind: 'fire', targetId: a.id }]),
      gunnery,
      rng: createRng(1),
    });
    expect(result.firstStrike.map((v) => v.kind)).toEqual(['long']);
    expect(result.firstStrike[0].shooterId).toBe(a.id); // the Cutlass has none
    // And the long guns are not fired again in the exchange.
    expect(result.exchange.every((v) => v.kind !== 'long')).toBe(true);
  });

  it('lets a ship sunk by First Strike take no part in the exchange', () => {
    // 'A ship destroyed during First Strike does not fire during the normal
    // attack step.' The Swift is 70 hull and unarmored; two long guns at 40
    // apiece is eighty.
    const shooter = commission(RESOLUTE, 'res-1');
    const doomed = commission(SWIFT, 'swift-1');
    const result = resolveRound({
      attacker: { ships: [shooter] },
      defender: { ships: [doomed] },
      orders: orders(
        [shooter.id, { kind: 'fire', targetId: doomed.id }],
        [doomed.id, { kind: 'fire', targetId: shooter.id }],
      ),
      gunnery: flat(40),
      rng: createRng(1),
    });
    expect(result.sunk).toEqual([doomed.id]);
    expect(result.exchange.some((v) => v.shooterId === doomed.id)).toBe(false);
  });

  it('resolves the exchange against the state First Strike left', () => {
    // The Cutlass survives First Strike with her armor gone and fires back.
    const { mine, theirs, a, b } = pair();
    const result = resolveRound({
      attacker: mine,
      defender: theirs,
      orders: orders([a.id, { kind: 'fire', targetId: b.id }], [b.id, { kind: 'fire', targetId: a.id }]),
      gunnery: flat(3),
      rng: createRng(1),
    });
    expect(b.armorRemaining).toBe(0); // 2 long guns x 3 = 6, armor was 10... then heavy+light
    expect(result.exchange.length).toBeGreaterThan(0);
    expect(result.sunk).toEqual([]);
  });

  it('keeps the exchange simultaneous, so a sinking ship still fires', () => {
    // Both are given enough to kill the other. Both must land their shot.
    const a = commission(CUTLASS, 'cut-a');
    const b = commission(CUTLASS, 'cut-b');
    const result = resolveRound({
      attacker: { ships: [a] },
      defender: { ships: [b] },
      orders: orders([a.id, { kind: 'fire', targetId: b.id }], [b.id, { kind: 'fire', targetId: a.id }]),
      gunnery: flat(100),
      rng: createRng(1),
    });
    expect(result.sunk.sort()).toEqual([a.id, b.id].sort());
    expect(result.exchange.some((v) => v.shooterId === a.id)).toBe(true);
    expect(result.exchange.some((v) => v.shooterId === b.id)).toBe(true);
  });

  it('gives a ship with no Long Guns no First Strike', () => {
    const a = commission(CUTLASS, 'cut-a');
    const b = commission(CUTLASS, 'cut-b');
    const result = resolveRound({
      attacker: { ships: [a] },
      defender: { ships: [b] },
      orders: orders([a.id, { kind: 'fire', targetId: b.id }]),
      gunnery: flat(1),
      rng: createRng(1),
    });
    expect(result.firstStrike).toEqual([]);
  });
});

describe('boarding', () => {
  it('replaces the boarder\'s gun attack for the round', () => {
    const boarder = commission(CUTLASS, 'cut-1');
    boarder.troops = 2;
    const target = commission(SWIFT, 'swift-1');
    const gunnery = recorder();
    const result = resolveRound({
      attacker: { ships: [boarder] },
      defender: { ships: [target] },
      orders: orders([boarder.id, { kind: 'board', targetId: target.id, troops: 2 }]),
      gunnery,
      rng: createRng(1),
    });
    expect(gunnery.calls.filter((c) => c.shooter === CUTLASS.id)).toEqual([]);
    expect(result.boardings).toHaveLength(1);
  });

  it('captures rather than destroys when the boarder wins', () => {
    const boarder = commission(FREEBOOTER, 'free-1');
    boarder.troops = 6;
    const target = commission(SWIFT, 'swift-1'); // carries nobody
    const record = resolveBoarding(boarder, target, 6, createRng(1));
    expect(record.captured).toBe(true);
    expect(target.owner).toBe('Free Confederacy');
    expect(target.hullRemaining).toBe(SWIFT.hull); // taken whole
    expect(statusOf(target)).not.toBe('Destroyed');
  });

  it('loses the committed companies when the boarder is beaten', () => {
    const boarder = commission(FREEBOOTER, 'free-1');
    boarder.troops = 2;
    const target = commission(MAJESTIC, 'maj-1');
    target.troops = 9;
    const record = resolveBoarding(boarder, target, 2, createRng(1));
    expect(record.captured).toBe(false);
    expect(record.troopsLost).toBe(2);
    expect(boarder.troops).toBe(0);
    expect(target.owner).toBe('Crown Imperium');
    expect(target.troops).toBe(7); // both sides spend the smaller force
  });

  it('cannot commit companies it does not have', () => {
    const boarder = commission(FREEBOOTER, 'free-1');
    boarder.troops = 1;
    const target = commission(SWIFT, 'swift-1');
    expect(resolveBoarding(boarder, target, 99, createRng(1)).committed).toBe(1);
  });

  it('will not board a wreck', () => {
    const boarder = commission(FREEBOOTER, 'free-1');
    boarder.troops = 6;
    const target = commission(SWIFT, 'swift-1');
    applyDamage(target, SWIFT.hull);
    const result = resolveRound({
      attacker: { ships: [boarder] },
      defender: { ships: [target] },
      orders: orders([boarder.id, { kind: 'board', targetId: target.id, troops: 6 }]),
      gunnery: flat(1),
      rng: createRng(1),
    });
    expect(result.boardings).toEqual([]);
    expect(result.captured).toEqual([]);
  });

  it('gives the Freebooter something to do, which is the point of her', () => {
    // She has no guns at all and six troops: without boarding she is a ship
    // that cannot act.
    expect(FREEBOOTER.guns).toEqual({ longGuns: 0, heavyGuns: 0, lightGuns: 0 });
    expect(FREEBOOTER.troopCapacity).toBe(6);
    const boarder = commission(FREEBOOTER, 'free-1');
    boarder.troops = 6;
    const target = commission(SWIFT, 'swift-1');
    const result = resolveRound({
      attacker: { ships: [boarder] },
      defender: { ships: [target] },
      orders: orders([boarder.id, { kind: 'board', targetId: target.id, troops: 6 }]),
      gunnery: flat(1),
      rng: createRng(1),
    });
    expect(result.captured).toEqual([target.id]);
  });
});

describe('determinism', () => {
  it('gives the same round twice for the same seed', () => {
    const run = (seed: number) => {
      const a = commission(RESOLUTE, 'res-1');
      const b = commission(CUTLASS, 'cut-1');
      b.troops = 1;
      const c = commission(FREEBOOTER, 'free-1');
      c.troops = 3;
      const result = resolveRound({
        attacker: { ships: [a, c] },
        defender: { ships: [b] },
        orders: orders(
          [a.id, { kind: 'fire', targetId: b.id }],
          [c.id, { kind: 'board', targetId: b.id, troops: 1 }],
          [b.id, { kind: 'fire', targetId: a.id }],
        ),
        gunnery: flat(2),
        rng: createRng(seed),
      });
      return JSON.stringify(result);
    };
    expect(run(7)).toBe(run(7));
  });
});
