import { CharacterPortrait, INK, islandPath } from './art';

/**
 * Four house styles, each drawing the three things the game is made of.
 *
 * Open with `?art=gallery`. Not part of the game.
 *
 * The earlier comparison (`?art=style`) only varied the inking of one family.
 * These are four genuinely different families, so the choice is a real one:
 * the same officer, the same ship and the same island, drawn four ways at the
 * sizes they ship at.
 */

const W = 64;

/* ------------------------------------------------------------------ *
 * Shared geometry, so what varies is the treatment and nothing else
 * ------------------------------------------------------------------ */

const SHIP_HULL = 'M 7 41 h 50 l -8 11 h -34 Z';
const SHIP_MASTS = 'M 20 40 V 14 M 32 40 V 7 M 44 40 V 18';
const SHIP_SAILS = 'M 21 16 l 9 22 h -9 Z M 33 10 l 11 28 H 33 Z M 45 20 l 8 18 h -8 Z';

const ISLE = islandPath('Bysse', 22, 13);
const ISLE_SHELF = islandPath('Bysse', 28, 13);

/* ------------------------------------------------------------------ *
 * 1. Inked — the current house style
 * ------------------------------------------------------------------ */

const line = { stroke: INK.black, strokeWidth: 3, strokeLinejoin: 'round' as const };

