import { describe, expect, it } from 'vitest';
import {
  VERDICT_WORD,
  assaultStrategic,
  battleStrategic,
  bombardStrategic,
  forceName,
  tensionOf,
  verdictOf,
  type OperationReport,
} from '../outcome';
import type { BattleOutcome } from '../types';

/**
 * Sean's combat outcome specification, and the sentence the whole thing turns
 * on: *"LOSS and DRAW must have their own presentation logic, not simply be
 * the same screen with the word changed."*
 *
 * So most of these ask whether the three screens genuinely differ — in what
 * they say, in what order, and in what they refuse to claim — rather than
 * whether the arithmetic adds up.
 */

function report(over: Partial<OperationReport> = {}): OperationReport {
  return {
    kind: 'battle',
    verdict: 'victory',
    headline: 'Victory',
    operation: 'Fleet action',
    title: 'Action off Coralhome',
    systemId: 'sys-1',
    day: 100,
    people: [],
    damage: [],
    strategic: [],
    political: [],
    ...over,
  };
}

function force(over: Partial<OperationReport['mine']> = {}) {
  return {
    faction: 'empire' as const,
    name: 'Fleet',
    committed: 8,
    destroyed: 1,
    damaged: 2,
    surviving: 7,
    roster: [],
    ...over,
  };
}

describe('the three states', () => {
  /** §11: victory is the objective achieved, defeat is the opponent
   *  decisively prevailing, and a draw is the objective unresolved. */
  it('reads a broken-off action as a draw and not as a defeat', () => {
    expect(verdictOf('you-fled')).toBe('draw');
    expect(verdictOf('lost')).toBe('defeat');
    expect(verdictOf('won')).toBe('victory');
    expect(verdictOf('they-fled')).toBe('victory');
    expect(verdictOf('beast-slain')).toBe('victory');
  });

  it('has a word of its own for each, and never reuses one', () => {
    const words = Object.values(VERDICT_WORD);
    expect(new Set(words).size).toBe(words.length);
  });

  it('names the force rather than the faction', () => {
    expect(forceName('empire', 'battle')).toMatch(/fleet$/);
    expect(forceName('alliance', 'assault')).toMatch(/landing force$/);
  });
});

describe('what each screen leads with', () => {
  const common = {
    where: 'Coralhome',
    theirs: 'Brethren',
    ashore: 'Coralhome is still theirs.',
  };

  /** §4: a draw's first fact is that nothing was settled. */
  it('opens a draw on the absence of a decision', () => {
    const lines = battleStrategic({ ...common, verdict: 'draw', withdrewTo: 'The Aldermain' });
    expect(lines[0]).toMatch(/no decisive control/i);
    // And it never claims either side was destroyed or driven off.
    expect(lines.join(' ')).not.toMatch(/nothing of (yours|theirs) is left afloat/i);
    expect(lines.join(' ')).toMatch(/neither/i);
  });

  /** §3: a defeat leads with what the player lost. */
  it('opens a defeat on the player being forced off, and says where they went', () => {
    const lines = battleStrategic({ ...common, verdict: 'defeat', withdrewTo: 'The Aldermain' });
    expect(lines[0]).toMatch(/forced off|nothing of yours/i);
    expect(lines.join(' ')).toContain('The Aldermain');
  });

  it('opens a victory on the enemy being gone and the water being yours', () => {
    const lines = battleStrategic({ ...common, verdict: 'victory', theyFled: true });
    expect(lines[0]).toMatch(/driven off/i);
    expect(lines[1]).toMatch(/yours to lie in/i);
  });

  /** The three lists must not be the same list. */
  it('gives three different accounts of the same action', () => {
    const victory = battleStrategic({ ...common, verdict: 'victory' }).join('|');
    const defeat = battleStrategic({ ...common, verdict: 'defeat' }).join('|');
    const draw = battleStrategic({ ...common, verdict: 'draw' }).join('|');
    expect(new Set([victory, defeat, draw]).size).toBe(3);
  });

  /** §2, §3 and §4 all end on who holds the island, whatever happened at sea:
   *  control of the water and control of the ground are different things. */
  it('says who holds the island in all three, whatever the water did', () => {
    for (const verdict of ['victory', 'defeat', 'draw'] as const) {
      expect(battleStrategic({ ...common, verdict }).join(' ')).toContain('still theirs');
    }
  });
});

