/**
 * The link, and the code in it. Deliberately free of any connection library.
 *
 * `peer.ts` pulls in 81 KB of WebRTC plumbing, and the overwhelming majority
 * of launches never play a friend — so that module is loaded on demand and
 * this one, which every launch needs in order to notice `#join=`, is not.
 */

/** Short enough to text, long enough not to collide: 1 in 60 million. */
const CODE_LENGTH = 6;
/** No vowels, so no code is ever a word, and no 0/O or 1/I to misread aloud. */
const CODE_ALPHABET = 'BCDFGHJKLMNPQRSTVWXYZ23456789';

/** The code that goes in the link. */
export function newGameCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/**
 * The peer id a code becomes.
 *
 * Prefixed because the broker's id space is shared with every other project
 * using it, and a bare six characters would eventually collide with somebody
 * else's lobby. A collision there is not a crossed game — the build check in
 * `hello` refuses a stranger — but it is a connection that fails for no
 * visible reason, which is worse than one that fails with a sentence.
 */
export function peerIdFor(code: string): string {
  return `seven-seas-${code}`;
}

/** The link to text, for a code. Works under the Pages sub-path. */
export function linkFor(code: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#join=${code}`;
}

/**
 * The code in the address bar, if this page was opened from a link.
 *
 * **Left in the bar.** It used to be stripped on the way past, on the
 * reasoning that a reload should not try to rejoin a lobby that has long since
 * closed. That reasoning was wrong in the only situation that matters: the
 * first thing anybody does when a connection fails is reload, and stripping
 * the code meant the reload did not even try — it landed on the title screen
 * as though the link had never existed. A stale rejoin says so in a sentence;
 * a lost code looks like the link is broken.
 */
export function codeFromLink(): string | null {
  const match = /[#&]join=([A-Z0-9]+)/i.exec(window.location.hash);
  return match ? match[1].toUpperCase() : null;
}

/** Two tabs of one browser, as a door in the address bar. See `local.ts`. */
export function tabsFromLink(): 'host' | 'guest' | null {
  const match = /[#&]tabs=(host|guest)/i.exec(window.location.hash);
  return match ? (match[1].toLowerCase() as 'host' | 'guest') : null;
}
