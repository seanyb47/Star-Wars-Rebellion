import { Children, type ReactNode } from 'react';
import factionData from '../data/factions.json';
import { allegianceColour, allegianceSegments } from './allegiance';
import { usePrefs } from './prefs';
import { ROOM_TRACK, type Faction, type System } from '../sim';

export function Sheet(props: {
  title: string;
  /** A small mark drawn after the title — the island's worth, say. Kept
   *  separate from `title` so the accessible name stays plain text. */
  titleMark?: ReactNode;
  /**
   * What kind of thing this sheet is about, over the title.
   *
   * Sean's word of 17 September: one word per idea. The three things a player
   * can be looking at are the **World Map**, a **Reach Map** and a
   * **Location**, and a screen that does not say which it is leaves the player
   * to work it out from the contents. Two words in small caps, and only where
   * the kind is not obvious from the tab you arrived on.
   */
  eyebrow?: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  /** The footer is one full-width control, so drop the row padding and rule. */
  actionsFlush?: boolean;
  /** Optional tab strip, pinned under the header while the body scrolls. */
  tabs?: ReactNode;
  /**
   * A picture of the subject, between the header and the tabs.
   *
   * It used to be the first thing inside the first tab, which meant the
   * island you were looking at went off screen the moment you looked at its
   * garrison or its yards — four tabs about a place, with the place on one of
   * them. Up here it does not scroll away and it does not belong to a tab.
   */
  banner?: ReactNode;
  /** Raise this sheet above one already open, rather than behind it. */
  stacked?: boolean;
  /**
   * A third level, above a stacked sheet.
   *
   * There are exactly two of these and they are the encyclopedia's two
   * layers: the reference itself is `stacked` over whatever game screen sent
   * you there, and one entry opened out of it sits on top of that. Nothing
   * else needs a third level and nothing else should take one.
   */
  top?: boolean;
  /** A sideways drag across the body, where the sheet has tabs to move along. */
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
}) {
  return (
    <>
      <div
        className={`scrim${props.top ? ' scrim--top' : props.stacked ? ' scrim--stacked' : ''}`}
        onClick={props.onClose}
      />
      <div
        className={`sheet${props.top ? ' sheet--top' : props.stacked ? ' sheet--stacked' : ''}${
          props.tabs ? ' sheet--tabbed' : ''
        }`}
        role="dialog"
        aria-label={props.title}
      >
        <div className="sheet__grip" />
        <div className="sheet__head">
          <div className="row row--between">
            <div className="sheet__titles">
              {props.eyebrow && <div className="sheet__eyebrow">{props.eyebrow}</div>}
              <div className="sheet__title">
                {props.title}
                {props.titleMark}
              </div>
            </div>
            <button className="iconbtn" onClick={props.onClose} aria-label="Close">
              ✕
            </button>
          </div>
          {props.subtitle && <div className="sheet__sub">{props.subtitle}</div>}
        </div>
        {props.banner}
        {props.tabs}
        <div
          className="sheet__body"
          onTouchStart={props.onTouchStart}
          onTouchEnd={props.onTouchEnd}
        >
          {props.children}
        </div>
        {props.actions && (
          <div className={`sheet__actions${props.actionsFlush ? ' sheet__actions--flush' : ''}`}>
            {props.actions}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * The two checkboxes over any list of things the player owns: fold alike ones
 * into a count, and show the arrows that put them in order.
 *
 * One control, used by the harbor, the garrison, the crew and the buildings,
 * because they are one preference — somebody who wants their hulls grouped
 * wants their companies grouped too, and having to say so four times would be
 * four places to forget.
 */
export function ListOpts() {
  const [prefs, setPrefs] = usePrefs();
  return (
    <div className="listopts tiny">
      <button
        className={`listopt${prefs.group ? ' listopt--on' : ''}`}
        onClick={() => setPrefs({ group: !prefs.group })}
        aria-pressed={prefs.group}
      >
        {prefs.group ? '☑' : '☐'} Group alike
      </button>
      <button
        className={`listopt${prefs.reorder ? ' listopt--on' : ''}`}
        onClick={() => setPrefs({ reorder: !prefs.reorder })}
        aria-pressed={prefs.reorder}
      >
        {prefs.reorder ? '☑' : '☐'} Reorder
      </button>
    </div>
  );
}

export function factionLabel(faction: Faction): string {
  if (faction === 'none') return 'Unclaimed';
  return factionData[faction].shortName;
}

export function ControlBadge({ faction }: { faction: Faction }) {
  return <span className={`badge badge--${faction}`}>{factionLabel(faction)}</span>;
}

/**
 * The island's allegiance as one bar: whoever holds it first from the left,
 * the other side next. The two always add up to a hundred, so there is no
 * undecided remainder to draw. The
 * figures underneath name the shares so the bar never has to be guessed at.
 *
 * `slim` is the one that rides above the tabs on the island sheet: the same
 * bar and the same figures, thinner and smaller, because up there it is paid
 * for out of every tab's height rather than the garrison's alone.
 */
export function SupportBars({ system, slim }: { system: System; slim?: boolean }) {
  const segments = allegianceSegments(system);
  return (
    <div className={slim ? 'supportbars supportbars--slim' : 'supportbars'}>
      <div className={`bar bar--tall${slim ? ' bar--slim' : ''}`}>
        {segments.map((segment) => (
          <div
            key={segment.faction}
            style={{ width: `${segment.pct}%`, background: allegianceColour(segment.faction) }}
          />
        ))}
      </div>
      <div className={`bar-key${slim ? ' bar-key--slim' : ''}`}>
        {segments
          .filter((segment) => segment.faction !== 'neutral')
          .map((segment) => (
            <span key={segment.faction}>
              <i style={{ background: allegianceColour(segment.faction) }} />
              {factionData[segment.faction as 'empire' | 'alliance'].shortName}{' '}
              {Math.round(segment.pct)}
            </span>
          ))}
      </div>
    </div>
  );
}

/**
 * A panel that is there whether or not anything is in it, and fills with
 * icons as things arrive — after the original's personnel and regiment
 * windows, which are a framed board with slots rather than a list that
 * collapses to nothing.
 *
 * `ghosts` draws empty slots after the filled ones. Use it only where an empty
 * slot means something real: a building slot the island has and you have not
 * used, or a company the island needs and does not have. Where there is no cap
 * — crew — leave it at zero and let the board simply be the size it is.
 */
export function SlotBoard({
  children,
  ghosts = 0,
  empty,
}: {
  children?: ReactNode;
  ghosts?: number;
  /** Shown in the middle of the board when there is nothing in it at all. */
  empty?: ReactNode;
}) {
  const filled = Children.count(children);
  if (filled === 0 && ghosts === 0) {
    return <div className="board board--bare">{empty}</div>;
  }
  // Three rows fit; past that the board scrolls, so say the total rather than
  // leaving the player to guess how far it goes.
  const total = filled + ghosts;
  return (
    <>
      <div className="board">
        {children}
        {Array.from({ length: ghosts }, (_, i) => (
          <span key={`ghost-${i}`} className="slot slot--empty" aria-hidden="true" />
        ))}
      </div>
      {total > 9 && (
        <p className="tiny muted board__count">
          {total} in all — scroll the board for the rest
        </p>
      )}
    </>
  );
}

/** One thing on the board: a picture, a name, and optionally a line under it. */
export function Slot({
  icon,
  art,
  name,
  note,
  tone,
  onClick,
  onLookUp,
  label,
  order,
}: {
  icon: ReactNode;
  /**
   * A painting of the thing, run full width across the top of the tile in
   * place of the drawn glyph.
   *
   * The works have had paintings since the first art batch and the board was
   * still drawing line glyphs at them — the picture only ever appeared on the
   * card further down the panel, which is the one place the player is *not*
   * looking when they want to know what stands on an island. `icon` stays the
   * fallback, so a works with no painting yet still gets its glyph.
   */
  art?: ReactNode;
  name: string;
  note?: string;
  /**
   * 'warn' for something that needs attention, 'dim' for something idle, and
   * 'lord' for one of the three — which is not a state but a rank, and is here
   * rather than as a colour passed into `note` because the tile wants to say it
   * twice: brass on the rim of the medallion and brass on the line under the
   * name. One word, one language.
   */
  tone?: 'warn' | 'dim' | 'lord';
  onClick?: () => void;
  /**
   * Look this unit up in the encyclopedia.
   *
   * Where the tile has no other job, the whole tile does it. Where it already
   * does something — a crew tile opens the officer's orders, a hull opens her
   * condition — the picture keeps that job and a small corner mark carries the
   * lookup, because the two are different questions: one is "what do I do with
   * this", the other is "what is this".
   */
  onLookUp?: () => void;
  label?: string;
  /** Present only in reorder mode. An end with nowhere to go is absent. */
  order?: { up?: () => void; down?: () => void };
}) {
  // With nothing else to do, the tile itself is the lookup.
  const tap = onClick ?? onLookUp;
  const corner = onClick && onLookUp ? onLookUp : undefined;
  const className = `slot${art ? ' slot--art' : ''}${tone ? ` slot--${tone}` : ''}${
    tap ? ' slot--tap' : ''
  }`;
  const body = (
    <>
      {art ? <span className="slot__art">{art}</span> : <span className="slot__icon">{icon}</span>}
      <span className="slot__name">{name}</span>
      {note && <span className="slot__note">{note}</span>}
    </>
  );
  const inner = tap ? (
    <button className={className} onClick={tap} aria-label={label ?? name}>
      {body}
    </button>
  ) : (
    <span className={className}>{body}</span>
  );
  const tile = corner ? (
    <span className="slot-lookup">
      {inner}
      <button
        className="slot-lookup__mark"
        onClick={corner}
        aria-label={`What is ${name}?`}
        title={`What is ${name}?`}
      >
        ?
      </button>
    </span>
  ) : (
    inner
  );
  if (!order) return tile;
  // On a board the arrows go under the tile rather than beside it: a tile is
  // about as wide as two arrows and the board is a grid, so putting them
  // alongside would halve the tile.
  return (
    <span className="slot-wrap">
      {tile}
      <span className="slot-wrap__order">
        <button className="orderbtn" disabled={!order.up} onClick={order.up} aria-label={`Move ${name} earlier`}>
          ◀
        </button>
        <button className="orderbtn" disabled={!order.down} onClick={order.down} aria-label={`Move ${name} later`}>
          ▶
        </button>
      </span>
    </span>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="tiny muted">{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}

/**
 * How much room an island has, and how much of it is spent — drawn against
 * one track the same length everywhere, so the bar is a quantity rather than
 * a ratio. Twelve berths fills the track; six reaches halfway; three stops a
 * quarter along. White for a berth with something on it, grey for open
 * ground, and nothing at all past the end of what the island has: an island
 * with no room left and an island with no room to begin with do not look
 * alike. The berths the island has never been given are simply not drawn.
 *
 * The count of free berths is printed at the end of it, which is the number
 * the player is after when they look at this at all.
 */
export function RoomBar({
  system,
  className,
}: {
  system: System;
  /** Somewhere to hang a size: the list row's bar is a fifth the width. */
  className?: string;
}) {
  const slots = Math.min(system.slots, ROOM_TRACK);
  const built = Math.min(system.facilities.length, slots);
  // Ground standing in a berth is not a free berth. A third shade for it, so
  // a forested island reads as busy rather than empty — the bar used to show
  // five open plots on an island where four of them were trees.
  const ground = Math.min((system.deposits ?? []).length, slots - built);
  const free = slots - built - ground;
  const label =
    ground > 0
      ? `${free} of ${slots} berths open, ${ground} with something in the ground`
      : `${free} of ${slots} berths free`;
  return (
    <span
      className={`roombar${className ? ` ${className}` : ''}`}
      style={{ gridTemplateColumns: `repeat(${ROOM_TRACK}, 1fr)` }}
      aria-label={label}
      title={label}
    >
      {Array.from({ length: slots }, (_, i) => (
        <span
          key={i}
          className={i < built ? 'is-built' : i < built + ground ? 'is-ground' : ''}
        />
      ))}
      {/* The figure sits in the track's spare column — the thirteenth, which
          no island can ever fill, since twelve berths is the most there is.
          That puts it immediately after the last pip on every island rather
          than off at a fixed right edge, where on a small island it read as
          belonging to the loyalty bar underneath. */}
      <b
        className={`roomnum${free === 0 ? ' roomnum--none' : ''}`}
        style={{ gridColumn: `${slots + 1} / -1` }}
      >
        {free}
      </b>
    </span>
  );
}


/**
 * The gold mark, on a line of text.
 *
 * Sean, 16 September: *"Instead of 'costs x gold a day' say 'Upkeep: 3g/day'.
 * And let's use gold symbol."* So a coin rather than the word — the word was
 * costing four characters every time a panel wanted to say a number, and
 * "Costs 3 gold a day" sitting under every building was three lines of prose
 * doing the work of one figure.
 *
 * Drawn rather than a glyph, because no font has a coin in it that matches the
 * brass on the console. Two rings and nothing else: the 'S' on the big coin in
 * the banner turns to mud under 12px, and this is read at 10.
 */
export function Coin({ size = 11 }: { size?: number }) {
  return (
    <svg
      className="coin"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9.5" fill="var(--metal)" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="var(--metal-lo)" strokeWidth="2" opacity="0.75" />
    </svg>
  );
}

/**
 * A sum of gold, as a figure: `3`, a coin, and what it is per.
 *
 * `label` is the word in front of it — "Upkeep", "Earns" — and the whole thing
 * is one span so it never breaks across a line halfway through a number.
 */
export function GoldFig({
  n,
  per = 'day',
  label,
  tone,
}: {
  n: number | string;
  /** What the figure is per. Absent for a flat price. */
  per?: 'day' | null;
  label?: string;
  /** Green for money coming in, red for money going out. */
  tone?: 'earn' | 'cost';
}) {
  return (
    <span className={`goldfig${tone ? ` goldfig--${tone}` : ''}`}>
      {label ? <span className="goldfig__label">{label}:</span> : null}
      <b>{n}</b>
      <Coin />
      {per ? <span className="goldfig__per">/{per}</span> : null}
    </span>
  );
}
