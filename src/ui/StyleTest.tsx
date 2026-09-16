/**
 * Three candidate house styles, drawn on the same subjects.
 *
 * Open with `?art=style`. Not part of the game.
 *
 * The subjects are deliberately the things the contact sheet said were weakest
 * — people, ships, buildings — and every candidate draws the *same* geometry,
 * so what is being compared is the treatment and nothing else. Pick by looking
 * at the bottom row first: if the silhouettes do not read, no amount of
 * shading above will save them.
 */

const INK = {
  /** The ramp. Five steps, and every drawing uses only these. A fixed palette
   *  is most of what makes an old sprite set look like a set. */
  black: '#0a1116',
  dark: '#1d2b33',
  mid: '#5c7078',
  pale: '#a9bcc2',
  bone: '#e8e2d1',
} as const;

type Persona = {
  key: string;
  name: string;
  people: string;
  /** Headgear, which is most of a silhouette at 32px. */
  hat: 'tricorn' | 'none' | 'hood' | 'crest';
  /** How wide the shoulders sit — a build reads before a face does. */
  build: number;
  tusks?: boolean;
};

const PEOPLE: Persona[] = [
  { key: 'hale', name: 'Hale', people: 'Human officer', hat: 'tricorn', build: 1 },
  { key: 'torvik', name: 'Torvik', people: 'Urskin', hat: 'none', build: 1.42, tusks: true },
  { key: 'sable', name: 'Sable', people: 'The Hushed', hat: 'hood', build: 0.72 },
  { key: 'quist', name: 'Quist', people: 'Reef-folk', hat: 'crest', build: 1.05 },
];

/* ---------- Shared geometry. One set of shapes, three ways of inking it. ---------- */

/** The bust: shoulders and neck, widened by build. */
function bustPath(build: number): string {
  const w = 17 * build;
  return `M ${32 - w} 64 v -9 q 0 -8 ${w * 0.52} -11 q 3.5 -1.2 4.6 -4.4 h ${
    w * 0.34
  } q 1.1 3.2 4.6 4.4 q ${w * 0.52} 3 ${w * 0.52} 11 v 9 Z`;
}

function headPath(): string {
  // Slightly oval, and flat-bottomed so a jaw reads rather than a ball.
  return 'M 32 18 q 9.5 0 9.5 10.5 q 0 9.5 -9.5 11.5 q -9.5 -2 -9.5 -11.5 q 0 -10.5 9.5 -10.5 Z';
}

/** Headgear, the loudest thing in a small silhouette. */
function hatPath(hat: Persona['hat']): string | null {
  switch (hat) {
    case 'tricorn':
      // A wide flat brim with a peak: unmistakable at any size.
      return 'M 13 21 q 19 -13 38 0 q -9 -3.5 -19 -3.5 q -10 0 -19 3.5 Z M 18 21 q 14 -16 28 0 q -14 -6 -28 0 Z';
    case 'hood':
      return 'M 21 24 q 0 -17 11 -17 q 11 0 11 17 q -4 -6 -11 -6 q -7 0 -11 6 Z';
    case 'crest':
      // Three swept fins, Reef-folk.
      return 'M 26 16 l -5 -11 l 8 7 Z M 32 14 l 0 -13 l 4 12 Z M 38 16 l 6 -10 l -2 10 Z';
    default:
      return null;
  }
}

function tusksPath(): string {
  return 'M 27 35 l -1.6 6 l 3 -5.4 Z M 37 35 l 1.6 6 l -3 -5.4 Z';
}

/** Ears, for the one who has them showing. */
function earsPath(build: number): string {
  if (build < 1.3) return '';
  return 'M 21 22 a 4 4 0 1 1 3 6 Z M 43 22 a 4 4 0 1 0 -3 6 Z';
}

function Subject({ p, children }: { p: Persona; children: (p: Persona) => React.ReactNode }) {
  return <>{children(p)}</>;
}

/* ---------- A. Scrimshaw: one ink, no interior. ---------- */

function Scrimshaw({ p, size, tint }: { p: Persona; size: number; tint: string }) {
  const hat = hatPath(p.hat);
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill={INK.black} />
      <circle cx="32" cy="32" r="31" fill="none" stroke={tint} strokeWidth="2.5" />
      <g clipPath="url(#disc)">
        <g fill={INK.bone}>
          <path d={bustPath(p.build)} />
          <path d={headPath()} />
          {hat && <path d={hat} />}
          {p.tusks && <path d={tusksPath()} />}
          <path d={earsPath(p.build)} />
        </g>
      </g>
    </svg>
  );
}

