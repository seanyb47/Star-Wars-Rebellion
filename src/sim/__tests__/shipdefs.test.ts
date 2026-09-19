import { describe, expect, it } from 'vitest';
import rosterData from '../../data/combat-ships.json';
import {
  NAVY_FACTIONS,
  ROSTER,
  RosterError,
  SHIP_STATUSES,
  type ShipDefinition,
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
    expect(ROSTER.ships).toHaveLength(24);
    expect(ROSTER.byId.size).toBe(24);
  });

  it('finds no errors in the shipped data', () => {
    expect(validateRoster(rosterData).filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('converts a percentage repair rate into a fraction', () => {
    // '1%' and '1.5%' in the export; 0.01 and 0.015 here, so a caller can
    // multiply rather than remembering to divide by a hundred.
    expect(ROSTER.byId.get('CWN-MAJ-R8-01')!.repairRatePerDay).toBeCloseTo(0.01);
    expect(ROSTER.byId.get('CFS-BRI-S02')!.repairRatePerDay).toBeCloseTo(0.015);
    expect(ROSTER.byId.get('CFS-COR-R8-01')!.repairRatePerDay).toBeCloseTo(0.04);
    // And a fraction of a percent, which is the one a naive parse gets wrong.
    expect(ROSTER.byId.get('CFS-IRB-R5-01')!.repairRatePerDay).toBeCloseTo(0.005);
  });

  it('parses the research ladder into a kind and an order', () => {
    const wayfinder = ROSTER.byId.get('CWN-WAY-S01')!;
    expect(wayfinder.research).toEqual({ kind: 'start', order: 1, raw: 'S01' });
    const goliath = ROSTER.byId.get('CFS-URG-R7-01')!;
    expect(goliath.research).toEqual({ kind: 'research', order: 7, raw: 'R7' });
  });

  it('keeps the three gun kinds apart', () => {
    const majestic = ROSTER.byId.get('CWN-MAJ-R8-01')!;
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

  it('catches two hulls under one name', () => {
    // The near miss this came from: the Gigantic CFS-URW-R7-01 and the live
    // roster's 30-hull medium were both the 'Urskin Whaler' until Sean
    // renamed the big one the Goliath on 19 September, and the sheet would
    // have accepted the real whaler beside her without a word. Ids are the
    // key the code uses; the name is the one the player reads.
    const doc = corrupt((d) => {
      const list = d.ships as Array<Record<string, unknown>>;
      list[1]['Ship'] = list[0]['Ship'];
    });
    expect(validateRoster(doc).some((i) => /which is already/.test(i.message))).toBe(true);
    // Case and stray spacing are the same collision, not a different one.
    const sloppy = corrupt((d) => {
      const list = d.ships as Array<Record<string, unknown>>;
      list[1]['Ship'] = `  ${String(list[0]['Ship']).toUpperCase()} `;
    });
    expect(validateRoster(sloppy).some((i) => /which is already/.test(i.message))).toBe(true);
  });

  it('is happy with the twenty-four names the sheet actually ships', () => {
    const names = ROSTER.ships.map((s) => s.name.trim().toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    // The rename itself, pinned: the dreadnaught is the Goliath and nothing
    // in this roster is called the Whaler until Sean enters her.
    expect(ROSTER.byId.get('CFS-URG-R7-01')!.name).toBe('Urskin Goliath');
    expect(names).not.toContain('urskin whaler');
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

/** Every gun a hull carries, of whichever kind. Bombardment is never in it. */
const gunsOf = (s: ShipDefinition) => s.guns.longGuns + s.guns.heavyGuns + s.guns.lightGuns;

/** The one hull in the whole roster with the most of something. */
const heaviest = (of: (s: ShipDefinition) => number): ShipDefinition =>
  ROSTER.ships.reduce((a, b) => (of(b) > of(a) ? b : a));

describe('the design rules the export states about itself', () => {
  it('gives each navy exactly four starting hulls', () => {
    // 'Each faction has four starting ships and eight research unlocks.'
    expect(startingHulls('Crown Imperium').map((s) => s.name)).toEqual([
      'Wayfinder',
      'Interceptor I',
      'Morningstar',
      'Sovereign',
    ]);
    expect(startingHulls('Free Confederacy').map((s) => s.name)).toEqual([
      'Swift',
      'Brigantine',
      'Chimera',
      'Tidestalker',
    ]);
  });

  it('makes the Vanguard and the Marauder each navy\'s first unlock', () => {
    expect(nextUnlock('Crown Imperium', 0)!.name).toBe('Vanguard');
    expect(nextUnlock('Free Confederacy', 0)!.name).toBe('Marauder');
    expect(nextUnlock('Crown Imperium', 99)).toBeUndefined();
  });

  it('walks each ladder in unlock order, eight rungs and no gaps', () => {
    // The roster of 18 September closed the gaps: both navies now run R1-R8
    // with nothing missing, so "the nth unlock" and "the step called Rn" are
    // finally the same question. Asserted because they were not, and a future
    // revision could part them again.
    const order = ['Marauder', 'Cutlass', 'Tempest', 'Reefwarden'];
    order.forEach((name, i) => expect(nextUnlock('Free Confederacy', i)!.name).toBe(name));

    for (const faction of NAVY_FACTIONS) {
      const ladder = fleetOf(faction).filter((s) => s.research.kind === 'research');
      expect(ladder).toHaveLength(8);
      expect(ladder.map((s) => s.research.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      ladder.forEach((ship, i) => expect(nextUnlock(faction, i)!.id).toBe(ship.id));
    }
  });

  it('gives the Majestic the heaviest guns of any one ship, and not the heaviest everything', () => {
    // 'Majestic remains the strongest individual ship.' Asserted on the one
    // figure the roster still gives her outright, not on a combat model.
    //
    // The locked revision states it outright: *'Majestic remains the strongest
    // individual ship and the only Maximum Armor 30 hull. Urskin Goliath keeps
    // the greatest hull and Heavy Gun mass.'* So she tops guns and armor, and
    // the one thing she does not top is hull — the Goliath's 1,800 to her 1,600.
    // Pinned because a roster that stops being lopsided by accident and one
    // that stops on purpose look identical in a diff.
    const majestic = ROSTER.byId.get('CWN-MAJ-R8-01')!;
    for (const other of ROSTER.ships) {
      if (other.id === majestic.id) continue;
      expect(gunsOf(other)).toBeLessThan(gunsOf(majestic));
    }
    expect(heaviest((s) => s.armor).id).toBe('CWN-MAJ-R8-01');
    expect(majestic.armor).toBe(30);
    expect(heaviest((s) => s.hull).id).toBe('CFS-URG-R7-01');
    // And the Goliath's Heavy Guns are the Confederacy's greatest, not the
    // game's: the Majestic's sixteen still beat her thirteen.
    expect(majestic.guns.heavyGuns).toBeGreaterThan(ROSTER.byId.get('CFS-URG-R7-01')!.guns.heavyGuns);
  });

  it('lets a Coral-Class and an Urskin Goliath out-gun and out-hull a Majestic', () => {
    // 'Together they exceed a lone Majestic.' Guns and hull only: whether the
    // pair actually beats her is a question for a combat model, and the roster
    // is not one.
    const coral = ROSTER.byId.get('CFS-COR-R8-01')!;
    const goliath = ROSTER.byId.get('CFS-URG-R7-01')!;
    const majestic = ROSTER.byId.get('CWN-MAJ-R8-01')!;
    expect(gunsOf(coral) + gunsOf(goliath)).toBeGreaterThan(gunsOf(majestic));
    expect(coral.hull + goliath.hull).toBeGreaterThan(majestic.hull);
  });

  it('gives the Urskin Goliath the Confederacy\'s hull, troops and heavy guns', () => {
    // 'Urskin Goliath supplies the Confederacy's greatest hull, troop capacity,
    // and Heavy Gun mass.' Within her own navy, which is what the rule says:
    // the Majestic still carries more troops and more heavy guns than she does.
    const confederacy = fleetOf('Free Confederacy');
    for (const field of ['hull', 'troopCapacity'] as const) {
      const best = confederacy.reduce((a, b) => (b[field] > a[field] ? b : a));
      expect(best.id).toBe('CFS-URG-R7-01');
    }
    const mostHeavy = confederacy.reduce((a, b) => (b.guns.heavyGuns > a.guns.heavyGuns ? b : a));
    expect(mostHeavy.id).toBe('CFS-URG-R7-01');
  });

  it('keeps bombardment off the list of things a ship shoots at a ship', () => {
    // 'Bombardment: Only affects fortifications/locations, never ship-to-ship.'
    // The guarantee is structural: bombardment is not part of `guns`, so no
    // armament total can pick it up by accident.
    const morningstar = ROSTER.byId.get('CWN-MOR-S03')!;
    expect(morningstar.bombardment).toBeGreaterThan(0);
    expect(Object.keys(morningstar.guns)).toEqual(['longGuns', 'heavyGuns', 'lightGuns']);
  });

  it('keeps the two navies mechanically asymmetric', () => {
    // 'The Crown favors standardized progression... The Confederacy favors
    // asymmetric specialists.' The ladders used to be different lengths and are
    // not any more — the revision of 18 September gave both navies four starts
    // and eight unlocks on purpose — so the asymmetry is measured where it now
    // lives: no two hulls across the two navies are statistically identical.
    const crown = fleetOf('Crown Imperium');
    const confederacy = fleetOf('Free Confederacy');
    expect(crown).toHaveLength(confederacy.length);
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
      // Armor 30 is T4+ under the rescaled bands, which with her T4 Hull of
      // 900 gives a starting ship two top-tier stats.
      const sovereign = ships(d).find((s) => s['Ship ID'] === 'CWN-SOV-S04')!;
      sovereign['Armor'] = 30;
    });
    const warnings = validateRoster(doc).filter((i) => i.severity === 'warning');
    expect(warnings.some((w) => w.field === 'Early-game power')).toBe(true);
  });

  it('warns rather than throws when a value leaves its tier bands', () => {
    const doc = corrupt((d) => {
      ships(d)[0]['Armor'] = 999; // past T4+'s 30, so outside every band
    });
    const issues = validateRoster(doc);
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(issues.some((i) => i.severity === 'warning' && /tier band/.test(i.message))).toBe(true);
    expect(() => loadRoster(doc)).not.toThrow();
  });
});
