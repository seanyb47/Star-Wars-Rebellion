import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { CHART_LAYERS, layerMark, layerTally } from '../layers';
import terms from '../../data/terms.json';

/**
 * The Errands filter lights an island you have never charted.
 *
 * Found by playing on 20 September: send a Pirate Lord on **Explore** — the
 * one errand that by definition goes to an island nobody of yours has set
 * foot on — and the filter whose own hint reads *islands your crew are
 * working on, or sailing for* showed a nought and lit nothing at all. The
 * order had gone; the log said so; the chart would not admit it.
 *
 * The cause was a single gate at the top of `layerMark` — *you cannot be told
 * about an island you have never charted* — which is right for every other
 * layer and exactly wrong for this one. What stands on a stranger's island is
 * not yours to know until somebody looks. Where you sent your own people is
 * not news you have to buy.
 *
 * The gate itself is the other half of this: `charted.test.ts` and
 * `chartsight.test.ts` guard it, so the test below also checks it still holds
 * for the layers it belongs to.
 */
function withErrandTo(seed: number) {
  const state = generateGalaxy(seed, 'alliance');
  const target = state.systems.find((s) => !s.explored.alliance);
  const who = state.characters.find((c) => c.faction === 'alliance' && !c.mission);
  if (!target || !who) return null;
  who.mission = { type: 'survey', targetSystemId: target.id, phase: 'travelling', daysRemaining: 12 };
  return { state, target, who };
}

describe('the Errands filter', () => {
  it('lights an unexplored island somebody of yours is sailing for', () => {
    let checked = 0;
    for (let seed = 1; seed <= 12; seed += 1) {
      const set = withErrandTo(seed);
      if (!set) continue;
      checked += 1;
      const mark = layerMark(set.state, set.target, 'missions', 'alliance');
      expect(mark.lit, `seed ${seed}: ${set.target.name} is dark`).toBe(true);
      expect(mark.count).toBe(1);
      expect(layerTally(set.state, 'missions', 'alliance')).toBeGreaterThan(0);
    }
    expect(checked, 'seeds with an unexplored island and a free crew member').toBeGreaterThan(8);
  });

  /**
   * And the gate is still shut for everything else. An unexplored island is
   * still dark under every other filter, which is what stops the chart
   * answering a question espionage is sold as answering.
   */
  it('leaves every other filter dark on unexplored ground', () => {
    const set = withErrandTo(1);
    expect(set).not.toBeNull();
    for (const layer of CHART_LAYERS) {
      if (layer.id === 'missions' || layer.id === 'allegiance' || layer.id === 'none') continue;
      expect(
        layerMark(set!.state, set!.target, layer.id, 'alliance').lit,
        `${layer.id} lights unexplored ground`,
      ).toBeFalsy();
    }
  });

  /**
   * The same hole, one filter along: order the Home Fleet to sea on day one
   * and the Fleets filter — the only way to ask where your navy is — read
   * nought, because a squadron at sea lies off nothing. Theirs at sea stays
   * invisible, which is what the watch is for.
   */
  it('has a twin: the Fleets filter shows where your own hulls are sailing', () => {
    const state = generateGalaxy(3, 'alliance');
    const fleet = state.fleets.find((f) => f.faction === 'alliance' && f.ships.length > 0)!;
    const target = state.systems.find((s) => s.id !== fleet.systemId && !s.explored.alliance)!;
    fleet.voyage = { targetSystemId: target.id, daysRemaining: 9 };
    const mark = layerMark(state, target, 'fleets', 'alliance');
    expect(mark.lit, 'the destination is dark').toBe(true);
    expect(mark.count).toBe(fleet.ships.length);

    // And a squadron of theirs at sea is still nobody's business but theirs.
    const hers = state.fleets.find((f) => f.faction === 'empire' && f.ships.length > 0);
    if (hers) {
      const dark = state.systems.find(
        (s) => s.explored.alliance && s.id !== target.id && s.id !== fleet.systemId,
      )!;
      hers.voyage = { targetSystemId: dark.id, daysRemaining: 9 };
      const before = layerMark(state, dark, 'fleets', 'alliance');
      expect(before.count ?? 0, 'their passage is visible').toBe(0);
    }
  });

  /** And it is called what the project calls it. */
  it('is labelled with the agreed word', () => {
    const chip = CHART_LAYERS.find((l) => l.id === 'missions');
    expect(chip?.label).toBe(terms.errands);
  });
});
