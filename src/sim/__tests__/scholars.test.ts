import { describe, expect, it } from 'vitest';
import roster from '../../data/characters.json';
import { generateGalaxy } from '../galaxy';
import { canResearch, missionsOffered } from '../missions';
import { RESEARCH_ROLES } from '../constants';
import type { Character, System } from '../types';

/**
 * Research is a trade, not something anybody can turn a hand to.
 *
 * Sean, 23 September: *"Only a small number of units should be able to
 * research. Like 4 max in game."* Before this, every crew member could be
 * sent to a yard and the mission was simply a matter of who was idle. Now it
 * wants **Drill Research** or **Ship Design** on the sheet, which nine of the
 * forty carry — and a side opens with one of them and can reach four.
 *
 * The number that matters to the player is the second one. Nine on the roster
 * is not nine in the war: most of a roster never signs on. `lab/scientists.ts`
 * counts what actually turns up, and this holds the two ends of it — the
 * roster is not so thin that the guarantee cannot be met, and not so thick
 * that the gate means nothing.
 */
type Entry = { name: string; roles?: string[] };
const book = roster as unknown as Record<string, Entry[]>;
const ALL: Entry[] = [...book.empire, ...book.alliance, ...book.recruits];
const scholars = ALL.filter((c) => (c.roles ?? []).some((r) => RESEARCH_ROLES.includes(r as never)));

describe('who is allowed near a research bench', () => {
  it('is a minority of the roster, and enough of one to go round', () => {
    // Under three and a side can open with none even after the guarantee;
    // over a dozen and this is not a gate, it is a formality.
    expect(scholars.length).toBeGreaterThanOrEqual(6);
    expect(scholars.length).toBeLessThanOrEqual(12);
    expect(scholars.length).toBeLessThan(ALL.length / 3);
  });

  it('is decided by the role on the sheet and nothing else', () => {
    const scholar = { name: 'x', roles: ['Ship Design'] } as Character;
    const drillmaster = { name: 'y', roles: ['Drill Research'] } as Character;
    const sailor = { name: 'z', roles: ['Fleet Command'] } as Character;
    const nobody = { name: 'w' } as Character;
    expect(canResearch(scholar)).toBe(true);
    expect(canResearch(drillmaster)).toBe(true);
    expect(canResearch(sailor)).toBe(false);
    expect(canResearch(nobody)).toBe(false);
  });

  it('gives both sides somebody who can do it on day one', () => {
    // The guarantee lives in `openingCast`. Without it a shuffle decided
    // whether a third of the game existed, and measured over 96 wars it said
    // no to more than half of them.
    for (let seed = 4200; seed < 4212; seed++) {
      const state = generateGalaxy(seed);
      for (const side of ['empire', 'alliance'] as const) {
        const mine = state.characters.filter((c) => c.faction === side);
        expect(mine.some(canResearch), `${side} on seed ${seed}`).toBe(true);
      }
    }
  });
});

describe('the mission list obeys it', () => {
  it('offers research to a scholar and withholds it from a sailor', () => {
    const state = generateGalaxy(4200);
    const mine = state.characters.filter((c) => c.faction === state.player);
    const scholar = mine.find(canResearch)!;
    const sailor = mine.find((c) => !canResearch(c));
    expect(scholar).toBeTruthy();
    const offered = (system: System, who: Character | undefined) =>
      missionsOffered(state, system, state.player, who);

    // Find an island that offers research at all — otherwise the rest proves
    // nothing. It is a yard of your own, so there is always one.
    const home = state.systems.find((s) => offered(s, undefined).includes('research'))!;
    expect(home).toBeTruthy();
    expect(offered(home, scholar)).toContain('research');
    if (sailor) expect(offered(home, sailor)).not.toContain('research');
  });
});
