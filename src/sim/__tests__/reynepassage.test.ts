import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { passageDays, travelDays, startMission } from '../missions';
import { passageShare, powerOf } from '../lords';
import type { GameState } from '../types';

/**
 * The quoted sail and the sailed sail are one number.
 *
 * Sean's dev report, twice: *"Reyne's mission sail estimate is still wrong.
 * The planning screen shows his full passage... but he actually arrives in
 * ~half."* The cause was two functions — `travelDays` in the preview,
 * `travelDays × passageShare` in the order — and the fix was to make the
 * preview call the one the order calls.
 *
 * Which means the test worth having is not "Reyne is halved" but **"the
 * preview equals the booking"**, for everybody. A future power that touches
 * passage cannot reopen the same gap without failing this.
 */
function pair(state: GameState, name: string, targetId: string) {
  const who = state.characters.find((c) => c.name === name)!;
  const quoted = passageDays(state, who, targetId);
  startMission(state, who.id, targetId, 'diplomacy');
  return { quoted, booked: who.mission!.daysRemaining, phase: who.mission!.phase };
}

describe('what the errand sheet quotes', () => {
  it('is what the order books, for the runner and for everybody else', () => {
    for (const seed of [3, 11, 55, 101]) {
      const state = generateGalaxy(seed, 'alliance');
      const crew = state.characters.filter((c) => c.faction === 'alliance');
      const target = state.systems.find(
        (s) => s.explored.alliance && s.populated && s.id !== crew[0].locationSystemId,
      )!;
      for (const who of crew) {
        if (who.locationSystemId === target.id) continue;
        const { quoted, booked, phase } = pair(state, who.name, target.id);
        expect([who.name, quoted]).toEqual([who.name, booked]);
        expect(phase).toBe('travelling');
      }
    }
  });

  it('quotes Reyne half of what it quotes anybody else from the same quay', () => {
    const state = generateGalaxy(11, 'alliance');
    const reyne = state.characters.find((c) => c.name === 'Captain Silas Reyne')!;
    const other = state.characters.find(
      (c) => c.faction === 'alliance' && c.id !== reyne.id,
    )!;
    other.locationSystemId = reyne.locationSystemId;
    const target = state.systems.find(
      (s) => s.explored.alliance && s.populated && s.id !== reyne.locationSystemId,
    )!;

    expect(powerOf(reyne)).toBe('runner');
    expect(passageShare(reyne)).toBe(0.5);
    const full = travelDays(state, reyne.locationSystemId, target.id);
    expect(passageDays(state, other, target.id)).toBe(full);
    expect(passageDays(state, reyne, target.id)).toBe(Math.max(1, Math.ceil(full / 2)));
  });

  it('is what the errand sheet actually calls, and not the raw distance', () => {
    /*
     * The bug was a screen reaching past the helper, so the screen is what is
     * pinned. `travelDays` on this sheet is the regression.
     */
    const sources = import.meta.glob('../../ui/MissionChoiceSheet.tsx', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const sheet = Object.values(sources)[0];
    expect(sheet).toBeTruthy();
    expect(sheet).toContain('passageDays(state, character, systemId)');
    expect(sheet).not.toContain('travelDays(');
  });
});
