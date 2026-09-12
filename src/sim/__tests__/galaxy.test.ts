import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';

describe('generateGalaxy', () => {
  it('builds seven Reaches of seven to ten islands', () => {
    const state = generateGalaxy(42);
    expect(state.sectors).toHaveLength(7);
    expect(state.systems).toHaveLength(62);
    for (const sector of state.sectors) {
      expect(sector.systemIds.length).toBeGreaterThanOrEqual(7);
      expect(sector.systemIds.length).toBeLessThanOrEqual(12);
    }
  });

  it('splits the map into three inner Reaches and four outer', () => {
    const state = generateGalaxy(42);
    // Sovereign 10 + Shipwrights' 9 + Coral 7.
    expect(state.systems.filter((s) => s.isCore)).toHaveLength(26);
    expect(state.systems.filter((s) => !s.isCore)).toHaveLength(36);
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
    expect(new Set(state.systems.map((s) => s.id)).size).toBe(62);
    expect(new Set(state.systems.map((s) => s.name)).size).toBe(62);
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

  it('starts each side with 8 mines, 8 refineries, 2 yards and 1 training facility', () => {
    const state = generateGalaxy(17);
    for (const faction of ['empire', 'alliance'] as const) {
      const owned = state.systems
        .filter((s) => s.control === faction)
        .flatMap((s) => s.facilities)
        .filter((f) => f.owner === faction);
      const count = (type: string) => owned.filter((f) => f.type === type).length;
      expect(count('mine')).toBe(8);
      expect(count('refinery')).toBe(8);
      expect(count('construction_yard')).toBe(2);
      expect(count('training_facility')).toBe(1);
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

  it('leaves most rim systems unpopulated and unexplored by the Empire', () => {
    const state = generateGalaxy(31);
    const rim = state.systems.filter((s) => !s.isCore);
    const unpopulated = rim.filter((s) => !s.populated).length;
    expect(unpopulated).toBeGreaterThan(rim.length * 0.4);
    expect(rim.some((s) => !s.explored.empire)).toBe(true);
  });
});
