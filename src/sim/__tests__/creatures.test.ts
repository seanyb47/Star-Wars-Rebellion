import { describe, expect, it } from 'vitest';
import { CREATURES, creatureFor } from '../creatures';
import { generateGalaxy } from '../galaxy';
import type { IslandArchetype } from '../types';

const ARCHETYPES: IslandArchetype[] = [
  'jungle-isle', 'rock-isle', 'port-city', 'free-harbor', 'mining-isle',
  'reef-isle', 'storm-isle', 'ice-isle', 'drowned-isle', 'tide-isle',
];

describe('what is in the water', () => {
  it('has a painting slug and some water for every creature', () => {
    for (const beast of CREATURES) {
      expect(beast.slug).toMatch(/^[a-z-]+$/);
      expect(beast.waters.length).toBeGreaterThan(0);
      expect(beast.sighting.length).toBeGreaterThan(20);
      expect(beast.lore.length).toBeGreaterThan(80);
    }
  });

  it('gives the same island the same creature every time', () => {
    const island = { name: 'Bracton', archetype: 'reef-isle' as const };
    const first = creatureFor(island);
    expect(first).toBeDefined();
    // Ten more calls, and a fresh object, must not change their mind.
    for (let i = 0; i < 10; i++) expect(creatureFor({ ...island })).toBe(first);
  });

  it('only ever puts a creature in water it belongs in', () => {
    const state = generateGalaxy(501, 'empire');
    let placed = 0;
    for (const system of state.systems) {
      const beast = creatureFor(system);
      if (!beast) continue;
      placed++;
      expect(beast.waters).toContain(system.archetype);
    }
    // And it should be most islands, or the almanac entry is a page nobody
    // ever has a reason to open.
    expect(placed).toBeGreaterThan(state.systems.length * 0.5);
  });

  it('leaves no sort of island without an answer', () => {
    // Every archetype the galaxy can produce has something in its water, so
    // the panel is never the odd island out with a missing block.
    for (const archetype of ARCHETYPES) {
      expect(creatureFor({ name: 'Somewhere', archetype })).toBeDefined();
    }
  });
});
