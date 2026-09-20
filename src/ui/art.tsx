import type { CSSProperties } from 'react';
/**
 * Every picture in the game, drawn as SVG in code.
 *
 * Nothing here loads a file: the shapes are generated from a seed so an island
 * always looks the same, the download stays small, and it works offline. Each
 * piece is built so a real illustration can replace it later without the
 * layouts changing.
 */

import { useState, type ReactNode } from 'react';
import type { FacilityType, ResourceType } from '../sim';
import { narratorIdFor, tabUrl } from './narrator/assets';
import { NARRATOR_MOODS, type NarratorMood } from './narrator/mood';

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
/**
 * The crests, drawn to the faction style guide's emblems rather than to my
 * earlier guesses at them. These are the marks that fly on every ship, wall
 * and flagstaff in the paintings, so the interface has to use the same two or
 * the game contradicts its own art.
 *
 * Colours come from the guide's sampled palettes (art style §1b), not from the
 * interface tokens: a crest is illustration, and it is allowed the deeper
 * greens and reds that a 12px status badge cannot use.
 */

const IMP = { deep: '#183128', field: '#254b36', line: '#2f634d', gold: '#c9a227', cream: '#f0dbbe' };
const CON = { deep: '#4a1418', field: '#6b121e', ray: '#a03832', bright: '#ca6150', bone: '#f0dbbe' };

/**
 * The faction mark at reading size: one shape, one colour, no scene.
 *
 * Sean, 19 September: *"use the simpler sigils not complex ones. These are too
 * detailed for small size."* He is right, and the painted crests are not the
 * only offenders — the drawn `ImperiumCrest` and `ConfederacyCrest` are a
 * laurel wreath around an anchor under a crown, and a skull over crossed
 * cutlasses on a twelve-ray starburst. Both are built to be read at ninety
 * pixels on a faction card. At the eighteen a name beside a name gets, the
 * wreath is a smudge and the skull is a dot.
 *
 * So this is not those shrunk: it is a different drawing for a different job.
 * A crown and a pair of crossed cutlasses, chunky enough to survive being
 * half an em tall, and different enough in silhouette that you can tell them
 * apart without resolving either — which is the only thing a sigil on a list
 * row has to do.
 */
export function FactionSigil({
  faction,
  size = 18,
}: {
  faction: 'empire' | 'alliance' | 'neutral' | 'none';
  size?: number;
}) {
  if (faction !== 'empire' && faction !== 'alliance') return null;
  const tint = faction === 'empire' ? IMP.gold : CON.bright;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ display: 'block', flex: 'none' }}
    >
      {faction === 'empire' ? (
        // A crown: five points and a band, and nothing else in the box.
        <g fill={tint}>
          <path d="M3 16 L3 7 L8.5 11 L12 4.5 L15.5 11 L21 7 L21 16 Z" />
          <rect x="3" y="17.5" width="18" height="3" rx="1" />
        </g>
      ) : (
        // Crossed cutlasses: an X, which no crown can be mistaken for.
        <g stroke={tint} strokeWidth="2.6" strokeLinecap="round" fill="none">
          <path d="M5 19 L18 5" />
          <path d="M19 19 L6 5" />
          <path d="M3.5 20.5 L7 17" strokeWidth="3.4" />
          <path d="M20.5 20.5 L17 17" strokeWidth="3.4" />
        </g>
      )}
    </svg>
  );
}

export function ImperiumCrest({ size = 96 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1} aria-hidden="true">
      <defs>
        <linearGradient id="imp-field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={IMP.field} />
          <stop offset="100%" stopColor={IMP.deep} />
        </linearGradient>
      </defs>

      {/* The shield, in the Crown's own green rather than a grey plate. */}
      <path
        d="M50 14 L90 26 L90 60 Q90 92 50 105 Q10 92 10 60 L10 26 Z"
        fill="url(#imp-field)"
        stroke={IMP.gold}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Crown, above the shield as the guide has it, not inside. */}
      <g fill={IMP.gold}>
        <path d="M31 14 L36 4 L43 12 L50 1 L57 12 L64 4 L69 14 Z" />
        <rect x="30" y="14" width="40" height="4.5" rx="1.2" />
        <circle cx="50" cy="2" r="2.4" />
      </g>

      {/* Anchor in a laurel wreath: the mark on every Imperial flag. */}
      <g stroke={IMP.gold} strokeWidth="2.6" fill="none" strokeLinecap="round">
        <path d="M50 38 v30" />
        <path d="M40 46 h20" />
        <path d="M35 62 q15 16 30 0" />
      </g>
      <circle cx="50" cy="34" r="4.4" fill="none" stroke={IMP.gold} strokeWidth="2.6" />
      <g stroke={IMP.gold} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.9">
        <path d="M28 44 q-6 20 8 34" />
        <path d="M72 44 q6 20 -8 34" />
      </g>

      {/* The sea the Crown keeps out, along the shield's foot. */}
      <path
        d="M22 84 q7 -5 14 0 t14 0 t14 0 t8 -2"
        fill="none"
        stroke={IMP.line}
        strokeWidth="2.6"
      />
    </svg>
  );
}

export function ConfederacyCrest({ size = 96 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1} aria-hidden="true">
      <defs>
        <radialGradient id="con-burst" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={CON.ray} />
          <stop offset="100%" stopColor={CON.field} />
        </radialGradient>
      </defs>

      {/* The starburst the guide flies it on: twelve rays, not a rope ring. */}
      <g fill={CON.ray} opacity="0.85">
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          const c = Math.cos(a);
          const sn = Math.sin(a);
          const p = (r: number, o: number) =>
            `${50 + Math.cos(a + o) * r} ${55 + Math.sin(a + o) * r}`;
          return (
            <path key={i} d={`M ${50 + c * 48} ${55 + sn * 48} L ${p(30, 0.16)} L ${p(30, -0.16)} Z`} />
          );
        })}
      </g>
      <circle cx="50" cy="55" r="34" fill="url(#con-burst)" stroke={CON.bright} strokeWidth="2.5" />

      {/* Crossed cutlasses. They have to reach well past the skull on both
          ends or the blades vanish behind it and the whole thing reads as a
          skull with two small horns, which is what the first attempt did. */}
      <g stroke={CON.bone} strokeWidth="3.4" fill="none" strokeLinecap="round">
        <path d="M24 80 Q40 58 74 30" />
        <path d="M76 80 Q60 58 26 30" />
      </g>
      {/* Tips out beyond the skull, grips below it. */}
      <path d="M74 30 l9 -7 l-3 10 l-9 2 Z" fill={CON.bone} />
      <path d="M26 30 l-9 -7 l3 10 l9 2 Z" fill={CON.bone} />
      <g stroke={CON.bright} strokeWidth="3" strokeLinecap="round">
        <path d="M22 82 l-4 5" />
        <path d="M78 82 l4 5" />
      </g>

      {/* Skull, smaller than the blades and plain enough to read at 26px. */}
      <g fill={CON.bone}>
        <path d="M50 38 q13 0 13 13 q0 8 -5 11 v5 q-8 3 -16 0 v-5 q-5 -3 -5 -11 q0 -13 13 -13 Z" />
      </g>
      <g fill={CON.deep}>
        <circle cx="45" cy="52" r="3.6" />
        <circle cx="55" cy="52" r="3.6" />
        <path d="M47.5 61 h5 l-2.5 4.5 Z" />
      </g>
    </svg>
  );
}

/**
 * The side's crest. Painted when the painting is there — Sean's crowned
 * anchor in laurels, the skull over crossed cutlasses — and drawn otherwise,
 * so nothing breaks while the art is on its way.
 */
