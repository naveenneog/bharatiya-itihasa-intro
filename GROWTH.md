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
history is documentary. And the German set is 35 videos carrying 69 views between them.

*Corrected 26 Sep.* An earlier version said the German set "actively teaches the recommendation
system that this channel has no coherent audience to match". YouTube's stated position is that it
recommends videos to viewers rather than promoting channels, and that an underperforming video
does not count against the next one ([Creator Insider, "Will one underperforming video hurt your
channel?"](https://www.youtube.com/watch?v=AeZVgj7XDls); [YouTube Help, performance
FAQ](https://support.google.com/youtube/answer/141805)). The German set does not drag the other
videos down. What the mix does affect is a person deciding whether to subscribe, below.

The channel also presents as three things at once: it is named **AI4Good**, its avatar is
**Togalu Gombe Aata**, and its content is Indian history plus multilingual folk tales plus a
smart-stove review. A viewer who enjoys one video has no idea what subscribing would get them.

## What this rules out

**The backlog was paused on a false premise, and is resumed.** This section originally argued
that every backlog video opened and abandoned would be "another signal that the channel is not
worth serving", and the user's publish schedule was stopped on that basis. YouTube says the
opposite: each video is judged on its own, and a weak one does not penalise the next (sources
above). The backlog costs nothing further to publish, adds watch time, and gives search something
to find, so it resumes on the user's original cadence — one episode and two Shorts a day from
20 Oct. 121 were uploaded before the pause and 53 are already scheduled.

**Volume alone is not the lever.** 431 videos produced 42 subscribers. More of the same will not
change that ratio. The backlog is published because it is free and harmless, not because it will
move the number.

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
   1.5 seconds; cuts every 1.5–2.5 s; 25–35 s total; a payoff that loops. Measured by *stayed to
   watch* (below), not by views.
2. **One lane.** Indian history and myth, told as story rather than as lecture, in the languages
   the data already favours.
3. **A coherent channel is the user's decision.** Splitting Itihāsa onto its own channel, or
   retiring the German set, changes work that belongs to other projects. The case for it is the
   subscribe decision, not the algorithm.
4. **Publish at a steady cadence, and upload at most ~60 a day.** The 23 Sep upload failures were
   most likely YouTube's daily upload limit: 121 uploads succeeded, then every one failed at the
   title box, including after a browser restart, and uploads worked again the next day. The
   probe that seemed to rule a limit out opened the upload dialog without selecting a file, so it
   could never have shown one.
5. **Measure *stayed to watch* after every batch**, once a Short has enough exposure to mean
   something, and keep only what holds viewers.

## Measured, 26 Sep — the first pilots, and a flaw in the test

Studio reports the hook metric on a Short's **Engagement** tab as "Stayed to watch / Swiped away"
— not on the overview or reach tabs (`tools/yt-retention.mjs` reads it from there).

| Short | format | views | stayed to watch |
|---|---|---|---|
| Copper Plates and Village Sabhas | old | 104 | **14.4%** |
| Huvishka's Amitabha in Mathura | old | 85 | **11.5%** |
| Aryabhata Turns the Earth | old | 63 | 28.6% |
| The Pallava Alphabet Goes Overseas | old | 24 | 68.4% |
| The Dot That Became Zero | new | 22 | 63.6% |
| Why Delhi's Iron Pillar Refuses To Rust | new | 5 | 60% |
| The Surgeon Who Rebuilt a Nose | new | 8 | 37.5% |

The two old Shorts that reached the most people confirm the diagnosis: shown to several hundred
viewers each, **85–89% swiped away**.

The new pilots look far better, and **that comparison is not yet valid**. They have been shown to
roughly 10–35 people each, and at that exposure an *old-format* Short scored 68.4%. The first
viewers of a Short are the warmest; the rate falls as the feed widens to strangers. So a pilot is
only comparable once it has around 100 views, against old Shorts at similar exposure — which puts
the bar at roughly 12–15%, and anything holding 30%+ at that scale would mean the fix is real.

The test as first designed also had a timing flaw. It waited for each pilot to be judged before
making more, but the feed showed the iron-pillar Short to about eight people in its first 27
hours. At that rate a verdict takes days, and waiting was spending the 2–3 week window rather than
buying information. Production therefore continues at two a day while the measurement matures.
