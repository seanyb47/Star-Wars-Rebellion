import { describe, expect, it } from 'vitest';
import { BATTLE_ODDS_LABEL } from '../fleets';
import {
  addShip,
  advanceFleets,
  battleOdds,
  board,
  detachError,
  detachShips,
  fleetCapacity,
  sailFleet,
  sparedCompanies,
  battleView,
  breakOffBattle,
  fightBattleRound,
  fleetsAt,
  isAtSea,
  resolveBattles,
} from '../fleets';
import { generateGalaxy } from '../galaxy';
import { getCharacter, getSystem, requiredGarrison } from '../helpers';
import {
  advanceMissions,
  canCommand,
  missionError,
  missionsOffered,
  startMission,
} from '../missions';
import { createRng } from '../rng';
import { isNotable } from '../../ui/EventCard';
import type { GameState, PlayableFaction, ShipClassId, System } from '../types';

function world(seed = 7): { state: GameState; home: System } {
  const state = generateGalaxy(seed, 'empire');
  state.fleets.length = 0;
  return { state, home: getSystem(state, state.factions.empire.hqSystemId) };
}

function put(state: GameState, system: System, faction: PlayableFaction, classes: ShipClassId[]) {
  let fleet = addShip(state, system, faction, classes[0]);
  for (const id of classes.slice(1)) fleet = addShip(state, system, faction, id);
  return fleet;
}

