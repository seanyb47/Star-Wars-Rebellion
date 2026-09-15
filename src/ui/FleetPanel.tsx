import terms from '../data/terms.json';
import {
  beastAt,
  fleetCapacity,
  fleetDamaged,
  fleetGuns,
  fleetStatus,
  fleetHeldAshore,
  fleeError,
  refugeFor,
  isLordShip,
  officerEdge,
  officersOf,
  SCOUT_PER_ISLAND,
  shipClass,
  shipSpec,
  type Fleet,
  type GameState,
  type PlayableFaction,
  type Ship,
  FORT_GUNS,
} from '../sim';
import { CharacterPortrait, CreaturePainting, FacilityIcon, ShipThumb } from './art';
import { usePrefs } from './prefs';
import { ControlBadge, ListOpts } from './components';

/**
 * One row of a ship list: a class, however many of them there are.
 *
 * Sean: "Ships in the harbor should be more simple. Just show their basic
 * stats and a small icon of any crew aboard. Don't need a huge scroll. Should
 * be almost like the garrison page, just a list of everything there. If I want
 * lore or advanced stats I can click on the ship."
 *
 * So the row carries what you steer by — how many, how much hull is left, how
 * many guns — and nothing you would only read once. The blurb, the pace, what
 * a Lord's ship does, all of it is behind the row.
 */
