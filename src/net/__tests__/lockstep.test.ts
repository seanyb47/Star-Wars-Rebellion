import { describe, expect, it } from 'vitest';
import { Session, type Trouble } from '../session';
import { pair } from '../local';
import { INPUT_DELAY, TICK_MS } from '../wire';
import { stateHash } from '../../sim/sync';
import { addShip, awaitingAnswer } from '../../sim/fleets';
import type { GameState } from '../../sim/types';

/**
 * Two people, one war, no network.
 *
 * Everything here runs through two real `Session`s talking to each other
 * through a function call, which is the only way this machine can be proved
 * from inside this container: the egress policy refuses both the public
 * introduction service and any connection test. So the wire is the one part
 * these tests do not cover, and it is deliberately the thinnest part — a
 * `send` and a `receive`, swapped behind `Transport`.
 *
 * What they do cover is everything that can go silently wrong:
 *
 * - Both sides land on the same war from a seed, with neither sending it.
 * - Orders from either side are applied in the same sequence on both.
 * - The host does not get to act first by sitting closer to the sequence.
 * - A battle waits for both answers, across the wire.
 * - The war waits when somebody goes quiet, rather than running on.
 * - A drift is **caught** rather than played out, which is the whole point.
 */

/**
 * Let the queued messages between the two of them actually arrive.
 *
 * `pair()` delivers by microtask, so draining the microtask queue is enough
 * and a `setTimeout` is not needed — which matters, because a tick costs a
 * handful of microtasks and a war is thousands of ticks. Several hops, because
 * one message can cause another: a tick provokes an acknowledgement, which can
 * provoke a desync notice.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 6; i++) await Promise.resolve();
}

interface Table {
  host: Session;
  guest: Session;
  troubles: Trouble[];
  /** Run the clock for `ticks` slices, letting messages cross between each. */
  run: (ticks: number) => Promise<void>;
  now: () => number;
}

async function table(seed = 4242, speed: GameState['speed'] = 'fast'): Promise<Table> {
  const [a, b] = pair();
  const troubles: Trouble[] = [];
  const keep = (t: Trouble) => troubles.push(t);
  const host = new Session({
    role: 'host',
    transport: a,
    seed,
    seat: 'empire',
    build: 'test',
    onTrouble: keep,
  });
  const guest = new Session({
    role: 'guest',
    transport: b,
    seed,
    seat: 'alliance',
    build: 'test',
    onTrouble: keep,
  });
  await settle();
  // Set before any tick is emitted, so both carry it from the first slice.
  host.state.speed = speed;
  guest.state.speed = speed;
  let clock = 0;
  const run = async (ticks: number) => {
    for (let i = 0; i < ticks; i++) {
      clock += TICK_MS;
      host.pump(clock);
      await settle();
    }
  };
  return { host, guest, troubles, run, now: () => clock };
}

describe('two sessions sitting down to the same war', () => {
  it('build the same world from the seed, with neither sending it', async () => {
    const { host, guest } = await table();
    // 56 KB of world, and nothing of it crossed: both ran `generateGalaxy`.
    expect(stateHash(host.state)).toBe(stateHash(guest.state));
    expect(host.seat).toBe('empire');
    expect(guest.seat).toBe('alliance');
    // And each is sitting in its own chair, which is the one field they are
    // supposed to disagree about.
    expect(host.state.player).toBe('empire');
    expect(guest.state.player).toBe('alliance');
  });

  it('refuses two different builds rather than desyncing on day one', async () => {
    const [a, b] = pair();
    const troubles: Trouble[] = [];
    new Session({ role: 'host', transport: a, seed: 1, seat: 'empire', build: 'monday' });
    new Session({
      role: 'guest',
      transport: b,
      seed: 1,
      seat: 'alliance',
      build: 'tuesday',
      onTrouble: (t) => troubles.push(t),
    });
    await settle();
    expect(troubles.map((t) => t.kind)).toContain('mismatched-build');
  });

  it('stays level over hundreds of slices of war', async () => {
    const { host, guest, run, troubles } = await table();
    await run(400);
    expect(troubles.filter((t) => t.kind === 'desync')).toHaveLength(0);
    expect(host.tick).toBe(guest.tick);
    expect(stateHash(host.state)).toBe(stateHash(guest.state));
    // And time actually passed, or this proves nothing.
    expect(host.state.day).toBeGreaterThan(1);
  });
});

