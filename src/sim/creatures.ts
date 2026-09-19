import type { Combatant } from './round';
import {
  BEAST_HIT_CHANCE,
  DAMAGE_SWING,
  BEAST_FLEE_CHANCE,
  BEAST_FLEE_HURT,
  BEAST_MOVE_CHANCE,
  BEAST_WAKE_CHANCE,
  BEAST_WAKE_DAY,
  shipSpec,
} from './constants';
import { inProse, pushEvent } from './helpers';
import type { Rng } from './rng';
import type { Faction, GameState, IslandArchetype, PlayableFaction, System } from './types';

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
  /**
   * How hard it is to hit. A thing mostly under the water is not a ship.
   * Defaults to BEAST_HIT_CHANCE.
   */
  evade?: number;
  /** Strikes it makes in a round. Most make one. */
  shots?: number;
  /**
   * The chance a strike **takes** a hull rather than damaging it.
   *
   * Sean's: "maybe a kraken can grab a ship". It does not shoot — nothing in
   * the water shoots — and modelling it as a very large gun made it a ship of
   * the line with tentacles. What it does is get hold of something, and what
   * that costs you is the whole hull, sound or not. Rare enough to be a story
   * rather than a tax.
   */
  seize?: number;
  /** Extra hulls a single strike catches, for a thing that breathes fire. */
  splash?: number;
  /** One line for the log when the special thing happens. */
  strike?: string;
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
    guns: 26,
    hull: 90,
    evade: 0.5,
    shots: 2,
    seize: 0.25,
    strike: 'takes hold of',
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
    guns: 16,
    hull: 50,
    evade: 0.6,
    splash: 1,
    strike: 'rakes',
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
    guns: 11,
    hull: 28,
    evade: 0.35,
    strike: 'fires into',
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
export function creatureFor(system: Pick<System, 'name' | 'archetype' | 'seed'>): Creature | undefined {
  if (!system.archetype) return undefined;
  const found = CREATURES.filter((c) => c.waters.includes(system.archetype!));
  if (found.length === 0) return undefined;
  const seed = system.seed ?? [...system.name].reduce((n, c) => n + c.charCodeAt(0), 0);
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
  return beast.found.replace('{island}', inProse(system.name));
}

// --- Once the rumours start ------------------------------------------------

/**
 * Everything about a creature that moves.
 *
 * For the first two hundred days none of them do: a creature is a fact about
 * one island's water, and meeting one is the price of going somewhere nobody
 * has been. That is the right shape for an opening — the war is the subject
 * and the sea is the setting.
 *
 * After that the sea gets a vote. A creature wakes, word of it goes round the
 * whole Sea whether or not anyone has seen it, and from then on it hunts: it
 * moves about its own Sea every week or so, it prefers water somebody's ships
 * are lying in, and it will take a fleet at sea when there is nothing at
 * anchor to take. It can also run, the way a fleet can, once it has been hurt
 * enough — and if there is nowhere in the Sea left to run to, it stays and
 * fights, which is the one case where a half-killed creature is worse than a
 * fresh one.
 *
 * A creature is carried on the island it is in rather than as a thing with a
 * position of its own, so moving one is moving the fields: what it is, what it
 * has taken, and who has seen it all travel together. Nothing else has to know
 * a creature can move at all — the harbor panel, the battle round and the
 * almanac go on reading the island in front of them.
 */

/** The Sea an island is in, by way of its chain. */
function seaOf(state: GameState, system: System): string | undefined {
  return state.sectors.find((sec) => sec.id === system.sectorId)?.sea;
}

/** Islands of the same Sea a creature could move to, nearest ones first. */
function elsewhereInSea(state: GameState, from: System): System[] {
  const sea = seaOf(state, from);
  if (!sea) return [];
  const sectors = new Set(state.sectors.filter((sec) => sec.sea === sea).map((sec) => sec.id));
  return state.systems.filter(
    (s) => s.id !== from.id && sectors.has(s.sectorId) && !s.beast,
  );
}

/** Carry a creature, and everything true about it, to another island. */
function carry(from: System, to: System): void {
  to.beast = from.beast;
  to.beastDamage = from.beastDamage;
  to.beastRoaming = true;
  // Who has seen it follows it. Having met the Kraken once, you know the
  // Kraken when it turns up somewhere else; the side that never has still
  // does not, and gets the same nasty surprise it would have got at home.
  to.beastSeen = { ...(from.beastSeen ?? { empire: false, alliance: false }) };
  from.beast = undefined;
  from.beastDamage = undefined;
  from.beastRoaming = undefined;
  from.beastSeen = { empire: false, alliance: false };
}

