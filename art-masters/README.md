# Masters

The paintings as they were delivered, at full resolution. Nothing here is read
by the game, shipped to the browser, or included in the build — `src/ui/painted.ts`
globs `src/art/` only, and Vite copies `public/`. This folder exists purely so a
painting can be changed later without asking for it again.

## Why it exists

The file the game ships is small and cropped: a dispatch scene is 1024×432 at
about 75KB, cut out of a delivery two to four times that size. Once only the
small one exists, three ordinary requests become impossible:

- *"Move that up a bit."* — There is nothing left above it to move into.
- *"Can we get it a bit wider?"* — There is no wider.
- *"Use it bigger on the card."* — It would be upscaled mush.

With the master kept, all three are one command against a recorded crop box.

## Format

**WebP, quality 96, at the delivered pixel dimensions.** A master that is itself
lossy is a compromise and worth naming: lossless WebP of a 1932×814 painting is
1.8MB against 0.5MB at quality 96, and the measured difference after re-cropping
and downscaling to shipping size is 1.4 per channel out of 255. Sixty-odd
subjects is the difference between a 15MB repository and a 60MB one, and nobody
can see the 1.4.

If you have the true original — the PNG straight out of the generator — keep it
wherever you keep such things. This is the working master, not the archive.

## Layout

```
art-masters/
  portraits/  ships/  islands/  scenes/    mirrors src/art/
  _retired/<folder>/<slug>.v1.webp         replaced masters, kept
```

Replacing a painting retires the old master rather than overwriting it, so a
change can be undone. See `../ASSETS.md` for the register and
`../scripts/art.py` for the tool that writes both.
