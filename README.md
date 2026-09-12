# Master of the Seven Seas

A real-time grand strategy game of pirates, sea-magic and the Black Tide, built
for the phone. Phase 1: the chart of the Seven Seas, a pausable day clock, the
camp/mill/upkeep economy, allegiance and control, and one mission type (Parley).

Built as a single-page app with no backend. Every name the player sees —
factions, crew, Reaches, islands, facilities, the vocabulary itself — lives in
`src/data/*.json`.

## The two specifications

- **`seven-seas-world-bible.md`** is the source of truth for names, lore,
  factions and the map. Anything player-facing comes from there, and a change
  to a name or a lore fact is committed together with its Changelog line.
- **`galaxy-rebellion-build-spec.md`** is the source of truth for mechanics:
  the numbers, the rules and the phase plan. The bible is explicit that the
  simulation's stat blocks, costs and timings do not change under a reskin, so
  where the two documents disagree the bible governs the words and the build
  spec governs the behaviour.

The simulation in `src/sim` still uses the build spec's neutral vocabulary
internally (`system`, `support`, `raw`), because renaming a working rules engine
buys nothing. The translation happens at the data files.

**Phone only, by design.** Every control is at least 44px, long-press and pinch
gestures never trigger the browser's own text selection or zoom, pull-to-refresh
is disabled so a stray swipe cannot reload a game in progress, and the layout is
verified from 320px (iPhone SE) to 430px (15 Pro Max) plus landscape. On a
desktop browser it simply fills the window; that case is not designed for.

## Playing it

**https://seanyb47.github.io/Star-Wars-Rebellion/**

Open that on your phone, then Share → **Add to Home Screen** for a full-screen
app. It needs no computer and no local network — it is just a web page. It does
need a connection each time it loads; there is no offline mode yet.

Your save lives in that browser's `localStorage`, so it survives closing the
app, and it stays on the device it was made on.

## Running it locally

For development, or to play a build before it is deployed:

```bash
npm install
npm run dev
```

## Running a local build on your phone over Wi-Fi

You only need this to test a change before pushing it — for ordinary play, use
the deployed URL above.

1. Put the phone and the computer on the **same Wi-Fi network**.
2. Run `npm run dev`. Vite is configured with `--host`, so it prints two URLs:

   ```
   ➜  Local:   http://localhost:5173/
   ➜  Network: http://192.168.1.42:5173/     ← this one
   ```

   If no Network line appears, find the address yourself — `ipconfig getifaddr en0`
   on macOS, `hostname -I` on Linux, `ipconfig` on Windows.
3. Open the **Network** URL in Safari (or Chrome) on the phone.
4. To install it as an app: Safari → Share → **Add to Home Screen**. It launches
   full-screen with no browser chrome, in portrait.

If the phone cannot reach the URL, the computer's firewall is almost certainly
blocking port 5173 — allow incoming connections for Node, or on macOS approve
the prompt that appears the first time you run the dev server.

For a production-like run (smaller, faster, what you would actually deploy):

```bash
npm run build
npm run preview     # also binds to the network
```

Served this way the game comes from your computer, so closing the dev server
closes the game. The deployed URL has no such tie.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on the local network |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the built app on the local network |
| `npm test` | Run the simulation test suite |
| `npm run test:watch` | Same, in watch mode |

## Deployment

Every push to `main` runs the tests and, if they pass, publishes the site to
GitHub Pages via `.github/workflows/deploy.yml`. A failing test blocks the
deploy, so the live game is always a version whose simulation passed.

Pages serves the site from a subfolder rather than the domain root, so
`vite.config.ts` sets `base` to `/Star-Wars-Rebellion/` for builds only — the
dev server stays at `/`. The manifest uses relative URLs so it resolves
correctly in both places. **If the repository is ever renamed, that `base` must
be renamed with it**, or the deployed page will load a blank screen while
hunting for its assets under the old path.

## How it is put together

```
src/
  sim/      the whole game, as pure TypeScript — no React imports anywhere
  ui/       React components; they only read state and dispatch commands
  ui/art.tsx  the drawn layer — icons, marks, cameos, all SVG in code
  art/      the painted layer — illustration, dropped in as files
  data/     every name in the game
```

**Two art layers, split by whether the thing has to change.** The interface —
the chart, island marks, facility and ship icons, allegiance bars, capacity
pips — is SVG drawn in code, because every one of those has to tint by faction,
seed itself from a name, scale from 30px to 96px and show state that changes
every day of the war. Anything derived from a name is identical in every game
and on every device.

The painted layer is illustration: portraits, ships, islands and dispatch
scenes, made outside the repo and added with `npm run art:add`. A subject with a
painting uses it; a subject without keeps its drawn cameo, so the art can
arrive in any order. See `seven-seas-art-style.md` for the direction,
`art-prompts.md` for every subject, and `ASSETS.md` for what has arrived —
each one with its full-resolution master kept in `art-masters/` and the crop
recorded, so a painting can be reframed later instead of remade.