function InkedShip({ tint }: { tint: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${W}`} width="100%" height="100%" aria-hidden="true">
      <path d={SHIP_MASTS} stroke={INK.black} strokeWidth="3.4" strokeLinecap="round" />
      <path d={SHIP_SAILS} fill={INK.bone} {...line} />
      <path d={SHIP_HULL} fill={tint} {...line} />
    </svg>
  );
}

function InkedIsle({ tint }: { tint: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${W}`} width="100%" height="100%" aria-hidden="true">
      <g transform="translate(32 32)">
        <path d={ISLE_SHELF} fill={INK.dark} stroke={INK.black} strokeWidth="2.5" />
        <path d={ISLE} fill={tint} {...line} />
        <path d="M -6 4 h 5 v -5 l 4 -3 l 4 3 v 5 h 5" fill={INK.bone} {...line} />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * 2. Woodcut — engraved line, hatching for tone, no flat fills
 * ------------------------------------------------------------------ */

/**
 * Tone from line density, which is how an actual chart engraving does it and
 * the reason this style suits a game about charts. Three densities is enough;
 * a fourth stops reading as hatching and starts reading as grey.
 */
function Hatch({ id, gap, angle }: { id: string; gap: number; angle: number }) {
  return (
    <pattern
      id={id}
      width={gap}
      height={gap}
      patternUnits="userSpaceOnUse"
      patternTransform={`rotate(${angle})`}
    >
      <line x1="0" y1="0" x2="0" y2={gap} stroke={INK.bone} strokeWidth="1" />
    </pattern>
  );
}

function WoodcutShip() {
  return (
    <svg viewBox={`0 0 ${W} ${W}`} width="100%" height="100%" aria-hidden="true">
      <defs>
        <Hatch id="wc-ship-dense" gap={2.2} angle={38} />
        <Hatch id="wc-ship-open" gap={4} angle={38} />
      </defs>
      <path d={SHIP_MASTS} stroke={INK.bone} strokeWidth="1.4" />
      <path d={SHIP_SAILS} fill="url(#wc-ship-open)" stroke={INK.bone} strokeWidth="1.4" />
      <path d={SHIP_HULL} fill="url(#wc-ship-dense)" stroke={INK.bone} strokeWidth="1.6" />
      {/* Waterline, drawn as a scatter of short strokes rather than a rule. */}
      <path
        d="M 4 54 h 8 M 16 56 h 10 M 30 54 h 7 M 41 57 h 9 M 53 54 h 7"
        stroke={INK.bone}
        strokeWidth="1.2"
        opacity="0.75"
      />
    </svg>
  );
}

function WoodcutIsle() {
  return (
    <svg viewBox={`0 0 ${W} ${W}`} width="100%" height="100%" aria-hidden="true">
      <defs>
        <Hatch id="wc-isle" gap={3} angle={-40} />
      </defs>
      <g transform="translate(32 32)">
        {/* Depth contours, exactly as a chart draws a shoal. */}
        <path d={islandPath('Bysse', 29, 13)} fill="none" stroke={INK.mid} strokeWidth="1" />
        <path d={ISLE_SHELF} fill="none" stroke={INK.mid} strokeWidth="1" />
        <path d={ISLE} fill="url(#wc-isle)" stroke={INK.bone} strokeWidth="1.6" />
      </g>
    </svg>
  );
}

function WoodcutPerson() {
  return (
    <svg viewBox={`0 0 ${W} ${W}`} width="100%" height="100%" aria-hidden="true">
      <defs>
        <Hatch id="wc-coat" gap={2.4} angle={52} />
        <clipPath id="wc-disc">
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="30" fill="none" stroke={INK.bone} strokeWidth="1.4" />
      <g clipPath="url(#wc-disc)" stroke={INK.bone} strokeWidth="1.5">
        <path d="M 14 64 v -10 q 0 -9 9 -12 h 18 q 9 3 9 12 v 10 Z" fill="url(#wc-coat)" />
        <path
          d="M 32 16 q 9.5 0 9.5 10 q 0 9.5 -9.5 11.4 q -9.5 -1.9 -9.5 -11.4 q 0 -10 9.5 -10 Z"
          fill="none"
        />
        <path d="M 17 20 q 15 -13 30 0 q -8 -4 -15 -4 q -7 0 -15 4 Z" fill="url(#wc-coat)" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * 3. Pixel — an actual grid, the old-sprite answer taken literally
 * ------------------------------------------------------------------ */

/**
 * Drawn as a bitmap and painted as rects. Worth showing honestly rather than
 * approximating: a grid this coarse is a real constraint, and the whole reason
 * old sprite sets cohere is that nobody could cheat it.
 *
 * The cost is that it wants fixed sizes — scale it to 44px from a 16px grid
 * and the pixels stop being square unless the factor is whole.
 */
const PIXEL_INK: Record<string, string> = {
  k: INK.black,
  d: INK.dark,
  m: INK.mid,
  p: INK.pale,
  b: INK.bone,
  s: '#10404f',
  w: '#072029',
};

function Bitmap({ rows, tint }: { rows: string[]; tint: string }) {
  const n = rows.length;
  // A bitmap written as strings has no type checking at all: one stray letter
  // paints a pixel in `undefined`, which renders black and looks deliberate.
  // This page never ships, so the check is unconditional.
  rows.forEach((row, y) => {
    if (row.length !== n) console.warn(`Bitmap row ${y} is ${row.length}, expected ${n}`);
    [...row].forEach((c) => {
      if (c !== '.' && c !== 'f' && !PIXEL_INK[c]) console.warn(`Bitmap: no ink for '${c}'`);
    });
  });
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width="100%" height="100%" shapeRendering="crispEdges" aria-hidden="true">
      {rows.map((row, y) =>
        [...row].map((c, x) =>
          c === '.' ? null : (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="1"
              height="1"
              fill={c === 'f' ? tint : PIXEL_INK[c]}
            />
          ),
        ),
      )}
    </svg>
  );
}

const PX_PERSON = [
  '................',
  '................',
  '...kkkkkkkkkk...',
  '..kkddddddddkk..',
  '....kddddddk....',
  '....kbbbbbbk....',
  '....kbbbbbbk....',
  '....kbbbbbbk....',
  '.....kbbbbk.....',
  '......kmmk......',
  '...kkkkmmkkkk...',
  '..kffffffffffk..',
  '.kffffffffffffk.',
  '.kffffffffffffk.',
  '.kffffffffffffk.',
  '.kffffffffffffk.',
];

const PX_SHIP = [
  '................',
  '.......k........',
  '......kbk.......',
  '.....kbbk.......',
  '....kbbbk.......',
  '...kbbbbk.kk....',
  '..kbbbbbk.kbk...',
  '..........kbbk..',
  '.......k..kbbk..',
  '.......k..kbbk..',
  '................',
  '.kkkkkkkkkkkkkk.',
  '.kffffffffffffk.',
  '..kffffffffffk..',
  '...kkkkkkkkkk...',
  '..wwwwwwwwwwww..',
];

const PX_ISLE = [
  'wwwwwwwwwwwwwwww',
  'wwwwwsssssswwwww',
  'wwwsssmmmmssswww',
  'wwssmmmppmmmssww',
  'wwsmmppppppmmsww',
  'wsmmpppbbpppmmsw',
  'wsmppppbbppppmsw',
  'wsmppppppppppmsw',
  'wwsmpppkkpppmssw',
  'wwssmmpkkpmmssww',
  'wwwssssmmsssswww',
  'wwwwwssssswwwwww',
  'wwwwwwwwwwwwwwww',
  'wwwwwwwwwwwwwwww',
  'wwwwwwwwwwwwwwww',
  'wwwwwwwwwwwwwwww',
];

/* ------------------------------------------------------------------ *
 * 4. Paper-cut — layered flat planes, no outline, shadow by offset
 * ------------------------------------------------------------------ */

/**
 * No line at all. Shapes are separated by tone and by a hard offset shadow, as
 * though each was cut from paper and laid down. Softest of the four and the
 * only one that would not need redrawing to work on a light ground.
 */
function PaperShip({ tint }: { tint: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${W}`} width="100%" height="100%" aria-hidden="true">
      <path d={SHIP_SAILS} transform="translate(2 2)" fill={INK.dark} />
      <path d={SHIP_SAILS} fill={INK.bone} />
      <path d={SHIP_HULL} transform="translate(2 2)" fill={INK.black} opacity="0.6" />
      <path d={SHIP_HULL} fill={tint} />
      <path d="M 7 41 h 50 l -2 3 h -46 Z" fill={INK.black} opacity="0.25" />
    </svg>
  );
}

function PaperIsle({ tint }: { tint: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${W}`} width="100%" height="100%" aria-hidden="true">
      <g transform="translate(32 32)">
        <path d={ISLE_SHELF} fill="#10404f" />
        <path d={ISLE} transform="translate(2 3)" fill={INK.black} opacity="0.45" />
        <path d={ISLE} fill={tint} />
        <path d={islandPath('Bysse', 13, 13)} fill={INK.bone} opacity="0.22" />
      </g>
    </svg>
  );
}

function PaperPerson({ tint }: { tint: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${W}`} width="100%" height="100%" aria-hidden="true">
      <defs>
        <clipPath id="pp-disc">
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="30" fill={INK.dark} />
      <g clipPath="url(#pp-disc)">
        <path d="M 14 64 v -10 q 0 -9 9 -12 h 18 q 9 3 9 12 v 10 Z" fill={tint} />
        <path d="M 27.5 32 h 9 v 12 h -9 Z" fill={INK.mid} />
        <path
          d="M 32 16 q 9.5 0 9.5 10 q 0 9.5 -9.5 11.4 q -9.5 -1.9 -9.5 -11.4 q 0 -10 9.5 -10 Z"
          fill={INK.pale}
        />
        <path d="M 17 20 q 15 -13 30 0 q -8 -4 -15 -4 q -7 0 -15 4 Z" fill={INK.black} />
        <path d="M 17 20 q 15 -13 30 0 q -8 -4 -15 -4 q -7 0 -15 4 Z" transform="translate(0 2)" fill={INK.dark} opacity="0.5" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * The page
 * ------------------------------------------------------------------ */

const STYLES = [
  {
    name: 'Inked',
    blurb:
      'The current house style. Heavy black outline, two flat fills, faction colour in the object. Loudest, and the best of the four at 32px.',
    person: () => <CharacterPortrait name="Captain Fenwick Pryor" faction="empire" people="Human" size={92} />,
    ship: (t: string) => <InkedShip tint={t} />,
    isle: (t: string) => <InkedIsle tint={t} />,
  },
  {
    name: 'Woodcut',
    blurb:
      'Engraved line, tone from hatching, no flat fills at all. The most period-honest of the four — it is how the charts this game is set inside were actually printed — and the only one where an island can carry real depth contours.',
    person: () => <WoodcutPerson />,
    ship: () => <WoodcutShip />,
    isle: () => <WoodcutIsle />,
  },
  {
    name: 'Pixel',
    blurb:
      'A real 16×16 grid painted as rects, not an imitation of one. The constraint is the point: nobody can cheat it, which is most of why old sprite sets cohere. Costs you free scaling — it wants whole-number sizes.',
    person: (t: string) => <Bitmap rows={PX_PERSON} tint={t} />,
    ship: (t: string) => <Bitmap rows={PX_SHIP} tint={t} />,
    isle: (t: string) => <Bitmap rows={PX_ISLE} tint={t} />,
  },
  {
    name: 'Paper-cut',
    blurb:
      'No line anywhere. Shapes separated by tone and a hard offset shadow, as though cut from paper and laid down. Softest, most modern, and the only one that would still work on a light ground.',
    person: (t: string) => <PaperPerson tint={t} />,
    ship: (t: string) => <PaperShip tint={t} />,
    isle: (t: string) => <PaperIsle tint={t} />,
  },
];

const SIZES = [32, 44, 92];

export function StyleGallery() {
  return (
    <div className="artsheet">
      <header className="artsheet__head">
        <h1>Four styles, three subjects</h1>
        <p className="muted">
          The same officer, ship and island drawn four ways, each at the sizes they ship at. These
          are four different families rather than four inkings of one, so this is the real choice.
        </p>
      </header>

      {STYLES.map((style) => (
        <section className="artsheet__row" key={style.name}>
          <h2 className="artsheet__label">{style.name}</h2>
          <p className="artsheet__blurb">{style.blurb}</p>
          <div className="artsheet__items">
            {(
              [
                ['person', style.person, 'var(--empire)'],
                ['ship', style.ship, 'var(--alliance)'],
                ['island', style.isle, 'var(--empire)'],
              ] as const
            ).map(([label, draw, tint]) =>
              SIZES.map((size) => (
                <div className="artsheet__item" key={`${style.name}-${label}-${size}`}>
                  <div
                    className="artsheet__stage"
                    style={size > 76 ? { width: 108, height: 108 } : undefined}
                  >
                    <div style={{ width: size, height: size }}>{draw(tint)}</div>
                  </div>
                  <span className="artsheet__caption">
                    {label} {size}
                  </span>
                </div>
              )),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
