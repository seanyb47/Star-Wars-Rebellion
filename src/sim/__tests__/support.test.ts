import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { joinChance } from '../politics';
import { generateGalaxy } from '../galaxy';
import { controlTally, resolveControlAndUnrest } from '../support';
import { getSystem } from '../helpers';
import type { GameState } from '../types';

function neutralCoreSystem(state: GameState) {
  return state.systems.find((s) => s.control === 'neutral' && s.isCore)!;
}

describe('control flips', () => {
  /**
   * The eighty-point line is gone. Sean's brief, 17 September: an unaligned
   * island joins after a meeting that went well, at a chance that climbs with
   * its warmth and never reaches certainty — see `joinChance` and
   * `parleyOutcome`. Arithmetic alone never moves a flag now, at any number.
   */
  it('never runs up a flag on arithmetic, however warm the island is', () => {
    const state = generateGalaxy(55);
    const system = neutralCoreSystem(state);
    for (const standing of [80, 95, 100]) {
      system.support = { empire: standing, alliance: 100 - standing };
      resolveControlAndUnrest(state, createRng(3));
      expect(getSystem(state, system.id).control).toBe('neutral');
    }
    // And the warmer it is, the likelier the next good meeting carries it.
    system.support = { empire: 95, alliance: 5 };
    const warm = joinChance(system, 'empire');
    system.support = { empire: 62, alliance: 38 };
    const cool = joinChance(system, 'empire');
    expect(warm).toBeGreaterThan(cool);
    expect(warm).toBeLessThan(1);
  });

  it('does not flip a point below the bar', () => {
    const state = generateGalaxy(55);
    const system = neutralCoreSystem(state);
    system.support = { empire: 79, alliance: 21 };
    resolveControlAndUnrest(state);
    expect(getSystem(state, system.id).control).toBe('neutral');
  });

  it('wants a supermajority, not merely a lead', () => {
    // Seven islanders in ten is a comfortable lead and still not a flag.
    const state = generateGalaxy(55);
    const system = neutralCoreSystem(state);
    system.support = { empire: 70, alliance: 30 };
    resolveControlAndUnrest(state);
    expect(getSystem(state, system.id).control).toBe('neutral');
  });

  /**
   * The one flag arithmetic still moves, and it is a physical fact rather than
   * a political one: a harbor with no company standing in it is not held by
   * anybody, whatever the map says. Sean's rule of 15 September, and the
   * political rework left it exactly where it was.
   */
  it('emits an event when an empty harbor changes hands', () => {
    const state = generateGalaxy(55);
    const system = state.systems.find((s) => s.control === 'empire' && s.populated)!;
    system.support = { empire: 15, alliance: 85 };
    system.garrison = 0;
    const before = state.events.length;
    resolveControlAndUnrest(state);
    expect(getSystem(state, system.id).control).toBe('alliance');
    expect(state.events.length).toBeGreaterThan(before);
    expect(state.events.at(-1)!.systemId).toBe(system.id);
  });

  it('leaves an already-controlled world alone even at high enemy support', () => {
    const state = generateGalaxy(55);
    const system = state.systems.find((s) => s.control === 'empire')!;
    system.support = { empire: 10, alliance: 90 };
    system.garrison = 10;
    resolveControlAndUnrest(state);
    expect(getSystem(state, system.id).control).toBe('empire');
  });
});

describe('uprisings', () => {
  /**
   * There is no line any more. Sean's brief, 17 September: *"do not make
   * allegiance under thirty an automatic Mutiny trigger... actual Mutiny
   * should be determined by the combination of allegiance, garrison, officer
   * presence, and Incite pressure."*
   *
   * So these ask what they should have asked all along — does a wretched,
   * unheld island rise *eventually*, and does a garrison stop it — rather than
   * whether one particular morning tips a threshold.
   */
  it('rises, given days, when the island is sullen and nobody is holding it', () => {
    const state = generateGalaxy(56);
    const system = state.systems.find((s) => s.control === 'empire')!;
    system.support.empire = 20;
    system.garrison = 0;
    const rng = createRng(11);
    let rose = false;
    for (let d = 0; d < 120 && !rose; d++) {
      resolveControlAndUnrest(state, rng);
      rose = getSystem(state, system.id).uprising;
    }
    expect(rose).toBe(true);
  });

  it('never rises while the square is full, however sullen it gets', () => {
    const state = generateGalaxy(56);
    const system = state.systems.find((s) => s.control === 'empire')!;
    system.support.empire = 10;
    system.garrison = 8;
    const rng = createRng(11);
    for (let d = 0; d < 400; d++) resolveControlAndUnrest(state, rng);
    expect(getSystem(state, system.id).uprising).toBe(false);
  });

  it('is never rolled at all without the dice, so a mid-tick re-derive is safe', () => {
    const state = generateGalaxy(56);
    const system = state.systems.find((s) => s.control === 'empire')!;
    system.support.empire = 1;
    system.garrison = 0;
    for (let d = 0; d < 200; d++) resolveControlAndUnrest(state);
    expect(getSystem(state, system.id).uprising).toBe(false);
  });

  it('ends once support climbs back to 40', () => {
    const state = generateGalaxy(56);
    const system = state.systems.find((s) => s.control === 'empire')!;
    system.support.empire = 10;
    system.garrison = 0;
    const rng = createRng(11);
    for (let d = 0; d < 200 && !getSystem(state, system.id).uprising; d++) {
      resolveControlAndUnrest(state, rng);
    }
    expect(getSystem(state, system.id).uprising).toBe(true);

    system.support.empire = 39;
    resolveControlAndUnrest(state);
    expect(getSystem(state, system.id).uprising).toBe(true);

    system.support.empire = 40;
    resolveControlAndUnrest(state);
    expect(getSystem(state, system.id).uprising).toBe(false);
  });
});

describe('unpopulated worlds', () => {
  it('are held only while a garrison is present', () => {
    const state = generateGalaxy(57);
    const system = state.systems.find((s) => !s.populated)!;
    system.control = 'empire';
    system.garrison = 1;
    resolveControlAndUnrest(state);
    expect(getSystem(state, system.id).control).toBe('empire');

    system.garrison = 0;
    resolveControlAndUnrest(state);
    expect(getSystem(state, system.id).control).toBe('none');
  });

  it('never enter an uprising', () => {
    const state = generateGalaxy(57);
    const system = state.systems.find((s) => !s.populated)!;
    system.control = 'empire';
    system.garrison = 1;
    system.support = { empire: 0, alliance: 0 };
    resolveControlAndUnrest(state);
    expect(getSystem(state, system.id).uprising).toBe(false);
  });
});

describe('control tally', () => {
  it('counts only populated systems', () => {
    const state = generateGalaxy(58);
    const tally = controlTally(state);
    expect(tally.populated).toBe(state.systems.filter((s) => s.populated).length);
    expect(tally.empire).toBe(
      state.systems.filter((s) => s.populated && s.control === 'empire').length,
    );
  });
});

describe('companies ashore', () => {
  it('faces down a revolt at six, whatever the island still thinks of you', () => {
    const state = generateGalaxy(56);
    const system = state.systems.find((s) => s.control === 'empire')!;
    system.support.empire = 10;
    system.uprising = true;
    system.garrison = 5;
    resolveControlAndUnrest(state);
    expect(getSystem(state, system.id).uprising).toBe(true);

    system.garrison = 6;
    resolveControlAndUnrest(state);
    expect(getSystem(state, system.id).uprising).toBe(false);
    expect(state.events.at(-1)!.text).toContain('quiet again');
  });
});
