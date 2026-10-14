# A steady drip: how recruitment and research should arrive

Sean, 22 September:

> For timing, we want to tell Code that there should be a steady pace throughout
> the game of recruitment and research. Shouldn't all just come at once. There is
> probably a secret tracker that things unlock on specific days naturally, but
> research / recruitment speeds that up significantly. So basically if someone is
> on a mission to recruit, maybe it speeds up the timer by a large factor. Two
> people recruiting goes even faster. And then when it's successful the person
> recruiting pops out of the mission and becomes idle and the person he recruited
> is with him. And then they're both idle and you can reassign him to recruit if
> you want or something else. And if multiple people are recruiting, the person
> who has been recruiting the longest since last recruit gets the recruit.

Nothing below is built. This is the spec.

---

## 1. What is wrong with today's model

Both recruiting and research are **per-attempt coin flips**. An officer works a
fifteen-day cycle, rolls, and either gets something or doesn't. Two consequences,
and both are visible in play:

- **Nothing paces itself.** A lucky run hands you three crew in six weeks and a
  cold run hands you none in a year. The arrival of people is noise, not a rhythm.
- **Doing nothing gets you nothing, forever.** A side that never posts anybody to
  recruit never signs a soul, which makes the recruit pool dead content for a
  player who hasn't worked out that it exists.

Sean's model fixes both with one idea: **the clock runs whether or not you push
it, and pushing it is what makes it worth doing.**

## 2. The hidden tracker

Each side carries a hidden countdown per track — one for recruitment, one for
research. It advances every day on its own, and faster when people are working
on it.

```
progress += BASE_DRIP + (effort from everyone on that mission today)
```

`BASE_DRIP` is the "arrives on its own eventually" rate. Set it so that a side
which posts nobody still sees the odd recruit — on the order of one every four or
five months — and a side that keeps one officer on it sees one every few weeks.

**Effort is per person, with diminishing returns.** Sean: *"two people recruiting
goes even faster."* Faster, not twice as fast — a straight doubling makes
stacking four officers on one track the only correct opening. Something like each
additional worker contributing a shrinking share, so the second is worth most of
the first and the fourth is worth a fraction:

```
effort = Σ over workers, in order of who has worked longest:
           rating × RECRUIT_EFFORT × (DIMINISH ^ position)
```

The `rating` term keeps the existing skills relevant — leadership for
recruitment, espionage for research, as they are today.

## 3. When it fires

The tracker crosses its threshold, and **one** thing arrives.

- **Recruitment.** The recruit appears *with* the officer who has been at it
  longest since their own last success. Both go idle on the spot, standing on
  the same island. The officer is free to be reassigned; so is the new crew
  member, immediately, including straight back onto recruiting.
- **Research.** The rung is crossed; the officer who has been at it longest goes
  idle the same way.

**Whose turn it is:** the worker with the longest time since their own last
success takes it. That is Sean's rule and it has a nice property — it spreads
successes across your officers instead of letting one lucky agent hoard them, so
"who is due" is a thing the player can track and plan around.

Then the threshold for the next one rises, so the drip slows as the war goes on
and each further person costs more time than the last.

## 4. What it should feel like

The test is not a formula, it is a shape. Over an average war (about 1,150 days),
a side that keeps one officer on recruitment throughout should meet its crew in a
steady procession rather than a clump — and a side that spends nothing on it
should still have met two or three people by the end and should feel, correctly,
that it left something on the table.

`lab/ladder.ts` already measures exactly this for research: the day each rung is
first crossed, per side, plus the share of days a side had anyone working at all.
**The same harness should be pointed at recruitment before and after this is
built.** If the answer is "mean day 180, 400, 640, 900" the pacing works; if it
is "day 90, 110, 140" it is still a clump and the threshold curve is too flat.

## 5. Open, and Sean's to settle

1. Whether a failed roll should survive at all, or whether the tracker replaces
   the die entirely. The spec above assumes it replaces it — the drama moves from
   "did it work" to "who is due and how fast am I pushing it", which is the more
   interesting question and the less annoying one.
2. Whether the two tracks share a pool of effort or run independently. Independent
   is simpler; shared would make "recruit or research" a real weekly decision.
3. Whether the recruit who arrives is drawn at random from the pool or the tracker
   knows in advance who is next. Knowing in advance allows a rumour — *"there is a
   Reef-folk shipwright somewhere in the Amber Sea"* — which is a good hook and
   also more work.
