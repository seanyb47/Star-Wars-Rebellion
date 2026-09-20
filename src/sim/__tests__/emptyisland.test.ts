import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { createRng } from '../rng';
import { addShip, assault, assaultError } from '../fleets';
import { raiseWorksError } from '../build';
import { getSystem } from '../helpers';
import type { GameState, PlayableFaction, System } from '../types';

/**
 * Nobody lives here.
 *
 * Sean's playtest, days 1–150: *"Empty islands after a landing: Coralhome
 * (uninhabited) shows MUTINY, and the assault report says 'the people did not
 * want this.' It also can't be picked as a build location, even though the
 * Garrison tab says 'finish any building and the island settles.'"*
 *
 * All three are one bug. The landing set `uprising` from the size of the
 * garrison it left, which is a rule about whether the islanders will stand for
 * it; a rock with no islanders on it has nobody to rise, and the build picker
 * hides islands in mutiny, so a spurious flag took the rock off the list of
 * places you could settle — the one thing you take a rock for.
 */
function rock(state: GameState) {
  const empty = state.systems.find((s) => !s.populated && s.control !== 'alliance')!;
  empty.control = 'neutral';
  empty.garrison = 0;
  empty.facilities = [];
  empty.explored.alliance = true;
  return empty;
}

/** One hull off the beach with a single troop aboard, and the boats go in. */
function landOn(state: GameState, island: System, faction: PlayableFaction, troops: number) {
  const fleet = addShip(state, island, faction, 'reefwalker');
  fleet.voyage = undefined;
  fleet.troops = troops;
  expect(assaultError(state, fleet.id, faction)).toBeNull();
  assault(state, fleet.id, createRng(5), faction);
  return fleet;
}

describe('an island with nobody on it', () => {
  it('does not rise against the landing party that took it', () => {
    const state = generateGalaxy(7, 'alliance');
    state.fleets.length = 0;
    const island = rock(state);
    // One troop: fewer than a populated island of the same standing would
    // demand, which is exactly the case that used to raise the flag.
    landOn(state, island, 'alliance', 1);

    const after = getSystem(state, island.id);
    expect(after.control).toBe('alliance');
    expect(after.populated).toBe(false);
    expect(after.uprising).toBe(false);
  });

  it('can be built on the day after it is taken', () => {
    const state = generateGalaxy(7, 'alliance');
    state.fleets.length = 0;
    const island = rock(state);
    landOn(state, island, 'alliance', 1);

    // A wall, raised on the rock itself. It used to need a works somewhere
    // else of theirs to order it and then ship the builders over; since the
    // construction yard was cut the island raises its own, which is the whole
    // point of the change — a rock you have just taken is not a dead end.
    state.factions.alliance.gold = 2000;
    const after = getSystem(state, island.id);
    after.slots = Math.max(after.slots, 4);
    expect(raiseWorksError(state, after.id, 'fort', 'alliance')).toBeNull();
  });

  it('does not tell the player what its people think of the landing', () => {
    const state = generateGalaxy(7, 'alliance');
    state.fleets.length = 0;
    const island = rock(state);
    landOn(state, island, 'alliance', 1);

    const flip = state.events.find((e) => e.kind === 'flip' && e.systemId === island.id)!;
    expect(flip).toBeDefined();
    expect(flip.text).not.toContain('the people are sullen');
    const lines = flip.report?.strategic ?? [];
    expect(lines.join(' ')).not.toContain('the people did not want this');
    expect(lines.join(' ')).toContain('Nobody lives there');
  });
});
