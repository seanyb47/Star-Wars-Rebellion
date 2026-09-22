import { useState } from 'react';
import factionData from '../data/factions.json';
import reachData from '../data/reaches.json';
import { numberWord } from './words';
import type { PlayableFaction } from '../sim';
import { CompassRose, FactionCrest } from './art';
import { paintedChart } from './painted';

/**
 * Difficulty is shown because the player asked to see the choice, but only
 * Normal exists: how the war actually scales is a later decision, and a
 * setting that silently did nothing would be worse than one that says so.
 */
const DIFFICULTIES = [
  { id: 'lenient', label: 'Lenient', available: false },
  { id: 'normal', label: 'Normal', available: true },
  { id: 'harsh', label: 'Harsh', available: false },
];

const FACTION_DETAIL: Record<
  PlayableFaction,
  { strengths: string[]; weaknesses: string[]; opening: string }
> = {
  empire: {
    strengths: ['Rich, charted Inner Seas', 'Ships of the line from the first day', 'The Lords have to be found; Highwater is on every chart'],
    weaknesses: ['Lose Highwater and lose everything', 'Fewer envoys than the Brethren', 'Islands resent what the walls cost them'],
    opening: 'You begin at Highwater, the walled capital on the Aldermain, with the core of the world in hand and the royal dockyard at Yarrow Minor still smoking. You have ships of the line and no quick way to build more. Somewhere past your charts the three captains who burned it have met, and islands are already declaring for them.',
  },
  alliance: {
    strengths: ['Three Pirate Lords, each with a power nobody else has', 'More envoys, and better ones', 'No capital to lose'],
    weaknesses: ['Outgunned in open water', 'Lose all three Lords at once and the cause dies', 'Half your captains take some managing'],
    opening: 'You begin at Freeport, beyond the Crown\'s charts, three Lords and the people who came with them, with islands across the Reaches already declared for you. You burned the Imperium\'s dockyard and signed the articles a month later. All three Lords are in that one harbor, and the Imperium will be looking for it.',
  },
};

const ISLANDS = reachData.reaches.reduce((n, r) => n + r.islands.length, 0);
const REACHES = reachData.reaches.length;

export function StartScreen({
  hasSave,
  onContinue,
  onBegin,
}: {
  hasSave: boolean;
  onContinue: () => void;
  onBegin: (faction: PlayableFaction) => void;
}) {
  const [faction, setFaction] = useState<PlayableFaction | null>(null);
  const detail = faction ? FACTION_DETAIL[faction] : null;
  // The world, behind the choice of which side of it to take. Clear behind the
  // title and scrimmed away under the text — see .start--painted, which is
  // where the legibility is actually bought.
  const backdrop = paintedChart('title');

  return (
    <div
      className={backdrop ? 'start start--painted' : 'start'}
      style={backdrop ? ({ ['--backdrop' as string]: `url(${backdrop})` }) : undefined}
    >
      {/*
        A scrolling body and a fixed foot, rather than one long scroll with a
        sticky button in it.

        Sean, 22 September, with a screenshot of the button sitting across the
        strengths panel: *"take command screen is floating."* That was my fix
        of 20 September for a real problem — picking a side opens the detail
        panel, which used to push the button down the page and off a phone —
        and `position: sticky` did stop it moving. What it also did was park a
        shadowed gold pill halfway down a paragraph, which reads as a layout
        fault rather than as a control.

        A footer solves the same problem and looks deliberate: the button is
        always in the same place, always reachable, and separated from the page
        by a rule and a background instead of hovering over it. The page below
        scrolls under nothing.
      */}
      <div className="start__body">
      <header className="start__head">
        <div className="start__rose">
          <CompassRose size={64} opacity={0.55} />
        </div>
        <h1 className="start__title serif">Master of the Seven Seas</h1>
        <p className="start__tagline">
          {numberWord(REACHES)[0].toUpperCase() + numberWord(REACHES).slice(1)} seas, {numberWord(ISLANDS)} islands, and something older than both fleets moving underneath.
        </p>
      </header>

      {hasSave && (
        <button className="btn btn--block btn--primary start__continue" onClick={onContinue}>
          Continue your game
        </button>
      )}

      <div className="section-title">{hasSave ? 'Or start again' : 'Choose your side'}</div>

      <div className="start__factions">
        {(['empire', 'alliance'] as const).map((id) => (
          <button
            key={id}
            className={`facard facard--${id}${faction === id ? ' facard--picked' : ''}`}
            onClick={() => setFaction(id)}
            aria-pressed={faction === id}
          >
            <FactionCrest faction={id} size={64} />
            <div className="facard__name serif">{factionData[id].name}</div>
            {/* The creed, as the art direction board sets it: the five
                clauses under the crest that say what the side is for, before
                the paragraph that says what it costs. */}
            <div className="facard__creed">{factionData[id].creed}</div>
            <div className="facard__blurb">{factionData[id].blurb}</div>
          </button>
        ))}
      </div>

      {detail && faction && (
        <div className="card start__detail">
          <p className="start__opening">{detail.opening}</p>
          <div className="start__cols">
            <div>
              <div className="tiny start__good">Strengths</div>
              <ul className="start__list">
                {detail.strengths.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="tiny start__bad">Weaknesses</div>
              <ul className="start__list">
                {detail.weaknesses.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="section-title">Difficulty</div>
      {/*
        Marks, not buttons, until there is a choice to make.
        Every one of these was a dead tap: two were `disabled`, and Normal —
        the one a new player would actually go for — was an enabled button
        with no handler at all. So the first thing the game invited anybody to
        do was press something that did nothing, which is a poor way to teach
        that pressing things works. They say what the setting is and wait to
        become controls when the other two mean something.
      */}
      <div className="start__difficulty">
        {DIFFICULTIES.map((d) => (
          <span
            key={d.id}
            className={`pill pill--static${d.available ? ' pill--on' : ''}`}
            aria-current={d.available ? 'true' : undefined}
          >
            {d.label}
          </span>
        ))}
      </div>
      <p className="tiny muted start__note">
        Only Normal for now. How the war scales is still being decided, so the other two are not
        pretending to work.
      </p>

      </div>

      <div className="start__foot">
      <button
        className="btn btn--block btn--primary start__begin"
        disabled={!faction}
        onClick={() => faction && onBegin(faction)}
      >
        {faction ? `Take command of the ${factionData[faction].shortName}` : 'Choose a side to begin'}
      </button>

      {hasSave && (
        <p className="tiny muted start__note start__note--foot">
          Starting a new game discards the one in progress.
        </p>
      )}
      </div>
    </div>
  );
}
