import { describe, expect, it } from 'vitest';

/**
 * Your own ships are never a memory.
 *
 * Sean, 23 September: *"I moved my fleet to an enemy island. It disappears."*
 * It did, and the shape of the bug is worth keeping a test on because it is
 * the kind that reads as correct: the Harbor tab was an either/or — the live
 * harbor on your own island, the *last report* on theirs — so a squadron of
 * yours standing in their water fell down the gap between the two branches. It
 * is not in their harbor report, and their harbor report was the whole tab.
 *
 * The rule now is that both are on screen: yours live, always, and theirs from
 * the report. So this holds the two halves apart — `ShipsHere` must not be
 * inside the report's ternary, and it must be asked to show only your own
 * hulls when there is a report, or the tab would hand over their live order of
 * battle, which is what espionage is for.
 */
const UI = import.meta.glob('../*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const SHEET = (UI['../SystemSheet.tsx'] ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
const PANEL = (UI['../FleetPanel.tsx'] ?? '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('an island sheet shows your own hulls wherever they are', () => {
  it('does not put the live harbor behind "is there a report"', () => {
    expect(SHEET).toBeTruthy();
    // The shape that broke it: `report ? <RememberedHarbor/> : <ShipsHere/>`.
    expect(SHEET).not.toMatch(/report \?\s*\n?\s*<RememberedHarbor[\s\S]{0,400}?<ShipsHere/);
    expect(SHEET).toMatch(/<ShipsHere/);
  });

  it('still shows the enemy harbor as a report rather than live', () => {
    expect(SHEET).toMatch(/minesOnly=\{Boolean\(report\)\}/);
    expect(SHEET).toMatch(/\{report && <RememberedHarbor/);
  });

  it('and the panel filters to your own when it is asked to', () => {
    expect(PANEL).toBeTruthy();
    // `here` is what the tab lists. With `minesOnly` it has to be yours only.
    expect(PANEL).toMatch(/!minesOnly \|\| f\.faction === state\.player/);
  });
});
