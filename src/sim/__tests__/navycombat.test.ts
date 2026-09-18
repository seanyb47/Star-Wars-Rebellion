import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import {
  ASSESSMENTS,
  DAMAGE_SWING,
  HIT_CHANCE,
  LONG_GUN_SHARE,
  RETREAT_EXPOSURE,
  commissionForCombat,
  damage,
  enemyWillFlee,
  fightRound,
  isAfloat,
  resolveFlee,
  retreatAttacksFor,
  FOCUS_SHARE,
  fightingStrength,
  standardAssessment,
  standardGunnery,
  standardTargeting,
  survivors,
  threatOf,
  type Assessment,
  type CombatFleet,
  type CombatShip,
  type CombatStats,
  type GunneryModel,
} from '../navycombat';

/**
 * Naval combat, per the authoritative system.
 *
 * Every superseded mechanic has a test here proving it is *gone* rather than
 * merely unused: no First Strike, no armor, no boarding, no size triangle, no
 * automatic run to annihilation. That is deliberate — a removal nobody can
 * demonstrate is a removal somebody re-adds by accident.
 */

const stats = (over: Partial<CombatStats> = {}): CombatStats => ({
  firepower: 10,
  hull: 100,
  speed: 5,
  hasLongGuns: false,
  ...over,
});
const ship = (id: string, owner: CombatShip['owner'], over: Partial<CombatStats> = {}) =>
  commissionForCombat(id, owner, stats(over));
const crown = (ships: CombatShip[]): CombatFleet => ({ faction: 'Crown Imperium', ships });
const confed = (ships: CombatShip[]): CombatFleet => ({ faction: 'Free Confederacy', ships });

/** Always hits, for exactly this much. */
const fixed = (amount: number): GunneryModel => ({ attack: () => amount });
/** Never hits. */
const misses: GunneryModel = { attack: () => 0 };

describe('the gunnery model', () => {
  it('is one attack opportunity per ship, not one per gun', () => {
    // A ship with forty Firepower attacks once, like a ship with four.
    const heavy = ship('heavy', 'Crown Imperium', { firepower: 40 });
    const light = ship('light', 'Free Confederacy', { firepower: 4 });
    const report = fightRound(crown([heavy]), confed([light]), createRng(1), {
      gunnery: fixed(5),
    });
    expect(report.attacks).toHaveLength(2);
    expect(report.attacks.filter((a) => a.attackerId === 'heavy')).toHaveLength(1);
  });

  it('hits three times in four, near enough, over a long run', () => {
    const rng = createRng(42);
    let hits = 0;
    const tries = 4000;
    for (let i = 0; i < tries; i++) if (standardGunnery.attack(10, rng) > 0) hits += 1;
    expect(hits / tries).toBeGreaterThan(HIT_CHANCE - 0.03);
    expect(hits / tries).toBeLessThan(HIT_CHANCE + 0.03);
  });

  it('does Firepower give or take fifteen per cent, and never more', () => {
    const rng = createRng(7);
    const firepower = 100;
    for (let i = 0; i < 500; i++) {
      const dealt = standardGunnery.attack(firepower, rng);
      if (dealt === 0) continue; // a miss
      expect(dealt).toBeGreaterThanOrEqual(Math.round(firepower * (1 - DAMAGE_SWING)));
      expect(dealt).toBeLessThanOrEqual(Math.round(firepower * (1 + DAMAGE_SWING)));
    }
  });

  it('does nothing at all with no Firepower', () => {
    expect(standardGunnery.attack(0, createRng(1))).toBe(0);
  });

  it('takes damage straight off the hull, with no armor in the way', () => {
    const target = ship('t', 'Free Confederacy', { hull: 50 });
    expect(damage(target, 20)).toBe(20);
    expect(target.hullRemaining).toBe(30);
  });

  it('never takes a hull below nothing', () => {
    const target = ship('t', 'Free Confederacy', { hull: 50 });
    expect(damage(target, 10_000)).toBe(50);
    expect(target.hullRemaining).toBe(0);
    expect(isAfloat(target)).toBe(false);
  });
});

