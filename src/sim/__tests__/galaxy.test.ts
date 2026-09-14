import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';

describe('generateGalaxy', () => {
  it('builds eight Reaches of seven to ten islands', () => {
    const state = generateGalaxy(42);
    // Eight: the Far Sea holds two, Rime and Whalers', since the painting has two.
    expect(state.sectors).toHaveLength(8);
    // 10 + 9 + 9 inner, 7 + 7 + 10 + 10 + 9 outer.
    expect(state.systems).toHaveLength(71);
    for (const sector of state.sectors) {
      expect(sector.systemIds.length).toBeGreaterThanOrEqual(7);
      expect(sector.systemIds.length).toBeLessThanOrEqual(15);
    }
  });

  it('splits the map into three inner Reaches and five outer', () => {
    const state = generateGalaxy(42);
    // Sovereign 10 + Shipwrights' 9 + Wreckers' 9.
    expect(state.systems.filter((s) => s.isCore)).toHaveLength(28);
    expect(state.systems.filter((s) => !s.isCore)).toHaveLength(43);
  });

  it('is deterministic for a seed and different across seeds', () => {
    expect(JSON.stringify(generateGalaxy(5))).toEqual(JSON.stringify(generateGalaxy(5)));
    expect(JSON.stringify(generateGalaxy(5))).not.toEqual(JSON.stringify(generateGalaxy(6)));
  });

  it('generates in well under 100ms', () => {
    const start = performance.now();
    generateGalaxy(11);
    expect(performance.now() - start).toBeLessThan(100);
  });

  it('gives every system a unique id and name', () => {
    const state = generateGalaxy(3);
    expect(new Set(state.systems.map((s) => s.id)).size).toBe(71);
    expect(new Set(state.systems.map((s) => s.name)).size).toBe(71);
  });

  it('makes core systems populated and explored by both sides', () => {
    const state = generateGalaxy(8);
    for (const system of state.systems.filter((s) => s.isCore)) {
      expect(system.populated).toBe(true);
      expect(system.explored.empire).toBe(true);
      expect(system.explored.alliance).toBe(true);
    }
  });

  it('puts the Empire HQ on a core world and the Alliance HQ on the rim', () => {
    const state = generateGalaxy(21);
    const empireHq = state.systems.find((s) => s.id === state.factions.empire.hqSystemId)!;
    const allianceHq = state.systems.find((s) => s.id === state.factions.alliance.hqSystemId)!;
    expect(empireHq.isCore).toBe(true);
    expect(empireHq.control).toBe('empire');
    expect(empireHq.support.empire).toBe(100);
    expect(allianceHq.isCore).toBe(false);
    expect(allianceHq.control).toBe('alliance');
    expect(allianceHq.support.alliance).toBe(100);
    expect(allianceHq.populated).toBe(true);
  });

  it('starts each side with seven characters at its HQ', () => {
    const state = generateGalaxy(13);
    for (const faction of ['empire', 'alliance'] as const) {
      const crew = state.characters.filter((c) => c.faction === faction);
      expect(crew).toHaveLength(7);
      for (const character of crew) {
        expect(character.locationSystemId).toBe(state.factions[faction].hqSystemId);
        expect(character.status).toBe('available');
      }
    }
  });

  it('starts each side with a working economy and a yard for hulls', () => {
    const state = generateGalaxy(17);
    for (const faction of ['empire', 'alliance'] as const) {
      const owned = state.systems
        .filter((s) => s.control === faction)
        .flatMap((s) => s.facilities)
        .filter((f) => f.owner === faction);
      const count = (type: string) => owned.filter((f) => f.type === type).length;
      // More earners than before, to carry the heavier opening fleets, and
      // more for the Crown, which has six islands to put them on and two of
      // those earning at a sullen rate. Measured to leave free ground on
      // every island either way.
      const earners = faction === 'empire' ? 15 : 14;
      expect(count('mine')).toBe(earners);
      expect(count('refinery')).toBe(earners);
      expect(count('construction_yard')).toBe(2);
      expect(count('training_facility')).toBe(1);
      expect(count('shipyard')).toBe(1);
    }
  });

  it('never places more facilities than a system has slots for', () => {
    const state = generateGalaxy(23);
    for (const system of state.systems) {
      const mines = system.facilities.filter((f) => f.type === 'mine').length;
      const others = system.facilities.length - mines;
      expect(mines).toBeLessThanOrEqual(system.rawSlots);
      expect(others).toBeLessThanOrEqual(system.energySlots);
    }
  });

  it('starts the three frontier Reaches unexplored, a quarter of them settled behind the fog', () => {
    let settled = 0;
    let total = 0;
    for (const seed of [31, 32, 33, 34, 35, 36, 37, 38]) {
      const state = generateGalaxy(seed);
      const base = state.systems.find((s) => s.id === state.factions.alliance.hqSystemId)!;
      for (const sector of state.sectors) {
        if (!['Rime Reach', "Whalers' Reach", 'Salt Reach'].includes(sector.name)) continue;
        for (const id of sector.systemIds) {
          const system = state.systems.find((s) => s.id === id)!;
          expect(system.explored.empire, `${system.name} seed ${seed}`).toBe(false);
          // The Confederacy knows the Reach its base is in and nothing else out here.
          expect(system.explored.alliance).toBe(sector.id === base.sectorId);
          if (system.id !== base.id) {
            total += 1;
            if (system.populated) {
              settled += 1;
              // Settled and nobody's means somebody is holding it.
              expect(system.control).toBe('neutral');
              expect(system.garrison).toBeGreaterThanOrEqual(1);
            }
          }
        }
      }
    }
    expect(settled / total).toBeGreaterThan(0.15);
    expect(settled / total).toBeLessThan(0.35);
  });

  it('puts the Confederacy base on one frontier island with its fleet, and the Home Fleet at Highwater', () => {
    for (const seed of [41, 42, 43]) {
      const state = generateGalaxy(seed);
      const base = state.systems.find((s) => s.id === state.factions.alliance.hqSystemId)!;
      const baseReach = state.sectors.find((s) => s.id === base.sectorId)!;
      expect(['Rime Reach', "Whalers' Reach", 'Salt Reach']).toContain(baseReach.name);
      expect(state.fleets.find((f) => f.faction === 'alliance')!.systemId).toBe(base.id);
      const seat = state.systems.find((s) => s.id === state.factions.empire.hqSystemId)!;
      expect(seat.name).toBe('Highwater');
      expect(seat.archetype).toBe('port-city');
      expect(state.fleets.find((f) => f.faction === 'empire')!.systemId).toBe(seat.id);
    }
  });

  it('opens the home Reach with Highwater, a second port, one more island, and a Confederate foothold', () => {
    for (const seed of [51, 52, 53, 54]) {
      const state = generateGalaxy(seed);
      const home = state.sectors.find((s) => s.name === 'Sovereign Reach')!;
      const islands = home.systemIds.map((id) => state.systems.find((s) => s.id === id)!);
      const crown = islands.filter((s) => s.control === 'empire');
      const confed = islands.filter((s) => s.control === 'alliance');
      expect(crown).toHaveLength(3);
      expect(crown.map((s) => s.name)).toContain('Highwater');
      expect(crown.some((s) => s.name === 'Gorley' || s.name === 'Ballmoor')).toBe(true);
      expect(confed.length).toBeGreaterThanOrEqual(1);
      expect(confed.length).toBeLessThanOrEqual(2);
      // The three ports of the great island, whoever holds them.
      for (const name of ['Highwater', 'Gorley', 'Ballmoor']) {
        expect(islands.find((s) => s.name === name)!.archetype).toBe('port-city');
      }
    }
  });

  it('opens each contested Reach with two islands a side and the rest settled and garrisoned', () => {
    const state = generateGalaxy(61);
    for (const name of ["Shipwrights' Reach", "Wreckers' Reach", 'Cinder Reach']) {
      const reach = state.sectors.find((s) => s.name === name)!;
      const islands = reach.systemIds.map((id) => state.systems.find((s) => s.id === id)!);
      expect(islands.filter((s) => s.control === 'empire')).toHaveLength(2);
      expect(islands.filter((s) => s.control === 'alliance')).toHaveLength(2);
      for (const s of islands) {
        expect(s.populated).toBe(true);
        expect(s.explored.empire).toBe(true);
        if (s.control === 'neutral') expect(s.garrison).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
