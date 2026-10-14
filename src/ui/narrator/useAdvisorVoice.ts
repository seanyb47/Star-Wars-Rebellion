import { useCallback, useEffect, useRef, useState } from 'react';
import type { NarratorMood } from './mood';

/** How long a line "takes to say": the text does the talking, the figure
 *  only gestures, so this is read from the length of the sentence. */
export function speakingTime(text: string): number {
  return Math.min(6_000, Math.max(1_200, text.length * 45));
}

/**
 * The advisor's face and whether they are mid-sentence.
 *
 * Rebellion's droids never lip-sync: a message appears and the droid gestures
 * until you have had time to read it. That is the whole trick, and it costs
 * nothing. `say` sets the mood and starts the gesture for as long as the
 * line would take to read; the mood then stays until the next line.
 */
export function useAdvisorVoice(initial: NarratorMood = 'neutral') {
  const [mood, setMood] = useState<NarratorMood>(initial);
  const [talking, setTalking] = useState(false);
  const timer = useRef<number | null>(null);

  const say = useCallback((text: string, nextMood: NarratorMood = 'neutral') => {
    setMood(nextMood);
    setTalking(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setTalking(false), speakingTime(text));
  }, []);

  const hush = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    setTalking(false);
  }, []);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  return { mood, talking, say, hush };
}
