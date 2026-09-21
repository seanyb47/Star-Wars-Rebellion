/**
 * Taking an island: the shelling and the landing, and the one rule they share.
 *
 * Sean's design of 20 September, in `docs/siege-and-ground-war.md`. It is worth
 * saying first what it replaced, because the shape of the old system is what
 * the new one is a reaction to. A siege used to be a standing order: you put a
 * squadron off an island, said "bombard", and every morning the fleet fired
 * once, the wall took a percentage off its hit points, and the wall patched
 * some of it back overnight. Sean, on being shown the pacing:
 *
 * > The once per day mechanic will be annoying tbh. It means you have to sit
 * > and wait.
 *
 * And it was worse than annoying. Because the patch was a percentage and the
 * bombardment a flat subtraction, any fleet throwing less than 1.2 a day could
 * never scratch a Fortress and nothing anywhere said so — a lone Chimera would
 * lie off an island besieging it until the end of the war. A measured war
 * tonight had the Crown shelling Freeport every single day from day 214
 * onward, its upkeep bleeding it white and its own islands turning against it
 * over the civilian penalty, which latched at its cap and never came off.
 *
 * So: two actions you order, each resolved the moment you order it, each a
 * die roll against a number the player can read beforehand. Nothing has hit
 * points. Nothing takes partial damage. A thing is fine or it is gone.
 */
import {
  BOMBARD_CIVILIAN_CHANCE,
  FORT_BOMBARD_DEFENSE,
  FORT_INVASION_DEFENSE,
  isWall,
} from './constants';
import type { Rng } from './rng';
import type { FacilityType } from './types';

/* ------------------------------------------------------------ the one rule */

/**
 * A thing that can be killed: a wall or a company, on whichever side.
 *
 * Deliberately not a `Facility` or a `TroopType`. The casualty rule is the
 * same rule in both systems and does not care which it is looking at — all it
 * needs is what a thing costs to kill and something to hand back afterwards.
 */
export interface Casualty<T> {
  /** What it costs the margin to kill this one. */
  cost: number;
  /** The thing itself, returned in the losses. */
  what: T;
}

/**
 * Spend a winning margin on the loser's units, cheapest first.
 *
 * > A roll that beats the other side produces a MARGIN. The margin is spent
 * > killing the loser's units, CHEAPEST FIRST, each costing the same stat that
 * > side rolled with. It keeps buying until nothing left is affordable. IT MAY
 * > KILL ALL OF THEM.
 *
 * **You die by the number you fight by**, which is the line that makes every
 * unit's own description true without a single extra rule. A troop that is
 * good at attacking is expensive to kill while attacking and cheap to kill
 * while holding; the Urskin Berserkers win 99% of the attacks the spec
 * measured and hold a wall 26% of the time, and nothing anywhere had to say
 * so. Sean, arriving at it himself: *"If an invasion is lost by offense the
 * offense has to sacrifice units proportional to the overkill based on the
 * unit's attack score. Makes more logical sense right?"*
 *
 * Cheapest first rather than at random, which was the first version: it is
 * what a commander would do, it is what a wall does anyway, and it is
 * deterministic, so a player can read a result instead of wondering at it.
 * Measured, it moves the balance by under half a point anywhere — it costs
 * nothing and buys legibility.
 */
export function spendMargin<T>(margin: number, units: Array<Casualty<T>>): T[] {
  const order = [...units].sort((a, b) => a.cost - b.cost);
  const dead: T[] = [];
  let left = margin;
  for (const unit of order) {
    if (unit.cost > left) break;
    left -= unit.cost;
    dead.push(unit.what);
  }
  return dead;
}

/** One die of N. `1d0` is nothing at all, which is a real case here. */
export const roll = (rng: Rng, sides: number): number =>
  sides <= 0 ? 0 : rng.range(1, Math.floor(sides));

/* ------------------------------------------------------------ what a wall is */

/** What it costs a ship's guns to break this wall. */
export const wallBombardDefense = (type: FacilityType): number =>
  FORT_BOMBARD_DEFENSE[type as 'fort' | 'heavy_fort'] ?? 0;

/** What it adds to the defender's die when somebody tries to storm it. */
export const wallInvasionDefense = (type: FacilityType): number =>
  FORT_INVASION_DEFENSE[type as 'fort' | 'heavy_fort'] ?? 0;

