# Narrator Advisors — Animated Portraits & Voice Build

**Project:** Master of the Seven Seas
**Scope:** Animated talking-head portraits and pre-rendered voice lines for the two advisor characters shown in the Narrator sheet (`src/ui/Narrator.tsx`).

---

## Status — managed by Claude Code

Sean's plan is below, unchanged. This block is the live checklist; it is the
only part of the file Claude Code edits. Last updated 2026-09-13 (A1, A2 locked).

| Step | Owner | State | Note |
|---|---|---|---|
| A1 visual paragraphs | HUMAN | done | Locked in the world bible §16.1, 2026-09-13 |
| A2 art direction, three words | HUMAN | done | "painterly, weathered, cinematic", §16.2 |
| A3 moods locked | BOTH | done | `neutral` / `grave` / `encouraged` — `src/ui/narrator/mood.ts` is the only definition |
| A4 asset directories | CLAUDE CODE | done | `public/narrator/{video,audio,stills}` + `voicelines.json` — see the path note below |
| B1–B7 six stills | HUMAN | **can start now** | Paste `docs/chatgpt-brief.md` as the first message of one chat; it holds everything. Deliver the six PNGs to Google Drive under the fixed names |
| B8 file the stills | CLAUDE CODE | waiting on B6 | Claude Code pulls them from Google Drive by name, files them, runs `npm run narrator:check` |
| C1–C6 twelve clips | HUMAN | blocked on B | Raw clips are 5–15 MB, over what the Drive connector can move: upload them to the repo at `public/narrator/video/raw/` through the GitHub web UI, the way the music came. No cleanup — Claude Code does Phase D |
| D1–D4 cleanup and export | CLAUDE CODE | blocked on C | Taken over from Sean: loop seams, accent trims and the 512×640 H.264 export are done here with ffmpeg |
| D5 naming enforced | CLAUDE CODE | done (checker) | `scripts/check_narrator_assets.py` knows the twelve names |
| D6 tab-bar figures stay static | CLAUDE CODE | noted | Applied when F is wired: the tab bar keeps the drawn figures; video only in the sheet |
| E1 audition voices | HUMAN | **can start now** | Independent of the art. The brief — sound, tone, diction, tics, moods, TTS direction — is the world bible §16.4 |
| E2 locked voice settings in the bible | HUMAN → CLAUDE CODE | **blocked on Sean** | JSON slot in the world bible §16; the render script refuses to run until it is filled |
| E3 first twenty lines | HUMAN | **can start now** | Append to `public/narrator/voicelines.json`, `rendered: false`. Write them against §16.4 |
| E4 no variables in any line | BOTH | rule recorded | The checker rejects a line containing `{`, `}` or `[` |
| E5 `voicelines.json` | CLAUDE CODE | done (empty) | Schema below; ids permanent |
| E6 render script | CLAUDE CODE | done | `npm run voices` — append-only, skips `rendered: true`, settings from the bible only |
| E7 render the twenty | HUMAN | blocked on E2, E3 | Needs `ELEVENLABS_API_KEY` in the environment |
| F1–F7 wiring | CLAUDE CODE | **held until E7** | Per the sequencing rule: hear the first twenty in context first |

**Path note.** The plan says `/assets/narrator/`. In this project the only
directory Vite serves verbatim at runtime is `public/`, so the tree lives at
`public/narrator/` and is reachable in the app as `/narrator/video/…`,
`/narrator/audio/…`. Same layout, one directory over. Media files are not
bundled, which is what you want for twelve MP4s.

**Google Drive.** Deliverables go to `7 Seas / Narrators /` — subfolders
`stills`, `video`, `audio`. Claude Code pulls from these by name. Folder ids,
for the Drive connector: Narrators `1xdBFSUEXgHS8bk0PhFOcA6pfP5aIIBTc`,
stills `12TC_zFqGyvu9tP4XieGrZkewn8-DnrHq`, video
`1ephzhUQIy_Qrse3v69EtoXoMthurwUD5`, audio `1S_ijodgp_eiZyaGrFljlp0HXn0MIDndn`.
The connector handles files up to about 5 MB; Kling's raw clips are larger
than that, so those come by GitHub upload instead — see the note at Phase C.

**What Sean can do today, in parallel:** B (the six stills, prompts
below); E1 and E2 (unblocks the voices); E3 (the twenty lines). Everything
Claude Code owns after that runs from those.

### Prompts, ready to paste

