import { Children, type ReactNode } from 'react';
import factionData from '../data/factions.json';
import { allegianceColour, allegianceSegments } from './allegiance';
import type { Faction, System } from '../sim';

export function Sheet(props: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  /** Optional tab strip, pinned under the header while the body scrolls. */
  tabs?: ReactNode;
  /** Raise this sheet above one already open, rather than behind it. */
  stacked?: boolean;
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
            <div className="sheet__title">{props.title}</div>
            <button className="iconbtn" onClick={props.onClose} aria-label="Close">
              ✕
            </button>
          </div>
          {props.subtitle && <div className="sheet__sub">{props.subtitle}</div>}
        </div>
        {props.tabs}
        <div className="sheet__body">{props.children}</div>
        {props.actions && <div className="sheet__actions">{props.actions}</div>}
      </div>
    </>
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
 * the other side next, and the undecided remainder in neutral blue. The
 * figures underneath name the shares so the bar never has to be guessed at.
 */
export function SupportBars({ system }: { system: System }) {
  const segments = allegianceSegments(system);
  const undecided = Math.max(0, 100 - system.support.empire - system.support.alliance);
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
        {undecided > 0 && (
          <span>
            <i style={{ background: allegianceColour('neutral') }} />
            Undecided {Math.round(undecided)}
          </span>
        )}
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
}: {
  icon: ReactNode;
  name: string;
  note?: string;
  /** 'warn' for something that needs attention, 'dim' for something idle. */
  tone?: 'warn' | 'dim';
  onClick?: () => void;
  label?: string;
}) {
  const className = `slot${tone ? ` slot--${tone}` : ''}${onClick ? ' slot--tap' : ''}`;
  const body = (
    <>
      <span className="slot__icon">{icon}</span>
      <span className="slot__name">{name}</span>
      {note && <span className="slot__note">{note}</span>}
    </>
  );
  return onClick ? (
    <button className={className} onClick={onClick} aria-label={label ?? name}>
      {body}
    </button>
  ) : (
    <span className={className}>{body}</span>
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
