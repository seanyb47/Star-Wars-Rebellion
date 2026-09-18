/**
 * Naval combat, per the **locked** Combat Rules of the Fleet Roster sheet
 * (read from Drive 18 September, revision 21:48).
 *
 * This supersedes the *7 Seas — Naval Combat System* document of the same
 * morning, and reverses two of its removals. The sheet opens with the sentence
 * the whole model hangs on:
 *
 * > *"There is no ship-level Firepower stat. Every individual cannon makes its
 * > own attack using the rules for its gun type."*
 *
 * Which dissolves the blocking item rather than answering it. There was never
 * a Firepower number to derive, Speed stays a category rather than becoming
 * 1–10, and the roster's three gun columns **are** the combat inputs.
 *
 * ## The model
 *
 * - **A cannon is the unit of action.** Ten guns are ten attacks, each with its
 *   own d100 to hit and its own damage dice.
 * - **Three gun kinds**, and they differ in all three of dice, penetration and
 *   accuracy: Light 2d20 / 0% / +10, Heavy 4d20 / 50% / ±0, Long 2d20 / 50% /
 *   ±0.
 * - **Armor is back**, as a flat subtraction after penetration:
 *   `effective = ceil(armor × (1 − pen))`, `damage = max(0, rolled −
 *   effective)`. So Armor 25 stops a 25-damage Light hit dead and takes 13 off
 *   the same roll from a Heavy.
 * - **First Strike is back**, as the shape of the round rather than a flag:
 *   Long Guns are Phase 1 and resolve before anything else fires, and a hull
 *   they sink never gets its Light and Heavy guns away.
 * - **Accuracy is a matrix, not a triangle.** What a gun hits depends on the
 *   *target's* Size and Speed, and the three kinds read them very differently
 *   — a Heavy Gun is −30 against Small and +15 against Gigantic, which is the
 *   whole reason a first-rate cannot swat sloops.
 * - **A Combat Exchange is what the player sees.** One press of Fight runs
 *   internal rounds until a side has lost 30% of the hull it started the
 *   Exchange with, then stops and asks again.
 * - **Flee always succeeds**, and only surviving **Long Guns** get a parting
 *   shot at it.
 *
 * Still gone, and not by omission: boarding, a size-class damage triangle,
 * retreat probability, morale, formation, and any notion of ship-level
 * Firepower.
 *
 * Pure. No React, no game state, no imports but the RNG and the roster's
 * vocabulary — so `lab/navyduel.ts` can run five thousand of these a matchup
 * without a screen existing.
 */
import type { Rng } from './rng';
import type { CombatantType, ShipArmament, ShipSize, SpeedCategory } from './shipdefs';

/* ---------------------------------------------------------------- the guns */

export const GUN_KINDS = ['Long', 'Heavy', 'Light'] as const;
export type GunKind = (typeof GUN_KINDS)[number];

export interface GunProfile {
  /** How many d20 one cannon rolls. */
  readonly dice: number;
  /** The share of the target's armor it ignores. */
  readonly penetration: number;
  /** Percentage points added to the base hit chance. */
  readonly accuracy: number;
}

/**
 * The three cannons, exactly as the sheet writes them.
 *
 * Read them together and the design is legible: a Light Gun is the accurate
 * one that cannot get through armor, a Heavy Gun is the one that hits hardest
 * and misses most, and a Long Gun is a Light Gun's dice with a Heavy Gun's
 * penetration — which is why it is a midgame milestone and why it is the only
 * thing that fires first and the only thing that reaches a fleeing hull.
 */
export const GUNS: Record<GunKind, GunProfile> = {
  Long: { dice: 2, penetration: 0.5, accuracy: 0 },
  Heavy: { dice: 4, penetration: 0.5, accuracy: 0 },
  Light: { dice: 2, penetration: 0, accuracy: 10 },
};

/** The die every cannon rolls, however many of them it rolls. */
export const DAMAGE_DIE = 20;

/* ------------------------------------------------------------- the accuracy */

export const BASE_HIT_CHANCE = 75;
export const HIT_FLOOR = 10;
export const HIT_CEILING = 95;