Assembled from the locked paragraphs and the three words, so nothing has to
be retyped. One ChatGPT thread for all six (B1).

**B2 — Crane, neutral.**

> Painted portrait of A tall, narrow man held perfectly straight, as if hung from a hook rather than standing. A long face the grey of wet slate, no colour in the lips, and eyes so pale they are almost the colour of the whites — set wide, lashless, and never once closing. Iron-grey hair combed flat to the skull with something that has dried hard. He wears the Admiralty's black: a high-collared coat buttoned to the throat, a white stock beneath it starched to a blade, one brass button at the collar bearing the Crown's fouled anchor, and a thin brass chain running from the collar to a pocket ledger he is never seen to open. The signature detail: along the seam of one collar-wing a fine white coral has grown, the warding kind the Crown grows over its hulls, spreading across the black cloth like frost — the only thing on him that is visibly alive, and it is not him. He should make the viewer sit up straighter and feel that whatever they are about to say has already been written down. Chest-up, three-quarter angle facing slightly left, dim formal interior, cold light from the left. Painterly, weathered, cinematic fantasy game art, muted palette. Vertical 4:5 framing.

**B4 — Pennywhistle, neutral, same thread.**

> Now a second character in exactly the same art style, lighting treatment, and framing as the previous portrait: A big, battered sea-parrot, salt-stiff and heavier than a parrot has any right to be, perched on a length of whalebone lashed to a stanchion. Plumage in the Confederacy's own patchwork: a rust-red body faded to pink at the breast, a mantle of squid-ink blue-black across the shoulders, wing coverts that look dyed rather than grown, and a ragged tail with two feathers missing. The beak is a big grey hook with a chip out of the upper edge. One eye — the left — is a hard yellow ring around a black pupil that is fixed on the viewer and does not wander; where the right eye was there is a puckered scar under a tiny square of leather stitched on with sailmaker's thread and finished with a bone button. The signature detail: a brass ring on one leg with three links of snapped chain still hanging from it. Somebody owned him once. He is leaning forward off the perch, weight on one foot, head cocked to bring the good eye round. He should make the viewer want to laugh and know that he is about to make it worse. Painterly, weathered, cinematic. Vertical 4:5 framing.

**B5 — moods, one at a time, same thread, each character.**

> Same character, same pose, same lighting — change only the expression to grave.

> Same character, same pose, same lighting — change only the expression to encouraged.

For Crane "grave" should read as even stiller, "encouraged" as the faintest
tilt of the head; for Pennywhistle "grave" is hunched and low, "encouraged"
is upright and bright. That is what the clips in Phase C will amplify, so
the stills should already lean that way.

If the style drifts (B7): re-upload the Crane neutral still and say "match
this style exactly."

---

## How to read this document

Steps are marked with who does them:

- **[HUMAN]** — Sean does this by hand. Creative judgment, or a paid web UI an agent can't drive.
- **[CLAUDE CODE]** — the agent owns this. Scripts, file management, wiring, manifests.
- **[BOTH]** — Sean decides, Claude Code records or implements.

Claude Code: do not attempt to generate images or audio yourself. Your job is the manifest, the render script, the file conventions, and the in-app wiring. Flag the **[HUMAN]** steps as blockers and wait.

---

## The two characters

**Secretary Crane** — the Crown Imperium's advisor. The Regent's grey, unblinking private secretary, who may not be alive. Stands at the Crown end of the tab bar.

**Mr Pennywhistle** — the Free Confederacy's advisor. A one-eyed talking sea-parrot the Confederacy can't get rid of. Sits on a perch at the Confederacy end of the tab bar.

Tapping either opens the Narrator sheet, where they answer five questions from live game state — where you can build, who is free, where the trouble is, who might come over, how the war goes — each in their own voice.

**Design intent:** these two are opposites in every register. Crane is stillness, flat affect, and formality. Pennywhistle is staccato motion, wobble, and noise. If a player can tell which advisor is open with the screen covered, the build worked.

---

## Phase A — Lock the specs

> Do this entire phase before generating anything. Everything downstream inherits it.

**A1. [HUMAN]** Write a one-paragraph visual description of each character into the world bible (`seven-seas-world-bible.md`). Cover: build, face, clothing/plumage, one signature detail, and what the viewer should feel.

**A2. [HUMAN]** Pick the art direction in three words — e.g. "painterly, muted, weathered." This string gets pasted into every image prompt from here forward.

