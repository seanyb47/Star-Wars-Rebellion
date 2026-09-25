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

/** One line in a standing/lost column: three Fortresses, four Crown Marines. */
export interface LedgerRow {
  label: string;
  count: number;
}

/**
 * What is still there and what is not, side by side.
 *
 * Sean, 21 September, asking for this on both the bombardment and the assault
 * screens: *"it'll show you what ships or what things were blown up. And it
 * should have two columns, right? What's still there and what blew up."*
 *
 * One entry per side. A bombardment has one — the island — because the fleet
 * doing the shelling is never fired back at. An assault has two.
 */
export interface Ledger {
  /** Whose column this is, in words: "Highwater", "The landing force". */
  side: string;
  faction?: PlayableFaction;
  standing: LedgerRow[];
  lost: LedgerRow[];
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
  /** Standing and lost, per side. See `Ledger`. */
  ledger?: Ledger[];
  /*
   * There was a `tension` line here: one sentence of editorial over the top of
   * the report — *"Won, and it cost more than it was worth"*, *"the water is
   * yours and the people are further from you than they were"*.
   *
   * Sean cut it on 22 September with five Rebellion resolution screens beside
   * it: *"see how they're all crazy simple. Just bottom line up front. You
   * keep adding so much fluff, no one knows what it means. I get it's trying
   * to add flavor but it's actually adding confusion."* Every fact that line
   * drew on is already on the sheet — the losses in the tallies, the swing in
   * the political ripples — so it was the screen telling the player what to
   * conclude from numbers they can see.
   */
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
        ? `The ${theirs} fleet has withdrawn.`
        : `The ${theirs} fleet has been destroyed.`,
      `Your fleet holds the water off ${where}.`,
      ashore,
    ];
  }
  if (verdict === 'defeat') {
    return [
      wiped ? 'Your fleet has been destroyed.' : 'Your fleet has withdrawn.',
      `The ${theirs} fleet holds the water off ${where}.`,
      ...(withdrewTo ? [`Your survivors are sailing for ${withdrewTo}.`] : []),
      ashore,
    ];
  }
  return [
    'The action is drawn.',
    `Both fleets are still in the water off ${where}.`,
    ...(withdrewTo ? [`Your fleet is sailing for ${withdrewTo}.`] : []),
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
  const walls = (n: number) => `${n} ${n === 1 ? 'wall' : 'walls'}`;
  if (verdict === 'victory') {
    return [
      `The harbor defences of ${where} have been destroyed.`,
      'A landing can be made.',
      ...(civilian > 0 ? ['The town was hit.'] : []),
    ];
  }
  if (verdict === 'defeat') {
    return [
      why ?? 'The bombardment failed.',
      `${walls(wallsLeft)} still stand at ${where}.`,
      'No landing can be made.',
    ];
  }
  return [
    ...(wallsDown > 0 ? [`${walls(wallsDown)} destroyed at ${where}.`] : []),
    `${walls(wallsLeft)} still stand.`,
    'No landing can be made.',
    ...(companies > 0 ? [`${companies} of their troops were destroyed.`] : []),
    ...(civilian > 0 ? ['The town was hit.'] : []),
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
  /**
   * Whether anybody lives there.
   *
   * §8's sentence is about people, and an island without any has no politics
   * to be separate from the military fact. Sean's playtest found an empty rock
   * reported as *"the people did not want this"*, which is the sentence
   * reading a support number nobody holds.
   */
  populated?: boolean;
}): string[] {
  const { verdict, where, holder, aboard, allegiance, populated = true } = input;
  if (verdict === 'victory') {
    return [
      `Your troops have taken control of ${where}.`,
      !populated
        ? 'Nobody lives there. Build anything on it and it settles.'
        : allegiance < 50
          ? 'The island is hostile.'
          : 'The island is content.',
    ];
  }
  if (verdict === 'defeat') {
    return [
      'The landing has been thrown back.',
      `${holder} keeps ${where}.`,
      'No troops remain to try again.',
    ];
  }
  return [
    `The landing did not take ${where}.`,
    `${holder} keeps ${where}.`,
    `${aboard} ${aboard === 1 ? 'troop remains' : 'troops remain'} aboard.`,
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
