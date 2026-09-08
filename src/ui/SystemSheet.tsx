import factionData from '../data/factions.json';
import {
  FACILITY_LABEL,
  buildError,
  buildMenu,
  buildSpec,
  freeEnergySlots,
  freeRawSlots,
  requiredGarrison,
  supportMultiplier,
  type BuildItem,
  type Facility,
  type GameState,
  type System,
} from '../sim';
import { ControlBadge, Sheet, Stat, SupportBars } from './components';

/** One line explaining what a facility actually does for you right now. */
function facilityOutput(system: System, facility: Facility): string | null {
  const owner = facility.owner;
  if (owner !== 'empire' && owner !== 'alliance') return null;
  if (system.uprising) return 'Idle — the world is in revolt.';
  if (system.control !== owner) return 'Idle — the world is not held by its owner.';
  if (facility.type === 'mine') {
    return `${(supportMultiplier(system.support[owner])).toFixed(2)} raw per day at current support`;
  }
  if (facility.type === 'refinery') return 'Refines up to 1 raw per day';
  return null;
}

function FacilityCard({
  state,
  system,
  facility,
  onBuild,
  onCancel,
}: {
  state: GameState;
  system: System;
  facility: Facility;
  onBuild: (facilityId: string, item: BuildItem) => void;
  onCancel: (facilityId: string) => void;
}) {
  const menu = buildMenu(facility);
  const mine = facility.owner === state.player;
  const order = facility.building;
  const output = facilityOutput(system, facility);

  return (
    <div className="card">
      <div className="row row--between">
        <div style={{ fontWeight: 600 }}>{FACILITY_LABEL[facility.type]}</div>
        {facility.owner !== state.player && <ControlBadge faction={facility.owner} />}
      </div>
      {output && (
        <div className="tiny muted" style={{ marginTop: 3 }}>
          {output}
        </div>
      )}

      {order && (
        <div className="row row--between small muted" style={{ marginTop: 6 }}>
          <span>
            Building {order.item === 'troop' ? 'Troop Regiment' : FACILITY_LABEL[order.item]} —{' '}
            {order.daysRemaining}d left
            {system.uprising ? ' (halted)' : ''}
          </span>
          {mine && (
            <button className="tiny btn--danger" onClick={() => onCancel(facility.id)}>
              Cancel
            </button>
          )}
        </div>
      )}

      {mine && !order && menu.length > 0 && (
        <div className="buildgrid" style={{ marginTop: 8 }}>
          {menu.map((item) => {
            const spec = buildSpec(item);
            const error = buildError(state, facility.id, item);
            return (
              <button
                key={item}
                className="build"
                disabled={error !== null}
                onClick={() => onBuild(facility.id, item)}
                title={error ?? undefined}
              >
                <div className="build__name">{spec.label}</div>
                <div className="build__meta">
                  {error ?? `${spec.costRefined} refined · ${spec.days}d`}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SystemSheet({
  state,
  system,
  onClose,
  onBuild,
  onCancel,
}: {
  state: GameState;
  system: System;
  onClose: () => void;
  onBuild: (facilityId: string, item: BuildItem) => void;
  onCancel: (facilityId: string) => void;
}) {
  const sector = state.sectors.find((s) => s.id === system.sectorId)!;
  const explored = system.explored[state.player];

  if (!explored) {
    return (
      <Sheet title="Unsurveyed system" subtitle={sector.name} onClose={onClose}>
        <p className="muted small">
          No survey data. Your astrographers have this world charted only as a point of light.
        </p>
      </Sheet>
    );
  }

  const needed = requiredGarrison(
    system.control === 'empire' || system.control === 'alliance'
      ? system.support[system.control]
      : 50,
  );
  const characters = state.characters.filter(
    (c) => c.faction === state.player && c.locationSystemId === system.id,
  );

  return (
    <Sheet
      title={system.name}
      subtitle={
        <span className="row" style={{ gap: 6 }}>
          {sector.name} · {system.isCore ? 'Core' : 'Rim'} <ControlBadge faction={system.control} />
          {system.uprising && <span className="badge badge--warn">Uprising</span>}
          {!system.populated && <span className="badge badge--none">Uninhabited</span>}
        </span>
      }
      onClose={onClose}
    >
      {system.populated ? (
        <SupportBars system={system} />
      ) : (
        <p className="muted small" style={{ margin: 0 }}>
          No population. Held only while a garrison remains; completing any facility here settles
          it for you.
        </p>
      )}

      <div className="section-title">Capacity</div>
      <div className="card row" style={{ gap: 18 }}>
        <Stat
          label="Raw slots"
          value={`${system.rawSlots - freeRawSlots(system)} / ${system.rawSlots}`}
        />
        <Stat
          label="Energy slots"
          value={`${system.energySlots - freeEnergySlots(system)} / ${system.energySlots}`}
        />
        <Stat
          label="Garrison"
          value={
            <>
              {system.garrison}
              {needed > 0 && <span className="muted tiny"> / {needed} needed</span>}
            </>
          }
        />
      </div>

      <div className="section-title">Facilities</div>
      {system.facilities.length === 0 ? (
        <div className="card muted small">Nothing built here.</div>
      ) : (
        <div className="stack">
          {system.facilities.map((facility) => (
            <FacilityCard
              key={facility.id}
              state={state}
              system={system}
              facility={facility}
              onBuild={onBuild}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
      {system.control === state.player &&
        !system.facilities.some((f) => buildMenu(f).length > 0 && f.owner === state.player) && (
          <p className="muted tiny" style={{ marginTop: 6 }}>
            A construction yard here would let you build on this world.
          </p>
        )}

      {characters.length > 0 && (
        <>
          <div className="section-title">
            {factionData[state.player].shortName} personnel present
          </div>
          <div className="stack">
            {characters.map((character) => (
              <div key={character.id} className="card small">
                {character.name} <span className="muted">— {character.status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
