/**
 * A scripted player: somebody reasonable at the wheel, giving orders through
 * the same command layer the UI uses.
 *
 * The point is not to play well. It is that with the player seat idle, half
 * the game is never touched — every errand, every build order, every sailing
 * decision and every "carry on or come home" goes through `commands.ts`, and
 * none of it runs in a test where the human does nothing.
 */
import {
  orderBuild,
  orderFoundWorks,
  orderSail,
  orderAssault,
  orderDetach,
  orderBombard,
  sendCrew,
  resolvePendingMission,
  type CommandResult,
} from '../src/sim/commands';
import { buildMenu, canQueueBuild, openDeposits, planBuild } from '../src/sim/build';
import { needsResource } from '../src/sim/constants';
import {
  detachError,
  fleetsOf,
  isAtSea,
  fleetCapacity,
  sailError,
  assaultError,
  bombardError,
  fleetBombard,
  fortsOf,
} from '../src/sim/fleets';
import { FORT_STRENGTH } from '../src/sim/constants';
import {
  canStartMission,
  isMissionTarget,
  missionsOffered,
  missionTypeFor,
  travelDays,
} from '../src/sim/missions';
import type { GameState, MissionType, PlayableFaction, System } from '../src/sim/types';

export interface PilotTally { [k: string]: number }

const ERRAND_WORTH: Record<MissionType, number> = {
  abduct: 95, rescue: 90, recruit: 80, command: 55, research: 50,
  diplomacy: 60, incite: 40, sabotage: 35, survey: 30,
};

