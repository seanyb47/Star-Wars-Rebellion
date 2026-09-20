import terms from '../data/terms.json';
import {
  buildLabel,
  planBuild,
  GOLD_PER_DAY,
  shipClass,
  shipSpec,
  gradeOf,
  shipsAt,
  shipsFor,
  isShipClass,
  requiredGarrison,
  freeSlots,
  reservedSlots,
  YARD_BUILDABLE,
  type BuildItem,
  type FacilityType,
  type GameState,
  type System,
  inProse,
} from '../sim';
import { CompanyIcon, FacilityIcon, ShipIcon, facilityArt } from './art';
import { GoldFig, Sheet, Stat } from './components';
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
  if (kind === 'troops') return 'troop';
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
    <Sheet title="Build" subtitle="What do you want raised, drilled or laid down?" onClose={onClose}>
      <div className="stack buildmenu">
        <button className="btn btn--block buildmenu__btn" onClick={() => onPick('facilities')}>
          <span className="buildmenu__icon">
            <FacilityIcon type="construction_yard" size={26} />
          </span>
          <span className="buildmenu__text">
            <b>{KIND_LABEL.facilities}</b>
            <span className="tiny muted">Camps and mills that earn, construction yards that make, fortresses that hold.</span>
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
  onClose,
}: {
  state: GameState;
  draft: BuildDraft;
  onChange: (draft: BuildDraft) => void;
  onChooseOnChart: () => void;
  onBuild: (facilityId: string, item: BuildItem, destinationId: string) => void;
  onClose: () => void;
}) {
  const you = state.player;
  const { kind, item } = draft;
  const held = state.systems.filter((s) => s.control === you && !s.uprising);
  const destination = held.find((s) => s.id === draft.destinationId) ?? null;
  const plan = destination ? planBuild(state, you, item, destination.id) : null;
  const gold = Math.floor(state.factions[you].gold);
  const from = plan?.fromSystemId ? state.systems.find((s) => s.id === plan.fromSystemId) : null;

  // Islands grouped by Reach, in the Reach's own order, for the picker.
  const byReach = state.sectors
    .map((sector) => ({
      sector,
      islands: held.filter((s) => s.sectorId === sector.id),
    }))
    .filter((g) => g.islands.length > 0);

  return (
    <Sheet
      title={KIND_LABEL[kind]}
      subtitle="What, where, and when it will be ready"
      onClose={onClose}
      actions={
        <>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            style={{ flex: 2 }}
            disabled={!plan || plan.error !== null || !plan.facilityId}
            onClick={() => plan?.facilityId && destination && onBuild(plan.facilityId, item, destination.id)}
          >
            Build · <GoldFig n={plan?.costGold ?? 0} per={null} />
          </button>
        </>
      }
    >
      <label className="field">
        <span className="field__label">Build</span>
        {kind === 'troops' ? (
          <span className="field__static">{buildLabel('troop')}</span>
        ) : (
          <select
            className="field__select"
            value={item}
            onChange={(e) => onChange({ ...draft, item: e.target.value as BuildItem })}
          >
            {kind === 'facilities'
              ? FACILITY_ORDER.map((type) => (
                  <option key={type} value={type}>
                    {buildLabel(type)}
                  </option>
                ))
              : shipsAt(you, gradeOf(state, you)).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
          </select>
        )}
      </label>

      <UnitCard state={state} item={item} />

      <label className="field" style={{ marginTop: 12 }}>
        <span className="field__label">Where</span>
        <select
          className="field__select"
          value={destination?.id ?? ''}
          onChange={(e) => onChange({ ...draft, destinationId: e.target.value || null })}
        >
          <option value="">Choose an island of yours…</option>
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
      <p className="tiny muted" style={{ marginTop: 10 }}>
        <GoldFig n={gold} per={null} /> in hand.
      </p>
    </Sheet>
  );
}

function roomLine(state: GameState, system: System): string {
  const free = Math.max(0, freeSlots(system) - reservedSlots(state, system.id));
  return `${free} free`;
}

/** The thing itself: its painting, what it costs to keep, what it is for. */
function UnitCard({ state, item }: { state: GameState; item: BuildItem }) {
  const you = state.player;
  const plan = planBuild(state, you, item, state.factions[you].hqSystemId);
  // What it costs to run, or earns, once it is standing. Sean's format, 16
  // September: a label, a figure, the coin, and what it is per — not a
  // sentence. "Costs 3 gold a day to keep" was eight words for one number.
  const upkeepLine =
    plan.upkeep > 0 ? (
      <GoldFig label={terms.upkeep} n={plan.upkeep} tone="cost" />
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
      <GoldFig label="Earns" n={GOLD_PER_DAY[item]} tone="earn" />
    ) : (
      <span className="muted">Nothing to keep</span>
    );

  if (isShipClass(item)) {
    const cls = shipClass(item);
    const spec = shipSpec(item);
    const painting = paintedShip(`${you}-${cls.role}`);
    return (
      <div className="card unit">
        <div className="unit__art unit__art--tall">
          {painting ? <img src={painting} alt="" /> : <ShipIcon role={cls.role} size={64} />}
        </div>
        <div className="unit__body">
          <div className="unit__name">{cls.name}</div>
          <div className="tiny muted">
            <GoldFig n={plan.costGold} per={null} /> · {plan.days} days · {upkeepLine}
          </div>
          <div className="unit__stats">
            <Stat label="Guns" value={spec.guns} />
            <Stat label="Hull" value={spec.hull} />
            {/* Found by playing: this tile read "1 co." — *company* abbreviated,
                and company is the retired word. The Almanac's card already
                counts troops; the build sheet, which is where you decide
                whether a hull can carry a landing, was still saying the old
                one under a full stop. */}
            <Stat
              label="Carries"
              value={
                spec.carries === 0
                  ? '—'
                  : `${spec.carries}\u00a0${spec.carries === 1 ? terms.troop.toLowerCase() : terms.troops.toLowerCase()}`
              }
            />
            <Stat label="Pace" value={spec.pace < 1 ? 'Fast' : spec.pace > 1 ? 'Slow' : 'Steady'} />
          </div>
          <p className="tiny muted" style={{ margin: '6px 0 0' }}>
            {cls.blurb}
          </p>
        </div>
      </div>
    );
  }

  if (item === 'troop') {
    return (
      <div className="card unit">
        <div className="unit__art">
          <CompanyIcon size={64} />
        </div>
        <div className="unit__body">
          <div className="unit__name">{buildLabel('troop')}</div>
          <div className="tiny muted">
            <GoldFig n={plan.costGold} per={null} /> · {plan.days} days · {upkeepLine}
          </div>
          <p className="tiny muted" style={{ margin: '6px 0 0' }}>
            Marines and militia. A troop holds an island quiet when its allegiance falls, is the
            only thing that holds an empty island at all, and is what a landing is made of.
          </p>
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
        <div className="unit__name">{buildLabel(type)}</div>
        <div className="tiny muted">
          <GoldFig n={plan.costGold} per={null} /> · {plan.days} days · {upkeepLine}
        </div>
        <p className="tiny muted" style={{ margin: '6px 0 0' }}>
          {terms.facilityBlurbs[type]}
        </p>
      </div>
    </div>
  );
}
