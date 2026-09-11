import type { ReactNode } from 'react';
import factionData from '../data/factions.json';
import { allegianceColour, allegianceSegments, segmentsFor } from './allegiance';
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
 * The same bar for an average across many islands — a chain, or a whole Sea.
 * The holder is whoever owns the most of it, and may be nobody.
 */
export function AverageAllegianceBar({
  empire,
  alliance,
  holder,
  note,
}: {
  empire: number;
  alliance: number;
  holder: 'empire' | 'alliance' | null;
  note?: ReactNode;
}) {
  const segments = segmentsFor(empire, alliance, holder);
  const undecided = Math.max(0, 100 - empire - alliance);
  return (
    <div className="card">
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
      {note && (
        <p className="tiny muted" style={{ margin: '6px 0 0' }}>
          {note}
        </p>
      )}
    </div>
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
