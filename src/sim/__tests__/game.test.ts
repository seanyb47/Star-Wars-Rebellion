import { describe, expect, it } from 'vitest';
import { advanceDay } from '../advanceDay';
import { runAI } from '../ai';
import { AI_MISSION_INTERVAL } from '../constants';
import { generateGalaxy } from '../galaxy';
import { createRng } from '../rng';
import { getSystem } from '../helpers';
import { allLordsTaken, crownTaken, isLord } from '../lords';
import {
  advanceMissions,
  canRecruit,
  canRecruitAt,
  continueMission,
  isMissionTarget,
  missionTypeFor,
  startMission,
  travelDays,
} from '../missions';
import type { GameState, PlayableFaction } from '../types';

/**
 * Play a whole game out with the human side idle: the opponent AI should be
 * able to win on its own. Whichever character reports in is told to carry on,
 * standing in for a player who never touches the prompt.
 */
function playOut(seed: number, player: PlayableFaction, maxDays = 3000): GameState {
  let state = generateGalaxy(seed, player);
  for (let day = 0; day < maxDays && !state.winner; day++) {
    state = advanceDay(state);
    for (const decision of [...state.pendingDecisions]) {
      continueMission(state, decision.characterId);
    }
  }
  return state;
}

describe('a full game', () => {
  /**
   * A player who never gives an order loses the war — usually.
   *
   * This pinned seed 1 and asserted a win by day 1,500. Slowing shipbuilding
   * broke it, and the probe said something worth keeping rather than hiding:
   * on that seed the idle Crown ends day 5,000 holding *thirty-five* islands
   * to the Confederacy's one, and still has not won, because winning wants all
   * three Lords in irons at once and an idle side runs no manhunt. A do-nothing
   * Crown is not beaten there; it simply never finishes, and neither does
   * anyone else.
   *
   * So the test measures the thing it was always trying to measure — that
   * sitting still is losing play — across seeds instead of trusting one, and
   * says out loud that the exception exists.
   */
  it('mostly loses the war for a player who gives no orders', () => {
    const seeds = [1, 2, 3, 4, 5, 6];
    const lost = seeds.filter((seed) => playOut(seed, 'empire').winner === 'alliance');
    expect(lost.length).toBeGreaterThanOrEqual(seeds.length - 2);
  });

  it('works the same way with the sides swapped', () => {
    // A longer horizon than the others on purpose. The Crown's road to
    // victory is a manhunt for three people whose own side keeps coming to
    // get them back, so it is inherently the slower of the two conditions — this seed
    // settles on day 3,021, and capping it at three thousand would be reading
    // "not yet" as "never".
    const state = playOut(1, 'alliance', 4000);
    expect(state.winner).toBe('empire');
  });

  /**
   * The victory condition, end to end — and it is no longer the capital.
   *
   * This test pinned a seed three times and has now been moved four. The
   * first two were the travel rescaling of 19 September and the yards errand
   * fix later the same day, and both said the same thing without either of us
   * hearing it: a pinned seed measures the seed and not the rule.
   *
   * The third move was different in kind. The Confederacy's condition **is
   * not taking Highwater any more** — since the Crown gained a second
   * principal it is *both of them in irons at once*, and taking the capital is
   * merely how that usually happens, because a principal standing on an
   * island when it is stormed goes into the cells with the garrison. So the
   * test had been passing on a coincidence for a day. Seed 2, which it used
   * to pin, now demonstrates the difference rather than the rule: it holds
   * Highwater at day 3,000 and has still not won, because the Regent sailed
   * the week before and is a Regent still to be found.
   *
   * The fourth came the same evening from the other side, and is the reason
   * this version is not the one I wrote: the research floor was fixed, and a
   * war in which both sides can actually research is not the same war. Mine
   * scanned for a Confederate win and checked the Confederate condition.
   * This checks **both**, over every war in the sample that settles, which is
   * the stronger test and the one that survives the next balance change. A
   * seed that runs long is not a failure — it is the thing the suite has
   * always known about these wars and says so above.
   */
  /**
   * Rewritten 21 September, twice over.
   *
   * It pinned seed 2 and asserted that the Confederacy won by taking
   * Highwater — which stopped being a win condition when the Crown got two
   * principals of its own to lose, so it had been passing on a coincidence for
   * a day. Then the research floor was fixed the same evening and seed 2 ran
   * past the cap, because a war in which both sides can actually research is
   * not the same war.
   *
   * So it tests the rule rather than a seed: over a handful of wars, at least
   * one settles, and every war that settles satisfies the condition it claims
   * to have been won by. A seed that runs long is not a failure — it is the
   * thing the suite has always known about these wars and says so above.
   */
  it('ends only the way the rules say: two of the Crown, or all three Lords', () => {
    const settled: GameState[] = [];
    for (const seed of [2, 5, 9, 13]) {
      const state = playOut(seed, 'empire');
      if (state.winner) settled.push(state);
    }
    expect(settled.length).toBeGreaterThan(0);
    for (const state of settled) {
      if (state.winner === 'alliance') expect(crownTaken(state)).toBe(true);
      else expect(allLordsTaken(state)).toBe(true);
    }
  });
});

