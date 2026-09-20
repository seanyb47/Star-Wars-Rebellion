import { describe, expect, it } from 'vitest';
import factionData from '../../data/factions.json';
import characterRoster from '../../data/characters.json';
import reachData from '../../data/reaches.json';
import terms from '../../data/terms.json';
import {
  FACILITY_LABEL,
  SHIP_CLASSES,
  GARRISON_SMUGGLING_CUT,
  GOLD_PER_DAY,
  RATING_SWING_MAJOR,
  RATING_SWING_MINOR,
  YARD_BUILDS,
} from '../constants';
import { generateGalaxy } from '../galaxy';
import { startMission } from '../missions';
import { reachesOfSea, seasOf, summariseReach, summariseSea } from '../reach';

/**
 * The world bible is the source of truth for every name the player sees.
 * These tests fail if the data files and the simulation drift apart.
 */
describe('the world bible data', () => {
  const allIslands = reachData.reaches.flatMap((r) => r.islands);

  it('describes seven Reaches across seven Seas: three Inner, four Outer', () => {
    expect(reachData.reaches).toHaveLength(7);
    expect(reachData.reaches.filter((r) => r.tier === 'inner')).toHaveLength(3);
    expect(reachData.reaches.filter((r) => r.tier === 'outer')).toHaveLength(4);
    // One Reach per Sea. The Far Sea's ice and its whaling chain are one
    // Reach, Rime; the chain down the west is Whalers'.
    expect(new Set(reachData.reaches.map((r) => r.name)).size).toBe(7);
    expect(new Set(reachData.reaches.map((r) => r.sea)).size).toBe(7);
    expect(reachData.reaches.filter((r) => r.sea === 'The Far Sea')).toHaveLength(1);
  });

  it('gives every Reach between five and fifteen islands', () => {
    // A Reach holds as many islands as its painted cluster can show as
    // separate places, and the range is the range the chain view can lay
    // out clearly at a hundred islands.
    for (const reach of reachData.reaches) {
      expect(reach.islands.length).toBeGreaterThanOrEqual(5);
      expect(reach.islands.length).toBeLessThanOrEqual(15);
    }
  });

  it('names 63 distinct islands', () => {
    expect(allIslands).toHaveLength(63);
    expect(new Set(allIslands.map((i) => i.name)).size).toBe(63);
  });

  it('covers all seven Seas', () => {
    expect(new Set(reachData.reaches.map((r) => r.sea)).size).toBe(7);
  });

  it('marks exactly one island as the Imperium capital', () => {
    const capitals = allIslands.filter((i) => 'capital' in i && i.capital);
    expect(capitals).toHaveLength(1);
    expect(capitals[0].name).toBe(factionData.empire.capitalIslandName);
  });

  it('rosters seven named characters a side, each with a base per ability', () => {
    for (const faction of ['empire', 'alliance'] as const) {
      const roster = characterRoster[faction];
      expect(roster.length).toBeGreaterThanOrEqual(7);
      for (const entry of roster) {
        expect(entry.name.length).toBeGreaterThan(0);
        expect(entry.bio.length).toBeGreaterThan(0);
        // A named principal is a major character and swings twenty.
        expect(entry.major).toBe(true);
        const abilities = Object.keys(entry.ratings).sort();
        expect(abilities).toEqual(['combat', 'diplomacy', 'espionage', 'leadership']);
        for (const base of Object.values(entry.ratings)) {
          expect(Number.isInteger(base)).toBe(true);
          // Bases stay inside nought to a hundred; only a roll may pass it.
          expect(base).toBeGreaterThan(0);
          expect(base).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('gives each side the shape its war depends on', () => {
    // Sean's rule, 15 September: the Crown commands, the Brethren talk and
    // creep, and neither out-fights the other on average. These are roster
    // averages and nothing else — every officer is their own person, and the
    // two exceptions below are the point rather than a rounding error.
    const mean = (side: 'empire' | 'alliance', ability: string) => {
      const r = characterRoster[side];
      return r.reduce((n, e) => n + (e.ratings as Record<string, number>)[ability], 0) / r.length;
    };
    const gap = (ability: string) => mean('alliance', ability) - mean('empire', ability);
    expect(gap('leadership')).toBeLessThan(-8);
    expect(gap('diplomacy')).toBeGreaterThan(8);
    expect(gap('espionage')).toBeGreaterThan(8);
    expect(Math.abs(gap('combat'))).toBeLessThan(3);
  });

  it('keeps somebody on each side who is good at what their side is not', () => {
    // A faction average is a tendency, not a rule about people. The Crown's
    // best spy beats every Confederate but one; two of the Brethren out-lead
    // most of the Admiralty.
    const best = (side: 'empire' | 'alliance', ability: string) =>
      Math.max(...characterRoster[side].map((e) => (e.ratings as Record<string, number>)[ability]));
    expect(best('empire', 'espionage')).toBeGreaterThan(70);
    expect(best('alliance', 'leadership')).toBeGreaterThan(80);
    // And the Crown's best spy is better than all but one of theirs.
    const theirs = characterRoster.alliance
      .map((e) => (e.ratings as Record<string, number>).espionage)
      .sort((a, b) => b - a);
    expect(best('empire', 'espionage')).toBeGreaterThan(theirs[1]);
  });

  it('marks the unaligned minor, and rates them the same way', () => {
    for (const entry of characterRoster.recruits) {
      expect(entry.major).toBe(false);
      for (const base of Object.values(entry.ratings)) {
        expect(Number.isInteger(base)).toBe(true);
        expect(base).toBeGreaterThan(0);
        expect(base).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('the generated world matches the bible', () => {
  const state = generateGalaxy(1);

  it('draws every island name from the bible, and uses all of them', () => {
    const fromBible = new Set(reachData.reaches.flatMap((r) => r.islands.map((i) => i.name)));
    // One island a game answers to Freeport instead — the name the articles
    // were signed under. `chartName` is the island the painting knows.
    const generated = new Set(state.systems.map((s) => s.chartName ?? s.name));
    expect(generated).toEqual(fromBible);
    expect(state.systems.filter((s) => s.chartName)).toHaveLength(1);
  });

  it('keeps every island inside its own Reach', () => {
    for (const reach of reachData.reaches) {
      const sector = state.sectors.find((s) => s.name === reach.name)!;
      expect(sector).toBeDefined();
      const names = sector.systemIds.map((id) => {
        const island = state.systems.find((s) => s.id === id)!;
        return island.chartName ?? island.name;
      });
      expect(new Set(names)).toEqual(new Set(reach.islands.map((i) => i.name)));
    }
  });

  it('seats the Imperium at the Aldermain', () => {
    const hq = state.systems.find((s) => s.id === state.factions.empire.hqSystemId)!;
    expect(hq.name).toBe('The Aldermain');
    expect(hq.isCore).toBe(true);
  });

  it('tags every Reach with its Sea', () => {
    for (const sector of state.sectors) {
      const reach = reachData.reaches.find((r) => r.name === sector.name)!;
      expect(sector.sea).toBe(reach.sea);
    }
  });

  it('carries the bible notes through onto the islands that have them', () => {
    const aldermain = state.systems.find((s) => s.name === 'The Aldermain')!;
    expect(aldermain.note).toMatch(/seawalls/i);
    // And an island the data gives no note to still has none. Named by the
    // data rather than by hand: this was Avermere until 20 September, when
    // the lore package gave Avermere a note and the negative case with it.
    const bare = reachData.reaches
      .flatMap((r) => r.islands)
      .find((i) => !('note' in i) || !i.note)!;
    expect(bare, 'every island in the data now has a note').toBeTruthy();
    expect(state.systems.find((s) => s.name === bare.name)!.note).toBeUndefined();
  });

  it('fields a draw from the bible, each at exactly their base', () => {
    for (const faction of ['empire', 'alliance'] as const) {
      const roster = characterRoster[faction];
      const inGame = state.characters.filter((c) => c.faction === faction);
      // A draw now, not the whole roster: everyone in the game is from the
      // bible, in the bible's order, and there are fewer of them than it holds.
      expect(inGame.length).toBeLessThan(roster.length);
      const names = roster.map((e) => e.name);
      expect(inGame.map((c) => c.name)).toEqual(
        names.filter((n) => inGame.some((c) => c.name === n)),
      );
      for (const character of inGame) {
        const base = roster.find((e) => e.name === character.name)!.ratings;
        for (const ability of ['diplomacy', 'espionage', 'combat', 'leadership'] as const) {
          const from = base[ability];
          expect(character[ability]).toBeGreaterThanOrEqual(
            Math.max(1, from - RATING_SWING_MAJOR),
          );
          expect(character[ability]).toBeLessThanOrEqual(from + RATING_SWING_MAJOR);
        }
      }
    }
  });

  it('gives the principals no swing at all, and the strangers a wide one', () => {
    // Inverted at Sean's word: the thing you can look up is the thing you can
    // rely on. Measured over sixty worlds rather than asserted.
    const spread = (name: string) => {
      const seen: number[] = [];
      for (let seed = 1; seed <= 60; seed++) {
        const who = generateGalaxy(seed).characters.find((c) => c.name === name);
        if (who) seen.push(who.diplomacy);
      }
      expect(seen.length).toBeGreaterThan(10);
      return { lo: Math.min(...seen), hi: Math.max(...seen) };
    };
    const roster = [
      ...characterRoster.empire,
      ...characterRoster.alliance,
      ...characterRoster.recruits,
    ];
    const baseOf = (name: string) => roster.find((e) => e.name === name)!.ratings.diplomacy;

    // A principal is exactly who the bible says, in every game.
    const hale = spread('Commodore-Elect Adaira Hale');
    expect(hale.lo).toBe(baseOf('Commodore-Elect Adaira Hale'));
    expect(hale.hi).toBe(baseOf('Commodore-Elect Adaira Hale'));
    expect(RATING_SWING_MAJOR).toBe(0);

    // A stranger is an unknown quantity, and now genuinely is one — wide
    // enough that signing somebody on is a real gamble.
    const widow = spread('The Widow Ashgrave');
    const base = baseOf('The Widow Ashgrave');
    expect(widow.hi - widow.lo).toBeGreaterThan(RATING_SWING_MINOR);
    expect(widow.lo).toBeGreaterThanOrEqual(Math.max(1, base - RATING_SWING_MINOR));
    expect(widow.hi).toBeLessThanOrEqual(base + RATING_SWING_MINOR);
    // And the top is uncapped, which now belongs to the strangers.
    expect(base + RATING_SWING_MINOR).toBeGreaterThan(100);
  });

  it('carries each character\'s people through, which their portrait reads', () => {
    for (const faction of ['empire', 'alliance'] as const) {
      for (const character of state.characters.filter((c) => c.faction === faction)) {
        const entry = characterRoster[faction].find((e) => e.name === character.name)!;
        expect(character.people).toBe(entry.people);
      }
    }
    // Torvik is the one non-human major, and his portrait depends on knowing
    // it. He can be drawn out of a given war now, so this asks the bible when
    // he is not in this one — the portrait reads the same field either way.
    const torvik =
      state.characters.find((c) => c.name.includes('Torvik')) ??
      characterRoster.alliance.find((e) => e.name.includes('Torvik'))!;
    expect(torvik.people).toBe('Urskin');
  });

  it('makes Hale a better negotiator than Torvik, every game', () => {
    // Hale is a Lord and so is never drawn out; Torvik is, so when he is not
    // in the war the comparison is against what the bible says he would be.
    const torvikBase = characterRoster.alliance.find((e) => e.name.includes('Torvik'))!.ratings;
    for (let seed = 1; seed <= 25; seed++) {
      const trial = generateGalaxy(seed);
      const hale = trial.characters.find((c) => c.name.includes('Hale'))!;
      const torvik = trial.characters.find((c) => c.name.includes('Torvik')) ?? {
        diplomacy: torvikBase.diplomacy,
        combat: torvikBase.combat,
      };
      expect(hale.diplomacy).toBeGreaterThan(torvik.diplomacy);
      expect(torvik.combat).toBeGreaterThan(hale.combat);
    }
  });
});

describe('terminology', () => {
  it('labels the earners for the ground they need and the makers as Rebellion did', () => {
    // Renamed 16 September with the resource rule: an earner is named for what
    // it works, because what it works is now the whole question of where it
    // can go.
    expect(FACILITY_LABEL.mine).toBe('Gold Mine');
    expect(FACILITY_LABEL.refinery).toBe('Lumber Mill');
    // Sean's call, 14 September: the makers keep the original's plain names.
    expect(FACILITY_LABEL.construction_yard).toBe('Construction Yard');
    expect(FACILITY_LABEL.training_facility).toBe('Training Facility');
    expect(FACILITY_LABEL.shipyard).toBe('Shipyard');
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

    // Full pace and nothing smuggled at a hundred; half pace at nothing, less
    // whatever the companies ashore fail to stop leaving by the back door.
    expect(mines).toBeGreaterThan(0);
    const leak = Math.max(0, 0.25 * (1 - GARRISON_SMUGGLING_CUT * island.garrison));
    expect(atFull - atNone).toBeCloseTo(rate - rate * 0.5 * (1 - leak), 5);
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
    // The Regent, and whoever else the deal left in the citadel's Reach.
    const home = state.characters.filter(
      (c) => c.faction === 'empire' && c.locationSystemId === hq.id,
    ).length;
    expect(atHome.missions).toBe(home);
    expect(home).toBeGreaterThan(0);

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

describe('the roster', () => {
  it('gives every single person a name, a people and something to read', () => {
    // The character sheet has a lore panel, and a panel with nothing in it is
    // worse than no panel: for a while the twelve unaligned had one each.
    const state = generateGalaxy(501, 'empire');
    // Four a side, five for the Confederacy, and the unaligned in play.
    expect(state.characters.length).toBeGreaterThan(12);
    for (const person of state.characters) {
      expect(person.name.length).toBeGreaterThan(2);
      expect(person.people, person.name).toBeTruthy();
      expect(person.blurb, `${person.name} has no bio`).toBeTruthy();
      expect((person.blurb ?? '').length, person.name).toBeGreaterThan(60);
      expect(person.epithet, `${person.name} has no epithet`).toBeTruthy();
    }
  });
});

/**
 * Sean, on Adaira Hale's ship: *"Free Harbor and Freeport sound too alike.
 * Change Freeharbor name."* He is right, and the collision is the kind that
 * only shows up when somebody reads the two names a minute apart — a ship and
 * the Confederacy's meeting place, both opening on the same four letters. She
 * is the *Open Deck* now.
 *
 * Four letters is the test because four letters is what the ear catches. It
 * runs over every hull against every island, so the next name that lands too
 * near an existing one fails here rather than in somebody's head.
 */
describe('names a player hears', () => {
  const bare = (x: string) => x.toLowerCase().replace(/[^a-z]/g, '');
  const shared = (a: string, b: string) => {
    const x = bare(a);
    const y = bare(b);
    let n = 0;
    while (n < x.length && n < y.length && x[n] === y[n]) n += 1;
    return n;
  };

  it('gives no ship a name that opens like the name of an island', () => {
    const state = generateGalaxy(501, 'alliance');
    for (const cls of SHIP_CLASSES) {
      for (const island of state.systems) {
        expect(
          shared(cls.name, island.name),
          `${cls.name} / ${island.name}`,
        ).toBeLessThan(4);
      }
    }
  });
});
