import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { advanceBuilds, raiseWorks } from '../build';
import { beastAlive, creature, sightBeast } from '../creatures';
import { addShip, resolveBattles } from '../fleets';
import { leakInformation } from '../support';
import { inProse } from '../helpers';
import { createRng, type Rng } from '../rng';
import { YARD_BUILDS } from '../constants';
import type { GameState, PlayableFaction } from '../types';

/**
 * One log, two sides.
 *
 * Every dispatch the game writes goes into the same feed the player reads,
 * whoever it happened to, so anything written in the second person has to ask
 * whose news it is first. Sean's playtest, days 1–150 as the Confederacy:
 *
 *   *"Dispatches written from the wrong side's point of view: 'Rime Island has
 *   been settled... they are yours' appeared when the CROWN settled it. The Sea
 *   Dragon fight dispatch showed 'IMPERIUM vs CONFEDERACY 0 hulls,' as if the
 *   beast were us. 'Somebody on Rime Island has talked. The Free Confederacy
 *   has its buildings on their charts' is phrased as if it were my intel."*
 *
 * Three different writers made the same mistake, so these are three tests
 * rather than one: the fix is per-sentence and nothing stops the next one.
 */

/** A leak that always happens, so the prose can be read rather than fished for. */
function certain(): Rng {
  const rng = createRng(1);
  return { ...rng, next: () => rng.next(), chance: () => true, seed: rng.seed };
}

/** An uninhabited rock with a yard on it and the room to finish something. */
function outpost(state: GameState, owner: PlayableFaction) {
  const empty = state.systems.find((s) => !s.populated)!;
  empty.control = owner;
  empty.garrison = 1;
  empty.slots = 8;
  empty.facilities = [{ id: 'fac-test', type: 'training_facility', owner }];
  empty.deposits = [{ id: 'dep-test', type: 'gold' }];
  state.factions[owner].gold = 500;
  return empty;
}

function settle(state: GameState, owner: PlayableFaction = 'empire') {
  // Raised on the island rather than ordered from a works: since Sean cut the
  // construction yard a building has no maker to give the order to.
  const island = state.systems.find((s) => s.facilities.some((f) => f.id === 'fac-test'))!;
  raiseWorks(state, island.id, 'mine', owner);
  for (let day = 0; day < YARD_BUILDS.mine.days; day++) advanceBuilds(state);
  return state.events.filter((e) => e.text.includes('has been settled'));
}

describe('a dispatch knows whose news it is', () => {
  it('gives the player the settlers only when the player settled them', () => {
    const mine = generateGalaxy(203, 'empire');
    outpost(mine, 'empire');
    const ours = settle(mine);
    expect(ours).toHaveLength(1);
    expect(ours[0].text).toContain('they are yours');

    // The same island, the same day's work, the other flag over it.
    const theirs = generateGalaxy(203, 'alliance');
    outpost(theirs, 'empire');
    const not = settle(theirs);
    expect(not).toHaveLength(1);
    expect(not[0].text).not.toContain('yours');
    expect(not[0].text).toContain('Imperium');
  });

  it('reads a leak from the enemy as intelligence, not as a loss', () => {
    // A thin Crown island with an unexplored neighbour, and the Confederacy
    // in the player's chair. The island talking is the player's gain.
    const state = generateGalaxy(55, 'alliance');
    const island = state.systems.find((s) => s.control === 'empire' && s.populated)!;
    island.support = { empire: 45, alliance: 55 };
    island.uprising = false;
    island.explored.alliance = false;
    leakInformation(state, certain());
    const leak = state.events.filter((e) => e.text.includes('has talked'));
    expect(leak.length).toBeGreaterThan(0);
    for (const event of leak) {
      expect(event.text).toContain('your charts');
      // Not "the Free Confederacy has ... on their charts": the player is not
      // a third party to their own intelligence.
      expect(event.text).not.toContain('their charts');
      expect(event.kind).not.toBe('loss');
    }
  });

  it('still reads a leak of the player’s own as a loss', () => {
    const state = generateGalaxy(55, 'empire');
    const island = state.systems.find((s) => s.control === 'empire' && s.populated)!;
    island.support = { empire: 45, alliance: 55 };
    island.uprising = false;
    island.explored.alliance = false;
    leakInformation(state, certain());
    const leak = state.events.filter((e) => e.text.includes('has talked'));
    expect(leak.length).toBeGreaterThan(0);
    expect(leak[0].kind).toBe('loss');
    expect(leak[0].text).toContain('their charts');
  });

  it('names the creature in an action fought against one alone', () => {
    const state = generateGalaxy(501, 'empire');
    // The heaviest beast in the world, and it has to be one with guns.
    //
    // This took the first living creature it found, which made the test
    // depend on which sort the seed put first. The ground going proportional
    // on 20 September reshuffled that: seed 501 came up with a ghost-ship of
    // eleven guns where it used to find a sea-dragon of sixteen, and eleven
    // guns against six hulls sinks nothing — so the action was reported as a
    // line without a tally, and the tally is the whole of what this checks.
    const target = state.systems
      .filter((s) => beastAlive(s) && (creature(s.beast!)?.guns ?? 0) > 0)
      .sort((a, b) => (creature(b.beast!)?.guns ?? 0) - (creature(a.beast!)?.guns ?? 0))[0];
    expect(target, 'no fighting creature in this world').toBeTruthy();
    const fleet = state.fleets.filter((f) => f.faction === 'empire')[1];
    fleet.systemId = target.id;
    fleet.voyage = undefined;
    // Nobody on the quarterdeck. The forward squadron is where Admiral
    // Blackwater now opens, and an admiral aboard is worth enough gunnery to
    // kill this creature in the first round — which writes the kill line and
    // no action card, and the action card is what this test reads. A fixture
    // about whose news it is should not also be a fixture about command.
    fleet.officerIds = [];
    target.explored.empire = true;
    sightBeast(target, 'empire');
    // Small hulls, so the creature actually sinks one: a round that takes
    // damage and no hull is reported as a line without a tally, and it is the
    // tally this test is about.
    for (let i = 0; i < 6; i++) addShip(state, target, 'empire', 'reefwalker');

    const rng = createRng(7);
    for (let i = 0; i < 12 && beastAlive(target); i++) resolveBattles(state, rng);
    const actions = state.events.filter(
      (e) => e.kind === 'battle' && e.systemId === target.id && e.battle,
    );
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      // The Confederacy never sailed, so it is not on the card and not in the
      // sentence. The thing in the water is both.
      expect(action.battle!.beast?.name).toBeTruthy();
      expect(action.battle!.sides.alliance.hulls).toBe(0);
      expect(action.battle!.sides.alliance.lost).toBe(0);
      expect(action.text).not.toContain('Confederacy');
      // In prose, so the article is lowercase: "against the Kraken", not
      // "against The Kraken". This asserted the bare name and so quietly
      // required the sentence to be wrong.
      expect(action.text).toContain(inProse(action.battle!.beast!.name));
    }
  });
});
