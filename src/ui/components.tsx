import type { ReactNode } from 'react';
import factionData from '../data/factions.json';
import terms from '../data/terms.json';
import type { Faction, System } from '../sim';

export function Sheet(props: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <>
      <div className="scrim" onClick={props.onClose} />
      <div className="sheet" role="dialog" aria-label={props.title}>
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

export function SupportBars({ system }: { system: System }) {
  return (
    <div className="stack">
      {(['empire', 'alliance'] as const).map((faction) => (
        <div key={faction}>
          <div className="bar-label">
            <span>
              {factionData[faction].shortName} {terms.allegiance.toLowerCase()}
            </span>
            <span>{Math.round(system.support[faction])}</span>
          </div>
          <div className="bar">
            <div
              className="bar__fill"
              style={{
                width: `${system.support[faction]}%`,
                background: `var(--${faction})`,
              }}
            />
          </div>
        </div>
      ))}
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
