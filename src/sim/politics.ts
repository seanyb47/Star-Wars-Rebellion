/**
 * What an island thinks, and how anybody changes its mind.
 *
 * Sean's brief, 17 September, and the sentence at the heart of it: the system
 * should feel like *"my character is attempting to influence a population"*
 * and not like *"my character is filling an allegiance progress bar."*
 *
 * What it replaced. Allegiance was a bar with a line on it: a parley added
 * `8 + Diplomacy/10` every fortnight, without fail, and an unaligned island
 * joined you the day the bar touched eighty. Both halves were certain, so the
 * only question a player ever had was how many fortnights — arithmetic, done
 * once, in advance. Nothing here is certain now. A cycle either lands or it
 * does not, what it wins varies, and an island decides to join rather than
 * arriving at a number.
 *
 * The four things that decide everything below:
 *
 *   PULL      what the boat's people are worth at this kind of persuasion,
 *             their best hand first and the rest worth less (`partyPull`).
 *   RESIST    what the island already thinks, against you.
 *   SECURITY  companies and an officer — which do not make anybody love a
 *             government, only make it harder to work against one.
 *   MOMENTUM  what has been happening here lately, which fades.
 *
 * Allegiance itself is still one balance kept in two fields: the two sides
 * always sum to a hundred, so a point won is a point taken and there is no
 * second opinion to keep in step.
 */
import {
  INCITE_BASE_CHANCE,
  INCITE_CEILING,
  INCITE_FLOOR,
  INCITE_RESIST,
  INCITE_SCALE,
  JOIN_CEILING,
  JOIN_FLOOR,
  JOIN_SPAN,
  MOMENTUM_CAP,
  MOMENTUM_DECAY,
  MOMENTUM_WEIGHT,
  MUTINY_CEILING,
  MUTINY_DIVISOR,
  MUTINY_WATCH,
  PARLEY_BASE_CHANCE,
  PARLEY_CEILING,
  PARLEY_FLOOR,
  PARLEY_SCALE,
  PARLEY_SWING_MAX,
  PARLEY_SWING_MIN,
  PARTY_FALLOFF,
  ROLE_BONUS,
  SECURITY_FROM_OFFICER,
  SECURITY_PER_COMPANY,
} from './constants';
import { otherFaction } from './helpers';
import { garrisonRoster } from './troops';
import type { Rng } from './rng';
import type { Character, GameState, PlayableFaction, System } from './types';

/**
 * How hard this looks, in the words the player gets instead of a number.
 *
 * Sean: *"do NOT tell the player 'this Parley has a 73.2% chance of success'.
 * Instead tell them Favorable, or Difficult."* The player should be able to
 * see who is good at the job and why the target is hard, and still not know
 * what the next fortnight will do.
 */
export type Band = 'very-difficult' | 'difficult' | 'moderate' | 'favorable' | 'very-favorable';

export const BAND_LABEL: Record<Band, string> = {
  'very-difficult': 'Very difficult',
  difficult: 'Difficult',
  moderate: 'Moderate',
  favorable: 'Favorable',
  'very-favorable': 'Very favorable',
};

/** One thing helping or hurting, and how much, for the sheet's breakdown. */
export interface Factor {
  label: string;
  /** -3 to +3. The sheet draws it as minuses and pluses, never as a figure. */
  weight: number;
}

export interface Standing {
  /** Kept out of the interface on purpose; the rules and the harness use it. */
  chance: number;
  band: Band;
  factors: Factor[];
}

function bandOf(chance: number): Band {
  if (chance < 0.2) return 'very-difficult';
  if (chance < 0.38) return 'difficult';
  if (chance < 0.58) return 'moderate';
  if (chance < 0.76) return 'favorable';
  return 'very-favorable';
}

/** A weight for the sheet: how far from even this term pushes, in fifths. */
function mark(n: number, per: number): number {
  return Math.max(-3, Math.min(3, Math.round(n / per)));
}

/**
 * What a boat's people are worth at one kind of persuasion.
 *
 * Sean's rule: *"allow multiple characters to participate... however, apply
 * diminishing returns. Do not allow unlimited stacking to create automatic
 * success."* The best hand counts whole, the second three quarters, and so on
 * down. That is the opportunity cost he wanted to create — one excellent
 * diplomat working four islands, or four of them on the one island that
 * decides the war — and it means a second-rate passenger is never wasted the
 * way `bestOf` made them, but never free either.
 *
 * Deliberately not the same rule as a covert errand, which still takes the
 * best hand alone: creeping into a powder store is a job one person does and
 * a room full of strangers makes worse. Talking to a harbor is not.
 */
