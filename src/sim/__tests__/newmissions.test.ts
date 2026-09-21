import { describe, expect, it } from 'vitest';
import { advanceDay } from '../advanceDay';
import { generateGalaxy } from '../galaxy';
import { createRng } from '../rng';
import { isLord } from '../lords';
import { getCharacter, getSystem } from '../helpers';
import {
  advanceMissions,
  bestOf,
  companionsFor,
  craftGrade,
  endMission,
  isAbductTarget,
  isCommandTarget,
  isMissionTarget,
  isRecruitTarget,
  isResearchTarget,
  passageDays,
  stillWorthDoing,
  travelDays,
  isRescueTarget,
  captiveOn,
  missionTypeFor,
  missionsOffered,
  partyOf,
  partyStrength,
  successChance,
  startMission,
} from '../missions';
import { effectiveSpec, queueBuild } from '../build';
import { buildSpec, shipsAt, shipsFor } from '../constants';
import { CRAFT_GRADES, MISSION_PARTY_MAX, MISSION_WORK_DAYS, RESEARCH_MIN_SUPPORT } from '../constants';
import type { Character, GameState, System } from '../types';

function world(seed = 501): GameState {
  return generateGalaxy(seed, 'empire');
}

/** Put a character on an island, ready to be sent. */
function place(state: GameState, who: Character, system: System) {
  who.locationSystemId = system.id;
  who.status = 'available';
  who.mission = undefined;
  // Ashore, not serving with a fleet.
  for (const f of state.fleets) f.officerIds = f.officerIds.filter((id) => id !== who.id);
}

/** Run enough days for a mission started on the spot to land and report. */
function runMission(state: GameState, days = MISSION_WORK_DAYS + 2, seed = 7) {
  const rng = createRng(seed);
  for (let i = 0; i < days; i++) advanceMissions(state, rng);
}

/**
 * An island of ours with nothing else on offer.
 *
 * `missionTypeFor` answers recruit before anything else, so a test about what
 * an island offers has to pick one where somebody worth signing on is not
 * already standing on the quay — otherwise it is testing the roll of the world
 * rather than the rule.
 */
function plainIsland(state: GameState) {
  return (
    state.systems.find(
      (s) => s.control === 'empire' && s.populated && !isRecruitTarget(state, s, 'empire'),
    ) ?? state.systems.find((s) => s.control === 'empire' && s.populated)!
  );
}

