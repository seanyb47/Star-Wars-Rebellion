import terms from '../data/terms.json';
import type { GameState, IslandSummary, System } from '../sim';
import { CategoryIcon, IslandGlyph } from './art';
import { ControlBadge } from './components';

export type IslandTab = 'overview' | 'facilities' | 'military' | 'missions' | 'log';

const CATEGORIES: Array<{
  kind: 'missions' | 'military' | 'facilities';
  tab: IslandTab;
  label: string;
}> = [
  { kind: 'missions', tab: 'missions', label: 'Crew' },
  { kind: 'military', tab: 'military', label: 'Ashore' },
  { kind: 'facilities', tab: 'facilities', label: 'Built' },
];

/**
 * One island in a list, with the three counts that matter and a tap target
 * for each. Shared by the Reach panel and the Sea panel so the two cannot
 * drift apart.
 */
export function IslandRow({
  state,
  system,
  entry,
  onOpen,
}: {
  state: GameState;
  system: System;
  entry: IslandSummary;
  onOpen: (systemId: string, tab: IslandTab) => void;
}) {
  const you = state.player;
  const enemy = you === 'empire' ? 'alliance' : 'empire';
  const explored = system.explored[you];
  const counts: Record<string, number> = {
    missions: entry.missions,
    military: entry.military,
    facilities: entry.facilities,
  };

  return (
    <div className="isle">
      <button className="isle__head" onClick={() => onOpen(system.id, 'overview')}>
        <IslandGlyph
          seed={system.name}
          faction={explored ? system.control : 'none'}
          settled={system.populated}
          size={34}
        />
        <span className="isle__name">
          <span className="isle__title">{explored ? system.name : terms.uncharted}</span>
          {explored && system.populated && (
            <span className="isle__bar" aria-hidden="true">
              <span style={{ width: `${system.support[you]}%`, background: `var(--${you})` }} />
              <span
                style={{ width: `${system.support[enemy]}%`, background: `var(--${enemy})` }}
              />
            </span>
          )}
        </span>
        {explored ? (
          <ControlBadge faction={system.control} />
        ) : (
          <span className="badge badge--none">?</span>
        )}
      </button>

      <div className="isle__cats">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.kind}
            // Empty counts recede so the ones worth looking at stand out.
            className={`isle__cat${explored && counts[cat.kind] > 0 ? ' isle__cat--has' : ''}`}
            onClick={() => onOpen(system.id, cat.tab)}
            aria-label={`${system.name}: ${cat.label}`}
          >
            <CategoryIcon kind={cat.kind} size={20} />
            <span className="isle__count">{explored ? counts[cat.kind] : '–'}</span>
            {cat.kind === 'facilities' && entry.building > 0 && (
              <span className="isle__working" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
