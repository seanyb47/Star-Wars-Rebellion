import { describe, expect, it } from 'vitest';
import {
  VERDICT_WORD,
  assaultStrategic,
  battleStrategic,
  bombardStrategic,
  forceName,
  verdictOf,
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

/*
 * `report()` and `force()` stood here, building a whole OperationReport and a
 * force tally for the `tensionOf` suite. Both went when that line did: nothing
 * else in this file needs a full report, because the builders below are pure
 * functions over their own arguments.
 */

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
    const lines = battleStrategic({ ...common, verdict: 'draw', withdrewTo: 'Highwater' });
    expect(lines[0]).toMatch(/drawn/i);
    // And it never claims either side was destroyed or driven off.
    expect(lines.join(' ')).not.toMatch(/nothing of (yours|theirs) is left afloat/i);
    expect(lines.join(' ')).toMatch(/both fleets are still in the water/i);
  });

  /** §3: a defeat leads with what the player lost. */
  it('opens a defeat on the player being forced off, and says where they went', () => {
    const lines = battleStrategic({ ...common, verdict: 'defeat', withdrewTo: 'Highwater' });
    expect(lines[0]).toMatch(/your fleet has (withdrawn|been destroyed)/i);
    expect(lines.join(' ')).toContain('Highwater');
  });

  it('opens a victory on the enemy being gone and the water being yours', () => {
    const lines = battleStrategic({ ...common, verdict: 'victory', theyFled: true });
    expect(lines[0]).toMatch(/fleet has (withdrawn|been destroyed)/i);
    expect(lines[1]).toMatch(/your fleet holds the water/i);
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
    expect(lines.join(' ')).toMatch(/no landing can be made/i);
    expect(lines.join(' ')).toMatch(/no landing/i);
  });

  it('says the harbor is silenced only when it actually is', () => {
    const lines = bombardStrategic({ ...common, verdict: 'victory', wallsDown: 3, wallsLeft: 0 });
    expect(lines[0]).toMatch(/harbor defences of .* have been destroyed/i);
    expect(lines[1]).toMatch(/a landing can be made/i);
  });

  /** §7: the tradeoff must be immediately apparent. */
  it('says the town was hit when the town was hit', () => {
    const lines = bombardStrategic({ ...common, verdict: 'draw', wallsDown: 1, civilian: 1 });
    expect(lines.join(' ')).toMatch(/the town was hit/i);
  });
});

describe('an assault', () => {
  const common = { where: 'Coralhome', holder: 'Brethren', aboard: 0, allegiance: 34 };

  /** §8, and the sentence that matters most in the specification: *"military
   *  capture does not automatically equal political allegiance."* */
  it('says an island is taken and its people are not, as two separate facts', () => {
    const lines = assaultStrategic({ ...common, verdict: 'victory', allegiance: 34 });
    expect(lines[0]).toMatch(/have taken control of/i);
    expect(lines[1]).toMatch(/the island is hostile/i);
    // And not when they wanted you.
    const welcomed = assaultStrategic({ ...common, verdict: 'victory', allegiance: 80 });
    expect(welcomed[1]).not.toMatch(/hostile/i);
  });

  /** §10: thrown back with the boats still full is not the same as thrown
   *  back into the sea. */
  it('tells being repulsed apart from being unable to finish', () => {
    const beaten = assaultStrategic({ ...common, verdict: 'defeat' }).join(' ');
    const unfinished = assaultStrategic({ ...common, verdict: 'draw', aboard: 3 }).join(' ');
    expect(beaten).toMatch(/no troops remain/i);
    // §10's requirement is that a draw says the attacker can go again. The
    // line that said "both forces are still capable of continuing" went on 22
    // September: it restated the count on the line above it, which is the
    // fluff Sean cut. The count is the claim now.
    expect(unfinished).toMatch(/3 troops remain aboard/i);
    expect(unfinished).not.toMatch(/no troops remain/i);
  });
});

