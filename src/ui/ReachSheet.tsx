import terms from '../data/terms.json';
import {
  summariseReach,
  type ChartLayer,
  type GameState,
  type PlayableFaction,
  type Sector,
} from '../sim';
import { ChainMap } from './ChainMap';
import type { IslandTab } from './IslandRow';
import { Sheet } from './components';

export type { IslandTab };

/**
 * A Reach is its islands, and nothing else.
 *
 * This used to open with two cards of numbers — how many islands you held,
 * how many were unaligned, what the Reach earned and what it cost — above the
 * chart. Both are gone. Every one of those figures was already on the chart
 * underneath them: an island you hold is painted in your colour, one earning
 * gold carries the mark for it, and how many there are of each is a glance
 * rather than a count. Restating it in a stat card pushed the only thing worth
 * looking at below the fold, on the screen where you spend most of the game.
 *
 * The rule this leaves behind: a panel says what its own level knows. A Reach
 * knows which islands are in it. What is happening *on* an island is the
 * island's own panel, one tap away.
 */
export function ReachSheet({
  state,
  sector,
  onClose,
  onOpenIsland,
  onOpenSea,
  pickingFor,
  sailing,
  layer,
}: {
  state: GameState;
  sector: Sector;
  onClose: () => void;
  onOpenIsland: (systemId: string) => void;
  /** Passed through so the chart can dim islands you cannot sail to. */
  pickingFor?: PlayableFaction | null;
  sailing?: boolean;
  /** Whatever the chart is filtering by, so the same islands stay lit in here. */
  layer?: ChartLayer;
  /** The Sea name is the way into the whole Sea, now the chart shows chains. */
  onOpenSea?: (sea: string) => void;
}) {
  const summary = summariseReach(state, sector.id, state.player);
  const byId = new Map(state.systems.map((s) => [s.id, s] as const));

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
      {/*
        The chain opened out as a chart rather than a list of rows: the islands
        where they lie, each carrying who holds it, what stands on it, whether
        your crew are working it, how it leans and how much of it is free. Tap
        one to open it. No heading above it — it is the whole panel.
      */}
      <ChainMap
        state={state}
        systems={summary.perIsland.map((entry) => byId.get(entry.systemId)!)}
        perIsland={summary.perIsland}
        onOpenIsland={onOpenIsland}
        pickingFor={pickingFor}
        sailing={sailing}
        layer={layer}
      />
      <div className="chainmap__key">
        <span><i className="key key--civil" /> Earns gold</span>
        <span><i className="key key--military" /> Works and yards</span>
        <span><i className="key key--ashore" /> Companies ashore</span>
        <span><i className="key key--mission" /> Your crew here</span>
        <span><i className="key key--ships" /> Hulls at anchor</span>
      </div>
    </Sheet>
  );
}
