import terms from '../data/terms.json';
import type { GameState, IslandSummary, System } from '../sim';
import { CategoryIcon, IslandGlyph } from './art';
import { ControlBadge } from './components';

export type IslandTab = 'harbour' | 'crew' | 'garrison' | 'buildings' | 'log';

const CATEGORIES: Array<{ kind: 'missions' | 'military' | 'facilities'; label: string }> = [
  { kind: 'missions', label: 'Crew' },
  { kind: 'military', label: 'Ashore' },
  { kind: 'facilities', label: 'Built' },
];

/**
 * One island in a list, with the three counts that matter.
 *
 * The counts are indicators, not buttons: the whole row is a single tap that
 * opens the island, and everything you might have wanted to reach through a
 * count is a tab inside it. Three small targets stacked in one row was three
 * ways to miss.
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
  onOpen: (systemId: string) => void;
}) {
  const you = state.player;
  const enemy = you === 'empire' ? 'alliance' : 'empire';
  const explored = system.explored[you];
  const slots = system.rawSlots + system.energySlots;
  const counts: Record<string, number> = {
    missions: entry.missions,
    military: entry.military,
    facilities: entry.facilities,
  };

  return (
    <button className="isle" onClick={() => onOpen(system.id)}>
      <span className="isle__head">
        <IslandGlyph
          seed={system.name}
          faction={explored ? system.control : 'none'}
          settled={system.populated}
          size={34}
        />
        <span className="isle__name">
          <span className="isle__title">{explored ? system.name : terms.uncharted}</span>
          {explored && system.populated && (
            <>
              <span className="isle__bar" aria-hidden="true">
                <span style={{ width: `${system.support[you]}%`, background: `var(--${you})` }} />
                <span
                  style={{ width: `${system.support[enemy]}%`, background: `var(--${enemy})` }}
                />
              </span>
              {/*
                Capacity, under allegiance — the two things the original prints
                beneath every planet. These sat on the chart until the chart
                stopped zooming; at chart scale an island is four pixels across
                and a row of pips under it was a smear, so they live here now,
                where the island is a row you can read.
              */}
              {slots > 0 && (
                <span
                  className="isle__slots"
                  aria-label={`${system.facilities.length} of ${slots} built`}
                >
                  {Array.from({ length: slots }, (_, i) => (
                    <span key={i} className={i < system.facilities.length ? 'is-built' : ''} />
                  ))}
                </span>
              )}
            </>
          )}
        </span>
        {explored ? (
          <ControlBadge faction={system.control} />
        ) : (
          <span className="badge badge--none">?</span>
        )}
      </span>

      <span className="isle__cats">
        {CATEGORIES.map((cat) => (
          <span
            key={cat.kind}
            // Empty counts recede so the ones worth looking at stand out.
            className={`isle__cat${explored && counts[cat.kind] > 0 ? ' isle__cat--has' : ''}`}
          >
            <CategoryIcon kind={cat.kind} size={20} />
            <span className="isle__count">{explored ? counts[cat.kind] : '–'}</span>
            {/* Spelled out. A crossed cutlass and pike at 20px is just an X,
                and an icon that has to be explained is not doing its job. */}
            <span className="isle__cat-label">{cat.label}</span>
            {cat.kind === 'facilities' && entry.building > 0 && (
              <span className="isle__working" aria-hidden="true" />
            )}
          </span>
        ))}
      </span>
    </button>
  );
}
