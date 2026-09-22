import {
  shipClass,
  shipSpec,
  type Fleet,
  type GameState,
  type Ship,
} from '../sim';
import { ShipThumb } from './art';
import { Sheet } from './components';
import { encyclopediaShip, useLookUp } from './lookup';

/**
 * One hull in your harbor: her picture, where she is, and what state she is in.
 *
 * Deliberately not a spec sheet. Sean, on the fleet screen: *"doesn't need to
 * show stats just clickable to encyclopedia"* — which is the rule he set when
 * the unit art went in and this screen had drifted off it: *"We want image and
 * minimal possible text in gameplay screens. Click on them for stats, lore, an
 * even larger picture."*
 *
 * So the split is by what the thing belongs to. Hull, guns, armor, what she
 * carries, what she costs, what can hit her — those describe the **class**,
 * they are the same for every one ever built, and they live in the
 * encyclopedia where there is room to lay them out. Her **condition** is this
 * hull's alone and belongs nowhere else, so it is what this sheet is for.
 *
 * The lore went with the stats for the same reason: it is about the class, it
 * is the same paragraph on every Tempest, and it reads better under a large
 * painting than squeezed under a small one.
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
  const lookUp = useLookUp();
  const ship = fleet.ships.find((s) => s.id === shipId);
  if (!ship) return null;
  const cls = shipClass(ship.classId);
  const spec = shipSpec(ship.classId);
  const sisters: Ship[] = fleet.ships.filter((s) => s.classId === ship.classId);
  const island = state.systems.find((s) => s.id === fleet.systemId);
  const look = lookUp ? () => lookUp('ships', encyclopediaShip(cls.id)) : undefined;

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
        /* The painting is the sheet, and it is also the way through to the
           bigger one. Tapping a ship to learn what she is should not require
           finding a button first. */
        look ? (
          <button className="shipsheet__art shipsheet__art--tap" onClick={look}>
            <ShipThumb faction={fleet.faction} role={cls.role} cls={cls.id} size={132} />
          </button>
        ) : (
          <div className="shipsheet__art">
            <ShipThumb faction={fleet.faction} role={cls.role} cls={cls.id} size={132} />
          </div>
        )
      }
    >
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
                {hurt === 0 ? 'Sound' : `${left} of ${spec.hull} condition`}
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

      {look && (
        <button className="btn btn--block" style={{ marginTop: 12 }} onClick={look}>
          What is a {cls.name}?
        </button>
      )}
    </Sheet>
  );
}
