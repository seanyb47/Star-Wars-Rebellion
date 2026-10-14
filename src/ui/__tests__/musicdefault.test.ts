import { describe, expect, it } from 'vitest';

/**
 * Music is on unless somebody turned it off, and it starts on the first tap.
 *
 * Sean, 24 September: *"Make game music play by default from start. Or at
 * launch give people option."* Both. The two halves fight each other in a
 * browser and this is the shape that settles it, so it is worth a test that
 * fails when somebody quietly flips it back:
 *
 * 1. The stored preference is an **opt-out**. Reading `=== 'on'` made the
 *    absent value and the off value the same answer, which is how a game with
 *    a commissioned score shipped silent to everybody who never found the
 *    speaker.
 * 2. Nothing may autoplay. The first note sounds inside a **real tap**, because
 *    every browser refuses otherwise — so the title screen's own buttons are
 *    where the engine starts, not an effect on mount.
 * 3. There is a mute **on the title screen**, since the top bar's speaker does
 *    not exist until a game does.
 */
const SRC = import.meta.glob('../{useAudio.ts,StartScreen.tsx,App.tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const audio = SRC['../useAudio.ts'];
const start = SRC['../StartScreen.tsx'];
const app = SRC['../App.tsx'];

describe('sound is on by default', () => {
  it('treats the stored preference as an opt-out', () => {
    expect(audio).toMatch(/localStorage\.getItem\(SOUND_KEY\) !== 'off'/);
    // The old reading, which made "never chose" mean "chose silence".
    expect(audio).not.toMatch(/getItem\(SOUND_KEY\) === 'on'/);
  });

  it('still writes off as off, so a mute survives a reload', () => {
    expect(audio).toMatch(/setItem\(SOUND_KEY, next \? 'on' : 'off'\)/);
  });

  it('falls back to on when storage is refused', () => {
    // A private window is not a complaint about the music.
    const guard = audio.slice(audio.indexOf('function readPreference'));
    const body = guard.slice(0, guard.indexOf('\n}'));
    expect(body).toMatch(/catch[\s\S]*return true/);
  });
});

describe('but nothing autoplays', () => {
  it('starts the engine only from inside a gesture', () => {
    // `start()` is reached through `resume` or `startWith`, and both are called
    // from a handler. Nothing may call them from a bare mount effect.
    expect(audio).toMatch(/startWith/);
    const mount = audio.match(/useEffect\(\(\) => \{\s*void (resume|startWith)/);
    expect(mount, 'audio must not start on mount').toBeNull();
  });

  it('leaves the title screen to start its own music', () => {
    // The blanket first-tap listener would race a faction card and lay down
    // whichever side newGame() defaulted to.
    expect(audio).toMatch(/if \(!inGame \|\| !on \|\| engine\.current\?\.running\) return;/);
    expect(app).toMatch(/useAudio\(state, started\)/);
  });

  it('hears the side the player just pressed, not the default one', () => {
    expect(start).toMatch(/onHear\(id\)/);
    expect(app).toMatch(/onHear=\{\(side\) => void sound\.startWith\(side\)\}/);
    // Continuing a save knows its side too.
    expect(app).toMatch(/sound\.startWith\(saved\.player\)/);
  });
});

describe('and the option is there at launch', () => {
  it('puts a mute on the title screen', () => {
    expect(start).toMatch(/onToggleSound/);
    expect(start).toMatch(/start__sound/);
    expect(start).toMatch(/aria-label=\{soundOn \? 'Turn sound off' : 'Turn sound on'\}/);
    expect(app).toMatch(/onToggleSound=\{sound\.toggle\}/);
  });

  it('asks nobody for permission first', () => {
    // A dialog before the game is a click nobody wanted. If one ever appears
    // this should be reconsidered deliberately rather than by accident.
    expect(start).not.toMatch(/Enable sound|Allow (music|audio)|Play music\?/i);
  });
});
