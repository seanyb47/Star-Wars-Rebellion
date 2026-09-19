/**
 * How an operation ended, and what it cost — three outcomes, not two.
 *
 * Sean's combat outcome specification, and the sentence the whole thing turns
 * on: *"LOSS and DRAW must have their own presentation logic, not simply be
 * the same screen with the word changed."* So this is a report rather than a
 * verdict. The word at the top says how the fighting came out; everything
 * under it says what actually happened, and the two are deliberately not the
 * same thing (§13) — a victory can carry heavy losses and a political
 * backlash, a defeat can leave the enemy fleet wrecked and the Reach pleased.
 *
 * The three states, in his words (§11):
 *
 *   VICTORY  the objective was achieved.
 *   DEFEAT   the objective failed and the opponent decisively prevailed.
 *   DRAW     the objective is unresolved.
 *
 * A draw is not a defeat with softer wording. It does not transfer control, it
 * does not destroy anybody's force, and it must not carry a defeat's political
 * penalty — *"the actual post-battle state determines what happens next."*
 *
 * Everything is built in one shape (§12): operation → result → your losses →
 * their losses → people → objective → politics → what happens next. Fleet
 * actions, bombardments and assaults all fill it in; what differs is what goes
 * in each slot and what the screen puts first.
 */
import factionData from '../data/factions.json';
import type { Ripple } from './propagate';
import type { BattleOutcome, PlayableFaction, ShipClassId } from './types';

/** The three states, and nothing else is ever an outcome. */
export type Verdict = 'victory' | 'defeat' | 'draw';

/** Which kind of operation this report is about. */
export type Operation = 'battle' | 'bombardment' | 'assault';

/**
 * One side's butcher's bill.
 *
 * Committed, destroyed, damaged, surviving — the four figures Sean's layout
 * asks for on every screen, in that order, for both sides. `roster` is what is
 * still afloat, for the thumbnails.
 */
export interface ForceTally {
  faction: PlayableFaction;
  /** "Crown Imperium Fleet", or "Companies landed" for an assault. */
  name: string;
  committed: number;
  destroyed: number;
  damaged: number;
  surviving: number;
  roster: Array<{ classId: ShipClassId; count: number }>;
}

/** What became of somebody worth naming. */
export type Fate = 'survived' | 'escaped' | 'wounded' | 'captured' | 'lost';

export interface PersonRow {
  id: string;
  name: string;
  faction: PlayableFaction;
  fate: Fate;
  /** Set for the fates that take somebody off the strategic map, which Sean's
   *  §3 asks to be shown prominently. */
  grave?: true;
}

/** A line of the damage table a bombardment or an assault prints. */
export interface DamageRow {
  label: string;
  value: number;
  /** Civilian damage is called out separately on purpose: the political rules
   *  price it completely differently from military damage (§5, §13). */
  civilian?: true;
}

export interface OperationReport {
  kind: Operation;
  verdict: Verdict;
  /** The word across the top. Not always VICTORY/DEFEAT/DRAW: a bombardment
   *  says BOMBARDMENT FAILED and an assault says ISLAND CAPTURED, because
   *  *"the player should not receive a generic 'Defeat' screen when the
   *  operation simply failed to accomplish its bombardment objective"* (§6). */
  headline: string;
  /** The operation's own name, above the headline: FLEET BATTLE, and so on. */
  operation: string;
  /** "Action off Port Royal". */
  title: string;
  systemId: string;
  day: number;
  mine?: ForceTally;
  theirs?: ForceTally;
  people: PersonRow[];
  damage: DamageRow[];
  /** Who holds the objective now, in a phrase. Absent when nothing was held. */
  control?: string;
  /** What the operation settled and what it did not — Sean's STRATEGIC RESULT,
   *  as bullets, and the part a defeat screen has to lead with. */
  strategic: string[];
  /** Island by island, and only what actually moved. */
  political: Ripple[];
  /** One line holding the tension between the word and the consequences, for
   *  the cases where they pull apart: *"limited military success — significant
   *  political cost"*. Absent when they agree. */
  tension?: string;
}

