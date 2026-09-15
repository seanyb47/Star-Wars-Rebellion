import { describe, expect, it } from 'vitest';
import reachData from '../../data/reaches.json';
import { generateGalaxy } from '../galaxy';
import { isLord, isLordShip } from '../lords';

/** The Reaches the war has not charted: Rime and Salt, and Coral since Sean
 *  moved the atoll out past the charts to make it a third place the
 *  Confederacy might have been founded. */
const FRONTIER = ['Rime Reach', 'Salt Reach', 'Coral Reach'];

describe('generateGalaxy', () => {
  it('builds seven Reaches of five to fifteen islands, sixty-three in all', () => {
    const state = generateGalaxy(42);
    // Seven: the Far Sea's ice and its whaling chain are one Reach, Rime.
    expect(state.sectors).toHaveLength(7);
    // 15 + 9 + 8 inner, 6 + 8 + 9 + 8 outer: the sixty-three best sites the
    // painting offers, however they fall across the chains. Coral gained
    // three when it went frontier — the atoll had more painted land in it
    // than five islands were using.
    expect(state.systems).toHaveLength(63);
    for (const sector of state.sectors) {
      expect(sector.systemIds.length).toBeGreaterThanOrEqual(5);
      expect(sector.systemIds.length).toBeLessThanOrEqual(15);
    }
  });

  it('splits the map into three inner Reaches and four outer', () => {
    const state = generateGalaxy(42);
    // Sovereign 15 + Whalers' 9 + Wreckers' 8.
    expect(state.systems.filter((s) => s.isCore)).toHaveLength(32);
    // Rime 6 + Cinder 8 + Salt 9 + Coral 8.
    expect(state.systems.filter((s) => !s.isCore)).toHaveLength(31);
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
    expect(new Set(state.systems.map((s) => s.id)).size).toBe(63);
    expect(new Set(state.systems.map((s) => s.name)).size).toBe(63);
  });

  it('makes core systems populated and explored by both sides', () => {
    const state = generateGalaxy(8);
    for (const system of state.systems.filter((s) => s.isCore)) {
      expect(system.populated).toBe(true);
      expect(system.explored.empire).toBe(true);
      expect(system.explored.alliance).toBe(true);
    }
  });

  it('opens both seats at a hundred: Highwater the Crown\'s, Freeport the Brethren\'s', () => {
    const state = generateGalaxy(21);
    const empireHq = state.systems.find((s) => s.id === state.factions.empire.hqSystemId)!;
    const meeting = state.systems.find((s) => s.id === state.factions.alliance.hqSystemId)!;
    expect(empireHq.isCore).toBe(true);
    expect(empireHq.control).toBe('empire');
    expect(empireHq.support.empire).toBe(100);
    // Freeport answers to the Confederacy the way Highwater answers to the
    // Crown — and one to nothing, so neither side has an argument to start.
    expect(meeting.name).toBe('Freeport');
    expect(meeting.control).toBe('alliance');
    expect(meeting.support.alliance).toBe(100);
    expect(meeting.support.empire).toBe(0);
    // Still no base, in the sense that matters: it is out past the charts,
    // the Crown cannot see it, and losing it loses nothing — the Crown wins
    // by taking the three Lords and by nothing else.
    expect(meeting.isCore).toBe(false);
    expect(meeting.explored.alliance).toBe(true);
    expect(meeting.explored.empire).toBe(false);
  });

  it('spreads seven officers a side about, with the Lords aboard at Freeport', () => {
    const state = generateGalaxy(13);
    const freeport = state.systems.find((s) => s.name === 'Freeport')!;
    for (const faction of ['empire', 'alliance'] as const) {
      const crew = state.characters.filter((c) => c.faction === faction);
      expect(crew).toHaveLength(7);
      for (const character of crew) expect(character.status).toBe('available');
      // Nobody opens in one heap any more: the side's people are on at least
      // two islands, so the first move of every game is not the same move.
      const where = new Set(crew.map((c) => c.locationSystemId));
      expect(where.size).toBeGreaterThan(1);
      for (const id of where) {
        const island = state.systems.find((s) => s.id === id)!;
        expect(island.control === faction || island.id === freeport.id).toBe(true);
      }
    }
    // The Regent has not left the citadel in eleven years.
    const regent = state.characters.find((c) => c.faction === 'empire')!;
    expect(regent.locationSystemId).toBe(state.factions.empire.hqSystemId);

    // A Lord is their ship: aboard at Freeport on day one, and the only
    // Confederate aboard anything. Everyone else stands on the quay.
    for (const character of state.characters.filter((c) => c.faction === 'alliance')) {
      const aboard = state.fleets.some((f) => f.officerIds.includes(character.id));
      expect(aboard).toBe(isLord(character));
      if (aboard) expect(character.locationSystemId).toBe(freeport.id);
    }
  });

  it('signs the articles on a real island, renamed for the game', () => {
    const bible = new Set(reachData.reaches.flatMap((r) => r.islands.map((i) => i.name)));
    const seen = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      const state = generateGalaxy(seed);
      const ports = state.systems.filter((s) => s.name === 'Freeport');
      expect(ports).toHaveLength(1);
      const freeport = ports[0];
      // It took an island's place, and keeps that island's painted position.
      expect(bible.has(freeport.chartName!)).toBe(true);
      seen.add(freeport.chartName!);
      // Out past the charts, and nobody's: the Brethren govern nothing.
      const reach = state.sectors.find((r) => r.id === freeport.sectorId)!;
      expect(FRONTIER).toContain(reach.name);
      expect(freeport.control).toBe('alliance');
      expect(freeport.explored.empire).toBe(false);
      expect(freeport.explored.alliance).toBe(true);
      // Well liked, but short of the bar that would run up their colours.
      expect(freeport.support.alliance).toBe(100);
      // The three ships lie there on day one.
      const lying = state.fleets.filter((f) => f.systemId === freeport.id && f.ships.some(isLordShip));
      expect(lying).toHaveLength(3);
    }
    // A different island every game, not the same one dressed up.
    expect(seen.size).toBeGreaterThan(1);
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

  it('gives the Confederacy the islands that have declared for it, and Freeport among them', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const state = generateGalaxy(seed);
      const held = state.systems.filter((s) => s.control === 'alliance');
      // Seven or eight that declared in the settled Reaches, plus Freeport.
      expect(held.length).toBeGreaterThanOrEqual(8);
      expect(held.length).toBeLessThanOrEqual(9);
      expect(held.map((s) => s.id)).toContain(state.factions.alliance.hqSystemId);
      // Freeport is the only one of them the Crown cannot see on day one.
      const dark = held.filter((s) => !s.explored.empire);
      expect(dark.map((s) => s.name)).toEqual(['Freeport']);
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

  it('starts the three frontier Reaches unexplored, a quarter of them settled behind the fog', () => {
    let settled = 0;
    let total = 0;
    for (const seed of [31, 32, 33, 34, 35, 36, 37, 38]) {
      const state = generateGalaxy(seed);
      const base = state.systems.find((s) => s.id === state.factions.alliance.hqSystemId)!;
      for (const sector of state.sectors) {
        if (!FRONTIER.includes(sector.name)) continue;
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
      expect(FRONTIER).toContain(baseReach.name);
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