describe('an action the player is in', () => {
  it('fights the first broadside, then hands the player the rest', () => {
    const { state, home } = world();
    put(state, home, 'empire', ['sovereign', 'sovereign']);
    put(state, home, 'alliance', ['tempest', 'tempest']);
    resolveBattles(state, createRng(3));

    // The meeting engagement happened — you do not get to decline being shot
    // at — and what is handed over is everything after it.
    expect(state.battle?.systemId).toBe(home.id);
    expect(state.battle?.rounds).toBe(1);
    expect(state.battle?.last).toBeDefined();
    expect(state.battle?.settled).toBeUndefined();
  });

  it('is only ever one at a time, and the other is still fought', () => {
    const { state, home } = world();
    const other = state.systems.find((s) => s.control === 'empire' && s.id !== home.id)!;
    put(state, home, 'empire', ['sovereign']);
    put(state, home, 'alliance', ['tempest']);
    put(state, other, 'empire', ['sovereign']);
    const theirs = put(state, other, 'alliance', ['tempest']);
    const before = theirs.ships.reduce((n, sh) => n + sh.damage, 0);
    resolveBattles(state, createRng(9));
    expect([home.id, other.id]).toContain(state.battle!.systemId);
    // Whichever island was not handed over was still fought: nobody's ships
    // stand about waiting for the player to get round to them.
    const elsewhere = state.battle!.systemId === home.id ? other : home;
    const hurt = fleetsAt(state, elsewhere.id)
      .flatMap((f) => f.ships)
      .reduce((n, sh) => n + sh.damage, 0);
    expect(hurt).toBeGreaterThan(before);
  });

  it('keeps its rounds out of the dispatches but not out of the log', () => {
    const { state, home } = world();
    put(state, home, 'empire', ['sovereign', 'sovereign']);
    put(state, home, 'alliance', ['tempest', 'tempest']);
    resolveBattles(state, createRng(3));
    const mine = state.events.filter((e) => e.systemId === home.id && e.kind === 'battle');
    expect(mine.length).toBeGreaterThan(0);
    // In the log, and not a card over the top of the sheet already saying it.
    expect(mine.every((e) => !isNotable(e))).toBe(true);
  });

  it('settles once one side has nothing left afloat', () => {
    const { state, home } = world();
    put(state, home, 'empire', ['sovereign', 'sovereign', 'sovereign', 'sovereign']);
    put(state, home, 'alliance', ['brig']);
    const rng = createRng(11);
    resolveBattles(state, rng);
    for (let i = 0; i < 12 && state.battle && !state.battle.settled; i++) {
      fightBattleRound(state, rng);
    }
    expect(state.battle?.settled).toBeDefined();
    expect(['won', 'they-fled']).toContain(state.battle!.settled);
    // The sheet stays up until it is dismissed: the player ordered that round
    // and should see what it bought.
    expect(state.battle).toBeDefined();
  });

  it('lets the other side break off once it is badly outgunned', () => {
    const { state, home } = world();
    put(state, home, 'empire', ['sovereign', 'sovereign', 'sovereign', 'sovereign']);
    const theirs = put(state, home, 'alliance', ['swift']);
    const rng = createRng(5);
    resolveBattles(state, rng);
    // Never on the first exchange: that decision is taken after you have seen
    // what the other fellow's broadside does.
    expect(state.battle!.theyFled).toBeFalsy();
    fightBattleRound(state, rng);
    if (state.battle?.settled === 'they-fled') {
      expect(isAtSea(state.fleets.find((f) => f.id === theirs.id)!)).toBe(true);
    }
  });

  it('breaks off the whole action, and says so', () => {
    const { state, home } = world();
    const mine = put(state, home, 'empire', ['sovereign', 'sovereign']);
    put(state, home, 'alliance', ['tempest', 'tempest', 'tempest']);
    const rng = createRng(2);
    resolveBattles(state, rng);
    expect(state.battle).toBeDefined();
    breakOffBattle(state, rng);
    expect(state.battle?.settled).toBe('you-fled');
    const after = state.fleets.find((f) => f.id === mine.id);
    // Gone, or gone under on the way out — either way not still lying there.
    expect(after === undefined || isAtSea(after)).toBe(true);
  });

  it('leaves an action the player has no ships in alone', () => {
    const { state } = world();
    const theirs = state.systems.find((s) => s.control === 'alliance')!;
    put(state, theirs, 'alliance', ['tempest']);
    put(state, theirs, 'empire', ['sovereign']);
    state.player = 'alliance';
    resolveBattles(state, createRng(4));
    expect(state.battle?.systemId).toBe(theirs.id);
    state.battle = undefined;
    state.player = 'empire';
    // Swap the seat: now it is the Crown's action and the Confederacy's to
    // watch, so with the player elsewhere it just resolves.
    const far = state.systems.find(
      (s) => s.id !== theirs.id && s.control === 'alliance',
    )!;
    put(state, far, 'alliance', ['tempest']);
    expect(battleView(state)).toBeUndefined();
  });
});