export const VERDICT_WORD: Record<Verdict, string> = {
  victory: 'Victory',
  defeat: 'Defeat',
  draw: 'Drawn',
};

/**
 * What a side is called on the sheet.
 *
 * Sean's layout names the force rather than the faction — *"Crown Imperium
 * Fleet"*, *"Free Confederacy Fleet"* — which reads as a report of something
 * that happened rather than as a scoreboard.
 */
export function forceName(faction: PlayableFaction, kind: Operation): string {
  const side = factionData[faction].name;
  if (kind === 'assault') return `${side} landing force`;
  return `${side} fleet`;
}

/**
 * Whether this report's word and its contents disagree, and how.
 *
 * Sean's §13 is the reason this exists at all: *"a victory can produce victory
 * — heavy losses — political backlash. A defeat can produce defeat — enemy
 * fleet heavily damaged — favourable political reaction."* A screen that only
 * says VICTORY has thrown that away. When the two pull apart the sheet says so
 * in a line, and when they agree it says nothing rather than filling space.
 */
export function tensionOf(report: OperationReport): string | undefined {
  const mine = report.mine;
  const theirs = report.theirs;
  const politics = report.political.reduce((n, r) => n + r.delta, 0);
  const bled = mine && theirs && mine.destroyed > theirs.destroyed;
  const cheap = mine && theirs && theirs.destroyed > mine.destroyed * 2;

  if (report.verdict === 'victory' && bled && politics < -0.5) {
    return 'Won, at a price, and the Reach has not taken it well.';
  }
  if (report.verdict === 'victory' && bled) return 'Won, and it cost more than it was worth.';
  if (report.verdict === 'victory' && politics < -0.5) {
    return 'The water is yours and the people are further from you than they were.';
  }
  if (report.verdict === 'defeat' && cheap) {
    return 'Beaten off — and they will be a long time making good what it cost them.';
  }
  if (report.verdict === 'defeat' && politics > 0.5) {
    return 'Beaten, and the Reach thinks the better of you for how it was done.';
  }
  if (report.verdict === 'draw' && politics < -0.5) {
    return 'Nothing settled, and it has cost you standing to settle nothing.';
  }
  if (report.verdict === 'draw' && politics > 0.5) {
    return 'Nothing settled, and the Reach counts that as standing up to them.';
  }
  return undefined;
}

/**
 * The bullets under STRATEGIC RESULT, which are the whole difference between
 * the three screens.
 *
 * Sean's §2, §3 and §4 give three different lists for the same battle, and the
 * distinctions in them are real rather than tonal: a victory says the enemy was
 * forced from the area and who holds the sea now; a defeat says the player's
 * fleet was forced to withdraw, where its survivors went, and what remains
 * contested; a draw says *"no decisive control established"* and that both
 * fleets are still capable.
 */
export function battleStrategic(input: {
  verdict: Verdict;
  where: string;
  theirs: string;
  /** Where your survivors went, if they left. */
  withdrewTo?: string;
  /** Who holds the island under the water, whatever happened at sea. */
  ashore: string;
  /** They ran rather than being sunk. */
  theyFled?: boolean;
  /** Nothing of yours is left afloat there. */
  wiped?: boolean;
}): string[] {
  const { verdict, where, theirs, withdrewTo, ashore, theyFled, wiped } = input;
  if (verdict === 'victory') {
    return [
      theyFled
        ? `${theirs} sail is driven off ${where}.`
        : `Nothing of theirs is left afloat off ${where}.`,
      `The water off ${where} is yours to lie in.`,
      ashore,
    ];
  }
  if (verdict === 'defeat') {
    return [
      wiped
        ? `Nothing of yours is left afloat off ${where}.`
        : `Your squadron is forced off ${where}.`,
      `${theirs} sail holds the water there.`,
      ...(withdrewTo ? [`What is left of yours is standing for ${withdrewTo}.`] : []),
      ashore,
    ];
  }
  return [
    'No decisive control established.',
    'Neither squadron is destroyed, and neither has driven the other off.',
    ...(withdrewTo
      ? [`Yours has hauled off toward ${withdrewTo}; theirs is still in the water.`]
      : ['Both are still in the water and still able to fight.']),
    ashore,
  ];
}

