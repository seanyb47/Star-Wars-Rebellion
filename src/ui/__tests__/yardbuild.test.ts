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

  /**
   * Every maker is a button, and the grid is gone.
   *
   * The first pass gave the slipway a button and kept the barracks' tiles,
   * because a barracks offers exactly one item. Sean overruled it the same
   * day — *"basically all isle building facilities (ships, troops) need to be
   * links to the build page"* — and he is right that an island sheet where
   * one maker is a button and the other is a grid makes the player learn two
   * things instead of one.
   */
  it('gives every maker the same button and keeps no grid', () => {
    expect(SHEET).toBeTruthy();
    expect(SHEET).toContain('mine && !order && buildKind && menu.length > 0');
    // The inline catalogue is gone entirely, from every works.
    expect(SHEET).not.toContain('className="buildgrid"');
    expect(SHEET).not.toContain("type === 'shipyard' && menu.length > 0");
  });

  /**
   * And the mapping is the only thing that decides which page opens, so it is
   * pinned rather than described. A works that makes no units returns nothing
   * and gets no button, which is what keeps a mine or a mill from offering a
   * way into an empty panel.
   */
  it('maps each maker to its page, and everything else to none', () => {
    const fn = SHEET.slice(
      SHEET.indexOf('function buildKindFor'),
      SHEET.indexOf('function WorksCard'),
    );
    expect(fn).toContain("if (type === 'shipyard') return 'ships';");
    expect(fn).toContain("if (type === 'training_facility') return 'troops';");
    expect(fn).toContain('return undefined;');
    // Both labels exist, so neither maker falls back to the other's wording.
    expect(SHEET).toContain('Build a hull here');
    expect(SHEET).toContain('Raise a troop here');
  });

  it('opens the shared order panel on that maker\'s page, at this island', () => {
    // The kind comes from the works rather than being hardcoded, which is
    // what lets one handler serve both makers.
    expect(APP).toContain('onOrderFrom={(systemId, kind) => {');
    expect(APP).toContain('item: firstItem(kind, state.player)');
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

  /**
   * Three figures and a link, on all three pages.
   *
   * Sean, 22 September, twice: *"all I need to see for stats is Construction
   * Cost / Time to Completion / Upkeep. That's it"*, and then *"just put an
   * info button that goes to encyclopedia if people want to read more about
   * what they're building."* So what the panel owes the reader is three
   * numbers and a way out to the rest — not a hull's combat grid, and not a
   * paragraph of flavour the encyclopedia already carries.
   */
  it('shows the three figures and no stat grid', () => {
    expect(BUILD).toContain('<dt>Construction Cost</dt>');
    expect(BUILD).toContain('<dt>Time to Completion</dt>');
    // The third label varies, because a mine earns where a hull costs.
    expect(BUILD).toContain('<dt>{keepLabel}</dt>');
    expect(BUILD).not.toContain('<Stat label="Guns"');
    expect(BUILD).not.toContain("className=\"unit__stats\"");
  });

  it('links each thing to its own encyclopedia entry instead of describing it', () => {
    // A hull and a works land on their own entry; a troop lands on the page,
    // because the order is for a troop and the island picks which kind.
    expect(BUILD).toContain('<Info to="ships" at={encyclopediaShip(item)}>');
    expect(BUILD).toContain('<Info to="works" at={type}>');
    expect(BUILD).toContain('<Info to="companies">');
    // And the prose is gone rather than pushed down the card.
    expect(BUILD).not.toContain('{cls.blurb}');
    expect(BUILD).not.toContain('{terms.facilityBlurbs[type]}');
  });
});
