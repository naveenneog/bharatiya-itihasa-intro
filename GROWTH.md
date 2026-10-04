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

## Spend, measured 27 Sep — and why new generation is on hold

Read from Azure Cost Management (`tools/spend.ps1`), not estimated. The estimate it replaced was
twice too high per Short and missed about $650 of usage entirely.

| | USD, month to date |
|---|---|
| **the whole subscription** | **2,283** |
| the Azure AI resource this pipeline uses (`ai-contosohub530569751908`) | 686 |
| of which on days this repo generated anything (24 Sep, the five pilots) | 29 |
| of which on days it generated nothing (1–5 Sep images, 14–19 Sep Sora) | 657 |

A feed-format Short costs about **$5.90**: $4.80 of Sora (48 s at $0.10/s) and $1 of stills; the
voice and script are cents. Two a day is about $360 a month.

The campaign's own spend is small. The problem is the number around it. The $2,000 monthly budget
and the subscription's total are different figures, and the subscription passed $2,000 on its own
this month — driven by other projects, including $549 of image generation on 1–5 Sep that nothing
in this repo wrote. The subscription was suspended for overuse in August. So new Sora and image
generation is held until the user confirms which figure is the ceiling. Uploading, scheduling
and measuring cost nothing on Azure and continue.

## Measured, 28 Sep — two pilots past the exposure bar

| Short | views | stayed to watch | avg view duration |
|---|---|---|---|
| **The Dot That Became Zero** (new) | **267** | **65.8%** | 0:12 of 0:38 |
| **The King Who Built a School That Lasted 700 Years** (new) | **103** | **58.4%** | — |
| The Surgeon Who Rebuilt a Nose (new) | 14 | 42.9% | — |
| Why Delhi's Iron Pillar Refuses To Rust (new) | 5 | 60% | — |
| Copper Plates and Village Sabhas (old) | 104 | 14.4% | 0:07 |
| Huvishka's Amitabha in Mathura (old) | 85 | 11.5% | 0:08 |

At comparable exposure, the two new Shorts past 100 views hold **four to five times** the stay rate
of the old format's best. The rule set on 26 Sep asks for three Shorts past ~100 views before
calling it, so this is recorded as strong early evidence rather than a verdict.

> **Corrected 2 Oct.** The two old-format Shorts compared here were published before 23 Sep. Six
> old-format Shorts published in the same week as the pilots (24–29 Sep) held 32–56% stayed to
> watch, median 44%, against the new format's 54–74%, median 62%. The gap is about 18 points,
> not four to five times, and the old Shorts were watched for longer. See "Measured, 2 Oct".

Two things the numbers also say. Distribution is uneven: the iron-pillar Short has sat at 5 views
for three days while the zero Short reached 267 — the feed tested one and not the other, and
nothing in these metrics says why. Subscribers went from 42 to 48 in the four days the pilots
have been live, against +4 in the 28 days before 23 Sep. That is too few to attribute to any
one video.

Spend on 28 Sep: subscription $2,373 month to date; this campaign $35.15 in total, of which the
one Short made on 27 Sep cost $5.87.

## Measured, 29 Sep — the feed shows some Shorts and not others

| Short | published (IST) | views | stayed to watch |
|---|---|---|---|
| The Dot That Became Zero | 26 Sep 13:00 | 276 | 66.4% |
| The King Who Built a School That Lasted 700 Years | 27 Sep 13:00 | 167 | 60.8% |
| The Mud-Brick Rooms That Never Reopened | 27 Sep 19:00 | 12 | 56.3% |
| The Surgeon Who Rebuilt a Nose | 26 Sep 19:00 | 14 | 42.9% |
| Why Delhi's Iron Pillar Refuses To Rust | 25 Sep 19:00 | 5 | 60% |
| Chandragupta's Final Battle with Hunger | 28 Sep 17:00 | 4 | 50% |

The two Shorts past 100 views keep holding 60%+ as they widen, against 11–14% for the old
format's best at similar exposure. The third needed for a verdict has not arrived, because the
other four have stalled at 4–14 views. So the pattern is: **when the feed shows a new-format
Short, viewers stay; the feed shows most of them to almost no one.**

> **Corrected 2 Oct.** The 11–14% baseline came from old-format Shorts published before 23 Sep;
> old-format Shorts published 24–29 Sep held 32–56%. The 13:00 pattern below is better explained
> by Shorts published within an hour of each other. See "Measured, 2 Oct".

One pattern in those six, recorded as a question rather than a finding: both Shorts that broke
out were published at 13:00 IST, and all four that stalled at 17:00 or 19:00. With six Shorts,
that split happens by chance about one time in fifteen. If generation resumes, alternating the
publish time is a free way to test it.

Subscribers: 49. Spend: subscription $2,455 month to date; this campaign unchanged at $35.15,
since nothing has been generated during the hold.

## 29 Sep, evening — the budget, a picture bug in all six pilots, and the remakes

**Budget.** The user set the limit as "the whole subscription" with a $5,000 cap. Read here as:
this campaign stays within $2,000 a month, and the subscription within $5,000 × 0.9.
`tools/spend.ps1` applies both and exits 0 (GO) or 3 (STOP); it projects the other projects'
month-end from their last seven complete days (115.30 USD/day on 29 Sep). Generation resumed on
29 Sep under that check: GO, 1,741 USD available.