describe('the opponent expands', () => {
  it('takes worlds over by diplomacy alone', () => {
    let state = generateGalaxy(1);
    const before = state.systems.filter((s) => s.control === 'alliance').length;
    // Until the war ends: the opponent can now take Highwater inside a year,
    // and the count freezes the day it does.
    for (let day = 0; day < 400 && !state.winner; day++) {
      state = advanceDay(state);
      for (const decision of [...state.pendingDecisions]) {
        continueMission(state, decision.characterId);
      }
    }
    const after = state.systems.filter((s) => s.control === 'alliance').length;
    expect(after).toBeGreaterThan(before + 1);
  });

  it('never sends a crew member anywhere there is nothing to do', () => {
    // Checked against the AI directly rather than inferred from a long run: an
    // island can come over while a diplomat is still at sea, so a mission in
    // flight pointing at friendly ground proves nothing either way.
    //
    // It may court an unaligned island or stir up one the player holds. What it
    // must never do is send anyone to its own ground, or anywhere it has not
    // charted, or to an island already in revolt.
    let dispatched = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const state = generateGalaxy(seed);
      state.day = AI_MISSION_INTERVAL;
      runAI(state, createRng(seed));
      for (const sent of state.characters.filter((c) => c.faction === 'alliance' && c.mission)) {
        dispatched++;
        const target = getSystem(state, sent.mission!.targetSystemId);
        expect(isMissionTarget(state, target, 'alliance')).toBe(true);
        /*
         * The island decides the errand, so the AI's mission type must be
         * exactly what the island would give any officer standing on it —
         * with two exceptions, and both are errands that are offered widely
         * and defaulted to nowhere, so they have to be asked for by name.
         *
         * A **posting**: the opponent asks for it only to seat a Lord, and
         * only on ground it is not already handing over.
         *
         * **Signing on**, since Sean's memo of 17 September: any harbor of
         * yours that is loyal enough will hold a table, which is most of a
         * side's own islands, so defaulting to it would make it the answer to
         * all of them and quietly pre-empt the yards. The opponent names it,
         * and only on its own ground, and only with a Recruiter.
         */
        if (sent.mission!.type === 'command') {
          expect(isLord(sent)).toBe(true);
          expect(target.control).not.toBe('empire');
        } else if (sent.mission!.type === 'recruit') {
          expect(canRecruit(sent)).toBe(true);
          expect(canRecruitAt(state, target, 'alliance')).toBe(true);
        } else {
          expect(sent.mission!.type).toBe(missionTypeFor(state, target, 'alliance'));
        }
      }
    }
    expect(dispatched).toBeGreaterThan(30);
  });

  it('puts more than one of them to work', () => {
    // A faction with five officers and one of them at sea is not playing. The
    // previous version used its best diplomat and left the rest on the quay.
    let best = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const state = generateGalaxy(seed);
      state.day = AI_MISSION_INTERVAL;
      runAI(state, createRng(seed));
      best = Math.max(best, state.characters.filter((c) => c.faction === 'alliance' && c.mission).length);
    }
    expect(best).toBeGreaterThan(1);
  });

  it('stands a crew member down when the island comes over while they are at sea', () => {
    // The legitimate case the previous version of the test above mistook for a
    // bug: spillover from a neighbouring parley can flip the target in transit.
    // Forced here rather than fished for across seeds, so it stays covered
    // however the balance is tuned.
    const state = generateGalaxy(4);
    // Not a Lord: they never go ashore.
    const diplomat = state.characters.find((c) => c.faction === 'alliance' && !isLord(c))!;
    // A neutral island with nobody unaligned ashore: somebody standing on the
    // quay would make signing them on the island's answer, and this test is
    // about a parley.
    const target = state.systems.find(
      (s) =>
        s.control === 'neutral' &&
        s.populated &&
        s.explored.alliance &&
        !state.characters.some((c) => c.faction === 'neutral' && c.locationSystemId === s.id),
    )!;
    startMission(state, diplomat.id, target.id);
    expect(diplomat.mission!.phase).toBe('travelling');

    // It runs up their colours on its own while the boat is still out.
    getSystem(state, target.id).control = 'alliance';

    const rng = createRng(9);
    for (let day = 0; day < travelDays(state, diplomat.locationSystemId, target.id) + 2; day++) {
      advanceMissions(state, rng);
    }
    const after = state.characters.find((c) => c.id === diplomat.id)!;
    // Their own island is still somewhere to parley, so the work goes on —
    // what must not happen is a mission left pointing at the wrong thing.
    expect(after.mission?.type ?? 'diplomacy').toBe('diplomacy');
    expect(after.locationSystemId).toBe(target.id);
  });
});

describe('inhabited worlds', () => {
  it('are all winnable: every populated world starts neutral or owned', () => {
    const state = generateGalaxy(9);
    for (const system of state.systems) {
      if (!system.populated) continue;
      expect(system.control).not.toBe('none');
    }
  });

  it('leaves empty worlds unclaimed until someone garrisons them', () => {
    const state = generateGalaxy(9);
    for (const system of state.systems.filter((s) => !s.populated)) {
      expect(system.control).toBe('none');
    }
  });
});
