import terms from '../data/terms.json';
import {
  shipClass,
  shipSpec,
  type Fleet,
  type GameState,
  type Ship,
} from '../sim';
import { ShipThumb } from './art';
import { GoldFig, Sheet, Stat } from './components';

/**
 * One class of hull, in full.
 *
 * The harbor is a list now — a line per class with how many, how much hull is
 * left and how many guns — and everything a line cannot carry is here. Which
 * is most of what a ship is: what she was built for, how fast she is, and what
 * she can lift.
 *
 * The sheet is about the class rather than one hull, because that is what the
 * player tapped: nobody wants four sheets for four Kestrels. Where the hulls
 * differ — damage — the sheet says so hull by hull.
 */
export function ShipSheet({
  state,
  fleet,
  shipId,
  onClose,
}: {
  state: GameState;
  fleet: Fleet;
  shipId: string;
  onClose: () => void;
}) {
  const ship = fleet.ships.find((s) => s.id === shipId);
  if (!ship) return null;
  const cls = shipClass(ship.classId);
  const spec = shipSpec(ship.classId);
  const sisters: Ship[] = fleet.ships.filter((s) => s.classId === ship.classId);
  const island = state.systems.find((s) => s.id === fleet.systemId);

  return (
    <Sheet
      title={cls.name}
      subtitle={
        <span>
          {sisters.length > 1 ? `${sisters.length} in ` : ''}
          {fleet.name}
          {island ? ` · ${fleet.voyage ? 'at sea' : island.name}` : ''}
        </span>
      }
      onClose={onClose}
      stacked
      banner={
        <div className="shipsheet__art">
          <ShipThumb faction={fleet.faction} role={cls.role} size={132} />
        </div>
      }
    >
      <div className="card row" style={{ gap: 16, flexWrap: 'wrap' }}>
        <Stat label="Hull" value={spec.hull} />
        <Stat label="Guns" value={spec.guns} />
        <Stat label="Carries" value={spec.carries === 0 ? '—' : `${spec.carries} co.`} />
        {/* `pace` multiplies a crossing's length, so a smaller number is a
            faster ship — which is exactly backwards to read as a figure. The
            word says it instead, and the fleet sails at its slowest hull's. */}
        <Stat
          label="Pace"
          value={spec.pace < 1 ? 'Fast' : spec.pace > 1 ? 'Slow' : 'Steady'}
        />
        <Stat label={terms.upkeep} value={<GoldFig n={spec.upkeep} tone="cost" />} />
      </div>

      {/* Under its own heading, as on the island's Lore tab. A ship sheet is
          one screen and does not need tabs, but the lore should announce
          itself the same way wherever it is: a heading, then prose that is
          meant to be read rather than scanned. */}
      <div className="section-title">Lore</div>
      <p className="charsheet__lore serif" style={{ marginTop: 0 }}>
        {cls.blurb}
      </p>

      {/* Damage is the one thing the sisters do not share, so it is the one
          thing listed hull by hull rather than once for the class. */}
      <div className="section-title">
        {sisters.length === 1 ? 'Condition' : `All ${sisters.length} of her`}
      </div>
      <div className="stack">
        {sisters.map((sister, i) => {
          const left = Math.round(spec.hull - sister.damage);
          const hurt = Math.round(sister.damage);
          return (
            <div key={sister.id} className="card row row--between small">
              <span>
                {cls.name}
                {sisters.length > 1 ? ` ${i + 1}` : ''}
              </span>
              <span className={hurt > 0 ? 'shiprow__hurt' : 'muted'}>
                {hurt === 0 ? 'Sound' : `${left} of ${spec.hull} hull`}
              </span>
            </div>
          );
        })}
      </div>

      <p className="tiny muted" style={{ marginTop: 10 }}>
        A hull that takes its whole number of hits goes down. Nothing mends at sea — a squadron
        carries what was done to it until it stops fighting. At anchor she comes back a hundredth
        of herself a day, twice that at an island of yours with a yard on it that is not shut in.
      </p>
    </Sheet>
  );
}
