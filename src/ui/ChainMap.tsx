import { useMemo } from 'react';
import {
  earns,
  isMissionTarget,
  missionTypeFor,
  recruitOn,
  type GameState,
  type IslandSummary,
  type PlayableFaction,
  type System,
} from '../sim';
import { allegianceColour, allegianceSegments } from './allegiance';
import { islandPath } from './art';
import { paintedChart } from './painted';
import chartData from '../data/chart.json';

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

const CHART = chartData as {
  width: number;
  height: number;
  reaches: Array<{
    reach: string;
    luma: number;
    islands: Array<{ name: string; x: number; y: number }>;
  }>;
};
/** Reach -> how bright the painting is where that chain sits, measured by
 *  scripts/chart_positions.py over the same crop this view takes. */
const LUMA = new Map(CHART.reaches.map((r) => [r.reach, r.luma] as const));

/**
 * How hard to scrim the painting for a chain of this brightness.
 *
 * A flat scrim was wrong in both directions. The Crown's chain fills the frame
 * with a lit island and needed 0.70 to bring a Confederacy mark from 1.4:1 up
 * over the 3:1 floor; Cinder Reach's crop is dark water to begin with, and the
 * same 0.70 erased it to a black rectangle — a zoom of nothing.
 *
 * The line below is fitted to the one case that was measured end to end:
 * Sovereign at a stored luma of 52 wants 0.70. Everything else falls out of
 * that. The floor is not zero because even a dark crop is busier than a flat
 * ground, and a little separation costs the painting nothing.
 */
function scrimFor(reach: string | undefined): number {
  const l = reach !== undefined ? (LUMA.get(reach) ?? 40) : 40;
  return Math.max(0.12, Math.min(0.72, (l - 20) / 46));
}

/** "Reach/Island" -> where the painting put it, in chart coordinates. */
const PAINTED = new Map(
  CHART.reaches.flatMap((r) => r.islands.map((i) => [`${r.reach}/${i.name}`, i] as const)),
);
/** Water to leave around a chain when cropping the painting to it. */
const CROP_PAD = 46;
/** Past this much displacement an island has been pushed off its own painted
 *  land, and gets a leader line back to it. Under it, nobody would notice. */
const TETHER = 34;

/**
 * The window of the big chart this chain fills.
 *
 * The chain's own islands, plus a margin, widened to the field's proportion so
 * the painting is never stretched. Clamped to the painting's edges, because a
 * chain near the rim would otherwise crop past it and show a band of nothing.
 */
function cropFor(points: Array<{ x: number; y: number }>) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  let w = Math.max(...xs) - Math.min(...xs) + CROP_PAD * 2;
  let h = Math.max(...ys) - Math.min(...ys) + CROP_PAD * 2;
  const want = FIELD_W / FIELD_H;
  if (w / h > want) h = w / want;
  else w = h * want;
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  let x = cx - w / 2;
  let y = cy - h / 2;
  if (w <= CHART.width) x = Math.max(0, Math.min(CHART.width - w, x));
  if (h <= CHART.height) y = Math.max(0, Math.min(CHART.height - h, y));
  return { x, y, w, h, scale: FIELD_W / w };
}

/**
 * Where to draw each island, and where the painting says it really is.
 *
 * Two positions per island, and the gap between them is the whole design
 * problem here. The painting is the truth, and a chain in it is tight: the ten
 * islands of a Reach sit 24 to 50 chart units apart. Blown up to fill this
 * field that is 120 to 220 units — and one island's marks, name and slot bar
 * need 262. Coral Reach is 39. So a faithful zoom would stack every island's
 * information on its neighbour's.
 *
 * Zooming further does not rescue it: preserving 262 units of separation would
 * need between 7.5x and 36.6x, and at 36x you are looking at twenty-eight
 * pixels of a 1024px painting.
 *
 * So the marks start where the painting put the island and are pushed apart
 * only as far as they must be. On a roomy chain nothing moves far and the mark
 * sits on its own painted island. On a crowded one it is pushed off, and gets
 * a hairline back to where it belongs rather than pretending. That way the
 * view is a zoom of the chart wherever it honestly can be, and says so
 * wherever it cannot.
 */
