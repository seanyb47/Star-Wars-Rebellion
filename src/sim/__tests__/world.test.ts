import { describe, expect, it } from 'vitest';
import factionData from '../../data/factions.json';
import characterRoster from '../../data/characters.json';
import reachData from '../../data/reaches.json';
import terms from '../../data/terms.json';
import { FACILITY_LABEL, YARD_BUILDS } from '../constants';
import { generateGalaxy } from '../galaxy';

/**
 * The world bible is the source of truth for every name the player sees.
 * These tests fail if the data files and the simulation drift apart.
 */
describe('the world bible data', () => {
  const allIslands = reachData.reaches.flatMap((r) => r.islands);

  it('describes ten Reaches: four Inner, six Outer', () => {
    expect(reachData.reaches).toHaveLength(10);
    expect(reachData.reaches.filter((r) => r.tier === 'inner')).toHaveLength(4);
    expect(reachData.reaches.filter((r) => r.tier === 'outer')).toHaveLength(6);
  });

  it('gives every Reach exactly ten islands', () => {
    for (const reach of reachData.reaches) {
      expect(reach.islands).toHaveLength(10);
    }
  });

  it('names 100 distinct islands', () => {
    expect(allIslands).toHaveLength(100);
    expect(new Set(allIslands.map((i) => i.name)).size).toBe(100);
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

  it('renames the resources', () => {
    expect(terms.raw).toBe('Stores');
    expect(terms.refined).toBe('Fittings');
    expect(terms.allegiance).toBe('Allegiance');
  });
});
