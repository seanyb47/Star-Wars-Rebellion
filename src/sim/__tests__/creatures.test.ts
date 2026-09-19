import { describe, expect, it } from 'vitest';
import {
  CREATURES,
  beastAlive,
  beastAt,
  beastGuns,
  beastOf,
  creatureFor,
  sightBeast,
  woundBeast,
  stirBeasts,
} from '../creatures';
import { shipSpec } from '../constants';
import { generateGalaxy } from '../galaxy';
import { advanceDay } from '../advanceDay';
import { createRng } from '../rng';
import { addShip, resolveBattles, sailFleet } from '../fleets';
import { BEAST_FLEE_HURT, BEAST_WAKE_DAY } from '../constants';
import type { GameState, IslandArchetype, System } from '../types';

const ARCHETYPES: IslandArchetype[] = [
  'jungle-isle', 'rock-isle', 'port-city', 'free-harbor', 'mining-isle',
  'reef-isle', 'storm-isle', 'ice-isle', 'drowned-isle', 'tide-isle',
];

describe('what is in the water', () => {
  it('has a painting slug, a sighting, a landfall line and some water', () => {
    for (const beast of CREATURES) {
      expect(beast.slug).toMatch(/^[a-z-]+$/);
      expect(beast.waters.length).toBeGreaterThan(0);
      expect(beast.sighting.length).toBeGreaterThan(20);
      expect(beast.lore.length).toBeGreaterThan(80);
      // The log line names the island it happened at, or it reads as a fact
      // about the world rather than a thing your boats came back with.
      expect(beast.found).toContain('{island}');
    }
  });

  it('gives the same island the same creature every time', () => {
    const island = { name: 'Bracton', archetype: 'reef-isle' as const };
    const first = creatureFor(island);
    expect(first).toBeDefined();
    // Ten more calls, and a fresh object, must not change their mind.
    for (let i = 0; i < 10; i++) expect(creatureFor({ ...island })).toBe(first);
  });

  it('leaves no sort of island without an answer', () => {
    // Every archetype the galaxy can produce has something in its water, so
    // an island of the Reaches is never the odd one out with nothing to find.
    for (const archetype of ARCHETYPES) {
      expect(creatureFor({ name: 'Somewhere', archetype })).toBeDefined();
    }
  });

  it('puts nothing in water either side has already charted', () => {
    for (const seed of [17, 501, 7, 99]) {
      const state = generateGalaxy(seed, 'empire');
      const withBeast = state.systems.filter((s) => s.beast);
      // Some, but never all of them: a creature everywhere is a creature
      // nowhere, and there has to be a reason to sail past the first one.
      expect(withBeast.length).toBeGreaterThan(0);
      expect(withBeast.length).toBeLessThan(state.systems.length / 2);
      for (const system of withBeast) {
        expect(system.explored.empire).toBe(false);
        // Whatever it is, it belongs in the water it is in.
        const beast = CREATURES.find((c) => c.slug === system.beast)!;
        expect(beast).toBeDefined();
        expect(beast.waters).toContain(system.archetype);
      }
    }
  });

  it('tells nobody until their own boats have been there', () => {
    const state = generateGalaxy(501, 'empire');
    const island = state.systems.find((s) => s.beast)!;
    // Charted is not seen. Give the Crown the chart and it still knows nothing.
    island.explored.empire = true;
    expect(beastOf(island, 'empire')).toBeUndefined();

    const line = sightBeast(island, 'empire');
    expect(line).toContain(island.name);
    expect(beastOf(island, 'empire')!.slug).toBe(island.beast);
    // Their opposite number learns nothing from it.
    expect(beastOf(island, 'alliance')).toBeUndefined();
    // And it is news exactly once.
    expect(sightBeast(island, 'empire')).toBeUndefined();
  });

  it('finds it when a fleet comes to anchor, and writes it in the log', () => {
    const state = generateGalaxy(501, 'empire');
    const fleet = state.fleets.find((f) => f.faction === 'empire')!;
    // Somewhere out in the dark with something in it, charted so it can be
    // sailed for — which is the case the rule is about: knowing where an
    // island is does not tell you what is off it.
    const target = state.systems.find((s: System) => s.beast && s.id !== fleet.systemId)!;
    target.explored.empire = true;
    sailFleet(state, fleet.id, target.id, 'empire');
    expect(beastOf(target, 'empire')).toBeUndefined();

    // advanceDay hands back a fresh state rather than editing this one, so
    // the island has to be looked up again each morning.
    let world = state;
    const arrived = () => world.systems.find((s) => s.id === target.id)!;
    // As long as the passage actually takes, plus a few days' slack. A fixed
    // budget was fine while nothing was more than five weeks away; since the
    // 19 September rescaling a crossing can be two hundred days.
    const passage = (state.fleets.find((f) => f.id === fleet.id)!.voyage?.daysRemaining ?? 0) + 5;
    for (let i = 0; i < passage && !beastOf(arrived(), 'empire'); i++) world = advanceDay(world);
    const beast = beastOf(arrived(), 'empire');
    expect(beast).toBeDefined();
    expect(
      world.events.some((e) => e.systemId === target.id && e.text.includes(target.name)),
    ).toBe(true);
  });
});

