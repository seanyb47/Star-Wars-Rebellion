import { useState } from 'react';
import terms from '../data/terms.json';
import {
  buildError,
  buildLabel,
  effectiveSpec,
  foundWorksError,
  freeEnergySlots,
  freeRawSlots,
  requiredGarrison,
  shipsFor,
  YARD_BUILDS,
  type BuildItem,
  type Facility,
  type FacilityType,
  type GameState,
  type System,
} from '../sim';
import { FacilityIcon, ShipIcon } from './art';

/**
 * The build screen, Rebellion's three buttons: troops, facilities, ships.
 *
 * Every order in the game is placed on a building standing on an island —
 * a drill ground raises companies, a works raises everything else, a slipway
 * lays hulls. The island sheet already offers that, one island at a time.
 * This is the other way in: pick what you want, and see every island of
 * yours that could make it, with what it is doing now, and order from here.
 */
type Kind = 'troops' | 'facilities' | 'ships';

const FACILITY_ORDER: FacilityType[] = [
  'mine',
  'refinery',
  'construction_yard',
  'training_facility',
  'shipyard',
  'fort',
  'boom',
];

export function BuildScreen({
  state,
  onBuild,
  onFound,
  onCancel,
  onOpenIsland,
}: {
  state: GameState;
  onBuild: (facilityId: string, item: BuildItem) => void;
  onFound: (systemId: string) => void;
  onCancel: (facilityId: string) => void;
  onOpenIsland: (systemId: string) => void;
}) {
  const you = state.player;
  const [kind, setKind] = useState<Kind>('troops');
  const [facility, setFacility] = useState<FacilityType>('mine');
  const hulls = shipsFor(you);
  const [hull, setHull] = useState(hulls[0].id);
  const held = state.systems.filter((s) => s.control === you);
  const gold = Math.floor(state.factions[you].gold);

  const item: BuildItem = kind === 'troops' ? 'troop' : kind === 'facilities' ? facility : hull;
  const spec = effectiveSpec(state, you, item);

  // Who could make the thing: the building on each held island that has it
  // on its menu. One per island — an island with two works is still one row.
  const makerType: FacilityType =
    kind === 'troops' ? 'training_facility' : kind === 'facilities' ? 'construction_yard' : 'shipyard';
  const rows = held
    .map((system) => {
      const makers = system.facilities.filter(
        (f) => f.owner === you && f.type === makerType && !f.founding,
      );
      const free = makers.find((f) => !f.building);
      const busy = makers.find((f) => f.building);
      return { system, makers, free, busy };
    })
    .filter((r) => r.makers.length > 0 || kind === 'facilities')
    .sort((a, b) => Number(Boolean(b.free)) - Number(Boolean(a.free)) || a.system.name.localeCompare(b.system.name));

  return (
    <div className="pad">
      <div className="seg" role="tablist" aria-label="What to build">
        {(
          [
            ['troops', 'Build Companies'],
            ['facilities', 'Build Facilities'],
            ['ships', 'Build Ships'],
          ] as Array<[Kind, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            className={`seg__btn${kind === id ? ' seg__btn--on' : ''}`}
            aria-selected={kind === id}
            onClick={() => setKind(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {kind === 'facilities' && (
        <div className="chips" style={{ marginTop: 10 }}>
          {FACILITY_ORDER.map((type) => (
            <button
              key={type}
              className={`chip${facility === type ? ' chip--on' : ''}`}
              onClick={() => setFacility(type)}
            >
              <FacilityIcon type={type} size={18} />
              {buildLabel(type)}
            </button>
          ))}
        </div>
      )}
      {kind === 'ships' && (
        <div className="chips" style={{ marginTop: 10 }}>
          {hulls.map((c) => (
            <button
              key={c.id}
              className={`chip${hull === c.id ? ' chip--on' : ''}`}
              onClick={() => setHull(c.id)}
            >
              <ShipIcon role={c.role} size={18} />
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="row row--between" style={{ margin: '12px 0 6px' }}>
        <span className="section-title" style={{ margin: 0 }}>
          {buildLabel(item)} · {spec.costGold} gold · {spec.days} days
        </span>
        <span className="tiny muted">{gold} gold in hand</span>
      </div>

      {rows.length === 0 && (
        <p className="muted small">
          {kind === 'troops'
            ? `No ${terms.facilities.training_facility.toLowerCase()} on any island of yours. Build one first.`
            : kind === 'ships'
              ? `No ${terms.facilities.shipyard.toLowerCase()} on any island of yours. Build one first.`
              : 'You hold no islands.'}
        </p>
      )}

      <div className="stack">
        {rows.map(({ system, makers, free, busy }) => (
          <BuildRow
            key={system.id}
            state={state}
            system={system}
            item={item}
            kind={kind}
            makers={makers}
            free={free}
            busy={busy}
            onBuild={onBuild}
            onFound={onFound}
            onCancel={onCancel}
            onOpenIsland={onOpenIsland}
          />
        ))}
      </div>
    </div>
  );
}

function BuildRow({
  state,
  system,
  item,
  kind,
  makers,
  free,
  busy,
  onBuild,
  onFound,
  onCancel,
  onOpenIsland,
}: {
  state: GameState;
  system: System;
  item: BuildItem;
  kind: Kind;
  makers: Facility[];
  free?: Facility;
  busy?: Facility;
  onBuild: (facilityId: string, item: BuildItem) => void;
  onFound: (systemId: string) => void;
  onCancel: (facilityId: string) => void;
  onOpenIsland: (systemId: string) => void;
}) {
  const you = state.player;
  const founding = system.facilities.find((f) => f.owner === you && f.founding);
  const why = free ? buildError(state, free.id, item) : null;
  const room = `${freeRawSlots(system)} ${terms.ground.toLowerCase()} · ${freeEnergySlots(system)} ${terms.water.toLowerCase()} free`;
  const garrison =
    kind === 'troops'
      ? `${system.garrison} ashore · ${requiredGarrison(system.support[you])} needed`
      : null;

  return (
    <div className="card build">
      <button className="build__head" onClick={() => onOpenIsland(system.id)}>
        <span className="build__name">{system.name}</span>
        <span className="tiny muted">{garrison ?? room}</span>
      </button>
      <div className="build__act">
        {busy && busy.building && (
          <span className="tiny muted">
            {buildLabel(busy.building.item)} · {busy.building.daysRemaining}d
            <button className="tiny btn--danger" style={{ marginLeft: 8 }} onClick={() => onCancel(busy.id)}>
              Cancel
            </button>
          </span>
        )}
        {founding && founding.building && (
          <span className="tiny muted">
            {terms.facilities.construction_yard} · {founding.building.daysRemaining}d
          </span>
        )}
        {makers.length === 0 && !founding && kind === 'facilities' && (
          <button
            className="btn btn--sm"
            disabled={foundWorksError(state, system.id, you) !== null}
            title={foundWorksError(state, system.id, you) ?? undefined}
            onClick={() => onFound(system.id)}
          >
            Lay down a {terms.facilities.construction_yard.toLowerCase()} · {YARD_BUILDS.construction_yard.costGold}
          </button>
        )}
        {free && (
          <button
            className="btn btn--sm btn--primary"
            disabled={why !== null}
            title={why ?? undefined}
            onClick={() => onBuild(free.id, item)}
          >
            Order
          </button>
        )}
        {free && why && <span className="tiny muted build__why">{why}</span>}
      </div>
    </div>
  );
}
