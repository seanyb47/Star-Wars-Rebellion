import terms from '../data/terms.json';
import {
  fleetCapacity,
  fleetGuns,
  fleetStatus,
  isAtSea,
  type Fleet,
  type GameState,
} from '../sim';
import { Sheet } from './components';

/**
 * Every squadron you have, and where it is.
 *
 * Sean, 24 September, after the hollow sail went in: *"Even if it's not there
 * it shouldn't be invisible to me."* It was the right complaint about a bigger
 * hole than the one I had just filled. A fleet was findable in exactly two
 * ways — open the island it is lying at, or open the island it is sailing to —
 * and **both of them require already knowing which island that is.** There was
 * no screen anywhere in the game that listed your own navy. Forget where you
 * sent a squadron and the only way back to it was the Fleets filter, which
 * tells you a number on an island and not which ship it is.
 *
 * So: one list, every fleet of yours, wherever it is.
 *
 * **Under way first**, because those are the ones the rest of the game cannot
 * show you. A fleet at anchor is on the chart under a solid sail and in its
 * island's harbor; a fleet on passage is a hollow sail above an island it has
 * not reached, and until this list it was the thing you had to remember rather
 * than look up.
 *
 * A row opens the island it is at or bound for, which is where every order a
 * fleet can take already lives. It deliberately does not grow its own copy of
 * those buttons: two places to give the same order is how they drift apart,
 * and the island sheet is one tap away.
 */
export function FleetListSheet({
  state,
  onClose,
  onOpenIsland,
}: {
  state: GameState;
  onClose: () => void;
  onOpenIsland: (systemId: string) => void;
}) {
  const mine = state.fleets.filter((f) => f.faction === state.player);
  const sailing = mine.filter((f) => isAtSea(f));
  const moored = mine.filter((f) => !isAtSea(f));
  const hulls = mine.reduce((n, f) => n + f.ships.length, 0);

  const where = (fleet: Fleet): string =>
    fleet.voyage?.targetSystemId ?? fleet.systemId;

  const Row = ({ fleet }: { fleet: Fleet }) => {
    const island = state.systems.find((s) => s.id === where(fleet));
    const berths = fleetCapacity(fleet);
    return (
      <button className="card fleetrow" onClick={() => onOpenIsland(where(fleet))}>
        <div className="row row--between">
          <b>{fleet.name}</b>
          <span className="tiny muted">{island?.name ?? 'open water'} ›</span>
        </div>
        <div className="tiny muted fleetrow__where">{fleetStatus(state, fleet)}</div>
        <div className="fleet__line tiny">
          <span>
            <b>{fleet.ships.length}</b> hulls
          </span>
          <span>
            <b>{fleetGuns(fleet)}</b> guns
          </span>
          <span>
            <b>{fleet.troops}</b>/{berths} {terms.troops.toLowerCase()}
          </span>
        </div>
      </button>
    );
  };

  return (
    <Sheet
      title="Your fleets"
      eyebrow={terms.worldMap}
      subtitle={
        mine.length === 0
          ? 'Nothing of yours is in the water.'
          : `${mine.length} ${mine.length === 1 ? 'squadron' : 'squadrons'} · ${hulls} ${
              hulls === 1 ? 'hull' : 'hulls'
            }${sailing.length > 0 ? ` · ${sailing.length} under way` : ''}`
      }
      onClose={onClose}
    >
      {mine.length === 0 && (
        <p className="tiny muted">
          Lay down a hull at a {terms.facilities.shipyard.toLowerCase()} and it will be here.
        </p>
      )}
      {/* Under way first: these are the ones nothing else on screen can show you. */}
      {sailing.length > 0 && (
        <>
          {/* "Under way", not "At sea": Sean, 24 September. Each row under it
              says where she is making for and when she is due. */}
          <div className="section-title">Under way</div>
          {sailing.map((f) => (
            <Row key={f.id} fleet={f} />
          ))}
        </>
      )}
      {moored.length > 0 && (
        <>
          <div className="section-title">At anchor</div>
          {moored.map((f) => (
            <Row key={f.id} fleet={f} />
          ))}
        </>
      )}
    </Sheet>
  );
}
