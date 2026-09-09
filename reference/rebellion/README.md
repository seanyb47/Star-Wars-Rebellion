# Star Wars: Rebellion (1998) — reference shots

Screenshots supplied by the project owner as design reference. Master of the
Seven Seas is a fantasy-pirate reskin of this game's shape, so these are the
primary source for how a screen should behave when the spec is silent.

They are checked in deliberately. I cannot watch video, and chat attachments do
not survive a session, so anything worth arguing from later has to live here.

Read this file alongside the images before changing a screen these shots cover.

---

## `personnel-finder.jpg` — the roster

A modal over the map. A **Name** search field at the top, faction toggles below
it, then a scrolling list where every row is the same shape:

    Adar Tallon - Taanab ( On Mission )
    Chewbacca   - Taanab
    Han Solo    - Taanab              <- selected, drawn bold and white
    Jan Dodonna - Taanab ( Injured )
    Leia Organa - Firro  ( On Mission )

**Name — where they are — what they are doing.** Sorted alphabetically. Status
is only printed when it is *not* "idle and available", so the eye lands on the
exceptions. Unselected rows are dimmed; the selection is the only bright row.

Four action buttons run down the right edge of the dialog, so choosing a person
and acting on them never leaves the list.

*Ours:* `CharactersScreen.tsx` shows portrait cards with full ratings on each
row. Richer, and at fourteen characters total it does not need the search box.
The lesson worth taking is the **status-only-when-notable** rule, and keeping
location on the row — both of which we already do.

---

## `event-card.jpg` — how the game tells you something happened

Title bar: **"Uvena Joins Enemy"**. A large piece of **artwork** — a crowd of
silhouetted protesters against an industrial skyline. Then one plain sentence:

> Popular dissent on Uvena has caused that world to join the Empire.

Up/down arrows in the title bar page through the rest of the day's events.

This is the biggest gap between Rebellion and us. Rebellion **narrates**: one
event at a time, given a headline, a picture, and a sentence. We **log**:
`FeedScreen.tsx` renders a reverse-chronological list of one-line strings.

A log is better for looking something up. A card is better for feeling that the
world moved while you were not watching. Rebellion does the card at the moment
it happens and keeps a log elsewhere — that is probably the answer for us too,
and our events already carry a `kind` (`war | flip | mutiny | order | mission |
loss`) that could pick the artwork without any new data.

---

## `sector-and-fleet-alliance.jpg` and `sector-and-fleet-empire.jpg` — the map, and fleets

The same screen from both sides. Take them together.

**The sector map** (right, `Farfin` / `Fakir`): planets scattered on black, each
with its name beneath and, under the name, **two short horizontal bars** — one
per faction — showing the split of popular support. A small green arrow beside a
planet means something of yours is under way there. Garrison and facility markers
sit tight against the planet.

We already do this: `GalaxyMap.tsx` draws the two-sided allegiance bar under each
island. Confirmed correct rather than changed.

**The fleet window** (left, `Taanab` / `Palanhi`): tapping a planet opens a
window for it. A narrow strip lists the fleets in orbit; selecting one fills the
larger panel with what that fleet *is* —

- ship silhouettes, one per vessel, grouped
- **character portraits in a row, inside the fleet** — officers ride with it
- a block grid of troops
- and at the bottom, the **name of whatever is currently highlighted**
  ("Alliance Escort Carrier 2", "Carrack Light Cruiser 2")

The window is drawn in the player's own colour: red for the Alliance side, green
for the Empire.

Three things to steal when fleets get built:

1. A fleet is a **container for ships, officers and troops at once**, not a
   stack of ships with a leader attached somewhere else.
2. Officers are *shown inside it*. Where a character is and what they are riding
   in is one fact, displayed once.
3. In a dense grid of small icons, **highlighting one prints its name** in a
   fixed spot. Cheap, and it makes an unreadable grid readable — worth copying
   for our facility and garrison rows too.

---

## `battle-prompt.png` — combat is a decision, not a result

    Battle at Deyer
    [ ship art on a starfield ]
    The Imperial fleet has entered the Deyer system. Alliance forces
    have been detected on an intercept course.
    [ withdraw ]  [ watch ]  [ commit ]