**The six feed-format Shorts of 24–28 Sep were cut from the wrong clips.** `short.mjs` took its
clips from `short-clips/` in sort order. Every pilot had been re-planned in place, so its folder
held 13 takes from two plans, and the sorted list interleaved them. Iron-pillar and Nalanda
matched their plan on 0 of 6 lines; the other four on 1 of 6. `tools/short-verify.mjs` compares
each line's frame with every take. It found the same thing in the published Zero render: lines
2–6 show old-plan takes, at correlation 0.56–0.70, against 0.03–0.39 for the planned takes.

So the pilots' 60%+ stay rates were measured on pictures out of step with the words. The
words and captions held viewers without the picture-to-word match. Remakes carry the fix
(`short.mjs` now reads the clip list from `short-shots.json`), which is a difference from the
pilots when the two are compared. The published pilots cannot be re-cut without a new upload.

**Remakes.** The next 21 scheduled Shorts (30 Sep–19 Oct) were old-format. Each one is remade
in the feed format, scheduled at 13:00 IST on the old version's day
(`pilot-schedule.mjs add --at … --replaces <old id>`), and the old version, never public, is
deleted once the remake holds the slot (`tools/yt-delete.mjs`, audit in `dist/yt-deleted.json`).
Remakes alternate standard (6 lines, ~35 s) and short (5 lines, ~24 s) as a length test. All
publish at 13:00, which also tests the 13:00 pattern above.

| day | remake | length | id | replaced |
|---|---|---|---|---|
| 30 Sep | Two Stone Poems, One Burning War | standard, 36.6 s | pmc9_sQYk80 | 91lAMk9AoNg, deleted |
| 1 Oct | A Queen Builds in Two Stone Languages | short, 23.8 s | q3nBR8XO_HQ | ltoF2FF5duQ, deleted |
| 2 Oct | The Son Who Took the Enemy's Capital | standard, 33.7 s | mn4XQlav_OA | J7_wkXE6FvI, deleted |
| 3 Oct | Sanskrit Words in Kannada Letters | short, 27.9 s | UAD7Ok0tOEI | WVK5x3rjKaU, deleted |
| 4 Oct | A General Who Carried Home a God | standard, 31.1 s | NIpaJP9TfSE | Ys9ChVkNsgI, deleted |
| 5 Oct | This Cliff Is an Empire's Birth Certificate | short, 25.6 s | tHS4ShgCefY | yQKnvziDbIE, deleted |
| 6 Oct | The Day Harsha Stopped at the Narmada | standard, 31.2 s | i4484gZru5U | ECPklRaY58c, deleted |

Every remake passed `short-verify.mjs` (each line over its planned take) before upload.

**Shorts now link to their full episodes.** A Short's "Related video" field puts a link to a
long-form video on the Short. None of the channel's Shorts had one. On 29 Sep every public Short
whose episode is also public was linked to it (`tools/related-plan.mjs --run`), starting with
Zero, Sushruta and Shravanabelagola among the pilots; each link was confirmed on a fresh page
load. The other three pilots' episodes publish 23 Oct–2 Nov and are linked as they go public.
This adds a path from Shorts into long-form watch time; its effect is not yet measured.

**A finished episode that would never have published.** The channel scanner read "public" from a
video's description excerpt. The private long-form "Mamallapuram: India's Stone Theater"
(description: "...became one public stone theater") was recorded as public, so the backlog
planner left it out. Found when its Short could not be linked to it. The scanner now reads the
visibility cell; a fresh scan found one other misread (Firuz Shah, already in the plan).
Mamallapuram is scheduled for 1 Oct 09:00.

Generated scripts were checked line by line against each episode's narration
(`episodes/<slug>/episode.json`). Of the first seven, six needed hand edits, recorded in the
script's `edited` or `editedHook` field. The faults were invented scenes ("hears a boast and
quietly smiles"), invented stakes, a non-word, a line contradicting the record (Harsha "neither
daring a full crossing"), and "farm talk" for Kannada.

**Accuracy notes.** The Mangalesa episode says the Badami Cave 3 inscription is in Kannada. The
inscription (578 CE) is Sanskrit written in early Kannada script. The remake says that; the
long-form episode and its old Short did not. Found while checking the 7–11 Oct scripts:
- The lion-banner episode dates Mangalesa's inscription to Saka 465 (543). Saka 465 is
  Pulakeshin I's Badami cliff inscription; Mangalesa's is Saka 500 (578). The remake does not
  repeat it.
- The Vikramaditya II episode says "a son must answer where a father had failed". The generated
  script made that literal ("his father fell"). Pulakeshin II was his great-great-grandfather.
- The copper-plate episode dates the Navsari plate to c. 745. The plate is dated Kalachuri year
  490, 738–739 CE. The remake gives no year.

**Hindi test.** The 23 Sep diagnosis found an audience split across five languages. The test
translates Zero's script line by line into Hindi (`episodes/zero-hi`) and cuts it over Zero's
planned clips, `bWacqjE9uh8`, 30 Sep 12:00 IST. The first translation ran 46.3 s of voice
against English 33.3 s, and was tightened to 40.5 s in total against 38.0 s. One other
difference: the English Zero render shows mismatched clips on lines 2–6, the Hindi one does not.
Compared on views 7 days after publishing and on stayed-to-watch (English: 276 views, 66.4%).