/**
 * Move a creature somewhere else in its Sea.
 *
 * Which way it leans is the whole difference between the two reasons it moves.
 * A healthy one is **hunting**: water with ships at anchor first, anything else
 * only if there is none. A hurt one is **running**, and running toward a
 * squadron is not running — so it will only go where there are no ships, and
 * when every other island in the Sea has ships or another creature in it there
 * is nowhere to go and it stays and fights. That is what makes "cornered" a
 * real state rather than a figure of speech: it happens when a side has spread
 * its hulls through the Sea, which is a thing a player can actually do on
 * purpose.
 */
function prowl(state: GameState, from: System, rng: Rng, fleeing = false): boolean {
  const options = elsewhereInSea(state, from);
  if (options.length === 0) return false;
  const shipsAt = (s: System) => state.fleets.some((f) => !f.voyage && f.systemId === s.id);
  const quiet = options.filter((s) => !shipsAt(s));
  if (fleeing) {
    if (quiet.length === 0) return false;
    const away = rng.pick(quiet);
    const beast = beastAt(from)!;
    carry(from, away);
    if (away.explored[state.player]) {
      pushEvent(state, {
        kind: 'battle',
        text: `${beast.name} breaks off and goes into the water off ${away.name}.`,
        systemId: away.id,
      });
    }
    return true;
  }
  const hunting = options.filter(shipsAt);
  const to = rng.pick(hunting.length > 0 ? hunting : options);
  const beast = beastAt(from)!;
  carry(from, to);
  // Reported where it could be seen from. An island nobody has charted swallows
  // its own news, which is the same rule the rest of the game keeps.
  if (to.explored[state.player]) {
    pushEvent(state, {
      kind: 'battle',
      text: `${beast.name} is in the water off ${to.name}.`,
      systemId: to.id,
    });
  }
  return true;
}

/**
 * A fleet caught in open water, when there is nothing at anchor to go for.
 *
 * A voyage has no route in this game, only a destination and a count of days,
 * so "in transit" can only mean bound somewhere in this Sea. That is enough:
 * it is the fleet nobody could reinforce, taken where no fort can fire and no
 * squadron can join, which is what makes it worth fearing.
 */
function takeAtSea(state: GameState, from: System, rng: Rng): boolean {
  const sea = seaOf(state, from);
  if (!sea) return false;
  const sectors = new Set(state.sectors.filter((sec) => sec.sea === sea).map((sec) => sec.id));
  const passing = state.fleets.filter((f) => {
    if (!f.voyage) return false;
    const to = state.systems.find((s) => s.id === f.voyage!.targetSystemId);
    return to !== undefined && sectors.has(to.sectorId) && f.ships.length > 0;
  });
  if (passing.length === 0) return false;
  const fleet = rng.pick(passing);
  const beast = beastAt(from)!;
  // Half the guns tell, as everywhere else shot is counted in this game.
  let hits = Math.max(1, Math.round(beast.guns / 2));
  while (hits > 0) {
    const live = fleet.ships.filter((s) => s.damage < shipSpec(s.classId).hull);
    if (live.length === 0) break;
    live[rng.int(live.length)].damage += 1;
    hits -= 1;
  }
  const lost = fleet.ships.filter((s) => s.damage >= shipSpec(s.classId).hull).length;
  fleet.ships = fleet.ships.filter((s) => s.damage < shipSpec(s.classId).hull);
  if (fleet.faction === state.player) {
    pushEvent(state, {
      kind: 'battle',
      text:
        `${beast.name} takes ${fleet.name} in open water` +
        (lost > 0 ? `. ${lost} ${lost === 1 ? 'hull is' : 'hulls are'} gone.` : ', and she is mauled getting clear.'),
      systemId: fleet.systemId,
    });
  }
  return true;
}

/**
 * The day's turn for everything in the water. Called once a day, after the
 * fighting, so a creature that has just been hurt can decide to run from it.
 */
