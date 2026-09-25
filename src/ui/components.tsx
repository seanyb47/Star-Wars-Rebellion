import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import factionData from '../data/factions.json';
import { allegianceColour, allegianceSegments } from './allegiance';
import { Icon } from './icons';
import { useLookUp, type EncPage } from './lookup';
import { usePrefs } from './prefs';
import { ROOM_TRACK, type Faction, type System } from '../sim';

/**
 * Drag a sheet down to dismiss it, which is what the grip has been promising.
 *
 * `.sheet__grip` was a bare `<div>` with nothing wired to it, under a comment
 * in this file claiming "the grip above still says the sheet can be dragged
 * away, which is how most people close it anyway." It said it; it did not do
 * it. A control that looks draggable and is not is worse than no control,
 * because the player concludes the app is broken rather than that they
 * guessed wrong — and on a phone this is the gesture they try before they go
 * looking for a ✕ that is 34 pixels across.
 *
 * Pointer events rather than touch, so a mouse and a pen work the same way.
 * The sheet follows the finger exactly, refuses to go upwards, and springs
 * back unless it was thrown or dragged more than a third of the way down.
 * A sheet that demands an answer cannot be dragged away either — it knocks,
 * exactly as its scrim does.
 */
function useSheetDrag(sheet: RefObject<HTMLDivElement | null>, onEnd: (dismissed: boolean) => void) {
  const from = useRef<{ y: number; at: number } | null>(null);

  const move = (el: HTMLDivElement, dy: number) => {
    el.style.transition = 'none';
    el.style.transform = `translateY(${dy}px)`;
  };
  const release = (el: HTMLDivElement) => {
    el.style.transition = '';
    el.style.transform = '';
  };

  return {
    onPointerDown: (e: React.PointerEvent) => {
      // Primary button or touch only; a right-click is not a drag.
      if (e.button !== 0) return;
      from.current = { y: e.clientY, at: performance.now() };
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const start = from.current;
      const el = sheet.current;
      if (!start || !el) return;
      // Down only. Dragging up should do nothing rather than lift the sheet
      // off the bottom of the screen and show the chart under it.
      move(el, Math.max(0, e.clientY - start.y));
    },
    onPointerUp: (e: React.PointerEvent) => {
      const start = from.current;
      const el = sheet.current;
      from.current = null;
      if (!start || !el) return;
      const dy = e.clientY - start.y;
      const speed = dy / Math.max(1, performance.now() - start.at);
      release(el);
      // A third of the sheet, or a flick: a short fast drag is as clear an
      // intention as a long slow one, and only having the distance rule makes
      // the gesture feel heavy.
      onEnd(dy > el.offsetHeight / 3 || (dy > 40 && speed > 0.5));
    },
    onPointerCancel: () => {
      const el = sheet.current;
      from.current = null;
      if (el) release(el);
    },
  };
}

/* ------------------------------------------------- the ℹ, and where it goes */

/**
 * A mark that says "there is more about this, and it is over there".
 *
 * These two live here rather than in `Almanac.tsx`, where they were written,
 * and the move is the whole of what unlocks the text cleanup. They were not
 * exported and the Almanac is two thousand lines with forty imports out of
 * the sim, so no screen could put an ℹ on a section without pulling the
 * entire encyclopedia in behind it — which is why the mechanism was built,
 * announced in the tutorial, and then used on three screens out of thirty.
 * `components.tsx` already owns the ℹ corner mark on a board tile and knows
 * nothing about the Almanac, so this is where they belong.
 *
 * Sean, 19 September: *"Goal is to keep game clean and minimize text blocks
 * but add ℹ️ info that links to encyclopedia or rules or glossary when needed
 * to explain finer points of game."*
 *
 * The whole point is that it costs a line and not a paragraph. Where a page
 * used to carry the explanation it carries one of these instead, and the
 * explanation lives once, on the Rules page, where somebody who wants it goes
 * looking.
 *
 * Labelled or bare depends on whether the page has already said what it is
 * about. A list of links needs its labels, because a column of identical
 * glyphs is a column of guesses. A mark under a card whose subject is named
 * in the picker above it does not: Sean struck "More about the Wayfinder" off
 * the build panel on 22 September for saying Wayfinder a third time. The rule
 * is not "always label" but "never say it twice".
 */
