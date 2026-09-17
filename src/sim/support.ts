import {
  FLIP_SUPPORT_MIN,
  HELD_SUPPORT_LEVEL,
  LEAK_CHANCE,
  SMUGGLED_SHARE,
  SUPPORT_DRIFT,
  UPRISING_END_SUPPORT,
  loyaltyBand,
  type LoyaltyBand,
} from './constants';
import { mutinyChance } from './politics';
import {
  handOver,
  isPlayable,
  otherFaction,
  pushEvent,
  requiredGarrison,
  setSupport,
} from './helpers';
import type { Rng } from './rng';
import factionData from '../data/factions.json';
import type { GameState, PlayableFaction } from './types';

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
 * Re-derive control and unrest for every system. Run once per tick, and again
 * after anything that moves support.
 */
export function resolveControlAndUnrest(state: GameState, rng?: Rng): void {
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

    // Nobody standing on it, and the people have decided.
    //
    // Sean's rule, 15 September: a garrison establishes control whatever the
    // island thinks of you, and loyalty decides it only when there is no
    // garrison. An island held by a faction never flipped on opinion alone,
    // which is right while somebody is holding it — and wrong when nobody is.
    // A harbor you have left empty is not yours because a map says so.
    if (
      isPlayable(system.control) &&
      system.garrison < 1 &&
      system.support[otherFaction(system.control)] >= FLIP_SUPPORT_MIN
    ) {
      const taker = otherFaction(system.control);
      system.control = taker;
      handOver(system, taker);
      system.uprising = false;
      pushEvent(state, {
        kind: 'flip',
        text: `${system.name} has declared for the ${factionName(taker)}. There was nobody ashore to argue.`,
        systemId: system.id,
      });
    }

    /*
     * An unaligned island no longer joins anybody by arithmetic.
     *
     * There used to be a loop here that ran the colours up the moment either
     * side's standing touched eighty — no meeting, no decision, just a number
     * crossing a line overnight. Sean's brief, 17 September: *"remove the rule
     * 'an unaligned island automatically joins a faction when allegiance
     * reaches 80'... this should feel like a political decision by the island
     * rather than filling an XP bar."*
     *
     * Joining happens in `parleyOutcome` now, and only there: after a meeting
     * that went well, at a chance that climbs with the island's warmth and
     * never reaches certainty. What is left in this function is the physical
     * rule above — a harbor with no company in it is not held by anybody,
     * whatever the map says — which is about control and not about politics.
     */

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
    } else if (rng && rng.chance(mutinyChance(state, system))) {
      /*
       * No line any more.
       *
       * It used to be one: under thirty, short of companies, and no officer
       * posted — all three true, and the island rose that morning; any one of
       * them false and it never would, however wretched. Sean's brief: *"do not
       * make allegiance under thirty an automatic Mutiny trigger. Treat thirty
       * as a major warning threshold... actual Mutiny should be determined by
       * the combination of allegiance, garrison, officer presence, and Incite
       * pressure."*
       *
       * So `mutinyChance` weighs how far under easy the island sits and what
       * agitators have lately been doing there against its companies and
       * whoever holds the chair, and returns a small chance each day. A sullen
       * island with the square full may never rise. The same island stripped to
       * hold somewhere else will, inside a month, and nobody can say which
       * morning — which is the whole of what was wanted.
       */
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
    const chance = LEAK_CHANCE[loyaltyBand(system.support[holder], system.uprising)];
    if (chance <= 0) continue;
    // A harbor that talks talks about its neighbours too, so an island the
    // enemy already has on their charts is still worth watching: what it
    // gives away next is the rest of the chain. Hiding a Reach means keeping
    // all of it content, not most of it.
    const alongside = state.systems.filter(
      (s) =>
        s.sectorId === system.sectorId &&
        s.id !== system.id &&
        s.control === holder &&
        !s.explored[enemy],
    );
    if (system.explored[enemy] && alongside.length === 0) continue;
    if (!rng.chance(chance)) continue;
    const itself = !system.explored[enemy];
    system.explored[enemy] = true;
    for (const s of alongside) s.explored[enemy] = true;
    const works = system.facilities.length;
    const more =
      alongside.length > 0
        ? `${alongside.length} more of yours in the same chain`
        : '';
    pushEvent(state, {
      kind: 'loss',
      text: itself
        ? `Somebody on ${system.name} has talked. The ${factionName(enemy)} has its ${works} ` +
          `${works === 1 ? 'building' : 'buildings'} and ${system.garrison} ashore on their charts now` +
          (more ? `, and ${more} with it.` : '.')
        : `Somebody on ${system.name} has talked, and it was not about ${system.name}. The ` +
          `${factionName(enemy)} has ${more} on their charts now.`,
      systemId: system.id,
    });
  }
}