describe('abduction', () => {
  it('offers no lift on an island the enemy holds — unless a Lord is standing on it', () => {
    const state = world();
    const theirs = state.systems.find((s) => s.control === 'alliance')!;
    const them = state.characters.find((c) => c.faction === 'alliance' && !isLord(c))!;
    const lord = state.characters.find((c) => c.faction === 'alliance' && isLord(c))!;
    // Anywhere but the island under test. This used to park them on
    // `systems[0]` and passed only while that happened not to be `theirs` —
    // change the world generator and the Lord is already standing on the
    // target, which is the one case the test is here to tell apart.
    const elsewhere = state.systems.find((s) => s.id !== theirs.id)!;
    for (const c of state.characters) if (c.faction === 'alliance') place(state, c, elsewhere);
    place(state, them, theirs);
    theirs.explored.empire = true;
    // Their own ground, their own garrison. This is what incitement is for,
    // and if abduction took precedence here their capital would never be
    // anything else — every one of their crew starts standing on it.
    expect(isAbductTarget(state, theirs, 'empire')).toBe(false);
    expect(missionTypeFor(state, theirs, 'empire')).not.toBe('abduct');

    // A Lord is the one exception, because a Lord is the war. Without it the
    // Crown has no route to its own victory at all: the three of them stand on
    // Confederate ground, and measured over sixteen wars with their harbor
    // closed the Crown won none of them and took no Lord.
    place(state, lord, theirs);
    expect(isAbductTarget(state, theirs, 'empire')).toBe(true);
    expect(missionTypeFor(state, theirs, 'empire')).toBe('abduct');
  });

  it('takes an enemy crew member caught off their own ground, and gives them back later', () => {
    const state = world();
    const mine = plainIsland(state);
    // Not a Lord: they never leave their ships and cannot be lifted off a quay.
    const them = state.characters.find((c) => c.faction === 'alliance' && !isLord(c))!;
    const me = state.characters.find((c) => c.faction === 'empire')!;
    place(state, them, mine);
    place(state, me, mine);
    // Espionage gets the party through the door; Combat takes the mark off
    // the quay. Two ratings, two stages, since 17 September.
    me.espionage = 100;
    me.combat = 100;
    them.combat = 1;
    them.leadership = 1;

    expect(isAbductTarget(state, mine, 'empire')).toBe(true);
    expect(missionTypeFor(state, mine, 'empire')).toBe('abduct');

    startMission(state, me.id, mine.id);
    runMission(state);
    expect(them.status).toBe('captured');
    // Held at your seat, not left where they were lifted.
    expect(them.locationSystemId).toBe(state.factions.empire.hqSystemId);

    // And they are inert while held: not idle, not sailable, not a target.
    expect(isAbductTarget(state, mine, 'empire')).toBe(false);

    // And they stay there. Sean, 16 September: *"Why would anyone be released
    // without a rescue mission?"* — nobody hands back the enemy's officers
    // because two months have passed, so nothing comes of waiting.
    const rng = createRng(3);
    for (let i = 0; i < 240; i++) advanceMissions(state, rng);
    expect(them.status).toBe('captured');
    expect(them.locationSystemId).toBe(state.factions.empire.hqSystemId);
  });

  it('gives a prisoner back only to somebody who comes and gets them', () => {
    const state = world();
    const mine = plainIsland(state);
    const them = state.characters.find((c) => c.faction === 'alliance' && !isLord(c))!;
    const me = state.characters.find((c) => c.faction === 'empire')!;
    place(state, them, mine);
    place(state, me, mine);
    me.espionage = 100;
    them.combat = 1;
    them.leadership = 1;
    startMission(state, me.id, mine.id);
    runMission(state);
    expect(them.status).toBe('captured');
    // And the abductor is done. Their side is the player's here, so the errand
    // ends in a report waiting to be answered — leave it unanswered and the
    // officer keeps working the same quay every fortnight, which is how this
    // test used to lift the rescuer off it before she could reach the cells.
    endMission(state, me.id);
    state.pendingDecisions = [];

    // The cell is on a named island, and that island is now an errand for the
    // side that lost them — which is the whole point of holding rather than
    // releasing: a prisoner is a place on the chart, not a countdown.
    const gaol = getSystem(state, them.locationSystemId);
    gaol.explored.alliance = true;
    expect(isRescueTarget(state, gaol, 'alliance')).toBe(true);
    expect(captiveOn(state, gaol, 'alliance')?.id).toBe(them.id);

    const saviour = state.characters.find(
      (c) => c.faction === 'alliance' && c.id !== them.id && c.status === 'available',
    )!;
    place(state, saviour, gaol);
    // Same two stages: Espionage past the watch, Combat past the gaolers.
    saviour.espionage = 100;
    saviour.combat = 100;
    /*
     * And the gaolers are real now: the rescue is set against the companies
     * holding the cells, so storming a six-company capital with one officer is
     * a coin flip at best and a way to lose the rescuer at worst — *"a rescue
     * against a large garrison and a strong commander is an entirely different
     * operation"*. That is the rule working and not the rule under test, so the
     * capital is thinly held here, the way it would be with its companies away
     * on a landing. What is under test is that a prisoner comes back when
     * somebody comes for them, and never otherwise.
     */
    gaol.garrison = 1;
    for (let go = 0; go < 8 && them.status === 'captured'; go++) {
      if (saviour.status === 'injured') {
        saviour.status = 'available';
        saviour.injuredDays = undefined;
      }
      expect(saviour.status, 'the rescuer was taken too').not.toBe('captured');
      if (saviour.status === 'available') startMission(state, saviour.id, gaol.id, 'rescue');
      // A fresh seed each attempt: the draws are replayed from the seed every
      // call, so re-running the same one only ever re-runs the same luck.
      runMission(state, MISSION_WORK_DAYS + 2, 7 + go);
      state.pendingDecisions = [];
    }
    expect(them.status).toBe('available');
    // Home among their own, not left standing in the Crown's harbor.
    expect(getSystem(state, them.locationSystemId).control).not.toBe('empire');
  });
});

