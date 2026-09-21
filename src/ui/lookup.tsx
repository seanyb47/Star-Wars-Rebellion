import { createContext, useContext, type ReactNode } from 'react';
import { SHIP_CLASSES } from '../sim/constants';

/** The encyclopedia's tabs, by the name the Almanac knows them by. */
export type EncPage =
  | 'people'
  | 'companies'
  | 'works'
  | 'ships'
  | 'islands'
  | 'glossary'
  | 'rules';

/**
 * Open the encyclopedia at a particular thing.
 *
 * Sean's: *"Units should be larger images and less text. They also should be
 * able to be clicked on and taken to the encyclopedia reference... We want
 * image and minimal possible text in gameplay screens. Click on them for
 * stats, lore, an even larger picture."*
 *
 * Every panel that draws a unit is three or four components deep inside a
 * sheet, and the encyclopedia is held open by the app at the top. Threading a
 * callback down every one of those was going to mean a prop on a dozen
 * components that only ever gets passed on, so it goes through context
 * instead: a screen asks to look something up and does not need to know who
 * answers.
 *
 * `entry` is a slug, matched against the anchors the Almanac puts on every
 * entry — a works type, a company id, a hull class, an officer's name. Leave
 * it out to land at the top of the page.
 */
export type LookUp = (page: EncPage, entry?: string) => void;

const LookUpContext = createContext<LookUp | undefined>(undefined);

export function LookUpProvider({ value, children }: { value: LookUp; children: ReactNode }) {
  return <LookUpContext.Provider value={value}>{children}</LookUpContext.Provider>;
}

/**
 * Ask for the encyclopedia. Undefined where nothing is providing it — the
 * style gallery, a test — and every caller treats that as "no lookup here"
 * rather than crashing.
 */
export function useLookUp(): LookUp | undefined {
  return useContext(LookUpContext);
}

/**
 * The entry to open for a hull.
 *
 * There used to be a hand-kept crosswalk here, mapping each of the old
 * roster's twenty-four hulls onto its counterpart in the new one so that a `?`
 * on a ship row would open the right encyclopedia page — with four hulls left
 * deliberately unmapped, because the new fleet had cut them rather than
 * renaming them. It carried a note saying it would delete itself the day the
 * live roster swapped.
 *
 * That was 21 September. Every hull the game sails is a hull out of the sheet
 * now and carries the sheet's own key on it, so there is nothing left to
 * translate.
 */
export function encyclopediaShip(classId: string): string | undefined {
  return SHIP_CLASSES.find((c) => c.id === classId)?.rosterId;
}
