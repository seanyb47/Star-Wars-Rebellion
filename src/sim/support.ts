import {
  FLIP_SUPPORT_MIN,
  HELD_SUPPORT_LEVEL,
  LEAK_CHANCE,
  SMUGGLED_SHARE,
  SUPPORT_DRIFT,
  UPRISING_END_SUPPORT,
  UPRISING_SUPPORT,
  loyaltyBand,
  type LoyaltyBand,
} from './constants';
import { isPlayable, otherFaction, pushEvent, requiredGarrison, setSupport } from './helpers';
import type { Rng } from './rng';
import factionData from '../data/factions.json';
import type { GameState, PlayableFaction, System } from './types';

function factionName(faction: PlayableFaction): string {
  return factionData[faction].name;
}

/**
 * Opinion goes cold.
 *
 * Nothing in the game used to take support away, so every point won was banked
 * for good: a single parley moved a whole chain and kept it moved, and the war
 * was decided by whoever talked first. Islands have their own lives — a hold
 * you do not keep up fades, and an island settles into a steady regard for
 * whoever actually governs it.
 *
 * It is slow. A month of neglect costs a point or two, not a province. But it
 * means a flip has to be worked for and then held, which is the difference
 * between courting islands and collecting them.
 */
export function driftSupport(state: GameState): void {
  for (const system of state.systems) {
    if (!system.populated) continue;
    // One balance, not two opinions: drift moves where the island sits
    // between the two sides. Governing is its own argument, so a holder's
    // standing settles a little above sixty rather than bleeding away; an
    // island nobody holds settles level, with the argument still open.
    const holder = isPlayable(system.control) ? system.control : 'empire';
    const toward = isPlayable(system.control) ? HELD_SUPPORT_LEVEL : 50;
    const gap = toward - system.support[holder];
    setSupport(
      system,
      holder,
      Math.abs(gap) <= SUPPORT_DRIFT ? toward : system.support[holder] + Math.sign(gap) * SUPPORT_DRIFT,
    );
  }
}

/**
 * Does this faction meet the bar to win an unaligned island over (spec 4.3)?
 *
 * One number, because allegiance is a balance: a lead over the other side is
 * arithmetic on the same figure, not a second test.
 */
export function canFlip(system: System, faction: PlayableFaction): boolean {
  if (system.control !== 'neutral') return false;
  return system.support[faction] >= FLIP_SUPPORT_MIN;
}

/**
 * Re-derive control and unrest for every system. Run once per tick, and again
 * after anything that moves support.
 */
export function resolveControlAndUnrest(state: GameState): void {
  for (const system of state.systems) {
    // Uninhabited islands are held only by boots on the ground (spec 4.3).
    if (!system.populated) {
      if (isPlayable(system.control) && system.garrison < 1) {
        pushEvent(state, {
          kind: 'loss',
      text: `${system.name} has been abandoned; the last company has sailed.`,
          systemId: system.id,
        });
        system.control = 'none';
      }
      system.uprising = false;
      continue;
    }

    for (const faction of ['empire', 'alliance'] as const) {
      if (canFlip(system, faction)) {
        system.control = faction;
        // The companies that held it for somebody else go home; one stays
        // under the new colours. An island won over is a prize, not a
        // garrison bill — and a treasury that inherits forty militia it
        // never asked for runs dry with nothing to show for it.
        system.garrison = Math.min(system.garrison, 1);
        pushEvent(state, {
          kind: 'flip',
      text: `${system.name} has run up the colours of the ${factionName(faction)}.`,
          systemId: system.id,
        });
        break;
      }
    }

    if (!isPlayable(system.control)) {
      system.uprising = false;
      continue;
    }

    const support = system.support[system.control];
    if (system.uprising) {
      // Won back, or faced down: six companies ashore end a revolt whatever
      // the island still thinks of you.
      const enough = system.garrison >= requiredGarrison(support, true);
      if (support >= UPRISING_END_SUPPORT || enough) {
        system.uprising = false;
        pushEvent(state, {
          kind: 'order',
          text: enough && support < UPRISING_END_SUPPORT
            ? `${system.name} is quiet again: ${system.garrison} companies in the square, and nobody arguing with them.`
            : `The mutiny on ${system.name} has been put down.`,
          systemId: system.id,
        });
      }
    } else if (support < UPRISING_SUPPORT && system.garrison < requiredGarrison(support)) {
      system.uprising = true;
      pushEvent(state, {
        kind: 'mutiny',
      text: `${system.name} has risen in mutiny. Nothing is being loaded or landed.`,
        systemId: system.id,
      });
    }
  }
}