describe('command over an island', () => {
  it('is the answer to your own island in revolt, which nothing else was', () => {
    const state = world();
    const mine = plainIsland(state);
    mine.uprising = true;
    // Parley refuses a risen island, incitement wants the enemy's, and
    // sabotage wants their works: before this there was no errand at all here.
    expect(isCommandTarget(mine, 'empire')).toBe(true);
    expect(missionTypeFor(state, mine, 'empire')).toBe('command');
  });

  it('puts the revolt down, and moves the bar even on a bad cycle', () => {
    const state = world();
    const mine = plainIsland(state);
    const me = state.characters.find((c) => c.faction === 'empire')!;
    mine.uprising = true;
    mine.support.empire = 30;
    place(state, me, mine);
    me.leadership = 100;
    const before = mine.support.empire;

    startMission(state, me.id, mine.id);
    runMission(state);
    expect(mine.support.empire).toBeGreaterThan(before);
    expect(mine.uprising).toBe(false);
  });
});

describe('research', () => {
  it('waits until the island has nothing left to be talked round about', () => {
    const state = world();
    const yard = state.systems.find(
      (s) =>
        s.control === 'empire' &&
        s.facilities.some((f) => f.type === 'shipyard' || f.type === 'training_facility'),
    )!;
    yard.support.empire = RESEARCH_MIN_SUPPORT - 10;
    expect(isResearchTarget(state, yard, 'empire')).toBe(false);
    // Below the floor there is still a parley worth having, and it wins.
    expect(missionTypeFor(state, yard, 'empire')).toBe('diplomacy');

    yard.support.empire = RESEARCH_MIN_SUPPORT + 5;
    expect(isResearchTarget(state, yard, 'empire')).toBe(true);

    /*
     * And it stops once the shipwrights have nothing left to learn. There are
     * three grades; past the third every further fortnight in the yards buys a
     * number no rule reads, and research is exempt from the patience rule that
     * ends every other errand — so without this an officer stayed in the yards
     * for the rest of the war.
     */
    state.factions.empire.craft = CRAFT_GRADES[CRAFT_GRADES.length - 1];
    expect(isResearchTarget(state, yard, 'empire')).toBe(false);
    expect(missionTypeFor(state, yard, 'empire')).not.toBe('research');
    state.factions.empire.craft = 0;
    expect(missionTypeFor(state, yard, 'empire')).toBe('research');
  });

  /**
   * A fortnight's work is not undone by the harbour going two points cooler.
   *
   * Sean's Day 150 playtest: *"'In the yards' errand fails with a parley
   * message... Craft stayed 0 all game (Crown hit 34)."* Reproduced by running
   * the war: the Lord Regent put in at Highwater on day 2 with the island at
   * 99.5, worked its yards for a hundred and four days, and lost the lot on
   * day 106 when Highwater drifted to 72.9 — a fraction under the floor.
   *
   * The allegiance floor is a rule about *choosing* the errand: below it there
   * is still an argument to be won and a parley is the better use of an
   * officer. Re-checking it every cycle turned it into a rule about the work
   * being possible, which made a long errand fragile in proportion to its
   * length — and research is the longest there is.
   *
   * Measured across three wars, machine-played: craft finished at 179.7, 24.0
   * and 164.3 with two or three abandonments apiece; afterwards 520.7, 527.7
   * and 504.0 with none. The grades are 100 / 260 / 520, so the top of the
   * research tree had never once been reached by either side.
   */
  it('keeps working through a dip in allegiance, and stops for the things that really stop it', () => {
    const state = world();
    const yard = state.systems.find(
      (s) =>
        s.control === 'empire' &&
        s.facilities.some((f) => f.type === 'shipyard' || f.type === 'training_facility'),
    )!;
    yard.support.empire = RESEARCH_MIN_SUPPORT + 5;
    expect(isResearchTarget(state, yard, 'empire')).toBe(true);
    expect(stillWorthDoing(state, yard, 'empire', 'research')).toBe(true);

    // The drift that used to end it. It may no longer be *chosen* here — a
    // parley is the better errand now — but the shipwrights carry on.
    yard.support.empire = RESEARCH_MIN_SUPPORT - 3;
    expect(isResearchTarget(state, yard, 'empire')).toBe(false);
    expect(stillWorthDoing(state, yard, 'empire', 'research')).toBe(true);

    // What does stop them, one at a time.
    yard.uprising = true;
    expect(stillWorthDoing(state, yard, 'empire', 'research')).toBe(false);
    yard.uprising = false;

    yard.control = 'alliance';
    expect(stillWorthDoing(state, yard, 'empire', 'research')).toBe(false);
    yard.control = 'empire';

    const yards = yard.facilities.filter(
      (f) => f.type === 'shipyard' || f.type === 'training_facility',
    );
    yard.facilities = yard.facilities.filter((f) => !yards.includes(f));
    expect(stillWorthDoing(state, yard, 'empire', 'research')).toBe(false);
    yard.facilities.push(...yards);

    state.factions.empire.craft = CRAFT_GRADES[CRAFT_GRADES.length - 1];
    expect(stillWorthDoing(state, yard, 'empire', 'research')).toBe(false);
  });

  /**
   * Everything, not only hulls — the reverse of what this asserted.
   *
   * Sean, 21 September: *"Just make research the mission. And it applies to
   * buildings, ships, and troops. Keep it simple."* The old rule was that a
   * mine cost what a mine had always cost, so that a player noticing cheaper
   * ships had one thing to thank. The cost of that legibility was a mission
   * worth nothing at all to a side not building ships that month.
   */
  /**
   * Research unlocks; it does not discount.
   *
   * These two tests used to prove the opposite — that reaching a grade took a
   * tenth off a hull's price and an eighth off its days, and that a wall and a
   * troop took the same cut. That rule was written when the craft ladder had
   * nothing to unlock and had to be worth something anyway. It has had
   * something to unlock since 16 September, and the v4.3 roster prices every
   * hull absolutely off its own Ratings & Pricing tab, so keeping both would
   * have made the sheet's pricing authority a suggestion: eight rungs at a
   * tenth each is eighty per cent off a Majestic.
   *
   * So the proof is inverted, which is the same move the combat tests made
   * when a removal shipped: the price on the sheet is the price, at every
   * rung, and what the ladder buys is hulls a yard would otherwise refuse.
   */
  it('charges the price on the sheet, at every rung of the ladder', () => {
    const state = world();
    const hull = shipsFor('empire')[0].id;
    const sticker = { costGold: buildSpec(hull).costGold, days: buildSpec(hull).days };
    expect(effectiveSpec(state, 'empire', hull)).toEqual(sticker);

    state.factions.empire.craft = 5000; // past the top of the ladder
    expect(craftGrade(state.factions.empire.craft)).toBe(CRAFT_GRADES.length);
    expect(effectiveSpec(state, 'empire', hull)).toEqual(sticker);

    // And nothing else moves either: a mine, a wall and a troop cost what
    // they cost however far the shipwrights have got.
    for (const item of ['mine', 'fort', 'troop'] as const) {
      expect(effectiveSpec(state, 'empire', item)).toEqual({
        costGold: buildSpec(item).costGold,
        days: buildSpec(item).days,
      });
    }
  });

  it('opens a rung of the roster at each grade, which is what it is for', () => {
    // Nothing but the four S-rungs on day one.
    expect(shipsAt('empire', 0).every((c) => (c.craft ?? 0) === 0)).toBe(true);
    const opening = shipsAt('empire', 0).length;
    // One rung up, and R1 is on the menu.
    expect(shipsAt('empire', 1).length).toBeGreaterThan(opening);
    // All the way up, and the whole ladder is.
    expect(shipsAt('empire', CRAFT_GRADES.length).length).toBe(shipsFor('empire').length);
  });

  it('charges the sticker price when the order is actually placed', () => {
    const state = world();
    state.factions.empire.craft = 5000;
    const yard = state.systems.find((s) =>
      s.facilities.some((f) => f.owner === 'empire' && f.type === 'shipyard'),
    );
    if (!yard) return; // no slipway in this opening; the sums above still hold
    const slipway = yard.facilities.find((f) => f.owner === 'empire' && f.type === 'shipyard')!;
    const hull = shipsFor('empire')[0].id;
    const purse = state.factions.empire.gold;
    const spec = effectiveSpec(state, 'empire', hull);
    queueBuild(state, slipway.id, hull);
    expect(state.factions.empire.gold).toBe(purse - spec.costGold);
    expect(slipway.building!.workLeft).toBe(spec.days);
  });
});

