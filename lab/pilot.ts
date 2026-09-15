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
  sendDiplomat,
  resolvePendingMission,
  type CommandResult,
} from '../src/sim/commands';
import { buildMenu, canQueueBuild } from '../src/sim/build';
import { fleetsOf, isAtSea, fleetCapacity, sailError, assaultError } from '../src/sim/fleets';
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
    state = take(sendDiplomat(state, officer.id, best.system.id, best.type), `errand:${best.type}`);
  }

  // 3. Spend the treasury. Found works where there are none, then build.
  if (state.factions[me].gold > 400) {
    const bare = state.systems.find(
      (s) => s.control === me && !s.uprising && s.facilities.length === 0 && s.slots > 0,
    );
    if (bare) state = take(orderFoundWorks(state, bare.id), 'build:found');
  }
  if (state.factions[me].gold > 250) {
    outer: for (const sys of state.systems) {
      if (sys.control !== me || sys.uprising) continue;
      for (const fac of sys.facilities) {
        if (fac.owner !== me || fac.building) continue;
        // Earners first, then companies, then hulls: an economy, then a war.
        const want = ['refinery', 'mine', 'troop', 'shipyard', 'training_facility', 'fort'] as const;
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

  // 4. The fleet. Land companies where they will carry an island; otherwise
  // sail for the nearest island worth taking.
  for (const fleet of fleetsOf(state, me)) {
    if (isAtSea(fleet)) continue;
    const here = state.systems.find((s) => s.id === fleet.systemId)!;
    if (here.control !== me && fleet.troops > here.garrison && assaultError(state, fleet.id, me) === null) {
      state = take(orderAssault(state, fleet.id), 'fleet:land');
      continue;
    }
    if (fleet.troops === 0 || fleetCapacity(fleet) === 0) {
      // Go home and load: companies come aboard on their own at an island of ours.
      const home = state.systems.find((s) => s.control === me && s.garrison > 1 && s.id !== fleet.systemId);
      if (home && sailError(state, fleet.id, home.id, me) === null && here.control !== me) {
        state = take(orderSail(state, fleet.id, home.id), 'fleet:sail-home');
      }
      continue;
    }
    const prize = state.systems
      .filter((s) => s.populated && s.control !== me && s.explored[me] && s.garrison < fleet.troops)
      .sort((a, b) => travelDays(state, fleet.systemId, a.id) - travelDays(state, fleet.systemId, b.id))[0];
    if (prize && sailError(state, fleet.id, prize.id, me) === null) {
      state = take(orderSail(state, fleet.id, prize.id), 'fleet:sail-attack');
    }
  }

  void missionTypeFor;
  return state;
}