export function partyPull(
  party: Character[],
  rating: 'diplomacy' | 'leadership',
  role?: string,
): number {
  const sorted = [...party].sort((a, b) => b[rating] - a[rating]);
  let pull = 0;
  for (const [i, person] of sorted.entries()) {
    const falloff = PARTY_FALLOFF[Math.min(i, PARTY_FALLOFF.length - 1)];
    pull += person[rating] * falloff;
    // A specialist is worth more at the thing they are a specialist in, and
    // only the one actually doing it — which is the best hand aboard, whoever
    // the order was written for. A Negotiator along for the ride is a good
    // talker, not a second embassy.
    if (i === 0 && role && person.roles?.includes(role)) pull += ROLE_BONUS;
  }
  return pull;
}

/**
 * Companies ashore and whoever holds the chair, as political security.
 *
 * Sean: *"a garrison should not directly increase allegiance. Instead, it
 * should make political subversion harder. Troops do not make people love the
 * government. They make it harder for political opposition to act."* So this
 * appears nowhere in a parley — talking to an unaligned harbor is not harder
 * because somebody else keeps soldiers elsewhere — and everywhere in
 * incitement and in whether an island dares rise.
 */
export function politicalSecurity(state: GameState, system: System): number {
  const companies = garrisonRoster(system).length * SECURITY_PER_COMPANY;
  const held = system.commanderId
    ? state.characters.find((c) => c.id === system.commanderId)
    : undefined;
  const officer =
    held && held.status === 'available' ? held.leadership * SECURITY_FROM_OFFICER : 0;
  return companies + officer;
}

/**
 * What has lately been happening on this island, and who it favours.
 *
 * Positive is toward the Crown, negative toward the Brethren, and it fades to
 * nothing on its own. Sean: *"successful Parley increases it toward the acting
 * faction... momentum gradually decays... this creates the feeling that a
 * skilled diplomat can build political momentum over time, but it should not
 * become permanent."* It is the reason a second fortnight on the same island
 * is worth more than the first, and the reason walking away wastes it.
 *
 * Never shown as a figure. It is one of the terms behind "Favorable".
 */
export function momentumFor(system: System, faction: PlayableFaction): number {
  const m = system.momentum ?? 0;
  return faction === 'empire' ? m : -m;
}

export function pushMomentum(system: System, faction: PlayableFaction, n: number): void {
  const signed = faction === 'empire' ? n : -n;
  const next = (system.momentum ?? 0) + signed;
  system.momentum = Math.max(-MOMENTUM_CAP, Math.min(MOMENTUM_CAP, next));
}

/** A day's forgetting. Run once a tick, before anything reads it. */
export function decayMomentum(state: GameState): void {
  for (const system of state.systems) {
    const m = system.momentum;
    if (m === undefined || m === 0) continue;
    const next = Math.abs(m) <= MOMENTUM_DECAY ? 0 : m - Math.sign(m) * MOMENTUM_DECAY;
    if (next === 0) delete system.momentum;
    else system.momentum = next;
  }
}

/**
 * How a parley on this island looks to this boat.
 *
 * Talking round a harbor is set against what the harbor already thinks, and
 * against nothing else — no garrison, no commander. Sean's line again: troops
 * do not make people love a government, and they do not stop a stranger buying
 * a round either.
 */
export function parleyStanding(
  system: System,
  faction: PlayableFaction,
  party: Character[],
): Standing {
  const pull = partyPull(party, 'diplomacy', 'Negotiator');
  const resist = system.support[otherFaction(faction)];
  const momentum = momentumFor(system, faction) * MOMENTUM_WEIGHT;
  const chance = Math.max(
    PARLEY_FLOOR,
    Math.min(PARLEY_CEILING, PARLEY_BASE_CHANCE + (pull - resist + momentum) / PARLEY_SCALE),
  );
  return {
    chance,
    band: bandOf(chance),
    factors: [
      { label: party.length > 1 ? 'Your envoys' : 'Your envoy', weight: mark(pull - 50, 18) },
      { label: 'What the island already thinks', weight: mark(50 - resist, 15) },
      ...(momentum !== 0 ? [{ label: 'Recent standing here', weight: mark(momentum, 4) }] : []),
    ],
  };
}

/**
 * How an incitement looks, which is the mirror and deliberately the harder of
 * the two.
 *
 * Sean: *"inciting an enemy-held island should generally be more difficult
 * than diplomatically converting a neutral island"* — a lower floor to start
 * from, the holder's own standing to argue against, and the garrison and the
 * officer both in the way, because this is the errand political security is
 * for.
 */
