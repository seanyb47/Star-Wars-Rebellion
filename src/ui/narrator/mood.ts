/**
 * The three moods an advisor can be in, and the only three.
 *
 * They follow the tone of the answer, not the state of a battle: trouble
 * spreading is grave, a defection landing or the war going well is
 * encouraged, anything else is neutral. Every still, every idle clip and
 * every voice line is keyed to one of these, so the set is locked here and
 * nowhere else — a fourth mood is a new batch of art, not a new string.
 * See docs/narrator-build.md, step A3.
 */
export const NARRATOR_MOODS = ['neutral', 'grave', 'encouraged'] as const;
export type NarratorMood = (typeof NARRATOR_MOODS)[number];

/** The two advisors, by the stem their files use. */
export const NARRATOR_IDS = ['marlow', 'pennywhistle'] as const;
export type NarratorId = (typeof NARRATOR_IDS)[number];

/** The five questions a line can answer, plus the tutorial. */
export const NARRATOR_QUESTIONS = ['tutorial', 'build', 'free', 'trouble', 'defect', 'war'] as const;
export type NarratorQuestion = (typeof NARRATOR_QUESTIONS)[number];
