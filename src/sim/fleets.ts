/**
 * Fleets: hulls, where they are, and what happens when two of them meet.
 *
 * Spec section 7, Phase 2. A fleet is one thing that moves as one thing,
 * carrying ships and the companies aboard them, after the original's fleet
 * window rather than a stack of ships with a leader attached elsewhere.
 */
import {
  BREAK_OFF_ODDS,
  BOOM_BLOCKADE_GUNS,
  BOOM_DEFENCE,
  FORT_GUNS,
  OFFICER_EDGE,
  SCOUT_PER_ISLAND,
  shipSpec,
  HIT_CHANCE,
  LONG_GUN_SHARE,
  RETREAT_SHOTS,
} from './constants';
import {
  beastAlive,
  beastAt,
  beastCombatant,
  beastGuns,
  monsterShots,
  monsterStrike,
  sightBeast,
} from './creatures';
import { fireOnce, pickTarget, type Combatant } from './round';
import { getSystem, nextId, otherFaction, pushEvent, setSupport } from './helpers';
import { captureLord, fleetHeldAshore, isLord, isLordShip, shipPower } from './lords';
import { travelDays } from './missions';
import type { Rng } from './rng';
import type {
  BattleOutcome,
  Character,
  Fleet,
  GameState,
  PendingBattle,
  PlayableFaction,
  Ship,
  ShipClassId,
  System,
} from './types';

/** A fleet at sea is nowhere, and can neither fight nor be fought. */
export function isAtSea(fleet: Fleet): boolean {
  return fleet.voyage !== undefined;
}

export function fleetsAt(state: GameState, systemId: string): Fleet[] {
  return state.fleets.filter((f) => f.systemId === systemId && !isAtSea(f));
}

export function fleetsOf(state: GameState, faction: PlayableFaction): Fleet[] {
  return state.fleets.filter((f) => f.faction === faction);
}

export function findFleet(state: GameState, fleetId: string): Fleet | undefined {
  return state.fleets.find((f) => f.id === fleetId);
}

/** Guns a hull still brings, which is nothing once it is on the bottom. */
export function shipGuns(ship: Ship): number {
  const spec = shipSpec(ship.classId);
  return ship.damage >= spec.hull ? 0 : spec.guns;
}


export function fleetGuns(fleet: Fleet): number {
  return fleet.ships.reduce((total, ship) => total + shipGuns(ship), 0);
}

/** Companies this fleet could carry if it were empty. */
export function fleetCapacity(fleet: Fleet): number {
  return fleet.ships.reduce((total, ship) => total + shipSpec(ship.classId).carries, 0);
}

/**
 * A fleet sails at the pace of its slowest hull, which is what makes a sloop
 * worth keeping once you own ships of the line.
 */
export function fleetPace(fleet: Fleet): number {
  if (fleet.ships.length === 0) return 1;
  return Math.max(...fleet.ships.map((s) => shipSpec(s.classId).pace));
}

/** The crew serving with a fleet, in the order they came aboard. */
export function officersOf(state: GameState, fleet: Fleet): Character[] {
  return fleet.officerIds
    .map((id) => state.characters.find((c) => c.id === id))
    .filter((c): c is Character => c !== undefined);
}

/**
 * What the best officer aboard is worth, as a fraction added to the fleet's
 * effort. A rating of 100 is worth a quarter again; nobody aboard is worth
 * nothing. Deliberately modest: a good captain should tip a close fight, not
 * decide one against the odds.
 */
export function officerEdge(
  state: GameState,
  fleet: Fleet,
  rating: 'leadership' | 'combat',
): number {
  const best = officersOf(state, fleet).reduce((n, c) => Math.max(n, c[rating]), 0);
  return 1 + (best / 100) * OFFICER_EDGE;
}

export function fleetDamaged(fleet: Fleet): number {
  return fleet.ships.filter((s) => s.damage > 0).length;
}

/** Plain language, as the original states it, rather than an icon. */
export function fleetStatus(state: GameState, fleet: Fleet): string {
  if (fleet.voyage) {
    const target = state.systems.find((s) => s.id === fleet.voyage!.targetSystemId);
    const days = fleet.voyage.daysRemaining;
    return `At sea for ${target?.name ?? 'open water'} — ${days}d`;
  }
  const here = state.systems.find((s) => s.id === fleet.systemId);
  if (here && here.control !== fleet.faction && here.populated) return 'Blockading';
  return 'At anchor';
}

/**
 * Put a new hull in the water at an island, joining whatever fleet of yours is
 * already lying there so a player does not end up with nine fleets of one.
 */
export function addShip(
  state: GameState,
  system: System,
  faction: PlayableFaction,
  classId: ShipClassId,
): Fleet {
  const ship: Ship = { id: nextId(state, 'shp'), classId, damage: 0 };
  // Join whatever fleet of ours lies here, preferring one that is not a
  // Lord's own so new hulls do not quietly tie themselves to the Swallowtail.
  const here = fleetsAt(state, system.id).filter((f) => f.faction === faction);
  const existing = here.find((f) => !f.ships.some(isLordShip)) ?? here[0];
  if (existing) {
    existing.ships.push(ship);
    return existing;
  }
  const fleet: Fleet = {
    id: nextId(state, 'flt'),
    name: `Fleet ${state.fleets.filter((f) => f.faction === faction).length + 1}`,
    faction,
    systemId: system.id,
    ships: [ship],
    troops: 0,
    officerIds: [],
  };
  state.fleets.push(fleet);
  return fleet;
}

// --- Orders ----------------------------------------------------------------

/**
 * Orders take the faction giving them rather than assuming the human player.
 * "That fleet is not yours" is a fact about the actor, not about who is
 * holding the phone, and the opponent needs the same rules to sail under.
 */
