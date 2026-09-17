import terms from '../data/terms.json';
import {
  summariseReach,
  type ChartLayer,
  type GameState,
  type PlayableFaction,
  type Sector,
} from '../sim';
import { ChainMap } from './ChainMap';
import { LayerStrip, useLayerSwipe } from './LayerStrip';
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
  onOpenList,
  pickingFor,
  sailing,
  choosing,
  layer,
  onLayerChange,
}: {
  state: GameState;
  sector: Sector;
  onClose: () => void;
  onOpenIsland: (systemId: string) => void;
  /** Passed through so the chart can dim islands you cannot sail to. */
  pickingFor?: PlayableFaction | null;
  sailing?: boolean;
  choosing?: boolean;
  /** Whatever the chart is filtering by, so the same islands stay lit in here. */
  layer?: ChartLayer;
  onLayerChange?: (layer: ChartLayer) => void;
  /** The "N islands" line opens the Reach as a list, one row per island. */
  onOpenList?: (sectorId: string) => void;
}) {
  const summary = summariseReach(state, sector.id, state.player);
  const byId = new Map(state.systems.map((s) => [s.id, s] as const));
  // The same drag as on the full chart. A Reach shows the filter you came in
  // with, so it has to let you change it the way you changed it out there:
  // the chips are for aiming at one, the drag is for walking along them.
  const swipe = useLayerSwipe(layer ?? 'allegiance', onLayerChange ?? (() => {}));
  const dragging = Boolean(layer && onLayerChange && !pickingFor && !sailing && !choosing);

  return (
    <Sheet
      title={sector.name}
      /* One word per idea, at Sean's word of 17 September. The three things a
         player can be looking at are the World Map, a Reach Map and a
         Location, and each says which it is. */
      eyebrow={terms.reachMap}
      subtitle={
        <span>
          {onOpenList ? (
            <button className="linkish" onClick={() => onOpenList(sector.id)}>
              {summary.islands} {terms.islands.toLowerCase()}
            </button>
          ) : (
            `${summary.islands} ${terms.islands.toLowerCase()}`
          )}
          {summary.mutinies > 0 && (
            <span className="badge badge--warn" style={{ marginLeft: 8 }}>
              {summary.mutinies} in {terms.mutiny.toLowerCase()}
            </span>
          )}
        </span>
      }
      onClose={onClose}
      onTouchStart={dragging ? swipe.onTouchStart : undefined}
      onTouchEnd={dragging ? swipe.onTouchEnd : undefined}
      /* The filter you had on the chart, still on and still yours to change,
         pinned to the foot of the panel where it sits on the chart itself.
         It was above the islands, which put the one control you are least
         likely to want between you and the thing you opened the Reach to
         look at — and a thumb's reach from where it had just been. */
      actionsFlush
      actions={
        dragging && layer && onLayerChange ? (
          <LayerStrip
            state={state}
            layer={layer}
            onChange={onLayerChange}
            viewer={state.player}
            foot
          />
        ) : undefined
      }
    >
      {/*
        The chain opened out as a chart rather than a list of rows: the islands
        where they lie, each with who holds it, how much of it is free and how
        it leans. Tap one to open it. No heading above it — it is the whole
        panel.
      */}
      <ChainMap
        state={state}
        systems={summary.perIsland.map((entry) => byId.get(entry.systemId)!)}
        onOpenIsland={onOpenIsland}
        pickingFor={pickingFor}
        sailing={sailing}
        choosing={choosing}
        layer={layer}
      />
      <div className="chainmap__key">
        <span><i className="key key--room" /> Room to build</span>
        <span><i className="key key--lean" /> Loyalty</span>
        <span><i className="key key--ships" /> Hulls at anchor</span>
      </div>
    </Sheet>
  );
}
