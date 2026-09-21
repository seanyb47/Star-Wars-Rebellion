import { describe, expect, it } from 'vitest';
import { bombard, invade, islandDefense, spendMargin, type Fighter, type Shellable } from '../siege';
import { FORT_BOMBARD_DEFENSE, FORT_INVASION_DEFENSE } from '../constants';
import { troopType } from '../troops';
import { createRng } from '../rng';

/**
 * The siege and the landing, against the change order that specifies them.
 *
 * `docs/siege-and-ground-war.md`, Sean's design of 20 September. It carries
 * its own measured figures — twenty thousand trials apiece — so most of what
 * is below is a comparison rather than an opinion. Where this engine and those
 * figures disagree, the disagreement is written down rather than tuned away.
 */

const rngAt = (i: number) => createRng(100000 + i * 7919);
const TRIALS = 4000;

describe('the one shared rule', () => {
  /**
   * > The margin is spent killing the loser's units, CHEAPEST FIRST, each
   * > costing the same stat that side rolled with. It keeps buying until
   * > nothing left is affordable. IT MAY KILL ALL OF THEM.
   */
  it('buys the cheapest first and keeps buying while it can afford to', () => {
    const units = [
      { cost: 30, what: 'marine' },
      { cost: 12, what: 'brethren' },
      { cost: 20, what: 'militia' },
    ];
    // Thirty-two buys the twelve and the twenty and stops: eight left over
    // and nothing that cheap on the field.
    expect(spendMargin(32, units)).toEqual(['brethren', 'militia']);
    // Enough for everything.
    expect(spendMargin(100, units)).toEqual(['brethren', 'militia', 'marine']);
    // Not enough for anything.
    expect(spendMargin(11, units)).toEqual([]);
  });

  /**
   * "You die by the number you fight by" is the whole of why elite troops are
   * worth their price, and the spec is emphatic about what it replaced:
   *
   * > Measured under the alternative — one casualty per exchange regardless of
   * > what it cost — four Drowned Guard (224 gold) attacking won 55% where ten
   * > Island Militia (240 gold) won 88%, making the best troop in the game its
   * > worst buy.
   */
  it('makes the best troop in the game a better buy than the cheapest', () => {
    const guard = troopType('drowned-guard')!;
    const militia = troopType('island-militia')!;
    const marine = troopType('crown-marines')!;
    const takes = (t: typeof guard, n: number) => {
      let won = 0;
      for (let i = 0; i < TRIALS; i++) {
        const a: Fighter[] = Array.from({ length: n }, () => ({ score: t.attack, id: t.id }));
        const d: Fighter[] = Array.from({ length: 4 }, () => ({
          score: marine.invasionDefense,
          id: marine.id,
        }));
        if (invade(a, d, FORT_INVASION_DEFENSE.fort, rngAt(i)).taken) won += 1;
      }
      return won / TRIALS;
    };
    // Roughly the same money on each. The spec measures 74% and 51%.
    expect(takes(guard, 4)).toBeGreaterThan(takes(militia, 10));
  });
});

