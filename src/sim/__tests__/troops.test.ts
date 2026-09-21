import { describe, expect, it } from 'vitest';
import { TROOP_TYPES, garrisonRoster, garrisonSummary, troopType, troopsOf } from '../troops';
import { generateGalaxy } from '../galaxy';

describe('garrison companies', () => {
  it('gives every type a picture slug, a people and three numbers', () => {
    for (const type of TROOP_TYPES) {
      expect(type.id).toMatch(/^[a-z-]+$/);
      expect(type.people.length).toBeGreaterThan(2);
      expect(type.blurb.length).toBeGreaterThan(80);
      for (const n of [type.offense, type.defense, type.watch]) {
        expect(n).toBeGreaterThan(0);
        expect(n).toBeLessThanOrEqual(50);
      }
      // The seven numbers: three for fighting, one for being shelled, three for
      // the ledger. Every one of them is even — the clean-numbers rule of v4.4.
      expect(type.bombardDefense).toBeGreaterThan(0);
      for (const n of [type.offense, type.defense, type.watch]) expect(n % 2).toBe(0);
      expect(type.costGold).toBeGreaterThan(0);
      expect(type.days).toBeGreaterThan(0);
      expect(type.unlock).toMatch(/^(start|R[2468])$/);
    }
  });

  it('gives each side a line company and sailors, and no more than one of each', () => {
    for (const faction of ['empire', 'alliance'] as const) {
      const mine = troopsOf(faction);
      expect(mine.filter((t) => t.role === 'line')).toHaveLength(1);
      expect(mine.filter((t) => t.role === 'sailors')).toHaveLength(1);
      expect(mine.length).toBe(6);
    }
  });

  it('keeps the bible\'s claims about who is best at what true', () => {
    const best = (key: 'offense' | 'defense' | 'watch') =>
      TROOP_TYPES.reduce((a, b) => (b[key] > a[key] ? b : a));
    expect(best('offense').id).toBe('urskin-berserkers');
    expect(best('defense').id).toBe('drowned-guard');
    expect(best('watch').id).toBe('reefwalkers');
    // And the Crown's opening edge: its line company beats theirs at landing,
    // which is the early military advantage stated in the faction profile.
    expect(troopType('crown-marines')!.offense).toBeGreaterThan(
      troopType('island-militia')!.offense,
    );
  });

  it('posts exactly as many companies as the island has', () => {
    const state = generateGalaxy(501, 'empire');
    for (const system of state.systems) {
      const roster = garrisonRoster(system);
      if (system.control !== 'empire' && system.control !== 'alliance') {
        expect(roster).toHaveLength(0);
        continue;
      }
      expect(roster).toHaveLength(system.garrison);
      for (const type of roster) {
        expect(type.faction).toBe(system.control);
        // Nothing that has to be built is standing anywhere yet.
        expect(type.research).toBeUndefined();
      }
      expect(garrisonSummary(system).reduce((n, e) => n + e.count, 0)).toBe(system.garrison);
    }
  });

  it('puts a people only on the islands its people live on', () => {
    const state = generateGalaxy(17, 'empire');
    for (const system of state.systems) {
      for (const type of garrisonRoster(system)) {
        if (type.role !== 'native') continue;
        expect(type.home).toContain(system.archetype);
      }
    }
  });

  it('says the same thing about the same island every time', () => {
    const state = generateGalaxy(99, 'empire');
    const system = state.systems.find((s) => s.control === 'alliance' && s.garrison > 0)!;
    const first = garrisonRoster(system).map((t) => t.id);
    for (let i = 0; i < 5; i++) {
      expect(garrisonRoster(system).map((t) => t.id)).toEqual(first);
    }
  });
});
