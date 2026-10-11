import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { advanceDay } from '../advanceDay';
import { applyAll, applyOrder, type Dispatch, type Order } from '../orders';
import { stateHash } from '../sync';
import { otherFaction } from '../helpers';
import type { GameState, PlayableFaction } from '../types';

/**
 * Orders as data, and the two properties that make lockstep work.
 *
 * `orders.ts` turns `orderSail(state, 'flt-3', 'sys-9')` — a call that happens
 * in one browser — into `{ kind: 'sail', fleetId: 'flt-3', targetSystemId:
 * 'sys-9' }`, a sentence either browser can read. Everything about two-player
 * play rests on two things being true of that:
 *
 * 1. **Every order has an envelope.** One that does not would apply on the
 *    client that issued it and never reach the other, which is a desync with
 *    no symptom until somebody's fleet is somewhere it cannot be.
 * 2. **An order is carried out as its author**, not as whoever is holding the
 *    phone. Commands read `state.player` to mean *the side giving this order*,
 *    which was the seat for as long as one side could be human.
 */

const SEED = 4242;

/** A war a few days in, so there is something to give orders about. */
function war(seat: PlayableFaction, days = 3): GameState {
  let state = generateGalaxy(SEED, seat);
  state.human = ['empire', 'alliance'];
  for (let d = 0; d < days; d++) state = advanceDay(state);
  return state;
}

