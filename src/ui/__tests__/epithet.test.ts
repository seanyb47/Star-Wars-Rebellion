import { describe, expect, it } from 'vitest';
import { shipEpithet } from '../Almanac';
import { ROSTER } from '../../sim/shipdefs';

/**
 * The line under the painting, checked against the one example there is.
 *
 * Sean's mockup of 20 September shows the Cutlass as *ARMORED CORVETTE ·
 * HEAVY-GUN HUNTER*. That is the whole specification — one hull out of
 * twenty-eight — so the line is derived from each ship's own numbers rather
 * than written out by hand, and this pins the derivation to the example.
 *
 * The Cutlass is the useful case precisely because she is the awkward one:
 * six heavy guns against fourteen light, so counting barrels calls her a
 * close-quarters raider. Weighting by what each gun throws — a heavy is twice
 * a light, by the combat master's own damage table — calls her what Sean
 * calls her. A test that only checked an easy hull would not have caught the
 * difference.
 */
const byName = (name: string) => ROSTER.ships.find((s) => s.name === name)!;

describe('what she is, and what she is for', () => {
  it('reads the Cutlass exactly as the mockup does', () => {
    expect(shipEpithet(byName('Cutlass'))).toEqual(['Armored corvette', 'Heavy-gun hunter']);
  });

  it('is not simply counting barrels', () => {
    // Non-vacuity for the test above: if lights ever outnumbered heavies less
    // dramatically, the naive rule would agree by accident and the pin would
    // stop meaning anything.
    const cutlass = byName('Cutlass');
    expect(cutlass.guns.lightGuns).toBeGreaterThan(cutlass.guns.heavyGuns * 2);
  });

  it('gives every hull in the fleet both halves', () => {
    for (const ship of ROSTER.ships) {
      const [what, why] = shipEpithet(ship);
      expect(what, ship.name).toMatch(/^(Unarmored|Armored|Heavily armored) \S/);
      expect(why, ship.name).toBeTruthy();
      // Two short phrases, not a sentence: this sits on one line in small caps.
      expect(what.length, `${ship.name}: "${what}"`).toBeLessThan(40);
      expect(why.length, `${ship.name}: "${why}"`).toBeLessThan(26);
    }
  });

  it('calls the gunless ones what they are, not fighters', () => {
    // The Swift carries nothing at all and is the fleet's dispatch boat.
    expect(shipEpithet(byName('Swift'))[1]).toBe('Fleet auxiliary');
    // And a survey ship is a scout however many troops she can put ashore.
    expect(shipEpithet(byName('Wayfinder'))[1]).toBe('Scout');
  });

  it('separates the siege ships from the gun platforms', () => {
    // The Majestic bombards at twelve; the Ironback's role says siege outright.
    expect(shipEpithet(byName('Majestic'))[1]).toBe('Siege ship');
    expect(shipEpithet(byName('Ironback'))[1]).toBe('Siege ship');
    // A second rate at eight bombardment is still a gun platform.
    expect(shipEpithet(byName('Sovereign II'))[1]).toBe('Heavy-gun hunter');
  });
});
