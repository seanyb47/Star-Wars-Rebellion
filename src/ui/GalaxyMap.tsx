import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState, PlayableFaction, System } from '../sim';
import {
  isMissionTarget,
  layerMark,
  lordFleets,
  loyaltyBand,
  type LayerMark,
  type LoyaltyBand,
  type MarkSize,
  summariseReach,
  isLoudLayer,
  showsNumber,
  type ChartLayer,
} from '../sim';
import { burstPath } from './worth';
import { LayerStrip, useLayerSwipe } from './LayerStrip';
import { allegianceColour } from './allegiance';
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
 * The chart is as wide as the screen, whatever the screen.
 *
 * The painting is 1000 by 1500 and no phone's map area is. Every fixed
 * answer to that left something blank or small: "meet" left a gutter of
 * flat water down each side on a phone with browser chrome, "slice" cropped
 * Rime's peaks on a tablet, and shaping the canvas to the box — mirrored
 * strips down each side — kept the painting at three-quarters of the width
 * on any screen shorter than two-to-three, which with a browser's bars is
 * most of them. So the painting now takes the full width, always. On a
 * screen taller than that leaves, the rest is a band of open water under
 * it: the painting's own foot mirrored downward and darkened into deeper
 * water, seamless at the join by construction. On a screen shorter, the
 * chart is taller than its box and scrolls — up and down only; there is
 * still no zoom — with the layer strip out of the way in its own row below,
 * so it never covers an island. Nothing is ever cropped: every island and
 * every name is on the chart at every size, at the biggest it can be.
 */
/** What to assume before the element has been measured: a phone. */
const ASSUMED_BOX = { w: 390, h: 650 };

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
  /** A build order is choosing the island of yours it will land on. */
  choosing?: boolean;
  onCancelPick?: () => void;
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
    y: random() * CHART_H,
    r: 0.5 + random() * 1.1,
    o: 0.06 + random() * 0.16,
  }));
}

/** Rhumb lines radiating from the chart's compass, as on a portolan chart. */
const RHUMB_ANGLES = Array.from({ length: 16 }, (_, i) => (i * 360) / 16);

/**
 * Out here an island is painted by **who holds it**, and by nothing else.
 *
 * Green is the Crown's, red the Confederacy's, blue nobody's yet, grey not
 * charted or not lived on. It was painted by which way its people leaned for
 * a while, and that was cleverer and worse: a filter that dimmed the islands
 * that did not answer it left half the chart unreadable, and a colour that
 * could change without the island changing hands was a colour you could not
 * trust at a glance. Control never lies. Lean is on the island's own panel.
 */