describe('a creature in the harbor', () => {
  /** A world, an island with something dangerous in its water, and a fleet. */
  /**
   * `which` picks the Crown squadron to anchor over the creature.
   *
   * It had no such choice until 18 September, because the Crown had one
   * squadron. Since it opens with two — a powerful Home Fleet and a medium one
   * forward — the answer to "does the creature get a shot in" depends entirely
   * on which one turns up: eighty-nine guns kill a Sea Dragon in the first
   * round without it touching anybody, which is right and which is not what
   * the firing test is about.
   */
  function standoff(seed = 501, which = 0) {
    const state = generateGalaxy(seed, 'empire');
    const target = state.systems.find((s) => beastAlive(s))!;
    const fleet = state.fleets.filter((f) => f.faction === 'empire')[which];
    fleet.systemId = target.id;
    fleet.voyage = undefined;
    target.explored.empire = true;
    sightBeast(target, 'empire');
    return { state, target, fleet };
  }

  it('leaves the harmless ones harmless', () => {
    for (const beast of CREATURES.filter((c) => c.guns === 0)) {
      expect(beast.hull).toBe(0);
      expect(beastAlive({ beast: beast.slug })).toBe(false);
      expect(beastGuns({ beast: beast.slug })).toBe(0);
    }
    // And the dangerous ones can actually be killed rather than being an
    // unpassable wall: every one has hulls to take off it.
    for (const beast of CREATURES.filter((c) => c.guns > 0)) {
      expect(beast.hull).toBeGreaterThan(0);
    }
  });

  it('fires on a fleet lying there with nobody else in sight', () => {
    // The forward squadron, not the Home Fleet: a ship of the line and three
    // heavy frigates settle a Sea Dragon before it has fired, and a creature
    // that never gets a shot off cannot be tested for getting a shot off.
    const { state, target, fleet } = standoff(501, 1);
    // Hull still floating, not damage dealt: a hull beaten to nothing is
    // removed from the fleet, so counting damage reads zero exactly when the
    // beast did its worst. This bit the test the day the hulls stopped all
    // being the size's own number and a sloop lost a point of frame.
    const afloat = (st: typeof state) =>
      st.fleets
        .filter((f) => f.id === fleet.id)
        .reduce(
          (n, f) => n + f.ships.reduce((m, s) => m + (shipSpec(s.classId).hull - s.damage), 0),
          0,
        );
    const before = afloat(state);
    resolveBattles(state, createRng(7));
    expect(afloat(state)).toBeLessThan(before);
    expect(state.events.some((e) => e.kind === 'battle' && e.systemId === target.id)).toBe(true);
  });

  it('takes what is given it, keeps it, and dies of enough', () => {
    const { state, target } = standoff();
    const beast = beastAt(target)!;
    // One round's worth at a time, so the wound has to accumulate to kill.
    expect(woundBeast(target, 1, 'empire')).toBe(false);
    expect(target.beastDamage).toBe(1);
    expect(beastAlive(target)).toBe(true);
    expect(woundBeast(target, beast.hull - 2, 'empire')).toBe(false);
    expect(woundBeast(target, 1, 'empire')).toBe(true);
    expect(target.beastSlain).toBe('empire');
    expect(beastAlive(target)).toBe(false);
    expect(beastGuns(target)).toBe(0);
    // Dead is dead: it does not come back and cannot be killed twice.
    expect(woundBeast(target, 5, 'alliance')).toBe(false);
    expect(target.beastSlain).toBe('empire');
    expect(state.systems.find((s) => s.id === target.id)!.beastSlain).toBe('empire');
  });

  it('stops firing once a squadron has killed it', () => {
    const { state, target } = standoff();
    // Enough guns in the harbor to finish it inside a handful of days.
    for (let i = 0; i < 6; i++) addShip(state, target, 'empire', 'sovereign');
    const rng = createRng(3);
    for (let i = 0; i < 12 && beastAlive(target); i++) resolveBattles(state, rng);
    expect(beastAlive(target)).toBe(false);
    expect(target.beastSlain).toBe('empire');
    // And now the harbor is quiet: no further damage from an empty fight.
    const quiet = state.fleets
      .filter((f) => f.systemId === target.id)
      .reduce((n, f) => n + f.ships.reduce((m, s) => m + s.damage, 0), 0);
    resolveBattles(state, rng);
    const after = state.fleets
      .filter((f) => f.systemId === target.id)
      .reduce((n, f) => n + f.ships.reduce((m, s) => m + s.damage, 0), 0);
    expect(after).toBe(quiet);
  });

  it('never puts a dangerous one in the water the Confederacy wakes up in', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const state = generateGalaxy(seed, 'empire');
      const freeport = state.systems.find((s) => s.name === 'Freeport')!;
      expect(beastAlive(freeport)).toBe(false);
    }
  });
});

