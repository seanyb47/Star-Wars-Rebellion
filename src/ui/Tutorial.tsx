import { useEffect, useState } from 'react';
import factionData from '../data/factions.json';
import reachData from '../data/reaches.json';
import { numberWord } from './words';
import { CAPTIVE_DAYS, PIRATE_LORDS, type PlayableFaction } from '../sim';

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
const ISLANDS = reachData.reaches.reduce((n, r) => n + r.islands.length, 0);
const REACHES = reachData.reaches.length;

const STEPS: Array<{ title: string; body: (side: PlayableFaction) => string }> = [
  {
    title: 'What this is',
    body: (side) => {
      const you = factionData[side];
      const them = factionData[side === 'empire' ? 'alliance' : 'empire'];
      return `A war for the Seven Seas: ${numberWord(ISLANDS)} islands in ${numberWord(REACHES)} chains. You are the ${you.name}'s ${you.playerTitle} — the highest rank it has, and every admiral and captain answers to you. ${them.name} is out there with ships, officers and islands of its own, and it wants what you have.`;
    },
  },
  {
    title: 'How you win',
    body: (side) => {
      const lords = PIRATE_LORDS.map((l) => l.name).join(', ');
      return side === 'empire'
        ? `Hunt down the three Pirate Lords — ${lords}. Each is bound to a ship; take the ship and you take the Lord. Hold all three in irons at once and the Confederacy is finished. Captives are exchanged after ${CAPTIVE_DAYS} days, so it is a window. And hold Highwater: the day it falls, the Crown falls.`
        : `Take Highwater. The day the Confederacy holds it, the Crown is finished. You lose the day all three Pirate Lords — ${lords}, each bound to their own ship — are in the Crown's irons at once. Captives are exchanged after ${CAPTIVE_DAYS} days, so keep at least one of them out of reach.`;
    },
  },
  {
    title: 'The chart',
    body: () =>
      'Every island is a dot in the colour of who holds it: green the Crown, red the Confederacy, blue settled but nobody\'s, grey unexplored or empty — open ground to survey and settle. The star is the thing to watch: it marks Highwater, and wherever a Pirate Lord\'s ship is lying. Tap a chain to zoom in.',
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
      'Seven officers, each rated for Diplomacy, Espionage, Combat and Leadership. Send one to an island and the island offers the errand: parley with the undecided, stir up trouble on theirs, sign on somebody worth having, chart the unknown, burn their yards, carry off their officer, break one of yours out of their cells, restore order on yours. Where it offers more than one, you choose.',
  },
  {
    title: 'Gold',
    body: () =>
      'Camps and Mills earn it, more on loyal islands than sullen ones. Construction Yards, Shipyards, companies and hulls cost it every day. The number at the top is what you make a day after paying for everything. Keep it above nothing.',
  },
  {
    title: 'Building',
    body: () =>
      'A Construction Yard builds everything. A Training Facility raises companies. A Shipyard lays down hulls. A Fort is guns on the harbour wall; a Boom is a chain across its mouth. Camps take ground, everything else takes water, and every island has only so much of each.',
  },
  {
    title: 'Your fleet',
    body: (side) =>
      `A fleet already lies at ${factionData[side].hqLabel}. It can sail to another island, lie off an enemy harbour and shut its trade, or put companies ashore to take it. Big ships hit hard and sail slow; sloops arrive first and sink first.`,
  },
  {
    title: 'The filters',
    body: () =>
      'The strip under the chart. Every island stays on the chart in its own colour, whatever you pick; the ones that answer the filter turn into stars, or into a number where a number is the answer — companies under Garrisons, gold a day under Production. The idle filters are the ones to check often: a construction yard, training facility or shipyard building nothing is gold you are not making.',
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
        ? 'Two of your islands are sullen and held by garrison alone. Send a diplomat to one of them before the Confederacy sends theirs. Then start the hunt: the three Lords\' ships are lying off some island in the outer Reaches you have not charted, and they will scatter when they see you coming. Survey the frontier, and watch for the star.'
        : 'Your three Lords and their ships lie at the meeting place, beyond the Crown\'s charts, with the rest of your people aboard the Free Harbor. Put them ashore where you hold ground and send your best diplomat to a neutral island in your own chain. Put Wyatt Ansell on the Shipyard. And keep the Lords apart and out of sight: the Crown needs all three at once.',
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
