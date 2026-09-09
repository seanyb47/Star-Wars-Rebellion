import factionData from '../data/factions.json';
import terms from '../data/terms.json';
import { summariseReach, type GameState, type Sector } from '../sim';
import { ChainMap } from './ChainMap';
import type { IslandTab } from './IslandRow';
import { Sheet, Stat } from './components';

export type { IslandTab };

/**
 * A whole Reach at once: what it earns, who its islands lean toward, and then
 * the chain itself drawn as a chart, every island carrying the marks that say
 * what is happening on it. Tapping an island opens its panel.
 */
export function ReachSheet({
  state,
  sector,
  onClose,
  onOpenIsland,
  onOpenSea,
}: {
  state: GameState;
  sector: Sector;
  onClose: () => void;
  onOpenIsland: (systemId: string, tab: IslandTab) => void;
  /** The Sea name is the way into the whole Sea, now the chart shows chains. */
  onOpenSea?: (sea: string) => void;
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
          {onOpenSea ? (
            <button className="linkish" onClick={() => onOpenSea(sector.sea)}>
              {sector.sea}
            </button>
          ) : (
            sector.sea
          )}{' '}
          · {summary.islands} islands
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
        <Stat label={`${terms.gold} a day`} value={summary.goldPerDay.toFixed(1)} />
        <Stat label={`${terms.upkeep} a day`} value={summary.upkeepPerDay} />
        <Stat
          label="Net"
          value={
            <span style={{ color: summary.goldPerDay - summary.upkeepPerDay < 0 ? 'var(--bad)' : 'var(--good)' }}>
              {summary.goldPerDay - summary.upkeepPerDay >= 0 ? '+' : '−'}
              {Math.abs(summary.goldPerDay - summary.upkeepPerDay).toFixed(1)}
            </span>
          }
        />
      </div>
      {summary.goldPerDay === 0 && (
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
      {/*
        The chain opened out as a chart rather than a list of rows: the islands
        where they lie, each carrying who holds it, what stands on it, whether
        your crew are working it, how it leans and how much of it is free. Tap
        one to open it.
      */}
      <ChainMap
        state={state}
        systems={summary.perIsland.map((entry) => byId.get(entry.systemId)!)}
        perIsland={summary.perIsland}
        onOpenIsland={onOpenIsland}
      />
      <div className="chainmap__key">
        <span><i className="key key--civil" /> Earns gold</span>
        <span><i className="key key--military" /> Works and yards</span>
        <span><i className="key key--ashore" /> Companies ashore</span>
        <span><i className="key key--mission" /> Your crew here</span>
      </div>
    </Sheet>
  );
}
