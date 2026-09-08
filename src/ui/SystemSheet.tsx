import { useState } from 'react';
import factionData from '../data/factions.json';
import terms from '../data/terms.json';
import {
  FACILITY_BLURB,
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
import { IslandPortrait } from './art';
import { ControlBadge, Sheet, Stat, SupportBars } from './components';

type TabId = 'overview' | 'build' | 'garrison' | 'log';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'build', label: 'Build' },
  { id: 'garrison', label: 'Garrison' },
  { id: 'log', label: 'Log' },
];

/** One line explaining what a facility actually does for you right now. */
function facilityOutput(system: System, facility: Facility): string | null {
  const owner = facility.owner;
  if (owner !== 'empire' && owner !== 'alliance') return null;
  if (system.uprising) return `Idle — the island is in ${terms.mutiny.toLowerCase()}.`;
  if (system.control !== owner) return 'Idle — the island is not held by its owner.';
  if (facility.type === 'mine') {
    return `Cuts ${supportMultiplier(system.support[owner]).toFixed(2)} ${terms.raw} a day at this ${terms.allegiance.toLowerCase()}`;
  }
  if (facility.type === 'refinery') return `Turns 1 ${terms.raw} into 1 ${terms.refined} a day`;
  return FACILITY_BLURB[facility.type];
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
            Building {order.item === 'troop' ? terms.troop : FACILITY_LABEL[order.item]} —{' '}
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
                  {error ?? `${spec.costRefined} ${terms.refined.toLowerCase()} · ${spec.days}d`}
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
  const [tab, setTab] = useState<TabId>('overview');
  const sector = state.sectors.find((s) => s.id === system.sectorId)!;
  const explored = system.explored[state.player];

  if (!explored) {
    return (
      <Sheet
        title={`${terms.uncharted} island`}
        subtitle={`${sector.name} · ${sector.sea}`}
        onClose={onClose}
      >
        <div className="portrait">
          <IslandPortrait
            seed={system.name}
            faction="none"
            settled={false}
            facilities={0}
            size={128}
          />
        </div>
        <p className="muted small" style={{ textAlign: 'center' }}>
          No survey. Your charts show this only as a mark in open water and somebody else's
          rumour.
        </p>
      </Sheet>
    );
  }

  const holder =
    system.control === 'empire' || system.control === 'alliance' ? system.control : null;
  const needed = requiredGarrison(holder ? system.support[holder] : 50);
  const crew = state.characters.filter(
    (c) => c.faction === state.player && c.locationSystemId === system.id,
  );
  const log = state.events.filter((e) => e.systemId === system.id).slice(-40).reverse();
  const producers = system.facilities.filter(
    (f) => f.owner === state.player && buildMenu(f).length > 0,
  );

  return (
    <Sheet
      title={system.name}
      subtitle={
        <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {sector.name} · {sector.sea} <ControlBadge faction={system.control} />
          {system.uprising && <span className="badge badge--warn">{terms.mutiny}</span>}
          {!system.populated && <span className="badge badge--none">{terms.uninhabited}</span>}
        </span>
      }
      onClose={onClose}
      tabs={
        <div className="tabs" role="tablist">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              role="tab"
              aria-selected={tab === entry.id}
              className={`tabs__tab${tab === entry.id ? ' tabs__tab--on' : ''}`}
              onClick={() => setTab(entry.id)}
            >
              {entry.label}
              {entry.id === 'build' && producers.length > 0 && (
                <span className="tabs__dot" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      }
    >
      {tab === 'overview' && (
        <>
          <div className="portrait">
            <IslandPortrait
              seed={system.name}
              faction={system.control}
              settled={system.populated}
              facilities={system.facilities.length}
              mutiny={system.uprising}
              size={132}
            />
          </div>

          {system.note && <p className="portrait__note serif">{system.note}</p>}

          {system.populated ? (
            <SupportBars system={system} />
          ) : (
            <p className="muted small" style={{ margin: 0 }}>
              Nobody lives here. Held only while a company remains ashore; finish any building and
              the island settles under your flag.
            </p>
          )}

          <div className="section-title">Capacity</div>
          <div className="card row" style={{ gap: 18 }}>
            <Stat
              label={`${terms.raw} slots`}
              value={`${system.rawSlots - freeRawSlots(system)} / ${system.rawSlots}`}
            />
            <Stat
              label={`${terms.sweetwater} slots`}
              value={`${system.energySlots - freeEnergySlots(system)} / ${system.energySlots}`}
            />
            <Stat label="Built" value={system.facilities.length} />
          </div>
        </>
      )}

      {tab === 'build' && (
        <>
          {system.facilities.length === 0 ? (
            <div className="card muted small">Nothing has been built on this island.</div>
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
          {system.control === state.player && producers.length === 0 && (
            <p className="muted tiny" style={{ marginTop: 8 }}>
              A {terms.facilities.construction_yard.toLowerCase()} here would let you build on this
              island.
            </p>
          )}
        </>
      )}

      {tab === 'garrison' && (
        <>
          <div className="card row" style={{ gap: 18 }}>
            <Stat label="Ashore" value={system.garrison} />
            <Stat
              label="Needed"
              value={needed === 0 ? <span className="muted">none</span> : needed}
            />
            <Stat
              label="Order"
              value={
                system.uprising ? (
                  <span className="badge badge--warn">{terms.mutiny}</span>
                ) : (
                  <span className="badge badge--good">Held</span>
                )
              }
            />
          </div>
          <p className="tiny muted" style={{ marginTop: 8 }}>
            {needed > 0
              ? `Allegiance here is low enough that ${needed} ${needed === 1 ? 'company holds' : 'companies hold'} the island quiet. Fewer and it rises.`
              : 'Allegiance is high enough that no companies are needed to keep order.'}
          </p>

          <div className="section-title">
            {factionData[state.player].shortName} crew ashore
          </div>
          {crew.length === 0 ? (
            <div className="card muted small">Nobody of yours is on this island.</div>
          ) : (
            <div className="stack">
              {crew.map((character) => (
                <div key={character.id} className="card small">
                  {character.name}{' '}
                  <span className="muted">— {character.status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'log' && (
        <>
          {log.length === 0 ? (
            <div className="card muted small">Nothing has happened here yet.</div>
          ) : (
            log.map((event) => (
              <div key={event.id} className="event">
                <span className="event__day">Day {event.day}</span>
                <span className="event__text">{event.text}</span>
              </div>
            ))
          )}
        </>
      )}
    </Sheet>
  );
}
