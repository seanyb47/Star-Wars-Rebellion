import {
  cancelOrder,
  orderAssault,
  orderBombard,
  orderBreakOff,
  orderBuild,
  orderCeaseFire,
  orderClearForest,
  orderCloseBattle,
  orderDetach,
  orderEmbark,
  orderFightRound,
  orderFlee,
  orderRaiseWorks,
  orderRelieve,
  orderSail,
  orderScrap,
  reorderCrew,
  reorderGarrison,
  reorderOfficers,
  reorderShips,
  resolvePendingMission,
  sendCrew,
  type CommandResult,
} from './commands';
import type { ScrapTarget } from './economy';
import type {
  BuildItem,
  FacilityType,
  GameState,
  MissionType,
  PlayableFaction,
} from './types';

/**
 * An order as a thing rather than a function call, so it can cross a wire.
 *
 * PvP here is lockstep — both clients hold the whole war, both run
 * `advanceDay`, and only the orders cross, because `lab/wire.ts` measures a
 * state at 56–129 KB against 106 bytes for an order. That bargain needs orders
 * to be **data**: `orderSail(state, 'flt-3', 'sys-9')` is a call that happens
 * in one browser, where `{ kind: 'sail', fleetId: 'flt-3', targetSystemId:
 * 'sys-9' }` is a sentence either browser can read.
 *
 * Three things fall out of having it, and only the first is about PvP:
 *
 * 1. Two clients apply the same list and, because the simulation is
 *    deterministic, land on the same war.
 * 2. A game becomes a seed plus a list of orders — which is a replay, and a
 *    desync becomes something you can walk forward one order at a time instead
 *    of guessing at.
 * 3. An order can be held, inspected or refused before it is applied, which is
 *    what "the game always works on mutual consent" will need.
 *
 * **Completeness is the thing that matters here, and it is enforced rather
 * than hoped.** An order with no envelope is an order that never reaches the
 * other player: it would apply on one client and not the other, and the two
 * wars would come apart silently, which is the one failure lockstep has.
 * `src/sim/__tests__/orders.test.ts` reads `commands.ts` and fails the build if
 * a command exists with nothing here to carry it, so command number
 * twenty-four cannot be added without this file noticing.
 *
 * Deliberately absent: `newGame`, `setObserving` and `setSpeed`. None of them
 * is an order inside a war. A new game is the thing the war starts from, both
 * clients get the same seed when they sit down, and handing your side to the
 * machine is not something you can do to somebody else's. The speed is shared
 * and it is the one case Sean has already ruled on — *"the other player gets a
 * popup… they can accept or decline"* — so it is a negotiation and not an
 * order, and it gets its own envelope when that is built.
 */
export type Order =
  // What is being built, and where
  | { kind: 'build'; facilityId: string; item: BuildItem; destinationId?: string }
  | { kind: 'raiseWorks'; systemId: string; type: FacilityType }
  | { kind: 'cancelBuild'; facilityId: string }
  | { kind: 'clearForest'; systemId: string }
  | { kind: 'scrap'; what: ScrapTarget }
  // Ships and the sea
  | { kind: 'sail'; fleetId: string; targetSystemId: string }
  | { kind: 'detach'; fleetId: string; shipIds: string[]; into?: string }
  | { kind: 'embark'; fleetId: string; companies: number }
  | { kind: 'bombard'; fleetId: string }
  | { kind: 'ceaseFire'; fleetId: string }
  | { kind: 'assault'; fleetId: string }
  | { kind: 'flee'; fleetId: string }
  // The action, fought round by round
  | { kind: 'fightRound' }
  | { kind: 'breakOff' }
  | { kind: 'closeBattle' }
  // People
  | { kind: 'sendCrew'; characterId: string; targetSystemId: string; type?: MissionType; companionIds?: string[]; fleetId?: string }
  | { kind: 'relieve'; characterId: string }
  | { kind: 'resolveMission'; characterId: string; choice: 'continue' | 'return' }
  // The orderings a player has arranged by hand, which are theirs and shared
  | { kind: 'reorderShips'; fleetId: string; shipIds: string[]; dir: -1 | 1 }
  | { kind: 'reorderOfficers'; fleetId: string; characterIds: string[]; dir: -1 | 1 }
  | { kind: 'reorderCrew'; characterIds: string[]; dir: -1 | 1 }
  | { kind: 'reorderGarrison'; systemId: string; typeIds: string[]; dir: -1 | 1 };