/**
 * A section heading, with its help folded into it.
 *
 * Sean, 20 September: *"Integrate each help link into its section heading as a
 * small info button."* The five sections each carried a full sentence of link
 * beside the heading — *Defense · What armor stops* — which put a second,
 * longer, brighter thing on the line whose job was to name the section. The
 * sentence survives as the button's label, where a screen reader and a long
 * press still find it; on the page it is one mark.
 */
export function SectionHead({
  title,
  to,
  at,
  help,
}: {
  title: string;
  to?: EncPage;
  at?: string;
  help?: string;
}) {
  const lookUp = useLookUp();
  return (
    <div className="section-title">
      {title}
      {to && help && lookUp && (
        <button
          className="infodot"
          onClick={() => lookUp(to, at)}
          aria-label={help}
          title={help}
        >
          <Icon name="info" size={17} />
        </button>
      )}
    </div>
  );
}

/**
 * The way out to the entry, as a line of link or as a single mark.
 *
 * With children it is a labelled row — the form that suits a list of links,
 * where the reader is choosing between several.
 *
 * Without them it is the same round ℹ the section headings carry, and for the
 * same reason Sean gave on 20 September: *"integrate each help link into its
 * section heading as a small info button."* He said it again on 22 September
 * of the build card — *"don't put in 'more about wayfinder', just do an
 * ℹ button"* — where the thing being described is named twice above the link
 * already, so the sentence is spending a line to repeat the picker.
 *
 * The sentence is not deleted, it moves to `label`, where a screen reader
 * reads it and a long press shows it. A bare glyph with no accessible name
 * would be a button that announces itself as "button".
 */
