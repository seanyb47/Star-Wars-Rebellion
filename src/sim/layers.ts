import { buildMenu } from './build';
import { fleetsAt, isAtSea } from './fleets';
import type { GameState, PlayableFaction, System } from './types';

/**
 * Chart layers — the original's view menu, made swipeable.
 *
 * Rebellion let you change what the map was *about*: pick a view and the
 * galaxy redrew to show troops, or fleets, or personnel. This is that, with
 * the two most useful views being the ones the original nagged you about in a
 * corner — idle construction yards and idle personnel — turned into something
 * spatial. A list tells you three yards are idle; a layer tells you *where*,
 * which is the question you actually had.
 *
 * The predicate lives here rather than in the chart because it is a question
 * about the game, not about drawing, and because a rule you can test is worth
 * more than one buried in a component.
 */
export type ChartLayer =
  | 'allegiance'
  | 'idleWorks'
  | 'idleCrew'
  | 'fleets'
  | 'garrisons'
  | 'missions'
  | 'worth';

export interface LayerSpec {
  id: ChartLayer;
  /** What the strip calls it. */
  label: string;
  /** One line saying what lighting up means, shown under the strip. */
  hint: string;
}

/**
 * Order matters: this is the swipe order, and it runs from the layer you look
 * at most to the one you look at least. Allegiance is first because it is the
 * chart's resting state — swiping right from anywhere gets you home.
 */
export const CHART_LAYERS: LayerSpec[] = [
  { id: 'allegiance', label: 'Allegiance', hint: 'Every island, coloured by which way its people lean.' },
  { id: 'idleWorks', label: 'Idle works', hint: 'Yards, drill grounds and slipways of yours standing with no order on them.' },
  { id: 'idleCrew', label: 'Idle crew', hint: 'Islands where one of your officers is ashore with nothing to do.' },
  { id: 'fleets', label: 'Fleets', hint: 'Islands with hulls lying off them — yours or theirs.' },
  { id: 'garrisons', label: 'Garrisons', hint: 'Islands of yours holding companies ashore.' },
  { id: 'missions', label: 'Missions', hint: 'Islands your officers are working on, or sailing for.' },
  { id: 'worth', label: 'Worth', hint: 'Every charted island drawn to the size of what it can hold. Bare rock falls away.' },
];

/**
 * What an island can hold: ground for mines and farms, plus works.
 *
 * This used to set every island's size on the resting chart, which meant the
 * chart was always answering a question nobody had asked. It is a planning
 * question — where is worth taking — so it is a layer now, and the resting
 * chart draws every island the same.
 */
export function islandWorth(system: System): number {
  return system.rawSlots + system.energySlots;
}

/** What a lit island is worth saying about itself, under this layer. */
export interface LayerMark {
  /** Whether the island answers the layer's question at all. */
  lit: boolean;
  /** A count worth showing on the island, when there is one. */
  count?: number;
}

const DARK: LayerMark = { lit: false };

/**
 * Whether a facility of yours is standing idle: yours, finished, on an island
 * you hold that is not in revolt, and with something it could be building.
 * A yard with nothing left to build is not idle, it is done.
 */
function idleFacilities(system: System, faction: PlayableFaction): number {
  if (system.control !== faction || system.uprising) return 0;
  return system.facilities.filter(
    (f) => f.owner === faction && !f.building && buildMenu(f).length > 0,
  ).length;
}

/**
 * How the chart should draw one island under one layer.
 *
 * `allegiance` lights everything, because it is the resting view and dimming
 * the whole map to say "no filter" would be absurd.
 */
export function layerMark(
  state: GameState,
  system: System,
  layer: ChartLayer,
  faction: PlayableFaction,
): LayerMark {
  if (layer === 'allegiance') return { lit: true };

  // You cannot be told about an island you have never charted.
  if (!system.explored[faction]) return DARK;

  switch (layer) {
    case 'idleWorks': {
      const n = idleFacilities(system, faction);
      return n > 0 ? { lit: true, count: n } : DARK;
    }
    case 'idleCrew': {
      const n = state.characters.filter(
        (c) =>
          c.faction === faction &&
          c.locationSystemId === system.id &&
          c.status === 'available' &&
          !c.mission,
      ).length;
      return n > 0 ? { lit: true, count: n } : DARK;
    }
    case 'fleets': {
      const hulls = fleetsAt(state, system.id)
        .filter((f) => !isAtSea(f))
        .reduce((n, f) => n + f.ships.length, 0);
      return hulls > 0 ? { lit: true, count: hulls } : DARK;
    }
    case 'garrisons': {
      if (system.control !== faction || system.garrison < 1) return DARK;
      return { lit: true, count: system.garrison };
    }
    case 'missions': {
      const n = state.characters.filter(
        (c) => c.faction === faction && c.mission?.targetSystemId === system.id,
      ).length;
      return n > 0 ? { lit: true, count: n } : DARK;
    }
    case 'worth': {
      // A magnitude rather than a yes-or-no. The chart answers this one with
      // size instead of the glow the others use — fifty glowing islands is not
      // a filter, it is a lit chart — so `lit` here only separates the islands
      // that have something on them from the bare rock.
      const n = islandWorth(system);
      return n > 0 ? { lit: true, count: n } : DARK;
    }
    default:
      return DARK;
  }
}

/**
 * How many islands answer a layer, for the strip to show beside its name.
 *
 * A zero here is information rather than an empty state: "Idle works 0" is the
 * one number in the game that means you are not wasting anything.
 */
export function layerTally(
  state: GameState,
  layer: ChartLayer,
  faction: PlayableFaction,
): number {
  if (layer === 'allegiance') return 0;
  return state.systems.filter((s) => layerMark(state, s, layer, faction).lit).length;
}