describe('the assessment', () => {
  it('reads the odds the way a captain would', () => {
    expect(battleOdds(100, 10)).toBe('overwhelming');
    expect(battleOdds(100, 60)).toBe('favorable');
    expect(battleOdds(100, 100)).toBe('even');
    expect(battleOdds(60, 100)).toBe('unfavorable');
    expect(battleOdds(20, 100)).toBe('desperate');
    // Nothing left to shoot back is not a close-run thing.
    expect(battleOdds(1, 0)).toBe('overwhelming');
  });

  it('lays out each side hull by hull, heaviest first, with who is aboard', () => {
    const { state, home } = world();
    const mine = put(state, home, 'alliance', ['swift', 'swift', 'reef', 'brig']);
    state.player = 'alliance';
    const crew = state.characters.find(
      (c) => c.faction === 'alliance' && !/Hale|Reyne|Jessup/.test(c.name),
    )!;
    crew.locationSystemId = home.id;
    crew.leadership = 90;
    board(state, mine.id, crew.id, 'alliance');
    mine.troops = 2;
    put(state, home, 'empire', ['sovereign']);
    resolveBattles(state, createRng(13));
    const view = battleView(state)!;

    // Grouped by class, and the thing that decides the action is at the top
    // rather than wherever it happened to be built.
    const roster = view.mine.roster;
    expect(roster.length).toBeGreaterThan(1);
    const perHull = roster.map((r) => r.guns / r.count);
    expect([...perHull].sort((a, b) => b - a)).toEqual(perHull);
    // Every hull present is accounted for exactly once.
    expect(roster.reduce((n, r) => n + r.count, 0)).toBe(view.mine.hulls);
    expect(roster.reduce((n, r) => n + r.guns, 0)).toBe(view.mine.guns);
    // And the three things that change the arithmetic without appearing in it.
    expect(view.mine.officers[0].name).toBe(crew.name);
    expect(view.mine.edge).toBeGreaterThan(1);
    expect(view.mine.troops).toBe(2);
  });

  it('counts the shore for whoever holds it and the creature against everyone', () => {
    const { state, home } = world();
    put(state, home, 'empire', ['sovereign', 'sovereign', 'sovereign']);
    put(state, home, 'alliance', ['tempest', 'tempest', 'tempest']);
    resolveBattles(state, createRng(6));
    const view = battleView(state)!;
    expect(view.system.id).toBe(home.id);
    // The player's own harbor, so the wall is theirs.
    expect(view.shoreIsMine).toBe(true);
    expect(view.mine.hulls).toBeGreaterThan(0);
    expect(view.theirs.hulls).toBeGreaterThan(0);
    // Condition, not just a count: what is left, out of what it started as.
    expect(view.mine.left).toBeLessThanOrEqual(view.mine.whole);
    expect(view.mine.whole).toBeGreaterThan(0);
    expect(BATTLE_ODDS_LABEL[view.odds]).toBeTruthy();
  });
});

describe('companies load and unload themselves', () => {
  it('takes what the island can spare when a fleet sails, and no more', () => {
    const { state, home } = world();
    state.player = 'alliance';
    home.control = 'alliance';
    home.support = { empire: 20, alliance: 80 };
    home.garrison = 6;
    const fleet = put(state, home, 'alliance', ['brig', 'brig']);
    const spare = sparedCompanies(home);
    expect(spare).toBeGreaterThan(0);
    expect(spare).toBeLessThan(home.garrison);

    const to = state.systems.find((s) => s.id !== home.id && s.explored.alliance)!;
    sailFleet(state, fleet.id, to.id, 'alliance');
    // Aboard, but never so many that the island drops under what holds it
    // quiet — an island that rises behind the fleet that emptied it is worse
    // than the landing was worth.
    expect(fleet.troops).toBe(Math.min(fleetCapacity(fleet), spare));
    expect(home.garrison).toBeGreaterThanOrEqual(
      requiredGarrison(home.support.alliance, home.uprising),
    );
    expect(home.garrison + fleet.troops).toBe(6);
  });

  it('never strips the last company off an island nobody lives on', () => {
    const { state, home } = world();
    state.player = 'alliance';
    const rock = state.systems.find((s) => !s.populated)!;
    rock.control = 'alliance';
    rock.explored.alliance = true;
    rock.garrison = 1;
    const fleet = put(state, rock, 'alliance', ['brig']);
    expect(sparedCompanies(rock)).toBe(0);
    sailFleet(state, fleet.id, home.id, 'alliance');
    expect(fleet.troops).toBe(0);
    expect(rock.garrison).toBe(1);
  });

  it('puts them ashore on arriving at an island of yours, and not on theirs', () => {
    const { state, home } = world();
    state.player = 'alliance';
    home.control = 'alliance';
    home.garrison = 8;
    const mine = state.systems.find(
      (s) => s.id !== home.id && s.control === 'alliance' && s.populated,
    )!;
    const theirs = state.systems.find((s) => s.control === 'empire' && s.populated)!;
    theirs.explored.alliance = true;

    const rng = createRng(3);
    const home1 = put(state, home, 'alliance', ['brig', 'brig']);
    sailFleet(state, home1.id, mine.id, 'alliance');
    const carried = home1.troops;
    expect(carried).toBeGreaterThan(0);
    const before = mine.garrison;
    for (let d = 0; d < 60 && home1.voyage; d++) advanceFleets(state, rng);
    expect(home1.troops).toBe(0);
    expect(mine.garrison).toBe(before + carried);

    // And on the enemy's ground they stay aboard, because that is what a
    // landing is made of.
    const second = put(state, home, 'alliance', ['brig', 'brig']);
    home.garrison = 8;
    sailFleet(state, second.id, theirs.id, 'alliance');
    const aboard = second.troops;
    expect(aboard).toBeGreaterThan(0);
    for (let d = 0; d < 80 && second.voyage; d++) advanceFleets(state, rng);
    const still = state.fleets.find((f) => f.id === second.id);
    if (still) expect(still.troops).toBe(aboard);
  });
});