export function controlColor(system: System, viewer: PlayableFaction): string {
  // Unexplored first, before anything about whose it is: an island you have
  // not been to is grey whoever holds it. Checking control first painted the
  // Confederacy's hidden harbor red on the Crown's chart for one build,
  // which is the one thing this chart must never do.
  if (!system.explored[viewer]) return OPEN_GREY;
  if (system.control === 'empire' || system.control === 'alliance') {
    return allegianceColour(system.control);
  }
  // One grey for both the unexplored and the unsettled: either way it is
  // nobody's and open, and a second shade to tell them apart was a
  // distinction nobody read. The dashed edge says which. Light enough to be
  // seen against the water — the old --unknown was a ghost, and a ghost was
  // as good as hidden.
  return system.populated ? 'var(--neutral)' : OPEN_GREY;
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
// Sixteen, up from eight: at eight a mark was six pixels across on a phone
// and its colour was a rumour. The marks sit no closer than 60 units, so
// sixteen still leaves clear water between neighbours.
const ISLAND_RADIUS = 16;
/**
 * One mark, three sizes.
 *
 * Sean's rule, 14 September: the chart says things by making a dot bigger or
 * smaller, never by changing what the dot is. Medium is the size it has always
 * been and means nothing in particular; large is the answer to whatever is
 * being asked; small is everything that is not. The only marks that are not a
 * dot are the star — Highwater and the Pirate Lords, and nothing else ever —
 * and a count, where the number is the mark.
 */
const DOT_SMALL = 10;
const DOT_MEDIUM = ISLAND_RADIUS;
const DOT_LARGE = 26;
const DOT: Record<MarkSize, number> = {
  small: DOT_SMALL,
  medium: DOT_MEDIUM,
  large: DOT_LARGE,
};
/** The loyalty bands, in the same three sizes. */
const LOYALTY_DOT: Record<LoyaltyBand, MarkSize> = {
  firm: 'large',
  steady: 'medium',
  thin: 'small',
  uprising: 'small',
};
/** Unexplored or unsettled: open ground. Readable on dark water at 8px. */
export const OPEN_GREY = '#93a3ab';
/** The dot itself for open ground: near white, so it reads on the water. */
const OPEN_FILL = '#dfe8ec';
/** The loud filters — idle works, idle crew, fleets — keep their pulse behind
 *  the large dot, so a squadron is found from across the chart. */
const IDLE_HALO_RADIUS = 52;
/**
 * The star, and only the star, marks the things the war is about: Highwater,
 * and every island a Pirate Lord's ship is lying off — your own always, the
 * enemy's once you have charted the island. Nothing else on the chart is a
 * star. Thirty percent up on the old capital mark, at Sean's ask.
 */
const HQ_STAR_RADIUS = 40;

/**
 * The loyalty the chart sizes an island by: its regard for whoever holds it,
 * or — on an island nobody holds — its regard for you, which is the number
 * that decides whether it is worth a parley.
 */
export function chartLoyalty(system: System, viewer: PlayableFaction): number {
  if (system.control === 'empire' || system.control === 'alliance') {
    return system.support[system.control];
  }
  return system.support[viewer];
}

/** One kite-shaped point of the compass rose, tip to centre. */
function rosePoint(angle: number, long: number, wide: number): string {
  const at = (deg: number, rad: number) => {
    const t = (deg * Math.PI) / 180;
    return `${(Math.cos(t) * rad).toFixed(2)} ${(Math.sin(t) * rad).toFixed(2)}`;
  };
  return `M ${at(angle, long)} L ${at(angle + 90, wide)} L ${at(angle + 180, long * 0.06)} L ${at(angle - 90, wide)} Z`;
}

export function GalaxyMap({
  state,
  pickingFor,
  sailing,
  choosing,
  onCancelPick,
  onSelectReach,
  onOpenIsland,
  layer = 'allegiance',
  onLayerChange,
}: GalaxyMapProps) {
  const viewer = state.player;
  const ground = paintedChart('seas');
  const swipe = useLayerSwipe(layer, onLayerChange ?? (() => {}));

  /**
   * Full width at any size. The scroll box's own size, measured — the bars
   * above and below are what set it, not the viewport — and from it the
   * canvas the chart draws on: the painting at the box's width, plus the
   * band of water that fills a taller box. See the note on ASSUMED_BOX.
   */
  const frame = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState(ASSUMED_BOX);
  useEffect(() => {
    const el = frame.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const check = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) setBox({ w: width, h: height });
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Picking a destination is a different question from reading the chart, so
  // the layers stand down while it is happening rather than fighting the
  // pick rings for the same dimming.
  const filtering = layer !== 'allegiance' && layer !== 'none' && !pickingFor && !sailing && !choosing;
  // None: the painting and the Reach names, nothing marked. Picking a target
  // or sailing still needs the marks, so those override it.
  const bare = layer === 'none' && !pickingFor && !sailing && !choosing;

  const stipple = useMemo(() => seaStipple(state.rngSeed), [state.rngSeed]);

  /**
   * Where the officer waiting for a destination is standing.
   *
   * Sean: "sometimes I go to send someone on mission and I'm like, shit,
   * where was he?" — and the chart was no help, because picking a target used
   * to look like reading the chart: every island at its allegiance size, the
   * capital a star, rings round every chain that would take the errand. Lots
   * of marks, none of them the one being asked about.
   *
   * So while a destination is being picked the chart says one thing. Every
   * island drops to a small dot in the colour of whoever holds it — the
   * allegiance and nothing else, capital included — and the only thing that
   * moves on the whole chart is the island the officer is on.
   */
  const pickerAt = pickingFor
    ? state.characters.find((c) => c.id === pickingFor.characterId)?.locationSystemId
    : undefined;

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

  const lordsAt = new Set(lordFleets(state).filter((f) => !f.voyage).map((f) => f.systemId));

  // The canvas: the painting at the box's full width. A taller box gets a
  // band of water under the painting to fill it; a shorter one gets a chart
  // taller than itself, and scrolls.
  const scale = box.w / CHART_W;
  const viewH = Math.max(CHART_H, Math.round(box.h / scale));
  const band = viewH - CHART_H;
  const chartPx = Math.max(box.h, Math.round(viewH * scale));

  return (
    <>
      <div className="map__scroll" ref={frame}>
      <svg
        className={ground ? 'map map--painted' : 'map'}
        viewBox={`0 0 ${CHART_W} ${viewH}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ height: chartPx }}
        {...swipe}
      >
        <defs>
          {/* The painting lifted. It is a dark sea — luma 20 to 25 across
              most of it — and on a phone in daylight that is a black
              rectangle with dots on. A gamma curve rather than a flat
              brightness: the shadows come up and the islands, already
              bright, are not pushed into white. */}
          <filter id="chart-lift" colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncR type="gamma" amplitude="1" exponent="0.72" offset="0.03" />
              <feFuncG type="gamma" amplitude="1" exponent="0.72" offset="0.03" />
              <feFuncB type="gamma" amplitude="1" exponent="0.72" offset="0.03" />
            </feComponentTransfer>
          </filter>
          {/* The strips beyond the painting's edge: lifted the same, then
              put out of focus. Mirrored, the painting's own chains would
              show again beside themselves; blurred, they are the sea
              going on past the chart, which is all the strips are for. */}
          <filter id="chart-edge" colorInterpolationFilters="sRGB" x="-5%" y="-5%" width="110%" height="110%">
            <feComponentTransfer>
              <feFuncR type="gamma" amplitude="1" exponent="0.72" offset="0.03" />
              <feFuncG type="gamma" amplitude="1" exponent="0.72" offset="0.03" />
              <feFuncB type="gamma" amplitude="1" exponent="0.72" offset="0.03" />
            </feComponentTransfer>
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <radialGradient id="shoal">
            <stop offset="0%" stopColor="var(--shallow)" stopOpacity="0.5" />
            <stop offset="70%" stopColor="var(--shallow)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--shallow)" stopOpacity="0" />
          </radialGradient>
          {/* The painting's foot into deeper water. Long, because a short
              fade over a bright edge reads as a horizon line across the
              chart; and never to full, because a flat strip at the bottom is
              a border, and the sea under the layer strip should still be sea. */}
          <linearGradient id="chart-foot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--water)" stopOpacity="0" />
            <stop offset="55%" stopColor="var(--water)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--water)" stopOpacity="0.45" />
          </linearGradient>
          {/* The band under the painting, the same: nothing at the seam. */}
          <linearGradient id="chart-south" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--water)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--water)" stopOpacity="0.7" />
          </linearGradient>
          {/* The band's clip reaches six units under the painting, which is
              drawn over it: no hairline of background at the seam where two
              antialiased edges meet. */}
          <clipPath id="chart-band">
            <rect x={0} y={CHART_H - 6} width={CHART_W} height={band + 6} />
          </clipPath>
        </defs>

        {ground && band > 0 && (
          <g pointerEvents="none">
            {/* The band: the painting's last rows mirrored downward, so the
                sea continues past the painting's edge instead of stopping at
                it, and darkened so it reads as deeper water rather than a
                reflection. Drawn flipped at twice the height and clipped to
                the band, which puts the painting's bottom row on the seam. */}
            <g clipPath="url(#chart-band)">
              {/* Sharp under blurred: the blur's soft edge at the seam then
                  fades into the same sea, not into the background. */}
              <image
                href={ground}
                x={0}
                y={-2 * CHART_H}
                width={CHART_W}
                height={CHART_H}
                preserveAspectRatio="xMidYMid slice"
                transform="scale(1 -1)"
                filter="url(#chart-lift)"
              />
              <image
                href={ground}
                x={0}
                y={-2 * CHART_H}
                width={CHART_W}
                height={CHART_H}
                preserveAspectRatio="xMidYMid slice"
                transform="scale(1 -1)"
                filter="url(#chart-edge)"
              />
              <rect x={0} y={CHART_H} width={CHART_W} height={band} fill="url(#chart-south)" />
            </g>
          </g>
        )}
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
            filter="url(#chart-lift)"
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

        {/* A compass rose in a corner with nothing but water.
            South-west at Sean's word. It sat south-east, which is the
            cartographer's habit and the wrong corner here: the south-east is
            where Coral Reach comes down and where the eye is already going
            when it follows the chain south. */}
        <g className="map__compass" transform="translate(112 1398)" pointerEvents="none">
          <svg x={-66} y={-66} width={132} height={132} viewBox="-60 -60 120 120" overflow="visible">
            <circle r="50" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
            <circle r="39" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            {[45, 135, 225, 315].map((a) => (
              <path key={a} d={rosePoint(a, 36, 5)} fill="currentColor" opacity="0.35" />
            ))}
            {[0, 90, 180, 270].map((a) => (
              <path key={a} d={rosePoint(a, 47.5, 7)} fill="currentColor" opacity="0.75" />
            ))}
            <circle r="3" fill="currentColor" />
            <text x="0" y="-52" textAnchor="middle" fontSize="11" fill="currentColor" fontFamily="Georgia, serif">N</text>
            <text x="0" y="60" textAnchor="middle" fontSize="9" fill="currentColor" fontFamily="Georgia, serif" opacity="0.7">S</text>
            <text x="-56" y="3.5" textAnchor="middle" fontSize="9" fill="currentColor" fontFamily="Georgia, serif" opacity="0.7">W</text>
            <text x="56" y="3.5" textAnchor="middle" fontSize="9" fill="currentColor" fontFamily="Georgia, serif" opacity="0.7">E</text>
          </svg>
        </g>

        {/* The painting's foot into deeper water, over the seam. */}
        {ground && (
          <rect x={0} y={CHART_H - 220} width={CHART_W} height={220} fill="url(#chart-foot)" pointerEvents="none" />
        )}

        {chains.map(({ sector, systems, summary, targets, spot, chainR, label }) => {
          // Sailing can go anywhere; a parley can only go where it is welcome.
          // A chain that cannot take the errand steps back. The chain the
          // officer is standing in never does, whatever it can offer: it is
          // the answer to "where is he", and dimming it to a third would bury
          // the one mark on the chart that is pulsing.
          const holdsPicker = pickerAt !== undefined && systems.some((s) => s.id === pickerAt);
          const live = sailing || choosing || !pickingFor || targets > 0 || holdsPicker;
          // Under a layer, a chain holding no answer drops back so the ones
          // that do carry the eye. It stays tappable — a filter is a way of
          // looking, not a lock on where you can go.
          // A chain's name never fades for a filter. Everything on the chart
          // stays where it is and how it looks; the stars do the pointing.
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
              opacity={live ? 1 : 0.35}
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
              {(sailing || choosing || (pickingFor && targets > 0)) && (
                <circle className="map__pick" cx={spot.x} cy={spot.y} r={chainR + 7} />
              )}

              {systems.map((system) => {

                // Where the painting put this island. Falling back to the old
                // seeded scatter keeps a Reach the position script has not
                // seen from piling all ten islands on one point.
                const at = ISLAND_PLACES.get(`${sector.name}/${system.chartName ?? system.name}`);
                const ax = at ? at.x : spot.x + system.x * 0.72;
                const ay = at ? at.y : spot.y + system.y * 0.72;
                const explored = system.explored[viewer];
                // Every island is on the chart, always. One you have not been
                // to is grey with a dashed edge: open ground, somewhere to
                // survey and settle. Hiding them was tried and looked wrong —
                // a sea with islands painted on it and nothing marking them.
                // Highwater, always; the Lords' ships wherever they lie at
                // anchor — the Confederacy sees its own, the Crown sees the
                // ones on islands it has charted.
                const isHq =
                  system.id === state.factions.empire.hqSystemId ||
                  (lordsAt.has(system.id) && (viewer === 'alliance' || explored));
                const mark: LayerMark = filtering
                  ? layerMark(state, system, layer, viewer)
                  : { lit: false };
                // Every island is always on the chart, always in its own
                // colour, whatever filter is on. A filter changes one thing:
                // the islands that answer it are drawn as a star instead of a
                // dot. Nothing dims, nothing glows, nothing changes colour —
                // an earlier version did all three and left half the chart
                // unreadable to say something a star says on its own.
                const lit = filtering && mark.lit;
                const tint = controlColor(system, viewer);
                // Production and every idle layer: the number is the mark. A
                // star with "4" beside it said the same thing twice; the count
                // on its own, in the island's colour, is the whole answer —
                // and on the idle layers it is the number of things there
                // waiting for an order.
                const numeral = lit && showsNumber(layer) && mark.count !== undefined ? mark.count : null;
                // Open ground has to be seen on dark water: a light fill and a
                // dark outline, dashed where you have not been. The slate at
                // real opacity still sank into the sea.
                const open = !explored || (system.control !== 'empire' && system.control !== 'alliance' && !system.populated);
                // Idle works, idle crew and fleets are the things you are
                // looking for, so their mark is bigger than any other
                // filter's and pulses: found from across the chart, not
                // searched for.
                const idle = lit && isLoudLayer(layer);
                /**
                 * How big this island's dot is, and the whole of what the
                 * chart is saying. Under a filter: large if it answers, small
                 * if it does not. At rest, on Loyalty: large for an island
                 * that is firmly its holder's, medium for one that is steady,
                 * small for one that is thin or in revolt — the same three
                 * bands that decide how much of its trade the smugglers take.
                 * An island you have never charted keeps its loyalty to
                 * itself, so it is small.
                 */
                const radius = pickingFor
                  ? DOT_SMALL
                  : filtering
                    ? lit
                      ? DOT[mark.size ?? 'large']
                      : DOT_SMALL
                    : !explored
                      ? DOT_SMALL
                      : DOT[LOYALTY_DOT[loyaltyBand(chartLoyalty(system, viewer), system.uprising)]];
                // The one island the player is actually looking for.
                const here = pickerAt === system.id;
                if (bare) return null;
                return (
                  <g key={system.id} pointerEvents="none">
                    {(idle || here) && (
                      <circle
                        className="map__idle-halo"
                        cx={ax}
                        cy={ay}
                        r={IDLE_HALO_RADIUS}
                        fill={here ? 'var(--metal-hi)' : tint}
                      />
                    )}
                    {lit && numeral === null && mark.size === undefined && mark.count !== undefined && mark.count > 1 && (
                      <text
                        className="map__lit-n"
                        x={ax + radius + 6}
                        y={ay - radius + 2}
                        fill={tint}
                      >
                        {mark.count}
                      </text>
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
                        {(() => {
                          /* One set of strengths, whatever shape carries them.
                             Fill and stroke go on a single element here rather
                             than two stacked ones, because a star drawn twice
                             puts a seam down every point. */
                          const skin = open
                            ? {
                                fill: OPEN_FILL,
                                fillOpacity: 0.9,
                                stroke: '#041219',
                                strokeOpacity: 0.9,
                                strokeWidth: 3,
                                strokeDasharray: explored ? undefined : '3 2.5',
                                strokeLinejoin: 'round' as const,
                              }
                            : {
                                // Solid colour with a dark edge. A tinted ring
                                // at forty percent vanished into the painting's
                                // own greens and blues; the edge is what makes
                                // a mark read as a mark on a busy chart.
                                fill: tint,
                                fillOpacity: 0.96,
                                stroke: '#041219',
                                strokeOpacity: 0.92,
                                strokeWidth: 3,
                                strokeLinejoin: 'round' as const,
                              };
                          // The count as the mark, or the filter's star.
                          if (numeral !== null) {
                            return (
                              <text className="map__num" x={ax} y={ay} fill={tint}>
                                {numeral}
                              </text>
                            );
                          }
                          // A capital is the star, always, and larger than any
                          // filter's: the shape alone says seat of the war. It
                          // used to wear a ring as well, which was saying it
                          // twice.
                          if (isHq && !pickingFor) {
                            return (
                              <path
                                d={burstPath(HQ_STAR_RADIUS)}
                                transform={`translate(${ax} ${ay})`}
                                {...skin}
                                strokeWidth={idle ? 3 : skin.strokeWidth}
                              />
                            );
                          }
                          // Everything else is the dot, at whatever size it
                          // has earned. A filter's answer is the same mark as
                          // the island next to it, drawn bigger.
                          return <circle cx={ax} cy={ay} r={radius} {...skin} />;
                        })()}
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
                          opacity={1}
                        />
                        <path
                          d={islandPath(system.name, radius)}
                          transform={`translate(${ax} ${ay})`}
                          fill={tint}
                          opacity={lit ? 0.9 : explored ? 0.28 : 0.1}
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
      </div>

      {/* What is standing idle, always on screen: a yard building nothing is
          gold you are not spending, and nothing else says so. */}
      {/* A shut harbor, under every layer: it costs you a day's takings
          whatever you happen to be looking at. */}
      {!pickingFor && !sailing && !choosing && <ProducerLegend state={state} onOpenIsland={onOpenIsland} />}

      {!pickingFor && !sailing && !choosing && onLayerChange && (
        <LayerStrip state={state} layer={layer} onChange={onLayerChange} viewer={viewer} />
      )}

      <div className="map__hud">
        {sailing ? (
          <button className="chip chip--pick" onClick={onCancelPick}>
            Open a chain and pick where to sail · cancel
          </button>
        ) : choosing ? (
          <button className="chip chip--pick" onClick={onCancelPick}>
            Open a chain and pick an island of yours to build on · back
          </button>
        ) : pickingFor ? (
          <button className="chip chip--pick" onClick={onCancelPick}>
            {/* Name the officer and where they are standing. The pulse on the
                chart says which island; this says it in words, for the case
                where the island is behind your thumb. */}
            {(() => {
              const who = state.characters.find((c) => c.id === pickingFor.characterId);
              const at = state.systems.find((sy) => sy.id === pickerAt);
              return who && at
                ? `${who.name.split(' ').slice(-1)[0]} is on ${at.name} · pick an island · cancel`
                : 'Open a chain and pick an island · cancel';
            })()}
          </button>
        ) : null}
      </div>
    </>
  );
}
