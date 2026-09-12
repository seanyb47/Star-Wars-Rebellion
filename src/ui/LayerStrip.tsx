import { useEffect, useRef } from 'react';
import { CHART_LAYERS, layerTally, type ChartLayer, type GameState, type PlayableFaction } from '../sim';

/**
 * The chart's view switch, after the original's view menu — but swipeable,
 * because a menu on a phone is two taps and a decision, and a swipe is a
 * thumb.
 *
 * It sits where the pick chip sits, at the foot of the chart, and it shows the
 * tally beside each name so you can see there is something to look at before
 * you go and look. A zero on Idle works is the one number in the game that
 * means you are wasting nothing, so it is shown rather than hidden.
 */
export function LayerStrip({
  state,
  layer,
  onChange,
  viewer,
}: {
  state: GameState;
  layer: ChartLayer;
  onChange: (layer: ChartLayer) => void;
  viewer: PlayableFaction;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const spec = CHART_LAYERS.find((l) => l.id === layer)!;

  // Keep the live chip in view when the layer changes by swipe rather than tap.
  useEffect(() => {
    const el = strip.current?.querySelector('[aria-pressed="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [layer]);

  return (
    <div className="layers">
      <div className="layers__strip" ref={strip} role="tablist" aria-label="Chart layer">
        {CHART_LAYERS.map((l) => {
          const n = l.id === 'allegiance' ? null : layerTally(state, l.id, viewer);
          return (
            <button
              key={l.id}
              role="tab"
              className={`layers__chip${l.id === layer ? ' layers__chip--on' : ''}`}
              aria-pressed={l.id === layer}
              onClick={() => onChange(l.id)}
            >
              {l.label}
              {n !== null && <span className="layers__n">{n}</span>}
            </button>
          );
        })}
      </div>
      <p className="layers__hint">{spec.hint}</p>
    </div>
  );
}

/**
 * Left and right across the chart moves between layers.
 *
 * The chart has no pan and no zoom, so a horizontal drag was doing nothing at
 * all — which is what makes this the right gesture rather than an overloaded
 * one. Vertical movement is left alone so the page still scrolls.
 */
export function useLayerSwipe(
  layer: ChartLayer,
  onChange: (layer: ChartLayer) => void,
): {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
} {
  const from = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart: (e) => {
      const t = e.changedTouches[0];
      from.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e) => {
      const start = from.current;
      from.current = null;
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      // Far enough to be meant, and more sideways than up: a thumb travelling
      // down the page is scrolling, not switching views.
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
      const at = CHART_LAYERS.findIndex((l) => l.id === layer);
      const next = at + (dx < 0 ? 1 : -1);
      if (next < 0 || next >= CHART_LAYERS.length) return;
      onChange(CHART_LAYERS[next].id);
    },
  };
}