describe('a round', () => {
  it('resolves simultaneously, so a sinking ship still fires', () => {
    const a = ship('a', 'Crown Imperium', { hull: 10 });
    const b = ship('b', 'Free Confederacy', { hull: 10 });
    const report = fightRound(crown([a]), confed([b]), createRng(1), { gunnery: fixed(100) });
    expect(report.sunk.sort()).toEqual(['a', 'b']);
    expect(report.attacks.map((x) => x.attackerId).sort()).toEqual(['a', 'b']);
  });

  it('gives a ship one attack whether or not she carries Long Guns', () => {
    // First Strike is gone: a Long Gun ship fires once, in the ordinary
    // exchange, like everybody else.
    const longGunner = ship('lg', 'Crown Imperium', { hasLongGuns: true });
    const plain = ship('p', 'Free Confederacy');
    const report = fightRound(crown([longGunner]), confed([plain]), createRng(1), {
      gunnery: fixed(5),
    });
    expect(report.attacks.filter((a) => a.attackerId === 'lg')).toHaveLength(1);
  });

  it('gives a Long Gun ship no advantage in a stand-up fight', () => {
    // The two are identical but for the property. Same seed, same damage.
    const withGuns = fightRound(
      crown([ship('a', 'Crown Imperium', { hasLongGuns: true })]),
      confed([ship('b', 'Free Confederacy')]),
      createRng(11),
    );
    const without = fightRound(
      crown([ship('a', 'Crown Imperium', { hasLongGuns: false })]),
      confed([ship('b', 'Free Confederacy')]),
      createRng(11),
    );
    expect(withGuns.attacks).toEqual(without.attacks);
  });

  it('says when it is over, and only then', () => {
    const a = ship('a', 'Crown Imperium', { hull: 1000 });
    const b = ship('b', 'Free Confederacy', { hull: 10 });
    expect(fightRound(crown([a]), confed([b]), createRng(1), { gunnery: misses }).over).toBe(false);
    expect(fightRound(crown([a]), confed([b]), createRng(1), { gunnery: fixed(50) }).over).toBe(true);
  });

  it('resolves exactly one round and stops', () => {
    // The ruling: 'It must not loop automatically until one fleet is
    // destroyed.' Two big hulls and a small gun: after one call both are
    // still afloat and nothing has looped.
    const a = ship('a', 'Crown Imperium', { hull: 1000, firepower: 1 });
    const b = ship('b', 'Free Confederacy', { hull: 1000, firepower: 1 });
    const report = fightRound(crown([a]), confed([b]), createRng(1), { gunnery: fixed(1) });
    expect(report.over).toBe(false);
    expect(a.hullRemaining).toBe(999);
    expect(b.hullRemaining).toBe(999);
    expect(report.attacks).toHaveLength(2);
  });

  it('leaves wrecks out of the next round', () => {
    const a = ship('a', 'Crown Imperium');
    const dead = ship('dead', 'Crown Imperium');
    damage(dead, dead.stats.hull);
    const b = ship('b', 'Free Confederacy');
    const report = fightRound(crown([a, dead]), confed([b]), createRng(1), { gunnery: fixed(1) });
    expect(report.attacks.some((x) => x.attackerId === 'dead')).toBe(false);
  });

  it('is the same round twice for the same seed', () => {
    const run = () => {
      const a = ship('a', 'Crown Imperium', { firepower: 30 });
      const b = ship('b', 'Free Confederacy', { firepower: 20 });
      return JSON.stringify(fightRound(crown([a]), confed([b]), createRng(5)));
    };
    expect(run()).toBe(run());
  });
});