Until the paintings land the download is ~95KB and works offline. It will not
stay that small, and lazy loading is the price of that.

`src/sim` is the important part. The entire game is one plain JSON object
(`GameState`), so saving is `JSON.stringify` and loading is `JSON.parse`.
`advanceDay(state) → state` is pure: it clones, mutates the clone, and returns
it, leaving the argument untouched. Randomness comes from a seeded generator
carried in `state.rngSeed`, so the same seed always plays out the same way —
which is what makes the tests deterministic.

The UI never reaches into the simulation. It calls the command functions in
`sim/commands.ts`, each of which takes a state and returns a new one, and
reports failure as `{ error }` rather than throwing, so a mistimed tap can
never crash the game.

## What a session looks like

The game opens on a **title screen**: pick the Crown Imperium or the Free
Confederacy — each with its crest, what it is good at and what it is not — and
take command. Difficulty is shown set to Normal; the other two settings are
visibly unavailable rather than pretending to work, because how the war scales
has not been decided yet.

**It saves itself constantly** — after every order, and whenever you switch away
from the app. There is no save button and no save slot to manage. Set it down
mid-war, come back a week later, and the title screen offers **Continue your
game** where you left off. "Save and return to title" in the menu does the same
thing deliberately.

**The chart does not zoom and does not pan.** The whole archipelago is on
screen at once and there is one thing to tap: an **island chain**, which opens
as a panel listing its islands. Each chain is about 78px across on a phone, so
it is easy to hit; a single island would be four pixels and impossible. Islands
are therefore drawn on the chart but not tapped — there they are the picture of
the chain, and they become targets in the panel, at a size where you can read
their names. Sending a crew member works the same way: the chains offering a
destination light up, and you pick the island inside one.

It did zoom, across three levels, and that was rejected for being fiddly. The
chart is also laid out for a phone held upright rather than in the square the
simulation scatters its chains in, which is allowed because the coordinates are
decoration: travel time depends on whether two islands share a chain, never on
how far apart they are drawn.

Tapping a **Reach** on the chart — its open water or its name — opens the whole
Reach: what it earns you a day, the average allegiance across its settled
islands, and a row per island carrying the three counts that matter, after
Rebellion's own sector view. Tapping any of the three icons opens that island
straight onto the matching tab.

| Icon | Means | Opens |
| --- | --- | --- |
| Dispatch | Your crew on it, or sailing to it | Missions |
| Crossed blades | Companies ashore | Military |
| Roofs | Buildings standing | Facilities |

Tapping an island directly opens the same panel on **Overview** (the island
drawn from its own coastline, its allegiance, its capacity). The other tabs are
**Missions**, **Military**, **Facilities** and **Log** (what has happened on
this island alone). The Reach name in the panel header goes back up a level.

## The rules, in brief

**Time.** One tick is one day. Speeds are paused / very slow / slow / medium /
fast (∞ / 4000 / 2000 / 1000 / 400 ms per day). Tap the speed pill to cycle,
hold it to pause. Opening any sheet holds the clock; closing it resumes.

**Economy.** One currency: **Gold**. A building either earns it or costs it. A
camp earns 2 a day and a mill 3, both scaled by allegiance
(`0.5 + allegiance/200`), and both earn nothing on an island in mutiny. A works
costs 3 a day, a drill ground 2, a slipway 4, and each company ashore 1. If you
cannot pay the day's upkeep the treasury empties and something you own, picked
at random, may break down — likelier the bigger the gap — so overreaching
decays back to what you can afford rather than collapsing at once. On an island
where your allegiance is under 50, smugglers may run the day's takings to the
enemy.

<details>
<summary>The old two-resource economy (superseded)</summary>

Each camp on an island you hold produced `1 × (0.5 + support/200)`
Stores per day. Each mill turns up to 1 Stores into 1 Fittings. Upkeep capacity
is 50 per matched camp/mill pair; works (20), drill grounds (15), slipways (30)
and companies (8) draw on it. Overspend for five straight days and the newest
thing on the books is broken up. On an island where your allegiance is under 50,
smugglers may run a day's stores to the enemy.

</details>

**Allegiance and control.** An unaligned island comes over at 60 allegiance with
a 25 point margin. An island you hold with allegiance under 30 mutinies unless
the garrison covers `ceil((50 − allegiance) / 10)`; order returns at 40. Any
allegiance change spills 20% onto every other settled island in the Reach.
Uninhabited islands are held only while a company sits on them, and settle under
your flag the moment you finish building anything there.

**Building.** Works build camps (40/8d), mills (60/10d), works (120/20d), drill
grounds (80/15d) and slipways (150/25d). Drill grounds raise companies (25/5d).
Gold is spent when the order is placed, and a building runs one order at a
time. A camp needs free **Ground**; everything else needs free **Water**.

