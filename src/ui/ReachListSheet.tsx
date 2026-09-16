import factionData from '../data/factions.json';
import terms from '../data/terms.json';
import { summariseReach, type GameState, type Sector } from '../sim';
import { IslandRow } from './IslandRow';
import { GoldFig, Sheet, Stat } from './components';

/**
 * A Reach's islands as a list you can read.
 *
 * This was a whole Sea's worth — reaches under a Sea name, with the Sea's
 * totals on top. The Sea was a name over water and nothing you could act on,
 * so it has gone from the panels the way it went from the chart; what stays
 * is the useful part, one row per island with what stands on it and who is
 * ashore, scoped to the chain you were already looking at. Opened from the
 * "N islands" line on the Reach's panel.
 */
export function ReachListSheet({
  state,
  sector,
  onClose,
  onOpenIsland,
}: {
  state: GameState;
  sector: Sector;
  onClose: () => void;
  onOpenIsland: (systemId: string) => void;
}) {
  const summary = summariseReach(state, sector.id, state.player);
  const byId = new Map(state.systems.map((s) => [s.id, s] as const));
  const you = state.player;
  const enemy = you === 'empire' ? 'alliance' : 'empire';
  const net = summary.goldPerDay - summary.upkeepPerDay;

  return (
    <Sheet
      title={sector.name}
      subtitle={
        <span>
          {summary.islands} islands
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
        <Stat label={terms.gold} value={<GoldFig n={summary.goldPerDay.toFixed(1)} tone="earn" />} />
        <Stat label={terms.upkeep} value={<GoldFig n={summary.upkeepPerDay} tone="cost" />} />
        <Stat
          label="Net"
          value={
            <span style={{ color: net < 0 ? 'var(--bad)' : 'var(--good)' }}>
              {net >= 0 ? '+' : '−'}
              {Math.abs(net).toFixed(1)}
            </span>
          }
        />
      </div>

      <div className="section-title">The islands</div>
      <div className="stack">
        {summary.perIsland.map((entry) => (
          <IslandRow
            key={entry.systemId}
            state={state}
            system={byId.get(entry.systemId)!}
            entry={entry}
            onOpen={onOpenIsland}
          />
        ))}
      </div>
    </Sheet>
  );
}