describe('fleeing', () => {
  it('always succeeds — there is no roll to escape', () => {
    // Nothing in `resolveFlee` can fail: it reports what the pursuit cost and
    // nothing else. A runner that survives is away.
    const runner = ship('r', 'Free Confederacy', { speed: 1, hull: 1000 });
    const chaser = ship('c', 'Crown Imperium', { hasLongGuns: true });
    const report = resolveFlee(confed([runner]), crown([chaser]), createRng(1));
    expect(report.pursued).toBe(true);
    expect(isAfloat(runner)).toBe(true);
  });

  it('takes no fire at all from a pursuer with no Long Guns', () => {
    const runner = ship('r', 'Free Confederacy', { speed: 1 });
    const chaser = ship('c', 'Crown Imperium', { hasLongGuns: false, firepower: 500 });
    const report = resolveFlee(confed([runner]), crown([chaser]), createRng(1));
    expect(report.pursued).toBe(false);
    expect(report.attacks).toEqual([]);
    expect(runner.hullRemaining).toBe(runner.stats.hull);
  });

  it('lets the fastest ship away clean', () => {
    // Speed 10: 0 attacks.
    const runner = ship('r', 'Free Confederacy', { speed: 10 });
    const chaser = ship('c', 'Crown Imperium', { hasLongGuns: true });
    const report = resolveFlee(confed([runner]), crown([chaser]), createRng(1), {
      gunnery: fixed(50),
    });
    expect(report.attacks).toEqual([]);
    expect(runner.hullRemaining).toBe(runner.stats.hull);
  });

  it('exposes a slow ship most', () => {
    const rng = createRng(3);
    for (const [speed, [low, high]] of Object.entries(RETREAT_EXPOSURE)) {
      for (let i = 0; i < 40; i++) {
        const n = retreatAttacksFor(Number(speed), rng);
        expect(n).toBeGreaterThanOrEqual(low);
        expect(n).toBeLessThanOrEqual(high);
      }
    }
  });

  it('fires retreat guns at half weight', () => {
    // LongGunFirepower = normal Firepower x 0.5.
    const seen: number[] = [];
    const spy: GunneryModel = {
      attack: (firepower) => {
        seen.push(firepower);
        return 0;
      },
    };
    const runner = ship('r', 'Free Confederacy', { speed: 2 }); // exactly 3 attacks
    const chaser = ship('c', 'Crown Imperium', { hasLongGuns: true, firepower: 40 });
    resolveFlee(confed([runner]), crown([chaser]), createRng(1), { gunnery: spy });
    expect(seen).toEqual([20, 20, 20]);
    expect(LONG_GUN_SHARE).toBe(0.5);
  });

  it('stops shooting a ship once she is gone', () => {
    const runner = ship('r', 'Free Confederacy', { speed: 1, hull: 10 });
    const chaser = ship('c', 'Crown Imperium', { hasLongGuns: true });
    const report = resolveFlee(confed([runner]), crown([chaser]), createRng(1), {
      gunnery: fixed(100),
    });
    expect(report.sunk).toEqual(['r']);
    expect(report.attacks).toHaveLength(1);
  });

  it('reads exposure off the running ship, not the chasing one', () => {
    const fast = ship('fast', 'Free Confederacy', { speed: 10 });
    const slow = ship('slow', 'Free Confederacy', { speed: 2 });
    const chaser = ship('c', 'Crown Imperium', { hasLongGuns: true });
    const report = resolveFlee(confed([fast, slow]), crown([chaser]), createRng(1), {
      gunnery: fixed(1),
    });
    expect(report.attacks.filter((a) => a.targetId === 'fast')).toHaveLength(0);
    expect(report.attacks.filter((a) => a.targetId === 'slow')).toHaveLength(3);
  });

  it('does not begin another round', () => {
    // The runner never fires back: fleeing ends combat.
    const runner = ship('r', 'Free Confederacy', { speed: 1, firepower: 999 });
    const chaser = ship('c', 'Crown Imperium', { hasLongGuns: true, hull: 100 });
    resolveFlee(confed([runner]), crown([chaser]), createRng(1), { gunnery: fixed(10) });
    expect(chaser.hullRemaining).toBe(100);
  });
});

