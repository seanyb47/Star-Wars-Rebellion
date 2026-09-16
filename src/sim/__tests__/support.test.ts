import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { canFlip, controlTally, resolveControlAndUnrest } from '../support';
import { getSystem } from '../helpers';
import type { GameState } from '../types';

function neutralCoreSystem(state: GameState) {
  return state.systems.find((s) => s.control === 'neutral' && s.isCore)!;
}

describe('control flips', () => {
  it('flips a neutral world at a supermajority', () => {
    const state = generateGalaxy(55);
    const system = neutralCoreSystem(state);
    system.support = { empire: 80, alliance: 20 };
    expect(canFlip(system, 'empire')).toBe(true);
    resolveControlAndUnrest(state);
    expect(getSystem(state, system.id).control).toBe('empire');
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

  it('emits an event when a world declares for a side', () => {
    const state = generateGalaxy(55);
    const system = neutralCoreSystem(state);
    system.support = { empire: 15, alliance: 85 };
    const before = state.events.length;
    resolveControlAndUnrest(state);
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
  it('rises when support drops below 30 and the garrison is too thin', () => {
    const state = generateGalaxy(56);
    const system = state.systems.find((s) => s.control === 'empire')!;
    system.support.empire = 20;
    system.garrison = 2; // needs ceil((50-20)/10) = 3
    resolveControlAndUnrest(state);
    expect(getSystem(state, system.id).uprising).toBe(true);
  });

  it('stays quiet when the garrison meets the requirement', () => {
    const state = generateGalaxy(56);
    const system = state.systems.find((s) => s.control === 'empire')!;
    system.support.empire = 20;
    system.garrison = 4;
    resolveControlAndUnrest(state);
    expect(getSystem(state, system.id).uprising).toBe(false);
  });

  it('ends once support climbs back to 40', () => {
    const state = generateGalaxy(56);
    const system = state.systems.find((s) => s.control === 'empire')!;
    system.support.empire = 10;
    system.garrison = 0;
    resolveControlAndUnrest(state);
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
