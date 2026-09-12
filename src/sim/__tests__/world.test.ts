import { describe, expect, it } from 'vitest';
import factionData from '../../data/factions.json';
import characterRoster from '../../data/characters.json';
import reachData from '../../data/reaches.json';
import terms from '../../data/terms.json';
import { FACILITY_LABEL, GOLD_PER_DAY, YARD_BUILDS } from '../constants';
import { generateGalaxy } from '../galaxy';
import { startMission } from '../missions';
import { reachesOfSea, seasOf, summariseReach, summariseSea } from '../reach';

/**
 * The world bible is the source of truth for every name the player sees.
 * These tests fail if the data files and the simulation drift apart.
 */
describe('the world bible data', () => {
  const allIslands = reachData.reaches.flatMap((r) => r.islands);

  it('describes seven Reaches, one for each Sea: three Inner, four Outer', () => {
    expect(reachData.reaches).toHaveLength(7);
    expect(reachData.reaches.filter((r) => r.tier === 'inner')).toHaveLength(3);
    expect(reachData.reaches.filter((r) => r.tier === 'outer')).toHaveLength(4);
    // One Reach per Sea is the whole point of the small map: it is what lets
    // the chart name the Seas and the panels name the Reaches without either
    // of them lying about what you are looking at.
    expect(new Set(reachData.reaches.map((r) => r.name)).size).toBe(7);
  });

  it('gives every Reach between seven and twelve islands', () => {
    // Not a flat ten any more. A Reach holds as many islands as its painted
    // cluster can show as separate places, and the range is the range the
    // chain view can lay out clearly.
    for (const reach of reachData.reaches) {
      expect(reach.islands.length).toBeGreaterThanOrEqual(7);
      expect(reach.islands.length).toBeLessThanOrEqual(12);
    }
  });

  it('names 62 distinct islands', () => {
    expect(allIslands).toHaveLength(62);
    expect(new Set(allIslands.map((i) => i.name)).size).toBe(62);
  });

  it('covers all seven Seas', () => {
    expect(new Set(reachData.reaches.map((r) => r.sea)).size).toBe(7);
  });

  it('marks exactly one island as the Imperium capital', () => {
    const capitals = allIslands.filter((i) => 'capital' in i && i.capital);
    expect(capitals).toHaveLength(1);
    expect(capitals[0].name).toBe(factionData.empire.capitalIslandName);
  });

  it('rosters seven named characters a side with sane rating bands', () => {
    for (const faction of ['empire', 'alliance'] as const) {
      const roster = characterRoster[faction];
      expect(roster.length).toBeGreaterThanOrEqual(7);
      for (const entry of roster) {
        expect(entry.name.length).toBeGreaterThan(0);
        expect(entry.bio.length).toBeGreaterThan(0);
        for (const band of Object.values(entry.ratings)) {
          expect(band).toHaveLength(2);
          expect(band[0]).toBeLessThan(band[1]);
          expect(band[0]).toBeGreaterThanOrEqual(0);
          expect(band[1]).toBeLessThanOrEqual(100);
        }
      }
    }
  });
});