describe('the enemy decision', () => {
  const band = (which: Assessment) => ({ assess: () => which });

  it('fights on in every band but desperation', () => {
    const mine = crown([ship('a', 'Crown Imperium')]);
    const theirs = confed([ship('b', 'Free Confederacy')]);
    for (const a of ASSESSMENTS) {
      expect(enemyWillFlee(theirs, mine, band(a))).toBe(a === 'DESPERATE');
    }
  });

  it('has five bands, worst last', () => {
    expect(ASSESSMENTS).toHaveLength(5);
    expect(ASSESSMENTS[ASSESSMENTS.length - 1]).toBe('DESPERATE');
  });
});

describe('what the ruling removed', () => {
  /**
   * Each of these proves an absence. The mechanics below were built to earlier
   * instructions and then superseded, and a removal that nothing demonstrates
   * is one somebody re-adds by accident.
   */
  it('has no armor anywhere in resolution', () => {
    const target = ship('t', 'Free Confederacy', { hull: 100 });
    expect('armorRemaining' in target).toBe(false);
    expect('armor' in target.stats).toBe(false);
    damage(target, 30);
    expect(target.hullRemaining).toBe(70); // every point reached the hull
  });

  it('has no size class and no weapon triangle', () => {
    // The stat block is four fields. Nothing about size can reach gunnery,
    // because gunnery is handed a number and not a ship.
    expect(Object.keys(stats()).sort()).toEqual(['firepower', 'hasLongGuns', 'hull', 'speed']);
    expect(standardGunnery.attack.length).toBe(2); // (firepower, rng)
  });

  it('has no boarding action', () => {
    const attacker = ship('a', 'Crown Imperium');
    const target = ship('b', 'Free Confederacy');
    fightRound(crown([attacker]), confed([target]), createRng(1), { gunnery: fixed(1) });
    // Nothing can change hands: ownership is untouched by a round.
    expect(target.owner).toBe('Free Confederacy');
  });

  it('counts only what is afloat', () => {
    const alive = ship('a', 'Crown Imperium');
    const dead = ship('d', 'Crown Imperium');
    damage(dead, dead.stats.hull);
    expect(survivors(crown([alive, dead]))).toEqual([alive]);
  });
});

