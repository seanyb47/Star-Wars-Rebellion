/**
 * Naval combat, the way the locked rules describe it: one attack per cannon.
 *
 * This replaces nothing yet — `round.ts` is still what a battle runs on. It is
 * the engine the canonical roster was designed against, and until it exists
 * the roster cannot be wired in, because the two are the same design read from
 * opposite ends. A Majestic has 104 guns and 13,900 hull for exactly one
 * reason: every one of those guns rolls, and a hull has to be able to absorb
 * a hundred rolls without evaporating. Divide those numbers down to fit an
 * engine that fires once per hull and the rating letters beside them stop
 * measuring anything.
 *
 * The rules are quoted from `combatRules` in `src/data/combat-ships.json`,
 * which is marked LOCKED and read out of the Naval Combat System v3 document
 * of 19 September. Where this file makes a decision the document does not, it
 * says so in a comment beginning **Not in the spec**. There are four of those
 * and they are all small; everything else here is the document.
 *
 * The headline, and the reason this is a rewrite rather than a tuning pass:
 *
 * > There is no ship-level Firepower stat. Every individual cannon makes its
 * > own attack using the rules for its gun type.
 *
 * And the one that supersedes the old tuning outright — the sheet's own words,
 * against the `SHIP_ROLES` comment in `constants.ts` that has a fleet action
 * over in one to three rounds:
 *
 * > Mirrors average about 8 internal rounds and capital duels 7-10; evenly
 * > matched battles resolve in a handful of player-visible Exchanges. This
 * > replaces the older sheet's '1-3 Combat Exchanges' line.
 */
import type { Rng } from './rng';
import type { CombatantType, ShipSize, SpeedCategory } from './shipdefs';

/* ------------------------------------------------------------- the three guns */

/** Long, Heavy and Light. The weapon system is these three and nothing else. */
export type GunKind = 'Long' | 'Heavy' | 'Light';

export const GUN_KINDS: readonly GunKind[] = ['Long', 'Heavy', 'Light'];

/**
 * What each kind throws, what it gets through armor, and what it adds to the
 * hit roll before the target is looked at.
 *
 * Long's penetration is the one number with a story on it. The sheet:
 *
 * > 25% in v3, down from Heavy's own 50%: 'Armor-cracking is Heavy's
 * > signature alone.' First strike, and the only guns that fire on a fleeing
 * > fleet.
 */
export const GUNS: Record<GunKind, { dice: number; penetration: number; accuracy: number }> = {
  // Two twenty-sided dice, no armor help, and the first shot of the round.
  Long: { dice: 2, penetration: 0.25, accuracy: 0 },
  // Four dice and half the target's armor ignored: the armor-cracker.
  Heavy: { dice: 4, penetration: 0.5, accuracy: 0 },
  // Two dice, nothing through armor, and the easiest gun in the game to aim.
  Light: { dice: 2, penetration: 0, accuracy: 10 },
};

/** How many guns of each kind a hull carries. */
export interface GunLine {
  long: number;
  heavy: number;
  light: number;
}

export const gunCount = (guns: GunLine, kind: GunKind): number =>
  kind === 'Long' ? guns.long : kind === 'Heavy' ? guns.heavy : guns.light;

export const totalGuns = (guns: GunLine): number => guns.long + guns.heavy + guns.light;

/* ---------------------------------------------------------------- accuracy */

const ACCURACY_BASE = 75;
const ACCURACY_MIN = 10;
const ACCURACY_MAX = 95;

/**
 * What each gun makes of a target of that size.
 *
 * > Heavy accuracy is contextual: average against intended large targets, poor
 * > against small/fast targets.
 *
 * Which is the whole of why a first-rate cannot swat sloops, and why a fleet
 * of nothing but capitals is a fleet with a hole in it.
 */
const VS_SIZE: Record<GunKind, Record<ShipSize, number>> = {
  Light: { Small: 0, Medium: 0, Large: 0, Gigantic: 0 },
  Long: { Small: -10, Medium: -5, Large: 0, Gigantic: 10 },
  Heavy: { Small: -30, Medium: -15, Large: 0, Gigantic: 15 },
};