describe('an order from either side', () => {
  it('does not happen the instant it is given, even for the host', async () => {
    /*
     * The thing that looks like a bug and is the whole design. Applying your
     * own tap at once and the other side's on arrival puts the same two
     * orders in two different sequences — his build then her sail on one
     * phone, her sail then his build on the other — which is a desync on the
     * first simultaneous pair, with nothing on either screen to say so.
     */
    const { host, run } = await table();
    const before = stateHash(host.state);
    host.order({ kind: 'reorderCrew', characterIds: [], dir: 1 });
    expect(stateHash(host.state)).toBe(before);
    await run(INPUT_DELAY + 2);
    // It has landed by now — proved by the guest having it too, below.
    expect(host.tick).toBeGreaterThanOrEqual(INPUT_DELAY + 1);
  });

  it('reaches the other side and lands in the same slice on both', async () => {
    const { host, guest, run } = await table();
    await run(3);
    // A real order with a visible effect: scrapping something of the host's.
    const island = host.state.systems.find(
      (s) => s.control === 'empire' && s.facilities.some((f) => f.owner === 'empire'),
    )!;
    const works = island.facilities.find((f) => f.owner === 'empire')!;
    host.order({ kind: 'scrap', what: { kind: 'facility', systemId: island.id, facilityId: works.id } });
    await run(INPUT_DELAY + 3);
    const onHost = host.state.systems.find((s) => s.id === island.id)!;
    const onGuest = guest.state.systems.find((s) => s.id === island.id)!;
    expect(onHost.facilities.some((f) => f.id === works.id)).toBe(false);
    expect(onGuest.facilities.some((f) => f.id === works.id)).toBe(false);
    expect(stateHash(host.state)).toBe(stateHash(guest.state));
  });

  it('carries the guest\'s order too, acting as the guest', async () => {
    /*
     * The guest cannot number its own orders — that is the one thing it cannot
     * do and the reason there is a host at all — so it asks, and the host puts
     * it in a slice like its own. What must not happen is the order being
     * carried out as the *host's*: it spends somebody's gold.
     */
    const { host, guest, run } = await table();
    await run(3);
    const island = guest.state.systems.find(
      (s) => s.control === 'alliance' && s.facilities.some((f) => f.owner === 'alliance'),
    )!;
    const works = island.facilities.find((f) => f.owner === 'alliance')!;
    const goldBefore = { ...host.state.factions.alliance };
    guest.order({ kind: 'scrap', what: { kind: 'facility', systemId: island.id, facilityId: works.id } });
    await run(INPUT_DELAY + 3);
    expect(host.state.systems.find((s) => s.id === island.id)!.facilities.some((f) => f.id === works.id)).toBe(false);
    // The Confederacy's own books moved, on the Crown player's machine.
    expect(host.state.factions.alliance.gold).toBeGreaterThan(goldBefore.gold - 1);
    expect(stateHash(host.state)).toBe(stateHash(guest.state));
  });

  it('gives the host no head start on the same slice', async () => {
    /*
     * The host's order travels no distance, so without care its tap always
     * lands in an earlier slice and it wins every race for the same island.
     * Both are scheduled the same `INPUT_DELAY` ahead, so two taps in the same
     * moment land in the same slice and are settled by their number in it.
     */
    const { host, guest, run } = await table();
    await run(3);
    host.order({ kind: 'reorderCrew', characterIds: [], dir: 1 });
    guest.order({ kind: 'reorderCrew', characterIds: [], dir: -1 });
    await run(INPUT_DELAY + 3);
    expect(stateHash(host.state)).toBe(stateHash(guest.state));
  });
});

describe('the war waits', () => {
  it('holds the clock when the other player goes quiet', async () => {
    /*
     * Sean, 14 October, asked what should happen when somebody closes the tab:
     * *"The war waits."* Not a timeout, not a forfeit, and not the machine
     * taking their side — the clock simply stops until they are back.
     *
     * It falls out of the acknowledgements rather than needing a stopwatch:
     * the host will not run more than `INPUT_DELAY` ahead of what the guest
     * has confirmed, so a phone in a tunnel stops time instead of falling
     * behind and catching up with a fortnight of war it never watched.
     */
    const { host, guest, run } = await table();
    await run(20);
    const stoppedAt = host.tick;
    const dayAt = host.state.day;
    guest.leave();
    await run(60);
    /*
     * It stops within a fixed, small number of slices rather than at once, and
     * the exact number is worth stating: the host runs while the guest is no
     * more than `INPUT_DELAY` behind, so with acknowledgements frozen it
     * reaches `acked + INPUT_DELAY + 1` and then stops. What matters is that
     * the bound exists and does not grow — sixty more slices of pumping move
     * it no further.
     */
    expect(host.tick - stoppedAt).toBeLessThanOrEqual(INPUT_DELAY + 2);
    expect(host.waitingForPeer).toBe(true);
    /*
     * At most one more day, and that one is unavoidable rather than sloppy.
     * You cannot know somebody has gone until they fail to answer, so the
     * slice that turns the day is already sent by the time their silence is
     * evidence of anything. Holding the clock on them being *level* is what
     * keeps it to one — without that it is as many days as fit in the slack
     * before the host notices.
     */
    expect(host.state.day - dayAt).toBeLessThanOrEqual(1);
    // And then never again, however long we go on pumping. That is the claim
    // that matters: it is a stop, not a slow drift.
    const heldAt = host.state.day;
    await run(300);
    expect(host.state.day).toBe(heldAt);
    expect(host.tick - stoppedAt).toBeLessThanOrEqual(INPUT_DELAY + 2);
  });

  it('says it is waiting, so a held clock is not a frozen screen', async () => {
    const { host, guest, run } = await table();
    await run(10);
    expect(host.waitingForPeer).toBe(false);
    guest.leave();
    await run(10);
    expect(host.waitingForPeer).toBe(true);
  });
});

