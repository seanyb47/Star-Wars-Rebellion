# Galactic Rebellion

A real-time galactic grand strategy game for the phone. Phase 1: the galaxy map,
a pausable day clock, the mine/refinery/maintenance economy, popular support and
control, and one mission type (Diplomacy).

Built as a single-page app with no backend. All names — factions, characters,
sectors, systems — live in `src/data/*.json`, so a reskin is a one-file swap.

## Running it

```bash
npm install
npm run dev
```

## Playing it on your phone over local Wi-Fi

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

Note that the app is served from your computer: closing the dev server closes the
game. There is no service worker yet, so it does not work offline. Your save
lives in the phone browser's `localStorage` and survives refreshes and restarts.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on the local network |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the built app on the local network |
| `npm test` | Run the simulation test suite |
| `npm run test:watch` | Same, in watch mode |

## How it is put together

```
src/
  sim/      the whole game, as pure TypeScript — no React imports anywhere
  ui/       React components; they only read state and dispatch commands
  data/     every name in the game
```

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

## The rules, in brief

**Time.** One tick is one day. Speeds are paused / very slow / slow / medium /
fast (∞ / 4000 / 2000 / 1000 / 400 ms per day). Tap the speed pill to cycle,
hold it to pause. Opening any sheet holds the clock; closing it resumes.

**Economy.** Each mine on a world you hold produces `1 × (0.5 + support/200)`
raw per day. Each refinery turns up to 1 raw into 1 refined. Maintenance
capacity is 50 per matched mine/refinery pair; construction yards (20),
training facilities (15), shipyards (30) and troop regiments (8) draw on it.
Overspend for five straight days and the newest thing on the books is scrapped.
On a world where your support is under 50, smugglers may divert a day's ore to
the enemy.

**Support and control.** A neutral world comes over at 60 support with a 25
point margin. A world you hold with support under 30 revolts unless the
garrison covers `ceil((50 − support) / 10)`; order returns at 40. Any support
change spills 20% onto every other populated world in the sector. Uninhabited
worlds are held only while a garrison sits on them, and become populated the
moment you finish building anything there.

**Building.** Construction yards build mines (40/8d), refineries (50/10d),
yards (120/20d), training facilities (80/15d) and shipyards (150/25d).
Training facilities build troop regiments (25/5d). Refined is spent when the
order is placed, and a facility runs one order at a time.

**Diplomacy.** Travel is 3 days inside a sector, 10 across. The mission then
works for 15 days and resolves at `0.4 + diplomacy/200`. Success adds
`8 + diplomacy/10` to your support and takes 4 off theirs. On unaligned worlds
there is a 10% chance of being detected, which puts the character out of action
for 20 days. Otherwise you choose whether to keep working the world or return.

**Victory.** Hold 60% of populated worlds. Left alone, the opponent gets there
in roughly 600–700 days.

**The opponent.** Deliberately simple, per the phase 1 spec: every 5 days it
builds whichever of mine or refinery it has fewer of, at the world with the most
free slots; every 10 days it sends its best available diplomat to the unaligned
world in its own sector where its support is highest.

## Where this deviates from the spec

Three points needed a decision the spec did not settle:

- **Build orders are placed at the yard's own world.** `BuildOrder` carries no
  destination, so a construction yard builds on the world it stands on — which
  also means expanding somewhere new starts with a yard there.
- **"Return" leaves a character where they stand,** available for new orders,
  rather than flying them home. Travel time is charged when they next depart.
- **The opponent falls back to the best unaligned world anywhere** when its own
  sector has none left. Restricted strictly to its own sector it goes inert
  after the first few worlds and can never threaten you.

Two additions the spec did not ask for: a **My worlds** list on the map (finding
your own holdings among 100 systems by eye is miserable), and a starfield.

## Testing

```bash
npm test
```

92 tests over `src/sim`, all seeded and deterministic: galaxy generation,
production, refining, smuggling, maintenance and scrapping, control flips,
uprisings, sector spillover, building, mission travel and resolution, foiling,
save/load, and full games played end to end to a winner.

## Not built yet

Fleets and combat, the other nine mission types, real victory conditions,
command ranks, force users, and a smarter opponent are all phase 2 and beyond.
