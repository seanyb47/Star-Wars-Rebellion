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
} from '../creatures';
import { generateGalaxy } from '../galaxy';
import { advanceDay } from '../advanceDay';
import { createRng } from '../rng';
import { addShip, resolveBattles, sailFleet } from '../fleets';
import type { IslandArchetype, System } from '../types';

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
    for (let i = 0; i < 40 && !beastOf(arrived(), 'empire'); i++) world = advanceDay(world);
    const beast = beastOf(arrived(), 'empire');
    expect(beast).toBeDefined();
    expect(
      world.events.some((e) => e.systemId === target.id && e.text.includes(target.name)),
    ).toBe(true);
  });
});

describe('a creature in the harbor', () => {
  /** A world, an island with something dangerous in its water, and a fleet. */
  function standoff(seed = 501) {
    const state = generateGalaxy(seed, 'empire');
    const target = state.systems.find((s) => beastAlive(s))!;
    const fleet = state.fleets.find((f) => f.faction === 'empire')!;
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
    const { state, target, fleet } = standoff();
    const before = fleet.ships.reduce((n, s) => n + s.damage, 0);
    resolveBattles(state, createRng(7));
    const after = state.fleets
      .filter((f) => f.id === fleet.id)
      .reduce((n, f) => n + f.ships.reduce((m, s) => m + s.damage, 0), 0);
    expect(after).toBeGreaterThan(before);
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