describe('rescue', () => {
  it('breaks one of yours out of the enemy seat and sends them home', () => {
    const state = world();
    const empireHq = state.systems.find((s) => s.id === state.factions.empire.hqSystemId)!;
    const allianceHq = state.systems.find((s) => s.id === state.factions.alliance.hqSystemId)!;
    const [held, rescuer] = state.characters.filter((c) => c.faction === 'alliance');
    // Held at the Crown's seat, as an abduction leaves them.
    held.status = 'captured';
    held.mission = undefined;
    held.locationSystemId = empireHq.id;
    // Not on offer until the seat is known.
    empireHq.explored.alliance = false;
    expect(isRescueTarget(state, empireHq, 'alliance')).toBe(false);
    empireHq.explored.alliance = true;
    expect(isRescueTarget(state, empireHq, 'alliance')).toBe(true);
    expect(missionsOffered(state, empireHq, 'alliance')).toContain('rescue');
    // Outranks stirring the Crown's own capital.
    expect(missionTypeFor(state, empireHq, 'alliance')).toBe('rescue');

    place(state, rescuer, allianceHq);
    // Espionage past the watch, Combat past the gaolers — and the Crown's seat
    // is the hardest gaol in the world, six companies and a loyal town, so
    // this needs both and a thinner guard than a capital keeps at rest.
    rescuer.espionage = 100;
    rescuer.combat = 100;
    empireHq.garrison = 2;
    // A handful of seeds finds a landing.
    let freed = false;
    for (let seed = 1; seed <= 12 && !freed; seed++) {
      const trial = structuredClone(state);
      const who = trial.characters.find((c) => c.id === rescuer.id)!;
      const them = trial.characters.find((c) => c.id === held.id)!;
      startMission(trial, who.id, empireHq.id, 'rescue');
      expect(who.mission?.type).toBe('rescue');
      const rng = createRng(seed);
      // The errand carries its own length — passage there and the work — so
      // the loop asks it rather than guessing at forty days.
      const runs = (who.mission?.daysRemaining ?? 0) + MISSION_WORK_DAYS + 5;
      for (let d = 0; d < runs && them.status === 'captured'; d++) advanceMissions(trial, rng);
      if (them.status === 'available') {
        freed = true;
        // Home, not standing on the enemy quay.
        expect(them.locationSystemId).toBe(allianceHq.id);
        expect(trial.events.some((e) => /out of the cells/.test(e.text))).toBe(true);
      }
    }
    expect(freed).toBe(true);
  });
});

