import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioEngine } from '../audio/engine';
import { narratorIdFor } from './narrator/assets';
import { hushVoice, speak } from './narrator/voice';
import { isSpoken, makesSound, usePrefs } from './prefs';
import type { EventKind, GameState } from '../sim';
import type { NarratorId } from './narrator/mood';

const SOUND_KEY = 'seven-seas.sound.v1';

/**
 * The one engine, reachable from outside the hook.
 *
 * Only so the notification panel can let you *hear* a row before deciding
 * whether to untick it. Sean, 23 September: *"I don't hear unique chimes
 * depending on type of log note"* — and the reason he could not tell was that
 * hearing two of them side by side meant playing two wars. A second engine
 * would be a second AudioContext over the same speaker, so the panel borrows
 * this one rather than building its own.
 */
let shared: AudioEngine | null = null;

/**
 * Sound is **on unless somebody turned it off**.
 *
 * Sean, 24 September: *"Make game music play by default from start. Or at
 * launch give people option. How do most games do this?"* Both, and this is
 * the first half. It read `=== 'on'`, so the stored value and the absent value
 * were the same answer and a first-time player got a silent game with a
 * commissioned score sitting in the bundle. Opt-out is what games do; the
 * reason opt-in ever looked reasonable here is the autoplay rule below, which
 * is a question of *when* the first note may sound and not of whether anybody
 * wants one.
 */
function readPreference(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    // A browser that refuses storage is a private window, not a complaint
    // about the music.
    return true;
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
export function useAudio(state: GameState, inGame = true) {
  const [on, setOn] = useState(readPreference);
  // Which kinds of news may make a noise, and which the advisor may speak.
  const [prefs] = usePrefs();
  const engine = useRef<AudioEngine | null>(null);
  const lastEventId = useRef<string | null>(null);

  if (!engine.current) {
    engine.current = new AudioEngine();
    shared = engine.current;
  }

  /**
   * Whose theme should be playing, readable from a callback made on an
   * earlier render. The listener below is registered once and fires much
   * later; a captured `state.player` would be whatever it was that day.
   */
  const theme = useRef(state.player);
  theme.current = state.player;

  /**
   * Start the engine, then put the music on — in that order, in one place.
   *
   * These two cannot be separated. The theme needs an AudioContext and the
   * context is only built inside a user gesture, so any path that starts the
   * engine has to ask for the theme *after* it, not before. Splitting them
   * was the whole of the music bug: a remembered preference asked for the
   * theme on mount, got nothing because there was no context yet, and the
   * first tap then resumed the bed and nothing else.
   */
  const resume = useCallback(async () => {
    const audio = engine.current;
    if (!audio) return;
    await audio.start();
    await audio.ensureTheme(theme.current);
  }, []);

  /**
   * Start the engine on a named side's theme, from inside the tap that chose it.
   *
   * The title screen's job. A player who has just pressed the Crown should
   * hear the Crown, and `state.player` does not become the Crown until they
   * press Begin — so the side comes in as an argument rather than off the
   * state. Writing `theme.current` is what keeps the later effect quiet: when
   * Begin does move `state.player`, `ensureTheme` finds that theme already
   * laid down and does nothing.
   */
  const startWith = useCallback(
    async (side: string) => {
      const audio = engine.current;
      if (!audio || !readPreference()) return;
      theme.current = side as GameState['player'];
      await audio.start();
      await audio.ensureTheme(side);
    },
    [],
  );

  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
    } catch {
      /* a refused write only costs us the preference next launch */
    }
    // Started here, inside the tap, which is the only place mobile allows it.
    if (next) void resume();
    else void engine.current?.suspend();
  };

  /**
   * A remembered preference cannot start audio on its own — the browser still
   * wants a gesture — so the first tap anywhere resumes it.
   *
   * Not on the title screen, though, which is why `inGame` exists. There the
   * first tap is very often a faction card, and this listener would race it
   * and lay down whichever side `newGame()` happened to default to — you press
   * the Confederacy and hear the Crown. The title screen starts its own music
   * through `startWith`, so this is the net for everything after it.
   */
  useEffect(() => {
    if (!inGame || !on || engine.current?.running) return;
    const go = () => void resume();
    window.addEventListener('pointerdown', go, { once: true });
    return () => window.removeEventListener('pointerdown', go);
  }, [inGame, on, resume]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void engine.current?.suspend();
      else if (on) void resume();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [on, resume]);

  useEffect(() => () => engine.current?.stop(), []);

  // Your side's theme, once sound is on. `ensureTheme` rather than `setTheme`
  // so that a request made before the engine exists is not mistaken later for
  // a theme already playing. A no-op with no music files, which is how the
  // game ships until somebody puts one in src/audio/music/.
  useEffect(() => {
    if (!on) return;
    void engine.current?.ensureTheme(state.player);
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

    /*
     * One sound per kind per tick: a busy day should not become a clatter.
     * Which kinds are allowed to make one is the Sound column in the log's
     * notification panel — the speaker in the top bar says whether the game
     * makes any noise at all, and this says what the noise is for.
     */
    const kinds = [...new Set(fresh.map((e) => e.kind))];
    for (const kind of kinds) {
      if (makesSound(prefs, { kind })) engine.current?.play(kind);
    }
    /*
     * And the advisor says one of them out loud — the first, not all of them.
     * Two recordings over each other is somebody talking in a pub, and
     * `speak` refuses the second anyway; asking once keeps the reason here
     * rather than only in there.
     */
    const toSay = kinds.find((kind) => isSpoken(prefs, { kind }));
    if (toSay) speak(narratorIdFor(state.player), toSay);
  }, [on, state.events, state.player, prefs]);

  // Switching sound off mid-sentence stops the sentence. The engine suspends
  // its own graph; a recording is an `<audio>` element and is nobody else's.
  useEffect(() => {
    if (!on) hushVoice();
  }, [on]);

  return { on, toggle, startWith };
}

/**
 * Play a kind of news on demand: its sound, then the advisor on it.
 *
 * Deliberately ignores the two columns — you are pressing the row to find out
 * what it sounds like, and a preview that honoured the tick you are about to
 * change would play nothing exactly when you most want to hear it. The
 * speaker in the top bar still rules: with the engine stopped this is silent,
 * because there is no AudioContext to be silent with.
 */
export function previewNotification(kind: EventKind, who: NarratorId): void {
  shared?.play(kind);
  speak(who, kind);
}
