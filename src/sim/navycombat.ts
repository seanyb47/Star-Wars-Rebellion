/**
 * The shape of a round, and the boarding action — Sean's rulings of
 * 18 September.
 *
 * What is settled and built here:
 *
 * - **First Strike.** *"A ship with at least one Long Gun fires its Long Guns
 *   during a First Strike step before normal simultaneous fire. First Strike
 *   damage is resolved immediately. A ship destroyed during First Strike does
 *   not fire during the normal attack step. Surviving ships then resolve Heavy
 *   and Light Gun attacks simultaneously against the post–First Strike state.
 *   Long Guns do not fire again during the normal attack step."*
 * - **Boarding.** A ship-to-ship action that replaces that ship's gun attack
 *   for the round, resolved troops against troops, and a win **captures**.
 * - **Armor**, ablative and gun-blind, which lives in `navy.ts`.
 *
 * What is still missing, and is therefore an injected interface rather than an
 * implementation:
 *
 * - **What a gun does.** The rulings say which gun is strong against what and
 *   that Long Guns' advantage is First Strike *"not superior raw damage"* —
 *   but not what a gun's damage *is*. `GunneryModel` is that hole, named.
 * - **The size class the triangle needs.** Sean: *"Use the project's existing
 *   ship-size classifications for the triangle rather than inferring size from
 *   Hull during combat."* The v2.4 roster has no size column — it has a
 *   free-text Role and a Speed category. Until one is added, `sizeOf` has
 *   nothing to read. See `docs/naval-combat-open-questions.md`.
 * - **How many rounds, and what ends a battle.**
 * - **The flee sequence.**
 */
import type { Rng } from './rng';
import {
  applyDamage,
  definitionOf,
  isAfloat,
  type DamageTally,
  type NavyShip,
  type Squadron,
} from './navy';
import { ROSTER, type Roster, type ShipDefinition } from './shipdefs';

/* ------------------------------------------------------------- the triangle */

/**
 * The size classes the triangle is keyed to.
 *
 * Deliberately the live game's four and not a new set: Sean's ruling is to
 * *"use the project's existing ship-size classifications"*, and those are
 * `small | medium | large | transport` in `SHIP_ROLES`.
 */
export type ShipSizeClass = 'small' | 'medium' | 'large' | 'transport';

/**
 * Which size class a v2.4 hull belongs to.
 *
 * **BLOCKED.** The v2.4 export carries no size column, so there is nothing to
 * read and nothing here guesses. A size cannot be inferred from Hull — the
 * ruling forbids exactly that — and Role is free text.
 *
 * The fix is one column in `combat-ships.json`. A proposed assignment for all
 * 25 hulls is in `docs/naval-combat-open-questions.md` for Sean to approve or
 * correct; it is deliberately *not* in the code, because a made-up size class
 * would silently decide every gunnery matchup in the game.
 */
export function sizeOf(def: ShipDefinition): ShipSizeClass | undefined {
  const declared = (def as ShipDefinition & { sizeClass?: ShipSizeClass }).sizeClass;
  return declared;
}

/** The three kinds, and the only three. */
export type GunKind = 'long' | 'heavy' | 'light';

/**
 * What a volley of one kind of gun does to one target.
 *
 * The one thing the rulings do not give, and therefore the one thing this file
 * refuses to invent. An implementation decides damage per gun, whether a shot
 * can miss, and how the triangle weights a matchup — Sean's ruling names the
 * directions (*"Light Guns: strongest against small/fast ships; weak against
 * capital ships. Heavy Guns: strongest against large/armored ships; weak
 * against small/fast ships"*) but no magnitudes.
 *
 * Takes an `Rng` so a battle can be replayed exactly, which `lab/duel.ts`
 * needs.
 */
export interface GunneryModel {
  volley(
    shooter: ShipDefinition,
    target: ShipDefinition,
    kind: GunKind,
    guns: number,
    rng: Rng,
  ): number;
}

/* ---------------------------------------------------------------- the round */

/** What one ship means to do this round. */
export type ShipOrder =
  | { kind: 'fire'; targetId: string }
  | { kind: 'board'; targetId: string; troops: number }
  | { kind: 'hold' };

export interface RoundInput {
  attacker: Squadron;
  defender: Squadron;
  /** By ship id. A ship with no order holds. */
  orders: ReadonlyMap<string, ShipOrder>;
  gunnery: GunneryModel;
  rng: Rng;
  roster?: Roster;
}

export interface VolleyRecord {
  shooterId: string;
  targetId: string;
  kind: GunKind;
  damage: DamageTally;
}

export interface BoardingRecord {
  boarderId: string;
  targetId: string;
  committed: number;
  defending: number;
  captured: boolean;
  troopsLost: number;
}

export interface RoundResult {
  firstStrike: VolleyRecord[];
  exchange: VolleyRecord[];
  boardings: BoardingRecord[];
  /** Ships lost this round, by id, in the order they went. */
  sunk: string[];
  /** Ships that changed hands this round. */
  captured: string[];
}

/**
 * One round: First Strike, then the simultaneous exchange, with boarding in
 * place of a gun attack for any ship that chose it.
 *
 * The ordering rules are the whole reason this function exists, and each is
 * Sean's:
 *
 * 1. Long Guns fire first and their damage lands **immediately**, so a ship
 *    sunk by First Strike is gone before the exchange.
 * 2. Ships that survived First Strike then fire Heavy and Light **against the
 *    post-First-Strike state** — simultaneously, so a ship sunk in the
 *    exchange still got her shot off. That is the live game's rule too, and
 *    the ruling on Status being descriptive exists to protect it.
 * 3. A Long Gun does not fire twice.
 * 4. A ship that boards does not fire at all.
 */
