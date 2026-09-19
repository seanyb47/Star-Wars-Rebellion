import terms from '../data/terms.json';
import { NarratorFigure } from './art';
import { NARRATOR } from './Narrator';
import type { NarratorMood } from './narrator/mood';

export type Tab = 'galaxy' | 'build' | 'feed';

/**
 * What the console can carry. The encyclopedia is not a screen — it opens a
 * sheet over whatever you were looking at — but Sean asked for it down here
 * beside the rest rather than up in the top bar, and on the bar it has to look
 * like everything else on the bar.
 */
type Slot = Tab | 'almanac';

/**
 * The console's buttons. Drawn, not typed: the old glyphs were whatever the
 * phone's font made of an anchor and a bullet, and they sat at different
 * weights and baselines. These are one stroke, one size, one baseline.
 */
function TabIcon({ id }: { id: Slot }) {
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
    case 'almanac':
      // An open book, which is what it was in the top bar.
      return (
        <svg {...common}>
          <path d="M12 6.5C10.5 5 8.4 4.4 5 4.5v13c3.4-.1 5.5.5 7 2 1.5-1.5 3.6-2.1 7-2v-13c-3.4-.1-5.5.5-7 2Z" />
          <path d="M12 6.5v12" />
        </svg>
      );
  }
}

/*
 * Four, since Sean cut the fifth on 19 September: *"Cut the crew tab from the
 * bottom utility bar. Now that I think about it 'Idle Crew' is already best
 * way to view crew anyway."* The roster screen it opened was a list of your
 * people with their faces on it, and everything it was for is reachable
 * closer to the work — the Idle crew filter lights the islands with somebody
 * standing about on them, an island's own Crew tab says who is there, the
 * advisor answers "who is free" with a tappable list, and the encyclopedia
 * holds the whole cast A-Z.
 */
const SLOTS: Array<{ id: Slot; label: string }> = [
  { id: 'galaxy', label: terms.tabs.map },
  { id: 'build', label: terms.tabs.build },
  // Sean, 16 September: *"Move encyclopedia to bottom utility bar left of
  // log."* It was an icon in the top rail, where it sat between the clock and
  // the volume and read as a setting rather than as somewhere to go.
  { id: 'almanac', label: 'Book' },
  { id: 'feed', label: terms.tabs.feed },
];

export function TabBar({
  tab,
  onChange,
  unread,
  player,
  onAskAdvisor,
  onOpenAlmanac,
  mood = 'neutral',
  talking = false,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
  unread: number;
  player: 'empire' | 'alliance';
  onAskAdvisor: () => void;
  onOpenAlmanac: () => void;
  /** The advisor's face and whether they are mid-sentence (see useAdvisorVoice). */
  mood?: NarratorMood;
  talking?: boolean;
}) {
  return (
    <nav className="tabbar">
      {SLOTS.map((entry) => (
        <button
          key={entry.id}
          className={`tab${tab === entry.id ? ' tab--active' : ''}`}
          onClick={() =>
            entry.id === 'almanac' ? onOpenAlmanac() : onChange(entry.id as Tab)
          }
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
