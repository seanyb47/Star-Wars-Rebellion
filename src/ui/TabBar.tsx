import { useEffect, useRef } from 'react';
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
/**
 * `tour` is the name the tutorial points at, written out rather than derived
 * from the slot id: two of the four differ from it, and a tour step whose
 * target does not exist is skipped *silently*, so a name that drifts here
 * would take a step out of the tutorial and say nothing about it.
 */
const SLOTS: Array<{ id: Slot; label: string; tour: string }> = [
  { id: 'galaxy', label: terms.tabs.map, tour: 'map-tab' },
  { id: 'build', label: terms.tabs.build, tour: 'build' },
  // Sean, 16 September: *"Move encyclopedia to bottom utility bar left of
  // log."* It was an icon in the top rail, where it sat between the clock and
  // the volume and read as a setting rather than as somewhere to go.
  { id: 'almanac', label: 'Book', tour: 'book' },
  { id: 'feed', label: terms.tabs.feed, tour: 'log' },
];

export function TabBar({
  tab,
  onChange,
  unread,
  player,
  onAskAdvisor,
  onOpenAlmanac,
  bookOpen = false,
  mood = 'neutral',
  talking = false,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
  unread: number;
  player: 'empire' | 'alliance';
  onAskAdvisor: () => void;
  onOpenAlmanac: () => void;
  /**
   * Whether the Book is the thing on screen.
   *
   * The Book is the one slot that opens a sheet rather than changing `tab`,
   * so it was comparing `tab` against a value the app never sets and never
   * lit up — the only tab in the bar that did not tell you where you were.
   * Build does it correctly and this now matches it.
   */
  bookOpen?: boolean;
  /** The advisor's face and whether they are mid-sentence (see useAdvisorVoice). */
  mood?: NarratorMood;
  talking?: boolean;
}) {
  /*
   * The bar's real height, published for the sheets to sit on top of.
   *
   * A sheet is `bottom: 0` inside the fixed app shell, which put it *under*
   * this bar — so a sheet's own buttons could be hidden behind the tabs, and
   * the bar itself vanished the moment anything opened. Neither is what the
   * screen is meant to look like: the bar is the console and stays put.
   *
   * Measured rather than written down because the height is the icons plus
   * whatever the phone's home indicator claims, which is a number only the
   * device knows.
   */
  const bar = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const publish = () =>
      document.documentElement.style.setProperty('--tabbar-h', `${el.offsetHeight}px`);
    publish();
    const watch = new ResizeObserver(publish);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  return (
    <nav className="tabbar" data-tour="tabbar" ref={bar}>
      {SLOTS.map((entry) => {
        const active = entry.id === 'almanac' ? bookOpen : tab === entry.id;
        return (
        <button
          key={entry.id}
          data-tour={entry.tour}
          className={`tab${active ? ' tab--active' : ''}`}
          onClick={() =>
            entry.id === 'almanac' ? onOpenAlmanac() : onChange(entry.id as Tab)
          }
          aria-current={active ? 'page' : undefined}
        >
          <span className="tab__icon">
            <TabIcon id={entry.id} />
          </span>
          <span>{entry.label}</span>
          {entry.id === 'feed' && unread > 0 && (
            <span className="tab__badge">{unread > 99 ? '99+' : unread}</span>
          )}
        </button>
        );
      })}
      {/*
        Rebellion's droid stands on the console at the foot of the frame, on
        every screen, never summoned. The tab bar is our console, so the
        advisor stands on it.
      */}
      <button
        data-tour="advisor"
        className="advisor"
        onClick={onAskAdvisor}
        aria-label={`Ask ${NARRATOR[player].name}`}
      >
        <NarratorFigure faction={player} size={62} mood={mood} talking={talking} />
      </button>
    </nav>
  );
}
