import { useCallback, useMemo, useRef, useState } from 'react';
import type { GameState, PlayableFaction, System } from '../sim';
import { GALAXY_SIZE, SECTOR_RING_RADIUS, isDiplomacyTarget, seasOf } from '../sim';
import { CompassRose, NarratorPortrait, islandPath } from './art';

const CENTRE = GALAXY_SIZE / 2;
/** How far the view may be dragged before the galaxy would leave the screen. */
const PAN_LIMIT = GALAXY_SIZE * 0.9;

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 7;
/** Pointer travel (in screen px) above which a gesture counts as a pan, not a tap. */
const TAP_SLOP = 8;
/**
 * Below this zoom an island is a few pixels across and picking one is a
 * lottery, so the chart works at the level of whole Seas instead: tap the
 * water, then choose the island from a list you can read.
 */
const ISLAND_ZOOM = 1.5;

interface View {
  k: number;
  tx: number;
  ty: number;
}

export interface GalaxyMapProps {
  state: GameState;
  onSelectSystem: (systemId: string) => void;
  /** When set, the map is in "choose a destination" mode for this character. */
  pickingFor?: { characterId: string; faction: PlayableFaction } | null;
  focusSystemId?: string | null;
  onCancelPick?: () => void;
  onOpenWorlds?: () => void;
  /** Tapping the open water inside a Reach opens the whole Reach. */
  onSelectReach?: (sectorId: string) => void;
  onAskAdvisor?: () => void;
  /** Tapping a Sea while zoomed out, when islands are too small to aim at. */
  onSelectSea?: (sea: string) => void;
}

/** A view transform that puts `system` in the middle of the screen at zoom `k`. */
function viewCentredOn(state: GameState, systemId: string, k: number): View {
  const system = state.systems.find((s) => s.id === systemId);
  const sector = state.sectors.find((s) => s.id === system?.sectorId);
  if (!system || !sector) return { k: 1, tx: 0, ty: 0 };
  return { k, tx: CENTRE - (sector.x + system.x) * k, ty: CENTRE - (sector.y + system.y) * k };
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
  return Array.from({ length: 150 }, () => ({
    x: random() * GALAXY_SIZE,
    y: random() * GALAXY_SIZE,
    r: 0.5 + random() * 1.1,
    o: 0.06 + random() * 0.16,
  }));
}

/** Rhumb lines radiating from the chart's compass, as on a portolan chart. */
const RHUMB_ANGLES = Array.from({ length: 16 }, (_, i) => (i * 360) / 16);

function controlColor(system: System, viewer: PlayableFaction): string {
  if (!system.explored[viewer]) return 'var(--unknown)';
  switch (system.control) {
    case 'empire':
      return 'var(--empire)';
    case 'alliance':
      return 'var(--alliance)';
    case 'neutral':
      return 'var(--neutral)';
    default:
      return '#5d7079';
  }
}

/** How much of the chart an island takes up: settled ports draw larger. */
function islandRadius(system: System): number {
  const weight = system.rawSlots + system.energySlots;
  return (system.populated ? 8 : 5.5) + Math.min(weight, 9) * 0.45;
}