/**
 * What a gun kind makes of a target's size.
 *
 * Sean's stated intent: *"Heavy accuracy is contextual: average against
 * intended large targets, poor against small/fast targets."* A Light Gun does
 * not care how big you are; a Long Gun mildly does; a Heavy Gun cares enormously.
 */
export const GUN_VS_SIZE: Record<GunKind, Record<ShipSize, number>> = {
  Light: { Small: 0, Medium: 0, Large: 0, Gigantic: 0 },
  Long: { Small: -10, Medium: -5, Large: 0, Gigantic: 10 },
  Heavy: { Small: -30, Medium: -15, Large: 0, Gigantic: 15 },
};

/**
 * And what it makes of a target's speed.
 *
 * `None` is not in the sheet's matrix because no hull in the roster has it. It
 * is read as Slow here — a thing that cannot move is at least as easy to hit
 * as a thing that moves badly — and flagged rather than left to crash.
 */
export const GUN_VS_SPEED: Record<GunKind, Record<SpeedCategory, number>> = {
  Light: { None: 5, Slow: 5, Normal: 0, Fast: -10, 'Very Fast': -20 },
  Long: { None: 5, Slow: 5, Normal: 0, Fast: -15, 'Very Fast': -25 },
  Heavy: { None: 10, Slow: 10, Normal: 0, Fast: -20, 'Very Fast': -35 },
};

/* -------------------------------------------------------------- the shapes */

/**
 * The whole of what combat reads about a hull.
 *
 * Narrower than `ShipDefinition` on purpose — combat has no business knowing
 * what a ship costs or how long she takes to build — but a `ShipDefinition`
 * satisfies it structurally, so no adapter and no conversion step stands
 * between the roster and the guns. That is the point of there being no
 * Firepower stat.
 */
export interface CombatStats {
  readonly size: ShipSize;
  readonly speed: SpeedCategory;
  readonly guns: ShipArmament;
  readonly armor: number;
  readonly hull: number;
  readonly combatantType: CombatantType;
}

/** One hull in one battle: what she is, and what she has left. */
export interface CombatShip {
  readonly id: string;
  readonly stats: CombatStats;
  hullRemaining: number;
}

export type Fleet = CombatShip[];

export function commission(id: string, stats: CombatStats): CombatShip {
  return { id, stats, hullRemaining: stats.hull };
}

export const afloat = (ship: CombatShip): boolean => ship.hullRemaining > 0;
export const survivors = (fleet: Fleet): Fleet => fleet.filter(afloat);

/** How many cannon of a kind a hull still works. Guns do not degrade. */
export function gunsOfKind(ship: CombatShip, kind: GunKind): number {
  const { longGuns, heavyGuns, lightGuns } = ship.stats.guns;
  return kind === 'Long' ? longGuns : kind === 'Heavy' ? heavyGuns : lightGuns;
}

/** Whether she can shoot at all — what makes her a priority target. */
export function isArmed(ship: CombatShip): boolean {
  const { longGuns, heavyGuns, lightGuns } = ship.stats.guns;
  return longGuns + heavyGuns + lightGuns > 0;
}

/* ------------------------------------------------------------ the arithmetic */

/** `CLAMP(75 + gun base + gun-vs-Size + gun-vs-Speed, 10, 95)`, on the target. */
export function hitChance(kind: GunKind, target: CombatStats): number {
  const raw =
    BASE_HIT_CHANCE + GUNS[kind].accuracy + GUN_VS_SIZE[kind][target.size] + GUN_VS_SPEED[kind][target.speed];
  return Math.min(HIT_CEILING, Math.max(HIT_FLOOR, raw));
}

/** `CEILING(Armor × (1 − penetration))`, rounded up before it is subtracted. */
export function effectiveArmor(kind: GunKind, target: CombatStats): number {
  return Math.ceil(target.armor * (1 - GUNS[kind].penetration));
}

/**
 * The distribution of `n` d20, as `sum → probability`.
 *
 * Built once per die count and cached. It exists so that expected damage is
 * the *true* expectation over the dice rather than `max(0, mean − armor)`,
 * which is a different and much rosier number the moment armor bites: 2d20
 * against effective armor 20 averages 3.4 a shot, where the naive form says
 * 1.0. Targeting that cannot tell those apart picks the wrong ship.
 */