export function sailError(
  state: GameState,
  fleetId: string,
  targetSystemId: string,
  actor: PlayableFaction,
): string | null {
  const fleet = findFleet(state, fleetId);
  if (!fleet) return 'No such fleet.';
  if (fleet.faction !== actor) return 'That fleet is not yours.';
  if (isAtSea(fleet)) return 'Already at sea.';
  if (fleet.systemId === targetSystemId) return 'Already there.';
  if (!state.systems.some((s) => s.id === targetSystemId)) return 'No such island.';
  if (fleet.ships.length === 0) return 'Nothing left to sail.';
  // A Lord's ship does not sail without her Lord. This is the other half of
  // the cost of sending one ashore: not just a person at risk, a hull out of
  // the war until they are back aboard.
  const ashore = fleetHeldAshore(state, fleet);
  if (ashore) return `${ashore.name} is ashore. Their ship waits for them.`;
  return null;
}

/**
 * How long this fleet would take to get there, in days.
 *
 * Exported because the player is asked to confirm a voyage before it is
 * ordered, and the figure on that sheet has to be the figure the voyage
 * actually takes — not a second calculation that agrees with this one until
 * somebody edits one of them. `sailFleet` uses it too.
 *
 * A fleet is as quick as its slowest hull, so a ship of the line in with the
 * sloops slows the whole squadron: that is `fleetPace`, and it is why the
 * same crossing can cost different fleets different days.
 */
export function sailDays(state: GameState, fleetId: string, targetSystemId: string): number {
  const fleet = findFleet(state, fleetId);
  if (!fleet) return 0;
  return Math.max(
    1,
    Math.round(travelDays(state, fleet.systemId, targetSystemId) * fleetPace(fleet)),
  );
}

export function sailFleet(
  state: GameState,
  fleetId: string,
  targetSystemId: string,
  actor: PlayableFaction,
): void {
  const error = sailError(state, fleetId, targetSystemId, actor);
  if (error) throw new Error(error);
  const fleet = findFleet(state, fleetId)!;
  const target = getSystem(state, targetSystemId);
  const days = sailDays(state, fleetId, targetSystemId);
  fleet.voyage = { targetSystemId, daysRemaining: days };
  pushEvent(state, {
    kind: 'order',
    text: `${fleet.name} weighs anchor for ${target.name}.`,
    systemId: fleet.systemId,
  });
}

export function embarkError(
  state: GameState,
  fleetId: string,
  companies: number,
  actor: PlayableFaction,
): string | null {
  const fleet = findFleet(state, fleetId);
  if (!fleet) return 'No such fleet.';
  if (fleet.faction !== actor) return 'That fleet is not yours.';
  if (isAtSea(fleet)) return 'The fleet is at sea.';
  const system = getSystem(state, fleet.systemId);
  if (system.control !== fleet.faction) return 'You do not hold this island.';
  if (companies > 0) {
    if (system.garrison < companies) return 'Not enough companies ashore.';
    if (fleet.troops + companies > fleetCapacity(fleet)) return 'No room aboard.';
  } else if (fleet.troops < -companies) {
    return 'Not that many aboard.';
  }
  return null;
}

/**
 * Move companies between the island and the fleet. Positive takes them aboard,
 * negative puts them ashore. Landing on an island that is not yours is an
 * assault, and `landing` handles that rather than this.
 */
export function embark(
  state: GameState,
  fleetId: string,
  companies: number,
  actor: PlayableFaction,
): void {
  const error = embarkError(state, fleetId, companies, actor);
  if (error) throw new Error(error);
  const fleet = findFleet(state, fleetId)!;
  const system = getSystem(state, fleet.systemId);
  system.garrison -= companies;
  fleet.troops += companies;
}

export function boardError(
  state: GameState,
  fleetId: string,
  characterId: string,
  actor: PlayableFaction,
): string | null {
  const fleet = findFleet(state, fleetId);
  if (!fleet) return 'No such fleet.';
  if (fleet.faction !== actor) return 'That fleet is not yours.';
  if (isAtSea(fleet)) return 'The fleet is at sea.';
  const character = state.characters.find((c) => c.id === characterId);
  if (!character) return 'No such crew.';
  if (character.faction !== actor) return 'Not one of yours.';
  if (character.mission) return 'Already away on a parley.';
  if (character.status !== 'available') return `${character.name} is ${character.status}.`;
  if (character.locationSystemId !== fleet.systemId) return 'Not on this island.';
  if (fleet.officerIds.includes(characterId)) return 'Already aboard.';
  if (isLord(character)) return `${character.name} does not leave their own ship.`;
  return null;
}

/** Sign a crew member on to a fleet, or put them back ashore. */
export function board(
  state: GameState,
  fleetId: string,
  characterId: string,
  actor: PlayableFaction,
): void {
  const error = boardError(state, fleetId, characterId, actor);
  if (error) throw new Error(error);
  findFleet(state, fleetId)!.officerIds.push(characterId);
}

export function goAshore(state: GameState, fleetId: string, characterId: string): void {
  const fleet = findFleet(state, fleetId);
  if (!fleet || isAtSea(fleet)) throw new Error('The fleet is at sea.');
  const who = state.characters.find((c) => c.id === characterId);
  if (who && isLord(who)) throw new Error(`${who.name} does not leave their own ship.`);
  fleet.officerIds = fleet.officerIds.filter((id) => id !== characterId);
  const character = state.characters.find((c) => c.id === characterId);
  if (character) character.locationSystemId = fleet.systemId;
}

