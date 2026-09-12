import factionData from '../data/factions.json';
import terms from '../data/terms.json';
import { summariseSea, type GameState } from '../sim';
import { IslandRow } from './IslandRow';
import { Sheet, Stat } from './components';

/**
 * A whole Sea. This is what a tap opens when the chart is zoomed out far
 * enough that an island is a few pixels across and picking one is a lottery:
 * you choose the water, then the island, from a list you can actually read.
 */
export function SeaSheet({
  state,
  sea,
  onClose,
  onOpenIsland,
  onOpenReach,
}: {
  state: GameState;
  sea: string;
  onClose: () => void;
  onOpenIsland: (systemId: string) => void;
  onOpenReach: (sectorId: string) => void;
}) {
  const summary = summariseSea(state, sea, state.player);
  const byId = new Map(state.systems.map((s) => [s.id, s] as const));
  const you = state.player;
  const enemy = you === 'empire' ? 'alliance' : 'empire';
  const net = summary.goldPerDay - summary.upkeepPerDay;

  return (
    <Sheet
      title={sea}
      subtitle={
        <span>
          {summary.reaches} {summary.reaches === 1 ? terms.reach : `${terms.reach}es`} ·{' '}
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
        <Stat label={`${terms.gold} a day`} value={summary.goldPerDay.toFixed(1)} />
        <Stat label={`${terms.upkeep} a day`} value={summary.upkeepPerDay} />
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



      {summary.perReach.map((reach) => {
        const sector = state.sectors.find((s) => s.id === reach.sectorId)!;
        return (
          <div key={reach.sectorId}>
            <div className="row row--between" style={{ marginTop: 16, marginBottom: 6 }}>
              <button className="linkish" onClick={() => onOpenReach(sector.id)}>
                {sector.name}
              </button>
              <span className="tiny muted">
                {reach.held} yours · {reach.unaligned} unaligned
              </span>
            </div>
            <div className="stack">
              {reach.perIsland.map((entry) => (
                <IslandRow
                  key={entry.systemId}
                  state={state}
                  system={byId.get(entry.systemId)!}
                  entry={entry}
                  onOpen={onOpenIsland}
                />
              ))}
            </div>
          </div>
        );
      })}
    </Sheet>
  );
}
