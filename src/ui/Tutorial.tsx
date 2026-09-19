import { useEffect, useState } from 'react';
import factionData from '../data/factions.json';
import reachData from '../data/reaches.json';
import terms from '../data/terms.json';
import { numberWord } from './words';
import { PIRATE_LORDS, type PlayableFaction } from '../sim';

/** Bumped when the tutorial is rewritten, so people who skipped the old one see the new. */
const DONE_KEY = 'seven-seas.taught.v2';

export function alreadyTaught(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === 'yes';
  } catch {
    return false;
  }
}

/**
 * How to play, in the shape of the original's manual: what this is, how it
 * ends, and then the handful of things on screen and what each is for.
 *
 * Seven short cards, down from twelve on 19 September. Sean: *"Update tutorial
 * also when you have time. Doesn't need to be rules crazy. Just show a newbie
 * how to play."* The twelve were trying to teach the game — allegiance bands,
 * what each filter draws, what a Fort is against a Boom — which is a manual,
 * and the game now has one: the Book holds every unit, a Rules page opening
 * with how to win, and a Glossary. So these teach the *loop* and nothing else.
 * Open an island, send somebody, build something, start the clock, read the
 * Log — and the last card says where the rest is rather than being it.
 *
 * It never blocks the game. The card sits over the chart's own strip, the rest
 * of the interface stays live, and Skip is always there. It can be reopened
 * from the menu as "How to play".
 */
const ISLANDS = reachData.reaches.reduce((n, r) => n + r.islands.length, 0);

const STEPS: Array<{ title: string; body: (side: PlayableFaction) => string }> = [
  {
    title: 'What this is',
    body: (side) => {
      const you = factionData[side];
      const them = factionData[side === 'empire' ? 'alliance' : 'empire'];
      return `A war for ${numberWord(ISLANDS)} islands. You command the ${you.name}; ${them.name} wants what you have. You give orders and the days pass — nobody moves faster than a ship can sail.`;
    },
  },
  {
    title: 'How you win',
    body: (side) =>
      side === 'empire'
        ? `Have all three Pirate Lords — ${PIRATE_LORDS.map((l) => l.name).join(', ')} — in irons at the same time. They are people, so you take one by carrying them off a quay. Lose Highwater and you lose the war that day.`
        : `Take Highwater, the Crown's capital, and the war is over that day. You lose if the Crown gets all three of your Pirate Lords in irons at once — so keep them apart.`,
  },
  {
    title: 'Tap an island',
    body: () =>
      `The ${terms.worldMap} shows the chains. Tap one to open it, tap an island inside it to open the ${terms.island.toLowerCase()}. Everything you can do to a place is on the tabs there: who is in the harbor, who is ashore, what is built, and how many ${terms.troops.toLowerCase()} hold it.`,
  },
  {
    title: 'Send your crew',
    body: () =>
      `${terms.crew} are how the map changes. Open one from the Crew tab at the foot, press Send on mission, choose an island, and it offers what can be done there — talk the island round, recruit, chart the unknown, spy, or take command. Then they sail, and it takes as long as the distance.`,
  },
  {
    title: 'Build and earn',
    body: () =>
      'A Construction Yard raises everything else. A Shipyard lays down hulls, a Training Facility raises troops, a Gold Mine and a Lumber Mill pay for it. The gold at the top is what you make a day after upkeep — keep it above nothing, and keep your yards working.',
  },
  {
    title: 'Start the clock',
    body: () =>
      'Nothing happens while it says Paused. Start it and the days turn on their own. Passages take weeks, errands a fortnight ashore, hulls months — so set things going, let it run, and read the Log to find out what happened while you were away.',
  },
  {
    title: 'The rest is in the Book',
    body: () =>
      'Nothing here is hidden. The Book at the foot holds every ship, crew member, troop, building and island in the game, a Rules page that opens with how to win, and a Glossary for any word you have not met. Wherever a screen could use a footnote it shows a small \u2139 that takes you straight to it.',
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
    <div className={`teach${leaving ? ' teach--out' : ''}`} role="dialog" aria-label="How to play">
      <div className="teach__pips" aria-hidden="true">
        {STEPS.map((_, i) => (
          <span key={i} className={i === step ? 'teach__pip teach__pip--on' : 'teach__pip'} />
        ))}
      </div>
      <div className="teach__kicker">How to play · {step + 1} of {STEPS.length}</div>
      <h3 className="teach__title serif">{it.title}</h3>
      <p className="teach__body">{it.body(side)}</p>
      <div className="teach__row">
        <button className="teach__skip" onClick={finish}>
          {last ? '' : 'Skip'}
        </button>
        {step > 0 && (
          <button className="teach__back" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
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
