import { describe, expect, it } from 'vitest';
import { CHART_LAYERS, isLoudLayer } from '../../sim';

/**
 * On the chart, only trouble moves.
 *
 * Sean, 24 September, looking at the World Map with Idle crew on: *"The
 * constant flashing isn't clear what you're trying to bring to my
 * attention."*
 *
 * The complaint is the plural. Three things were moving on that one screen —
 * the idle glow breathing under Sovereign Reach, the news ring opening over
 * Sunken Reach on a loop, and a mutiny flag pulsing beside it — each meaning
 * something different and none of them saying what. Motion cannot carry three
 * separate ideas at once; it stops being a signal and becomes weather, and
 * then the one thing that genuinely wants an interruption cannot get one.
 *
 * So: the mutiny flag keeps its pulse and nothing else on the chart has one.
 * A filter's answer is found by size and colour, and named in words under the
 * chips. This file is the guard on that, because "add a pulse so it stands
 * out" is the easiest change in the world to make twice.
 */
const CSS = (
  import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }) as Record<
    string,
    string
  >
)['../styles.css'];

const STRIP = (
  import.meta.glob('../LayerStrip.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../LayerStrip.tsx'];

/** A rule's body, by selector, so a declaration can be read out of it. */
function rule(selector: string): string {
  const at = CSS.indexOf(`${selector} {`);
  expect(at, `${selector} is gone from the stylesheet`).toBeGreaterThan(-1);
  return CSS.slice(at, CSS.indexOf('}', at));
}

describe('only trouble moves on the chart', () => {
  it('leaves the idle glow still', () => {
    const halo = rule('.map__idle-halo');
    expect(halo, 'the idle glow is animated again').not.toMatch(/animation/);
    // Still visible, though: taking the pulse away must not take the mark.
    expect(halo).toMatch(/opacity:\s*0\.\d+/);
  });

  it('opens the news ring once rather than on a loop', () => {
    // The rule leaves its shockwave note standing for three days so a reload
    // cannot land mid-animation. CSS filling all three with the same ring was
    // the lighthouse.
    expect(rule('.map__shock')).not.toMatch(/animation:[^;]*infinite/);
  });

  it('keeps the pulse on the one thing that has earned it', () => {
    expect(rule('.chainmap__flame')).toMatch(/animation:[^;]*infinite/);
  });

  it('turns that pulse off for anyone who has asked for less movement', () => {
    const at = CSS.indexOf('.chainmap__flame { animation: none');
    expect(at, 'the mutiny pulse ignores prefers-reduced-motion').toBeGreaterThan(-1);
    expect(CSS.lastIndexOf('prefers-reduced-motion', at)).toBeGreaterThan(-1);
  });
});

describe('a mark unique to one layer is captioned in words', () => {
  it('captions the loud layers under the chips', () => {
    expect(STRIP).toMatch(/isLoudLayer\(layer\)/);
    expect(STRIP).toMatch(/layers__hint/);
  });

  it('uses the layer its own hint, not a second wording', () => {
    // One sentence, two places — the strip and the Almanac. A filter that
    // explains itself differently depending on where you read about it is two
    // filters.
    expect(STRIP).toMatch(/\{loud\.hint\}/);
  });

  it('has a sentence to print for every loud layer', () => {
    const loud = CHART_LAYERS.filter((l) => isLoudLayer(l.id));
    expect(loud.length).toBeGreaterThan(0);
    for (const l of loud) {
      expect(l.hint, `${l.id} has nothing to say for itself`).toBeTruthy();
      expect(l.hint.length, `${l.id}'s hint is too thin to caption with`).toBeGreaterThan(20);
    }
  });

  it('leaves the quiet layers uncaptioned', () => {
    // The cut of 21 September stands for the other nine: a star is a star on
    // every one of them, and the chip above already named it.
    const quiet = CHART_LAYERS.filter((l) => !isLoudLayer(l.id));
    expect(quiet.length).toBeGreaterThan(CHART_LAYERS.length / 2);
  });
});
