import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../../sim/galaxy';
import { addShip, fleetStatus, sailFleet } from '../../sim';
import type { GameState } from '../../sim';

/**
 * A squadron under way is on the chart, and you can open it.
 *
 * Sean, 24 September: *"When my fleet is en route to an island — friendly
 * neutral or foe — I should see the icon above the island and also be able to
 * click on it and see it."* Two halves, and the game was failing both: the
 * sail above an island drew only for `!f.voyage`, so giving the order took the
 * squadron off the map for a fortnight, and an island with no report has no
 * tabs — so there was nowhere to click through to either.
 *
 * Read as source, because this repo has no React renderer. What can go wrong
 * here is a filter and a gate, and both are visible in the text.
 */
const UI = import.meta.glob(
  '../{ChainMap.tsx,SystemSheet.tsx,ReachSheet.tsx,FleetListSheet.tsx,ProducerLegend.tsx,GalaxyMap.tsx,App.tsx}',
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
) as Record<string, string>;

const CHART = UI['../ChainMap.tsx'];
const SHEET = UI['../SystemSheet.tsx'];
const REACH = UI['../ReachSheet.tsx'];

describe('the sail above the island', () => {
  it('counts a voyage of yours as well as a hull at anchor', () => {
    expect(CHART).toMatch(/voyage\?\.targetSystemId === system\.id/);
    expect(CHART).toMatch(/const sails/);
  });

  it('draws it hollow, so it does not read as arrived', () => {
    expect(CHART).toMatch(/fill=\{underWay \? 'none' :/);
  });

  it('says how many days out, which is the question you ask on seeing it', () => {
    expect(CHART).toMatch(/chainmap__eta/);
    expect(CHART).toMatch(/daysRemaining/);
  });

  it('shows it on an island nobody of yours has ever been ashore on', () => {
    // The moored sails are gated on `explored`; this one must not be — you
    // know where you sent your own ships. Anchorite Rock in Sean's screenshot
    // is exactly that island.
    expect(CHART).toMatch(/\.\.\.\(explored \? moored\.map/);
    expect(CHART).toMatch(/\.\.\.\(inbound\.length > 0 \?/);
  });

  it('never draws the enemy sailing, which is what espionage is for', () => {
    const at = CHART.indexOf('const inbound = state.fleets.filter');
    const clause = CHART.slice(at, at + 200);
    expect(clause).toMatch(/f\.faction === viewer/);
  });

  it('keeps it off the None filter with everything else', () => {
    expect(CHART).toMatch(/\{!bare && sails\.length > 0 && \(/);
  });

  it('names it in the label the screen reader reads', () => {
    expect(CHART).toMatch(/yours \$\{soonest\} days out/);
  });

  it('is explained by the key, as two states of one glyph', () => {
    expect(REACH).toMatch(/<Sail \/> At anchor <Sail underWay \/> under way/);
    // And drawn with the chart's own path, so the key cannot drift from the
    // thing it explains.
    expect(REACH).toMatch(/import \{ ChainMap, SHIP \}/);
    expect(REACH).toMatch(/fill=\{underWay \? 'none' : 'currentColor'\}/);
  });
});

describe('and an island with no tabs can still be opened onto it', () => {
  it('does it on both stub sheets, not only one', () => {
    // There are two screens with no tabs and they are different screens:
    // charted-but-never-visited, and held-against-you-and-never-looked-at.
    // The first pass of this fixed only the second, and the island in the
    // repro turned out to be the first.
    expect(SHEET.match(/<ShipsHere/g)?.length).toBeGreaterThanOrEqual(3);
    // `NoReport` is declared above `SystemSheet`, so this one is found by
    // walking forward from its own copy rather than by bracketing the two.
    const at = SHEET.indexOf('Charted, never explored');
    const unexplored = SHEET.slice(at, at + 1600);
    expect(unexplored).toMatch(/<ShipsHere/);
    expect(unexplored).toMatch(/minesOnly/);
  });

  it('lists your own hulls there', () => {
    const at = SHEET.indexOf('function NoReport');
    const body = SHEET.slice(at, SHEET.indexOf('export function SystemSheet'));
    expect(body).toMatch(/<ShipsHere/);
    expect(body).toMatch(/minesOnly/);
  });

  it('hands over nothing of theirs', () => {
    // `minesOnly` is the whole guard: without it the tab would print an enemy
    // island's live order of battle on a screen whose entire message is that
    // you have not looked.
    const at = SHEET.indexOf('function NoReport');
    const body = SHEET.slice(at, SHEET.indexOf('export function SystemSheet'));
    const call = body.slice(body.indexOf('<ShipsHere'), body.indexOf('/>', body.indexOf('<ShipsHere')));
    expect(call).toContain('minesOnly');
  });
});

describe('the fleets it is about', () => {
  it('has a voyage carrying a target and a countdown', () => {
    // The two fields the chart reads. A rename that missed the chart would
    // otherwise show every fleet as arrived.
    const state: GameState = generateGalaxy(4200);
    const fleet = state.fleets[0];
    fleet.voyage = { targetSystemId: state.systems[0].id, daysRemaining: 9 };
    expect(fleet.voyage.targetSystemId).toBe(state.systems[0].id);
    expect(fleet.voyage.daysRemaining).toBe(9);
  });
});

/**
 * And a list of your own navy, so a fleet is never findable only by memory.
 *
 * Sean, 24 September, on the sail going in: *"Even if it's not there it
 * shouldn't be invisible to me."* The right complaint about a bigger hole than
 * the one just filled — a squadron could be reached by opening the island it
 * lies at or the island it sails for, and **both start from already knowing
 * which island that is.** Nothing in the game listed your fleets.
 */
describe('the list of your fleets', () => {
  const LIST = UI['../FleetListSheet.tsx'];
  const CHIP = UI['../ProducerLegend.tsx'];

  it('is every squadron of yours and nobody else’s', () => {
    expect(LIST).toMatch(/state\.fleets\.filter\(\(f\) => f\.faction === state\.player\)/);
  });

  it('puts the ones under way first, because nothing else can show you those', () => {
    // "Under way", not "At sea", since 24 September — and each row beneath it
    // carries `fleetStatus`, which now names the port and the day she is due.
    const sea = LIST.indexOf('>Under way<');
    const anchor = LIST.indexOf('>At anchor<');
    expect(sea).toBeGreaterThan(0);
    expect(anchor).toBeGreaterThan(sea);
  });

  it('says where each one is or is bound for, and how long', () => {
    // `fleetStatus` is the sim's own sentence, so the list and the island
    // sheet cannot describe the same voyage two different ways.
    expect(LIST).toMatch(/fleetStatus\(state, fleet\)/);
  });

  it('opens the island rather than growing its own orders', () => {
    // Two places to give the same order is how they drift apart.
    expect(LIST).toMatch(/onOpenIsland\(where\(fleet\)\)/);
    expect(LIST).toMatch(/fleet\.voyage\?\.targetSystemId \?\? fleet\.systemId/);
  });

  it('is reachable in one tap from the chart', () => {
    expect(CHIP).toMatch(/onOpenFleets/);
    expect(UI['../GalaxyMap.tsx']).toMatch(/onOpenFleets=\{onOpenFleets\}/);
    expect(UI['../App.tsx']).toMatch(/onOpenFleets=\{\(\) => setFleetsOpen\(true\)\}/);
  });

  it('and the chip says how many are under way, which the chart cannot draw', () => {
    expect(CHIP).toMatch(/under way/);
  });
});

/**
 * A passage is an errand, not a state.
 *
 * Sean, 24 September: *"Dont say at sea. Say 'Making for port, due in X
 * days'."* `At sea for Anchorite Rock — 6d` told you where a squadron was;
 * what a player needs is when she arrives, because that is the fact every
 * decision on the screen turns on. One sentence in the sim, so the fleet
 * list, the island panel and the crew sheet cannot word the same voyage three
 * ways.
 */
describe('what a squadron under way says about herself', () => {
  it('names the port and the day she is due', () => {
    const state = generateGalaxy(11, 'alliance');
    const port = state.systems.find((s) => s.control === 'alliance')!;
    const fleet = addShip(state, port, 'alliance', 'reefwarden');
    const away = state.systems.find((s) => s.sectorId !== port.sectorId)!;
    sailFleet(state, fleet.id, away.id, 'alliance');
    const line = fleetStatus(state, fleet);
    expect(line).toContain(`Making for ${away.name}`);
    expect(line).toMatch(/due in \d+ days?/);
    expect(line).not.toMatch(/at sea/i);
  });

  it('falls back to his own wording for a landfall you cannot see', () => {
    const state = generateGalaxy(11, 'alliance');
    const port = state.systems.find((s) => s.control === 'alliance')!;
    const fleet = addShip(state, port, 'alliance', 'reefwarden');
    const away = state.systems.find((s) => s.sectorId !== port.sectorId)!;
    sailFleet(state, fleet.id, away.id, 'alliance');
    fleet.voyage!.targetSystemId = 'nowhere-at-all';
    expect(fleetStatus(state, fleet)).toMatch(/^Making for port, due in \d+ days?$/);
  });

  it('says one day rather than 1 days', () => {
    const state = generateGalaxy(11, 'alliance');
    const port = state.systems.find((s) => s.control === 'alliance')!;
    const fleet = addShip(state, port, 'alliance', 'reefwarden');
    const away = state.systems.find((s) => s.sectorId !== port.sectorId)!;
    sailFleet(state, fleet.id, away.id, 'alliance');
    fleet.voyage!.daysRemaining = 1;
    expect(fleetStatus(state, fleet)).toContain('due in 1 day');
    expect(fleetStatus(state, fleet)).not.toContain('1 days');
  });

  it('leaves a squadron at anchor alone', () => {
    const state = generateGalaxy(11, 'alliance');
    const port = state.systems.find((s) => s.control === 'alliance')!;
    const fleet = addShip(state, port, 'alliance', 'reefwarden');
    expect(fleetStatus(state, fleet)).toBe('At anchor');
  });
});