export function inciteStanding(
  state: GameState,
  system: System,
  faction: PlayableFaction,
  party: Character[],
): Standing {
  const holder = otherFaction(faction);
  const pull = partyPull(party, 'leadership', 'Spec Ops');
  const loyalty = system.support[holder] * INCITE_RESIST;
  const security = politicalSecurity(state, system);
  const momentum = momentumFor(system, faction) * MOMENTUM_WEIGHT;
  const chance = Math.max(
    INCITE_FLOOR,
    Math.min(
      INCITE_CEILING,
      INCITE_BASE_CHANCE + (pull - loyalty - security + momentum) / INCITE_SCALE,
    ),
  );
  return {
    chance,
    band: bandOf(chance),
    factors: [
      { label: party.length > 1 ? 'Your agitators' : 'Your agitator', weight: mark(pull - 50, 18) },
      { label: 'Their hold on the people', weight: mark(40 - loyalty, 12) },
      { label: 'Companies ashore', weight: -mark(garrisonRoster(system).length * SECURITY_PER_COMPANY, 8) },
      ...(system.commanderId ? [{ label: 'Their crew in the chair', weight: -2 }] : []),
      ...(momentum !== 0 ? [{ label: 'Recent unrest here', weight: mark(momentum, 4) }] : []),
    ],
  };
}

/**
 * Whether the island decides, this time, to throw in with you.
 *
 * The replacement for the eighty-point line, and the whole point of the
 * rework. Sean: *"as allegiance becomes strongly favorable, the probability of
 * the island peacefully joining should increase... but none of these should
 * guarantee conversion. This should feel like a political decision by the
 * island rather than filling an XP bar."*
 *
 * Only ever asked after a parley cycle that landed, so joining is something
 * that happens *at* a meeting rather than overnight at a threshold, and only
 * on unaligned ground.
 */
export function joinChance(system: System, faction: PlayableFaction): number {
  if (system.control !== 'neutral') return 0;
  const standing = system.support[faction];
  return Math.max(0, Math.min(JOIN_CEILING, (standing - JOIN_FLOOR) / JOIN_SPAN));
}

/**
 * Whether an island rises today.
 *
 * Sean: *"do not make allegiance under thirty an automatic Mutiny trigger.
 * Treat thirty as a major warning threshold... actual Mutiny should be
 * determined by the combination of allegiance, garrison, officer presence, and
 * Incite pressure."*
 *
 * So there is no line. There is a pressure — how far under easy the island
 * sits, plus whatever agitators have lately been doing — set against its
 * security, and what comes out is a small chance each day. A sullen island
 * with companies in the square may never rise; the same island stripped to
 * hold somewhere else will, within a month, and nobody can say which morning.
 */
export function mutinyChance(state: GameState, system: System): number {
  if (system.control !== 'empire' && system.control !== 'alliance') return 0;
  if (!system.populated || system.uprising) return 0;
  const holder = system.control;
  const pressure =
    Math.max(0, MUTINY_WATCH - system.support[holder]) +
    Math.max(0, momentumFor(system, otherFaction(holder)));
  const risk = (pressure - politicalSecurity(state, system)) / MUTINY_DIVISOR;
  return Math.max(0, Math.min(MUTINY_CEILING, risk));
}

/**
 * What a landed cycle is worth, which is never the same twice.
 *
 * Sean listed weak, normal, strong and exceptional results; this is that as a
 * continuum rather than four buckets, read off how far the roll beat the
 * odds. A fortnight that barely came off moves the island a little, one that
 * went beautifully moves it a lot, and the same envoy on the same island does
 * both in the same war.
 */
export function swingOf(chance: number, roll: number): number {
  const quality = chance <= 0 ? 0 : Math.max(0, Math.min(1, (chance - roll) / chance));
  return PARLEY_SWING_MIN + quality * (PARLEY_SWING_MAX - PARLEY_SWING_MIN);
}

/** A cycle's result: did it land, and what did it move. */
export interface Cycle {
  landed: boolean;
  swing: number;
  /** A failure bad enough to have cost you ground rather than merely a fortnight. */
  backfired: boolean;
}

export function runCycle(standing: Standing, rng: Rng): Cycle {
  const roll = rng.next();
  if (roll < standing.chance) {
    return { landed: true, swing: swingOf(standing.chance, roll), backfired: false };
  }
  // Sean: *"do not make failure automatically catastrophic."* Most of a bad
  // fortnight is just a bad fortnight. The worst of them hand the other side
  // something to point at.
  const backfired = roll > 1 - (1 - standing.chance) * 0.25;
  return { landed: false, swing: 0, backfired };
}
