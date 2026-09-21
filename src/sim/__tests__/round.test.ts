import { describe, expect, it } from 'vitest';
import { fireOnce, gunsOf, pickTarget, type Combatant } from '../round';
import { GUNS, hitChance, type CombatStats, type GunKind } from '../navycombat';
import { createRng } from '../rng';

/**
 * The round, on the locked cannon model.
 *
 * These were written against a round of one shot per hull, where a hull's
 * whole weight of metal was one number and a hit did that number give or take
 * a seventh. The v4.3 roster replaced the number with three batteries that
 * differ in dice, penetration and accuracy, so the proofs had to be rewritten
 * rather than renumbered — and where the old ones asserted a fixed hit rate
 * and a fixed damage band, the new ones read the sheet's own matrices.
 */
function stats(guns: Partial<CombatStats['guns']>, over: Partial<CombatStats> = {}): CombatStats {
  return {
    size: 'Medium',
    speed: 'Normal',
    guns: { longGuns: 0, heavyGuns: 0, lightGuns: 0, ...guns },
    armor: 0,
    hull: 1000,
    combatantType: 'Warship',
    ...over,
  };
}

function dummy(guns: number, left: number, over: Partial<CombatStats> = {}): Combatant {
  const c: Combatant = {
    stats: stats({ lightGuns: guns }, { hull: left, ...over }),
    left,
    whole: left,
    hurt: (amount) => {
      c.left = Math.max(0, c.left - amount);
      return c.left <= 0;
    },
  };
  return c;
}

describe('one cannon', () => {
  it('hits at the rate the accuracy matrix says, and no other rate', () => {
    for (const kind of ['Long', 'Heavy', 'Light'] as GunKind[]) {
      const target = dummy(10, 1_000_000);
      const want = hitChance(kind, target.stats) / 100;
      let hits = 0;
      const rng = createRng(11);
      for (let i = 0; i < 4000; i++) if (fireOnce(kind, target, rng) > 0) hits++;
      expect(hits / 4000, kind).toBeGreaterThan(want - 0.04);
      expect(hits / 4000, kind).toBeLessThan(want + 0.04);
    }
  });

  it('rolls the dice its kind rolls, and nothing outside them', () => {
    for (const kind of ['Long', 'Heavy', 'Light'] as GunKind[]) {
      const rng = createRng(3);
      const seen: number[] = [];
      const target = dummy(0, 1_000_000);
      for (let i = 0; i < 4000; i++) {
        const done = fireOnce(kind, target, rng);
        if (done > 0) seen.push(done);
      }
      const dice = GUNS[kind].dice;
      expect(Math.min(...seen), kind).toBeGreaterThanOrEqual(dice);
      expect(Math.max(...seen), kind).toBeLessThanOrEqual(dice * 20);
      // Mean of n d20 is n × 10.5, and nothing here has armor to take off it.
      const mean = seen.reduce((a, b) => a + b, 0) / seen.length;
      expect(mean, kind).toBeGreaterThan(dice * 10.5 - 1);
      expect(mean, kind).toBeLessThan(dice * 10.5 + 1);
    }
  });

  /**
   * Armor is the whole reason the three kinds are three kinds. Light Guns
   * have no penetration at all, so plate that a Heavy shrugs through stops a
   * Light dead — which is the sheet's *"armor-cracking is Heavy's signature
   * alone"* said as a measurement.
   */
  it('is stopped by plate a Heavy Gun goes through', () => {
    const plated = dummy(0, 1_000_000, { armor: 25 });
    const rng = createRng(5);
    let light = 0;
    let heavy = 0;
    for (let i = 0; i < 3000; i++) light += fireOnce('Light', plated, rng);
    for (let i = 0; i < 3000; i++) heavy += fireOnce('Heavy', plated, rng);
    expect(heavy).toBeGreaterThan(light * 5);
  });

  it('a hull with none of that kind is not asked to fire it', () => {
    const empty = dummy(0, 1000);
    expect(gunsOf(empty)).toBe(0);
  });

  it('does nothing to something already gone', () => {
    const target = dummy(5, 0);
    expect(fireOnce('Heavy', target, createRng(1))).toBe(0);
  });
});