describe('every command can be sent', () => {
  it('has an envelope for each one, and names the three that are not orders', () => {
    /*
     * Read off `commands.ts` rather than listed here, because a list here
     * would be the thing that goes stale. The failure this prevents is the
     * quiet one: somebody adds `orderScuttle` next month, wires it to a
     * button, and it works perfectly in single player while silently never
     * reaching the other player in PvP.
     *
     * The three exceptions are stated in the test so that adding a fourth has
     * to be a decision somebody writes down. `newGame` is what a war starts
     * from and both clients get the same seed. `setObserving` hands your own
     * side to the machine, which is not something you can do to somebody
     * else's. `setSpeed` is shared and is the one case Sean has already ruled
     * on — *"the other player gets a popup… they can accept or decline"* —
     * so it is a negotiation, and a negotiation is not an order.
     */
    const NOT_ORDERS = ['newGame', 'setObserving', 'setSpeed'];
    const commandSrc = Object.values(
      import.meta.glob('../commands.ts', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
    )[0];
    const ordersSrc = Object.values(
      import.meta.glob('../orders.ts', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
    )[0];

    const commands = [...commandSrc.matchAll(/^export function (\w+)\(/gm)]
      .map((m) => m[1])
      .filter((name) => !NOT_ORDERS.includes(name));
    expect(commands.length).toBeGreaterThan(20);

    // Every command has to be called from the dispatcher by name. That is a
    // stronger check than counting envelopes: a `kind` that exists but opens
    // into the wrong command would pass a count and fail this.
    for (const name of commands) {
      expect(
        new RegExp(`\\b${name}\\(`).test(ordersSrc),
        `commands.ts exports ${name} and orders.ts never calls it, so it cannot reach the other player`,
      ).toBe(true);
    }
  });

  it('survives being written down and read back', () => {
    // It has to go over a wire, so it has to be JSON. Nothing clever here;
    // this fails the day somebody puts a function or a Map in an envelope.
    const orders: Order[] = [
      { kind: 'sail', fleetId: 'flt-1', targetSystemId: 'sys-9' },
      { kind: 'build', facilityId: 'fac-2', item: 'shipyard' },
      { kind: 'sendCrew', characterId: 'chr-3', targetSystemId: 'sys-4', companionIds: ['chr-5'] },
      { kind: 'fightRound' },
    ];
    for (const order of orders) {
      expect(JSON.parse(JSON.stringify(order))).toEqual(order);
    }
  });
});

describe('an order is carried out as whoever gave it', () => {
  it('leaves the seat where it found it', () => {
    // The chair is lent to the order and taken back. If it were not, the next
    // thing this client drew would be the other player's war.
    const state = war('empire');
    const theirs = otherFaction(state.player);
    const result = applyOrder(state, { kind: 'relieve', characterId: 'nobody' }, theirs);
    expect(result.state.player).toBe('empire');
  });

  it('leaves the seat where it found it even when the order is refused', () => {
    // `run` hands back the state it was given on a refusal, so the error path
    // is the one that would quietly reseat the player.
    const state = war('empire');
    const result = applyOrder(
      state,
      { kind: 'sail', fleetId: 'no-such-fleet', targetSystemId: 'nowhere' },
      otherFaction(state.player),
    );
    expect(result.error).toBeTruthy();
    expect(result.state.player).toBe('empire');
  });

  it('acts for the author and not for the holder of the phone', () => {
    /*
     * The property stated as plainly as it can be. The same order, given by
     * the Confederacy, must do the same thing whether it is being applied on
     * the Confederate player's client or relayed onto the Crown player's.
     *
     * A build is the clearest case: it spends *somebody's* gold, and under the
     * old reading — commands acting as `state.player` — a Confederate order
     * replayed on the Crown's client would have spent the Crown's.
     */
    const theirs: PlayableFaction = 'alliance';
    const onTheirScreen = war(theirs);
    const onMyScreen = war(otherFaction(theirs));
    expect(stateHash(onTheirScreen)).toBe(stateHash(onMyScreen));

    // A yard of theirs, found the same way on both clients.
    const yard = onTheirScreen.systems
      .flatMap((s) => s.facilities.map((f) => ({ s, f })))
      .find(({ f }) => f.owner === theirs && f.type === 'shipyard' && !f.building);
    if (!yard) return; // No yard standing in this opening; nothing to prove here.

    const order: Order = { kind: 'build', facilityId: yard.f.id, item: 'majestic' };
    const mine = applyOrder(onMyScreen, order, theirs);
    const theirsApplied = applyOrder(onTheirScreen, order, theirs);
    // Same refusal or same result, and either way the two wars still match.
    expect(mine.error).toBe(theirsApplied.error);
    expect(stateHash(mine.state)).toBe(stateHash(theirsApplied.state));
  });
});

describe('a run of orders', () => {
  it('applies in sequence, whatever order it arrived in', () => {
    /*
     * Packets arrive out of order and two players act at the same moment, so
     * the sequence number is what the two clients agree on rather than the
     * clock or the arrival. Shuffled in, sorted before applying, and the two
     * have to land on the same war.
     */
    const run: Dispatch[] = [
      { seq: 1, day: 3, by: 'empire', order: { kind: 'reorderCrew', characterIds: [], dir: 1 } },
      { seq: 2, day: 3, by: 'alliance', order: { kind: 'reorderCrew', characterIds: [], dir: -1 } },
      { seq: 3, day: 3, by: 'empire', order: { kind: 'relieve', characterId: 'nobody' } },
    ];
    const inOrder = applyAll(war('empire'), run);
    const shuffled = applyAll(war('empire'), [run[2], run[0], run[1]]);
    expect(stateHash(inOrder.state)).toBe(stateHash(shuffled.state));
  });

  it('reports a refusal rather than dropping it', () => {
    /*
     * A refusal is a normal event in a war that is still in step — an order to
     * sail a fleet that sank while the order was in flight is refused on both
     * clients, identically — so a refused order must still be *sent*, and must
     * never be skipped quietly. Silence here is how one client ends up a
     * fleet ahead of the other.
     */
    const run: Dispatch[] = [
      { seq: 1, day: 3, by: 'empire', order: { kind: 'sail', fleetId: 'gone', targetSystemId: 'nowhere' } },
    ];
    const result = applyAll(war('empire'), run);
    expect(result.refused).toHaveLength(1);
    expect(result.refused[0].seq).toBe(1);
  });

  it('refuses the same thing on both clients, which is what keeps them level', () => {
    const run: Dispatch[] = [
      { seq: 1, day: 3, by: 'alliance', order: { kind: 'assault', fleetId: 'gone' } },
      { seq: 2, day: 3, by: 'empire', order: { kind: 'bombard', fleetId: 'also-gone' } },
    ];
    const crown = applyAll(war('empire'), run);
    const confederacy = applyAll(war('alliance'), run);
    expect(crown.refused).toEqual(confederacy.refused);
    expect(stateHash(crown.state)).toBe(stateHash(confederacy.state));
  });
});
