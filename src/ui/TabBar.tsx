import terms from '../data/terms.json';

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
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
  unread: number;
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
    </nav>
  );
}
