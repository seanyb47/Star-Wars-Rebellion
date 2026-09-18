/**
 * A ship in the water, as opposed to a ship on a drawing board.
 *
 * `shipdefs.ts` holds what a hull *is* and never changes. This holds what has
 * happened to one: how much of her is left, what she is carrying, and what
 * that adds up to calling her. The split is Sean's requirement and it is
 * absolute — a `ShipDefinition` is frozen and shared by every hull of her
 * class, a `NavyShip` is one ship and belongs to nobody else.
 *
 * ## What is deliberately not here
 *
 * The combat formulas. Sean's instruction: *"Do not invent missing combat
 * formulas. Do not assume how damage, armor mitigation, range, initiative,
 * pursuit, boarding, repairs, or victory conditions work unless those rules
 * already exist in the repository."* They do not, so what is here is the state
 * those rules will read and write, and a named placeholder wherever a rule is
 * needed to make sense of it.
 *
 * Every placeholder is marked `UNRESOLVED` and listed in
 * `docs/naval-combat-open-questions.md`. None of them guesses at a number that
 * matters: where a threshold was unavoidable it is a named constant, stated as
 * an assumption, changeable in one place.
 */
import {
  ROSTER,
  type Roster,
  type ShipDefinition,
  type ShipStatus,
} from './shipdefs';

/**
 * One ship, afloat.
 *
 * `hullRemaining` counts down rather than damage counting up, which is the
 * opposite of the live game's `Ship.damage` and is the better shape here: the
 * export gives every hull a Hull figure and a Status derived from condition,
 * and "how much is left" is the quantity both of those are about.
 *
 * Fractional on purpose. A repair rate is a percentage of the whole per day,
 * and a Swift mending one per cent of seventy is seven tenths of a point — an
 * integer hull would mend nothing for two days and then a point at once.
 */
export interface NavyShip {
  /** This hull, not her class. */
  readonly id: string;
  /** Her class, into `Roster.byId`. */
  readonly defId: string;
  hullRemaining: number;
  /** Companies aboard. Never above the class's `troopCapacity`. */
  troops: number;
}

/**
 * Where the five condition states begin and end.
 *
 * **UNRESOLVED — an assumption, not design.** The export lists Status as a
 * tier band with five names and gives no thresholds at all, so these four
 * numbers are the one place in this file where something had to be picked.
 * They are even quarters between destroyed and whole, which is the least
 * surprising reading and is trivially replaced: every caller takes them as an
 * argument, and nothing else in the system depends on their values.
 *
 * Open question for Sean: at what share of her hull is a ship Damaged, Heavily
 * Damaged, Critically Damaged? And does a status *do* anything — a gunnery
 * penalty, a speed penalty, a chance to strike — or is it a label for the
 * player?
 */
export interface StatusThresholds {
  /** At or below this fraction of whole hull, and above zero. */
  readonly critical: number;
  readonly heavy: number;
  readonly damaged: number;
}

export const HULL_STATUS_THRESHOLDS: StatusThresholds = {
  critical: 0.25,
  heavy: 0.5,
  damaged: 0.75,
};

/** Lay down a new hull of this class, whole and empty. */
export function commission(def: ShipDefinition, id: string): NavyShip {
  return { id, defId: def.id, hullRemaining: def.hull, troops: 0 };
}

/** Her class. Throws rather than returning undefined: an instance whose class
 *  has gone is a corrupt state, not a case to handle. */
export function definitionOf(ship: NavyShip, roster: Roster = ROSTER): ShipDefinition {
  const def = roster.byId.get(ship.defId);
  if (!def) throw new Error(`Ship ${ship.id} has an unknown class: ${ship.defId}`);
  return def;
}

/** How much of her is left, from 0 (gone) to 1 (untouched). */
export function hullFraction(ship: NavyShip, roster: Roster = ROSTER): number {
  const def = definitionOf(ship, roster);
  return Math.max(0, Math.min(1, ship.hullRemaining / def.hull));
}

/**
 * What to call her condition.
 *
 * A pure function of what is left, so nothing has to remember to keep a stored
 * status in step with a hull figure — the commonest way a condition system
 * goes wrong.
 */
export function statusOf(
  ship: NavyShip,
  roster: Roster = ROSTER,
  thresholds: StatusThresholds = HULL_STATUS_THRESHOLDS,
): ShipStatus {
  const left = hullFraction(ship, roster);
  if (left <= 0) return 'Destroyed';
  if (left <= thresholds.critical) return 'Critically Damaged';
  if (left <= thresholds.heavy) return 'Heavily Damaged';
  if (left <= thresholds.damaged) return 'Damaged';
  return 'Healthy';
}

export function isAfloat(ship: NavyShip, roster: Roster = ROSTER): boolean {
  return statusOf(ship, roster) !== 'Destroyed';
}

