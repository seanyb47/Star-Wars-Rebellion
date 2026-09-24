import type { ReactNode } from 'react';
import terms from '../data/terms.json';
import {
  isTroopItem,
  raiseReason,
  raiseWorksError,
  raiseWorksShort,
  worksImpossible,
  raiseShort,
  troopType,
  troopsOf,
  buildLabel,
  planBuild,
  GOLD_PER_DAY,
  shipClass,
  gradeOf,
  shipsAt,
  shipsFor,
  isShipClass,
  isAtSea,
  requiredGarrison,
  freeSlots,
  reservedSlots,
  YARD_BUILDABLE,
  type BuildItem,
  type FacilityType,
  type GameState,
  type System,
  inProse,
  perFortnight,
} from '../sim';
import { CompanyIcon, FacilityIcon, ShipIcon, facilityArt } from './art';
import { GoldFig, Info, Sheet, Stat } from './components';
import { encyclopediaShip } from './lookup';
import { paintedShip } from './painted';

/**
 * Rebellion's build flow, in two sheets.
 *
 * The first is the three buttons — facilities, companies, ships. The second
 * is the order itself: what, where, and when it will be ready. "Where" is any
 * island of yours; the game finds the nearest building that can make the
 * thing and adds the passage to the clock, so a camp can go up on an island
 * with no works of its own and a company can be drilled at home and shipped
 * to the frontier without the player having to know which works is free.
 */
export type BuildKind = 'facilities' | 'troops' | 'ships';

export interface BuildDraft {
  kind: BuildKind;
  item: BuildItem;
  destinationId: string | null;
}

/**
 * What the build menu offers, which is exactly what a yard is allowed to lay
 * down — the sim's own list, not a copy of it.
 *
 * It was a copy until 16 September, and adding the Heavy Fortress proved why
 * that was a mistake: the works went into the sim, into the island board's
 * order and into the encyclopedia, and the one list nobody remembered was the
 * menu you actually build things from. So the building existed, the AI built
 * them, they stood on islands and fired — and the player could not order one.
 */
export const FACILITY_ORDER: FacilityType[] = YARD_BUILDABLE;

export const KIND_LABEL: Record<BuildKind, string> = {
  facilities: 'Build Facilities',
  troops: `Build ${terms.troop === 'Troop' ? 'Troops' : terms.troop + 's'}`,
  ships: 'Build Ships',
};

/**
 * The first thing on each menu, so the order sheet opens with something
 * chosen.
 *
 * `shipsFor` and not `shipsAt` on purpose: the first hull on a side's list is
 * one it has always been able to lay down, so no grade of craft can make this
 * pick illegal, and the menu that follows does the gating.
 */
export function firstItem(kind: BuildKind, faction: 'empire' | 'alliance'): BuildItem {
  if (kind === 'troops') return troopsOf(faction).filter((t) => t.role !== 'sailors')[0].id as BuildItem;
  if (kind === 'ships') return shipsFor(faction)[0].id;
  return 'mine';
}

export function BuildMenuSheet({
  onPick,
  onClose,
}: {
  onPick: (kind: BuildKind) => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      title="Build"
      subtitle="What do you want raised, drilled or laid down?"
      onClose={onClose}
      underTopBar
    >
      <div className="stack buildmenu">
        <button className="btn btn--block buildmenu__btn" onClick={() => onPick('facilities')}>
          <span className="buildmenu__icon">
            <FacilityIcon type="fort" size={26} />
          </span>
          <span className="buildmenu__text">
            <b>{KIND_LABEL.facilities}</b>
            <span className="tiny muted">Mines and mills that earn, drill grounds and slipways that make, fortresses that hold.</span>
          </span>
        </button>
        <button className="btn btn--block buildmenu__btn" onClick={() => onPick('troops')}>
          <span className="buildmenu__icon">
            <CompanyIcon size={26} />
          </span>
          <span className="buildmenu__text">
            <b>{KIND_LABEL.troops}</b>
            <span className="tiny muted">Marines and militia, drilled and shipped to where they are needed.</span>
          </span>
        </button>
        <button className="btn btn--block buildmenu__btn" onClick={() => onPick('ships')}>
          <span className="buildmenu__icon">
            <ShipIcon role="medium" size={26} />
          </span>
          <span className="buildmenu__text">
            <b>{KIND_LABEL.ships}</b>
            <span className="tiny muted">Hulls laid down at a shipyard and sailed to their station.</span>
          </span>
        </button>
      </div>
    </Sheet>
  );
}

