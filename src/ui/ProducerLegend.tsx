import { type GameState } from '../sim';

/**
 * A shut harbour, and nothing else.
 *
 * This used to also count idle yards, drill grounds and slipways, after the
 * original's "Idle Construction Yards" nag. The Idle works chart layer now says
 * the same thing better — on the islands themselves rather than as a total —
 * and two strips at the foot of the chart fought each other for the same space.
 *
 * A blockade keeps its alarm because no layer covers it: it is the one thing
 * that costs you a day's takings while you are looking at something else.
 */

export function ProducerLegend({
  state,
  onOpenIsland,
}: {
  state: GameState;
  onOpenIsland?: (systemId: string) => void;
}) {
  const blockaded = state.systems.filter((s) => s.control === state.player && s.blockaded);
  if (blockaded.length === 0) return null;

  return (
    <div className="idle">
      {blockaded.length > 0 && (
        <button
          className="idle__item idle__item--alarm"
          onClick={() => onOpenIsland?.(blockaded[0].id)}
          aria-label={`${blockaded.length} of your islands blockaded`}
        >
          <span className="idle__n">{blockaded.length}</span>
          <span className="idle__label">Blockaded</span>
        </button>
      )}
    </div>
  );
}