describe('target selection (§6)', () => {
  it('sends roughly seven attacks in ten at the best target', () => {
    // '70% of attacks: highest-priority viable target. 30%: randomly selected.'
    const rng = createRng(17);
    const juicy = ship('juicy', 'Free Confederacy', { firepower: 50, hull: 10 });
    const dull = ship('dull', 'Free Confederacy', { firepower: 5, hull: 500 });
    const shooter = ship('s', 'Crown Imperium');
    let best = 0;
    const tries = 3000;
    for (let i = 0; i < tries; i++) {
      if (standardTargeting.pick(shooter, [juicy, dull], rng)?.id === 'juicy') best += 1;
    }
    // 70% deliberate, plus half of the random 30%.
    const expected = FOCUS_SHARE + (1 - FOCUS_SHARE) / 2;
    expect(best / tries).toBeGreaterThan(expected - 0.04);
    expect(best / tries).toBeLessThan(expected + 0.04);
  });

  it('spreads the other three in ten, rather than concentrating everything', () => {
    // '...avoid concentrating every attack against a single ship.'
    const rng = createRng(4);
    const a = ship('a', 'Free Confederacy', { firepower: 50, hull: 10 });
    const b = ship('b', 'Free Confederacy', { firepower: 5, hull: 500 });
    const shooter = ship('s', 'Crown Imperium');
    const picks = new Set<string>();
    for (let i = 0; i < 100; i++) picks.add(standardTargeting.pick(shooter, [a, b], rng)!.id);
    expect(picks).toEqual(new Set(['a', 'b']));
  });

  it('prefers warships, and only shoots an unarmed hull when nothing armed is left', () => {
    const rng = createRng(2);
    const warship = ship('war', 'Free Confederacy', { firepower: 10 });
    const unarmed = ship('unarmed', 'Free Confederacy', { firepower: 0 });
    const shooter = ship('s', 'Crown Imperium');
    for (let i = 0; i < 50; i++) {
      expect(standardTargeting.pick(shooter, [warship, unarmed], rng)!.id).toBe('war');
    }
    damage(warship, warship.stats.hull);
    expect(standardTargeting.pick(shooter, [warship, unarmed], rng)!.id).toBe('unarmed');
  });

  it('rates a hurt gunship above a fresh one', () => {
    const fresh = ship('fresh', 'Free Confederacy', { firepower: 10, hull: 100 });
    const hurt = ship('hurt', 'Free Confederacy', { firepower: 10, hull: 100 });
    damage(hurt, 90);
    expect(threatOf(hurt)).toBeGreaterThan(threatOf(fresh));
  });

  it('never picks a wreck', () => {
    const rng = createRng(1);
    const dead = ship('dead', 'Free Confederacy');
    damage(dead, dead.stats.hull);
    expect(standardTargeting.pick(ship('s', 'Crown Imperium'), [dead], rng)).toBeUndefined();
  });
});

describe('fleet strength and the assessment (§8, §16)', () => {
  it('adds up what is still afloat, and drops a lost ship from the total', () => {
    const a = ship('a', 'Crown Imperium', { firepower: 20, hull: 30 });
    const b = ship('b', 'Crown Imperium', { firepower: 20, hull: 30 });
    const c = ship('c', 'Crown Imperium', { firepower: 20, hull: 30 });
    const fleet = crown([a, b, c]);
    expect(fightingStrength(fleet)).toEqual({ firepower: 60, hull: 90 });
    damage(c, 30);
    // '...losing ships progressively weakens a fleet.'
    expect(fightingStrength(fleet)).toEqual({ firepower: 40, hull: 60 });
  });

  it('counts damage, not just losses', () => {
    const a = ship('a', 'Crown Imperium', { firepower: 10, hull: 100 });
    damage(a, 40);
    expect(fightingStrength(crown([a]))).toEqual({ firepower: 10, hull: 60 });
  });

  it('runs the five bands from a walkover to a rout', () => {
    const big = () => ship('big', 'Crown Imperium', { firepower: 50, hull: 500 });
    const small = () => ship('small', 'Free Confederacy', { firepower: 5, hull: 50 });
    expect(standardAssessment.assess(crown([big()]), confed([small()]))).toBe(
      'OVERWHELMINGLY FAVORABLE',
    );
    expect(standardAssessment.assess(confed([small()]), crown([big()]))).toBe('DESPERATE');
    const even = () => ship('x', 'Crown Imperium', { firepower: 10, hull: 100 });
    expect(standardAssessment.assess(crown([even()]), confed([even()]))).toBe('EVEN');
  });

  it('calls a fleet with nothing left desperate', () => {
    const dead = ship('d', 'Crown Imperium');
    damage(dead, dead.stats.hull);
    expect(standardAssessment.assess(crown([dead]), confed([ship('e', 'Free Confederacy')]))).toBe(
      'DESPERATE',
    );
  });

  it('makes the enemy break off only when desperate', () => {
    const strong = crown([ship('s', 'Crown Imperium', { firepower: 50, hull: 500 })]);
    const doomed = confed([ship('d', 'Free Confederacy', { firepower: 1, hull: 5 })]);
    expect(enemyWillFlee(doomed, strong)).toBe(true);
    expect(enemyWillFlee(strong, doomed)).toBe(false);
  });
});
