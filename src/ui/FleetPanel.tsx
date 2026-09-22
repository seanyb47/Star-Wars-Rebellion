import { useState } from 'react';
import terms from '../data/terms.json';
import {
  hullsBuildingFor,
  inProse,
  type HullOnTheStocks,
  beastAt,
  fleetCapacity,
  fleetDamaged,
  fleetGuns,
  fleetStatus,
  fleetsToJoin,
  fortsOf,
  bombardOdds,
  fleetTicksLeft,
  BOMBARD_TICKS_MAX,
  wallInvasionDefense,
  bombardError,
  assaultError,
  fleeError,
  refugeFor,
  officerEdge,
  officersOf,
  SCOUT_PER_ISLAND,
  shipClass,
  shipSpec,
  type Fleet,
  type GameState,
  type PlayableFaction,
  type Ship,
} from '../sim';
import { CharacterPortrait, CreaturePainting, FacilityIcon, ShipThumb } from './art';
import { encyclopediaShip, useLookUp } from './lookup';
import { usePrefs } from './prefs';
import { ControlBadge, GroupHulls } from './components';

/**
 * One row of a ship list: a class, however many of them there are.
 *
 * Sean: "Ships in the harbor should be more simple. Just show their basic
 * stats and a small icon of any crew aboard. Don't need a huge scroll. Should
 * be almost like the garrison page, just a list of everything there. If I want
 * lore or advanced stats I can click on the ship."
 *
 * So the row carries what you steer by — how many, how much hull is left, how
 * many guns — and nothing you would only read once. The blurb and the pace are
 * behind the row.
 */
