import terms from '../data/terms.json';
import type { ChartLayer, GameState, IslandSummary, System } from '../sim';
import { allegianceColour, allegianceSegments } from './allegiance';
import { CategoryIcon } from './art';
import { ChartMark } from './ChartMark';
import { WorthMark } from './worth';
import { ControlBadge, RoomBar } from './components';

export type IslandTab = 'harbor' | 'crew' | 'garrison' | 'buildings' | 'lore';

/**
 * The tab an island should open on, given what the chart is filtering by.
 *
 * A filter is a question — where are my yards standing idle? — and tapping a
 * lit island is asking to see the answer. Opening on the Harbor meant one
 * more tap to get to the tab the question was about, every time. So the
 * filter picks the tab, and from there the tabs swipe as they always did:
 * the filter chooses where you land, not where you stay.
 */
export function tabForLayer(layer: ChartLayer | undefined): IslandTab {
  switch (layer) {
    case 'idleYards':
    case 'idleDrills':
    case 'idleSlips':
    case 'room':
    case 'worth':
      return 'buildings';
    case 'idleCrew':
    case 'missions':
      return 'crew';
    case 'garrisons':
      return 'garrison';
    // Fleets and the bare chart belong to the Harbor, where the ships are.
    // Loyalty lands there too: it is the island's first face, and the tab it
    // actually lives on is Garrison, one swipe away.
    default:
      return 'harbor';
  }
}

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
  const explored = system.explored[you];
  const slots = system.slots;
  /**
   * The three counts, where this side has them.
   *
   * Companies and works are undefined on an island held against you that
   * nobody of yours has looked at — the row draws a dash, the same dash an
   * uncharted island draws, because "we cannot see" is one answer and not two.
   * Your own errands are always countable: they are yours.
   */
  const counts: Record<string, number | undefined> = {
    missions: entry.missions,
    military: entry.military,
    facilities: entry.facilities,
  };

  return (
    <button className="isle" onClick={() => onOpen(system.id)}>
      <span className="isle__head">
        {/* The island as it sits on the chart, ringed by whose it is: a list
            that reads like the map rather than a row of drawn cameos. */}
        <ChartMark
          name={system.chartName ?? system.name}
          width={34}
          height={34}
          className="isle__chart"
          ring={explored ? allegianceColour(system.control === 'none' ? 'neutral' : system.control) : undefined}
        />
        <span className="isle__name">
          <span className="isle__title">
            {system.name}
            {/* The same grade the chart shows, so a list reads like the map. */}
            {explored && <WorthMark system={system} size={14} className="isle__worth" />}
          </span>
          {explored && system.populated && (
            <>
              <span className="isle__bar" aria-hidden="true">
                {allegianceSegments(system).map((segment) => (
                  <span
                    key={segment.faction}
                    style={{
                      width: `${segment.pct}%`,
                      background: allegianceColour(segment.faction),
                    }}
                  />
                ))}
              </span>
              {/*
                Capacity, under allegiance — the two things the original prints
                beneath every planet. These sat on the chart until the chart
                stopped zooming; at chart scale an island is four pixels across
                and a row of pips under it was a smear, so they live here now,
                where the island is a row you can read.
              */}
              {slots > 0 && <RoomBar system={system} className="roombar--row" />}
            </>
          )}
          {!explored && (
            <span className="tiny muted" style={{ display: 'block' }}>
              {terms.uncharted}
            </span>
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
            className={`isle__cat${explored && (counts[cat.kind] ?? 0) > 0 ? ' isle__cat--has' : ''}`}
          >
            <CategoryIcon kind={cat.kind} size={20} />
            <span className="isle__count">
              {explored ? (counts[cat.kind] ?? '–') : '–'}
            </span>
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