const DICE_PMF = new Map<number, Map<number, number>>();
function pmfOf(dice: number): Map<number, number> {
  const cached = DICE_PMF.get(dice);
  if (cached) return cached;
  let dist = new Map<number, number>([[0, 1]]);
  for (let d = 0; d < dice; d++) {
    const next = new Map<number, number>();
    for (const [sum, p] of dist) {
      for (let face = 1; face <= DAMAGE_DIE; face++) {
        next.set(sum + face, (next.get(sum + face) ?? 0) + p / DAMAGE_DIE);
      }
    }
    dist = next;
  }
  DICE_PMF.set(dice, dist);
  return dist;
}

/** `E[max(0, roll − armor)]` for one cannon of this kind against this target. */
const EXPECTED_CACHE = new Map<string, number>();
export function expectedDamage(kind: GunKind, target: CombatStats): number {
  const armor = effectiveArmor(kind, target);
  const key = `${kind}:${armor}`;
  const cached = EXPECTED_CACHE.get(key);
  if (cached !== undefined) return cached;
  let sum = 0;
  for (const [roll, p] of pmfOf(GUNS[kind].dice)) sum += p * Math.max(0, roll - armor);
  EXPECTED_CACHE.set(key, sum);
  return sum;
}

/** Expected damage once the chance of missing is taken into account. */
export function expectedDamagePerShot(kind: GunKind, target: CombatStats): number {
  return (hitChance(kind, target) / 100) * expectedDamage(kind, target);
}

/**
 * What a hull throws in one volley, on average, before anybody's armor.
 *
 * This is the sheet's own "Avg Raw Volley" column — 2d20 is 21 and 4d20 is 42
 * — and it is what the targeting algorithm means by a target's *threat*.
 */
export function rawVolley(ship: CombatShip): number {
  let total = 0;
  for (const kind of GUN_KINDS) total += gunsOfKind(ship, kind) * GUNS[kind].dice * ((DAMAGE_DIE + 1) / 2);
  return total;
}

/** Roll one cannon: `undefined` for a miss, otherwise the damage it lands. */
export function fireCannon(kind: GunKind, target: CombatStats, rng: Rng): number | undefined {
  // d100, and the sheet's rule is at or below, so 1..100 against the chance.
  if (rng.range(1, 100) > hitChance(kind, target)) return undefined;
  let rolled = 0;
  for (let d = 0; d < GUNS[kind].dice; d++) rolled += rng.range(1, DAMAGE_DIE);
  return Math.max(0, rolled - effectiveArmor(kind, target));
}

/* -------------------------------------------------------------- targeting */

/** One cannon, pointed at something. */
export interface Assignment {
  readonly kind: GunKind;
  readonly shooter: CombatShip;
  readonly target: CombatShip;
}

/**
 * The optimal targeting algorithm, whole.
 *
 * > *"Priority score = Target Threat ÷ Expected Shots to Kill."*
 *
 * Which reads as: remove the most dangerous thing per shot it costs to remove
 * it. Two details carry most of the behaviour.
 *
 * **Overkill control.** Expected damage already assigned to a target is
 * tracked, and once it covers her remaining hull she stops being offered, so
 * the rest of the battery spreads instead of emptying itself into a wreck.
 * When *every* target is already covered the guns still have to fire
 * somewhere, and they are allowed to pile on — that case is not in the sheet
 * and is the one inference here.
 *
 * **Viability.** A cannon that cannot get through a hull's armor scores no
 * kill at all and will not be pointed at her while anything else floats: the
 * Light Guns of a swarm simply cannot hurt a Majestic, and the algorithm knows
 * it rather than discovering it a thousand missed shots later.
 */
