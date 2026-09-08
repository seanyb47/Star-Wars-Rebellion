import {
  FLIP_SUPPORT_MARGIN,
  FLIP_SUPPORT_MIN,
  UPRISING_END_SUPPORT,
  UPRISING_SUPPORT,
} from './constants';
import { isPlayable, otherFaction, pushEvent, requiredGarrison } from './helpers';
import factionData from '../data/factions.json';
import type { GameState, PlayableFaction, System } from './types';

function factionName(faction: PlayableFaction): string {
  return factionData[faction].name;
}

/** Does this faction meet the bar to win a neutral world over (spec 4.3)? */
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
    // Unpopulated worlds are held only by boots on the ground (spec 4.3).
    if (!system.populated) {
      if (isPlayable(system.control) && system.garrison < 1) {
        pushEvent(state, {
          text: `${system.name} has been abandoned; the last garrison is gone.`,
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
          text: `${system.name} has declared for the ${factionName(faction)}.`,
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
          text: `Order has been restored on ${system.name}.`,
          systemId: system.id,
        });
      }
    } else if (support < UPRISING_SUPPORT && system.garrison < requiredGarrison(support)) {
      system.uprising = true;
      pushEvent(state, {
        text: `${system.name} has risen in revolt. Production has stopped.`,
        systemId: system.id,
      });
    }
  }
}

/** Populated systems held by each side, and the totals victory is measured against. */
export function controlTally(state: GameState) {
  const populated = state.systems.filter((s) => s.populated);
  return {
    populated: populated.length,
    empire: populated.filter((s) => s.control === 'empire').length,
    alliance: populated.filter((s) => s.control === 'alliance').length,
  };
}
