import terms from '../data/terms.json';
import {
  buildLabel,
  planBuild,
  shipClass,
  shipSpec,
  shipsFor,
  isShipClass,
  requiredGarrison,
  freeEnergySlots,
  freeRawSlots,
  reservedSlots,
  type BuildItem,
  type FacilityType,
  type GameState,
  type System,
} from '../sim';
import { CompanyIcon, FacilityIcon, ShipIcon } from './art';
import { Sheet, Stat } from './components';
import { paintedBuilding, paintedIsland, paintedShip } from './painted';

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

export const FACILITY_ORDER: FacilityType[] = [
  'mine',
  'refinery',
  'construction_yard',
  'training_facility',
  'shipyard',
  'fort',
  'boom',
];

export const KIND_LABEL: Record<BuildKind, string> = {
  facilities: 'Build Facilities',
  troops: `Build ${terms.troop === 'Company' ? 'Companies' : terms.troop + 's'}`,
  ships: 'Build Ships',
};

/** The first thing on each menu, so the order sheet opens with something chosen. */
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
            <span className="tiny muted">Camps and mills that earn, construction yards that make, forts and booms that hold.</span>
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
            Build · {plan?.costGold ?? 0} {terms.gold.toLowerCase()}
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
              : shipsFor(you).map((c) => (
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
                  {kind === 'facilities' ? ` · ${roomLine(state, s, item)}` : kind === 'troops' ? ` · ${s.garrison} ashore` : ''}
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
                  ? `Made on ${destination.name}.`
                  : `Made on ${from?.name ?? 'an island of yours'}, then ${plan.travel} days by sea to ${destination.name}.`}
                {kind === 'troops' &&
                  ` ${destination.name} holds ${destination.garrison}; its allegiance asks for ${requiredGarrison(destination.support[you])}.`}
              </p>
            </>
          )}
        </div>
      )}
      <p className="tiny muted" style={{ marginTop: 10 }}>
        {gold} {terms.gold.toLowerCase()} in hand.
      </p>
    </Sheet>
  );
}

function roomLine(state: GameState, system: System, item: BuildItem): string {
  const held = reservedSlots(state, system.id);
  return item === 'mine'
    ? `${Math.max(0, freeRawSlots(system) - held.ground)} ${terms.ground.toLowerCase()} free`
    : `${Math.max(0, freeEnergySlots(system) - held.water)} ${terms.water.toLowerCase()} free`;
}

/** The thing itself: its painting, what it costs to keep, what it is for. */
function UnitCard({ state, item }: { state: GameState; item: BuildItem }) {
  const you = state.player;
  const plan = planBuild(state, you, item, state.factions[you].hqSystemId);
  const upkeepLine =
    plan.upkeep > 0
      ? `Costs ${plan.upkeep} ${terms.gold.toLowerCase()} a day to keep`
      : item === 'mine' || item === 'refinery'
        ? `Earns ${item === 'mine' ? 2 : 3} ${terms.gold.toLowerCase()} a day`
        : 'Nothing to keep';

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
            {plan.costGold} {terms.gold.toLowerCase()} · {plan.days} days · {upkeepLine.toLowerCase()}
          </div>
          <div className="unit__stats">
            <Stat label="Guns" value={spec.guns} />
            <Stat label="Hull" value={spec.hull} />
            <Stat label="Carries" value={spec.carries === 0 ? '—' : `${spec.carries} co.`} />
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
            {plan.costGold} {terms.gold.toLowerCase()} · {plan.days} days · {upkeepLine.toLowerCase()}
          </div>
          <p className="tiny muted" style={{ margin: '6px 0 0' }}>
            Marines and militia. A company holds an island quiet when its allegiance falls, is the
            only thing that holds an empty island at all, and is what a landing is made of.
          </p>
        </div>
      </div>
    );
  }

  const type = item as FacilityType;
  const painting = paintedBuilding(type) ?? paintedIsland(`facility-${type.replace(/_/g, '-')}-${you}`);
  return (
    <div className="card unit">
      <div className={`unit__art${painting ? ' unit__art--wide' : ''}`}>
        {painting ? <img src={painting} alt="" /> : <FacilityIcon type={type} size={56} />}
      </div>
      <div className="unit__body">
        <div className="unit__name">{buildLabel(type)}</div>
        <div className="tiny muted">
          {plan.costGold} {terms.gold.toLowerCase()} · {plan.days} days · {upkeepLine.toLowerCase()}
        </div>
        <p className="tiny muted" style={{ margin: '6px 0 0' }}>
          {terms.facilityBlurbs[type]}
        </p>
      </div>
    </div>
  );
}
