import { useState } from 'react';
import {
  assaultError,
  bombardError,
  bombardOdds,
  fleetCapacity,
  fleetGuns,
  fleetsAt,
  fortsOf,
  islandDefenders,
  isAtSea,
  type Fleet,
  type GameState,
  type Intel,
  type System,
} from '../sim';
import terms from '../data/terms.json';
import { SectionHead, Sheet } from './components';

/**
 * The first viewport of an island: what I have here, what is ashore, and the
 * two orders that decide the war.
 *
 * Sean's island-command brief, 24 September, on what the first screen has to
 * answer without hunting through the harbor — who holds it, how the island
 * leans, what I have here, what is known to be ashore, and which orders I can
 * give now. The last three were all true of this sheet already and all three
 * were **two taps down**, inside a fleet card inside the Harbor tab, under a
 * heading called *Attack actions*. A player looking at an enemy island had to
 * open a ship to find out whether they could land on it.
 *
 * So the orders come up to the surface and the tabs keep everything else. This
 * is deliberately not a second copy of the fleet card: the buttons call the
 * same `onBombard` and `onAssault` the card calls, read the same
 * `bombardError` and `assaultError`, and show the same `bombardOdds`. There is
 * one set of rules and this is a second door onto it.
 *
 * **Two things the brief asked for and the game does not have**, both left
 * alone rather than invented:
 *
 * - *"Invasion review should allow selecting how many troops to land only if
 *   the existing game rules actually support partial deployment."* They do
 *   not — `assault` takes a fleet and lands its whole complement — so the
 *   review is a read-only statement of the force committed, with no stepper.
 * - *"Bombardment review should expose target selection only if already
 *   supported."* It is not, and on purpose: Sean cut deliberate targeting on
 *   21 September, and `bombardNow`'s own note says why — shot goes at the
 *   walls while any stand and can only reach the garrison when none do.
 */

/** A squadron of yours lying in this harbor, which is what gives the orders. */
function mineHere(state: GameState, system: System): Fleet[] {
  return fleetsAt(state, system.id).filter(
    (f) => f.faction === state.player && !isAtSea(f),
  );
}

/**
 * What the player actually knows about what is ashore.
 *
 * On your own island it is today's number. On theirs it is whatever the last
 * report said, and the age of that report is half the answer — a count taken
 * forty days ago is a rumour. Where there is no report at all the card says
 * so rather than showing a zero, because an unknown garrison and an empty one
 * are the two things a landing must never confuse.
 */
function ashoreLine(
  state: GameState,
  system: System,
  report: Intel | undefined,
): { figure: string; note: string; known: boolean } {
  if (!report) {
    return system.control === state.player
      ? { figure: `${system.garrison}`, note: 'Ashore now', known: true }
      : {
          figure: 'Not counted',
          note: `No report. Send somebody on ${terms.errand}.`,
          known: false,
        };
  }
  const age = state.day - report.day;
  return {
    figure: `${system.garrison}`,
    note: age === 0 ? 'Counted today' : `As counted ${age} ${age === 1 ? 'day' : 'days'} ago`,
    known: true,
  };
}

/** Hulls and guns, and how much of the hold is full. */
function squadronLine(fleets: Fleet[]): { figure: string; note: string } {
  const hulls = fleets.reduce((n, f) => n + f.ships.length, 0);
  const guns = fleets.reduce((n, f) => n + fleetGuns(f), 0);
  const troops = fleets.reduce((n, f) => n + f.troops, 0);
  const berths = fleets.reduce((n, f) => n + fleetCapacity(f), 0);
  return {
    figure: `${hulls} ${hulls === 1 ? 'hull' : 'hulls'} · ${guns} guns`,
    note:
      berths === 0
        ? 'No troop berths'
        : `${troops} of ${berths} troop ${berths === 1 ? 'berth' : 'berths'} filled`,
  };
}

/** Which order a review sheet is reviewing. */
type Order = 'bombard' | 'invade';

