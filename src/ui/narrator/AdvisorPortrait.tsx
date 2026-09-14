import { useEffect, useState } from 'react';
import { clipExists, idleUrl, stillUrl } from './assets';
import { NARRATOR_MOODS, type NarratorId, type NarratorMood } from './mood';

/**
 * The advisor in a fixed 4:5 frame (plan F6): a rectangle, so no clip needs
 * an alpha channel and iOS and Android agree on what they are drawing.
 *
 * Two layers: the mood stills, all three mounted and cross-faded so a change
 * of mood is a change of face and nothing else; and, when the server has one,
 * the mood's idle clip looping over the top. Speaking is a gesture on the
 * whole frame, sized to the mood and the character (styles.css), for as long
 * as the line takes to read. A mood with no clip shows its still, breathing
 * very slightly — which is the shipped look, and the reduced-motion look.
 */
export function AdvisorPortrait({
  id,
  mood,
  width = 128,
  talking = false,
}: {
  id: NarratorId;
  mood: NarratorMood;
  width?: number;
  /** Mid-sentence: the figure gestures (see useAdvisorVoice). */
  talking?: boolean;
}) {
  const [idleOk, setIdleOk] = useState<Partial<Record<NarratorMood, boolean>>>({});

  // Which clips exist, asked once. Missing ones stay stills.
  useEffect(() => {
    let live = true;
    for (const m of NARRATOR_MOODS) {
      void clipExists(idleUrl(id, m)).then((ok) => {
        if (live) setIdleOk((prev) => (prev[m] === ok ? prev : { ...prev, [m]: ok }));
      });
    }
    return () => {
      live = false;
    };
  }, [id]);

  const height = Math.round((width * 5) / 4);
  const idle = idleOk[mood] ? idleUrl(id, mood) : null;

  return (
    <div
      className={`advisor-frame advisor-frame--${id} advisor-frame--${mood}${talking ? ' advisor-frame--talking' : ''}`}
      style={{ width, height }}
      aria-hidden="true"
    >
      {NARRATOR_MOODS.map((m) => (
        <img
          key={m}
          className={`advisor-frame__still${m === mood ? ' advisor-frame__still--on' : ''}`}
          src={stillUrl(id, m)}
          alt=""
          draggable={false}
        />
      ))}
      {idle && (
        <video
          key={idle}
          className="advisor-frame__clip"
          src={idle}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onError={() => setIdleOk((prev) => ({ ...prev, [mood]: false }))}
        />
      )}
    </div>
  );
}
