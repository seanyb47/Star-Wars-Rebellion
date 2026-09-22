import { useEffect, useState } from 'react';
import factionData from '../data/factions.json';
import reachData from '../data/reaches.json';
import terms from '../data/terms.json';
import { numberWord } from './words';
import { CROWN_PRINCIPALS, PIRATE_LORDS, type PlayableFaction } from '../sim';

/**
 * Bumped when the tutorial is rewritten, so people who skipped the old one see
 * the new. v3 on 22 September, because the "How you win" card had been telling
 * both sides that Highwater ends the war that day and that has not been the
 * rule since 21 September. Somebody who read the wrong one is owed the right
 * one, which is the whole reason this key has a number on it.
 */
const DONE_KEY = 'seven-seas.taught.v3';

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
  /*
   * Rewritten 22 September, because both halves of it were false.
   *
   * It told the Crown *"lose Highwater and you lose the war that day"* and the
   * Confederacy *"take Highwater and the war is over that day"*, and neither
   * has been true since the two-principals rule of 21 September. Taking the
   * capital is how the Confederacy usually wins — the Imperator is standing on
   * it — but it has to actually catch both of them, and a Grand Admiral who
   * sailed the week before is a Grand Admiral still to be found.
   *
   * The other session's `tutorial.json` carries the replacement copy and flags
   * this as *"the single most misleading sentence in the game"*. This is that
   * copy, with one correction to it: it says the two are *both* on Highwater,
   * and `lab/principals.ts` says they open on the same quay in 11% of worlds —
   * the Imperator always there and the Grand Admiral anywhere. So the sentence
   * says where each of them is rather than claiming they are together.
   *
   * Rule 5 of `docs/opening-flow.md`: nothing in the flow may lie about a
   * rule, because a tutorial is the one place a player has no way to know they
   * are being told something stale.
   */
  {
    title: 'How you win',
    body: (side) =>
      side === 'empire'
        ? `Have all three Pirate Lords — ${PIRATE_LORDS.map((l) => l.name).join(', ')} — in irons at the same time. They are people, so you take one by carrying them off a quay, and holding two is worth nothing if the third is still at sea. You lose if the Confederacy takes the Imperator and ${CROWN_PRINCIPALS[1]} together.`
        : `Take the young Imperator and Grand Admiral Corvane and hold them at the same time. The Imperator is on Highwater, the Crown's walled capital on the Aldermain, which is why every war ends up there — but the Grand Admiral is somewhere else, and two out of two is the whole of the condition. You lose if the Crown gets all three of your Pirate Lords in irons at once, so keep them apart.`,
  },
  {
    title: 'Tap an island',
    body: () =>
      `The ${terms.worldMap} shows the chains. Tap one to open it, tap an island inside it to open the ${terms.island.toLowerCase()}. Everything you can do to a place is on the tabs there: who is in the harbor, who is ashore, what is built, and how many ${terms.troops.toLowerCase()} hold it.`,
  },
  {
    title: 'Send your crew',
    body: () =>
      `${terms.crew} are how the map changes. Open one from the Crew tab at the foot, press Assign ${terms.errand}, choose an island, and it offers what can be done there — talk the island round, recruit, chart the unknown, spy, or take command. Then they sail, and it takes as long as the distance.`,
  },
  {
    title: 'Build and earn',
    body: () =>
      'Buildings are raised on the island itself, from its Buildings tab — anywhere you hold with a berth free and the gold to pay for it. A Shipyard lays down hulls, a Barracks raises troops, a Gold Mine and a Lumber Mill pay for it. The gold at the top is what you make a day after upkeep — keep it above nothing, and keep your yards working.',
  },
  {
    title: 'Start the clock',
    body: () =>
      'Nothing happens while it says Paused. Start it and the days turn on their own. Passages take weeks, missions a fortnight ashore, hulls months — so set things going, let it run, and read the Log to find out what happened while you were away.',
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
        {/*
          Skip is on every step including the last. It used to render an empty
          label there and leave a live 44px button with nothing drawn in it —
          an invisible control that closed the tutorial if you happened to
          press where it was.
        */}
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
          onClick={() => (last ? finish() : setStep(step + 1))}
        >
          {last ? 'Take the helm' : 'Next'}
        </button>
      </div>
    </div>
  );
}
