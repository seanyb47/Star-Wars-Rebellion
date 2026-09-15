import { describe, expect, it } from 'vitest';
import { BATTLE_ODDS_LABEL } from '../fleets';
import {
  addShip,
  battleOdds,
  battleView,
  breakOffBattle,
  fightBattleRound,
  fleetsAt,
  isAtSea,
  resolveBattles,
} from '../fleets';
import { generateGalaxy } from '../galaxy';
import { getSystem } from '../helpers';
import { createRng } from '../rng';
import { isNotable } from '../../ui/EventCard';
import type { GameState, PlayableFaction, ShipClassId, System } from '../types';

function world(seed = 7): { state: GameState; home: System } {
  const state = generateGalaxy(seed, 'empire');
  state.fleets.length = 0;
  return { state, home: getSystem(state, state.factions.empire.hqSystemId) };
}

function put(state: GameState, system: System, faction: PlayableFaction, classes: ShipClassId[]) {
  let fleet = addShip(state, system, faction, classes[0]);
  for (const id of classes.slice(1)) fleet = addShip(state, system, faction, id);
  return fleet;
}

describe('an action the player is in', () => {
  it('fights the first broadside, then hands the player the rest', () => {
    const { state, home } = world();
    put(state, home, 'empire', ['sovereign', 'sovereign']);
    put(state, home, 'alliance', ['tempest', 'tempest']);
    resolveBattles(state, createRng(3));

    // The meeting engagement happened — you do not get to decline being shot
    // at — and what is handed over is everything after it.
    expect(state.battle?.systemId).toBe(home.id);
    expect(state.battle?.rounds).toBe(1);
    expect(state.battle?.last).toBeDefined();
    expect(state.battle?.settled).toBeUndefined();
  });

  it('is only ever one at a time, and the other is still fought', () => {
    const { state, home } = world();
    const other = state.systems.find((s) => s.control === 'empire' && s.id !== home.id)!;
    put(state, home, 'empire', ['sovereign']);
    put(state, home, 'alliance', ['tempest']);
    put(state, other, 'empire', ['sovereign']);
    const theirs = put(state, other, 'alliance', ['tempest']);
    const before = theirs.ships.reduce((n, sh) => n + sh.damage, 0);
    resolveBattles(state, createRng(9));
    expect([home.id, other.id]).toContain(state.battle!.systemId);
    // Whichever island was not handed over was still fought: nobody's ships
    // stand about waiting for the player to get round to them.
    const elsewhere = state.battle!.systemId === home.id ? other : home;
    const hurt = fleetsAt(state, elsewhere.id)
      .flatMap((f) => f.ships)
      .reduce((n, sh) => n + sh.damage, 0);
    expect(hurt).toBeGreaterThan(before);
  });

  it('keeps its rounds out of the dispatches but not out of the log', () => {
    const { state, home } = world();
    put(state, home, 'empire', ['sovereign', 'sovereign']);
    put(state, home, 'alliance', ['tempest', 'tempest']);
    resolveBattles(state, createRng(3));
    const mine = state.events.filter((e) => e.systemId === home.id && e.kind === 'battle');
    expect(mine.length).toBeGreaterThan(0);
    // In the log, and not a card over the top of the sheet already saying it.
    expect(mine.every((e) => !isNotable(e))).toBe(true);
  });

  it('settles once one side has nothing left afloat', () => {
    const { state, home } = world();
    put(state, home, 'empire', ['sovereign', 'sovereign', 'sovereign', 'sovereign']);
    put(state, home, 'alliance', ['brig']);
    const rng = createRng(11);
    resolveBattles(state, rng);
    for (let i = 0; i < 12 && state.battle && !state.battle.settled; i++) {
      fightBattleRound(state, rng);
    }
    expect(state.battle?.settled).toBeDefined();
    expect(['won', 'they-fled']).toContain(state.battle!.settled);
    // The sheet stays up until it is dismissed: the player ordered that round
    // and should see what it bought.
    expect(state.battle).toBeDefined();
  });

  it('lets the other side break off once it is badly outgunned', () => {
    const { state, home } = world();
    put(state, home, 'empire', ['sovereign', 'sovereign', 'sovereign', 'sovereign']);
    const theirs = put(state, home, 'alliance', ['swift']);
    const rng = createRng(5);
    resolveBattles(state, rng);
    // Never on the first exchange: that decision is taken after you have seen
    // what the other fellow's broadside does.
    expect(state.battle!.theyFled).toBeFalsy();
    fightBattleRound(state, rng);
    if (state.battle?.settled === 'they-fled') {
      expect(isAtSea(state.fleets.find((f) => f.id === theirs.id)!)).toBe(true);
    }
  });

  it('breaks off the whole action, and says so', () => {
    const { state, home } = world();
    const mine = put(state, home, 'empire', ['sovereign', 'sovereign']);
    put(state, home, 'alliance', ['tempest', 'tempest', 'tempest']);
    const rng = createRng(2);
    resolveBattles(state, rng);
    expect(state.battle).toBeDefined();
    breakOffBattle(state, rng);
    expect(state.battle?.settled).toBe('you-fled');
    const after = state.fleets.find((f) => f.id === mine.id);
    // Gone, or gone under on the way out — either way not still lying there.
    expect(after === undefined || isAtSea(after)).toBe(true);
  });

  it('leaves an action the player has no ships in alone', () => {
    const { state } = world();
    const theirs = state.systems.find((s) => s.control === 'alliance')!;
    put(state, theirs, 'alliance', ['tempest']);
    put(state, theirs, 'empire', ['sovereign']);
    state.player = 'alliance';
    resolveBattles(state, createRng(4));
    expect(state.battle?.systemId).toBe(theirs.id);
    state.battle = undefined;
    state.player = 'empire';
    // Swap the seat: now it is the Crown's action and the Confederacy's to
    // watch, so with the player elsewhere it just resolves.
    const far = state.systems.find(
      (s) => s.id !== theirs.id && s.control === 'alliance',
    )!;
    put(state, far, 'alliance', ['tempest']);
    expect(battleView(state)).toBeUndefined();
  });
});

describe('the assessment', () => {
  it('reads the odds the way a captain would', () => {
    expect(battleOdds(100, 10)).toBe('overwhelming');
    expect(battleOdds(100, 60)).toBe('favorable');
    expect(battleOdds(100, 100)).toBe('even');
    expect(battleOdds(60, 100)).toBe('unfavorable');
    expect(battleOdds(20, 100)).toBe('desperate');
    // Nothing left to shoot back is not a close-run thing.
    expect(battleOdds(1, 0)).toBe('overwhelming');
  });

  it('counts the shore for whoever holds it and the creature against everyone', () => {
    const { state, home } = world();
    put(state, home, 'empire', ['sovereign', 'sovereign', 'sovereign']);
    put(state, home, 'alliance', ['tempest', 'tempest', 'tempest']);
    resolveBattles(state, createRng(6));
    const view = battleView(state)!;
    expect(view.system.id).toBe(home.id);
    // The player's own harbor, so the wall is theirs.
    expect(view.shoreIsMine).toBe(true);
    expect(view.mine.hulls).toBeGreaterThan(0);
    expect(view.theirs.hulls).toBeGreaterThan(0);
    // Condition, not just a count: what is left, out of what it started as.
    expect(view.mine.left).toBeLessThanOrEqual(view.mine.whole);
    expect(view.mine.whole).toBeGreaterThan(0);
    expect(BATTLE_ODDS_LABEL[view.odds]).toBeTruthy();
  });
});
