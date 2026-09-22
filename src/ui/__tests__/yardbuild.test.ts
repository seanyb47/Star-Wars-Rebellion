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
    // The button lives on the row now — `WorksCard` and its 64px tile went on
    // 22 September — but the rule it is drawn from has not moved: yours, no
    // order on it, and a page to open.
    expect(SHEET).toContain('const kind = buildKindFor(facility.type);');
    expect(SHEET).toContain('mine && kind && !facility.founding');
    // The inline catalogue is gone entirely, from every works.
    expect(SHEET).not.toContain('className="buildgrid"');
    expect(SHEET).not.toContain("type === 'shipyard' && menu.length > 0");
    // And so is the second catalogue under it: the list of every works with
    // its price, which the build panel already is. Sean wanted one place to
    // give an order, and there were three. Pinned on the prop rather than the
    // heading, because the heading survives in the comment saying it went.
    expect(SHEET).not.toContain('onRaise');
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
      SHEET.indexOf('function WorksRow'),
    );
    expect(fn).toContain("if (type === 'shipyard') return 'ships';");
    expect(fn).toContain("if (type === 'training_facility') return 'troops';");
    expect(fn).toContain('return undefined;');
    // Both labels exist, so neither maker falls back to the other's wording.
    // Sean, 22 September: *"change build hull here to just build ships."* The
    // row says what you get, not what the building is called.
    expect(SHEET).toContain("'Build ships'");
    expect(SHEET).toContain("'Build troops'");
    expect(SHEET).not.toContain('Build a hull here');
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
    // The middle label varies, because a mine earns where a hull costs.
    expect(BUILD).toContain('<dt>{keepLabel}</dt>');
    expect(BUILD).not.toContain('<Stat label="Guns"');
    expect(BUILD).not.toContain("className=\"unit__stats\"");
  });

  /**
   * Cost, then upkeep, then time.
   *
   * Sean, 22 September: *"move time to completion below upkeep."* The order is
   * the point rather than the presence — the two money rows sitting together
   * are the same question asked twice, what it costs to buy and what it costs
   * to keep, and a player comparing two hulls reads them as a pair. So it is
   * asserted as an order, which `toContain` on three separate strings cannot
   * do.
   */
  it('puts the two money rows together, with time last', () => {
    const order = [...BUILD.matchAll(/<dt>(.+?)<\/dt>/g)].map((m) => m[1]);
    expect(order).toEqual(['Construction Cost', '{keepLabel}', 'Time to Completion']);
  });

  /**
   * A mark, not a sentence.
   *
   * Sean, 22 September: *"don't put in 'more about wayfinder', just do an ℹ
   * button."* The link that replaced the blurb had the same fault as the rest
   * of the panel — the picker says Wayfinder, the painting is of the
   * Wayfinder, and the link said it a third time.
   *
   * The sentence is not deleted, it moves to `label`, which is what the
   * screen reader reads and the long press shows. A bare glyph with no
   * accessible name would announce itself as "button", so the assertion is on
   * the label existing as much as on the text going.
   */
  it('links each thing to its entry with one mark and no sentence', () => {
    // A hull and a works land on their own entry; a troop lands on the page,
    // because the order is for a troop and the island picks which kind.
    expect(BUILD).toContain('<Info to="ships" at={encyclopediaShip(item)} label={`More about the ${cls.name}`} />');
    expect(BUILD).toContain('<Info to="works" at={type} label={`More about the ${buildLabel(type)}`} />');
    expect(BUILD).toContain('<Info to="companies" label={`More about ${terms.troops.toLowerCase()}`} />');
    // Nothing on the card renders the name as link text any more.
    expect(BUILD).not.toContain('More about the {cls.name}');
    expect(BUILD).not.toContain('>More about {terms.troops.toLowerCase()}<');
    // And the prose is gone rather than pushed down the card.
    expect(BUILD).not.toContain('{cls.blurb}');
    expect(BUILD).not.toContain('{terms.facilityBlurbs[type]}');
  });

  /**
   * And the bare form is a real control rather than a glyph, so the component
   * that serves both is pinned: children make a labelled row, no children make
   * the same round mark the section headings carry.
   */
  it('gives the bare mark an accessible name', () => {
    const COMPONENTS = UI['../components.tsx'];
    const info = COMPONENTS.slice(COMPONENTS.indexOf('export function Info('));
    expect(info).toContain('if (!children) {');
    expect(info).toContain('className="infodot"');
    expect(info).toContain('aria-label={label}');
  });

  /**
   * Nothing on the panel says the same thing twice.
   *
   * Sean, 22 September, over a screenshot of the ship order with five things
   * struck through: *"all this red is unnecessary text."* Two of the five had
   * already gone in the commits above; these three had not, and they share a
   * fault — each repeats something the reader can see a line or two away.
   *
   * The subtitle narrated the form under a title that already named it. The
   * BUILD label stood in brass caps under a title reading "Build Ships". The
   * card's own name sat four lines under the same name in the picker, with
   * only the painting in between.
   *
   * Asserted on absence, because that is the whole of the change and absence
   * is exactly what creeps back: a name under a painting is the natural thing
   * to write when somebody next edits this card.
   */
  it('says nothing the panel has already said', () => {
    expect(BUILD).not.toContain('subtitle="What, where, and when it will be ready"');
    expect(BUILD).not.toContain('<span className="field__label">Build</span>');
    expect(BUILD).not.toContain('className="unit__name"');
    // The menu keeps its own label, which names a field rather than echoing
    // the title, and the select keeps an accessible name without drawing one.
    expect(BUILD).toContain('<span className="field__label">Where</span>');
    expect(BUILD).toContain('aria-label="What to build"');
  });

  /**
   * And the three rules those removals orphaned went with them, so the next
   * reader of the stylesheet is not told about a name, a stat grid and a
   * static field that nothing renders any more.
   */
  it('leaves no styles behind for the parts that went', () => {
    const CSS = import.meta.glob('../styles.css', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const css = CSS['../styles.css'];
    expect(css).toBeTruthy();
    for (const dead of ['.unit__name', '.unit__stats', '.field__static']) {
      expect(css).not.toContain(dead);
    }
  });
});

