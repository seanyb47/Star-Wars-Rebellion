import { useEffect, useRef, useState } from 'react';
import { accentUrl, clipExists, idleUrl, NARRATOR_ACCENTS, stillUrl } from './assets';
import { NARRATOR_MOODS, type NarratorId, type NarratorMood } from './mood';

/**
 * The advisor in a fixed 4:5 frame (plan F6): a rectangle, so no clip needs
 * an alpha channel and iOS and Android agree on what they are drawing.
 *
 * Three layers, bottom to top: the mood stills, all three mounted and
 * cross-faded so a change of mood is a change of face and nothing else; the
 * idle clip for the current mood, looping, once the sheet has found it on the
 * server; and an accent clip, played once on a timer and then dropped. A mood
 * with no clip yet simply shows its still, breathing very slightly, which is
 * how the sheet ships until every clip is made — and how it always looks
 * with reduced motion on.
 */
export function AdvisorPortrait({
  id,
  mood,
  width = 128,
  accents = true,
}: {
  id: NarratorId;
  mood: NarratorMood;
  width?: number;
  /** Fire the accent timer (plan F4). Off while the sheet is doing something else. */
  accents?: boolean;
}) {
  const [idleOk, setIdleOk] = useState<Partial<Record<NarratorMood, boolean>>>({});
  const [accentPool, setAccentPool] = useState<string[]>([]);
  const [accent, setAccent] = useState<string | null>(null);
  const changedAt = useRef(Date.now());

  // Which clips exist, asked once. Missing ones stay stills.
  useEffect(() => {
    let live = true;
    for (const m of NARRATOR_MOODS) {
      void clipExists(idleUrl(id, m)).then((ok) => {
        if (live) setIdleOk((prev) => (prev[m] === ok ? prev : { ...prev, [m]: ok }));
      });
    }
    void Promise.all(
      NARRATOR_ACCENTS[id].map((a) => clipExists(accentUrl(id, a)).then((ok) => (ok ? a : null))),
    ).then((found) => {
      if (live) setAccentPool(found.filter((a): a is string => a !== null));
    });
    return () => {
      live = false;
    };
  }, [id]);

  useEffect(() => {
    changedAt.current = Date.now();
    setAccent(null);
  }, [mood, id]);

  // Accent timer (plan F4): every 15–30 s of idle, one accent, then back.
  // Never during a mood change, never over another accent.
  useEffect(() => {
    if (!accents || accentPool.length === 0 || accent) return;
    const wait = 15_000 + Math.random() * 15_000;
    const t = window.setTimeout(() => {
      if (Date.now() - changedAt.current < 1_000) return;
      setAccent(accentPool[Math.floor(Math.random() * accentPool.length)]);
    }, wait);
    return () => window.clearTimeout(t);
  }, [accents, accentPool, accent, mood]);

  const height = Math.round((width * 5) / 4);
  const idle = idleOk[mood] ? idleUrl(id, mood) : null;

  return (
    <div className="advisor-frame" style={{ width, height }} aria-hidden="true">
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
      {accent && (
        <video
          key={accent}
          className="advisor-frame__clip"
          src={accentUrl(id, accent)}
          autoPlay
          muted
          playsInline
          onEnded={() => setAccent(null)}
          onError={() => {
            setAccentPool((pool) => pool.filter((a) => a !== accent));
            setAccent(null);
          }}
        />
      )}
    </div>
  );
}
