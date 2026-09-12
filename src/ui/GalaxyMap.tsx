import { useMemo } from 'react';
import type { GameState, PlayableFaction, System } from '../sim';
import { isMissionTarget, layerMark, summariseReach, type ChartLayer } from '../sim';
import { LayerStrip, useLayerSwipe } from './LayerStrip';
import { allegianceColour, allegianceSegments, segmentsFor } from './allegiance';
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
  return { x: CHART_W / 2 + Math.cos(t) * 380, y: CHART_H / 2 + Math.sin(t) * 560, r: 90, ry: 90 };
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
 * How much of the chart an island takes up: settled ports draw larger.
 *
 * Smaller than it was, and deliberately. The positions come from the painting
 * now and no two are closer than 24 units, so a radius past 11 would have
 * neighbours running each other over. It costs nothing: the painting is
 * already drawing the island, and the mark only has to say whose it is.
 */
function islandRadius(system: System): number {
  const weight = system.rawSlots + system.energySlots;
  return (system.populated ? 7 : 5.5) + Math.min(weight, 9) * 0.42;
}

/** Highwater, and nothing else, is drawn at this. The Crown's seat should be
 *  the one island you can pick out of the whole chart without reading a word.
 *  It sits on the largest painted island in the world, which the position
 *  script reserves for whichever island the data marks as a capital. */
const SEAT_RADIUS = 26;

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
  const stipple = useMemo(() => seaStipple(state.rngSeed), [state.rngSeed]);

  /**
   * Everything the chart needs to draw a chain, worked out once per render.
   *
   * Sorted by Sea first so the two chains of a Sea come out side by side: the
   * chart then reads as seas of archipelagos rather than ten unrelated
   * clusters. The Sea's own name is left off — it was drawn once and landed on
   * top of the chain names — and appears on the chain's panel instead.
   */
  /** Highwater. Always the Crown's, whichever side the player took — the seat
   *  of the world is a fact about the world, not about who is looking. */
  const seatId = state.factions.empire.hqSystemId;

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
        // The label hangs off the chain's vertical extent, not its radius:
        // those are the same for a round chain and a hundred units apart for
        // a long thin one.
        labelDrop: place.ry + CHAIN_PAD,
        // While choosing a destination, a chain is live only if something
        // in it can actually be sailed to.
        targets: systems.filter((s) => isMissionTarget(state, s, viewer)).length,
      };
    });
  }, [state, viewer, seatId]);

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

        {chains.map(({ sector, systems, summary, targets, spot, chainR, labelDrop }) => {
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
          // Below the chain normally; above it only if below would run off the
          // chart. The water band at the foot is fair game — that is what it is
          // for — so the limit is the whole view, not the painting.
          const below = spot.y + labelDrop + 34;
          // The foot of the chart is not free: the layer strip, its hint line
          // and the chart's own controls sit over the last 225 units of it.
          // Measured against the rendered page, not guessed.
          const flip = below + 100 > VIEW_H - 225;
          const labelY = flip ? spot.y - labelDrop - 56 : below;
          // The names still break at the last space — "Shipwrights'" over
          // "Reach 3/10" — which keeps every label inside its own column.
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
                const seat = system.id === seatId;
                // Where the painting put this island. Falling back to the old
                // seeded scatter keeps a Reach the position script has not
                // seen from piling all ten islands on one point.
                const at = ISLAND_PLACES.get(`${sector.name}/${system.name}`);
                const ax = at ? at.x : spot.x + system.x * 0.72;
                const ay = at ? at.y : spot.y + system.y * 0.72;
                const explored = system.explored[viewer];
                const radius = seat ? SEAT_RADIUS : islandRadius(system);
                const isHq =
                  system.id === state.factions[viewer].hqSystemId ||
                  (explored && system.id === state.factions[enemy].hqSystemId);
                const mark = filtering
                  ? layerMark(state, system, layer, viewer)
                  : { lit: false as const };
                return (
                  <g key={system.id} pointerEvents="none">
                    {mark.lit && (
                      <>
                        {/* Brass, because this is the interface pointing at
                            something rather than the world saying whose it is —
                            a faction colour here would read as allegiance. */}
                        <circle
                          className="map__lit"
                          cx={ax}
                          cy={ay}
                          r={radius + 9}
                        />
                        {mark.count !== undefined && mark.count > 1 && (
                          <text className="map__lit-n" x={ax + radius + 11} y={ay - radius - 3}>
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
                          fill={loyaltyColor(system, viewer)}
                          opacity={explored ? 0.42 : 0.14}
                        />
                        <circle
                          cx={ax}
                          cy={ay}
                          r={radius}
                          fill="none"
                          stroke={loyaltyColor(system, viewer)}
                          strokeWidth={explored ? 2.4 : 1.6}
                          strokeDasharray={explored ? undefined : '4 3.5'}
                          opacity={explored ? 0.95 : 0.5}
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
                          stroke={loyaltyColor(system, viewer)}
                          strokeWidth={explored ? 2.2 : 1.6}
                          strokeDasharray={explored ? undefined : '5 4'}
                        />
                        <path
                          d={islandPath(system.name, radius)}
                          transform={`translate(${ax} ${ay})`}
                          fill={loyaltyColor(system, viewer)}
                          opacity={explored ? 0.28 : 0.1}
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
                x={spot.x}
                y={labelY}
                pointerEvents="none"
              >
                {head && <tspan x={spot.x}>{head}</tspan>}
                <tspan x={spot.x} dy={head ? 36 : 0}>
                  {tail || head}
                  {summary.mutinies > 0 && <tspan className="map__chain-alarm"> ⚑</tspan>}
                </tspan>
              </text>
              <g pointerEvents="none">
                <rect x={spot.x - 46} y={labelY + (head ? 48 : 12)} width={92} height={9} rx={4.5} fill="#0a2b36" />
                {(() => {
                  let x = spot.x - 46;
                  return segmentsFor(
                    summary.allegiance.empire,
                    summary.allegiance.alliance,
                  ).map((segment) => {
                    const w = (92 * segment.pct) / 100;
                    const rect = (
                      <rect
                        key={segment.faction}
                        x={x}
                        y={labelY + (head ? 48 : 12)}
                        width={w}
                        height={9}
                        fill={allegianceColour(segment.faction)}
                      />
                    );
                    x += w;
                    return rect;
                  });
                })()}
              </g>
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
