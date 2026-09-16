import terms from '../data/terms.json';
import { NarratorFigure } from './art';
import { NARRATOR } from './Narrator';
import type { NarratorMood } from './narrator/mood';

export type Tab = 'galaxy' | 'characters' | 'build' | 'feed';

/**
 * The console's four buttons. Drawn, not typed: the old glyphs were whatever
 * the phone's font made of an anchor and a bullet, and they sat at different
 * weights and baselines. These are one stroke, one size, one baseline.
 */
function TabIcon({ id }: { id: Tab }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (id) {
    case 'galaxy':
      // A compass rose: the chart.
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 4.5l2.2 5.3L19.5 12l-5.3 2.2L12 19.5l-2.2-5.3L4.5 12l5.3-2.2Z" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
        </svg>
      );
    case 'characters':
      // Two figures: the crew.
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <circle cx="17" cy="9" r="2.4" />
          <path d="M15.5 14.5a4.5 4.5 0 0 1 5 4.5" />
        </svg>
      );
    case 'build':
      // A hammer over an anvil block.
      return (
        <svg {...common}>
          <path d="M14 4l6 6-2 2-6-6 2-2Z" />
          <path d="M12 8l-7 7" />
          <path d="M4 19h10" />
          <path d="M6 16h6v3H6z" />
        </svg>
      );
    case 'feed':
      // A dispatch: a sheet with lines and a seal.
      return (
        <svg {...common}>
          <path d="M6 3h9l4 4v14H6z" />
          <path d="M15 3v4h4" />
          <path d="M9 12h7M9 15.5h7" />
          <circle cx="9.5" cy="9" r="0.9" fill="currentColor" />
        </svg>
      );
  }
}

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'galaxy', label: terms.tabs.map },
  { id: 'characters', label: terms.tabs.characters },
  { id: 'build', label: terms.tabs.build },
  { id: 'feed', label: terms.tabs.feed },
];

export function TabBar({
  tab,
  onChange,
  unread,
  player,
  onAskAdvisor,
  mood = 'neutral',
  talking = false,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
  unread: number;
  player: 'empire' | 'alliance';
  onAskAdvisor: () => void;
  /** The advisor's face and whether they are mid-sentence (see useAdvisorVoice). */
  mood?: NarratorMood;
  talking?: boolean;
}) {
  return (
    <nav className="tabbar">
      {TABS.map((entry) => (
        <button
          key={entry.id}
          className={`tab${tab === entry.id ? ' tab--active' : ''}`}
          onClick={() => onChange(entry.id)}
          aria-current={tab === entry.id ? 'page' : undefined}
        >
          <span className="tab__icon">
            <TabIcon id={entry.id} />
          </span>
          <span>{entry.label}</span>
          {entry.id === 'feed' && unread > 0 && (
            <span className="tab__badge">{unread > 99 ? '99+' : unread}</span>
          )}
        </button>
      ))}
      {/*
        Rebellion's droid stands on the console at the foot of the frame, on
        every screen, never summoned. The tab bar is our console, so the
        advisor stands on it.
      */}
      <button
        className="advisor"
        onClick={onAskAdvisor}
        aria-label={`Ask ${NARRATOR[player].name}`}
      >
        <NarratorFigure faction={player} size={62} mood={mood} talking={talking} />
      </button>
    </nav>
  );
}
