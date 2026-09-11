import type { PlayableFaction, System } from '../sim';

/**
 * How an island's allegiance is drawn, everywhere it is drawn.
 *
 * One rule, in one place, so the chart, the chain chart and the panels cannot
 * disagree: **largest share first, left to right.** The undecided remainder —
 * people who have not picked a side — is a share like any other and sorts with
 * them, in neutral blue.
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
 * The two sides' support are independent numbers, each 0–100, and nothing in
 * the simulation stops both being high at once: an island can be 70 Crown and
 * 60 rebel, with plenty of sympathy for each. So when they sum past 100 the
 * bar shows the *balance* between them, scaled to fit, and there is no
 * undecided share to draw. Under 100, the remainder really is undecided.
 */
export function segmentsFor(
  empireSupport: number,
  allianceSupport: number,
): AllegianceSegment[] {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  let empire = clamp(empireSupport);
  let alliance = clamp(allianceSupport);
  const total = empire + alliance;
  if (total > 100) {
    empire = (empire / total) * 100;
    alliance = (alliance / total) * 100;
  }
  const undecided = Math.max(0, 100 - empire - alliance);

  // A stable order behind the sort, so equal shares never swap between renders.
  const order: Array<AllegianceSegment['faction']> = ['empire', 'alliance', 'neutral'];
  return [
    { faction: 'empire' as const, pct: empire },
    { faction: 'alliance' as const, pct: alliance },
    { faction: 'neutral' as const, pct: undecided },
  ]
    .filter((segment) => segment.pct > 0)
    .sort((a, b) => b.pct - a.pct || order.indexOf(a.faction) - order.indexOf(b.faction));
}

export function allegianceColour(faction: PlayableFaction | 'neutral'): string {
  return `var(--${faction})`;
}
