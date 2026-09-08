import { useCallback, useMemo, useRef, useState } from 'react';
import type { GameState, PlayableFaction, System } from '../sim';
import { GALAXY_SIZE, SECTOR_RING_RADIUS, isDiplomacyTarget } from '../sim';

const CENTRE = GALAXY_SIZE / 2;
/** How far the view may be dragged before the galaxy would leave the screen. */
const PAN_LIMIT = GALAXY_SIZE * 0.9;

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 7;
/** Pointer travel (in screen px) above which a gesture counts as a pan, not a tap. */
const TAP_SLOP = 8;

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
}

/** A view transform that puts `system` in the middle of the screen at zoom `k`. */
function viewCentredOn(state: GameState, systemId: string, k: number): View {
  const system = state.systems.find((s) => s.id === systemId);
  const sector = state.sectors.find((s) => s.id === system?.sectorId);
  if (!system || !sector) return { k: 1, tx: 0, ty: 0 };
  return { k, tx: CENTRE - (sector.x + system.x) * k, ty: CENTRE - (sector.y + system.y) * k };
}

/**
 * Backdrop stars, derived from the game's own seed so they stay put across
 * renders and come back identical after a reload.
 */
function starfield(seed: number) {
  let s = seed >>> 0;
  const random = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  return Array.from({ length: 160 }, () => ({
    x: random() * GALAXY_SIZE,
    y: random() * GALAXY_SIZE,
    r: 0.6 + random() * 1.6,
    o: 0.12 + random() * 0.3,
  }));
}

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
      return '#33405e';
  }
}

export function GalaxyMap({
  state,
  onSelectSystem,
  pickingFor,
  focusSystemId,
  onCancelPick,
  onOpenWorlds,
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
  const stars = useMemo(() => starfield(state.rngSeed), [state.rngSeed]);
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

  const k = view.k;
  const showNames = k >= 1.9;
  // Once individual worlds are labelled, sector names are just clutter — and
  // they collide with the system labels of the cluster next door.
  const showSectorNames = !showNames;

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
        <g transform={`translate(${view.tx} ${view.ty}) scale(${k})`}>
          {stars.map((star, index) => (
            <circle
              key={index}
              cx={star.x}
              cy={star.y}
              r={star.r}
              fill="#c9d6ef"
              opacity={star.o}
            />
          ))}

          {state.sectors.map((sector) => (
            <g key={sector.id}>
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
            const radius = system.populated ? 7 : 4.5;
            const isHq =
              system.id === state.factions[viewer].hqSystemId ||
              (explored && system.id === state.factions[viewer === 'empire' ? 'alliance' : 'empire'].hqSystemId);
            const pickable =
              !!pickingFor && isDiplomacyTarget(system, pickingFor.faction);

            return (
              <g key={system.id} onClick={() => tapSystem(system.id)} style={{ cursor: 'pointer' }}>
                {/* Generous invisible hit area for fingers. */}
                <circle cx={ax} cy={ay} r={Math.max(14, 20 / k)} fill="transparent" />
                {pickable && (
                  <circle className="map__pick" cx={ax} cy={ay} r={radius + 5} strokeWidth={2 / k} />
                )}
                {isHq && (
                  <circle
                    className="map__hq"
                    cx={ax}
                    cy={ay}
                    r={radius + 3.5}
                    stroke={controlColor(system, viewer)}
                    strokeWidth={2 / k}
                  />
                )}
                <circle
                  cx={ax}
                  cy={ay}
                  r={radius}
                  fill={controlColor(system, viewer)}
                  opacity={explored ? 1 : 0.55}
                />
                {system.uprising && explored && (
                  <circle cx={ax} cy={ay} r={radius * 0.4} fill="#0b1120" />
                )}
                {known && (
                  <g>
                    <rect
                      x={ax - 9}
                      y={ay + radius + 2}
                      width={18}
                      height={2.6}
                      rx={1.3}
                      fill="#16203a"
                    />
                    <rect
                      x={ax - 9}
                      y={ay + radius + 2}
                      width={(18 * system.support.empire) / 100}
                      height={2.6}
                      rx={1.3}
                      fill="var(--empire)"
                    />
                    <rect
                      x={ax - 9 + 18 - (18 * system.support.alliance) / 100}
                      y={ay + radius + 2}
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
                    y={ay + radius + 12}
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

      <div className="map__hud">
        {pickingFor ? (
          <button className="chip chip--pick" onClick={onCancelPick}>
            Tap a highlighted world · cancel
          </button>
        ) : (
          <button className="chip chip--action" onClick={onOpenWorlds}>
            My worlds
          </button>
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
          aria-label="Show the whole galaxy"
        >
          ⤢
        </button>
      </div>
    </>
  );
}
