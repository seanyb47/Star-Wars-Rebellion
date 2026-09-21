import { TARGET_JITTER } from './constants';
import {
  GUN_KINDS,
  expectedDamagePerShot,
  fireCannon,
  hitChance,
  type CombatStats,
  type GunKind,
} from './navycombat';
import type { Rng } from './rng';

/**
 * One round of a fleet action, on the locked cannon model.
 *
 * *"There is no ship-level Firepower stat. Every individual cannon makes its
 * own attack using the rules for its gun type."* — the Combat Rules tab, and
 * the sentence the whole of this hangs on.
 *
 * What stood here before was a round of one shot per hull, where a hull's
 * whole weight of metal was a single number and a hit did that number give or
 * take a seventh. It was a good model of the roster it was written for, and
 * that roster is gone: the v4.3 sheet gives every hull three separate
 * batteries that differ in dice, penetration and accuracy, and an Armor value
 * that only Heavy Guns really crack. None of that can be said in one number.
 *
 * So the unit of action is a cannon. The arithmetic of a cannon against a hull
 * is `navycombat.ts` and stays there, pure and calibrated against the sheet's
 * own published matchups; what lives here is the part that knows about the
 * *world* — that a fort and a creature also shoot, that an officer on the
 * quarterdeck is worth something, and that the three parties at an island are
 * not always two sides.
 */

/** A thing that can shoot and be shot at: a hull, a fort, or a creature. */
export interface Combatant {
  /**
   * What it is, in the only vocabulary the guns understand.
   *
   * A fort and a creature have one of these too. Neither is a ship, and the
   * model does not care: Size and point of sail are how hard a thing is to
   * hit, armor is what a shot has to get through, and a shore battery and a
   * sea-dragon both have answers to those.
   */
  stats: CombatStats;
  /** What is left of it. */
  left: number;
  /** What it had to start with, for the report's percentages. */
  whole: number;
  /** Apply damage. Returns true if this killed it. */
  hurt: (amount: number) => boolean;
}

/** Every cannon of a kind this thing still works. Guns do not degrade. */
export function gunsOfKind(who: Combatant, kind: GunKind): number {
  const { longGuns, heavyGuns, lightGuns } = who.stats.guns;
  return kind === 'Long' ? longGuns : kind === 'Heavy' ? heavyGuns : lightGuns;
}

/** Everything it throws in a round, of every kind. */
export function gunsOf(who: Combatant): number {
  const { longGuns, heavyGuns, lightGuns } = who.stats.guns;
  return longGuns + heavyGuns + lightGuns;
}

/**
 * Which enemy to shoot at, in the order a simulation would pick.
 *
 * Sean's instinct was to run sims and take the order they recommend, and he is
 * right about what the answer looks like — but a Monte Carlo inside a round
 * inside a day that ticks a hundred times a second is not affordable, and it
 * would eat the seeded RNG stream besides. So this is the closed form the sim
 * converges on.
 *
 * The form: score a target by the threat it removes per point of damage this
 * gun can actually put into it. `expectedDamagePerShot` is what makes that
 * honest now — it is the true expectation over the dice after armor rather
 * than the mean roll minus armor, and those are very different numbers the
 * moment plate bites: 2d20 against effective armor 20 averages 3.4 a shot
 * where the naive form says 1.0. A gun that cannot hurt a hull should not
 * choose it, and one that can should.
 *
 * A little jitter, so a battle is not a machine, and so two identical hulls do
 * not both eat the whole broadside while a third goes untouched.
 */
export function pickTarget(
  targets: Combatant[],
  rng: Rng,
  kind: GunKind = 'Light',
): Combatant | undefined {
  const live = targets.filter((t) => t.left > 0);
  if (live.length === 0) return undefined;
  let best: Combatant | undefined;
  let bestScore = -Infinity;
  for (const target of live) {
    const threat = gunsOf(target) + 1;
    const rate = expectedDamagePerShot(kind, target.stats);
    // Threat removed per shot spent removing it. A transport has no guns, so
    // it scores off the floor and is shot last — which is correct and is also
    // what makes a transport worth escorting.
    const worth = (threat / target.left) * rate;
    const score = worth * (1 + (rng.next() - 0.5) * TARGET_JITTER);
    if (score > bestScore) {
      bestScore = score;
      best = target;
    }
  }
  return best;
}

/**
 * One cannon. Returns the damage it lands, which is zero on a miss.
 *
 * `edge` is the officer on the quarterdeck and is the one thing here the sheet
 * does not describe: a multiplier on the chance to hit, capped at the sheet's
 * own ceiling so a well-handled squadron is never a certainty.
 */
export function fireOnce(
  kind: GunKind,
  target: Combatant,
  rng: Rng,
  edge = 1,
  ignoreArmor = false,
): number {
  if (target.left <= 0) return 0;
  if (edge !== 1) {
    // The edge moves the die roll rather than the damage, so a better officer
    // lands more shots and not heavier ones.
    const chance = Math.min(95, hitChance(kind, target.stats) * edge);
    if (rng.range(1, 100) > chance) return 0;
    let rolled = 0;
    for (let d = 0; d < DICE[kind]; d++) rolled += rng.range(1, 20);
    const through = Math.max(0, rolled - armorAgainst(kind, target.stats, ignoreArmor));
    if (through > 0) target.hurt(through);
    return through;
  }
  const done = fireCannon(kind, target.stats, rng, ignoreArmor);
  if (done === undefined || done <= 0) return 0;
  target.hurt(done);
  return done;
}

/* The two pieces of `navycombat`'s arithmetic the edged path has to redo for
   itself, kept here rather than exported from there: the engine's own
   `fireCannon` is the authority, and this is the one caller that needs to
   open it up. */
const DICE: Record<GunKind, number> = { Long: 2, Heavy: 4, Light: 2 };
function armorAgainst(kind: GunKind, target: CombatStats, ignoreArmor: boolean): number {
  if (ignoreArmor) return 0;
  const penetration = kind === 'Heavy' ? 0.5 : kind === 'Long' ? 0.25 : 0;
  return Math.ceil(target.armor * (1 - penetration));
}

export { GUN_KINDS };
export type { GunKind, CombatStats };
