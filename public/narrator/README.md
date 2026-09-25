# Narrator assets

Served verbatim by Vite as `/narrator/…`. The plan that governs this tree is
`docs/narrator-build.md`; the checklist at its top says what is filed and
what is still owed.

- `stills/` — six PNGs: `marlow_neutral.png`, `marlow_grave.png`,
  `marlow_encouraged.png`, `pennywhistle_neutral.png`,
  `pennywhistle_grave.png`, `pennywhistle_encouraged.png`, plus a `_tab.png`
  crop of each neutral. `web/` holds the 512×640 WebP copies the game
  actually loads, made by `npm run narrator:web`; the PNGs are the masters. `retired/` holds Secretary Crane's set and the first, too-grim
  advisor set (`v1-grim/`).
- `video/` — optional: up to six idle loops, one per mood (`marlow_neutral_idle.mp4`
  and so on), H.264, 512×640, 24 fps, each under ~500 KB. Speaking and mood
  are done in code from the stills; a loop only adds breath and a blink.
- `audio/` — one MP3 per line, named by the line's `id`.
- `voicelines.json` — the manifest. Append-only. `id` is the filename stem
  and is never renumbered; `rendered` is flipped by `scripts/render_voicelines.py`
  and by nothing else.

  `question` is what makes the line play. Six of them are the advisor's own
  sheet — the questions you can ask her — and thirteen exist in total because
  the seven kinds of news in the log are cues too, written `news_war`,
  `news_flip`, `news_mutiny`, `news_battle`, `news_mission`, `news_order`,
  `news_loss`. Sean, 22 September: *"Can you add sound effects for each
  notification? And voice also."* The prefix is not decoration: `war` is both
  a question she answers and a kind of news, and without it she would answer
  "how is the war going" every time a war ended.

  **Nothing is rendered yet.** The world bible's `narrator-voices` block has
  no voice ids in it, so `npm run voices` writes nothing and says so, and the
  game is silent on the Narrator column by design rather than by accident.
  Fill the block in, set `ELEVENLABS_API_KEY`, run it, and forty-two lines
  land in `audio/` and start playing with no other change.

Run `npm run narrator:check` to see what is missing or misnamed.