export function assignTargets(
  shooters: Fleet,
  enemies: Fleet,
  kinds: readonly GunKind[],
  rng: Rng,
): Assignment[] {
  const targets = survivors(enemies);
  if (targets.length === 0) return [];

  // Armed hulls first, always. A transport with no guns is a valid target and
  // is considered only once there is nothing left that can shoot back.
  const armed = targets.filter(isArmed);
  const pool = armed.length > 0 ? armed : targets;

  const assignedExpected = new Map<string, number>();
  const threat = new Map<string, number>(pool.map((t) => [t.id, rawVolley(t)] as const));

  /** Every cannon that will fire this phase, one entry each. */
  const cannons: Array<{ kind: GunKind; shooter: CombatShip }> = [];
  for (const shooter of survivors(shooters)) {
    for (const kind of kinds) {
      for (let n = 0; n < gunsOfKind(shooter, kind); n++) cannons.push({ kind, shooter });
    }
  }

  const out: Assignment[] = [];
  for (const cannon of cannons) {
    let best: CombatShip | undefined;
    let bestScore = -Infinity;
    let ties: CombatShip[] = [];
    // Two passes: prefer targets not yet covered by an expected kill, and fall
    // back to the covered ones only when there is nothing else to shoot.
    for (const onlyUncovered of [true, false]) {
      for (const target of pool) {
        const covered = (assignedExpected.get(target.id) ?? 0) >= target.hullRemaining;
        if (onlyUncovered && covered) continue;
        const per = expectedDamagePerShot(cannon.kind, target.stats);
        // Cannot penetrate: no viable-kill score, so never a first choice.
        if (per <= 0) continue;
        const shotsToKill = Math.ceil(target.hullRemaining / per);
        const score = (threat.get(target.id) ?? 0) / Math.max(1, shotsToKill);
        if (score > bestScore + 1e-9) {
          bestScore = score;
          best = target;
          ties = [target];
        } else if (Math.abs(score - bestScore) <= 1e-9) {
          ties.push(target);
        }
      }
      if (best) break;
    }
    // Nothing this cannon can hurt at all. It still fires, at the most
    // dangerous thing afloat, and achieves nothing — which is the honest
    // outcome for a sloop's battery against a wall of armor.
    if (!best) {
      best = pool.reduce((a, b) => ((threat.get(b.id) ?? 0) > (threat.get(a.id) ?? 0) ? b : a));
      ties = [best];
    }
    // *"Break equal priority scores randomly to prevent perfectly repetitive
    // battles."*
    const target = ties.length > 1 ? ties[rng.int(ties.length)] : best;
    assignedExpected.set(
      target.id,
      (assignedExpected.get(target.id) ?? 0) + expectedDamagePerShot(cannon.kind, target.stats),
    );
    out.push({ kind: cannon.kind, shooter: cannon.shooter, target });
  }
  return out;
}

/* ----------------------------------------------------------------- a round */

/** What one phase did, per side. */
export interface PhaseTally {
  shots: number;
  hits: number;
  damage: number;
}

const emptyTally = (): PhaseTally => ({ shots: 0, hits: 0, damage: 0 });

export interface SideTally {
  long: PhaseTally;
  main: PhaseTally;
  /** Ids of the enemy hulls this side sank, in the order they went. */
  sank: string[];
}

export interface RoundReport {
  a: SideTally;
  b: SideTally;
}

/**
 * Roll a set of assignments and bank the damage without applying it.
 *
 * Simultaneity is the whole reason this is two steps: within a phase every gun
 * fires against the state at the start of it, so a hull going down still gets
 * her shot away and two ships can sink each other.
 */
function volley(
  assignments: readonly Assignment[],
  pending: Map<string, number>,
  tally: PhaseTally,
  rng: Rng,
): void {
  for (const { kind, target } of assignments) {
    tally.shots += 1;
    const damage = fireCannon(kind, target.stats, rng);
    if (damage === undefined) continue;
    tally.hits += 1;
    tally.damage += damage;
    pending.set(target.id, (pending.get(target.id) ?? 0) + damage);
  }
}

/** Apply banked damage, and name whatever it sank. */
function land(fleet: Fleet, pending: Map<string, number>): string[] {
  const sank: string[] = [];
  for (const ship of fleet) {
    const damage = pending.get(ship.id);
    if (!damage) continue;
    const wasAfloat = afloat(ship);
    ship.hullRemaining = Math.max(0, ship.hullRemaining - damage);
    if (wasAfloat && !afloat(ship)) sank.push(ship.id);
  }
  return sank;
}

