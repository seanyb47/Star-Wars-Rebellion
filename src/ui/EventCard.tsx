import { useEffect, useState } from 'react';
import factionData from '../data/factions.json';
import type { EventKind, GameEvent, GameState } from '../sim';
import { CompanyIcon, FactionCrest, ShipIcon } from './art';
import { EventScene } from './EventScene';
import { OutcomeReport } from './OutcomeReport';

/**
 * One thing that happened, told rather than logged.
 *
 * The original stops you with a headline, a painting and one plain sentence,
 * with arrows to page through the rest of the day. This is that. The log is
 * still there and still the place to look something up; this is the place the
 * war actually happens to you.
 */

/** Kinds worth stopping the player for. The rest belong in the log only. */
const NOTABLE: EventKind[] = ['war', 'flip', 'mutiny', 'battle'];

export function isNotable(event: GameEvent): boolean {
  // An event may ask for a card that its kind would not get — see `notable`.
  // Somebody being carried off is a `loss`, and so is a mine running dry.
  if (event.notable && !event.quiet) return true;
  // `quiet` is set on the rounds of an action the player is fighting by hand.
  // The battle sheet is already telling them; a card over the top of it would
  // be the same news twice.
  return !event.quiet && NOTABLE.includes(event.kind);
}

/**
 * A headline, in the original's register: a few words in capitals that say
 * what happened before the sentence explains it.
 *
 * Derived from the event rather than stored on it, so nothing in the
 * simulation has to know a card exists.
 */
function headline(state: GameState, event: GameEvent): string {
  const island = state.systems.find((s) => s.id === event.systemId);
  const where = island?.name ?? 'The Seven Seas';
  switch (event.kind) {
    case 'war':
      // 'war' covers both ends of it. Without a winner nobody has lost yet —
      // this is the declaration, and calling that "The War Is Lost" on the
      // opening card is about as wrong as a headline can be.
      if (!state.winner) return 'The War Begins';
      return state.winner === state.player ? 'The War Is Won' : 'The War Is Lost';
    case 'flip':
      return /settled/.test(event.text) ? `${where} Is Settled` : `${where} Changes Hands`;
    case 'mutiny':
      return /quiet|order|returns/i.test(event.text)
        ? `${where} Is Quiet Again`
        : `${where} Rises`;
    case 'battle':
      return /thrown back/i.test(event.text) ? `Repulsed at ${where}` : `Action off ${where}`;
    case 'loss':
      return `A Loss at ${where}`;
    case 'order':
      return `Finished on ${where}`;
    case 'mission':
      if (/report|carried|persuad|won over/i.test(event.text)) return `Word from ${where}`;
      if (/sail|under way|set out|weighs/i.test(event.text)) return `Under Way for ${where}`;
      return `A Parley on ${where}`;
    default:
      return where;
  }
}

/**
 * Whose news it is, which decides the colour behind the picture. Read from the
 * island the event happened on, so an island of yours changing hands glows in
 * the colour of whoever took it.
 */
function tintFor(state: GameState, event: GameEvent): string {
  const island = state.systems.find((s) => s.id === event.systemId);
  if (event.kind === 'war') return `var(--${state.winner ?? state.player})`;
  if (event.kind === 'mutiny') return 'var(--bad)';
  if (!island || island.control === 'neutral' || island.control === 'none') {
    return 'var(--neutral)';
  }
  return `var(--${island.control})`;
}