describe('a boat with more than one in it', () => {
  it('takes who is in the same harbor, ashore or afloat, and nobody else', () => {
    const state = generateGalaxy(21, 'empire');
    const leader = state.characters.find((c) => c.faction === 'empire')!;
    const here = leader.locationSystemId;
    const eligible = companionsFor(state, leader);
    for (const c of eligible) {
      expect(c.locationSystemId).toBe(here);
      expect(c.faction).toBe('empire');
      expect(c.status).toBe('available');
      expect(c.id).not.toBe(leader.id);
    }
    // Somebody on another island is not in the boat.
    const far = state.characters.find(
      (c) => c.faction === 'empire' && c.locationSystemId !== here,
    );
    if (far) expect(eligible.map((c) => c.id)).not.toContain(far.id);
    // Nor is one of theirs.
    const theirs = state.characters.find((c) => c.faction === 'alliance')!;
    expect(eligible.map((c) => c.id)).not.toContain(theirs.id);
  });

  it('carries four at most, and the extras are simply not in it', () => {
    const state = generateGalaxy(21, 'empire');
    const leader = state.characters.find((c) => c.faction === 'empire')!;
    const mates = companionsFor(state, leader);
    const target = state.systems.find(
      (s) => s.id !== leader.locationSystemId && isMissionTarget(state, s, 'empire'),
    )!;
    startMission(state, leader.id, target.id, undefined, mates.map((c) => c.id));
    const party = partyOf(state, leader);
    expect(party.length).toBeLessThanOrEqual(MISSION_PARTY_MAX);
    expect(party[0].id).toBe(leader.id);
    for (const mate of party.slice(1)) {
      expect(mate.status).toBe('on_mission');
      expect(mate.escorting).toBe(leader.id);
      // A companion carries no errand of their own, so the day resolves one.
      expect(mate.mission).toBeUndefined();
    }
  });

  it('is worth its best hand at each thing, not its average', () => {
    const state = generateGalaxy(21, 'empire');
    const leader = state.characters.find((c) => c.faction === 'empire')!;
    const mates = companionsFor(state, leader);
    if (mates.length === 0) return;
    const target = state.systems.find(
      (s) => s.id !== leader.locationSystemId && isMissionTarget(state, s, 'empire'),
    )!;
    startMission(state, leader.id, target.id, undefined, mates.map((c) => c.id));
    const all = partyOf(state, leader);
    const boat = partyStrength(state, leader);
    for (const ability of ['diplomacy', 'espionage', 'combat', 'leadership'] as const) {
      expect(boat[ability]).toBe(Math.max(...all.map((c) => c[ability])));
    }
  });

  it('is lifted by a specialist and unmoved by a passenger', () => {
    const state = generateGalaxy(21, 'empire');
    const leader = state.characters.find((c) => c.faction === 'empire')!;
    const better = { ...leader, id: 'chr-ace', espionage: leader.espionage + 25 };
    const worse = { ...leader, id: 'chr-dud', espionage: 1, diplomacy: 1, combat: 1, leadership: 1 };

    // A better spy raises what the boat can do; a worse one changes nothing.
    expect(bestOf([leader, better]).espionage).toBe(leader.espionage + 25);
    expect(bestOf([leader, worse]).espionage).toBe(leader.espionage);
    expect(successChance(bestOf([leader, better]), 'sabotage')).toBeGreaterThan(
      successChance(leader, 'sabotage'),
    );
    expect(successChance(bestOf([leader, worse]), 'sabotage')).toBe(
      successChance(leader, 'sabotage'),
    );
  });

  it('brings everybody home when the errand ends, wherever it ended', () => {
    let state = generateGalaxy(21, 'empire');
    const leaderId = state.characters.find((c) => c.faction === 'empire')!.id;
    const leader = state.characters.find((c) => c.id === leaderId)!;
    const mates = companionsFor(state, leader).slice(0, 2);
    if (mates.length === 0) return;
    const mateIds = mates.map((c) => c.id);
    const target = state.systems.find(
      (s) => s.id !== leader.locationSystemId && isMissionTarget(state, s, 'empire'),
    )!;
    startMission(state, leaderId, target.id, undefined, mateIds);

    state = advanceDay(state);
    for (const id of mateIds) {
      expect(state.characters.find((c) => c.id === id)!.status).toBe('on_mission');
    }
    // End it however it ends, then let a day pass.
    endMission(state, leaderId);
    state = advanceDay(state);
    for (const id of mateIds) {
      const mate = state.characters.find((c) => c.id === id)!;
      expect(mate.status).toBe('available');
      expect(mate.escorting).toBeUndefined();
    }
  });
});

