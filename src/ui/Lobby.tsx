import { useState } from 'react';
import factionData from '../data/factions.json';
import { SPEED_LABEL } from '../sim';
import type { PlayableFaction, Speed } from '../sim/types';
import type { Phase } from '../net/useNetGame';

/**
 * The screens around a two-player war: the link, the waiting, and the end.
 *
 * Three states and none of them is a game yet. They are deliberately plain —
 * a code, a button, a sentence — because every one of them is a moment where
 * something has not happened and the player wants to know whether that is
 * normal.
 */
export function Lobby({
  phase,
  onLeave,
}: {
  phase: Phase;
  onLeave: () => void;
}) {
  const [copied, setCopied] = useState(false);
  if (phase.at === 'none' || phase.at === 'playing') return null;

  const share = async (link: string, code: string) => {
    // The share sheet on a phone, which is how this is actually going to be
    // sent — a text message. Falls back to the clipboard on a desktop, and to
    // the code on screen if both are refused.
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Master of the Seven Seas', text: `Join my war: ${link}` });
        return;
      }
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // Refused, or dismissed. The code is on the screen either way.
      setCopied(false);
    }
    void code;
  };

  return (
    <div className="start start--painted lobby">
      <div className="lobby__box">
        {phase.at === 'hosting' && (
          <>
            <h1 className="lobby__title">Send this to your friend</h1>
            <p className="lobby__code">{phase.code}</p>
            <p className="lobby__says">
              They open the link and you are both in the same war — you take the Crown, they take
              the Confederacy.
            </p>
            {/* The one instruction that actually matters, and the one that was
                missing the first time this ran for real: leaving the app to
                send the link suspends this page, which closes the lobby. It
                reconnects when you come back, but if they tap the link while
                you are away there is nobody for them to find. */}
            <p className="lobby__warn">
              Come back to this screen after you send it, and leave it open until they are in.
            </p>
            <button className="btn btn--primary btn--wide" onClick={() => share(phase.link, phase.code)}>
              {copied ? 'Link copied' : 'Send the link'}
            </button>
            <p className="tiny muted lobby__wait">{phase.says ?? 'Waiting for them to join…'}</p>
          </>
        )}

        {phase.at === 'joining' && (
          <>
            {/* No code yet means this is the host's own half-second while the
                connection library loads and the broker hands out a lobby. */}
            <h1 className="lobby__title">{phase.code ? 'Finding the game' : 'Opening a game'}</h1>
            {phase.code && <p className="lobby__code">{phase.code}</p>}
            <p className="lobby__says">
              {phase.says ??
                (phase.code
                  ? 'Looking for whoever sent you this. They need to still have the game open.'
                  : 'A moment — fetching what two phones need to find each other.')}
            </p>
          </>
        )}

        {phase.at === 'broken' && (
          <>
            <h1 className="lobby__title">That is as far as it goes</h1>
            <p className="lobby__says">{phase.says}</p>
            {/* A reload, because the code is still in the address bar — which
                is exactly why it is no longer stripped on the way past. The
                commonest two failures both cure themselves in a few seconds,
                so trying again is usually the whole fix. */}
            <button
              className="btn btn--primary btn--wide"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </>
        )}

        <button className="btn btn--wide lobby__out" onClick={onLeave}>
          {phase.at === 'broken' ? 'Back to the start' : 'Never mind'}
        </button>
      </div>
    </div>
  );
}

/**
 * The speed request, which is the one thing in the war that is asked rather
 * than done.
 *
 * Sean, 11 October: *"In PvP when one player changes speed, the other player
 * gets a popup 'the [other faction] requests the speed to be [speed]' and they
 * can accept or decline. The game always works on mutual consent."* Worded as
 * he worded it, because the whole point is that it reads as a request from a
 * person and not as a setting changing under you.
 */
export function SpeedRequest({
  asked,
  onAnswer,
}: {
  asked: { speed: Speed; by: PlayableFaction };
  onAnswer: (agreed: boolean) => void;
}) {
  return (
    <>
      <div className="scrim scrim--stacked" />
      <div className="dispatch dispatch--ask" role="dialog" aria-label="A request about the clock">
        <div className="dispatch__head">
          <span className="dispatch__title">The clock</span>
        </div>
        <div className="dispatch__body">
          <p className="dispatch__text serif">
            The {factionData[asked.by].shortName} requests the speed to be{' '}
            <b>{SPEED_LABEL[asked.speed]}</b>.
          </p>
          <p className="tiny muted">
            Nothing changes unless you agree. Either of you can ask again.
          </p>
        </div>
        <div className="dispatch__foot dispatch__foot--choice">
          <button className="btn btn--flex" onClick={() => onAnswer(false)}>
            Decline
          </button>
          <button className="btn btn--flex btn--primary" onClick={() => onAnswer(true)}>
            Agree
          </button>
        </div>
      </div>
    </>
  );
}
