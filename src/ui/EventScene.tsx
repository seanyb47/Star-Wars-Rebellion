import type { EventKind } from '../sim';

/**
 * A picture for a thing that happened.
 *
 * The original stops you with a headline, a painting and one plain sentence,
 * where we had a line in a log. These are the paintings: flat silhouettes
 * against a sky, drawn in code like everything else in the game, and tinted by
 * whichever side the news concerns — so a card reads as good or bad news
 * before you have read a word of it.
 */

/** Deterministic hash so the same event always draws the same picture. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded(seed: string) {
  let s = hash(seed);
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const NIGHT = '#020c11';
const QUAY = '#0a2029';

/** A crowd on a quayside. Fixed, so the scenes stay recognisable. */
const CROWD = [
  { x: 44, h: 6, arm: true },
  { x: 62, h: 2, arm: false },
  { x: 78, h: 8, arm: true },
  { x: 96, h: 3, arm: false },
  { x: 112, h: 6, arm: false },
  { x: 206, h: 4, arm: true },
  { x: 224, h: 8, arm: false },
  { x: 242, h: 3, arm: true },
  { x: 260, h: 6, arm: false },
  { x: 278, h: 2, arm: false },
];

/**
 * One person, from behind, at the size of a thumbnail.
 *
 * The head sits clear of the shoulders with a real gap. Drawn any closer they
 * merge into a rounded block and a crowd reads as a row of tombstones, which
 * is what the first version of this did.
 */
