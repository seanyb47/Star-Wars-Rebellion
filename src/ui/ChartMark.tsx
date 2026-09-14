import chartData from '../data/chart.json';
import { paintedChart } from './painted';

/**
 * An uncharted island, shown as exactly what the player has: the mark on
 * their chart. A crop of the painted chart, centred on the island's position,
 * with the surveyor's ring drawn over it. No drawn coastline, because nobody
 * has seen the coast — the painting of the place arrives when a crew does.
 *
 * Small (a list row) or wide (the sheet), same picture: the chart is already
 * in memory for the map, so this costs nothing to show.
 */
const CHART = chartData as {
  width: number;
  height: number;
  reaches: Array<{ islands: Array<{ name: string; x: number; y: number }> }>;
};
const SPOTS = new Map<string, { x: number; y: number }>();
for (const r of CHART.reaches) for (const i of r.islands) SPOTS.set(i.name, i);

export function ChartMark({
  name,
  width,
  height,
  className,
}: {
  name: string;
  width: number;
  height: number;
  className?: string;
}) {
  const spot = SPOTS.get(name);
  const chart = paintedChart('seas');
  // A list row shows a tight ring of water; the sheet a stretch of the chart.
  const span = width <= 48 ? 70 : 260;
  const view = { w: span, h: (span * height) / width };
  const cx = spot?.x ?? CHART.width / 2;
  const cy = spot?.y ?? CHART.height / 2;
  const ring = Math.max(6, view.w * 0.055);
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`${cx - view.w / 2} ${cy - view.h / 2} ${view.w} ${view.h}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ display: 'block', borderRadius: 'inherit' }}
    >
      {chart ? (
        <image href={chart} x={0} y={0} width={CHART.width} height={CHART.height} preserveAspectRatio="none" />
      ) : (
        <rect x={cx - view.w} y={cy - view.h} width={view.w * 2} height={view.h * 2} fill="#0b2a36" />
      )}
      {/* The surveyor's ring: the one thing the chart actually records here. */}
      <circle cx={cx} cy={cy} r={ring} fill="none" stroke="#e8d9a8" strokeWidth={view.w * 0.012} strokeDasharray={`${ring * 0.6} ${ring * 0.35}`} opacity={0.9} />
      <circle cx={cx} cy={cy} r={ring * 0.18} fill="#e8d9a8" opacity={0.9} />
    </svg>
  );
}