export function GalaxyMap({
  state,
  onSelectSystem,
  pickingFor,
  focusSystemId,
  onCancelPick,
  onOpenWorlds,
  onSelectReach,
  onAskAdvisor,
  onSelectSea,
}: GalaxyMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  // Open looking at your own capital rather than at the whole empty galaxy.
  const [view, setView] = useState<View>(() =>
    viewCentredOn(state, state.factions[state.player].hqSystemId, 2),
  );
  const gesture = useRef({
    pointers: new Map<number, { x: number; y: number }>(),
    startView: { k: 1, tx: 0, ty: 0 } as View,
    startPoint: { x: 0, y: 0 },
    startSpread: 0,
    moved: 0,
  });

  const viewer = state.player;
  const stipple = useMemo(() => seaStipple(state.rngSeed), [state.rngSeed]);
  const sectorById = useMemo(
    () => new Map(state.sectors.map((s) => [s.id, s] as const)),
    [state.sectors],
  );

  /** Client coordinates -> untransformed SVG user units. */
  const toUser = useCallback((x: number, y: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = x;
    point.y = y;
    const local = point.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }, []);

  const clamp = (v: View): View => ({
    k: v.k,
    // Keep at least a corner of the galaxy on screen at all times.
    tx: Math.min(PAN_LIMIT, Math.max(-PAN_LIMIT * v.k, v.tx)),
    ty: Math.min(PAN_LIMIT, Math.max(-PAN_LIMIT * v.k, v.ty)),
  });

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    g.moved = 0;
    g.startView = view;
    const points = [...g.pointers.values()];
    if (points.length === 1) {
      g.startPoint = toUser(points[0].x, points[0].y);
    } else if (points.length === 2) {
      g.startSpread = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const mid = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
      g.startPoint = toUser(mid.x, mid.y);
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    const previous = g.pointers.get(e.pointerId);
    if (!previous) return;
    g.moved += Math.hypot(e.clientX - previous.x, e.clientY - previous.y);
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const points = [...g.pointers.values()];
    if (points.length === 1) {
      const now = toUser(points[0].x, points[0].y);
      setView((v) =>
        clamp({
          ...v,
          tx: g.startView.tx + (now.x - g.startPoint.x),
          ty: g.startView.ty + (now.y - g.startPoint.y),
        }),
      );
    } else if (points.length === 2 && g.startSpread > 0) {
      const spread = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, g.startView.k * (spread / g.startSpread)));
      // Keep the point under the fingers pinned while scaling.
      const anchor = g.startPoint;
      setView(
        clamp({
          k,
          tx: anchor.x - ((anchor.x - g.startView.tx) / g.startView.k) * k,
          ty: anchor.y - ((anchor.y - g.startView.ty) / g.startView.k) * k,
        }),
      );
    }
  };

  const endPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    gesture.current.pointers.delete(e.pointerId);
  };

  const zoomBy = (factor: number) => {
    setView((v) => {
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k * factor));
      return clamp({
        k,
        tx: CENTRE - ((CENTRE - v.tx) / v.k) * k,
        ty: CENTRE - ((CENTRE - v.ty) / v.k) * k,
      });
    });
  };

  const centreOn = useCallback((system: System) => {
    const sector = sectorById.get(system.sectorId);
    if (!sector) return;
    const ax = sector.x + system.x;
    const ay = sector.y + system.y;
    setView(() => {
      const k = 3;
      return { k, tx: CENTRE - ax * k, ty: CENTRE - ay * k };
    });
  }, [sectorById]);

  // Recentre when the feed or the character list asks to jump somewhere.
  const lastFocus = useRef<string | null>(null);
  if (focusSystemId && focusSystemId !== lastFocus.current) {
    lastFocus.current = focusSystemId;
    const system = state.systems.find((s) => s.id === focusSystemId);
    if (system) queueMicrotask(() => centreOn(system));
  }
  if (!focusSystemId) lastFocus.current = null;

  /**
   * Selection runs on `click`, not `pointerup`: a sheet opened on pointerup is
   * still on screen when the browser dispatches the compatibility click, which
   * would land on the sheet's scrim and dismiss it again.
   */
  const tapSystem = (systemId: string) => {
    if (gesture.current.moved > TAP_SLOP) return;
    onSelectSystem(systemId);
  };

  /** A circle covering all of a Sea's Reaches, for drawing and for tapping. */
  const seaRegions = useMemo(() => {
    return seasOf(state).map((sea) => {
      const sectors = state.sectors.filter((s) => s.sea === sea);
      const x = sectors.reduce((t, s) => t + s.x, 0) / sectors.length;
      const y = sectors.reduce((t, s) => t + s.y, 0) / sectors.length;
      const r =
        Math.max(...sectors.map((s) => Math.hypot(s.x - x, s.y - y))) + SECTOR_RING_RADIUS + 12;
      return { sea, x, y, r };
    });
  }, [state.sectors]);

  /**
   * Which Sea a tap belongs to, by nearest centre.
   *
   * Drawing a circle per Sea and hanging the handler on it does not work: the
   * circles overlap heavily, so a tap in an overlap opens whichever happens to
   * be painted last. Nearest-centre partitions the whole chart with no gaps
   * and no ambiguity, and every tap lands on the Sea you were aiming at.
   */
  const tapSeaAt = (event: React.MouseEvent<SVGRectElement>) => {
    if (gesture.current.moved > TAP_SLOP) return;
    if (pickingFor) return;
    const point = toUser(event.clientX, event.clientY);
    const x = (point.x - view.tx) / view.k;
    const y = (point.y - view.ty) / view.k;
    let best: { sea: string; distance: number } | null = null;
    for (const region of seaRegions) {
      const distance = Math.hypot(region.x - x, region.y - y);
      if (!best || distance < best.distance) best = { sea: region.sea, distance };
    }
    if (best) onSelectSea?.(best.sea);
  };

  const tapReach = (sectorId: string) => {
    if (gesture.current.moved > TAP_SLOP) return;
    if (pickingFor) return; // Choosing a destination: only islands are targets.
    onSelectReach?.(sectorId);
  };

  const k = view.k;
  const showNames = k >= 1.9;
  // Far out, the chart is a chart of seas; close in, it is a chart of islands.
  const islandsLive = k >= ISLAND_ZOOM;
  // Once individual worlds are labelled, sector names are just clutter — and
  // they collide with the system labels of the cluster next door.
  const showSectorNames = !showNames && islandsLive;

  return (
    <>
      <svg
        ref={svgRef}
        className="map"
        viewBox={`0 0 ${GALAXY_SIZE} ${GALAXY_SIZE}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
      >
        <defs>
          <radialGradient id="shoal">
            <stop offset="0%" stopColor="var(--shallow)" stopOpacity="0.5" />
            <stop offset="70%" stopColor="var(--shallow)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--shallow)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={`translate(${view.tx} ${view.ty}) scale(${k})`}>
          {/* Rhumb lines and the chart's own compass, drawn under everything. */}
          <g pointerEvents="none">
            {RHUMB_ANGLES.map((deg) => {
              const t = (deg * Math.PI) / 180;
              return (
                <line
                  key={deg}
                  className="map__rhumb"
                  x1={CENTRE}
                  y1={CENTRE}
                  x2={CENTRE + Math.cos(t) * GALAXY_SIZE}
                  y2={CENTRE + Math.sin(t) * GALAXY_SIZE}
                  strokeWidth={0.6 / k}
                />
              );
            })}
            <g transform={`translate(${CENTRE} ${CENTRE})`} color="#17505f">
              <CompassRose size={150} opacity={0.28} showLetters={false} />
            </g>
            {stipple.map((dot, index) => (
              <circle
                key={index}
                cx={dot.x}
                cy={dot.y}
                r={dot.r}
                fill="#7fb7c8"
                opacity={dot.o}
              />
            ))}
          </g>

          {!islandsLive && (
            <>
              {/* One hit area for the whole chart; nearest centre decides. */}
              <rect
                x={-GALAXY_SIZE}
                y={-GALAXY_SIZE}
                width={GALAXY_SIZE * 3}
                height={GALAXY_SIZE * 3}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onClick={tapSeaAt}
              />
              {/* Names only, no boundaries drawn: a tap goes to the nearest
                  Sea, and a ring would draw a border that is not really there. */}
              {seaRegions.map((region) => (
                <text
                  key={region.sea}
                  className="map__sea-label"
                  x={region.x}
                  y={region.y - region.r * 0.62}
                  fontSize={30 / k}
                  pointerEvents="none"
                >
                  {region.sea}
                </text>
              ))}
            </>
          )}

          {state.sectors.map((sector) => (
            <g key={sector.id}>
              <circle
                cx={sector.x}
                cy={sector.y}
                r={SECTOR_RING_RADIUS}
                fill="url(#shoal)"
                style={{ cursor: islandsLive ? 'pointer' : 'default' }}
                pointerEvents={islandsLive ? 'auto' : 'none'}
                onClick={() => tapReach(sector.id)}
              />
              <circle
                className="map__sector-ring"
                cx={sector.x}
                cy={sector.y}
                r={SECTOR_RING_RADIUS}
                strokeWidth={1.5 / k}
              />
              {showSectorNames && (
                <text
                  className="map__sector-label"
                  x={sector.x}
                  y={sector.y - SECTOR_RING_RADIUS - 14}
                  fontSize={15 / k}
                  style={{ cursor: 'pointer' }}
                  onClick={() => tapReach(sector.id)}
                >
                  {sector.name}
                </text>
              )}
            </g>
          ))}

          {state.systems.map((system) => {
            const sector = sectorById.get(system.sectorId)!;
            const ax = sector.x + system.x;
            const ay = sector.y + system.y;
            const explored = system.explored[viewer];
            const known = explored && system.populated;
            const radius = islandRadius(system);
            const isHq =
              system.id === state.factions[viewer].hqSystemId ||
              (explored && system.id === state.factions[viewer === 'empire' ? 'alliance' : 'empire'].hqSystemId);
            const pickable =
              !!pickingFor && isDiplomacyTarget(system, pickingFor.faction);

            return (
              <g
                key={system.id}
                onClick={islandsLive ? () => tapSystem(system.id) : undefined}
                style={{ cursor: islandsLive ? 'pointer' : 'default' }}
                pointerEvents={islandsLive ? 'auto' : 'none'}
              >
                {/* Generous invisible hit area for fingers. */}
                {islandsLive && (
                  <circle cx={ax} cy={ay} r={Math.max(14, 20 / k)} fill="transparent" />
                )}
                {pickable && (
                  <circle className="map__pick" cx={ax} cy={ay} r={radius + 5} strokeWidth={2 / k} />
                )}
                {isHq && (
                  <circle
                    className="map__hq"
                    cx={ax}
                    cy={ay}
                    r={radius + 6}
                    stroke={controlColor(system, viewer)}
                    strokeWidth={2 / k}
                  />
                )}
                {/* Shelf of shallows, then the coastline itself. */}
                <path
                  d={islandPath(system.name, radius + 4)}
                  transform={`translate(${ax} ${ay})`}
                  fill="var(--shallow)"
                  opacity={explored ? 0.5 : 0.25}
                  pointerEvents="none"
                />
                <path
                  className="map__coast"
                  d={islandPath(system.name, radius)}
                  transform={`translate(${ax} ${ay})`}
                  fill={system.populated ? 'var(--land)' : 'var(--land-bare)'}
                  stroke={controlColor(system, viewer)}
                  strokeWidth={(explored ? 1.8 : 1.2) / k}
                  strokeDasharray={explored ? undefined : `${3 / k} ${2.5 / k}`}
                  pointerEvents="none"
                />
                <path
                  d={islandPath(system.name, radius)}
                  transform={`translate(${ax} ${ay})`}
                  fill={controlColor(system, viewer)}
                  opacity={explored ? 0.28 : 0.1}
                  pointerEvents="none"
                />
                {system.uprising && explored && (
                  <path
                    d={`M ${ax - radius * 0.5} ${ay - radius - 2} l 0 -7 l ${radius * 0.9} 2.6 l ${-radius * 0.9} 2.6 z`}
                    fill="#b8433a"
                    pointerEvents="none"
                  />
                )}
                {known && (
                  <g>
                    <rect
                      x={ax - 9}
                      y={ay + radius + 3}
                      width={18}
                      height={2.6}
                      rx={1.3}
                      fill="#0a2b36"
                    />
                    <rect
                      x={ax - 9}
                      y={ay + radius + 3}
                      width={(18 * system.support.empire) / 100}
                      height={2.6}
                      rx={1.3}
                      fill="var(--empire)"
                    />
                    <rect
                      x={ax - 9 + 18 - (18 * system.support.alliance) / 100}
                      y={ay + radius + 3}
                      width={(18 * system.support.alliance) / 100}
                      height={2.6}
                      rx={1.3}
                      fill="var(--alliance)"
                      opacity={0.9}
                    />
                  </g>
                )}
                {showNames && explored && (
                  <text
                    className="map__system-label"
                    x={ax}
                    y={ay + radius + 14}
                    fontSize={9 / k}
                  >
                    {system.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {onAskAdvisor && !pickingFor && (
        <button className="advisor" onClick={onAskAdvisor} aria-label="Ask your advisor">
          <NarratorPortrait faction={state.player} size={46} />
        </button>
      )}

      <div className="map__hud">
        {pickingFor ? (
          <button className="chip chip--pick" onClick={onCancelPick}>
            Tap a highlighted island · cancel
          </button>
        ) : islandsLive ? (
          <button className="chip chip--action" onClick={onOpenWorlds}>
            My islands
          </button>
        ) : (
          <span className="chip">Tap a sea, or zoom in</span>
        )}
        <span className="topbar__spacer" />
        <button className="chip chip--action" onClick={() => zoomBy(1 / 1.5)} aria-label="Zoom out">
          −
        </button>
        <button className="chip chip--action" onClick={() => zoomBy(1.5)} aria-label="Zoom in">
          +
        </button>
        <button
          className="chip chip--action"
          onClick={() => setView({ k: 1, tx: 0, ty: 0 })}
          aria-label="Show all seven seas"
        >
          ⤢
        </button>
      </div>
    </>
  );
}