export function BuildOrderSheet({
  state,
  draft,
  onChange,
  onChooseOnChart,
  onBuild,
  onRaise,
  onClose,
  stacked,
}: {
  state: GameState;
  draft: BuildDraft;
  onChange: (draft: BuildDraft) => void;
  /**
   * Drawn over the sheet that opened it, rather than on its own.
   *
   * A slipway's own Build button opens this panel from inside an island
   * sheet, and closing it should put the player back on the yard they were
   * looking at. Opened from the Build tab there is nothing underneath and
   * this stays false.
   */
  stacked?: boolean;
  onChooseOnChart: () => void;
  onBuild: (facilityId: string, item: BuildItem, destinationId: string) => void;
  /** Buildings have no maker to give the order to: the island takes it. */
  onRaise: (systemId: string, type: FacilityType) => void;
  onClose: () => void;
}) {
  const you = state.player;
  const { kind, item } = draft;
  const held = state.systems.filter((s) => s.control === you && !s.uprising);
  const destination = held.find((s) => s.id === draft.destinationId) ?? null;
  /*
   * Which companies this island can raise, and why not for the rest.
   *
   * Shown rather than hidden, because the two reasons a company is out are
   * both things the player can do something about, and a list that silently
   * omits them teaches nothing. Research says *put somebody on it*; a people's
   * home says *this is the wrong island*, which is the whole of why the
   * Confederacy's islands are not interchangeable.
   *
   * Sailors are left off entirely: a ship's company comes off a hull and is
   * ashore because hulls are, so it is not a thing you order.
   */
  /*
   * The buildings this island could take, treasury aside.
   *
   * Sean, 23 September: *"don't include things in the drop down that can't be
   * built even if you had infinite gold. Aka a gold mine on a silver vein."*
   * A works that wants ground the island does not have and never will is left
   * out entirely; everything else is listed, and greyed with the reason when
   * the reason is one that clears — no room, not enough craft, the yard busy,
   * the price. Same shape as the troop list below, and for the same reason:
   * a list that silently omits a thing teaches nothing about why.
   */
  const worksChoices =
    kind === 'facilities' && destination
      ? FACILITY_ORDER.filter((type) => !worksImpossible(destination, type)).map((type) => ({
          type,
          why: raiseWorksError(state, destination.id, type, you),
          short: raiseWorksShort(state, destination.id, type, you),
        }))
      : FACILITY_ORDER.map((type) => ({ type, why: null as string | null, short: null as string | null }));
  /*
   * And the draft falls back when the island changes under it, the same way
   * the troop draft does: pick a Gold Mine, send the order to an island with
   * no vein, and the order would otherwise sit on a choice the sim refuses.
   */
  const worksLegal = worksChoices.find((c) => c.type === item && c.why === null);
  const firstWorks = worksChoices.find((c) => c.why === null);
  if (kind === 'facilities' && !worksLegal && firstWorks && item !== firstWorks.type) {
    queueMicrotask(() => onChange({ ...draft, item: firstWorks.type as BuildItem }));
  }

  const troopChoices =
    kind === 'troops'
      ? troopsOf(you)
          .filter((t) => t.role !== 'sailors')
          .map((type) => ({
            type,
            why: raiseReason(type, gradeOf(state, you), destination ?? undefined),
            short: raiseShort(type, gradeOf(state, you), destination ?? undefined),
          }))
          .sort((a, b) => Number(a.why !== null) - Number(b.why !== null) || a.type.costGold - b.type.costGold)
      : [];
  /*
   * Moving the order to another island can make the chosen company illegal —
   * pick Reefwalkers on a reef, then send the order to an ice island — so the
   * draft falls back to the first thing that island *can* raise rather than
   * sitting on a choice the sim will refuse.
   */
  const troopLegal = troopChoices.find((c) => c.type.id === item && c.why === null);
  const firstLegal = troopChoices.find((c) => c.why === null);
  if (kind === 'troops' && !troopLegal && firstLegal && item !== firstLegal.type.id) {
    queueMicrotask(() => onChange({ ...draft, item: firstLegal.type.id as BuildItem }));
  }
  const plan = destination ? planBuild(state, you, item, destination.id) : null;
  const from = plan?.fromSystemId ? state.systems.find((s) => s.id === plan.fromSystemId) : null;

  /*
   * Your squadrons at anchor, each with the island it is lying at.
   *
   * Sorted by name so the list does not reorder itself as fleets sail, which
   * is the kind of movement a player reads as the control misbehaving.
   */
  const anchored = state.fleets
    .filter((f) => f.faction === you && !isAtSea(f))
    .map((fleet) => ({ fleet, at: state.systems.find((s) => s.id === fleet.systemId) }))
    .filter((row): row is { fleet: (typeof state.fleets)[number]; at: System } =>
      Boolean(row.at) && row.at!.control === you && !row.at!.uprising,
    )
    .sort((a, b) => a.fleet.name.localeCompare(b.fleet.name));

  // Islands grouped by Reach, in the Reach's own order, for the picker.
  const byReach = state.sectors
    .map((sector) => ({
      sector,
      islands: held.filter((s) => s.sectorId === sector.id),
    }))
    .filter((g) => g.islands.length > 0);

  return (
    <Sheet
      /*
       * No subtitle.
       *
       * Sean, 22 September, over a screenshot with five things crossed out:
       * *"all this red is unnecessary text."* "What, where, and when it will
       * be ready" described the form rather than telling the player anything
       * — it is the docstring above, printed at the reader. The title says
       * what is being built and the field below is a select, which announces
       * itself; a line narrating the form under the title is a line spent.
       */
      title={KIND_LABEL[kind]}
      /* Stops below the top bar: this is the screen where the price is read
         against the purse, and the purse is up there. See `underTopBar`. */
      underTopBar
      onClose={onClose}
      stacked={stacked}
      actions={
        <>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            style={{ flex: 2 }}
            /* A building is raised on the island itself and has no
               `facilityId`; a hull or a company still goes to a works. */
            disabled={!plan || plan.error !== null || !destination || (kind !== 'facilities' && !plan.facilityId)}
            onClick={() => {
              if (!destination || !plan || plan.error) return;
              if (kind === 'facilities') onRaise(destination.id, item as FacilityType);
              else if (plan.facilityId) onBuild(plan.facilityId, item, destination.id);
            }}
          >
            Build · <GoldFig n={plan?.costGold ?? 0} per={null} />
          </button>
        </>
      }
    >
      {/*
        The picker with no label over it, and no picker at all where there is
        nothing to pick.

        "BUILD" sat in brass small caps directly under a title reading "Build
        Ships" — the same word twice in two lines, over a control that
        announces itself. The accessible name moves to `aria-label`, so a
        screen reader still hears what the menu is for; what goes is the
        pixels.

        Troops had no menu behind that label for a day, because the sim had
        exactly one buildable company and a menu of one is not a menu. That was
        right about the widget and wrong about the game: eight of the twelve
        companies were unreachable, four rungs of research on each side bought
        a unit that could never stand anywhere, and the island chose for you.
        Companies have names in an order now, so the menu is back — and it is a
        real one, listing what *this island* can raise today.
      */}
      <div className="field">
        <select
          className="field__select"
          aria-label="What to build"
          value={item}
          onChange={(e) => onChange({ ...draft, item: e.target.value as BuildItem })}
        >
          {kind === 'facilities'
            ? worksChoices.map((c) => (
                <option key={c.type} value={c.type} disabled={c.why !== null}>
                  {buildLabel(c.type)}
                  {c.short ? ` — ${c.short}` : ''}
                </option>
              ))
            : kind === 'troops'
              ? troopChoices.map((c) => (
                  <option key={c.type.id} value={c.type.id} disabled={c.why !== null}>
                    {c.type.name}
                    {c.short ? ` — ${c.short}` : ''}
                  </option>
                ))
              : shipsAt(you, gradeOf(state, you)).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
        </select>
      </div>

      <UnitCard state={state} item={item} />

      <label className="field" style={{ marginTop: 12 }}>
        <span className="field__label">Where</span>
        <select
          className="field__select"
          value={destination?.id ?? ''}
          /* A fleet option carries its own island as its value, so nothing
             downstream has to learn about fleets: the order is still to an
             island, and `addShip` already joins whatever squadron of yours is
             lying there when the hull comes off the stocks. */
          onChange={(e) => onChange({ ...draft, destinationId: e.target.value || null })}
        >
          <option value="">Choose where it goes…</option>
          {/*
            Fleets above islands, at Sean's word of 22 September: *"let's also
            include the fleets. So default location is where the facility is
            located. But then fleets go underneath that. Then islands."*
            The default is unchanged — a yard's own Build button already sets
            its island — so this is the second group down, where he put it.

            Only squadrons lying at anchor. A fleet at sea has no island to
            sail a new hull to, and offering one would be offering an order the
            game cannot take; `isAtSea` is the same check the transfer sheet
            makes for the same reason.

            Hulls only. A building is raised on ground and a fleet has none,
            and troops go ashore rather than aboard.
          */}
          {kind === 'ships' && anchored.length > 0 && (
            <optgroup label="Fleets">
              {anchored.map(({ fleet, at }) => (
                <option key={fleet.id} value={at.id}>
                  {fleet.name} · at {at.name}
                </option>
              ))}
            </optgroup>
          )}
          {byReach.map(({ sector, islands }) => (
            <optgroup key={sector.id} label={sector.name}>
              {islands.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {kind === 'facilities' ? ` · ${roomLine(state, s)}` : kind === 'troops' ? ` · ${s.garrison} ashore` : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <button className="btn btn--block" style={{ marginTop: 8 }} onClick={onChooseOnChart}>
        Select location on the chart
      </button>

      {destination && plan && (
        <div className="card" style={{ marginTop: 12 }}>
          {plan.error ? (
            <p className="small" style={{ margin: 0, color: 'var(--bad)' }}>
              {plan.error}
            </p>
          ) : (
            <>
              <div className="row" style={{ gap: 18 }}>
                <Stat label="Ready in" value={`${plan.days + plan.travel} days`} />
                <Stat label="Work" value={`${plan.days}d`} />
                <Stat label="Passage" value={plan.travel === 0 ? 'none' : `${plan.travel}d`} />
              </div>
              <p className="tiny muted" style={{ margin: '8px 0 0' }}>
                {plan.travel === 0
                  ? `Made on ${inProse(destination.name)}.`
                  : `Made on ${from?.name ?? 'an island of yours'}, then ${plan.travel} days by sea to ${inProse(destination.name)}.`}
                {kind === 'troops' &&
                  ` ${destination.name} holds ${destination.garrison}; its allegiance asks for ${requiredGarrison(destination.support[you])}.`}
              </p>
            </>
          )}
        </div>
      )}
      {/* The "N in hand" line that stood here is cut. Sean, 22 September:
          *"cut the gold you have on hand at the bottom, but make the pop up go
          below the gold at the top."* It was the same figure as the plaque at
          the top of the screen, five hundred pixels further down and without
          the delta beside it — so the screen said gold twice and said less the
          second time. The plaque answers it, and now its breakdown opens over
          this sheet instead of behind it. */}
    </Sheet>
  );
}

function roomLine(state: GameState, system: System): string {
  const free = Math.max(0, freeSlots(system) - reservedSlots(state, system.id));
  return `${free} free`;
}

/**
 * The three figures an order is decided on, and nothing else.
 *
 * Sean, 22 September: *"on the build screen, all I need to see for stats is
 * Construction Cost: X gold / Time to Completion: X days / Upkeep: x gold.
 * That's it."*
 *
 * They were a single dimmed line — `140 · 90 days · Upkeep: 20` — with a hull's
 * four combat numbers in a grid under it. The line made the reader work out
 * which number was which from the units, and the grid answered a question this
 * screen is not for: what a hull is *like* is the encyclopedia's job, and every
 * one of those four is on its entry, an ℹ away. What the build panel decides is
 * what it costs, how long it takes, and what it costs to keep.
 *
 * Labelled rows rather than a row of columns, because his three are two words
 * each and column headings that wrap are worse than a list.
 *
 * Cost, then upkeep, then time — his order of 22 September, and the two money
 * rows sitting together is the reason to prefer it: what a thing costs to buy
 * and what it costs to keep are the same question asked twice, and a player
 * comparing a Wayfinder against a Morningstar reads them as a pair. Time is
 * the one figure that does not answer "can I afford this".
 */
function BuildFigures({
  cost,
  days,
  keepLabel,
  keep,
}: {
  cost: number;
  days: number;
  /**
   * The second row is Upkeep for everything that costs and Earns for the two
   * that pay — a mine and a mill cost nothing to keep, and what they bring in
   * is the reason to raise one. Sean's Day 150 playtest was about exactly this
   * figure being wrong, so it keeps its own line rather than being folded into
   * an Upkeep of zero.
   */
  keepLabel: string;
  keep: ReactNode;
}) {
  return (
    <dl className="figures">
      <div>
        <dt>Construction Cost</dt>
        <dd>
          <GoldFig n={cost} per={null} />
        </dd>
      </div>
      <div>
        <dt>{keepLabel}</dt>
        <dd>{keep}</dd>
      </div>
      <div>
        <dt>Time to Completion</dt>
        <dd>{days} days</dd>
      </div>
    </dl>
  );
}

/**
 * The thing itself: its painting, the three figures, and the way to read more.
 *
 * It carried its own name in bold over the figures — the same name standing in
 * the picker four lines above, with only the painting between them. Sean
 * crossed the lower one out. The name is not lost: the picker holds it while
 * you are choosing, and the ℹ link names it again on its way to the entry.
 */
function UnitCard({ state, item }: { state: GameState; item: BuildItem }) {
  const you = state.player;
  const plan = planBuild(state, you, item, state.factions[you].hqSystemId);
  // What it costs to run, or earns, once it is standing. Sean's format, 16
  // September: a label, a figure, the coin, and what it is per — not a
  // sentence. "Costs 3 gold a day to keep" was eight words for one number.
  const keepLabel =
    plan.upkeep > 0 ? terms.upkeep : GOLD_PER_DAY[item] > 0 ? 'Earns' : terms.upkeep;
  const upkeepLine =
    plan.upkeep > 0 ? (
      <GoldFig n={perFortnight(plan.upkeep)} tone="cost" />
    ) : GOLD_PER_DAY[item] > 0 ? (
      /*
       * From the table, not from a literal.
       *
       * Sean's Day 150 playtest: *"Gold Mine earnings are shown wrong. The
       * build screen says 'Earns 2/day,' but Pa.mine = 9 in code (Lumber Mill
       * = 3). This is the most important economic choice and the UI gets it
       * wrong."* He is exactly right: this line read `item === 'mine' ? 2 : 3`
       * — a pair of numbers typed in by hand beside a `GOLD_PER_DAY` table
       * that says 9 and 3. The mill's happened to agree; the mine's was off by
       * more than four times, on the one screen where a player decides which
       * of the two to build.
       */
      <GoldFig n={GOLD_PER_DAY[item]} tone="earn" />
    ) : (
      <span className="muted">Nothing</span>
    );

  if (isShipClass(item)) {
    const cls = shipClass(item);
    /*
     * Her own painting, and only then the fallback.
     *
     * This asked for `empire-medium` and nothing else — a per-faction,
     * per-size drawing that does not exist in `art/ships`, so the one screen
     * where a player chooses which hull to spend a season on always drew the
     * generic icon. It matters more since 22 September, because this panel is
     * now how a slipway is ordered from at all rather than a second way in.
     *
     * `paintedShip(item)` resolves because every painting is filed under its
     * hull's roster id — which is true only since the five that were not were
     * renamed earlier the same day. The role fallback stays for a hull added
     * to the game before its painting arrives.
     */
    const painting = paintedShip(item) ?? paintedShip(`${you}-${cls.role}`);
    return (
      <div className="card unit">
        <div className="unit__art unit__art--tall">
          {painting ? <img src={painting} alt="" /> : <ShipIcon role={cls.role} size={64} />}
        </div>
        <div className="unit__body">
          <BuildFigures cost={plan.costGold} days={plan.days} keepLabel={keepLabel} keep={upkeepLine} />
          {/*
            The prose went and a link took its place; now the link is a mark.

            Sean, 22 September, twice. First *"just put an info button that
            goes to encyclopedia if people want to read more about what
            they're building"* — three lines of flavour under three lines of
            figures was exactly the text block the ℹ exists to remove, and
            the hull's entry already carries that paragraph plus the four
            combat numbers this panel dropped in the same pass.

            Then, of the link that replaced it: *"don't put in 'more about
            wayfinder', just do an ℹ button."* He is right and it is the same
            fault as the rest of this panel — the picker says Wayfinder, the
            painting is of the Wayfinder, and the link said Wayfinder a third
            time. The name goes to `label`, so the sentence is still what a
            screen reader hears and what a long press shows.
          */}
          <Info to="ships" at={encyclopediaShip(item)} label={`More about the ${cls.name}`} />
        </div>
      </div>
    );
  }

  if (item === 'troop' || isTroopItem(item)) {
    const who = item === 'troop' ? undefined : troopType(item);
    return (
      <div className="card unit">
        <div className="unit__art">
          <CompanyIcon size={64} />
        </div>
        <div className="unit__body">
          <BuildFigures
            cost={plan.costGold}
            days={plan.days}
            keepLabel={keepLabel}
            keep={upkeepLine}
          />
          {/* The three numbers that decide what a company is for, now that
              there is a choice to make: what it is worth going up a beach,
              what it is worth holding one, and what it sees in the dark. A
              Hushed picket is a third of a Marine's attack and half again
              their eyes, and a player picking between them should be able to
              read that here rather than in the encyclopedia. */}
          {who && (
            <div className="row" style={{ gap: 14, flexWrap: 'wrap', marginTop: 8 }}>
              <Stat label="Attack" value={String(who.attack)} />
              <Stat label="Holds" value={String(who.invasionDefense)} />
              <Stat label="Sees" value={String(who.detection)} />
            </div>
          )}
          {/* The entry the name goes to, where there is one name to go to.
              A generic order has no single company to anchor on, so it keeps
              the page itself. */}
          <Info
            to="companies"
            at={who?.id}
            label={who ? `More about the ${who.name}` : `More about ${terms.troops.toLowerCase()}`}
          />
        </div>
      </div>
    );
  }

  const type = item as FacilityType;
  // The same lookup the island board and the encyclopedia use, so a works
  // painted once shows up everywhere it is named rather than only where
  // somebody remembered to spell the file name out again.
  const art = facilityArt(type, you);
  return (
    <div className="card unit">
      {/* The painting's own shape, not one number for every works: a whole 4:3
          picture shows whole, a strip sliced out of an island panel keeps the
          band it was sliced for. */}
      <div className={`unit__art${art ? ' unit__art--paint' : ''}`} style={art ? { aspectRatio: String(art.ratio) } : undefined}>
        {art ? <img src={art.src} alt="" /> : <FacilityIcon type={type} size={56} />}
      </div>
      <div className="unit__body">
        <BuildFigures
            cost={plan.costGold}
            days={plan.days}
            keepLabel={keepLabel}
            keep={upkeepLine}
          />
        <Info to="works" at={type} label={`More about the ${buildLabel(type)}`} />
      </div>
    </div>
  );
}