function ShipRow({
  ships,
  faction,
  grouped,
  onOpen,
  order,
}: {
  ships: Ship[];
  faction: PlayableFaction;
  grouped: boolean;
  onOpen: () => void;
  /** Only present in reorder mode; an end that has nowhere to go is
   *  absent rather than disabled, so a list never shows a dead arrow. */
  order?: { up?: () => void; down?: () => void };
}) {
  const cls = shipClass(ships[0].classId as Parameters<typeof shipClass>[0]);
  const spec = shipSpec(ships[0].classId as Parameters<typeof shipSpec>[0]);
  const hurt = ships.reduce((n, s) => n + s.damage, 0);
  const whole = spec.hull * ships.length;
  return (
    <div className="shiprow">
      {order && (
        <span className="shiprow__order">
          <button
            className="orderbtn"
            onClick={order.up}
            disabled={!order.up}
            aria-label={`Move ${cls.name} up`}
          >
            ▲
          </button>
          <button
            className="orderbtn"
            onClick={order.down}
            disabled={!order.down}
            aria-label={`Move ${cls.name} down`}
          >
            ▼
          </button>
        </span>
      )}
      <button className="shiprow__tap" onClick={onOpen} aria-label={`${cls.name} — details`}>
        <ShipThumb faction={faction} role={cls.role} size={34} />
        <span className="shiprow__name">
          {grouped && ships.length > 1 && <b className="shiprow__n">{ships.length}×</b>}
          {cls.name}
          {isLordShip(ships[0]) && <span className="tiny shiprow__lord"> · a Lord's ship</span>}
        </span>
        <span className="shiprow__stats">
          <span className={hurt > 0 ? 'shiprow__hurt' : undefined}>
            {whole - hurt}/{whole}
          </span>
          <span className="muted"> hull · </span>
          {spec.guns * ships.length}
          <span className="muted"> guns</span>
        </span>
        <span className="shiprow__chev" aria-hidden="true">›</span>
      </button>
    </div>
  );
}

/**
 * One fleet, laid out the way the original lays out a fleet: a plain table of
 * facts with the words spelled out, capacity stated against what is actually
 * aboard, and every slot named even when it is empty. An empty slot that says
 * so is worth more than one that stays quiet.
 */
export function FleetCard({
  state,
  fleet,
  onSail,
  onEmbark,
  onAssault,
  onFlee,
  onOpenCharacter,
  onOpenShip,
  onOrderShips,
  onOrderOfficers,
  canOrder,
}: {
  state: GameState;
  fleet: Fleet;
  onSail: (fleetId: string) => void;
  onEmbark: (fleetId: string, companies: number) => void;
  onAssault: (fleetId: string) => void;
  onFlee?: (fleetId: string) => void;
  onOpenCharacter?: (characterId: string) => void;
  onOpenShip?: (fleetId: string, shipId: string) => void;
  onOrderShips?: (fleetId: string, shipIds: string[], dir: -1 | 1) => void;
  onOrderOfficers?: (fleetId: string, characterIds: string[], dir: -1 | 1) => void;
  canOrder: boolean;
}) {
  const system = state.systems.find((s) => s.id === fleet.systemId);
  const capacity = fleetCapacity(fleet);
  const damaged = fleetDamaged(fleet);
  const atSea = fleet.voyage !== undefined;
  const ashore = system?.garrison ?? 0;
  const holdsIsland = system?.control === fleet.faction;
  /** A Lord of this fleet who is off on an errand, and so pinning the hull. */
  const waitingFor = fleetHeldAshore(state, fleet);
  // Something to break off from, and somewhere to break off to.
  const canFlee = canOrder && !atSea && fleeError(state, fleet.id, state.player) === null;
  const refuge = canFlee ? refugeFor(state, fleet) : undefined;

  // One row per class, so eight sloops are a line rather than eight lines.
  const officers = officersOf(state, fleet);
  // What the best spy aboard would open at the next landfall.
  const scouting = Math.round(
    officers.reduce((n, c) => Math.max(n, c.espionage), 0) / SCOUT_PER_ISLAND,
  );

  const [prefs] = usePrefs();
  /**
   * The list, as rows.
   *
   * Grouped, a row is a class and every hull of it; ungrouped, a row is one
   * hull. Grouping reads off the array in place rather than sorting it, so a
   * squadron the player has put in an order keeps that order: the first
   * Kestrel's position is the Kestrel row's position.
   */
  const rows: Array<{ key: string; ships: Ship[] }> = [];
  if (prefs.group) {
    const at = new Map<string, number>();
    for (const ship of fleet.ships) {
      const seen = at.get(ship.classId);
      if (seen === undefined) {
        at.set(ship.classId, rows.length);
        rows.push({ key: ship.classId, ships: [ship] });
      } else {
        rows[seen].ships.push(ship);
      }
    }
  } else {
    for (const ship of fleet.ships) rows.push({ key: ship.id, ships: [ship] });
  }

  return (
    <div className="card fleet">
      <div className="row row--between" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 600 }}>{fleet.name}</div>
          <div className="tiny muted" style={{ marginTop: 2 }}>
            {fleetStatus(state, fleet)}
          </div>
        </div>
        {fleet.faction !== state.player && <ControlBadge faction={fleet.faction} />}
      </div>

      {/* The hulls, as a list. One line each, or one line per class with a
          count when grouping is on. */}
      <div className="shiplist">
        {rows.map((row, i) => (
          <ShipRow
            key={row.key}
            ships={row.ships}
            faction={fleet.faction}
            grouped={prefs.group}
            onOpen={() => onOpenShip?.(fleet.id, row.ships[0].id)}
            order={
              prefs.reorder && canOrder && rows.length > 1
                ? {
                    up: i === 0 ? undefined : () => onOrderShips?.(fleet.id, row.ships.map((sh) => sh.id), -1),
                    down:
                      i === rows.length - 1
                        ? undefined
                        : () => onOrderShips?.(fleet.id, row.ships.map((sh) => sh.id), 1),
                  }
                : undefined
            }
          />
        ))}
      </div>

      {/* Who is serving with her.
          Signing somebody on from the quay used to happen here — a chip that
          put them on the deck the instant it was tapped, provided they were
          already standing on the same island. That is gone at Sean's word.
          Taking a deck is an errand now, ordered from the officer and paid for
          with the voyage, so an officer arrives on a quarterdeck the same way
          they arrive anywhere else in this game. What is left is who is
          aboard; tap one to open them, and relieve them from there. */}
      {officers.length > 0 && (
        <div className="fleet__officers">
          {officers.map((officer, i) => (
            <span key={officer.id} className="fleet__officer-wrap">
              {prefs.reorder && canOrder && officers.length > 1 && (
                <button
                  className="orderbtn orderbtn--inline"
                  disabled={i === 0}
                  onClick={() => onOrderOfficers?.(fleet.id, [officer.id], -1)}
                  aria-label={`Move ${officer.name} earlier`}
                >
                  ‹
                </button>
              )}
              <button
                className="fleet__officer"
                onClick={() => onOpenCharacter?.(officer.id)}
                aria-label={`${officer.name}, in command`}
              >
                <CharacterPortrait
                  name={officer.name}
                  faction={officer.faction}
                  people={officer.people}
                  size={26}
                />
                <span className="fleet__officer-name">{officer.name}</span>
              </button>
              {prefs.reorder && canOrder && officers.length > 1 && (
                <button
                  className="orderbtn orderbtn--inline"
                  disabled={i === officers.length - 1}
                  onClick={() => onOrderOfficers?.(fleet.id, [officer.id], 1)}
                  aria-label={`Move ${officer.name} later`}
                >
                  ›
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* The whole squadron in one line. This was a six-cell table of facts
          spelled out, which is right for a thing you study and wrong for a
          thing you glance at on the way to giving an order — and the per-hull
          half of it is now in the rows above. What is left is what belongs to
          the squadron rather than to any hull in it. */}
      <div className="fleet__line tiny">
        <span>
          <b>{fleet.ships.length}</b> {fleet.ships.length === 1 ? 'hull' : 'hulls'}
        </span>
        <span>
          <b>{fleetGuns(fleet)}</b> guns
        </span>
        {damaged > 0 && <span className="fleet__line-bad">{damaged} damaged</span>}
        <span>
          <b>{fleet.troops}</b>/{capacity} companies
        </span>
        {scouting > 0 && <span>+{scouting} charted a landfall</span>}
        {officers.length > 0 && (
          <span>+{Math.round((officerEdge(state, fleet, 'leadership') - 1) * 100)}% command</span>
        )}
      </div>

      {canOrder && !atSea && (
        <div className="fleet__orders">
          {/* A Lord's ship does not sail without her Lord, and the button says
              so here rather than letting you pick a destination and be told
              no at the end of it. */}
          <button
            className="btn"
            disabled={waitingFor !== undefined}
            onClick={() => onSail(fleet.id)}
          >
            {waitingFor ? `Waiting for ${waitingFor.name.split(' ').slice(-1)[0]}` : 'Set sail'}
          </button>
          {/* Loading companies is not a spare button, it is the whole of how
              an island changes hands: a fleet with an empty hold can blockade
              a harbor and can never take it. What was wrong was the shape —
              two buttons that each moved one company, so putting five aboard
              was five taps at one end and five at the other, and the pair of
              them sat there on every fleet whether or not there was anybody
              ashore to load. One row: how many are aboard, out of what the
              hulls will carry, with the two ends of it either side. */}
          {holdsIsland && (ashore > 0 || fleet.troops > 0) && (
            <div className="stepper">
              <button
                className="stepper__btn"
                disabled={fleet.troops === 0}
                onClick={() => onEmbark(fleet.id, -1)}
                aria-label={`Put a ${terms.troop.toLowerCase()} ashore`}
              >
                −
              </button>
              <span className="stepper__read">
                <b>{fleet.troops}</b>
                <span className="muted"> of {capacity} aboard</span>
                <span className="tiny muted stepper__spare">
                  {ashore} ashore on {system?.name ?? 'the island'}
                </span>
              </span>
              <button
                className="stepper__btn"
                disabled={ashore === 0 || fleet.troops >= capacity}
                onClick={() => onEmbark(fleet.id, 1)}
                aria-label={`Take a ${terms.troop.toLowerCase()} aboard`}
              >
                +
              </button>
            </div>
          )}
          {/* Breaking off, where there is something to break off from. It
              always works; what it costs is the run, and how much depends on
              whether anything here can reach a fleet already going. */}
          {canFlee && (
            <button className="btn" onClick={() => onFlee?.(fleet.id)}>
              Break off — run for {refuge?.name ?? 'safety'}
            </button>
          )}
          {!holdsIsland && fleet.troops > 0 && (
            <button className="btn btn--primary" onClick={() => onAssault(fleet.id)}>
              Land {fleet.troops} against {system?.garrison ?? 0} ashore
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Every fleet at an island, yours and theirs, with its fixed defences. */
export function ShipsHere({
  state,
  systemId,
  onSail,
  onEmbark,
  onAssault,
  onFlee,
  onOpenCharacter,
  onOpenShip,
  onOrderShips,
  onOrderOfficers,
}: {
  state: GameState;
  systemId: string;
  onSail: (fleetId: string) => void;
  onEmbark: (fleetId: string, companies: number) => void;
  onAssault: (fleetId: string) => void;
  onFlee?: (fleetId: string) => void;
  onOpenCharacter?: (characterId: string) => void;
  onOpenShip?: (fleetId: string, shipId: string) => void;
  onOrderShips?: (fleetId: string, shipIds: string[], dir: -1 | 1) => void;
  onOrderOfficers?: (fleetId: string, characterIds: string[], dir: -1 | 1) => void;
}) {
  const here = state.fleets.filter((f) => f.systemId === systemId && !f.voyage);
  const inbound = state.fleets.filter(
    (f) => f.faction === state.player && f.voyage?.targetSystemId === systemId,
  );
  // The fixed defences sit in the harbor with the hulls: a fort is a warship
  // that cannot weigh anchor, and it belongs on this tab rather than under
  // Buildings with the mills, because this is where it fights.
  const island = state.systems.find((s) => s.id === systemId);
  // And whatever is in the water. It is not a fleet and it is nobody's, but a
  // card among the ships is exactly what it is to the player: a thing lying in
  // this harbor with guns, which has to be got past.
  const beast = island && island.beastSeen?.[state.player] ? beastAt(island) : undefined;
  const forts = island ? island.facilities.filter((x) => x.type === 'fort' && !x.building).length : 0;
  const booms = island ? island.facilities.filter((x) => x.type === 'boom' && !x.building).length : 0;
  const defences = (forts > 0 || booms > 0) && (
    <div className="card row" style={{ gap: 14, alignItems: 'center' }}>
      {forts > 0 && (
        <span className="row" style={{ gap: 6 }}>
          <FacilityIcon type="fort" size={22} />
          <span className="small">
            {forts} {forts === 1 ? 'fort' : 'forts'} · {forts * FORT_GUNS} guns on the wall
          </span>
        </span>
      )}
      {booms > 0 && (
        <span className="row" style={{ gap: 6 }}>
          <FacilityIcon type="boom" size={22} />
          <span className="small">
            {booms} {booms === 1 ? 'boom' : 'booms'} across the mouth
          </span>
        </span>
      )}
    </div>
  );

  const monster = beast && beast.guns > 0 && island && (
    <div className="card fleet fleet--beast">
      <div className="row row--between" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 600 }}>{beast.name}</div>
          <div className="tiny muted" style={{ marginTop: 2 }}>
            {island.beastSlain
              ? 'Dead in the water'
              : island.cornered
                ? 'Hurt, cornered, and fighting'
                : island.beastRoaming
                  ? 'Hunting these waters — it does not stay put'
                  : 'In the water, and nobody\u2019s'}
          </div>
        </div>
        <span className="badge badge--none">Neutral</span>
      </div>
      <div style={{ marginTop: 8 }}>
        <CreaturePainting slug={beast.slug} height={72} className="fleet__beast-art" />
      </div>
      <div className="fleet__line tiny">
        <span>
          <b>{island.beastSlain ? '—' : beast.guns}</b> guns
        </span>
        <span>
          <b>{island.beastDamage ?? 0}</b>/{beast.hull} hurt
        </span>
      </div>
      <p className="tiny" style={{ margin: 0, color: island.beastSlain ? 'var(--muted)' : 'var(--bad)' }}>
        {island.beastSlain
          ? 'Killed. The water here is only water now.'
          : island.cornered
            ? 'It has been hurt and there is nowhere in this Sea left for it to go. It will not run again.'
            : island.beastRoaming
              ? 'Word of it is out and it has stopped staying put: it moves about this Sea, goes where ships are, and takes them at sea when it finds none at anchor. Hurt it enough and it breaks off \u2014 unless every island here is shut to it.'
              : 'It fires on anything lying here, whoever it belongs to, and no fort on the island can be brought to bear on it. It does not mend what you take off it \u2014 break off and come back and it is still carrying it.'}
      </p>
    </div>
  );

  if (here.length === 0 && inbound.length === 0) {
    return (
      <div className="stack">
        {monster}
        {defences}
        <div className="card muted small">
          Nothing is moored here. Lay down a hull at a {terms.facilities.shipyard.toLowerCase()} and
          it will come to anchor where it was built. Any fort or boom guarding the island will sit
          here too, since a fixed gun is a warship that cannot weigh anchor.
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      {/* How the player likes to read a list, not what is in it. Kept on the
          device rather than in the save, because it is a habit rather than a
          fact about this war, and it should hold across every game. */}
      {here.length > 0 && <ListOpts />}
      {monster}
      {defences}
      {here.map((fleet) => (
        <FleetCard
          key={fleet.id}
          state={state}
          fleet={fleet}
          onSail={onSail}
          onEmbark={onEmbark}
          onAssault={onAssault}
          onFlee={onFlee}
          onOpenCharacter={onOpenCharacter}
          onOpenShip={onOpenShip}
          onOrderShips={onOrderShips}
          onOrderOfficers={onOrderOfficers}
          canOrder={fleet.faction === state.player}
        />
      ))}
      {inbound.length > 0 && (
        <>
          <div className="section-title">Under way to here</div>
          {inbound.map((fleet) => (
            <div key={fleet.id} className="card row row--between">
              <span className="small">{fleet.name}</span>
              <span className="tiny muted">{fleet.voyage!.daysRemaining}d out</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