/**
 * And the bombardment's, where the three states are not win/lose/draw at all.
 *
 * §5, §6 and §7. A bombardment that brings a wall down did what it came for; a
 * bombardment that achieved nothing *failed*, which is a different thing from
 * being beaten — Sean is explicit that a failed operation must not hand the
 * player a generic defeat screen; and one that knocked stones about without
 * silencing the harbor is inconclusive, and is *"not a victory simply because
 * something was destroyed"*.
 */
export function bombardStrategic(input: {
  verdict: Verdict;
  where: string;
  wallsDown: number;
  wallsLeft: number;
  companies: number;
  civilian: number;
  why?: string;
}): string[] {
  const { verdict, where, wallsDown, wallsLeft, companies, civilian, why } = input;
  if (verdict === 'victory') {
    return [
      `The harbor defences of ${where} are silenced.`,
      'A landing can be put ashore now; nothing is firing on the boats.',
      ...(civilian > 0 ? ['The town took shot meant for the walls.'] : []),
    ];
  }
  if (verdict === 'defeat') {
    return [
      why ?? 'The guns did no useful work today.',
      `${wallsLeft} ${wallsLeft === 1 ? 'wall stands' : 'walls stand'} at ${where}, as they did this morning.`,
      'No landing can be made while they do.',
    ];
  }
  return [
    `${wallsDown > 0 ? `${wallsDown} down, ` : ''}${wallsLeft} still standing at ${where}.`,
    'The harbor is not silenced, so no landing can be made.',
    ...(companies > 0 ? [`${companies} of their troops broken in the town.`] : []),
    ...(civilian > 0
      ? ['Shot went past the walls and into the town, and that will be remembered.']
      : []),
  ];
}

/**
 * And the assault's.
 *
 * §8, §9 and §10, and §8 carries the sentence that matters most in the whole
 * specification: *"military capture does not automatically equal political
 * allegiance."* An island carried by storm is occupied and hostile, and the
 * screen says both.
 */
export function assaultStrategic(input: {
  verdict: Verdict;
  where: string;
  holder: string;
  /** Companies still aboard the squadron, able to try again. */
  aboard: number;
  /** What the island thinks of the attacker, after. */
  allegiance: number;
}): string[] {
  const { verdict, where, holder, aboard, allegiance } = input;
  if (verdict === 'victory') {
    return [
      `${where} is carried, and the troops that took it are holding it.`,
      allegiance < 50
        ? 'Occupied, and politically hostile: the people did not want this and have not changed their minds.'
        : 'The harbor is content enough to be held without a struggle.',
      'The squadron offshore is free to do something else.',
    ];
  }
  if (verdict === 'defeat') {
    return [
      'The landing is thrown back into the sea.',
      `${holder} keeps ${where}.`,
      'There is nothing left ashore and nothing left aboard to try again with.',
    ];
  }
  return [
    'The landing did not carry the place, and was not destroyed either.',
    `${holder} keeps ${where} for now.`,
    `${aboard} ${aboard === 1 ? 'troop is' : 'troops are'} still aboard and able to go again.`,
    'Both forces are still capable of continuing.',
  ];
}

/**
 * Which of the three an action's ending counts as.
 *
 * The one line that keeps a draw from being a defeat with softer wording.
 * Breaking off is the case worth stating: you have not lost your squadron and
 * they have not driven it under, so nothing is settled — Sean's §11, *"a draw
 * should not automatically remove the player's fleet, force a retreat,
 * transfer control, apply the same political penalty as defeat, or award the
 * opponent a victory."* What it *did* do — that you hauled off and they still
 * hold that water — is a fact, and goes in the consequences where facts live.
 */
export function verdictOf(outcome: BattleOutcome): Verdict {
  if (outcome === 'lost') return 'defeat';
  if (outcome === 'you-fled') return 'draw';
  return 'victory';
}
