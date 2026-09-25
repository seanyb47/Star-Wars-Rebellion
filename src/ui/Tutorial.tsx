import { useCallback, useEffect, useRef, useState } from 'react';
import tutorialData from '../data/tutorial.json';
import { CROWN_PRINCIPALS, PIRATE_LORDS, type PlayableFaction } from '../sim';

/**
 * Bumped when the tutorial is rewritten, so people who skipped the old one see
 * the new. v4 on 23 September, when it stopped being seven cards about the
 * game and became a tour of it.
 */
const DONE_KEY = 'seven-seas.taught.v4';

export function alreadyTaught(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === 'yes';
  } catch {
    return false;
  }
}

/**
 * A tour of the interface, over the live game.
 *
 * Sean, 23 September: *"The tutorial stays on one screen. It needs to walk you
 * through various screens ideally asking you to click on things. Imagine it
 * like someone showing you a tour of the UI."*
 *
 * It was seven paragraph cards in one place, describing screens the player
 * could not see while reading about them — which is a manual with a Next
 * button, and the game already has a manual. This points instead: a hole cut
 * in a dimmed screen around one real control, a card beside it saying what
 * that control is, and — on most steps — *tapping the control itself* is what
 * moves the tour on. So the map step opens a chain, the island step opens an
 * island, and by the tab steps the player has already done the loop once.
 *
 * Four rules hold it together:
 *
 * 1. **The target stays live.** The dim is four rectangles around the thing,
 *    not a sheet over it, so the tap the tour is asking for is the same tap
 *    the game already answers. Nothing is simulated and nothing is blocked.
 * 2. **A step with no target on screen is skipped.** That is what lets the
 *    tour walk through sheets without knowing whether the player followed it,
 *    and what makes a rearranged screen degrade the tour instead of breaking
 *    it. `docs/opening-flow.md` asked for exactly this.
 * 3. **Skip is on every step**, including the last, and Next is always there
 *    for somebody who would rather read than tap.
 * 4. **The card never covers its own target.** It sits below the thing when
 *    the thing is in the top half of the screen, and above it otherwise.
 */
type Step = {
  id: string;
  target: string | null;
  tap?: boolean;
  title: string;
  body?: string;
  byFaction?: Record<string, string>;
};
const STEPS = (tutorialData as { steps: Step[] }).steps;

/** The card's own height, near enough, for deciding which side of the target it goes. */
const CARD_H = 190;
const RING_PAD = 8;

function bodyFor(step: Step, side: PlayableFaction): string {
  const text = step.byFaction?.[side] ?? step.body ?? '';
  // The one step that names people names them off the constants, so the copy
  // cannot drift from the roster the way the old "How you win" card did.
  if (step.id !== 'win') return text;
  const names =
    side === 'empire' ? PIRATE_LORDS.map((l) => l.name).join(', ') : CROWN_PRINCIPALS.join(' and ');
  return text.replace(
    side === 'empire' ? 'all three Pirate Lords' : 'the young Imperator and Grand Admiral Corvane',
    side === 'empire' ? `all three Pirate Lords — ${names} —` : names,
  );
}

/** Where the thing is, or null if it is not on screen. */
function boxOf(target: string | null): DOMRect | null {
  if (!target) return null;
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? r : null;
}

