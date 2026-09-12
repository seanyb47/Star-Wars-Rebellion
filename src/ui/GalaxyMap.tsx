import { useMemo } from 'react';
import type { GameState, PlayableFaction, System } from '../sim';
import {
  islandWorth,
  isMissionTarget,
  layerMark,
  summariseReach,
  type ChartLayer,
} from '../sim';
import { LayerStrip, useLayerSwipe } from './LayerStrip';
import { allegianceColour, allegianceSegments } from './allegiance';
import { CompassRose, islandPath } from './art';
import { paintedChart } from './painted';
import chartData from '../data/chart.json';
import { ProducerLegend } from './ProducerLegend';

/**
 * The chart is a painting with the war drawn on top of it.
 *
 * Everything about where things sit now comes out of `src/data/chart.json`,
 * which is read off the painting itself by `scripts/chart_positions.py`. The
 * chart used to scatter its own chains and then scatter islands inside them
 * from a seed, which was right while the ground was blank: the scatter was
 * free, stable across games, and there was nothing underneath to disagree
 * with. There is now. An island mark floating in open water beside a painted
 * island reads as a bug, so the marks go where the painting already put the
 * land.
 *
 * That is allowed because the coordinates were always decoration: travel time
 * depends on whether two islands share a chain, never on how far apart they
 * are drawn (see travelDays). Nothing in the simulation reads them.
 *
 * If the painting is missing the chart still works — it falls back to the
 * drawn ground it always had, and to the positions in the data. The game is
 * never half-finished for want of an image.
 */
const CHART = chartData as {
  width: number;
  height: number;
  reaches: Array<{
    reach: string;
    sea: string;
    x: number;
    y: number;
    r: number;
    ry: number;
    label: { x: number; y: number };
    islands: Array<{ name: string; x: number; y: number }>;
  }>;
};
const CHART_W = CHART.width;
/** The painting's own height. Everything in chart.json is inside this. */
const CHART_H = CHART.height;
/**
 * The chart is taller than the painting by a band of open water.
 *
 * Two things needed it. The layer strip and its hint line sit at the foot of
 * the chart and were landing on Salt Reach — the southernmost chain — and on
 * its label. And the painting's bottom edge is its brightest part (luma 75
 * where the rest is 25), which is the worst possible ground for a row of
 * chips. Fading it into flat water fixes both at once.
 */
const BAND = 170;
const VIEW_H = CHART_H + BAND;

/** Reach name -> where its cluster sits on the painting. */
const PLACES = new Map(CHART.reaches.map((r) => [r.reach, r]));
/** "Reach/Island" -> where that island sits. Keyed by both because island
 *  names only have to be unique inside their own chain. */
const ISLAND_PLACES = new Map(
  CHART.reaches.flatMap((r) => r.islands.map((i) => [`${r.reach}/${i.name}`, i] as const)),
);

/**
 * Each Sea, and where its name belongs: the middle of the chains that are in
 * it. Drawn large, faint and letterspaced, under everything — the way a chart
 * names a body of water rather than a place. Seven of them, from the data, so
 * this cannot drift from the world.
 */
const SEAS = (() => {
  const by = new Map<string, Array<{ x: number; y: number; ry: number }>>();
  for (const r of CHART.reaches) {
    const at = by.get(r.sea) ?? [];
    at.push({ x: r.x, y: r.y, ry: r.ry });
    by.set(r.sea, at);
  }
  return [...by].map(([sea, pts]) => {
    const x = pts.reduce((t, p) => t + p.x, 0) / pts.length;
    const y = pts.reduce((t, p) => t + p.y, 0) / pts.length;
    // Two Reaches leave a gap between them for the name; one does not, and the
    // centroid is then the chain itself — the Crown Sea's name was landing on
    // Highwater. So a single-Reach Sea lifts its name into the water above,
    // which is where a chart writes one anyway.
    //
    // The lift is capped, and that matters more since the map went to seven
    // Reaches: with one Reach per Sea every name lifts, the clusters are wider
    // than they were, and a lift proportional to the whole cluster threw the
    // Far Sea off the top of the chart and left the Merchant Sea floating four
    // hundred units above its own islands.
    const ry = Math.max(...pts.map((p) => p.ry));
    const lift = pts.length > 1 ? 0 : Math.min(ry * 0.62, 96);
    // And never off the chart: a name nobody can read is worse than one
    // sitting a little closer to its islands than it would like.
    return { sea, x, y: Math.max(46, Math.min(CHART_H - 40, y - lift)) };
  });
})();

