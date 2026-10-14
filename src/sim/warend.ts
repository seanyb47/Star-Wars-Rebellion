/**
 * What the war came to, on one screen.
 *
 * The war used to end in a single line over the chart — *"The Seven Seas are
 * yours. Victory."* — and that was the whole of it: thirty-two months of play
 * answered with eight words and a colour. Sean, asked whether the closing
 * screen should be the dispatch or the figures: *"Both, stacked."*
 *
 * So it is three things in that order and they do different jobs. The
 * **dispatch** is the closing line the log already wrote, in the world's own
 * voice. The **figures** are what each side had left, which is the only place
 * in the game the two columns are ever set side by side. The **deciding
 * lines** are the three or four entries that actually settled it, pulled out
 * of four hundred so the player does not have to go looking.
 *
 * Which lines those are is not a judgement call, because the two sides win
 * differently and each win condition names its own evidence. The Confederacy
 * wins by taking one island, so the thread is that island's last days. The
 * Crown wins by holding three people at once, so the thread is the three
 * captures. Nothing here scores events for drama; it reads the win condition
 * backwards.
 */
import factionData from '../data/factions.json';
import { craftGrade } from './missions';
import { isPrincipal } from './lords';
import type { Character, GameState, PlayableFaction } from './types';

/** What one side had left when it stopped. */
export interface WarSide {
  faction: PlayableFaction;
  islands: number;
  hulls: number;
  /** Ashore on its own islands and aboard its own decks, together. */
  troops: number;
  gold: number;
  /** The craft grade its yards had reached, 0 to 3. */
  craft: number;
  /** Its own people still at large — neither in irons nor in a cell. */
  crew: number;
  /** Of the other side's people, how many it is holding. */
  captives: number;
}

/** One of the lines that decided it. */
export interface DecidingLine {
  /** The day it happened. */
  day: number;
  text: string;
  /** Present when the log still carries the entry itself. */
  eventId?: string;
}

export interface WarReport {
  winner: PlayableFaction;
  /** From the chair the player was sitting in. */
  outcome: 'victory' | 'defeat';
  /** The closing dispatch, in the log's own words. */
  dispatch: string;
  /** Which of the two win conditions closed it, said plainly. */
  how: string;
  days: number;
  sides: Record<PlayableFaction, WarSide>;
  /** Three or four, oldest first. Fewer if the log cannot supply them. */
  deciding: DecidingLine[];
}

function sideOf(state: GameState, faction: PlayableFaction): WarSide {
  const other = faction === 'empire' ? 'alliance' : 'empire';
  const fleets = state.fleets.filter((f) => f.faction === faction);
  return {
    faction,
    islands: state.systems.filter((s) => s.control === faction).length,
    hulls: fleets.reduce((n, f) => n + f.ships.length, 0),
    troops:
      state.systems.filter((s) => s.control === faction).reduce((n, s) => n + s.garrison, 0) +
      fleets.reduce((n, f) => n + f.troops, 0),
    gold: Math.round(state.factions[faction].gold),
    craft: craftGrade(state.factions[faction].craft),
    crew: state.characters.filter((c) => c.faction === faction && c.status !== 'captured').length,
    captives: state.characters.filter((c) => c.faction === other && c.status === 'captured').length,
  };
}

/**
 * When a Lord went into irons, and the line that put them there.
 *
 * `takenOnDay` is the fact and the log entry is the sentence, and they come
 * apart on purpose: the log holds four hundred lines, so in a long war the
 * capture that decided it has scrolled out by the time the war ends. The day
 * is always there; the sentence is there when it is.
 */
function captureOf(state: GameState, lord: Character): DecidingLine {
  const entry = [...state.events]
    .reverse()
    .find((e) => e.characterId === lord.id && e.day === lord.takenOnDay);
  if (entry) return { day: entry.day, text: entry.text, eventId: entry.id };
  const held = state.systems.find((s) => s.id === lord.locationSystemId);
  return {
    day: lord.takenOnDay ?? 0,
    text: `${lord.name} was carried off and held${held ? ` at ${held.name}` : ''}.`,
  };
}

/**
 * The whole of the closing screen, or nothing while the war is still running.
 */
export function warReport(state: GameState): WarReport | undefined {
  if (!state.winner) return undefined;
  const winner = state.winner;
  const closing = [...state.events].reverse().find((e) => e.kind === 'war' && e.day > 0);

  /*
   * Both sides win by holding people now, so the evidence is symmetric.
   *
   * This used to read the *capital's* last days for a Confederate win, because
   * the Confederacy won by taking Highwater. Sean changed that on 21
   * September — *"the crown wins the map and loses the war. Let's give them
   * two characters that need to be captured also."* — so the Confederacy wins
   * by holding the Lord Regent and Admiral Blackwater at once and Highwater
   * wins nothing on its own. The thread is three captures for the Crown and
   * two for the Confederacy, and the screen reads the same way from both
   * chairs.
   *
   * `isPrincipal` rather than `isLord`, which is the same question the
   * abduction bounty had to start asking: who ends the war, not who leads the
   * Confederacy.
   */
  const deciding = state.characters
    .filter((c) => c.faction !== winner && isPrincipal(c) && c.status === 'captured')
    .map((who) => captureOf(state, who))
    .sort((a, b) => a.day - b.day);

  return {
    winner,
    outcome: winner === state.player ? 'victory' : 'defeat',
    dispatch:
      closing?.text ??
      `The ${factionData[winner].name} has won the war.`,
    how:
      winner === 'empire'
        ? 'All three of the Brethren in irons at once.'
        : 'The Regent and the Admiral in irons at once.',
    days: state.day,
    sides: { empire: sideOf(state, 'empire'), alliance: sideOf(state, 'alliance') },
    deciding,
  };
}
