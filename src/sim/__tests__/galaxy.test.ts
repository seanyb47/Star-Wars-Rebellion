import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';

describe('generateGalaxy', () => {
  it('builds seven Reaches of five to fifteen islands, sixty in all', () => {
    const state = generateGalaxy(42);
    // Seven: the Far Sea's ice and its whaling chain are one Reach, Rime.
    expect(state.sectors).toHaveLength(7);
    // 15 + 9 + 8 inner, 6 + 8 + 9 + 5 outer: the sixty best sites the
    // painting offers, however they fall across the chains.
    expect(state.systems).toHaveLength(60);
    for (const sector of state.sectors) {
      expect(sector.systemIds.length).toBeGreaterThanOrEqual(5);
      expect(sector.systemIds.length).toBeLessThanOrEqual(15);
    }
  });

  it('splits the map into three inner Reaches and four outer', () => {
    const state = generateGalaxy(42);
    // Sovereign 15 + Whalers' 9 + Wreckers' 8.
    expect(state.systems.filter((s) => s.isCore)).toHaveLength(32);
    expect(state.systems.filter((s) => !s.isCore)).toHaveLength(28);
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
    expect(new Set(state.systems.map((s) => s.id)).size).toBe(60);
    expect(new Set(state.systems.map((s) => s.name)).size).toBe(60);
  });

  it('makes core systems populated and explored by both sides', () => {
    const state = generateGalaxy(8);
    for (const system of state.systems.filter((s) => s.isCore)) {
      expect(system.populated).toBe(true);
      expect(system.explored.empire).toBe(true);
      expect(system.explored.alliance).toBe(true);
    }
  });

  it('puts the Crown at Highwater and the Confederacy at a meeting place that is nobody\'s', () => {
    const state = generateGalaxy(21);
    const empireHq = state.systems.find((s) => s.id === state.factions.empire.hqSystemId)!;
    const meeting = state.systems.find((s) => s.id === state.factions.alliance.hqSystemId)!;
    expect(empireHq.isCore).toBe(true);
    expect(empireHq.control).toBe('empire');
    expect(empireHq.support.empire).toBe(100);
    // No base: the Lords met somewhere out past the charts and it is not theirs.
    expect(meeting.isCore).toBe(false);
    expect(meeting.control).not.toBe('alliance');
    expect(meeting.explored.alliance).toBe(true);
    expect(meeting.explored.empire).toBe(false);
  });

  it('starts each side with seven characters at home: the Crown\'s ashore, the Confederacy\'s aboard', () => {
    const state = generateGalaxy(13);
    for (const faction of ['empire', 'alliance'] as const) {
      const crew = state.characters.filter((c) => c.faction === faction);
      expect(crew).toHaveLength(7);
      for (const character of crew) {
        expect(character.locationSystemId).toBe(state.factions[faction].hqSystemId);
        expect(character.status).toBe('available');
        const aboard = state.fleets.some((f) => f.officerIds.includes(character.id));
        expect(aboard).toBe(faction === 'alliance');
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
      // Two of each maker, dealt at random across the side's islands.
      expect(count('construction_yard')).toBe(2);
      expect(count('training_facility')).toBe(2);
      expect(count('shipyard')).toBe(2);
    }
  });

  it('gives the Confederacy eight islands that have declared for it, none of them the meeting place', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const state = generateGalaxy(seed);
      const held = state.systems.filter((s) => s.control === 'alliance');
      expect(held.length).toBeGreaterThanOrEqual(7);
      expect(held.length).toBeLessThanOrEqual(8);
      expect(held.map((s) => s.id)).not.toContain(state.factions.alliance.hqSystemId);
    }
  });

  it('never places more facilities than a system has slots for', () => {
    const state = generateGalaxy(23);
    for (const system of state.systems) {
      const mines = system.facilities.filter((f) => f.type === 'mine').length;
      const others = system.facilities.length - mines;
      expect(mines + others).toBeLessThanOrEqual(system.slots);
    }
  });

  it('starts the two frontier Reaches unexplored, a quarter of them settled behind the fog', () => {
    let settled = 0;
    let total = 0;
    for (const seed of [31, 32, 33, 34, 35, 36, 37, 38]) {
      const state = generateGalaxy(seed);
      const base = state.systems.find((s) => s.id === state.factions.alliance.hqSystemId)!;
      for (const sector of state.sectors) {
        if (!['Rime Reach', 'Salt Reach'].includes(sector.name)) continue;
        for (const id of sector.systemIds) {
          const system = state.systems.find((s) => s.id === id)!;
          expect(system.explored.empire, `${system.name} seed ${seed}`).toBe(false);
          // The Confederacy knows the island it met on and nothing else out here.
          expect(system.explored.alliance).toBe(system.id === base.id);
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

  it('holds the meeting on one frontier island, every Confederate hull lying there, and the Home Fleet at Highwater', () => {
    for (const seed of [41, 42, 43]) {
      const state = generateGalaxy(seed);
      const base = state.systems.find((s) => s.id === state.factions.alliance.hqSystemId)!;
      const baseReach = state.sectors.find((s) => s.id === base.sectorId)!;
      expect(['Rime Reach', 'Salt Reach']).toContain(baseReach.name);
      const confed = state.fleets.filter((f) => f.faction === 'alliance');
      expect(confed).toHaveLength(4);
      for (const f of confed) expect(f.systemId).toBe(base.id);
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
      // Never on the great island: its ports are the Crown's ground to start.
      for (const s of confed) expect(['Highwater', 'Gorley', 'Ballmoor']).not.toContain(s.name);
      // The three ports of the great island, whoever holds them.
      for (const name of ['Highwater', 'Gorley', 'Ballmoor']) {
        expect(islands.find((s) => s.name === name)!.archetype).toBe('port-city');
      }
    }
  });

  it('opens each contested Reach with two islands a side and the rest settled and garrisoned', () => {
    const state = generateGalaxy(61);
    for (const name of ["Whalers' Reach", "Wreckers' Reach", 'Cinder Reach']) {
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