export function FactionCrest({ faction, size = 40 }: { faction: 'empire' | 'alliance'; size?: number }) {
  const painting = paintedCrest(faction);
  if (painting) {
    return (
      <img
        className="crest"
        src={painting}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
        draggable={false}
      />
    );
  }
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
  type: FacilityType;
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
      {type === 'silver_mine' && (
        <g {...common}>
          {/* A shaft head rather than a cut hillside: winding gear over a
              mouth in the ground. The gold mine is worked from the outside
              and this one from the inside, which is the only way two mines
              tell each other apart at the size a slot board draws them. */}
          <path d="M6 28 L16 9 L26 28" />
          <path d="M16 9 V4" />
          <path d="M11 17 H21" />
          <path d="M12.5 28 V22 H19.5 V28" />
          <path d="M3 28 H29" />
        </g>
      )}
      {type === 'refinery' && (
        <g {...common}>
          {/* Waterwheel over its race. */}
          <circle cx="14" cy="15" r="8.5" />
          <path d="M14 6.5 V23.5 M5.5 15 H22.5 M8 9 L20 21 M20 9 L8 21" strokeWidth="1.3" />
          <path d="M3 28 Q10 25 16 28 T29 28" />
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
          <path d="M4 28 H28" />
        </g>
      )}
      {type === 'shipyard' && (
        <g {...common}>
          {/* A hull's ribs, still up on the stocks. */}
          <path d="M6 8 Q16 26 26 8" />
          <path d="M10 12 V22 M16 15 V25 M22 12 V22" strokeWidth="1.4" />
          <path d="M3 28 H29" />
          <path d="M8 28 L11 22 M24 28 L21 22" strokeWidth="1.4" />
        </g>
      )}
      {type === 'fort' && (
        <g {...common}>
          {/* A battery on the wall: crenellations, one gun run out. */}
          <path d="M5 28 V13 H9 V10 H13 V13 H19 V10 H23 V13 H27 V28" />
          <path d="M4 28 H28" />
          <path d="M11 22 L23 16" strokeWidth="2.4" />
          <circle cx="11" cy="22" r="2.2" strokeWidth="1.4" />
        </g>
      )}
      {type === 'heavy_fort' && (
        <g {...common}>
          {/* The same wall, doubled: a lower bastion stepped out in front of
              an upper one, and two guns instead of one. Meant to read at the
              size of a thumbnail as "that one, but more of it". */}
          <path d="M3 28 V19 H6 V16 H10 V19 H14 V28" />
          <path d="M14 28 V11 H18 V8 H22 V11 H26 V8 H30 V11 H30 V28" />
          <path d="M2 28 H30" />
          <path d="M6 25 L13 21" strokeWidth="2.2" />
          <path d="M18 19 L28 14" strokeWidth="2.4" />
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Companies ashore
 * ------------------------------------------------------------------ */

/** A single troop: a pike and a hat, small enough to repeat in a row. */
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
 * One company, at slot size.
 *
 * Nine figures for the ten types, all cut on the same 14x26 grid so a garrison
 * of mixed companies reads as a rank rather than a row of unrelated drawings.
 * What changes between them is the silhouette a player can pick out at 30px:
 * what is in the hands, and what is on the head. Anything finer than that is
 * invisible at the size this is actually used, so it is not drawn.
 *
 * These are the fallback. A painting dropped into `src/art/troops` wins, the
 * way it does everywhere else — see painted.ts.
 */
const TROOP_FIGURE: Record<string, ReactNode> = {
  // Pike and pennant: the line company of either side, and the shape everything
  // else is a departure from.
  line: (
    <>
      <path d="M11 2 V24" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11 2 l-1.6 3.2 h3.2 Z" fill="currentColor" />
      <circle cx="5" cy="8" r="3" fill="currentColor" />
      <path d="M1.5 8 H8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 11.5 Q1 13 1.5 24 H8.5 Q9 13 5 11.5 Z" fill="currentColor" />
    </>
  ),
  // Sailors ashore: a cutlass and a knotted head-cloth, no hat and no pike.
  sailors: (
    <>
      <path
        d="M10.5 6 Q13 11 10.5 16"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M10 16 v2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="5" cy="8" r="3" fill="currentColor" />
      <path d="M2 6.6 Q5 4.6 8 6.6" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M1.5 9 H10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 11.5 Q1 13 1.5 24 H8.5 Q9 13 5 11.5 Z" fill="currentColor" />
    </>
  ),
  // Marines: shouldered musket and the tall shako that is the whole point of
  // being able to see them from the quay.
  elite: (
    <>
      <path d="M10.5 3.5 V20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9.4 3.5 h2.2 v1.6 h-2.2 Z" fill="currentColor" />
      <rect x="2.4" y="2.6" width="5.2" height="4.2" rx="0.6" fill="currentColor" />
      <path d="M2 7 H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="5" cy="9.2" r="2.6" fill="currentColor" />
      <path d="M1.5 10 H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 12.4 Q1 13.8 1.5 24 H8.5 Q9 13.8 5 12.4 Z" fill="currentColor" />
    </>
  ),
  // Made, not mustered: square head, riveted plate, nothing in its hands
  // because its hands are the weapon. No eyes worth drawing.
  made: (
    <>
      <rect x="2.6" y="4.4" width="6" height="5" rx="0.8" fill="currentColor" />
      <rect x="4" y="6.2" width="3.2" height="1" fill="var(--bg-raised)" />
      <path d="M1.4 10.6 H9.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="2" y="11.6" width="7.2" height="12.4" rx="1.2" fill="currentColor" />
      <path d="M11 9 V21" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="3.7" cy="14.4" r="0.7" fill="var(--bg-raised)" />
      <circle cx="7.4" cy="14.4" r="0.7" fill="var(--bg-raised)" />
      <circle cx="5.6" cy="18.6" r="0.7" fill="var(--bg-raised)" />
    </>
  ),
  // Cold-baptised: the pike again, but a closed helm with a brow bar and
  // shoulders that have been under something heavy.
  drowned: (
    <>
      <path d="M11 2 V24" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11 2 l-1.6 3.2 h3.2 Z" fill="currentColor" />
      <path d="M2.2 9.4 Q2.2 4.6 5 4.6 Q7.8 4.6 7.8 9.4 Z" fill="currentColor" />
      <rect x="2" y="7.2" width="6" height="1.2" fill="var(--bg-raised)" />
      <path d="M1 10.4 Q5 9 9 10.4" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M5 11.8 Q0.6 13.4 1.2 24 H8.8 Q9.4 13.4 5 11.8 Z" fill="currentColor" />
    </>
  ),
  // The island's own, with whatever was in the shed: a boarding axe and a
  // bare head.
  militia: (
    <>
      <path d="M10 6 V21" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M10 5.4 q3 0.4 2.2 3.4 l-2.2 -0.6 Z" fill="currentColor" />
      <circle cx="5" cy="8" r="3" fill="currentColor" />
      <path d="M1.5 9.4 H9.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 11.5 Q1.4 13 1.8 24 H8.2 Q8.6 13 5 11.5 Z" fill="currentColor" />
    </>
  ),
  // Shoal-folk: small, and raised up looking at something nobody else has
  // noticed yet.
  watch: (
    <>
      <path d="M6 9.5 L12 6.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11.2 5.4 l1.6 0.8 l-0.8 1.6 Z" fill="currentColor" />
      <circle cx="4.6" cy="10.4" r="2.6" fill="currentColor" />
      <circle cx="3.7" cy="9.9" r="0.75" fill="var(--bg-raised)" />
      <circle cx="5.6" cy="9.9" r="0.75" fill="var(--bg-raised)" />
      <path d="M1.6 12.6 H7.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.6 13.6 Q1.8 14.8 2.2 24 H7 Q7.4 14.8 4.6 13.6 Z" fill="currentColor" />
    </>
  ),
  // Reef-folk: almost all shield. The figure is behind it, which is the
  // correct amount of it to be able to see.
  shieldwall: (
    <>
      <path d="M3.4 8.6 Q3.4 3.4 6 2.6 Q8.6 3.4 8.6 8.6 Z" fill="currentColor" />
      <circle cx="6" cy="7.2" r="2.2" fill="currentColor" />
      <path
        d="M1.2 9.6 H10.8 Q11.6 17 6 24.2 Q0.4 17 1.2 9.6 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.6"
      />
      <path d="M6 10.4 V22.4" stroke="var(--bg-raised)" strokeWidth="0.9" />
      <path d="M2.4 13.4 H9.6" stroke="var(--bg-raised)" strokeWidth="0.9" />
    </>
  ),
  // Urskin: twice the shoulders, tusks, and a harpoon rather than a pike —
  // the barb is what tells them apart at this size.
  harpoon: (
    <>
      <path d="M11 3 V24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 2 l-1.8 3.4 h3.6 Z" fill="currentColor" />
      <path d="M9.4 6 l1.6 1.4 l1.6 -1.4" stroke="currentColor" strokeWidth="1.1" fill="none" />
      <circle cx="4.8" cy="7.6" r="3.2" fill="currentColor" />
      <path d="M3 9.6 l-0.5 2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M6.6 9.6 l0.5 2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M4.8 11.4 Q-0.2 13.2 0.6 24 H9 Q9.8 13.2 4.8 11.4 Z" fill="currentColor" />
    </>
  ),
};

/** Which figure a troop type wears. */
function figureFor(id?: string): ReactNode {
  switch (id) {
    case 'crown-ships-company':
    case 'brethren-ships-company':
      return TROOP_FIGURE.sailors;
    case 'crown-marines':
      return TROOP_FIGURE.elite;
    case 'tidewrought':
      return TROOP_FIGURE.made;
    case 'drowned-guard':
      return TROOP_FIGURE.drowned;
    case 'island-militia':
      return TROOP_FIGURE.militia;
    case 'reefwalkers':
      return TROOP_FIGURE.watch;
    case 'reef-guard':
      return TROOP_FIGURE.shieldwall;
    case 'urskin-berserkers':
      return TROOP_FIGURE.harpoon;
    default:
      return TROOP_FIGURE.line;
  }
}

/** One troop, at slot size: the figure for its type, painted where painted. */
/**
 * What is in an island's ground, drawn.
 *
 * Two glyphs, because there are two kinds and they have to be told apart at
 * the size a slot board draws them: a stand of timber, and a seam in rock.
 * Deliberately unbuilt-looking — a deposit is ground nobody has worked yet,
 * and it must not read as a building the island already has.
 */
export function ResourceIcon({ type, size = 30 }: { type: ResourceType; size?: number }) {
  if (type === 'forest') {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Three conifers on a line of ground. */}
        <path d="M7 16l2.6-4.4L7 11.6 9.6 7.2 12 11.6l-2.4.2L12 16z" />
        <path d="M14.5 16l2-3.4-2-.2 2-3.4 2 3.4-2 .2 2 3.4z" />
        <path d="M3.5 19.5h17" />
        <path d="M9.6 16v3.5M16.5 16v3.5" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* A seam running through cut rock, with the metal showing. Silver is
          the same rock read one tier down: two thin seams in pale steel
          against gold's one heavy one, which is the pair of differences —
          count and colour — that survives being drawn at 30px. The colour is
          literal rather than `--metal`, because `--metal` is the faction's
          own accent and turns red on the Confederacy's side; two veins that
          are told apart by warmth cannot both be themed. */}
      <path d="M3.5 18.5l4-11h9l4 11z" />
      {type === 'gold' ? (
        <path d="M7.2 13.2l3.4 1.4 2.6-2.2 4 1.6" stroke="var(--metal)" strokeWidth="2.1" />
      ) : (
        <g stroke="#c8d2da" strokeWidth="1.3">
          <path d="M7 12.4l3.2 1.2 2.4-1.8 3.6 1.4" />
          <path d="M6.8 16.1l3.4 1.1 2.4-1.6 3.4 1.3" />
        </g>
      )}
    </svg>
  );
}

/** The painting of what is in the ground, if one has arrived. */
export function resourcePainting(type: ResourceType): string | undefined {
  return paintedIsland(`resource-${type}`);
}

/**
 * A stand of timber or a seam of gold, painted.
 *
 * The same wide band the works get, and for the same reason: a deposit and the
 * mill that replaces it sit in the same row on the same board, so they have to
 * be the same shape. Falls back to the drawn glyph while a painting is missing.
 */
export function ResourceThumb({
  type,
  width = 96,
  fill,
}: {
  type: ResourceType;
  width?: number;
  fill?: boolean;
}) {
  const painting = resourcePainting(type);
  if (!painting) return <ResourceIcon type={type} size={30} />;
  return (
    <span
      className="facthumb"
      style={fill ? { width: '100%', aspectRatio: '96 / 40' } : { width, height: Math.round(width * 0.42) }}
    >
      <img src={painting} alt="" loading="lazy" />
    </span>
  );
}

export function CompanyIcon({ size = 30, type }: { size?: number; type?: string }) {
  const painting = type ? paintedTroop(type) : undefined;
  if (painting) {
    return (
      <img
        src={painting}
        alt=""
        loading="lazy"
        decoding="async"
        height={size}
        style={{ height: size, width: 'auto', display: 'block', objectFit: 'contain' }}
      />
    );
  }
  return (
    <svg
      viewBox="0 0 14 26"
      height={size}
      width={(size * 14) / 26}
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {figureFor(type)}
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

import {
  paintedBuilding,
  paintedCreature,
  paintedFace,
  paintedIsland,
  islandPainting,
  paintedPortrait,
  paintedFrame,
  paintedRing,
  RING_OPENING,
  paintedShip,
  paintedCrest,
  paintedTroop,
} from './painted';
import { lordOfName } from '../sim/lords';
import { CROWN_PRINCIPAL } from '../sim/constants';

/**
 * The smallest medallion worth hanging one of Sean's rings on. See the note
 * beside `ringed` in `CharacterPortrait` for what was measured.
 */
const RING_MIN = 80;

/**
 * How much wider than its hole the face is drawn, so it disappears under the
 * ring's inner edge instead of stopping short of it. Measured against the art
 * rather than picked: much past this and the ring's inner bevel is swallowed
 * and the join looks like a mistake; much under it and the dark rim is back.
 */
const RING_OVERLAP = 1.25;
import { useInView } from './useInView';

/**
 * The ink ramp. Five inks, and every drawing uses only these plus the faction
 * hues and brass. A fixed, small palette is most of what makes a set of
 * drawings look like a set — see seven-seas-art-style.md §2.
 */
export const INK = {
  black: '#0a1116',
  dark: '#1d2b33',
  mid: '#5c7078',
  pale: '#a9bcc2',
  bone: '#e8e2d1',
} as const;

/** Headgear, which is most of a silhouette at the size these ship at. */
type Hat =
  | 'coronet'
  | 'bicorne'
  | 'tricorn'
  | 'shako'
  | 'veil'
  | 'hood'
  | 'flatcap'
  | 'bandana'
  | 'headscarf'
  | 'widebrim'
  | 'watchcap'
  | 'bare';

/** What a people does to a body, before anything is put on its head. */
type Stock = {
  build: number;
  headScale: number;
  tusks?: boolean;
  ears?: 'wide' | 'round';
  crest?: boolean;
  brow?: boolean;
  /** No hair, ever, and a collar up to the jaw. */
  still?: boolean;
  hat?: Hat;
};

const STOCK: Record<string, Stock> = {
  urskin: { build: 1.45, headScale: 1.16, tusks: true, ears: 'wide' },
  'reef-folk': { build: 1.05, headScale: 1, crest: true },
  'the hushed': { build: 0.7, headScale: 0.88, hat: 'hood' },
  'shoal-folk': { build: 0.75, headScale: 0.92, ears: 'round' },
  'bog-folk': { build: 1.1, headScale: 1.02, brow: true },
  'the rumor guild': { build: 0.95, headScale: 1, hat: 'flatcap' },
  'human (once)': { build: 0.95, headScale: 1, still: true },
  human: { build: 1, headScale: 1 },
};

function stockFor(people?: string): Stock {
  const key = (people ?? 'human').toLowerCase().trim();
  return STOCK[key] ?? STOCK.human;
}

/**
 * Rank decides headgear, read out of the title in the name. Nothing is random
 * that could be meaningful: an Admiral is in a bicorne in every game, and you
 * learn to read the roster by hat before you learn the names.
 */
function hatFor(name: string, stock: Stock, random: () => number): Hat {
  if (stock.hat) return stock.hat;
  if (/lord|regent|governor/i.test(name)) return 'coronet';
  if (/admiral|commodore/i.test(name)) return 'bicorne';
  if (/captain/i.test(name)) return 'tricorn';
  if (/colonel|major|sergeant/i.test(name)) return 'shako';
  if (/widow|dame/i.test(name)) return 'veil';
  if (/doctor|master/i.test(name)) return 'bare';
  // The untitled are most of the roster, so they need the widest draw or half
  // the cast reads as one person in a cap.
  return (['bandana', 'headscarf', 'widebrim', 'watchcap', 'bare', 'bare'] as const)[
    Math.floor(random() * 6)
  ];
}

const HEAD_Y = 26;

function headPath(r: number): string {
  // Flat-bottomed, so a jaw reads rather than a ball.
  return `M 32 ${HEAD_Y - r} q ${r} 0 ${r} ${r * 1.05} q 0 ${r} ${-r} ${r * 1.2} q ${-r} ${-r * 0.2} ${-r} ${-r * 1.2} q 0 ${-r * 1.05} ${r} ${-r * 1.05} Z`;
}

function bustPath(build: number): string {
  const w = 18 * build;
  return `M ${32 - w} 64 v -10 q 0 -9 ${w * 0.5} -12 h ${w} q ${w * 0.5} 3 ${w * 0.5} 12 v 10 Z`;
}

function hatPath(hat: Hat, r: number): string | null {
  const top = HEAD_Y - r;
  switch (hat) {
    case 'coronet':
      return `M ${32 - r - 1} ${top + 2} h ${(r + 1) * 2} v -4 l -4 -6 l -4 6 l -4 -8 l -4 8 l -4 -6 l -4 6 Z`;
    case 'bicorne':
      // Worn athwart: wide, low, and pointed at both ends.
      return `M ${32 - r - 8} ${top + 3} q ${r + 8} -16 ${(r + 8) * 2} 0 q -${r + 8} -6 -${(r + 8) * 2} 0 Z`;
    case 'tricorn':
      return `M ${32 - r - 6} ${top + 3} q ${r + 6} -13 ${(r + 6) * 2} 0 q -6 -3 -${r + 6} -3 q -${r} 0 -${r + 6} 3 Z M ${32 - r - 1} ${top + 3} q ${r + 1} -12 ${(r + 1) * 2} 0 Z`;
    case 'shako':
      return `M ${32 - r + 1} ${top + 2} v -12 h ${(r - 1) * 2} v 12 Z M ${32 - r - 4} ${top + 2} h ${(r + 4) * 2} v 3 h -${(r + 4) * 2} Z`;
    case 'veil':
      return `M ${32 - r - 3} ${HEAD_Y + 7} q -1 -18 ${r + 3} -18 q ${r + 3} 0 ${r + 3} 18 q -3 -9 -${r + 3} -9 q -${r} 0 -${r + 3} 9 Z`;
    case 'hood':
      return `M ${32 - r - 3} ${HEAD_Y + 4} q 0 -20 ${r + 3} -20 q ${r + 3} 0 ${r + 3} 20 q -4 -7 -${r + 3} -7 q -${r - 1} 0 -${r + 3} 7 Z`;
    case 'flatcap':
      return `M ${32 - r - 4} ${top + 1} h ${(r + 4) * 2} l -3 -5 h -${(r + 1) * 2} Z`;
    case 'bandana':
      return `M ${32 - r} ${top + 4} q ${r} -9 ${r * 2} 0 Z M ${32 + r - 1} ${top + 2} l 8 4 l -7 2 Z`;
    case 'headscarf':
      // Tied at the nape, with the tail hanging: a long shape nothing else has.
      return `M ${32 - r - 1} ${top + 5} q ${r + 1} -12 ${(r + 1) * 2} 0 q -${r + 1} -5 -${(r + 1) * 2} 0 Z M ${32 - r - 1} ${top + 4} l -5 14 l 5 -3 Z`;
    case 'widebrim':
      return `M ${32 - r - 9} ${top + 4} q ${r + 9} 5 ${(r + 9) * 2} 0 q -${r + 9} -14 -${(r + 9) * 2} 0 Z`;
    case 'watchcap':
      return `M ${32 - r} ${top + 4} q 0 -11 ${r} -11 q ${r} 0 ${r} 11 Z`;
    default:
      return null;
  }
}

/** Hair, for the bare-headed. Mass, not strands — strands vanish at 32px. */
function hairPath(r: number, kind: number): string {
  const top = HEAD_Y - r;
  if (kind === 0) return `M ${32 - r} ${top + 5} q 0 -10 ${r} -10 q ${r} 0 ${r} 10 q -${r} -6 -${r * 2} 0 Z`;
  if (kind === 1)
    return `M ${32 - r} ${top + 6} q 0 -11 ${r} -11 q ${r} 0 ${r} 11 q -2 -5 -6 -5 q -3 6 -8 3 q -3 -1 -${r - 4} 2 Z`;
  return `M ${32 - r - 1} ${HEAD_Y + 2} q -2 -14 ${r + 1} -14 q ${r + 1} 0 ${r + 1} 12 q -3 -8 -${r + 1} -8 q -${r} 0 -${r + 1} 10 Z`;
}

/**
 * A face, square, in no frame at all.
 *
 * Sean, 19 September: *"Cut the fancy frames and put in a square one. Just
 * show me face, stats, and role tag."* So this is the plainest possible thing
 * — the head crop from `art/faces`, filling a square — and everything the
 * ringed medallion did is gone: no brass, no bevel, no Lord's frame, and none
 * of the geometry that made the opening smaller than the box it sat in.
 *
 * Falls through to the drawn cameo for a face nobody has painted, below the
 * size at which `CharacterPortrait` would hang a ring on it.
 */
export function CharacterFace({
  name,
  faction,
  people,
  size = 120,
  dim,
}: {
  name: string;
  faction: 'empire' | 'alliance' | 'neutral' | 'none';
  people?: string;
  size?: number;
  dim?: boolean;
}) {
  const [holder, near] = useInView<HTMLDivElement>();
  const painted = near ? paintedFace(name) : undefined;
  return (
    <div
      ref={holder}
      className={`charface${dim ? ' charface--dim' : ''}`}
      style={{ width: size, height: size }}
    >
      {painted ? (
        <img src={painted} alt="" loading="lazy" />
      ) : (
        <div className="charface__cameo">
          <CharacterPortrait name={name} faction={faction} people={people} size={Math.min(size, RING_MIN - 4)} />
        </div>
      )}
    </div>
  );
}

/**
 * A portrait, in the near register: heavy outline, two flat fills, and the
 * faction's colour in the coat rather than in a ring around it, so allegiance
 * reads before anything else does.
 *
 * No faces, by rule (art style §3.7). Everything that tells one officer from
 * another lives in the outline — build from their people, headgear from their
 * rank, hair and beard from their name — because that is what survives at
 * 32px, and because 26 of these have to be affordable.
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
  const stock = stockFor(people);
  const hat = hatFor(name, stock, random);
  const hair = Math.floor(random() * 3);
  const beard = !stock.still && !stock.tusks && random() > 0.62;
  const epaulettes = random() > 0.45;
  // High collar or open: a silhouette change at the one place every portrait
  // has, which costs nothing and separates the plain-dressed from each other.
  const highCollar = stock.still || random() > 0.5;
  const id = `pt-${hash(name).toString(36)}`;
  const tint =
    faction === 'empire'
      ? 'var(--empire)'
      : faction === 'alliance'
        ? 'var(--alliance)'
        : 'var(--neutral)';
  /**
   * One of the three, and it says so on its own.
   *
   * Sean, 18 September, looking at Freeport's crew tab: *"the pirate lords need
   * more emphasis around their character image. Hard to know who is a pirate
   * lord."* Four medallions, four identical red rings, and three of the four
   * were the Confederacy's entire losing condition.
   *
   * Decided here off the name rather than passed in, because `isLord` only ever
   * needed the name and a prop would have to be remembered at every call site —
   * there are eleven, and the one that got forgotten would be the one that
   * mattered. A Lord now wears the ring everywhere a Lord appears: this island's
   * crew, the crew screen, a fleet's officers, the errand sheet, the log.
   */
  const lord = lordOfName(name) !== undefined;
  /**
   * Which of Sean's five rings this person wears.
   *
   * Two a side and one for nobody's, which turns out to be exactly the number
   * of things a medallion has to say: whose you are, and whether you are one of
   * the ones the war is about. Ornate is the principals — the three Lords, and
   * the Lord Regent on the Crown's side, who is its one irreplaceable officer
   * in the same way. Plain is everybody else in uniform. The iron-and-rope one
   * is for the unaligned, who are in nobody's uniform yet.
   */
  const ring = lord || name === CROWN_PRINCIPAL
    ? faction === 'empire'
      ? 'crown-ornate'
      : 'brethren-ornate'
    : faction === 'empire'
      ? 'crown-plain'
      : faction === 'alliance'
        ? 'brethren-plain'
        : 'free-plain';

  // A painting is only fetched once the medallion is near the screen; until
  // then the drawn cameo stands in, which is the whole reason it can.
  const [holder, near] = useInView<SVGSVGElement>();
  // The head crop, not the whole figure: this is a circle 32 to 68 pixels
  // across, and a three-quarter portrait shrunk into it is a smudge with a
  // hat. The full painting is the card's job — see CharacterPainting.
  const painting = near ? paintedFace(name) : undefined;
  const r = 9.5 * stock.headScale;
  const hatD = hatPath(hat, r);
  // The outline, on everything, at one weight. Heavy on purpose: a hairline
  // disappears at 32px and takes the drawing with it.
  const line = { stroke: INK.black, strokeWidth: 3, strokeLinejoin: 'round' as const };

  /**
   * Below this the ring is not worth drawing.
   *
   * Measured against the art rather than guessed: at sixty-six pixels the
   * crown is four pixels of gold mush and the skull is a grey smudge, and the
   * face inside has shrunk to a thumbnail to make room for them. At eighty-odd
   * every ring reads and the head is still a head. Under it the medallion
   * keeps the plain stroke it always had, and a Lord keeps the brass band.
   */
  const ringed = size >= RING_MIN && paintedRing(ring) !== undefined;
  /**
   * The hole is centred in every ring's square, so the face is drawn smaller
   * and the ring laid over it — and drawn a quarter larger than the hole on
   * purpose, so it runs *under* the ring's inner bevel rather than sitting in
   * the middle of it with a rim of dark showing all the way round.
   *
   * Sean, on the first two cuts: *"we want the image to pop not the frame."*
   * Dimming the ring alone could not do that, because the complaint is about
   * area and not brightness: at the hole's own size the face is a third of the
   * medallion across and a *ninth* of it by area, so however quiet the ring is
   * made, it is still almost all of what you are looking at. Tucking the face
   * under the bevel is what turns the ring back into a band around a portrait.
   */
  const box = ringed ? Math.round(size * RING_OPENING[ring] * RING_OVERLAP) : size;

  const medallion = (
    <svg
      ref={holder}
      viewBox="0 0 64 64"
      width={box}
      height={box}
      aria-hidden="true"
      style={{ opacity: dim ? 0.45 : 1, display: 'block' }}
    >
      <defs>
        <clipPath id={id}>
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="31" fill={INK.black} />
      <circle cx="32" cy="32" r="31" fill={tint} opacity="0.26" />

      {/* A painting, when one has been made for this person. The medallion and
          its faction ring are the same either way, so a roster half-painted and
          half-drawn still reads as one list rather than two. */}
      {painting ? (
        <g clipPath={`url(#${id})`}>
          <image
            href={painting}
            x="2"
            y="2"
            width="60"
            height="60"
            preserveAspectRatio="xMidYMid slice"
          />
          {/* A whisper of the faction wash the drawn ones carry. Much lighter
              than theirs: a painted officer is already wearing the colour —
              Imperial coats sea-green, Confederate sashes red — so a heavy
              wash on top only muddies a face that was doing the job already.
              The ring outside carries the rest. */}
          <circle cx="32" cy="32" r="30" fill={tint} opacity="0.05" />
        </g>
      ) : (
      <g clipPath={`url(#${id})`}>
        {/* Coat, then neck, then head: back to front, so each outline is cut
            by the thing in front of it rather than drawn over it. */}
        <path d={bustPath(stock.build)} fill={tint} {...line} />
        {epaulettes && (
          // Boards across the shoulder, not buttons beside it. As circles they
          // read as knobs bolted to the coat.
          <g fill={INK.dark} stroke={INK.black} strokeWidth="1.6" strokeLinejoin="round">
            <path d={`M ${32 - 19 * stock.build} 53 h 9 v 4 h -9 Z`} />
            <path d={`M ${32 + 10 * stock.build} 53 h 9 v 4 h -9 Z`} />
          </g>
        )}
        <path
          d={`M 27.5 ${HEAD_Y + r - 4} h 9 v 11 h -9 Z`}
          fill={stock.still ? INK.dark : INK.mid}
        />
        {highCollar && (
          <path
            d={`M ${32 - 9} 54 l 2 -12 q 7 4 14 0 l 2 12 Z`}
            fill={INK.dark}
            {...line}
          />
        )}
        {stock.ears && (
          <path
            d={
              stock.ears === 'wide'
                ? `M ${32 - r - 1} ${HEAD_Y - 5} a 4.5 4.5 0 1 1 3 7 Z M ${32 + r + 1} ${HEAD_Y - 5} a 4.5 4.5 0 1 0 -3 7 Z`
                : `M ${32 - r - 2} ${HEAD_Y - 2} a 4 4 0 1 1 4 4 Z M ${32 + r + 2} ${HEAD_Y - 2} a 4 4 0 1 0 -4 4 Z`
            }
            fill={INK.pale}
            {...line}
          />
        )}
        <path d={headPath(r)} fill={INK.pale} {...line} />
        {stock.crest && (
          <path
            d={`M ${32 - 6} ${HEAD_Y - r + 2} l -6 -12 l 9 8 Z M 32 ${HEAD_Y - r - 1} l 0 -14 l 4.5 13 Z M ${32 + 6} ${HEAD_Y - r + 2} l 7 -11 l -2.5 11 Z`}
            fill={INK.pale}
            {...line}
          />
        )}
        {stock.brow && (
          <path
            d={`M ${32 - r + 1} ${HEAD_Y - 3} q ${r - 1} -5 ${(r - 1) * 2} 0 v 3 q -${r - 1} -4 -${(r - 1) * 2} 0 Z`}
            fill={INK.dark}
          />
        )}
        {stock.tusks && (
          <path
            d={`M ${32 - r + 1.5} ${HEAD_Y + 4} l -1.6 6.5 l 3.4 -5.6 Z M ${32 + r - 1.5} ${HEAD_Y + 4} l 1.6 6.5 l -3.4 -5.6 Z`}
            fill={INK.bone}
            stroke={INK.black}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}
        {beard && (
          <path
            d={`M ${32 - r} ${HEAD_Y + 2} q 0 ${r * 1.5} ${r} ${r * 1.5} q ${r} 0 ${r} ${-r * 1.5} q -${r} 5 -${r * 2} 0 Z`}
            fill={INK.pale}
            {...line}
          />
        )}
        {hatD ? (
          <path d={hatD} fill={INK.dark} {...line} />
        ) : (
          !stock.still && <path d={hairPath(r, hair)} fill={INK.dark} {...line} />
        )}
      </g>
      )}

      {/*
        The rim. One ring for an officer, and for a Lord a brass band with the
        faction's own colour still showing inside it, so a Lord reads as a Lord
        *and* as one of theirs rather than as a third faction. Brass because
        the crew screen's Lord card is already brass-edged and the chrome's
        metal is the same — a second visual language for the same fact would be
        worse than none.
      */}
      {lord && !ringed && (
        <circle cx="32" cy="32" r="31" fill="none" stroke="var(--brass)" strokeWidth="5" />
      )}
      {/*
        The faction ring on the medallion itself. Inside one of Sean's rings it
        is saying a thing the ring has already said, in the ring's own colour,
        an inch further in — so there it becomes a plain dark edge instead,
        which still parts the photograph from the frame's inner bevel without
        adding a second red circle to a red frame.
      */}
      <circle
        cx="32"
        cy="32"
        r={lord && !ringed ? 27.5 : 31}
        fill="none"
        stroke={ringed ? INK.black : tint}
        strokeWidth={ringed ? 2 : lord ? 2 : 2.5}
      />
    </svg>
  );

  if (!ringed) return medallion;
  return (
    <span className="medallion" style={{ width: size, height: size, opacity: dim ? 0.55 : 1 }}>
      {medallion}
      <img className="medallion__ring" src={paintedRing(ring)} alt="" loading="lazy" />
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * The three things you can look at on an island
 * ------------------------------------------------------------------ */

/**
 * Mission, military, facilities — the three faces of an island, as on the
 * Reach panel. Kept blockier than the building glyphs so they read as
 * categories rather than as particular buildings.
 */
export function CategoryIcon({
  kind,
  size = 22,
}: {
  kind: 'missions' | 'military' | 'facilities';
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
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {kind === 'missions' && (
        <g {...common}>
          {/* A sealed dispatch. */}
          <path d="M4 6 h16 v12 h-16 Z" />
          <path d="M4 6 l8 6 l8 -6" />
          <circle cx="18" cy="17" r="2.6" fill="currentColor" stroke="none" />
        </g>
      )}
      {kind === 'military' && (
        <g {...common}>
          {/* Crossed cutlass and pike. */}
          <path d="M5 19 Q13 12 19 5" />
          <path d="M19 5 l1.6 -1.6 l-0.4 3 l-2.6 0.6 Z" fill="currentColor" />
          <path d="M19 19 L5 5" />
          <path d="M5 5 l-1.6 -1.6 l3 0.4 l0.6 2.6 Z" fill="currentColor" />
        </g>
      )}
      {kind === 'facilities' && (
        <g {...common}>
          {/* A cluster of roofs and a chimney. */}
          <path d="M3 20 v-6 l4 -3 l4 3 v6" />
          <path d="M13 20 v-9 l4 -3 l4 3 v9" />
          <path d="M2 20 h20" />
          <path d="M17 8 v-3" />
        </g>
      )}
    </svg>
  );
}

/** The small coastline used in list rows, where a full portrait is too heavy. */
export function IslandGlyph({
  seed,
  faction,
  settled,
  size = 30,
}: {
  seed: string;
  faction: 'empire' | 'alliance' | 'neutral' | 'none';
  settled: boolean;
  size?: number;
}) {
  const tint =
    faction === 'empire'
      ? 'var(--empire)'
      : faction === 'alliance'
        ? 'var(--alliance)'
        : faction === 'neutral'
          ? 'var(--neutral)'
          : '#6b7b84';
  return (
    <svg viewBox="-20 -20 40 40" width={size} height={size} aria-hidden="true">
      <path d={islandPath(seed, 16, 11)} fill="var(--shallow)" opacity="0.5" />
      <path
        d={islandPath(seed, 13, 11)}
        fill={settled ? 'var(--land)' : 'var(--land-bare)'}
        stroke={tint}
        strokeWidth="1.6"
        strokeDasharray={settled ? undefined : '3 2.5'}
      />
      <path d={islandPath(seed, 13, 11)} fill={tint} opacity="0.2" />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * The two narrators (world bible section 1)
 * ------------------------------------------------------------------ */

/** Mr Pennywhistle: a one-eyed sea-parrot the Confederacy cannot get rid of. */
export function ParrotPortrait({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" style={{ display: 'block' }}>
      <circle cx="20" cy="20" r="18" fill="#071a22" />
      <circle cx="20" cy="20" r="18" fill="var(--alliance)" opacity="0.16" />
      <g clipPath="url(#parrot-clip)">
        <defs>
          <clipPath id="parrot-clip">
            <circle cx="20" cy="20" r="18" />
          </clipPath>
        </defs>
        {/* Body and wing */}
        <path d="M14 40 Q10 26 20 22 Q31 26 27 40 Z" fill="#2f7a5a" />
        <path d="M24 27 Q30 31 27 39 Q23 33 24 27 Z" fill="#1f5c43" />
        {/* Head */}
        <circle cx="20" cy="16" r="8" fill="#3d9c73" />
        {/* Crest */}
        <path d="M16 9 Q17 3 20 7 Q23 2 24 9 Z" fill="var(--alliance)" />
        {/* Beak */}
        <path d="M27 15 Q33 17 27 21 Q25 18 27 15 Z" fill="#d8a13c" />
        {/* The one eye, and the patch over the other */}
        <circle cx="22" cy="14.5" r="2.2" fill="#f2f6f7" />
        <circle cx="22.4" cy="14.5" r="1.1" fill="#08161c" />
        <path d="M12 12 h6 v5 h-6 Z" fill="#0b1c22" />
        <path d="M9 11 L20 13" stroke="#0b1c22" strokeWidth="1.4" />
      </g>
      <circle cx="20" cy="20" r="18" fill="none" stroke="var(--alliance)" strokeWidth="1.6" opacity="0.85" />
    </svg>
  );
}

/**
 * Secretary Sabine Marlow, who has been sitting behind Crane's face.
 *
 * Sean's dev report raised the Crown advisor as a fidelity question — build
 * says Marlow, older notes said Crane — and the world bible settles it the
 * other way round from the way it was asked: Crane *"retired from the
 * advisor's chair 2026-09-13, kept for later"*, and §16 has carried Marlow's
 * full portrait brief ever since. So the **name** in `Narrator.tsx` is right.
 *
 * What was wrong is the face. Marlow has no painting yet, so this drawn
 * fallback is what every Crown player actually looks at, and it was still
 * Crane: a long grey lashless face, two unblinking eyes, hair flat to the
 * skull. Marlow is a woman of sixty-one with iron-grey hair *cropped short and
 * no wig*, half-moon reading spectacles, a high white collar and a black
 * stock, in the Admiralty's sea-green civil dress with cream facings — staff
 * uniform, so no epaulettes and no braid.
 *
 * Drawn to that rather than to Crane's, which is all the fidelity a 44px
 * cameo can carry: the crop, the spectacles, the collar and the green coat.
 * The mourning rings and the ink on her fingers wait for the painting.
 */
export function SecretaryPortrait({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" style={{ display: 'block' }}>
      <circle cx="20" cy="20" r="18" fill="#071a22" />
      <circle cx="20" cy="20" r="18" fill="var(--empire)" opacity="0.14" />
      <g clipPath="url(#marlow-clip)">
        <defs>
          <clipPath id="marlow-clip">
            <circle cx="20" cy="20" r="18" />
          </clipPath>
        </defs>
        {/* The Admiralty's civil dress: sea-green coat, cream facings, no braid. */}
        <path d="M2 41 Q3 28 20 26 Q37 28 38 41 Z" fill="#254b36" />
        <path d="M14.5 27 Q20 33 25.5 27 L27 41 L13 41 Z" fill="#e8dcc0" opacity="0.5" />
        {/* High white collar and black stock. */}
        <path d="M20 26 L16 31 L20 29 L24 31 Z" fill="#f2efe6" />
        <rect x="18.2" y="27.4" width="3.6" height="3" rx="0.8" fill="#14181a" />
        <rect x="17.6" y="21.5" width="4.8" height="6" rx="1.4" fill="#d8c3a8" />
        {/* A rounder face than Crane's long one. */}
        <ellipse cx="20" cy="15.4" rx="6.4" ry="7" fill="#d8c3a8" />
        {/* Iron-grey, cropped short and swept off the brow. No wig. */}
        <path d="M13.4 14.6 Q13 6.6 20 6.6 Q27 6.6 26.6 14.6 Q24 9.6 20 9.9 Q16 9.6 13.4 14.6 Z" fill="#9aa3a6" />
        {/* Half-moon reading spectacles, which are the whole silhouette at this size. */}
        <g stroke="#c9a227" strokeWidth="0.9" fill="none">
          <path d="M14.9 15.6 h4.2 M20.9 15.6 h4.2" />
          <path d="M15 15.6 a2.1 1.9 0 0 0 4 0" />
          <path d="M21 15.6 a2.1 1.9 0 0 0 4 0" />
        </g>
        <circle cx="17.1" cy="15.3" r="0.75" fill="#3b464c" />
        <circle cx="22.9" cy="15.3" r="0.75" fill="#3b464c" />
        <path d="M18.2 20.2 h3.6" stroke="#a98f74" strokeWidth="0.9" strokeLinecap="round" />
      </g>
      <circle cx="20" cy="20" r="18" fill="none" stroke="var(--empire)" strokeWidth="1.6" opacity="0.85" />
    </svg>
  );
}

/**
 * The advisors again, standing rather than framed.
 *
 * Rebellion keeps its droid on screen at all times, at the edge of the frame,
 * never summoned — that is what "a character on screen" means. A circular bust
 * reads as a button; a figure standing on the floor reads as someone in the
 * room with you. Same palettes as the cameos above so they are recognisably
 * the same two characters.
 */
export function ParrotFigure({ size = 56 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 34 56"
      height={size}
      width={(size * 34) / 56}
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <ellipse cx="17" cy="53" rx="10" ry="2.4" fill="#030d12" opacity="0.5" />
      {/* Perch: base, post, and the bar he grips */}
      <ellipse cx="17" cy="51.4" rx="7.5" ry="2" fill="#5a4632" />
      <rect x="15.6" y="27" width="2.8" height="24" fill="#4a3a2a" />
      {/* Tail hangs behind the bar */}
      <path d="M19.5 22 Q25.5 32 21.5 37 Q17.6 30 19.5 22 Z" fill="#1f5c43" />
      <rect x="7" y="25.2" width="20" height="2.6" rx="1.3" fill="#6b5238" />
      {/* Feet */}
      <path d="M14.8 22 v4 M19.2 22 v4" stroke="#d8a13c" strokeWidth="1.4" strokeLinecap="round" />
      {/* Body and folded wing */}
      <path d="M11.6 25 Q8.8 15.6 17 11.6 Q25.2 15.6 22.4 25 Z" fill="#2f7a5a" />
      <path d="M19.6 14.6 Q23.8 18.8 21.2 24 Q18.2 19.4 19.6 14.6 Z" fill="#1f5c43" />
      {/* Head, crest, beak */}
      <circle cx="17" cy="10" r="5.6" fill="#3d9c73" />
      <path d="M13.6 5.2 Q14.6 0 17.4 3.4 Q20.2 -0.6 21.4 5.2 Z" fill="var(--alliance)" />
      <path d="M22.2 9 Q27.6 11 22.2 14.4 Q20.6 11.7 22.2 9 Z" fill="#d8a13c" />
      {/* One eye, and the patch over the other */}
      <circle cx="19.1" cy="8.8" r="1.6" fill="#f2f6f7" />
      <circle cx="19.4" cy="8.8" r="0.8" fill="#08161c" />
      <path d="M11.2 6.4 h4.8 v4 h-4.8 Z" fill="#0b1c22" />
      <path d="M8.8 5.6 L16.6 7.4" stroke="#0b1c22" strokeWidth="1.2" />
    </svg>
  );
}

export function SecretaryFigure({ size = 56 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 34 56"
      height={size}
      width={(size * 34) / 56}
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <ellipse cx="17" cy="53" rx="10" ry="2.4" fill="#030d12" opacity="0.5" />
      {/* Shoes under a long coat */}
      <path d="M12.6 48 h3.6 v3.4 h-3.6 Z M17.8 48 h3.6 v3.4 h-3.6 Z" fill="#2b343a" />
      {/* The coat: a narrow column, hem to shoulder */}
      <path d="M10.6 49.5 Q10.2 32 12.6 21.6 Q17 19.6 21.4 21.6 Q23.8 32 23.4 49.5 Z" fill="#8e9aa1" />
      <path d="M17 21 Q19.4 34 18.6 49.5 L23.4 49.5 Q23.8 32 21.4 21.6 Z" fill="#7d888e" />
      {/* Cravat at the throat, as in the cameo */}
      <path d="M17 21.4 L14.2 29 L17 26.6 L19.8 29 Z" fill="#e8edef" />
      {/* Hands clasped, waiting */}
      <ellipse cx="17" cy="35.4" rx="3.2" ry="2.2" fill="#b9c4c9" />
      {/* Neck, then the long face */}
      <rect x="15.4" y="16.6" width="3.2" height="5.4" rx="1.2" fill="#b9c4c9" />
      <ellipse cx="17" cy="11.4" rx="5" ry="6.4" fill="#b9c4c9" />
      {/* Severe hair, flat to the skull */}
      <path d="M12.4 9 Q17 1.6 21.6 9 Q17 5.6 12.4 9 Z" fill="#3b464c" />
      {/* Two unblinking eyes, and a mouth that is barely a line */}
      <circle cx="15.1" cy="11" r="0.85" fill="#0b1c22" />
      <circle cx="18.9" cy="11" r="0.85" fill="#0b1c22" />
      <path d="M14.8 15.2 h4.4" stroke="#7d888e" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

export function NarratorFigure({
  faction,
  size = 70,
  mood = 'neutral',
  talking = false,
}: {
  faction: 'empire' | 'alliance';
  size?: number;
  mood?: NarratorMood;
  talking?: boolean;
}) {
  // The painted crop of each mood still (plan D6), all three mounted and
  // cross-faded so a change of mood is a change of face and nothing else.
  // Talking is a gesture, not a mouth: the whole figure rocks a little for
  // as long as the line takes to read, the way Rebellion's droids do. The
  // drawn figures are the fallback if the paintings fail to load.
  const [failed, setFailed] = useState(false);
  if (failed) return faction === 'empire' ? <SecretaryFigure size={size} /> : <ParrotFigure size={size} />;
  const id = narratorIdFor(faction);
  return (
    <span
      className={`advisor__figure advisor__figure--${id} advisor__figure--${mood}${talking ? ' advisor__figure--talking' : ''}`}
      style={{ width: Math.round((size * 4) / 5), height: size }}
    >
      {NARRATOR_MOODS.map((m) => (
        <img
          key={m}
          className={`advisor__face${m === mood ? ' advisor__face--on' : ''}`}
          src={tabUrl(id, m)}
          alt=""
          draggable={false}
          onError={() => setFailed(true)}
        />
      ))}
    </span>
  );
}

/**
 * Hulls, in profile. Four silhouettes that read apart at icon size, and they
 * read apart by *size*, which is the thing that matters: one mast, two masts,
 * three masts and a row of gun ports, and a fat unarmed hull.
 */
export function ShipIcon({
  role,
  size = 24,
}: {
  role: 'small' | 'medium' | 'large' | 'transport';
  size?: number;
}) {
  const line = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const hull = { fill: 'currentColor', stroke: 'none' };
  const sail = { fill: 'currentColor', stroke: 'none', opacity: 0.55 };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {role === 'small' && (
        <g>
          {/* A sloop: one mast, fore-and-aft canvas, a low sharp hull. */}
          <path d="M5 17.5 H18.5 L16.5 20.5 H7 Z" {...hull} />
          <path d="M12 17 V4.5" {...line} />
          <path d="M12.5 5.5 L17.5 15.5 H12.5 Z" {...sail} />
          <path d="M11.5 8 L7.5 15.5 H11.5 Z" {...sail} opacity={0.35} />
        </g>
      )}
      {role === 'medium' && (
        <g>
          {/* A frigate: two masts of square sail on a longer, taller hull. */}
          <path d="M3 16 H21 L19 20.5 H5 Z" {...hull} />
          <path d="M4 16 L3 13.5 M20 16 L21.5 13" {...line} />
          <path d="M8.5 15.5 V4 M15.5 15.5 V3" {...line} />
          <path d="M5.5 6 H11.5 L11 11 H6 Z M12.5 5 H18.5 L18 10.5 H13 Z" {...sail} />
        </g>
      )}
      {role === 'large' && (
        <g>
          {/* A ship of the line: three masts, and two decks of guns. */}
          <path d="M1.5 14.5 H22.5 L20.5 21 H3.5 Z" {...hull} />
          <path d="M4 17.2 H20 M4.6 19.2 H19.4" stroke="#041219" strokeWidth="0.9" opacity="0.7" fill="none" />
          <path d="M6.5 14 V3.5 M12 14 V2 M17.5 14 V3.5" {...line} />
          <path d="M4 5 H9 L8.5 9.5 H4.5 Z M9.5 3.5 H14.5 L14 9 H10 Z M15 5 H20 L19.5 9.5 H15.5 Z" {...sail} />
        </g>
      )}
      {role === 'transport' && (
        <g>
          {/* A fluyt: a fat, round-bellied hull with high sides, one mast, no guns. */}
          <path d="M3 12.5 H21 C21 18 17.5 21 12 21 S3 18 3 12.5 Z" {...hull} />
          <path d="M12 12 V3" {...line} />
          <path d="M7.5 4.5 H16.5 L16 10.5 H8 Z" {...sail} />
        </g>
      )}
    </svg>
  );
}

export function NarratorPortrait({
  faction,
  size,
}: {
  faction: 'empire' | 'alliance';
  size?: number;
}) {
  return faction === 'empire' ? <SecretaryPortrait size={size} /> : <ParrotPortrait size={size} />;
}


/**
 * The whole painting, for a card rather than a medallion.
 *
 * The portraits are three-quarter figures against a harbor, and that is worth
 * seeing at card size. The medallion crops to the head because a circle 44px
 * across cannot hold a figure; this does the opposite job with the same file.
 *
 * A character with no painting gets the drawn cameo instead, at a size where it
 * is a deliberate illustration rather than a stand-in.
 */
/**
 * Which frame this painting hangs in, handed to the stylesheet as a variable.
 *
 * Only the url is inline, because only the bundler's glob knows the hashed
 * name; everything about how a frame is drawn lives in `.painting--framed` in
 * the stylesheet, where it can be read in one place.
 *
 * It used to be the whole border: `border: 15px solid` on the painting itself,
 * with the border-image in it. That put the picture in the *content* box, a
 * full fifteen pixels in from the frame on every side — and since a frame's
 * own artwork is a thin band with a dark field behind it, and the slice takes
 * all forty source pixels of that, thirteen of those fifteen were the frame's
 * dark field painted as a mat. Measured on the Crown's frame: two pixels of
 * gold, thirteen of mat, and a portrait sitting in a hole.
 *
 * So the frame is an overlay now (see the stylesheet), the picture fills the
 * whole box, and the frame is laid over its edges the way a frame lies on a
 * painting. The other half of the fix is in the art: the frames carry alpha,
 * so the field inside the band is a hole rather than a mat.
 */
function frameStyle(side: string): CSSProperties {
  const frame = paintedFrame(side);
  if (!frame) return {};
  return { ['--frame']: `url(${frame})` } as CSSProperties;
}

export function CharacterPainting({
  name,
  faction,
  people,
  height = 150,
  framed = false,
}: {
  name: string;
  faction: 'empire' | 'alliance' | 'neutral';
  people?: string;
  height?: number;
  /**
   * Whether to hang it in the frame of whoever they answer to.
   *
   * Opt-in, and the reason is the crew grid: framed, every card lost fifteen
   * pixels a side of face to a border and a mount, a Lord's card wore the
   * brass card border *and* a timber frame at once, and six of them on one
   * screen read as a junk shop. A frame is for one big painting you are
   * looking at, not for a grid of thumbnails you are scanning.
   */
  framed?: boolean;
}) {
  const [holder, near] = useInView<HTMLDivElement>();
  const painting = near ? paintedPortrait(name) : undefined;
  /**
   * The frame of whoever they answer to.
   *
   * Sean's frame sheet, 17 September: *"apply where you think will look
   * good."* The two biggest paintings on any screen are an officer's portrait
   * and an island's banner, and both sat in a plain rounded box. A frame is
   * the cheapest thing in the game that says whose this is — the Crown's
   * brass corners, the Brethren's weathered timber, rope for anyone who has
   * not chosen — and it costs no room, because it is drawn in the padding the
   * box already had.
   */
  return (
    <div
      ref={holder}
      className={`painting${framed ? ' painting--framed' : ''}`}
      style={{ height, ...(framed ? frameStyle(faction) : {}) }}
    >
      {painting ? (
        <img src={painting} alt="" loading="lazy" />
      ) : (
        <div className="painting__cameo">
          <CharacterPortrait name={name} faction={faction} people={people} size={height - 16} />
        </div>
      )}
    </div>
  );
}


/**
 * The island as a painted banner across the top of its panel.
 *
 * Ten archetypes cover every island in the game, which is the only way this is
 * affordable and also the right answer: an island does not need its own
 * painting, it needs to look like the kind of place it is. A jungle isle in the
 * Amber Sea and one in the Sea of Storms share a picture and differ in
 * everything the panel goes on to say about them.
 *
 * The drawn portrait stays as the fallback, and stays the only thing shown for
 * an unexplored island — you have not seen it, so you do not get a painting of
 * it.
 */
export function IslandBanner({
  archetype,
  seed,
  faction,
  settled,
  facilities,
  facilityTypes,
  mutiny,
  height = 132,
}: {
  archetype?: string;
  seed: string;
  faction: 'empire' | 'alliance' | 'neutral' | 'none';
  settled: boolean;
  facilities: number;
  facilityTypes?: string[];
  mutiny?: boolean;
  height?: number;
}) {
  const [holder, near] = useInView<HTMLDivElement>();
  const painting = near ? islandPainting(seed, archetype) : undefined;
  if (!painting) {
    return (
      <div className="portrait" ref={holder}>
        <IslandPortrait
          seed={seed}
          faction={faction}
          settled={settled}
          facilities={facilities}
          facilityTypes={facilityTypes as never}
          mutiny={mutiny}
          size={height}
        />
      </div>
    );
  }
  return (
    <div
      ref={holder}
      className="isle-banner painting--framed"
      style={{ height: Math.round(height * 0.86), ...frameStyle(faction) }}
    >
      <img src={painting} alt="" loading="lazy" />
      {/* The panel's own text starts immediately under this, so the foot of the
          banner fades rather than ending on a hard edge. */}
      <span className="isle-banner__fade" />
    </div>
  );
}


/**
 * Whatever is in the water, painted.
 *
 * Unlike every other painting in the game this one has no drawn fallback and
 * renders nothing when it is missing. A ship or an island has to appear or the
 * panel makes no sense; a sea monster is the one thing that can simply not be
 * there, which is also the most honest thing a rumour can do.
 */
export function CreaturePainting({
  slug,
  height = 92,
  className,
}: {
  slug: string;
  height?: number;
  className?: string;
}) {
  const [holder, near] = useInView<HTMLDivElement>();
  const painting = near ? paintedCreature(slug) : undefined;
  return (
    <div
      ref={holder}
      className={`creature${className ? ` ${className}` : ''}`}
      style={{ height }}
    >
      {painting && <img src={painting} alt="" loading="lazy" decoding="async" />}
      <span className="creature__fade" />
    </div>
  );
}

/**
 * A hull, painted, at the size a list can hold.
 *
 * Small on purpose. The paintings are three-quarter views of a whole vessel
 * and they are lovely, but a fleet is a row of classes with a count against
 * each — there is room for a thumbnail, not a plate. What survives at fifty
 * pixels is the silhouette and the colour of the canvas, which happens to be
 * exactly what tells a Crown ship from a Confederate one.
 *
 * Falls back to the drawn icon, which is still the only thing that works at
 * the 22px the island panel uses.
 */
export function ShipThumb({
  faction,
  role,
  cls,
  size = 46,
}: {
  faction: 'empire' | 'alliance';
  role: 'small' | 'medium' | 'large' | 'transport';
  /**
   * The hull's own id, which is what the paintings are named by now.
   *
   * There were eight ship paintings — one per size per side — and twenty-one
   * hulls arrived on 16 September, so a Razorback and a Bulwark can no longer
   * share a picture on the grounds that both are medium. `role` stays as the
   * fallback for the drawn glyph and for anything asking before it knows which
   * class it has.
   */
  cls?: string;
  size?: number;
}) {
  const painting = (cls ? paintedShip(cls) : undefined) ?? paintedShip(`${faction}-${role}`);
  if (!painting) return <ShipIcon role={role} size={size * 0.6} />;
  // 4:3, at Sean's word, and the same shape the paintings are delivered in —
  // the box used to be 1:0.82 against a 3:4 painting and threw away 39% of
  // every hull, the topmasts and the waterline both.
  return (
    <span className="shipthumb" style={{ width: size, height: Math.round(size * 0.75) }}>
      <img src={painting} alt="" loading="lazy" />
    </span>
  );
}


/**
 * Works on an island, painted.
 *
 * The facility paintings came as wide strips — a quarry with ore carts, a mill
 * with its waterwheel, a slipway with a hull on the stocks — one for each side,
 * because a Crown shipyard under a covered slip and a Confederate one in a
 * hidden cove are the clearest single statement of what the two are.
 *
 * Shown as a band beside the name rather than in place of the icon: the drawn
 * glyph still does the work at the 22px the build buttons use, and a painting
 * that wide only reads with room to be wide in.
 */
/**
 * The shape every works picture is shown in, whatever shape it was painted.
 *
 * One ratio for all of them, because the board is a grid and a row is as tall
 * as its tallest tile — mixing a 4:3 painting with a 4:1 strip leaves the strip
 * floating in a tile half empty. 16:10 is the compromise: a whole painting
 * keeps the middle 83% of its height, which on the fort is the cannon, the
 * wall and the water, and a sliced strip shows its middle two fifths, which is
 * the building the strip was painted around.
 *
 * As the strips are replaced with paintings of their own this can go to 4:3.
 */
const FACILITY_BAND = 1.6;

/**
 * And 4:3, which is the shape everything commissioned one at a time arrives
 * in. Sean, 19 September: *"All the unit images I'm sending you are 4:3 can
 * you please scale them so they don't cut?"* He is right, and the fortresses
 * he had just sent were the proof — both 4:3 paintings, both squeezed into the
 * 1.6 band and losing their sky and their water to it. A painting no longer
 * has to fit one number: the box takes the painting's own shape, so a whole
 * picture shows whole and a sliced strip keeps the band it was sliced for.
 */
const FACILITY_WHOLE = 4 / 3;

/** Whose colours a works flies. Nobody's counts as the Crown's, for art. */
function facilitySide(owner: 'empire' | 'alliance' | 'neutral' | 'none'): 'empire' | 'alliance' {
  return owner === 'alliance' ? 'alliance' : 'empire';
}

/**
 * Whether this works has a painting at all, so a caller can decide between the
 * picture and the drawn glyph before it lays anything out.
 *
 * Two places to look, in order. `buildings/` holds paintings commissioned one
 * at a time as whole 4:3 pictures — the Crown fort, which arrived on 16
 * September, is the first. `islands/` holds the older five, which were sliced
 * out of a contact sheet and are wide strips about four to one. A works with
 * neither still gets its drawn glyph.
 */
export function facilityArt(
  type: string,
  owner: 'empire' | 'alliance' | 'neutral' | 'none',
): { src: string; ratio: number } | undefined {
  const kind = type.replace(/_/g, '-');
  const side = facilitySide(owner);
  const whole = paintedBuilding(`${kind}-${side}`);
  if (whole) return { src: whole, ratio: FACILITY_WHOLE };
  const strip = paintedIsland(`facility-${kind}-${side}`);
  return strip ? { src: strip, ratio: FACILITY_BAND } : undefined;
}

export function facilityPainting(
  type: string,
  owner: 'empire' | 'alliance' | 'neutral' | 'none',
): string | undefined {
  return facilityArt(type, owner)?.src;
}

export function FacilityThumb({
  type,
  owner,
  width = 96,
  /** Fill whatever it is put in, at the painting's own proportions. */
  fill,
}: {
  type: string;
  owner: 'empire' | 'alliance' | 'neutral' | 'none';
  width?: number;
  fill?: boolean;
}) {
  const art = facilityArt(type, owner);
  if (!art) return <FacilityIcon type={type as never} size={30} />;
  return (
    <span
      className="facthumb"
      style={
        fill
          ? { width: '100%', aspectRatio: String(art.ratio) }
          : { width, height: Math.round(width / art.ratio) }
      }
    >
      <img src={art.src} alt="" loading="lazy" />
    </span>
  );
}
