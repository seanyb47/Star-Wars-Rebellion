import type { ReactNode } from 'react';
import { FactionCrest } from './art';

/**
 * The card frame from the style guide.
 *
 * Crest badge, title bar, the art, a line in the subject's own voice, then a
 * TYPE · SUBTYPE bar. Four parts, in that order, and none of them optional
 * except the quote.
 *
 * It is drawn here rather than painted into the images for three reasons that
 * all matter. It stays tintable, so a card knows whose it is. Every card is
 * identical, which is what makes a row of them read as a set. And a subject
 * whose painting has not been made yet gets exactly the same frame around its
 * drawn cameo, so the game is never visibly half-illustrated.
 *
 * The frame is also what buys the brightness. A bright painting dropped onto a
 * near-black page reads as a hole cut in the page; the same painting with a
 * title above it and a caption below reads as an object lying on it.
 */

export type CardType =
  | 'Warship'
  | 'Ship'
  | 'Leader'
  | 'Character'
  | 'Facility'
  | 'Island'
  | 'Port City'
  | 'Location'
  | 'Creature';

export type CardSubtype =
  | 'Imperium'
  | 'Confederacy'
  | 'Unaligned'
  | 'Resource'
  | 'Natural'
  | 'Mystical'
  | 'Supernatural'
  | 'Companion';

/** Which crest, if any, belongs in the corner. */
function badgeFor(subtype: CardSubtype) {
  if (subtype === 'Imperium') return <FactionCrest faction="empire" size={26} />;
  if (subtype === 'Confederacy') return <FactionCrest faction="alliance" size={26} />;
  // Everything else takes a mark rather than a crest: these belong to nobody,
  // and borrowing a faction's crest for them would be a lie about allegiance.
  const glyph: Record<string, string> = {
    Resource: 'M3 17 L10 5 L17 17 Z',
    Natural: 'M3 14 q7 -9 14 0 M3 17 q7 -6 14 0',
    Mystical: 'M10 3 l2.2 5.2 5.8 .6 -4.4 3.8 1.3 5.6 -4.9 -3 -4.9 3 1.3 -5.6 -4.4 -3.8 5.8 -.6 Z',
    Supernatural: 'M10 4 a4 4 0 1 1 0 8 a4 4 0 1 1 0 -8 Z M4 18 q6 -5 12 0 Z',
    Companion: 'M6 8 l-1 -4 4 2 M14 8 l1 -4 -4 2 M10 6 a5 5 0 1 0 .1 0 Z',
    Unaligned: 'M10 3 v14 M3 10 h14',
  };
  return (
    <svg viewBox="0 0 20 20" width="22" height="22" aria-hidden="true">
      <path
        d={glyph[subtype] ?? glyph.Unaligned}
        fill="none"
        stroke="var(--brass)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function tintFor(subtype: CardSubtype): string {
  if (subtype === 'Imperium') return 'var(--empire)';
  if (subtype === 'Confederacy') return 'var(--alliance)';
  if (subtype === 'Supernatural' || subtype === 'Mystical') return 'var(--neutral)';
  return 'var(--brass)';
}

export function Card({
  title,
  type,
  subtype,
  quote,
  art,
  onClick,
}: {
  title: string;
  type: CardType;
  subtype: CardSubtype;
  /** A line in the subject's own voice. Omitted rather than faked. */
  quote?: string;
  /** The painting, or the drawn cameo standing in for it. */
  art: ReactNode;
  onClick?: () => void;
}) {
  const tint = tintFor(subtype);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className="tcard"
      style={{ ['--card-tint' as string]: tint }}
      onClick={onClick}
      {...(onClick ? { type: 'button' as const } : {})}
    >
      <span className="tcard__badge">{badgeFor(subtype)}</span>
      <span className="tcard__title serif">{title}</span>
      <span className="tcard__art">
        {art}
        {quote && <em className="tcard__quote serif">&ldquo;{quote}&rdquo;</em>}
      </span>
      <span className="tcard__type">
        {type} <span className="tcard__dot">·</span> {subtype}
      </span>
    </Tag>
  );
}
