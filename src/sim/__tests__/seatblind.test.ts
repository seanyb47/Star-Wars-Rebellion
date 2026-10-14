import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { advanceDay } from '../advanceDay';
import { stateHash, canonical, fingerprint } from '../sync';
import { answerBattle } from '../fleets';
import { createRng } from '../rng';
import { BOTH_SIDES } from '../helpers';
import type { GameState, PlayableFaction } from '../types';

/**
 * Two people playing the same war have to be playing the *same* war.
 *
 * PvP here is lockstep: both clients hold the whole state, both run
 * `advanceDay` themselves, and only the orders cross the wire. That was an
 * arithmetic decision — `lab/wire.ts` measures the state at 56 KB on the
 * opening day and 129 KB by day 600, against 106 bytes for an order — and it
 * buys a two-hundredfold saving in exchange for one obligation: **the two
 * machines must compute the same day from the same inputs.**
 *
 * The obligation has a nasty failure mode. Nobody is authoritative, so when
 * the states drift there is no referee to notice: his fleet sinks, hers sails
 * on, and both screens look perfectly convincing. It is the only thing
 * lockstep can get wrong and it is silent by construction, so it gets a test
 * rather than a hope.
 *
 * Two properties, and they are different properties.
 *
 * 1. **The war does not depend on the process.** Same seed, same orders, same
 *    war — which is already true, because `advanceDay` is pure and every roll
 *    comes off `rngSeed`. `lab/desync.ts` walks nine hundred days of it in two
 *    separate operating-system processes; this holds the floor under that.
 * 2. **The war does not depend on the seat.** This is the one PvP added and
 *    the one that was broken. `state.player` is local — his client says
 *    `empire`, hers says `alliance` — so anything in the day that reads it
 *    comes out differently on the two machines. On 11 October there were four
 *    such things, and `missions.ts` was the worst of them: `machinePlayed` was
 *    `faction !== state.player`, so each client thought the *other human* was
 *    a machine and played their parley for them.
 */

/** Run a war with nobody playing either side, which is the longest reach of the day. */
function machineWar(seed: number, days: number, seat: PlayableFaction): GameState {
  let state = generateGalaxy(seed, seat);
  state.human = [];
  for (let d = 0; d < days && !state.winner; d++) state = advanceDay(state);
  return state;
}

/**
 * Walk the same PvP war from both seats at once, comparing every single day.
 *
 * Day by day rather than at the end, because the question is *when* they come
 * apart. It used to stop at the first action that went modal, because with
 * both sides played the clock waits for an answer and `PendingBattle` could
 * not be read from two chairs. That is built now — Sean's ruling of 11 October
 * is that both sides answer each round — so this answers for both and keeps
 * going, which is what two browsers will be doing.
 *
 * Returns how far they stayed identical and how much happened, so a test can
 * say the property held over a war that was actually fought rather than
 * passing because nothing ever got going.
 */
function walkBothSeats(
  seed: number,
  days: number,
): { day: number; identical: boolean; events: number; battles: number } {
  const open = (seat: PlayableFaction) => {
    const s = generateGalaxy(seed, seat);
    s.human = ['empire', 'alliance'];
    return s;
  };
  let crown = open('empire');
  let confederacy = open('alliance');
  let battles = 0;
  const fail = () => ({ day: crown.day, identical: false, events: crown.events.length, battles });
  if (stateHash(crown) !== stateHash(confederacy)) return fail();

  for (let step = 0; step < days * 4; step++) {
    if (crown.day > days || crown.winner) break;
    // An action holds the clock until both sides have answered, so answering
    // is a step in its own right rather than part of the day.
    if (crown.battle) {
      if (!confederacy.battle) return fail();
      if (!crown.battle.settled) battles += 1;
      for (const side of BOTH_SIDES) {
        const answer = crown.battle?.settled ? 'close' : 'fight';
        answerBattle(crown, side, answer, createRng(crown.rngSeed));
        answerBattle(confederacy, side, answer, createRng(confederacy.rngSeed));
      }
    } else {
      crown = advanceDay(crown);
      confederacy = advanceDay(confederacy);
    }
    if (stateHash(crown) !== stateHash(confederacy)) return fail();
  }
  return { day: crown.day, identical: true, events: crown.events.length, battles };
}

