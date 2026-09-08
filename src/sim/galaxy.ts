import factionData from '../data/factions.json';
import characterNames from '../data/characters.json';
import sectorNames from '../data/sectors.json';
import systemNameParts from '../data/systemNames.json';
import { createRng, type Rng } from './rng';
import { MAINTENANCE_PER_PAIR } from './constants';
import type {
  Character,
  Facility,
  FacilityType,
  GameState,
  PlayableFaction,
  Sector,
  System,
} from './types';
import { recomputeMaintenance } from './economy';

const CORE_SECTOR_COUNT = 4;
const RIM_SECTOR_COUNT = 6;
const SYSTEMS_PER_SECTOR = 10;

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
const START_GARRISON = 2;
const START_CHARACTERS = 7;

function uniqueSystemName(rng: Rng, taken: Set<string>): string {
  for (let attempt = 0; attempt < 200; attempt++) {
    const base = rng.pick(systemNameParts.prefixes) + rng.pick(systemNameParts.suffixes);
    const name =
      attempt < 40 && !taken.has(base)
        ? base
        : `${base} ${rng.pick(systemNameParts.designations)}`;
    if (!taken.has(name)) {
      taken.add(name);
      return name;
    }
  }
  let n = 1;
  while (taken.has(`Uncharted ${n}`)) n++;
  taken.add(`Uncharted ${n}`);
  return `Uncharted ${n}`;
}

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
 * Build a fresh 100-system galaxy: 10 sectors of 10 systems, 4 core sectors
 * ringed by 6 rim sectors (spec 4.1).
 */
export function generateGalaxy(seed: number, player: PlayableFaction = 'empire'): GameState {
  const rng = createRng(seed);
  const takenNames = new Set<string>();

  const sectors: Sector[] = [];
  const systems: System[] = [];
  let idCounter = 0;
  const makeId = (prefix: string) => `${prefix}-${++idCounter}`;

  const sectorNameList = [...sectorNames.core, ...sectorNames.rim];

  for (let s = 0; s < CORE_SECTOR_COUNT + RIM_SECTOR_COUNT; s++) {
    const isCoreSector = s < CORE_SECTOR_COUNT;
    const indexInRing = isCoreSector ? s : s - CORE_SECTOR_COUNT;
    const ringCount = isCoreSector ? CORE_SECTOR_COUNT : RIM_SECTOR_COUNT;
    const radius = isCoreSector ? CORE_RING_RADIUS : RIM_RING_RADIUS;
    // Offset the core ring by half a step so core and rim clusters interleave.
    const angle =
      (indexInRing / ringCount) * Math.PI * 2 + (isCoreSector ? Math.PI / ringCount : 0);

    const sector: Sector = {
      id: makeId('sec'),
      name: sectorNameList[s],
      systemIds: [],
      x: GALAXY_CENTER + Math.cos(angle) * radius,
      y: GALAXY_CENTER + Math.sin(angle) * radius,
    };

    const points = scatterSystems(rng, SYSTEMS_PER_SECTOR);
    for (let i = 0; i < SYSTEMS_PER_SECTOR; i++) {
      const populated = isCoreSector ? true : rng.chance(0.3);
      const system: System = {
        id: makeId('sys'),
        name: uniqueSystemName(rng, takenNames),
        sectorId: sector.id,
        x: points[i].x,
        y: points[i].y,
        explored: { empire: isCoreSector, alliance: isCoreSector },
        populated,
        isCore: isCoreSector,
        control: 'none',
        support: { empire: 0, alliance: 0 },
        rawSlots: isCoreSector ? rng.range(2, 4) : rng.range(0, 5),
        energySlots: isCoreSector ? rng.range(3, 6) : rng.range(0, 4),
        facilities: [],
        garrison: 0,
        uprising: false,
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

  // --- Empire capital: a fixed core world in the first core sector. ---
  const capital = byId.get(coreSectors[0].systemIds[0])!;
  capital.name = factionData.empire.capitalSystemName;
  takenNames.add(capital.name);
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

  // --- Characters: seven per side, all at HQ. ---
  const characters: Character[] = [];
  const makeCharacters = (faction: PlayableFaction, hqId: string) => {
    const pool = rng.shuffle(characterNames[faction]).slice(0, START_CHARACTERS);
    for (const [index, name] of pool.entries()) {
      // The first name drawn is the side's figurehead: better across the board.
      const floor = index === 0 ? 60 : 25;
      const ceiling = index === 0 ? 95 : 85;
      characters.push({
        id: makeId('chr'),
        name,
        faction,
        diplomacy: rng.range(floor, ceiling),
        espionage: rng.range(floor, ceiling),
        combat: rng.range(floor, ceiling),
        leadership: rng.range(floor, ceiling),
        locationSystemId: hqId,
        status: 'available',
      });
    }
  };
  makeCharacters('empire', capital.id);
  makeCharacters('alliance', allianceHq.id);

  const state: GameState = {
    day: 1,
    speed: 'paused',
    player,
    sectors,
    systems,
    characters,
    factions: {
      empire: {
        raw: 40,
        refined: 120,
        maintenanceCapacity: MAINTENANCE_PER_PAIR * START_MINES,
        maintenanceUsed: 0,
        hqSystemId: capital.id,
        overCapacityDays: 0,
      },
      alliance: {
        raw: 40,
        refined: 120,
        maintenanceCapacity: MAINTENANCE_PER_PAIR * START_MINES,
        maintenanceUsed: 0,
        hqSystemId: allianceHq.id,
        overCapacityDays: 0,
      },
    },
    events: [],
    pendingDecisions: [],
    rngSeed: rng.seed,
    nextId: idCounter,
  };

  recomputeMaintenance(state);
  state.events.push({
    id: `evt-${++state.nextId}`,
    day: 1,
    text: `The ${factionData.alliance.name} declares itself against the ${factionData.empire.name}. The war begins.`,
  });
  return state;
}
