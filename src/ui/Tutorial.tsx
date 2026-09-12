import { useEffect, useState } from 'react';
import factionData from '../data/factions.json';
import type { PlayableFaction } from '../sim';

const DONE_KEY = 'seven-seas.taught.v1';

export function alreadyTaught(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === 'yes';
  } catch {
    return false;
  }
}

/**
 * The first five minutes, told in six lines.
 *
 * Deliberately not a tour with an arrow pointing at each button. Rebellion
 * teaches you nothing and is still learnable, because everything on screen is
 * one of a handful of things and they all behave the same way; what a new
 * player actually lacks is not labels but a *first move*. So each step names
 * one thing to do and then gets out of the way.
 *
 * It never blocks the game. The card sits at the foot of the screen over the
 * chart's own strip, the rest of the interface stays live, and a player who
 * ignores it entirely and starts tapping loses nothing — which is the point,
 * because that is what most people do.
 */
const STEPS: Array<{ title: string; body: (side: PlayableFaction) => string }> = [
  {
    title: 'The chart',
    body: (side) =>
      `Seven Seas, sixty-two islands. You hold four of them and ${
        factionData[side === 'empire' ? 'alliance' : 'empire'].shortName
      } holds four somewhere you have not charted. Tap a chain to open it.`,
  },
  {
    title: 'One island at a time',
    body: () =>
      'Inside a chain, tap an island for its own panel — who holds it, which way its people lean, and what you can build there.',
  },
  {
    title: 'Swipe the chart',
    body: () =>
      'Left and right across the chart changes what it shows you. Idle works is the one worth watching: a yard building nothing is gold you are not making.',
  },
  {
    title: 'Your crew',
    body: () =>
      'Seven officers under Crew. Send one to a neutral island to parley for it, or to sign on somebody worth having. They are how the map changes without a shot.',
  },
  {
    title: 'Your fleet',
    body: (side) =>
      `A fleet is already at ${factionData[side].hqLabel}. It can sail, shut a harbour, and put companies ashore — and it is not big enough to do all three at once.`,
  },
  {
    title: 'The clock',
    body: () =>
      'Nothing happens while it says Paused. Start it, and a day goes by every few seconds whether you are looking or not.',
  },
];

export function Tutorial({ side, onDone }: { side: PlayableFaction; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);

  const finish = () => {
    setLeaving(true);
    try {
      localStorage.setItem(DONE_KEY, 'yes');
    } catch {
      /* storage may be unavailable; it will simply be offered again */
    }
    window.setTimeout(onDone, 180);
  };

  // Escape gets rid of it, the same as the skip.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const last = step === STEPS.length - 1;
  const it = STEPS[step];

  return (
    <div className={`teach${leaving ? ' teach--out' : ''}`} role="dialog" aria-label="Getting started">
      <div className="teach__pips" aria-hidden="true">
        {STEPS.map((_, i) => (
          <span key={i} className={i === step ? 'teach__pip teach__pip--on' : 'teach__pip'} />
        ))}
      </div>
      <h3 className="teach__title serif">{it.title}</h3>
      <p className="teach__body">{it.body(side)}</p>
      <div className="teach__row">
        <button className="teach__skip" onClick={finish}>
          {last ? '' : 'Skip'}
        </button>
        <button
          className="btn btn--primary teach__next"
          onClick={() => (last ? finish() : setStep(step + 1))}
        >
          {last ? 'Take the helm' : 'Next'}
        </button>
      </div>
    </div>
  );
}
