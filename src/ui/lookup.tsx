import { createContext, useContext, type ReactNode } from 'react';
import { ROSTER } from '../sim/shipdefs';

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
 * There used to be a translation table here, mapping each of the twenty-four
 * hulls the game sailed onto its counterpart among the twenty-eight the
 * encyclopedia held — Kestrel to Interceptor I, Reef-class to Coral-Class,
 * four hulls with no counterpart at all deliberately left unmapped. Its note
 * said *"the whole map deletes itself the day the live roster swaps"*, and
 * this is that day: a hull the game sails **is** a hull on the sheet, and its
 * id is the sheet's own Ship ID.
 *
 * Kept as a function rather than inlined at the call sites, because what a `?`
 * opens is a question worth having one answer to, and because the three
 * legends still have no entry: nothing builds them and the sheet has never
 * heard of them.
 */
export function encyclopediaShip(classId: string): string | undefined {
  return ROSTER.byId.has(classId) ? classId : undefined;
}
