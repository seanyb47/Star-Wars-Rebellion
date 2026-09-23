import { useMemo } from 'react';
import {
  isMissionTarget,
  layerMark,
  missionTypeFor,
  ROOM_TRACK,
  type GameState,
  type ChartLayer,
  type PlayableFaction,
  type System,
  isLoudLayer,
  showsNumber,
  chartedName,
} from '../sim';
import factionData from '../data/factions.json';
import { allegianceColour, allegianceSegments } from './allegiance';
import { islandPath } from './art';
import { paintedChart } from './painted';
import chartData from '../data/chart.json';

/**
 * A chain opened out as a chart of its own islands, rather than a list of rows.
 *
 * This is the original's sector view: the islands where they lie, each with
 * its name in the colour of who holds it and, under the name, the two things
 * the original prints beneath every planet — how much of it is still free to
 * build on, and how its people lean. That is all. There used to be a row of
 * counts over every island too (camps, works, companies, crew, hulls), and
 * next to ten names it was a wall of small numbers nobody read. Those live on
 * the island's own panel, one tap away; the chain view is for choosing which
 * island to tap.
 *
 * The whole island is one target. The original hangs three clickable icons off
 * every planet, which works with a mouse and cannot work here.
 */

const FIELD_W = 1000;
const FIELD_H = 1400;
const FIELD_PAD = 150;
/**
 * How much room one island's label needs, and it is not a circle.
 *
 * It used to be: a single 262-unit radius, which is what the widest name
 * ("Chandler's Rest") measures across. But a label is wide and short — the
 * name plus two 110-wide bars under it — so two islands stacked one above the
 * other were being shoved 262 apart to solve a collision that 80 would have
 * solved, and ended up a long way from their own coasts.
 *
 * Sean, 22 September: *"at least very close to the island. Right now many are
 * way off the location."* So the room is an ellipse the shape of the label:
 * wide across, shallow down. Vertical neighbours barely move now.
 */
const SEPARATION_X = 250;
const SEPARATION_Y = 86;
/**
 * And a leash: however crowded the chain, no mark strays further than this
 * from where the painting put its island.
 *
 * The spread is a best effort, not a promise — past this the mark stops
 * reading as a label for that island and starts reading as a label for the
 * water. Two names touching is a smaller fault than a name on the wrong
 * island, so at the leash the overlap is simply allowed.
 */
const MAX_DRIFT = 95;

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
  // Eased by a fifth since the painting is lifted before the scrim lands.
  return Math.max(0.1, Math.min(0.6, ((l - 20) / 46) * 0.8));
}

/** "Reach/Island" -> where the painting put it, in chart coordinates. */
const PAINTED = new Map(
  CHART.reaches.flatMap((r) => r.islands.map((i) => [`${r.reach}/${i.name}`, i] as const)),
);
/** One berth's width in the room bar. The track is 110 wide and holds the
 *  game's largest island, so the pip never changes size and the bar's length
 *  is the island's room: six berths reaches half way across. */