/** Room around a chain's islands for the tap target and the ring. A chain has
 *  to clear 44px on a phone; the smallest of these is 63 units, which is 26px
 *  at 420 wide — so the padding is what makes it tappable, not the islands. */
const CHAIN_PAD = 34;
/** Where a chain goes if the painting has never heard of it — a new Reach on a
 *  bigger map, before someone re-runs the position script. Ringed around the
 *  middle so it is visible and obviously provisional. */
function fallbackSpot(index: number) {
  const t = (index / 10) * Math.PI * 2;
  const x = CHART_W / 2 + Math.cos(t) * 380;
  const y = CHART_H / 2 + Math.sin(t) * 560;
  return { x, y, r: 90, ry: 90, label: { x, y: y + 150 } };
}

/**
 * The chart does not zoom and does not pan.
 *
 * It used to do both, across three levels — Seas pulled out, islands and
 * Reaches pushed in — and it was rejected for being fiddly, which it was. A
 * player on a phone should not have to operate a camera to find out what is
 * happening. So the whole archipelago is on screen at once and there is one
 * thing to tap: an island chain, which opens as a panel listing its islands.
 *
 * That is only possible because a chain is big. Ten chains sit on two rings in
 * a 1200-unit square; at phone width each is about 77px across, comfortably
 * over the 44px minimum, while a single island would be four pixels and
 * impossible to hit. So islands are drawn but not tapped: on the chart they
 * are the picture of the chain, and they become targets in the panel, at a
 * size where you can read their names.
 */
export interface GalaxyMapProps {
  state: GameState;
  /** When set, the map is in "choose a destination" mode for this character. */
  pickingFor?: { characterId: string; faction: PlayableFaction } | null;
  /** A fleet waiting to be told where to sail. Anywhere is a valid answer. */
  sailing?: boolean;
  onCancelPick?: () => void;
  onOpenWorlds?: () => void;
  /** Tapping a chain opens it. The island is then chosen from the list. */
  onSelectReach?: (sectorId: string) => void;
  /** From the idle-producer strip: jump straight to an island with a free yard. */
  onOpenIsland?: (systemId: string) => void;
  /** Which question the chart is answering. Swipe or tap the strip to change. */
  layer?: ChartLayer;
  onLayerChange?: (layer: ChartLayer) => void;
}

/**
 * Open-water stipple: the sounding dots an engraver puts across empty sea.
 * Derived from the game's seed so it stays put across renders and reloads.
 */
function seaStipple(seed: number) {
  let s = seed >>> 0;
  const random = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  return Array.from({ length: 190 }, () => ({
    x: random() * CHART_W,
    y: random() * VIEW_H,
    r: 0.5 + random() * 1.1,
    o: 0.06 + random() * 0.16,
  }));
}

/** Rhumb lines radiating from the chart's compass, as on a portolan chart. */
const RHUMB_ANGLES = Array.from({ length: 16 }, (_, i) => (i * 360) / 16);

/**
 * Out here an island is painted by **loyalty**, not by who is flying a flag
 * over it: the side with the most of its people, or neutral blue where nobody
 * has a majority. That is what makes the chart worth looking at from a
 * distance — you can see sympathy moving before an island changes hands.
 *
 * Control is still shown, by the chain's own tally and inside the chain.
 */
function loyaltyColor(system: System, viewer: PlayableFaction): string {
  if (!system.explored[viewer]) return 'var(--unknown)';
  if (!system.populated) return '#5d7079';
  const lead = allegianceSegments(system)[0];
  return lead ? allegianceColour(lead.faction) : 'var(--neutral)';
}

/**
 * Every island is the same size on the resting chart.
 *
 * Size used to scale with what an island could hold, and the Crown's seat was
 * drawn at more than double everything else. Both were the chart answering a
 * question nobody had asked, every second it was open. Worth is a question you
 * ask when you are choosing where to go, so it is the Worth layer now, and the
 * seat is an island like the others — the ring already says it is a capital.
 *
 * The positions come from the painting and no two are closer than 24 units, so
 * anything past 11 would have neighbours running each other over.
 */
const ISLAND_RADIUS = 8;

/**
 * Under the Worth layer, and only there, size carries the answer.
 *
 * Worth runs 0 to 14 across the world and bunches at 6-9, so the scale is
 * linear over the whole range rather than clipped at 9 — clipping flattened
 * the eight islands worth 12 and 14, which are the only ones the layer exists
 * to find. Capped at 12 because no two islands are closer than 24 units.
 */
const WORTH_MAX = 14;
function worthRadius(system: System): number {
  return 4 + (Math.min(islandWorth(system), WORTH_MAX) / WORTH_MAX) * 8;
}