describe('a bombardment', () => {
  /**
   * > ISLAND DEFENSE = ... Walls while any stand; once they are all rubble,
   * > the garrison.
   */
  it('hides the garrison behind the walls while any stand', () => {
    const wall: Shellable = { kind: 'wall', cost: FORT_BOMBARD_DEFENSE.fort, ref: 'f' };
    const troops: Shellable[] = [1, 2, 3, 4].map((n) => ({ kind: 'troop', cost: 2, ref: `t${n}` }));
    // The wall alone, not the wall plus the men behind it.
    expect(islandDefense([wall, ...troops])).toBe(4);
    // And once it is rubble, the men are the island.
    expect(islandDefense(troops)).toBe(8);
  });

  /**
   * > Because the top of the die IS the fleet's bombardment score, a fleet
   * > under that number has ZERO chance rather than poor odds.
   *
   * This is the rule the UI has to print before a tick is spent, and it is
   * worth a test because "poor odds" and "no odds" feel the same until a
   * player has spent a whole magazine finding out.
   */
  it('gives a fleet under the wall number no chance at all, not poor odds', () => {
    const walls: Shellable[] = [1, 2].map((n) => ({
      kind: 'wall',
      cost: FORT_BOMBARD_DEFENSE.heavy_fort,
      ref: `w${n}`,
    }));
    // Two Heavy Fortresses stand at 16; to break one you must roll 16 + 8.
    expect(islandDefense(walls)).toBe(16);
    for (let i = 0; i < 200; i++) {
      expect(bombard(16, [...walls], rngAt(i)).destroyed).toHaveLength(0);
    }
    // One point more on the die and it is possible, if barely.
    let any = 0;
    for (let i = 0; i < 400; i++) if (bombard(24, [...walls], rngAt(i)).destroyed.length > 0) any += 1;
    expect(any).toBeGreaterThan(0);
  });

  /**
   * > KEEP ROLLING until a roll fails to beat the island total. Every wall
   * > destroyed lowers that total, so each successive roll is easier — a hot
   * > streak levels an island in one action.
   *
   * Measured here, 4,000 trials of the spec's own example — a Crown siege
   * train of Majestic, Sovereign II, Sovereign and Morningstar, which is
   * exactly 1d32, against one Fortress and four troops: the island is cleared
   * outright 61% of the time in an average of 2.2 rolls.
   *
   * **The spec reports 33% and 3.5 rolls for the same fight, and that gap is
   * unresolved.** Both readings of its clause 3 were measured — walls alone in
   * the island total, which is what is implemented and what its own "(N+1) x D"
   * formula describes, and everything defending in the total, which gives 42%
   * and 1.8 rolls. Neither reproduces 33/3.5, so something in the harness
   * behind those figures differs from the text in a way this cannot recover.
   * The rule as written is what is implemented; the numbers are Sean's to
   * adjudicate.
   */
  it('cascades, and clears a walled island more often than not', () => {
    const fleet = 32;
    let cleared = 0;
    let rolls = 0;
    for (let i = 0; i < TRIALS; i++) {
      const island: Shellable[] = [
        { kind: 'wall', cost: FORT_BOMBARD_DEFENSE.fort, ref: 'f' },
        ...[1, 2, 3, 4].map((n) => ({ kind: 'troop' as const, cost: 2, ref: `t${n}` })),
      ];
      const result = bombard(fleet, island, rngAt(i));
      rolls += result.rolls.length;
      if (result.destroyed.length === island.length) cleared += 1;
    }
    expect(cleared / TRIALS).toBeGreaterThan(0.4);
    expect(cleared / TRIALS).toBeLessThan(0.8);
    expect(rolls / TRIALS).toBeGreaterThan(1.5);
  });

  /**
   * > Every action carries a 5% chance of hitting civilian infrastructure ...
   * > Rolled once per action, not once per roll.
   */
  it('rolls for the town once an action, however long the cascade ran', () => {
    let hits = 0;
    for (let i = 0; i < 4000; i++) {
      const island: Shellable[] = [{ kind: 'wall', cost: 4, ref: 'f' }];
      if (bombard(40, island, rngAt(i)).civilian) hits += 1;
    }
    // Five per cent, give or take what four thousand trials gives or takes.
    expect(hits / 4000).toBeGreaterThan(0.03);
    expect(hits / 4000).toBeLessThan(0.07);
  });
});

