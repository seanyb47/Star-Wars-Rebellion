import terms from '../data/terms.json';
import { buildMenu, type GameState, type FacilityType } from '../sim';
import { FacilityIcon } from './art';

/**
 * What you have standing idle and could be ordering from, after the original's
 * "Idle Construction Yards" nag.
 *
 * A yard that is not building anything is gold you are not spending, and the
 * whole failure mode is that nothing on screen says so. Counts only what can
 * actually take an order right now: yours, on an island you hold, not in
 * mutiny, and not already busy.
 */
const KINDS: FacilityType[] = ['construction_yard', 'training_facility', 'shipyard'];

export function ProducerLegend({
  state,
  onOpenIsland,
}: {
  state: GameState;
  onOpenIsland?: (systemId: string) => void;
}) {
  const idle = new Map<FacilityType, { count: number; firstSystemId?: string }>(
    KINDS.map((kind) => [kind, { count: 0 }]),
  );

  for (const system of state.systems) {
    if (system.control !== state.player || system.uprising) continue;
    for (const facility of system.facilities) {
      if (facility.owner !== state.player || facility.building) continue;
      if (buildMenu(facility).length === 0) continue;
      const entry = idle.get(facility.type);
      if (!entry) continue;
      entry.count += 1;
      entry.firstSystemId ??= system.id;
    }
  }

  return (
    <div className="idle">
      {KINDS.map((kind) => {
        const entry = idle.get(kind)!;
        const free = entry.count > 0;
        const label = `${entry.count} ${terms.facilities[kind]}${entry.count === 1 ? '' : 's'} idle`;
        return (
          <button
            key={kind}
            className={`idle__item${free ? ' idle__item--free' : ''}`}
            disabled={!free}
            onClick={() => entry.firstSystemId && onOpenIsland?.(entry.firstSystemId)}
            aria-label={label}
            title={label}
          >
            <FacilityIcon type={kind} size={17} />
            <span className="idle__n">{entry.count}</span>
            <span className="idle__label">{terms.facilities[kind]}</span>
          </button>
        );
      })}
    </div>
  );
}