**Deleted, 29 Sep.** The six duplicate private copies left by the 28 Sep details-page uploads
(`dist/studio-cleanup.md`); each one's kept copy was confirmed in `dist/publish-log.json` first.
The 23 broken rows are left: they cannot publish, and deleting by title could hit a healthy
video of the same name.

## Measured, 30 Sep

| Short | published (IST) | views | stayed to watch | 7 days after publishing |
|---|---|---|---|---|
| The Dot That Became Zero | 26 Sep 13:00 | 276 | 66.4% | 3 Oct |
| The King Who Built a School That Lasted 700 Years | 27 Sep 13:00 | 204 | 61.3% | 4 Oct |
| The Mud-Brick Rooms That Never Reopened | 27 Sep 19:00 | 29 | 61.8% | 4 Oct |
| Chandragupta's Final Battle with Hunger | 28 Sep 17:00 | 27 | 51.9% | 5 Oct |
| The Surgeon Who Rebuilt a Nose | 26 Sep 19:00 | 15 | 46.7% | 3 Oct |
| Why Delhi's Iron Pillar Refuses To Rust | 25 Sep 19:00 | 5 | 60% | 2 Oct |

Read at 04:48 IST (`dist/yt-retention-history.json`). Nalanda went from 167 to 204 views in a
day and still holds 61%; Zero has stopped at 276. Under the rule set on 26 Sep, two pilots were
shown and none has yet reached the "not shown" date. Subscribers: 50 (49 on 29 Sep).

Spend: subscription $2,640.59 month to date (Cost Management lags about a day); this campaign
$99.36 in total, of which $64.21 on 29 Sep (twelve remakes' clips and the Hindi render).

`tools/yt-retention.mjs` now reads the subscriber count from the Studio dashboard and appends
each run to a history file; `pilot-schedule.mjs ids --published` leaves out Shorts that have not
published yet, whose analytics are empty.

**Accuracy notes, 12–16 Oct scripts:**
- The Dantidurga episode stages the Hiranyagarbha ("golden womb") rite at Ellora and cites the
  Samangad plates. The Sanjan plates of Amoghavarsha I (871) place it at Ujjain, with the
  Gurjara king as door-keeper. The remake follows the Sanjan plates.
- The Arab-merchants episode says Arab merchants ranked Amoghavarsha "beside the caliphs and the
  emperors of China". Sulaiman (851) lists four great kings of the world: the Caliph, the Emperor
  of China, the Byzantine emperor and the Balhara. The remake says that, without ranking them.

**Remakes, 30 Sep.** Thirteen more old-format Shorts were replaced, 7–19 Oct, all at 13:00 IST;
every old version was deleted after its remake was scheduled and verified.

| day | remake | label, length | id | replaced |
|---|---|---|---|---|
| 7 Oct | The Boar Seal That Decided Who Held the Land | short, 24.0 s | NMWtoPBadwU | IVjyoB29izU |
| 8 Oct | The Copper Grant That Records a Win Over the Caliphate | standard, 33.4 s | BikRwCGrs_s | mo4XP0qCNgc |
| 9 Oct | The Vassal Who Toppled a 200-Year Empire | short, 26.6 s | fRWkYDShL08 | ah2_XeUmGsg |
| 10 Oct | The Rivals Who Claimed the Same Ancestors | standard, 33.4 s | kGSoIO_TB6Y | OOwysjNaiTE |
| 11 Oct | The Conqueror Who Refused To Loot Kanchi | short, 26.1 s | 6Yx7s5gbzGY | bEviyjfljZ4 |
| 12 Oct | The Oldest Kannada Book Is a Guide for Poets | standard, 29.4 s | moVmDNemeAo | EvZCYyoPb1E |
| 13 Oct | The Deccan King Among the World's Four Great Kings | short, 26.7 s | wkputBXtXKQ | rMVrl89jrIg |
| 14 Oct | The King Reborn From a Golden Womb | standard, 28.4 s | caBeyMzJQ4k | Gf6MG8fU24Y |
| 15 Oct | The Deccan King Who Won the North and Went Home | short, 24.8 s | C68vMG9mkyU | _OtV47fKogg |
| 16 Oct | The Temple Carved Down Into a Hill | standard, 29.6 s | oRidqg8G03U | mxdRQpDWtiQ |
| 17 Oct | India's Earliest Book Devoted to Mathematics Alone | short, 28.8 s | XO9WLd8EJDU | lUDfeHzedg4 |
| 18 Oct | How Kerala Hid Numbers Inside Poems | standard, 32.3 s | wm6g9UH5wa4 | 4J5u1xOq8Vc |
| 19 Oct | The Prince Who Died on an Elephant | short, 25.8 s | ChORa_FGtF8 | qm9yOhUeluI |

The length labels no longer separate the Shorts cleanly: hand-edited "standard" scripts render at
28.4–36.6 s and "short" ones at 23.8–28.8 s, so the two ranges touch. The length test is read on
each Short's measured duration, not its label.

One remake was uploaded twice. Its first title and kicker said "pure mathematics", which means
abstract as opposed to applied, while the book's problems are practical; the verified claim is
"devoted entirely to mathematics". It was re-rendered from the same clips and voice, re-uploaded,
and the first private copy (`bLEePOnRrPw`) deleted before it was ever scheduled.

The old-format Shorts in the old schedule (through 19 Oct) are all replaced. From 20 Oct the
backlog publishes two Shorts a day (13:00 and 19:00), so remakes continue at two a day.

Backlog, 30 Sep: 40 uploaded, none failed; 12 left. Uploads today: 54 in total.

**Next lever found: playlists.** The channel has 18 playlists. The only history one, "Indian
History - Gupta Period", holds 2 videos. The 145 history episodes matched to their folders (35
public, 42 scheduled, 68 private awaiting dates) are otherwise in no playlist. Era playlists in
story order would let a viewer who finishes one episode continue to the next. Not built yet.
(Built 3 Oct, in publish order rather than story order; see 3 Oct.)

