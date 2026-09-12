import { worthTier, type System, type WorthTier } from '../sim';

/**
 * The three grades of worth, drawn.
 *
 * One dot, one four-point spark, one eight-point burst: what an island can
 * hold, told apart at a glance and in any order. These began as the Worth
 * layer's marks on the chart and are now the same mark everywhere an island is
 * named — a list row, the island's own panel, the chain view — so a player
 * learns the shape once and reads it in every place.
 *
 * Three shapes rather than a sliding size, because a continuous scale asks you
 * to compare circles by eye and nobody can do that across a chart. Size goes
 * with the shape only so the three read as a ladder.
 */
export const WORTH_SHAPE: Record<WorthTier, { shape: 'dot' | 'spark' | 'burst'; r: number }> = {
  none: { shape: 'dot', r: 5 },
  small: { shape: 'dot', r: 5 },
  medium: { shape: 'spark', r: 11 },
  large: { shape: 'burst', r: 16 },
};

/**
 * A sparkle: tips joined by cubics whose control points are pulled back along
 * the two tips they run between.
 *
 * That one rule is what makes the sides bow inward instead of cutting straight
 * across, and it is why these read as light rather than as polygons — a
 * straight-sided star at this size is a cog. `pull` is how far out along each
 * tip its control sits: lower is a thinner needle, higher a fatter body.
 */
function sparklePath(tips: Array<{ x: number; y: number }>, pull: number): string {
  const f = (n: number) => n.toFixed(2);
  const parts = [`M ${f(tips[0].x)} ${f(tips[0].y)}`];
  for (let i = 0; i < tips.length; i++) {
    const from = tips[i];
    const to = tips[(i + 1) % tips.length];
    parts.push(
      `C ${f(from.x * pull)} ${f(from.y * pull)} ` +
        `${f(to.x * pull)} ${f(to.y * pull)} ${f(to.x)} ${f(to.y)}`,
    );
  }
  return `${parts.join(' ')} Z`;
}

/** Evenly spaced tips, first one straight up, reaching `radii` in rotation. */
function tipRing(count: number, radii: number[]): Array<{ x: number; y: number }> {
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    const reach = radii[i % radii.length];
    return { x: Math.cos(angle) * reach, y: Math.sin(angle) * reach };
  });
}

/** Four long needles. Worth having. */
export function sparkPath(r: number): string {
  return sparklePath(tipRing(4, [r]), 0.3);
}

/**
 * Eight, alternating long and short. A prize, and it should look like one.
 *
 * The short tips reach 62% and the pull is tighter than the four-point spark's:
 * at half length with a fatter pull they read as a wide waist rather than as
 * four more points, which loses the whole difference between the two grades.
 */
export function burstPath(r: number): string {
  return sparklePath(tipRing(8, [r, r * 0.62]), 0.34);
}

/**
 * The path for a grade at a radius, centred on the origin, for use inside an
 * SVG that is already drawing the island — the chart and the chain view.
 * `null` for a dot, which those callers draw as the circle they already have.
 */
export function worthPath(tier: WorthTier, r: number): string | null {
  const { shape } = WORTH_SHAPE[tier];
  if (shape === 'burst') return burstPath(r);
  if (shape === 'spark') return sparkPath(r);
  return null;
}

/**
 * The mark on its own, inline, for anywhere that is HTML rather than SVG.
 *
 * Only ever for a charted island: an uncharted one keeps its worth to itself,
 * and the caller is expected not to ask. Sized so the burst's long tips reach
 * `size` and the other two sit inside the same box, which keeps a column of
 * them aligned in a list.
 */
export function WorthMark({
  system,
  size = 16,
  colour = 'currentColor',
  className,
}: {
  system: Pick<System, 'rawSlots' | 'energySlots'>;
  size?: number;
  colour?: string;
  className?: string;
}) {
  const tier = worthTier(system as System);
  const { shape, r: base } = WORTH_SHAPE[tier];
  // Scale the chart's radii into this box, burst = full size.
  const r = (base / WORTH_SHAPE.large.r) * (size / 2);
  const half = size / 2;
  const label =
    tier === 'large' ? 'A prize' : tier === 'medium' ? 'Worth having' : tier === 'small' ? 'Little' : 'Bare rock';
  return (
    <svg
      className={`worthmark${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      style={{ flex: 'none' }}
    >
      {shape === 'dot' ? (
        <circle cx={half} cy={half} r={Math.max(2, r)} fill={colour} opacity={tier === 'none' ? 0.35 : 0.9} />
      ) : (
        <path
          d={shape === 'burst' ? burstPath(r) : sparkPath(r)}
          transform={`translate(${half} ${half})`}
          fill={colour}
          stroke={colour}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
