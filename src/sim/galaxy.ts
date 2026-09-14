import factionData from '../data/factions.json';
import characterRoster from '../data/characters.json';
import reachData from '../data/reaches.json';
import chartData from '../data/chart.json';
import { createRng, type Rng } from './rng';
import {
  RECRUITS_AT_START,
  RECRUIT_LAST_DAY,
  RECRUITS_IN_PLAY,
  START_GARRISON_MAX,
  START_GARRISON_SPARE,
} from './constants';

import type {
  Character,
  Facility,
  FacilityType,
  GameState,
  PlayableFaction,
  Sector,
  System,
  IslandArchetype,
  ShipClassId,
} from './types';
import { recomputeLedger } from './economy';
import { requiredGarrison } from './helpers';

/**
 * What each Sea's islands look like.
 *
 * The first entry is what a settled island there tends to be; the rest are the
 * variety. An empty island is bare rock or ice whatever Sea it is in, because
 * nobody has built anything on it to look at.
 *
 * This is the one place the world's character becomes a picture: the Far Sea is
 * ice and bare crag, the Amber Sea is reef and jungle, the Bone Sea is drowned
 * temples and water the Tide has reached. Seeded from the island's own name, so
 * a given island looks the same in every game.
 */
const LOOKS: Record<string, IslandArchetype[]> = {
  // The Crown Sea's ports are the three flagged on the great island; the rest
  // of the Reach is the country around them.
  'The Crown Sea': ['jungle-isle', 'rock-isle'],
  'The Merchant Sea': ['port-city', 'jungle-isle', 'mining-isle'],
  'The Amber Sea': ['reef-isle', 'jungle-isle', 'port-city'],
  'The Far Sea': ['ice-isle', 'rock-isle', 'mining-isle'],
  'The Sea of Storms': ['storm-isle', 'jungle-isle', 'mining-isle'],
  'The Glass Sea': ['mining-isle', 'drowned-isle', 'rock-isle'],
  'The Bone Sea': ['drowned-isle', 'tide-isle', 'free-harbor'],
};
const BARE: Record<string, IslandArchetype> = {
  'The Far Sea': 'ice-isle',
  'The Bone Sea': 'tide-isle',
  'The Glass Sea': 'rock-isle',
};

function looksLike(sea: string, populated: boolean, port: boolean, pick: number): IslandArchetype {
  if (port) return 'port-city';
  if (!populated) return BARE[sea] ?? 'rock-isle';
  const set = LOOKS[sea] ?? ['jungle-isle', 'rock-isle'];
  return set[pick % set.length];
}

type ReachRole = 'home' | 'contested' | 'open' | 'frontier';
const roleOf = (reach: { role: string }) => reach.role as ReachRole;

const INNER_REACHES = reachData.reaches.filter((r) => r.tier === 'inner');
const OUTER_REACHES = reachData.reaches.filter((r) => r.tier === 'outer');
const CORE_SECTOR_COUNT = INNER_REACHES.length;
const RIM_SECTOR_COUNT = OUTER_REACHES.length;
/** How many islands a Reach holds is the Reach's own business now. The small
 *  map runs from seven to ten, set by how many clearly separated islands each
 *  one's painted cluster can actually carry — see scripts/chart_positions.py. */

/** Galaxy coordinate space is a square box; sectors sit on two concentric rings. */
export const GALAXY_SIZE = 1200;
/** Radius of the drawn sector disc. Rings are spaced so no two discs overlap. */
export const SECTOR_RING_RADIUS = 118;
const GALAXY_CENTER = GALAXY_SIZE / 2;
const CORE_RING_RADIUS = 230;
const RIM_RING_RADIUS = 460;
/** Systems scatter inside a disc of this radius around their sector centre. */
const SECTOR_RADIUS = 105;
const MIN_SYSTEM_SEPARATION = 38;

