import { useEffect, useRef, useState } from 'react';

/**
 * Whether an element is near enough to the screen to be worth loading art for.
 *
 * The reason this exists is narrower than it first looked. Painted art is
 * emitted as separate files, not bundled into the JavaScript, so the download
 * only happens when something actually references an image — the initial load
 * stays small on its own. What does hurt is a single screen that renders the
 * whole cast at once: the crew list asks for twenty-six paintings in one go,
 * and on a slow connection that is megabytes for a list you are about to
 * scroll past.
 *
 * So this is per-screen thrift rather than bundle thrift, and the placeholder
 * problem solves itself: a portrait that has not loaded yet shows its drawn
 * cameo, which is the right size, the right shape and already correct. No
 * blank boxes, no layout shift, and nothing to design.
 *
 * `rootMargin` is generous on purpose. Loading starts before a row is on
 * screen, so scrolling at a normal speed never shows the swap.
 */
export function useInView<T extends Element>(rootMargin = '400px'): [
  React.MutableRefObject<T | null>,
  boolean,
] {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (seen) return;
    const el = ref.current;
    // Older browsers, and jsdom: show the art rather than never showing it.
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        // Once it has been seen it stays loaded. Unloading a portrait the
        // moment it scrolls off would re-fetch it on the way back, which is
        // worse than keeping it.
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, rootMargin]);

  return [ref, seen];
}
