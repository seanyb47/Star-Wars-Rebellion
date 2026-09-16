import { DAMAGE_SWING, TARGET_JITTER } from './constants';
import type { Rng } from './rng';
import type { ShipRole } from './types';

/**
 * One round of a fleet action.
 *
 * Every hull that can still shoot takes one shot. Three quarters of them tell,
 * and a hit does what the gun does give or take a seventh — which is the whole
 * of the randomness, and it is deliberately at the level of the individual
 * shot rather than the battle. A weaker fleet loses to a stronger one; what
 * varies is how much it costs.
 *
 * This replaced a pool: the old round added up both sides' guns, halved the
 * total and dealt that many one-point hits at random hulls. That could not
 * express a damage roll — a seventh of one point is nothing — and it could not
 * express a target choice either, because there were no attackers, only a
 * number. Ships shoot now.
 */

/** A thing that can shoot and be shot at: a hull, a fort, or a creature. */
export interface Combatant {
  /** What it throws in a round. */
  guns: number;
  /** What is left of it. */
  left: number;
  /** What it had to start with, for the report's percentages. */
  whole: number;
  /** How likely a shot at it is to tell. A creature is harder to hit, and so
   *  is anything small and quick. */
  hitChance: number;
  /** What kind of hull it is, for a shooter working out whether it can train
   *  its guns round fast enough. Absent for a fort or a creature. */
  role?: ShipRole;
  /** Apply damage. Returns true if this killed it. */
  hurt: (amount: number) => boolean;
}

/**
 * Which enemy to shoot at, in the order a simulation would pick.
 *
 * Sean's instinct was to run sims and take the order they recommend, and he is
 * right about what the answer looks like — but a Monte Carlo inside a round
 * inside a day that ticks a hundred times a second is not affordable, and it
 * would eat the seeded RNG stream besides. So this is the closed form the sim
 * converges on, and `combat.sim.test.ts` checks that claim by brute-forcing
 * the best order against every alternative and confirming this agrees.
 *
 * The form: score a target by the threat it removes per point of damage spent
 * removing it — guns over remaining hull. Finishing a hurt ship beats starting
 * a fresh one, and a hurt gunship beats a hurt transport. A little jitter, so
 * a battle is not a machine, and so two identical hulls do not both eat the
 * whole broadside while a third goes untouched.
 */
export function pickTarget(targets: Combatant[], rng: Rng): Combatant | undefined {
  const live = targets.filter((t) => t.left > 0);
  if (live.length === 0) return undefined;
  let best: Combatant | undefined;
  let bestScore = -Infinity;
  for (const target of live) {
    // Threat removed per *shot* spent removing it. Shots, not points: a hull
    // that is hard to hit costs more shots for the same damage, so once hulls
    // stopped being equally easy to hit this had to count the misses too.
    // A transport has no guns, so it scores off the floor and is shot last —
    // which is correct and is also what makes a transport worth escorting.
    const worth = ((target.guns + 1) / target.left) * target.hitChance;
    const score = worth * (1 + (rng.next() - 0.5) * TARGET_JITTER);
    if (score > bestScore) {
      bestScore = score;
      best = target;
    }
  }
  return best;
}

/** One shot. Returns the damage done, which is zero on a miss. */
export function fireOnce(
  attacker: { guns: number },
  target: Combatant,
  rng: Rng,
  edge = 1,
): number {
  if (attacker.guns <= 0) return 0;
  if (!rng.chance(Math.min(0.95, target.hitChance * edge))) return 0;
  const swing = 1 + (rng.next() * 2 - 1) * DAMAGE_SWING;
  const damage = Math.max(1, Math.round(attacker.guns * swing));
  target.hurt(damage);
  return damage;
}
