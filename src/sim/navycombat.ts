/**
 * Naval combat, per *7 Seas — Naval Combat System* (authoritative).
 *
 * Sean's ruling of 18 September, and it supersedes a day's worth of earlier
 * instructions: *"The v2.4 fleet table is legacy ship-design data and does not
 * define combat mechanics. Any earlier instructions adding armor, weapon
 * triangles, boarding, or First Strike are superseded."*
 *
 * So the whole of what combat reads is four numbers:
 *
 *     Firepower · Hull · Speed · hasLongGuns
 *
 * and everything that used to be here — the size-class triangle, the three gun
 * kinds firing separately, First Strike, ablative armor, ship-to-ship boarding
 * — is gone rather than disabled. What each of them was is recorded in
 * `docs/naval-combat-open-questions.md` so the reversal is legible.
 *
 * ## What is settled
 *
 * - **One attack opportunity per ship per round**, not one per gun.
 * - **75% to hit**, and `damage = round(Firepower × random(0.85, 1.15))`.
 * - **A round at a time.** `fightRound` resolves exactly one and stops. It does
 *   not loop to annihilation; the decision to fight again is the player's.
 * - **Flee always succeeds.** No roll. Only pursuers with Long Guns may fire,
 *   at half Firepower, as many attacks as the retreating ship's Speed allows.
 * - **Armor is not read.** Damage goes straight to Hull.
 *
 * ## What is still open
 *
 * Two things, both named below rather than guessed at: the **Firepower and
 * Speed 1–10 conversion** for the 25 legacy hulls (Sean's next fleet-design
 * task, and explicitly *not* a sum of the three gun columns), and the
 * **thresholds of the position assessment** — the five bands are named and
 * what the enemy does in each is ruled, but not what makes a position
 * `DESPERATE`.
 */
import type { Rng } from './rng';
import type { NavyFaction } from './shipdefs';

/* ------------------------------------------------------------- the four stats */

/**
 * The whole of what combat reads about a ship.
 *
 * Deliberately not `ShipDefinition`. The v2.4 roster carries Armor, three gun
 * columns and a Speed *category*, none of which this model uses, and Sean's
 * ruling is explicit that Firepower is **not** the three gun columns added up.
 * Keeping the shapes apart means the conversion is a real piece of design work
 * rather than something that could be quietly faked by an adapter.
 */
export interface CombatStats {
  /** One number. Not a count of guns. */
  readonly firepower: number;
  readonly hull: number;
  /** 1–10, where 10 is fastest. Sets exposure to retreat fire, and nothing
   *  else in this model. */
  readonly speed: number;
  /** Whether she can fire on a fleet that is already running. Their only
   *  special purpose: First Strike is gone. */
  readonly hasLongGuns: boolean;
}

/** One ship in a battle. */
export interface CombatShip {
  readonly id: string;
  readonly stats: CombatStats;
  owner: NavyFaction;
  hullRemaining: number;
}

export interface CombatFleet {
  faction: NavyFaction;
  ships: CombatShip[];
}

export function commissionForCombat(
  id: string,
  owner: NavyFaction,
  stats: CombatStats,
): CombatShip {
  return { id, owner, stats, hullRemaining: stats.hull };
}

export function isAfloat(ship: CombatShip): boolean {
  return ship.hullRemaining > 0;
}

export function survivors(fleet: CombatFleet): CombatShip[] {
  return fleet.ships.filter(isAfloat);
}

/* -------------------------------------------------------------- the gunnery */

export const HIT_CHANCE = 0.75;
/** Damage varies by this much either way: `random(0.85, 1.15)`. */
export const DAMAGE_SWING = 0.15;
/** What a Long Gun throws into a fleet that is running: half of normal. */
export const LONG_GUN_SHARE = 0.5;

/**
 * One attack, at normal weight or at a retreating target.
 *
 * The ruling, verbatim:
 *
 *     hitChance = 0.75
 *     if hit: damage = round(Firepower × random(0.85, 1.15))
 *     else:   damage = 0
 *
 * Injected rather than hard-wired so a later ruling — a commander's edge, a
 * status penalty, weather — has one place to go, and so a test can drive a
 * battle without the RNG. `standardGunnery` is the ruling as written.
 */
