import type { GameState } from './types';

/**
 * Proving two machines are playing the same war.
 *
 * Two-player PvP here is **lockstep**: each client holds the whole state, both
 * run `advanceDay` themselves, and the only thing that crosses the wire is the
 * orders. That choice was arithmetic rather than taste — measured in
 * `lab/wire.ts`, the state is 56 KB on the opening day and 129 KB by day 600,
 * where an order is 106 bytes and a busy day of them about 640. A day is one
 * second at Fast, so broadcasting state means a megabit a second to a phone,
 * growing as the war goes on; exchanging orders is two hundred times smaller
 * and flat.
 *
 * The bill for that trade is **agreement**. Nobody is authoritative, so if the
 * two states ever drift apart the players are in different wars and no screen
 * says so: his fleet sinks and hers does not. Drift is the one failure mode
 * lockstep has, and it is silent by nature, so the architecture needs a cheap
 * way to ask *are we still the same?* every single day.
 *
 * That is this file. A hash of the state, small enough to send beside the
 * day's orders, and exact enough that one wrong number anywhere in sixty
 * kilobytes changes it.
 *
 * The precondition is that the simulation is deterministic, which it already
 * is and not by accident: `advanceDay` is one pure function of state, every
 * roll comes from the seeded `rngSeed`, and the only `Date.now()` in `src/sim`
 * is the default seed of a brand-new game — the one place a surprise belongs.
 * `src/sim/__tests__/determinism.test.ts` holds it that way, and
 * `lab/desync.ts` walks a whole war in two separate processes to check the
 * answer does not depend on the process.
 */

/**
 * The state as one string, written the same way on both machines.
 *
 * `JSON.stringify` is nearly enough and not quite. It writes an object's keys
 * in insertion order, so two states that *are* equal can serialise differently
 * — a `System` rebuilt by a capture with its keys touched in another order
 * reads as a different island. Both clients run the same code and would
 * usually agree anyway, which is the problem: a hash that is usually right is
 * worse than no hash, because the day it is wrong it accuses two honest
 * clients of desyncing.
 *
 * So keys are sorted and the walk is explicit. Three details earn their lines:
 *
 * - **`undefined` is skipped**, exactly as `JSON.stringify` skips it, so a
 *   state with `battle: undefined` hashes the same as one that never had the
 *   key. The sim `delete`s optional fields in some places and assigns
 *   `undefined` in others, and those must not look like different wars.
 * - **Arrays keep their order**, because in this sim order is meaning: the
 *   event log is a sequence and `ships[0]` is the ship that gets fired at
 *   first.
 * - **A non-finite number throws** rather than quietly becoming `null` the way
 *   `JSON.stringify` would. `NaN` in a state is a bug that has already
 *   happened; silently hashing it to the same thing as `null` would hide the
 *   one failure this file exists to find.
 */
export function canonical(value: unknown): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      if (!Number.isFinite(value)) {
        throw new Error(`cannot hash a state holding ${value}`);
      }
      // Number::toString is exactly specified, so this is the same text on
      // every engine. `-0` writes as `0`, which is what JSON does too.
      return String(value);
    case 'string':
      return JSON.stringify(value);
    case 'object':
      break;
    default:
      // A function or a symbol in game state is not a thing that should
      // happen, and would not survive a save either.
      throw new Error(`cannot hash a ${typeof value} in game state`);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => (item === undefined ? 'null' : canonical(item))).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of Object.keys(record).sort()) {
    const inner = record[key];
    if (inner === undefined) continue;
    parts.push(`${JSON.stringify(key)}:${canonical(inner)}`);
  }
  return `{${parts.join(',')}}`;
}

/**
 * A short fingerprint of a whole war, for sending beside the day's orders.
 *
 * FNV-1a, 32 bits, which is not a cryptographic hash and is not trying to be:
 * nothing here is defending against a player who forges a fingerprint, because
 * a player who wants to cheat at lockstep has the whole state in their own
 * browser already and has much better options. What it has to do is notice
 * **accident** — one number different in sixty kilobytes — and for that a
 * 32-bit avalanche is plenty. Two desynced wars colliding is about one in four
 * billion per day.
 *
 * Deliberately cheap. It runs once a day on both clients, on a string of tens
 * of kilobytes, on a phone, beside everything else a day does.
 */
export function stateHash(state: GameState): string {
  return fingerprint(canonical(shared(state)));
}

/**
 * The war, with the parts that are nobody else's business taken out.
 *
 * Two things come out, for two different reasons.
 *
 * **`player` is the seat**, and the two clients are *supposed* to disagree
 * about it — his says `empire`, hers says `alliance`. It is the one field
 * whose disagreement is the system working.
 *
 * **An event's `text` and `kind` are written from a point of view**, and some
 * of them have already taken a side. `support.ts` colours a smuggling notice
 * `loss` or `order` depending on whose customs books stopped balancing, and
 * phrases a leak as *your* intel or *theirs*, which was Sean's own playtest
 * complaint on 22 September: *"is phrased as if it were my intel."* Those
 * sentences are correct for one reader and backwards for the other, so today
 * they genuinely differ between the two clients — not because the war
 * diverged, but because the feed is drawn from where you stand.
 *
 * That is a real gap and it is the next piece of work: an event wants to carry
 * *what happened* and be worded when it is read, the way `canSee` already
 * decides visibility when it is read. Until it does, hashing the wording would
 * report a desync every time either side's books went wrong — a false alarm on
 * the one signal that has to be trusted — so the fingerprint covers what the
 * simulation did and not how it was phrased. Every event still has to **exist**,
 * in the same order, with the same id, day, island and crew member: that is
 * what would actually catch a day coming out differently.
 */
function shared(state: GameState): Record<string, unknown> {
  const { player: _seat, events, ...rest } = state;
  return {
    ...rest,
    events: events.map(({ text: _text, kind: _kind, ...bones }) => bones),
  };
}

/** FNV-1a over a string's UTF-16 code units, as eight hex digits. */
export function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    // The FNV prime, by shifts, because `hash * 16777619` loses precision
    // once the product passes 2^53 and would make the hash engine-dependent
    // in exactly the way this file exists to avoid.
    hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