describe('splitting and joining squadrons', () => {
  it('makes a new squadron out of the hulls you pick, and leaves the rest', () => {
    const { state, home } = world();
    state.player = 'alliance';
    const fleet = put(state, home, 'alliance', ['tempest', 'swift', 'swift', 'brig']);
    const take = fleet.ships.slice(1, 3).map((sh) => sh.id);
    const made = detachShips(state, fleet.id, take, undefined, 'alliance');

    expect(made.id).not.toBe(fleet.id);
    expect(made.systemId).toBe(fleet.systemId);
    expect(made.ships.map((sh) => sh.id).sort()).toEqual([...take].sort());
    expect(fleet.ships).toHaveLength(2);
    // Both are real fleets at the island, and the hulls are in exactly one each.
    const all = fleetsAt(state, home.id).flatMap((f) => f.ships.map((sh) => sh.id));
    expect(new Set(all).size).toBe(4);
  });

  it('refuses to make a squadron out of the whole squadron', () => {
    const { state, home } = world();
    state.player = 'alliance';
    const fleet = put(state, home, 'alliance', ['tempest', 'swift']);
    const every = fleet.ships.map((sh) => sh.id);
    expect(detachError(state, fleet.id, every, undefined, 'alliance')).toMatch(/whole squadron/);
  });

  it('joins another squadron lying in the same water, and folds an empty one in', () => {
    const { state, home } = world();
    state.player = 'alliance';
    const first = put(state, home, 'alliance', ['tempest', 'swift']);
    const second = detachShips(state, first.id, [first.ships[1].id], undefined, 'alliance');
    // Now send everything left in the first across: it empties, so it goes.
    const crew = state.characters.find(
      (c) => c.faction === 'alliance' && !/Hale|Reyne|Jessup/.test(c.name),
    )!;
    crew.locationSystemId = home.id;
    board(state, first.id, crew.id, 'alliance');
    detachShips(state, first.id, first.ships.map((sh) => sh.id), second.id, 'alliance');

    expect(state.fleets.find((f) => f.id === first.id)).toBeUndefined();
    const merged = state.fleets.find((f) => f.id === second.id)!;
    expect(merged.ships).toHaveLength(2);
    // Whoever was serving with the fleet that went goes across with the hulls.
    expect(merged.officerIds).toContain(crew.id);
  });

  it('never loses a company, because the room aboard cannot change', () => {
    const { state, home } = world();
    state.player = 'alliance';
    home.control = 'alliance';
    const fleet = put(state, home, 'alliance', ['brig', 'brig', 'tempest']);
    fleet.troops = fleetCapacity(fleet);
    const carried = fleet.troops;
    // Take the transports out, which is where nearly all the room was.
    const holds = fleet.ships.filter((sh) => sh.classId === 'brig').map((sh) => sh.id);
    const made = detachShips(state, fleet.id, holds, undefined, 'alliance');
    expect(fleet.troops + made.troops).toBe(carried);
    expect(fleet.troops).toBeLessThanOrEqual(fleetCapacity(fleet));
    expect(made.troops).toBeLessThanOrEqual(fleetCapacity(made));
  });

  it('will not move hulls to a squadron at another island, or one at sea', () => {
    const { state, home } = world();
    state.player = 'alliance';
    const here = put(state, home, 'alliance', ['tempest', 'swift']);
    const far = state.systems.find((s) => s.id !== home.id)!;
    const there = put(state, far, 'alliance', ['tempest']);
    expect(detachError(state, here.id, [here.ships[0].id], there.id, 'alliance')).toMatch(
      /another island/,
    );
    // And not while either of them is under way.
    here.voyage = { targetSystemId: far.id, daysRemaining: 3 };
    expect(detachError(state, here.id, [here.ships[0].id], undefined, 'alliance')).toMatch(/at sea/);
  });
});