## Measured, 1 Oct — the Hindi Short

| Short | language | published (IST) | live when read | views | stayed to watch |
|---|---|---|---|---|---|
| बिंदु जो बना शून्य (Zero, translated) | Hindi | 30 Sep 12:00 | 17.9 h | **476** | **74.8%** |
| Two Stone Poems, One Burning War (remake) | English | 30 Sep 13:00 | 16.9 h | 54 | 55.6% |
| The Dot That Became Zero | English | 26 Sep 13:00 | 4.7 days | 276 | 66.4% |
| The King Who Built a School That Lasted 700 Years | English | 27 Sep 13:00 | 3.7 days | 204 | 60.9% |
| The Mud-Brick Rooms That Never Reopened | English | 27 Sep 19:00 | 3.5 days | 30 | 61.8% |
| Chandragupta's Final Battle with Hunger | English | 28 Sep 17:00 | 2.5 days | 28 | 53.6% |
| The Surgeon Who Rebuilt a Nose | English | 26 Sep 19:00 | 4.5 days | 15 | 46.7% |
| Why Delhi's Iron Pillar Refuses To Rust | English | 25 Sep 19:00 | 5.5 days | 5 | 60% |

Read at 05:53 IST (`dist/yt-retention-history.json`). Subscribers: 51.

The Hindi translation of Zero reached 476 views in under 18 hours. No other Short on the channel
had passed 104 by 23 Sep (`dist/yt-stats-0923.json`) or 276 since, and it kept 74.8% of viewers past
the opening. Its English original reached 276 views and stopped growing after about two days;
Nalanda also stopped at 204. One
pair is one data point. Two differences besides language: the Hindi render shows each line over
its planned clip (the English one does not, lines 2–6), and it published at 12:00, not 13:00.

**The replication test.** Two more Hindi Shorts, written from the episodes' English and Hindi
narration and web-checked. Both reuse their English pilots' clips, so they cost only speech, and
both publish at 12:00 IST:

| Hindi Short | publishes | English counterpart | its result |
|---|---|---|---|
| नालंदा: जहाँ द्वार पर ही परीक्षा होती थी (`nalanda-hi`) | 2 Oct 12:00 | Nalanda, 43.2 s | shown: 204 views |
| सुश्रुत: पत्ते के नाप से बनी नई नाक (`sushruta-hi`) | 3 Oct 12:00 | Sushruta, 41.7 s | not shown: 15 views |

They are not translations of the English pilot scripts, whose opening lines invent scenes; they
make the same claims more plainly. If Sushruta, not shown in English, is shown in Hindi, language
is the more likely cause than topic. Read at 24 hours and at 7 days, on the same rule as the
pilots.

Decision rule, fixed on 1 Oct before either result: if both pass about 100 views within 7 days,
the channel starts a Hindi line, a Hindi version of each checked new-format Short at 12:00 daily
from its existing clips. If neither does, Hindi versions stop. If one does, two more Hindi tests
come before any decision.

**Spend, October.** `tools/spend.ps1` had a month-boundary bug, fixed 1 Oct (commit `7e27e10`):
on the 1st, "month to date" held no complete days, so the other projects' rate came out as $0
and the guard would have allowed the full $2,000. Fixed, it reads the other projects at $124.88
a day (23–29 Sep), projects them to $3,871 for October, and leaves this campaign **$628.80 for
the month**, about $20 a day, under the $5,000 × 0.9 subscription limit. That covers remakes at
two a day ($12) and Hindi versions (speech only). It does not cover the twelve-a-day catch-up
pace of 29–30 Sep.

**Subscribers per view.** The overview card "Subscribers +N" counts the change in subscriber
count from people who watched a video; `yt-retention.mjs` reads it from 1 Oct, with the share of
views from the Shorts feed. Read at 07:05 IST:

| Short | views | subscribers gained | from the Shorts feed |
|---|---|---|---|
| The Dot That Became Zero (English) | 276 | +2 | — |
| The King Who Built a School… (Nalanda, English) | 204 | +2 | 90.3% |
| बिंदु जो बना शून्य (Zero, Hindi) | 478 | +1 | 99.4% |
| the other five | 5–54 | none shown | 90.7–100% |

That is one subscriber per 100 to 500 views. At that rate the remaining 949 subscribers need
roughly 100,000 to 450,000 Short views; the eight new-format Shorts published since 25 Sep have
reached 1,090 views in total. Two levers follow: more views per Short (distribution, which the Hindi test
probes), and more subscribers per view. The Hindi Short drew the most views but the fewest
subscribers per view, so far from one data point each. The Shorts' closing card names the series
but does not invite a subscription; a short invitation on that card is the next candidate change.

