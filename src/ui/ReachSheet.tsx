import factionData from '../data/factions.json';
import terms from '../data/terms.json';
import { summariseReach, type GameState, type Sector, type System } from '../sim';
import { CategoryIcon, IslandGlyph } from './art';
import { ControlBadge, Sheet, Stat } from './components';

export type IslandTab = 'overview' | 'facilities' | 'military' | 'missions' | 'log';

const CATEGORIES: Array<{ kind: 'missions' | 'military' | 'facilities'; tab: IslandTab; label: string }> = [
  { kind: 'missions', tab: 'missions', label: 'Crew' },
  { kind: 'military', tab: 'military', label: 'Ashore' },
  { kind: 'facilities', tab: 'facilities', label: 'Built' },
];

/**
 * A whole Reach at once: what it earns, who its islands lean toward, and a
 * row per island carrying the three counts that matter. Tapping any of the
 * three opens that island straight onto the matching tab.
 */
export function ReachSheet({
  state,
  sector,
  onClose,
  onOpenIsland,
}: {
  state: GameState;
  sector: Sector;
  onClose: () => void;
  onOpenIsland: (systemId: string, tab: IslandTab) => void;
}) {
  const summary = summariseReach(state, sector.id, state.player);
  const byId = new Map(state.systems.map((s) => [s.id, s] as const));
  const you = state.player;
  const enemy = you === 'empire' ? 'alliance' : 'empire';

  return (
    <Sheet
      title={sector.name}
      subtitle={
        <span>
          {sector.sea} · {summary.islands} islands
          {summary.mutinies > 0 && (
            <span className="badge badge--warn" style={{ marginLeft: 8 }}>
              {summary.mutinies} in {terms.mutiny.toLowerCase()}
            </span>
          )}
        </span>
      }
      onClose={onClose}
    >
      <div className="card row" style={{ gap: 16 }}>
        <Stat label="Yours" value={summary.held} />
        <Stat label="Unaligned" value={summary.unaligned} />
        <Stat label={factionData[enemy].shortName} value={summary.enemyHeld} />
        <Stat label="Ashore" value={summary.garrison} />
      </div>

      <div className="section-title">What it earns you</div>
      <div className="card row" style={{ gap: 16 }}>
        <Stat label={`${terms.raw} a day`} value={summary.storesPerDay.toFixed(1)} />
        <Stat label="Mills here" value={summary.refineCapacity} />
      </div>
      {summary.storesPerDay === 0 && (
        <p className="tiny muted" style={{ marginTop: 6 }}>
          Nothing of yours is producing in this {terms.reach.toLowerCase()}.
        </p>
      )}

      <div className="section-title">{terms.allegiance} across the {terms.reach.toLowerCase()}</div>
      <div className="card">
        {([you, enemy] as const).map((faction) => (
          <div key={faction} style={{ marginBottom: 6 }}>
            <div className="bar-label">
              <span>{factionData[faction].shortName}</span>
              <span>{Math.round(summary.allegiance[faction])}</span>
            </div>
            <div className="bar">
              <div
                className="bar__fill"
                style={{
                  width: `${summary.allegiance[faction]}%`,
                  background: `var(--${faction})`,
                }}
              />
            </div>
          </div>
        ))}
        <p className="tiny muted" style={{ margin: '4px 0 0' }}>
          Averaged over the {summary.settled} settled islands. A parley anywhere here drags the
          rest of the {terms.reach.toLowerCase()} with it.
        </p>
      </div>

      <div className="section-title">Islands</div>
      <div className="stack">
        {summary.perIsland.map((entry) => {
          const system = byId.get(entry.systemId) as System;
          const explored = system.explored[you];
          const counts: Record<string, number> = {
            missions: entry.missions,
            military: entry.military,
            facilities: entry.facilities,
          };
          return (
            <div key={system.id} className="isle">
              <button
                className="isle__head"
                onClick={() => onOpenIsland(system.id, 'overview')}
              >
                <IslandGlyph
                  seed={system.name}
                  faction={explored ? system.control : 'none'}
                  settled={system.populated}
                  size={34}
                />
                <span className="isle__name">
                  <span className="isle__title">
                    {explored ? system.name : `${terms.uncharted}`}
                  </span>
                  {explored && system.populated && (
                    <span className="isle__bar" aria-hidden="true">
                      <span
                        style={{
                          width: `${system.support[you]}%`,
                          background: `var(--${you})`,
                        }}
                      />
                      <span
                        style={{
                          width: `${system.support[enemy]}%`,
                          background: `var(--${enemy})`,
                        }}
                      />
                    </span>
                  )}
                </span>
                {explored ? (
                  <ControlBadge faction={system.control} />
                ) : (
                  <span className="badge badge--none">?</span>
                )}
              </button>

              <div className="isle__cats">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.kind}
                    // Empty counts recede so the ones worth looking at stand out.
                    className={`isle__cat${explored && counts[cat.kind] > 0 ? ' isle__cat--has' : ''}`}
                    onClick={() => onOpenIsland(system.id, cat.tab)}
                    aria-label={`${system.name}: ${cat.label}`}
                  >
                    <CategoryIcon kind={cat.kind} size={20} />
                    <span className="isle__count">{explored ? counts[cat.kind] : '–'}</span>
                    {cat.kind === 'facilities' && entry.building > 0 && (
                      <span className="isle__working" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
