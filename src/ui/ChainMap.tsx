import { useMemo } from 'react';
import { earns, type GameState, type IslandSummary, type System } from '../sim';
import { islandPath } from './art';
import type { IslandTab } from './IslandRow';

/**
 * A chain opened out as a chart of its own islands, rather than a list of rows.
 *
 * This is the original's sector view: the islands where they lie, and around
 * each one the marks that say what is going on there — who holds it, what
 * stands on it, whether any of your crew are working it, how it leans, and how
 * much of it is still free to build on. You read the whole chain at a glance
 * instead of scrolling ten rows to find the one that changed.
 *
 * The marks are indicators, not buttons. The original hangs three clickable
 * icons off every planet, which works with a mouse and cannot work here: three
 * 44px targets per island, ten islands, is more than a phone screen holds. So
 * the whole island is one target and opens its panel, where the same three
 * live as tabs.
 */

const FIELD_W = 1000;
const FIELD_H = 1400;
const FIELD_PAD = 150;
/** Centre-to-centre room each island needs for its marks, name and bars. */
const MIN_SEPARATION = 262;

/**
 * Where to draw each island.
 *
 * Starts from the scatter the simulation generated, so a chain keeps its own
 * shape, then pushes any pair that is too close apart until every island has
 * room for its label. Deterministic: same chain, same picture, every render.
 */
function layoutIslands(systems: System[]): Array<{ x: number; y: number }> {
  const xs = systems.map((s) => s.x);
  const ys = systems.map((s) => s.y);
  const spanX = Math.max(...xs) - Math.min(...xs) || 1;
  const spanY = Math.max(...ys) - Math.min(...ys) || 1;
  const points = systems.map((s) => ({
    x: FIELD_PAD + ((s.x - Math.min(...xs)) / spanX) * (FIELD_W - FIELD_PAD * 2),
    y: FIELD_PAD + ((s.y - Math.min(...ys)) / spanY) * (FIELD_H - FIELD_PAD * 2),
  }));

  for (let pass = 0; pass < 160; pass++) {
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[j].x - points[i].x;
        const dy = points[j].y - points[i].y;
        const distance = Math.hypot(dx, dy) || 0.01;
        if (distance >= MIN_SEPARATION) continue;
        const shove = ((MIN_SEPARATION - distance) / distance) * 0.25;
        points[i].x -= dx * shove;
        points[i].y -= dy * shove;
        points[j].x += dx * shove;
        points[j].y += dy * shove;
      }
    }
    for (const point of points) {
      point.x = Math.max(FIELD_PAD, Math.min(FIELD_W - FIELD_PAD, point.x));
      point.y = Math.max(FIELD_PAD, Math.min(FIELD_H - FIELD_PAD, point.y));
    }
  }
  return points;
}

/** Marks drawn in a 20-unit box, so they can be placed on a 20-unit grid. */
const MARKS = {
  /** Earns you gold: a camp or a mill. */
  civil: 'M2 18 v-7 l8 -6 l8 6 v7 Z',
  /** Costs you gold and makes things: works, drill ground, slipway. */
  military: 'M4 18 v-11 h2.5 v-2.5 h2.5 v2.5 h2 v-2.5 h2.5 v2.5 H16 v11 Z',
  /** Crossed cutlass and pike: companies ashore. */
  ashore: 'M4 17 L16 5 M16 17 L4 5',
  /** A sealed dispatch: your crew standing on it, or sailing to it. */
  mission: 'M2 6 h16 v10 h-16 Z M2 6 l8 6 l8 -6',
} as const;

function controlColour(system: System, viewer: 'empire' | 'alliance'): string {
  if (!system.explored[viewer]) return 'var(--unknown)';
  switch (system.control) {
    case 'empire':
      return 'var(--empire)';
    case 'alliance':
      return 'var(--alliance)';
    case 'neutral':
      return 'var(--neutral)';
    default:
      return '#7c8d95';
  }
}

