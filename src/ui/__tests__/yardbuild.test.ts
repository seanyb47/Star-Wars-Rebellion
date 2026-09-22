import { describe, expect, it } from 'vitest';
import { ROSTER_CLASSES } from '../../sim/roster';

/**
 * A slipway asks once instead of listing its whole catalogue.
 *
 * Sean, 22 September: *"as the game goes on there's going to be tons and tons
 * of ships in that menu under shipyard... it should just have a button that
 * says build, and then it opens up the build panel and already filters to
 * ships."*
 *
 * The number is the argument, so it is asserted rather than described: a
 * side's slipway offers every hull its shipwrights can draw, which is four on
 * day one and every hull on the roster at the top of the ladder. The barracks
 * keeps its tile because `buildMenu` gives it exactly one item and always
 * will — one tile is a shorter path than a button that opens a panel to
 * choose among one thing.
 */
const UI = import.meta.glob('../*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const SHEET = UI['../SystemSheet.tsx'];
const APP = UI['../App.tsx'];
const BUILD = UI['../BuildSheet.tsx'];

describe('ordering a hull from the island', () => {
  it('has enough hulls per side to be worth a button', () => {
    for (const faction of ['empire', 'alliance'] as const) {
      const hulls = ROSTER_CLASSES.filter((c) => c.faction === faction);
      // Four without research, fourteen with all of it. Either number is more
      // than a grid should put between the player and the rest of the sheet.
      expect(hulls.filter((c) => c.craft === undefined).length).toBeGreaterThanOrEqual(4);
      expect(hulls.length).toBeGreaterThanOrEqual(12);
    }
  });

  it('gives a slipway one button and leaves every other yard its tiles', () => {
    expect(SHEET).toBeTruthy();
    expect(SHEET).toContain("type === 'shipyard' && menu.length > 0");
    expect(SHEET).toContain("type !== 'shipyard' && menu.length > 0");
    // The grid is still there for the barracks, so this is a split rather
    // than a removal.
    expect(SHEET).toContain('className="buildgrid"');
  });

  it('opens the shared order panel on ships, at this island', () => {
    expect(APP).toContain("kind: 'ships'");
    expect(APP).toContain("item: firstItem('ships', state.player)");
    expect(APP).toContain('destinationId: systemId');
    // Over the island sheet, so closing it returns to the yard.
    expect(APP).toContain('stacked={Boolean(openSystemId)}');
    expect(BUILD).toContain('stacked?: boolean;');
  });

  /**
   * And the panel shows the hull rather than a generic icon, which it could
   * not do until every painting was filed under its roster id.
   */
  it('draws the hull that is being ordered', () => {
    expect(BUILD).toContain('paintedShip(item) ?? paintedShip(`${you}-${cls.role}`)');
  });
});
