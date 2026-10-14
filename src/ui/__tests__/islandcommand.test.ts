import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../../sim/galaxy';
import { assaultError, bombardError, fleetsAt } from '../../sim';

/**
 * The island's first viewport, and the two orders on it.
 *
 * Sean's island-command brief, 24 September: the first screen has to answer
 * who holds the island, how it leans, what I have here, what is known ashore,
 * and which orders I can give — *"without hunting through the harbor"*. The
 * last three were all true of this sheet already and all three were **two taps
 * down**, inside a fleet card inside the Harbor tab, under a heading called
 * *Attack actions*. A player looking at an enemy island had to open a ship to
 * find out whether they could land on it.
 *
 * What these guard is the thing the brief warns about twice — *"The tabs and
 * attack orders must not become disconnected copies of the existing UI"* and
 * *"Never silently introduce a new mechanic."* The block is a second door onto
 * the same rules, not a second set of them.
 */
const SRC = (
  import.meta.glob('../IslandCommand.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../IslandCommand.tsx'];

const SIM = (
  import.meta.glob('../../sim/fleets.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../../sim/fleets.ts'];

const SHEET = (
  import.meta.glob('../SystemSheet.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../SystemSheet.tsx'];

describe('the orders on the island panel', () => {
  it('asks the sim whether an order is legal rather than deciding for itself', () => {
    expect(SRC).toMatch(/bombardError\(state, f\.id, state\.player\)/);
    expect(SRC).toMatch(/assaultError\(state, f\.id, state\.player\)/);
  });

  it('calls the same handlers the fleet card calls', () => {
    // One set of rules, two doors onto it. A second implementation of "can I
    // land here" is how the two drift apart.
    expect(SRC).toMatch(/onBombard\?\.\(id\)/);
    expect(SRC).toMatch(/onAssault\(id\)/);
  });

  it('shows the odds the sim computes, not its own', () => {
    expect(SRC).toMatch(/bombardOdds\(state, /);
  });

  it('is on the island panel above the tabs', () => {
    const command = SHEET.indexOf('<IslandCommand');
    const tabs = SHEET.indexOf('data-tour="island-tabs"');
    expect(command).toBeGreaterThan(0);
    expect(tabs).toBeGreaterThan(command);
  });
});

describe('the mechanics the prototype implied and the game does not have', () => {
  it('offers no stepper for a partial landing, because a landing takes the hold', () => {
    /*
     * The brief: *"Invasion review should allow selecting how many troops to
     * land only if the existing game rules actually support partial
     * deployment. If the game always commits all available troops, replace the
     * stepper with a read-only committed force summary."*
     *
     * `assault(state, fleetId, rng, actor)` takes no count and calls
     * `resolveLanding` with the whole squadron, so there is nothing to step.
     */
    // Asserted against the sim, not against the word: matching on "stepper"
    // caught the comment that explains why there is no stepper, which would
    // make the note un-writable. `assault` is the guarantee — it takes a
    // fleet and a roller and no count at all.
    expect(SIM).toMatch(
      /export function assault\(\s*state: GameState,\s*fleetId: string,\s*rng: Rng,\s*actor: PlayableFaction,\s*\): void/,
    );
    expect(SRC).not.toMatch(/setLanding|landingCount|useState<number>/);
    expect(SRC).toMatch(/a landing commits the hold/);
  });

  it('offers no bombardment target, because Sean cut targeting', () => {
    // *"Bombardment review should expose target selection only if already
    // supported."* It is not: `bombardNow` sends shot at the walls while any
    // stand and can only reach the garrison when none do.
    expect(SRC).not.toMatch(/targetSelect|chooseTarget|pickTarget/i);
    expect(SRC).toMatch(/Shot goes at the walls while any stand/);
  });
});

describe('what the panel says it knows', () => {
  it('tells an uncounted garrison apart from an empty one', () => {
    // The two things a landing must never confuse. Without a report the card
    // says so rather than reading "3 against 0".
    expect(SRC).toMatch(/Not counted/);
    expect(SRC).toMatch(/nobody has counted what is ashore/);
  });

  it('says out loud why an order is shut', () => {
    // *"Do not place strategic consequences or failure reasons solely in muted
    // tiny text. Make disabled action reasons explicit."*
    expect(SRC).toMatch(/command__why/);
    expect(SRC).toMatch(/No bombardment\./);
    expect(SRC).toMatch(/No landing\./);
  });
});

describe('the rules behind the two orders, unchanged', () => {
  it('still refuses a landing with nothing aboard', () => {
    const state = generateGalaxy(11, 'empire');
    const theirs = state.systems.find((s) => s.control === 'alliance')!;
    const fleet = state.fleets.find((f) => f.faction === 'empire')!;
    fleet.systemId = theirs.id;
    fleet.voyage = undefined;
    fleet.troops = 0;
    for (const f of state.fleets) {
      if (f.faction === 'alliance' && f.systemId === theirs.id) f.systemId = 'elsewhere';
    }
    expect(assaultError(state, fleet.id, 'empire')).toBe('No troops aboard.');
  });

  it('still refuses both orders on an island of your own', () => {
    const state = generateGalaxy(11, 'empire');
    const mine = state.systems.find((s) => s.control === 'empire')!;
    const fleet = fleetsAt(state, mine.id).find((f) => f.faction === 'empire');
    if (!fleet) return;
    fleet.troops = 2;
    expect(assaultError(state, fleet.id, 'empire')).toBe('The island is already yours.');
    expect(bombardError(state, fleet.id, 'empire')).toBeTruthy();
  });
});

describe('one scroll, and the art goes with it', () => {
  it('puts the island panel in flow rather than pinning the painting', () => {
    /*
     * Reverses a deliberate earlier decision, and the brief is the newer one:
     * *"it scrolls away naturally with the rest of the content. Do not pin the
     * image while the user scrolls"* and *"one natural vertical scroll; avoid
     * nested vertical scroll containers."* `flow` is the mode the encyclopedia
     * already used for exactly this, and its compact bar answers the objection
     * the pinning existed for.
     */
    expect(SHEET).toMatch(/^\s+flow$/m);
    // And the banner and tabs are no longer handed to the Sheet as pinned
    // slots — they are in the column with everything else.
    expect(SHEET).not.toMatch(/banner=\{\s*\/\* The island itself/);
  });
});