describe('the generated world matches the bible', () => {
  const state = generateGalaxy(1);

  it('draws every island name from the bible, and uses all of them', () => {
    const fromBible = new Set(reachData.reaches.flatMap((r) => r.islands.map((i) => i.name)));
    const generated = new Set(state.systems.map((s) => s.name));
    expect(generated).toEqual(fromBible);
  });

  it('keeps every island inside its own Reach', () => {
    for (const reach of reachData.reaches) {
      const sector = state.sectors.find((s) => s.name === reach.name)!;
      expect(sector).toBeDefined();
      const names = sector.systemIds.map(
        (id) => state.systems.find((s) => s.id === id)!.name,
      );
      expect(new Set(names)).toEqual(new Set(reach.islands.map((i) => i.name)));
    }
  });

  it('seats the Imperium at Highwater', () => {
    const hq = state.systems.find((s) => s.id === state.factions.empire.hqSystemId)!;
    expect(hq.name).toBe('Highwater');
    expect(hq.isCore).toBe(true);
  });

  it('tags every Reach with its Sea', () => {
    for (const sector of state.sectors) {
      const reach = reachData.reaches.find((r) => r.name === sector.name)!;
      expect(sector.sea).toBe(reach.sea);
    }
  });

  it('carries the bible notes through onto the islands that have them', () => {
    const highwater = state.systems.find((s) => s.name === 'Highwater')!;
    expect(highwater.note).toMatch(/seawalls/i);
    const plain = state.systems.find((s) => s.name === 'Avermere')!;
    expect(plain.note).toBeUndefined();
  });

  it('fields the bible characters, rated inside their bands', () => {
    for (const faction of ['empire', 'alliance'] as const) {
      const roster = characterRoster[faction].slice(0, 7);
      const inGame = state.characters.filter((c) => c.faction === faction);
      expect(inGame.map((c) => c.name)).toEqual(roster.map((e) => e.name));
      for (const [index, character] of inGame.entries()) {
        const bands = roster[index].ratings;
        expect(character.diplomacy).toBeGreaterThanOrEqual(bands.diplomacy[0]);
        expect(character.diplomacy).toBeLessThanOrEqual(bands.diplomacy[1]);
        expect(character.combat).toBeGreaterThanOrEqual(bands.combat[0]);
        expect(character.combat).toBeLessThanOrEqual(bands.combat[1]);
      }
    }
  });

  it('carries each character\'s people through, which their portrait reads', () => {
    for (const faction of ['empire', 'alliance'] as const) {
      for (const character of state.characters.filter((c) => c.faction === faction)) {
        const entry = characterRoster[faction].find((e) => e.name === character.name)!;
        expect(character.people).toBe(entry.people);
      }
    }
    // Torvik is the one non-human major, and his portrait depends on knowing it.
    const torvik = state.characters.find((c) => c.name.includes('Torvik'))!;
    expect(torvik.people).toBe('Urskin');
  });

  it('makes Hale a better negotiator than Torvik, every game', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const trial = generateGalaxy(seed);
      const hale = trial.characters.find((c) => c.name.includes('Hale'))!;
      const torvik = trial.characters.find((c) => c.name.includes('Torvik'))!;
      expect(hale.diplomacy).toBeGreaterThan(torvik.diplomacy);
      expect(torvik.combat).toBeGreaterThan(hale.combat);
    }
  });
});

describe('terminology', () => {
  it('labels facilities from the bible, not the old space names', () => {
    expect(FACILITY_LABEL.mine).toBe('Camp');
    expect(FACILITY_LABEL.refinery).toBe('Mill');
    expect(FACILITY_LABEL.construction_yard).toBe('Works');
    expect(YARD_BUILDS.shipyard.label).toBe(terms.facilities.shipyard);
  });

  it('uses one plain-word currency, not invented resource names', () => {
    expect(terms.gold).toBe('Gold');
    expect(terms.allegiance).toBe('Allegiance');
    // Slot names are things a player already understands.
    expect(terms.ground).toBe('Ground');
    expect(terms.water).toBe('Water');
  });
});

