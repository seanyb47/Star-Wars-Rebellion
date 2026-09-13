# Narrator assets

Served verbatim by Vite as `/narrator/…`. The plan that governs this tree is
`docs/narrator-build.md`; the checklist at its top says what is filed and
what is still owed.

- `stills/` — six PNGs: `crane_neutral.png`, `crane_grave.png`,
  `crane_encouraged.png`, `pennywhistle_neutral.png`,
  `pennywhistle_grave.png`, `pennywhistle_encouraged.png`.
- `video/` — twelve MP4s, H.264, 512×640, 24 fps, each under ~500 KB. The
  names are fixed; `scripts/check_narrator_assets.py` knows them.
- `audio/` — one MP3 per line, named by the line's `id`.
- `voicelines.json` — the manifest. Append-only. `id` is the filename stem
  and is never renumbered; `rendered` is flipped by `scripts/render_voicelines.py`
  and by nothing else.

Run `npm run narrator:check` to see what is missing or misnamed.