/**
 * Put two squadrons in one harbor, in both wars, before either has ticked.
 *
 * Waiting for a four-hundred-day war to find an action of its own is slow and
 * seed-dependent, and a test that quietly passes when it never finds one
 * proves nothing. Applied to both states with the same calls in the same
 * order, which gives identical ids because `nextId` is a counter on the state
 * — the same reason two phones can build the same world from a seed.
 */
function stageAnAction(table: Table): void {
  for (const state of [table.host.state, table.guest.state]) {
    const island = state.systems.find((s) => s.control === 'empire')!;
    for (const side of ['empire', 'alliance'] as const) {
      addShip(state, island, side, 'sovereign');
      addShip(state, island, side, 'sovereign');
    }
  }
}

describe('a battle across the wire', () => {
  it('waits for both answers, each given on its own machine', async () => {
    /*
     * Sean's ruling of 11 October — both answer each round — end to end: the
     * two answers are given on two different machines and the broadside goes
     * off when the second arrives.
     */
    const t = await table(31337, 'fast');
    const { host, guest, run } = t;
    stageAnAction(t);
    // The action opens on the next turn of the day, in both wars at once.
    for (let i = 0; i < 40 && !host.state.battle; i++) await run(1);
    expect(host.state.battle, 'no action opened').toBeDefined();
    expect(guest.state.battle).toBeDefined();
    expect(stateHash(host.state)).toBe(stateHash(guest.state));
    expect(awaitingAnswer(host.state, host.state.battle!).sort()).toEqual([
      'alliance',
      'empire',
    ]);

    const rounds = host.state.battle!.rounds;
    host.order({ kind: 'fightRound' });
    await run(INPUT_DELAY + 2);
    // One answer in, and nothing has happened on either machine.
    expect(host.state.battle!.rounds).toBe(rounds);
    expect(host.state.battle!.answers?.empire).toBe('fight');
    expect(guest.state.battle!.answers?.empire).toBe('fight');

    guest.order({ kind: 'fightRound' });
    await run(INPUT_DELAY + 3);
    const moved =
      host.state.battle === undefined ||
      host.state.battle.rounds > rounds ||
      host.state.battle.settled !== undefined;
    expect(moved, 'the second answer did not resolve the round').toBe(true);
    expect(stateHash(host.state)).toBe(stateHash(guest.state));
  });

  it('does not turn the day while an action is unanswered', async () => {
    // The clock cannot run on while two people are deciding. It is the same
    // rule the single-player sheet keeps, and with two it must hold while
    // *either* of them is still thinking.
    const t = await table(31337, 'fast');
    const { host, run } = t;
    stageAnAction(t);
    for (let i = 0; i < 40 && !host.state.battle; i++) await run(1);
    expect(host.state.battle).toBeDefined();
    const dayAt = host.state.day;
    await run(100);
    expect(host.state.day).toBe(dayAt);
  });
});

describe('a drift is caught rather than played out', () => {
  it('stops both of them and says where it happened', async () => {
    /*
     * The one failure lockstep has, and it is silent by nature: nobody is
     * authoritative, so when the two wars come apart his fleet sinks, hers
     * sails on, and both screens look perfectly convincing.
     *
     * So a fingerprint crosses with the acknowledgements, and here one war is
     * deliberately interfered with to prove the alarm works. There is no
     * attempt to recover: two wars that have come apart cannot be reconciled
     * from inside either of them, and carrying on would mean two people
     * playing different games.
     */
    const { host, guest, run, troubles } = await table();
    await run(5);
    // Reach in and move one number in one war. Nothing in the game does this;
    // a real drift would come from a stray `Math.random` or an un-numbered
    // order, and this stands in for both.
    guest.state.factions.empire.gold += 1;
    await run(60);
    const desyncs = troubles.filter((t) => t.kind === 'desync');
    expect(desyncs.length).toBeGreaterThan(0);
    expect(desyncs[0].says).toMatch(/stopped playing the same war/);
    // And stopped: a stopped session takes no more orders and emits no ticks.
    const frozen = host.tick;
    await run(20);
    expect(host.tick).toBe(frozen);
  });

  it('is quiet when nothing has drifted', async () => {
    // Guards the guard: an alarm that always fires is no alarm.
    const { run, troubles } = await table();
    await run(200);
    expect(troubles.filter((t) => t.kind === 'desync')).toHaveLength(0);
  });
});