export function Info({
  to,
  at,
  children,
  label,
}: {
  to: EncPage;
  at?: string;
  children?: ReactNode;
  /** Required when there are no children: the mark's only name. */
  label?: string;
}) {
  const lookUp = useLookUp();
  if (!lookUp) return null;
  if (!children) {
    return (
      <button className="infodot" data-tour="info" onClick={() => lookUp(to, at)} aria-label={label} title={label}>
        <Icon name="info" size={17} />
      </button>
    );
  }
  return (
    <button className="infolink" onClick={() => lookUp(to, at)}>
      <span aria-hidden="true">&#8505;</span>
      <span>{children}</span>
    </button>
  );
}

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
  /**
   * Stop below the top bar rather than running up behind it.
   *
   * Sean, 24 September: *"When on any build screen I need to see the gold
   * section from the top bar so I can make purchase decisions."* A sheet is
   * 82% of the app anchored to the tab bar, which on a 852px phone puts its
   * top edge above the bar — so the one figure a purchase turns on was hidden
   * by the sheet asking for the purchase.
   *
   * A flag rather than the rule for every sheet, because most sheets are not
   * a decision about money and the height is worth more to them than the
   * plaque is. Anything that spends or earns sets it.
   */
  underTopBar?: boolean;
  onClose: () => void;
  /**
   * What to say when the sheet will not be dismissed, because it is a
   * question rather than a page.
   *
   * A sheet whose buttons are all *orders* must not have a third, invisible
   * order on the scrim. The mission report had exactly that: its close
   * handler was the same call as "Set sail", so tapping the dark area to get
   * rid of something you did not understand recalled the officer, spent the
   * fortnight and told you nothing. A new player does that within a minute.
   *
   * Set this and the ✕ goes, the scrim stops dismissing, and a tap on it
   * says this sentence instead. Saying something is the point: a tap that is
   * simply ignored teaches the player that taps are unreliable, which is a
   * worse lesson than the one they came for.
   */
  demands?: string;
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
  /**
   * One continuous scroll: the header and the banner travel with the content.
   *
   * Sean, 20 September, on the encyclopedia: *"when I scroll down for more,
   * the image should scroll not stay static… if I scroll down I want it to
   * scroll with me."* The banner sits outside the scrolling body by default
   * and is pinned there on purpose — an island sheet has four tabs about one
   * place, and letting the place scroll away meant looking at a garrison with
   * no idea whose garrison it was. An encyclopedia entry has no tabs and is
   * read top to bottom, so the same rule reads as a picture that will not get
   * out of the way.
   *
   * In flow mode the header and the banner move inside `sheet__body`, so
   * everything is one column with one scrollbar and the art leaves the screen
   * entirely, spacer and all. What stays is a compact bar — name, class,
   * close — that fades in once the full header has gone past, so there is
   * always a way out and always a label on what you are reading.
   */
  flow?: boolean;
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
  /**
   * Whether the full header has scrolled out of the body, in flow mode.
   *
   * Watched with an observer on a one-pixel marker under the header rather
   * than by reading `scrollTop` on every frame: the question is only ever
   * "has this gone past", the browser answers it off the main thread, and a
   * scroll handler on a list this long is the one thing guaranteed to make
   * the scrolling Sean is complaining about feel worse.
   */
  const [folded, setFolded] = useState(false);
  /** Set for a moment when somebody tries to dismiss a sheet that demands an answer. */
  const [nudged, setNudged] = useState(false);
  const body = useRef<HTMLDivElement | null>(null);
  const mark = useRef<HTMLDivElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const flow = props.flow === true;
  const demands = props.demands;

  useEffect(() => {
    if (!nudged) return;
    const t = window.setTimeout(() => setNudged(false), 2200);
    return () => window.clearTimeout(t);
  }, [nudged]);

  /** What the scrim and the ✕ do, which is not always to close. */
  const dismiss = () => (demands ? setNudged(true) : props.onClose());
  const drag = useSheetDrag(panel, (dismissed) => {
    if (dismissed) dismiss();
  });

  useEffect(() => {
    if (!flow) return;
    const root = body.current;
    const target = mark.current;
    if (!root || !target) return;
    const watch = new IntersectionObserver(
      ([entry]) => setFolded(!entry.isIntersecting),
      { root, threshold: 0 },
    );
    watch.observe(target);
    return () => watch.disconnect();
  }, [flow]);

  const head = (
    <div className="sheet__head">
      <div className="row row--between">
        {/* A class mark, never a faction crest, on an entry.
            Sean, 20 September: *"Remove the redundant close-like crossed-swords
            control from the header, or render it as a noninteractive ship-class
            emblem. The × should be the only close control."* He is describing
            the Free Confederacy's sigil, which is crossed cutlasses: at header
            size, in the faction's red, in its own slot at the far end of the
            row from a grey ✕, it reads as the brighter of two close buttons.
            It never was a button, which is not the point — nobody tries a
            control to find out what it does.
            Shrinking and dimming it was tried first and did not work,
            because the mark is two crossed strokes at any size. So the entry
            says whose she is in words, in the subtitle, and what it puts here
            instead is the other half of his sentence — a **ship-class**
            emblem, off the symbol sheet he sent with the mockup. Brass where
            the ✕ is red, a line drawing where the ✕ is a stroke, and it
            answers a different question, so the two cannot be confused.
            Every in-game sheet keeps its faction crest, which is what the
            rule of 19 September was about. */}
        {props.emblem && (
          <span className="sheet__emblem" aria-hidden="true">
            {props.emblem}
          </span>
        )}
        <div className="sheet__titles">
          {props.eyebrow && <div className="sheet__eyebrow">{props.eyebrow}</div>}
          <div className="sheet__title">
            {props.title}
            {props.titleMark}
          </div>
        </div>
        {/* A plain mark, not a boxed one: it is the least important
            control on the sheet and the box was giving it the weight of
            the most. The grip above really does drag the sheet away now,
            which is how most people close it.
            No ✕ at all on a sheet that demands an answer — there is nothing
            for it to do that is not one of the orders below, and a close
            control that secretly issues an order is worse than none. */}
        {!demands && (
          <button className="sheet__x" onClick={props.onClose} aria-label="Close">
            ✕
          </button>
        )}
      </div>
      {props.subtitle && <div className="sheet__sub">{props.subtitle}</div>}
    </div>
  );

  return (
    <>
      <div
        className={`scrim${props.top ? ' scrim--top' : props.stacked ? ' scrim--stacked' : ''}`}
        onClick={dismiss}
      />
      <div
        className={`sheet${props.top ? ' sheet--top' : props.stacked ? ' sheet--stacked' : ''}${
          props.tabs ? ' sheet--tabbed' : ''
        }${flow ? ' sheet--flow' : ''}${nudged ? ' sheet--nudged' : ''}${
          props.underTopBar ? ' sheet--under-top' : ''
        }`}
        ref={panel}
        role="dialog"
        aria-modal={demands ? true : undefined}
        aria-label={props.title}
      >
        {/* The grab area is deliberately taller than the bar you can see:
            the mark is 4px and a finger is not. */}
        <div className="sheet__griparea" {...drag}>
          <div className="sheet__grip" />
        </div>
        {/* The collapsed header. Absolutely placed over the top of the body so
            it reserves no room and nothing jumps when it arrives, and shown
            only once the full one has gone past. */}
        {flow && (
          <div className={`sheet__fold${folded ? ' sheet__fold--on' : ''}`} aria-hidden={!folded}>
            <div className="sheet__fold-titles">
              <span className="sheet__fold-title">{props.title}</span>
              {props.subtitle && <span className="sheet__fold-sub">{props.subtitle}</span>}
            </div>
            {!demands && (
              <button
                className="sheet__x"
                onClick={props.onClose}
                aria-label="Close"
                tabIndex={folded ? 0 : -1}
              >
                ✕
              </button>
            )}
          </div>
        )}
        {!flow && head}
        {!flow && props.banner}
        {props.tabs}
        <div
          className="sheet__body"
          ref={body}
          onTouchStart={props.onTouchStart}
          onTouchEnd={props.onTouchEnd}
        >
          {flow && head}
          {/* The marker the collapsed bar watches, between the header and the
              art rather than below both: the bar is meant to replace the
              *header*, so it arrives as the name goes and the picture then
              scrolls away underneath it. */}
          {flow && <div className="sheet__mark" ref={mark} />}
          {flow && props.banner}
          {props.children}
        </div>
        {demands && (
          <div className={`sheet__demand${nudged ? ' sheet__demand--on' : ''}`} role="status">
            {demands}
          </div>
        )}
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
 * Hold a tile, then drag it where it should go.
 *
 * Sean, 19 September: *"allow me to press and hold to drag and move."* And on
 * 20 September, having tried it: *"The drag and drop feature is super clunky.
 * Should be like a press and hold then move. Right now it's very hard to
 * manage."* The gesture was right and the implementation was not. Three
 * things were wrong with it, and all three are the same mistake — the old one
 * counted travel instead of looking at where the finger actually was.
 *
 * **The board could not be scrolled.** Every orderable tile carried
 * `touch-action: none` so the browser would not steal the drag. On a board
 * that is almost entirely tiles, that meant almost nothing on the screen
 * scrolled, and the only way down a long list was to find a gap between
 * tiles. It is `pan-y` now: the board scrolls the way any list does until the
 * hold lands, and only then is the page pinned, by a non-passive `touchmove`
 * that runs for the life of the drag. A finger that moves before the hold has
 * landed was scrolling and is left alone.
 *
 * **Nothing followed the finger.** The tile grew six per cent and stayed
 * where it was while the list rearranged itself somewhere underneath. Now the
 * tile is lifted and translated so it sits under the finger for as long as it
 * is held, which is the entire difference between dragging something and
 * watching a list twitch.
 *
 * **A grid was treated as a line.** The board is two across, three on a wide
 * screen, and the old rule moved a tile one place for every 0.6 of a tile
 * width travelled on whichever axis had moved further — so dragging a tile
 * straight down one row moved it one place and landed it in the wrong column.
 * The target now comes from the neighbours' real rectangles: whichever cell's
 * centre the finger is nearest is where the tile wants to be, and it steps
 * one place at a time towards it through the same `order.up` / `order.down`
 * the arrows use. No drop index to track, and a row is a row.
 *
 * The margin on that comparison is what stops a finger resting on a boundary
 * from rattling the tile between two places forever.
 */
const HOLD_MS = 250;
/** How far a finger may stray before a press is a scroll and not a hold. */
const SLOP = 8;
/** How much nearer another cell must be before the tile moves to it. */
const SETTLE = 6;

/**
 * Hold a tile: still means a menu, moving means a drag.
 *
 * Sean, 24 September: *"Maybe we need to implement press and hold as a
 * feature! Like instead of click to always view encyclopedia maybe press and
 * hold opens a menu."*
 *
 * **The hold was already spoken for**, which is the part worth knowing: he
 * asked for hold-to-drag on 19 September and again on 20 September when the
 * first attempt was *"super clunky"*. Two things cannot own one gesture, so
 * this splits it the way a phone already does — **hold and let go without
 * moving opens the menu; hold and move picks the tile up.** Nothing about the
 * drag changes, and the menu costs a gesture nobody was using: releasing a
 * hold in place did nothing at all before.
 *
 * `moved` is the whole of the test, and it is already tracked because the drag
 * needed it to know whether a release was a drop or a tap.
 */
function useHoldDrag(
  order?: { up?: () => void; down?: () => void },
  onMenu?: () => void,
) {
  const [held, setHeld] = useState(false);
  /** Where the tile is drawn relative to where it is laid out. */
  const [shift, setShift] = useState<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const node = useRef<HTMLElement | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const pressed = useRef<{ x: number; y: number } | null>(null);
  /** Where in the tile the finger took hold, so it stays there. */
  const grab = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragging = useRef(false);
  /** Everything listening on the document for the life of one drag. */
  const bound = useRef<Array<[string, EventListener, boolean]>>([]);
  /** The live one-step moves, read at the moment of the step rather than
   *  captured when the drag began — the ends of a list change as it moves. */
  const steps = useRef(order);
  steps.current = order;
  /** Read at the moment of the release, not captured when the press began. */
  const menu = useRef(onMenu);
  menu.current = onMenu;

  const stop = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    dragging.current = false;
    pressed.current = null;
    for (const [type, fn, passive] of bound.current) {
      document.removeEventListener(type, fn, passive ? undefined : { capture: false });
    }
    bound.current = [];
    setHeld(false);
    setShift(null);
  }, []);

  // A tile can be unmounted mid-drag — the list it is in is being rearranged,
  // after all. Without this the document keeps a scroll-blocking listener for
  // a drag that no longer exists, and the page stops scrolling for good.
  useEffect(() => stop, [stop]);

  // Armed for either job. A tile with a menu and no ordering still wants the
  // hold; a tile with neither wants nothing on the document at all.
  if (!order && !onMenu) {
    return { held: false, moved, shift: null, handlers: {} as Record<string, never> };
  }

  /** The cell this tile sits in, and every cell beside it on the board. */
  const board = (): { cell: HTMLElement; cells: HTMLElement[]; me: number } | null => {
    const cell = node.current?.closest('.slot-wrap') as HTMLElement | null;
    const parent = cell?.parentElement;
    if (!cell || !parent) return null;
    const cells = Array.from(parent.children) as HTMLElement[];
    const me = cells.indexOf(cell);
    return me < 0 ? null : { cell, cells, me };
  };

  const carry = (x: number, y: number) => {
    const found = board();
    if (!found) return;
    const { cell, cells, me } = found;

    // Where the tile should be drawn. The cell wrapper is never transformed,
    // so its rectangle is where the tile is *laid out* — which means this
    // re-reads correctly after a reorder without anything being rebased.
    const box = cell.getBoundingClientRect();
    setShift({
      x: x - (box.left + box.width / 2) - grab.current.x,
      y: y - (box.top + box.height / 2) - grab.current.y,
    });

    // And where it wants to go: the cell whose centre the finger is nearest.
    const reach = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
    };
    const mine = reach(cell);
    let best = me;
    let nearest = mine;
    cells.forEach((c, i) => {
      const d = reach(c);
      if (d < nearest - SETTLE && d < mine - SETTLE) {
        nearest = d;
        best = i;
      }
    });
    if (best === me) return;
    const go = best < me ? steps.current?.up : steps.current?.down;
    if (!go) return;
    go();
    moved.current = true;
  };

  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      node.current = e.currentTarget;
      moved.current = false;
      const { clientX: x, clientY: y } = e;
      pressed.current = { x, y };
      timer.current = window.setTimeout(() => {
        const found = board();
        if (!found) return;
        const rect = found.cell.getBoundingClientRect();
        grab.current = {
          x: x - (rect.left + rect.width / 2),
          y: y - (rect.top + rect.height / 2),
        };
        dragging.current = true;
        setHeld(true);
        setShift({ x: 0, y: 0 });

        /*
         * Everything from here listens on the document, not on the tile, and
         * that is the whole trick.
         *
         * The obvious way is `setPointerCapture` on the tile, so the gesture
         * follows the finger onto its neighbours. It does not survive: the
         * first thing this drag does is reorder the list, React moves the
         * node to its new place, and moving a node in the DOM drops its
         * pointer capture. Measured, the tile stepped exactly one place and
         * then went deaf — no more moves reached it, and the pointerup landed
         * on whatever tile was now under the cursor, so the one being dragged
         * never learned to put itself down and stayed lifted on the board.
         *
         * The document cannot be reordered out from under a listener.
         */
        const move = (ev: Event) => {
          const pe = ev as PointerEvent;
          carry(pe.clientX, pe.clientY);
        };
        const end = () => {
          /*
           * Letting go must not also open something.
           *
           * The tile keeps its own guard below, but that only covers a drag
           * that ends where it started. A real drag ends over a *different*
           * tile, and the browser fires the click at the nearest ancestor the
           * press and the release have in common — which is the board, and on
           * the way there it passes through whatever tile is now under the
           * finger. Measured: dragging the last tile to the front opened the
           * tile it landed on. So the click after a drag is caught once, at
           * the document, before anything can act on it.
           *
           * Dropped after a moment either way: a touch release does not always
           * produce a click, and a swallow left armed would eat the next real
           * tap instead.
           */
          // Held still and let go: that is the menu, not a drop. Checked
          // before the swallow below, which only ever fires after a real drag.
          if (!moved.current && menu.current) menu.current();
          if (moved.current) {
            const swallow = (ev: Event) => {
              ev.stopPropagation();
              ev.preventDefault();
            };
            document.addEventListener('click', swallow, { capture: true, once: true });
            window.setTimeout(
              () => document.removeEventListener('click', swallow, { capture: true }),
              350,
            );
          }
          stop();
        };
        // And the page must not scroll under it. `touch-action: pan-y` let the
        // board scroll up to this moment; from here the gesture is ours.
        const pin = (ev: Event) => ev.preventDefault();
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', end);
        document.addEventListener('pointercancel', end);
        document.addEventListener('touchmove', pin, { passive: false });
        bound.current = [
          ['pointermove', move, true],
          ['pointerup', end, true],
          ['pointercancel', end, true],
          ['touchmove', pin, false],
        ];
        // Haptic where there is one: picking a thing up should be felt.
        navigator.vibrate?.(10);
      }, HOLD_MS);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      // Only the wait for the hold is handled here; once it lands the document
      // listener above has the gesture. Before then, a finger that has gone
      // anywhere was scrolling.
      if (dragging.current) return;
      const from = pressed.current;
      if (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) > SLOP) {
        window.clearTimeout(timer.current);
        timer.current = undefined;
      }
    },
    onPointerUp: () => {
      if (!dragging.current) stop();
    },
    onPointerCancel: () => {
      if (!dragging.current) stop();
    },
  };
  return { held, moved, shift, handlers };
}

