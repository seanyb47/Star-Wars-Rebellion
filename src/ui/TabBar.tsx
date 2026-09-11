import terms from '../data/terms.json';
import { NarratorFigure } from './art';
import { NARRATOR } from './Narrator';

export type Tab = 'galaxy' | 'characters' | 'feed';

const TABS: Array<{ id: Tab; glyph: string; label: string }> = [
  { id: 'galaxy', glyph: '⚓', label: terms.tabs.map },
  { id: 'characters', glyph: '☰', label: terms.tabs.characters },
  { id: 'feed', glyph: '❢', label: terms.tabs.feed },
];

export function TabBar({
  tab,
  onChange,
  unread,
  player,
  onAskAdvisor,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
  unread: number;
  player: 'empire' | 'alliance';
  onAskAdvisor: () => void;
}) {
  return (
    <nav className="tabbar">
      {TABS.map((entry) => (
        <button
          key={entry.id}
          className={`tab${tab === entry.id ? ' tab--active' : ''}`}
          onClick={() => onChange(entry.id)}
        >
          <span className="tab__glyph">{entry.glyph}</span>
          <span>{entry.label}</span>
          {entry.id === 'feed' && unread > 0 && (
            <span className="tab__badge">{unread > 99 ? '99+' : unread}</span>
          )}
        </button>
      ))}
      {/*
        Rebellion's droid stands on the console at the foot of the frame, on
        every screen, never summoned. The tab bar is our console, so the
        advisor stands on it. Floating him over the screen instead was tried
        and thrown away: on the crew list he covered the rating numbers, and
        on a phone there is no spare corner for a figure to occupy.
      */}
      <button
        className="advisor"
        onClick={onAskAdvisor}
        aria-label={`Ask ${NARRATOR[player].name}`}
      >
        <NarratorFigure faction={player} size={62} />
      </button>
    </nav>
  );
}
