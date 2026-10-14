import type { PlayableFaction, System } from '../sim';

/**
 * How an island's allegiance is drawn, everywhere it is drawn.
 *
 * One rule, in one place, so the chart, the chain chart and the panels cannot
 * disagree: **largest share first, left to right.** There is no undecided
 * share — see `segmentsFor` — so the bar is only ever the two of them.
 *
 * Who holds the island is deliberately not part of this. It used to lead the
 * bar, and that made the same two numbers draw two different ways depending on
 * a third fact, which is exactly what makes a bar hard to read at a glance.
 * Ordering by size alone means the widest block is always on the left.
 */
export interface AllegianceSegment {
  faction: PlayableFaction | 'neutral';
  /** Percent of the bar, 0–100. */
  pct: number;
}

export function allegianceSegments(system: System): AllegianceSegment[] {
  return segmentsFor(system.support.empire, system.support.alliance);
}

/**
 * The same rule for any pair of shares — a single island, or an average.
 *
 * The two sides' regard for an island adds up to a hundred: there is no
 * undecided share, because there is no undecided middle to win over. The bar
 * is the balance between them and nothing else. Averages handed in from
 * elsewhere may not total a hundred exactly, so they are scaled to fit rather
 * than leaving a gap that would read as somebody's.
 */
export function segmentsFor(
  empireSupport: number,
  allianceSupport: number,
): AllegianceSegment[] {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  let empire = clamp(empireSupport);
  let alliance = clamp(allianceSupport);
  const total = empire + alliance;
  if (total > 0 && total !== 100) {
    empire = (empire / total) * 100;
    alliance = (alliance / total) * 100;
  }

  // A stable order behind the sort, so equal shares never swap between renders.
  const order: Array<AllegianceSegment['faction']> = ['empire', 'alliance'];
  return [
    { faction: 'empire' as const, pct: empire },
    { faction: 'alliance' as const, pct: alliance },
  ]
    .filter((segment) => segment.pct > 0)
    .sort((a, b) => b.pct - a.pct || order.indexOf(a.faction) - order.indexOf(b.faction));
}

export function allegianceColour(faction: PlayableFaction | 'neutral'): string {
  // Nobody's is `--unheld` and not `--neutral`: on a chart it sits beside the
  // Crown's green, and the two were the same lightness. One idea, one colour,
  // wherever an allegiance is drawn.
  return faction === 'neutral' ? 'var(--unheld)' : `var(--${faction})`;
}