export function stirBeasts(state: GameState, rng: Rng): void {
  if (state.day < BEAST_WAKE_DAY) return;
  for (const system of state.systems) {
    if (!beastAlive(system)) continue;

    // Not woken yet. Rumours are public — that is what a rumour is — so this
    // one line goes in both sides' logs whether or not anybody has been there.
    if (!system.beastRoaming) {
      if (!rng.chance(BEAST_WAKE_CHANCE)) continue;
      system.beastRoaming = true;
      const beast = beastAt(system)!;
      pushEvent(state, {
        kind: 'battle',
        text: `Rumours of ${beast.name} are spreading in ${inProse(seaOf(state, system) ?? 'the Reaches')}.`,
        systemId: system.id,
      });
      continue;
    }

    // Hurt enough to break off, and somewhere to break off to. Checked before
    // the ordinary prowl so a wounded creature leaves rather than wandering.
    const beast = beastAt(system)!;
    const hurt = (system.beastDamage ?? 0) / beast.hull;
    if (hurt >= BEAST_FLEE_HURT && rng.chance(BEAST_FLEE_CHANCE)) {
      if (prowl(state, system, rng, true)) continue;
      // Cornered: every other island in its Sea has ships in it or something
      // else in the water. It stays where it is and goes on fighting, which
      // the battle round will see to tomorrow — and the side that did the
      // cornering is told, because it is the good news of the week.
      if (!system.cornered && system.explored[state.player]) {
        pushEvent(state, {
          kind: 'battle',
          text: `${beast.name} is hurt and has nowhere in ${
            seaOf(state, system) ?? 'these waters'
          } left to go. It turns and fights off ${system.name}.`,
          systemId: system.id,
        });
      }
      system.cornered = true;
      continue;
    }
    system.cornered = undefined;

    if (!rng.chance(BEAST_MOVE_CHANCE)) continue;
    // Hunting. Somewhere in the Sea with ships at anchor first; failing that,
    // a fleet caught out in open water; failing that, anywhere at all.
    const anchored = elsewhereInSea(state, system).some((s) =>
      state.fleets.some((f) => !f.voyage && f.systemId === s.id),
    );
    if (!anchored && takeAtSea(state, system, rng)) continue;
    prowl(state, system, rng);
  }
}

// --- In the round ----------------------------------------------------------

/**
 * The creature as something the battle round can shoot at.
 *
 * It keeps its damage on the island rather than on an object of its own, so
 * this is a view onto `system.beastDamage` that the round can treat exactly
 * like a hull. Undefined where there is nothing alive in the water.
 */
export function beastCombatant(system: System): Combatant | undefined {
  const beast = beastAt(system);
  if (!beast || !beastAlive(system)) return undefined;
  return {
    guns: beast.guns,
    left: beast.hull - (system.beastDamage ?? 0),
    whole: beast.hull,
    hitChance: beast.evade ?? BEAST_HIT_CHANCE,
    hurt: (amount) => {
      system.beastDamage = Math.min(beast.hull, (system.beastDamage ?? 0) + amount);
      return system.beastDamage >= beast.hull;
    },
  };
}

/** How many times it comes at somebody in a round. */
export function monsterShots(system: System): number {
  return beastAt(system)?.shots ?? 1;
}

/**
 * What a creature does instead of firing a broadside.
 *
 * This is the whole reason a creature is not simply a ship with different
 * numbers. The Kraken gets hold of a hull and takes it down whole, sound or
 * not, which is a thing no fleet can do and no amount of hull protects you
 * from. The Sea Dragon catches more than one at a time. The Derelict does the
 * ordinary thing, and is nearly impossible to hit back.
 */
export function monsterStrike(
  state: GameState,
  system: System,
  target: Combatant,
  rng: Rng,
): void {
  const beast = beastAt(system);
  if (!beast) return;
  if (!rng.chance(target.hitChance)) return;

  if (beast.seize && rng.chance(beast.seize)) {
    // Taken. Not damaged — taken. Whatever it had left goes with it.
    target.hurt(target.left);
    if (system.explored[state.player]) {
      pushEvent(state, {
        kind: 'loss',
        text: `${beast.name} ${beast.strike ?? 'takes'} a hull off ${system.name} and it is gone under.`,
        systemId: system.id,
      });
    }
    return;
  }
  const swing = 1 + (rng.next() * 2 - 1) * DAMAGE_SWING;
  target.hurt(Math.max(1, Math.round(beast.guns * swing)));
}