export function assaultError(
  state: GameState,
  fleetId: string,
  actor: PlayableFaction,
): string | null {
  const fleet = findFleet(state, fleetId);
  if (!fleet) return 'No such fleet.';
  if (fleet.faction !== actor) return 'That fleet is not yours.';
  if (isAtSea(fleet)) return 'The fleet is at sea.';
  if (fleet.troops === 0) return 'No companies aboard.';
  const system = getSystem(state, fleet.systemId);
  if (system.control === fleet.faction) return 'The island is already yours.';
  if (fleetsAt(state, system.id).some((f) => f.faction !== fleet.faction && fleetGuns(f) > 0)) {
    return 'Enemy ships hold the harbor.';
  }
  return null;
}

export function assault(
  state: GameState,
  fleetId: string,
  rng: Rng,
  actor: PlayableFaction,
): void {
  const error = assaultError(state, fleetId, actor);
  if (error) throw new Error(error);
  resolveLanding(state, findFleet(state, fleetId)!, rng);
}

// --- The day ---------------------------------------------------------------

/** Tick voyages, then fight and blockade wherever that leaves everyone. */
export function advanceFleets(state: GameState, rng: Rng): void {
  for (const fleet of state.fleets) {
    if (!fleet.voyage) continue;
    fleet.voyage.daysRemaining -= 1;
    if (fleet.voyage.daysRemaining > 0) continue;
    fleet.systemId = fleet.voyage.targetSystemId;
    fleet.voyage = undefined;
    const system = getSystem(state, fleet.systemId);
    system.explored[fleet.faction] = true;
    // Whoever is serving with her is where she is.
    for (const officer of officersOf(state, fleet)) officer.locationSystemId = system.id;
    scoutFrom(state, fleet, system);
    pushEvent(state, {
      kind: 'order',
      text: `${fleet.name} has come to anchor off ${system.name}.`,
      systemId: system.id,
    });
    // What is in the water is found by going, not by charting. scoutFrom can
    // open half a chain from the masthead and reveals none of this; only the
    // island the boats actually reach gives up what lives off it.
    const sighted = sightBeast(system, fleet.faction);
    if (sighted) {
      pushEvent(state, { kind: 'mission', text: sighted, systemId: system.id });
    }
  }

  resolveBattles(state, rng);
  // A fleet reduced to nothing is not a fleet. Anyone serving with her is put
  // ashore where she lay rather than quietly ceasing to exist.
  for (const fleet of state.fleets.filter((f) => f.ships.length === 0)) {
    for (const officer of officersOf(state, fleet)) officer.locationSystemId = fleet.systemId;
  }
  state.fleets = state.fleets.filter((f) => f.ships.length > 0);
}

/**
 * What the spy aboard sees while the ship is at anchor.
 *
 * Espionage is the third rating and this is what it is for. Sixty of the
 * hundred islands start dark, and an island you have not charted cannot be
 * parleyed with — so a fleet with a good spy aboard is how the map opens up,
 * which makes ships the way you find things as well as the way you take them.
 */
function scoutFrom(state: GameState, fleet: Fleet, arrived: System): void {
  const best = officersOf(state, fleet).reduce((n, c) => Math.max(n, c.espionage), 0);
  const reach = Math.round(best / SCOUT_PER_ISLAND);
  if (reach <= 0) return;

  // What they can see from here: the rest of this chain, nearest first.
  const dark = state.systems
    .filter(
      (s) =>
        s.sectorId === arrived.sectorId &&
        s.id !== arrived.id &&
        !s.explored[fleet.faction],
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - arrived.x, a.y - arrived.y) -
        Math.hypot(b.x - arrived.x, b.y - arrived.y),
    )
    .slice(0, reach);
  if (dark.length === 0) return;

  for (const system of dark) system.explored[fleet.faction] = true;
  const sector = state.sectors.find((s) => s.id === arrived.sectorId);
  pushEvent(state, {
    kind: 'mission',
    text: `Boats out from ${fleet.name} chart ${dark.length} more ${
      dark.length === 1 ? 'island' : 'islands'
    } of ${sector?.name ?? 'the chain'}.`,
    systemId: arrived.id,
  });
}

/**
 * Wherever two sides lie in the same harbor, they fight — one day's action
 * per day, not one battle to the death, so a player can still withdraw.
 *
 * Deterministic: every roll comes from the seeded RNG carried in the state.
 */
/**
 * The fleets at an island that still have something to fight with.
 *
 * A fleet whose last hull went down in this round is still in `state.fleets`
 * until the day's wrecks are cleared, and counting it is how a finished action
 * goes on looking contested — the bug this exists to stop.
 */
export function fightingAt(state: GameState, systemId: string): Fleet[] {
  return fleetsAt(state, systemId).filter((f) => f.ships.length > 0);
}

/**
 * Is anybody in action at this island?
 *
 * Three ways to be. Two fleets in the same water is the obvious one. A fort is
 * a warship that cannot weigh anchor, so an enemy fleet lying off a fortified
 * harbor is in action whether or not a fleet meets it. And whatever is in the
 * water is nobody's, does not care whose colours are flying, and has anybody
 * anchored there in action whether or not the other side ever turns up.
 */
export function contestedAt(state: GameState, system: System): boolean {
  const here = fightingAt(state, system.id);
  if (here.length === 0) return false;
  if (beastAlive(system)) return true;
  if (here.some((f) => f.faction === 'empire') && here.some((f) => f.faction === 'alliance')) {
    return true;
  }
  if (system.control !== 'empire' && system.control !== 'alliance') return false;
  return fortGuns(system) > 0 && here.some((f) => f.faction === otherFaction(system.control as PlayableFaction));
}

/**
 * The day's fighting, everywhere at once.
 *
 * Every contested island trades a round, the way it always has. What is new is
 * only that an action the player's own ships are in is *flagged* —
 * `state.battle` — so the UI can hold the clock and hand them the rest of the
 * fight round by round instead of reading them the result afterwards.
 *
 * The flag is an affordance and nothing more, which is the point of doing it
 * this way. The sim waits for nobody: if days keep passing, as they do in a
 * test or a balance run, the action is fought a round a day exactly as before
 * and the flag is simply overwritten each morning. Only a player holding the
 * clock makes it mean anything.
 *
 * One at a time. If the player is in two actions on the same day the second is
 * still fought — nobody's ships stand idle — but only the first is handed to
 * them; the other turns up in the log. Nobody should be asked to command two
 * battles in the same breath.
 */
