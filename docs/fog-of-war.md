# Fog of war

*Sean's memo of 16 September, on how Rebellion does it and how ours should.
Design reference: nothing here is built yet. Recorded so the decisions survive
the conversation they were made in.*

## What Rebellion actually does

Rebellion does not hide the map. You always see every system, every name and
every lane, because the map is the game's table and you cannot plan on a table
you cannot see. What it hides is **everything that moves and everything that is
counted** — fleets, garrisons, troops, facilities, characters, and above all
where the Rebel Base is.

So the fog is not darkness over ground. It is an **intelligence picture**: a
record of what you were last told, dated, and shown to you as though it were
still true until something contradicts it.

The consequences are the interesting part:

- **Information goes stale rather than going away.** A system you scouted forty
  days ago still shows you what you saw then. The game does not grey it out or
  clear it. It shows you two Star Destroyers that sailed a month ago, with the
  same confidence as a sighting from this morning, and lets you act on it.
- **Three states, not two.** *Unknown* — never looked. *Recently observed* —
  something of yours is there now, or was within the last few days, and what
  you see is true. *Discovered* — you have looked once and the picture is a
  memory. Most of the map, most of the time, is the third.
- **Presence reveals.** A fleet in a system sees that system in full while it
  is there, and sees nothing of the next one over. Moving a ship is the
  cheapest intelligence in the game and the main reason a small fast hull is
  worth having.
- **Two layers of looking.** Recon is the ship that goes and comes back: broad,
  shallow, and it tells you hulls and ground strength. Espionage is a person
  who stays: narrow, deep, and it tells you the things a passing ship cannot
  see — what is being built, who is there, what the garrison actually is
  underneath what it looks like.
- **Ghost fleets.** The picture is kept even after it is wrong, so the map
  carries squadrons that are not there. Attacking a ghost is the classic
  Rebellion mistake and it is a *good* mistake: it is the player's own stale
  information punishing them, not a dice roll.
- **Detection is a rating, not a rule.** Some hulls see further and some
  characters are harder to see. Sensors on one side, concealment on the other,
  and the result is a probability rather than a wall.
- **One object the whole game is about.** The Rebel Base is the ultimate fog of
  war object: the Empire's entire campaign is a search problem, and every other
  intelligence rule exists to make that search interesting.

## How ours should work

The same shape, in our words.

- **The chart is never hidden.** Every island, every name, every chain, from day
  one. What is hidden is what is *on* them.
- **What an island is showing you is dated.** Garrison, works, allegiance, whose
  colours fly, what fleet is lying off it — all of it is the last report, not
  the truth. The panel should say how old the report is, in days, and say it
  quietly enough that a fresh one and a two-month-old one are told apart at a
  glance but the screen is not a spreadsheet of timestamps.
- **A ship in the harbor is a fresh report,** for as long as she is there.
- **A survey is the broad look** and an officer ashore is the deep one. Survey
  tells you hulls, companies and what stands; an officer ashore tells you what
  is being built, who else is on the island, and what the place is really
  worth.
- **Stale reports are shown as though true.** No greying, no question marks over
  the numbers themselves — only the date. Sailing a squadron at three companies
  that turned into eight a month ago has to be a thing the game lets you do.
- **The Brethren are our Rebel Base.** Where a Lord is, and whether the ones you
  are hunting are still at Freeport, is the one piece of intelligence the Crown's
  whole war turns on.

## Open questions

- Does an island's **allegiance** go stale as well, or is that something a
  Crown or a Confederacy can always feel? (Leaning: it goes stale. A revolt you
  did not see coming is the point.)
- How does the **chart** show a dated report? A layer answers off the last
  report — so how does a layer say that half its dots are guesses?
- What does a **fresh sighting that contradicts the record** look like: a
  dispatch, a log line, or nothing at all until you open the island?
- **Detection ratings** on hulls and officers — worth having, or one more number
  on a screen that already has enough of them?