/** One turn of orders. Returns the new state and what it did. */
export function pilot(state: GameState, tally: PilotTally): GameState {
  const me = state.player;
  const note = (k: string) => { tally[k] = (tally[k] ?? 0) + 1; };
  const take = (r: CommandResult, k: string) => {
    if (r.error) { note(`refused:${k}`); return state; }
    note(k);
    return r.state;
  };

  // 1. Answer anyone reporting in. Come home when the island is basically won.
  for (const d of [...state.pendingDecisions]) {
    const who = state.characters.find((c) => c.id === d.characterId);
    const where = state.systems.find((s) => s.id === who?.mission?.targetSystemId);
    const done = !where || where.control === me || where.support[me] >= 85;
    state = take(resolvePendingMission(state, d.characterId, done ? 'return' : 'continue'),
      done ? 'answer:home' : 'answer:carry-on');
  }

  // 2. Every idle officer goes somewhere worth going.
  const busy = new Set(state.systems.map((s) => s.commanderId).filter(Boolean) as string[]);
  const claimed = new Set(
    state.characters.filter((c) => c.faction === me && c.mission).map((c) => c.mission!.targetSystemId),
  );
  const idle = state.characters
    .filter((c) => c.faction === me && c.status === 'available' && !busy.has(c.id) && !c.escorting)
    .filter((c) => !state.fleets.some((f) => f.officerIds.includes(c.id)));
  for (const officer of idle) {
    let best: { system: System; type: MissionType; score: number } | undefined;
    for (const sys of state.systems) {
      if (claimed.has(sys.id)) continue;
      if (!isMissionTarget(state, sys, me)) continue;
      if (!canStartMission(state, officer.id, sys.id)) continue;
      // Pick the best of everything the island offers, not just its default:
      // this is where a player's judgement lives, and where research, rescue
      // and sabotage actually get chosen.
      for (const type of missionsOffered(state, sys, me, officer)) {
        const days = travelDays(state, officer.locationSystemId, sys.id);
        const score = ERRAND_WORTH[type] - days * 1.5;
        if (!best || score > best.score) best = { system: sys, type, score };
      }
    }
    if (!best) { note('officer:nothing-to-do'); continue; }
    claimed.add(best.system.id);
    state = take(sendCrew(state, officer.id, best.system.id, best.type), `errand:${best.type}`);
  }

  // 3. Spend the treasury. Found works where there are none, then build.
  if (state.factions[me].gold > 400) {
    const bare = state.systems.find(
      (s) => s.control === me && !s.uprising && s.facilities.length === 0 && s.slots > 0,
    );
    if (bare) state = take(orderFoundWorks(state, bare.id), 'build:found');
  }
  // Work the ground first, and send builders to it.
  //
  // The pilot ordered everything from a works standing on the island it was
  // building for, which was fine when any berth would do. With earners needing
  // a deposit under them it collapsed: measured over thirty wars it raised
  // four gold mines and eleven mills in total, fell through to the fallback,
  // and spent the entire treasury on hulls. The opponent had exactly the same
  // blindness and `planBuild` is the answer to it — it picks the quickest
  // works in the whole faction and counts the passage.
  if (state.factions[me].gold > 250) {
    const ground = state.systems
      .filter((s) => s.control === me && !s.uprising)
      .flatMap((s) =>
        (['mine', 'refinery'] as const)
          .filter((item) => openDeposits(state, s, needsResource(item)!) > 0)
          .map((item) => ({ system: s, item })),
      )
      .sort((a, b) => (a.item === 'mine' ? -1 : 0) - (b.item === 'mine' ? -1 : 0));
    for (const { system, item } of ground) {
      const plan = planBuild(state, me, item, system.id);
      if (plan.error !== null || !plan.facilityId) continue;
      state = take(orderBuild(state, plan.facilityId, item, system.id), `build:${item}`);
      break;
    }
  }
  if (state.factions[me].gold > 250) {
    outer: for (const sys of state.systems) {
      if (sys.control !== me || sys.uprising) continue;
      for (const fac of sys.facilities) {
        if (fac.owner !== me || fac.building) continue;
        // Earners are handled above, where the ground is. Here: companies,
        // then somewhere to build, then walls.
        const want = ['troop', 'shipyard', 'training_facility', 'fort'] as const;
        for (const item of want) {
          if (!buildMenu(fac).includes(item)) continue;
          if (!canQueueBuild(state, fac.id, item)) continue;
          state = take(orderBuild(state, fac.id, item), `build:${item}`);
          break outer;
        }
        for (const item of buildMenu(fac)) {
          if (!canQueueBuild(state, fac.id, item)) continue;
          state = take(orderBuild(state, fac.id, item), `build:${item}`);
          break outer;
        }
      }
    }
  }

  // 3b. Squadrons of ours in the same harbor become one squadron.
  //
  // Not a flourish: without it the pilot's navy is confetti. A finished hull
  // joins whatever fleet is at the island, and a fleet that was at sea that
  // morning does not get it — so over a long war the player's fleet list fills
  // with single sloops. Measured before this: in twelve hundred days a piloted
  // Confederacy put a squadron off enemy ground four times, never one with
  // more than fourteen weight of shot, and so never opened a wall or took
  // Highwater in fifteen wars. It is the same thing the opponent does in
  // `aiConsolidate`, and a player does it by hand without thinking about it.
  const harbors = new Map<string, typeof state.fleets>();
  for (const f of fleetsOf(state, me)) {
    if (isAtSea(f)) continue;
    harbors.set(f.systemId, [...(harbors.get(f.systemId) ?? []), f]);
  }
  for (const [, here] of harbors) {
    if (here.length < 2) continue;
    const [keep, ...rest] = [...here].sort((a, b) => b.ships.length - a.ships.length);
    for (const other of rest) {
      const hulls = other.ships.map((sh) => sh.id);
      if (detachError(state, other.id, hulls, keep.id, me) !== null) continue;
      state = take(orderDetach(state, other.id, hulls, keep.id), 'fleet:consolidate');
    }
  }

  // 4. The fleet.
  //
  // Companies come aboard by themselves when a squadron sails from ground of
  // ours (see `loadSpareCompanies`), so the order is: pick somewhere worth
  // going and go. It does not need troops before it chooses.
  for (const fleet of fleetsOf(state, me)) {
    if (isAtSea(fleet)) continue;
    // Already working the walls: leave it to it. A siege is a race against
    // what they patch overnight, so wandering off wastes every day of it.
    if (fleet.bombarding) { note('fleet:besieging'); continue; }
    const here = state.systems.find((s) => s.id === fleet.systemId)!;

    if (here.control !== me) {
      // On their ground. Land if the walls are down and we outnumber them;
      // otherwise open fire on the walls; otherwise there is nothing to do
      // here and it should go and fetch companies.
      if (fleet.troops > here.garrison && assaultError(state, fleet.id, me) === null) {
        state = take(orderAssault(state, fleet.id), 'fleet:land');
        continue;
      }
      if (fortsOf(here).length > 0 && bombardError(state, fleet.id, me) === null) {
        state = take(orderBombard(state, fleet.id), 'fleet:bombard');
        continue;
      }
    }

    // Somewhere worth going: the nearest island of theirs this squadron could
    // actually carry, counting what it will pick up on the way out.
    const willCarry = fleet.troops + Math.min(fleetCapacity(fleet) - fleet.troops,
      here.control === me ? Math.max(0, here.garrison - 1) : 0);
    // Nearest soft target, unless this squadron is heavy enough to open a
    // walled one — in which case that is what a squadron of the line is
    // *for*, and the nearest undefended fishing village is not.
    const wallBreaker = fleetBombard(fleet) >= FORT_STRENGTH / 3;
    const prize = state.systems
      .filter((s) => s.populated && s.control !== me && s.explored[me] && s.id !== fleet.systemId)
      .filter((s) => s.garrison < willCarry || fortsOf(s).length > 0)
      .sort((a, b) => {
        const worth = (s: System) =>
          travelDays(state, fleet.systemId, s.id) - (wallBreaker && fortsOf(s).length > 0 ? 40 : 0);
        return worth(a) - worth(b);
      })[0];
    // But not one hull at a time.
    //
    // A squadron of one is a squadron that meets their fleet and sinks, and
    // the pilot was sailing every finished hull at the enemy the day it
    // launched: measured over twelve hundred days, a piloted Confederacy built
    // forty-six first-rates, had none of them afloat at the end, put a
    // squadron off enemy ground four times in the whole war and never once
    // opened a wall. It waits until it has a squadron — which is what the
    // consolidation above is for, and what any player does without being told.
    const gathered = fleet.ships.length >= 2 || (prize !== undefined && prize.garrison === 0);
    if (prize && !gathered) { note('fleet:gathering'); continue; }
    if (prize && sailError(state, fleet.id, prize.id, me) === null) {
      state = take(orderSail(state, fleet.id, prize.id), 'fleet:sail-attack');
      continue;
    }
    // Nothing reachable worth taking, and nothing aboard: go where the
    // companies are, so the next sailing leaves with a landing party.
    if (fleet.troops === 0 && (here.control !== me || here.garrison <= 1)) {
      const fuller = [...state.systems]
        .filter((s) => s.control === me && s.id !== fleet.systemId && s.garrison > 2)
        .sort((a, b) => b.garrison - a.garrison)[0];
      if (fuller && sailError(state, fleet.id, fuller.id, me) === null) {
        state = take(orderSail(state, fleet.id, fuller.id), 'fleet:sail-home');
      }
    }
  }

  void missionTypeFor;
  return state;
}
