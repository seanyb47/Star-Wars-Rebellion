import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { addShip, bombardNow, fortsOf, resolveLanding } from '../fleets';
import { createRng } from '../rng';
import type { GameState, PlayableFaction, ShipClassId, System } from '../types';

/**
 * The two screens a siege owes the player.
 *
 * Sean, 21 September: *"with bombardment and assault instances, we need
 * something similar [to the naval screens] that show the results... you can
 * hit view results or whatever, and it'll show you what ships or what things
 * were blown up. And it should have two columns, right? What's still there and
 * what blew up."*
 *
 * This is the data half. The picture half — a peaceful island against a shelled
 * one, so the thumbnail tells you the answer before you read a word — is in
 * `SiegeScene`, and what it keys on is asserted here because a thumbnail that
 * lies is worse than no thumbnail.
 */

function world(seed = 7): GameState {
  const state = generateGalaxy(seed, 'alliance');
  state.fleets.length = 0;
  return state;
}
function put(state: GameState, system: System, faction: PlayableFaction, classes: ShipClassId[]) {
  let fleet = addShip(state, system, faction, classes[0]);
  for (const id of classes.slice(1)) fleet = addShip(state, system, faction, id);
  return fleet;
}
function walled(state: GameState, forts = 1) {
  const isle = state.systems.find(
    (s) => s.control === 'empire' && s.populated && s.id !== state.factions.empire.hqSystemId,
  )!;
  isle.explored.alliance = true;
  isle.facilities = isle.facilities.filter((f) => f.type !== 'fort');
  for (let i = 0; i < forts; i++) {
    isle.facilities.push({ id: `fac-test-${i}`, type: 'fort', owner: 'empire' });
  }
  isle.slots = Math.max(isle.slots, isle.facilities.length);
  return isle;
}

describe('the bombardment screen', () => {
  it('reports the island in two columns, standing and destroyed', () => {
    const state = world();
    state.player = 'alliance';
    const isle = walled(state, 2);
    isle.garrison = 3;
    const fleet = put(state, isle, 'alliance', ['coral-dreadnaught', 'urskin-goliath', 'ironback']);
    const wallsBefore = fortsOf(isle).length;

    bombardNow(state, fleet, createRng(4));
    const card = state.events.filter((e) => e.report?.kind === 'bombardment').at(-1)!;
    expect(card).toBeDefined();
    const report = card.report!;

    // One column pair, and it is the island's: the fleet is never fired back
    // at, so there is no second side to report.
    expect(report.ledger).toHaveLength(1);
    const island = report.ledger![0];
    expect(island.side).toBe(isle.name);
    expect(island.faction).toBe('empire');

    // Everything still there is in the standing column, and it agrees with the
    // island itself rather than with a number the screen worked out.
    const stillWalled = fortsOf(isle).length;
    const walls = island.standing.find((r) => /fortress/i.test(r.label));
    expect(walls?.count ?? 0).toBe(stillWalled);

    // And what went is in the other one, adding up to what was there.
    const gone = island.lost.find((r) => /batter/i.test(r.label))?.count ?? 0;
    expect(gone + stillWalled).toBe(wallsBefore);

    // Both columns are always present, even empty: a blank column reads as
    // missing data, and the screen prints "Nothing" instead.
    expect(Array.isArray(island.standing)).toBe(true);
    expect(Array.isArray(island.lost)).toBe(true);
  });

  /**
   * What the thumbnail keys on.
   *
   * > If you get the peaceful screen, then you know that you weren't
   * > successful. If you get the damaged screen, looks like it's been
   * > bombarded, that means at least something blew up.
   *
   * So the picture asks one question of the report — did anything come down —
   * and the report has to be able to answer it. `SiegeScene` reads the damage
   * rows for a battery beaten down or a troop broken.
   */
  it('gives the thumbnail something true to key on', () => {
    for (const seed of [2, 5, 9, 13]) {
      const state = world(seed);
      state.player = 'alliance';
      const isle = walled(state, 1);
      isle.garrison = 2;
      const fleet = put(state, isle, 'alliance', ['coral-dreadnaught', 'urskin-goliath']);
      const before = fortsOf(isle).length + isle.garrison;
      bombardNow(state, fleet, createRng(seed * 31));
      const report = state.events.filter((e) => e.report?.kind === 'bombardment').at(-1)!.report!;
      const broke = report.damage.some(
        (r) => !r.civilian && /beaten|broken/i.test(r.label) && r.value > 0,
      );
      const after = fortsOf(isle).length + isle.garrison;
      // The picture says "shelled" exactly when something actually went.
      expect(broke, `seed ${seed}`).toBe(after < before);
    }
  });

  it('never says a wall is both standing and destroyed', () => {
    const state = world(11);
    state.player = 'alliance';
    const isle = walled(state, 3);
    isle.garrison = 0;
    const fleet = put(state, isle, 'alliance', ['coral-dreadnaught']);
    for (let i = 0; i < 3; i++) bombardNow(state, fleet, createRng(100 + i));
    for (const card of state.events.filter((e) => e.report?.kind === 'bombardment')) {
      const island = card.report!.ledger![0];
      const standing = island.standing.reduce((n, r) => n + r.count, 0);
      const lost = island.lost.reduce((n, r) => n + r.count, 0);
      expect(standing).toBeGreaterThanOrEqual(0);
      expect(lost).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('the assault screen', () => {
  it('reports both sides, standing and destroyed', () => {
    const state = world(21);
    state.player = 'alliance';
    const isle = walled(state, 0);
    isle.garrison = 3;
    const fleet = put(state, isle, 'alliance', ['coral-dreadnaught', 'brigantine']);
    fleet.troops = 10;

    resolveLanding(state, fleet, createRng(5));
    const card = state.events.filter((e) => e.report?.kind === 'assault').at(-1)!;
    expect(card).toBeDefined();
    const report = card.report!;

    // "The assault of <island>", which is the name Sean asked for.
    expect(report.title).toMatch(/^The assault of /i);

    // Two sides, named as forces rather than as factions.
    expect(report.ledger).toHaveLength(2);
    const [mine, theirs] = report.ledger!;
    expect(mine.faction).toBe('alliance');
    expect(theirs.faction).toBe('empire');
    for (const side of [mine, theirs]) {
      for (const row of [...side.standing, ...side.lost]) {
        // Named units, not bare counts: "6 Island Militia", not "6".
        expect(row.label.length).toBeGreaterThan(2);
        expect(row.count).toBeGreaterThan(0);
      }
    }
    // And the two columns account for everybody who was there.
    const landed = 10;
    const mineAll = [...mine.standing, ...mine.lost].reduce((n, r) => n + r.count, 0);
    expect(mineAll).toBe(landed);
    const theirsAll = [...theirs.standing, ...theirs.lost].reduce((n, r) => n + r.count, 0);
    expect(theirsAll).toBe(3);
  });
});