/**
 * The sail the sheet quotes is the sail the order takes.
 *
 * Sean's dev report: *"Captain Silas Reyne's sail estimate shows the full
 * passage, identical to any other officer. His actual sail is halved at
 * execution."* His evidence — the sheet said 25 days, the log said thirteen —
 * and his diagnosis, that the preview and the execution used different sums,
 * were both exactly right.
 *
 * Pinned against the officer with the power rather than against a number, so
 * it holds if the power is ever retuned.
 */
describe('the passage a sheet quotes', () => {
  it('is the one the order actually takes, for the Lord who halves it and for everybody else', () => {
    const state = world();
    const reyne = state.characters.find((c) => c.name === 'Captain Silas Reyne')!;
    const ordinary = state.characters.find(
      (c) => c.faction === reyne.faction && !isLord(c) && c.id !== reyne.id,
    )!;
    // Same start and same target, so the only difference is who is leading.
    ordinary.locationSystemId = reyne.locationSystemId;
    const far = state.systems.find(
      (s) => travelDays(state, reyne.locationSystemId, s.id) > 10,
    )!;

    const quotedReyne = passageDays(state, reyne, far.id);
    const quotedOther = passageDays(state, ordinary, far.id);
    // The power is real and visible before the order is given.
    expect(quotedReyne).toBeLessThan(quotedOther);
    expect(quotedOther).toBe(travelDays(state, ordinary.locationSystemId, far.id));

    // And the order takes exactly what was quoted, which is the whole point.
    startMission(state, reyne.id, far.id);
    expect(getCharacter(state, reyne.id).mission!.daysRemaining).toBe(quotedReyne);

    startMission(state, ordinary.id, far.id);
    expect(getCharacter(state, ordinary.id).mission!.daysRemaining).toBe(quotedOther);
  });

  it('is nought for an island already stood on, however fast the leader', () => {
    const state = world();
    const reyne = state.characters.find((c) => c.name === 'Captain Silas Reyne')!;
    expect(passageDays(state, reyne, reyne.locationSystemId)).toBe(0);
  });
});