/**
 * The opening, Rebellion's shape (docs/opening.md).
 *
 * Every Reach has a role. The Crown's home Reach holds the seat and the three
 * port cities of the great island; the Crown opens with the seat, one of the
 * other two ports and one more island there, and the Confederacy with one or
 * two. Three contested Reaches open with two islands a side and the rest
 * settled and nobody's — garrisoned, so taking them is a landing, not a
 * stroll. One Reach is charted and open. Three frontier Reaches start
 * unexplored by everyone, a quarter of their islands settled behind the fog,
 * and the Confederacy's base is one island in one of them, with its fleet.
 */
const START_CONTESTED_PER_SIDE = 2;
const START_HOME_CONFEDERACY: [number, number] = [1, 2];
const FRONTIER_SETTLED_CHANCE = 0.25;
/** Companies a settled island that is nobody's opens with, by how far out it is. */
const NEUTRAL_GARRISON: Record<ReachRole, [number, number]> = {
  home: [1, 3],
  contested: [1, 3],
  open: [1, 2],
  frontier: [2, 4],
};
/**
 * Earners per side. Nine islands a side now, each with a garrison to feed, so
 * more than the old six-and-four opening carried. Measured across seeds to
 * leave both sides a clear surplus on day one and free ground everywhere.
 */
const START_EARNERS: Record<PlayableFaction, { mines: number; refineries: number }> = {
  empire: { mines: 15, refineries: 15 },
  alliance: { mines: 14, refineries: 14 },
};
const START_YARDS = 2;
const START_TRAINING = 1;
/** A yard for hulls, so a slipway is not the first thing you have to build. */
const START_SHIPYARDS = 1;
/**
 * The fleet each side already has on the water.
 *
 * The board used to open with none at all, which meant the whole naval half of
 * the game was twenty-two days away — the time to build a slipway and then a
 * hull — and the first three weeks were a menu. Rebellion hands you a navy on
 * turn one and lets you find out what it is for.
 *
 * Asymmetric on purpose, the way the two sides are: the Crown has the ship of
 * the line and the weight, the Confederacy has hulls that outrun it. Neither
 * has enough to win with, which is what makes the slipway worth building.
 */
const START_FLEET: Record<PlayableFaction, ShipClassId[]> = {
  // Rebellion's Imperial opening, hull for hull: one ship of the line, two
  // heavy frigates, a light cruiser and a transport.
  empire: ['sovereign', 'razorback', 'razorback', 'kestrel', 'fluyt'],
  // And the Rebel one: a pack of corvettes, a single bulk cruiser, a transport.
  alliance: ['swift', 'swift', 'swift', 'swift', 'tempest', 'brig'],
};
/** Companies aboard the transport, ready to take somewhere. */
const START_TROOPS_ABOARD = 2;

/**
 * The garrison an island opens with: what its allegiance needs, plus a
 * margin, capped. Read off the same rule the uprising check uses, so the
 * opening is consistent with the game that follows — a sullen holding starts
 * with the companies that are actually keeping it, not a token two.
 */
function startGarrison(support: number, capital: boolean): number {
  const needed = requiredGarrison(support) + START_GARRISON_SPARE + (capital ? 1 : 0);
  return Math.min(START_GARRISON_MAX, Math.max(1, needed));
}
const START_CHARACTERS = 7;
/** Enough to lay down a camp or two before the first income arrives. */
const START_GOLD = 150;

/** Scatter points inside the sector disc, rejecting anything too close. */
function scatterSystems(rng: Rng, count: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  while (points.length < count) {
    let placed = false;
    for (let attempt = 0; attempt < 60 && !placed; attempt++) {
      const angle = rng.next() * Math.PI * 2;
      const radius = Math.sqrt(rng.next()) * SECTOR_RADIUS;
      const p = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
      const clash = points.some(
        (q) => Math.hypot(q.x - p.x, q.y - p.y) < MIN_SYSTEM_SEPARATION,
      );
      if (!clash) {
        points.push(p);
        placed = true;
      }
    }
    if (!placed) {
      // Fall back to a ring position so generation always terminates.
      const angle = (points.length / count) * Math.PI * 2;
      points.push({
        x: Math.cos(angle) * SECTOR_RADIUS,
        y: Math.sin(angle) * SECTOR_RADIUS,
      });
    }
  }
  return points;
}