export function resolveRound(input: RoundInput): RoundResult {
  const roster = input.roster ?? ROSTER;
  const result: RoundResult = {
    firstStrike: [],
    exchange: [],
    boardings: [],
    sunk: [],
    captured: [],
  };
  const all = [...input.attacker.ships, ...input.defender.ships];
  const byId = new Map(all.map((s) => [s.id, s] as const));
  const orderFor = (ship: NavyShip): ShipOrder => input.orders.get(ship.id) ?? { kind: 'hold' };
  const noteSunk = (ship: NavyShip, tally: DamageTally) => {
    if (tally.sunk && !result.sunk.includes(ship.id)) result.sunk.push(ship.id);
  };

  // A ship boarding this round does not shoot, whatever she is carrying.
  const firing = all.filter((s) => isAfloat(s, roster) && orderFor(s).kind === 'fire');

  /* 1. First Strike. Resolved one at a time and applied as it happens. */
  for (const shooter of firing) {
    if (!isAfloat(shooter, roster)) continue; // sunk by an earlier First Strike
    const def = definitionOf(shooter, roster);
    if (def.guns.longGuns <= 0) continue;
    const order = orderFor(shooter) as { kind: 'fire'; targetId: string };
    const target = byId.get(order.targetId);
    if (!target || !isAfloat(target, roster)) continue;
    const damage = applyDamage(
      target,
      input.gunnery.volley(def, definitionOf(target, roster), 'long', def.guns.longGuns, input.rng),
      roster,
    );
    result.firstStrike.push({ shooterId: shooter.id, targetId: target.id, kind: 'long', damage });
    noteSunk(target, damage);
  }

  /*
   * 2. The exchange. Everything is worked out against the state at the start
   *    of the step and applied afterwards, so two ships that sink each other
   *    both fire. Long Guns are excluded: they have had their round.
   */
  const pending: Array<{ shooter: NavyShip; target: NavyShip; kind: GunKind; amount: number }> = [];
  for (const shooter of firing) {
    if (!isAfloat(shooter, roster)) continue; // step 1 rule: the dead do not fire
    const def = definitionOf(shooter, roster);
    const order = orderFor(shooter) as { kind: 'fire'; targetId: string };
    const target = byId.get(order.targetId);
    if (!target || !isAfloat(target, roster)) continue;
    const targetDef = definitionOf(target, roster);
    for (const kind of ['heavy', 'light'] as const) {
      const guns = kind === 'heavy' ? def.guns.heavyGuns : def.guns.lightGuns;
      if (guns <= 0) continue;
      pending.push({
        shooter,
        target,
        kind,
        amount: input.gunnery.volley(def, targetDef, kind, guns, input.rng),
      });
    }
  }
  for (const shot of pending) {
    const damage = applyDamage(shot.target, shot.amount, roster);
    result.exchange.push({
      shooterId: shot.shooter.id,
      targetId: shot.target.id,
      kind: shot.kind,
      damage,
    });
    noteSunk(shot.target, damage);
  }

  /* 3. Boarding, for anybody who chose it instead of firing. */
  for (const boarder of all) {
    const order = orderFor(boarder);
    if (order.kind !== 'board' || !isAfloat(boarder, roster)) continue;
    const target = byId.get(order.targetId);
    if (!target || !isAfloat(target, roster)) continue;
    const record = resolveBoarding(boarder, target, order.troops, input.rng, roster);
    result.boardings.push(record);
    if (record.captured) result.captured.push(target.id);
  }

  return result;
}

/**
 * One boarding action.
 *
 * Sean's ruling: *"Resolve the attacker's committed troops against the
 * defender's troops. If the attacker wins, the target is captured rather than
 * destroyed; if the attacker loses, the committed attacking troops are lost.
 * The exact troop-combat formula should reuse the game's existing land-troop
 * combat rules if possible."*
 *
 * So the arithmetic is `resolveLanding`'s, deliberately: the larger force
 * wins, a tie goes to a roll, and both sides spend the smaller number. It is
 * written out again here rather than shared with `fleets.ts`, because this
 * system runs in parallel and reaching into live combat code to extract a
 * helper would change a tested system for the benefit of one that is not
 * wired in yet. **When the two converge, these should become one function.**
 *
 * What is *not* carried over is the officer's Combat edge that a landing gets.
 * That edge reads a live `GameState`, which this system does not have, and
 * inventing an equivalent would be inventing a rule.
 */
export function resolveBoarding(
  boarder: NavyShip,
  target: NavyShip,
  committed: number,
  rng: Rng,
  roster: Roster = ROSTER,
): BoardingRecord {
  const attackers = Math.max(0, Math.min(committed, boarder.troops));
  const defenders = target.troops;
  const spent = Math.min(attackers, defenders);
  const captured = attackers > defenders || (attackers === defenders && rng.next() > 0.5);

  boarder.troops -= captured ? spent : attackers;
  target.troops = Math.max(0, defenders - spent);
  if (captured) {
    // Taken, not sunk. She keeps whatever hull and armor she has left.
    target.owner = definitionOf(boarder, roster).faction;
  }
  return {
    boarderId: boarder.id,
    targetId: target.id,
    committed: attackers,
    defending: defenders,
    captured,
    troopsLost: captured ? spent : attackers,
  };
}
