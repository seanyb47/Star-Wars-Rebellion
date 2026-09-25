import type { MissionType } from '../sim';

/**
 * One colour per kind of mission, wherever a mission shows its face.
 *
 * Sean, 24 September: *"Add a color border corresponding to the mission type
 * (and color type of the mission from the log and thumbnail)."* There was no
 * such colour — the log gave every mission the same grey dot and the choice
 * sheet gave every mission the same frame, so the one thing a glance could
 * have told you was which kind of work was going on, and it did not.
 *
 * **Grouped by the kind of work rather than spread round the wheel.** Ten
 * arbitrary colours is ten things to learn; four families is one. Warm golds
 * talk, hot colours make trouble, violets do it quietly, and cool colours
 * build or look. Inside a family the shades differ enough to tell apart side
 * by side, which is the only place two of them ever appear together.
 *
 * **Clear of the faction colours on purpose.** `--empire` is #4fc46a and
 * `--alliance` is #d8483f, and a rim that reads as a side rather than as a job
 * would be worse than no rim: the tile already says whose the person is. So
 * nothing here is a pure green or a pure red — `incite` is the closest and is
 * deliberately orange of it.
 *
 * The tokens live in `styles.css` beside the faction colours, and this is the
 * one place that maps a type to one, the way `allegianceColour` is the one
 * place that maps a faction to one.
 */
export function missionTint(type: MissionType): string {
  return `var(--m-${type})`;
}

/** The families, kept here so the stylesheet and the encyclopedia agree. */
export const MISSION_FAMILY: Record<MissionType, 'talk' | 'trouble' | 'quiet' | 'work'> = {
  diplomacy: 'talk',
  recruit: 'talk',
  incite: 'trouble',
  sabotage: 'trouble',
  abduct: 'quiet',
  espionage: 'quiet',
  rescue: 'quiet',
  survey: 'work',
  research: 'work',
  command: 'work',
};
