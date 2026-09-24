import { type MarkSize } from './constants';
import { ANY_GRADE, buildMenu, islandBusy } from './build';
import { islandIncome } from './economy';
import { ashoreAt, depositsOf, freeSlots } from './helpers';
import { fleetsAt, isAtSea } from './fleets';
import { isFreeCrew, knownIsland, reportOn, sightOf } from './missions';
import terms from '../data/terms.json';
import type { FacilityType, GameState, PlayableFaction, System } from './types';

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
  | 'idleCrew'
  | 'idleBuildings'
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
  { id: 'allegiance', label: 'Loyalty', hint: 'Every island, coloured by whose it is and sized by how firmly they hold it: big is firm, small is thin and leaking trade to the other side.' },
  { id: 'idleCrew', label: 'Idle crew', hint: 'Islands where one of your crew is ashore with nothing to do.' },
  /*
   * There was a **To sign on** filter here, and it pinned every island an
   * unaligned officer happened to be standing on. It is gone at Sean's word of
   * 17 September — *"the 'to sign on' shouldn't exist"* — along with the
   * manhunt it existed to serve. Signing somebody on is no longer a race to a
   * particular quay: you keep an open table at a loyal harbor of your own and
   * see who comes. There is nothing left on the chart to point at.
   */
  /*
   * One filter for all three yards, at Sean's word of 19 September:
   * *"Consolidate idle yards, training, shipyards into 'Idle Buildings'."*
   *
   * Three filters asking the same question — what of mine is standing about —
   * meant three swipes to find out, and the answer a player acts on is the
   * same either way: go to that island and give something an order. The
   * number is every idle works of yours on it, whatever kind, and the
   * Buildings tab it opens on says which.
   */
  { id: 'idleBuildings', label: 'Idle buildings', hint: `Islands where you could set something going and have not: a ${terms.facilities.training_facility.toLowerCase()} or a ${terms.facilities.shipyard.toLowerCase()} with no order on it, or open ground with nothing being raised on it.` },
  { id: 'fleets', label: 'Fleets', hint: 'Islands with hulls lying off them, and where yours are sailing — theirs only as far as you know.' },
  { id: 'garrisons', label: 'Garrisons', hint: `How many ${terms.troops.toLowerCase()} are ashore on each island of yours.` },
  { id: 'missions', label: terms.errands, hint: `Islands your ${terms.crew.toLowerCase()} are working on, or sailing for.` },
  { id: 'worth', label: terms.income, hint: `What each island earns its holder in ${terms.gold.toLowerCase()} a day, right now.` },
  /*
   * There was an **Available land** filter here, moved to last on 19
   * September because it was the only one answering a planning question
   * rather than a this-morning one. Sean cut it on 22 September.
   *
   * Being last is what finished it: a filter you swipe past every time to
   * reach the ones you use is a filter whose answer you did not want. And the
   * answer was already on the island — the Buildings tab shows free berths on
   * the island you are looking at, which is where you are standing when the
   * question *where can I put this* actually comes up. The chart-wide version
   * was a second way to ask it, one swipe further away than the first.
   */
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
  return system.slots;
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
 * drawn as the mark itself — the numeral on the island — instead of a mark
 * with a number beside it, which said the same thing twice.
 *
 * Every idle layer is one of these, at Sean's word: an island with three
 * yards standing about and an island with one are not the same island, and
 * where the answer is "go and give something an order" the useful part is how
 * many orders there are to give.
 *
 * Garrisons and Available land are not, because their question is how hard or
 * how roomy rather than how many, and three dot sizes answer that at a glance
 * where a numeral has to be read one island at a time.
 */
export function showsNumber(layer: ChartLayer): boolean {
  return (
    layer === 'worth' ||
    layer === 'idleCrew' ||
    layer === 'idleBuildings' ||
    // Garrisons and Available land show their number now as well as their
    // size, at Sean's word of 19 September: *"Display # on garrison filter."*
    // Size still answers *how hard is this held* from across the chart; the
    // numeral answers *how hard exactly* without opening the island. They do
    // not compete, because one is read at a distance and the other close up.
    layer === 'garrisons'
  );
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
  return layer === 'idleBuildings' || layer === 'idleCrew' || layer === 'fleets';
}

/** What a lit island is worth saying about itself, under this layer. */
export interface LayerMark {
  /** Whether the island answers the layer's question at all. */
  lit: boolean;
  /** A count worth showing on the island, when there is one. */
  count?: number;
  /**
   * How big to draw it, when the layer answers in degrees rather than yes or
   * no. Absent means the usual: large if it answers, small if it does not.
   */
  size?: MarkSize;
}

const DARK: LayerMark = { lit: false };