export function resolveBattles(state: GameState, rng: Rng): void {
  // A new day: whatever was flagged last night is history. In the UI this is
  // already empty, because the clock does not run while an action is open.
  state.battle = undefined;
  const harbors = new Set(state.fleets.filter((f) => !isAtSea(f)).map((f) => f.systemId));
  for (const systemId of [...harbors].sort()) {
    const system = getSystem(state, systemId);
    if (!contestedAt(state, system)) continue;
    const here = fightingAt(state, systemId);
    const hand = here.some((f) => f.faction === state.player) && !state.battle;
    // Quiet in the dispatch sense only. It still goes in the log; what it does
    // not do is arrive as a card over the top of the battle sheet.
    const tally = fightRound(state, system, here, rng, hand);
    if (!hand) continue;
    // Note what the first exchange cost, but do not let them run from it.
    // Breaking off is a decision taken after you have seen what the other
    // fellow's broadside does, not before — and keeping it out of this path
    // means it only ever happens where the player can watch it, since the
    // rounds after the first are all fought from the battle sheet.
    const pending: PendingBattle = { systemId, rounds: 1, last: tally };
    state.battle = pending;
    pending.settled = outcomeOf(state, system, pending);
  }
}

/**
 * Fight one more round of the action the player is in.
 *
 * Called from the battle sheet rather than from the clock, so the pace after
 * the first broadside is the player's. Afterwards three things can be true:
 * the action is over, the other side has had enough and runs, or there is
 * another broadside to trade.
 */
export function fightBattleRound(state: GameState, rng: Rng): void {
  const pending = state.battle;
  if (!pending || pending.settled) return;
  const system = getSystem(state, pending.systemId);
  const tally = fightRound(state, system, fightingAt(state, system.id), rng, true);
  pending.rounds += 1;
  pending.last = tally;
  pending.theyFled = enemyBreaksOff(state, system, rng);
  pending.settled = outcomeOf(state, system, pending);
}

/**
 * Whether the action is over, and how.
 *
 * `undefined` means there is another broadside to trade. Anything else ends
 * it, and the sheet stays up showing which — the player ordered that round and
 * should see what it bought, rather than have the screen vanish under them.
 * Order matters: losing your last hull here is the answer even if the enemy
 * also broke off in the same round.
 */
function outcomeOf(
  state: GameState,
  system: System,
  pending: PendingBattle,
): BattleOutcome | undefined {
  const here = fightingAt(state, system.id);
  if (!here.some((f) => f.faction === state.player)) return 'lost';
  if (pending.theyFled) return 'they-fled';
  if (pending.last?.beastSlain && !contestedAt(state, system)) return 'beast-slain';
  if (!contestedAt(state, system)) return 'won';
  return undefined;
}

/**
 * Whether the other side has had enough, and runs if so.
 *
 * Their policy is the one a reasonable captain would follow and no cleverer:
 * break off when the guns still firing on the far side are twice yours and
 * there is somewhere to run to. Creatures are not covered by it — what a
 * creature does with a wound is its own business, and `stirBeasts` decides
 * that at the end of the day.
 */
function enemyBreaksOff(state: GameState, system: System, rng: Rng): boolean {
  const them = otherFaction(state.player);
  const theirs = fightingAt(state, system.id).filter((f) => f.faction === them);
  if (theirs.length === 0) return false;
  const theirGuns = theirs.reduce((n, f) => n + fleetGuns(f), 0);
  const mine =
    fightingAt(state, system.id)
      .filter((f) => f.faction === state.player)
      .reduce((n, f) => n + fleetGuns(f), 0) + (system.control === state.player ? fortGuns(system) : 0);
  if (theirGuns === 0 || mine < theirGuns * BREAK_OFF_ODDS) return false;
  let ran = false;
  for (const fleet of theirs) {
    if (fleeError(state, fleet.id, them)) continue;
    fleeBattle(state, fleet.id, rng, them);
    ran = true;
  }
  return ran;
}

/** The harbor's own guns, for whoever holds it. */
export function fortGuns(system: System): number {
  if (system.control !== 'empire' && system.control !== 'alliance') return 0;
  return (
    system.facilities.filter((f) => f.type === 'fort' && f.owner === system.control && !f.building)
      .length * FORT_GUNS
  );
}

/** Companies' worth of chain across the harbor mouth. */
export function boomDefence(system: System): number {
  if (system.control !== 'empire' && system.control !== 'alliance') return 0;
  return (
    system.facilities.filter((f) => f.type === 'boom' && f.owner === system.control && !f.building)
      .length * BOOM_DEFENCE
  );
}

/** One day's exchange of fire between the two sides in a harbor. */
/**
 * Everything at an island that can shoot, on one side, as combatants.
 *
 * A hull, a fort on the wall and a creature in the water all take a shot and
 * all take damage, so the round does not care which is which. What differs is
 * only how hard each is to hit and what happens when it dies, and both of
 * those live on the combatant.
 */
function hullsOf(fleets: Fleet[]): Combatant[] {
  const out: Combatant[] = [];
  for (const fleet of fleets) {
    for (const ship of fleet.ships) {
      const spec = shipSpec(ship.classId);
      out.push({
        guns: spec.guns,
        left: spec.hull - ship.damage,
        whole: spec.hull,
        hitChance: HIT_CHANCE,
        hurt: (amount) => {
          ship.damage += amount;
          return ship.damage >= spec.hull;
        },
      });
    }
  }
  return out;
}

