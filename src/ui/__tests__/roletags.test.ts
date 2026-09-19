import { describe, expect, it } from 'vitest';
import characterRoster from '../../data/characters.json';
import { glossaryAnchor, glossaryWords } from '../Glossary';
import { surnameOf } from '../Almanac';

/**
 * Role tags, and the two promises the encyclopedia now makes about them.
 *
 * Sean, 19 September: *"make their role tags clickable to glossary term."*
 * A tag is only a link when the glossary has the word, which keeps a dead
 * link off the screen but also makes it very easy for a role to quietly stop
 * being tappable — add `Quartermaster` to somebody in `characters.json` and
 * nothing anywhere complains, the chip just goes grey. So the check lives
 * here instead: every tag the cast actually wears has an entry written for it.
 *
 * Eleven tags, and nine of them had no entry anywhere in the game until this
 * pass. Four are read by the sim — Recruiter gates Recruitment, Leader and
 * General gate Command, Negotiator and Spec Ops are worth a bonus at the
 * errand they suit — and the rest are labels. The glossary says which is
 * which, because nothing on the card can.
 */
const everyone = [
  ...characterRoster.empire,
  ...characterRoster.alliance,
  ...characterRoster.recruits,
] as Array<{ name: string; roles?: string[] }>;

function everyRole(): string[] {
  return [...new Set(everyone.flatMap((c) => c.roles ?? []))].sort();
}

describe('crew role tags', () => {
  it('has the cast it thinks it has', () => {
    expect(everyone).toHaveLength(26);
    expect(everyRole()).toHaveLength(11);
  });

  it('gives every tag anybody wears a glossary entry to open', () => {
    const known = glossaryWords();
    const orphans = everyRole().filter((role) => !known.has(role.toLowerCase()));
    // Named rather than counted, so a failure says which word needs writing.
    expect(orphans).toEqual([]);
  });

  it('turns a tag into the anchor the glossary row carries', () => {
    // The two that are not one plain word are the ones worth pinning: a space
    // and a hyphen both have to survive the trip or the tag scrolls nowhere.
    expect(glossaryAnchor('Spec Ops')).toBe('spec-ops');
    expect(glossaryAnchor('Wing-Captain')).toBe('wing-captain');
    expect(glossaryAnchor('Latent Deep-touched')).toBe('latent-deep-touched');
  });
});

describe('A-Z on the crew page', () => {
  it('files a person under the last word of their name', () => {
    expect(surnameOf('Admiral Corvus Blackwater')).toBe('Blackwater');
    expect(surnameOf('Anselm "Big" Torvik')).toBe('Torvik');
    expect(surnameOf('Rosalind "Ros" Carrow')).toBe('Carrow');
    // A mononym is its own surname, and the one name with the article in
    // front of it files under the name rather than under The.
    expect(surnameOf('Sable')).toBe('Sable');
    expect(surnameOf('The Widow Ashgrave')).toBe('Ashgrave');
  });

  it('gives the whole cast a surname that is not a title', () => {
    const titles = ['Admiral', 'Captain', 'Colonel', 'Governor', 'Lord', 'Regent', 'Doctor', 'The'];
    for (const person of everyone) {
      const surname = surnameOf(person.name);
      expect(surname, person.name).not.toBe('');
      expect(titles, person.name).not.toContain(surname);
    }
  });

  it('sorts to something a reader can scan', () => {
    const crown = characterRoster.empire
      .map((c) => surnameOf(c.name))
      .sort((a, b) => a.localeCompare(b, 'en'));
    expect(crown[0]).toBe('Blackwater');
    expect(crown).toEqual([...crown].sort((a, b) => a.localeCompare(b, 'en')));
  });
});
