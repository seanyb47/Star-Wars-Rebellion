import { Children, type ReactNode } from 'react';
import factionData from '../data/factions.json';
import { allegianceColour, allegianceSegments } from './allegiance';
import { usePrefs } from './prefs';
import { ROOM_TRACK, type Faction, type System } from '../sim';

export function Sheet(props: {
  title: string;
  /** A small mark drawn after the title — the island's worth, say. Kept
   *  separate from `title` so the accessible name stays plain text. */
  titleMark?: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  /** The footer is one full-width control, so drop the row padding and rule. */
  actionsFlush?: boolean;
  /** Optional tab strip, pinned under the header while the body scrolls. */
  tabs?: ReactNode;
  /**
   * A picture of the subject, between the header and the tabs.
   *
   * It used to be the first thing inside the first tab, which meant the
   * island you were looking at went off screen the moment you looked at its
   * garrison or its yards — four tabs about a place, with the place on one of
   * them. Up here it does not scroll away and it does not belong to a tab.
   */
  banner?: ReactNode;
  /** Raise this sheet above one already open, rather than behind it. */
  stacked?: boolean;
  /** A sideways drag across the body, where the sheet has tabs to move along. */
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
}) {
  return (
    <>
      <div
        className={`scrim${props.stacked ? ' scrim--stacked' : ''}`}
        onClick={props.onClose}
      />
      <div
        className={`sheet${props.stacked ? ' sheet--stacked' : ''}`}
        role="dialog"
        aria-label={props.title}
      >
        <div className="sheet__grip" />
        <div className="sheet__head">
          <div className="row row--between">
            <div className="sheet__title">
              {props.title}
              {props.titleMark}
            </div>
            <button className="iconbtn" onClick={props.onClose} aria-label="Close">
              ✕
            </button>
          </div>
          {props.subtitle && <div className="sheet__sub">{props.subtitle}</div>}
        </div>
        {props.banner}
        {props.tabs}
        <div
          className="sheet__body"
          onTouchStart={props.onTouchStart}
          onTouchEnd={props.onTouchEnd}
        >
          {props.children}
        </div>
        {props.actions && (
          <div className={`sheet__actions${props.actionsFlush ? ' sheet__actions--flush' : ''}`}>
            {props.actions}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * The two checkboxes over any list of things the player owns: fold alike ones
 * into a count, and show the arrows that put them in order.
 *
 * One control, used by the harbor, the garrison, the crew and the buildings,
 * because they are one preference — somebody who wants their hulls grouped
 * wants their companies grouped too, and having to say so four times would be
 * four places to forget.
 */
export function ListOpts() {
  const [prefs, setPrefs] = usePrefs();
  return (
    <div className="listopts tiny">
      <button
        className={`listopt${prefs.group ? ' listopt--on' : ''}`}
        onClick={() => setPrefs({ group: !prefs.group })}
        aria-pressed={prefs.group}
      >
        {prefs.group ? '☑' : '☐'} Group alike
      </button>
      <button
        className={`listopt${prefs.reorder ? ' listopt--on' : ''}`}
        onClick={() => setPrefs({ reorder: !prefs.reorder })}
        aria-pressed={prefs.reorder}
      >
        {prefs.reorder ? '☑' : '☐'} Reorder
      </button>
    </div>
  );
}

export function factionLabel(faction: Faction): string {
  if (faction === 'none') return 'Unclaimed';
  return factionData[faction].shortName;
}

export function ControlBadge({ faction }: { faction: Faction }) {
  return <span className={`badge badge--${faction}`}>{factionLabel(faction)}</span>;
}

/**
 * The island's allegiance as one bar: whoever holds it first from the left,
 * the other side next. The two always add up to a hundred, so there is no
 * undecided remainder to draw. The
 * figures underneath name the shares so the bar never has to be guessed at.
 */
export function SupportBars({ system }: { system: System }) {
  const segments = allegianceSegments(system);
  return (
    <div>
      <div className="bar bar--tall">
        {segments.map((segment) => (
          <div
            key={segment.faction}
            style={{ width: `${segment.pct}%`, background: allegianceColour(segment.faction) }}
          />
        ))}
      </div>
      <div className="bar-key">
        {segments
          .filter((segment) => segment.faction !== 'neutral')
          .map((segment) => (
            <span key={segment.faction}>
              <i style={{ background: allegianceColour(segment.faction) }} />
              {factionData[segment.faction as 'empire' | 'alliance'].shortName}{' '}
              {Math.round(segment.pct)}
            </span>
          ))}
      </div>
    </div>
  );
}

/**
 * A panel that is there whether or not anything is in it, and fills with
 * icons as things arrive — after the original's personnel and regiment
 * windows, which are a framed board with slots rather than a list that
 * collapses to nothing.
 *
 * `ghosts` draws empty slots after the filled ones. Use it only where an empty
 * slot means something real: a building slot the island has and you have not
 * used, or a company the island needs and does not have. Where there is no cap
 * — crew — leave it at zero and let the board simply be the size it is.
 */
export function SlotBoard({
  children,
  ghosts = 0,
  empty,
}: {
  children?: ReactNode;
  ghosts?: number;
  /** Shown in the middle of the board when there is nothing in it at all. */
  empty?: ReactNode;
}) {
  const filled = Children.count(children);
  if (filled === 0 && ghosts === 0) {
    return <div className="board board--bare">{empty}</div>;
  }
  // Three rows fit; past that the board scrolls, so say the total rather than
  // leaving the player to guess how far it goes.
  const total = filled + ghosts;
  return (
    <>
      <div className="board">
        {children}
        {Array.from({ length: ghosts }, (_, i) => (
          <span key={`ghost-${i}`} className="slot slot--empty" aria-hidden="true" />
        ))}
      </div>
      {total > 9 && (
        <p className="tiny muted board__count">
          {total} in all — scroll the board for the rest
        </p>
      )}
    </>
  );
}

/** One thing on the board: a picture, a name, and optionally a line under it. */
export function Slot({
  icon,
  name,
  note,
  tone,
  onClick,
  label,
  order,
}: {
  icon: ReactNode;
  name: string;
  note?: string;
  /** 'warn' for something that needs attention, 'dim' for something idle. */
  tone?: 'warn' | 'dim';
  onClick?: () => void;
  label?: string;
  /** Present only in reorder mode. An end with nowhere to go is absent. */
  order?: { up?: () => void; down?: () => void };
}) {
  const className = `slot${tone ? ` slot--${tone}` : ''}${onClick ? ' slot--tap' : ''}`;
  const body = (
    <>
      <span className="slot__icon">{icon}</span>
      <span className="slot__name">{name}</span>
      {note && <span className="slot__note">{note}</span>}
    </>
  );
  const tile = onClick ? (
    <button className={className} onClick={onClick} aria-label={label ?? name}>
      {body}
    </button>
  ) : (
    <span className={className}>{body}</span>
  );
  if (!order) return tile;
  // On a board the arrows go under the tile rather than beside it: a tile is
  // about as wide as two arrows and the board is a grid, so putting them
  // alongside would halve the tile.
  return (
    <span className="slot-wrap">
      {tile}
      <span className="slot-wrap__order">
        <button className="orderbtn" disabled={!order.up} onClick={order.up} aria-label={`Move ${name} earlier`}>
          ◀
        </button>
        <button className="orderbtn" disabled={!order.down} onClick={order.down} aria-label={`Move ${name} later`}>
          ▶
        </button>
      </span>
    </span>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="tiny muted">{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}

/**
 * How much room an island has, and how much of it is spent — drawn against
 * one track the same length everywhere, so the bar is a quantity rather than
 * a ratio. Twelve berths fills the track; six reaches halfway; three stops a
 * quarter along. White for a berth with something on it, grey for open
 * ground, and nothing at all past the end of what the island has: an island
 * with no room left and an island with no room to begin with do not look
 * alike. The berths the island has never been given are simply not drawn.
 */
export function RoomBar({
  system,
  className,
}: {
  system: System;
  /** Somewhere to hang a size: the list row's bar is a fifth the width. */
  className?: string;
}) {
  const slots = Math.min(system.slots, ROOM_TRACK);
  const built = Math.min(system.facilities.length, slots);
  const label = `${built} of ${slots} berths built`;
  return (
    <span
      className={`roombar${className ? ` ${className}` : ''}`}
      style={{ gridTemplateColumns: `repeat(${ROOM_TRACK}, 1fr)` }}
      aria-label={label}
      title={label}
    >
      {Array.from({ length: slots }, (_, i) => (
        <span key={i} className={i < built ? 'is-built' : ''} />
      ))}
    </span>
  );
}
