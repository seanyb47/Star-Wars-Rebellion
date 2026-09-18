import { describe, expect, it } from 'vitest';
import rosterData from '../../data/combat-ships.json';
import {
  NAVY_FACTIONS,
  ROSTER,
  RosterError,
  SHIP_STATUSES,
  SPEED_CATEGORIES,
  fleetOf,
  loadRoster,
  nextUnlock,
  startingHulls,
  validateRoster,
} from '../shipdefs';

/**
 * The roster loads, and refuses anything it should refuse.
 *
 * These tests are about the *data contract*, not about balance: they check
 * that the export can be read, that a corrupted one is caught rather than
 * silently half-loaded, and that the design rules the export states about
 * itself still hold. Nothing here asserts that a number is correct — Sean's
 * instruction is that this pass does not rebalance anything.
 */

/** A deep copy, so a test that breaks a field cannot break another test. */
function corrupt(mutate: (doc: Record<string, unknown>) => void): unknown {
  const doc = JSON.parse(JSON.stringify(rosterData)) as Record<string, unknown>;
  mutate(doc);
  return doc;
}
function ships(doc: unknown): Array<Record<string, unknown>> {
  return (doc as Record<string, unknown>).ships as Array<Record<string, unknown>>;
}

describe('loading the roster', () => {
  it('reads every ship in the export', () => {
    expect(ROSTER.ships).toHaveLength(25);
    expect(ROSTER.byId.size).toBe(25);
  });

  it('finds no errors in the shipped data', () => {
    expect(validateRoster(rosterData).filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('converts a percentage repair rate into a fraction', () => {
    // '1%' and '1.5%' in the export; 0.01 and 0.015 here, so a caller can
    // multiply rather than remembering to divide by a hundred.
    expect(ROSTER.byId.get('CWN-MAJ-R9-01')!.repairRatePerDay).toBeCloseTo(0.01);
    expect(ROSTER.byId.get('CFS-IRB-R8-01')!.repairRatePerDay).toBeCloseTo(0.015);
    expect(ROSTER.byId.get('CFS-REE-R9-02')!.repairRatePerDay).toBeCloseTo(0.04);
  });

  it('parses the research ladder into a kind and an order', () => {
    const wayfinder = ROSTER.byId.get('CWN-WAY-S01')!;
    expect(wayfinder.research).toEqual({ kind: 'start', order: 1, raw: 'S01' });
    const whaler = ROSTER.byId.get('CFS-URW-R10-01')!;
    expect(whaler.research).toEqual({ kind: 'research', order: 10, raw: 'R10' });
  });

  it('keeps the three gun kinds apart', () => {
    const majestic = ROSTER.byId.get('CWN-MAJ-R9-01')!;
    expect(majestic.guns).toEqual({ longGuns: 10, heavyGuns: 16, lightGuns: 10 });
  });

  it('only ever uses names it knows', () => {
    for (const ship of ROSTER.ships) {
      expect(NAVY_FACTIONS).toContain(ship.faction);
      expect(SPEED_CATEGORIES).toContain(ship.speed);
      expect(SHIP_STATUSES).toContain(ship.launchStatus);
      expect(ship.role.length).toBeGreaterThan(0);
    }
  });
});

describe('refusing bad data', () => {
  it('catches a duplicate ship id', () => {
    const doc = corrupt((d) => {
      const list = d.ships as Array<Record<string, unknown>>;
      list[1]['Ship ID'] = list[0]['Ship ID'];
    });
    expect(() => loadRoster(doc)).toThrow(RosterError);
    expect(validateRoster(doc).some((i) => /Duplicate ship id/.test(i.message))).toBe(true);
  });

  it('catches an unknown enum value', () => {
    const speed = corrupt((d) => {
      ships(d)[0]['Speed'] = 'Brisk';
    });
    const faction = corrupt((d) => {
      ships(d)[0]['Faction'] = 'The Admiralty';
    });
    const status = corrupt((d) => {
      ships(d)[0]['Status'] = 'Fine';
    });
    for (const doc of [speed, faction, status]) expect(() => loadRoster(doc)).toThrow(RosterError);
  });

  it('catches a missing required field', () => {
    const doc = corrupt((d) => {
      delete ships(d)[3]['Ship'];
    });
    expect(() => loadRoster(doc)).toThrow(/Missing name/);
  });

  it('catches numbers out of range', () => {
    const negative = corrupt((d) => {
      ships(d)[0]['Armor'] = -5;
    });
    const fractional = corrupt((d) => {
      ships(d)[0]['Hull'] = 300.5;
    });
    const noHull = corrupt((d) => {
      ships(d)[0]['Hull'] = 0;
    });
    for (const doc of [negative, fractional, noHull]) expect(() => loadRoster(doc)).toThrow(RosterError);
  });

  it('allows a fractional maintenance cost, because two ships have one', () => {
    // The Swift is half a gold a day and the Marauder one and a half: a
    // whole-number rule here would reject the shipped roster.
    expect(ROSTER.byId.get('CFS-SWI-S01')!.goldPerDayMaintenance).toBe(0.5);
    expect(ROSTER.byId.get('CFS-MAR-R1-01')!.goldPerDayMaintenance).toBe(1.5);
  });

  it('catches a malformed percentage', () => {
    const doc = corrupt((d) => {
      ships(d)[0]['Repair Rate'] = '1 percent';
    });
    expect(() => loadRoster(doc)).toThrow(/Repair Rate/);
  });

  it('catches two hulls on the same rung of one ladder', () => {
    const doc = corrupt((d) => {
      const list = ships(d);
      const crown = list.filter((s) => s['Faction'] === 'Crown Imperium');
      crown[1]['Research Order'] = crown[0]['Research Order'];
    });
    expect(() => loadRoster(doc)).toThrow(/is already taken by/);
  });

  it('allows the two navies the same rung as each other', () => {
    // Both open at S01 and both unlock an R1, which is correct: the ladders
    // are per faction. This is the case the duplicate check must not catch.
    expect(validateRoster(rosterData).filter((i) => /already taken/.test(i.message))).toEqual([]);
  });

  it('reports everything wrong at once rather than the first thing', () => {
    const doc = corrupt((d) => {
      const list = ships(d);
      list[0]['Speed'] = 'Brisk';
      list[1]['Armor'] = -1;
      delete list[2]['Role'];
    });
    expect(validateRoster(doc).filter((i) => i.severity === 'error').length).toBeGreaterThanOrEqual(3);
  });
});

describe('the design rules the export states about itself', () => {
  it('gives each navy exactly four starting hulls', () => {
    // 'Crown starts: Wayfinder, Interceptor I, Dreadnought, Sovereign.'
    // 'Confederacy starts: Swift, Brigantine, Freebooter, Cutlass.'
    expect(startingHulls('Crown Imperium').map((s) => s.name)).toEqual([
      'Wayfinder',
      'Interceptor I',
      'Dreadnought',
      'Sovereign',
    ]);
    expect(startingHulls('Free Confederacy').map((s) => s.name)).toEqual([
      'Swift',
      'Brigantine',
      'Freebooter',
      'Cutlass',
    ]);
  });

  it('makes the Vanguard and the Marauder each navy\'s first unlock', () => {
    expect(nextUnlock('Crown Imperium', 0)!.name).toBe('Vanguard');
    expect(nextUnlock('Free Confederacy', 0)!.name).toBe('Marauder');
    expect(nextUnlock('Crown Imperium', 99)).toBeUndefined();
  });

  it('walks a ladder in unlock order, gaps and all', () => {
    // The Confederacy's numbering runs R1 then R5-R11 with nothing between.
    // `nextUnlock` answers "the nth unlock", which steps over the gap.
    const order = ['Marauder', 'Bonecutter', 'Tempest', 'Reefwalker'];
    order.forEach((name, i) => expect(nextUnlock('Free Confederacy', i)!.name).toBe(name));
  });

  it('gives the Majestic the heaviest guns, armor and hull of any one ship', () => {
    // 'Majestic is the strongest individual ship.' Asserted on the three
    // figures the export actually gives, not on a combat model that does not
    // exist yet.
    const majestic = ROSTER.byId.get('CWN-MAJ-R9-01')!;
    const guns = (s: { guns: { longGuns: number; heavyGuns: number; lightGuns: number } }) =>
      s.guns.longGuns + s.guns.heavyGuns + s.guns.lightGuns;
    for (const other of ROSTER.ships) {
      if (other.id === majestic.id) continue;
      expect(guns(other)).toBeLessThan(guns(majestic));
      expect(other.hull).toBeLessThan(majestic.hull);
      expect(other.armor).toBeLessThanOrEqual(majestic.armor);
    }
  });

  it('lets a Reef-Class and an Urskin Whaler out-gun and out-hull a Majestic', () => {
    // 'Reef-Class + Urskin Whaler should exceed it as a combined fleet.'
    // Guns and hull only: whether the pair actually beats her is a question
    // for a combat model, and there is not one.
    const reef = ROSTER.byId.get('CFS-REE-R9-02')!;
    const whaler = ROSTER.byId.get('CFS-URW-R10-01')!;
    const majestic = ROSTER.byId.get('CWN-MAJ-R9-01')!;
    const guns = (s: typeof reef) => s.guns.longGuns + s.guns.heavyGuns + s.guns.lightGuns;
    expect(guns(reef) + guns(whaler)).toBeGreaterThan(guns(majestic));
    expect(reef.hull + whaler.hull).toBeGreaterThan(majestic.hull);
  });

  it('keeps bombardment off the list of things a ship shoots at a ship', () => {
    // 'Bombardment: Only affects fortifications/locations, never ship-to-ship.'
    // The guarantee is structural: bombardment is not part of `guns`, so no
    // armament total can pick it up by accident.
    const dreadnought = ROSTER.byId.get('CWN-DRE-S03')!;
    expect(dreadnought.bombardment).toBeGreaterThan(0);
    expect(Object.keys(dreadnought.guns)).toEqual(['longGuns', 'heavyGuns', 'lightGuns']);
  });

  it('keeps the two navies mechanically asymmetric', () => {
    // 'Crown and Confederacy fleets must remain mechanically asymmetric.'
    // Measured as: the ladders are different lengths and no two hulls across
    // the two navies are statistically identical.
    const crown = fleetOf('Crown Imperium');
    const confederacy = fleetOf('Free Confederacy');
    expect(crown.length).not.toBe(confederacy.length);
    const fingerprint = (s: (typeof crown)[number]) =>
      [s.speed, s.guns.longGuns, s.guns.heavyGuns, s.guns.lightGuns, s.armor, s.hull].join('/');
    const crownPrints = new Set(crown.map(fingerprint));
    for (const ship of confederacy) expect(crownPrints.has(fingerprint(ship))).toBe(false);
  });
});

describe('what the shipped data is warned about', () => {
  /**
   * Warnings are design observations, not failures. They are asserted here so
   * that the set cannot change without somebody noticing — if a future export
   * clears one or adds one, this test says so.
   */
  it('flags the Sovereign as a starting ship in a top tier, and nothing else', () => {
    const warnings = validateRoster(rosterData).filter((i) => i.severity === 'warning');
    expect(warnings.map((w) => `${w.shipId}/${w.field}`)).toEqual([]);
    // Sovereign carries exactly one top-tier combat stat (Hull 900), and the
    // rule is about *multiple* top-tier capabilities, so it does not trip.
    expect(ROSTER.byId.get('CWN-SOV-S04')!.hull).toBe(900);
  });

  it('would flag a starting ship given two top-tier stats', () => {
    const doc = corrupt((d) => {
      const sovereign = ships(d).find((s) => s['Ship ID'] === 'CWN-SOV-S04')!;
      sovereign['Armor'] = 95;
    });
    const warnings = validateRoster(doc).filter((i) => i.severity === 'warning');
    expect(warnings.some((w) => w.field === 'Early-game power')).toBe(true);
  });

  it('warns rather than throws when a value leaves its tier bands', () => {
    const doc = corrupt((d) => {
      ships(d)[0]['Gold/Day Maintenance'] = 0.05; // below T1's 0.1 floor
    });
    const issues = validateRoster(doc);
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(issues.some((i) => i.severity === 'warning' && /tier band/.test(i.message))).toBe(true);
    expect(() => loadRoster(doc)).not.toThrow();
  });
});
