import { useEffect, useState } from 'react';
import factionData from '../data/factions.json';
import { CAPTIVE_DAYS, LEADERS, VICTORY_CONTROL_FRACTION, type PlayableFaction } from '../sim';

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
 * Twelve short cards rather than six, because the six assumed a player who
 * had played Rebellion and only needed a first move. Most have not, and what
 * they lack is the frame — that islands have people who lean, that officers
 * are how the map changes, that the clock is the enemy. Each card still names
 * one thing and gets out of the way; there are just enough of them now to
 * cover the game.
 *
 * It never blocks the game. The card sits over the chart's own strip, the rest
 * of the interface stays live, and Skip is always there. It can be reopened
 * from the menu as "How to play".
 */
const STEPS: Array<{ title: string; body: (side: PlayableFaction) => string }> = [
  {
    title: 'What this is',
    body: (side) => {
      const you = factionData[side];
      const them = factionData[side === 'empire' ? 'alliance' : 'empire'];
      return `A war for the Seven Seas: sixty-two islands in seven chains. You are the ${you.name}. ${them.name} is out there with ships, officers and islands of its own, and it wants what you have.`;
    },
  },
  {
    title: 'How you win',
    body: (side) => {
      const enemy = side === 'empire' ? 'alliance' : 'empire';
      const them = factionData[enemy];
      const [first, second] = LEADERS[enemy];
      return `Two ways. Take ${them.hqLabel} and hold both ${first} and ${second} in irons at the same time — captives are exchanged after ${CAPTIVE_DAYS} days, so it is a window. Or hold ${Math.round(VICTORY_CONTROL_FRACTION * 100)}% of the settled islands. They win the same two ways against you.`;
    },
  },
  {
    title: 'The chart',
    body: () =>
      'Every island is a dot in the colour of who holds it: green the Crown, red the Confederacy, blue settled but nobody\'s, grey unexplored or empty — open ground to survey and settle. A ring marks a capital. Tap a chain to zoom in.',
  },
  {
    title: 'One island',
    body: () =>
      'Inside a chain, tap an island for its panel: Harbour for ships and defences, Crew for your officers there, Garrison for companies ashore, Buildings for what stands and what you can order, Log for what has happened.',
  },
  {
    title: 'Allegiance',
    body: () =>
      'Every island has people, and they lean. The bar on its panel shows how far. Under 30 with too few companies ashore, an island rises against you and earns nothing. Talking to people raises it; a garrison holds it.',
  },
  {
    title: 'Your crew',
    body: () =>
      'Seven officers, each rated for Diplomacy, Espionage, Combat and Leadership. Send one to an island and the island decides the errand: parley with the undecided, stir up trouble on theirs, sign on somebody worth having, chart the unknown, burn their works, carry off their officer, restore order on yours.',
  },
  {
    title: 'Gold',
    body: () =>
      'Camps and Mills earn it, more on loyal islands than sullen ones. Works, Slipways, companies and hulls cost it every day. The number at the top is what you make a day after paying for everything. Keep it above nothing.',
  },
  {
    title: 'Building',
    body: () =>
      'A Works builds everything. A Drill Ground raises companies. A Slipway lays down hulls. A Fort is guns on the harbour wall; a Boom is a chain across its mouth. Camps take ground, everything else takes water, and every island has only so much of each.',
  },
  {
    title: 'Your fleet',
    body: (side) =>
      `A fleet already lies at ${factionData[side].hqLabel}. It can sail to another island, lie off an enemy harbour and shut its trade, or put companies ashore to take it. Big ships hit hard and sail slow; sloops arrive first and sink first.`,
  },
  {
    title: 'The filters',
    body: () =>
      'The strip under the chart. Every island stays on the chart in its own colour, whatever you pick; the ones that answer the filter turn into stars. Idle works is the one to check often — a yard building nothing is gold you are not making. Worth grades every island: a dot, a spark, a starburst.',
  },
  {
    title: 'The clock',
    body: () =>
      'Nothing moves while it says Paused. Start it and a day passes every few seconds, whether you are watching or not. Passages take days, errands take a fortnight ashore, hulls take weeks. The Log at the foot tells you what happened while you looked away.',
  },
  {
    title: 'A first move',
    body: (side) =>
      side === 'empire'
        ? 'Two of your islands are sullen and held by garrison alone. Send a diplomat to one of them before the Confederacy sends theirs. Then find the Free Harbour: it is out in the outer Reaches and you have not charted it.'
        : 'You hold four islands the Crown cannot see. Send your best diplomat to a neutral island in your own chain and turn it. Put Wyatt Ansell on the Slipway. And keep your seat hidden: the Crown has to find it before it can take it.',
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