/** Settled islands held by each side, and the totals victory is measured against. */
export function controlTally(state: GameState) {
  const populated = state.systems.filter((s) => s.populated);
  return {
    populated: populated.length,
    empire: populated.filter((s) => s.control === 'empire').length,
    alliance: populated.filter((s) => s.control === 'alliance').length,
  };
}


/**
 * Loyalty's two consequences, and the plumbing that tells the player about
 * them. Allegiance decides what share of an island's trade the smugglers run
 * to the other side (see `SMUGGLED_SHARE`), and whether word of the island
 * gets out at all.
 */

/** How good a band is, for comparing one day against the last. */
const BAND_RANK: Record<LoyaltyBand, number> = { uprising: 0, thin: 1, steady: 2, firm: 3 };

/** Every held island's band, for the caller to hand back after the day's work. */
export function loyaltyBands(state: GameState): Map<string, LoyaltyBand | null> {
  return new Map(
    state.systems.map((s) => [
      s.id,
      isPlayable(s.control) ? loyaltyBand(s.support[s.control], s.uprising) : null,
    ]),
  );
}

/**
 * Say so when an island slips a band.
 *
 * Smuggling takes its cut every day on most islands, so it cannot announce
 * itself daily — the feed would carry nothing else. What is worth a dispatch
 * is the day the rate changes, because that is the day the player could have
 * done something about it. A revolt announces itself elsewhere.
 */
export function reportLoyaltySlips(state: GameState, before: Map<string, LoyaltyBand | null>): void {
  for (const system of state.systems) {
    const holder = system.control;
    if (!isPlayable(holder)) continue;
    const was = before.get(system.id);
    if (!was) continue;
    const now = loyaltyBand(system.support[holder], system.uprising);
    if (now === 'uprising' || BAND_RANK[now] >= BAND_RANK[was]) continue;
    const share = Math.round(SMUGGLED_SHARE[now] * 100);
    pushEvent(state, {
      kind: 'loss',
      text: `The customs books on ${system.name} stop balancing. ${share}% of everything it ships now leaves in somebody else's hold, bound for the ${factionName(otherFaction(holder))}.`,
      systemId: system.id,
    });
  }
}

/**
 * Word gets out.
 *
 * An island that does not love you talks to the people who come ashore, and
 * one of them is always taking notes. Each day a thin or rebellious island of
 * yours the enemy has never charted may simply turn up on their charts. A firm
 * island never does, which is the quiet half of keeping a Reach happy — and
 * the whole of it for the Confederacy, whose islands are only safe while the
 * Crown cannot find them.
 */
export function leakInformation(state: GameState, rng: Rng): void {
  for (const system of state.systems) {
    const holder = system.control;
    if (!isPlayable(holder)) continue;
    const enemy = otherFaction(holder);
    if (system.explored[enemy]) continue;
    const chance = LEAK_CHANCE[loyaltyBand(system.support[holder], system.uprising)];
    if (chance <= 0 || !rng.chance(chance)) continue;
    system.explored[enemy] = true;
    pushEvent(state, {
      kind: 'loss',
      text: `Somebody on ${system.name} has talked. The ${factionName(enemy)} has it on their charts now.`,
      systemId: system.id,
    });
  }
}