function Figure({ x, y, h, arm }: { x: number; y: number; h: number; arm?: boolean }) {
  const shoulder = y - h - 9;
  return (
    <g fill={NIGHT}>
      <circle cx={x} cy={shoulder - 5.5} r="3.4" />
      <path d={`M ${x - 4.4} ${y} v ${-(h + 7)} q 0 -2 4.4 -2 q 4.4 0 4.4 2 v ${h + 7} Z`} />
      {arm && (
        <path
          d={`M ${x + 2} ${shoulder + 1} L ${x + 10} ${shoulder - 12}`}
          stroke={NIGHT}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

/** Where a raised arm ends, so a torch can be put in the hand and not beside it. */
function handOf(x: number, y: number, h: number) {
  return { x: x + 10, y: y - h - 9 - 12 };
}

/** A ship in profile, as a silhouette on the horizon. */
function Hull({ x, y, scale = 1, flip = false }: { x: number; y: number; scale?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`} fill={NIGHT}>
      <path d="M -26 0 h 52 l -7 9 h -38 Z" />
      <path d="M -14 -1 V -34 M 2 -1 V -42 M 16 -1 V -30" stroke={NIGHT} strokeWidth="2.2" />
      <path d="M -14 -32 l 11 24 h -11 Z M 2 -40 l 12 30 H 2 Z M 16 -28 l 8 18 h -8 Z" />
    </g>
  );
}

export function EventScene({
  kind,
  tint = 'var(--neutral)',
  seed = '',
  height = 132,
}: {
  kind: EventKind;
  /** The colour of the side the news is about. */
  tint?: string;
  seed?: string;
  height?: number;
}) {
  const random = seeded(`${kind}-${seed}`);
  const W = 320;
  const H = 132;
  // A horizon that wanders a little from card to card, so no two are identical.
  const sea = 92 + Math.round(random() * 10);
  const id = `${kind}-${hash(seed).toString(36)}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={height}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06161d" />
          <stop offset="75%" stopColor="#0f2f3c" />
        </linearGradient>
        {/* Radial, not linear. A linear fade across an ellipse's box leaves a
            hard rim along the top, and the whole thing draws as a dome. */}
        <radialGradient id={`glow-${id}`} cx="50%" cy="100%" r="72%">
          <stop offset="0%" stopColor={tint} stopOpacity="0.42" />
          <stop offset="45%" stopColor={tint} stopOpacity="0.16" />
          <stop offset="100%" stopColor={tint} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill={`url(#sky-${id})`} />
      {/* A low sun behind whatever is happening, in the colour of the side it
          happened to — most of why these read at a glance. Wide and shallow,
          and faded well before its edge, or it draws as a hill. */}
      <rect width={W} height={sea + 10} fill={`url(#glow-${id})`} />
      <rect y={sea} width={W} height={H - sea} fill="#04141b" />
      <path d={`M 0 ${sea} H ${W}`} stroke={tint} strokeWidth="1" opacity="0.45" />
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M -20 ${sea + 9 + i * 8} q 30 ${i % 2 ? 4 : -4} 60 0 t 60 0 t 60 0 t 60 0 t 60 0`}
          fill="none"
          stroke="#0d3442"
          strokeWidth="1.6"
          opacity={0.85 - i * 0.18}
        />
      ))}

      {kind === 'flip' && (
        <g>
          {/* A flag going up over a harbour, and the crowd that watched it. */}
          <path d={`M 0 ${sea} h 320 v 40 h -320 Z`} fill={QUAY} />
          <path d={`M 160 ${sea} V 24`} stroke="#154150" strokeWidth="3" strokeLinecap="round" />
          <path d="M 162 26 l 44 9 l -44 9 Z" fill={tint} />
          {CROWD.map((c, i) => (
            <Figure key={i} x={c.x} y={sea + 26} h={c.h} arm={c.arm} />
          ))}
        </g>
      )}

      {kind === 'mutiny' && (
        <g>
          {/* The same crowd, with torches, and nobody in charge. */}
          <path d={`M 0 ${sea} h 320 v 40 h -320 Z`} fill={QUAY} />
          <path d={`M 160 ${sea} V 30`} stroke="#154150" strokeWidth="3" strokeLinecap="round" />
          <path d={`M 158 34 l -26 7 l 26 6 Z`} fill="#3b464c" opacity="0.8" />
          {CROWD.concat(CROWD.map((c) => ({ ...c, x: c.x + 15, h: c.h + 3 }))).map((c, i) => (
            <g key={i}>
              <Figure x={c.x} y={sea + 28} h={c.h} arm={i % 3 === 0} />
              {i % 3 === 0 &&
                (() => {
                  // In the hand, not floating beside it.
                  const hand = handOf(c.x, sea + 28, c.h);
                  return (
                    <>
                      <ellipse cx={hand.x} cy={hand.y - 4} rx="3.4" ry="5" fill="#d8574c" />
                      <ellipse cx={hand.x} cy={hand.y - 5} rx="1.5" ry="2.6" fill="#f2d08a" />
                    </>
                  );
                })()}
            </g>
          ))}
        </g>
      )}

      {kind === 'battle' && (
        <g>
          {/* Two of them, close enough to hurt each other. */}
          <Hull x={72} y={sea + 4} scale={0.95} />
          <Hull x={250} y={sea + 6} scale={0.95} flip />
          {[0, 1, 2].map((i) => (
            <ellipse
              key={i}
              cx={120 + i * 40}
              cy={sea - 12 - i * 4}
              rx={16 - i * 2}
              ry={10 - i}
              fill="#9fb4bd"
              opacity={0.22 - i * 0.05}
            />
          ))}
          <ellipse cx={104} cy={sea - 14} rx="8" ry="5" fill="#f2d08a" opacity="0.75" />
          <ellipse cx={218} cy={sea - 16} rx="7" ry="4.5" fill="#f2d08a" opacity="0.6" />
        </g>
      )}

      {kind === 'loss' && (
        <g>
          {/* Going down by the head, with her spars already in the water. */}
          <g transform={`translate(150 ${sea + 10}) rotate(-24)`} fill={NIGHT}>
            <path d="M -28 0 h 54 l -8 10 h -38 Z" />
            <path d="M -10 -1 V -30 M 8 -1 V -20" stroke={NIGHT} strokeWidth="2.2" />
            <path d="M -10 -28 l 10 20 h -10 Z" />
          </g>
          <path
            d={`M 96 ${sea + 16} l 36 -9 M 196 ${sea + 12} l 30 6`}
            stroke={NIGHT}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {[0, 1, 2, 3, 4].map((i) => (
            <circle
              key={i}
              cx={108 + i * 26}
              cy={sea + 20 + (i % 2) * 4}
              r={2.2}
              fill="#0d3442"
            />
          ))}
        </g>
      )}

      {kind === 'order' && (
        <g>
          {/* Something finished: a hull on the stocks and the crane that did it. */}
          <path d={`M 0 ${sea} h 320 v 40 h -320 Z`} fill={QUAY} />
          <path
            d={`M 92 ${sea + 14} h 120 l -14 -30 h -92 Z`}
            fill={NIGHT}
          />
          <path d={`M 118 ${sea - 16} V 40 M 118 42 h 54`} stroke="#154150" strokeWidth="3" />
          <path d={`M 172 42 v 16`} stroke="#154150" strokeWidth="2" />
          <rect x={166} y={58} width={13} height={11} fill={tint} opacity="0.85" />
          {CROWD.slice(0, 4).map((c, i) => (
            <Figure key={i} x={c.x - 10} y={sea + 26} h={2} />
          ))}
        </g>
      )}

      {kind === 'mission' && (
        <g>
          {/* A boat going in, and a lit window waiting for it. */}
          <path d={`M 0 ${sea} h 120 v 40 h -120 Z`} fill={QUAY} />
          <rect x={28} y={sea - 34} width={46} height={34} fill={NIGHT} />
          <rect x={40} y={sea - 24} width={9} height={10} fill="#f2d08a" opacity="0.75" />
          <rect x={56} y={sea - 24} width={9} height={10} fill="#f2d08a" opacity="0.4" />
          <g transform={`translate(212 ${sea + 12})`} fill={NIGHT}>
            <path d="M -22 0 q 22 9 44 0 l -5 7 h -34 Z" />
            <path d="M -12 -2 l -14 -10 M 10 -2 l 14 -10" stroke={NIGHT} strokeWidth="2" strokeLinecap="round" />
            <circle cx={-2} cy={-9} r="3.4" />
            <path d="M -6 -1 v -8 h 8 v 8 Z" />
          </g>
        </g>
      )}

      {kind === 'war' && (
        <g>
          {/* The end of it: a fleet under one flag, and nobody left to fight. */}
          <Hull x={60} y={sea + 6} scale={0.72} />
          <Hull x={160} y={sea + 12} scale={1.05} />
          <Hull x={262} y={sea + 5} scale={0.68} />
          <path d={`M 160 ${sea - 46} V 18`} stroke="#154150" strokeWidth="2.6" />
          <path d="M 162 20 l 40 8 l -40 8 Z" fill={tint} />
        </g>
      )}
    </svg>
  );
}
