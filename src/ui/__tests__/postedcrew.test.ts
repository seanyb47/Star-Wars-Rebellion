import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../../sim/galaxy';
import { crewStatus } from '../CharacterSheet';

/**
 * The screens agree about who is free.
 *
 * Sean, 24 September: *"When I assign a commander to an island it doesn't
 * reduce the filter for available crew."* The sheet was the clearest proof —
 * a green **Available** badge over a paragraph saying the opposite — because
 * command is stored on the island and `status` never hears about it.
 *
 * One definition (`isFreeCrew`) and one look-up (`commandingAt`), called from
 * every screen that asks. A second hand-rolled copy of `status === 'available'
 * && !mission` is exactly how this got in, so the sources are checked too.
 */
const UI = import.meta.glob('../{Narrator.tsx,CharacterSheet.tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const SIM = import.meta.glob('../../sim/{layers.ts,missions.ts}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('the badge on a posted crew member', () => {
  it('reads In command rather than Available', () => {
    const state = generateGalaxy(4200, 'empire');
    const island = state.systems.find((s) => s.control === 'empire')!;
    const who = state.characters.find(
      (c) => c.faction === 'empire' && c.status === 'available' && !c.mission,
    )!;
    who.locationSystemId = island.id;

    expect(crewStatus(who, state).label).toBe('Available');
    island.commanderId = who.id;
    expect(crewStatus(who, state).label).toBe('In command');
    // Neutral, not a warning: being posted is not something going wrong.
    expect(crewStatus(who, state).tone).toBe('neutral');
  });

  it('still reads Available with no state to ask', () => {
    // `crewStatus` takes the state optionally and several callers have none.
    // Command lives on the island, so without the state there is nothing to
    // read — and guessing "posted" would be worse than the old answer.
    const state = generateGalaxy(4200, 'empire');
    const who = state.characters.find((c) => c.status === 'available' && !c.mission)!;
    expect(crewStatus(who).label).toBe('Available');
  });
});

describe('and every screen asks the same question', () => {
  it('the chart filter and the advisor both call isFreeCrew', () => {
    expect(SIM['../../sim/layers.ts']).toMatch(/isFreeCrew\(state, c\)/);
    expect(UI['../Narrator.tsx']).toMatch(/isFreeCrew\(state, c\)/);
  });

  it('the badge asks whether they hold an island', () => {
    expect(UI['../CharacterSheet.tsx']).toMatch(/commandingAt\(state, character\.id\)/);
  });

  it('and a commander cannot be swept along on somebody else’s errand', () => {
    expect(SIM['../../sim/missions.ts']).toMatch(/!commandingAt\(state, c\.id\) &&/);
  });

  it('leaves no hand-rolled copy of the old two-field test on those screens', () => {
    // The shape that was wrong everywhere it appeared.
    for (const src of [SIM['../../sim/layers.ts'], UI['../Narrator.tsx']]) {
      expect(src).not.toMatch(/status === 'available' && !c\.mission/);
    }
  });
});
