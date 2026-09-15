import type { Faction, IslandArchetype, PlayableFaction, System } from './types';

/**
 * What lives out there.
 *
 * The world bible allows the fantasy out to about a fifth, and this is where
 * most of that fifth goes: everything else in the game is ledgers, garrisons
 * and sailing times, and none of it says you are on a sea.
 *
 * Where it lives is the point of it. A monster on the Crown's doorstep, named
 * on a panel you can open on day one, is scenery — you have never been there
 * and it is already a line of text. So nothing lives in charted water. The
 * three frontier Reaches start dark, and what is in them is not written down
 * anywhere until one of your hulls comes to anchor off the island and the
 * boats go ashore. Charting an island from the masthead two islands away does
 * not do it: you have to go.
 *
 * Which creature an island has is still fixed by the sort of place it is and
 * its own name, so it is the same in every game and never contradicts itself:
 * the reef has turtles, the drowned reach has worse.
 */
export interface Creature {
  /** Matches the painting's slug in src/art/creatures. */
  slug: string;
  name: string;
  /** One line for a panel: what a sailor would tell you. */
  sighting: string;
  /** What comes back in the log the day the boats first go ashore. */
  found: string;
  /** The longer entry, for the almanac. */
  lore: string;
  /** The waters it is found in. */
  waters: IslandArchetype[];
  /**
   * What it is worth in a fight, and how much killing it takes. A creature
   * with no guns is scenery and stays scenery: the turtle has never hurt
   * anybody and the cat is a cat. The rest are a neutral hostile in the
   * harbor — nobody's side, firing on every hull lying there whoever it
   * belongs to, and fired on by all of them.
   *
   * Tuned against the two cases that matter, and measured rather than hoped:
   * a hull takes a hit for about every two guns firing at it and a creature
   * for every six. A single sloop cannot mark the Kraken at all — two guns
   * round to nothing — and is eaten inside one day, every time. A squadron of
   * the size either side opens the war with kills it on the third day and
   * comes away with three or four of its five hulls. The Sea Dragon costs
   * that squadron two days and rarely a hull; the Derelict is one day and
   * nothing, which is right for her — she is eerie, not deadly, and every
   * captain who has met her wrote her off and turned for home. All three eat
   * a picket. Not a wall, not a formality, and never something to sail into
   * without looking first.
   */
  guns: number;
  hull: number;
}

export const CREATURES: Creature[] = [
  {
    slug: 'the-kraken',
    name: 'The Kraken',
    sighting: 'Deep water here, and something in it that takes whole hulls.',
    found:
      'The boats come back from {island} early and short a boat. What is left of it is aboard, and the grooves in it are parallel and a hand apart.',
    lore:
      'Nobody has brought back a body, which is the only fact about it everyone agrees on. What comes back instead is timber: a strake, a hatch cover, once most of a quarterdeck, all of it scored with parallel grooves a hand apart. The Admiralty rates the loss of any hull in the drowned reaches as weather. The crews who sail them do not.',
    waters: ['drowned-isle', 'storm-isle'],
    guns: 10,
    hull: 8,
  },
  {
    slug: 'young-sea-dragon',
    name: 'Sea Dragon',
    sighting: 'A young dragon keeps the rocks off this coast. It is patient.',
    found:
      'Something long goes down off the rocks at {island} as the boats pull in, and the water closes over it without hurrying. Nobody aboard argues about what it was.',
    lore:
      'Only the young are ever seen, which has kept the argument going for two centuries: either the old ones go somewhere nobody sails, or there are no old ones and the young are all there is. They take seals, and boats that look like seals from below. A grown one has never been measured, and every figure ever given for the length of one was given by a man who did not stay to check.',
    waters: ['rock-isle', 'ice-isle'],
    guns: 6,
    hull: 5,
  },
  {
    slug: 'ghost-ship',
    name: 'The Derelict',
    sighting: 'A hull works these tides with nobody at the wheel.',
    found:
      'A hull stands out of the haze off {island} on the same tide, holds her course across the anchorage, and answers no hail. She is out of sight by dark.',
    lore:
      'She is under sail, she holds a course, and she has answered no hail in living memory. Boarding parties have gone across four times that are written down. Three found her empty, dry and in good order, with the log written up to a date nobody can read. The fourth did not come back, and the ship that sent them wrote her off and turned for home, which is what every captain since has done.',
    waters: ['drowned-isle', 'tide-isle', 'ice-isle'],
    guns: 4,
    hull: 3,
  },
  {
    slug: 'sea-turtle',
    name: 'Reef Turtle',
    sighting: 'The old turtles come up through this reef to breathe.',
    found:
      'The boats going in to {island} are overtaken by something the size of a longboat that surfaces, breathes, looks at them, and goes back down.',
    lore:
      'They are the one thing in these waters that has never hurt anybody, which is why every port on a reef has a law about them and enforces it harder than most laws about people. They come back to the shoal they hatched on to lay, sixty years later, having crossed the whole world twice in between. Navigators used to follow them and it is not a bad way to find land.',
    waters: ['reef-isle', 'jungle-isle', 'tide-isle'],
    guns: 0,
    hull: 0,
  },
  {
    slug: 'ships-cat',
    name: "Ship's Cat",
    sighting: 'Every hull that leaves this harbor leaves with a cat aboard.',
    found:
      'The harbormaster at {island} will not clear a hull out until somebody has counted the cats aboard her, and will not be argued with about it.',
    lore:
      'Not superstition, or not only: a hold with a cat in it loses less grain and fewer cables to rats, and that is the whole of the reason it started. What it has become is something else. A cat that walks off a ship the night before she sails will empty the crew list by morning, and no owner in either fleet has ever found it cheaper to argue about it than to wait a day.',
    waters: ['port-city', 'free-harbor', 'mining-isle'],
    guns: 0,
    hull: 0,
  },
];

