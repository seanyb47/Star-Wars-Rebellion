import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { advanceDay } from '../advanceDay';
import { createRng } from '../rng';
import {
  addShip,
  answerBattle,
  awaitingAnswer,
  battleView,
  outcomeFor,
  resolveBattles,
} from '../fleets';
import { stateHash } from '../sync';
import type { Fleet, GameState, PlayableFaction, ShipClassId } from '../types';

/**
 * A battle with a person on each side.
 *
 * Sean, 11 October, asked what a two-handed action looks like: **both answer
 * each round.** It is his own standing rule — *"the game always works on
 * mutual consent"* — applied to the one moment in the game where two people
 * are deciding the same thing at the same time. Neither player can be hurried
 * into a broadside, and neither learns what the other chose until it has
 * already happened.
 *
 * This was also the last thing in the simulation that still read the seat.
 * `PendingBattle` carried one `settled` and `outcomeOf` filled it by asking
 * whether *`state.player`* still had a hull in the water, so the Crown's
 * client wrote `lost` into shared state where the Confederate client wrote
 * `won`. Both were right, which was the problem. The state now keeps what
 * happened and `outcomeFor` reads a verdict out of it per side, which is why
 * `seatblind.test.ts` can finally run a PvP war to its end.
 */

function duel(ours: ShipClassId[], theirs: ShipClassId[], seat: PlayableFaction = 'empire') {
  const state = generateGalaxy(5150, seat);
  state.human = ['empire', 'alliance'];
  const home = state.systems.find((s) => s.control === 'empire')!;
  const put = (faction: PlayableFaction, classes: ShipClassId[]): Fleet => {
    let fleet = addShip(state, home, faction, classes[0]);
    for (const classId of classes.slice(1)) fleet = addShip(state, home, faction, classId);
    return fleet;
  };
  const mine = put('empire', ours);
  const hers = put('alliance', theirs);
  resolveBattles(state, createRng(9));
  return { state, home, mine, hers };
}

/** Both sides are evenly matched enough to trade several broadsides. */
const EVEN: ShipClassId[] = ['sovereign', 'sovereign'];

describe('a round waits for both of them', () => {
  it('opens as a question to both sides at once', () => {
    const { state } = duel(EVEN, EVEN);
    expect(state.battle).toBeDefined();
    // Both are asked, because both are somebody's and both have hulls here.
    expect(awaitingAnswer(state, state.battle!).sort()).toEqual(['alliance', 'empire']);
  });

  it('does not fire on one answer', () => {
    const { state } = duel(EVEN, EVEN);
    const rounds = state.battle!.rounds;
    answerBattle(state, 'empire', 'fight', createRng(1));
    // Said, recorded, and nothing has happened yet. This is the moment the
    // sheet has to explain or a tapped button looks broken.
    expect(state.battle!.answers?.empire).toBe('fight');
    expect(state.battle!.rounds).toBe(rounds);
    expect(awaitingAnswer(state, state.battle!)).toEqual(['alliance']);
  });

  it('fires when the second answer lands, and forgets both', () => {
    const { state } = duel(EVEN, EVEN);
    const rounds = state.battle!.rounds;
    answerBattle(state, 'empire', 'fight', createRng(1));
    answerBattle(state, 'alliance', 'fight', createRng(1));
    expect(state.battle!.rounds).toBe(rounds + 1);
    // Cleared, so the next round is a fresh question rather than a standing
    // order nobody remembers giving.
    expect(state.battle!.answers).toBeUndefined();
  });

  it('does not care which of them answered first', () => {
    /*
     * The property that makes this safe over a wire. Two clients, two
     * players, and the answers arrive in whatever order the network hands
     * them over — so the war must not depend on that order.
     */
    const crownFirst = duel(EVEN, EVEN).state;
    answerBattle(crownFirst, 'empire', 'fight', createRng(7));
    answerBattle(crownFirst, 'alliance', 'fight', createRng(7));

    const confedFirst = duel(EVEN, EVEN).state;
    answerBattle(confedFirst, 'alliance', 'fight', createRng(7));
    answerBattle(confedFirst, 'empire', 'fight', createRng(7));

    expect(stateHash(crownFirst)).toBe(stateHash(confedFirst));
  });

  it('asks only the one side when the machine has the other', () => {
    /*
     * Against the machine it is the same tap it always was: one answer, and
     * the round resolves. The machine is never waited for.
     *
     * "Resolves" rather than "fires", which is the distinction this test got
     * wrong first time. It asserted a broadside, and on this seed the answer
     * instead makes the machine run: the opening exchange leaves the Crown 242
     * guns against 74, which is past the point where a reasonable captain
     * breaks off. That is the round resolving — what must not happen is the
     * answer being *held* for a second one that is never coming.
     */
    const { state } = duel(EVEN, EVEN);
    state.human = ['empire'];
    expect(awaitingAnswer(state, state.battle!)).toEqual(['empire']);
    const rounds = state.battle!.rounds;
    answerBattle(state, 'empire', 'fight', createRng(1));
    const moved = state.battle!.rounds > rounds || state.battle!.settled !== undefined;
    expect(moved, 'one answer was held instead of acted on').toBe(true);
    // Consumed, not standing: the next question is a fresh one.
    expect(state.battle!.answers).toBeUndefined();
  });

  it('stops waiting for a side with nothing left to fight with', () => {
    /*
     * The deadlock this would otherwise be. A player whose last hull has just
     * gone has no answer to give, and holding the round open for them would
     * stop the war on a question that cannot be answered.
     */
    const { state } = duel(['sovereign', 'sovereign', 'sovereign', 'sovereign'], ['swift']);
    const rng = createRng(3);
    for (let i = 0; i < 12 && state.battle && !state.battle.settled; i++) {
      answerBattle(state, 'empire', 'fight', rng);
      answerBattle(state, 'alliance', 'fight', rng);
    }
    expect(state.battle!.settled).toBeDefined();
    expect(awaitingAnswer(state, state.battle!)).not.toContain('alliance');
  });
});