/**
 * One internal combat round: Phase 1 Long, then Phase 2 Light and Heavy.
 *
 * Not what the player presses. A press of Fight is a Combat Exchange, which is
 * some number of these — see `combatExchange`.
 */
export function internalRound(a: Fleet, b: Fleet, rng: Rng): RoundReport {
  const report: RoundReport = {
    a: { long: emptyTally(), main: emptyTally(), sank: [] },
    b: { long: emptyTally(), main: emptyTally(), sank: [] },
  };

  // ---- Phase 1: Long Guns, both sides, targets assigned before any dice.
  const longA = assignTargets(a, b, ['Long'], rng);
  const longB = assignTargets(b, a, ['Long'], rng);
  const ontoB = new Map<string, number>();
  const ontoA = new Map<string, number>();
  volley(longA, ontoB, report.a.long, rng);
  volley(longB, ontoA, report.b.long, rng);
  report.a.sank.push(...land(b, ontoB));
  report.b.sank.push(...land(a, ontoA));

  // Anything the first strike sank is out before it can fire its own Light and
  // Heavy guns. That is what First Strike *is* in this model.

  // ---- Phase 2: Light and Heavy together, as one firing solution.
  const mainA = assignTargets(a, b, ['Heavy', 'Light'], rng);
  const mainB = assignTargets(b, a, ['Heavy', 'Light'], rng);
  const ontoB2 = new Map<string, number>();
  const ontoA2 = new Map<string, number>();
  volley(mainA, ontoB2, report.a.main, rng);
  volley(mainB, ontoA2, report.b.main, rng);
  report.a.sank.push(...land(b, ontoB2));
  report.b.sank.push(...land(a, ontoA2));

  return report;
}

/* -------------------------------------------------------------- a exchange */

export const EXCHANGE_STOP_SHARE = 0.3;

export interface ExchangeReport {
  /** How many internal rounds it took. */
  rounds: number;
  a: SideTally;
  b: SideTally;
  /** Hull each side held when the Exchange opened. */
  snapshot: { a: number; b: number };
  /** Hull each side holds now. */
  remaining: { a: number; b: number };
  outcome: 'a-destroyed' | 'b-destroyed' | 'mutual-destruction' | 'both-stand';
}

export const totalHull = (fleet: Fleet): number =>
  fleet.reduce((n, ship) => n + Math.max(0, ship.hullRemaining), 0);

const merge = (into: SideTally, from: SideTally): void => {
  for (const phase of ['long', 'main'] as const) {
    into[phase].shots += from[phase].shots;
    into[phase].hits += from[phase].hits;
    into[phase].damage += from[phase].damage;
  }
  into.sank.push(...from.sank);
};

/**
 * One press of Fight.
 *
 * > *"Snapshot each side's current total Hull, then resolve consecutive
 * > internal combat rounds until either side has lost at least 30% of that
 * > starting snapshot or a fleet is destroyed."*
 *
 * So the pause is proportional rather than fixed: two fresh fleets trade
 * several rounds before anything has given 30%, while a battered one comes
 * back to the player almost at once. That is what makes an evenly matched
 * battle land in the one-to-three Exchanges Sean is aiming at without anybody
 * counting rounds.
 */