/**
 * Where a thing goes: the yard's island, then fleets, then islands.
 *
 * Sean, 22 September: *"on the drop down for where to build, let's also
 * include the fleets. So default location is where the facility is located.
 * But then fleets go underneath that. Then islands."*
 *
 * The default needed nothing — a yard's own Build button already sets its
 * island — so what this adds is the middle group, and the interesting part is
 * that it cost the sim nothing. A fleet option carries its own island as its
 * value, and `addShip` has always joined whatever squadron of yours lies at
 * the island a hull is delivered to. The order is still to an island; the
 * player just names it by the fleet lying there.
 *
 * The limit that follows from that, and is worth stating rather than
 * discovering: the island is resolved when the order is given. A squadron that
 * sails before the hull is off the stocks will not be met at sea — the hull
 * arrives where the fleet was. Making it chase would be a real sim change.
 */
describe('building to a fleet', () => {
  const BUILDSHEET = UI['../BuildSheet.tsx'];

  it('offers fleets between the default and the islands', () => {
    const where = BUILDSHEET.slice(BUILDSHEET.indexOf('<span className="field__label">Where</span>'));
    const fleets = where.indexOf('<optgroup label="Fleets">');
    const reaches = where.indexOf('{byReach.map(');
    expect(fleets).toBeGreaterThan(-1);
    expect(reaches).toBeGreaterThan(-1);
    expect(fleets).toBeLessThan(reaches);
  });

  it('carries the island as the value, so nothing downstream learns about fleets', () => {
    expect(BUILDSHEET).toContain('<option key={fleet.id} value={at.id}>');
  });

  it('offers only squadrons at anchor, on an island still yours', () => {
    expect(BUILDSHEET).toContain("f.faction === you && !isAtSea(f)");
    expect(BUILDSHEET).toContain("row.at!.control === you && !row.at!.uprising");
  });

  /** A building is raised on ground and troops go ashore; only a hull joins. */
  it('offers the group for hulls only', () => {
    expect(BUILDSHEET).toContain("{kind === 'ships' && anchored.length > 0 && (");
  });

  /**
   * And the gold moved rather than being duplicated: the figure at the bottom
   * of this sheet is gone, and the plaque's breakdown can reach over the sheet
   * now, which is where the delta lives.
   */
  it('shows gold once, at the top, with its delta', () => {
    expect(BUILDSHEET).not.toContain('in hand.');
    expect(UI['../TopBar.tsx']).toContain("`topbar${purseOpen ? ' topbar--purse' : ''}`");
  });
});

/**
 * The way out of the start screen sits in a footer, not over the page.
 *
 * Sean, 22 September, over a screenshot of the Begin button lying across the
 * strengths panel: *"take command screen is floating."*
 *
 * It was `position: sticky`, which was my fix of 20 September for a real
 * problem — picking a side opens the detail panel, and that used to push the
 * button down the page and off a phone. Sticky did stop it moving. It also
 * parked a shadowed gold pill halfway down a paragraph, which a player reads
 * as a layout fault rather than as a control, and the comment beside it said
 * so out loud: *"the shadow is what tells you it is floating over the page."*
 * That was the tell, written down and not acted on.
 *
 * A footer meets the same requirement — the panel can be any length and the
 * button never moves — and looks deliberate, because it has a rule above it
 * and a background of its own.
 */
describe('the start screen footer', () => {
  const CSS = import.meta.glob('../styles.css', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const css = CSS['../styles.css'];
  const START = UI['../StartScreen.tsx'];

  it('puts the button in a foot, outside the scrolling body', () => {
    expect(START).toContain('<div className="start__body">');
    expect(START).toContain('<div className="start__foot">');
    // The body scrolls; the container no longer does, or the foot would
    // scroll away with it.
    expect(css).toContain('.start__body {');
    expect(css).toMatch(/\.start__foot \{[^}]*flex: none/);
  });

  it('leaves nothing sticky or shadowed over the page', () => {
    expect(css).not.toContain('.start__begin--ready');
    expect(START).not.toContain('start__begin--ready');
    const foot = css.slice(css.indexOf('.start__foot {'), css.indexOf('}', css.indexOf('.start__foot {')));
    expect(foot).not.toMatch(/position:\s*sticky/);
    expect(foot).toContain('border-top');
  });
});
