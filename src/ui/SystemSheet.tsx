import { useState } from 'react';
import terms from '../data/terms.json';
import {
  FACILITY_BLURB,
  FACILITY_LABEL,
  GOLD_PER_DAY,
  UPKEEP_PER_DAY,
  buildError,
  buildLabel,
  buildMenu,
  buildSpec,
  isShipClass,
  shipClass,
  freeEnergySlots,
  freeRawSlots,
  requiredGarrison,
  supportMultiplier,
  type BuildItem,
  type Facility,
  type GameState,
  type System,
} from '../sim';
import { CharacterPortrait, CompanyIcon, FacilityIcon, IslandPortrait, ShipIcon } from './art';
import { ControlBadge, Sheet, Slot, SlotBoard, Stat, SupportBars } from './components';
import { Harbour } from './FleetPanel';

import type { IslandTab } from './IslandRow';

/**
 * One panel per island, holding everything the original spreads across four
 * clickable icons on the planet — ships, military, civilian, missions — folded
 * into the fewest tabs that keep like with like.
 *
 * Harbour opens first and carries what floats at the island, plus the fixed
 * defences: a fort is a warship that cannot move, so it belongs beside the
 * ships rather than in with the mines. Crew and Garrison are split because
 * one is people you order about and the other is companies that hold ground.
 * Everything built sits in Buildings, earners and yards alike.
 */
const TABS: Array<{ id: IslandTab; label: string }> = [
  { id: 'harbour', label: 'Harbour' },
  { id: 'crew', label: 'Crew' },
  { id: 'garrison', label: terms.garrison },
  { id: 'buildings', label: 'Buildings' },
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
            Building {buildLabel(order.item)} —{' '}
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
                  ) : isShipClass(item) ? (
                    <ShipIcon role={shipClass(item).role} size={22} />
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
  initialTab = 'harbour',
  onClose,
  onBuild,
  onCancel,
  onOpenCharacter,
  onOpenReach,
  onSail,
  onEmbark,
  onAssault,
  onBoard,
  onAshore,
}: {
  state: GameState;
  system: System;
  initialTab?: IslandTab;
  onClose: () => void;
  onBuild: (facilityId: string, item: BuildItem) => void;
  onCancel: (facilityId: string) => void;
  onSail: (fleetId: string) => void;
  onEmbark: (fleetId: string, companies: number) => void;
  onAssault: (fleetId: string) => void;
  onBoard: (fleetId: string, characterId: string) => void;
  onAshore: (fleetId: string, characterId: string) => void;
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
  const slots = system.rawSlots + system.energySlots;
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
          {system.blockaded && <span className="badge badge--warn">Blockaded</span>}
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
              {entry.id === 'buildings' && producers.length > 0 && (
                <span className="tabs__dot" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      }
    >
      {tab === 'harbour' && (
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

          {system.blockaded && (
            <p className="tiny" style={{ color: 'var(--bad)', margin: '8px 0 0' }}>
              Enemy sail is lying off this island. Nothing is getting out of the harbour, so it
              earns you nothing today — and still costs you its upkeep. Drive them off and the
              trade resumes.
            </p>
          )}

          <div className="section-title">At anchor</div>
          <Harbour
            state={state}
            systemId={system.id}
            onSail={onSail}
            onEmbark={onEmbark}
            onAssault={onAssault}
            onBoard={onBoard}
            onAshore={onAshore}
          />
        </>
      )}

      {tab === 'buildings' && (
        <>
          {/* One slot per slot the island has, so what is built and what is
              still free read as the same picture rather than two numbers. */}
          <SlotBoard
            ghosts={Math.max(0, slots - system.facilities.length)}
            empty={`Nothing stands on ${system.name}, and there is nowhere to put anything.`}
          >
            {system.facilities.map((facility) => (
              <Slot
                key={facility.id}
                icon={<FacilityIcon type={facility.type} size={30} />}
                name={FACILITY_LABEL[facility.type]}
                note={facility.building ? `${facility.building.daysRemaining}d` : undefined}
                tone={facility.owner !== state.player ? 'dim' : undefined}
              />
            ))}
          </SlotBoard>

          {producers.length > 0 && <div className="section-title">Order something built</div>}
          <div className="stack">
            {producers.map((facility) => (
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
          {/* Empty slots here are the shortfall: companies the island wants
              and has not got. That is worth drawing. */}
          <SlotBoard
            ghosts={Math.max(0, needed - system.garrison)}
            empty={`No companies are ashore on ${system.name}.`}
          >
            {Array.from({ length: system.garrison }, (_, i) => (
              <Slot
                key={i}
                icon={<CompanyIcon size={30} />}
                name={terms.troop}
              />
            ))}
          </SlotBoard>
          <p className="tiny muted" style={{ marginTop: 8 }}>
            {needed > 0
              ? `Allegiance here is low enough that ${needed} ${needed === 1 ? 'company holds' : 'companies hold'} the island quiet. Fewer and it rises.`
              : 'Allegiance is high enough that no companies are needed to keep order.'}
          </p>
        </>
      )}

      {tab === 'crew' && (
        <>
          <div className="section-title">Ashore here</div>
          <SlotBoard empty={`Nobody of yours is on ${system.name}.`}>
            {crew.map((character) => (
              <Slot
                key={character.id}
                icon={
                  <CharacterPortrait
                    name={character.name}
                    faction={character.faction}
                    people={character.people}
                    size={32}
                    dim={character.status !== 'available'}
                  />
                }
                name={character.name}
                note={
                  character.mission
                    ? `${terms.parley} ${character.mission.daysRemaining}d`
                    : character.status === 'available'
                      ? undefined
                      : character.status.replace('_', ' ')
                }
                tone={character.status === 'injured' ? 'warn' : undefined}
                onClick={() => onOpenCharacter?.(character.id)}
              />
            ))}
          </SlotBoard>

          <div className="section-title">Under way to here</div>
          <SlotBoard empty={`Nobody of yours is sailing for ${system.name}.`}>
            {inbound.map((character) => (
              <Slot
                key={character.id}
                icon={
                  <CharacterPortrait
                    name={character.name}
                    faction={character.faction}
                    people={character.people}
                    size={32}
                  />
                }
                name={character.name}
                note={`${character.mission?.daysRemaining ?? 0}d out`}
                onClick={() => onOpenCharacter?.(character.id)}
              />
            ))}
          </SlotBoard>
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
