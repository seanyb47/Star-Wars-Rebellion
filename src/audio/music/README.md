# Music

Drop a track here and it plays. Nothing needs registering — the glob in
`../music.ts` finds whatever is present at build time, and with no files the
game sounds exactly as it does without them.

| file | when it plays |
|---|---|
| `empire.opus` | the Crown Imperium's theme, on a loop |
| `alliance.opus` | the Free Confederacy's |
| `empire-intro.opus` | optional — played once, then the loop comes in under it |
| `alliance-intro.opus` | optional |

Any format the browser can decode: `.opus`, `.ogg`, `.m4a`, `.mp3`, `.aac`,
`.wav`. **Opus in `.ogg` or AAC in `.m4a`** are both small and both play
everywhere this game runs — around 2-3MB for a four-minute track at 96kbps. A
`.wav` will work and will be thirty times that, which the browser then has to
download before a note is heard.

## Looping is handled

A theme written as a piece of music ends, and looped whole it thuds every time
it wraps. `findLoop` looks for the point late in the track whose sound best
matches a point early in it and loops between those two, which is what a
musician would pick by ear. It compares a coarse energy envelope rather than
the samples, because two musically identical bars are never sample-identical
and correlating raw audio finds phase rather than phrase.

If nothing matches well enough it loops the whole file and says nothing — a
seam is better than a loop that lands mid-phrase.

So there is no need to regenerate a track as a loop. If you would rather
control it, supply `<faction>-intro` as well and the loop crossfades in as the
intro ends.

## The bed

The rest of the game's sound is synthesised in the browser — the sea, the
rigging, the bell, the stingers — so it works offline. Music ducks that bed
rather than replacing it: the score sits on top the way it would in a film, and
cutting the sea entirely made the game sound like a menu.