const PIP_STEP = 110 / ROOM_TRACK;
/** Water to leave around a chain when cropping the painting to it. */
const CROP_PAD = 46;

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
 * Zooming further does not rescue it: preserving a label's width of separation
 * would need between 7.5x and 36.6x, and at 36x you are looking at twenty-eight
 * pixels of a 1024px painting.
 *
 * So the marks start where the painting put the island and are pushed apart
 * only as far as they must be — by the shape of a label rather than by a
 * circle drawn round its widest measurement, and never further than the leash
 * from their own coast. On a roomy chain nothing moves at all. On a crowded
 * one two names may touch, which is the cheaper of the two faults: a mark that
 * has wandered off its island is a mark for the water.
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
        // Measured in units of the label's own footprint, so "touching" means
        // the two labels overlap rather than the two centres being close.
        const nx = dx / SEPARATION_X;
        const ny = dy / SEPARATION_Y;
        const norm = Math.hypot(nx, ny) || 0.01;
        if (norm >= 1) continue;
        const shove = ((1 - norm) / norm) * 0.25;
        points[i].x -= dx * shove;
        points[i].y -= dy * shove;
        points[j].x += dx * shove;
        points[j].y += dy * shove;
      }
    }
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      point.x = Math.max(FIELD_PAD, Math.min(FIELD_W - FIELD_PAD, point.x));
      point.y = Math.max(FIELD_PAD, Math.min(FIELD_H - FIELD_PAD, point.y));
      // The leash, applied every pass rather than once at the end, so the
      // spread keeps working inside it instead of being cut off by it.
      const home = seeds?.[i];
      if (!home) continue;
      const dx = point.x - home.x;
      const dy = point.y - home.y;
      const drift = Math.hypot(dx, dy);
      if (drift <= MAX_DRIFT) continue;
      point.x = home.x + (dx / drift) * MAX_DRIFT;
      point.y = home.y + (dy / drift) * MAX_DRIFT;
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

/** A sail, in a 20-unit box: hulls lying off the island. */
const SHIP = 'M2 14 h16 l-2 5 h-12 Z M10 13 V3 M10 4 l5 8 h-5';
/** Big enough to be the first thing seen in a Reach, small enough to clear
 *  the island above it. */
const SAIL_SCALE = 2.4;

