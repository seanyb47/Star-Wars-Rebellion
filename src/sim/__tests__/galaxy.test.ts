import { describe, expect, it } from 'vitest';
import reachData from '../../data/reaches.json';
import { generateGalaxy, START_CHARACTERS } from '../galaxy';
import { depositsLeft } from '../helpers';
import { isLord, lords } from '../lords';

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

  it('opens with four a side and five, the three Lords among them', () => {
    const state = generateGalaxy(13);
    const freeport = state.systems.find((s) => s.name === 'Freeport')!;
    for (const faction of ['empire', 'alliance'] as const) {
      const crew = state.characters.filter((c) => c.faction === faction);
      expect(crew).toHaveLength(START_CHARACTERS[faction]);
      for (const character of crew) expect(character.status).toBe('available');
      /*
       * The Crown opens spread; the Confederacy opens on one quay.
       *
       * This asked both sides for at least two islands, and passed on the
       * seed it was written against. It is only a Crown rule. The
       * Confederacy's opening dispatch says the opposite in as many words —
       * *"all three are standing on this one quay tonight"* — and
       * `makeCharacters` puts the Lords on Freeport on purpose. Measured over
       * forty worlds on 20 September: the Crown is on more than one island in
       * every single one, the Confederacy in about half.
       *
       * So the rule is held where it belongs, and the other side is held to
       * the thing that is actually true of it, below.
       */
      const where = new Set(crew.map((c) => c.locationSystemId));
      if (faction === 'empire') expect(where.size).toBeGreaterThan(1);
      for (const id of where) {
        const island = state.systems.find((s) => s.id === id)!;
        expect(island.control === faction || island.id === freeport.id).toBe(true);
      }
    }
    // Whoever the draw put first is at the seat: the opening scatters from
    // the capital outwards, so the head of the list never leaves it.
    const first = state.characters.find((c) => c.faction === 'empire')!;
    expect(first.locationSystemId).toBe(state.factions.empire.hqSystemId);

    // Nobody opens aboard anything, Lords included. They were hulls until
    // 15 September; now the Confederacy starts as eight people on quays, the
    // three Lords among them and all three at Freeport.
    for (const character of state.characters.filter((c) => c.faction === 'alliance')) {
      expect(state.fleets.some((f) => f.officerIds.includes(character.id))).toBe(false);
      if (isLord(character)) expect(character.locationSystemId).toBe(freeport.id);
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
      // The three Lords stand there on day one — people on a quay, since
      // 15 September, rather than three hulls at anchor.
      const there = lords(state).filter((c) => c.locationSystemId === freeport.id);
      expect(there).toHaveLength(3);
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
      // Timber, and a vein or two apiece. A gold mine earns three times a mill
      // and can only stand on gold, so a side that opened with fifteen of
      // them opened rich enough never to have to decide anything — measured,
      // twice the income of the old opening on day one.
      //
      // A target, not a hand-out: most of these came with the islands, which
      // are settled islands and work some of their own ground, and the deal
      // only makes up the difference. So the mill count is exact whatever the
      // dice did, and the veins can only run over — a side whose ground was
      // already working four of them is not made to give two back.
      expect(count('mine')).toBeGreaterThanOrEqual(2);
      // The Crown's count went up on 18 September and only because its navy
      // did: a second squadron is thirteen gold a day more in upkeep against
      // an opening ledger that had five in it. See START_EARNERS.
      // A floor, not a count. The deal tops a side up to its target and never
      // takes any back — `short()` in `seedHoldings` says so — and since the
      // ground went proportional on 20 September the islands a side opens
      // holding often carry more mills than the target on their own. Asserting
      // the exact number was asserting that they do not.
      expect(count('refinery')).toBeGreaterThanOrEqual(faction === 'empire' ? 23 : 17);
      // And nothing on a held island belongs to nobody.
      expect(
        state.systems
          .filter((s) => s.control === faction)
          .flatMap((s) => s.facilities)
          .filter((f) => f.owner !== faction),
      ).toHaveLength(0);
      // Two construction yards, one drill ground, one slipway.
      //
      // Sean's word of 20 September cut all three to one apiece — *"only 1 of
      // each type of construction facility instead of 2 each"* — and he
      // revised the yard later the same day, after a playtest opened Freeport
      // and found its Buildings tab reading *"NOTHING TO BUILD WITH"*: *"I
      // think Freeport and Highwater should have construction yards at start.
      // And maybe you're right we should start with 2 construction yards. 1 at
      // home base and 1 randomly on their other starting locations. Keep
      // shipyards and troop training to 1."*
      expect(count('construction_yard')).toBe(2);
      expect(count('training_facility')).toBe(1);
      expect(count('shipyard')).toBe(1);
    }
  });

  /**
   * The seat builds on day one.
   *
   * A count of two yards a side says nothing about *where*, and where is the
   * whole of what Sean asked for: a playtest on 20 September opened Freeport —
   * the island the Confederacy was declared on, with the three Lords standing
   * on its quay — and its Buildings tab read *"NOTHING TO BUILD WITH.
   * Everything is raised by a construction yard standing on the same island."*
   * Every other tab on that sheet says *this is your capital*.
   *
   * Freeport is the harder half and the reason this is a test rather than a
   * constant: it is not in `allianceSystems` at all, because it is dealt none
   * of the opening's camps or mills. The yard is now the one exception, handed
   * over by name before the deal starts.
   */
  it('puts a construction yard on both seats, and the second yard somewhere else', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const state = generateGalaxy(seed);
      for (const faction of ['empire', 'alliance'] as const) {
        const held = state.systems.filter((s) => s.control === faction);
        const seat = state.systems.find((s) => s.id === state.factions[faction].hqSystemId)!;
        const yardsOn = (s: (typeof held)[number]) =>
          s.facilities.filter((f) => f.owner === faction && f.type === 'construction_yard').length;
        expect(yardsOn(seat), `${faction} seed ${seed}: ${seat.name} cannot build`).toBeGreaterThanOrEqual(1);
        // And the second is a second island, not a second berth on the seat:
        // "1 randomly on their other starting locations".
        const elsewhere = held.filter((s) => s.id !== seat.id).reduce((n, s) => n + yardsOn(s), 0);
        expect(elsewhere, `${faction} seed ${seed}: both yards on the seat`).toBe(1);
      }
    }
  });

  /**
   * Half an island is ground worth working, and four fifths of that is timber.
   *
   * Sean, 20 September: *"on average 50% of available land should be either
   * gold mines or trees slash coral... 40% should be trees and 10% should be
   * gold mines. So mills will be super common."*
   *
   * This replaced a flat three-to-six trees and a one-in-four chance of a
   * vein, which put twelve veins in a world of sixty-three islands and ran
   * both sides out of unworked ground by day two hundred (`lab/hoard.ts`).
   * Measured across worlds rather than on one island, because the shares are
   * an average and `DEPOSIT_VARIANCE` is there to make sure a single rock can
   * still come up rich or bare.
   *
   * Deposits already worked by the opening deal are counted back in: a mill
   * standing on a forest is that forest, and counting only what is left would
   * read the Crown's own islands as bare.
   */
  it('gives two plots in five a deposit, and mixes them 60 / 30 / 10', () => {
    let slots = 0;
    const got: Record<string, number> = { forest: 0, coral: 0, silver: 0, gold: 0 };
    const worksFor: Record<string, string> = {
      forest: 'refinery', coral: 'coral_kiln', silver: 'silver_mine', gold: 'mine',
    };
    for (let seed = 1; seed <= 20; seed++) {
      for (const island of generateGalaxy(seed).systems) {
        slots += island.slots;
        for (const kind of Object.keys(got)) {
          got[kind] += depositsLeft(island, kind as never)
            + island.facilities.filter((f) => f.type === worksFor[kind]).length;
        }
      }
    }
    const all = Object.values(got).reduce((a, b) => a + b, 0);

    /*
     * Sean's math of 20 September, and both halves of it are checked: how
     * often a plot carries anything, and what it carries when it does.
     *
     * The density runs two points under the 40% asked for, and that is known
     * and recorded on `DEPOSIT_CHANCE` rather than papered over: a side's own
     * islands are widened *after* their ground is rolled, so the roll was
     * taken against a smaller island than the one on the chart. The bound
     * allows the gap and would catch it growing.
     */
    expect(all / slots).toBeGreaterThan(0.36);
    expect(all / slots).toBeLessThan(0.41);

    // 60 / 30 / 10, within a point and a half each. Timber and living coral
    // are one bucket — coral is simply what the staple is called in Coral
    // Reach, where nothing grows.
    expect((got.forest + got.coral) / all).toBeGreaterThan(0.565);
    expect((got.forest + got.coral) / all).toBeLessThan(0.615);
    expect(got.silver / all).toBeGreaterThan(0.285);
    expect(got.silver / all).toBeLessThan(0.335);
    expect(got.gold / all).toBeGreaterThan(0.085);
    expect(got.gold / all).toBeLessThan(0.115);

    // And coral is real, and only where it should be.
    expect(got.coral).toBeGreaterThan(0);
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

  it('holds the meeting on one frontier island, with a squadron each and the Home Fleet at the Aldermain', () => {
    for (const seed of [41, 42, 43]) {
      const state = generateGalaxy(seed);
      const base = state.systems.find((s) => s.id === state.factions.alliance.hqSystemId)!;
      const baseReach = state.sectors.find((s) => s.id === base.sectorId)!;
      expect(FRONTIER).toContain(baseReach.name);
      // One squadron a side. It was four for the Confederacy while the three
      // Lords were hulls of their own; they are people now and the meeting
      // place has the one fleet, like Highwater.
      const confed = state.fleets.filter((f) => f.faction === 'alliance');
      expect(confed).toHaveLength(1);
      for (const f of confed) expect(f.systemId).toBe(base.id);
      const seat = state.systems.find((s) => s.id === state.factions.empire.hqSystemId)!;
      expect(seat.name).toBe('The Aldermain');
      expect(seat.archetype).toBe('port-city');
      expect(state.fleets.find((f) => f.faction === 'empire')!.systemId).toBe(seat.id);
    }
  });

  it('opens the home Reach with the Aldermain, a second port, one more island, and a Confederate foothold', () => {
    for (const seed of [51, 52, 53, 54]) {
      const state = generateGalaxy(seed);
      const home = state.sectors.find((s) => s.name === 'Sovereign Reach')!;
      const islands = home.systemIds.map((id) => state.systems.find((s) => s.id === id)!);
      const crown = islands.filter((s) => s.control === 'empire');
      const confed = islands.filter((s) => s.control === 'alliance');
      expect(crown).toHaveLength(3);
      expect(crown.map((s) => s.name)).toContain('The Aldermain');
      expect(crown.some((s) => s.name === 'Gorley' || s.name === 'Ballmoor')).toBe(true);
      expect(confed.length).toBeGreaterThanOrEqual(1);
      expect(confed.length).toBeLessThanOrEqual(2);
      // Never on the great island: its ports are the Crown's ground to start.
      for (const s of confed) expect(['The Aldermain', 'Gorley', 'Ballmoor']).not.toContain(s.name);
      // The three ports of the great island, whoever holds them.
      for (const name of ['The Aldermain', 'Gorley', 'Ballmoor']) {
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

/**
 * Sean: *"kinda like how in SW Rebellion the rebels all start on Yavin 4 but
 * the game tells you the empire will be looking for you."* The three Lords
 * sign the articles in one harbor and the Crown wins by holding all three at
 * once, so on day one the whole Confederate victory condition is on one quay.
 * Two wars in a hundred end before day ninety exactly that way.
 */
describe('the first card of the war', () => {
  it('tells the Confederacy its principals are all on one quay, and to move them', () => {
    const state = generateGalaxy(31005, 'alliance');
    const card = state.events.find((e) => e.kind === 'war')!;
    const meeting = state.systems.find((s) => s.id === state.factions.alliance.hqSystemId)!;
    expect(card.text).toContain(meeting.name);
    // The three of them really are standing there, which is what makes the
    // warning worth printing.
    const lords = state.characters.filter((c) => isLord(c));
    expect(lords).toHaveLength(3);
    for (const lord of lords) expect(lord.locationSystemId).toBe(meeting.id);
    expect(card.text).toMatch(/this one quay/);
    expect(card.text).toMatch(/will come looking for/);
    expect(card.text).toMatch(/keep them apart/);
  });

  it('tells the Crown the meeting place has to be found before anybody can be taken', () => {
    const state = generateGalaxy(31005, 'empire');
    const card = state.events.find((e) => e.kind === 'war')!;
    const meeting = state.systems.find((s) => s.id === state.factions.alliance.hqSystemId)!;
    // And never names it: finding it is the Crown's half of the game.
    expect(card.text).not.toContain(meeting.name);
    expect(card.text).toMatch(/Find where they met/);
    expect(card.text).toMatch(/at the same time/);
  });
});