export function GalaxyMap({
  state,
  pickingFor,
  sailing,
  onCancelPick,
  onOpenWorlds,
  onSelectReach,
  onOpenIsland,
  layer = 'allegiance',
  onLayerChange,
}: GalaxyMapProps) {
  const viewer = state.player;
  const ground = paintedChart('seas');
  const swipe = useLayerSwipe(layer, onLayerChange ?? (() => {}));
  // Picking a destination is a different question from reading the chart, so
  // the layers stand down while it is happening rather than fighting the
  // pick rings for the same dimming.
  const filtering = layer !== 'allegiance' && !pickingFor && !sailing;
  /* Worth is a magnitude, so it is drawn as one: size, not the glow the
     yes-or-no layers use. Fifty glowing islands is not a filter. */
  const sizing = filtering && layer === 'worth';
  const stipple = useMemo(() => seaStipple(state.rngSeed), [state.rngSeed]);

  /**
   * Everything the chart needs to draw a chain, worked out once per render.
   *
   * Sorted by Sea first so the two chains of a Sea come out side by side: the
   * chart then reads as seas of archipelagos rather than ten unrelated
   * clusters. The Sea's own name is left off — it was drawn once and landed on
   * top of the chain names — and appears on the chain's panel instead.
   */
  const chains = useMemo(() => {
    const sorted = [...state.sectors].sort(
      (a, b) => a.sea.localeCompare(b.sea) || a.name.localeCompare(b.name),
    );
    return sorted.map((sector, index) => {
      const place = PLACES.get(sector.name) ?? fallbackSpot(index);
      const spot = { x: place.x, y: place.y };
      const systems = state.systems.filter((s) => s.sectorId === sector.id);
      return {
        sector,
        systems,
        summary: summariseReach(state, sector.id, viewer),
        spot,
        chainR: place.r + CHAIN_PAD,
        /**
         * Where the name goes, worked out against the painting itself by
         * scripts/chart_positions.py rather than hung off the cluster here.
         *
         * Hanging it off the cluster put half the names on their own islands —
         * Rime's sat across the arctic peaks — and left Salt's flipping above
         * into Sovereign's. The script has the land, so it scores a ring of
         * candidate spots by how clear of coastline each is and how far from
         * every name already placed, biggest chain first.
         */
        label: place.label,
        // While choosing a destination, a chain is live only if something
        // in it can actually be sailed to.
        targets: systems.filter((s) => isMissionTarget(state, s, viewer)).length,
      };
    });
  }, [state, viewer]);

  const enemy: PlayableFaction = viewer === 'empire' ? 'alliance' : 'empire';

  return (
    <>
      <svg
        className={ground ? 'map map--painted' : 'map'}
        viewBox={`0 0 ${CHART_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        {...swipe}
      >
        <defs>
          {/* The glow behind an island that answers the current filter. A blur
              rather than a second ring, so what you see is the island's own
              colour burning brighter and not a mark sitting on top of it. */}
          <filter id="litglow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <radialGradient id="shoal">
            <stop offset="0%" stopColor="var(--shallow)" stopOpacity="0.5" />
            <stop offset="70%" stopColor="var(--shallow)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--shallow)" stopOpacity="0" />
          </radialGradient>
          {/* The painting's foot into open water. Long, because a short fade
              over a bright edge reads as a horizon line across the chart. */}
          <linearGradient id="chart-foot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--water)" stopOpacity="0" />
            <stop offset="55%" stopColor="var(--water)" stopOpacity="0.72" />
            <stop offset="100%" stopColor="var(--water)" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* The ground. The painting where it exists; the engraved chart it
            always had where it does not. Never both: the painting carries its
            own rhumb lines, soundings and compass, and drawing ours over the
            top of them was two charts fighting. */}
        {ground ? (
          <image
            href={ground}
            x={0}
            y={0}
            width={CHART_W}
            height={CHART_H}
            preserveAspectRatio="xMidYMid slice"
            pointerEvents="none"
          />
        ) : (
        <g pointerEvents="none">
          {RHUMB_ANGLES.map((deg) => {
            const t = (deg * Math.PI) / 180;
            return (
              <line
                key={deg}
                className="map__rhumb"
                x1={CHART_W / 2}
                y1={CHART_H / 2}
                x2={CHART_W / 2 + Math.cos(t) * CHART_H}
                y2={CHART_H / 2 + Math.sin(t) * CHART_H}
              />
            );
          })}
          <g transform={`translate(${CHART_W / 2} ${CHART_H / 2})`} color="#17505f">
            <CompassRose size={420} opacity={0.18} showLetters={false} />
          </g>
          {stipple.map((dot, index) => (
            <circle key={index} cx={dot.x} cy={dot.y} r={dot.r} fill="#7fb7c8" opacity={dot.o} />
          ))}
        </g>
        )}

        {ground && (
          <g pointerEvents="none">
            <rect x={0} y={CHART_H - 220} width={CHART_W} height={220 + BAND} fill="url(#chart-foot)" />
            <rect x={0} y={CHART_H} width={CHART_W} height={BAND} fill="var(--water)" />
          </g>
        )}

        {/* The seven Seas, named. Large, faint and letterspaced, under the
            chains rather than beside them — a chart names a body of water the
            way it names nothing else, and at this weight a chain label
            crossing one reads as ink over ink instead of a collision. */}
        <g pointerEvents="none">
          {SEAS.map((s) => (
            <text key={s.sea} className="map__sea" x={s.x} y={s.y}>
              {s.sea.replace(/^The /, '').toUpperCase().split('').join('\u2009')}
            </text>
          ))}
        </g>

        {chains.map(({ sector, systems, summary, targets, spot, chainR, label }) => {
          // Sailing can go anywhere; a parley can only go where it is welcome.
          const live = sailing || !pickingFor || targets > 0;
          // Under a layer, a chain holding no answer drops back so the ones
          // that do carry the eye. It stays tappable — a filter is a way of
          // looking, not a lock on where you can go.
          const answers = filtering
            ? systems.filter((sy) => layerMark(state, sy, layer, viewer).lit).length
            : 0;
          const faded = filtering && answers === 0;
          // Below the chain normally; above it when below would put the name
          // in the water band or off the bottom of the chart entirely, which
          // is what happened to Salt Reach.
          const labelX = label.x;
          const labelY = label.y;
          // The names still break at the last space — "Shipwrights'" over
          // "Reach" — which keeps every label inside its own column.
          const words = sector.name.split(' ');
          const tail = words.length > 1 ? words.pop()! : '';
          const head = words.join(' ');
          return (
            <g
              key={sector.id}
              onClick={live ? () => onSelectReach?.(sector.id) : undefined}
              style={{ cursor: live ? 'pointer' : 'default' }}
              opacity={live ? (faded ? 0.22 : 1) : 0.35}
            >
              {/* The disc is the tap target: the whole chain, not any one
                  island. Over the painting it stays invisible — the painted
                  shallows already show where a chain is, and a grey wash on
                  top of them only muddies what is underneath. */}
              <circle
                cx={spot.x}
                cy={spot.y}
                r={chainR}
                fill={ground ? 'transparent' : 'url(#shoal)'}
              />
              {!ground && (
                <circle className="map__sector-ring" cx={spot.x} cy={spot.y} r={chainR} />
              )}
              {(sailing || (pickingFor && targets > 0)) && (
                <circle className="map__pick" cx={spot.x} cy={spot.y} r={chainR + 7} />
              )}

              {systems.map((system) => {

                // Where the painting put this island. Falling back to the old
                // seeded scatter keeps a Reach the position script has not
                // seen from piling all ten islands on one point.
                const at = ISLAND_PLACES.get(`${sector.name}/${system.name}`);
                const ax = at ? at.x : spot.x + system.x * 0.72;
                const ay = at ? at.y : spot.y + system.y * 0.72;
                const explored = system.explored[viewer];
                const radius = sizing ? worthRadius(system) : ISLAND_RADIUS;
                const isHq =
                  system.id === state.factions[viewer].hqSystemId ||
                  (explored && system.id === state.factions[enemy].hqSystemId);
                const mark = filtering
                  ? layerMark(state, system, layer, viewer)
                  : { lit: false as const };
                // One colour, at three strengths. An island is always drawn in
                // its own loyalty colour; a filter only changes how hard that
                // colour is pushed. The islands that answer come up bright and
                // the rest fall back, so the filter reads as the chart lighting
                // up rather than as a second set of marks laid over it.
                const lit = filtering && mark.lit && !sizing;
                const dim = filtering && !mark.lit;
                const tint = loyaltyColor(system, viewer);
                return (
                  <g key={system.id} pointerEvents="none">
                    {lit && (
                      <>
                        {/* A halo in the island's own colour, so bright reads as
                            bright at three pixels and not merely as filled. */}
                        <circle
                          cx={ax}
                          cy={ay}
                          r={radius + 5}
                          fill={tint}
                          opacity={0.55}
                          filter="url(#litglow)"
                        />
                        {mark.count !== undefined && mark.count > 1 && (
                          <text
                            className="map__lit-n"
                            x={ax + radius + 11}
                            y={ay - radius - 3}
                            fill={tint}
                          >
                            {mark.count}
                          </text>
                        )}
                      </>
                    )}
                    {isHq && (
                      <circle
                        className="map__hq"
                        cx={ax}
                        cy={ay}
                        r={radius + 7}
                        stroke={loyaltyColor(system, viewer)}
                      />
                    )}
                    {ground ? (
                      /* On the painting the island is already drawn, in more
                         detail than a seeded outline will ever manage. So the
                         mark stops trying to be an island and becomes what it
                         is: a ring saying whose this is, with just enough tint
                         inside to carry the colour at three pixels. Drawing
                         our own coastline on top of a painted one was two
                         islands in the same place. */
                      <>
                        <circle
                          cx={ax}
                          cy={ay}
                          r={radius}
                          fill={tint}
                          opacity={lit ? 1 : dim ? 0.12 : explored ? 0.42 : 0.14}
                        />
                        <circle
                          cx={ax}
                          cy={ay}
                          r={radius}
                          fill="none"
                          stroke={tint}
                          strokeWidth={lit ? 3.2 : explored ? 2.4 : 1.6}
                          strokeDasharray={explored ? undefined : '4 3.5'}
                          opacity={lit ? 1 : dim ? 0.26 : explored ? 0.95 : 0.5}
                        />
                      </>
                    ) : (
                      <>
                        {/* Shelf of shallows, then the coastline itself. */}
                        <path
                          d={islandPath(system.name, radius + 5)}
                          transform={`translate(${ax} ${ay})`}
                          fill="var(--shallow)"
                          opacity={explored ? 0.5 : 0.25}
                        />
                        <path
                          className="map__coast"
                          d={islandPath(system.name, radius)}
                          transform={`translate(${ax} ${ay})`}
                          fill={system.populated ? 'var(--land)' : 'var(--land-bare)'}
                          stroke={tint}
                          strokeWidth={lit ? 3 : explored ? 2.2 : 1.6}
                          strokeDasharray={explored ? undefined : '5 4'}
                          opacity={dim ? 0.3 : 1}
                        />
                        <path
                          d={islandPath(system.name, radius)}
                          transform={`translate(${ax} ${ay})`}
                          fill={tint}
                          opacity={lit ? 0.9 : dim ? 0.08 : explored ? 0.28 : 0.1}
                        />
                      </>
                    )}
                    {system.uprising && explored && (
                      <path
                        d={`M ${ax - radius * 0.5} ${ay - radius - 3} l 0 -11 l ${radius * 0.9} 4 l ${-radius * 0.9} 4 z`}
                        fill="#b8433a"
                      />
                    )}
                  </g>
                );
              })}

              {/* The chain's name, and under it how the whole chain leans.
                  The tally of how many islands are yours was cut from here:
                  the islands are painted by loyalty now, so the chain reads
                  without being counted. */}
              <text
                className="map__sector-label"
                x={labelX}
                y={labelY}
                pointerEvents="none"
              >
                {head && <tspan x={labelX}>{head}</tspan>}
                <tspan x={labelX} dy={head ? 36 : 0}>
                  {tail || head}
                  {summary.mutinies > 0 && <tspan className="map__chain-alarm"> ⚑</tspan>}
                </tspan>
              </text>
              {/* The allegiance bar under each name is gone. Seven of them
                  turned the chart into a bar chart with a painting behind it,
                  and every one restated something the islands above it were
                  already saying in colour — which is the whole point of
                  painting them by loyalty. A Reach that is in revolt still
                  says so, because that is the one thing the islands cannot. */}
            </g>
          );
        })}
      </svg>

      {/* What is standing idle, always on screen: a yard building nothing is
          gold you are not spending, and nothing else says so. */}
      {/* A shut harbour, under every layer: it costs you a day's takings
          whatever you happen to be looking at. */}
      {!pickingFor && !sailing && <ProducerLegend state={state} onOpenIsland={onOpenIsland} />}

      {!pickingFor && !sailing && onLayerChange && (
        <LayerStrip state={state} layer={layer} onChange={onLayerChange} viewer={viewer} />
      )}

      <div className="map__hud">
        {sailing ? (
          <button className="chip chip--pick" onClick={onCancelPick}>
            Open a chain and pick where to sail · cancel
          </button>
        ) : pickingFor ? (
          <button className="chip chip--pick" onClick={onCancelPick}>
            Open a chain and pick an island · cancel
          </button>
        ) : (
          <button className="chip chip--action" onClick={onOpenWorlds}>
            My islands
          </button>
        )}
      </div>
    </>
  );
}
