# Retired branches

A branch that has been folded in or given up, kept as a patch rather than as a
ref. The reason it is a patch and not a tag: this repository's git proxy
accepts a push to the working branch and **refuses tag refs with a 403**, and
the machine these sessions run on is thrown away when the session ends. A tag
here is recoverable until teatime and gone after. A file on the branch is
recoverable for good.

Apply one with `git am < <file>.patch`, or just read it — they are plain diffs.

## `siege-and-ground-war.patch`

Retired 25 September 2026. Two commits that were never in the shipping line:

| | |
|---|---|
| `738eda8` | Six troops a side, two to start and four by research |
| `bc45d26` | Coral comes inside the charts and Windward goes out |

**Both were independently re-done on the shipping branch and are live there.**
That is not an assumption — it was proved by a trial merge in a throwaway
worktree. Every file that auto-merged came out byte-identical to the shipping
branch (`0 files changed`), and the only three conflicts were the same feature
written twice. `src/sim/troops.ts` differed in nothing but whether the field is
called `detection` — which is what shipped, and what `missions.ts` sums for an
island's watch — or `watch`.

So the branch was worth retiring rather than merging: merging it would have
resolved twenty-three conflict hunks in order to arrive back where the code
already was.

**One genuine difference survives and is Sean's to rule on.** This branch
renames the island **Shellhouse** to **Chimehouse**. The shipping branch says
Shellhouse. Nothing else on it is a live question.

### Why it existed at all

It is the branch the *"art state and the dead blocker"* report was written
against, and its existence cost real work: on 24 September a stale sentence in
`src/sim/navy.ts` was fixed here, from scratch, by somebody who could not see
that the same fix already existed on this branch. That is the concrete case for
keeping one trunk, and it is written up in PLAN.md under *"Why these two keep
coming back"*.
