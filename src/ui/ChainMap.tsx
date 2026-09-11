import { useMemo } from 'react';
import {
  earns,
  isDiplomacyTarget,
  type GameState,
  type IslandSummary,
  type PlayableFaction,
  type System,
} from '../sim';
import { allegianceColour, allegianceSegments } from './allegiance';
import { islandPath } from './art';

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
  /** Sail: hulls lying off the island, whoever they belong to. */
  ships: 'M2 14 h16 l-2 5 h-12 Z M10 13 V3 M10 4 l5 8 h-5',
} as const;

/** Who is flying a flag over it. The name takes this colour. */
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

/**
 * Who its people lean toward. The island itself takes this colour, the same
 * way it does out on the chart, so the two views agree.
 *
 * Body and name together carry both facts: an island the Crown holds whose
 * people have gone over reads as a red island with a green name, which is
 * exactly the island you should be worrying about.
 */
function loyaltyColour(system: System, viewer: 'empire' | 'alliance'): string {
  if (!system.explored[viewer]) return 'var(--unknown)';
  if (!system.populated) return '#7c8d95';
  const lead = allegianceSegments(system)[0];
  return lead ? allegianceColour(lead.faction) : 'var(--neutral)';
}

export function ChainMap({
  state,
  systems,
  perIsland,
  onOpenIsland,
  pickingFor,
  sailing,
}: {
  state: GameState;
  systems: System[];
  perIsland: IslandSummary[];
  onOpenIsland: (systemId: string) => void;
  /** Choosing a destination: only islands that can be parleyed with respond. */
  pickingFor?: PlayableFaction | null;
  /** A fleet is choosing where to sail, and it can sail anywhere. */
  sailing?: boolean;
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
        const tint = loyaltyColour(system, viewer);
        const flag = controlColour(system, viewer);
        const slots = system.rawSlots + system.energySlots;
        const built = system.facilities.length;

        // The chains dim when they hold nothing to sail to; the islands inside
        // them must do the same, or you find out by tapping and being told no.
        const live = sailing || !pickingFor || isDiplomacyTarget(system, pickingFor);

        // Hulls lying off it, by side. An enemy squadron in one of your
        // harbours is the single most urgent thing the chart can tell you, so
        // it gets its own row rather than queueing behind four land marks.
        const moored = state.fleets.filter((f) => f.systemId === system.id && !f.voyage);
        const sail = (['empire', 'alliance'] as const)
          .map((side) => ({
            side,
            hulls: moored
              .filter((f) => f.faction === side)
              .reduce((n, f) => n + f.ships.length, 0),
          }))
          .filter((entry) => entry.hulls > 0);

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

        // Marks sit in rows over the island, centred on it: the land above,
        // the sail just over the water where it actually is.
        const step = 62;
        const rowLeft = spot.x - ((badges.length - 1) * step) / 2;
        const sailLeft = spot.x - ((sail.length - 1) * step) / 2;

        return (
          <g
            key={system.id}
            className="chainmap__isle"
            onClick={live ? () => onOpenIsland(system.id) : undefined}
            role="button"
            aria-disabled={live ? undefined : true}
            opacity={live ? 1 : 0.3}
            style={{ cursor: live ? 'pointer' : 'default' }}
            aria-label={
              explored
                ? `${system.name}, ${built} of ${slots} slots built`
                : 'Uncharted island'
            }
          >
            {/* A finger-sized target over the whole island, marks included. */}
            {live && <circle cx={spot.x} cy={spot.y} r={62} fill="transparent" />}
            {(sailing || pickingFor) && live && (
              <circle className="map__pick" cx={spot.x} cy={spot.y} r={52} strokeWidth={4} />
            )}

            {explored &&
              sail.map((entry, i) => (
                <g
                  key={entry.side}
                  transform={`translate(${sailLeft + i * step - 26} ${spot.y - 58}) scale(1.5)`}
                  pointerEvents="none"
                >
                  <path
                    d={MARKS.ships}
                    fill="none"
                    stroke={`var(--${entry.side})`}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <text
                    className="chainmap__badge-n"
                    x={25}
                    y={16}
                    fill={`var(--${entry.side})`}
                  >
                    {entry.hulls}
                  </text>
                </g>
              ))}

            {badges.map((badge, i) => (
              <g
                key={i}
                transform={`translate(${rowLeft + i * step - 26} ${spot.y - (sail.length > 0 ? 104 : 94)}) scale(1.5)`}
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
              fill={flag}
              pointerEvents="none"
            >
              {explored ? system.name : 'Uncharted'}
            </text>

            {explored && system.populated && slots > 0 && (
              <g pointerEvents="none">
                {/* Reserves used against reserves free. The allegiance bar that
                    used to sit here is gone: the island is painted by loyalty,
                    and a bar under every one of ten was a row of smears. */}
                {Array.from({ length: slots }, (_, i) => (
                    <rect
                      key={i}
                      x={spot.x - 55 + i * (110 / slots)}
                      y={spot.y + 88}
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
