import { describe, expect, it } from 'vitest';
import { PIRATE_LORDS, shipClass } from '../constants';

/**
 * The two things this project keeps re-deciding, and a guard so it stops.
 *
 * Sean, 24 September: *"change the name of jessups ship / there is no
 * firepower... we've addressed these 2 many times, so we keep getting stuck
 * here."*
 *
 * He is right, and neither is a decision that failed to land. Both landed in
 * the code on the day they were made. What neither had was anything that
 * fails when a **copy** of the decision goes stale, and this project keeps
 * four copies of every name: the sim, `CANON.md`, the world bible's §2 and §6
 * tables, and whatever doc comment happened to mention it.
 *
 * Measured on 24 September, before this file existed — three documents, three
 * different names for Hale's ship, and the one the player actually sees in
 * **none** of them:
 *
 * | Source | Hale | Jessup |
 * |---|---|---|
 * | the running game | **Open Deck** | **Adamant** |
 * | `CANON.md` | *Harbor* (the id, not the name) | *Adamant* |
 * | world bible §2 / §6 | ***Free Harbor*** | ***Ironback*** |
 *
 * Worse, the bible's staleness had been written into the changelog **twice**
 * as though it were a ruling — *"they are the record of what was designed, not
 * of what shipped"* at v8.7, repeated at v9.53. Nobody decided that; a session
 * deferred, wrote the deferral down as reasoning, and every session after read
 * it as canon and deferred again. A changelog that records decisions is worth
 * keeping. One that records deferrals as decisions manufactures doctrine.
 *
 * So: the code is the source, the docs must agree with it, and this fails when
 * they do not.
 */
const DOCS = import.meta.glob('../../../{CANON.md,seven-seas-world-bible.md}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const SIM = import.meta.glob('../*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Everything above the changelog: what is true now, not what once was. */
function current(doc: string): string {
  const at = doc.search(/^#+ .*Changelog/im);
  return at === -1 ? doc : doc.slice(0, at);
}

describe('a Lord’s ship has one name', () => {
  it('is named the same in the game and in every document', () => {
    for (const lord of PIRATE_LORDS) {
      const name = shipClass(lord.ship)?.name;
      expect(name, `${lord.name} is bound to a hull with no name`).toBeTruthy();
      for (const [path, doc] of Object.entries(DOCS)) {
        const body = current(doc);
        // The document has to name the Lord somewhere to be worth checking.
        if (!body.includes(lord.name)) continue;
        expect(
          body.includes(name!),
          `${path} names ${lord.name} but never their ship, the ${name}`,
        ).toBe(true);
      }
    }
  });

  it('does not leave a retired ship name attached to a Lord', () => {
    /*
     * The names these three have actually worn. A retired one is allowed to
     * appear in a document — the changelog has to be able to say what changed,
     * and the Ironback is still a buildable class with a legend of its own —
     * but never in the same line as the Lord it no longer belongs to.
     */
    const retired = ['Ironback', 'Free Harbor'];
    for (const [path, doc] of Object.entries(DOCS)) {
      for (const line of current(doc).split('\n')) {
        for (const lord of PIRATE_LORDS) {
          const surname = lord.name.split(' ').pop()!;
          if (!line.includes(surname)) continue;
          for (const old of retired) {
            expect(
              line.includes(old),
              `${path} still gives ${surname} the ${old}: "${line.slice(0, 90)}…"`,
            ).toBe(false);
          }
        }
      }
    }
  });
});

describe('there is no ship-level Firepower stat', () => {
  it('is not contradicted by a doc comment in the sim', () => {
    /*
     * The rule has been locked since 18 September and `navycombat.test.ts`
     * makes it impossible to reintroduce in *code*. What it could not stop was
     * the **prose**: `navy.ts` opened with "combat reads four numbers —
     * Firepower, Hull, Speed, hasLongGuns — none of which the v2.4 roster
     * carries yet", at the top of a file, where anybody orienting themselves
     * reads first. That one sentence is the likeliest source of the blocker
     * being re-raised as live, months after it dissolved.
     *
     * Mentioning Firepower is fine — denying it, explaining the history, or
     * naming the encyclopedia's own Firepower *section* are all legitimate.
     * What is not fine is a sentence that says the engine reads one.
     */
    const claims = [
      /reads (?:four|4) numbers/i,
      /roster carries yet/i,
      /derive (?:a |the )?Firepower/i,
      /Firepower (?:column|stat) (?:is|must be) (?:added|derived|supplied)/i,
    ];
    /*
     * A retired sentence quoted so the next reader can see what replaced it is
     * not the same as a live claim, and this codebase quotes with `*"…"*`
     * throughout. Strip those spans before testing, or the note explaining the
     * removal trips the check on the removal — which would make the correction
     * un-writable and leave the next hand no choice but to delete the history.
     */
    const live = (src: string) => src.replace(/\*"[\s\S]*?"\*/g, ' ');
    for (const [path, src] of Object.entries(SIM)) {
      for (const claim of claims) {
        expect(
          claim.test(live(src)),
          `${path} still describes a Firepower the engine has not got`,
        ).toBe(false);
      }
    }
  });

  it('still says so somewhere a reader will land', () => {
    // The denial is load-bearing: without it the next reader re-derives the
    // question from the three gun columns and reopens the whole thing.
    const denials = Object.values(SIM).filter((src) =>
      /no ship-level Firepower stat/i.test(src),
    );
    expect(denials.length, 'nothing in the sim states the rule any more').toBeGreaterThanOrEqual(2);
  });
});