function makeFacility(id: string, type: FacilityType, owner: PlayableFaction): Facility {
  return { id, type, owner };
}

/**
 * Build a fresh archipelago: seven Reaches, one for each Sea, three inner and
 * four outer, holding sixty-three islands between them.
 *
 * It used to be ten Reaches of ten. The cut is not a simplification for its own
 * sake — the chart is a painting now, and three of the ten sat on clusters the
 * painting could not chart clearly: two crowded against a neighbour and one
 * drawn on islets too small to hit. Each of the three shared a Sea with a Reach
 * that survives, so nothing about the world is lost; they are held back for the
 * larger maps beside Scrap Reach, exactly as the bible already holds that one.
 *
 * A Sea and a Reach are therefore the same thing at this size, which is why the
 * chart can name the Seas and the panels can name the Reaches without either
 * one lying.
 */
/**
 * How much of the chart around each island's mark is painted land, 0 to 1,
 * measured by scripts/chart_positions.py. Room follows the look of the chart:
 * a rock in open water has nowhere to build, a harbour with the great island
 * at its back has room for a city.
 */
const LAND_ON_THE_CHART = new Map<string, number>(
  chartData.reaches.flatMap((r) => r.islands.map((i) => [i.name, i.land] as const)),
);

/** The most an island can hold, ground and water together. */
export const ROOM_MAX = 12;
/** The least: a rock with a jetty. */
export const ROOM_MIN = 3;

/**
 * An island's room, from the land around its mark. Square-rooted so a
 * quarter-land coast is not a quarter of a city: 3 on a bare rock, 6 or 7
 * on an ordinary island, 12 where the great island fills the frame.
 */
export function roomFor(name: string): { ground: number; water: number } {
  const land = LAND_ON_THE_CHART.get(name) ?? 0.2;
  const total = Math.max(ROOM_MIN, Math.min(ROOM_MAX, Math.round(1 + 11 * Math.sqrt(land))));
  const ground = Math.round(total * 0.45);
  return { ground, water: total - ground };
}

