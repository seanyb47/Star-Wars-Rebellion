import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { advanceDay } from '../advanceDay';
import { orderBuild, orderSail, setObserving, setSpeed } from '../commands';
import { countFacilities } from '../helpers';

function run(state = generateGalaxy(501, 'empire'), days = 220) {
  let next = state;
  for (let d = 0; d < days && !next.winner; d++) next = advanceDay(next);
  return next;
}
/** How much of a side's world has been built or ordered — its whole activity. */
function activity(state: ReturnType<typeof generateGalaxy>, faction: 'empire' | 'alliance') {
  const held = state.systems.filter((s) => s.control === faction);
  const works = held.reduce((n, s) => n + s.facilities.filter((f) => f.owner === faction).length, 0);
  const hulls = state.fleets
    .filter((f) => f.faction === faction)
    .reduce((n, f) => n + f.ships.length, 0);
  return { islands: held.length, works, hulls };
}

describe('observing', () => {
  it('is off by default, and leaves no trace in a saved game', () => {
    const state = generateGalaxy(501, 'empire');
    expect(state.observing).toBeUndefined();
    const watching = setObserving(state, true);
    expect(watching.observing).toBe(true);
    // Off again removes the key rather than writing false, so an ordinary
    // save is byte-for-byte what it always was.
    const back = setObserving(watching, false);
    expect('observing' in back).toBe(false);
    expect(JSON.stringify(back)).toBe(JSON.stringify(state));
  });

  it('refuses every order, and says why', () => {
    const state = setObserving(generateGalaxy(501, 'empire'), true);
    const island = state.systems.find(
      (s) => s.control === 'empire' && s.facilities.some((f) => f.type === 'construction_yard'),
    )!;
    const yard = island.facilities.find((f) => f.type === 'construction_yard')!;
    const built = orderBuild(state, yard.id, 'fort');
    expect(built.error).toMatch(/observing/i);
    expect(built.state).toBe(state);

    const fleet = state.fleets.find((f) => f.faction === 'empire')!;
    const sailed = orderSail(state, fleet.id, island.id);
    expect(sailed.error).toMatch(/observing/i);
    expect(sailed.state).toBe(state);
  });

  it('leaves the clock alone, because the clock is the point', () => {
    const state = setObserving(generateGalaxy(501, 'empire'), true);
    const faster = setSpeed(state, 'fast');
    expect(faster.speed).toBe('fast');
    expect(faster.observing).toBe(true);
  });

  it('plays your side for you: the idle Crown stops being idle', () => {
    // Left alone, the player's side does nothing at all — no orders are given,
    // so nothing is built and no hull is laid down.
    const idle = activity(run(generateGalaxy(501, 'empire')), 'empire');
    // Watching, the same side is played by the same brain as the opponent.
    const watched = activity(
      run(setObserving(generateGalaxy(501, 'empire'), true)),
      'empire',
    );
    expect(watched.works).toBeGreaterThan(idle.works);
  });

  it('does not stop the opponent playing its own side', () => {
    const watched = run(setObserving(generateGalaxy(501, 'empire'), true));
    const them = activity(watched, 'alliance');
    expect(them.works).toBeGreaterThan(0);
    expect(them.islands).toBeGreaterThan(0);
  });

  it('runs a whole war through without breaking anything', () => {
    const end = run(setObserving(generateGalaxy(77, 'alliance'), true), 900);
    // The war either finished or is still going; either is fine. What is not
    // fine is a broken world, which is what the rest of this checks. (This
    // used to assert the war lasted two hundred days, which stopped being true
    // the day a landing started taking prisoners — a faster war is not a
    // failure and the test should never have been measuring one.)
    expect(end.day).toBeGreaterThan(0);
    for (const faction of ['empire', 'alliance'] as const) {
      const held = end.systems.filter((s) => s.control === faction);
      if (!end.winner) expect(held.length).toBeGreaterThan(0);
    }
    // And no island was left holding somebody else's works.
    for (const system of end.systems) {
      for (const facility of system.facilities) {
        if (system.control === 'neutral') continue;
        expect(facility.owner, `${system.name}/${facility.type}`).toBe(system.control);
      }
    }
    void countFacilities;
  });

  /**
   * The bug that cost the Crown twenty-four wars in a row.
   *
   * An officer who finishes a spell ashore is asked what to do next, and the
   * question goes to the player when it is the player's side. In observe mode
   * there is no player, so every Crown officer who landed anywhere was handed
   * a question nobody answered and stood on that quay until somebody lifted
   * them off it. Two thirds of the corps ended in irons and the recruiting,
   * the research and the war went with it.
   */
  it('answers its own officers instead of leaving them on the quay', () => {
    const end = run(setObserving(generateGalaxy(77, 'empire'), true), 400);
    expect(end.pendingDecisions).toHaveLength(0);
    const mine = end.characters.filter((c) => c.faction === 'empire');
    /*
     * Nobody stuck ashore for months on somebody else's quay: the opponent's
     * patience is four spells, and this side is played the same way. Yard work
     * and a posting are the exempt pair on purpose — both are done on ground
     * you hold, where nobody is hunting you and the work genuinely never runs
     * out — so they are not what this is about.
     */
    for (const officer of mine) {
      if (officer.mission?.type === 'research' || officer.mission?.type === 'command') continue;
      expect(officer.mission?.cycles ?? 0, officer.name).toBeLessThanOrEqual(5);
    }
    // And the corps is still a corps.
    const irons = mine.filter((c) => c.status === 'captured').length;
    expect(irons).toBeLessThan(mine.length);
  });

  it('fights its own battles instead of stopping the clock on a sheet', () => {
    const end = run(setObserving(generateGalaxy(77, 'empire'), true), 400);
    // A battle sheet is a question for the player. Watching, there is nobody
    // to ask, so actions are fought in full and never handed over.
    expect(end.battle).toBeUndefined();
  });
});