/** Which command each envelope opens into. One line each, and no cleverness. */
function dispatch(state: GameState, order: Order): CommandResult {
  switch (order.kind) {
    case 'build':
      return orderBuild(state, order.facilityId, order.item, order.destinationId);
    case 'raiseWorks':
      return orderRaiseWorks(state, order.systemId, order.type);
    case 'cancelBuild':
      return cancelOrder(state, order.facilityId);
    case 'clearForest':
      return orderClearForest(state, order.systemId);
    case 'scrap':
      return orderScrap(state, order.what);
    case 'sail':
      return orderSail(state, order.fleetId, order.targetSystemId);
    case 'detach':
      return orderDetach(state, order.fleetId, order.shipIds, order.into);
    case 'embark':
      return orderEmbark(state, order.fleetId, order.companies);
    case 'bombard':
      return orderBombard(state, order.fleetId);
    case 'ceaseFire':
      return orderCeaseFire(state, order.fleetId);
    case 'assault':
      return orderAssault(state, order.fleetId);
    case 'flee':
      return orderFlee(state, order.fleetId);
    case 'fightRound':
      return orderFightRound(state);
    case 'breakOff':
      return orderBreakOff(state);
    case 'closeBattle':
      return orderCloseBattle(state);
    case 'sendCrew':
      return sendCrew(
        state,
        order.characterId,
        order.targetSystemId,
        order.type,
        order.companionIds ?? [],
        order.fleetId,
      );
    case 'relieve':
      return orderRelieve(state, order.characterId);
    case 'resolveMission':
      return resolvePendingMission(state, order.characterId, order.choice);
    case 'reorderShips':
      return reorderShips(state, order.fleetId, order.shipIds, order.dir);
    case 'reorderOfficers':
      return reorderOfficers(state, order.fleetId, order.characterIds, order.dir);
    case 'reorderCrew':
      return reorderCrew(state, order.characterIds, order.dir);
    case 'reorderGarrison':
      return reorderGarrison(state, order.systemId, order.typeIds, order.dir);
  }
}

/**
 * Carry out an order on behalf of a side, whichever side this screen is on.
 *
 * The whole of the PvP problem in one function. Every command in `commands.ts`
 * reads `state.player` to mean *the side giving this order* — `clearForest(draft,
 * systemId, draft.player)` — and that was the same thing as the seat for as
 * long as one side could be human. It is not the same thing now: an order
 * arriving from the other player has to be carried out as **theirs**, on a
 * client sitting in a different chair.
 *
 * So the seat is lent to the order for exactly as long as the order takes, and
 * then taken back. Not a trick played on the commands — it is the meaning they
 * already had, finally given the right value: inside an order, `player` is who
 * is giving it. Everywhere else it stays this client's chair, which is what
 * `stateHash` leaves out and what the feed and the fleet panels read.
 *
 * Three things it does **not** do, on purpose:
 *
 * - **It does not check whose turn it is.** There are no turns; both players
 *   act whenever they like. What it does guarantee is that an order is carried
 *   out as its author and not as its recipient.
 * - **It does not decide whether the order is allowed.** That is the command's
 *   own business and it already does it, returning an `error` and the untouched
 *   state. A refusal is deterministic, so both clients refuse the same thing
 *   for the same reason and stay in step — which is why a refused order must
 *   still be sent rather than dropped by the client that issued it.
 * - **It does not advance the clock.** A day is its own event in the sequence.
 */
export function applyOrder(
  state: GameState,
  order: Order,
  by: PlayableFaction,
): CommandResult {
  const seat = state.player;
  if (by === seat) return dispatch(state, order);
  const lent = { ...state, player: by };
  const result = dispatch(lent, order);
  // `run` hands back the state it was given when it refuses, so the error path
  // must put the chair back too or a refused order would quietly reseat the
  // player.
  return { ...result, state: { ...result.state, player: seat } };
}

/**
 * An order with everything needed to apply it in the same place twice.
 *
 * `by` because a command is carried out as its author. `seq` because two
 * clients have to agree what order things happened in, and with two players
 * and no referee the only way to agree is for one of them to number them: the
 * side that opened the game stamps every order and every day, and both sides
 * apply them in that order. `day` is not what decides the sequence — it is
 * carried so a replay reads like a war rather than a list, and so a desync can
 * be reported as *"day 214"* rather than *"event 1,882"*.
 */
export interface Dispatch {
  seq: number;
  day: number;
  by: PlayableFaction;
  order: Order;
}

/**
 * Apply a numbered run of orders, in their numbers, and say what was refused.
 *
 * The errors are returned rather than thrown because a refusal is a normal
 * event in a war that is still in step: an order to sail a fleet that sank
 * while the order was in flight is refused on both clients, identically, and
 * the war carries on. What it must never do is skip one silently.
 */
export function applyAll(
  state: GameState,
  run: Dispatch[],
): { state: GameState; refused: Array<{ seq: number; error: string }> } {
  const refused: Array<{ seq: number; error: string }> = [];
  let next = state;
  for (const { seq, by, order } of [...run].sort((a, b) => a.seq - b.seq)) {
    const result = applyOrder(next, order, by);
    if (result.error) refused.push({ seq, error: result.error });
    next = result.state;
  }
  return { state: next, refused };
}