/* -------------------------------------------------------------- bombardment */

/** One thing on the island that shot can be spent on. */
export interface Shellable {
  /** A wall, or a company. */
  kind: 'wall' | 'troop';
  /** Its Bombardment Defense. */
  cost: number;
  /** Which facility, for a wall; which troop index, for a company. */
  ref: string;
}

export interface BombardResult {
  /** Every roll in the cascade, in order, with what it faced. */
  rolls: Array<{ rolled: number; against: number; broke: number }>;
  /** What is no longer there. */
  destroyed: Shellable[];
  /** Whether the action found the town over the heads of its people. */
  civilian: boolean;
}

/**
 * What the island stands at, which is the number the player is owed *before*
 * a tick is spent.
 *
 * > Walls while any stand; once they are all rubble, the garrison.
 *
 * So an island with walls hides its garrison behind them: shot spent on stone
 * is not spent on men, and there is no way to reach the men until the stone is
 * gone. That is what makes a wall worth its berth.
 */
export function islandDefense(defenders: Shellable[]): number {
  const walls = defenders.filter((d) => d.kind === 'wall');
  const standing = walls.length > 0 ? walls : defenders;
  return standing.reduce((n, d) => n + d.cost, 0);
}

/*
 * A note on that, because it is the one place this file had to choose.
 *
 * Clause 3 of the change order reads: "ISLAND DEFENSE = the sum of Bombardment
 * Defense of everything defending. Walls while any stand; once they are all
 * rubble, the garrison." The first sentence says everything; the second says
 * walls only. Clause 4 is the one that says what *dies* — "killing walls while
 * any stand, troops once none do" — so clause 3's second sentence has to be
 * about the total, or it is clause 4 written twice. And the rule the spec
 * chooses to show the player uses walls alone: "with N identical walls of
 * defense D that is (N+1) x D".
 *
 * So the total is the walls while any stand, which also gives a wall the
 * property that makes it worth its berth: shot spent on stone is not spent on
 * men, and there is no way to reach the men until the stone is gone.
 *
 * Measured against the spec's own figure, 20,000 trials of a 1d32 siege train
 * against one Fortress and four troops: this clears the island outright 61% of
 * the time in an average of 2.2 rolls, where the spec reports 33% and 3.5. The
 * other reading — everything in the total — gives 42% and 1.8, so it is not
 * the explanation either. Something in the harness that produced those figures
 * differs from both readings of the text, and it is worth Sean's eye. The rule
 * as written is what is implemented.
 */

/** What is currently shootable: the walls, or the garrison once they are gone. */
function reachable(defenders: Shellable[]): Shellable[] {
  const walls = defenders.filter((d) => d.kind === 'wall');
  return walls.length > 0 ? walls : defenders;
}

/**
 * One bombardment action: roll, cascade, and stop when a roll fails.
 *
 * > KEEP ROLLING until a roll fails to beat the island total. Every wall
 * > destroyed lowers that total, so each successive roll is easier — a hot
 * > streak levels an island in one action.
 * > The whole cascade is ONE ACTION costing ONE TICK per participating ship,
 * > however many rolls it ran.
 *
 * The rule worth showing a player, and the reason the UI must print the number
 * before anything is spent: to destroy a defender you have to roll the
 * island's whole total *plus* that defender's own score. Because the top of
 * the die is the fleet's bombardment score, a fleet under that number has zero
 * chance rather than poor odds — so a squadron that rolls at most 32 against
 * walls standing at 40 should be told, not allowed to find out over five
 * ticks.
 */