Combat is announced *before* it resolves and the player is given the choice to
withdraw, watch it play out, or press. The sentence names both sides and says
who moved first.

Worth knowing now, because it means a naval engagement must not be something
that simply appears in the log the next morning already decided.

---

## The thing in the corner of every shot

Bottom right of every screenshot: **a droid, always on screen.** C-3PO and R2-D2
for the Alliance; a red protocol droid for the Empire. Never a button you press
to summon — a figure that stands at the edge of the frame permanently, and
differs by the side you chose.

Our `Narrator.tsx` — Mr Pennywhistle for the Confederacy, Secretary Crane for the
Empire — has the faction-specific voice right but is a panel you open. The brief
was "a character **on screen** as our narrator". Rebellion shows what that means
literally: they are simply always there.

---

# Second batch

## `fleet-status.png` — the fleet readout

The most informative single shot so far. A plain green-on-black table:

    Status:              Awaiting Orders
    Admiral:             Admiral Brandei
    General:             General Jerjerrod
    Commander:           Not Assigned
    Number Of Ships:     7
    Capacity:
      Fighter Squadrons: 19
      Trooper Regiments: 14
    Embarked:
      Fighter Squadrons: 18
      Trooper Regiments: 3
    Personnel:           2
    Damaged Ships:       0
    Hyperdrive Rating:   Yes

Four things worth taking:

**Officers are slots with job titles, not a generic "leader".** Admiral,
General, Commander — each either names someone or says *Not Assigned*. An empty
slot is stated as plainly as a filled one, so a fleet sailing without a
commander tells you so rather than staying silent. Our characters already have
Diplomacy / Espionage / Combat / Leadership, which maps onto exactly this kind
of slotting.

**Capacity against Embarked.** The fleet can carry 19 fighter squadrons and 14
trooper regiments; it is carrying 18 and 3. Two numbers, side by side, and the
constraint is legible without arithmetic. This is the same shape as our island
slots — total against used — and it is the shape our build screen should use.

**Plain-language status.** "Awaiting Orders", not an icon. "Hyperdrive Rating:
Yes", not a symbol.

**A red nag at the top of the screen: "Idle Construction Yards".** The game
tells you, unprompted, that you are wasting production. That is worth stealing
whole — we have exactly the same failure mode, an island with a free slot and
nothing being built on it, and right now nothing says so.

## `two-sectors-tiled.png` and `sector-and-galaxy-overview.jpg` — the chart

Two sector panes open side by side in one shot; a sector pane beside the whole
galaxy in the other. Rebellion lets you keep more than one view open at once.
Not something to copy on a phone, but it explains the layout's priorities.

More useful: these show the per-planet display clearly, and it is **three
elements, not two** —

    [ icons: garrison, facilities ]
    [ white segmented bar     ]   <- capacity
    [ red bar ] [ blue bar    ]   <- support, one per side
    Planet Name

So "resources and loyalty below each sector" means a **capacity bar as well as
the loyalty bars**. We had the loyalty bars and were missing the capacity one.
Now added: one pip per slot under each island, pale stone where something is
built and a dark socket where nothing is, drawn only once zoomed in.

Two attempts were needed. Brass pips were tried first and thrown away — brass
is within a shade of the Confederacy's own colour, so on a Confederacy island
the capacity row and the allegiance bar merged into a single yellow smear. And
the empty sockets were first drawn in the near-black used for the bar's track,
which against open water made them invisible: an island with five of eight
slots filled looked like an island with five slots, all full. Both only showed
up under magnification.

**Name colours are fixed by faction, not relative to the player.** Green for
Alliance, red for Empire, pale blue for uncontrolled — the same in the Alliance
shot and the Empire one. We do the same.

## The droid, again

Present in every shot of both batches, both sides, at the edge of the frame.
Acted on: our advisor now stands at the end of the tab bar on every screen.

Floating the figure over the screen was tried first, in the bottom-right corner
above the tab bar, and thrown away after looking at it: on the crew list the
parrot stood squarely over the rating numbers. Rebellion's droid has a console
to stand on and a phone has no spare corner — but the tab bar *is* our console,
so that is where the advisor stands now. Nothing is covered, and he cannot be
mistaken for a fourth tab because he is a figure rather than an icon and a
label.