export interface GunneryModel {
  attack(firepower: number, rng: Rng): number;
}

export const standardGunnery: GunneryModel = {
  attack(firepower, rng) {
    if (firepower <= 0) return 0;
    if (!rng.chance(HIT_CHANCE)) return 0;
    const swing = 1 + (rng.next() * 2 - 1) * DAMAGE_SWING;
    return Math.round(firepower * swing);
  },
};

/** Take hull off her. Returns what was actually taken. */
export function damage(ship: CombatShip, amount: number): number {
  if (amount <= 0 || !isAfloat(ship)) return 0;
  const taken = Math.min(ship.hullRemaining, amount);
  ship.hullRemaining -= taken;
  return taken;
}

/* ---------------------------------------------------------------- a round */

export interface AttackRecord {
  attackerId: string;
  targetId: string;
  hit: boolean;
  damage: number;
}

/** How each side saw the round. */
export interface RoundReport {
  attacks: AttackRecord[];
  /** Ships lost this round, in the order they went. */
  sunk: string[];
  /** True once either fleet has nothing left. */
  over: boolean;
}

/**
 * Who each ship fires at. §6 of the authoritative system.
 *
 * The player never picks a target — *"The combat engine selects targets
 * automatically"* — and the rule is given in full:
 *
 *   1. Prefer viable enemy warships.
 *   2. Prefer higher-threat enemy ships.
 *   3. Avoid concentrating every attack against a single ship unless that ship
 *      is clearly the highest-priority target.
 *   4. Allow some natural distribution of fire.
 *   5. *"70% of attacks: highest-priority viable target. 30% of attacks:
 *      randomly selected viable enemy target."*
 */
export interface TargetingModel {
  pick(shooter: CombatShip, enemies: CombatShip[], rng: Rng): CombatShip | undefined;
}

/** The share of attacks that go to the best target rather than a random one. */
export const FOCUS_SHARE = 0.7;

/**
 * How dangerous a target is, for the 70% that pick deliberately.
 *
 * §6: *"Target priority should consider Firepower, Remaining Hull, and Ship
 * importance/value. Do not create a new visible stat for target priority."* So
 * this is derived at the moment of firing and stored nowhere.
 *
 * **The one inference in the combat engine.** The doc gives the inputs and the
 * direction, not a formula. This is threat removed per point of damage spent
 * removing it — the same shape the live game's targeting already uses — so a
 * hurt gunship outranks a fresh one and a Swift with no guns is shot last. It
 * is one function, changeable in one place, and no rule depends on its
 * particular arithmetic.
 */
export function threatOf(ship: CombatShip): number {
  return (ship.stats.firepower + 1) / Math.max(1, ship.hullRemaining);
}

export const standardTargeting: TargetingModel = {
  pick(_shooter, enemies, rng) {
    const viable = enemies.filter(isAfloat);
    if (viable.length === 0) return undefined;
    /*
     * A ship that cannot shoot back is not a *warship*, and §6 asks for those
     * to be preferred — so an unarmed hull is only fired on once nothing armed
     * is left. It is also what stops a fleet spending its whole broadside on a
     * transport while a first-rate goes untouched.
     */
    const armed = viable.filter((s) => s.stats.firepower > 0);
    const pool = armed.length > 0 ? armed : viable;
    if (pool.length === 1) return pool[0];
    if (rng.next() < FOCUS_SHARE) {
      return pool.reduce((best, s) => (threatOf(s) > threatOf(best) ? s : best), pool[0]);
    }
    return pool[rng.int(pool.length)];
  },
};

/** The simplest possible targeting, for tests that are about something else. */
export const firstAfloat: TargetingModel = {
  pick: (_shooter, enemies) => enemies.find(isAfloat),
};

export interface RoundConfig {
  gunnery?: GunneryModel;
  targeting?: TargetingModel;
}