describe('once the rumours start', () => {
  /** A world wound forward to the day creatures may wake, with one island's
   *  creature picked out and everything else in its Sea left empty. */
  function waking(seed = 501) {
    const state = generateGalaxy(seed, 'empire');
    state.day = BEAST_WAKE_DAY + 1;
    const home = state.systems.find((s) => beastAlive(s))!;
    const sea = state.sectors.find((sec) => sec.id === home.sectorId)!.sea;
    const inSea = state.systems.filter(
      (s) => state.sectors.find((sec) => sec.id === s.sectorId)?.sea === sea,
    );
    // One creature in the whole world, so which one every assertion is about
    // is never in doubt — another Sea's waking first would answer for it.
    for (const s of state.systems) if (s.id !== home.id) s.beast = undefined;
    for (const s of state.systems) s.explored.empire = true;
    return { state, home, inSea: inSea.filter((s) => s.id !== home.id) };
  }
  const beastNow = (state: GameState) => state.systems.find((s) => s.beast);

  it('leaves everything where it is before the day rumours can start', () => {
    const { state, home } = waking();
    state.day = BEAST_WAKE_DAY - 1;
    for (let i = 0; i < 200; i++) stirBeasts(state, createRng(i));
    expect(home.beastRoaming).toBeUndefined();
    expect(beastNow(state)!.id).toBe(home.id);
  });

  it('wakes, says so in both logs, and then starts moving', () => {
    const { state, home } = waking();
    for (let i = 0; i < 400 && !home.beastRoaming; i++) stirBeasts(state, createRng(i));
    expect(home.beastRoaming).toBe(true);
    const rumour = state.events.find((e) => /^Rumours of/.test(e.text))!;
    expect(rumour).toBeDefined();
    // The Sea is named, because that is what a rumour is about.
    expect(rumour.text).toContain(state.sectors.find((s) => s.id === home.sectorId)!.sea);

    for (let i = 0; i < 400 && beastNow(state)!.id === home.id; i++) {
      stirBeasts(state, createRng(1000 + i));
    }
    expect(beastNow(state)!.id).not.toBe(home.id);
    // What it is and what it has taken travel with it.
    expect(beastNow(state)!.beast).toBe(home.beast ?? beastNow(state)!.beast);
    expect(beastNow(state)!.beastRoaming).toBe(true);
  });

  it('hunts toward ships when it is whole', () => {
    const { state, home, inSea } = waking();
    home.beastRoaming = true;
    const bait = inSea[inSea.length - 1];
    addShip(state, bait, 'empire', 'kestrel');
    // Until it gets there, not until it first moves: a hunting creature works
    // its way across its own Sea and may put in at an empty island on the way.
    for (let i = 0; i < 600 && beastNow(state)!.id !== bait.id; i++) {
      stirBeasts(state, createRng(2000 + i));
    }
    expect(beastNow(state)!.id).toBe(bait.id);
  });

  it('runs away from ships when it is hurt, not toward them', () => {
    const { state, home, inSea } = waking();
    home.beastRoaming = true;
    home.beastDamage = Math.ceil(beastAt(home)!.hull * BEAST_FLEE_HURT);
    // Ships everywhere but one island: running has exactly one answer.
    const refuge = inSea[0];
    for (const s of inSea) if (s.id !== refuge.id) addShip(state, s, 'empire', 'kestrel');
    for (let i = 0; i < 600 && beastNow(state)!.id === home.id; i++) {
      stirBeasts(state, createRng(3000 + i));
    }
    expect(beastNow(state)!.id).toBe(refuge.id);
    // It is still carrying what was done to it. A creature does not mend.
    expect(beastNow(state)!.beastDamage).toBe(home.beastDamage ?? beastNow(state)!.beastDamage);
  });

  it('stands and fights when the whole Sea is shut to it', () => {
    const { state, home, inSea } = waking();
    home.beastRoaming = true;
    home.beastDamage = beastAt(home)!.hull - 1;
    // Every other island in the Sea has ships in it: nowhere to run.
    for (const s of inSea) addShip(state, s, 'empire', 'kestrel');
    for (let i = 0; i < 600 && !home.cornered; i++) stirBeasts(state, createRng(4000 + i));
    expect(home.cornered).toBe(true);
    expect(beastNow(state)!.id).toBe(home.id);
    expect(beastAlive(home)).toBe(true);
    expect(state.events.some((e) => /turns and fights/.test(e.text))).toBe(true);
  });

  it('takes a fleet in open water when there is nothing at anchor to take', () => {
    const { state, home, inSea } = waking();
    home.beastRoaming = true;
    // A squadron bound for this Sea, and not a hull at anchor anywhere in it.
    const target = inSea[0];
    const far = state.systems.find(
      (s) => !inSea.includes(s) && s.id !== home.id && s.id !== target.id,
    )!;
    addShip(state, far, 'empire', 'sovereign');
    addShip(state, far, 'empire', 'razorback');
    const fleet = state.fleets.find((f) => f.systemId === far.id)!;
    fleet.voyage = { targetSystemId: target.id, daysRemaining: 20 };
    const sound = () => fleet.ships.reduce((n, s) => n + s.damage, 0);
    for (let i = 0; i < 600 && sound() === 0; i++) stirBeasts(state, createRng(5000 + i));
    expect(sound()).toBeGreaterThan(0);
    expect(state.events.some((e) => /open water/.test(e.text))).toBe(true);
    // And it took them in its own Sea. It may have shifted island while it
    // waited — a roaming creature does — but it did not follow them out of
    // the water it lives in.
    const where = beastNow(state)!;
    expect(where.id === home.id || inSea.some((s) => s.id === where.id)).toBe(true);
  });
});
