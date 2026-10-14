import { describe, expect, it, vi } from 'vitest';
import { checkFreshness, refreshIfStale } from '../freshness';

/**
 * Sean, 19 September: *"A fresh load is clean, but a previously-installed
 * (PWA) session throws 404s on load... Returning users could hit failed asset
 * loads until a hard refresh."*
 *
 * There is no service worker to fix, so this is the check that replaces one.
 */
/*
 * The suite runs on node, which has no sessionStorage — and the guard in
 * `refreshIfStale` treats a missing one as "no guard, so do not reload",
 * which would make every test below pass for the wrong reason. A few lines of
 * real storage is better than an environment switch for one file.
 */
const store = new Map<string, string>();
(globalThis as { sessionStorage?: unknown }).sessionStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
} satisfies Storage;

const answer = (body: unknown, ok = true) =>
  vi.fn(async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

describe('knowing the shell is out of date', () => {
  it('asks the server, and asks it past every cache', async () => {
    const fetcher = answer({ version: '0.5.0', build: 'ZZZ' });
    const fresh = await checkFreshness(fetcher, '/base/');
    expect(fetcher).toHaveBeenCalledWith('/base/build.json', { cache: 'no-store' });
    expect(fresh.serving).toBe('ZZZ');
    expect(fresh.stale).toBe(__BUILD_ID__ !== 'ZZZ');
  });

  it('is not stale when the server agrees', async () => {
    const fresh = await checkFreshness(answer({ build: __BUILD_ID__ }), '/');
    expect(fresh.stale).toBe(false);
  });

  it('says nothing rather than something wrong when it cannot ask', async () => {
    // Offline is the normal reason, and a game that will not start because it
    // could not check its own version would be the worse bug.
    const dead = vi.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect((await checkFreshness(dead, '/')).stale).toBe(false);
    expect((await checkFreshness(answer({}, false), '/')).stale).toBe(false);
    expect((await checkFreshness(answer({ build: '' }), '/')).stale).toBe(false);
  });
});

describe('reloading for it', () => {
  it('reloads once for a build, and never twice', () => {
    sessionStorage.clear();
    const reload = vi.fn();
    const stale = { running: 'OLD', serving: 'NEW', stale: true };
    expect(refreshIfStale(stale, reload)).toBe(true);
    expect(refreshIfStale(stale, reload)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('still catches a second deploy while the tab is open', () => {
    sessionStorage.clear();
    const reload = vi.fn();
    refreshIfStale({ running: 'OLD', serving: 'NEW', stale: true }, reload);
    refreshIfStale({ running: 'OLD', serving: 'NEWER', stale: true }, reload);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('does nothing at all when the shell is current', () => {
    sessionStorage.clear();
    const reload = vi.fn();
    expect(refreshIfStale({ running: 'X', serving: 'X', stale: false }, reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
