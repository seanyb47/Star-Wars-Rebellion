import factionData from '../data/factions.json';
import {
  fleetPace,
  officersOf,
  sailDays,
  shipSpec,
  type GameState,
  type PlayableFaction,
} from '../sim';
import { Sheet, Stat } from './components';

/**
 * Before the anchor comes up: what is sailing, where to, and how long it is
 * gone for.
 *
 * A voyage used to be ordered the instant you touched an island, and the only
 * way to find out it was a nine-day crossing was to watch the days go by with
 * the squadron out of reach. Time is the currency this game actually spends —
 * a fleet at sea is a fleet that is not defending anything — so the number
 * belongs in front of the decision rather than behind it.
 *
 * Everything on this sheet is a consequence of sailing, not a restatement of
 * what the player just tapped: the days, the pace that sets them, what is in
 * the hold, and what is waiting at the other end.
 */
export function SailConfirmSheet({
  state,
  fleetId,
  targetSystemId,
  onConfirm,
  onClose,
}: {
  state: GameState;
  fleetId: string;
  targetSystemId: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const fleet = state.fleets.find((f) => f.id === fleetId);
  const target = state.systems.find((s) => s.id === targetSystemId);
  if (!fleet || !target) return null;

  const from = state.systems.find((s) => s.id === fleet.systemId);
  const days = sailDays(state, fleetId, targetSystemId);
  const crew = officersOf(state, fleet);
  const viewer = fleet.faction as PlayableFaction;
  const enemy = viewer === 'empire' ? 'alliance' : 'empire';

  // The slowest hull in company sets the pace for all of them, so name her:
  // "nine days" is a fact, "nine days because the Sovereign is with you" is
  // something the player can act on by leaving her behind.
  const pace = fleetPace(fleet);
  const slowest = fleet.ships
    .map((s) => shipSpec(s.classId))
    .filter((c) => c.pace === pace)
    .sort((a, b) => a.label.localeCompare(b.label))[0];
  const dragged =
    fleet.ships.length > 1 && fleet.ships.some((s) => shipSpec(s.classId).pace < pace);

  // What is waiting there. The player has charted it or they could not have
  // picked it, so this is not giving anything away.
  const theirs = target.control === enemy;
  const landing = theirs && fleet.troops > 0;

  return (
    <Sheet
      title={`Sail for ${target.name}?`}
      subtitle={
        from ? (
          <span>
            {fleet.name} — {from.name} to {target.name}
          </span>
        ) : (
          fleet.name
        )
      }
      onClose={onClose}
      actions={
        <>
          <button className="btn" onClick={onClose}>
            Don't sail
          </button>
          <button className="btn btn--primary" onClick={onConfirm}>
            Set sail — {days} {days === 1 ? 'day' : 'days'}
          </button>
        </>
      }
    >
      <div className="card row" style={{ gap: 18 }}>
        <Stat label="Days at sea" value={days} />
        <Stat label="Hulls" value={fleet.ships.length} />
        <Stat label="Troops aboard" value={fleet.troops} />
        <Stat label="Crew aboard" value={crew.length} />
      </div>

      {dragged && slowest && (
        <p className="tiny muted" style={{ marginTop: 10 }}>
          The squadron keeps to its slowest hull: the {slowest.label} sets this pace. Sail her
          separately and the rest arrive sooner.
        </p>
      )}

      <p className="tiny muted" style={{ marginTop: 10 }}>
        A fleet at sea cannot be recalled, defends nothing behind it, and arrives on the morning of
        the {days === 1 ? 'next day' : `${days}th day`}.
      </p>

      {crew.length > 0 && (
        <p className="tiny muted" style={{ marginTop: 8 }}>
          Sailing with her: {crew.map((c) => c.name).join(', ')}. They are wherever she is until she
          makes port.
        </p>
      )}

      {theirs && (
        <p className="tiny" style={{ color: 'var(--bad)', marginTop: 10 }}>
          {target.name} is held by the {factionData[enemy].shortName}.{' '}
          {landing
            ? `Arriving with ${fleet.troops} ${fleet.troops === 1 ? 'troop' : 'troops'} aboard, you can put them ashore.`
            : 'With no troops aboard you can blockade it, but you cannot take the island.'}
        </p>
      )}
    </Sheet>
  );
}
