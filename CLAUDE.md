# Master of the Seven Seas — working notes for Claude

## Vocabulary: one word per idea

Sean's word of 17 September. A **label** uses the agreed word; **prose keeps its
voice**, so in a sentence a location is still an island, because in this world
it is one. The file is `src/data/terms.json` and
`src/ui/__tests__/vocabulary.test.ts` fails the build if a retired word reaches
the player.

Sean has reversed two of these, so treat the table as the current ruling
rather than a settled one. On 19 September a ground unit stopped being a
**Company** and became a **Troop**; *company* is the retired word now. The one
survivor is **Ship's Company**, which is a unit's proper name and a real naval
idiom rather than the category. On 21 September — *"I don't like errands.
Mission is the word we want to use"* — an **Errand** went back to being a
**Mission**, reversing the 17 September ruling that had retired it.

Both reversals were cheap for the same reason, and it is the reason to keep
doing it this way: the retired word was only ever taken out of the *labels*.
`mission` stayed in the code throughout — `MissionType`, `missionsOffered`,
the `missions` chart-layer id, `missions.ts` — so turning the word round cost
a value in `terms.json`, a direction in the test, and the sentences a player
reads. Retire words from prose, never from identifiers.

| Idea | The word | Retired |
|---|---|---|
| A person of yours | **Crew**, a *crew member* | officer, personnel |
| Talking a place round | **Parley** | diplomacy |
| Somebody good at it | **Negotiator** | diplomat |
| The whole archipelago | **World Map** | the chart, the Seas |
| One chain, opened | **Reach Map** | the chain view |
| One island, opened | **Location** | port, harbor (as a screen name) |
| A ground unit | **Troop**, plural *troops* | regiment, **company** |
| Where a troop is raised | **Barracks** | training facility |
| What is built | **Buildings** (in prose, *works*) | facilities |
| A thing a crew member is sent to do | **Mission** | **errand** |

## Correct Sean's terms

He thinks in *Star Wars: Rebellion* (1998) and says so: *"I use a lot of SW
Rebellion terms. So you should note from a dev perspective which ones mean same
thing."* `docs/rebellion-terms.md` is the translation table.

So: **understand him first, then correct in passing.** When he says "regiment",
do the Troop thing and note the word in a clause — *"(Troop now)"* — never a
lecture, never a question he has to answer before getting his work.

## Build rates

Three speeds, at his reading of the original: **ships take forever, buildings
are medium, companies are fast.** Build time divides by how many works of that
kind stand on the island, asked fresh every morning, so three shipyards finish
in a third of the time and a yard raised mid-job speeds up the job already
running.

## House rules for the work

- The sim in `src/sim` imports no React. `lab/` is the measuring harness;
  `npx vite-node lab/duel.ts <games> <first-seed>` plays whole wars with both
  sides machine-played.
- Balance changes are measured, not asserted. Every rejected experiment gets a
  "tried and cut" comment in `src/sim/constants.ts` saying what it measured.
- `PLAN.md` gets the reasoning; the world bible's changelog gets the summary.
