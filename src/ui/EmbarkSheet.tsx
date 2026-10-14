import { useState } from 'react';
import terms from '../data/terms.json';
import {
  fleetCapacity,
  requiredGarrison,
  type Fleet,
  type GameState,
  type System,
} from '../sim';
import { Sheet } from './components';

/**
 * Companies from the quay into the boats, by hand.
 *
 * Sean, 24 September: *"How do I move troops from an island into a fleet? I
 * should be able to click on any troop and move any number of them into a
 * fleet up to fleet troop limit."*
 *
 * Until now you could not, and that is his own ruling of 22 September coming
 * back round — *"cut this ashore / aboard thing"* — after which companies load
 * themselves. **That stays**, because it is right about the common case. What
 * it cannot do is the uncommon one: automatic loading takes only what an
 * island can *spare* above its wanted garrison, so an island that is short
 * will never give a company up, however much you would rather have them
 * aboard than lose them with the island.
 *
 * One sheet, one squadron per row, a stepper on each. The ceiling on a row is
 * whichever runs out first — the companies standing on the quay, or the room
 * left in that squadron's holds — so the number on the button is always a
 * number you can actually take.
 *
 * **It will let you strip an island bare**, and says so rather than stopping
 * you. Going under the wanted garrison raises unrest and an empty harbor falls
 * to whoever shows up with one company; both are real prices and both are
 * sometimes worth paying, which is the whole reason to have the control.
 */
export function EmbarkSheet({
  state,
  system,
  onClose,
  onEmbark,
}: {
  state: GameState;
  system: System;
  onClose: () => void;
  onEmbark: (fleetId: string, troops: number) => void;
}) {
  const here = state.fleets.filter(
    (f) => f.faction === state.player && !f.voyage && f.systemId === system.id,
  );
  const wanted = Math.max(requiredGarrison(system.support[state.player], system.uprising), 1);

  return (
    <Sheet
      title="Put troops aboard"
      eyebrow={terms.island}
      subtitle={`${system.name} · ${system.garrison} ashore, ${wanted} wanted`}
      onClose={onClose}
      stacked
    >
      {here.length === 0 ? (
        <p className="tiny muted">
          Nothing of yours is lying in this harbor. Sail a squadron here and its holds are what
          carries them.
        </p>
      ) : (
        here.map((fleet) => (
          <Row key={fleet.id} state={state} system={system} fleet={fleet} onEmbark={onEmbark} />
        ))
      )}
      {here.length > 0 && (
        <p className="tiny muted" style={{ marginTop: 10 }}>
          A squadron leaving fills its own holds with whatever the island can spare, so this is
          only for the times you want more than that — or fewer.{' '}
          {/* Only where there is a floor to fall under. On a firmly held island
              the wanted garrison is one, and "taking it under one stirs the
              island up" is a sentence about nothing. */}
          {wanted > 1 && `Taking the garrison under ${wanted} stirs the island up, and an `}
          {wanted > 1 ? 'empty' : 'An empty'} harbor is taken by whoever arrives with one troop.
        </p>
      )}
    </Sheet>
  );
}

function Row({
  state,
  system,
  fleet,
  onEmbark,
}: {
  state: GameState;
  system: System;
  fleet: Fleet;
  onEmbark: (fleetId: string, troops: number) => void;
}) {
  const room = fleetCapacity(fleet) - fleet.troops;
  // Whichever runs out first: the quay or the holds.
  const most = Math.min(system.garrison, room);
  const [take, setTake] = useState(Math.min(1, most));
  const wanted = Math.max(requiredGarrison(system.support[state.player], system.uprising), 1);
  const after = system.garrison - take;

  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div className="row row--between">
        <b>{fleet.name}</b>
        <span className="tiny muted">
          {fleet.troops}/{fleetCapacity(fleet)} aboard
        </span>
      </div>
      {most === 0 ? (
        <p className="tiny muted" style={{ margin: '6px 0 0' }}>
          {room === 0 ? 'Her holds are full.' : 'Nobody is ashore to take.'}
        </p>
      ) : (
        <>
          <div className="row" style={{ gap: 8, marginTop: 8, alignItems: 'center' }}>
            <button
              className="orderbtn"
              disabled={take <= 1}
              onClick={() => setTake((n) => Math.max(1, n - 1))}
              aria-label="One fewer"
            >
              −
            </button>
            <b style={{ minWidth: 28, textAlign: 'center' }}>{take}</b>
            <button
              className="orderbtn"
              disabled={take >= most}
              onClick={() => setTake((n) => Math.min(most, n + 1))}
              aria-label="One more"
            >
              +
            </button>
            <button className="btn tiny" onClick={() => setTake(most)}>
              All {most}
            </button>
            <span className="row__spacer" style={{ flex: 1 }} />
            <button className="btn btn--primary" onClick={() => onEmbark(fleet.id, take)}>
              Put aboard
            </button>
          </div>
          {after < wanted && (
            <p className="tiny" style={{ margin: '6px 0 0', color: 'var(--bad)' }}>
              {after === 0
                ? 'That leaves the island empty — the next troop to arrive takes it.'
                : `That leaves ${after} ashore of ${wanted} wanted, and the island will stir.`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
