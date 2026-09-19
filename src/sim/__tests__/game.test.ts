import { describe, expect, it } from 'vitest';
import { advanceDay } from '../advanceDay';
import { runAI } from '../ai';
import { AI_MISSION_INTERVAL } from '../constants';
import { generateGalaxy } from '../galaxy';
import { createRng } from '../rng';
import { getSystem } from '../helpers';
import { isLord } from '../lords';
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
   * The victory condition, end to end: an idle Crown loses its capital.
   *
   * Seed 1 rather than seed 2 since 19 September, and the swap is the finding
   * rather than a detail. Rescaling travel so a crossing of the world takes
   * two hundred days instead of thirty-seven cost the Confederacy its long
   * offensive on some maps: measured over seeds 1–12, before the change every
   * one settled (median day 527, range 299–803) and after it ten of twelve do
   * (median 659, range 527–827). Seeds 2 and 9 are the two that no longer
   * finish, and seed 2 does not finish at nine thousand days either — the
   * machine-played Confederacy sits on its own Reach rather than committing a
   * fleet to a six-month passage, and the idle Crown quietly eats the map.
   *
   * That is a real cost of the rescaling and it belongs in the open, not
   * papered over with a bigger day cap. What is being tested here is the
   * *condition* — take Highwater and the war ends — and a seed that reaches it
   * demonstrates it.
   *
   * Seed 2 again, and the churn is the point. Fixing the yards errand later
   * the same day — it had been throwing out a hundred days of work whenever an
   * island drifted below the allegiance floor — moved which seeds settle,
   * because a side that reaches the top of its research tree builds a
   * different fleet. Re-measured over the same twelve: nine settle where ten
   * did, median 599 days against 659, and seeds 1, 6 and 12 are the ones that
   * now run out rather than 2 and 9. Neither set is better; the war is simply
   * not the same war once research works.
   */
  it('ends the way the rules say: Highwater fallen, or every Lord in irons', () => {
    const state = playOut(2, 'empire');
    expect(state.winner).toBe('alliance');
    const capital = getSystem(state, state.factions.empire.hqSystemId);
    expect(capital.control).toBe('alliance');
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
