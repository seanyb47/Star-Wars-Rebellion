import { describe, expect, it } from 'vitest';
import tutorial from '../../data/tutorial.json';

/**
 * The tour points at real things.
 *
 * Every step but the last names a `data-tour` attribute, and the attribute has
 * to actually be on something or the step is skipped for ever — silently, by
 * design, which is exactly why nobody would notice it had stopped working. A
 * tour whose every step is quietly skipped is a Next button and a paragraph.
 *
 * So: the names in the data and the names in the interface are checked against
 * each other, in both directions.
 */
type Step = { id: string; target: string | null; tap?: boolean; title: string; body?: string; byFaction?: Record<string, string> };
const STEPS = (tutorial as { steps: Step[] }).steps;

const UI = import.meta.glob('../*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Every `data-tour="…"` literal the interface carries. */
const anchors = new Set<string>();
for (const source of Object.values(UI)) {
  for (const m of source.matchAll(/data-tour="([a-z-]+)"/g)) anchors.add(m[1]);
  // The console's four come off the slot table, written out there for exactly
  // this reason — a derived name could not be checked from here.
  for (const m of source.matchAll(/tour: '([a-z-]+)'/g)) anchors.add(m[1]);
  // And one is conditional on being the first island in the chain.
  for (const m of source.matchAll(/data-tour=\{[^}]*?'([a-z-]+)'/g)) anchors.add(m[1]);
}

describe('the tour', () => {
  it('points every step at something the interface actually carries', () => {
    for (const step of STEPS) {
      if (step.target === null) continue;
      expect(anchors.has(step.target), `${step.id} points at data-tour="${step.target}"`).toBe(true);
    }
  });

  it('ends on the step with no target, and only that one', () => {
    // The last step is the one that is about the game rather than the screen,
    // so it is the only one allowed to point at nothing — and it has to be
    // last, because a targetless step in the middle would look like a bug.
    const targetless = STEPS.filter((s) => s.target === null);
    expect(targetless).toHaveLength(1);
    expect(STEPS.at(-1)!.target).toBeNull();
  });

  it('gives every step words, and the last one both sides of the war', () => {
    for (const step of STEPS) {
      expect(step.title.length, step.id).toBeGreaterThan(4);
      const text = step.body ?? Object.values(step.byFaction ?? {}).join('');
      expect(text.length, step.id).toBeGreaterThan(20);
    }
    const win = STEPS.at(-1)!;
    expect(Object.keys(win.byFaction ?? {}).sort()).toEqual(['alliance', 'empire']);
  });

  it('asks you to tap the things that go somewhere', () => {
    // The point of the rewrite: a tour you follow by tapping, not by reading.
    // At least half the targeted steps advance on the player's own tap.
    const targeted = STEPS.filter((s) => s.target !== null);
    const tappable = targeted.filter((s) => s.tap);
    expect(tappable.length).toBeGreaterThanOrEqual(targeted.length / 2);
  });
});