/**
 * Hands of yours standing idle at this kind of work, on this island.
 *
 * Not a count of empty buildings. One job of a kind at a time per island, so
 * the moment any works of that kind takes an order they are all on it and the
 * island is busy — and the number, when it is free, is how many of them would
 * fall on a new order, which is how much faster it would go here. Three is an
 * island where a job takes a third the days.
 *
 * Yours, finished, on an island you hold that is not in revolt, and with
 * something it could be building: a yard with nothing left to build is not
 * idle, it is done.
 */
export function idleFacilities(
  system: System,
  faction: PlayableFaction,
  type: FacilityType,
): number {
  if (system.control !== faction || system.uprising) return 0;
  const ofKind = system.facilities.filter(
    (f) => f.owner === faction && f.type === type && buildMenu(f, ANY_GRADE).length > 0,
  );
  if (ofKind.some((f) => f.building)) return 0;
  return ofKind.filter((f) => !f.founding).length;
}

/**
 * Ground of yours with nothing going up on it.
 *
 * Sean, 24 September, with Highwater open — a shipyard laying down an
 * Interceptor, two fortresses, four mills and **six open plots**: *"Also
 * include in idle buildings anywhere that can have something constructed on
 * it. See how this is idle bc it has available land and nothing being built."*
 *
 * He is right, and the filter was answering a narrower question than its own
 * name. An idle slipway is a works you are not using; six empty berths are an
 * *island* you are not using, and it costs you the same thing — a fortnight
 * where something could have been going up and was not. The filter is the
 * morning nag, so it should point at both.
 *
 * Three conditions, and the third is the one that keeps it honest:
 *
 * 1. Yours, and not in revolt — you cannot raise anything on an island that is
 *    busy throwing you off it.
 * 2. Somewhere to put a building: an open berth, **or an unworked deposit**,
 *    which is a berth that will only ever take one thing and is earning
 *    nothing until it does.
 * 3. **The works lane is free.** One island raises one building at a time, so
 *    an island already putting something up cannot be told to start another —
 *    and a filter that lights an island you can give no order to is a filter
 *    that sends you somewhere for nothing. It is the same guard
 *    `idleFacilities` puts on a yard that is already working.
 *
 * Note it is the *works* lane and nothing else: Highwater's shipyard was busy
 * with a hull, which takes no ground and leaves every one of those six plots
 * as open as it was.
 */
export function roomToRaise(system: System, faction: PlayableFaction): boolean {
  if (system.control !== faction || system.uprising) return false;
  if (islandBusy(system, faction, 'works')) return false;
  return freeSlots(system) > 0 || depositsOf(system).length > 0;
}

