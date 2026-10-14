/**
 * The encyclopedia's line symbols.
 *
 * Sean handed over a sheet of eighteen on 20 September — *"here are symbols
 * you can use"* — drawn as a contact sheet rather than as files, so they are
 * redrawn here to its spec: a 24×24 box, `currentColor` stroke, round caps
 * and joins, nothing filled. Because they take their colour from the text
 * they sit in, one icon serves the brass of a stat tile and the red of a
 * section rule without a second copy.
 *
 * They are line drawings and they stay line drawings. The game already has
 * two picture languages — the paintings, and the drawn glyphs that stand in
 * where a painting has not arrived — and a third that competed with either
 * would make a stat tile look like a unit. At 1.6 of stroke on a 24 box these
 * read at 16px, which is the size they are used at.
 */
export type IconName =
  | 'class'
  | 'close'
  | 'cost'
  | 'build'
  | 'upkeep'
  | 'info'
  | 'hull'
  | 'armor'
  | 'repairs'
  | 'size'
  | 'speed'
  | 'carries'
  | 'long-guns'
  | 'heavy-guns'
  | 'light-guns'
  | 'bombardment'
  | 'lore'
  | 'scroll';

/** The path work for each, in a 24×24 box. */
function paths(name: IconName) {
  switch (name) {
    // Two crossed marlinspikes: the mark of a hull's class.
    case 'class':
      return (
        <>
          <path d="M5 4.5 19 19.5" />
          <path d="M19 4.5 5 19.5" />
          <path d="M4 3.5h2.5V6H4z" />
          <path d="M17.5 3.5H20V6h-2.5z" />
          <circle cx="6" cy="18.5" r="1.6" />
          <circle cx="18" cy="18.5" r="1.6" />
        </>
      );
    case 'close':
      return (
        <>
          <path d="M5.5 5.5 18.5 18.5" />
          <path d="M18.5 5.5 5.5 18.5" />
        </>
      );
    // A stack of coin, seen at a slight angle.
    case 'cost':
      return (
        <>
          <ellipse cx="10.5" cy="8" rx="5.5" ry="2.6" />
          <path d="M5 8v3.2c0 1.44 2.46 2.6 5.5 2.6s5.5-1.16 5.5-2.6V8" />
          <path d="M13 15.2c2.36-.3 4-1.26 4-2.4" />
          <ellipse cx="15" cy="16" rx="5.5" ry="2.6" />
          <path d="M9.5 16v3.2c0 1.44 2.46 2.6 5.5 2.6" />
        </>
      );
    // A shipwright's mallet, raised.
    case 'build':
      return (
        <>
          <path d="M14.5 4.5 20 10" />
          <path d="M16.6 2.4 13 6l5 5 3.6-3.6a2.5 2.5 0 0 0 0-3.5l-1.5-1.5a2.5 2.5 0 0 0-3.5 0z" />
          <path d="M13.5 10.5 4 20" />
          <path d="M3 21l2.5-2.5" />
        </>
      );
    // A cask, hooped: what a ship costs to keep.
    case 'upkeep':
      return (
        <>
          <ellipse cx="12" cy="12" rx="4" ry="5" />
          <path d="M6.5 7.5C5.5 8.8 5 10.3 5 12s.5 3.2 1.5 4.5" />
          <path d="M17.5 7.5c1 1.3 1.5 2.8 1.5 4.5s-.5 3.2-1.5 4.5" />
          <path d="M8 9.5h8" />
          <path d="M8 14.5h8" />
        </>
      );
    case 'info':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6" />
          <path d="M12 7.6v.5" />
        </>
      );
    // A shield with a cross brace: what she can take.
    case 'hull':
      return (
        <>
          <path d="M12 2.8 20 6v6.4c0 4.2-3.2 7.3-8 8.8-4.8-1.5-8-4.6-8-8.8V6z" />
          <path d="M12 8v7" />
          <path d="M8.5 11.5h7" />
        </>
      );
    // A plated jerkin.
    case 'armor':
      return (
        <>
          <path d="M8 3.2 12 5l4-1.8 3.2 2.2-1.4 3.1 1.2 1.3-1.6 10H6.6L5 9.8l1.2-1.3-1.4-3.1z" />
          <path d="M12 5v4" />
          <path d="M9.6 9h4.8" />
        </>
      );
    // A spanner: what she mends between actions.
    case 'repairs':
      return (
        <>
          <path d="M16.4 3.4a5 5 0 0 0-6.1 6.4L3.6 16.5a2 2 0 0 0 0 2.8l1.1 1.1a2 2 0 0 0 2.8 0l6.7-6.7a5 5 0 0 0 6.4-6.1l-2.9 2.9-2.9-.7-.7-2.9z" />
        </>
      );
    // A hull under sail, as a silhouette: how big she is.
    case 'size':
      return (
        <>
          <path d="M12 3.2 6.5 14h5.5z" />
          <path d="M14 6.5 14 14h4.5z" />
          <path d="M3.5 16.5h17l-2.2 4.2H5.7z" />
        </>
      );
    // A following sea, running: how fast she is.
    case 'speed':
      return (
        <>
          <path d="M3 8.5h9.5a3 3 0 1 0-3-3" />
          <path d="M3 12.5h13a3 3 0 1 1-3 3" />
          <path d="M3 16.5h6" />
        </>
      );
    // A cask in the hold: what she carries.
    case 'carries':
      return (
        <>
          <ellipse cx="12" cy="6.5" rx="7" ry="2.8" />
          <path d="M5 6.5v11c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8v-11" />
          <path d="M5 12c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8" />
        </>
      );
    // A long gun on a carriage, barrel raised.
    case 'long-guns':
      return (
        <>
          <path d="M4 14.5 18.5 7.2" />
          <path d="M3.2 13 5 16.5" />
          <path d="M18 5.8 20.2 9.2" />
          <path d="M5.5 16.5h10.5" />
          <circle cx="7" cy="19" r="1.8" />
          <circle cx="15" cy="19" r="1.8" />
        </>
      );
    // A heavy piece: short, fat barrel on a truck.
    case 'heavy-guns':
      return (
        <>
          <circle cx="9" cy="10.5" r="3.6" />
          <path d="M12.4 9.2h4.2" />
          <path d="M16.6 6.8h3.2v4.8h-3.2z" />
          <path d="M6.5 14 5 17.5" />
          <path d="M5.5 17.5h11" />
          <circle cx="7.5" cy="19.6" r="1.6" />
          <circle cx="14.5" cy="19.6" r="1.6" />
        </>
      );
    // A swivel gun on the rail: light, quick, everywhere.
    case 'light-guns':
      return (
        <>
          <path d="M4.5 12.5 18 8" />
          <path d="M17.5 6.2 19 10" />
          <path d="M6 12h11" />
          <path d="M8 12v4" />
          <path d="M15 12v4" />
          <circle cx="8" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </>
      );
    // A shell bursting on stone.
    case 'bombardment':
      return (
        <>
          <path d="M12 2.5l2 3.4 3.9-.9-.9 3.9 3.4 2-3.4 2 .9 3.9-3.9-.9-2 3.4-2-3.4-3.9.9.9-3.9-3.4-2 3.4-2-.9-3.9 3.9.9z" />
          <circle cx="12" cy="11" r="2.4" />
        </>
      );
    // An open book.
    case 'lore':
      return (
        <>
          <path d="M12 6.5C10.4 5.2 8.3 4.5 5.5 4.5H3v13h2.5c2.8 0 4.9.7 6.5 2 1.6-1.3 3.7-2 6.5-2H21v-13h-2.5c-2.8 0-4.9.7-6.5 2z" />
          <path d="M12 6.5v13" />
          <path d="M5.5 8h3.5" />
          <path d="M5.5 11h3.5" />
          <path d="M15 8h3.5" />
          <path d="M15 11h3.5" />
        </>
      );
    // A rolled chart: there is more below.
    case 'scroll':
      return (
        <>
          <path d="M7 3.5h10v17H7z" />
          <path d="M7 3.5c-1.4 0-2.2 1-2.2 2.2S5.6 8 7 8" />
          <path d="M17 20.5c1.4 0 2.2-1 2.2-2.2S18.4 16 17 16" />
        </>
      );
  }
}

/**
 * One symbol.
 *
 * `aria-hidden` by default and without exception here: every one of these
 * sits beside the word it illustrates — *Hull 950*, *Defense* — so a reader
 * that announced them would say everything twice. Where an icon is the whole
 * of a control, the control carries the label.
 */
export function Icon({
  name,
  size = 16,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths(name)}
    </svg>
  );
}
