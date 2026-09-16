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
    // Both sides still exist, still hold ground, and the day count moved.
    expect(end.day).toBeGreaterThan(200);
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
});
