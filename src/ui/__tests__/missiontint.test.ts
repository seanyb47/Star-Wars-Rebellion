import { describe, expect, it } from 'vitest';
import { MISSION_FAMILY, missionTint } from '../missiontint';
import { MISSION_LABEL } from '../../sim';
import type { MissionType } from '../../sim';

/**
 * One colour per kind of mission, and the three places it is met.
 *
 * Sean, 24 September: *"Maybe we can do something to better display people on
 * mission. Like shrink their portrait. Add a color border corresponding to the
 * mission type (and color type of the mission from the log and thumbnail). And
 * add on bottom 'On Mission: [Mission Type]'."*
 *
 * The colour has to be the *same* colour in all three or it is three
 * decorations rather than one language, which is what this guards.
 */
const CSS = (
  import.meta.glob('../styles.css', { query: '?raw', import: 'default', eager: true }) as Record<
    string,
    string
  >
)['../styles.css'];

const UI = import.meta.glob('../{components.tsx,FeedScreen.tsx,MissionChoiceSheet.tsx,SystemSheet.tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const TYPES = Object.keys(MISSION_LABEL) as MissionType[];

function token(type: MissionType): string | null {
  const m = CSS.match(new RegExp(`--m-${type}:\\s*(#[0-9a-f]{6})`, 'i'));
  return m ? m[1] : null;
}

function luminance(hex: string): number {
  const v = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('the mission palette', () => {
  it('covers every mission the game has, with no gaps', () => {
    expect(TYPES.length).toBeGreaterThan(5);
    for (const type of TYPES) {
      expect(missionTint(type)).toBe(`var(--m-${type})`);
      expect(token(type), `--m-${type} is not defined`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(MISSION_FAMILY[type], `${type} has no family`).toBeTruthy();
    }
  });

  it('keeps clear of the two faction colours', () => {
    // A rim that reads as a side rather than as a job is worse than no rim:
    // the tile already says whose the person is.
    for (const type of TYPES) {
      const hex = token(type)!;
      expect(hex.toLowerCase(), `${type} is the Crown's green`).not.toBe('#4fc46a');
      expect(hex.toLowerCase(), `${type} is the Confederacy's red`).not.toBe('#d8483f');
    }
  });

  it('stays readable on the tile it rims', () => {
    // The colour is a rim and a word, both over the sunken panel.
    for (const type of TYPES) {
      expect(contrast(token(type)!, '#0f2b36'), type).toBeGreaterThan(3);
    }
  });

  it('gives no two missions in the same family the same colour', () => {
    // Two of a family are the ones most likely to be seen side by side.
    const seen = new Map<string, string>();
    for (const type of TYPES) {
      const hex = token(type)!.toLowerCase();
      expect(seen.has(hex), `${type} shares a colour with ${seen.get(hex)}`).toBe(false);
      seen.set(hex, type);
    }
  });
});

describe('and it is met in three places', () => {
  it('on the crew tile, as a rim and a two-line label', () => {
    expect(UI['../components.tsx']).toMatch(/mission\?: \{ label: string; tint: string; days: number \}/);
    expect(UI['../components.tsx']).toMatch(/slot--away/);
    expect(UI['../components.tsx']).toMatch(/On mission/);
    // One prop, so a tile cannot wear the rim of one mission and the name of
    // another.
    expect(UI['../SystemSheet.tsx']).toMatch(/tint: missionTint\(character\.mission\.type\)/);
  });

  it('on the log line, as the dot', () => {
    expect(UI['../FeedScreen.tsx']).toMatch(/missionTint\(event\.missionType\)/);
  });

  it('on the thumbnail you pick the mission from', () => {
    expect(UI['../MissionChoiceSheet.tsx']).toMatch(/missionTint\(type\)/);
  });
});