/** By slug, for the almanac and anything else that wants one by name. */
export function creature(slug: string): Creature | undefined {
  return CREATURES.find((c) => c.slug === slug);
}

/**
 * What these waters would hold, if they held anything.
 *
 * Seeded from the name, so the answer never changes under the player. Worldgen
 * asks this once for each island of the unexplored Reaches and writes the
 * answer down; nothing else should call it, because an island's creature is
 * whatever is on the island, not whatever this would say now.
 */
export function creatureFor(system: Pick<System, 'name' | 'archetype'>): Creature | undefined {
  if (!system.archetype) return undefined;
  const found = CREATURES.filter((c) => c.waters.includes(system.archetype!));
  if (found.length === 0) return undefined;
  const seed = [...system.name].reduce((n, c) => n + c.charCodeAt(0), 0);
  return found[seed % found.length];
}

/** What is actually in this island's water, if this side has been there. */
export function beastOf(
  system: Pick<System, 'beast' | 'beastSeen'>,
  faction: PlayableFaction,
): Creature | undefined {
  if (!system.beast || !system.beastSeen?.[faction]) return undefined;
  return creature(system.beast);
}

/**
 * What is in the water here regardless of who has seen it.
 *
 * `beastOf` is the player's view and answers "what do I know is here".
 * This one is the world's view and answers "what is here", which is what a
 * fight needs: a kraken does not wait to be introduced.
 */
export function beastAt(system: Pick<System, 'beast'>): Creature | undefined {
  return system.beast ? creature(system.beast) : undefined;
}

/** Still in the water, and still something you have to get past. */
export function beastAlive(system: Pick<System, 'beast' | 'beastSlain'>): boolean {
  if (system.beastSlain) return false;
  const beast = beastAt(system);
  return beast !== undefined && beast.guns > 0;
}

/** What it fires with, or nothing if it is scenery or already dead. */
export function beastGuns(system: Pick<System, 'beast' | 'beastSlain'>): number {
  return beastAlive(system) ? beastAt(system)!.guns : 0;
}

/**
 * Put `hits` into it. Returns true on the shot that kills it.
 *
 * It does not heal. Break off and come back a month later and it is still
 * carrying what you gave it, which makes a second squadron a real plan.
 */
export function woundBeast(
  system: Pick<System, 'beast' | 'beastDamage' | 'beastSlain'>,
  hits: number,
  by: Faction,
): boolean {
  if (!beastAlive(system) || hits <= 0) return false;
  const beast = beastAt(system)!;
  system.beastDamage = (system.beastDamage ?? 0) + hits;
  if (system.beastDamage < beast.hull) return false;
  system.beastDamage = beast.hull;
  system.beastSlain = by;
  return true;
}

/**
 * Boats ashore. Returns the line for the log the first time this side sees
 * what is in the water here, and nothing every time after.
 */
export function sightBeast(
  system: Pick<System, 'name' | 'beast' | 'beastSeen'>,
  faction: PlayableFaction,
): string | undefined {
  if (!system.beast) return undefined;
  if (!system.beastSeen) system.beastSeen = { empire: false, alliance: false };
  if (system.beastSeen[faction]) return undefined;
  system.beastSeen[faction] = true;
  const beast = creature(system.beast);
  if (!beast) return undefined;
  return beast.found.replace('{island}', system.name);
}
