import { describe, expect, it } from 'vitest';
import {
  OUTCOME_HEADLINE,
  actionsFor,
  back,
  choose,
  compareFleets,
  openEncounter,
  viewDamageReport,
  viewFleets,
  type EncounterChoice,
  type EncounterOutcome,
} from '../encounter';
import { applyHullDamage, commission, type Squadron } from '../navy';
import { ROSTER } from '../shipdefs';

const MAJESTIC = ROSTER.byId.get('CWN-MAJ-R8-01')!;
const CORAL = ROSTER.byId.get('CFS-COR-R8-01')!;
const SWIFT = ROSTER.byId.get('CFS-SWI-S01')!;

/** A resolver that always says the same thing, so the machine can be tested
 *  without a combat rule existing. */
const always = (outcome: EncounterOutcome) => () => outcome;

describe('the combat order', () => {
  it('opens on the hail, named for the water', () => {
    const e = openEncounter('isl-1', "Chandler's Rest");
    expect(e.phase).toBe('hail');
    expect(e.title).toBe("Action off the shores of Chandler's Rest");
    expect(actionsFor(e)).toEqual(['attack', 'flee', 'viewFleets']);
  });

  it('shows both fleets and comes back to where it was asked from', () => {
    const hail = openEncounter('isl-1', 'Highwater');
    const looking = viewFleets(hail);
    expect(looking.phase).toBe('fleets');
    expect(back(looking).phase).toBe('hail');
  });

  it('keeps the choice open while the player is looking', () => {
    // The point of the screen: decide after evaluating, not before.
    const looking = viewFleets(openEncounter('isl-1', 'Highwater'));
    expect(actionsFor(looking)).toEqual(['attack', 'flee', 'back']);
  });

  it('runs the sequence on a choice and lands on an outcome', () => {
    const e = choose(openEncounter('isl-1', 'Highwater'), 'attack', always('victory'));
    expect(e.choice).toBe('attack');
    expect(e.outcome).toBe('victory');
    expect(e.phase).toBe('outcome');
    expect(actionsFor(e)).toEqual(['viewDamageReport']);
  });

  it('offers one button on the outcome, and it is the damage report', () => {
    for (const outcome of ['victory', 'defeat', 'you-fled', 'they-fled'] as EncounterOutcome[]) {
      const e = choose(openEncounter('isl-1', 'Highwater'), 'attack', always(outcome));
      expect(actionsFor(e)).toEqual(['viewDamageReport']);
      expect(OUTCOME_HEADLINE[outcome].length).toBeGreaterThan(0);
      const report = viewDamageReport(e);
      expect(report.phase).toBe('report');
      expect(actionsFor(report)).toEqual(['close']);
    }
  });

  it('passes the player\'s choice to the sequence', () => {
    const seen: EncounterChoice[] = [];
    choose(openEncounter('isl-1', 'X'), 'flee', (c) => {
      seen.push(c);
      return 'you-fled';
    });
    expect(seen).toEqual(['flee']);
  });

  it('cannot be decided twice', () => {
    const once = choose(openEncounter('isl-1', 'X'), 'attack', always('victory'));
    const again = choose(once, 'flee', always('defeat'));
    expect(again).toBe(once);
  });

  it('will not show a damage report before there is damage to report', () => {
    const hail = openEncounter('isl-1', 'X');
    expect(viewDamageReport(hail)).toBe(hail);
  });

  it('lets the fleet list be reached after the fighting too', () => {
    // 'View Damage Report ... takes you to the fleet comparison screen again.'
    const done = viewDamageReport(choose(openEncounter('isl-1', 'X'), 'attack', always('victory')));
    const looking = viewFleets(done);
    expect(looking.phase).toBe('fleets');
    expect(actionsFor(looking)).toEqual(['close']);
    expect(back(looking).phase).toBe('report');
  });
});

describe('what each side is allowed to see', () => {
  const mine: Squadron = { ships: [commission(MAJESTIC, 'maj-1')] };
  const theirs: Squadron = { ships: [commission(CORAL, 'coral-1'), commission(SWIFT, 'swift-1')] };

  it('always shows the enemy hulls, because they are in the water', () => {
    const view = compareFleets(mine, theirs, false);
    expect(view.theirs.ships.map((s) => s.name)).toEqual(['Coral-Class Dreadnaught', 'Swift']);
  });

  it('hides who is aboard an enemy nobody has scouted', () => {
    const view = compareFleets(mine, theirs, false);
    expect(view.theirsKnown).toBe(false);
    expect(view.theirs.troops).toBeNull();
    for (const ship of view.theirs.ships) {
      expect(ship.known).toBe(false);
      expect(ship.troops).toBeNull();
    }
    // And says so, rather than showing an empty list as though they had nobody.
    expect(view.theirs.ships.length).toBeGreaterThan(0);
  });

  it('shows who is aboard once you know already', () => {
    theirs.ships[0].troops = 3;
    const view = compareFleets(mine, theirs, true);
    expect(view.theirsKnown).toBe(true);
    expect(view.theirs.troops).toBe(3);
    expect(view.theirs.ships[0].known).toBe(true);
  });

  it('never hides your own', () => {
    mine.ships[0].troops = 7;
    const view = compareFleets(mine, theirs, false);
    expect(view.mine.troops).toBe(7);
    expect(view.mine.ships[0].known).toBe(true);
  });

  it('leaves wrecks off the list', () => {
    const wrecked: Squadron = { ships: [commission(SWIFT, 's1'), commission(SWIFT, 's2')] };
    applyHullDamage(wrecked.ships[0], SWIFT.hull);
    expect(compareFleets(wrecked, theirs, true).mine.ships).toHaveLength(1);
  });

  it('reports each ship\'s condition, so the report can show what changed', () => {
    const squadron: Squadron = { ships: [commission(MAJESTIC, 'maj-9')] };
    expect(compareFleets(squadron, theirs, true).mine.ships[0].status).toBe('Healthy');
    applyHullDamage(squadron.ships[0], MAJESTIC.hull * 0.6);
    expect(compareFleets(squadron, theirs, true).mine.ships[0].status).toBe('Heavily Damaged');
  });
});
