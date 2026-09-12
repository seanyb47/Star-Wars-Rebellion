import { useState } from 'react';
import factionData from '../data/factions.json';
import type { PlayableFaction } from '../sim';
import { CompassRose, FactionCrest } from './art';

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
    strengths: ['Rich, charted Inner Seas', 'Strong from the first day', 'A capital nobody can find and burn'],
    weaknesses: ['Your seat cannot move', 'Fewer envoys than the Brethren', 'Islands resent what the walls cost them'],
    opening: 'You begin at Highwater with the core of the world already in hand, and everything to lose.',
  },
  alliance: {
    strengths: ['A harbour that moves when found', 'More envoys, and better ones', 'Nothing to lose but the tide'],
    weaknesses: ['Outgunned in open water', 'Scattered across the Outer Seas', 'Half your captains take some managing'],
    opening: 'You begin on the fringe with four islands and a shouting-match for a government.',
  },
};

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

  return (
    <div className="start">
      <header className="start__head">
        <div className="start__rose">
          <CompassRose size={64} opacity={0.55} />
        </div>
        <h1 className="start__title serif">Master of the Seven Seas</h1>
        <p className="start__tagline">
          Seven seas, a hundred islands, and something older than both fleets moving underneath.
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
            className={`facard${faction === id ? ' facard--picked' : ''}`}
            onClick={() => setFaction(id)}
            aria-pressed={faction === id}
          >
            <FactionCrest faction={id} size={64} />
            <div className="facard__name serif">{factionData[id].name}</div>
            {/* The creed, as the style guide sets it: three words under the
                crest that say what the side is for, before the paragraph that
                says what it costs. */}
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
      <div className="start__difficulty">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.id}
            className={`pill${d.available ? ' pill--on' : ''}`}
            disabled={!d.available}
            aria-pressed={d.available}
          >
            {d.label}
          </button>
        ))}
      </div>
      <p className="tiny muted start__note">
        Only Normal for now. How the war scales is still being decided, so the other two are not
        pretending to work.
      </p>

      <button
        className="btn btn--block btn--primary start__begin"
        disabled={!faction}
        onClick={() => faction && onBegin(faction)}
      >
        {faction ? `Take command of the ${factionData[faction].shortName}` : 'Choose a side to begin'}
      </button>

      {hasSave && (
        <p className="tiny muted start__note">
          Starting a new game discards the one in progress.
        </p>
      )}
    </div>
  );
}