**A3. [BOTH]** Lock the three moods: **neutral**, **grave**, **encouraged**. These map to the tone of the Narrator's answer, not to combat. Claude Code: treat these as the only valid mood values in the codebase.

**A4. [CLAUDE CODE]** Create the asset directories:

```
/assets/narrator/
  /video/
  /audio/
  /stills/
  voicelines.json
```

---

## Phase B — The six stills (ChatGPT Plus)

> The single most important phase. Budget 3-4 hours. Quality is won or lost here.

**B1. [HUMAN]** ChatGPT Plus, ~$20/mo. Open **one** new chat. Every still comes out of this single thread — the thread context is what holds the characters consistent.

**B2. [HUMAN]** Generate Crane, neutral:

> Painted portrait of [Crane paragraph]. Chest-up, three-quarter angle facing slightly left, dim formal interior, cold light from the left. Painterly fantasy game art, muted palette. Vertical 4:5 framing.

**B3. [HUMAN]** Iterate in-thread until right. Download. **This is the style anchor** — every other image is matched to it.

**B4. [HUMAN]** Generate Pennywhistle, neutral, same thread:

> Now a second character in exactly the same art style, lighting treatment, and framing as the previous portrait: [Pennywhistle paragraph], perched.

If the style drifts, re-upload the anchor and say "match this style exactly."

**B5. [HUMAN]** Mood variants, in-thread, one at a time:

> Same character, same pose, same lighting — change only the expression to [grave / encouraged].

**B6. [HUMAN]** You now have **6 stills**. Download all. Open them side by side at full size. Confirm nobody turned into a different character between moods. Fix now.

**B7. [HUMAN]** Known trap: ChatGPT tends to subtly redraw the whole image on each edit rather than changing only the face. Check that background details and clothing didn't wander. If the thread gets long and quality slips, start a fresh chat and upload the anchor as reference.

**B8. [CLAUDE CODE]** File the six stills as `/assets/narrator/stills/[character]_[mood].png`.

---

## Phase C — Animation (Kling)

**C1. [HUMAN]** klingai.com, standard plan ~$8/mo. Image-to-video, 5 seconds, standard mode.

**C2. [HUMAN]** Crane idles — one per mood:

> near-total stillness, no blinking, no breathing, only light shifting across the face and the faintest drift of fabric, camera completely static, no zoom, no pan

- grave → even stiller
- encouraged → the faintest tilt

Crane's unblinking stillness is characterization, not a shortcut — but it also happens to be the easiest thing for a video model to render cleanly, so these will loop almost seamlessly.

**C3. [HUMAN]** Pennywhistle idles — one per mood:

> subtle idle animation, sharp small head movements, occasional feather ruffle, shifting weight on the perch, single eye tracking, camera completely static, no zoom, no pan

- grave → hunched, low
- encouraged → bobbing, bright

**C4. [HUMAN]** Accent clips, generated from the **neutral** still only:

- Crane: slow head turn, slight forward lean **(2 clips)**
- Pennywhistle: head cock, wing ruffle, hop, squawk-laugh **(4 clips)**

**C5.** Running total: **12 clips.**

**C6. [HUMAN]** Keep `camera completely static, no zoom, no pan` in every single prompt. Without it the model will start drifting and slowly pushing in, which destroys the loop.

---

## Phase D — Cleanup (DaVinci Resolve, free)

**D1. [HUMAN]** Download Resolve from blackmagicdesign.com. The free version does everything needed.

**D2. [HUMAN]** Each **idle** clip: scrub the last second, find the frame closest to frame one, cut there. Duplicate on a second track, overlap by 6 frames, add a cross dissolve. Preview the loop three times — if you can't spot the seam, it's done.

**D3. [HUMAN]** Each **accent** clip: no looping needed. Trim so it starts and ends near the idle's resting pose, so it blends in and out.

**D4. [HUMAN]** Export: H.264 MP4, 512×640, 24fps, quality ~60. Each file should land under ~500KB.

**D5. [CLAUDE CODE]** Enforce naming in `/assets/narrator/video/`:

```
crane_neutral_idle.mp4
crane_grave_idle.mp4
crane_encouraged_idle.mp4
crane_accent_headturn.mp4
crane_accent_lean.mp4
pennywhistle_neutral_idle.mp4
pennywhistle_grave_idle.mp4
pennywhistle_encouraged_idle.mp4
pennywhistle_accent_headcock.mp4
pennywhistle_accent_ruffle.mp4
pennywhistle_accent_hop.mp4
pennywhistle_accent_laugh.mp4
```

