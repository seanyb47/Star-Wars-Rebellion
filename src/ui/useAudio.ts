import { useEffect, useRef, useState } from 'react';
import { AudioEngine } from '../audio/engine';
import type { GameState } from '../sim';

const SOUND_KEY = 'seven-seas.sound.v1';

function readPreference(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === 'on';
  } catch {
    return false;
  }
}

/**
 * Connects the game to the audio engine.
 *
 * Sound starts off, as chosen: a game that makes noise the moment it opens is
 * a game people close on a train. Turning it on is itself the user gesture
 * mobile browsers demand before any audio may play.
 *
 * The bed keeps running while the clock is paused, and does not change with
 * where you are looking. Both were mistakes worth recording: silencing it on
 * pause meant the sound cut out every time a panel opened, and retuning it per
 * Sea meant it lurched every time the player panned the chart. It stops only
 * when the app is genuinely in the background, which is where battery matters.
 */
export function useAudio(state: GameState) {
  const [on, setOn] = useState(readPreference);
  const engine = useRef<AudioEngine | null>(null);
  const lastEventId = useRef<string | null>(null);

  if (!engine.current) engine.current = new AudioEngine();

  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
    } catch {
      /* a refused write only costs us the preference next launch */
    }
    // Started here, inside the tap, which is the only place mobile allows it.
    if (next) void engine.current?.start();
    else void engine.current?.suspend();
  };

  /**
   * A remembered preference cannot start audio on its own — the browser still
   * wants a gesture — so the first tap anywhere resumes it.
   */
  useEffect(() => {
    if (!on || engine.current?.running) return;
    const resume = () => void engine.current?.start();
    window.addEventListener('pointerdown', resume, { once: true });
    return () => window.removeEventListener('pointerdown', resume);
  }, [on]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void engine.current?.suspend();
      else if (on) void engine.current?.start();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [on]);

  useEffect(() => () => engine.current?.stop(), []);

  // Your side's theme, once sound is on. A no-op with no music files, which
  // is how the game ships until somebody puts one in src/audio/music/.
  useEffect(() => {
    if (!on) return;
    void engine.current?.setTheme(state.player);
  }, [on, state.player]);

  // Sour the bed while your islands are in revolt.
  useEffect(() => {
    if (!on) return;
    const held = state.systems.filter((s) => s.control === state.player);
    const revolting = held.filter((s) => s.uprising).length;
    engine.current?.setUnrest(held.length === 0 ? 0 : revolting / held.length);
  }, [on, state.systems, state.player]);

  // Sound whatever has happened since the last render.
  useEffect(() => {
    if (!on) return;
    const events = state.events;
    if (events.length === 0) return;
    const newest = events.at(-1)!;
    if (lastEventId.current === null) {
      lastEventId.current = newest.id;
      return;
    }
    if (lastEventId.current === newest.id) return;

    const seen = events.findIndex((e) => e.id === lastEventId.current);
    const fresh = seen === -1 ? [newest] : events.slice(seen + 1);
    lastEventId.current = newest.id;

    // One sound per kind per tick: a busy day should not become a clatter.
    for (const kind of new Set(fresh.map((e) => e.kind))) {
      engine.current?.play(kind);
    }
  }, [on, state.events]);

  return { on, toggle };
}
