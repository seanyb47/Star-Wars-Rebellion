/**
 * Every picture in the game, drawn as SVG in code.
 *
 * Nothing here loads a file: the shapes are generated from a seed so an island
 * always looks the same, the download stays small, and it works offline. Each
 * piece is built so a real illustration can replace it later without the
 * layouts changing.
 */

/** Cheap deterministic hash, so a name always yields the same coastline. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRandom(seed: string) {
  let s = hash(seed);
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * An irregular closed coastline. Points are pushed in and out around a circle
 * and joined with a Catmull-Rom style curve, which reads as land rather than
 * as a polygon.
 */
export function islandPath(seed: string, radius: number, points = 11): string {
  const random = seededRandom(seed);
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    // Bays and headlands: a wide spread makes the shapes distinctive.
    const r = radius * (0.62 + random() * 0.58);
    pts.push([Math.cos(angle) * r, Math.sin(angle) * r]);
  }

  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < points; i++) {
    const current = pts[i];
    const next = pts[(i + 1) % points];
    const after = pts[(i + 2) % points];
    // Quadratic through the midpoint of each pair: smooth, closed, cheap.
    const cx = next[0] + (next[0] - current[0] + (next[0] - after[0])) * 0.12;
    const cy = next[1] + (next[1] - current[1] + (next[1] - after[1])) * 0.12;
    const mx = (next[0] + after[0]) / 2;
    const my = (next[1] + after[1]) / 2;
    d += ` Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`;
  }
  return `${d} Z`;
}

/** A compass rose. Used large on the start screen and faint on the chart. */
export function CompassRose({
  size = 120,
  opacity = 1,
  showLetters = true,
}: {
  size?: number;
  opacity?: number;
  showLetters?: boolean;
}) {
  const r = 50;
  /** One kite-shaped point of the rose, from its tip back through the centre. */
  const point = (angle: number, long: number, wide: number) => {
    const at = (deg: number, rad: number) => {
      const t = (deg * Math.PI) / 180;
      return `${(Math.cos(t) * rad).toFixed(2)} ${(Math.sin(t) * rad).toFixed(2)}`;
    };
    return `M ${at(angle, long)} L ${at(angle + 90, wide)} L ${at(angle + 180, long * 0.06)} L ${at(angle - 90, wide)} Z`;
  };

  return (
    <svg
      viewBox="-60 -60 120 120"
      width={size}
      height={size}
      style={{ opacity, display: 'block' }}
      aria-hidden="true"
    >
      <circle r={r} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <circle r={r * 0.78} fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
      {/* Intercardinal points, drawn thinner and darker. */}
      {[45, 135, 225, 315].map((a) => (
        <path key={a} d={point(a, r * 0.72, 5)} fill="currentColor" opacity="0.3" />
      ))}
      {/* Cardinal points. */}
      {[0, 90, 180, 270].map((a) => (
        <path key={a} d={point(a, r * 0.95, 7)} fill="currentColor" opacity="0.65" />
      ))}
      <circle r="3" fill="currentColor" />
      {showLetters && (
        <text
          x="0"
          y="-52"
          textAnchor="middle"
          fontSize="11"
          fill="currentColor"
          fontFamily="Georgia, serif"
        >
          N
        </text>
      )}
    </svg>
  );
}

/**
 * Faction crests. Deliberately different silhouettes so they read apart at a
 * glance: the Imperium is symmetrical and straight-edged, the Confederacy is
 * lopsided and made of salvage.
 */
export function ImperiumCrest({ size = 96 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1} aria-hidden="true">
      <defs>
        <linearGradient id="imp-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b333f" />
          <stop offset="100%" stopColor="#151b24" />
        </linearGradient>
      </defs>
      {/* Shield */}
      <path
        d="M50 6 L92 20 L92 60 Q92 92 50 106 Q8 92 8 60 L8 20 Z"
        fill="url(#imp-shield)"
        stroke="var(--empire)"
        strokeWidth="2.5"
      />
      {/* Crown */}
      <path
        d="M28 34 L34 22 L42 32 L50 18 L58 32 L66 22 L72 34 Z"
        fill="var(--brass)"
        stroke="var(--brass)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Seawall: three courses of stone */}
      <g fill="none" stroke="var(--empire)" strokeWidth="3" strokeLinecap="square">
        <path d="M22 50 H78" />
        <path d="M26 62 H74" />
        <path d="M30 74 H70" />
      </g>
      {/* The water it holds back */}
      <path d="M22 86 Q34 80 46 86 T70 86 T78 84" fill="none" stroke="#4a5f74" strokeWidth="2.5" />
    </svg>
  );
}