/** And of a target moving at that speed. The read is the TARGET's, both times. */
const VS_SPEED: Record<GunKind, Record<SpeedCategory, number>> = {
  // **Not in the spec** (1 of 4): the tables are written for the four speeds a
  // hull can have, and say nothing about 'None'. Nothing in the roster is
  // None — it is there for a shore battery, which does not move and should be
  // the easiest thing in the world to hit. It is given Slow's column, which is
  // the most generous the table goes, rather than a number invented for it.
  Light: { None: 5, Slow: 5, Normal: 0, Fast: -10, 'Very Fast': -20 },
  Long: { None: 5, Slow: 5, Normal: 0, Fast: -15, 'Very Fast': -25 },
  Heavy: { None: 10, Slow: 10, Normal: 0, Fast: -20, 'Very Fast': -35 },
};

/**
 * The chance one cannon of this kind tells against that hull, as a percentage.
 *
 * > CLAMP(75 + gun base modifier + gun-vs-Size modifier + gun-vs-Speed
 * > modifier, 10, 95)
 */
export function hitChance(kind: GunKind, target: { size: ShipSize; speed: SpeedCategory }): number {
  const raw = ACCURACY_BASE + GUNS[kind].accuracy + VS_SIZE[kind][target.size] + VS_SPEED[kind][target.speed];
  return Math.min(ACCURACY_MAX, Math.max(ACCURACY_MIN, raw));
}

/* -------------------------------------------------------------------- armor */

/**
 * What is left of a hull's armor once this kind of gun has had its share.
 *
 * > CEILING(Target Armor x (1 - Armor Penetration))
 */
export function effectiveArmor(kind: GunKind, armor: number): number {
  return Math.ceil(armor * (1 - GUNS[kind].penetration));
}

/**
 * The consequence the sheet spells out, and the reason armor is a wall rather
 * than a slope:
 *
 * > Light Guns cannot meaningfully hurt Armor 21+, so brig swarms bounce off
 * > ships of the line; and Armor 25 against 29 differs little under Heavy
 * > fire, so hull is what carries a capital.
 */

/* ------------------------------------------------- what a shot is worth, on average */

/**
 * The distribution of NdN20, as a table of probabilities indexed by total.
 *
 * Built once. It is wanted for the targeting maths, which asks what a gun is
 * expected to get through a given armor — and that expectation has to be
 * exact, because the whole allocation rule is a comparison of small numbers
 * and an approximation would quietly reorder the priorities.
 */
function diceDistribution(dice: number): number[] {
  let dist = [1];
  for (let d = 0; d < dice; d++) {
    const next = new Array<number>(dist.length + 20).fill(0);
    for (let total = 0; total < dist.length; total++) {
      const p = dist[total];
      if (p === 0) continue;
      for (let face = 1; face <= 20; face++) next[total + face] += p / 20;
    }
    dist = next;
  }
  return dist;
}

const DISTRIBUTION: Record<GunKind, number[]> = {
  Long: diceDistribution(GUNS.Long.dice),
  Heavy: diceDistribution(GUNS.Heavy.dice),
  Light: diceDistribution(GUNS.Light.dice),
};

const expectedCache = new Map<string, number>();

/**
 * What one cannon of this kind is expected to put through that armor, counting
 * the misses — `Hit Chance x expected post-armor damage`, which is the
 * sheet's own `expectedDamage`.
 *
 * Note what this returns when a Light gun looks at Armor 25: a hair over
 * nothing, because only a roll of 26 or better on 2d20 gets anything through
 * at all and the most it can be is fourteen. The sheet's rule is that the gun
 * fires anyway —
 *
 * > EVERY GUN ALWAYS FIRES at its highest-priority target. There is no
 * > 'cannot penetrate' exclusion: a gun that gets nothing through scores zero
 * > and so ranks last on its own.
 *
 * — so this is never used to hold fire, only to order the targets.
 */
export function expectedDamage(
  kind: GunKind,
  target: { size: ShipSize; speed: SpeedCategory; armor: number },
): number {
  const armor = effectiveArmor(kind, target.armor);
  const key = `${kind}:${armor}:${target.size}:${target.speed}`;
  const seen = expectedCache.get(key);
  if (seen !== undefined) return seen;
  const dist = DISTRIBUTION[kind];
  let perHit = 0;
  for (let total = 0; total < dist.length; total++) {
    if (dist[total] === 0) continue;
    perHit += dist[total] * Math.max(0, total - armor);
  }
  const value = (hitChance(kind, target) / 100) * perHit;
  expectedCache.set(key, value);
  return value;
}

/* --------------------------------------------------------------- the ships */