/**
 * Exactly one round, and then stop.
 *
 * Sean's ruling, and the reason this is not a loop: *"`runBattle()` must
 * therefore pause after each completed round for a new strategic decision. It
 * must not loop automatically until one fleet is destroyed."*
 *
 * Every surviving ship gets **one** attack opportunity, whatever she carries.
 * All of them are worked out against the state at the start of the round and
 * applied together, so two ships that sink each other both fire — the ordinary
 * meaning of a simultaneous exchange, and the thing the removal of First
 * Strike restores.
 */
export function fightRound(
  attacker: CombatFleet,
  defender: CombatFleet,
  rng: Rng,
  config: RoundConfig = {},
): RoundReport {
  const gunnery = config.gunnery ?? standardGunnery;
  const targeting = config.targeting ?? standardTargeting;
  const report: RoundReport = { attacks: [], sunk: [], over: false };

  // Worked out first, applied after: that is what makes the round simultaneous.
  const volleys: Array<{ shooter: CombatShip; target: CombatShip; amount: number }> = [];
  for (const [side, foe] of [
    [attacker, defender],
    [defender, attacker],
  ] as const) {
    for (const shooter of survivors(side)) {
      const target = targeting.pick(shooter, survivors(foe), rng);
      if (!target) continue;
      volleys.push({ shooter, target, amount: gunnery.attack(shooter.stats.firepower, rng) });
    }
  }

  for (const volley of volleys) {
    const dealt = damage(volley.target, volley.amount);
    report.attacks.push({
      attackerId: volley.shooter.id,
      targetId: volley.target.id,
      hit: volley.amount > 0,
      damage: dealt,
    });
    if (!isAfloat(volley.target) && !report.sunk.includes(volley.target.id)) {
      report.sunk.push(volley.target.id);
    }
  }

  report.over = survivors(attacker).length === 0 || survivors(defender).length === 0;
  return report;
}

/* ----------------------------------------------------------------- fleeing */

/**
 * How many times a retreating ship can be fired on, by her Speed.
 *
 * The ruling's table, exactly. A range is rolled; a single figure is certain.
 * Speed 10 is clean away.
 */
export const RETREAT_EXPOSURE: Record<number, readonly [number, number]> = {
  10: [0, 0],
  9: [0, 1],
  8: [1, 1],
  7: [1, 1],
  6: [1, 2],
  5: [2, 2],
  4: [2, 2],
  3: [2, 3],
  2: [3, 3],
  1: [3, 4],
};

export function retreatAttacksFor(speed: number, rng: Rng): number {
  const band = RETREAT_EXPOSURE[Math.max(1, Math.min(10, Math.round(speed)))];
  if (!band) return 0;
  const [low, high] = band;
  return high > low ? low + rng.int(high - low + 1) : low;
}

export interface FleeReport {
  /** Every shot the pursuers got, in order. */
  attacks: AttackRecord[];
  sunk: string[];
  /** False when nobody in the pursuing fleet carries Long Guns. */
  pursued: boolean;
}

/**
 * Breaking off, which always works.
 *
 * Sean's ruling: *"Flee always succeeds. It does not roll for success and does
 * not begin another normal combat round."* What it costs is retreat fire, and
 * only from hulls that carry Long Guns — *"If the pursuing fleet has no Long
 * Guns, the retreating fleet takes no retreat fire."*
 *
 * Each shot is the ordinary 75% at half Firepower. Combat ends afterwards
 * whatever the result: there is no round after a flee.
 */
export function resolveFlee(
  fleeing: CombatFleet,
  pursuing: CombatFleet,
  rng: Rng,
  config: RoundConfig = {},
): FleeReport {
  const gunnery = config.gunnery ?? standardGunnery;
  const report: FleeReport = { attacks: [], sunk: [], pursued: false };

  const pursuers = survivors(pursuing).filter((s) => s.stats.hasLongGuns);
  if (pursuers.length === 0) return report;
  report.pursued = true;

  /*
   * Exposure is a property of the ship running, not of the ship chasing: the
   * table is read off the *retreating* hull's Speed. Where more pursuers carry
   * Long Guns than a ship has exposure, the extra guns find nothing to shoot
   * at — she is simply out of range that quickly.
   */
  let next = 0;
  for (const runner of survivors(fleeing)) {
    const shots = retreatAttacksFor(runner.stats.speed, rng);
    for (let i = 0; i < shots; i++) {
      const pursuer = pursuers[next % pursuers.length];
      next += 1;
      const amount = gunnery.attack(pursuer.stats.firepower * LONG_GUN_SHARE, rng);
      const dealt = damage(runner, amount);
      report.attacks.push({
        attackerId: pursuer.id,
        targetId: runner.id,
        hit: amount > 0,
        damage: dealt,
      });
      if (!isAfloat(runner)) {
        if (!report.sunk.includes(runner.id)) report.sunk.push(runner.id);
        break; // no point shooting a wreck
      }
    }
  }
  return report;
}