**Remakes, 1 Oct**, ahead of the two-a-day stretch that starts on 20 Oct; both old versions
deleted after the remakes were scheduled and verified:

| slot | remake | label, length | id | replaced |
|---|---|---|---|---|
| 20 Oct 13:00 | The Seal That Spoke for Nalanda's Monks | standard, 33.0 s | DlIPcteLV7E | PLn9YkeM_Lk |
| 20 Oct 19:00 | When Western India's Silver Changed Kings | short, 27.2 s | R-akbpHGmXE | Z4s_SYCGF8s |

Accuracy notes: the Chandragupta II episode quotes the Udayagiri inscription as saying he
"conquered the whole of the western region"; that wording could not be matched to the
inscription's published text, and the remake does not quote it. The Nalanda seal with the
Dharma wheel between two deer is mostly Pala-period (8th–12th century); the remake gives no date.

Backlog, 1 Oct: the last 12 uploaded, none failed; every item in the plan is on the channel. 169
await dates, which `publish-run --schedule` gives as they come within 60 days. Uploads today: 16.

## Measured, 2 Oct — Shorts an hour apart, and the old format in the same week

| Short | published (IST) | views | stayed to watch | from the Shorts feed |
|---|---|---|---|---|
| बिंदु जो बना शून्य (Zero, Hindi) | 30 Sep 12:00 | 525 | 74% | 99% |
| A Queen Builds in Two Stone Languages (remake) | 1 Oct 13:00 | **314** | 46.6% | 98.1% |
| The Dot That Became Zero | 26 Sep 13:00 | 276 | 66.4% | — |
| The King Who Built a School… (Nalanda) | 27 Sep 13:00 | 204 | 60.9% | — |
| Two Stone Poems, One Burning War (remake) | 30 Sep 13:00 | 73 | 53.5% | 90.4% |
| The Mud-Brick Rooms That Never Reopened | 27 Sep 19:00 | 30 | 61.8% | — |
| Chandragupta's Final Battle with Hunger | 28 Sep 17:00 | 28 | 53.6% | 100% |
| The Surgeon Who Rebuilt a Nose | 26 Sep 19:00 | 15 | 46.7% | — |
| Why Delhi's Iron Pillar Refuses To Rust | 25 Sep 19:00 | 5 | 60% | — |

Read at about 07:10 IST (`dist/yt-retention-history.json`). Subscribers: 52. The first remake, the
Lokamahadevi Short, reached 314 views in about 18 hours.

**Every Short on the channel, not only the new ones, has been shown more since 24 Sep.**
`tools/yt-stats.mjs` (2 Oct, `dist/yt-stats.json`; the 23 Sep read is kept as
`dist/yt-stats-0923.json`) gives every public Short's publish date and views. The old-format
Shorts, all published at 18:00 IST (`dist/schedule-log-shorts.json`):

| old-format Shorts published | count | views, range | views, median |
|---|---|---|---|
| 10–20 Sep | 11 | 1–104 | 21 |
| 23–29 Sep | 7 | 22–230 | 98 |

Something lifted the channel's Shorts as a whole from about 24 Sep: the same week the backlog
uploads ran at about 50 a day and the new-format Shorts began. This data cannot separate those.

**The old format, measured in the same week as the new one.** Six old-format Shorts published
24–29 Sep against the five new-format Shorts with views to measure:

| | Shorts | length | stayed to watch | average view duration | share of the Short watched |
|---|---|---|---|---|---|
| old format | 6 | 43–53 s | 32–56%, median 44% | 0:17–0:30 | 35–56%, median 44% |
| new format | 5 | 38–43 s | 54–74%, median 62% | 0:12–0:18 | 32–44%, median 39% |

The new format keeps about 18 more points of viewers past the opening. Viewers who stay watch
the same share or less of it, and because it is shorter they watch fewer seconds. Subscribers
gained per view are indistinguishable at these numbers: 5 from 774 views for the old six, 5 from
1,470 for the nine new-format Shorts read the same morning. The 28 Sep claim of "four to five times" compared the
new Shorts with old ones from an earlier week, before the lift; it is corrected above.

**Shorts published within an hour of each other.** In all five such pairs on the channel, one of
the two stalled:

| day | earlier | later |
|---|---|---|
| 25 Sep | old, 18:00: **171** | new, 19:00: 5 |
| 26 Sep | old, 18:00: 62 | new, 19:00: 15 |
| 27 Sep | old, 18:00: **230** | new, 19:00: 30 |
| 28 Sep | new, 17:00: 28 | old, 18:00: **146** |
| 30 Sep | Hindi, 12:00: **525** | English, 13:00: 73 |

Shorts with no other Short within an hour reached 22–314 views (67–314 from 24 Sep); the stalled
Short in each pair reached 5–73. Evening is not the cause: the 18:00 old-format Shorts were shown. Five pairs are
few, and in four of them the stalled Short was a new-format pilot at 17:00 or 19:00, so this is
recorded as the working explanation, not a finding. The two Hindi tests were scheduled an hour
before English Shorts, which would have confounded them; both were moved to 19:00 on 2 Oct, six
hours after the English 13:00 Shorts (`tools/yt-reschedule.mjs`, which confirms by reading the
stored date and time back). No other two Shorts are scheduled within five hours of each other: one
a day at 13:00 until 19 Oct, then 13:00 and 19:00. A Hindi line, if it starts, needs a slot at
least five hours from both, such as 07:00.