/* ---------- B. Three-tone: body, shadow, highlight. No outline. ---------- */

function ThreeTone({ p, size, tint }: { p: Persona; size: number; tint: string }) {
  const hat = hatPath(p.hat);
  const id = `tt-${p.key}-${size}`;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <defs>
        <clipPath id={`${id}-shade`}>
          {/* The shadow side. One light source, always the same side, or a set
              of drawings stops looking like a set. */}
          <path d="M 38 0 q -6 32 8 64 H 64 V 0 Z" />
        </clipPath>
        <clipPath id={`${id}-disc`}>
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="31" fill={INK.black} />
      <circle cx="32" cy="32" r="31" fill="none" stroke={tint} strokeWidth="2.5" />
      <g clipPath={`url(#${id}-disc)`}>
        <g fill={INK.pale}>
          <path d={bustPath(p.build)} />
          <path d={headPath()} />
          {hat && <path d={hat} fill={INK.mid} />}
          {p.tusks && <path d={tusksPath()} fill={INK.bone} />}
          <path d={earsPath(p.build)} />
        </g>
        <g clipPath={`url(#${id}-shade)`} fill={INK.mid}>
          <path d={bustPath(p.build)} />
          <path d={headPath()} />
          {hat && <path d={hat} fill={INK.dark} />}
          <path d={earsPath(p.build)} />
        </g>
      </g>
    </svg>
  );
}

/* ---------- C. Inked: heavy dark outline, two flats, faction accent. ---------- */

function Inked({ p, size, tint }: { p: Persona; size: number; tint: string }) {
  const hat = hatPath(p.hat);
  const id = `ik-${p.key}-${size}`;
  const line = { stroke: INK.black, strokeWidth: 3, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <defs>
        <clipPath id={`${id}-disc`}>
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="31" fill={tint} opacity="0.22" />
      <circle cx="32" cy="32" r="31" fill="none" stroke={tint} strokeWidth="2.5" />
      <g clipPath={`url(#${id}-disc)`}>
        <path d={bustPath(p.build)} fill={tint} {...line} />
        <path d={headPath()} fill={INK.bone} {...line} />
        <path d={earsPath(p.build)} fill={INK.bone} {...line} />
        {hat && <path d={hat} fill={INK.dark} {...line} />}
        {p.tusks && <path d={tusksPath()} fill={INK.bone} stroke={INK.black} strokeWidth="1.4" />}
      </g>
    </svg>
  );
}

/* ---------- The same three treatments on a ship and a works ---------- */

const HULL =
  'M 8 40 h 48 l -7 11 h -34 Z M 20 39 V 14 M 32 39 V 8 M 44 39 V 18';
const SAILS = 'M 20 16 l 9 21 h -9 Z M 32 10 l 10 27 H 32 Z M 44 20 l 7 17 h -7 Z';
const WORKS = 'M 14 52 h 36 v -14 l -18 -12 l -18 12 Z';
const WORKS_DETAIL = 'M 26 52 v -11 h 12 v 11 M 30 32 h 4';

