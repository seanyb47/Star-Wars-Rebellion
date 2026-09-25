import { useEffect, useMemo, useRef } from 'react';
import {
  CHART_LAYERS,
  isLoudLayer,
  layerTally,
  type ChartLayer,
  type GameState,
  type PlayableFaction,
} from '../sim';
import { orderedLayers, usePrefs } from './prefs';

/** The strip in this player's order — theirs to set, in the menu. */
export function useChartLayers() {
  const [prefs] = usePrefs();
  return useMemo(() => orderedLayers(CHART_LAYERS, prefs.layerOrder), [prefs.layerOrder]);
}

/**
 * The chart's view switch, after the original's view menu — but swipeable,
 * because a menu on a phone is two taps and a decision, and a swipe is a
 * thumb.
 *
 * It sits where the pick chip sits, at the foot of the chart, and it shows the
 * tally beside each name so you can see there is something to look at before
 * you go and look. A zero on Idle works is the one number in the game that
 * means you are wasting nothing, so it is shown rather than hidden.
 *
 * There used to be a line of explanation under the chips, one per layer. It
 * was cut: the chip's name and its tally say what it is, the stars on the
 * chart say the rest, and the Almanac has the long form for anyone who wants
 * it. A sentence under the chart on every view was a caption on a picture
 * that did not need one.
 *
 * It is back for three of the twelve, and only those three. Sean, 24
 * September, looking at a green disc breathing over Sovereign Reach: *"The
 * constant flashing isn't clear what you're trying to bring to my
 * attention."* The loud layers — idle crew, idle buildings, fleets — are the
 * only ones that draw a mark no other layer draws, a 52px glow the chart has
 * no other use for, and a mark unique to one view is exactly the picture that
 * does need its caption. The quiet nine still get none: a star is a star on
 * every one of them, and the chip above already named it.
 *
 * The sentence is the layer's own `hint`, the one the Almanac prints. One
 * wording, two places — a filter that explains itself differently depending
 * on where you read about it is two filters.
 */
export function LayerStrip({
  state,
  layer,
  onChange,
  viewer,
  foot = false,
}: {
  state: GameState;
  layer: ChartLayer;
  onChange: (layer: ChartLayer) => void;
  viewer: PlayableFaction;
  /** Pinned to the foot of a sheet rather than floating on the chart. Same
   *  wood, same chips, same place on the screen — a Reach is still the chart,
   *  so its filters are not a different control in a different corner. */
  foot?: boolean;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const layers = useChartLayers();

  /*
   * How tall the strip is, published for whatever has to sit clear of it.
   *
   * The chart's pills used to clear it with `bottom: 66px`, a number written
   * down when the strip was one row of chips, and adding the caption line
   * below pushed the strip up through them — a Fleets pill cut in half by the
   * filters. Measured rather than written down, the same way `--topbar-h` and
   * `--tabbar-h` are, because the height now depends on which filter is on.
   *
   * Only the floating strip publishes. In a sheet's footer it is not what the
   * chart's pills are clearing, and two writers would fight over one value.
   */
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || foot) return;
    const publish = () =>
      document.documentElement.style.setProperty('--layers-h', `${el.offsetHeight}px`);
    publish();
    const watch = new ResizeObserver(publish);
    watch.observe(el);
    return () => watch.disconnect();
  }, [foot]);

  // Keep the live chip in view when the layer changes by swipe rather than tap.
  useEffect(() => {
    const el = strip.current?.querySelector('[aria-pressed="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [layer]);

  // The caption, when there is one to give. Read off the player's own strip
  // rather than CHART_LAYERS so a reordered strip cannot caption the wrong
  // filter.
  const loud = isLoudLayer(layer) ? layers.find((l) => l.id === layer) : undefined;

  return (
    <div className={`layers${foot ? ' layers--foot' : ''}`} ref={box}>
      <div className="layers__strip" ref={strip} role="tablist" aria-label="Chart layer">
        {layers.map((l) => {
          const n = l.id === 'allegiance' || l.id === 'none' ? null : layerTally(state, l.id, viewer);
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
      {loud && <p className="layers__hint">{loud.hint}</p>}
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
): SwipeHandlers {
  // The swipe walks the player's order, not the build's, or the gesture and
  // the strip would disagree about what comes next.
  const layers = useChartLayers();
  return useSideSwipe((step) => {
    const at = layers.findIndex((l) => l.id === layer);
    const next = at + step;
    if (next < 0 || next >= layers.length) return;
    onChange(layers[next].id);
  });
}

export interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

/**
 * A sideways drag, anywhere it would otherwise do nothing: +1 for a drag to
 * the left, -1 for one to the right. Used by the chart for its layers and by
 * an island's panel for its tabs, which are both rows of things a thumb wants
 * to move along rather than aim at.
 */
export function useSideSwipe(onStep: (step: 1 | -1) => void): SwipeHandlers {
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
      onStep(dx < 0 ? 1 : -1);
    },
  };
}
