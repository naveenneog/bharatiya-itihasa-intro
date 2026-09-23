# Growing the channel — the diagnosis, 23 Sep 2026

The directive: 42 → 1,000 legitimate subscribers in 2–3 weeks, raise watch time, do not get the
channel blocked.

Before proposing anything, here is what the channel's own numbers say. Everything below was read
from YouTube Studio, not inferred (`tools/yt-stats.mjs`, `tools/yt-retention.mjs`).

## What is actually happening

299 public videos have produced **8,736 lifetime views**.

| | n | total views | mean | median |
|---|---|---|---|---|
| long-form | 256 | 8,070 | 31.5 | **3** |
| Shorts | 43 | 666 | 15.5 | 8 |

Half the long-form catalogue has **three views or fewer**. 49 have none.

### The Shorts are failing in the first seven seconds

A long-form video can fail at its thumbnail. A Short has no thumbnail — it is pushed into a feed,
and it lives or dies on whether people keep watching. So the average view duration of the
**best-performing** Shorts is the whole story:

| Short | views | avg view duration |
|---|---|---|
| Copper Plates and Village Sabhas | 108 | **0:07** |
| Huvishka's Amitabha in Mathura | 85 | **0:08** |
| Aryabhata Turns the Earth | 64 | 0:22 |
| The Pallava Alphabet Goes Overseas | 24 | 0:36 |

These Shorts run 45–60 seconds. Seven seconds is roughly **15% average view percentage**. The
Shorts feed tests a video on a small audience, sees most of them leave almost immediately, and
stops showing it. That is exactly what 666 views across 43 Shorts looks like.

**The hook fails.** Not the research, not the writing, not the art — the first two seconds.

The "Ink and Light" language is the cause, and it is worth being precise about why: an object
surfacing slowly out of black water, lit by one rim light, is genuinely beautiful and is the
right choice for a documentary opening. In a Shorts feed it is a dark, slow, ambiguous frame
arriving between two videos that are already moving. It gets swiped past before it resolves.

### Five languages means no audience

| language | n | total | avg |
|---|---|---|---|
| Tamil | 36 | 1,929 | 53.6 |
| Kannada | 36 | 1,854 | 51.5 |
| Hindi | 36 | 1,391 | 38.6 |
| Telugu | 36 | 955 | 26.5 |
| English | 77 | 1,872 | 24.3 |
| German | 35 | 69 | **2.0** |

Two things follow. The regional-language folk tales out-perform the English history roughly two
to one — though that confounds language with format, since the folk tales are stories and the
history is documentary. And the German set is 35 videos carrying 69 views between them; it is not
merely unsuccessful, it actively teaches the recommendation system that this channel has no
coherent audience to match.

The channel also presents as three things at once: it is named **AI4Good**, its avatar is
**Togalu Gombe Aata**, and its content is Indian history plus multilingual folk tales plus a
smart-stove review. A viewer who enjoys one video has no idea what subscribing would get them.

## What this rules out

**Publishing the backlog does not serve the goal.** 297 more long-form episodes at three a day
would add videos whose median sibling gets 3 views, and every one of them that is opened and
abandoned is another signal that the channel is not worth serving. The campaign is paused for
that reason, not because it failed — 121 uploaded cleanly and 38 are scheduled.

**Volume is already disproven.** 431 videos produced 42 subscribers. Another 300 will not change
the ratio; it is not a supply problem.

## The arithmetic of the target

958 subscribers in about 18 days is roughly 53 a day. Even at a healthy 1% view-to-subscriber
conversion that needs on the order of 100,000 views in three weeks, against the current 2,000 a
month.

That is a 50× step, and long-form on a 42-subscriber channel cannot make it: long-form is served
mostly to people who already subscribe or search. **Shorts is the only surface that shows a cold
channel to strangers at scale.**

So the honest position is this. A target of 1,000 in three weeks depends on at least one Short
breaking out, and a breakout cannot be manufactured on demand by anyone. What can be done is to
stop losing viewers in second two, aim at an audience that demonstrably exists, and put enough
genuinely good attempts into the feed to give the thing a real chance. That is the plan.

## The plan

1. **Fix the Shorts hook.** A legible, moving or human first frame; a spoken curiosity gap inside
   1.5 seconds; cuts every 1.5–2.5 s; 25–35 s total; a payoff that loops. Measured against
   average view percentage, not views.
2. **One lane.** Indian history and myth, told as story rather than as lecture, in the languages
   the data already favours.
3. **Retire German**, and stop diluting the signal.
4. **Publish Shorts at a steady, unremarkable cadence** — 3–5 a day, spaced, never in bursts. The
   upload failures on 23 Sep came after ~120 uploads in one day, which is the shape of activity
   that attracts review. Nothing here is worth risking the channel for.
5. **Measure average view percentage after every batch** and keep only what holds viewers.