export function EventCards({
  state,
  events,
  onClose,
  onOpenIsland,
  onShow,
}: {
  state: GameState;
  events: GameEvent[];
  onClose: () => void;
  onOpenIsland?: (systemId: string) => void;
  /** Fired when the card on top changes — the advisor reads it out. */
  onShow?: (event: GameEvent) => void;
}) {
  const [index, setIndex] = useState(0);
  // A new batch always starts at the front.
  useEffect(() => setIndex(0), [events]);

  const at = Math.min(index, Math.max(0, events.length - 1));
  const event = events[at] as GameEvent | undefined;
  useEffect(() => {
    if (event) onShow?.(event);
    // Only when a different card comes up, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  if (!event) return null;
  const island = state.systems.find((s) => s.id === event.systemId);

  return (
    <>
      <div className="scrim scrim--stacked" onClick={onClose} />
      <div className="dispatch" role="dialog" aria-label={headline(state, event)}>
        <div className="dispatch__head">
          <span className="dispatch__title">{headline(state, event)}</span>
          <button className="iconbtn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/*
          An operation that resolved carries its own screen, and that screen
          brings its own illustration and its own opening line — so the card's
          generic scene and its one-line text would be a second, blander
          version of both stacked on top of it. A bombardment or an assault
          therefore *is* the report; everything else is a dispatch with a
          tally under it, as it always was.
        */}
        {event.report ? (
          <OutcomeReport report={event.report} />
        ) : (
          <>
            <EventScene
              kind={event.kind}
              tint={tintFor(state, event)}
              seed={event.id}
              height={138}
            />

            <p className="dispatch__text serif">{event.text}</p>

            {event.battle && <BattleTally report={event.battle} />}
            {event.landing && <LandingTally report={event.landing} />}
          </>
        )}

        <div className="dispatch__foot">
          <span className="tiny muted">
            Day {event.day}
            {events.length > 1 ? ` · ${at + 1} of ${events.length}` : ''}
          </span>
          <span className="row" style={{ gap: 6 }}>
            {/*
              Sean, 23 September: *"go there and carry on are not obvious
              terms. Continue and Skip are better."*

              So: **Continue** is the primary — you have read it, get on with
              the war — and **Skip** gets past the rest of the stack without
              paging through them, which there was no way to do at all: the
              dismiss only appeared on the last card, so four dispatches meant
              four taps whether or not you wanted them.

              The third button is the one that goes somewhere, and it says
              where. "Go there" is a direction with no destination in it; the
              island's own name is both the label and the answer to what the
              button does.
            */}
            {island && onOpenIsland && (
              <button className="btn" onClick={() => onOpenIsland(island.id)}>
                {island.name} ›
              </button>
            )}
            {/* Only back. Forward is Continue now, and two controls for one
                direction is how a foot of buttons gets to five. */}
            {events.length > 1 && at > 0 && (
              <button className="btn" onClick={() => setIndex(at - 1)} aria-label="Previous dispatch">
                ↑
              </button>
            )}
            {at < events.length - 1 && (
              <button className="btn" onClick={onClose}>
                Skip
              </button>
            )}
            <button className="btn btn--primary" onClick={() => (at === events.length - 1 ? onClose() : setIndex(at + 1))}>
              Continue
            </button>
          </span>
        </div>
      </div>
    </>
  );
}

/**
 * Rebellion's battle summary: each side's crest, what it brought, and what it
 * lost. Laid out rather than told, so the sentence above can stay a sentence.
 *
 * The harbor's guns used to have a line of their own here. They no longer fire
 * in an action at sea, so there is nothing to report.
 */
function BattleTally({ report }: { report: NonNullable<GameEvent['battle']> }) {
  // A side is drawn when it was in the fight. A faction that never sailed is
  // left off rather than given an empty crest: against a creature alone that
  // read as an enemy fleet standing off untouched, which is Sean's playtest
  // note about the Sea Dragon.
  const present = (['empire', 'alliance'] as const).filter(
    (side) => report.sides[side].hulls > 0 || report.sides[side].lost > 0,
  );
  return (
    <div className="tally">
      {present.map((side) => {
        const s = report.sides[side];
        return (
          <div key={side} className={`tally__side tally__side--${side}`}>
            <FactionCrest faction={side} size={34} />
            <div className="tally__body">
              <div className="tally__name">{factionData[side].shortName}</div>
              <div className="tally__row">
                <ShipIcon role="medium" size={16} />
                <span>
                  <b>{s.hulls}</b> {s.hulls === 1 ? 'hull' : 'hulls'} · <b>{s.guns}</b> guns
                </span>
              </div>
              <div className={`tally__row${s.lost > 0 ? ' tally__row--loss' : ''}`}>
                {s.lost > 0 ? (
                  <span>
                    <b>{s.lost}</b> {s.lost === 1 ? 'hull' : 'hulls'} lost
                  </span>
                ) : (
                  <span className="muted">No hulls lost</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {report.beast && (
        <div className="tally__side tally__side--beast">
          <div className="tally__body">
            <div className="tally__name">{report.beast.name}</div>
            <div className="tally__row">
              <span>
                <b>{report.beast.guns}</b> guns · nobody's
              </span>
            </div>
            <div className="tally__row">
              <span className="muted">
                {report.beast.damage > 0
                  ? `${report.beast.damage} of ${report.beast.hull} in it`
                  : 'Not a mark on it yet'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LandingTally({ report }: { report: NonNullable<GameEvent['landing']> }) {
  const attacker = report.attacker;
  const defender = attacker === 'empire' ? 'alliance' : 'empire';
  return (
    <div className="tally">
      <div className={`tally__side tally__side--${attacker}`}>
        <FactionCrest faction={attacker} size={34} />
        <div className="tally__body">
          <div className="tally__name">{factionData[attacker].shortName} · landing</div>
          <div className="tally__row">
            <CompanyIcon size={16} />
            <span>
              <b>{report.landed}</b> {report.landed === 1 ? 'troop' : 'troops'} ashore
            </span>
          </div>
          <div className={`tally__row${report.lost > 0 ? ' tally__row--loss' : ''}`}>
            <span>
              <b>{report.lost}</b> lost
            </span>
          </div>
        </div>
      </div>
      <div className={`tally__side tally__side--${defender}`}>
        <FactionCrest faction={defender} size={34} />
        <div className="tally__body">
          <div className="tally__name">Holding the island</div>
          <div className="tally__row">
            <CompanyIcon size={16} />
            <span>
              <b>{report.defenders}</b> {report.defenders === 1 ? 'troop' : 'troops'}
            </span>
          </div>
          <div className={`tally__row${report.defendersLost > 0 ? ' tally__row--loss' : ''}`}>
            <span>
              <b>{report.defendersLost}</b> lost
            </span>
          </div>
        </div>
      </div>
      <div className="tally__foot tiny muted">
        {report.taken ? 'The island is carried.' : 'The landing is thrown back.'}
      </div>
    </div>
  );
}