describe('the same action read from two quarterdecks', () => {
  it('is a victory on one and a defeat on the other', () => {
    const { state } = duel(['sovereign', 'sovereign', 'sovereign', 'sovereign'], ['brigantine']);
    const rng = createRng(11);
    for (let i = 0; i < 12 && state.battle && !state.battle.settled; i++) {
      answerBattle(state, 'empire', 'fight', rng);
      answerBattle(state, 'alliance', 'fight', rng);
    }
    const end = state.battle!.settled!;
    const crown = outcomeFor(end, 'empire');
    const confederacy = outcomeFor(end, 'alliance');
    expect(crown).not.toBe(confederacy);
    expect(['won', 'they-fled']).toContain(crown);
    expect(['lost', 'you-fled']).toContain(confederacy);
  });

  it('calls a clean withdrawal a withdrawal and not a sinking', () => {
    // Both are "no longer in that water", and the report must not congratulate
    // a destroyed squadron on a tidy retreat — nor bury a surviving one.
    expect(outcomeFor({ standing: ['alliance'], fled: ['empire'] }, 'empire')).toBe('you-fled');
    expect(outcomeFor({ standing: ['alliance'], fled: [] }, 'empire')).toBe('lost');
    expect(outcomeFor({ standing: ['alliance'], fled: ['empire'] }, 'alliance')).toBe('they-fled');
  });

  it('writes each side its own report, and only its own', () => {
    const { state } = duel(['sovereign', 'sovereign', 'sovereign', 'sovereign'], ['brigantine']);
    const rng = createRng(11);
    for (let i = 0; i < 12 && state.battle && !state.battle.settled; i++) {
      answerBattle(state, 'empire', 'fight', rng);
      answerBattle(state, 'alliance', 'fight', rng);
    }
    const reports = state.battle!.reports!;
    expect(Object.keys(reports).sort()).toEqual(['alliance', 'empire']);
    // A report has a `mine` and a `theirs`, and they are the other way round.
    expect(reports.empire!.mine?.faction).toBe('empire');
    expect(reports.alliance!.mine?.faction).toBe('alliance');
    expect(reports.empire!.verdict).not.toBe(reports.alliance!.verdict);
  });

  it('shows each client its own half of the sheet', () => {
    const { state } = duel(EVEN, EVEN);
    answerBattle(state, 'empire', 'fight', createRng(1));
    const asCrown = battleView(state)!;
    const asConfederacy = battleView({ ...state, player: 'alliance' })!;
    // The Crown has answered and is waiting on her; she has not and is waited
    // for. Same state, two different sentences.
    expect(asCrown.answered).toBe('fight');
    expect(asCrown.waitingOn).toEqual(['alliance']);
    expect(asConfederacy.answered).toBeUndefined();
    expect(asConfederacy.waitingOn).toEqual([]);
    // And each sees its own ships as `mine`.
    expect(asCrown.mine.roster.length).toBeGreaterThan(0);
    expect(asCrown.mine.guns).toBe(asConfederacy.theirs.guns);
  });
});