describe('a landing', () => {
  const marine = troopType('crown-marines')!;
  const militia = troopType('island-militia')!;

  /**
   * The spec's headline example, and the answer to "does bombarding first
   * matter?". Six Crown Marines against four Island Militia:
   *
   * > Heavy Fortress standing 74% | Fortress standing 90% | walls in rubble 98%
   *
   * Measured here at 80 / 95 / 100. A few points hotter than the spec across
   * the board and the shape is exactly right — softening the walls is worth
   * about twenty points of a landing, and it is still optional.
   */
  it('makes walls expensive to storm rather than impossible', () => {
    const takes = (wall: number) => {
      let won = 0;
      for (let i = 0; i < TRIALS; i++) {
        const a: Fighter[] = Array.from({ length: 6 }, () => ({ score: marine.attack, id: marine.id }));
        const d: Fighter[] = Array.from({ length: 4 }, () => ({
          score: militia.invasionDefense,
          id: militia.id,
        }));
        if (invade(a, d, wall, rngAt(i)).taken) won += 1;
      }
      return won / TRIALS;
    };
    const heavy = takes(FORT_INVASION_DEFENSE.heavy_fort);
    const fort = takes(FORT_INVASION_DEFENSE.fort);
    const rubble = takes(0);
    // Always possible, which is the repealed rule: a standing fortress used to
    // forbid a landing outright.
    expect(heavy).toBeGreaterThan(0.5);
    // And always worth breaking first.
    expect(fort).toBeGreaterThan(heavy);
    expect(rubble).toBeGreaterThan(fort);
  });

  /**
   * The point of the shared casualty rule, in one assertion.
   *
   * > Specialists asked to do the wrong job lose badly and should. Every unit
   * > is now durable at the job it is good at and fragile at the other.
   *
   * The Urskin Berserkers are the extreme case: 50 Attack and 20 Invasion
   * Defense, and their blurb says "ask them to stand still and hold a wall and
   * you have wasted them". Nothing in the code says that. The casualty rule
   * says it.
   */
  it('makes a unit durable at its own job and fragile at the other', () => {
    const berserk = troopType('urskin-berserkers')!;
    const warden = troopType('shoal-wardens')!;
    const attacks = (t: typeof berserk, n: number) => {
      let won = 0;
      for (let i = 0; i < TRIALS; i++) {
        const a: Fighter[] = Array.from({ length: n }, () => ({ score: t.attack, id: t.id }));
        const d: Fighter[] = Array.from({ length: 4 }, () => ({
          score: marine.invasionDefense,
          id: marine.id,
        }));
        if (invade(a, d, FORT_INVASION_DEFENSE.fort, rngAt(i)).taken) won += 1;
      }
      return won / TRIALS;
    };
    const holds = (t: typeof berserk, n: number) => {
      let held = 0;
      for (let i = 0; i < TRIALS; i++) {
        const a: Fighter[] = Array.from({ length: 6 }, () => ({ score: marine.attack, id: marine.id }));
        const d: Fighter[] = Array.from({ length: n }, () => ({ score: t.invasionDefense, id: t.id }));
        if (!invade(a, d, FORT_INVASION_DEFENSE.fort, rngAt(i)).taken) held += 1;
      }
      return held / TRIALS;
    };
    // Roughly 240 gold of each, which is how the spec matches them.
    const berserkers = { attack: attacks(berserk, 5), hold: holds(berserk, 5) };
    const wardens = { attack: attacks(warden, 15), hold: holds(warden, 15) };
    // The Berserkers are the best attackers in the game and among the worst
    // holders; the Wardens are the reverse, which is what a Warden ought to be.
    expect(berserkers.attack).toBeGreaterThan(wardens.attack);
    expect(wardens.hold).toBeGreaterThan(berserkers.hold);
    expect(berserkers.attack).toBeGreaterThan(berserkers.hold);
    expect(wardens.hold).toBeGreaterThan(wardens.attack);
  });

  /**
   * > Repeat with the new totals until one side has nothing left. If the
   * > defenders are wiped, the island and everything on it changes hands.
   */
  it('fights until one side is gone, and says which', () => {
    const rng = createRng(3);
    const a: Fighter[] = Array.from({ length: 6 }, () => ({ score: marine.attack, id: marine.id }));
    const d: Fighter[] = Array.from({ length: 2 }, () => ({
      score: militia.invasionDefense,
      id: militia.id,
    }));
    const result = invade(a, d, 0, rng);
    expect(result.exchanges.length).toBeGreaterThan(0);
    expect(result.taken).toBe(result.defenders.length === 0);
    if (result.taken) expect(result.attackers.length).toBeGreaterThan(0);
  });

  /** > A tie kills nobody. */
  it('costs nobody anything when the two dice agree', () => {
    // Both sides on the same total, so ties are common; over many landings
    // every recorded tie killed nobody on either side.
    for (let i = 0; i < 300; i++) {
      const a: Fighter[] = [{ score: 20, id: 'a' }];
      const d: Fighter[] = [{ score: 20, id: 'd' }];
      for (const x of invade(a, d, 0, rngAt(i)).exchanges) {
        if (x.attack === x.defense) {
          expect(x.attackerLost).toHaveLength(0);
          expect(x.defenderLost).toHaveLength(0);
        }
      }
    }
  });
});