**Parley.** Passage is 3 days inside a Reach, 10 beyond. The parley then runs
for 15 days and resolves at `0.4 + diplomacy/200`. Success adds
`8 + diplomacy/10` to your allegiance and takes 4 off theirs. On unaligned
islands there is a 10% chance of being found out, which lays the character up
for 20 days. Otherwise you choose whether to stay another cycle or weigh anchor.

**Victory.** Hold 60% of the settled islands. Left alone, the opponent gets there
in roughly 600–700 days.

**Your advisor.** Each side has one, from the world bible: Secretary Crane for
the Imperium, Mr Pennywhistle for the Confederacy. Tap the portrait on the
chart and they will tell you where you can build, who is free to sail, where
the trouble is, which unaligned islands lean your way, and how the war is
going — each answer listing the actual islands or people, tappable to go
straight there. They answer from the game state; they do not converse.

**Almanac.** Every building, company, crew member and term, with what each
costs and earns. Read out of the same constants the simulation runs on, so it
cannot go stale. In the menu, or from the advisor.

**Sound.** Off until you tap the speaker in the top bar, and remembered after
that. It is all synthesised in the browser — nothing is downloaded, so the
game stays a 76kB install that works with no signal. One music file would have
been forty times the size of the entire game.

- *Events* have their own short sounds: two rising notes when an island comes
  over, a low thud and a sour interval when one revolts, a soft double-ping
  when a diplomat reports.
- *The bed* is a slow drone over filtered noise, generated as you play, so it
  never loops and never repeats — which matters when a session runs for hours.
  It is one steady bed that does not change with where you are looking.
- *Unrest* is the one thing that moves it: while islands of yours are in
  revolt the whole bed darkens, and lifts again when order returns. That is
  tied to the state of your war rather than to the screen, so it shifts rarely
  and slowly.

Two earlier versions were wrong in ways worth recording, because both are
tempting. Suspending the bed while the clock is paused meant the sound cut out
every time a panel opened, which is constantly. And giving each of the seven
Seas its own tuning, retuning as you panned, meant the music lurched every few
seconds as the player moved around the map — background music has to stay in
the background.

**If your phone's ringer is on silent, Safari mutes all of this and there is no
way around it.** That is the browser, not the game.

**The opponent.** Deliberately simple, per the phase 1 spec: every 5 days it
builds whichever of camp or mill it has fewer of, at the island with the most
free slots; every 10 days it sends its best available negotiator to parley the
unaligned island in its own Reach where its allegiance is highest.

## Where this deviates from the spec

Three points needed a decision the spec did not settle:

- **Build orders are placed at the works' own island.** `BuildOrder` carries no
  destination, so a works builds on the island it stands on — which also means
  expanding somewhere new starts with a works there.
- **"Return" leaves a character where they stand,** available for new orders,
  rather than flying them home. Travel time is charged when they next depart.
- **The opponent falls back to the best unaligned island anywhere** when its own
  Reach has none left. Restricted strictly to its own Reach it goes inert after
  the first few islands and can never threaten you.

Three decisions the world bible left open are recorded as questions 5–7 in its
Section 12: the Reach count on the small map, Tallow Cay as a fixed Confederacy
start, and whether to add the Section 14 character `loyalty` field before the
mechanic that reads it exists.

Two additions neither document asked for: a **My islands** list on the chart
(finding your own holdings among 100 islands by eye is miserable), and a
starfield.

## Testing

```bash
npm test
```

108 tests over `src/sim`, all seeded and deterministic: map generation,
production, refining, smuggling, upkeep and salvage, control flips, mutinies,
Reach spillover, building, parley passage and resolution, being found out,
save/load, full games played end to end to a winner, and a set that pins the
world bible's data files against what the simulation expects.

## Known rough edges

Things I know are wrong, in the order I mean to fix them.

- **Island shapes read as blobs, not archipelagos.** Every island is an
  independent random coastline of roughly the same size, scattered evenly
  inside its Reach. A real ocean does not look like that: it has chains,
  clusters, a few large islands among many small ones, and open water between
  groups. Fixing this means generating a Reach's islands together rather than
  one at a time, giving them a size distribution, and letting a large island
  carry more than one port.
- **Nothing to spend gold on late.** Slots fill up and the treasury climbs into
  five figures. Fleets are what absorb it; until then the economy has no sink.
- **I cannot hear the sound I wrote.** The audio is synthesised and wired to
  the game correctly, and I verified that it runs, retunes and stops — but
  whether it is pleasant, dull or irritating is not something I can judge.
  That needs a human ear and a few rounds of feedback.

## Not built yet

**See `PLAN.md`** for the current state and the order of work.

In short: fleets and combat are built. Three of the eight mission types are
built — parley, incite, recruitment. Still outstanding are Espionage as a
mission, Sabotage, Abduction, Command over an island and R&D; then real victory
conditions, command ranks, Tidecraft and a smarter opponent.

From the world bible, still waiting on the phases that need them: ground forces
(section 7), special forces (8), and both of the new mechanics in section 14 —
Mythic Isles and Double Agents.