export function Tutorial({ side, onDone }: { side: PlayableFaction; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [box, setBox] = useState<DOMRect | null>(null);

  const finish = useCallback(() => {
    setLeaving(true);
    try {
      localStorage.setItem(DONE_KEY, 'yes');
    } catch {
      /* storage may be unavailable; it will simply be offered again */
    }
    window.setTimeout(onDone, 180);
  }, [onDone]);

  /**
   * On to the next step that has something to point at.
   *
   * Written as a search rather than an increment because rule 2 is the whole
   * reason this works: three of the ten steps live inside sheets the player
   * may never open, and a tour that stalled on one of them pointing at
   * nothing would be worse than no tour.
   */
  const advance = useCallback(
    (from: number) => {
      for (let i = from + 1; i < STEPS.length; i++) {
        if (STEPS[i].target === null || boxOf(STEPS[i].target)) {
          setStep(i);
          return;
        }
      }
      finish();
    },
    [finish],
  );

  const it = STEPS[step];

  /*
   * Follow the target. A sheet opening, a list scrolling and the keyboard
   * arriving all move it, and a ring left behind where a control used to be
   * is worse than no ring — so this re-measures on a frame loop while the
   * step is up. Cheap: one `getBoundingClientRect` per frame on one element.
   */
  useEffect(() => {
    let live = true;
    const tick = () => {
      if (!live) return;
      const next = boxOf(it.target);
      setBox((was) =>
        was && next && was.top === next.top && was.left === next.left && was.width === next.width
          ? was
          : next,
      );
      window.requestAnimationFrame(tick);
    };
    tick();
    return () => {
      live = false;
    };
  }, [it.target]);

  /*
   * Tapping the thing is what moves the tour on, where the step says so.
   *
   * Listened for on the way *down* and on the document, so the game's own
   * handler still runs and the tour is never in the way of it: the tap opens
   * the chain, and the tour notices that it did. A frame's delay before
   * advancing lets the screen change first, so the next step measures what is
   * actually there rather than what was.
   */
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    if (!it.tap || !it.target) return;
    const onDown = (e: Event) => {
      const el = document.querySelector(`[data-tour="${it.target}"]`);
      if (!el || !(e.target instanceof Node) || !el.contains(e.target)) return;
      window.setTimeout(() => advance(stepRef.current), 260);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [it.tap, it.target, advance]);

  // Escape gets rid of it, the same as Skip.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  const last = step === STEPS.length - 1;
  // Below the target when the target is up top, above it when it is not. The
  // no-target step sits where the old card sat, above the console.
  const below = box !== null && box.top < window.innerHeight / 2;
  const style: React.CSSProperties = box
    ? below
      ? { top: Math.min(box.bottom + 14, window.innerHeight - CARD_H), bottom: 'auto' }
      : { bottom: Math.max(window.innerHeight - box.top + 14, 12), top: 'auto' }
    : {};

  return (
    <>
      {/* The hole. Four panels around the target rather than one sheet over
          it, so the control the tour is pointing at is still the control. */}
      {box && (
        <div className="tour" aria-hidden="true">
          <div className="tour__dim" style={{ top: 0, left: 0, right: 0, height: Math.max(0, box.top - RING_PAD) }} />
          <div className="tour__dim" style={{ top: Math.max(0, box.bottom + RING_PAD), left: 0, right: 0, bottom: 0 }} />
          <div
            className="tour__dim"
            style={{ top: Math.max(0, box.top - RING_PAD), left: 0, width: Math.max(0, box.left - RING_PAD), height: box.height + RING_PAD * 2 }}
          />
          <div
            className="tour__dim"
            style={{ top: Math.max(0, box.top - RING_PAD), left: box.right + RING_PAD, right: 0, height: box.height + RING_PAD * 2 }}
          />
          <div
            className="tour__ring"
            style={{
              top: box.top - RING_PAD,
              left: box.left - RING_PAD,
              width: box.width + RING_PAD * 2,
              height: box.height + RING_PAD * 2,
            }}
          />
        </div>
      )}

      <div
        className={`teach${leaving ? ' teach--out' : ''}${box ? ' teach--pointing' : ''}`}
        style={style}
        role="dialog"
        aria-label="How to play"
      >
        <div className="teach__pips" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={i === step ? 'teach__pip teach__pip--on' : 'teach__pip'} />
          ))}
        </div>
        <div className="teach__kicker">
          How to play · {step + 1} of {STEPS.length}
        </div>
        <h3 className="teach__title serif">{it.title}</h3>
        <p className="teach__body">{bodyFor(it, side)}</p>
        <div className="teach__row">
          {/* On every step including the last: it used to render an empty
              label there and leave a live 44px button with nothing in it. */}
          <button className="teach__skip" onClick={finish}>
            Skip
          </button>
          {step > 0 && (
            <button className="teach__back" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          <button
            className="btn btn--primary teach__next"
            onClick={() => (last ? finish() : advance(step))}
          >
            {/* Plain, on the same note Sean struck about "go there" and
                "carry on": the last button in a tutorial should say what
                happens next, not be the best line in it. */}
            {last ? 'Start playing' : 'Next'}
          </button>
        </div>
      </div>
    </>
  );
}