/** Hulls of your own at sea with this island as their landfall. */
function boundFor(state: GameState, system: System, faction: PlayableFaction): number {
  return state.fleets
    .filter((f) => f.faction === faction && isAtSea(f) && f.voyage?.targetSystemId === system.id)
    .reduce((n, f) => n + f.ships.length, 0);
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

  /*
   * Where your own people are going is your own knowledge.
   *
   * Found by playing on 20 September: send somebody on Explore — the one
   * errand that only ever goes to an island nobody of yours has charted — and
   * the Errands filter, whose whole job is *islands your crew are working on,
   * or sailing for*, showed a nought and lit nothing. The charted gate below
   * is right for every other layer, because what stands on a stranger's
   * island is not yours to know until somebody looks. It is exactly wrong for
   * this one: you gave the order, so the destination is not news.
   */
  if (layer === 'missions') {
    const n = state.characters.filter(
      (c) => c.faction === faction && c.mission?.targetSystemId === system.id,
    ).length;
    return n > 0 ? { lit: true, count: n } : DARK;
  }

  // You cannot be told about an island you have never charted.
  if (!system.explored[faction]) {
    // Except by a squadron of yours that is on its way to it, for the reason
    // above: an island nobody has charted is exactly where a squadron gets
    // sent, and the filter going blank the moment the fleet weighs anchor is
    // the same bug as the errand one.
    if (layer === 'fleets') {
      const bound = boundFor(state, system, faction);
      return bound > 0 ? { lit: true, count: bound } : DARK;
    }
    return DARK;
  }

  switch (layer) {
    case 'idleBuildings': {
      // Summed across the two kinds rather than asked twice. Each kind still
      // answers on its own terms — one order at a time per kind per island —
      // so an idle drill ground and an idle slipway is two works with nothing
      // to do, which is the number worth showing. It was three kinds until
      // the construction yard was cut; buildings need no works to raise them
      // now, so a yard can no longer be idle at you.
      const n =
        idleFacilities(system, faction, 'training_facility') +
        idleFacilities(system, faction, 'shipyard') +
        // And the ground itself, as one more order you could give here. See
        // `roomToRaise`: the count is *things you could set going on this
        // island this morning*, which is one unit and not two, so an island
        // with an idle slipway and open plots reads 2 and means it.
        (roomToRaise(system, faction) ? 1 : 0);
      return n > 0 ? { lit: true, count: n } : DARK;
    }
    case 'idleCrew': {
      // Standing on it, not filed under it: a crew member aboard a squadron
      // that has sailed is still filed under the port they left, and an idle
      // hand three days out is not an idle hand you can give work to.
      // `isFreeCrew` rather than the two fields by hand: holding an island is
      // not a mission and does not change a status, so a commander answered
      // yes to both and lit this filter from the chair. See `commandingAt`.
      const n = ashoreAt(state, system.id, faction).filter((c) => isFreeCrew(state, c)).length;
      return n > 0 ? { lit: true, count: n } : DARK;
    }
    case 'fleets': {
      /*
       * Yours always; theirs only as far as you can actually know it.
       *
       * Sean, 20 September, with a screenshot: *"When I look at map it says
       * imperium fleet in the wreckers reach but when I click on the island it
       * says no reports."* Both were telling the truth about their own source,
       * which is the tell — this layer counted every hull lying off every
       * island, live, for both sides, while the island sheet had been going
       * dark on unreported enemy ground since the watch went in. The chart was
       * handing back for free the exact thing espionage exists to buy, and it
       * is the second time that has happened in the same way: `knownIsland`
       * was written for the Reach list when it counted companies off the live
       * world, and carries the note that it is *"the one call anything outside
       * the island sheet should be making"*. The chart was never wired to it.
       *
       * Your own hulls are never hidden — they are yours, and a squadron of
       * yours lying at an enemy island is also what makes that island `eyes`.
       */
      const here = fleetsAt(state, system.id).filter((f) => !isAtSea(f));
      const mine =
        here
          .filter((f) => f.faction === faction)
          .reduce((n, f) => n + f.ships.length, 0) +
        // And yours on passage here. Found by playing on 20 September: order
        // the Home Fleet to sea on day one and this filter — the only way to
        // ask where your navy is — read nought, because a squadron at sea
        // lies off nothing. Where your own hulls are going is yours to know,
        // the same as an errand; theirs at sea stays invisible, which is what
        // the watch is for.
        boundFor(state, system, faction);
      const sight = sightOf(state, system, faction);
      let theirs = 0;
      if (sight === 'eyes') {
        theirs = here
          .filter((f) => f.faction !== faction)
          .reduce((n, f) => n + f.ships.length, 0);
      } else if (sight === 'report') {
        // What lay in the harbor the day the report was written, not what
        // lies there now, and not what was still at sea for it.
        theirs = (reportOn(state, system, faction)?.harbor ?? [])
          .filter((h) => h.faction !== faction && h.inbound === undefined)
          .reduce((n, h) => n + h.ships, 0);
      }
      const hulls = mine + theirs;
      return hulls > 0 ? { lit: true, count: hulls } : DARK;
    }
    case 'garrisons': {
      /*
       * The number, at one size, like Production.
       *
       * Sean, 19 September: *"Change garrison filter to be more like
       * production. Just tell me the number all in same size font. No dots."*
       * It carried a size band as well — under three small, three to five
       * medium, six and up large — which was his own ladder of 14 September
       * and made sense while the mark was only a dot. Since the numeral
       * arrived the band was saying, in a second channel and less precisely,
       * the thing the numeral already said exactly: a big 4 and a small 2 are
       * a 4 and a 2. `garrisonBand` is kept because the island panels still
       * grade a garrison in words; only the chart has stopped.
       */
      if (system.control !== faction || system.garrison < 1) return DARK;
      return { lit: true, count: system.garrison };
    }
    case 'worth': {
      // Production: what the island earns its holder today, as the number on
      // the chart. It was capacity for a while — what the island could hold —
      // graded into three shapes; capacity is still what the panels' worth
      // mark shows, but the chart is better used telling you what the war is
      // actually paying out, island by island, this morning.
      //
      // And only as far as you know it, the same as Fleets above. This one was
      // not reported but it is the same leak: an island earns what its works
      // earn, works are the first thing the island sheet stops showing on
      // unreported enemy ground, and a number on the chart saying what they
      // add up to gives the answer away without the errand. Whose flag flies
      // is public, so the gate is the live control; what stands on it is not,
      // so the sum is taken off the island as you know it.
      if (system.control !== 'empire' && system.control !== 'alliance') return DARK;
      const known = knownIsland(state, system, faction);
      if (!known) return DARK;
      const gold = Math.round(islandIncome(known, system.control));
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