function layoutIslands(
  systems: System[],
  seeds: Array<{ x: number; y: number }> | null,
): Array<{ x: number; y: number }> {
  const points = seeds
    ? seeds.map((p) => ({ ...p }))
    : fromScatter(systems);

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

/** The old layout: spread the simulation's own scatter across the field.
 *  Still the fallback for a chain the painting has never heard of. */
function fromScatter(systems: System[]): Array<{ x: number; y: number }> {
  const xs = systems.map((s) => s.x);
  const ys = systems.map((s) => s.y);
  const spanX = Math.max(...xs) - Math.min(...xs) || 1;
  const spanY = Math.max(...ys) - Math.min(...ys) || 1;
  return systems.map((s) => ({
    x: FIELD_PAD + ((s.x - Math.min(...xs)) / spanX) * (FIELD_W - FIELD_PAD * 2),
    y: FIELD_PAD + ((s.y - Math.min(...ys)) / spanY) * (FIELD_H - FIELD_PAD * 2),
  }));
}

/** Roughly how wide a name renders, for placing something beside it.
 *  Serif at 34px averages a little over half its size per character; this only
 *  has to be close enough to put a 7-unit dot clear of the first letter. */
function nameWidth(name: string): number {
  return name.length * 17;
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
  /** A figure on the quay: somebody ashore here the war has not claimed. */
  person: 'M10 4 a2.6 2.6 0 1 1 0 5.2 a2.6 2.6 0 1 1 0 -5.2 M5.5 18 v-4.4 a4.5 4.5 0 0 1 9 0 V18',
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
  const ground = paintedChart('seas');
  const reachName = state.sectors.find((r) => r.id === systems[0]?.sectorId)?.name;

  // Where the painting puts each of these islands, if it knows them all. One
  // missing island and the whole chain falls back rather than mixing a painted
  // position with a made-up one.
  const painted = useMemo(() => {
    if (!ground || !reachName) return null;
    const found = systems.map((sy) => PAINTED.get(`${reachName}/${sy.name}`));
    return found.every(Boolean) ? (found as Array<{ x: number; y: number }>) : null;
  }, [ground, reachName, systems]);

  const crop = useMemo(() => (painted ? cropFor(painted) : null), [painted]);

  /** The painting's positions, in this field's coordinates. */
  const truth = useMemo(
    () =>
      painted && crop
        ? painted.map((p) => ({ x: (p.x - crop.x) * crop.scale, y: (p.y - crop.y) * crop.scale }))
        : null,
    [painted, crop],
  );

  const spots = useMemo(() => layoutIslands(systems, truth), [systems, truth]);
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
      {/* The same painting as the chart, wound in to this chain. Clipped
          rather than letterboxed, so the crop fills the field exactly. */}
      {ground && crop && (
        <>
          <defs>
            <clipPath id="chainmap-frame">
              <rect x={0} y={0} width={FIELD_W} height={FIELD_H} />
            </clipPath>
          </defs>
          <g clipPath="url(#chainmap-frame)" pointerEvents="none">
            <rect x={0} y={0} width={FIELD_W} height={FIELD_H} fill="var(--water-deep)" />
            <g transform={`translate(${-crop.x * crop.scale} ${-crop.y * crop.scale}) scale(${crop.scale})`}>
              <image href={ground} x={0} y={0} width={CHART.width} height={CHART.height} />
            </g>
            {/* Wound in this far, the painting stops being a dark sea and
                becomes a bright island filling the frame. Measured on the
                Crown's chain: the brightest tenth reaches luma 99, where a
                Confederacy mark is 1.4:1 against a 3:1 floor. The whole chart
                is darkened once for the map view and that is not enough here,
                because this view is zoomed onto the brightest part of it —
                and too much for the chains whose crop was already dark. */}
            <rect
              x={0}
              y={0}
              width={FIELD_W}
              height={FIELD_H}
              fill="var(--water-deep)"
              opacity={scrimFor(reachName)}
            />
          </g>
        </>
      )}

      {systems.map((system, index) => {
        const paintedGround = Boolean(ground && crop);
        const spot = spots[index];
        const entry = summaryById.get(system.id);
        const explored = system.explored[viewer];
        const tint = loyaltyColour(system, viewer);
        const flag = controlColour(system, viewer);
        const slots = system.rawSlots + system.energySlots;
        const built = system.facilities.length;

        // The chains dim when they hold nothing to sail to; the islands inside
        // them must do the same, or you find out by tapping and being told no.
        const live = sailing || !pickingFor || isMissionTarget(state, system, pickingFor);
        // Which work this island means, so the ring can say so before you tap.
        const work = pickingFor && !sailing ? missionTypeFor(state, system, pickingFor) : null;

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

        const loose = recruitOn(state, system, viewer);
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
              // Somebody worth sailing for. Brass, like the ring you get when
              // you go to sign them on, and not in either side's colour —
              // they are nobody's yet, which is the whole point of them.
              loose && { d: MARKS.person, n: 0, fill: false, colour: 'var(--brass)' },
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
              work === 'recruit'
                ? `${system.name}, sign on ${loose?.name ?? 'someone'}`
                : work === 'incite'
                  ? `${system.name}, stir up trouble`
                  : work === 'diplomacy'
                    ? `${system.name}, parley`
                    : explored
                      ? // Somebody ashore is worth saying even when you are not
                        // choosing a destination — it is the mark most worth
                        // noticing and the one least like the others.
                        `${system.name}, ${built} of ${slots} slots built${
                          loose ? `, ${loose.name} ashore` : ''
                        }`
                      : 'Uncharted island'
            }
          >
            {/* Pushed off its own painted island to make room. Say so: a
                hairline to where it actually lies, and a tick on the land. */}
            {(() => {
              const real = truth?.[index];
              if (!real) return null;
              if (Math.hypot(real.x - spot.x, real.y - spot.y) < TETHER) return null;
              return (
                <g pointerEvents="none" opacity={live ? 0.55 : 0.2}>
                  <line
                    className="chainmap__tether"
                    x1={spot.x}
                    y1={spot.y}
                    x2={real.x}
                    y2={real.y}
                  />
                  <circle className="chainmap__tether-end" cx={real.x} cy={real.y} r={7} />
                </g>
              );
            })()}

            {/* A finger-sized target over the whole island, marks included. */}
            {live && <circle cx={spot.x} cy={spot.y} r={62} fill="transparent" />}
            {(sailing || pickingFor) && live && (
              <circle
                className={`map__pick${
                  work === 'incite'
                    ? ' map__pick--incite'
                    : work === 'recruit'
                      ? ' map__pick--recruit'
                      : ''
                }`}
                cx={spot.x}
                cy={spot.y}
                r={52}
                strokeWidth={4}
              />
            )}

            {explored &&
              sail.map((entry, i) => (
                <g
                  key={entry.side}
                  transform={`translate(${sailLeft + i * step - 26} ${spot.y - (paintedGround ? 96 : 58)}) scale(1.5)`}
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
                transform={`translate(${rowLeft + i * step - 26} ${spot.y - (sail.length > 0 ? 104 : 94) - (paintedGround ? 38 : 0)}) scale(1.5)`}
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
                {/* A count, except where counting is meaningless: one person
                    on a quay is "somebody", not "1 somebody". */}
                {badge.n > 0 && (
                  <text className="chainmap__badge-n" x={25} y={16} fill={badge.colour}>
                    {badge.n}
                  </text>
                )}
              </g>
            ))}

            {system.uprising && explored && (
              <path
                d={`M ${spot.x - 12} ${spot.y - (paintedGround ? 30 : 52)} l 0 -26 l 30 9 l -30 9 z`}
                fill="#d8574c"
                pointerEvents="none"
              />
            )}

            {/* On the painting there is no drawn island at all.
                The coastline used to be drawn here — a seeded blob in the
                loyalty colour, with a shelf of shallows under it. That made
                sense when the ground was blank. Over a painting it is a second
                island sitting on top of a real one, and the real one is better.
                So what is left is the name, which is the thing you came to
                read and the thing you tap. The blank-ground fallback keeps the
                blob, because there it is the only island there is. */}
            {!(ground && crop) && (
              <>
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
              </>
            )}

            {/* Whose flag flies, when anybody's does.
                The name is coloured by loyalty, the same rule the chart uses —
                which way the people lean. Control is the other fact and used
                to be carried by the drawn body underneath. It is a dot now, and
                only when somebody actually holds the island: on day one most of
                a chain is unclaimed, and a mark on every one of ten would say
                nothing while adding ten marks. An island you hold whose people
                have gone over reads as a green dot on a red name, which is
                exactly the island worth worrying about. */}
            {ground && crop && explored && (system.control === 'empire' || system.control === 'alliance') && (
              <circle
                cx={spot.x - nameWidth(system.name) / 2 - 15}
                cy={spot.y + 1}
                r={7}
                fill={flag}
                stroke="#041219"
                strokeWidth={2.5}
                pointerEvents="none"
              />
            )}

            <text
              className={ground && crop ? 'chainmap__name chainmap__name--painted' : 'chainmap__name'}
              x={spot.x}
              y={ground && crop ? spot.y + 12 : spot.y + 74}
              fill={ground && crop ? tint : flag}
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
                      y={spot.y + (paintedGround ? 26 : 88)}
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