function ShipRow({
  ships,
  faction,
  grouped,
  order,
  pick,
}: {
  ships: Ship[];
  faction: PlayableFaction;
  grouped: boolean;
  /** Present only while splitting: the row becomes a choice rather than a
   *  door. A grouped row is all of its hulls at once, which is what grouping
   *  means everywhere else in this list. */
  pick?: { on: boolean; toggle: () => void };
  /** Only present in reorder mode; an end that has nowhere to go is
   *  absent rather than disabled, so a list never shows a dead arrow. */
  order?: { up?: () => void; down?: () => void };
}) {
  const cls = shipClass(ships[0].classId as Parameters<typeof shipClass>[0]);
  const spec = shipSpec(ships[0].classId as Parameters<typeof shipSpec>[0]);
  const lookUp = useLookUp();
  // Rounded here and nowhere else: a hull mends by a per cent of itself a day,
  // so damage is fractional in the arithmetic and whole on the screen.
  const hurt = Math.round(ships.reduce((n, s) => n + s.damage, 0));
  const whole = spec.hull * ships.length;
  if (pick) {
    return (
      <button
        className={`shiprow shiprow--pick${pick.on ? ' shiprow--picked' : ''}`}
        onClick={pick.toggle}
        aria-pressed={pick.on}
      >
        <span className="shiprow__box" aria-hidden="true">
          {pick.on ? '☑' : '☐'}
        </span>
        <ShipThumb faction={faction} role={cls.role} cls={cls.id} size={112} />
        <span className="shiprow__text">
          <span className="shiprow__name">
            {grouped && ships.length > 1 && <b className="shiprow__n">{ships.length}×</b>}
            {cls.name}
          </span>
          <span className="shiprow__stats">
            {whole - hurt}/{whole}
            <span className="muted"> condition</span>
          </span>
        </span>
      </button>
    );
  }

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
      <button
        className="shiprow__tap"
        onClick={() => lookUp?.('ships', encyclopediaShip(cls.id))}
        aria-label={`What is a ${cls.name}?`}
      >
        <ShipThumb faction={faction} role={cls.role} cls={cls.id} size={112} />
        {/* Name over figures rather than beside them. With the painting at the
            size Sean asked for there is no longer a row's width to put a name,
            a hull count and a gun count side by side in. */}
        <span className="shiprow__text">
          <span className="shiprow__name">
            {grouped && ships.length > 1 && <b className="shiprow__n">{ships.length}×</b>}
            {cls.name}
          </span>
          {/* Condition only. What the class *is* — her guns, her armor, what
              can hit her — is a tap away in the encyclopedia, and a gameplay
              screen wants the picture and the state of this hull, not a
              spec sheet.

              And it is *called* condition, since 22 September. Sean: *"say
              it's condition instead of hull strength here."* The tell was
              already in this file — the comment had read "condition only"
              since the row was written while the label under it said hull.
              Two words for one idea, and the reader got the wrong one.

              `hull` keeps the other idea: what the class is *rated* at, the
              1400 the encyclopedia prints beside a Wayfinder, which never
              changes. This number is a state and moves every day. */}
          {/*
            Her condition, in the words the ship sheet used to use.

            Sean, 22 September: *"the middle screen doesn't need to exist.
            Click on ship from the fleet panel and it takes you to the
            encyclopedia entry. No need for the middle page if you simply move
            the status of the ship and any damage indications into the fleet
            screen in lieu of the hull area."*

            He is right that the sheet in between was carrying almost nothing:
            a word (Sound), the same numbers this row already showed, a
            paragraph of repair rules that lives in the Glossary, and a button
            through to the entry. Four of those five were duplicates of
            something one tap away in either direction.

            So a sound hull says so, in one word, the way the sheet did. A hurt
            one shows the figures, because that is the moment the numbers are
            worth the space — which is the whole of "any damage indications".
          */}
          <span className="shiprow__stats">
            {hurt > 0 ? (
              <>
                <span className="shiprow__hurt">
                  {whole - hurt}/{whole}
                </span>
                <span className="muted"> condition</span>
              </>
            ) : (
              <span className="muted">Sound</span>
            )}
          </span>
        </span>
        <span className="shiprow__chev" aria-hidden="true">›</span>
      </button>
      {/* The ℹ that stood here went with the ship sheet. It asked the same
          question the row now answers — two controls side by side leading to
          one page is a choice the reader has to make for no reason. */}
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
  onAssault,
  onBombard,
  onFlee,
  onOpenCharacter,
  onOrderShips,
  onOrderOfficers,
  onDetach,
  canOrder,
}: {
  state: GameState;
  fleet: Fleet;
  onSail: (fleetId: string) => void;
  onAssault: (fleetId: string) => void;
  onBombard?: (fleetId: string) => void;
  onFlee?: (fleetId: string) => void;
  onOpenCharacter?: (characterId: string) => void;
  onOrderShips?: (fleetId: string, shipIds: string[], dir: -1 | 1) => void;
  onOrderOfficers?: (fleetId: string, characterIds: string[], dir: -1 | 1) => void;
  onDetach?: (fleetId: string, shipIds: string[], into?: string) => void;
  canOrder: boolean;
}) {
  const system = state.systems.find((s) => s.id === fleet.systemId);
  const capacity = fleetCapacity(fleet);
  const damaged = fleetDamaged(fleet);
  const atSea = fleet.voyage !== undefined;
  const holdsIsland = system?.control === fleet.faction;
  // The siege. Bombardment is a day at a time, so it is a state the squadron
  // is in rather than a button pressed every morning — the walls first, and
  // the boats only once they are down.
  const cannotBombard = canOrder && !atSea ? bombardError(state, fleet.id, state.player) : 'x';
  const walls = system ? fortsOf(system).length : 0;
  const landBlocked = canOrder && !atSea ? assaultError(state, fleet.id, state.player) : null;
  // Something to break off from, and somewhere to break off to.
  const canFlee = canOrder && !atSea && fleeError(state, fleet.id, state.player) === null;
  /* The two attack orders, asked once so the heading above them can know
     whether there is anything to head. A squadron with no troops lying off an
     island it already holds has neither, and gets no Attack actions row. */
  const canBombard = cannotBombard === null || /out of shot/i.test(cannotBombard ?? '');
  const odds = system && system.control !== fleet.faction ? bombardOdds(state, fleet) : undefined;
  const ticks = fleetTicksLeft(fleet);
  const canLand = !holdsIsland && fleet.troops > 0;
  const refuge = canFlee ? refugeFor(state, fleet) : undefined;

  // One row per class, so eight sloops are a line rather than eight lines.
  const officers = officersOf(state, fleet);
  // What the best spy aboard would open at the next landfall.
  const scouting = Math.round(
    officers.reduce((n, c) => Math.max(n, c.espionage), 0) / SCOUT_PER_ISLAND,
  );

  const [prefs] = usePrefs();
  /**
   * Splitting, as a mode this card is in rather than a preference.
   *
   * Sean: *"how do I split fleets? I need a way to create a fleet from a unit
   * and move ships between fleets."* Reordering and grouping are settings — how
   * you like your lists — so they live in `prefs`. This is an order you are
   * halfway through giving, so it lives here and goes away when the card does.
   */
  const [picking, setPicking] = useState<string[] | null>(null);
  const joinable = canOrder && !atSea ? fleetsToJoin(state, fleet) : [];
  const canSplit = canOrder && !atSea && fleet.ships.length > 1;

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
        {/*
          Set sail, across the header from the fleet's name.

          Sean, 22 September: *"move the set sail button to the top right
          corner of the fleet tab so that it's across the screen from the name
          of the fleet."* It was the last thing in the orders stack, under
          Bombardment and Invasion — so the commonest order on the card was the
          one furthest down it, behind two you give rarely.

          The slot was already free and could only ever be free: the badge
          opposite is drawn for fleets that are not yours, and those are
          exactly the fleets you cannot give orders to. The two can never want
          the same corner.
        */}
        {canOrder && !atSea && (
          <button className="btn fleet__sail" onClick={() => onSail(fleet.id)}>
            Set sail
          </button>
        )}
        {fleet.faction !== state.player && <ControlBadge faction={fleet.faction} />}
      </div>

      {/* There was a stepper here — troops aboard, with a plus and a minus
          — and Sean cut it: "cut this ashore / aboard thing." He is right that
          it was never a decision. Nobody leaves troops standing on a quiet
          island when the hulls going somewhere have room, and nobody carries
          them past an island of theirs that could use them, so both ends of
          the control only ever had one sensible answer, and a control with one
          sensible answer is a chore.

          They load and unload themselves now (see `loadSpareCompanies`), and
          nothing replaces the control, because the fact was never missing: the
          fleet's own line below already says how many are aboard out of what
          the hulls will carry. */}

      {/* The hulls, as a list. One line each, or one line per class with a
          count when grouping is on. */}
      <div className="shiplist">
        {rows.map((row, i) => (
          <ShipRow
            key={row.key}
            ships={row.ships}
            faction={fleet.faction}
            grouped={prefs.group}
            pick={
              picking
                ? {
                    on: row.ships.every((sh) => picking.includes(sh.id)),
                    toggle: () =>
                      setPicking((was) => {
                        const ids = row.ships.map((sh) => sh.id);
                        const all = ids.every((id) => (was ?? []).includes(id));
                        return all
                          ? (was ?? []).filter((id) => !ids.includes(id))
                          : [...(was ?? []), ...ids.filter((id) => !(was ?? []).includes(id))];
                      }),
                  }
                : undefined
            }
            order={
              canOrder && rows.length > 1
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

      {/* Splitting. A mode rather than a preference — you are halfway through
          giving an order, not saying how you like your lists — so it lives on
          the card and goes away with it. Tap the hulls you want, then say
          where they go: a squadron of their own, or one already lying here. */}
      {canSplit && !picking && (
        <button className="fleet__split-open" onClick={() => setPicking([])}>
          Split or join
        </button>
      )}
      {picking && (
        <div className="fleet__split">
          <div className="tiny muted">
            {picking.length === 0
              ? 'Choose the hulls to move.'
              : `${picking.length} of ${fleet.ships.length} chosen.`}
          </div>
          <div className="fleet__split-acts">
            <button className="btn" onClick={() => setPicking(null)}>
              Cancel
            </button>
            {joinable.map((other) => (
              <button
                key={other.id}
                className="btn"
                disabled={picking.length === 0}
                onClick={() => {
                  onDetach?.(fleet.id, picking, other.id);
                  setPicking(null);
                }}
              >
                Join {other.name}
              </button>
            ))}
            <button
              className="btn btn--primary"
              disabled={picking.length === 0 || picking.length === fleet.ships.length}
              onClick={() => {
                onDetach?.(fleet.id, picking);
                setPicking(null);
              }}
            >
              New squadron
            </button>
          </div>
        </div>
      )}

      {/* Who is serving with her.
          Signing somebody on from the quay used to happen here — a chip that
          put them on the deck the instant it was tapped, provided they were
          already standing on the same island. That is gone at Sean's word.
          Taking a deck is a mission now, ordered from the officer and paid for
          with the voyage, so an officer arrives on a quarterdeck the same way
          they arrive anywhere else in this game. What is left is who is
          aboard; tap one to open them, and relieve them from there. */}
      {officers.length > 0 && (
        <div className="fleet__officers">
          {officers.map((officer, i) => (
            <span key={officer.id} className="fleet__officer-wrap">
              {canOrder && officers.length > 1 && (
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
                  size={44}
                />
                <span className="fleet__officer-name">{officer.name}</span>
              </button>
              {canOrder && officers.length > 1 && (
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
          <b>{fleet.troops}</b>/{capacity} troops
        </span>
        {scouting > 0 && <span>+{scouting} charted a landfall</span>}
        {officers.length > 0 && (
          <span>+{Math.round((officerEdge(state, fleet, 'leadership') - 1) * 100)}% command</span>
        )}
      </div>

      {canOrder && !atSea && (
        <div className="fleet__orders">
          {/*
           * Attack actions, named and first.
           *
           * Sean, 21 September: *"Change these terms — Attack Actions:
           * Bombardment, Invasion. Put this at top."* They were "Shell the
           * town — 30 a day" and "Land 2 against 2 ashore", which described
           * the act rather than naming it, and sat under Set sail — so the
           * two orders that decide a war were the two furthest down.
           *
           * The numbers did not just get cut: a rate and a balance of troops
           * are the whole of what you are deciding, so they move to a second
           * line under the name. What goes is the sentence around them.
           */}
          {(canBombard || canLand) && (
            <>
              <div className="section-title">Attack actions</div>
              {/*
                One press, one action. There was a standing order here with a
                "Cease fire" beside it, and both are gone with the daily tick.
              */}
              {cannotBombard === null && odds && (
                <button className="btn orderbtn--stacked" onClick={() => onBombard?.(fleet.id)}>
                  <b>Bombardment</b>
                  {/*
                    The number the player is owed *before* a shot is spent.
                    The top of the die is the squadron's whole bombardment
                    score, so a fleet under the island's total plus the
                    cheapest thing on it has no chance at all rather than long
                    odds — and finding that out over five ticks is how a siege
                    used to waste a war.
                  */}
                  <span className="tiny muted">
                    rolls at most {odds.rolls} · {walls > 0 ? 'walls' : 'the garrison'} stand at{' '}
                    {odds.against}
                  </span>
                  <span className="tiny">
                    {odds.hopeless
                      ? 'Nothing here can be broken by this squadron.'
                      : 'One action, however far it cascades.'}
                  </span>
                </button>
              )}
              {cannotBombard !== null && /out of shot/i.test(cannotBombard) && (
                <div className="tiny muted fleet__blocked">{cannotBombard}</div>
              )}
              {/*
                The magazine, as pips rather than a number: five shots a hull,
                and a hull that is out adds nothing to the squadron's weight
                and still blockades normally.
              */}
              {ticks.some((t) => t.left < BOMBARD_TICKS_MAX) && (
                <div className="tiny muted" style={{ margin: '2px 0 6px' }}>
                  Shot aboard:{' '}
                  {ticks.map((t) => (
                    <span key={t.shipId} style={{ marginRight: 6, letterSpacing: 1 }}>
                      {'\u25CF'.repeat(t.left)}
                      {'\u25CB'.repeat(BOMBARD_TICKS_MAX - t.left)}
                    </span>
                  ))}
                </div>
              )}
              {canLand &&
                (landBlocked ? (
                  <div className="tiny muted fleet__blocked">{landBlocked}</div>
                ) : (
                  <button
                    className="btn btn--primary orderbtn--stacked"
                    onClick={() => onAssault(fleet.id)}
                  >
                    <b>Invasion</b>
                    <span className="tiny">
                      {fleet.troops} against {system?.garrison ?? 0} ashore
                      {walls > 0 ? ` and ${walls} ${walls === 1 ? 'wall' : 'walls'}` : ''}
                    </span>
                  </button>
                ))}
            </>
          )}
          {/* Set sail moved to the card's header on 22 September — see the
              comment there. Every squadron sails; there was a fourth state
              here once, a hull pinned in harbor because the Lord who owned her
              was away on an errand, and it went with the Lords: they are
              people now, and a person being elsewhere does not stop a ship. */}
          {/* Breaking off, where there is something to break off from. It
              always works; what it costs is the run, and how much depends on
              whether anything here can reach a fleet already going. */}
          {canFlee && (
            <button className="btn" onClick={() => onFlee?.(fleet.id)}>
              Break off — run for {refuge?.name ?? 'safety'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Every fleet at an island, yours and theirs, with its fixed defences. */
/**
 * A hull on the stocks, in the harbor she will come to.
 *
 * Sean, 22 September: *"ships under construction need to appear like any other
 * ship but need a UI on them that indicates under construction. Maybe a
 * watermark with a construction logo on it. So I should be able to see them."*
 *
 * So it is the same row a finished hull gets — same painting, same size, same
 * place in the list — with two differences and no third. The painting is
 * dimmed and carries a shipwright's mark over it, which is the watermark; and
 * where a hull in the water reports her condition, this one reports when she
 * will be in it. Nothing else changes, because the whole point is that she
 * reads as one of your ships rather than as a line item on a building.
 *
 * She is not tappable through to the encyclopedia the way a finished hull is —
 * she is, deliberately, since a player looking at a class they have not seen
 * fight yet is exactly who wants the entry.
 */
function StocksRow({ hull, here }: { hull: HullOnTheStocks; here: string }) {
  const lookUp = useLookUp();
  const cls = shipClass(hull.classId);
  const shipped = hull.madeOn.id !== here;
  return (
    <div className="shiprow shiprow--stocks">
      <button
        className="shiprow__tap"
        onClick={() => lookUp?.('ships', encyclopediaShip(cls.id))}
        aria-label={`What is a ${cls.name}?`}
      >
        <span className="stocks__art">
          <ShipThumb faction={hull.owner} role={cls.role} cls={cls.id} size={112} />
          <span className="stocks__mark" aria-hidden="true">
            <FacilityIcon type="shipyard" size={34} />
          </span>
        </span>
        <span className="shiprow__text">
          <span className="shiprow__name">{cls.name}</span>
          <span className="shiprow__stats">
            On the stocks · <b>{hull.days}d</b>
            {shipped && <span className="muted"> · from {inProse(hull.madeOn.name)}</span>}
          </span>
        </span>
      </button>
    </div>
  );
}

export function ShipsHere({
  state,
  systemId,
  onSail,
  onAssault,
  onBombard,
  onFlee,
  onOpenCharacter,
  onOrderShips,
  onOrderOfficers,
  onDetach,
}: {
  state: GameState;
  systemId: string;
  onSail: (fleetId: string) => void;
  onAssault: (fleetId: string) => void;
  onBombard?: (fleetId: string) => void;
  onFlee?: (fleetId: string) => void;
  onOpenCharacter?: (characterId: string) => void;
  onOrderShips?: (fleetId: string, shipIds: string[], dir: -1 | 1) => void;
  onOrderOfficers?: (fleetId: string, characterIds: string[], dir: -1 | 1) => void;
  onDetach?: (fleetId: string, shipIds: string[], into?: string) => void;
}) {
  const here = state.fleets.filter((f) => f.systemId === systemId && !f.voyage);
  const inbound = state.fleets.filter(
    (f) => f.faction === state.player && f.voyage?.targetSystemId === systemId,
  );
  // Yours only, and only where you can see: a hull on somebody else's stocks
  // is exactly the thing espionage is for, and the harbor is not going to
  // hand it over.
  const stocks = hullsBuildingFor(state, systemId, state.player);
  // The fixed defences sit in the harbor with the hulls rather than under
  // Buildings with the mills, because this is where they matter: no landing
  // goes in past a wall that stands, and a bombardment is answered by it.
  // They do not fight an action at sea — see `contestedAt`.
  const island = state.systems.find((s) => s.id === systemId);
  // And whatever is in the water. It is not a fleet and it is nobody's, but a
  // card among the ships is exactly what it is to the player: a thing lying in
  // this harbor with guns, which has to be got past.
  const beast = island && island.beastSeen?.[state.player] ? beastAt(island) : undefined;
  const forts = island ? fortsOf(island).length : 0;
  const defences = forts > 0 && (
    <div className="card row" style={{ gap: 14, alignItems: 'center' }}>
      {forts > 0 && island && (
        <span className="row" style={{ gap: 6 }}>
          <FacilityIcon type="fort" size={22} />
          <span className="small">
            {forts} {forts === 1 ? 'fort' : 'forts'} · {island ? fortsOf(island).reduce((n, f) => n + wallInvasionDefense(f.type), 0) : 0} against
            a landing
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

  if (here.length === 0 && inbound.length === 0 && stocks.length === 0) {
    return (
      <div className="stack">
        {monster}
        {defences}
        <div className="card muted small">
          Nothing is moored here. Lay down a hull at a {terms.facilities.shipyard.toLowerCase()} and
          it will come to anchor where it was built. Any fortress guarding the island will sit
          here too, since a fixed gun is a warship that cannot weigh anchor.
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      {/* The one list that keeps its toggle: four Kestrels are four hulls
          with four different amounts of damage on them, and a player choosing
          which to send wants them apart. Kept on the device rather than in
          the save — a habit, not a fact about this war. */}
      {here.length > 0 && <GroupHulls />}
      {monster}
      {defences}
      {here.map((fleet) => (
        <FleetCard
          key={fleet.id}
          state={state}
          fleet={fleet}
          onSail={onSail}
          onAssault={onAssault}
          onBombard={onBombard}
          onFlee={onFlee}
          onOpenCharacter={onOpenCharacter}
          onOrderShips={onOrderShips}
          onOrderOfficers={onOrderOfficers}
          onDetach={onDetach}
          canOrder={fleet.faction === state.player}
        />
      ))}
      {stocks.length > 0 && (
        <>
          <div className="section-title">On the stocks</div>
          {stocks.map((hull) => (
            <StocksRow key={hull.facilityId} hull={hull} here={systemId} />
          ))}
        </>
      )}
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
