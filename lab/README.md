# lab — playing the game a few hundred times

A harness for finding out what the rules actually do over whole wars, rather
than what a unit test says one rule does once. Written 15 September, after Sean
asked for "tons of gameplay tests. Play full games."

```
npx vite-node lab/campaign.ts <games> <first-seed> [carry-on|come-home|mixed] [play]
```

`play` puts a scripted player at the wheel; without it the player's seat is
idle and only the opponent acts. Seats alternate by game, because `runAI` only
plays the side the player is not, so a run that is all one seat measures one AI.

- **`audit.ts`** — everything that must be true of a game state, checked every
  day of every game. A violation is a bug, not a balance opinion. It found six
  on its first run.
- **`play.ts`** — one full game, with the audit and a few hundred counters for
  what the rules did.
- **`pilot.ts`** — somebody reasonable at the wheel, giving orders through the
  same `commands.ts` the UI uses. Not a good player: the point is that with the
  seat idle, every errand, build and sailing order is code no test ever runs.
- **`campaign.ts`** — the report: outcomes, lengths, invariants, and what each
  mechanic did per game, with a list of anything that never happened at all.

The "never happened" list is the most useful thing here. A rule that never
fires in sixty wars is either unreachable or not worth reaching, and both are
worth knowing before more is built on top of it.
