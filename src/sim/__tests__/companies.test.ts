import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { queueBuild, advanceBuilds, buildError } from '../build';
import {
  companiesOn,
  garrisonRoster,
  materialiseCompanies,
  postCompanies,
  raisableTroops,
  raiseReason,
  takeCompanies,
  troopType,
  troopsOf,
} from '../troops';
import { scrap, scrapReturn } from '../economy';
import type { GameState, System } from '../types';

/** An island of the Crown's with a drill ground and room to use it. */
function stage(seed: number): { state: GameState; island: System } {
  const state = generateGalaxy(seed, 'empire');
  const island = state.systems.find((s) => s.control === 'empire' && !s.uprising)!;
  island.facilities = island.facilities.filter((f) => f.type !== 'training_facility');
  island.facilities.push({ id: 'drill-1', type: 'training_facility', owner: 'empire' });
  state.factions.empire.gold = 5000;
  return { state, island };
}

describe('a garrison is who is standing there, not how many', () => {
  it('reads the seeded mix until somebody changes something', () => {
    const { island } = stage(900);
    expect(island.companies).toBeUndefined();
    // Same answer either way, which is what makes the list optional: nothing
    // had to be migrated when companies stopped being interchangeable.
    expect(companiesOn(island).map((t) => t.id)).toEqual(garrisonRoster(island).map((t) => t.id));
  });

  it('and the list wins the moment there is one', () => {
    const { island } = stage(901);
    postCompanies(island, 'the-hushed');
    expect(island.companies).toBeDefined();
    expect(companiesOn(island).at(-1)!.id).toBe('the-hushed');
    expect(island.garrison).toBe(island.companies!.length);
  });

  it('a list out of step with the count is not trusted', () => {
    const { island } = stage(902);
    materialiseCompanies(island);
    island.companies!.push('crown-marines'); // without touching the count
    // Rather than report a roster one longer than the garrison, it falls back.
    expect(companiesOn(island).length).toBe(island.garrison);
  });

  it('sends the weakest to sea and keeps what holds the island', () => {
    const { island } = stage(903);
    island.companies = ['island-militia', 'the-hushed', 'crown-marines'];
    island.garrison = 3;
    // Militia hold 12, the Hushed 20, Marines 30 — so the militia go first.
    const gone = takeCompanies(island, 1);
    expect(gone).toEqual(['island-militia']);
    expect(island.companies).toEqual(['the-hushed', 'crown-marines']);
    expect(island.garrison).toBe(2);
  });
});

describe('research finally buys a company you can post', () => {
  /*
   * The finding this whole change came from, pinned so it cannot come back:
   * `garrisonRoster` filtered every researched company out of every garrison,
   * so eight of the twelve could never stand anywhere and four rungs of the
   * ladder on each side bought nothing. Measured over six full wars before the
   * fix: only the four day-one companies ever appeared.
   */
  it('every company except the sailors can be raised at its own grade', () => {
    for (const faction of ['empire', 'alliance'] as const) {
      for (const t of troopsOf(faction)) {
        if (t.role === 'sailors') continue;
        const home = t.home?.[0];
        const island = { archetype: home ?? ('port-city' as const) };
        // At its own rung, on ground its people live on, nothing refuses it.
        const grade = t.unlock === 'start' ? 0 : Number(t.unlock.slice(1));
        expect(raiseReason(t, grade, island)).toBeNull();
      }
    }
  });

  it('but not one rung early', () => {
    const hushed = troopType('the-hushed')!;
    expect(raiseReason(hushed, 3, { archetype: 'port-city' })).toMatch(/grades of shipwright craft/);
    expect(raiseReason(hushed, 4, { archetype: 'port-city' })).toBeNull();
  });

  it('and a people is raised where that people lives', () => {
    const wardens = troopType('shoal-wardens')!;
    expect(raiseReason(wardens, 9, { archetype: 'reef-isle' })).toBeNull();
    expect(raiseReason(wardens, 9, { archetype: 'ice-isle' })).toMatch(/do not live on this sort/);
    // The Crown's later companies are *made* rather than mustered, so they
    // have no home and go up anywhere. That asymmetry is the design.
    for (const id of ['tidewrought', 'drowned-guard']) {
      expect(troopType(id)!.home).toBeUndefined();
    }
  });

  it('a ship\'s company is never something you order', () => {
    for (const id of ['crown-ships-company', 'the-brethren']) {
      expect(raiseReason(troopType(id)!, 9)).toMatch(/comes off a hull/);
      expect(raisableTroops(troopType(id)!.faction, 9).some((t) => t.id === id)).toBe(false);
    }
  });
});

describe('an order names its company, and the island gets that company', () => {
  it('raises the one that was ordered', () => {
    const { state, island } = stage(904);
    state.factions.empire.craft = 9999; // every rung open
    island.archetype = 'jungle-isle'; // the Fensworn come out of the swamps
    const before = island.garrison;
    queueBuild(state, 'drill-1', 'fensworn');
    for (let d = 0; d < 400 && island.garrison === before; d++) advanceBuilds(state);
    expect(island.garrison).toBe(before + 1);
    expect(companiesOn(island).at(-1)!.id).toBe('fensworn');
  });

  it('refuses one the island cannot raise, and says which reason', () => {
    const { state, island } = stage(905);
    island.archetype = 'port-city';
    expect(buildError(state, 'drill-1', 'the-hushed')).toMatch(/grades of shipwright craft/);
  });

  it("and 'troop' still means whatever this island raises", () => {
    // The opponent orders this, and so did every order placed before companies
    // had names. Refusing it would have stopped the war building any.
    const { state, island } = stage(906);
    const before = island.garrison;
    expect(buildError(state, 'drill-1', 'troop')).toBeNull();
    queueBuild(state, 'drill-1', 'troop');
    for (let d = 0; d < 400 && island.garrison === before; d++) advanceBuilds(state);
    expect(island.garrison).toBe(before + 1);
    expect(companiesOn(island).at(-1)).toBeDefined();
  });
});

describe('breaking one up names the one you picked', () => {
  it('pays back half of that company, not half of a generic one', () => {
    const { state, island } = stage(907);
    island.companies = ['island-militia', 'the-hushed'];
    island.garrison = 2;
    const hushed = { kind: 'troop' as const, systemId: island.id, at: 1 };
    expect(scrapReturn(state, hushed)).toBe(Math.floor(troopType('the-hushed')!.costGold * 0.5));
    scrap(state, 'empire', hushed);
    expect(island.companies).toEqual(['island-militia']);
    expect(island.garrison).toBe(1);
  });
});
