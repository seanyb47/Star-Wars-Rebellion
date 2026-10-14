import { describe, expect, it } from 'vitest';

/**
 * The moment between two answers, said on the screen.
 *
 * Sean's ruling of 11 October is that both sides answer each round, which
 * creates a state the sheet never had: you have chosen, the broadside has not
 * happened, and the game is waiting on somebody who is not in the room. A
 * screen that leaves a tapped button looking untapped through that moment is
 * a bug report rather than a pause, so the sim hands the sheet `waitingOn` and
 * `answered` and the sheet has to use them.
 *
 * Read as source text, because this suite has no React renderer — the same way
 * `vocabulary.test.ts` and the rest of `src/ui/__tests__` work.
 */
const SHEET = Object.values(
  import.meta.glob('../BattleSheet.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>,
)[0];

const CSS = Object.values(
  import.meta.glob('../styles.css', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>,
)[0];

describe('the battle sheet while the other side is deciding', () => {
  it('reads what it is waiting for out of the sim rather than guessing', () => {
    // Both come off `battleView`, which derives them for this seat. A sheet
    // that worked it out from `state.battle.answers` itself would be a second
    // implementation of a rule that has to agree on two machines.
    expect(SHEET).toMatch(/view\.waitingOn/);
    expect(SHEET).toMatch(/view\.answered/);
  });

  it('says whose answer is outstanding, by name', () => {
    // Not "waiting…" — which side. The player knows the war has two people in
    // it and wants to know which of them is thinking.
    expect(SHEET).toMatch(/Waiting on the/);
    expect(SHEET).toMatch(/factionData\[view\.waitingOn\[0\]/);
  });

  it('locks both choices once you have answered', () => {
    /*
     * The failure this prevents: tapping Fight, seeing nothing happen, and
     * tapping Break Off instead. Only one answer can be true and the second
     * tap would silently replace the first — so between your answer and
     * theirs, neither button takes another.
     */
    const foot = SHEET.slice(SHEET.indexOf('dispatch__foot--choice'));
    expect(foot).toMatch(/onClick=\{onBreakOff\}[\s\S]*?disabled=\{answered/);
    expect(foot).toMatch(/onClick=\{onFight\}[\s\S]*?disabled=\{answered\}/);
  });

  it('holds the report up until both have read it', () => {
    // The consent rule on the quieter half of the sheet: one player tapping
    // Close must not take the report off the other player's screen.
    const settled = SHEET.slice(SHEET.indexOf('view.settled ? ('), SHEET.indexOf('dispatch__foot--choice'));
    expect(settled).toMatch(/onClick=\{onClose\}/);
    expect(settled).toMatch(/disabled=\{answered\}/);
  });

  it('is a state the player can see, not only one the buttons know about', () => {
    // A disabled button is not an explanation. There is a line of prose too,
    // and it has somewhere to be drawn.
    expect(SHEET).toMatch(/battle__waiting/);
    expect(CSS).toMatch(/\.battle__waiting\s*\{/);
  });

  it('does not claim to be waiting when the machine has the other side', () => {
    /*
     * `answered` has to mean *answered and waiting*, not merely answered.
     * Against the machine the round resolves on the tap, so there is never a
     * moment to report — and a sheet that locked its buttons on the answer
     * alone would flash them disabled on every single round of every
     * single-player action.
     */
    expect(SHEET).toMatch(
      /const answered =\s*view\.answered !== undefined && view\.waitingOn\.length > 0/,
    );
  });
});