export function ChainMap({
  state,
  systems,
  perIsland,
  onOpenIsland,
}: {
  state: GameState;
  systems: System[];
  perIsland: IslandSummary[];
  onOpenIsland: (systemId: string, tab: IslandTab) => void;
}) {
  const viewer = state.player;
  const spots = useMemo(() => layoutIslands(systems), [systems]);
  const summaryById = useMemo(
    () => new Map(perIsland.map((entry) => [entry.systemId, entry] as const)),
    [perIsland],
  );

  return (
    <svg
      className="chainmap"
      viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label="Islands of this chain"
    >
      {systems.map((system, index) => {
        const spot = spots[index];
        const entry = summaryById.get(system.id);
        const explored = system.explored[viewer];
        const tint = controlColour(system, viewer);
        const slots = system.rawSlots + system.energySlots;
        const built = system.facilities.length;

        const civil = system.facilities.filter((f) => earns(f.type)).length;
        const military = built - civil;
        const badges = explored
          ? ([
              civil > 0 && { d: MARKS.civil, n: civil, fill: true, colour: tint },
              military > 0 && { d: MARKS.military, n: military, fill: true, colour: tint },
              (entry?.military ?? 0) > 0 && {
                d: MARKS.ashore,
                n: entry!.military,
                fill: false,
                colour: tint,
              },
              (entry?.missions ?? 0) > 0 && {
                d: MARKS.mission,
                n: entry!.missions,
                fill: false,
                colour: `var(--${viewer})`,
              },
            ].filter(Boolean) as Array<{
              d: string;
              n: number;
              fill: boolean;
              colour: string;
            }>)
          : [];

        // Marks sit in a row over the island, centred on it.
        const step = 62;
        const rowLeft = spot.x - ((badges.length - 1) * step) / 2;

        return (
          <g
            key={system.id}
            className="chainmap__isle"
            onClick={() => onOpenIsland(system.id, 'overview')}
            role="button"
            aria-label={
              explored
                ? `${system.name}, ${built} of ${slots} slots built`
                : 'Uncharted island'
            }
          >
            {/* A finger-sized target over the whole island, marks included. */}
            <circle cx={spot.x} cy={spot.y} r={62} fill="transparent" />

            {badges.map((badge, i) => (
              <g
                key={i}
                transform={`translate(${rowLeft + i * step - 26} ${spot.y - 94}) scale(1.5)`}
                pointerEvents="none"
              >
                <path
                  d={badge.d}
                  fill={badge.fill ? badge.colour : 'none'}
                  stroke={badge.colour}
                  strokeWidth={badge.fill ? 0 : 2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.95}
                />
                <text className="chainmap__badge-n" x={25} y={16} fill={badge.colour}>
                  {badge.n}
                </text>
              </g>
            ))}

            {system.uprising && explored && (
              <path
                d={`M ${spot.x - 12} ${spot.y - 52} l 0 -26 l 30 9 l -30 9 z`}
                fill="#d8574c"
                pointerEvents="none"
              />
            )}

            {/* Shelf of shallows, then the coastline. */}
            <path
              d={islandPath(system.name, 40)}
              transform={`translate(${spot.x} ${spot.y})`}
              fill="var(--shallow)"
              opacity={explored ? 0.5 : 0.25}
              pointerEvents="none"
            />
            <path
              d={islandPath(system.name, 34)}
              transform={`translate(${spot.x} ${spot.y})`}
              fill={system.populated ? 'var(--land)' : 'var(--land-bare)'}
              stroke={tint}
              strokeWidth={explored ? 3 : 2}
              strokeDasharray={explored ? undefined : '7 5'}
              strokeLinejoin="round"
              pointerEvents="none"
            />
            <path
              d={islandPath(system.name, 34)}
              transform={`translate(${spot.x} ${spot.y})`}
              fill={tint}
              opacity={explored ? 0.3 : 0.1}
              pointerEvents="none"
            />

            <text
              className="chainmap__name"
              x={spot.x}
              y={spot.y + 74}
              fill={tint}
              pointerEvents="none"
            >
              {explored ? system.name : 'Uncharted'}
            </text>

            {explored && system.populated && (
              <g pointerEvents="none">
                {/* How it leans, then how much of it is still free to build on. */}
                <rect x={spot.x - 55} y={spot.y + 86} width={110} height={10} rx={5} fill="#0a2b36" />
                <rect
                  x={spot.x - 55}
                  y={spot.y + 86}
                  width={(110 * system.support[viewer]) / 100}
                  height={10}
                  rx={5}
                  fill={`var(--${viewer})`}
                />
                <rect
                  x={
                    spot.x -
                    55 +
                    110 -
                    (110 * system.support[viewer === 'empire' ? 'alliance' : 'empire']) / 100
                  }
                  y={spot.y + 86}
                  width={
                    (110 * system.support[viewer === 'empire' ? 'alliance' : 'empire']) / 100
                  }
                  height={10}
                  rx={5}
                  fill={`var(--${viewer === 'empire' ? 'alliance' : 'empire'})`}
                  opacity={0.9}
                />
                {slots > 0 &&
                  Array.from({ length: slots }, (_, i) => (
                    <rect
                      key={i}
                      x={spot.x - 55 + i * (110 / slots)}
                      y={spot.y + 101}
                      width={110 / slots - 2.5}
                      height={7}
                      rx={2}
                      fill={i < built ? '#93a7b1' : '#1c3b48'}
                    />
                  ))}
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