/**
 * Take hull off her, and say whether that finished her.
 *
 * The *only* mutation of condition in this system, on purpose: one door in
 * means one place for a future damage formula to call and one place to test.
 * What decides how much damage a shot does — armor, gun type, range — is not
 * here and is not guessed at. This takes a number somebody else worked out.
 */
export function applyHullDamage(ship: NavyShip, amount: number, roster: Roster = ROSTER): boolean {
  if (amount <= 0) return !isAfloat(ship, roster);
  ship.hullRemaining = Math.max(0, ship.hullRemaining - amount);
  return !isAfloat(ship, roster);
}

/**
 * A day's mending, at her class's own rate.
 *
 * The rate is a share of *whole* hull rather than of what is left, so a ship
 * mends at a constant pace instead of crawling as she gets worse — which is
 * how the live game's `REPAIR_PER_DAY` already works, and the only repair rule
 * this project has settled.
 *
 * **UNRESOLVED:** the export gives a rate per ship and says nothing about the
 * conditions. The live game repairs only in a friendly harbour, faster with a
 * shipyard, never at sea, and never for a wreck. Whether the v2.4 rate carries
 * those same conditions is Sean's call; `canRepair` is where it goes.
 */
export function repairDay(
  ship: NavyShip,
  roster: Roster = ROSTER,
  canRepair = true,
): void {
  if (!canRepair || !isAfloat(ship, roster)) return;
  const def = definitionOf(ship, roster);
  ship.hullRemaining = Math.min(def.hull, ship.hullRemaining + def.hull * def.repairRatePerDay);
}

/** Companies she can still take aboard. */
export function spareCapacity(ship: NavyShip, roster: Roster = ROSTER): number {
  return Math.max(0, definitionOf(ship, roster).troopCapacity - ship.troops);
}

/* ------------------------------------------------- squadrons, and the gaps */

/** Ships acting together. Thin on purpose: the live game's `Fleet` already
 *  carries name, faction, station and orders, and this system is not ready to
 *  duplicate any of that. */
export interface Squadron {
  readonly ships: NavyShip[];
}

/** Everything still afloat. */
export function survivors(squadron: Squadron, roster: Roster = ROSTER): NavyShip[] {
  return squadron.ships.filter((s) => isAfloat(s, roster));
}

/** Companies the squadron can land. */
export function liftCapacity(squadron: Squadron, roster: Roster = ROSTER): number {
  return survivors(squadron, roster).reduce((n, s) => n + definitionOf(s, roster).troopCapacity, 0);
}

/** What a squadron costs to keep, a day. */
export function dailyMaintenance(squadron: Squadron, roster: Roster = ROSTER): number {
  return survivors(squadron, roster).reduce(
    (n, s) => n + definitionOf(s, roster).goldPerDayMaintenance,
    0,
  );
}

/**
 * The weight a squadron can throw at a wall.
 *
 * Kept apart from anything to do with fighting ships, because the design rule
 * is absolute: *"Bombardment: Only affects fortifications/locations, never
 * ship-to-ship combat."* This is the whole of bombardment in this system, and
 * no function in it reads `bombardment` for any other purpose.
 */
export function bombardmentWeight(squadron: Squadron, roster: Roster = ROSTER): number {
  return survivors(squadron, roster).reduce(
    (n, s) => n + definitionOf(s, roster).bombardment,
    0,
  );
}

/**
 * The shape a future fight will have, and nothing more.
 *
 * Deliberately an interface with no implementation. Sean: *"Do not implement a
 * complete damage-resolution system until the formulas and combat sequence
 * have been confirmed."* When they are, something implements this; until then
 * nothing pretends to.
 *
 * The open questions, all of them recorded in
 * `docs/naval-combat-open-questions.md`:
 *
 * - **Armor.** A 0–95 figure with no stated effect. Flat reduction? A share?
 *   A threshold below which a gun does nothing? Different per gun type?
 * - **The three guns.** Long, Heavy and Light are three counts with no stated
 *   difference beyond Long Guns being *"First Strike and pursuit"*. What each
 *   throws, and at what, is undefined.
 * - **First Strike.** Named in the design rules and defined nowhere. A free
 *   round before the exchange? A round at range the other side cannot answer?
 * - **Pursuit.** Long Guns are *"First Strike and pursuit"*. Whether that
 *   stops a withdrawal, punishes it, or catches it is undefined.
 * - **Speed.** Five categories with no mapping to anything — crossing time,
 *   initiative, escape.
 * - **Boarding.** Troop Capacity exists and the Freebooter is a *"boarding /
 *   troop carrier"*, but no boarding rule exists.
 * - **Sequence.** How many rounds, what ends one, and what ends a battle.
 */
export interface CombatResolver {
  /** Deterministic for a given seed, so a war can be replayed and measured. */
  resolve(attacker: Squadron, defender: Squadron, seed: number): CombatResult;
}

export interface CombatResult {
  readonly rounds: number;
  readonly attackerLosses: readonly string[];
  readonly defenderLosses: readonly string[];
}