export function generateGalaxy(seed: number, player: PlayableFaction = 'empire'): GameState {
  const rng = createRng(seed);

  const sectors: Sector[] = [];
  const systems: System[] = [];
  let idCounter = 0;
  const makeId = (prefix: string) => `${prefix}-${++idCounter}`;

  const reaches = [...INNER_REACHES, ...OUTER_REACHES];

  for (let s = 0; s < reaches.length; s++) {
    const reach = reaches[s];
    const isCoreSector = reach.tier === 'inner';
    const indexInRing = isCoreSector ? s : s - CORE_SECTOR_COUNT;
    const ringCount = isCoreSector ? CORE_SECTOR_COUNT : RIM_SECTOR_COUNT;
    const radius = isCoreSector ? CORE_RING_RADIUS : RIM_RING_RADIUS;
    // Offset the core ring by half a step so core and rim clusters interleave.
    const angle =
      (indexInRing / ringCount) * Math.PI * 2 + (isCoreSector ? Math.PI / ringCount : 0);

    const sector: Sector = {
      id: makeId('sec'),
      name: reach.name,
      sea: reach.sea,
      systemIds: [],
      x: GALAXY_CENTER + Math.cos(angle) * radius,
      y: GALAXY_CENTER + Math.sin(angle) * radius,
    };

    // Islands take the positions in the order the bible lists them, so a
    // named island always sits in its own Reach.
    const count = reach.islands.length;
    const points = scatterSystems(rng, count);
    for (let i = 0; i < count; i++) {
      const island = reach.islands[i];
      const role = roleOf(reach);
      // Frontier islands are settled a quarter of the time, and nobody knows
      // which until somebody lands. Everywhere else is settled and charted.
      const populated = role === 'frontier' ? rng.chance(FRONTIER_SETTLED_CHANCE) : true;
      const charted = role !== 'frontier';
      const port = 'port' in island && Boolean(island.port);
      const system: System = {
        id: makeId('sys'),
        name: island.name,
        note: 'note' in island ? (island.note as string) : undefined,
        sectorId: sector.id,
        x: points[i].x,
        y: points[i].y,
        explored: { empire: charted, alliance: charted },
        archetype: looksLike(
          sector.sea,
          populated,
          port,
          // Seeded from the name so an island looks the same in every game.
          [...island.name].reduce((n, c) => n + c.charCodeAt(0), 0),
        ),
        populated,
        isCore: isCoreSector,
        control: 'none',
        support: { empire: 0, alliance: 0 },
        // Room follows the painting, not the dice: the same island has the
        // same ground in every game. A port keeps one more berth on the water.
        rawSlots: roomFor(island.name).ground,
        energySlots: roomFor(island.name).water + (port ? 1 : 0),
        facilities: [],
        garrison: 0,
        uprising: false,
        blockaded: false,
      };
      if (populated) {
        // Any inhabited island that has not picked a side is neutral, and can
        // be courted. The home and contested Reaches are closer to the war and
        // more polarised than the settlements out on the open sea and beyond.
        system.control = 'neutral';
        system.support =
          role === 'home' || role === 'contested'
            ? { empire: rng.range(15, 45), alliance: rng.range(10, 40) }
            : { empire: rng.range(0, 20), alliance: rng.range(0, 20) };
        // Settled and nobody's means somebody is holding it. A landing has to
        // beat these companies; a parley has to win them over.
        const [lo, hi] = NEUTRAL_GARRISON[role];
        system.garrison = rng.range(lo, hi);
      }
      sector.systemIds.push(system.id);
      systems.push(system);
    }
    sectors.push(sector);
  }

  const byId = new Map(systems.map((s) => [s.id, s] as const));
  const reachOf = (sector: Sector) => reaches.find((r) => r.name === sector.name)!;
  const islandsOf = (sector: Sector) => sector.systemIds.map((id) => byId.get(id)!);
  const homeSector = sectors.find((sec) => roleOf(reachOf(sec)) === 'home')!;
  const contestedSectors = sectors.filter((sec) => roleOf(reachOf(sec)) === 'contested');
  const frontierSectors = sectors.filter((sec) => roleOf(reachOf(sec)) === 'frontier');

  const hold = (
    system: System,
    owner: PlayableFaction,
    support: { empire: number; alliance: number },
  ) => {
    system.control = owner;
    system.populated = true;
    system.support = support;
  };
  const loyal = (owner: PlayableFaction) =>
    owner === 'empire'
      ? { empire: rng.range(65, 85), alliance: rng.range(5, 15) }
      : { empire: rng.range(5, 15), alliance: rng.range(65, 85) };

  // --- The Crown's seat: Highwater, the port city the world bible marks. ---
  const capital =
    systems.find((system) => system.name === factionData.empire.capitalIslandName) ??
    byId.get(homeSector.systemIds[0])!;
  hold(capital, 'empire', { empire: 100, alliance: 0 });

  // --- Home Reach: the seat, one of the other two ports, one more island. ---
  const empireSystems: System[] = [capital];
  const homeIslands = islandsOf(homeSector).filter((s) => s.id !== capital.id);
  const flaggedPorts = new Set(
    reachOf(homeSector)
      .islands.filter((i) => 'port' in i && Boolean(i.port))
      .map((i) => i.name),
  );
  const otherPorts = homeIslands.filter((s) => flaggedPorts.has(s.name));
  const secondPort = rng.pick(otherPorts.length > 0 ? otherPorts : homeIslands);
  hold(secondPort, 'empire', loyal('empire'));
  empireSystems.push(secondPort);
  const third = rng.pick(homeIslands.filter((s) => s.id !== secondPort.id));
  // Held, not loved: allegiance in the thirties and forties, above the
  // uprising line and under the garrison's boot. The island the Confederacy
  // will come for first, which is the point.
  hold(third, 'empire', { empire: rng.range(32, 45), alliance: rng.range(25, 40) });
  empireSystems.push(third);

  // The Confederacy has a foothold in the Crown's own Reach: one island, or
  // two — never on the great island itself. Its three ports are the Crown's
  // ground whoever holds them at the start; the rebels begin on an outlying
  // island of the chain.
  const allianceSystems: System[] = [];
  const homeLeft = rng.shuffle(
    homeIslands.filter((s) => s.control === 'neutral' && !flaggedPorts.has(s.name)),
  );
  for (const system of homeLeft.slice(0, rng.range(...START_HOME_CONFEDERACY))) {
    hold(system, 'alliance', loyal('alliance'));
    allianceSystems.push(system);
  }

  // --- Contested Reaches: two islands a side, the rest nobody's. ---
  for (const sector of contestedSectors) {
    const picks = rng.shuffle(islandsOf(sector)).slice(0, START_CONTESTED_PER_SIDE * 2);
    for (const [index, system] of picks.entries()) {
      const owner: PlayableFaction = index < START_CONTESTED_PER_SIDE ? 'empire' : 'alliance';
      hold(system, owner, loyal(owner));
      (owner === 'empire' ? empireSystems : allianceSystems).push(system);
    }
  }

  // --- The Confederacy's base: one island in one frontier Reach, hidden. ---
  const baseSector = rng.pick(frontierSectors);
  const allianceHq = rng.pick(islandsOf(baseSector));
  hold(allianceHq, 'alliance', { empire: 0, alliance: 100 });
  allianceHq.garrison = 0;
  allianceSystems.unshift(allianceHq);
  const hqSector = baseSector;

  const countOf = (system: System, mines: boolean) =>
    system.facilities.filter((f) => (f.type === 'mine') === mines).length;

  const seedHoldings = (owner: PlayableFaction, owned: System[]) => {
    for (const [index, system] of owned.entries()) {
      // Room is the painting's to give, not the opening's: a starting island
      // keeps the ground the chart shows it. The deal below only ever widens
      // an island by the one spare slot that lets it build on day one.
      system.garrison = startGarrison(system.support[owner], index === 0);
      system.explored[owner] = true;
    }
    const plan: FacilityType[] = [
      ...Array<FacilityType>(START_EARNERS[owner].mines).fill('mine'),
      ...Array<FacilityType>(START_EARNERS[owner].refineries).fill('refinery'),
      ...Array<FacilityType>(START_YARDS).fill('construction_yard'),
      ...Array<FacilityType>(START_TRAINING).fill('training_facility'),
      ...Array<FacilityType>(START_SHIPYARDS).fill('shipyard'),
    ];
    for (const [index, type] of plan.entries()) {
      // The seat is the naval base: the Slipway and the Drill Ground stand
      // where the Home Fleet lies, the way the original keeps the Imperial
      // yards at Coruscant. Dealt round-robin with the rest they landed on
      // the fourth island, and the capital had a fleet at anchor and no
      // port to have built it.
      const system =
        type === 'shipyard' || type === 'training_facility'
          ? owned[0]
          : owned[index % owned.length];
      if (type === 'mine') system.rawSlots = Math.max(system.rawSlots, countOf(system, true) + 1);
      else system.energySlots = Math.max(system.energySlots, countOf(system, false) + 1);
      system.facilities.push(makeFacility(makeId('fac'), type, owner));
    }
    // One spare slot of each kind on every starting island. An opening with
    // no free ground is a worse opening than a thin surplus, because the
    // answer to a thin surplus is to build.
    for (const system of owned) {
      system.rawSlots = Math.max(system.rawSlots, countOf(system, true) + 1);
      system.energySlots = Math.max(system.energySlots, countOf(system, false) + 1);
    }
  };
  seedHoldings('empire', empireSystems);
  seedHoldings('alliance', allianceSystems);

  // The Confederacy knows the Reach its base is in; nobody else does, and
  // the other frontier Reaches are a blank to both.
  for (const id of hqSector.systemIds) byId.get(id)!.explored.alliance = true;

  // --- Characters: the world bible's seven majors per side, all at HQ. ---
  const characters: Character[] = [];
  const makeCharacters = (faction: PlayableFaction, hqId: string) => {
    // Each rating is rolled inside that character's band, so Hale is always a
    // formidable negotiator and Torvik is always the one you send aboard,
    // while no two games give quite the same numbers.
    for (const entry of characterRoster[faction].slice(0, START_CHARACTERS)) {
      const roll = (band: number[]) => rng.range(band[0], band[1]);
      characters.push({
        id: makeId('chr'),
        name: entry.name,
        people: entry.people,
        blurb: 'bio' in entry ? (entry.bio as string) : undefined,
        epithet: 'epithet' in entry ? (entry.epithet as string) : undefined,
        roles: 'roles' in entry ? (entry.roles as string[]) : undefined,
        faction,
        diplomacy: roll(entry.ratings.diplomacy),
        espionage: roll(entry.ratings.espionage),
        combat: roll(entry.ratings.combat),
        leadership: roll(entry.ratings.leadership),
        locationSystemId: hqId,
        status: 'available',
      });
    }
  };
  makeCharacters('empire', capital.id);
  makeCharacters('alliance', allianceHq.id);

  // --- The unaligned: people the war has not claimed yet. ---
  // Scattered over settled islands that are not anybody's seat, so signing
  // someone on is a reason to sail somewhere you had no other reason to go.
  // Which of the pool turn up, and where, changes with the seed.
  const openIslands = rng.shuffle(
    systems.filter(
      (s) => s.populated && s.id !== capital.id && s.id !== allianceHq.id,
    ),
  );
  const inPlay = Math.min(RECRUITS_IN_PLAY, openIslands.length);
  for (const [index, entry] of rng
    .shuffle(characterRoster.recruits)
    .slice(0, inPlay)
    .entries()) {
    const roll = (band: number[]) => rng.range(band[0], band[1]);
    // A couple are ashore on day one so the errand is discoverable; the rest
    // are spread over the war, evenly with a little jitter so they do not
    // arrive on a drumbeat.
    const later = index - RECRUITS_AT_START;
    const spread = Math.max(1, inPlay - RECRUITS_AT_START);
    characters.push({
      id: makeId('chr'),
      name: entry.name,
      people: entry.people,
      // The same field the named cast reads. The unaligned used to carry a
      // one-line pitch here instead, which read as a caption on a page the
      // game gives a whole panel to.
      blurb: entry.bio,
      epithet: entry.epithet,
      faction: 'neutral',
      diplomacy: roll(entry.ratings.diplomacy),
      espionage: roll(entry.ratings.espionage),
      combat: roll(entry.ratings.combat),
      leadership: roll(entry.ratings.leadership),
      locationSystemId: openIslands[index].id,
      status: 'available',
      appearsOnDay:
        index < RECRUITS_AT_START
          ? 1
          : Math.round((later + 1) * (RECRUIT_LAST_DAY / spread)) + rng.range(-12, 12),
    });
  }

  const state: GameState = {
    day: 1,
    speed: 'paused',
    player,
    sectors,
    systems,
    characters,
    fleets: [],
    factions: {
      empire: { gold: START_GOLD, income: 0, upkeep: 0, hqSystemId: capital.id, craft: 0 },
      alliance: { gold: START_GOLD, income: 0, upkeep: 0, hqSystemId: allianceHq.id, craft: 0 },
    },
    events: [],
    pendingDecisions: [],
    rngSeed: rng.seed,
    nextId: idCounter,
  };

  // --- The fleet already at sea. ---
  //
  // Built here rather than through addShip because that lives in fleets.ts and
  // would import back into this file; the shape is small enough to write out.
  for (const [faction, classes] of Object.entries(START_FLEET) as Array<
    [PlayableFaction, ShipClassId[]]
  >) {
    const home = faction === 'empire' ? capital : allianceHq;
    state.fleets.push({
      id: `flt-${++state.nextId}`,
      name: 'Home Fleet',
      faction,
      systemId: home.id,
      ships: classes.map((classId) => ({ id: `shp-${++state.nextId}`, classId, damage: 0 })),
      troops: START_TROOPS_ABOARD,
      officerIds: [],
    });
  }

  recomputeLedger(state);
  state.events.push({
    id: `evt-${++state.nextId}`,
    day: 1,
    kind: 'war',
      text: `The ${factionData.alliance.name} declares against the ${factionData.empire.name}. The war for the Seven Seas begins.`,
  });
  return state;
}