export function combatExchange(a: Fleet, b: Fleet, rng: Rng): ExchangeReport {
  const snapshot = { a: totalHull(a), b: totalHull(b) };
  const tally: ExchangeReport['a'] = { long: emptyTally(), main: emptyTally(), sank: [] };
  const tallyB: SideTally = { long: emptyTally(), main: emptyTally(), sank: [] };
  let rounds = 0;

  for (;;) {
    const round = internalRound(a, b, rng);
    merge(tally, round.a);
    merge(tallyB, round.b);
    rounds += 1;

    const aGone = survivors(a).length === 0;
    const bGone = survivors(b).length === 0;
    if (aGone || bGone) break;

    const lostA = snapshot.a - totalHull(a);
    const lostB = snapshot.b - totalHull(b);
    if (lostA >= snapshot.a * EXCHANGE_STOP_SHARE || lostB >= snapshot.b * EXCHANGE_STOP_SHARE) break;
    // A round in which nothing at all landed cannot be allowed to spin: two
    // fleets that genuinely cannot hurt each other would never reach 30%.
    if (round.a.long.damage + round.a.main.damage + round.b.long.damage + round.b.main.damage === 0) break;
  }

  const aGone = survivors(a).length === 0;
  const bGone = survivors(b).length === 0;
  return {
    rounds,
    a: tally,
    b: tallyB,
    snapshot,
    remaining: { a: totalHull(a), b: totalHull(b) },
    outcome:
      aGone && bGone
        ? 'mutual-destruction'
        : aGone
          ? 'a-destroyed'
          : bGone
            ? 'b-destroyed'
            : 'both-stand',
  };
}

/* ---------------------------------------------------------------- retreat */

export interface RetreatReport {
  volley: PhaseTally;
  /** Ids of the fleeing hulls that did not get away. */
  lost: string[];
  /** Everything that did. */
  escaped: string[];
}

/**
 * Break off. It always works; what it costs is the parting fire.
 *
 * Only **Long Guns** reach a fleet already under way, one attack each, at
 * their ordinary dice and penetration. A pursuer with none — a swarm of Light
 * Gun interceptors, a Blackfin — watches the enemy go and cannot touch them,
 * which is the clearest single reason to put Long Guns in a fleet.
 */
export function resolveFlee(fleeing: Fleet, pursuers: Fleet, rng: Rng): RetreatReport {
  const tally = emptyTally();
  const pending = new Map<string, number>();
  const assignments = assignTargets(pursuers, fleeing, ['Long'], rng);
  volley(assignments, pending, tally, rng);
  const lost = land(fleeing, pending);
  return {
    volley: tally,
    lost,
    escaped: survivors(fleeing).map((s) => s.id),
  };
}

/* ------------------------------------------------------------- assessment */

export const ASSESSMENTS = [
  'OVERWHELMINGLY FAVORABLE',
  'FAVORABLE',
  'EVEN',
  'UNFAVORABLE',
  'DESPERATE',
] as const;
export type Assessment = (typeof ASSESSMENTS)[number];

/**
 * The cut points, and they are **inferred**.
 *
 * The sheet says a Combat Exchange ends by displaying *"the new battle
 * assessment"* and never says what the bands are or where they fall. Five
 * bands come from the superseded document, which named them and likewise gave
 * no thresholds. So this is one constant in one place, labelled, comparing the
 * product of each side's surviving volley and surviving hull — what it can
 * still do, times how long it can keep doing it.
 */
export const ASSESSMENT_CUTS = {
  overwhelming: 2.0,
  favorable: 1.25,
  even: 0.8,
  unfavorable: 0.4,
} as const;

export function fightingStrength(fleet: Fleet): number {
  return survivors(fleet).reduce((n, ship) => n + rawVolley(ship) * ship.hullRemaining, 0);
}

export function assess(mine: Fleet, theirs: Fleet): Assessment {
  const ours = fightingStrength(mine);
  const them = fightingStrength(theirs);
  if (them <= 0) return ours > 0 ? 'OVERWHELMINGLY FAVORABLE' : 'EVEN';
  if (ours <= 0) return 'DESPERATE';
  const ratio = ours / them;
  if (ratio >= ASSESSMENT_CUTS.overwhelming) return 'OVERWHELMINGLY FAVORABLE';
  if (ratio >= ASSESSMENT_CUTS.favorable) return 'FAVORABLE';
  if (ratio >= ASSESSMENT_CUTS.even) return 'EVEN';
  if (ratio >= ASSESSMENT_CUTS.unfavorable) return 'UNFAVORABLE';
  return 'DESPERATE';
}

/** The other side breaks off only when its position is hopeless. */
export function enemyWillFlee(theirs: Fleet, mine: Fleet): boolean {
  return assess(theirs, mine) === 'DESPERATE';
}