/** Who is flying a flag over it. The name takes this colour. */
export function controlColour(system: System, viewer: 'empire' | 'alliance'): string {
  if (!system.explored[viewer]) return 'var(--unknown-name)';
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
  onOpenIsland,
  pickingFor,
  sailing,
  choosing,
  layer,
}: {
  state: GameState;
  systems: System[];
  onOpenIsland: (systemId: string) => void;
  /** Choosing a destination: only islands that can be parleyed with respond. */
  pickingFor?: PlayableFaction | null;
  /** A fleet is choosing where to sail, and it can sail anywhere. */
  sailing?: boolean;
  /** A build order is choosing where it lands: only islands of yours answer. */
  choosing?: boolean;
  /**
   * Whichever question the chart is asking, still being asked in here.
   *
   * Switching to Idle crew, seeing three chains light up and then opening one
   * to a view that had forgotten all about it was the obvious fault: the whole
   * point of a filter is to narrow the search, and it was giving up at exactly
   * the moment the search got specific.
   */
  layer?: ChartLayer;
}) {
  const viewer = state.player;
  // Picking a destination is a different question from reading the chart, so
  // the layers stand down while it is happening — same rule as the chart's.
  const filtering =
    Boolean(layer) && layer !== 'allegiance' && layer !== 'none' && !pickingFor && !sailing && !choosing;
  /*
   * None means none.
   *
   * Sean, 22 September: *"when the 'none' filter is on on the individual Reach
   * screen, turn off everything but island names. So it looks super clean and
   * you can see map."* So on None the room bar, the free-berth figure, the
   * loyalty bar and the sails all come off, and what is left is fifteen names
   * over the painting. Every one of them is still a tap into the island, and
   * the other filters are one swipe away.
   *
   * Not while picking a destination: there the marks are how you tell which
   * islands answer, and a bare chart would be a chart you cannot choose from.
   */
  const bare = layer === 'none' && !pickingFor && !sailing && !choosing;
  const ground = paintedChart('seas');
  const reachName = state.sectors.find((r) => r.id === systems[0]?.sectorId)?.name;

  // Where the painting puts each of these islands, if it knows them all. One
  // missing island and the whole chain falls back rather than mixing a painted
  // position with a made-up one.
  const painted = useMemo(() => {
    if (!ground || !reachName) return null;
    const found = systems.map((sy) => PAINTED.get(`${reachName}/${sy.chartName ?? sy.name}`));
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
            {/* The same lift as the chart, so a chain opened out is not
                darker than the chart it was opened from. The scrim below
                still does its per-chain work on top. */}
            <filter id="chainmap-lift" colorInterpolationFilters="sRGB">
              <feComponentTransfer>
                <feFuncR type="gamma" amplitude="1" exponent="0.72" offset="0.03" />
                <feFuncG type="gamma" amplitude="1" exponent="0.72" offset="0.03" />
                <feFuncB type="gamma" amplitude="1" exponent="0.72" offset="0.03" />
              </feComponentTransfer>
            </filter>
          </defs>
          <g clipPath="url(#chainmap-frame)" pointerEvents="none">
            <rect x={0} y={0} width={FIELD_W} height={FIELD_H} fill="var(--water-deep)" />
            <g transform={`translate(${-crop.x * crop.scale} ${-crop.y * crop.scale}) scale(${crop.scale})`}>
              <image
                href={ground}
                x={0}
                y={0}
                width={CHART.width}
                height={CHART.height}
                filter="url(#chainmap-lift)"
              />
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
        const explored = system.explored[viewer];
        // One colour, and it is who holds the island. Lean is on the panel.
        const tint = controlColour(system, viewer);
        const flag = tint;
        const slots = system.slots;
        const built = system.facilities.length;

        // The chains dim when they hold nothing to sail to; the islands inside
        // them must do the same, or you find out by tapping and being told no.
        const live = choosing
          ? system.control === viewer && !system.uprising
          : sailing || !pickingFor || isMissionTarget(state, system, pickingFor);
        // One colour at three strengths, matching the chart: the filter pushes
        // an island's own tint up rather than adding a mark of its own.
        const mark = filtering ? layerMark(state, system, layer!, viewer) : { lit: false as const };
        const lit = filtering && mark.lit;
        const litCount = 'count' in mark ? mark.count : undefined;
        const litSize = 'size' in mark ? mark.size : undefined;
        // Which work this island means, so the ring can say so before you tap.
        const work = pickingFor && !sailing ? missionTypeFor(state, system, pickingFor) : null;
        // Named in the label when the errand is to sign them on.
        // Whose hulls lie off it. One sail per side present, in that side's
        // colour — the fleet's owner, not the island's — and no count: the
        // count is on the Harbor tab, and a sail beside the name is the
        // whole message — there is a fleet here, and it is theirs or yours.
        const moored = (['empire', 'alliance'] as const).filter((side) =>
          state.fleets.some((f) => f.systemId === system.id && !f.voyage && f.faction === side),
        );

        /* What this side calls it. Freeport is renamed at runtime, so an
           island the viewer has not explored reads as the charts have it —
           otherwise the Reach map names the Confederacy's base to the Crown
           from across the world. See `chartedName`. */
        const shown = chartedName(system, viewer);

        return (
          <g
            key={system.id}
            // The tutorial points at the first island in the chain and asks
            // you to open it. Only the first: a tour points at one thing.
            data-tour={index === 0 ? 'island' : undefined}
            className="chainmap__isle"
            onClick={live ? () => onOpenIsland(system.id) : undefined}
            role="button"
            aria-disabled={live ? undefined : true}
            opacity={live ? 1 : 0.3}
            style={{ cursor: live ? 'pointer' : 'default' }}
            aria-label={
              work === 'recruit'
                ? `${shown}, keep an open table and sign somebody on`
                : work === 'incite'
                  ? `${shown}, stir up trouble`
                  : work === 'diplomacy'
                    ? `${shown}, parley`
                    : explored
                      ? `${shown}, ${built} of ${slots} slots built${
                          moored.length > 0
                            ? `, ${moored.map((m) => factionData[m].shortName).join(' and ')} hulls at anchor`
                            : ''
                        }`
                      : `${shown}, unexplored`
            }
          >
            {/* Something to tap. The name itself refuses pointer events so
                the glyphs under it stay hittable; this is the hit area for
                the whole label, and it matters most for an island nobody has
                explored, which draws almost nothing else. */}
            <rect x={spot.x - 72} y={spot.y - 12} width={144} height={58} fill="transparent" />
            {/* Lit because it answers whatever the chart is filtering by.
                Same colour as ever, pushed harder: a glow behind the name in the
                island's own tint, with the rest of the chain fallen back. The
                filter reads as this island coming up, not as a mark laid over
                it, which is the same rule the chart above follows. */}
            {lit && (
              <g pointerEvents="none">
                {/* The filter's mark, left of the name — the same as the chart,
                    so a filter reads the same at both scales: the garrison
                    count as a numeral, a star for everything else. */}
                {/* Idle works, idle crew and fleets: whatever the mark, a
                    pulse behind it — the same as on the chart. */}
                {layer && isLoudLayer(layer) && (
                  <circle
                    className="map__idle-halo"
                    cx={spot.x - nameWidth(shown) / 2 - (showsNumber(layer) ? 22 : 26)}
                    cy={spot.y + 1}
                    r={54}
                    fill={tint}
                  />
                )}
                {layer && showsNumber(layer) && litCount !== undefined ? (
                  <text
                    className="chainmap__num"
                    x={spot.x - nameWidth(shown) / 2 - 22}
                    y={spot.y + 12}
                    fill={tint}
                  >
                    {litCount}
                  </text>
                ) : (
                  <circle
                    cx={spot.x - nameWidth(shown) / 2 - (layer && isLoudLayer(layer) ? 26 : 22)}
                    cy={spot.y + 1}
                    r={
                      layer && isLoudLayer(layer)
                        ? 20
                        : { small: 8, medium: 12, large: 18 }[litSize ?? 'large']
                    }
                    fill={tint}
                    fillOpacity={0.35}
                    stroke={tint}
                    strokeWidth={4}
                  />
                )}
                {!(layer && showsNumber(layer)) && litSize === undefined && litCount !== undefined && litCount > 1 && (
                  <text
                    className="chainmap__lit-n"
                    x={spot.x + nameWidth(shown) / 2 + 22}
                    y={spot.y - 14}
                    fill={tint}
                  >
                    {litCount}
                  </text>
                )}
              </g>
            )}

            {/*
              A leader line used to run from here to where the painting really
              put the island, with a tick on the land at the far end, on any
              island the spread had pushed more than 34 units off its own coast.

              Sean, 22 September: *"I don't like the little arrows to the
              islands. Just put the icon over the island."* So the mark is the
              island now and there is nothing pointing at anything. The spread
              is unchanged — it is what keeps ten islands' names and bars off
              each other on a tight chain — and it was already small enough on
              every chain that the nearest land under a mark is its own.
            */}

            {/* A finger-sized target over the whole island, marks included. */}
            {live && <circle cx={spot.x} cy={spot.y} r={62} fill="transparent" />}
            {(sailing || pickingFor || choosing) && live && (
              <circle
                className={`map__pick${
                  work === 'incite'
                    ? ' map__pick--incite'
                    : work === 'recruit' || work === 'rescue'
                      ? ' map__pick--recruit'
                      : ''
                }`}
                cx={spot.x}
                cy={spot.y}
                r={52}
                strokeWidth={4}
              />
            )}

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

            <text
              className={ground && crop ? 'chainmap__name chainmap__name--painted' : 'chainmap__name'}
              x={spot.x}
              y={ground && crop ? spot.y + 12 : spot.y + 74}
              fill={ground && crop ? tint : flag}
              pointerEvents="none"
            >
              {shown}
            </text>

            {/* A sail over the name for each side with hulls lying here, in
                that side's colour. Above rather than beside, and big: where
                the fleets are is the first thing worth seeing in a Reach, and
                at the chart's own scale a fleet is only a large dot. */}
            {explored && !bare && moored.length > 0 && (
              <g pointerEvents="none">
                {moored.map((side, i) => {
                  const w = 20 * SAIL_SCALE;
                  const step = w + 10;
                  const x = spot.x - ((moored.length - 1) * step) / 2 - w / 2 + i * step;
                  return (
                    <g key={side} transform={`translate(${x} ${spot.y - 74}) scale(${SAIL_SCALE})`}>
                      {/* Outlined in two tones, because one tone only ever
                          works against half the chart. The sail sits over a
                          painting: dark water on one island and sunlit rock on
                          the next, and a dark keyline that reads beautifully
                          on the second disappears into the first. So a pale
                          halo goes outside a dark keyline, and one of the two
                          is always the one doing the work.

                          Three passes rather than `paint-order`, which can
                          only give a shape one stroke. */}
                      <path
                        d={SHIP}
                        fill="none"
                        stroke="rgba(233,244,248,0.75)"
                        strokeWidth={5.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d={SHIP}
                        fill="none"
                        stroke="#04121a"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d={SHIP}
                        fill={`var(--${side})`}
                        stroke="#04121a"
                        strokeWidth={1}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ paintOrder: 'stroke fill' }}
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {explored && !bare && (
              <g pointerEvents="none">
                {/* Room to build, against the same thirteen-berth track the
                    island's panel uses: the pip is always the same size, so
                    the bar's length is how much ground the island has and not
                    how full it is. White where something stands, light grey
                    where the ground is free, nothing where the island has no
                    berth at all. Kept clear of the faction colours so it
                    cannot be misread as loyalty. A rock with nothing to build
                    on gets one unbroken dark bar: still a bar, so every
                    charted island reads the same. */}
                {slots === 0 && (
                  <rect
                    x={spot.x - 55}
                    y={spot.y + (paintedGround ? 26 : 88)}
                    width={110}
                    height={7}
                    rx={2}
                    fill="#3d515a"
                  />
                )}
                {slots > 0 &&
                  Array.from({ length: Math.min(slots, ROOM_TRACK) }, (_, i) => (
                    <rect
                      key={i}
                      x={spot.x - 55 + i * PIP_STEP}
                      y={spot.y + (paintedGround ? 26 : 88)}
                      width={PIP_STEP - 2.5}
                      height={7}
                      rx={2}
                      fill={i < built ? '#f4f7f8' : '#8fa0a8'}
                    />
                  ))}
                {/* And the figure, as on the island's row and its panel: free
                    berths, set just past the last pip so it is plainly that
                    bar's number and not the loyalty bar's underneath. Dimmed
                    at nought — "no room" is worth reading differently from
                    "room for two". */}
                {slots > 0 && (
                  <text
                    className={`chainmap__berths${
                      slots - built === 0 ? ' chainmap__berths--none' : ''
                    }`}
                    x={spot.x - 51 + Math.min(slots, ROOM_TRACK) * PIP_STEP}
                    y={spot.y + (paintedGround ? 33 : 95)}
                  >
                    {slots - built}
                  </text>
                )}
                {/* Loyalty: the same bar as the island's panel and its row in
                    the list, largest share first. It came off this view once
                    for being a smear under ten names; it is back because the
                    counts that crowded it are gone and it is the one thing,
                    with free ground, the chain view is now for. Every charted
                    settled island carries it; the two shares always add up to
                    a hundred, so the bar is the balance and nothing else. */}
                {(() => {
                  const y = spot.y + (paintedGround ? 37 : 99);
                  let x = spot.x - 55;
                  return allegianceSegments(system).map((segment) => {
                    const w = (110 * segment.pct) / 100;
                    const el = (
                      <rect
                        key={segment.faction}
                        x={x}
                        y={y}
                        width={w}
                        height={7}
                        fill={allegianceColour(segment.faction)}
                      />
                    );
                    x += w;
                    return el;
                  });
                })()}
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
