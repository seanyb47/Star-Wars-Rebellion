/**
 * What happens between two fleets meeting and the player learning what it
 * cost — the screens, the choice, and nothing about the fighting.
 *
 * Sean's combat order of 18 September, and it is a state machine rather than a
 * rule:
 *
 *   the clock turns · both fleets are at one island · the game pauses and the
 *   hail comes up — "Action off the shores of X" — with Attack, Flee and
 *   View Fleets · View Fleets shows both sides, and the player decides ·
 *   the sequence runs unseen · one of four thumbnails · View Damage Report
 *   shows both sides again, changed.
 *
 * **The fighting is not here and is not guessed at.** `resolve` is handed in,
 * and the two sequences it stands for — attack and flee — are the documents
 * that have not arrived. This file is the part that was fully specified: which
 * screen is up, what the player may press, and what they are shown afterwards.
 *
 * Pure and deterministic. The whole encounter is a value the day's state
 * carries, so a save in the middle of a battle is a save, and `lab/duel.ts`
 * can play one machine-against-machine without a screen existing.
 */
import type { NavyShip, Squadron } from './navy';
import { definitionOf, isAfloat, statusOf } from './navy';
import { ROSTER, type Roster, type ShipStatus } from './shipdefs';

/** Which screen is up. */
export type EncounterPhase =
  /** The hail: a thumbnail, the name of the water, three buttons. */
  | 'hail'
  /** Both fleets, laid out. */
  | 'fleets'
  /**
   * A round has been fought and neither fleet is gone: the report, the
   * assessment, and the choice to go again or break off.
   *
   * Sean's ruling of 18 September is the reason this phase exists: *"Resolve
   * exactly one round whenever the player chooses FIGHT... Otherwise offer
   * FIGHT AGAIN or FLEE."* A battle is a series of decisions, not one button.
   */
  | 'round'
  /** One of the four results. */
  | 'outcome'
  /** Both fleets again, changed — what the damage report is. */
  | 'report';

/** The two things a player may do. There is no third. */
export type EncounterChoice = 'attack' | 'flee';

/**
 * The four endings, in Sean's own words.
 *
 * Note for whoever settles the attack sequence: these four are **not** the
 * three verdicts the outcome screens already use (`victory | defeat | draw`,
 * built 17 September). Two differences, and both are real design decisions
 * rather than wording:
 *
 * - There is no **draw** here. The existing model has one on purpose — *"a
 *   draw should not automatically remove the player's fleet, force a retreat,
 *   transfer control, apply the same political penalty as defeat"* — and it is
 *   what breaking off at sea currently produces.
 * - **Victory means annihilation** here (*"you destroyed everything they
 *   had"*), where the existing model calls it a victory when the enemy is
 *   driven off the water.
 *
 * Which model wins is an open question, recorded in
 * `docs/naval-combat.md`.
 */
export type EncounterOutcome = 'victory' | 'defeat' | 'you-fled' | 'they-fled';

export const OUTCOME_HEADLINE: Record<EncounterOutcome, string> = {
  victory: 'Victory!',
  defeat: 'Defeat',
  'you-fled': 'You have fled the battle',
  'they-fled': 'Your enemy has fled the battle!',
};

/** One ship as the fleet list shows it. */
export interface ShipLine {
  shipId: string;
  classId: string;
  name: string;
  status: ShipStatus;
  /** Companies aboard, where they are known. */
  troops: number | null;
  /** False where the other side's hull is known only as a hull. */
  known: boolean;
}

/** One side of the fleet-comparison screen. */
export interface SideView {
  ships: ShipLine[];
  /** Companies aboard the whole squadron, or null where it is not known. */
  troops: number | null;
  /** Crew serving with the fleet. Empty for an enemy you have not scouted. */
  crewIds: string[];
  /** Commanders aboard. Empty for an enemy you have not scouted. */
  commanderIds: string[];
}

export interface FleetComparison {
  mine: SideView;
  theirs: SideView;
  /** False when the enemy side is behind fog: the screen says so rather than
   *  showing empty lists as though the enemy had nobody. */
  theirsKnown: boolean;
}

export interface Encounter {
  systemId: string;
  /** "Action off the shores of Chandler's Rest". */
  title: string;
  phase: EncounterPhase;
  /** Set once the player has chosen; undefined until then. */
  choice?: EncounterChoice;
  /** Set once the battle has ended. */
  outcome?: EncounterOutcome;
  /** How many rounds have been fought. */
  rounds: number;
  /** Which phase View Fleets should return to. */
  returnTo?: EncounterPhase;
}