describe('the fingerprint', () => {
  it('writes a key in the same place however the object was built', () => {
    // The whole point of canonicalising. Two states that *are* equal must not
    // hash differently because a capture happened to touch an island's keys in
    // another order, or the signal that is supposed to mean "you have
    // desynced" cries wolf on the first island either side takes.
    expect(canonical({ b: 1, a: 2 })).toBe(canonical({ a: 2, b: 1 }));
    expect(canonical([{ y: 1, x: 2 }])).toBe(canonical([{ x: 2, y: 1 }]));
  });

  it('keeps an array in the order it was given, because order is meaning here', () => {
    // The feed is a sequence and `ships[0]` is the hull that gets fired at
    // first. Sorting these would hash two different wars the same.
    expect(canonical([1, 2])).not.toBe(canonical([2, 1]));
  });

  it('does not confuse a missing key with one set to undefined', () => {
    // The sim deletes optional fields in some places and assigns `undefined`
    // in others — `state.battle` does both — and those are the same war.
    expect(canonical({ a: 1, b: undefined })).toBe(canonical({ a: 1 }));
  });

  it('refuses to hash a state holding a number that is not one', () => {
    // `JSON.stringify` turns NaN into `null`, which would hash a broken state
    // to the same thing as an honest one and hide the only failure this file
    // exists to find.
    expect(() => canonical({ gold: NaN })).toThrow(/NaN/);
    expect(() => canonical({ gold: Infinity })).toThrow(/Infinity/);
  });

  it('changes when anything changes', () => {
    // A 32-bit avalanche, so one number different anywhere in sixty kilobytes
    // moves it. Not a cryptographic claim: a player who wants to cheat at
    // lockstep holds the whole state in their own browser and has far better
    // options than forging this.
    expect(fingerprint('a')).not.toBe(fingerprint('b'));
    expect(fingerprint('{"gold":100}')).not.toBe(fingerprint('{"gold":101}'));
  });
});

describe('the war does not depend on the process', () => {
  it('plays the same nine hundred days twice', () => {
    const a = machineWar(90210, 900, 'empire');
    const b = machineWar(90210, 900, 'empire');
    expect(a.day).toBe(b.day);
    expect(stateHash(a)).toBe(stateHash(b));
  });

  it('plays a different war from a different seed', () => {
    // Guards the guard. A hash that never moves would pass everything above.
    expect(stateHash(machineWar(90210, 200, 'empire'))).not.toBe(
      stateHash(machineWar(777, 200, 'empire')),
    );
  });
});

describe('the war does not depend on which side is watching it', () => {
  /*
   * The lockstep property, stated as a test.
   *
   * Both clients are handed the identical game and differ only in where they
   * are sitting. Everything the day does has to come out the same, which is
   * what `isMachinePlayed`, `isHumanPlayed` and `chartedByAnyone` are for:
   * each of them answers a question the day used to ask about `state.player`.
   */
  for (const seed of [4, 90210, 31337]) {
    it(`is the same war from either seat, machine-played, seed ${seed}`, () => {
      const crown = machineWar(seed, 400, 'empire');
      const confederacy = machineWar(seed, 400, 'alliance');
      expect(crown.day).toBe(confederacy.day);
      expect(stateHash(crown)).toBe(stateHash(confederacy));
    });

    it(`is the same war from either seat, both sides played, seed ${seed}`, () => {
      const walk = walkBothSeats(seed, 400);
      expect(walk.identical, `came apart on day ${walk.day}`).toBe(true);
      // And it got somewhere first. Without this the case could pass on day
      // one with an empty board; a war that has moved gold, sailed hulls and
      // written a feed is the only kind worth comparing.
      expect(walk.day).toBeGreaterThan(10);
      expect(walk.events).toBeGreaterThan(5);
    });
  }

  it('fights actions on the way, rather than stopping at the first one', () => {
    /*
     * This test used to assert the opposite.
     *
     * It read *"stops at the one thing that is not finished, and says so"*,
     * because `PendingBattle` could not be read from two chairs: it carried
     * one `settled`, filled in by asking whether *the seat* still had a hull
     * in the water, so the Crown client wrote `lost` into shared state where
     * the Confederate client wrote `won`. Both were right, which was the
     * problem — a verdict is a sentence about a side and there was nowhere in
     * it to say which side.
     *
     * The state now keeps what happened and each screen reads its own verdict
     * out of it, so the walk answers for both sides and carries on. This
     * asserts it actually met some fighting: a four-hundred-day war that
     * stayed identical without ever raising an action would prove nothing
     * about the part that was broken.
     */
    const walk = walkBothSeats(90210, 400);
    expect(walk.identical).toBe(true);
    expect(walk.day).toBeGreaterThan(100);
    expect(walk.battles, 'no action was fought, so nothing was proved').toBeGreaterThan(0);
  });

  it('tells both sides the news, rather than only the seat it was built for', () => {
    /*
     * The bug underneath half of this: a handful of places wrote an event only
     * `if (system.explored[state.player])`, so a creature's movements were
     * recorded for whichever client was the Crown's and thrown away on the
     * other. The feed is filtered when it is *read*, by `canSee`, which is the
     * rule `fog.test.ts` states outright — *"deliberately derived rather than
     * stored"* — so storing it per-seat was both a desync and a second player
     * with no news.
     *
     * Compared by id and island rather than by wording, because the wording is
     * still per-seat for some events and that is the next piece of work.
     */
    const bones = (s: GameState) => s.events.map((e) => `${e.id}@${e.systemId ?? '-'}`);
    expect(bones(machineWar(90210, 400, 'empire'))).toEqual(
      bones(machineWar(90210, 400, 'alliance')),
    );
  });
});