export function ConfederacyCrest({ size = 96 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1} aria-hidden="true">
      {/* Rope ring, deliberately not quite round */}
      <path
        d="M50 10 Q88 18 90 56 Q92 96 50 102 Q10 98 9 58 Q8 20 50 10 Z"
        fill="#1a2320"
        stroke="var(--alliance)"
        strokeWidth="2.5"
        strokeDasharray="7 4"
      />
      {/* Crossed cutlass and harpoon */}
      <g stroke="var(--alliance)" strokeWidth="3.5" strokeLinecap="round" fill="none">
        <path d="M28 78 Q46 56 68 34" />
        <path d="M72 78 Q54 56 32 34" />
      </g>
      {/* Cutlass tip */}
      <path d="M68 34 l7 -7 l-2 9 l-8 2 z" fill="var(--alliance)" />
      {/* Harpoon head */}
      <path d="M32 34 l-7 -7 l9 1 l1 9 z" fill="var(--alliance)" />
      {/* Pennant */}
      <path d="M50 20 L50 46" stroke="#cfd8dc" strokeWidth="2" />
      <path d="M50 20 L74 27 L50 34 Z" fill="#cfd8dc" opacity="0.9" />
    </svg>
  );
}

export function FactionCrest({ faction, size }: { faction: 'empire' | 'alliance'; size?: number }) {
  return faction === 'empire' ? <ImperiumCrest size={size} /> : <ConfederacyCrest size={size} />;
}

/**
 * A single island drawn at panel size, with its own coastline, a shelf of
 * shallows around it, and marks that hint at what is built on it.
 */
export function IslandPortrait({
  seed,
  faction,
  settled,
  facilities,
  mutiny,
  size = 120,
}: {
  seed: string;
  faction: 'empire' | 'alliance' | 'neutral' | 'none';
  settled: boolean;
  facilities: number;
  mutiny?: boolean;
  size?: number;
}) {
  const random = seededRandom(`${seed}-portrait`);
  const coast = islandPath(seed, 34, 13);
  const shelf = islandPath(seed, 44, 13);
  const tint =
    faction === 'empire'
      ? 'var(--empire)'
      : faction === 'alliance'
        ? 'var(--alliance)'
        : faction === 'neutral'
          ? 'var(--neutral)'
          : '#6b7b84';

  // A few buildings and trees, placed inside the coastline.
  const marks = Array.from({ length: Math.min(facilities, 6) }, () => {
    const angle = random() * Math.PI * 2;
    const radius = random() * 18;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });

  return (
    <svg viewBox="-56 -56 112 112" width={size} height={size} aria-hidden="true">
      <circle r="54" fill="var(--water-deep)" />
      <path d={shelf} fill="var(--shallow)" opacity="0.55" />
      <path
        d={coast}
        fill={settled ? 'var(--land)' : 'var(--land-bare)'}
        stroke={tint}
        strokeWidth="2"
        strokeDasharray={settled ? undefined : '4 3'}
      />
      <path d={coast} fill={tint} opacity={settled ? 0.17 : 0.07} />
      {marks.map((m, i) => (
        <rect
          key={i}
          x={m.x - 2.5}
          y={m.y - 3}
          width="5"
          height="6"
          rx="1"
          fill={mutiny ? '#8b3a34' : 'var(--brass)'}
          opacity="0.85"
        />
      ))}
      {mutiny && (
        <path
          d="M-16 -26 L-16 -38 L2 -33 L-16 -28"
          fill="#b8433a"
          stroke="#b8433a"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
