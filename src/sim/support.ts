import {
  FLIP_SUPPORT_MARGIN,
  FLIP_SUPPORT_MIN,
  HELD_SUPPORT_LEVEL,
  SUPPORT_DRIFT,
  UPRISING_END_SUPPORT,
  UPRISING_SUPPORT,
} from './constants';
import { isPlayable, otherFaction, pushEvent, requiredGarrison } from './helpers';
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
    for (const faction of ['empire', 'alliance'] as const) {
      // Governing is its own argument, so a holder's standing settles at a
      // workable level rather than bleeding to nothing. Everyone else's fades.
      const toward = system.control === faction ? HELD_SUPPORT_LEVEL : 0;
      const gap = toward - system.support[faction];
      if (Math.abs(gap) <= SUPPORT_DRIFT) {
        system.support[faction] = toward;
        continue;
      }
      system.support[faction] += Math.sign(gap) * SUPPORT_DRIFT;
    }
  }
}

/** Does this faction meet the bar to win an unaligned island over (spec 4.3)? */
export function canFlip(system: System, faction: PlayableFaction): boolean {
  if (system.control !== 'neutral') return false;
  const mine = system.support[faction];
  const theirs = system.support[otherFaction(faction)];
  return mine >= FLIP_SUPPORT_MIN && mine - theirs >= FLIP_SUPPORT_MARGIN;
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
      if (support >= UPRISING_END_SUPPORT) {
        system.uprising = false;
        pushEvent(state, {
          kind: 'order',
      text: `The mutiny on ${system.name} has been put down.`,
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