/** The island's own guns, which fire for whoever holds it and cannot be sunk. */
function wallOf(system: System, side: PlayableFaction): Combatant[] {
  const guns = system.control === side ? fortGuns(system) : 0;
  if (guns <= 0) return [];
  return [
    {
      guns,
      // A fort is not a target a fleet action can remove: it is masonry, and
      // taking it is a landing. It shoots and is not shot at.
      left: Infinity,
      whole: Infinity,
      hitChance: HIT_CHANCE,
      hurt: () => false,
    },
  ];
}

/** Total damage standing on every hull in these fleets. */
function hurtIn(fleets: Fleet[]): number {
  return fleets.reduce((n, f) => n + f.ships.reduce((m, s) => m + s.damage, 0), 0);
}

/** The best leadership edge anywhere in a side's squadrons at this island. */
function bestEdge(state: GameState, fleets: Fleet[], rating: 'leadership' | 'combat'): number {
  return fleets.reduce((n, f) => Math.max(n, officerEdge(state, f, rating)), 1);
}

/**
 * What the day's action came to, in the log.
 *
 * Reported whenever anything happened at all — a hull lost, damage taken, or a
 * creature killed. Two fleets trading shot without a loss used to be a silent
 * day; it is not any more, because with real damage a round that sinks nothing
 * can still decide the next one.
 */
function reportRound(
  state: GameState,
  system: System,
  empire: Fleet[],
  alliance: Fleet[],
  before: { empire: number; alliance: number; hurt: number },
  killedBeast: boolean,
  quiet: boolean,
): void {
  const beast = beastAt(system);
  if (killedBeast && beast) {
    pushEvent(state, {
      kind: 'battle',
      text: `${beast.name} is killed off ${system.name}. The water there is only water now.`,
      systemId: system.id,
      quiet,
    });
  }
  const after = {
    empire: empire.reduce((n, f) => n + f.ships.length, 0),
    alliance: alliance.reduce((n, f) => n + f.ships.length, 0),
  };
  const lostEmpire = before.empire - after.empire;
  const lostAlliance = before.alliance - after.alliance;
  if (lostEmpire === 0 && lostAlliance === 0) {
    // Two fleets trading shot without sinking anything is a quiet day and the
    // log has always left it out. A creature is not: it can chew a squadron
    // for a week without taking a hull down, and a player watching damage
    // climb with nothing in the log has no way to find out why.
    const damage = hurtIn([...empire, ...alliance]) - before.hurt;
    if (beast && beastAlive(system) && damage > 0) {
      pushEvent(state, {
        kind: 'battle',
        text: `${beast.name} is at the hulls off ${system.name}. ${damage} taken and nothing sunk${
          system.beastDamage ? `; it has ${system.beastDamage} of ${beast.hull} in it` : ''
        }.`,
        systemId: system.id,
        quiet,
      });
    }
    return;
  }
  const tally = (n: number) => `${n} ${n === 1 ? 'hull' : 'hulls'}`;
  const against = beast && beastAlive(system) ? ` against ${beast.name}` : '';
  pushEvent(state, {
    kind: 'battle',
    text: `Action off ${system.name}${against}. The Imperium loses ${tally(lostEmpire)}, the Confederacy ${tally(lostAlliance)}.`,
    systemId: system.id,
    quiet,
    battle: {
      sides: {
        empire: {
          hulls: before.empire,
          lost: lostEmpire,
          guns: empire.reduce((n, f) => n + fleetGuns(f), 0),
        },
        alliance: {
          hulls: before.alliance,
          lost: lostAlliance,
          guns: alliance.reduce((n, f) => n + fleetGuns(f), 0),
        },
      },
      shore: fortGuns(system),
      holder: system.control,
    },
  });
}

/**
 * One day's exchange of fire at an island, and what it cost.
 *
 * `quiet` keeps the round out of the dispatch cards — not out of the log. It
 * is set for the action the player is being handed, where the battle sheet is
 * the report and a card over the top of it would be the same news twice.
 */