describe('the clock stops for combat and for nothing else', () => {
  it('leaves an unanswered report as one question, not one a fortnight', () => {
    // The hold on pending decisions is gone, so an errand that reports and is
    // never answered now runs against a moving clock. It used to raise a fresh
    // decision every cycle; measured at 209 for one officer before this.
    const state = generateGalaxy(301, 'empire');
    const who = state.characters.find((c) => c.faction === 'empire')!;
    const target = state.systems.find(
      (s) => s.control === 'neutral' && s.populated && s.explored.empire,
    )!;
    startMission(state, who.id, target.id);
    const rng = createRng(4);
    let most = 0;
    for (let day = 0; day < 200; day++) {
      advanceMissions(state, rng);
      most = Math.max(most, state.pendingDecisions.filter((d) => d.characterId === who.id).length);
    }
    expect(most).toBeLessThanOrEqual(1);
  });

  it('never leaves a question standing for somebody who cannot answer it', () => {
    const state = generateGalaxy(301, 'empire');
    const who = state.characters.find((c) => c.faction === 'empire')!;
    state.pendingDecisions.push({ characterId: who.id, systemId: who.locationSystemId, success: true });
    // Carried off while waiting: the question goes with them, or it would
    // pause the captivity it is attached to.
    who.status = 'captured';
    who.injuredDays = 30;
    who.mission = undefined;
    const rng = createRng(1);
    advanceMissions(state, rng);
    expect(state.pendingDecisions).toHaveLength(0);
    expect(getCharacter(state, who.id).injuredDays).toBe(29);
  });
});

describe('only certain officers can hold a place', () => {
  it('offers Command to a Leader and refuses it to anyone else', () => {
    const state = generateGalaxy(301, 'empire');
    const island = state.systems.find((s) => s.control === 'empire')!;
    const leader = state.characters.find(
      (c) => c.faction === 'empire' && canCommand(c),
    )!;
    const other = state.characters.find(
      (c) => c.faction === 'empire' && !canCommand(c),
    );
    expect(leader).toBeDefined();
    expect(missionsOffered(state, island, 'empire', leader)).toContain('command');
    if (other) {
      expect(missionsOffered(state, island, 'empire', other)).not.toContain('command');
      expect(missionError(state, other.id, island.id, 'command')).toMatch(/Leader or a General/);
    }
    // Asked about the island alone, it is still a place that can take one.
    expect(missionsOffered(state, island, 'empire')).toContain('command');
  });

  it('gives both sides someone, and leaves some of the unaligned out', () => {
    const state = generateGalaxy(301, 'empire');
    for (const side of ['empire', 'alliance'] as const) {
      const able = state.characters.filter((c) => c.faction === side && canCommand(c));
      expect(able.length).toBeGreaterThan(0);
    }
    // Signing somebody on can get you a commander, but not every stranger is
    // one — otherwise the rule would not be a rule.
    const strangers = state.characters.filter((c) => c.faction === 'neutral');
    const able = strangers.filter(canCommand).length;
    expect(able).toBeGreaterThan(0);
    expect(able).toBeLessThan(strangers.length);
  });
});