/**
 * A hull in a fight: what it was designed as, and what is left of it.
 *
 * Deliberately not `ShipDefinition` plus a number. A fort has no research step
 * and no build cost and should still be able to stand in a line of battle, and
 * a creature has neither and a temper besides. This is the part of a ship the
 * guns care about and nothing else.
 */
export interface Fighter {
  readonly id: string;
  readonly name: string;
  readonly size: ShipSize;
  readonly speed: SpeedCategory;
  readonly armor: number;
  readonly guns: GunLine;
  readonly combatantType: CombatantType;
  /** What it had whole, for the report's percentages. */
  readonly wholeHull: number;
  /** What is left. Zero is sunk. */
  hull: number;
}

export const afloat = (f: Fighter): boolean => f.hull > 0;

/**
 * What this hull threatens on its next volley.
 *
 * > Estimate the target's next-volley weapon output from its surviving
 * > individual cannons.
 *
 * **Not in the spec** (2 of 4): against *what*. Expected damage needs a target
 * and the thing being scored here is a target itself, so there is no honest
 * answer that does not pick an arbitrary victim. This takes the raw dice a
 * hull throws — mean roll times gun count, before anybody's armor — which is
 * a threat estimate rather than a prediction, is stable whoever is looking,
 * and orders hulls by weight of shot in the way the rule plainly intends.
 */
export function threatOf(f: Fighter): number {
  let weight = 0;
  for (const kind of GUN_KINDS) {
    // The mean of NdN20 is dice * 10.5.
    weight += gunCount(f.guns, kind) * GUNS[kind].dice * 10.5;
  }
  return weight;
}

/* ------------------------------------------------------------- the targeting */

/** One cannon, ready to be pointed at something. */
interface Shot {
  kind: GunKind;
  /** The hull firing it, so a sunk ship's guns can be pulled before they go off. */
  from: Fighter;
}

/**
 * Point every gun in a phase at something, before a die is rolled.
 *
 * > Assign targets before rolling attacks. Long Guns optimize separately in
 * > Phase 1; Light and Heavy Guns optimize together in Phase 2.
 *
 * The rule in four lines: score every live enemy by `Target Threat / Expected
 * Shots to Kill`, give the next cannon to the best score, remember what that
 * cannon is expected to do to it, and once a target has an expected kill's
 * worth of damage booked against it, stop assigning to it and score again.
 * That last clause is the whole of the overkill control, and it is why a
 * squadron spreads its fire instead of emptying itself into one frigate.
 */
function assign(shots: Shot[], enemies: Fighter[], rng: Rng): Array<{ shot: Shot; at: Fighter }> {
  const live = enemies.filter(afloat);
  if (live.length === 0) return [];

  // Booked damage per target, so an expected kill can be seen coming.
  const booked = new Map<Fighter, number>();
  for (const target of live) booked.set(target, 0);

  const orders: Array<{ shot: Shot; at: Fighter }> = [];
  for (const shot of shots) {
    // Armed targets are dealt with before the transports.
    //
    // > Transports with zero guns remain valid targets but are considered
    // > only after armed targets are handled.
    const armed = live.filter((t) => t.combatantType === 'Warship' && booked.get(t)! < t.hull);
    const spare = live.filter((t) => booked.get(t)! < t.hull);
    let pool = armed.length > 0 ? armed : spare;
    // Everything afloat already has a kill booked against it: the phase has
    // more guns than it has work, so the rest fire into what is still there
    // rather than standing down.
    if (pool.length === 0) pool = live;

    let best: Fighter | undefined;
    let bestScore = -Infinity;
    for (const target of pool) {
      const per = expectedDamage(shot.kind, target);
      const left = Math.max(1, target.hull - booked.get(target)!);
      // > CEILING(Remaining Hull / Expected Damage per shot)
      //
      // A gun that cannot get through takes infinitely many shots to kill and
      // so scores zero, which is the sheet's "ranks last on its own".
      const shotsToKill = per > 0 ? Math.ceil(left / per) : Infinity;
      const score = shotsToKill === Infinity ? 0 : threatOf(target) / shotsToKill;
      // > Break equal priority scores randomly to prevent perfectly
      // > repetitive battles.
      const jittered = score * (1 + (rng.next() - 0.5) * 1e-6) + rng.next() * 1e-9;
      if (jittered > bestScore) {
        bestScore = jittered;
        best = target;
      }
    }
    if (!best) break;
    orders.push({ shot, at: best });
    booked.set(best, booked.get(best)! + expectedDamage(shot.kind, best));
  }
  return orders;
}