function fightRound(
  state: GameState,
  system: System,
  here: Fleet[],
  rng: Rng,
  quiet = false,
): NonNullable<PendingBattle['last']> {
  const empire = here.filter((f) => f.faction === 'empire');
  const alliance = here.filter((f) => f.faction === 'alliance');
  const before = {
    empire: empire.reduce((n, f) => n + f.ships.length, 0),
    alliance: alliance.reduce((n, f) => n + f.ships.length, 0),
    hurt: hurtIn([...empire, ...alliance]),
  };

  // The three parties. Forts shoot for the side that holds the island; the
  // creature shoots for nobody and is shot at by everybody.
  const empireGuns = [...hullsOf(empire), ...wallOf(system, 'empire')];
  const allianceGuns = [...hullsOf(alliance), ...wallOf(system, 'alliance')];
  const monster = beastCombatant(system);

  // Leadership tells here, as it always has: a well-handled squadron gets more
  // out of the same guns. It is a hit-chance edge now rather than a multiplier
  // on a pool, which is the same idea at the level the round actually works.
  const empireEdge = bestEdge(state, empire, 'leadership');
  // The Ironback's power: every Confederate fleet in her harbor fights with
  // the Admiral's edge, not only her own.
  const line = alliance.find((f) =>
    f.ships.some((sh) => shipPower(sh.classId) === 'line' && sh.damage < shipSpec(sh.classId).hull),
  );
  const allianceEdge = Math.max(
    bestEdge(state, alliance, 'leadership'),
    line ? officerEdge(state, line, 'leadership') : 1,
  );

  // Everyone shoots once, and everyone shoots at the same moment: the volleys
  // are worked out against the state at the start of the round, so a hull that
  // goes down still got its shot off. Simultaneous fire is what keeps a battle
  // from being decided by who is listed first.
  const volleys: Array<{ from: Combatant; at: Combatant[]; edge: number }> = [];
  for (const gun of empireGuns) {
    volleys.push({ from: gun, at: monster ? [...allianceGuns, monster] : allianceGuns, edge: empireEdge });
  }
  for (const gun of allianceGuns) {
    volleys.push({ from: gun, at: monster ? [...empireGuns, monster] : empireGuns, edge: allianceEdge });
  }
  if (monster) {
    // It is nobody's, so it fires on everything and picks its own way — a
    // Kraken does not shoot, it takes hold of something.
    for (let i = 0; i < monsterShots(system); i++) {
      volleys.push({ from: monster, at: [...empireGuns, ...allianceGuns], edge: 1 });
    }
  }

  for (const volley of volleys) {
    if (volley.from.left <= 0) continue;
    const target = pickTarget(volley.at, rng);
    if (!target) continue;
    if (monster && volley.from === monster) monsterStrike(state, system, target, rng);
    else fireOnce(volley.from, target, rng, volley.edge);
  }

  const killed = monster !== undefined && monster.left <= 0 && !system.beastSlain;
  if (killed) {
    const fromEmpire = empireGuns.reduce((n, g) => n + g.guns, 0);
    const fromAlliance = allianceGuns.reduce((n, g) => n + g.guns, 0);
    system.beastSlain = fromEmpire >= fromAlliance ? 'empire' : 'alliance';
    system.beastDamage = beastAt(system)!.hull;
  }

  for (const fleet of [...empire, ...alliance]) sinkAndDrown(state, fleet);
  reportRound(state, system, empire, alliance, before, killed, quiet);
  const after = fleetsAt(state, system.id);
  const count = (side: PlayableFaction) =>
    after.filter((f) => f.faction === side).reduce((n, f) => n + f.ships.length, 0);
  return {
    empire: before.empire - count('empire'),
    alliance: before.alliance - count('alliance'),
    hurt: hurtIn(after) - before.hurt,
    beastSlain: killed,
  };
}


function hullOf(ship: Ship): number {
  return shipSpec(ship.classId).hull;
}

/** Clear the wrecks, and drown whatever companies were aboard them. */
function sinkAndDrown(state: GameState, fleet: Fleet): void {
  const survivors = fleet.ships.filter((s) => s.damage < hullOf(s));
  if (survivors.length === fleet.ships.length) return;
  // A Lord's ship does not sink: she strikes, and the Lord goes in irons.
  for (const ship of fleet.ships) {
    if (ship.damage >= hullOf(ship) && isLordShip(ship)) captureLord(state, fleet, ship);
  }
  fleet.ships = survivors;
  const room = fleetCapacity(fleet);
  if (fleet.troops > room) {
    const lost = fleet.troops - room;
    fleet.troops = room;
    pushEvent(state, {
      kind: 'loss',
      text: `${lost} ${lost === 1 ? 'company goes' : 'companies go'} down with ${fleet.name}.`,
    });
  }
}

/**
 * Put companies ashore against a garrison. Numbers decide it, with a roll for
 * the surf: the attacker needs to outnumber the defence to carry the island.
 */
export function resolveLanding(state: GameState, fleet: Fleet, rng: Rng): void {
  const system = getSystem(state, fleet.systemId);
  // A boom is cut under fire before anybody is ashore, and it costs the
  // landing what a company would. The chain does not die with the garrison:
  // it is spent from the attacker only.
  const chain = boomDefence(system);
  const defenders = system.garrison + chain;
  // Combat tells here, for the same reason: companies led ashore by somebody
  // who knows the business go further than the same companies alone.
  const attackers = fleet.troops * officerEdge(state, fleet, 'combat');
  // Both sides lose companies; the smaller force is spent entirely.
  const spent = Math.min(Math.round(attackers), defenders);
  const roll = rng.next();
  const attackerWins = attackers > defenders || (attackers === defenders && roll > 0.5);

  const landed = fleet.troops;
  const garrisonBefore = system.garrison;
  fleet.troops = Math.max(0, fleet.troops - spent);
  system.garrison = Math.max(0, system.garrison - Math.max(0, spent - chain));
  const report = {
    attacker: fleet.faction,
    landed,
    defenders: garrisonBefore,
    boom: chain,
    lost: landed - fleet.troops,
    defendersLost: garrisonBefore - system.garrison,
    taken: attackerWins,
  };

  if (!attackerWins) {
    pushEvent(state, {
      kind: 'battle',
      text: `The landing on ${system.name} is thrown back into the sea.`,
      systemId: system.id,
      landing: report,
    });
    return;
  }

  // Whatever is left of the landing force holds the island.
  const holding = fleet.troops;
  fleet.troops = 0;
  system.garrison = holding;
  system.control = fleet.faction;
  system.uprising = false;
  system.explored[fleet.faction] = true;
  // An island taken at gunpoint does not love you for it: enough regard to
  // hold it above a revolt, and no more. The rest of the island's feeling is
  // the other side's, which is what taking a place by storm buys you.
  setSupport(system, fleet.faction, Math.max(system.support[fleet.faction], 35));

  pushEvent(state, {
    kind: 'flip',
    text: `${system.name} is carried by storm. ${holding} ${holding === 1 ? 'company holds' : 'companies hold'} it, and the people are sullen.`,
    systemId: system.id,
    landing: report,
  });
}

/**
 * An enemy fleet lying off an island you hold stops its trade. The island
 * still costs you upkeep; it simply stops paying.
 */