**D6. [CLAUDE CODE]** Tab bar figures: **do not use video at 60px.** Export a static PNG crop from each neutral still. Video appears only inside the Narrator sheet.

---

## Phase E — Voice

> All voice lines are fully pre-rendered scripts. There is no runtime TTS, no network call at play time, and no variable substitution inside spoken audio.

**E1. [HUMAN]** Audition voices in ElevenLabs. (Kokoro runs free and local on CPU — worth trying for Crane first, since a flat affectless voice is the easy case.)

- **Crane** — low, even, no dynamic range. High stability, low style. The goal is a voice that never rises or falls; that flatness is the tell that something isn't alive.
- **Pennywhistle** — the opposite. High stability makes parrots sound dead. Low stability, pitched up, let it wobble. Bark-length lines turn a wobble into personality rather than a glitch.

**E2. [HUMAN → CLAUDE CODE]** **Write the locked settings into the world bible.** Voice ID, model version, stability, style, similarity, for each character.

> This is the highest-leverage step in the document. Batch one renders this month; batch nine renders next spring. These numbers are the only thing keeping late-game Pennywhistle sounding like tutorial Pennywhistle. Claude Code: read these from the world bible, never from a hardcoded value, and never regenerate an already-rendered line.

**E3. [HUMAN]** Write the first **20 lines** — 10 per character. A few tutorial lines, plus 1-2 barks per Narrator question (build / free / trouble / defect / war).

**E4. [BOTH]** Every line is a complete thought with **no variables**. The bark carries personality; the on-screen text carries the data. Never stitch audio fragments — "Trouble in the" + island name will never sound right.

**E5. [CLAUDE CODE]** Build `voicelines.json`:

```json
[
  {
    "id": "pennywhistle_trouble_01",
    "character": "pennywhistle",
    "mood": "grave",
    "question": "trouble",
    "text": "Storm's brewing in the west, captain.",
    "rendered": false
  }
]
```

`id` is the filename stem. IDs are permanent — never renumber.

**E6. [CLAUDE CODE]** Write the render script. It must:

1. Read the locked voice settings from the world bible
2. Walk `voicelines.json`
3. **Skip every entry where `rendered: true`**
4. Call the TTS API for the rest, using that character's settings
5. Write `/assets/narrator/audio/[id].mp3`
6. Flip `rendered` to `true` and save the manifest

The pipeline is append-only. Adding lines in six months means appending rows and re-running. No line is ever re-rendered by hand, and no existing line is ever regenerated with drifted settings.

**E7. [HUMAN]** Run it. Twenty files.

---

## Phase F — Wire it up

**F1. [CLAUDE CODE]** Narrator sheet opens → play that character's current-mood idle, looping.

**F2. [CLAUDE CODE]** Mood is set by the tone of the answer: trouble spreading → `grave`; defections landing or the war going well → `encouraged`; otherwise → `neutral`.

**F3. [CLAUDE CODE]** On open, play one bark matching the question tapped. **Text renders immediately — it never waits on audio.**

**F4. [CLAUDE CODE]** Accent timer: every 15-30 seconds of idle, fire one random accent clip, then return to idle. Never fire during a bark or mid-transition.

**F5. [CLAUDE CODE]** Preload all 12 clips when the sheet mounts. Streaming a video file mid-dialogue causes a visible hitch on phones.

**F6. [CLAUDE CODE]** Portrait sits in a **fixed rectangular frame**. Rectangular means no alpha channel is needed, which avoids the transparency mess between iOS and Android.

**F7. [CLAUDE CODE]** Ship a mute toggle. Assume many players run silent — the sheet must read perfectly with no audio at all.

---

## Budget & sequencing

| | |
|---|---|
| ChatGPT Plus | ~$20/mo |
| Kling | ~$8/mo |
| DaVinci Resolve | free |
| ElevenLabs | low tier at this volume; Kokoro free/local |

Both subscriptions are cancelable once the batch is done.

**Time:** Phase B is 3-4 hours and is where quality is won. C-D about two hours. E-F depends on the engine.

**Sequencing rule:** complete Phase A through E7 — including hearing the first 20 lines in context — before writing another line of script. Ten lines heard in the game teaches more than two hundred written on paper.

---

## Expansion (later batches)

1. Append new rows to `voicelines.json` with `rendered: false`
2. Re-run the render script — it touches only the new entries
3. Voice settings come from the world bible, unchanged, forever

New moods or new advisors mean new stills and new clips, and should start again from Phase A.
