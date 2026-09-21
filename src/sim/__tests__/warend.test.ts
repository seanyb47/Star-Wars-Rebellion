import { describe, expect, it } from 'vitest';
import { generateGalaxy } from '../galaxy';
import { advanceDay } from '../advanceDay';
import { warReport } from '../warend';
import { isLord } from '../lords';
import type { GameState } from '../types';

/**
 * The closing screen has to hold for wars nobody wrote a fixture for.
 *
 * Both sides are machine-played to the end, which is the only way to get a
 * finished war that was not arranged: a hand-built state can be made to
 * produce three tidy capture lines, and the question is what happens to the
 * real ones.
 */
function playOut(seed: number, cap = 3000): GameState {
  let state = generateGalaxy(seed, 'empire');
  state.observing = true;
  for (let d = 0; d < cap && !state.winner; d++) state = advanceDay(state);
  return state;
}

describe('the closing screen', () => {
  it('says nothing at all while the war is running', () => {
    expect(warReport(generateGalaxy(11, 'empire'))).toBeUndefined();
  });

  it('reports a finished war from the chair the player sat in', () => {
    // Seeds picked for speed, not for outcome: one of each winner, measured.
    for (const seed of [9001, 9003]) {
      const state = playOut(seed);
      const report = warReport(state)!;
      expect(report, `seed ${seed}`).toBeTruthy();
      expect(report.winner).toBe(state.winner);
      expect(report.outcome).toBe(state.winner === state.player ? 'victory' : 'defeat');
      expect(report.days).toBe(state.day);
      // The dispatch is the log's own closing line, not a sentence written here.
      const closing = [...state.events].reverse().find((e) => e.kind === 'war' && e.day > 0)!;
      expect(report.dispatch).toBe(closing.text);
      // Both columns are filled in, whoever won.
      expect(report.sides.empire.islands + report.sides.alliance.islands).toBeGreaterThan(0);
      expect(report.sides.empire.faction).toBe('empire');
      expect(report.sides.alliance.faction).toBe('alliance');
    }
  });

  /**
   * The Crown wins by holding three people, so the evidence is three
   * captures — and this is the part that needs a played war rather than a
   * fixture. Measured over twenty wars, a spell in irons runs 138 days on
   * average and the log holds four hundred lines, so in a long war the
   * capture that decided it has scrolled out before the war ends. That is
   * what `takenOnDay` is for, and this is the test that would have caught
   * its absence: three lines, always, whatever the log still carries.
   */
  it('names all three captures when the Crown wins, log or no log', () => {
    const state = playOut(9001);
    expect(state.winner, 'seed 9001 is the Crown win this reads').toBe('empire');
    const report = warReport(state)!;
    expect(report.deciding).toHaveLength(3);
    for (const line of report.deciding) {
      expect(line.text.length).toBeGreaterThan(0);
      expect(line.day).toBeGreaterThan(0);
    }
    // Oldest first: the screen reads as the hunt closing rather than as a list.
    const days = report.deciding.map((d) => d.day);
    expect([...days].sort((a, b) => a - b)).toEqual(days);
    // And every Lord in irons has a day on them, which is the fact the line
    // is built from.
    for (const lord of state.characters.filter(isLord)) {
      expect(lord.status).toBe('captured');
      expect(lord.takenOnDay, lord.name).toBeGreaterThan(0);
    }
  });

  /**
   * The Confederacy wins by taking one island, so the evidence is that
   * island's last days — and never the closing line itself, which is already
   * the headline above it.
   */
  it('gives the capital its last days when the Confederacy wins', () => {
    const state = playOut(9003);
    expect(state.winner, 'seed 9003 is the Confederate win this reads').toBe('alliance');
    const report = warReport(state)!;
    expect(report.deciding.length).toBeGreaterThan(0);
    expect(report.deciding.length).toBeLessThanOrEqual(4);
    for (const line of report.deciding) {
      expect(line.text).not.toBe(report.dispatch);
    }
  });

  /**
   * A day in irons is a fact about now, not a record of having been taken
   * once: a Lord who is freed carries no capture day, or the closing screen
   * would name a cell they walked out of.
   */
  it('leaves no capture day on anybody at large', () => {
    const state = playOut(9003);
    for (const c of state.characters) {
      if (c.status !== 'captured') expect(c.takenOnDay, c.name).toBeUndefined();
    }
  });
});
