import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { createRng } from '../rng';
import { addShip, assault, assaultError } from '../fleets';
import { isNotable } from '../../ui/EventCard';
import { getSystem } from '../helpers';
import type { Character } from '../types';

/**
 * Nobody is carried off quietly.
 *
 * Sean's dev report: *"Losing an officer is a real setback and currently has
 * no surfaced notification."* The fix marked two of the five paths a person
 * can change hands by, and the playtest that followed said it *"wasn't
 * addressed"* — the abduction errand was, and these were not: taken when an
 * island is stormed, taken up when a side has no harbor left, and freed by a
 * landing.
 *
 * So the test is over the rule rather than over a path: sweep whole wars, and
 * assert that every event which moves somebody into or out of a cell raises a
 * card. A sixth path added later is caught by the same sweep.
 */
/**
 * Every `pushEvent` the simulation makes, as source text.
 *
 * A war sweep was tried first and is not in the suite, because it proved
 * nothing: three 600-day wars with both sides machine-played produced **zero**
 * captures between them, so the net caught nothing and would have gone on
 * catching nothing after a regression. (Worth knowing separately — the
 * opponent does carry people off when a human is playing, because a human
 * leaves officers standing about on islands and the machine does not.)
 *
 * So the rule is checked where the rule lives. Read the sim's own source,
 * find every pushEvent whose prose is about somebody changing hands, and
 * require `notable: true` in the same call. A sixth path written next month is
 * caught by this without anybody remembering to add it.
 */
const SIM_SOURCE = import.meta.glob('../*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** The prose of somebody going into, or coming out of, a cell. */
const CAPTURE = /was taken on|taken off the quay|is taken up on|out of the cells/;

/** Every pushEvent call in the sim, whole, by brace matching from its paren. */
function pushEventCalls(source: string): string[] {
  const out: string[] = [];
  const marker = 'pushEvent(';
  for (let at = source.indexOf(marker); at !== -1; at = source.indexOf(marker, at + 1)) {
    let depth = 0;
    for (let i = at + marker.length - 1; i < source.length; i++) {
      if (source[i] === '(') depth += 1;
      else if (source[i] === ')') {
        depth -= 1;
        if (depth === 0) {
          out.push(source.slice(at, i + 1));
          break;
        }
      }
    }
  }
  return out;
}

describe('every path a person changes hands by raises a card', () => {
  it('marks notable on all of them, in the source itself', () => {
    const missed: string[] = [];
    let found = 0;
    for (const [file, source] of Object.entries(SIM_SOURCE)) {
      for (const call of pushEventCalls(source)) {
        if (!CAPTURE.test(call)) continue;
        found += 1;
        if (!/notable:\s*true/.test(call)) {
          missed.push(`${file}: ${call.replace(/\s+/g, ' ').slice(0, 110)}`);
        }
      }
    }
    // Five today: the abduction errand, an errand foiled, an island stormed,
    // a side with no harbor left, and a rescue by landing.
    expect(found).toBeGreaterThanOrEqual(5);
    expect(missed).toEqual([]);
  });

  it('is a test that can fail: the same sweep without the flag finds them all', () => {
    // Non-vacuity, inline. Strip the flag out of the text and every capture
    // call should be reported, or the matcher above is matching nothing.
    let wouldMiss = 0;
    for (const source of Object.values(SIM_SOURCE)) {
      for (const call of pushEventCalls(source)) {
        if (CAPTURE.test(call) && !/notable:\s*true/.test(call.replace(/notable:\s*true/g, ''))) {
          wouldMiss += 1;
        }
      }
    }
    expect(wouldMiss).toBeGreaterThanOrEqual(5);
  });
});

describe('a capture is never silent', () => {
  it('cards the one taken when an island is stormed', () => {
    const state = generateGalaxy(7, 'alliance');
    state.fleets.length = 0;
    const island = state.systems.find(
      (s) => s.control === 'empire' && s.populated && s.id !== state.factions.empire.hqSystemId,
    )!;
    island.explored.alliance = true;
    island.facilities = island.facilities.filter((f) => f.type !== 'fort');
    island.garrison = 0;
    // One of theirs standing on it, with nothing to do and nowhere to hide.
    const mark = state.characters.find((c) => c.faction === 'empire')!;
    mark.locationSystemId = island.id;
    mark.mission = undefined;
    mark.status = 'available';

    const fleet = addShip(state, island, 'alliance', 'reefwarden');
    fleet.voyage = undefined;
    fleet.troops = 3;
    expect(assaultError(state, fleet.id, 'alliance')).toBeNull();
    assault(state, fleet.id, createRng(5), 'alliance');

    const taken = state.events.find((e) => e.text.includes(`${mark.name} was taken on`));
    expect(taken).toBeDefined();
    expect(isNotable(taken!)).toBe(true);
  });

  it('cards the one let out of the cells by a landing', () => {
    const state = generateGalaxy(7, 'alliance');
    state.fleets.length = 0;
    const gaol = state.systems.find(
      (s) => s.control === 'empire' && s.populated && s.id !== state.factions.empire.hqSystemId,
    )!;
    gaol.explored.alliance = true;
    gaol.facilities = gaol.facilities.filter((f) => f.type !== 'fort');
    gaol.garrison = 0;
    const prisoner: Character = state.characters.find((c) => c.faction === 'alliance')!;
    prisoner.status = 'captured';
    prisoner.locationSystemId = gaol.id;

    const fleet = addShip(state, gaol, 'alliance', 'reefwarden');
    fleet.voyage = undefined;
    fleet.troops = 3;
    assault(state, fleet.id, createRng(5), 'alliance');

    const freed = state.events.find((e) => e.text.includes('out of the cells'));
    expect(freed).toBeDefined();
    expect(isNotable(freed!)).toBe(true);
    expect(getSystem(state, gaol.id).control).toBe('alliance');
  });
});