export function isBlockaded(state: GameState, system: System): boolean {
  if (system.control !== 'empire' && system.control !== 'alliance') return false;
  const enemy = otherFaction(system.control);
  const hostile = fleetsAt(state, system.id)
    .filter((f) => f.faction === enemy)
    .reduce((n, f) => n + fleetGuns(f), 0);
  // Under the boom's floor a raider is a nuisance, not a siege.
  const floor = boomDefence(system) > 0 ? BOOM_BLOCKADE_GUNS : 1;
  return hostile >= floor;
}

/** Stamp today's blockades onto the islands, so the economy can read them. */
export function updateBlockades(state: GameState): void {
  for (const system of state.systems) {
    const shut = isBlockaded(state, system);
    if (shut === !!system.blockaded) continue;
    system.blockaded = shut;
    pushEvent(state, {
      kind: shut ? 'loss' : 'order',
      text: shut
        ? `Enemy sail off ${system.name}. Nothing is getting out of that harbor.`
        : `The blockade of ${system.name} is lifted.`,
      systemId: system.id,
    });
  }
}

// --- Breaking off ----------------------------------------------------------

/**
 * Where a beaten fleet runs to: the nearest island you hold.
 *
 * Sean's rule, and it is the right one — "flee" in a game with a chart has to
 * mean somewhere, and the only answer that never needs a second question is
 * home ground. Nearest by the water, not by the chart's chain structure, so a
 * squadron broken off in the Bone Sea runs to the Bone Sea holding rather than
 * back across the world.
 */
export function refugeFor(state: GameState, fleet: Fleet): System | undefined {
  const here = getSystem(state, fleet.systemId);
  const mine = state.systems.filter((s) => s.control === fleet.faction && s.id !== here.id);
  if (mine.length === 0) return undefined;
  return mine.reduce((best, s) =>
    Math.hypot(s.x - here.x, s.y - here.y) < Math.hypot(best.x - here.x, best.y - here.y) ? s : best,
  );
}

export function fleeError(state: GameState, fleetId: string, actor: PlayableFaction): string | null {
  const fleet = findFleet(state, fleetId);
  if (!fleet) return 'No such fleet.';
  if (fleet.faction !== actor) return 'That fleet is not yours.';
  if (isAtSea(fleet)) return 'The fleet is already at sea.';
  const system = getSystem(state, fleet.systemId);
  const enemies = fleetsAt(state, system.id).some(
    (f) => f.faction !== fleet.faction && fleetGuns(f) > 0,
  );
  if (!enemies && !beastAlive(system) && fortGuns(system) === 0) return 'Nothing to break off from.';
  const held = fleetHeldAshore(state, fleet);
  if (held) return `${held.name} is ashore.`;
  if (!refugeFor(state, fleet)) return 'Nowhere to run to.';
  return null;
}

/**
 * Break off: take the parting volley, then run for the nearest island you hold.
 *
 * Fleeing always works — there is no roll that keeps you in a fight you have
 * decided to leave. What it costs is the run itself. Only guns that reach can
 * touch a fleet already going, which is what makes Long Guns worth building
 * and early disengagement nearly free; and how many shots each hull eats is
 * its speed, which is what makes a first-rate an expensive thing to have to
 * withdraw.
 */
export function fleeBattle(
  state: GameState,
  fleetId: string,
  rng: Rng,
  actor: PlayableFaction,
): void {
  const error = fleeError(state, fleetId, actor);
  if (error) throw new Error(error);
  const fleet = findFleet(state, fleetId)!;
  const system = getSystem(state, fleet.systemId);
  const refuge = refugeFor(state, fleet)!;

  // Everything at this island that can reach a fleet under way. A fort can:
  // it is a battery on the harbor wall and you have to sail past it. A hull
  // can only if she carries long guns. A creature always can — it is in the
  // water with you, and being unable to outswim the Kraken is the point of it.
  const reaching: Array<{ guns: number }> = [];
  const wall = system.control !== fleet.faction ? fortGuns(system) : 0;
  if (wall > 0) reaching.push({ guns: Math.round(wall * LONG_GUN_SHARE) });
  for (const other of fleetsAt(state, system.id)) {
    if (other.faction === fleet.faction) continue;
    for (const ship of other.ships) {
      const spec = shipSpec(ship.classId);
      if (!spec.longGuns) continue;
      reaching.push({ guns: Math.round(spec.guns * LONG_GUN_SHARE) });
    }
  }
  const monster = beastCombatant(system);
  if (monster) reaching.push({ guns: Math.round(monster.guns * LONG_GUN_SHARE) });

  if (reaching.length > 0) {
    for (const ship of [...fleet.ships]) {
      const spec = shipSpec(ship.classId);
      const band = RETREAT_SHOTS[Math.max(1, Math.min(10, spec.speed))] ?? [1, 1];
      const shots = band[0] + (band[1] > band[0] ? rng.int(band[1] - band[0] + 1) : 0);
      const target: Combatant = {
        guns: spec.guns,
        left: spec.hull - ship.damage,
        whole: spec.hull,
        hitChance: HIT_CHANCE,
        hurt: (amount) => {
          ship.damage += amount;
          return ship.damage >= spec.hull;
        },
      };
      for (let i = 0; i < shots && target.left > 0; i++) {
        const gun = reaching[rng.int(reaching.length)];
        const done = fireOnce(gun, target, rng);
        target.left -= done;
      }
    }
    const lost = fleet.ships.filter((s) => s.damage >= shipSpec(s.classId).hull).length;
    sinkAndDrown(state, fleet);
    if (fleet.faction === state.player) {
      pushEvent(state, {
        kind: 'battle',
        text: lost > 0
          ? `${fleet.name} breaks off from ${system.name} under long guns and loses ${lost} ${lost === 1 ? 'hull' : 'hulls'} getting clear.`
          : `${fleet.name} breaks off from ${system.name} under long guns and gets clear.`,
        systemId: system.id,
      });
    }
  }

  if (fleet.ships.length === 0) {
    state.fleets = state.fleets.filter((f) => f.id !== fleet.id);
    return;
  }
  fleet.voyage = { targetSystemId: refuge.id, daysRemaining: sailDays(state, fleet.id, refuge.id) };
  if (fleet.faction === state.player) {
    pushEvent(state, {
      kind: 'order',
      text: `${fleet.name} runs for ${refuge.name}.`,
      systemId: system.id,
    });
  }
}

