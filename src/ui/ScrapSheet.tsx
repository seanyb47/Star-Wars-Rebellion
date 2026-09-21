import {
  FACILITY_LABEL,
  UPKEEP_PER_DAY,
  perFortnight,
  fleetsAt,
  scrapError,
  scrapReturn,
  shipClass,
  type GameState,
  type ScrapTarget,
  type System,
} from '../sim';
import type { ReactNode } from 'react';
import terms from '../data/terms.json';
import { FacilityIcon, FacilityThumb, ShipThumb, facilityPainting } from './art';
import { Coin, Sheet } from './components';

/**
 * Everything on this island you could break up, and what each would raise.
 *
 * Sean's mechanic of 20 September has two halves and the game only had one of
 * them: *"you can either actively do it or the game's going to do it for
 * you."* The fortnightly shortfall was doing it for you; this is the player
 * doing it first.
 *
 * One list rather than a button on every tile, for the reason the Buildings
 * board already gives about felling timber: *a destructive button on a small
 * tile is a button somebody taps by accident*. It is also the honest shape of
 * the decision — what to pull down is a question about the island, answered by
 * looking at everything standing on it at once.
 *
 * And the coin is the smaller half of the answer. An earner is free to raise,
 * so it is worth nothing broken up, and the line that matters on its row is
 * the plot it frees. Every row says both.
 */
export function ScrapSheet({
  state,
  system,
  onScrap,
  onClose,
}: {
  state: GameState;
  system: System;
  onScrap: (what: ScrapTarget, named: string) => void;
  onClose: () => void;
}) {
  const me = state.player;

  type Row = {
    key: string;
    what: ScrapTarget;
    name: string;
    /** For the confirm, which speaks a sentence rather than a label. */
    named: string;
    art?: ReactNode;
    icon?: ReactNode;
    /** What stops it, if anything does. */
    error: string | null;
    /** Upkeep a day this takes off the books. */
    saves: number;
    /** Whether the plot it stands on comes back. */
    frees: boolean;
  };

  const rows: Row[] = [];

  for (const facility of system.facilities) {
    if (facility.owner !== me) continue;
    const what: ScrapTarget = {
      kind: 'facility',
      systemId: system.id,
      facilityId: facility.id,
    };
    const label = FACILITY_LABEL[facility.type];
    rows.push({
      key: facility.id,
      what,
      name: label,
      named: `the ${label.toLowerCase()}`,
      art: facilityPainting(facility.type, facility.owner) ? (
        <FacilityThumb type={facility.type} owner={facility.owner} width={44} />
      ) : undefined,
      icon: <FacilityIcon type={facility.type} size={36} />,
      error: scrapError(state, me, what),
      saves: facility.ancient ? 0 : UPKEEP_PER_DAY[facility.type],
      frees: true,
    });
  }

  // The garrison is a count rather than a list, so it is one row that can be
  // tapped as many times as there are troops standing there.
  if (system.control === me && system.garrison > 0) {
    const what: ScrapTarget = { kind: 'troop', systemId: system.id };
    rows.push({
      key: 'garrison',
      what,
      name: system.garrison > 1 ? `${terms.troops} (${system.garrison})` : terms.troop,
      named: `one ${terms.troop.toLowerCase()}`,
      error: scrapError(state, me, what),
      saves: UPKEEP_PER_DAY.troop,
      frees: false,
    });
  }

  // Hulls lying in this harbor, which is the only place one can be broken up.
  for (const fleet of fleetsAt(state, system.id)) {
    if (fleet.faction !== me) continue;
    for (const ship of fleet.ships) {
      const what: ScrapTarget = { kind: 'ship', fleetId: fleet.id, shipId: ship.id };
      const cls = shipClass(ship.classId);
      rows.push({
        key: ship.id,
        what,
        name: cls.name,
        named: `the ${cls.name}`,
        art: <ShipThumb faction={fleet.faction} role={cls.role} cls={cls.id} size={44} />,
        error: scrapError(state, me, what),
        saves: UPKEEP_PER_DAY[ship.classId],
        frees: false,
      });
    }
  }

  return (
    <Sheet
      title="Break something up"
      eyebrow={system.name}
      subtitle="Half of what it cost, and you stop paying to keep it."
      onClose={onClose}
      stacked
    >
      {rows.length === 0 ? (
        <p className="tiny muted">There is nothing of yours here to pull down.</p>
      ) : (
        <div className="stack">
          {rows.map((row) => {
            const back = scrapReturn(state, row.what);
            return (
              <button
                key={row.key}
                className="card row row--between scraprow"
                disabled={row.error !== null}
                title={row.error ?? undefined}
                onClick={() => onScrap(row.what, row.named)}
              >
                <span className="row scraprow__who">
                  {row.art ?? row.icon}
                  <span className="scraprow__text">
                    <b>{row.name}</b>
                    <span className="tiny muted">
                      {row.error
                        ? row.error
                        : [
                            row.saves > 0 ? `saves ${perFortnight(row.saves)}` : null,
                            row.frees ? 'frees the plot' : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || 'costs you nothing to keep'}
                    </span>
                  </span>
                </span>
                {/* No price on a thing that can never be sold: a number
                    beside "not yours to pull down" is a lie about what the
                    row does. */}
                {row.error ? (
                  <span className="scraprow__back muted">—</span>
                ) : (
                  <span className={`scraprow__back${back === 0 ? ' muted' : ''}`}>
                    {back}
                    <Coin />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <p className="tiny muted" style={{ marginTop: 12 }}>
        An earner cost nothing to raise, so half of nothing is nothing — the reason to pull a mill
        down is the plot it stands on, not the coin. Nothing comes back: a ship broken up is a ship
        gone, and what she was carrying goes ashore.
      </p>
    </Sheet>
  );
}