export function IslandCommand({
  state,
  system,
  report,
  onBombard,
  onAssault,
}: {
  state: GameState;
  system: System;
  /** The report this panel is reading, where the island is not yours. */
  report?: Intel;
  onBombard?: (fleetId: string) => void;
  onAssault: (fleetId: string) => void;
}) {
  const [review, setReview] = useState<Order | null>(null);
  const fleets = mineHere(state, system);
  // Nothing of yours in the water here means no orders to give from here, and
  // an empty card saying so is worse than no card.
  if (fleets.length === 0 || system.control === state.player) return null;

  /*
   * Which squadron carries the order.
   *
   * The sheet can be looking at three of yours lying off one island, and the
   * sim's orders are per-squadron. Rather than invent a combined fleet — which
   * would be a new mechanic, and the brief is explicit about not doing that —
   * each order goes to the first squadron that can carry it, and the button
   * names her so there is no doubt which one sailed.
   */
  const gunner = fleets.find((f) => bombardError(state, f.id, state.player) === null);
  const lander = fleets.find((f) => assaultError(state, f.id, state.player) === null);
  // The reason, when there is no squadron that can. First one is enough: they
  // are the same island and usually the same answer.
  const noBombard = gunner ? null : bombardError(state, fleets[0].id, state.player);
  const noLand = lander ? null : assaultError(state, fleets[0].id, state.player);

  const odds = gunner ? bombardOdds(state, gunner) : undefined;
  const walls = fortsOf(system).length;
  const squadron = squadronLine(fleets);
  const ashore = ashoreLine(state, system, report);

  return (
    <div className="command">
      {/* The two facts a landing is decided on, side by side, because the
          decision is the comparison and reading them off two different tabs
          is how it used to be made. */}
      <div className="command__grid">
        <div className="command__card">
          <span className="command__label">Your squadron</span>
          <strong>{squadron.figure}</strong>
          <small>{squadron.note}</small>
        </div>
        <div className="command__card">
          <span className="command__label">Ashore</span>
          <strong>{ashore.figure}</strong>
          <small>{ashore.note}</small>
        </div>
      </div>

      <SectionHead
        title="Fleet orders"
        to="rules"
        at="bombardment"
        help="How a bombardment cascades, and what a landing has to beat"
      />
      {/* Two orders, the same size, side by side. They were a primary button
          and a plain one stacked under a heading, which made the landing read
          as the thing you were meant to do — and on a walled island it is the
          expensive half of the answer. */}
      <div className="command__orders">
        <button
          className="card card--tap command__order"
          disabled={!gunner}
          onClick={() => setReview('bombard')}
        >
          <b>Bombardment</b>
          <span className="tiny muted">
            {odds
              ? `Rolls at most ${odds.rolls} · ${
                  walls > 0
                    ? `${walls === 1 ? 'the wall stands' : 'the walls stand'}`
                    : 'the garrison stands'
                } at ${odds.against}`
              : 'Guns against the island'}
          </span>
          {gunner && fleets.length > 1 && <span className="tiny muted">{gunner.name}</span>}
        </button>
        <button
          className="card card--tap command__order"
          disabled={!lander}
          onClick={() => setReview('invade')}
        >
          <b>Invasion</b>
          {/* What it is going against, and honestly. An unknown garrison and
              an empty one are the two things a landing must never confuse, so
              where nobody has counted the island the line says that rather
              than reading "3 against 0". */}
          <span className="tiny muted">
            {!lander
              ? `${terms.troops} ashore`
              : ashore.known
                ? `${lander.troops} against ${system.garrison}${
                    walls > 0 ? ` and ${walls} ${walls === 1 ? 'wall' : 'walls'}` : ''
                  }`
                : `${lander.troops} landing · nobody has counted what is ashore`}
          </span>
          {lander && fleets.length > 1 && <span className="tiny muted">{lander.name}</span>}
        </button>
      </div>

      {/* Why an order is shut, in the same type as everything else. The brief:
          *"Do not place strategic consequences or failure reasons solely in
          muted tiny text. Make disabled action reasons explicit."* A greyed
          button with no sentence is the thing that sends a player looking for
          a bug. */}
      {(noBombard || noLand) && (
        <ul className="command__why">
          {noBombard && (
            <li>
              <b>No bombardment.</b> {noBombard}
            </li>
          )}
          {noLand && (
            <li>
              <b>No landing.</b> {noLand}
            </li>
          )}
        </ul>
      )}

      {review && (
        <OrderReview
          state={state}
          system={system}
          order={review}
          fleet={review === 'bombard' ? gunner! : lander!}
          ashore={ashore}
          onClose={() => setReview(null)}
          onConfirm={() => {
            const id = review === 'bombard' ? gunner!.id : lander!.id;
            setReview(null);
            if (review === 'bombard') onBombard?.(id);
            else onAssault(id);
          }}
        />
      )}
    </div>
  );
}

