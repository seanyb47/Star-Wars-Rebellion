import { buildMenu } from './build';
import { islandIncome } from './economy';
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
  | 'none'
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
  // The painting alone. Left of Loyalty so a swipe right from home clears
  // the chart; Loyalty stays the resting state.
  { id: 'none', label: 'None', hint: 'The chart alone: no marks, just the sea and the Reaches.' },
  { id: 'allegiance', label: 'Loyalty', hint: 'Every island, coloured by whose it is. Pick a filter and it marks what it points at.' },
  { id: 'idleWorks', label: 'Idle works', hint: 'Yards, drill grounds and slipways of yours standing with no order on them.' },
  { id: 'idleCrew', label: 'Idle crew', hint: 'Islands where one of your officers is ashore with nothing to do.' },
  { id: 'fleets', label: 'Fleets', hint: 'Islands with hulls lying off them — yours or theirs.' },
  { id: 'garrisons', label: 'Garrisons', hint: 'Islands of yours holding companies ashore.' },
  { id: 'missions', label: 'Missions', hint: 'Islands your officers are working on, or sailing for.' },
  { id: 'worth', label: 'Production', hint: 'What each island earns its holder in gold a day, right now.' },
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

/**
 * Worth in three grades, because three is what you can read at a glance.
 *
 * A continuous scale was honest and useless: worth runs 0 to 14 and bunches at
 * 6-9, so most of the chart came out the same size anyway while asking you to
 * compare radii by eye. Three grades and three shapes answer the question the
 * layer is for — which islands are the prizes — without asking you to measure
 * anything.
 *
 * The boundaries are drawn where the world actually divides. Across a generated
 * world of 62 islands: 18 marginal, 34 ordinary, 9 prizes, and one bare rock.
 * Most islands being ordinary is the truth about the world, and the point is
 * that the nine stand out.
 */
export type WorthTier = 'none' | 'small' | 'medium' | 'large';

export function worthTier(system: System): WorthTier {
  const n = islandWorth(system);
  if (n >= 10) return 'large';
  if (n >= 6) return 'medium';
  if (n >= 1) return 'small';
  return 'none';
}

/**
 * Layers whose answer is a quantity rather than a yes: on these the count is
 * drawn as the mark itself — the numeral on the island — instead of a star
 * with a number beside it, which said the same thing twice.
 */
export function showsNumber(layer: ChartLayer): boolean {
  return layer === 'garrisons' || layer === 'worth' || layer === 'idleCrew';
}

/**
 * Layers whose answer you act on now — something of yours standing idle, or
 * hulls lying off an island, yours or theirs. These are the filters you
 * check often, and the mark they light has to be seen from across the
 * chart, not found: it is drawn bigger, with a pulse behind it. Fleets
 * joined the idle two because a star the size of every other filter's was
 * not enough to find a squadron by.
 */
export function isLoudLayer(layer: ChartLayer): boolean {
  return layer === 'idleWorks' || layer === 'idleCrew' || layer === 'fleets';
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
      // Production: what the island earns its holder today, as the number on
      // the chart. It was capacity for a while — what the island could hold —
      // graded into three shapes; capacity is still what the panels' worth
      // mark shows, but the chart is better used telling you what the war is
      // actually paying out, island by island, this morning.
      if (system.control !== 'empire' && system.control !== 'alliance') return DARK;
      const gold = Math.round(islandIncome(system, system.control));
      return gold > 0 ? { lit: true, count: gold } : DARK;
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