/* ----------------------------------------------------------------- the firing */

/**
 * Roll one cannon at one hull and return what gets through. Zero on a miss.
 *
 * `edge` is the one thing here the locked rules do not describe, and it is not
 * an invention of this file: the game has always given a well-handled squadron
 * more out of the same guns, and it has always been a multiplier on the chance
 * of a hit. It multiplies the table's percentage and is clamped by the table's
 * own ceiling, so the best captain in the world still cannot do better than
 * ninety-five.
 */
export function fireCannon(
  kind: GunKind,
  target: Fighter,
  rng: Rng,
  penetration?: number,
  edge = 1,
): number {
  const chance = Math.min(ACCURACY_MAX, hitChance(kind, target) * edge);
  if (rng.next() * 100 >= chance) return 0;
  let roll = 0;
  for (let d = 0; d < GUNS[kind].dice; d++) roll += rng.range(1, 20);
  const pen = penetration ?? GUNS[kind].penetration;
  const armor = Math.ceil(target.armor * (1 - pen));
  // > MAX(0, Rolled Damage - Effective Armor)
  return Math.max(0, roll - armor);
}

/** Every gun of these kinds, on every hull of this side still afloat. */
function gunsOf(side: Fighter[], kinds: readonly GunKind[]): Shot[] {
  const shots: Shot[] = [];
  for (const ship of side) {
    if (!afloat(ship)) continue;
    for (const kind of kinds) {
      for (let n = 0; n < gunCount(ship.guns, kind); n++) shots.push({ kind, from: ship });
    }
  }
  return shots;
}

/**
 * One phase: both sides assign, both sides roll, and only then does anything
 * sink.
 *
 * Simultaneity is the point and it is stated twice in the rules — once for
 * each phase. A ship that is going to die this phase still fires, which is
 * what stops the side that wins initiative from winning everything.
 */
function phase(
  a: Fighter[],
  b: Fighter[],
  kinds: readonly GunKind[],
  rng: Rng,
  edge: { a: number; b: number },
): void {
  const orders = [
    ...assign(gunsOf(a, kinds), b, rng).map((o) => ({ ...o, edge: edge.a })),
    ...assign(gunsOf(b, kinds), a, rng).map((o) => ({ ...o, edge: edge.b })),
  ];
  const dealt = new Map<Fighter, number>();
  for (const { shot, at, edge: hand } of orders) {
    // A hull sunk earlier in this same phase does not fire — but it only
    // stops firing once the damage is applied, which is after the loop. So
    // this checks nothing, deliberately: everything assigned, fires.
    const through = fireCannon(shot.kind, at, rng, undefined, hand);
    if (through > 0) dealt.set(at, (dealt.get(at) ?? 0) + through);
  }
  for (const [target, damage] of dealt) target.hull = Math.max(0, target.hull - damage);
}

export interface ExchangeResult {
  /** Internal rounds fought. The sheet expects about eight in a mirror. */
  rounds: number;
  /** Why it stopped. */
  ended: 'threshold' | 'destroyed';
  /** Hull each side had when the exchange opened. */
  opened: { a: number; b: number };
  /** And what is left of it. */
  closed: { a: number; b: number };
}

const sumHull = (side: Fighter[]) => side.reduce((n, f) => n + f.hull, 0);

/**
 * One Combat Exchange: what the player sees as a single press of Attack.
 *
 * > The player chooses Attack/Fight. Snapshot each side's current total Hull,
 * > then resolve consecutive internal combat rounds until either side has lost
 * > at least 30% of that starting snapshot or a fleet is destroyed.
 *
 * So an Exchange is a decision point rather than a round, and the eight rounds
 * inside it are the engine's business. That is the shape the old system never
 * had: it asked the player to confirm a battle and then fought the whole
 * thing, which is why a fleet action could not be broken off halfway.
 */
