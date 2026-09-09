import { useState } from 'react';
import terms from '../data/terms.json';
import {
  FACILITY_BLURB,
  FACILITY_LABEL,
  GOLD_PER_DAY,
  UPKEEP_PER_DAY,
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
import { CharacterPortrait, CompanyRow, FacilityIcon, IslandPortrait } from './art';
import { ControlBadge, Sheet, Stat, SupportBars } from './components';

import type { IslandTab } from './ReachSheet';

const TABS: Array<{ id: IslandTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'missions', label: 'Missions' },
  { id: 'military', label: 'Military' },
  { id: 'facilities', label: 'Facilities' },
  { id: 'log', label: 'Log' },
];

/** One line explaining what a facility actually does for you right now. */
function facilityOutput(system: System, facility: Facility): string | null {
  const owner = facility.owner;
  if (owner !== 'empire' && owner !== 'alliance') return null;
  if (system.uprising) return `Idle — the island is in ${terms.mutiny.toLowerCase()}.`;
  if (system.control !== owner) return 'Idle — the island is not held by its owner.';
  const earning = GOLD_PER_DAY[facility.type];
  if (earning > 0) {
    const yieldNow = earning * supportMultiplier(system.support[owner]);
    return `Earns ${yieldNow.toFixed(1)} ${terms.gold.toLowerCase()} a day at this ${terms.allegiance.toLowerCase()}`;
  }
  const cost = UPKEEP_PER_DAY[facility.type];
  return cost > 0
    ? `${FACILITY_BLURB[facility.type]} Costs ${cost} ${terms.gold.toLowerCase()} a day.`
    : FACILITY_BLURB[facility.type];
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
      <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
        <span className="facility__icon">
          <FacilityIcon type={facility.type} size={30} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row row--between">
            <div style={{ fontWeight: 600 }}>{FACILITY_LABEL[facility.type]}</div>
            {facility.owner !== state.player && <ControlBadge faction={facility.owner} />}
          </div>
          {output && (
            <div className="tiny muted" style={{ marginTop: 2 }}>
              {output}
            </div>
          )}
        </div>
      </div>

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
                <span className="build__icon">
                  {item === 'troop' ? (
                    <FacilityIcon type="training_facility" size={22} />
                  ) : (
                    <FacilityIcon type={item} size={22} />
                  )}
                </span>
                <span className="build__text">
                  <span className="build__name">{spec.label}</span>
                  <span className="build__meta">
                    {error ?? `${spec.costGold} ${terms.gold.toLowerCase()} · ${spec.days}d`}
                  </span>
                </span>
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
  initialTab = 'overview',
  onClose,
  onBuild,
  onCancel,
  onOpenCharacter,
  onOpenReach,
}: {
  state: GameState;
  system: System;
  initialTab?: IslandTab;
  onClose: () => void;
  onBuild: (facilityId: string, item: BuildItem) => void;
  onCancel: (facilityId: string) => void;
  onOpenCharacter?: (characterId: string) => void;
  onOpenReach?: (sectorId: string) => void;
}) {
  const [tab, setTab] = useState<IslandTab>(initialTab);
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
  const inbound = state.characters.filter(
    (c) =>
      c.faction === state.player &&
      c.mission?.targetSystemId === system.id &&
      c.mission.phase === 'travelling',
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
          {onOpenReach ? (
            <button className="linkish" onClick={() => onOpenReach(sector.id)}>
              {sector.name}
            </button>
          ) : (
            <span>{sector.name}</span>
          )}
          · {sector.sea} <ControlBadge faction={system.control} />
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
              {entry.id === 'facilities' && producers.length > 0 && (
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
              facilityTypes={system.facilities.map((f) => f.type)}
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
              label={terms.ground}
              value={`${system.rawSlots - freeRawSlots(system)} / ${system.rawSlots}`}
            />
            <Stat
              label={terms.water}
              value={`${system.energySlots - freeEnergySlots(system)} / ${system.energySlots}`}
            />
            <Stat label="Built" value={system.facilities.length} />
          </div>
        </>
      )}

      {tab === 'facilities' && (
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

      {tab === 'military' && (
        <>
          <div className="card">
            <div className="row row--between" style={{ marginBottom: 8 }}>
              <span className="tiny muted">
                {system.garrison} ashore
                {needed > 0 ? ` · ${needed} needed` : ''}
              </span>
              {system.uprising ? (
                <span className="badge badge--warn">{terms.mutiny}</span>
              ) : (
                <span className="badge badge--good">Held</span>
              )}
            </div>
            <CompanyRow present={system.garrison} needed={needed} />
          </div>
          <p className="tiny muted" style={{ marginTop: 8 }}>
            {needed > 0
              ? `Allegiance here is low enough that ${needed} ${needed === 1 ? 'company holds' : 'companies hold'} the island quiet. Fewer and it rises.`
              : 'Allegiance is high enough that no companies are needed to keep order.'}
          </p>

        </>
      )}

      {tab === 'missions' && (
        <>
          <div className="section-title">Ashore here</div>
          {crew.length === 0 ? (
            <div className="card muted small">Nobody of yours is on this island.</div>
          ) : (
            <div className="stack">
              {crew.map((character) => (
                <button
                  key={character.id}
                  className="card card--tap row"
                  style={{ gap: 10, width: '100%', textAlign: 'left' }}
                  onClick={() => onOpenCharacter?.(character.id)}
                >
                  <CharacterPortrait
                    name={character.name}
                    faction={character.faction}
                    people={character.people}
                    size={38}
                    dim={character.status !== 'available'}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="small" style={{ fontWeight: 600 }}>
                      {character.name}
                    </span>
                    <span className="tiny muted" style={{ display: 'block' }}>
                      {character.mission
                        ? `${terms.parley} — ${character.mission.daysRemaining}d to report`
                        : character.status.replace('_', ' ')}
                    </span>
                  </span>
                  <span className="muted" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          )}

          <div className="section-title">Under way to here</div>
          {inbound.length === 0 ? (
            <div className="card muted small">Nobody of yours is sailing for this island.</div>
          ) : (
            <div className="stack">
              {inbound.map((character) => (
                <button
                  key={character.id}
                  className="card card--tap row"
                  style={{ gap: 10, width: '100%', textAlign: 'left' }}
                  onClick={() => onOpenCharacter?.(character.id)}
                >
                  <CharacterPortrait
                    name={character.name}
                    faction={character.faction}
                    people={character.people}
                    size={38}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="small" style={{ fontWeight: 600 }}>
                      {character.name}
                    </span>
                    <span className="tiny muted" style={{ display: 'block' }}>
                      At sea — {character.mission!.daysRemaining}d out
                    </span>
                  </span>
                  <span className="muted" aria-hidden="true">›</span>
                </button>
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
