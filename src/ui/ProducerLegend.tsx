import { isAtSea, type GameState } from '../sim';

/**
 * The two things worth a chip at the foot of the chart.
 *
 * This used to count idle yards, drill grounds and slipways, after the
 * original's "Idle Construction Yards" nag. The idle chart layers say that
 * better — on the islands themselves rather than as a total — and two strips
 * at the foot of the chart fought each other for the same space.
 *
 * **A blockade** keeps its alarm because no layer covers it: it is the one
 * thing that costs you a day's takings while you are looking at something
 * else.
 *
 * **Your fleets** are here since 24 September, and they are a door rather than
 * an alarm. Sean: *"Even if it's not there it shouldn't be invisible to me."*
 * A squadron could be found in two ways, and both of them started with already
 * knowing which island it was at or sailing to — so a fleet you had forgotten
 * about was a fleet you could not look up. One chip, always on the chart,
 * opens the list of every one of them. It is the cheapest thing on screen that
 * makes a whole noun of the game reachable.
 */

export function ProducerLegend({
  state,
  onOpenIsland,
  onOpenFleets,
}: {
  state: GameState;
  onOpenIsland?: (systemId: string) => void;
  onOpenFleets?: () => void;
}) {
  const blockaded = state.systems.filter((s) => s.control === state.player && s.blockaded);
  const mine = state.fleets.filter((f) => f.faction === state.player);
  const atSea = mine.filter((f) => isAtSea(f)).length;
  if (blockaded.length === 0 && (mine.length === 0 || !onOpenFleets)) return null;

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
      {mine.length > 0 && onOpenFleets && (
        <button
          className="idle__item"
          onClick={onOpenFleets}
          aria-label={`Your fleets: ${mine.length}${atSea > 0 ? `, ${atSea} at sea` : ''}`}
        >
          {/* The count says how many squadrons; "at sea" is appended only when
              some are, because that is the half of the answer the chart cannot
              draw for you and a steady label would bury it. */}
          <span className="idle__n">{mine.length}</span>
          <span className="idle__label">{atSea > 0 ? `Fleets · ${atSea} at sea` : 'Fleets'}</span>
        </button>
      )}
    </div>
  );
}