/* -------------------------------------------------------- how it is going */

/** The five bands, best to worst. */
export const ASSESSMENTS = [
  'OVERWHELMINGLY FAVORABLE',
  'FAVORABLE',
  'EVEN',
  'UNFAVORABLE',
  'DESPERATE',
] as const;
export type Assessment = (typeof ASSESSMENTS)[number];

/**
 * What a fleet has left to fight with.
 *
 * §8: *"Do not reduce a fleet to one giant combat power number... The fleet's
 * combat capability emerges from total surviving Firepower and total surviving
 * Hull."* So this is not a stat anything stores or shows — it is computed from
 * the survivors when somebody asks how it is going, and losing a ship lowers
 * it because that ship's firepower and hull have gone with her.
 */
export function fightingStrength(fleet: CombatFleet): { firepower: number; hull: number } {
  return survivors(fleet).reduce(
    (total, s) => ({
      firepower: total.firepower + s.stats.firepower,
      hull: total.hull + s.hullRemaining,
    }),
    { firepower: 0, hull: 0 },
  );
}

/**
 * How a side reads its own position, after a round. §16.
 *
 * *"After every round, provide a simple assessment using relative surviving
 * combat strength... Do not reveal the exact mathematical probability."*
 *
 * The doc gives the five bands and the basis; it does not give the cut points,
 * so `ASSESSMENT_CUTS` is an inference and says so. Everything else here is
 * ruled: the comparison is surviving firepower against surviving firepower and
 * hull against hull, and the player is shown a word rather than a number.
 */
export interface AssessmentModel {
  assess(mine: CombatFleet, theirs: CombatFleet): Assessment;
}

/**
 * Where one band ends and the next begins, as a ratio of my strength to
 * theirs. **Inferred, not ruled.**
 */
export const ASSESSMENT_CUTS = {
  overwhelming: 2.0,
  favorable: 1.25,
  even: 0.8,
  unfavorable: 0.4,
} as const;

export const standardAssessment: AssessmentModel = {
  assess(mine, theirs) {
    const us = fightingStrength(mine);
    const them = fightingStrength(theirs);
    // Firepower says whether I can win; hull says how long I last. Neither
    // alone answers "how is it going", so the ratio is of their product.
    const ours = us.firepower * us.hull;
    const other = them.firepower * them.hull;
    if (ours <= 0) return 'DESPERATE';
    if (other <= 0) return 'OVERWHELMINGLY FAVORABLE';
    const ratio = ours / other;
    if (ratio >= ASSESSMENT_CUTS.overwhelming) return 'OVERWHELMINGLY FAVORABLE';
    if (ratio >= ASSESSMENT_CUTS.favorable) return 'FAVORABLE';
    if (ratio >= ASSESSMENT_CUTS.even) return 'EVEN';
    if (ratio >= ASSESSMENT_CUTS.unfavorable) return 'UNFAVORABLE';
    return 'DESPERATE';
  },
};

/**
 * Whether the enemy breaks off, at the same decision point as the player.
 *
 * Sean's ruling: *"The enemy evaluates its position after every completed
 * round, at the same decision point as the player... `DESPERATE`: flee."*
 * Everything else fights on. No random flee probability, and mission-specific
 * fight-to-the-death behaviour is explicitly out of the base engine.
 */
export function enemyWillFlee(
  theirs: CombatFleet,
  mine: CombatFleet,
  assessment: AssessmentModel = standardAssessment,
): boolean {
  return assessment.assess(theirs, mine) === 'DESPERATE';
}
