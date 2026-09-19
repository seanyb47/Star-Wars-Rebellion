import doctrine from '../data/doctrine.json';
import type { GameState } from './types';

/**
 * What the opponent knows, and how much of it.
 *
 * Sean asked for "a file on optimal game play for the AI — teaches strategy
 * learned over time and updates as it learns, and AIs can read this for future
 * games. This will also help with when we establish difficulties: more advanced
 * AIs can use more advanced tactics."
 *
 * So the strategy lives in `src/data/doctrine.json` as named articles, each with
 * a tier, and this module is the only thing between that file and the opponent's
 * reasoning. `runAI` asks `follows(state, 'hunt-the-principals')` rather than
 * doing it unconditionally, which means three things at once:
 *
 * - The tactics are readable prose somebody can argue with, in one place,
 *   instead of being spread through six hundred lines of decision code.
 * - A difficulty setting is a single word: a plain opponent holds its ground
 *   and courts its neighbours; a ruthless one prices your loyalty, hunts your
 *   officers, and commits to a siege.
 * - Every article can be *measured*, because the harness can switch exactly
 *   one off and play two hundred wars either way. `lab/doctrine.ts` does that
 *   and writes what it finds back into the file, which is the "updates as it
 *   learns" half of the ask.
 *
 * Nothing here is a hunch. An article with no `evidence` has not been earned.
 */

export type Tier = 'plain' | 'sharp' | 'ruthless';

export interface Article {
  id: string;
  tier: Tier;
  title: string;
  /** What the opponent does, in one sentence. The code below is this sentence. */
  rule: string;
  /** Why it is worth doing. */
  why: string;
  /** What was measured when it was, and was not, being done. */
  evidence?: string;
}

/** Plain knows the plain articles; ruthless knows all three tiers. */
const RANK: Record<Tier, number> = { plain: 0, sharp: 1, ruthless: 2 };

export const TIERS: Tier[] = ['plain', 'sharp', 'ruthless'];

export const ARTICLES: Article[] = doctrine.articles as Article[];

export const TIER_BLURB = doctrine.tiers as Record<Tier, string>;

const BY_ID = new Map(ARTICLES.map((a) => [a.id, a]));

export function article(id: string): Article | undefined {
  return BY_ID.get(id);
}

/** Every article an opponent at this tier plays by. */
export function articlesFor(tier: Tier): Article[] {
  return ARTICLES.filter((a) => RANK[a.tier] <= RANK[tier]);
}

/**
 * How well the opponent plays this game. Absent means the whole book, which
 * is what every save before difficulties existed should get.
 */
export function doctrineOf(state: GameState): { tier: Tier; without: string[] } {
  return {
    tier: state.doctrine?.tier ?? 'ruthless',
    without: state.doctrine?.without ?? [],
  };
}

/**
 * Does this opponent play by that article?
 *
 * An unknown id answers true rather than false, deliberately: a rule the code
 * asks about and the file has forgotten should keep working, not silently stop.
 * `lab/doctrine.ts` reports the mismatch instead.
 */
export function follows(state: GameState, id: string): boolean {
  const spec = BY_ID.get(id);
  if (!spec) return true;
  const { tier, without } = doctrineOf(state);
  if (without.includes(id)) return false;
  return RANK[spec.tier] <= RANK[tier];
}
