import type { PlayableFaction, System } from '../sim';

/**
 * How an island's allegiance is drawn, everywhere it is drawn.
 *
 * One rule, in one place, so the chart, the chain chart and the panels cannot
 * disagree: the faction that **holds** the island fills from the left, the
 * other faction follows it, and whatever is left over is nobody's — drawn in
 * the neutral blue, because an island half of whose people have not made up
 * their minds should look like it.
 *
 * On an island nobody holds there is no holder to put first, so the larger
 * share leads. The bar still reads left to right in order of who has the most
 * of it.
 */
export interface AllegianceSegment {
  faction: PlayableFaction | 'neutral';
  /** Percent of the bar, 0–100. */
  pct: number;
}

export function allegianceSegments(system: System): AllegianceSegment[] {
  const holder =
    system.control === 'empire' || system.control === 'alliance' ? system.control : null;
  return segmentsFor(system.support.empire, system.support.alliance, holder);
}

/**
 * The same rule for anything that has two shares and a holder — a whole chain
 * averaged over its islands, say, where the holder is whoever owns the most of
 * them and nobody may own any.
 */
export function segmentsFor(
  empireSupport: number,
  allianceSupport: number,
  holder: PlayableFaction | null,
): AllegianceSegment[] {
  const empire = Math.max(0, Math.min(100, empireSupport));
  const alliance = Math.max(0, Math.min(100, allianceSupport));

  const order: PlayableFaction[] =
    holder === 'empire'
      ? ['empire', 'alliance']
      : holder === 'alliance'
        ? ['alliance', 'empire']
        : empire >= alliance
          ? ['empire', 'alliance']
          : ['alliance', 'empire'];

  const value = { empire, alliance };
  const segments: AllegianceSegment[] = order
    .map((faction) => ({ faction, pct: value[faction] }))
    .filter((segment) => segment.pct > 0);

  // Whoever is left has not chosen a side.
  const undecided = Math.max(0, 100 - empire - alliance);
  if (undecided > 0) segments.push({ faction: 'neutral', pct: undecided });
  return segments;
}

export function allegianceColour(faction: PlayableFaction | 'neutral'): string {
  return `var(--${faction})`;
}