describe('a bombardment is not won or lost', () => {
  const common = { where: 'Coralhome', wallsDown: 0, wallsLeft: 3, companies: 0, civilian: 0 };

  /** §6: *"the player should not receive a generic Defeat screen when the
   *  operation simply failed to accomplish its bombardment objective."* */
  it('says why nothing happened rather than calling it a beating', () => {
    const lines = bombardStrategic({
      ...common,
      verdict: 'defeat',
      why: 'The squadron has not the guns left to work a wall.',
    });
    expect(lines[0]).toContain('not the guns');
    expect(lines.join(' ')).not.toMatch(/defeat|beaten/i);
  });

  /** §7: *"do not call this a victory simply because something was
   *  destroyed."* */
  it('calls a wall down with the harbor still firing inconclusive', () => {
    const lines = bombardStrategic({ ...common, verdict: 'draw', wallsDown: 1, wallsLeft: 2 });
    expect(lines.join(' ')).toMatch(/not silenced/i);
    expect(lines.join(' ')).toMatch(/no landing/i);
  });

  it('says the harbor is silenced only when it actually is', () => {
    const lines = bombardStrategic({ ...common, verdict: 'victory', wallsDown: 3, wallsLeft: 0 });
    expect(lines[0]).toMatch(/silenced/i);
    expect(lines[1]).toMatch(/landing can be put ashore/i);
  });

  /** §7: the tradeoff must be immediately apparent. */
  it('says the town was hit when the town was hit', () => {
    const lines = bombardStrategic({ ...common, verdict: 'draw', wallsDown: 1, civilian: 1 });
    expect(lines.join(' ')).toMatch(/into the town/i);
  });
});

describe('an assault', () => {
  const common = { where: 'Coralhome', holder: 'Brethren', aboard: 0, allegiance: 34 };

  /** §8, and the sentence that matters most in the specification: *"military
   *  capture does not automatically equal political allegiance."* */
  it('says an island is taken and its people are not, as two separate facts', () => {
    const lines = assaultStrategic({ ...common, verdict: 'victory', allegiance: 34 });
    expect(lines[0]).toMatch(/carried/i);
    expect(lines[1]).toMatch(/politically hostile/i);
    // And not when they wanted you.
    const welcomed = assaultStrategic({ ...common, verdict: 'victory', allegiance: 80 });
    expect(welcomed[1]).not.toMatch(/hostile/i);
  });

  /** §10: thrown back with the boats still full is not the same as thrown
   *  back into the sea. */
  it('tells being repulsed apart from being unable to finish', () => {
    const beaten = assaultStrategic({ ...common, verdict: 'defeat' }).join(' ');
    const unfinished = assaultStrategic({ ...common, verdict: 'draw', aboard: 3 }).join(' ');
    expect(beaten).toMatch(/nothing left/i);
    expect(unfinished).toMatch(/still aboard/i);
    expect(unfinished).toMatch(/still capable/i);
    expect(unfinished).not.toMatch(/nothing left/i);
  });
});

describe('the word and the consequences are reported apart', () => {
  /** §13, every branch of it. */
  it('says so when a victory cost more than it was worth', () => {
    const said = tensionOf(
      report({
        verdict: 'victory',
        mine: force({ destroyed: 5 }),
        theirs: force({ faction: 'alliance', destroyed: 1 }),
      }),
    );
    expect(said).toMatch(/cost/i);
  });

  it('says so when a defeat left the enemy wrecked', () => {
    const said = tensionOf(
      report({
        verdict: 'defeat',
        mine: force({ destroyed: 2 }),
        theirs: force({ faction: 'alliance', destroyed: 6 }),
      }),
    );
    expect(said).toMatch(/long time making good/i);
  });

  it('says so when a defeat played well with the Reach', () => {
    const said = tensionOf(
      report({
        verdict: 'defeat',
        mine: force({ destroyed: 3 }),
        theirs: force({ faction: 'alliance', destroyed: 1 }),
        political: [{ systemId: 'a', name: 'A', faction: 'empire', delta: 2 }],
      }),
    );
    expect(said).toMatch(/thinks the better of you/i);
  });

  /** A draw is not automatically politically neutral — §4 says so outright. */
  it('says so when a draw cost or won standing', () => {
    const lost = tensionOf(
      report({
        verdict: 'draw',
        political: [{ systemId: 'a', name: 'A', faction: 'empire', delta: -2 }],
      }),
    );
    const won = tensionOf(
      report({
        verdict: 'draw',
        political: [{ systemId: 'a', name: 'A', faction: 'empire', delta: 2 }],
      }),
    );
    expect(lost).toMatch(/nothing settled/i);
    expect(won).toMatch(/nothing settled/i);
    expect(lost).not.toBe(won);
  });

  it('says nothing at all when the word and the facts agree', () => {
    expect(
      tensionOf(
        report({
          verdict: 'victory',
          mine: force({ destroyed: 1 }),
          theirs: force({ faction: 'alliance', destroyed: 5 }),
        }),
      ),
    ).toBeUndefined();
  });
});

describe('every ending has a verdict', () => {
  it('folds all five ways an action can end into one of the three', () => {
    const endings: BattleOutcome[] = ['won', 'lost', 'they-fled', 'you-fled', 'beast-slain'];
    for (const ending of endings) {
      expect(['victory', 'defeat', 'draw']).toContain(verdictOf(ending));
    }
  });
});