**The remake test, from 21 Oct.** Remakes cost about $6 each, and the comparison above no longer
shows the new format earning more views or subscribers. Rule fixed on 2 Oct, before any result:

- From 21 Oct the old-format Shorts alternate: on 21 Oct the 13:00 Short is remade and the 19:00
  one kept as uploaded, the next day the reverse, and so on (`tools/remake-queue.mjs` assigns the
  arm; `dist/remake-decisions.json` records each kept Short's fact-check). A kept Short is checked
  against its episode first, and one with a factual error is remade regardless, with the error
  recorded.
- Read on 4 Nov, when the 14 Shorts of 21–27 Oct are 7 days old: median views per arm, pooled
  subscribers per 100 views, stayed to watch, average view duration.
- Remake every old-format Short again if the remade arm's median views are at least 1.5 times the
  kept arm's, or its subscribers per 100 views are at least 1.5 times with 10 or more subscribers
  across both arms. Stop remaking if neither holds and the kept arm's watch time per view is
  equal or higher. Otherwise alternate for another week and read again.
- Cost: one remake a day, about $6, within the October allowance.

Spend: subscription $98.86 for October so far (1 Oct, reported a day late); this campaign $9.76.
Allowance for the rest of October $543.07, about $18 a day. Backlog: three items came within 60
days and were scheduled for 1 Dec, the first December dates the date picker accepted. Related
links: the Mamallapuram Short now links to its episode, public since 1 Oct (35 linked).

## 3 Oct — the subscription's spend jumped, and the guard now says STOP

**Spend.** The subscription by day, from Azure Cost Management (UTC days; the latest is still
being reported):

| days | USD per day |
|---|---|
| 20–22 Sep | 45.91, 46.52, 45.94 |
| 23–28 Sep | 120.68, 239.40, 154.85, 102.92, 87.94, 90.23 |
| 29 Sep – 2 Oct | 193.76, 143.94, 119.03, **266.57** |

On 2 Oct the shared AI resource (`ai-contosohub530569751908`) cost $190.53, of which $184.40 was
Sora. This campaign generated nothing that day; another project using the same resource did.
October so far: $385.61 after two days. Projected for the month, counting 3–31 Oct at each rate:

| if other projects average | October ends near |
|---|---|
| $124.41/day (24–30 Sep) | $3,994 |
| $164.52/day (30 Sep – 2 Oct) | $5,157 |
| $266.57/day (2 Oct, part-reported) | $8,116 |

The user's cap is $5,000 for the subscription; this campaign's limit is $5,000 × 0.9. At the last
three days' rate the subscription passes the cap without any spend from this campaign. This
campaign's own October spend is $9.76 (1 Oct).

**Two guard fixes** (`tools/spend.ps1`):
- *Double counting.* The guard's query, filtered to the shared resource, grouped by meter, over a
  window that crosses a month boundary, returned the new month's first day twice: 1 Oct read
  $19.52, every meter exactly doubled, where the same query the day before and four other query
  shapes read $9.76. Reproduced twice. The guard now uses one query shape per purpose, none of
  which combines all three conditions. The error would have counted the other projects' spend as
  this campaign's once 1 Oct became a complete day.
- *A slow rate.* The seven-complete-day average still read $124 a day from 24–30 Sep. The guard
  now also averages the last three days, part-reported ones included, and uses the higher. It also
  stopped subtracting the whole shared resource from a day on which this repo generated anything;
  it subtracts this repo's estimated share ($0.80 per clip, $0.20 per still, from its own files),
  because the other project now spends on that resource too.

With both fixes the guard reads **STOP**: −$985.75 available, using a deliberately pessimistic
projection that also counts the part-reported days once more.

**What STOP means here.** No Sora or image generation while it holds. Nothing was due: the next
old-format Shorts publish on 21 Oct, and their remakes would be generated from about 13 Oct. If
the guard still says STOP when a remake is due, that Short publishes as uploaded and is excluded
from the remake test (`remake-queue.mjs --decide skip`). Hindi versions of existing Shorts use
speech only, cents per Short, and continue under the Hindi rule.

**Measured, 3 Oct**, read at 04:36 IST. Subscribers: 52.

| Short | published (IST) | views | stayed to watch | from the Shorts feed |
|---|---|---|---|---|
| बिंदु जो बना शून्य (Zero, Hindi) | 30 Sep 12:00 | 533 | 73.8% | 94.8% |
| A Queen Builds in Two Stone Languages (remake) | 1 Oct 13:00 | 347 | 47.1% | 97.4% |
| Two Stone Poems, One Burning War (remake) | 30 Sep 13:00 | 80 | 52.6% | 80.8% |
| The Son Who Took the Enemy's Capital (remake) | 2 Oct 13:00 | 10 | 50% | 90% |
| नालंदा: जहाँ द्वार पर ही परीक्षा होती थी (Hindi) | 2 Oct 19:00 | 5 | 50% | — |

The two Shorts of 2 Oct were six hours apart and both are slow at 10–15 hours old, so the pairing
explanation does not cover them. The Hindi Nalanda is read at 7 days (9 Oct) under the rule. The
pilots are unchanged; Why Delhi's Iron Pillar Refuses To Rust passed 7 days at 5 views, "not
shown" under the rule, and it was the later Short of an hour-apart pair.

**Era playlists, made 3 Oct.** Until today the 36 public history episodes were in no playlist
(the older "Indian History - Gupta Period" holds two earlier videos and is left as it is), so a
viewer who finished one episode had no path to the next except YouTube's suggestions. Four
public playlists now hold all 36, one per era bucket with public episodes
(`tools/yt-playlist.mjs`, registry `dist/playlists.json`):

| playlist (each titled "… — Indian History \| Bhāratīya Itihāsa") | id | public episodes in it | scheduled episodes still to join |
|---|---|---|---|
| The Maurya Empire | `PLEqn5uGZ140A` | 9 | 2, from 21 Oct (a third is in already; see below) |
| The Kushan Empire | `PLQvE4J8clVv0` | 10 | 2, from 23 Oct |
| From the Guptas to Harsha | `PLMv0ip_GYHKQ` | 7 | 14, from 25 Oct |
| The Pallavas of Kanchi | `PLKDdnW-GHeg8` | 10 | 1, on 21 Nov |

The gupta bucket also holds stories after the Gupta empire, up to Harsha and Nalanda's contacts
with Tang China (7th century), so its title names that span rather than the Gupta empire alone.
The order is "Date published (oldest)": YouTube keeps it as episodes publish, where a story order
would need each new episode placed by hand. Read signed out, each page lists its public episodes
in ascending publish date.

A scheduled episode joins its playlist on its publish day (`yt-playlist.mjs sync`, daily), not
before. Tested on Chandragupta Seizes Magadha (`d8MOB6D3BEg`, 20 Oct 09:00): its stored date and
time read Oct 20, 2026 9:00 AM before and after the playlist save, both in the tool and separately
from `yt-reschedule.mjs`. Signed out, the Maurya page then showed "1 unavailable video is hidden"
and, before the public episodes were added, "No videos in this playlist yet". That video stays in
the playlist; it publishes on 20 Oct.

The effect is not measured yet. Each playlist's public view count is recorded daily in
`dist/playlists.json` (all four 0 on 3 Oct). Chalukya, Rashtrakuta and Delhi-sultanate get a
playlist once one of their episodes is public or within 14 days; Chalukya's first is 8 Nov.

## 4 Oct — another project's Sora spend, a Short's first day, and an 18-day gap in episodes

**Spend.** 2 Oct has settled at more than twice what it read on 3 Oct. Each figure below read the
same through six query shapes (single-day and multi-day windows, ungrouped, by meter and by
resource), so this is late-reported usage, not the month-boundary double count of 3 Oct.

| UTC day | subscription | shared AI resource | of which Sora |
|---|---|---|---|
| 1 Oct | 119.03 | 9.76 | 8.00 (this campaign) |
| 2 Oct | **610.31** (read 266.57 on 3 Oct) | 381.06 | 368.80 |
| 3 Oct, still being reported | 110.97 | 45.47 | 41.20 |

Azure Monitor's request counts on the shared resource (`AzureOpenAIRequests`, by deployment)
show when. 2 Oct, 06:00–10:00 UTC: `sora-2` 512 and `sora-2b` 364. 3 Oct, 13:00–21:00 UTC:
`sora-2` 306, `sora-2b` 379 and `gpt-image-2` 572. This campaign generated nothing on either day;
its only October generation is 1 Oct 00:00 UTC, the $9.76. 3 Oct's requests are of the same order
as 2 Oct's, and most of their cost is not reported yet. October so far: $840.31. The guard reads
STOP: at the last three days' rate for other projects ($276.85/day) the month ends near $9,146;
at the previous seven days' rate ($110/day) it would end near $4,140, under the $5,000 cap. Which
project uses `sora-2`/`sora-2b` on `ai-contosohub530569751908` is not known here.

**Measured, 4 Oct**, read at 04:45 IST. Subscribers: 52, unchanged since 3 Oct.

| Short | published (IST) | views 3 Oct → 4 Oct | stayed to watch |
|---|---|---|---|
| बिंदु जो बना शून्य (Zero, Hindi) | 30 Sep 12:00 | 533 → 533 | 73.8% |
| A Queen Builds in Two Stone Languages (remake) | 1 Oct 13:00 | 347 → 354 | 47% |
| The Dot That Became Zero (pilot) | 26 Sep 13:00 | 276 → 276 | 66.4% |
| The King Who Built a School That Lasted 700 Years (pilot) | 27 Sep 13:00 | 204 → 205 | 60.9% |
| Two Stone Poems, One Burning War (remake) | 30 Sep 13:00 | 80 → 81 | 53.3% |
| नालंदा: जहाँ द्वार पर ही परीक्षा होती थी (Hindi) | 2 Oct 19:00 | 5 → 11 | 75% |
| The Son Who Took the Enemy's Capital (remake) | 2 Oct 13:00 | 10 → 10 | 50% |
| सुश्रुत: पत्ते के नाप से बनी नई नाक (Hindi) | 3 Oct 19:00 | 14 at about 10 h | 28.6% |
| Sanskrit Words in Kannada Letters (remake) | 3 Oct 13:00 | 3 at about 16 h | — |

Pilots at 7 days, under the rule: *The Dot That Became Zero* (276) and *The King Who Built a School*
(205) were shown; *Why Delhi's Iron Pillar Refuses To Rust* (5) and *The Surgeon Who Rebuilt a
Nose* (15) were not. *The Mud-Brick Rooms That Never Reopened* (30 at 6.4 days) and *Chandragupta's
Final Battle with Hunger* (28 at 5.5 days) are read on 5 and 6 Oct.

**A Short's views come in its first day.** Every feed Short measured more than once, by hours
since publishing (`dist/yt-retention-history.json`):

| Short | early reading | latest reading |
|---|---|---|
| बिंदु जो बना शून्य | 476 at 18 h | 533 at 89 h |
| A Queen Builds in Two Stone Languages | 314 at 18 h | 354 at 64 h |
| Two Stone Poems, One Burning War | 54 at 17 h | 81 at 88 h |
| The Son Who Took the Enemy's Capital | 10 at 16 h | 10 at 40 h |
| The King Who Built a School That Lasted 700 Years | 204 at 64 h | 205 at 160 h |
| The Mud-Brick Rooms That Never Reopened | 29 at 58 h | 30 at 154 h |
| Chandragupta's Final Battle with Hunger | 27 at 36 h | 28 at 132 h |

From about 40 hours on, no Short gained more than eight views. The count at about 18 hours already
separates the Shorts the feed picked up from the ones it did not, so the 7-day reads in the fixed
rules only confirm what is known on day two. The rules stay as they were fixed; a new rule can
read at 48 hours.

**Checked and rejected: the second Short of a day stalls.** Every 19:00 Short so far had a Short
earlier the same day, and all of them stalled (5–30 views), which suggested it. The chronology
does not support it. Old-format Shorts went out on the same days at times this campaign did not
set, and on 27 Sep three Shorts reached 205, 228 and 30. From 24 to 30 Sep, days with two or three
Shorts totalled 173–614 views and days with one 66–354 (old-format counts from the 2 Oct
snapshot). So no rule on Shorts per day. The exception is 2 and 3 Oct, two Shorts each, at 21 and
17 views in total: all four are at 3–14 views, where every earlier day since 24 Sep had at least
one Short past 60. From 4 Oct one remake publishes a day at 13:00, and these show whether that
continues.

**Episodes were missing from 2 to 19 Oct; they now publish daily from 5 Oct.** Until 1 Oct the
channel published an episode on most days (14 between 12 and 30 Sep, then Mamallapuram on 1 Oct).
The publish plan's episodes started on 20 Oct, so 2–19 Oct had a Short a day and no episode,
against the user's "videos one per day". Nobody decided this. The planner started the day after
the channel's last scheduled item of any kind, and when the plan was made old-format Shorts were
scheduled through 19 Oct while episodes ran only through 1 Oct.

`tools/shift-books.mjs --days -15 --go` moved the 43 scheduled episodes from 20 Oct–1 Dec to 5
Oct–16 Nov, in order and one at a time, through `yt-reschedule.mjs`. Each move was confirmed by
reading Studio's stored date and time back. It then moved the plan's 121 undated episodes by the
same 15 days, so the first, due 2 Dec, now falls on 17 Nov. A fresh scan afterwards shows 43
scheduled episodes on 43 consecutive days from 5 Oct to 16 Nov, each exactly 15 days earlier,
and no other row changed. Two negative tests ran before the moves. A public video was refused
before any browser opened. With the browser profile held by another process, the run stopped at
its first move and left both registers byte-identical.

`plan-publish.mjs` now starts each kind the day after its own last date, and never on a day that
has passed. Run against a copy of the scan set up like late September, it starts episodes
tomorrow and Shorts on 20 Oct; the old shared start, applied as a mutation, fails that check.

What changes: the episodes finish on 17 Mar 2027 rather than 1 Apr, the era playlists fill
sooner, and more Shorts have a public episode to link to. Both Nalanda Shorts, for example, can
link to their episode on 17 Oct rather than 1 Nov. The scheduled episodes in the 3 Oct playlist
table now join earlier: Maurya's on 6–7 Oct, Kushan's 8–9 Oct, From the Guptas to Harsha's
10–23 Oct and Pallava's on 6 Nov. Chalukya's first episode is now 24 Oct, so its playlist comes
due on 10 Oct.

**Hindi Shorts now link to their full story.** `related-plan.mjs` paired a Short with the episode
of the same slug, so a Hindi version (`zero-hi`) never matched its English episode (`zero`), and
none of the three Hindi Shorts had a related video. A `-hi` slug now pairs with the English
episode, whose English title the link shows: बिंदु जो बना शून्य → *Brahmagupta and the Birth of
Zero* and सुश्रुत → *Sushruta: The Healer's Knife*, the same targets as the English Shorts, both
saved and read back on 4 Oct (37 Shorts linked). Hindi Nalanda pairs once its episode is public.

**Today's pass** also dated 18 more backlog items within the 60-day horizon: the 16 episodes for
17 Nov–2 Dec (Delhi Sultanate) and the two Shorts for 2 Dec. All were confirmed, none failed.
Nothing was due in the remake queue (the first A/B Shorts are 21 Oct), and no playlist addition
was due. Uploads: none. Generation: none (STOP).