/* ---------------------------------------------------------------- the sheet */

export type BattleOdds =
  | 'overwhelming'
  | 'favorable'
  | 'even'
  | 'unfavorable'
  | 'desperate';

export const BATTLE_ODDS_LABEL: Record<BattleOdds, string> = {
  overwhelming: 'Overwhelmingly favorable',
  favorable: 'Favorable',
  even: 'Even',
  unfavorable: 'Unfavorable',
  desperate: 'Desperate',
};

/**
 * How the action looks from your quarterdeck, in five words.
 *
 * Rebellion prints one of these over every battle and it is most of what the
 * screen is for: a player who has to add up two columns of guns to find out
 * whether to run is being given arithmetic instead of a decision. Guns still
 * firing, both sides, the shore counted for whoever holds it and the creature
 * counted against everybody.
 */
export function battleOdds(mine: number, theirs: number): BattleOdds {
  if (theirs <= 0) return 'overwhelming';
  const ratio = mine / theirs;
  if (ratio >= 2.5) return 'overwhelming';
  if (ratio >= 1.4) return 'favorable';
  if (ratio >= 0.72) return 'even';
  if (ratio >= 0.4) return 'unfavorable';
  return 'desperate';
}

export interface BattleSide {
  hulls: number;
  guns: number;
  /** Hull points left, and out of how many, across everything present. */
  left: number;
  whole: number;
}

export interface BattleView {
  system: System;
  rounds: number;
  mine: BattleSide;
  theirs: BattleSide;
  /** Guns on the harbor wall, and whose they are. */
  shore: number;
  shoreIsMine: boolean;
  beast?: { name: string; damage: number; hull: number; guns: number };
  odds: BattleOdds;
  /** Which of your fleets could break off, if any. */
  fleeable: string[];
  fleeBlockedBecause: string | null;
  last?: PendingBattle['last'];
  theyFled: boolean;
  settled?: BattleOutcome;
}

function sideOf(fleets: Fleet[]): BattleSide {
  const ships = fleets.flatMap((f) => f.ships);
  return {
    hulls: ships.length,
    guns: fleets.reduce((n, f) => n + fleetGuns(f), 0),
    left: ships.reduce((n, sh) => n + Math.max(0, hullOf(sh) - sh.damage), 0),
    whole: ships.reduce((n, sh) => n + hullOf(sh), 0),
  };
}

/**
 * Everything the battle sheet draws, worked out in one place.
 *
 * The sheet asks a question — fight on or run — and every figure here exists
 * to answer it. Nothing is stored: this is read off the live state each time,
 * so it is the same numbers the next round will actually be fought with.
 */
export function battleView(state: GameState): BattleView | undefined {
  const pending = state.battle;
  if (!pending) return undefined;
  const system = state.systems.find((s) => s.id === pending.systemId);
  if (!system) return undefined;
  const here = fightingAt(state, system.id);
  const mineFleets = here.filter((f) => f.faction === state.player);
  const theirFleets = here.filter((f) => f.faction === otherFaction(state.player));
  const shore = fortGuns(system);
  const shoreIsMine = system.control === state.player;
  const beast = beastAt(system);
  const alive = beastAlive(system);

  const mine = sideOf(mineFleets);
  const theirs = sideOf(theirFleets);
  // Guns bearing on each side, for the assessment only: the wall fires for
  // whoever holds the island, and the creature fires on everybody, so it
  // counts against both.
  const beastGunsHere = alive && beast ? beastGuns(system) : 0;
  const forMe = mine.guns + (shoreIsMine ? shore : 0);
  const againstMe = theirs.guns + (shoreIsMine ? 0 : shore) + beastGunsHere;

  const fleeable = mineFleets.filter((f) => fleeError(state, f.id, state.player) === null);
  const firstReason = mineFleets.length === 0 ? null : fleeError(state, mineFleets[0].id, state.player);

  return {
    system,
    rounds: pending.rounds,
    mine,
    theirs,
    shore,
    shoreIsMine,
    beast:
      beast && alive
        ? { name: beast.name, damage: system.beastDamage ?? 0, hull: beast.hull, guns: beastGunsHere }
        : undefined,
    odds: battleOdds(forMe, againstMe),
    fleeable: fleeable.map((f) => f.id),
    fleeBlockedBecause: fleeable.length > 0 ? null : firstReason,
    last: pending.last,
    theyFled: Boolean(pending.theyFled),
    settled: pending.settled,
  };
}

/**
 * Break off the whole action: every fleet of yours here runs for the nearest
 * island you hold, each taking its own parting fire.
 *
 * Anything that cannot run — a fleet with companies ashore, or one with
 * nowhere to go — stays, and so does the battle, which is the honest outcome
 * rather than a silent half-retreat.
 */
export function breakOffBattle(state: GameState, rng: Rng): void {
  const pending = state.battle;
  if (!pending) return;
  const system = getSystem(state, pending.systemId);
  for (const fleet of fightingAt(state, system.id).filter((f) => f.faction === state.player)) {
    if (fleeError(state, fleet.id, state.player)) continue;
    fleeBattle(state, fleet.id, rng, state.player);
  }
  if (!fightingAt(state, system.id).some((f) => f.faction === state.player)) {
    pending.settled = 'you-fled';
  }
}

/** Dismiss a settled action. The clock starts again when this clears. */
export function closeBattle(state: GameState): void {
  if (state.battle?.settled) state.battle = undefined;
}