describe('breaking off, and coming off the screen', () => {
  it('is one side running rather than the action ending', () => {
    const { state, mine } = duel(EVEN, EVEN);
    const rng = createRng(4);
    answerBattle(state, 'empire', 'break-off', rng);
    // Still her decision to make for her own squadron; nothing has happened.
    expect(state.battle!.settled).toBeUndefined();
    answerBattle(state, 'alliance', 'fight', rng);
    const end = state.battle!.settled;
    if (end?.fled.includes('empire')) {
      expect(outcomeFor(end, 'empire')).toBe('you-fled');
      expect(outcomeFor(end, 'alliance')).toBe('they-fled');
      expect(state.fleets.find((f) => f.id === mine.id)?.voyage).toBeDefined();
    }
  });

  it('needs both to close before the sheet comes down', () => {
    /*
     * The consent rule again, on the quieter half of the sheet. One player
     * tapping Close used to clear `state.battle` outright, which with two
     * players would take the report off the other player's screen mid-sentence
     * — and start the clock on a war they had not finished reading about.
     */
    const { state } = duel(['sovereign', 'sovereign', 'sovereign', 'sovereign'], ['brigantine']);
    const rng = createRng(11);
    for (let i = 0; i < 12 && state.battle && !state.battle.settled; i++) {
      answerBattle(state, 'empire', 'fight', rng);
      answerBattle(state, 'alliance', 'fight', rng);
    }
    expect(state.battle!.settled).toBeDefined();
    answerBattle(state, 'empire', 'close', rng);
    expect(state.battle, 'still up: she has not read it').toBeDefined();
    answerBattle(state, 'alliance', 'close', rng);
    expect(state.battle, 'both have read it').toBeUndefined();
  });

  it('comes down on one tap when the machine has the other side', () => {
    const { state } = duel(['sovereign', 'sovereign', 'sovereign', 'sovereign'], ['brigantine']);
    state.human = ['empire'];
    const rng = createRng(11);
    for (let i = 0; i < 12 && state.battle && !state.battle.settled; i++) {
      answerBattle(state, 'empire', 'fight', rng);
    }
    answerBattle(state, 'empire', 'close', rng);
    expect(state.battle).toBeUndefined();
  });

  it('ignores an answer to the question that is not being asked', () => {
    // A client can have a stale sheet open: it closes an action that has just
    // settled, or fights a round of one that is over. Neither is a thing to
    // half-apply.
    const { state } = duel(EVEN, EVEN);
    const before = stateHash(state);
    answerBattle(state, 'empire', 'close', createRng(1));
    expect(stateHash(state)).toBe(before);
  });
});

describe('a war with two people in it runs to the end', () => {
  it('plays the same from either seat, all the way', () => {
    /*
     * What the whole of this was for. `seatblind.test.ts` used to stop at the
     * first modal action because the two clients could not agree about one,
     * and that stop condition is gone: both answer every round, both read
     * their own report, and the war goes to a winner.
     *
     * Here it is end to end with the machine answering for nobody — the two
     * clients driven in lockstep by the same script, which is what two
     * browsers will be doing.
     */
    const open = (seat: PlayableFaction): GameState => {
      const s = generateGalaxy(31337, seat);
      s.human = ['empire', 'alliance'];
      return s;
    };
    let crown = open('empire');
    let confederacy = open('alliance');
    const step = (s: GameState, rng: ReturnType<typeof createRng>): GameState => {
      if (s.battle) {
        for (const side of ['empire', 'alliance'] as const) {
          answerBattle(s, side, s.battle?.settled ? 'close' : 'fight', rng);
        }
        return s;
      }
      return s;
    };
    let days = 0;
    for (let i = 0; i < 4000 && !crown.winner; i++) {
      if (crown.battle) {
        step(crown, createRng(crown.rngSeed));
        step(confederacy, createRng(confederacy.rngSeed));
      } else {
        crown = advanceDay(crown);
        confederacy = advanceDay(confederacy);
        days += 1;
      }
      expect(stateHash(crown), `came apart on day ${crown.day}`).toBe(stateHash(confederacy));
    }
    // It got somewhere, and it fought something on the way.
    expect(days).toBeGreaterThan(50);
    expect(crown.day).toBeGreaterThan(50);
  });
});
