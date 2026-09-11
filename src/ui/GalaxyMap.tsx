import { useMemo } from 'react';
import type { GameState, PlayableFaction, System } from '../sim';
import { isDiplomacyTarget, summariseReach } from '../sim';
import { allegianceColour, allegianceSegments, segmentsFor } from './allegiance';
import { CompassRose, islandPath } from './art';
import { ProducerLegend } from './ProducerLegend';

/**
 * The chart is laid out for a phone held upright, not for the square box the
 * simulation scatters its chains in.
 *
 * That is allowed because the coordinates are decoration: travel time depends
 * on whether two islands share a chain, never on how far apart they are drawn
 * (see travelDays). Nothing else reads them. So the chart places the ten
 * chains itself, in a tall field with room between them, instead of inheriting
 * two concentric rings that fit a square and leave a phone's screen half empty
 * with the labels stacked on top of each other.
 */
const CHART_W = 1000;
/** Tall enough to leave a clear band at the foot for the idle-producer strip
 *  and the chart's own controls, neither of which may sit on a chain's name. */
const CHART_H = 1900;
const CHAIN_R = 100;
/** Islands are scattered for a 105-unit disc; pull them into a 100-unit one. */
const ISLAND_SPREAD = 0.72;

/**
 * Where each chain sits. Staggered rather than gridded, so the chart reads as
 * archipelagos scattered across an ocean rather than as a table of contents.
 * Every pair is at least 290 apart, which leaves each one its disc and the two
 * lines of label beneath it without touching its neighbour.
 */
const CHAIN_SPOTS: Array<{ x: number; y: number }> = [
  { x: 270, y: 180 },
  { x: 730, y: 235 },
  { x: 180, y: 480 },
  { x: 650, y: 520 },
  { x: 300, y: 775 },
  { x: 780, y: 805 },
  { x: 200, y: 1065 },
  { x: 690, y: 1090 },
  { x: 320, y: 1355 },
  { x: 760, y: 1370 },
];

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
 * Sized up now that the view is fixed. Islands scatter with 38 units between
 * centres, so anything past a radius of 19 would run its neighbours over.
 */
function islandRadius(system: System): number {
  const weight = system.rawSlots + system.energySlots;
  return (system.populated ? 11 : 8) + Math.min(weight, 9) * 0.7;
}

export function GalaxyMap({
  state,
  pickingFor,
  sailing,
  onCancelPick,
  onOpenWorlds,
  onSelectReach,
  onOpenIsland,
}: GalaxyMapProps) {
  const viewer = state.player;
  const stipple = useMemo(() => seaStipple(state.rngSeed), [state.rngSeed]);

  /**
   * Everything the chart needs to draw a chain, worked out once per render.
   *
   * Sorted by Sea first so the two chains of a Sea come out side by side: the
   * chart then reads as seas of archipelagos rather than ten unrelated
   * clusters. The Sea's own name is left off — it was drawn once and landed on
   * top of the chain names — and appears on the chain's panel instead.
   */
  const chains = useMemo(
    () =>
      [...state.sectors]
        .sort((a, b) => a.sea.localeCompare(b.sea) || a.name.localeCompare(b.name))
        .map((sector, index) => {
          const systems = state.systems.filter((s) => s.sectorId === sector.id);
          const summary = summariseReach(state, sector.id, viewer);
          const spot = CHAIN_SPOTS[index % CHAIN_SPOTS.length];
          return {
            sector,
            systems,
            summary,
            spot,
            // While choosing a destination, a chain is live only if something
            // in it can actually be sailed to.
            targets: systems.filter((s) => isDiplomacyTarget(s, viewer)).length,
          };
        }),
    [state, viewer],
  );

  const enemy: PlayableFaction = viewer === 'empire' ? 'alliance' : 'empire';

  return (
    <>
      <svg className="map" viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="shoal">
            <stop offset="0%" stopColor="var(--shallow)" stopOpacity="0.5" />
            <stop offset="70%" stopColor="var(--shallow)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--shallow)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Rhumb lines and the chart's own compass, drawn under everything. */}
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

        {chains.map(({ sector, systems, summary, targets, spot }) => {
          // Sailing can go anywhere; a parley can only go where it is welcome.
          const live = sailing || !pickingFor || targets > 0;
          const labelY = spot.y + CHAIN_R + 40;
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
              opacity={live ? 1 : 0.35}
            >
              {/* The disc is the tap target: the whole chain, not any one island. */}
              <circle cx={spot.x} cy={spot.y} r={CHAIN_R} fill="url(#shoal)" />
              <circle className="map__sector-ring" cx={spot.x} cy={spot.y} r={CHAIN_R} />
              {(sailing || (pickingFor && targets > 0)) && (
                <circle className="map__pick" cx={spot.x} cy={spot.y} r={CHAIN_R + 7} />
              )}

              {systems.map((system) => {
                const ax = spot.x + system.x * ISLAND_SPREAD;
                const ay = spot.y + system.y * ISLAND_SPREAD;
                const explored = system.explored[viewer];
                const radius = islandRadius(system);
                const isHq =
                  system.id === state.factions[viewer].hqSystemId ||
                  (explored && system.id === state.factions[enemy].hqSystemId);
                return (
                  <g key={system.id} pointerEvents="none">
                    {isHq && (
                      <circle
                        className="map__hq"
                        cx={ax}
                        cy={ay}
                        r={radius + 7}
                        stroke={loyaltyColor(system, viewer)}
                      />
                    )}
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
      {!pickingFor && !sailing && <ProducerLegend state={state} onOpenIsland={onOpenIsland} />}

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
