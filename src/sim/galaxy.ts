import factionData from '../data/factions.json';
import characterRoster from '../data/characters.json';
import reachData from '../data/reaches.json';
import { createRng, type Rng } from './rng';
import { RECRUITS_AT_START, RECRUIT_LAST_DAY, RECRUITS_IN_PLAY } from './constants';

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
  'The Crown Sea': ['port-city', 'rock-isle', 'jungle-isle'],
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

function looksLike(sea: string, populated: boolean, capital: boolean, pick: number): IslandArchetype {
  if (capital) return 'port-city';
  if (!populated) return BARE[sea] ?? 'rock-isle';
  const set = LOOKS[sea] ?? ['jungle-isle', 'rock-isle'];
  return set[pick % set.length];
}

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

/** Starting holdings per side (spec 4.1). */
const START_SYSTEMS_PER_SIDE = 4;
const START_MINES = 8;
const START_REFINERIES = 8;
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
  empire: ['razorback', 'kestrel', 'kestrel', 'fluyt'],
  alliance: ['swift', 'swift', 'swift', 'brig'],
};
/** Companies aboard the transport, ready to take somewhere. */
const START_TROOPS_ABOARD = 2;
const START_GARRISON = 2;
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
      const populated = isCoreSector ? true : rng.chance(0.3);
      const system: System = {
        id: makeId('sys'),
        name: island.name,
        note: 'note' in island ? (island.note as string) : undefined,
        sectorId: sector.id,
        x: points[i].x,
        y: points[i].y,
        explored: { empire: isCoreSector, alliance: isCoreSector },
        archetype: looksLike(
          sector.sea,
          populated,
          'capital' in island && Boolean(island.capital),
          // Seeded from the name so an island looks the same in every game.
          [...island.name].reduce((n, c) => n + c.charCodeAt(0), 0),
        ),
        populated,
        isCore: isCoreSector,
        control: 'none',
        support: { empire: 0, alliance: 0 },
        rawSlots: isCoreSector ? rng.range(2, 4) : rng.range(0, 5),
        energySlots: isCoreSector ? rng.range(3, 6) : rng.range(0, 4),
        facilities: [],
        garrison: 0,
        uprising: false,
        blockaded: false,
      };
      if (populated) {
        // Any inhabited world that has not picked a side is neutral, and can be
        // courted. Core worlds are closer to the war and more polarised than
        // the scattered settlements out on the rim.
        system.control = 'neutral';
        system.support = isCoreSector
          ? { empire: rng.range(15, 45), alliance: rng.range(10, 40) }
          : { empire: rng.range(0, 20), alliance: rng.range(0, 20) };
      }
      sector.systemIds.push(system.id);
      systems.push(system);
    }
    sectors.push(sector);
  }

  const byId = new Map(systems.map((s) => [s.id, s] as const));
  const coreSectors = sectors.slice(0, CORE_SECTOR_COUNT);
  const rimSectors = sectors.slice(CORE_SECTOR_COUNT);

  // --- Imperium capital: the island the world bible marks as the seat. ---
  const capital =
    systems.find((system) => system.name === factionData.empire.capitalIslandName) ??
    byId.get(coreSectors[0].systemIds[0])!;
  capital.control = 'empire';
  capital.support = { empire: 100, alliance: 0 };

  // --- Alliance HQ: a random rim world, hidden out on the fringe. ---
  const hqSector = rng.pick(rimSectors);
  const allianceHq = byId.get(rng.pick(hqSector.systemIds))!;
  allianceHq.control = 'alliance';
  allianceHq.populated = true;
  allianceHq.support = { empire: 0, alliance: 100 };

  // --- Starting holdings. ---
  const empireSystems: System[] = [capital];
  const otherCore = rng
    .shuffle(
      systems.filter((s) => s.isCore && s.id !== capital.id && s.control === 'neutral'),
    )
    .slice(0, START_SYSTEMS_PER_SIDE - 1);
  for (const system of otherCore) {
    system.control = 'empire';
    system.support = { empire: rng.range(65, 85), alliance: rng.range(5, 15) };
    empireSystems.push(system);
  }

  const allianceSystems: System[] = [allianceHq];
  const otherRim = rng
    .shuffle(hqSector.systemIds.filter((id) => id !== allianceHq.id))
    .slice(0, START_SYSTEMS_PER_SIDE - 1)
    .map((id) => byId.get(id)!);
  for (const system of otherRim) {
    system.control = 'alliance';
    system.populated = true;
    system.support = { empire: rng.range(5, 15), alliance: rng.range(65, 85) };
    allianceSystems.push(system);
  }

  const countOf = (system: System, mines: boolean) =>
    system.facilities.filter((f) => (f.type === 'mine') === mines).length;

  const seedHoldings = (owner: PlayableFaction, owned: System[]) => {
    for (const [index, system] of owned.entries()) {
      const generous = index === 0;
      system.rawSlots = Math.max(system.rawSlots, generous ? 4 : 3);
      system.energySlots = Math.max(system.energySlots, generous ? 6 : 5);
      system.garrison = START_GARRISON;
      system.explored[owner] = true;
    }
    const plan: FacilityType[] = [
      ...Array<FacilityType>(START_MINES).fill('mine'),
      ...Array<FacilityType>(START_REFINERIES).fill('refinery'),
      ...Array<FacilityType>(START_YARDS).fill('construction_yard'),
      ...Array<FacilityType>(START_TRAINING).fill('training_facility'),
      ...Array<FacilityType>(START_SHIPYARDS).fill('shipyard'),
    ];
    for (const [index, type] of plan.entries()) {
      const system = owned[index % owned.length];
      if (type === 'mine') system.rawSlots = Math.max(system.rawSlots, countOf(system, true) + 1);
      else system.energySlots = Math.max(system.energySlots, countOf(system, false) + 1);
      system.facilities.push(makeFacility(makeId('fac'), type, owner));
    }
  };
  seedHoldings('empire', empireSystems);
  seedHoldings('alliance', allianceSystems);

  // The Alliance knows its own corner of the rim; the Empire does not.
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
      blurb: entry.blurb,
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
      empire: { gold: START_GOLD, income: 0, upkeep: 0, hqSystemId: capital.id },
      alliance: { gold: START_GOLD, income: 0, upkeep: 0, hqSystemId: allianceHq.id },
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
