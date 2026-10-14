import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../../sim/galaxy';
import { controlColor, OPEN_GREY } from '../GalaxyMap';

describe('the chart never says whose an island is before you have been there', () => {
  it('paints every unexplored island grey, whoever holds it', () => {
    const state = generateGalaxy(501, 'empire');
    // An island the Confederacy has settled out past the Crown's charts.
    const hidden = state.systems.filter((s) => !s.explored.empire).slice(0, 3);
    for (const s of hidden) s.control = 'alliance';
    expect(hidden.length).toBeGreaterThan(0);
    for (const s of hidden) expect(controlColor(s, 'empire')).toBe(OPEN_GREY);
    // And the moment you have charted one, it shows its colour.
    hidden[0].explored.empire = true;
    expect(controlColor(hidden[0], 'empire')).not.toBe(OPEN_GREY);
  });

  it('uses one grey for the unsettled too', () => {
    const state = generateGalaxy(501, 'empire');
    const bare = state.systems.find((s) => s.explored.empire && !s.populated);
    if (bare) expect(controlColor(bare, 'empire')).toBe(OPEN_GREY);
  });
});
