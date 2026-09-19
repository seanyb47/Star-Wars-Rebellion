import { Children, useCallback, useRef, useState, type ReactNode } from 'react';
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
   * Whose this is, drawn left of the name.
   *
   * Sean, 19 September: *"Put the owning faction's emblem in the sheet
   * header, in the same spot on every unit, ship, character, and facility
   * sheet (left of the name)."* Same spot on every sheet is the whole point,
   * so it lives here rather than being drawn by each sheet into its own
   * corner — and it earns its room by taking the faction's name back out of
   * the subtitle, which was spending a line saying what a crest says.
   */
  emblem?: ReactNode;
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
            {props.emblem && <span className="sheet__emblem">{props.emblem}</span>}
            <div className="sheet__titles">
              {props.eyebrow && <div className="sheet__eyebrow">{props.eyebrow}</div>}
              <div className="sheet__title">
                {props.title}
                {props.titleMark}
              </div>
            </div>
            {/* A plain mark, not a boxed one: it is the least important
                control on the sheet and the box was giving it the weight of
                the most. The grip above still says the sheet can be dragged
                away, which is how most people close it anyway. */}
            <button className="sheet__x" onClick={props.onClose} aria-label="Close">
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
 * The one toggle left: fold alike hulls into a count, or list them out.
 *
 * There were two, over four lists. Sean, 19 September: *"don't need to make
 * group alike and reorder buttons. Always group them and allow me to press
 * and hold to drag and move. Same goes for all units. No need for group and
 * reorder. Just always combine alike. The only exception is ships!"*
 *
 * So grouping stops being a preference anywhere but the harbor, and the
 * reason ships are the exception is that they are the only list whose items
 * are not interchangeable: four Kestrels are four hulls carrying four
 * different amounts of damage, and somebody choosing which to send wants them
 * apart. A troop is a troop and a yard is a yard.
 *
 * Reordering lost its toggle outright — a list you rearrange by holding a row
 * and dragging it does not need a mode switched on first.
 */
export function GroupHulls() {
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
/**
 * Hold a tile, then drag it past its neighbour to move it.
 *
 * Sean, 19 September: *"allow me to press and hold to drag and move."*
 *
 * Built on the one-step `order.up` / `order.down` the lists already expose
 * rather than on a drop target, which is what keeps it small: while a tile is
 * held, crossing the width of a tile in either direction moves it one place
 * and the origin resets. Drag three tiles' worth and it has moved three
 * places, which is what dragging feels like, without anybody having to track
 * a drop index.
 *
 * Pointer events rather than touch, so a mouse works the same way and a test
 * can drive it. The press has to be *held* — 320ms — because these tiles are
 * also buttons, and a tile that reordered on a quick drag would fight the
 * scroll of the board it sits in. The click that follows a real drag is
 * swallowed, or letting go would also open the thing you just moved.
 */
const HOLD_MS = 320;

function useHoldDrag(order?: { up?: () => void; down?: () => void }) {
  const [held, setHeld] = useState(false);
  const from = useRef<{ x: number; y: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const moved = useRef(false);
  const node = useRef<HTMLElement | null>(null);
  const pointer = useRef<number | undefined>(undefined);

  const stop = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    from.current = null;
    const tile = node.current;
    const id = pointer.current;
    if (tile && id !== undefined && tile.hasPointerCapture?.(id)) tile.releasePointerCapture(id);
    pointer.current = undefined;
    setHeld(false);
  }, []);

  if (!order) {
    return { held: false, moved, handlers: {} as Record<string, never> };
  }

  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      const tile = e.currentTarget;
      node.current = tile;
      moved.current = false;
      pointer.current = e.pointerId;
      const { clientX: x, clientY: y } = e;
      timer.current = window.setTimeout(() => {
        from.current = { x, y };
        setHeld(true);
        // The tile has to keep the pointer, or the drag ends the instant the
        // finger crosses onto the neighbour — which is the first thing a drag
        // does. Without this the gesture can only ever move a tile by less
        // than its own width, which is to say never.
        try {
          tile.setPointerCapture(e.pointerId);
        } catch {
          // Some browsers refuse a capture for a pointer already gone.
        }
        // Haptic where there is one: picking a thing up should be felt.
        navigator.vibrate?.(10);
      }, HOLD_MS);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (!from.current) {
        // Before the hold lands, any real movement is a scroll, not a drag.
        return;
      }
      const box = node.current?.getBoundingClientRect();
      // Past the boundary, not past the whole tile: the swap belongs where the
      // finger crosses onto the neighbour.
      const step = Math.max(32, (box?.width ?? 80) * 0.6);
      const dx = e.clientX - from.current.x;
      const dy = e.clientY - from.current.y;
      // A board is a grid, so both axes move a tile: sideways by one, and
      // downwards by one as well, because on a two-across board "the next
      // one" is as often below as beside.
      const travel = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (Math.abs(travel) < step) return;
      const back = travel < 0;
      const go = back ? order.up : order.down;
      if (!go) return;
      go();
      moved.current = true;
      from.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: stop,
    onPointerCancel: stop,
    onPointerLeave: () => {
      if (!from.current) stop();
    },
  };
  return { held, moved, handlers };
}

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
  /**
   * The drawn glyph, for a thing with no painting. Optional since 19
   * September: `art` that carries its own fallback — a crew member's face
   * falls back to the drawn cameo inside `CharacterFace` — has nothing to put
   * here, and a second fallback that can never fire is just a lie about what
   * the tile does.
   */
  icon?: ReactNode;
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
  /**
   * Where this tile can go. An end with nowhere to go leaves its side out.
   *
   * Two ways in, since 19 September: the arrows under the tile, and holding
   * the tile and dragging it. The arrows stay because they are the reachable
   * one — a hold-and-drag is not a keyboard gesture and never will be.
   */
  order?: { up?: () => void; down?: () => void };
}) {
  // With nothing else to do, the tile itself is the lookup.
  const tap = onClick ?? onLookUp;
  const corner = onClick && onLookUp ? onLookUp : undefined;
  const drag = useHoldDrag(order);
  const className = `slot${art ? ' slot--art' : ''}${tone ? ` slot--${tone}` : ''}${
    tap ? ' slot--tap' : ''
  }${drag.held ? ' slot--held' : ''}`;
  const body = (
    <>
      {art ? <span className="slot__art">{art}</span> : <span className="slot__icon">{icon}</span>}
      <span className="slot__name">{name}</span>
      {note && <span className="slot__note">{note}</span>}
    </>
  );
  const inner = tap ? (
    <button
      className={className}
      // Letting go after a real drag must not also open the thing that was
      // dragged. `moved` is a ref rather than state so the click sees it.
      onClick={() => {
        if (drag.moved.current) {
          drag.moved.current = false;
          return;
        }
        tap();
      }}
      aria-label={label ?? name}
      {...drag.handlers}
    >
      {body}
    </button>
  ) : (
    <span className={className} {...drag.handlers}>
      {body}
    </span>
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
  // alongside would halve the tile. They are also not drawn until one is
  // focused — see `.slot-wrap__order` — because the gesture is the hold and
  // these are only the keyboard's way in.
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
