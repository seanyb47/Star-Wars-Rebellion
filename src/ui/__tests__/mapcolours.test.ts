import { describe, expect, it } from 'vitest';

/**
 * The four things an island's name can say, and whether you can see which.
 *
 * Sean, 24 September, on the Reach map with a mission half-assigned: *"So hard
 * to see blue from green on this screen."* He was right, and the reason is
 * arithmetic rather than taste: the Crown's green and the old neutral blue
 * have **the same lightness**. Their contrast was 1.19:1, so the only thing
 * separating a Crown island from an unheld one was hue — on the red-green
 * axis, over a blue-green sea, on a phone held outdoors.
 *
 * This measures the palette rather than trusting it. Lightness contrast is not
 * the whole of legibility, but two colours below about 1.4:1 differ in nothing
 * *but* hue, and hue alone is the one thing a colour-blind eye, a bright
 * afternoon and a busy painting all take away.
 */
const TOKENS = readTokens();

function readTokens(): Record<string, string> {
  const css = (
    import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }) as Record<
      string,
      string
    >
  )['../styles.css'];
  const out: Record<string, string> = {};
  for (const m of css.matchAll(/^\s*(--[a-z-]+):\s*(#[0-9a-f]{6});/gim)) out[m[1]] = m[2];
  return out;
}

function luminance(hex: string): number {
  const v = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Roughly the water the chain map is painted over. */
const SEA = '#0e2c3c';

describe('an island name says who holds it', () => {
  const held = () => ({
    'the Crown': TOKENS['--empire'],
    'the Confederacy': TOKENS['--alliance'],
    nobody: TOKENS['--unheld'],
  });

  it('has a colour for each of the three, and they are all defined', () => {
    for (const [who, hex] of Object.entries(held())) expect(hex, who).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('separates every pair by lightness, not only by hue', () => {
    const pairs = Object.entries(held());
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const [an, a] = pairs[i];
        const [bn, b] = pairs[j];
        // 1.19:1 is what Sean was looking at. 1.4 is the floor below which two
        // colours are the same colour to anyone not looking for the difference.
        expect(contrast(a, b), `${an} vs ${bn}`).toBeGreaterThan(1.4);
      }
    }
  });

  it('keeps the unheld one warm, so the cue survives a red-green eye', () => {
    // Both factions are cool; parchment is warm. Red channel highest, blue
    // channel lowest is the whole test — it is a different axis from the one
    // that fails, and that is why it was chosen.
    const hex = TOKENS['--unheld'];
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(b);
    expect(g).toBeGreaterThan(b);
  });

  it('leaves every one of them plainly readable on the water', () => {
    for (const [who, hex] of Object.entries(held()))
      expect(contrast(hex, SEA), who).toBeGreaterThan(3);
  });
});

describe('and an uncharted island recedes', () => {
  it('sits below anything charted rather than competing with it', () => {
    const unknown = TOKENS['--unknown-name'];
    expect(contrast(unknown, TOKENS['--unheld'])).toBeGreaterThan(1.7);
    // Still legible over the painting — receding is not disappearing.
    expect(contrast(unknown, SEA)).toBeGreaterThan(3);
  });
});
