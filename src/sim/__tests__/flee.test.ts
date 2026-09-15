import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { addShip, fleeBattle, fleeError, refugeFor } from '../fleets';
import { orderFlee } from '../commands';
import { createRng } from '../rng';
import type { GameState, ShipClassId } from '../types';

/** Two sides in one harbor, with the Crown's squadron ready to break off. */
function standoff(theirs: ShipClassId[] = ['tempest'], mine: ShipClassId[] = ['kestrel', 'sovereign']) {
  const state = generateGalaxy(501, 'empire');
  const isle = state.systems.find((s) => s.control === 'none' && !s.beast)!;
  state.fleets.length = 0;
  for (const c of mine) addShip(state, isle, 'empire', c);
  for (const c of theirs) addShip(state, isle, 'alliance', c);
  const fleet = state.fleets.find((f) => f.faction === 'empire')!;
  return { state, isle, fleet };
}

const hurt = (state: GameState, id: string) =>
  state.fleets.find((f) => f.id === id)?.ships.reduce((n, s) => n + s.damage, 0) ?? 0;

describe('breaking off', () => {
  it('always works, and runs for the nearest island you hold', () => {
    const { state, isle, fleet } = standoff();
    const refuge = refugeFor(state, fleet)!;
    expect(refuge.control).toBe('empire');
    // Nearest, not merely any: nothing of ours is closer.
    for (const s of state.systems.filter((x) => x.control === 'empire' && x.id !== refuge.id)) {
      expect(Math.hypot(s.x - isle.x, s.y - isle.y)).toBeGreaterThanOrEqual(
        Math.hypot(refuge.x - isle.x, refuge.y - isle.y) - 1e-9,
      );
    }
    fleeBattle(state, fleet.id, createRng(3), 'empire');
    expect(fleet.voyage?.targetSystemId).toBe(refuge.id);
    expect(fleet.voyage!.daysRemaining).toBeGreaterThan(0);
  });

  it('costs nothing at all when nothing present can reach', () => {
    // No long guns anywhere in the game yet, and no fort on a neutral island:
    // early disengagement is free, which is exactly the arc the spec wants.
    const { state, fleet } = standoff();
    fleeBattle(state, fleet.id, createRng(5), 'empire');
    expect(hurt(state, fleet.id)).toBe(0);
  });

  it('costs the slow hulls when something can', () => {
    const { state, isle, fleet } = standoff();
    // A creature is always able to reach a fleet under way — it is in the
    // water with you, and not being able to swim away from the Kraken is the
    // whole point of it.
    isle.beast = 'the-kraken';
    isle.beastSeen = { empire: true, alliance: false };
    isle.beastDamage = 0;
    isle.beastSlain = undefined;
    const hulls = fleet.ships.length;
    fleeBattle(state, fleet.id, createRng(9), 'empire');
    // What it cost, counting both halves: damage carried away, and hulls that
    // did not get away at all. A first-rate is a big mark and a bad swimmer,
    // so a retreat under a creature's guns can take the whole squadron — and
    // reading damage alone scores that as nothing, because there is nobody
    // left to be carrying it.
    const left = state.fleets.find((f) => f.id === fleet.id);
    const cost = hurt(state, fleet.id) + (hulls - (left?.ships.length ?? 0));
    expect(cost).toBeGreaterThan(0);
  });

  it('hurts a first-rate far more than a sloop on the way out', () => {
    // Speed is what a hull's escape is made of: 3 for a ship of the line
    // against 9 for a sloop, which is two or three parting shots against none
    // or one.
    let slow = 0;
    let quick = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const { state, isle, fleet } = standoff(['tempest'], ['sovereign', 'kestrel']);
      isle.beast = 'the-kraken';
      isle.beastSeen = { empire: true, alliance: false };
      isle.beastDamage = 0;
      isle.beastSlain = undefined;
      const big = fleet.ships.find((s) => s.classId === 'sovereign')!;
      const small = fleet.ships.find((s) => s.classId === 'kestrel')!;
      fleeBattle(state, fleet.id, createRng(seed), 'empire');
      slow += big.damage;
      quick += small.damage;
    }
    console.log(`over 60 retreats: first-rate took ${slow}, sloop took ${quick}`);
    expect(slow).toBeGreaterThan(quick);
  });

  it('refuses when there is nothing to run from, or nowhere to run to', () => {
    const { state, fleet } = standoff();
    // Nothing to run from: a squadron of ours alone in one of our own
    // harbors. Not the capital — it opens walled now, and its own battery is
    // something to break off from the moment somebody else is in the water.
    const alone = generateGalaxy(501, 'empire');
    const quiet = alone.systems.find(
      (s) => s.control === 'empire' && s.id !== alone.factions.empire.hqSystemId,
    )!;
    const mine = alone.fleets.find((f) => f.faction === 'empire')!;
    mine.systemId = quiet.id;
    expect(fleeError(alone, mine.id, 'empire')).toBe('Nothing to break off from.');
    // Nowhere to run to: nothing else is ours.
    for (const s of state.systems) if (s.control === 'empire') s.control = 'none';
    expect(fleeError(state, fleet.id, 'empire')).toBe('Nowhere to run to.');
    expect(orderFlee(state, fleet.id).error).toBe('Nowhere to run to.');
  });

  it('does not hold a squadron in harbor because a Lord is standing on the beach', () => {
    // The inverse of a rule that used to live here. A Lord was a hull and a
    // person at once, so one ashore pinned their ship and anything it was
    // sailing with. They are people now: where a Lord happens to be standing
    // has nothing to do with whether a squadron can break off.
    const state = generateGalaxy(501, 'alliance');
    const isle = state.systems.find((s) => s.control === 'alliance' && s.populated)!;
    const mine = addShip(state, isle, 'alliance', 'tempest');
    addShip(state, isle, 'empire', 'sovereign');
    const before = fleeError(state, mine.id, 'alliance');

    const lord = state.characters.find((c) => c.name.includes('Hale'))!;
    lord.locationSystemId = isle.id;
    lord.mission = { type: 'diplomacy', targetSystemId: isle.id, phase: 'working', daysRemaining: 3 };
    lord.status = 'on_mission';
    expect(fleeError(state, mine.id, 'alliance')).toBe(before);
  });
});