describe('a prisoner is held until somebody comes', () => {
  it('is not let go by the clock, however long it runs', () => {
    const state = generateGalaxy(501, 'empire');
    const who = state.characters.find((c) => c.faction === 'alliance')!;
    who.status = 'captured';
    who.mission = undefined;
    who.locationSystemId = state.factions.empire.hqSystemId;
    // With nobody able to come for them: the Confederacy cannot see the island
    // the cells are on, so no rescue is possible and the only thing left that
    // could free them is a clock. There is no clock.
    //
    // Isolated on purpose — the first version of this test just waited a year
    // and the prisoner walked out on day ninety, because the opponent had gone
    // and got them, which is the rule working rather than failing.
    const gaol = state.systems.find((s) => s.id === who.locationSystemId)!;
    gaol.explored.alliance = false;
    let next = state;
    // A year. The old rule opened the door at sixty days.
    for (let d = 0; d < 365 && !next.winner; d++) {
      next = advanceDay(next);
      const cell = next.systems.find((s) => s.id === gaol.id)!;
      cell.explored.alliance = false;
    }
    const after = next.characters.find((c) => c.id === who.id)!;
    expect(after.status).toBe('captured');
  });

  /**
   * The whole reason the clock could be cut: there is a rescue errand, and
   * from 16 September the opponent knows to use it. Without this the change
   * would simply be "the Crown wins".
   *
   * It used to assert all six got out. Since the watch went in on 17 September
   * the Crown's seat is the hardest gaol in the world — six companies, a loyal
   * town, and every raid priced against all of it — so *going after them* is
   * the rule under test and *getting them out* is a real operation that can
   * fail. Measured over twenty-four seeds: a rescue mounted every single time,
   * and thirteen of twenty-four prisoners out of Highwater itself.
   */
  it('is gone after by the opponent, and mostly got out', () => {
    let freed = 0;
    let tried = 0;
    const seeds = [8000, 8001, 8002, 8003, 8004, 8005, 8006, 8007];
    for (const seed of seeds) {
      let state = generateGalaxy(seed, 'empire');
      for (let d = 0; d < 60; d++) state = advanceDay(state);
      const victim = state.characters.find(
        (c) => c.faction === 'alliance' && c.status !== 'captured',
      )!;
      victim.status = 'captured';
      victim.mission = undefined;
      victim.locationSystemId = state.factions.empire.hqSystemId;
      const gaol = state.systems.find((s) => s.id === victim.locationSystemId)!;
      gaol.explored.alliance = true;
      const id = victim.id;
      let attempted = false;
      for (let d = 0; d < 400 && !state.winner; d++) {
        state = advanceDay(state);
        if (state.characters.some((c) => c.faction === 'alliance' && c.mission?.type === 'rescue')) {
          attempted = true;
        }
        if (state.characters.find((c) => c.id === id)!.status !== 'captured') {
          freed += 1;
          break;
        }
      }
      if (attempted) tried += 1;
    }
    // Somebody always comes.
    expect(tried).toBe(seeds.length);
    // And more often than not they get them out, even from the capital.
    expect(freed).toBeGreaterThan(seeds.length / 3);
  });
});