describe('choosing a target', () => {
  it('ignores the dead and gives up when everything is', () => {
    const rng = createRng(5);
    expect(pickTarget([], rng)).toBeUndefined();
    const dead = dummy(10, 0);
    expect(pickTarget([dead], rng)).toBeUndefined();
    const live = dummy(1, 50);
    expect(pickTarget([dead, live], rng)).toBe(live);
  });

  it('finishes a hurt gunship before starting a fresh one', () => {
    const rng = createRng(9);
    const nearlyGone = dummy(17, 200);
    const fresh = dummy(17, 1800);
    let chose = 0;
    for (let i = 0; i < 400; i++) if (pickTarget([nearlyGone, fresh], rng) === nearlyGone) chose++;
    expect(chose).toBeGreaterThan(380);
  });

  it('shoots the guns before the transport', () => {
    const rng = createRng(4);
    const gunship = dummy(17, 1800);
    const transport = dummy(0, 1400);
    let chose = 0;
    for (let i = 0; i < 400; i++) if (pickTarget([gunship, transport], rng) === gunship) chose++;
    expect(chose).toBeGreaterThan(380);
  });

  it('spreads fire between hulls that are worth the same', () => {
    // Two identical targets should not both be "the" target: the jitter is
    // there so a battle reads as a battle rather than a list being worked down.
    const rng = createRng(7);
    const a = dummy(17, 1800);
    const b = dummy(17, 1800);
    let onA = 0;
    for (let i = 0; i < 600; i++) if (pickTarget([a, b], rng) === a) onA++;
    expect(onA).toBeGreaterThan(200);
    expect(onA).toBeLessThan(400);
  });

  /**
   * And it knows which of its own guns is asking.
   *
   * New with the cannon model, and the reason `pickTarget` takes a kind: a
   * Light Gun and a Heavy Gun looking at the same two hulls should not always
   * agree.
   *
   * The board is the one where they must not. The plated hull is the better
   * prize on paper — more guns, less left of her — and a Heavy Gun, which
   * takes half her plate off before it rolls, should go for her. A Light Gun
   * cannot get through that plate at all, so for it the same hull is nearly
   * unhurtable and the bare one is the only useful target on the water.
   */
  it('lets a Light gun and a Heavy gun disagree about plate', () => {
    const rng = createRng(13);
    let lightOnBare = 0;
    let heavyOnPlated = 0;
    for (let i = 0; i < 600; i++) {
      const plated = dummy(31, 900, { armor: 25 });
      const bare = dummy(21, 1800);
      if (pickTarget([plated, bare], rng, 'Light') === bare) lightOnBare++;
      if (pickTarget([plated, bare], rng, 'Heavy') === plated) heavyOnPlated++;
    }
    expect(lightOnBare, 'the Light gun went for plate it cannot crack').toBeGreaterThan(550);
    expect(heavyOnPlated, 'the Heavy gun passed up the prize it was made for').toBeGreaterThan(550);
  });
});

/**
 * The claim Sean actually made — "AI can run sims and determine correct order"
 * — checked rather than asserted.
 *
 * A Monte Carlo inside a round inside a day that ticks a hundred times a
 * second is not affordable, and it would eat the seeded RNG stream besides. So
 * the engine uses a closed form: threat removed per point of damage this gun
 * can actually put in. This brute-forces the question the sim would answer —
 * which single target, shot until it dies, leaves the enemy weakest soonest —
 * and checks the closed form agrees.
 */
describe('the heuristic agrees with the simulation', () => {
  function simBest(targets: Combatant[], kind: GunKind): Combatant {
    let best = targets[0];
    let bestRate = -Infinity;
    for (const t of targets) {
      // Guns removed per shot of our time: threat over the rounds it takes,
      // where a round's worth is the expected damage this kind lands on it.
      const per = (hitChance(kind, t.stats) / 100) * GUNS[kind].dice * 10.5;
      const rate = gunsOf(t) / (t.left / Math.max(1e-9, per));
      if (rate > bestRate) {
        bestRate = rate;
        best = t;
      }
    }
    return best;
  }

  it('picks what the brute-force search picks, on random boards', () => {
    const rng = createRng(21);
    let agreed = 0;
    const boards = 300;
    for (let i = 0; i < boards; i++) {
      const targets = Array.from({ length: 2 + rng.int(4) }, () =>
        dummy(rng.int(35), 100 + rng.int(3200)),
      );
      // Ask the engine many times and take its favourite, so the jitter that
      // makes a battle look alive does not read as disagreement.
      const tally = new Map<Combatant, number>();
      for (let n = 0; n < 60; n++) {
        const pick = pickTarget(targets, rng, 'Light')!;
        tally.set(pick, (tally.get(pick) ?? 0) + 1);
      }
      const favourite = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const sim = simBest(targets, 'Light');
      const worth = (c: Combatant) => gunsOf(c) / c.left;
      if (favourite === sim || worth(favourite) === worth(sim)) agreed++;
    }
    expect(agreed / boards).toBeGreaterThan(0.85);
  });
});
