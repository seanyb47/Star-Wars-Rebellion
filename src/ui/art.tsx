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
  facilityTypes = [],
  mutiny,
  size = 120,
}: {
  seed: string;
  faction: 'empire' | 'alliance' | 'neutral' | 'none';
  settled: boolean;
  facilities: number;
  /** What stands there, so the marks match the buildings on the Build tab. */
  facilityTypes?: string[];
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

  // Marks for what stands on the island: a squat block for a working camp or
  // mill, a taller mast-like stroke for a works, drill ground or slipway.
  const marks = Array.from({ length: Math.min(facilities, 7) }, (_, i) => {
    const angle = random() * Math.PI * 2;
    const radius = random() * 18;
    const type = facilityTypes[i] ?? 'mine';
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      tall: type === 'construction_yard' || type === 'shipyard' || type === 'training_facility',
    };
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
        <g key={i} fill={mutiny ? '#8b3a34' : 'var(--brass)'} opacity="0.85">
          <rect x={m.x - 2.5} y={m.y - 3} width="5" height="6" rx="1" />
          {m.tall && <rect x={m.x - 0.8} y={m.y - 10} width="1.6" height="7" rx="0.8" />}
        </g>
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

/* ------------------------------------------------------------------ *
 * Buildings
 * ------------------------------------------------------------------ */

/**
 * One glyph per kind of building, drawn as strokes so they inherit their
 * colour from whatever they sit in. Silhouettes are deliberately unalike:
 * you should be able to tell a Mill from a Slipway at 24px without reading.
 */
export function FacilityIcon({
  type,
  size = 30,
}: {
  type: 'mine' | 'refinery' | 'construction_yard' | 'training_facility' | 'shipyard';
  size?: number;
}) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      {type === 'mine' && (
        <g {...common}>
          {/* Cut hillside, a pick, and the spoil below it. */}
          <path d="M3 25 L12 12 L21 25" />
          <path d="M18 8 L26 18" />
          <path d="M14 9 Q20 4 26 9" />
          <path d="M3 28 H29" />
        </g>
      )}
      {type === 'refinery' && (
        <g {...common}>
          {/* Waterwheel over its race. */}
          <circle cx="14" cy="15" r="8.5" />
          <path d="M14 6.5 V23.5 M5.5 15 H22.5 M8 9 L20 21 M20 9 L8 21" strokeWidth="1.3" />
          <path d="M3 27 Q10 24 16 27 T29 27" />
        </g>
      )}
      {type === 'construction_yard' && (
        <g {...common}>
          {/* Shear-legs crane with its hook. */}
          <path d="M8 28 L16 5 L24 28" />
          <path d="M16 5 L27 11" />
          <path d="M27 11 V17" />
          <path d="M24.5 17 H29.5 L27 21 Z" />
          <path d="M4 28 H28" />
        </g>
      )}
      {type === 'training_facility' && (
        <g {...common}>
          {/* A rack of pikes. */}
          <path d="M9 27 V9 M16 27 V6 M23 27 V9" />
          <path d="M9 9 L7 5 L11 5 Z M16 6 L14 2 L18 2 Z M23 9 L21 5 L25 5 Z" />
          <path d="M5 20 H27" />
          <path d="M4 29 H28" />
        </g>
      )}
      {type === 'shipyard' && (
        <g {...common}>
          {/* A hull's ribs, still up on the stocks. */}
          <path d="M6 8 Q16 26 26 8" />
          <path d="M10 12 V22 M16 15 V25 M22 12 V22" strokeWidth="1.4" />
          <path d="M3 27 H29" />
          <path d="M8 27 L11 22 M24 27 L21 22" strokeWidth="1.4" />
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Companies ashore
 * ------------------------------------------------------------------ */

/** A single company: a pike and a hat, small enough to repeat in a row. */
function CompanyFigure({ dim }: { dim?: boolean }) {
  return (
    <svg viewBox="0 0 14 26" width="14" height="26" aria-hidden="true" opacity={dim ? 0.3 : 1}>
      <path d="M11 2 V24" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11 2 l-1.6 3.2 h3.2 Z" fill="currentColor" />
      <circle cx="5" cy="8" r="3" fill="currentColor" />
      <path d="M1.5 8 H8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 11.5 Q1 13 1.5 24 H8.5 Q9 13 5 11.5 Z" fill="currentColor" />
    </svg>
  );
}

/**
 * The garrison, as figures rather than a number: `present` filled, and the
 * shortfall up to `needed` shown greyed so an under-garrisoned island reads
 * as under-garrisoned at a glance.
 */
export function CompanyRow({
  present,
  needed = 0,
  max = 10,
}: {
  present: number;
  needed?: number;
  max?: number;
}) {
  const shown = Math.min(present, max);
  const missing = Math.min(Math.max(needed - present, 0), max - shown);
  const overflow = present - shown;
  return (
    <div className="companies">
      {Array.from({ length: shown }, (_, i) => (
        <CompanyFigure key={`p${i}`} />
      ))}
      {Array.from({ length: missing }, (_, i) => (
        <CompanyFigure key={`m${i}`} dim />
      ))}
      {overflow > 0 && <span className="companies__more">+{overflow}</span>}
      {shown === 0 && missing === 0 && <span className="companies__more">none ashore</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Personnel
 * ------------------------------------------------------------------ */

const HATS = ['tricorn', 'bicorn', 'cap', 'bare', 'hood', 'scarf'] as const;

/**
 * A portrait medallion, cut like a cameo: one pale silhouette on a dark
 * ground, so identity comes from the outline rather than from features. No
 * faces — procedural features land in the uncanny valley, an outline never
 * does. Everything derives from the name, so a character looks the same in
 * every game.
 */
export function CharacterPortrait({
  name,
  faction,
  people,
  size = 44,
  dim,
}: {
  name: string;
  faction: 'empire' | 'alliance' | 'neutral' | 'none';
  people?: string;
  size?: number;
  dim?: boolean;
}) {
  const random = seededRandom(name);
  const hat = HATS[Math.floor(random() * HATS.length)];
  const beard = random() > 0.55;
  const epaulettes = random() > 0.45;
  const urskin = (people ?? '').toLowerCase().includes('urskin');
  const clipId = `bust-${hash(name).toString(36)}`;
  const tint =
    faction === 'empire'
      ? 'var(--empire)'
      : faction === 'alliance'
        ? 'var(--alliance)'
        : 'var(--neutral)';

  // Urskin stand a head taller and half again as broad as anyone else.
  const headR = urskin ? 8.4 : 7;
  const headY = urskin ? 15 : 15.5;
  const cut = '#b4c7d0';

  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ opacity: dim ? 0.5 : 1, display: 'block' }}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="20" cy="20" r="18" />
        </clipPath>
      </defs>
      <circle cx="20" cy="20" r="18" fill="#071a22" />
      <circle cx="20" cy="20" r="18" fill={tint} opacity="0.16" />

      <g clipPath={`url(#${clipId})`} fill={cut}>
        {/* Neck, then shoulders broad enough to fill the medallion */}
        <rect x="16.6" y={headY + headR - 2} width="6.8" height="8" rx="1.5" />
        <path d="M1 41 Q1 27.5 20 26.2 Q39 27.5 39 41 Z" />
        {epaulettes && (
          <>
            <circle cx="6" cy="30.5" r="4" />
            <circle cx="34" cy="30.5" r="4" />
          </>
        )}
        {/* Head, and the jaw beneath it */}
        <circle cx="20" cy={headY} r={headR} />
        {beard && !urskin && (
          <path d={`M${20 - headR} ${headY + 1} Q20 ${headY + 13} ${20 + headR} ${headY + 1} Z`} />
        )}
        {urskin && (
          <>
            <circle cx={20 - headR + 0.6} cy={headY - headR + 1.2} r="3" />
            <circle cx={20 + headR - 0.6} cy={headY - headR + 1.2} r="3" />
            {/* Muzzle and tusks, breaking the line of the jaw */}
            <path d={`M15 ${headY + 4} Q20 ${headY + 11} 25 ${headY + 4} Z`} />
            <path d={`M16.5 ${headY + 6} l-1.4 4.2 l2.4 -0.9 Z`} />
            <path d={`M23.5 ${headY + 6} l1.4 4.2 l-2.4 -0.9 Z`} />
          </>
        )}

        {/* Headgear, cut from the same silhouette */}
        {hat === 'tricorn' && (
          <path d={`M6 ${headY - 3} Q20 ${headY - 15} 34 ${headY - 3} Q20 ${headY - 8} 6 ${headY - 3} Z`} />
        )}
        {hat === 'bicorn' && (
          <path d={`M7 ${headY - 4} Q20 ${headY - 18} 33 ${headY - 4} Q20 ${headY - 9} 7 ${headY - 4} Z`} />
        )}
        {hat === 'cap' && (
          <path d={`M${20 - headR - 1.5} ${headY - 3.5} Q20 ${headY - 14} ${20 + headR + 1.5} ${headY - 3.5} Z`} />
        )}
        {hat === 'hood' && (
          <path d={`M${20 - headR - 3} ${headY + 5} Q${20 - headR - 3} ${headY - 13} 20 ${headY - 13} Q${20 + headR + 3} ${headY - 13} ${20 + headR + 3} ${headY + 5} Q20 ${headY - 5} ${20 - headR - 3} ${headY + 5} Z`} />
        )}
        {hat === 'scarf' && (
          <>
            <path d={`M${20 - headR - 0.5} ${headY - 4} Q20 ${headY - 12} ${20 + headR + 0.5} ${headY - 4} Z`} />
            <path d={`M${20 + headR} ${headY - 6} l6 3.5 l-5 1.2 Z`} />
          </>
        )}
        {hat === 'bare' && <circle cx="20" cy={headY - 4.8} r={headR * 0.9} />}
      </g>

      {/* A single spot of faction colour: the cockade at the collar. */}
      <circle cx="20" cy="31.5" r="2.2" fill={tint} clipPath={`url(#${clipId})`} />

      <circle cx="20" cy="20" r="18" fill="none" stroke={tint} strokeWidth="1.6" opacity="0.85" />
      <circle cx="20" cy="20" r="15.5" fill="none" stroke="var(--brass)" strokeWidth="0.6" opacity="0.45" />
    </svg>
  );
}