describe('the Reach summary', () => {
  it('counts what the Reach holds', () => {
    const state = generateGalaxy(12);
    const sector = state.sectors.find((s) =>
      state.systems.some((sys) => sys.sectorId === s.id && sys.control === 'empire'),
    )!;
    const summary = summariseReach(state, sector.id, 'empire');

    const count = state.systems.filter((sys) => sys.sectorId === sector.id).length;
    expect(summary.islands).toBe(count);
    expect(summary.held).toBe(
      state.systems.filter((s) => s.sectorId === sector.id && s.control === 'empire').length,
    );
    expect(summary.perIsland).toHaveLength(count);
    expect(summary.settled).toBe(
      state.systems.filter((s) => s.sectorId === sector.id && s.populated).length,
    );
  });

  it('reports what your holdings here actually earn, not how many you own', () => {
    const state = generateGalaxy(12);
    const island = state.systems.find(
      (s) => s.control === 'empire' && s.facilities.some((f) => f.type === 'mine'),
    )!;
    const mines = island.facilities.filter((f) => f.type === 'mine').length;

    const rate = island.facilities
      .filter((f) => f.owner === 'empire')
      .reduce((total, f) => total + GOLD_PER_DAY[f.type], 0);

    island.support.empire = 100;
    const atFull = summariseReach(state, island.sectorId, 'empire').goldPerDay;
    island.support.empire = 0;
    const atNone = summariseReach(state, island.sectorId, 'empire').goldPerDay;

    // 1.0x versus 0.5x on this island's whole earning rate.
    expect(mines).toBeGreaterThan(0);
    expect(atFull - atNone).toBeCloseTo(rate * 0.5, 5);
  });

  it('stops counting an island in mutiny', () => {
    const state = generateGalaxy(12);
    const island = state.systems.find(
      (s) => s.control === 'empire' && s.facilities.some((f) => f.type === 'mine'),
    )!;
    const before = summariseReach(state, island.sectorId, 'empire').goldPerDay;
    island.uprising = true;
    const after = summariseReach(state, island.sectorId, 'empire');
    expect(after.goldPerDay).toBeLessThan(before);
    expect(after.mutinies).toBe(1);
  });

  it('counts a character as on an island both when standing there and sailing to it', () => {
    const state = generateGalaxy(12);
    const hq = state.systems.find((s) => s.id === state.factions.empire.hqSystemId)!;
    const atHome = summariseReach(state, hq.sectorId, 'empire').perIsland.find(
      (i) => i.systemId === hq.id,
    )!;
    expect(atHome.missions).toBe(7);

    const target = state.systems.find(
      (s) => s.sectorId === hq.sectorId && s.control === 'neutral',
    )!;
    startMission(state, state.characters[0].id, target.id);
    const summary = summariseReach(state, hq.sectorId, 'empire');
    // Still at home while travelling, and already counted against the target.
    expect(summary.perIsland.find((i) => i.systemId === target.id)!.missions).toBe(1);
  });

  it('averages allegiance across settled islands only', () => {
    const state = generateGalaxy(12);
    const sector = state.sectors[0];
    const settled = state.systems.filter((s) => s.sectorId === sector.id && s.populated);
    for (const s of settled) s.support.empire = 40;
    expect(summariseReach(state, sector.id, 'empire').allegiance.empire).toBeCloseTo(40);
  });
});

describe('the Sea summary', () => {
  const state = generateGalaxy(21);

  it('covers every Reach exactly once across the seven Seas', () => {
    const seas = seasOf(state);
    expect(seas).toHaveLength(7);
    const counted = seas.flatMap((sea) => summariseSea(state, sea, 'empire').perReach);
    expect(counted).toHaveLength(state.sectors.length);
    expect(new Set(counted.map((r) => r.sectorId)).size).toBe(state.sectors.length);
  });

  it('adds its Reaches up', () => {
    for (const sea of seasOf(state)) {
      const summary = summariseSea(state, sea, 'empire');
      expect(summary.islands).toBe(
        summary.perReach.reduce((total, r) => total + r.islands, 0),
      );
      expect(summary.held).toBe(
        summary.perReach.reduce((total, r) => total + r.held, 0),
      );
      expect(summary.goldPerDay).toBeCloseTo(
        summary.perReach.reduce((total, r) => total + r.goldPerDay, 0),
      );
    }
  });

  it('averages allegiance over islands, not over Reach averages', () => {
    // A Sea of two Reaches where one has far fewer settled islands: averaging
    // the averages would weight that Reach as heavily as the bigger one.
    //
    // The small map has one Reach per Sea, so the two methods would agree on
    // it and prove nothing. The larger maps put several Reaches in a Sea and
    // the code still has to be right for them, so the case is built here.
    const [a, b] = state.sectors;
    b.sea = a.sea;
    const twoReach = a.sea;
    const sectors = reachesOfSea(state, twoReach);
    expect(sectors).toHaveLength(2);
    const settled = state.systems.filter(
      (s) => s.populated && sectors.some((sec) => sec.id === s.sectorId),
    );
    settled.forEach((s, i) => {
      s.support.empire = i === 0 ? 100 : 0;
    });

    const summary = summariseSea(state, twoReach, 'empire');
    expect(summary.allegiance.empire).toBeCloseTo(100 / settled.length, 5);
  });
});