/**
 * The order before it is given: what goes, what it is going against, and what
 * it costs. Nothing here is a choice — every field is read off the rules —
 * which is the point. A landing is the one order in the game you cannot take
 * back, and it used to be one tap with the numbers in a subtitle.
 */
function OrderReview({
  state,
  system,
  order,
  fleet,
  ashore,
  onClose,
  onConfirm,
}: {
  state: GameState;
  system: System;
  order: Order;
  fleet: Fleet;
  ashore: { figure: string; note: string; known: boolean };
  onClose: () => void;
  onConfirm: () => void;
}) {
  const walls = fortsOf(system).length;
  const odds = order === 'bombard' ? bombardOdds(state, fleet) : undefined;
  const rows: Array<[string, string]> =
    order === 'bombard'
      ? [
          ['Squadron', fleet.name],
          ['Hulls firing', `${fleet.ships.length}`],
          ['Guns', `${fleetGuns(fleet)}`],
          ['Rolls at most', `${odds!.rolls}`],
          [walls > 0 ? 'Walls standing at' : 'The garrison stands at', `${odds!.against}`],
          ['Things it could break', `${islandDefenders(system).length}`],
        ]
      : [
          ['Squadron', fleet.name],
          [`${terms.troops} landing`, `${fleet.troops}`],
          ['Ashore against them', ashore.known ? ashore.figure : 'Not counted'],
          ['Walls to storm', walls > 0 ? `${walls}` : 'None standing'],
          ['Kept aboard', 'None — a landing commits the hold'],
        ];

  return (
    <Sheet
      eyebrow={order === 'bombard' ? 'Bombardment' : 'Invasion'}
      title={system.name}
      subtitle={
        order === 'bombard'
          ? 'One action, however far it cascades.'
          : 'This cannot be called back once the boats are away.'
      }
      onClose={onClose}
      stacked
      top
      actions={
        <>
          <button className="btn btn--flex" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--flex btn--primary" onClick={onConfirm}>
            {order === 'bombard' ? 'Open fire' : 'Send them in'}
          </button>
        </>
      }
    >
      <div className="stack">
        {rows.map(([label, value]) => (
          <div className="row row--between command__row" key={label}>
            <span className="muted">{label}</span>
            <b>{value}</b>
          </div>
        ))}
      </div>
      {/* What it does to the island, which is the part a review is for. Both
          sentences are the rules as written, not a forecast: the dice are the
          sim's and this sheet does not pretend to know them. */}
      <p className="tiny command__note">
        {order === 'bombard' ? (
          odds!.hopeless ? (
            <>
              <b>Nothing here can be broken by this squadron.</b> The roll has to clear the
              island&rsquo;s whole total plus the cheapest thing standing on it, and this weight of
              shot cannot. Bring more guns or break the walls another way.
            </>
          ) : (
            <>
              <b>Shot goes at the walls while any stand.</b> Only when none do can it reach the
              garrison, and a roll that clears the island&rsquo;s total cascades as far as the
              margin carries. Who holds the island does not change.
            </>
          )
        ) : (
          <>
            <b>Every {terms.troop.toLowerCase()} aboard goes.</b> A landing has to beat the
            garrison and every wall still standing, and it decides who holds the island. Losses on
            both sides are the dice&rsquo;s.
          </>
        )}
      </p>
    </Sheet>
  );
}
