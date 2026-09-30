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