export function exchange(
  a: Fighter[],
  b: Fighter[],
  rng: Rng,
  roundCap = 100,
  edge: { a: number; b: number } = { a: 1, b: 1 },
): ExchangeResult {
  const opened = { a: sumHull(a), b: sumHull(b) };
  const floor = { a: opened.a * (1 - EXCHANGE_STOP_SHARE), b: opened.b * (1 - EXCHANGE_STOP_SHARE) };
  let rounds = 0;
  let ended: 'threshold' | 'destroyed' = 'threshold';
  while (rounds < roundCap) {
    // > Long Guns resolve before Light and Heavy Guns ... Ships sunk by Long
    // > Guns are removed before Phase 2 and do not fire Light or Heavy Guns.
    phase(a, b, ['Long'], rng, edge);
    phase(a, b, ['Light', 'Heavy'], rng, edge);
    rounds += 1;
    // > After the complete round, test the 30% Combat Exchange stop condition.
    const now = { a: sumHull(a), b: sumHull(b) };
    if (now.a <= 0 || now.b <= 0) {
      ended = 'destroyed';
      break;
    }
    if (now.a <= floor.a || now.b <= floor.b) break;
  }
  return { rounds, ended, opened, closed: { a: sumHull(a), b: sumHull(b) } };
}

/** > exchangeStopShare: 0.3 */
export const EXCHANGE_STOP_SHARE = 0.3;

/* ------------------------------------------------------------------ running */

/** The order the speeds get away in, quickest first. */
const ESCAPE_ORDER: SpeedCategory[] = ['Very Fast', 'Fast', 'Normal', 'Slow'];

export interface RetreatResult {
  /** Who got away, and who did not. */
  escaped: Fighter[];
  lost: Fighter[];
  /** Hull taken across the whole withdrawal. */
  damage: number;
}

/**
 * Breaking off, which always works and is never free.
 *
 * > FLEE never fails and never forces an additional normal round.
 * > Only enemy LONG GUNS reach a fleet already under way. A pursuer with none
 * > watches them go.
 * > Up to four sequential volleys with escapes between them. Volley 1 fires at
 * > ALL fleeing ships, damage resolves, status updates, and surviving Very
 * > Fast ships escape; volley 2 releases Fast; volley 3 Normal; volley 4 Slow.
 * > Retreat attacks IGNORE ARMOR — 100% penetration, raking fire down the
 * > exposed stern.
 *
 * The armor clause is what makes running from a line of battle frightening
 * rather than merely expensive, and the sheet has already measured what it
 * costs: nothing at all in the early game because nobody has a long gun yet,
 * about a sixth of a fleet's hull in the middle of one, and a lone fleeing
 * Majestic getting on for half. There is a dial on it if that proves too
 * cruel — fifty per cent penetration instead of a hundred — and it is named
 * in the data rather than here.
 */
export function retreat(fleeing: Fighter[], pursuing: Fighter[], rng: Rng): RetreatResult {
  const exposed = fleeing.filter(afloat);
  const escaped: Fighter[] = [];
  let damage = 0;

  for (const releasing of ESCAPE_ORDER) {
    const still = exposed.filter((f) => afloat(f) && !escaped.includes(f));
    if (still.length === 0) break;
    // > Every surviving pursuing Long Gun fires in every volley, and targets
    // > are re-assigned among the still-exposed ships each time.
    const orders = assign(gunsOf(pursuing, ['Long']), still, rng);
    const dealt = new Map<Fighter, number>();
    for (const { shot, at } of orders) {
      // Penetration forced to 1: the stern rake ignores armor outright.
      const through = fireCannon(shot.kind, at, rng, 1);
      if (through > 0) dealt.set(at, (dealt.get(at) ?? 0) + through);
    }
    for (const [target, hit] of dealt) {
      const taken = Math.min(target.hull, hit);
      target.hull -= taken;
      damage += taken;
    }
    // > ... and surviving Very Fast ships escape.
    for (const ship of still) if (ship.speed === releasing && afloat(ship)) escaped.push(ship);
  }

  // **Not in the spec** (3 of 4): a hull of speed 'None' cannot be released by
  // any of the four volleys, so it would sit under fire forever if the loop
  // ran on. It does not — there are only four volleys — and anything still
  // exposed at the end has simply got away last, which is what happens to the
  // Slow column anyway.
  for (const ship of exposed) if (afloat(ship) && !escaped.includes(ship)) escaped.push(ship);

  return { escaped, lost: exposed.filter((f) => !afloat(f)), damage };
}

/**
 * **Not in the spec** (4 of 4): guns do not thin as a hull is shot to pieces.
 *
 * The targeting rule says to estimate threat "from its surviving individual
 * cannons", which reads as though a battered ship throws less — but the sheet
 * also says component damage "has not yet been defined in the roster and is
 * excluded from the initial simulator", and there is no rule anywhere for how
 * a hull loses a gun. So a ship fires its full broadside until it sinks, and
 * "surviving" is taken to mean surviving *ships*. When component damage is
 * defined, this is the line it changes.
 */