function Kit({ treatment, tint }: { treatment: 'a' | 'b' | 'c'; tint: string }) {
  if (treatment === 'a') {
    return (
      <svg viewBox="0 0 64 64" width={44} height={44} aria-hidden="true">
        <g fill={INK.bone} stroke={INK.bone} strokeWidth="2.4" strokeLinecap="round">
          <path d={HULL} fill="none" />
          <path d={SAILS} stroke="none" />
        </g>
      </svg>
    );
  }
  if (treatment === 'b') {
    return (
      <svg viewBox="0 0 64 64" width={44} height={44} aria-hidden="true">
        <path d={HULL} fill="none" stroke={INK.mid} strokeWidth="2.6" strokeLinecap="round" />
        <path d={SAILS} fill={INK.pale} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" width={44} height={44} aria-hidden="true">
      <path
        d={HULL}
        fill={tint}
        stroke={INK.black}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d={SAILS} fill={INK.bone} stroke={INK.black} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

function Building({ treatment, tint }: { treatment: 'a' | 'b' | 'c'; tint: string }) {
  if (treatment === 'a') {
    return (
      <svg viewBox="0 0 64 64" width={44} height={44} aria-hidden="true">
        <path d={WORKS} fill={INK.bone} />
      </svg>
    );
  }
  if (treatment === 'b') {
    return (
      <svg viewBox="0 0 64 64" width={44} height={44} aria-hidden="true">
        <path d={WORKS} fill={INK.pale} />
        <path d="M 32 26 l 18 12 v 14 H 32 Z" fill={INK.mid} />
        <path d={WORKS_DETAIL} fill="none" stroke={INK.dark} strokeWidth="2.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" width={44} height={44} aria-hidden="true">
      <path d={WORKS} fill={tint} stroke={INK.black} strokeWidth="3" strokeLinejoin="round" />
      <path d={WORKS_DETAIL} fill="none" stroke={INK.black} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- The page ---------- */

const TREATMENTS = [
  {
    id: 'a' as const,
    name: 'A · Scrimshaw',
    blurb:
      'One ink, no interior. Shape is the only information. Cheapest to draw, hardest to get wrong, and it already matches the dispatch scenes.',
    Portrait: Scrimshaw,
  },
  {
    id: 'b' as const,
    name: 'B · Three-tone',
    blurb:
      'Body, shadow, highlight, from a fixed five-step ramp, one light source, no outline. This is the old-sprite approach.',
    Portrait: ThreeTone,
  },
  {
    id: 'c' as const,
    name: 'C · Inked',
    blurb:
      'Heavy black outline, flat fills, faction colour carried in the drawing itself. Loudest and most cartoon; reads best at the smallest sizes.',
    Portrait: Inked,
  },
];

const TINTS = ['var(--empire)', 'var(--alliance)', 'var(--neutral)'];

export function StyleTest() {
  return (
    <div className="artsheet">
      <header className="artsheet__head">
        <h1>Three house styles</h1>
        <p className="muted">
          The same geometry, inked three ways. Judge the last row first: if you cannot tell four
          people apart in flat black at the size they ship at, nothing above it matters.
        </p>
      </header>

      {TREATMENTS.map(({ id, name, blurb, Portrait }) => (
        <section className="artsheet__row" key={id}>
          <h2 className="artsheet__label">{name}</h2>
          <p className="artsheet__blurb">{blurb}</p>

          <div className="artsheet__items">
            {PEOPLE.map((p, i) =>
              [32, 44, 68].map((size) => (
                <div className="artsheet__item" key={`${p.key}-${size}`}>
                  <div className="artsheet__stage">
                    <Subject p={p}>
                      {(q) => <Portrait p={q} size={size} tint={TINTS[i % TINTS.length]} />}
                    </Subject>
                  </div>
                  <span className="artsheet__caption">
                    {p.name} {size}
                  </span>
                </div>
              )),
            )}
            <div className="artsheet__item">
              <div className="artsheet__stage">
                <Kit treatment={id} tint="var(--alliance)" />
              </div>
              <span className="artsheet__caption">ship</span>
            </div>
            <div className="artsheet__item">
              <div className="artsheet__stage">
                <Building treatment={id} tint="var(--empire)" />
              </div>
              <span className="artsheet__caption">works</span>
            </div>
          </div>
        </section>
      ))}

      {/* The acceptance test, and the reason any of this works. */}
      <section className="artsheet__row">
        <h2 className="artsheet__label">
          Who&rsquo;s that captain?
          <span className="artsheet__note"> — flat black, at 32 and 44</span>
        </h2>
        <p className="artsheet__blurb">
          Every portrait as a pure silhouette. This is the whole test: a drawing that fails here is
          decoration, not identity. The portraits in the game today would be four identical dots.
        </p>
        <div className="artsheet__items">
          {PEOPLE.map((p) =>
            [32, 44].map((size) => (
              <div className="artsheet__item" key={`sil-${p.key}-${size}`}>
                <div className="artsheet__stage" style={{ background: INK.bone }}>
                  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
                    <g fill={INK.black}>
                      <path d={bustPath(p.build)} />
                      <path d={headPath()} />
                      {hatPath(p.hat) && <path d={hatPath(p.hat)!} />}
                      {p.tusks && <path d={tusksPath()} />}
                      <path d={earsPath(p.build)} />
                    </g>
                  </svg>
                </div>
                <span className="artsheet__caption">
                  {p.name} {size}
                </span>
              </div>
            )),
          )}
        </div>
      </section>

      <section className="artsheet__row">
        <h2 className="artsheet__label">
          The ramp<span className="artsheet__note"> — every ink in the proposed palette</span>
        </h2>
        <div className="artsheet__items">
          {Object.entries(INK).map(([name, hex]) => (
            <div className="artsheet__item" key={name}>
              <div className="artsheet__swatch" style={{ background: hex }} />
              <span className="artsheet__caption">
                {name}
                <br />
                {hex}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
