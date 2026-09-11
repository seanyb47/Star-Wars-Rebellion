import terms from '../data/terms.json';
import {
  fleetCapacity,
  fleetDamaged,
  fleetGuns,
  fleetStatus,
  shipClass,
  type Fleet,
  type GameState,
} from '../sim';
import { ShipIcon } from './art';
import { ControlBadge } from './components';

/**
 * One fleet, laid out the way the original lays out a fleet: a plain table of
 * facts with the words spelled out, capacity stated against what is actually
 * aboard, and every slot named even when it is empty. An empty slot that says
 * so is worth more than one that stays quiet.
 */
export function FleetCard({
  state,
  fleet,
  onSail,
  onEmbark,
  onAssault,
  canOrder,
}: {
  state: GameState;
  fleet: Fleet;
  onSail: (fleetId: string) => void;
  onEmbark: (fleetId: string, companies: number) => void;
  onAssault: (fleetId: string) => void;
  canOrder: boolean;
}) {
  const system = state.systems.find((s) => s.id === fleet.systemId);
  const capacity = fleetCapacity(fleet);
  const damaged = fleetDamaged(fleet);
  const atSea = fleet.voyage !== undefined;
  const ashore = system?.garrison ?? 0;
  const holdsIsland = system?.control === fleet.faction;

  // One row per class, so eight sloops are a line rather than eight lines.
  const byClass = new Map<string, number>();
  for (const ship of fleet.ships) {
    byClass.set(ship.classId, (byClass.get(ship.classId) ?? 0) + 1);
  }

  return (
    <div className="card fleet">
      <div className="row row--between" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 600 }}>{fleet.name}</div>
          <div className="tiny muted" style={{ marginTop: 2 }}>
            {fleetStatus(state, fleet)}
          </div>
        </div>
        {fleet.faction !== state.player && <ControlBadge faction={fleet.faction} />}
      </div>

      <div className="fleet__ships">
        {[...byClass.entries()].map(([classId, count]) => {
          const cls = shipClass(classId as Parameters<typeof shipClass>[0]);
          return (
            <span key={classId} className="fleet__class">
              <ShipIcon role={cls.role} size={26} />
              <span className="fleet__class-n">{count}</span>
              <span className="tiny muted">{cls.name}</span>
            </span>
          );
        })}
      </div>

      <dl className="fleet__facts">
        <div>
          <dt>Hulls</dt>
          <dd>{fleet.ships.length}</dd>
        </div>
        <div>
          <dt>Guns</dt>
          <dd>{fleetGuns(fleet)}</dd>
        </div>
        <div>
          <dt>Damaged</dt>
          <dd>{damaged}</dd>
        </div>
        <div>
          <dt>Companies</dt>
          <dd>
            {fleet.troops} <span className="muted">of {capacity}</span>
          </dd>
        </div>
      </dl>

      {canOrder && !atSea && (
        <div className="fleet__orders">
          <button className="btn" onClick={() => onSail(fleet.id)}>
            Weigh anchor
          </button>
          {holdsIsland && (
            <>
              <button
                className="btn"
                disabled={ashore === 0 || fleet.troops >= capacity}
                onClick={() => onEmbark(fleet.id, 1)}
              >
                Take a {terms.troop.toLowerCase()} aboard
              </button>
              {fleet.troops > 0 && (
                <button className="btn" onClick={() => onEmbark(fleet.id, -1)}>
                  Put one ashore
                </button>
              )}
            </>
          )}
          {!holdsIsland && fleet.troops > 0 && (
            <button className="btn btn--primary" onClick={() => onAssault(fleet.id)}>
              Land {fleet.troops} against {system?.garrison ?? 0} ashore
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Everything lying off an island, yours and theirs. */
export function Harbour({
  state,
  systemId,
  onSail,
  onEmbark,
  onAssault,
}: {
  state: GameState;
  systemId: string;
  onSail: (fleetId: string) => void;
  onEmbark: (fleetId: string, companies: number) => void;
  onAssault: (fleetId: string) => void;
}) {
  const here = state.fleets.filter((f) => f.systemId === systemId && !f.voyage);
  const inbound = state.fleets.filter(
    (f) => f.faction === state.player && f.voyage?.targetSystemId === systemId,
  );

  if (here.length === 0 && inbound.length === 0) {
    return (
      <div className="card muted small">
        Nothing is moored here. Lay down a hull at a {terms.facilities.shipyard.toLowerCase()} and
        it will come to anchor where it was built. Any fort or boom guarding the island will sit
        here too, since a fixed gun is a warship that cannot weigh anchor.
      </div>
    );
  }

  return (
    <div className="stack">
      {here.map((fleet) => (
        <FleetCard
          key={fleet.id}
          state={state}
          fleet={fleet}
          onSail={onSail}
          onEmbark={onEmbark}
          onAssault={onAssault}
          canOrder={fleet.faction === state.player}
        />
      ))}
      {inbound.length > 0 && (
        <>
          <div className="section-title">Under way to here</div>
          {inbound.map((fleet) => (
            <div key={fleet.id} className="card row row--between">
              <span className="small">{fleet.name}</span>
              <span className="tiny muted">{fleet.voyage!.daysRemaining}d out</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
