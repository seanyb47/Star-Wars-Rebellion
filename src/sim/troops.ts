import troopData from '../data/troops.json';
import type { IslandArchetype, PlayableFaction, System } from './types';

/**
 * What a company actually is.
 *
 * A garrison used to be a number and ten identical pike figures, which said
 * everything about how many and nothing about who. Rebellion never does this:
 * a regiment there is a named thing with a picture and three numbers, and
 * "two Wookiee regiments on Kashyyyk" is a sentence about the world as well as
 * about the board.
 *
 * So a company here has a type. Three sorts of type, and the sort decides
 * where it turns up:
 *
 * - The **line** unit and the **sailors**, which a side has everywhere it has
 *   anything. Crown Regulars and Ship's Company; Island Militia and the same.
 * - The **native** units, which are a people rather than a purchase. The Reef
 *   Guard are not recruited on a reef island, they *are* the reef island; the
 *   Urskin are who lives in the ice. They appear where their people live and
 *   nowhere else, which is why an island of the Confederacy's out in the Far
 *   Sea defends differently from one in the Amber.
 * - The **made** units, Tidewrought and the Drowned Guard, which are the two
 *   the Crown manufactures rather than musters. Those are behind research and
 *   so appear nowhere yet.
 *
 * The numbers are not wired into combat. The sim still resolves a landing on
 * the count of companies, exactly as it did — see docs/troops.md, which says
 * what wiring them would mean. What is real today is who is standing there.
 */
export interface TroopType {
  id: string;
  faction: PlayableFaction;
  name: string;
  role: 'line' | 'sailors' | 'elite' | 'native' | 'made';
  people: string;
  /** What it is worth landing on somebody. */
  offense: number;
  /** What it is worth holding ground. */
  defense: number;
  /** What it sees: the eyes that catch a saboteur or a boat in the dark. */
  watch: number;
  blurb: string;
  /** Behind research, and so not in play. */
  research?: boolean;
  /** For a native unit, the sorts of island its people live on. */
  home?: IslandArchetype[];
}

export const TROOP_TYPES = troopData.types as TroopType[];

export function troopType(id: string): TroopType | undefined {
  return TROOP_TYPES.find((t) => t.id === id);
}

/** Everything a side could have ashore, research aside. */
export function troopsOf(faction: PlayableFaction): TroopType[] {
  return TROOP_TYPES.filter((t) => t.faction === faction);
}

const lineOf = (faction: PlayableFaction) =>
  TROOP_TYPES.find((t) => t.faction === faction && t.role === 'line')!;
const sailorsOf = (faction: PlayableFaction) =>
  TROOP_TYPES.find((t) => t.faction === faction && t.role === 'sailors')!;

/**
 * The unit an island's own people make, if they make one.
 *
 * Reef-folk on the reefs, Urskin in the ice and on bare rock, Shoal-folk in the
 * ports. The Crown has no native unit — its people are the Crown's people
 * everywhere — so its ports post Marines instead, which is the same idea from
 * the other end: the Crown sends its best where it means to be seen.
 */
function localOf(faction: PlayableFaction, system: Pick<System, 'archetype'>): TroopType | undefined {
  if (faction === 'empire') {
    return system.archetype === 'port-city' || system.archetype === 'free-harbor'
      ? TROOP_TYPES.find((t) => t.id === 'crown-marines')
      : undefined;
  }
  return TROOP_TYPES.find(
    (t) => t.faction === faction && t.role === 'native' && t.home?.includes(system.archetype),
  );
}

/**
 * Who is ashore, company by company.
 *
 * Length is the garrison, so this never disagrees with the number the rest of
 * the game runs on — it says what those companies are, not how many there are.
 * Seeded from the island's own name, so the same island has the same companies
 * in every game and a garrison does not reshuffle itself when one is lost.
 */
export function garrisonRoster(
  system: Pick<System, 'name' | 'seed' | 'archetype' | 'control' | 'garrison' | 'facilities'>,
): TroopType[] {
  if (system.control !== 'empire' && system.control !== 'alliance') return [];
  const faction = system.control;
  const line = lineOf(faction);
  const sailors = sailorsOf(faction);
  const local = localOf(faction, system);
  // Sailors come off hulls, so they are ashore where hulls are: an island with
  // a shipyard has a ship's company in the square and one without does not.
  const hasYard = system.facilities.some((f) => f.type === 'shipyard' && !f.building);
  const seed = system.seed ?? [...system.name].reduce((n, c) => n + c.charCodeAt(0), 0);

  const out: TroopType[] = [];
  for (let i = 0; i < system.garrison; i++) {
    const turn = (seed + i) % 4;
    if (local && turn === 1) out.push(local);
    else if (hasYard && turn === 2) out.push(sailors);
    else out.push(line);
  }
  return out;
}

/** The garrison as "3 Crown Regulars · 1 Crown Marines", in posting order. */
export function garrisonSummary(
  system: Parameters<typeof garrisonRoster>[0],
): Array<{ type: TroopType; count: number }> {
  const out: Array<{ type: TroopType; count: number }> = [];
  for (const type of garrisonRoster(system)) {
    const seen = out.find((e) => e.type.id === type.id);
    if (seen) seen.count += 1;
    else out.push({ type, count: 1 });
  }
  return out;
}
