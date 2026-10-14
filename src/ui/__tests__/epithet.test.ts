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
  /**
   * The mockup's second half is the specification; the first half is just the
   * hull's own class, and the class changed on 21 September.
   *
   * Sean's mockup read *ARMORED CORVETTE · HEAVY-GUN HUNTER*. The audit of
   * every painting against its stat block that day found the Cutlass is not a
   * corvette and never looked like one — she is a small lateen craft with two
   * oversized guns on her, which is a gunboat — so the class was renamed and
   * the first half of the line followed it.
   *
   * What the mockup was actually demonstrating is untouched, and is the reason
   * this test exists: the *niche* half still reads Heavy-gun hunter, derived by
   * weight of shot rather than by counting barrels.
   */
  it('reads the Cutlass as the mockup does, by weight of shot', () => {
    expect(shipEpithet(byName('Cutlass'))).toEqual(['Armored gunboat', 'Heavy-gun hunter']);
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
    // The Swift carries nothing at all and is the fleet's dispatch boat — a
    // courier since 21 September rather than a fleet auxiliary, which named a
    // supply role she has never had. Her own entry is the argument: *"A pair of
    // eyes and a fast hull, and that is the whole of her."*
    expect(shipEpithet(byName('Swift'))[1]).toBe('Courier');
    // And a survey ship is a scout however many troops she can put ashore.
    expect(shipEpithet(byName('Wayfinder'))[1]).toBe('Scout');
  });

  it('separates the siege ships from the gun platforms', () => {
    // The Majestic bombards at twelve; the Ironback's role says bombard
    // outright, which is the override doing its job — she bombards at the same
    // eight a second rate does and is nothing else.
    expect(shipEpithet(byName('Majestic'))[1]).toBe('Siege ship');
    expect(shipEpithet(byName('Ironback'))[1]).toBe('Siege ship');
    // A second rate at eight bombardment is still a gun platform.
    expect(shipEpithet(byName('Sovereign II'))[1]).toBe('Heavy-gun hunter');
  });
});

/**
 * The rating system belongs to the Crown.
 *
 * Sean, 21 September: *"For the ships of the line, we'll keep that strictly
 * Imperium because it's kind of a cool little thing that I don't feel like the
 * Confederacy would really have."*
 *
 * And it is a real distinction rather than a label: a rate is what a naval
 * board assigns when it counts your guns and writes you into a list. The Crown
 * has a board. The Confederacy has whatever it could take, plate, grow or cut
 * down, which is why its hulls are named for what they are made of and what
 * they do — a plated hulk, a coral-grown raider, a gun-catamaran.
 *
 * One Confederate hull broke this and had since the roster went in: the Chimera
 * was an "Improvised 6th rate". Improvised was right and the rate was not.
 */
describe('who gets to have a rate', () => {
  const RATE = /\b(1st|2nd|3rd|4th|5th|6th) rate\b|ship of the line/i;

  it('is the Crown and nobody else', () => {
    for (const ship of ROSTER.ships) {
      if (ship.faction === 'Crown Imperium') continue;
      expect(RATE.test(ship.role), `${ship.name}: "${ship.role}"`).toBe(false);
      // And the epithet under the painting, which is built from the role and
      // is the place a player would actually read it.
      expect(RATE.test(shipEpithet(ship).join(' ')), `${ship.name}`).toBe(false);
    }
  });

  it('and the Crown actually uses it', () => {
    // Non-vacuity: if the rates were ever renamed away wholesale this test
    // would pass while meaning nothing.
    const rated = ROSTER.ships.filter(
      (s) => s.faction === 'Crown Imperium' && RATE.test(s.role),
    );
    expect(rated.length).toBeGreaterThanOrEqual(6);
  });
});