/*
 * The suite for `tensionOf` stood here — five tests over §13's branches, one
 * per way a verdict and its consequences can pull apart.
 *
 * Sean cut the line itself on 22 September, beside five Rebellion resolution
 * screens: *"see how they're all crazy simple. Just bottom line up front. You
 * keep adding so much fluff, no one knows what it means."* §13's observation
 * was sound — a victory really can be expensive and a defeat really can play
 * well — but the sheet already shows both halves as numbers, in the tallies
 * and in the political ripples. The line was telling the player what to
 * conclude from figures in front of them, which is the definition of the
 * fluff he is describing.
 *
 * The tests go with the function. What replaces them is the register check
 * below, which is the rule the whole rewrite came from.
 */

describe('the report screens read like reports', () => {
  /*
   * Rebellion's own resolution screens are the specification now, and they are
   * strikingly plain: *"The Imperial fleet is victorious."* *"Deyer is now
   * under blockade by Imperial forces."* *"Imperial troops have taken control
   * of the Alliance system Geedon V."* Subject, verb, object; one fact a line;
   * the outcome first.
   *
   * What ours did instead was invert and elaborate — *"Nothing of theirs is
   * left afloat off Deyer"*, *"the water off Deyer is yours to lie in"*,
   * *"carried, and the troops that took it are holding it"*. Each is a
   * sentence a person would enjoy writing and a sentence a player has to
   * unpack.
   *
   * These are the tells, so they are asserted rather than described: a line
   * that opens on a negation, and the idioms that were actually in the file.
   */
  const lines = () => [
    ...battleStrategic({ verdict: 'victory', where: 'Deyer', theirs: 'Free Confederacy', ashore: 'Deyer is still yours.' }),
    ...battleStrategic({ verdict: 'defeat', where: 'Deyer', theirs: 'Free Confederacy', ashore: 'Deyer is still yours.', wiped: true }),
    ...battleStrategic({ verdict: 'draw', where: 'Deyer', theirs: 'Free Confederacy', ashore: 'Deyer is still yours.' }),
    ...bombardStrategic({ verdict: 'victory', where: 'Deyer', wallsDown: 2, wallsLeft: 0, companies: 0, civilian: 1 }),
    ...bombardStrategic({ verdict: 'defeat', where: 'Deyer', wallsDown: 0, wallsLeft: 2, companies: 0, civilian: 0 }),
    ...bombardStrategic({ verdict: 'draw', where: 'Deyer', wallsDown: 1, wallsLeft: 1, companies: 2, civilian: 1 }),
    ...assaultStrategic({ verdict: 'victory', where: 'Deyer', holder: 'Crown Imperium', aboard: 0, allegiance: 30 }),
    ...assaultStrategic({ verdict: 'defeat', where: 'Deyer', holder: 'Crown Imperium', aboard: 0, allegiance: 30 }),
    ...assaultStrategic({ verdict: 'draw', where: 'Deyer', holder: 'Crown Imperium', aboard: 2, allegiance: 30 }),
  ];

  it('opens no line on a negation', () => {
    for (const line of lines()) {
      // The tell is a delayed subject, not the word "no". "No landing can be
      // made" is as plain as Rebellion's own lines; "Nothing of theirs is left
      // afloat" and "Neither squadron is destroyed" make the reader wait for
      // what the sentence is about, which is the habit being removed.
      expect(line, line).not.toMatch(/^(Nothing|Neither)\b/);
    }
  });

  it('keeps the idioms out', () => {
    const banned = [
      /yours to lie in/i,
      /is carried/i,
      /free to do something else/i,
      /as they did this morning/i,
      /will be remembered/i,
      /for now\b/i,
      /two different problems/i,
    ];
    for (const line of lines()) {
      for (const bad of banned) {
        expect(line, line).not.toMatch(bad);
      }
    }
  });

  it('is a test that can fail: the sweep sees the lines it is checking', () => {
    // Non-vacuity. If `lines()` ever returns nothing the two assertions above
    // are free, so the count is pinned.
    expect(lines().length).toBeGreaterThanOrEqual(20);
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
