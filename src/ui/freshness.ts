/**
 * Is this shell the one the server is serving?
 *
 * The other half of the stale-document problem, and the half that can be
 * caught politely. The inline script in `index.html` handles the brutal case —
 * the bundle is simply gone and nothing runs. This handles the case where the
 * bundle still loads but is not the current one: an installed app holding an
 * older `index.html` whose assets happen to survive a deploy, which runs
 * happily and quietly out of date. Sean's fourth note is the same problem
 * wearing a different hat: *"the menu still says v0.4.0 on a new bundle, which
 * makes cache issues and QA retests hard to track."*
 *
 * `build.json` is emitted beside the bundle with no content hash, so it is
 * always fetchable at a known URL, and fetched with `cache: 'no-store'` so the
 * answer is the server's rather than the cache's. A disagreement means the
 * document is old.
 *
 * Deliberately quiet about failure. Offline is the normal reason this cannot
 * be answered, and a game that will not start because it could not check its
 * own version number would be a worse bug than the one being fixed.
 */
const RELOADED = 'seven-seas.refreshed';

export interface Freshness {
  /** What the running bundle was built as. */
  running: string;
  /** What the server says is current, where it could be asked. */
  serving?: string;
  stale: boolean;
}

export async function checkFreshness(
  fetcher: typeof fetch = fetch,
  base = import.meta.env.BASE_URL,
): Promise<Freshness> {
  const running = __BUILD_ID__;
  try {
    const response = await fetcher(`${base}build.json`, { cache: 'no-store' });
    if (!response.ok) return { running, stale: false };
    const { build } = (await response.json()) as { build?: string };
    if (typeof build !== 'string' || build.length === 0) return { running, stale: false };
    return { running, serving: build, stale: build !== running };
  } catch {
    return { running, stale: false };
  }
}

/**
 * Reload for a stale shell, at most once per build per session.
 *
 * The guard is keyed to what the server is serving, so a second deploy while
 * the tab is open is still caught — what it cannot do is loop, because a
 * reload that does not change the running build will not try again.
 */
export function refreshIfStale(freshness: Freshness, reload: () => void = defaultReload): boolean {
  if (!freshness.stale || !freshness.serving) return false;
  try {
    if (sessionStorage.getItem(RELOADED) === freshness.serving) return false;
    sessionStorage.setItem(RELOADED, freshness.serving);
  } catch {
    // No storage is no guard, and an unguarded reload can loop. Leave it.
    return false;
  }
  reload();
  return true;
}

function defaultReload(): void {
  location.replace(`${location.pathname}?rebuilt=${Date.now()}`);
}