/** What the player may press, given where they are. */
export function actionsFor(encounter: Encounter): string[] {
  switch (encounter.phase) {
    case 'hail':
      return ['attack', 'flee', 'viewFleets'];
    case 'fleets':
      // The choice is still open from here: Sean's flow has the player decide
      // *after* looking, which is the whole point of the screen. Mid-battle
      // the choice is the same one worded differently.
      if (encounter.outcome) return ['close'];
      return encounter.rounds > 0 ? ['fightAgain', 'flee', 'back'] : ['attack', 'flee', 'back'];
    case 'round':
      return ['fightAgain', 'flee', 'viewFleets'];
    case 'outcome':
      return ['viewDamageReport'];
    case 'report':
      return ['close'];
  }
}

export function openEncounter(systemId: string, locationName: string): Encounter {
  return {
    systemId,
    title: `Action off the shores of ${locationName}`,
    phase: 'hail',
    rounds: 0,
  };
}

/** View Fleets, from wherever we are. */
export function viewFleets(encounter: Encounter): Encounter {
  return { ...encounter, phase: 'fleets', returnTo: encounter.phase };
}

/** Back, to whichever screen sent us to the fleet list. */
export function back(encounter: Encounter): Encounter {
  return { ...encounter, phase: encounter.returnTo ?? 'hail', returnTo: undefined };
}

/**
 * The player decides, and the sequence runs.
 *
 * `resolve` is the unwritten half. It is handed in rather than imported so
 * that this file cannot accidentally grow a combat rule, and so a test can
 * drive every ending without one existing.
 */
export function choose(
  encounter: Encounter,
  choice: EncounterChoice,
  resolve: (choice: EncounterChoice) => EncounterOutcome | undefined,
): Encounter {
  if (encounter.outcome) return encounter;
  /*
   * `resolve` gives back an ending or nothing. Nothing means the round was
   * fought and both fleets are still there, which is the ordinary case and
   * the reason a battle is a loop of decisions rather than one call: *"Resolve
   * exactly one round whenever the player chooses FIGHT... Otherwise offer
   * FIGHT AGAIN or FLEE."*
   *
   * Fleeing always ends it, because fleeing always succeeds.
   */
  const outcome = resolve(choice);
  return {
    ...encounter,
    choice,
    rounds: choice === 'attack' ? encounter.rounds + 1 : encounter.rounds,
    ...(outcome ? { outcome, phase: 'outcome' as const } : { phase: 'round' as const }),
    returnTo: undefined,
  };
}

/** View Damage Report: the same comparison screen, after the fact. */
export function viewDamageReport(encounter: Encounter): Encounter {
  if (!encounter.outcome) return encounter;
  return { ...encounter, phase: 'report' };
}

/**
 * Both fleets, as this player is allowed to see them.
 *
 * Sean: *"enemy crew on ships are behind fog of war, unless you knew
 * already."* So the enemy's hulls are always visible — they are in the water
 * in front of you — and who is aboard them is not, unless a scouting report
 * says otherwise. That is the same rule the island panels already follow, and
 * `scouted` is where the existing espionage layer plugs in.
 */
export function compareFleets(
  mine: Squadron,
  theirs: Squadron,
  scouted: boolean,
  roster: Roster = ROSTER,
): FleetComparison {
  const line = (ship: NavyShip, known: boolean): ShipLine => {
    const def = definitionOf(ship, roster);
    return {
      shipId: ship.id,
      classId: def.id,
      name: def.name,
      status: statusOf(ship, roster),
      troops: known ? ship.troops : null,
      known,
    };
  };
  const afloat = (squadron: Squadron) => squadron.ships.filter((s) => isAfloat(s, roster));

  return {
    mine: {
      ships: afloat(mine).map((s) => line(s, true)),
      troops: afloat(mine).reduce((n, s) => n + s.troops, 0),
      crewIds: [],
      commanderIds: [],
    },
    theirs: {
      ships: afloat(theirs).map((s) => line(s, scouted)),
      troops: scouted ? afloat(theirs).reduce((n, s) => n + s.troops, 0) : null,
      crewIds: [],
      commanderIds: [],
    },
    theirsKnown: scouted,
  };
}

/*
 * The resolver interface that used to close this file is gone with the model
 * it described. Combat is `navycombat.ts` now: `fightRound` for a round,
 * `resolveFlee` for breaking off, and `enemyWillFlee` for the other side's
 * decision at the same point.
 */
