import { describe, expect, it } from 'vitest';

/**
 * The Defenses tab answers two questions and stops.
 *
 * Sean, 24 September: *"Only things I care here are troops + if there is a
 * commander. Don't need hulls or guns listed."*
 *
 * The tab was carrying a table — a row per battery, each with its own pair of
 * numbers, *6 against a landing · 4 against shot*, under a paragraph of siege
 * rules. Those figures are **constants**: every fort in the game carries the
 * same pair and every heavy fort the same heavier pair, so the table printed
 * the same twelve lines on every island that has ever had a wall. The one
 * figure that changes island to island is how many are standing, which is a
 * count and not a list.
 *
 * The commander is the other half and was not on this screen at all — only as
 * a term inside the watch's arithmetic, *"3 from the chair"*, which answers
 * how much harder a quiet mission is rather than *is somebody holding this
 * place*.
 */
const SRC = (
  import.meta.glob('../SystemSheet.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>
)['../SystemSheet.tsx'];

describe('what the Defenses tab says', () => {
  it('names whoever has the chair', () => {
    expect(SRC).toMatch(/has the chair/);
    expect(SRC).toMatch(/system\.commanderId/);
  });

  it('counts the batteries rather than listing them', () => {
    expect(SRC).toMatch(/batteries' : 'battery|battery' : 'batteries/);
    // No row per fort: the map that printed one line each is gone.
    expect(SRC).not.toMatch(/walls\.map\(/);
  });

  it('prints no fort combat figures', () => {
    for (const gone of ['FORT_INVASION_DEFENSE', 'FORT_BOMBARD_DEFENSE']) {
      expect(SRC, `${gone} is back on the island sheet`).not.toContain(gone);
    }
    // The constants are the guard rather than the prose: they are the only
    // source of those figures, so the numbers cannot come back without them.
    // Matching on the sentence instead caught the comment that explains why
    // the sentence went, which would make the note un-writable.
  });

  it('sends the siege rules to where the rules live', () => {
    // The same move as the odds block off the character sheet on 21
    // September: *"This should be in rules not character block."*
    expect(SRC).toMatch(/to="rules" at="bombardment"/);
  });
});