export function Slot({
  icon,
  art,
  name,
  note,
  tone,
  mission,
  actions,
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
  /**
   * Out on a mission: the whole treatment in one prop.
   *
   * Sean, 24 September: *"Maybe we can do something to better display people
   * on mission. Like shrink their portrait. Add a color border corresponding
   * to the mission type... And add on bottom 'On Mission: [Mission Type]'."*
   *
   * It had been a grey line under the name reading "Parley 12d", which is the
   * same shape as every other thing a tile can say and so said nothing at a
   * glance. Three cues instead of one, and the reason they work together:
   * **the rim** is the colour of that kind of work, so a board of six answers
   * *what is everyone doing* before you read a word; **the smaller portrait**
   * makes room for the label and reads as away rather than here, which is the
   * fact the board is actually about; and **the label** carries the truth,
   * because a colour nobody has learned yet is decoration.
   *
   * One prop and not three, so a tile cannot end up with the rim of one
   * mission and the name of another.
   */
  mission?: { label: string; tint: string; days: number };
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
  /**
   * Everything you can do with this tile, on a press and hold.
   *
   * Sean, 24 September: *"instead of click to always view encyclopedia maybe
   * press and hold opens a menu. And one option is Encyclopedia but others can
   * be Mission or Move whatever we want."*
   *
   * The tap keeps doing the one obvious thing — the tile's own job, or the
   * lookup where it has none — and this is where the rest live. A tile with
   * one action does not get a menu: a menu of one is a second tap for nothing,
   * and `Slot` already has a rule for that case (the whole tile does it).
   */
  actions?: Array<{ label: string; hint?: string; onPick: () => void }>;
}) {
  // With nothing else to do, the tile itself is the lookup.
  const tap = onClick ?? onLookUp;
  const corner = onClick && onLookUp ? onLookUp : undefined;
  const [menuOpen, setMenuOpen] = useState(false);
  // A menu of one is a second tap for nothing.
  const holdMenu = actions && actions.length > 1 ? () => setMenuOpen(true) : undefined;
  const drag = useHoldDrag(order, holdMenu);
  const className = `slot${art ? ' slot--art' : ''}${tone ? ` slot--${tone}` : ''}${
    tap ? ' slot--tap' : ''
  }${drag.held ? ' slot--held' : ''}${mission ? ' slot--away' : ''}`;
  // The lift, inline rather than in the stylesheet, because only the running
  // gesture knows where the finger is. The scale rides along with it so the
  // two do not fight over the same property.
  const lift = drag.shift
    ? { transform: `translate(${drag.shift.x}px, ${drag.shift.y}px) scale(1.06)` }
    : undefined;
  // The mission's colour, handed to the stylesheet as a variable so the rim,
  // the wash behind the label and anything later can all read the one value.
  const paint = mission
    ? ({ ...lift, ['--away' as string]: mission.tint } as React.CSSProperties)
    : lift;
  const body = (
    <>
      {art ? <span className="slot__art">{art}</span> : <span className="slot__icon">{icon}</span>}
      <span className="slot__name">{name}</span>
      {mission ? (
        /* The rim is set inline because the colour is the mission's, and the
           stylesheet has no way to know which mission this tile is about. */
        /* Two lines, which is what Sean asked for — "On Mission:" over the
           kind of work. The days ride on the second line rather than taking a
           third: a tile is two rows and a sliver of a third on the board, and
           every line here is a line off that budget. */
        <span className="slot__away">
          <span className="slot__away-head">On mission</span>
          <span className="slot__away-line">
            <b className="slot__away-what" style={{ color: mission.tint }}>
              {mission.label}
            </b>
            <span className="slot__away-days">{mission.days}d</span>
          </span>
        </span>
      ) : (
        note && <span className="slot__note">{note}</span>
      )}
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
      style={paint}
      {...drag.handlers}
    >
      {body}
    </button>
  ) : (
    <span className={className} style={paint} {...drag.handlers}>
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
  const withMenu = holdMenu ? (
    <>
      {tile}
      {menuOpen && (
        <SlotMenu name={name} actions={actions!} onClose={() => setMenuOpen(false)} />
      )}
    </>
  ) : (
    tile
  );
  if (!order) return withMenu;
  // On a board the arrows go under the tile rather than beside it: a tile is
  // about as wide as two arrows and the board is a grid, so putting them
  // alongside would halve the tile. They are also not drawn until one is
  // focused — see `.slot-wrap__order` — because the gesture is the hold and
  // these are only the keyboard's way in.
  return (
    <span className="slot-wrap">
      {withMenu}
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

/**
 * What a held tile offers. A sheet rather than a popover pinned to the tile:
 * the board scrolls, the tiles are 44px apart on a phone, and a menu that has
 * to dodge the edges of the screen is a menu that lands somewhere different
 * every time.
 */
function SlotMenu({
  name,
  actions,
  onClose,
}: {
  name: string;
  actions: Array<{ label: string; hint?: string; onPick: () => void }>;
  onClose: () => void;
}) {
  return (
    <Sheet title={name} eyebrow="What next" onClose={onClose} stacked>
      <div className="stack">
        {actions.map((action) => (
          <button
            key={action.label}
            className="btn btn--block slotmenu__item"
            onClick={() => {
              onClose();
              action.onPick();
            }}
          >
            <b>{action.label}</b>
            {action.hint && <span className="tiny muted">{action.hint}</span>}
          </button>
        ))}
      </div>
    </Sheet>
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
  // No duration by default since 21 September. Sean: *"you don't need to say
  // how long. Just say 'Upkeep X' and gold symbol."* Every figure that used to
  // read `/day` is now the fortnight's, and a fortnight is what the ledger
  // settles in, so the unit is the one the balance is already in.
  per = null,
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