export function bombard(fleetScore: number, defenders: Shellable[], rng: Rng): BombardResult {
  const left = [...defenders];
  const result: BombardResult = { rolls: [], destroyed: [], civilian: false };

  // > Every action carries a 5% chance of hitting civilian infrastructure.
  // > ... Rolled once per action, not once per roll.
  result.civilian = rng.chance(BOMBARD_CIVILIAN_CHANCE);

  for (;;) {
    if (left.length === 0) break;
    const against = islandDefense(left);
    const rolled = roll(rng, fleetScore);
    if (rolled <= against) {
      result.rolls.push({ rolled, against, broke: 0 });
      break;
    }
    const pool = reachable(left);
    const dead = spendMargin(
      rolled - against,
      pool.map((d) => ({ cost: d.cost, what: d })),
    );
    for (const d of dead) {
      left.splice(left.indexOf(d), 1);
      result.destroyed.push(d);
    }
    result.rolls.push({ rolled, against, broke: dead.length });
    // A roll that beats the total but cannot afford even the cheapest thing on
    // the island breaks nothing and the cascade goes on — the rule is "keep
    // rolling until a roll FAILS to beat the island total", not until a roll
    // stops killing. It still terminates: the state is unchanged, so the next
    // roll has the same chance of ending it as this one did.
  }
  return result;
}

/* ------------------------------------------------------------- the landing */

/** One company in a landing, on either side. */
export interface Fighter {
  /** What it rolls with, and therefore what it dies at. */
  score: number;
  /** Which troop type, for the report. */
  id: string;
}

export interface InvasionResult {
  /** Every exchange: both dice, and what each side lost to them. */
  exchanges: Array<{
    attack: number;
    defense: number;
    attackerLost: string[];
    defenderLost: string[];
  }>;
  /** Who is left standing. */
  attackers: Fighter[];
  defenders: Fighter[];
  /** True if the landing took the island. */
  taken: boolean;
}

/**
 * A landing, fought out in one action.
 *
 * > ATTACK = 1d(sum of Attack across every landed troop)
 * > DEFENSE = 1d(sum of Invasion Defense across defending troops, PLUS every
 * > standing wall)
 * > Both roll. A tie kills nobody. Otherwise the winner's margin is spent per
 * > section 0 against the loser ... Repeat with the new totals until one side
 * > has nothing left.
 *
 * The old rule that a standing fortress forbade a landing outright is
 * repealed. Walls add their Invasion Defense to the garrison's die instead,
 * which makes storming them expensive rather than impossible — so bombardment
 * becomes softening rather than a gate, and the two systems finally trade
 * against each other. The spec measures the difference: six Crown Marines
 * against four Island Militia take the island 74% of the time with a Heavy
 * Fortress standing, 90% with a Fortress, and 98% with the walls in rubble.
 *
 * Walls are not units and cannot be killed by troops. They swell the
 * defender's die and are captured when the last defending troop falls.
 */
export function invade(
  attackers: Fighter[],
  defenders: Fighter[],
  wallDefense: number,
  rng: Rng,
  exchangeCap = 200,
): InvasionResult {
  const mine = [...attackers];
  const theirs = [...defenders];
  const result: InvasionResult = { exchanges: [], attackers: mine, defenders: theirs, taken: false };

  for (let n = 0; n < exchangeCap; n++) {
    if (mine.length === 0 || theirs.length === 0) break;
    const attackTotal = mine.reduce((t, f) => t + f.score, 0);
    // Every wall still standing, on top of whoever is holding the place.
    const defenseTotal = theirs.reduce((t, f) => t + f.score, 0) + wallDefense;
    const attack = roll(rng, attackTotal);
    const defense = roll(rng, defenseTotal);

    const attackerLost: string[] = [];
    const defenderLost: string[] = [];
    // A tie kills nobody, and is the one outcome that costs the attacker
    // nothing but time.
    if (attack > defense) {
      const dead = spendMargin(
        attack - defense,
        theirs.map((f) => ({ cost: f.score, what: f })),
      );
      for (const f of dead) {
        theirs.splice(theirs.indexOf(f), 1);
        defenderLost.push(f.id);
      }
    } else if (defense > attack) {
      const dead = spendMargin(
        defense - attack,
        mine.map((f) => ({ cost: f.score, what: f })),
      );
      for (const f of dead) {
        mine.splice(mine.indexOf(f), 1);
        attackerLost.push(f.id);
      }
    }
    result.exchanges.push({ attack, defense, attackerLost, defenderLost });
    // A narrow win that cannot afford a casualty is not the end of the
    // landing, it is a minute of it: the rule repeats with the new totals
    // until one side has nothing left, and an exchange that killed nobody has
    // simply not changed the totals. The cap below is the only stop, and it is
    // there for the pathological case rather than the ordinary one.
  }

  result.taken = theirs.length === 0 && mine.length > 0;
  return result;
}

export { isWall };
