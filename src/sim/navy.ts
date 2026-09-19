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
 * Combat. It lives in `navycombat.ts` and reads four numbers — Firepower,
 * Hull, Speed, hasLongGuns — none of which the v2.4 roster carries yet. This
 * file is the strategic side: what a hull is, what is left of one, what a
 * squadron can lift and what it costs to keep.
 */
import {
  ROSTER,
  type NavyFaction,
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
  /**
   * Whose she is *now*. Not readonly, because a boarding action changes it:
   * Sean's ruling of 18 September is that a won boarding captures the target
   * rather than destroying her.
   */
  owner: NavyFaction;
  hullRemaining: number;
  /** Companies aboard. Never above the class's `troopCapacity`. */
  troops: number;
}

/**
 * Where the five condition states begin and end.
 *
 * **Ruled, 18 September**, and the placeholder these replaced happened to be
 * right: *"Healthy: 76–100%. Damaged: 51–75%. Heavily Damaged: 26–50%.
 * Critically Damaged: 1–25%. Destroyed: 0%."*
 *
 * Status is **descriptive only**: it reduces no firepower, no speed, nothing,
 * *"to avoid introducing an undocumented death spiral and preserve
 * simultaneous resolution."* Nothing reads a status to decide anything, and
 * that is deliberate rather than unfinished.
 *
 * Still an argument on every caller, so a later ruling is one call site.
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

/** Lay down a new hull of this class: whole, empty, and hers. */
export function commission(def: ShipDefinition, id: string): NavyShip {
  return { id, defId: def.id, owner: def.faction, hullRemaining: def.hull, troops: 0 };
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
 * The strategic layer's door for damage — a creature, a storm, a siege. What
 * a battle does to a hull is `navycombat.ts`'s business and works on its own
 * stat block.
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

/*
 * The combat interfaces that used to close this file are gone.
 *
 * They described armor mitigation, three gun kinds, First Strike, pursuit and
 * boarding — every one of which Sean's ruling of 18 September removed from the
 * model: *"Any earlier instructions adding armor, weapon triangles, boarding,
 * or First Strike are superseded."* Combat now lives in `navycombat.ts` and
 * reads four numbers, none of which this file supplies yet.
 */
