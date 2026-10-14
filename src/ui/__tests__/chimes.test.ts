import { describe, expect, it } from 'vitest';
import type { EventKind } from '../../sim';

/**
 * Seven kinds of news, seven sounds you can tell apart.
 *
 * Sean, 23 September: *"I don't hear unique chimes depending on type of log
 * note."* The old `play` gave five of the seven a plain sine ping at 587, 659,
 * 784 or the bed's root, which on a phone speaker over a drone is one sound
 * played five times. Pitch alone does not distinguish anything.
 *
 * There is no Web Audio in this test runner, so this reads the switch rather
 * than listening to it — but what went wrong was structural and is visible in
 * the source: every kind must strike a *different* instrument, and no two may
 * be built from the same call.
 */
const SRC = (
  import.meta.glob('../../audio/engine.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../../audio/engine.ts'];
const KINDS: EventKind[] = ['war', 'flip', 'mutiny', 'battle', 'mission', 'order', 'loss'];

/** The body of each `case` in `play`, with its comments stripped out. */
function arms(): Map<string, string> {
  const play = SRC.slice(SRC.indexOf('play(kind: EventKind)'));
  const body = play.slice(play.indexOf('switch (kind)'), play.indexOf('private ping'));
  const out = new Map<string, string>();
  for (const kind of KINDS) {
    const at = body.indexOf(`case '${kind}':`);
    expect(at, `no arm for ${kind}`).toBeGreaterThan(-1);
    const rest = body.slice(at + `case '${kind}':`.length);
    const end = rest.indexOf('break;');
    out.set(kind, rest.slice(0, end).replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ''));
  }
  return out;
}

describe('the seven notification sounds', () => {
  const ARMS = arms();

  it('gives every kind of news a sound of its own', () => {
    for (const kind of KINDS) expect(ARMS.get(kind)!.trim().length, kind).toBeGreaterThan(10);
  });

  it('builds no two of them the same way', () => {
    // The shape of a sound is the sequence of voices it uses, ignoring the
    // numbers: two kinds differing only in a frequency argument is exactly
    // the bug Sean heard.
    const shape = (arm: string) => [...arm.matchAll(/this\.(\w+)\(/g)].map((m) => m[1]).join('+');
    const seen = new Map<string, string>();
    for (const kind of KINDS) {
      const s = shape(ARMS.get(kind)!);
      expect(s.length, kind).toBeGreaterThan(0);
      expect(seen.has(s), `${kind} sounds like ${seen.get(s)}: both are ${s}`).toBe(false);
      seen.set(s, kind);
    }
  });

  it('uses more than one voice across the set', () => {
    // Five different sine pings was the old state; the fix is voices, not
    // frequencies. At least five distinct generators have to be in play.
    const voices = new Set<string>();
    for (const kind of KINDS)
      for (const m of ARMS.get(kind)!.matchAll(/this\.(\w+)\(/g)) voices.add(m[1]);
    expect(voices.size).toBeGreaterThanOrEqual(5);
  });

  it('keeps every one of them tight except the war bell', () => {
    // A stinger that outlasts the next tick stacks. Only `war` — the start or
    // the end of the whole thing — is allowed to spread its notes out.
    for (const kind of KINDS) {
      if (kind === 'war') continue;
      const last = Math.max(
        0,
        ...[...ARMS.get(kind)!.matchAll(/now \+ ([\d.]+)/g)].map((m) => Number(m[1])),
      );
      expect(last, kind).toBeLessThan(0.4);
    }
  });
});
