# Context

Recovery document. If the conversation context is lost, this file plus the git log is enough to
resume cold. Method for the intro itself lives in the **`ink-and-light` skill**
(`C:\Users\navg\DailyApps\dailyapps-skills\ink-and-light\SKILL.md`) — this file is *project state*.

Last updated: 2026-08-02.

---

## Read this first — the shape of things as of 2 Aug 2026

Five things changed structurally and none of them are visible from the file tree alone.

1. **This is five git repositories now, not one.** `bharatiya-itihasa-intro` is a ~1 MB public
   code repo; `episodes/`, `films/`, `eras/`, `versions/` and `artifacts/` are private submodules.
   Clone with `--recurse-submodules`. See "The repositories".
2. **Episodes exist in two languages.** `episodes/zero` is English, `episodes/zero-hi` is Hindi,
   and they are *different timelines* — Hindi narration runs 6.5 min where English runs 5.5. See
   "Hindi is a second timeline".
3. **Nothing generated is deleted.** `tools/keep.mjs` archives instead. Do not add an `rm` of a
   frame directory, a plate directory or probe output. See "Keeping what was generated".
4. **Sora runs across two deployments** with a self-tuning per-lane concurrency. See "Sora
   capacity".
5. **Finished videos are uploaded by the local yt-agent**, never by driving a browser, private by
   default. `node tools/upload.mjs --dir dist/<era>/<slug>_book`. See "Publishing to YouTube".

**One `series.mjs` per era, and never edit `tools/` while it runs.** It takes a lock now, but the
second rule is not enforceable — the runner spawns a fresh `node` per stage and will read a
half-written file. That mistake has cost stories twice.

**When the ledger and the artefacts disagree, believe the artefacts.** `dist/<era>/series.json` was
corrupted by two concurrent runners on 3 Aug; `dist/uploads.json` and a master's measured loudness
are written once and are trustworthy.

Standing constraints, unchanged and repeatedly verified:
`C:\Users\navg\DailyApps\IndianHistory` is **read from and never written to**, and the Indian
Tales repos are never touched at all.

**It is read-only to us, but not to its author.** The library grew from 695 to 698 stories
overnight on 17–18 Aug, unannounced. Treat the corpus as live: story counts move, eras gain
members, and anything derived from it must survive that without hand-editing. See "Slug
collisions resolve themselves" and "A ledger shorter than the corpus".

---

## Version history

| id | what | file | state |
|---|---|---|---|
| v1 | `One Line, Five Thousand Years` — procedural SVG/GSAP, no AI, 29.2 s, 59.9 fps | `dist/itihasa-intro.mp4` | shipped; user was **not satisfied**, which triggered the AI pivot |
| v2a–d | four AI art directions, 4 beats each | `versions/v2*/build/` | exploration; **v2c "Ink and Light" chosen by the user** |
| v3 | Ink and Light extended — 14 beats, 61.1 s, silent | `dist/v3-empires-ink.mp4` | approved |
| v4 | v3 + synthesised score | `dist/v4-empires-scored.mp4` | approved |
| v5 | mobile type (1.6×) + reworked score | `dist/v5-empires-mobile.mp4` | current best full sequence |
| v6 | 15 s per-episode stinger (2 beats: `00-itihasa` + `05-gupta`) | `dist/v6-episode-titles.mp4` | used by episode cuts C/D/E |
| **v7** | **Ink and Light — the Gupta Age.** One kingdom, 10 beats, **45.0 s**, −13.9 LUFS | `dist/v7-gupta-ink.mp4` | the per-kingdom sequence the user asked for |
| v7s | the same sequence cut to 2 beats, **15.8 s**, −14.1 LUFS | `dist/v7-gupta-stinger.mp4` | what an episode opens with |
| ep01 | the Aryabhata episode as an actual film, cut E, **5:39**, −14.2 LUFS, −1.4 dBTP | `dist/ep01-aryabhata-youtube.mp4` | **shippable**; years fixed, thumbnail picked |

`dist/` is **gitignored** — masters are regenerable from the committed stills, clips and tools.
Stills, clips and thumbnail plates **are** committed (generative output is not reproducible) —
since 2 Aug they live in the `episodes/`, `films/`, `eras/` and `versions/` **submodules** rather
than in the code repo. Push them with `node tools/push-assets.mjs`.

Commit hashes below predate the history rewrite of 2 Aug and no longer resolve in the code repo;
they are still valid in the mirror backup at `ItihasaIntro-backup-20260802-144558.git`.

Commits: `73f85f6` v2 · `a8d92bc` v3 · `e856cdd` v4 · `7e7d6bf` v5 · `4a6d48a` episode integration ·
`dcb2185` YouTube review + skill · `096f2bc` Gupta sequence + episode renderer ·
`f469a86` procession fixed by listening · `9d85c46` delivery + loudness headroom ·
`377f439` years spoken as years · `30e36fc` re-render with corrected narration ·
`58f65b3` thumbnail.

### The full build, from nothing to uploadable

```
node tools/gen-stills.mjs v7-gupta            # twice — two candidates per beat
#   contact-sheet r1 vs r2, write versions/v7-gupta-ink/picks.json with reasons
node tools/gen-clips.mjs v7-gupta --seconds 8              # ~12 min
node tools/build-version.mjs  v7-gupta --variant kingdom
node tools/render-master.mjs  v7-gupta --variant kingdom --score --out dist/v7-gupta-ink.mp4
node tools/build-version.mjs  v7-gupta --variant stinger
node tools/render-master.mjs  v7-gupta --variant stinger --score --out dist/v7-gupta-stinger.mp4

node tools/speak.mjs --all --dry              # audit narration for year bugs
node tools/speak.mjs --all                    # re-synthesise the affected lines
node tools/build-episode.mjs                  # picks up the overrides
node tools/render-episode.mjs --cut cut-e-framed --intro dist/v7-gupta-stinger.mp4 --fps 25
#   ~38 min at 1080p25 for 5.4 min. Add --limit 40 --scale 0.5 --fps 10 for a draft,
#   or --reuse to re-splice a different intro without re-capturing frames.

node tools/gen-thumb-art.mjs                  # thumbnail plates
node tools/thumbnail.mjs                      # candidates + feed-size sheet
node tools/thumbnail.mjs --pick LOUD-hold-cop
node tools/publish.mjs --cut cut-e-framed --intro dist/v7-gupta-stinger.mp4
node tools/build-gallery.mjs
```

---

## v7 — the Gupta Age, 10 beats

Ten aspects of one kingdom, accelerating **6.0 → 3.4 s**, every beat numbered (I–X).

`01-dinara` gold coin · `02-shunya` place value · `03-bhramati` the Earth turns ·
`04-vritta` π ≈ 3.1416 · `05-stambha` the iron pillar · `06-ajanta` · `07-nalanda` ·
`08-kavya` Kālidāsa · `09-chaturanga` · `10-hunas` the setting.

**Two candidates were generated per beat.** The winner is recorded in
`versions/v7-gupta-ink/picks.json` **with the reason it won**, and `tools/picks.mjs` makes the
pipeline use the *chosen* revision rather than the newest.

**Fact-check corrections already applied to the on-screen copy — do not undo:**
Ajanta is **Vākāṭaka under Hariṣeṇa c. 460–480**, not Gupta. The empire did **not** fall to the
Hunas — **Skandagupta defeated them** (Junagadh inscription c. 456); the collapse was
multi-causal. The written *zero symbol* is not epigraphically attested until post-Gupta, so beat
II claims **place value**, not the zero.

---

## The sequence (v3/v5), 14 beats

Two opening beats with no numeral and no date, then twelve empires, then the wordmark.
Durations accelerate **6.4 → 3.4 s**, unbroken.

`00-itihasa` (iti ha āsa, "so indeed it was") · `00-bharatavarsha` · `01-indus` · `02-vedic` ·
`03-maurya` · `04-kushan` · `05-gupta` · `06-chola` · `07-sultanate` · `08-vijayanagara` ·
`09-mughal` · `10-maratha` · `11-sikh` · `12-republic`

Empires overlap (the Sultanate and Vijayanagara are contemporaries) so the order is **by start
date**, not by succession. Three riskiest claims were fact-checked and held: Aryabhata 476–550 sits
inside Gupta 320–550 and his sidereal year is accurate to ~3 min 21 s; the Iron Pillar is
Chandragupta II's and resists rust via high phosphorus; the Kushan anthropomorphic-Buddha claim is
contested only on *region*, which the line deliberately avoids.

**Regenerated beats** (originals kept as `-r1`): `07-sultanate-r2` (r1 was an unreadable bundle of
columns), `10-maratha-r2` (r1 was an over-cropped blade), `08-vijayanagara-r2` (r1 drifted into the
type zone), `00-bharatavarsha` clip `-r2` (r1 hallucinated repeating scallops).

---

## The episode integration

`episodes/aryabhata/` — built from IndianHistory's **`aryabhata_turns_the_earth`**, chosen because
it *is* the Gupta beat of the intro. 28 panels, 5.4 min of narration, English + Hindi.

- Art downscaled to 1280 px and copied in; audio copied in. Self-contained, ~20 MB.
- **English lines carry word-level timings** (`words: [{w,t,d}]` ms) → the caption tracks the voice
  word by word. **Hindi has none** → whole-line.
- Four panels are not plain pictures and are rendered as their data describes: a located **map**
  with a pinned label, two **action** beats (cut-out figure over a panning/zooming background), and
  a three-slice **split** with slogans.

### Cuts

| cut | shape |
|---|---|
| A `cut-a-titles` | full 61 s titles → card → story |
| B `cut-b-cold-open` | hero + map (23.2 s) → titles → card → story |
| C `cut-c-stinger` | 15 s stinger → story |
| **D `cut-d-youtube`** | hook (`cover`) → 15 s stinger → story; titles done by ~27 s |
| **E `cut-e-framed`** | as D, but art **never cropped** — whole panel right, caption left |

D and E were added in response to the YouTube review and are **not yet verified** (see below).

---

## YouTube findings (researched, source-graded)

- **Loudness −14 LUFS integrated.** Critically, **YouTube does NOT amplify quiet audio** — only
  attenuates loud. v5 is −18.2 LUFS, so it plays ~4 dB under everything around it. Must remaster.
  (Specialist-verified: MeterPlugs / ProductionAdvice. YouTube has **no public page** stating this.)
- **True peak ≤ −1 dBTP** (community consensus, not YouTube-documented).
- **Retention: YouTube Analytics defines "Intro" as the first 30 seconds**, and "above typical" as
  **≥50% still watching at 30 s** — this is PRIMARY, from support.google.com/youtube/answer/12942217.
  Its stated advice when that number is low is to *modify the first 30 seconds*.
  → **Cut A is disqualified for YouTube**: 61 s of titles inside the measured window.
  → Cut B reaches 30 s only *seven seconds into* a 61 s title sequence — also bad.
  → **Cut D is the YouTube answer.**
- **Chapters:** first timestamp must be `00:00`, minimum 3, each ≥10 s, ascending.
- **Captions:** SRT/VTT/TTML. **Multi-language audio rolled out to all creators Sept 2025**
  (PRIMARY, blog.youtube) → the Hindi track can be an alternate audio track on the *same* video,
  not a second upload. Strong strategic fit for this project.
- **Thumbnail:** 1280×720, ≤2 MB mobile.
- **Safe area:** YouTube publishes none. Use a 10% margin (192×108 px at 1080p); progress bar
  ~5% from the bottom; end-screen elements occupy the last 5–20 s, upper-right and lower areas.
- Uploading ≥1440p generally yields VP9/AV1 delivery rather than AVC1 — observed, **not** an
  official policy.

Full brief with URLs was produced by a research sub-agent; re-run if needed.

---

## Bugs found and fixed (do not reintroduce)

1. **`feTurbulence` inside the animated SVG** dropped v1 from 60 fps to 3–18. Grain is a static
   data-URI tile on a div outside the `<svg>`.
2. **Burnt-in viewer chrome** in the first render — caught only by extracting frames back out of
   the encoded MP4. `?export=1` sets `.export` before first paint.
3. **Marcellus has no lining figures** — `1010 CE` rendered `IOIO CE`. Dates use Cormorant with
   `font-variant-numeric: lining-nums`.
4. **Era blocks stepped down the frame** in normal flow — now absolutely positioned at a fixed
   optical centre.
5. **Gold rules silently missing from the master.** `html.layer #frame > *` carries id specificity
   and beat `html.layer-rules .rule`; `.rule` was the only plate with no id. Every plate is now
   asserted to have non-zero alpha.
6. **Score dynamically flat** (LRA 2.9) and the closing bell landed over nothing because the drone's
   fixed 3.4 s attack cannot arrive inside a 5.2 s cue. Fixed by building from quiet and exposing
   `attack`/`release`; a true-peak limiter now guarantees no clipping.
7. **Episode art completely invisible** while captions, timings and progress all worked — moving the
   cross-fade to a scene wrapper left the base rule pinning images at `opacity:0`. Caught by
   screenshotting every panel kind, not by trusting "zero errors".
8. **Word-alignment failure on the `cover` panel** — the first four words come back fused into one
   token timed 297 ms at t=4421, so the opening line is spoken for 4.4 s with nothing lit and then
   the whole phrase flashes. 1 of 28 panels, but it is the first thing anyone sees.
   `repairWords()` in `build-episode.mjs` splits fused tokens across the span they actually occupy,
   weighting digits ×3.5 because "499" is three characters and three words of speech.
9. **The same number is read two different ways** by the narration: `cover` said "four
   hundred ninety-nine C E", `p08` "four hundred and ninety-nine". **Root cause found and
   fixed** (see "Years are spoken as years"): Azure's voices read a bare integer as a
   quantity and the upstream `_norm()` never normalised years. Not a source-audio quirk —
   a missing normalisation rule, and it affects every story with a date in it.
10. **A number token highlighted for 2.1 s** (`62,832`, `3.1416`) looks like a frozen caption even
    though the timing is correct. Fix intended: sweep the highlight across the token. **Not done.**
11. **Every master shipped 4–6 dB too quiet.** v4 −19.8, v5 −18.3, v6 −17.8 LUFS against a −14
    reference. YouTube **attenuates loud uploads but never lifts quiet ones**, so all of them
    played under everything around them in a feed. `tools/loudness.mjs` does the two-pass
    `loudnorm` (measure, then correct with the numbers pinned and `linear=true`), and
    `assertLoudness()` makes the render **fail** rather than ship off target.
12. **`buildProcession` crashed on any all-numbered sequence.** It assumed unnumbered opening
    beats existed and dereferenced `opening[opening.length - 1]`. Every single-kingdom sequence is
    numbered the whole way through, so the Gupta build died on its first run. The first beat now
    becomes the opening when there is no other.
13. **The framed cut had no motion at all.** `.framed #art img{animation:none!important}` was
    correct in isolation — travelling `object-position` does nothing once a picture is contained,
    because there is no slack to travel through — but it left 28 panels as stills for 5.4 minutes.
    Replaced with a 3% breathe on the panel and a counter-drift on the blurred surround,
    alternating per panel.
14. **Contain-fitting left a third of the frame black**, which reads as unfinished rather than as
    restraint. A blurred, darkened blow-up of the same picture now fills the surround — no pixel
    of the art is cropped to get there — and the captions grew into the freed width, **29px →
    44px**, which is what burnt-in text needs to survive a phone.
15. **The map pin vanished under the artwork** when the picture moved into its own column: the pin
    was positioned against the frame while the picture occupied only the right 62%, and the sharp
    image sat above it in the stack. Pin and label now live in a `.pinbox` that matches the
    picture's rectangle and sits above it.
16. **A thumbnail with a broken image path renders as a black rectangle with beautiful type on it**
    and looks entirely deliberate. Asserted `naturalWidth > 0` before screenshotting. (The check
    moved into `thumbnail.mjs` when `publish.mjs` stopped composing.)
17. **A fixed chip font size silently overflowed its column.** "499 CE" and "1,000 YEARS BEFORE
    COPERNICUS" cannot share one size inside a column 58% of the frame wide. Overflowing type is
    not visibly broken in a 1280 px screenshot — it just sits closer to the face than intended —
    and at 320 px it reads as clutter. The size is solved against the column now, and every
    candidate is measured for overflow and safe area before it is written.
18. **Two renderers for one thumbnail.** `publish.mjs` had its own copy of the composing CSS
    alongside `thumbnail.mjs`, which guarantees the published thumbnail and the approved one drift
    apart. `publish.mjs` collects the picked candidate now and fails if it is missing.

---

## The subscription went down mid-run, and the pipeline waited sixteen hours for it

On 22 Aug the Azure subscription was suspended for overuse. Two gupta stories died on it, and the
two failures are worth reading together because they behaved completely differently.

`lalitaditya_library` failed in **0.3 minutes**, at `subject`. That is correct: `llm.mjs` retries
only 401/403 (token), 429 (rate) and 5xx, and throws on anything else, so a
`400 SubscriptionNotRegistered` came straight out.

`the_gate_of_questions` failed after **980 minutes**. Its log tells the story:

```
[1/7]   200s  FAIL 03-clay-monastic-courtyard-lamp   terminated
[2/7]   200s  FAIL 00-bronze-gong-ring               terminated
[3/7] 56644s  FAIL 05-broken-bamboo-speech-flute     HTTP 400 SubscriptionNotRegistered
...
0/7 in 944.1 min
lanes: sora-2 1 (0 done, 12 throttled), sora-2b 1 (0 done, 6 throttled)
```

Two shots failed fast with `terminated` — that was the subscription going down, and it was the
early warning. The other five then sat for **15.7 hours**. `azure.mjs` is not at fault twice over:
it throws immediately on a non-transient 400, and its Sora poll loop is capped at 240 polls (~40
minutes). The time went into the **lane limiter**. Both lanes had been throttled down to a
concurrency of 1 by "too many running tasks"; when the subscription died the in-flight jobs never
completed, so those single slots were never released, and the queued shots waited for a slot that
could never free.

So the failure mode is: **a dead upstream converts a concurrency limiter into an indefinite wait.**
The limiter has no notion that the thing it is waiting for has become impossible. On a suspended
subscription that is not merely slow — it is a process sitting on the API all night, which is the
last thing wanted when the suspension is *for overuse*.

Two things to consider before Azure is re-enabled:

- **A lane slot needs a deadline.** If no shot in a lane has completed for far longer than a normal
  generation, the lane should fail rather than wait. 15.7 hours against a ~4 minute median is not a
  slow lane, it is a dead one.
- **`terminated` inside the first minutes should be treated as a signal, not a single shot's bad
  luck.** Two of seven terminating at 200s preceded every later failure by fifteen hours.

Neither is fixed here: the fix belongs in the lane limiter and cannot be tested with the
subscription down. It is written up so the next run does not rediscover it from a 980-minute row.

### Diagnosing it: the control plane lies

Checked again on 25 Aug, after the subscription was restored. Everything is healthy — account
`Enabled`, provider `Registered`, `az account get-access-token` returns a Bearer, and
`ai-contosohub530569751908` is `Succeeded` with every deployment the pipeline needs:

| deployment | used by | state |
|---|---|---|
| `gpt-5.1` | `llm.mjs` default | Succeeded, cap 150 |
| `gpt-image-2` | `azure.mjs` `IMG_DEPLOY` | Succeeded, cap 36 |
| `sora-2` / `sora-2b` | `SORA_LANES` | Succeeded, cap 60 / 33 |

The trap is that **none of those checks would have caught the outage**. On 22 Aug, while every
data-plane call was failing with `SubscriptionNotRegistered`, `az provider show --namespace
Microsoft.CognitiveServices` still answered `"Registered"` and `az account show` still said
`"Enabled"`. The control-plane metadata is not a health check; it describes the registration, not
whether the subscription is currently allowed to serve traffic.

So the only honest test of "is Azure back" is a data-plane call, which costs money — and after a
suspension *for overuse* that is precisely the thing to be careful with. Diagnose with the control
plane to rule things out, then treat the first real generation as the test, not a probe run before it.

Two deployments on that resource read `Disabled` and are expected to: the old `sora`
(2025-05-02), superseded by `sora-2`, and `gpt-4o-mini-audio-preview`, retired with HTTP 410.

---

## Environment gotchas

- **The machine sleeps every night, ~23:31 to ~08:17.** Nothing else in this document explains
  more lost wall-clock time: roughly **8¾ hours a night**, about a third of every day. It is a
  real suspend, not throttling — the Kernel-Power log says so, and the evidence in a build is a
  frame directory with a clean hole in it:

  ```
  08-19 23   4157 frames        Get-WinEvent -FilterHashtable @{LogName='System';
  08-20 08    621 frames          ProviderName='Microsoft-Windows-Kernel-Power'}
                                08-19 23:31:34  id=42  The system is entering sleep.
                                08-20 08:16:41  id=566 session transition (resume)
  ```

  **A story that "hangs" overnight and finishes in the morning did not hang.** It slept.
  `purandar_treaty_and_jai_singh_s_net` recorded **594 minutes** with its master finished at 23:18
  and its last Short asset at 23:28; it was blamed on an unbounded `browser.close()` because the
  clock times matched `guru_arjan_gathers` (23:34 → 08:19). They match because **both are the sleep
  window**, not because both are browser wedges. The bounding work in `short.mjs`, `film-render.mjs`,
  `render-master.mjs` and `thumbnail.mjs` is still worth having — an unbounded close on a wedged
  browser is a genuine hazard, and `render-episode.mjs` was bounded for a demonstrated one — but it
  did not cause those minutes.

  Before calling anything an overnight hang, check three things: the Kernel-Power log, whether the
  process actually accumulated CPU across the gap (Chromium burned **146 s in nine hours** here),
  and whether the frame timestamps have a hole rather than a slope. A wedge burns no CPU *and*
  never resumes; sleep burns no CPU *and* picks up exactly where it stopped.

  Power policy is not ours to change — the box is shared, and the suspend is initiated by a
  user-mode process (`SetSuspendState`), so something on the machine wants it. Plan around it:
  an era of ~27 stories at ~1 h each takes **two calendar days, not one**.

- **Playwright cache is broken on this machine.** Only `chromium-1228` and `webkit-2311` are
  complete; Firefox is absent. `scripts/browser.mjs` auto-discovers and passes `executablePath`.
- **PowerShell has no heredoc.** Write commit messages to a temp file and `git commit -F`.
  Each call is a fresh process — no env/cwd persistence.
- **ffmpeg here has no glob** (`-pattern_type glob` fails) — stage sequentially-named copies for
  `tile`. It *does* have `libass`, `fontconfig`, `sidechaincompress`, `zoompan` and `loudnorm`,
  but **the repo's fonts are `.woff2`, which libass cannot read** — so burn-in via `ass`/`drawtext`
  is not available without converting them. Render type through the page instead.
- Preview server: `node scripts/serve.mjs 4321`. The episode player **requires HTTP** (it fetches
  `episode.json`); `file://` will not work.
- Azure auth is `az account get-access-token --resource https://cognitiveservices.azure.com`.
  `gpt-audio-1.5` was deployed by us on 2026-07-28 for listening (`gpt-4o-mini-audio-preview` is
  retired, HTTP 410).

---

## Verified

- `repairWords()` is wired in. Rebuild reports **1 fused caption token repaired**; the cover now
  reads `Kusumapura,` 0–1.72 s · `499` 1.72–3.52 s · `CE.` 3.52–3.86 s · `Under` 3.86–4.72 s,
  flowing exactly into the next source token. Re-audit: **0 defects across 28 panels**.
- Cuts **D** and **E** build and run headless with **zero page errors and zero failed requests**.
- Side-by-side of D vs E on the same panels settles the framing question: D's pan, however
  well-behaved, still shows only a band at any instant and lands on **headless torsos** on the
  taller compositions. **E shows the whole panel and crops nothing.**

**Recommendation: cut E.** It is cut D's retention structure — hook, 15 s titles, story by ~27 s —
with the cropping removed.

---

## Rendering an episode to a file

`tools/render-episode.mjs` is the only path from the episode page to a publishable MP4.

    node tools/render-episode.mjs --cut cut-e-framed --intro dist/v7-gupta-stinger.mp4 --fps 25
    node tools/render-episode.mjs --cut cut-e-framed --limit 40 --scale 0.5 --fps 10   # draft

How it works, and why:

- The episode page gained **`window.__ep.seek(t)`** plus `?export=1`. `seek` finds the panel at
  `t`, rebuilds it only when it changes, and scrubs the CSS move with a **negative
  `animation-delay` against a paused animation**. The picture is therefore a pure function of
  time — deterministic, no dropped frames — and it *is* the player's own markup, keyframes and
  word timings, so a master cannot drift from what the viewer sees in the browser.
- Frames are captured as **JPEG q94** (PNG is ~3× slower and the delivery is lossy anyway).
  At 1920×1080/25 fps a 5.4 min episode is ~8 160 frames and **~30 min**.
- The titles are **spliced at the cut's own boundary** (sum of the `open` panels' durations), so
  the structure is: cold open → titles → the rest.
- Narration is `ffmpeg concat` of the per-panel files. Panel durations were *measured from those
  files*, so picture and voice line up without any offset being written down.
- **Loudness is asserted, not hoped for** — the render throws if the master misses −14 LUFS ±1.

Structure that ships: **12 s cold open → 15.8 s Gupta stinger → story resumes at ~27.8 s**, which
is inside the 30 s window YouTube measures.

---

## The underscore — music under the whole episode

`tools/underscore.mjs`. The episode used to be 61 s of score followed by **5.4 minutes of silence**
— the single largest retention leak in the cut. The bed:

- plays **in the gaps between lines** (panel boundaries are the only reliable silence),
- spaces phrases by an irrational walk so nothing rhymes with anything,
- is **quiet by construction** (drone ~0.05, flute ~0.05) *and* sidechain-ducked by the voice,
- pulses only on panels whose `mood` is tense, one low `baya` every ~3.9 s,
- resolves on a swell, a flute note and a struck bell rather than being cut off.

Voices come from `src/audio.js` — the same synth as the title score, so the episode sounds like
the sequence that opened it.

---

## Publishing kit

`node tools/publish.mjs --cut cut-e-framed --intro dist/v7-gupta-stinger.mp4`
→ `dist/publish-aryabhata/`

Reads `episodes/<slug>/publish.json` (title, hook, tags, chapter map keyed by panel id, thumbnail
spec) and writes:

- `<slug>.en.srt` — cut from the **same word timings the screen uses**, ≤2 lines, ~42 chars,
  never spanning a panel. 61 cues, correctly gapped across the spliced titles.
- `chapters.txt` — **YouTube's three rules enforced**: first mark `0:00`, ≥3 marks, none under
  10 s. It throws rather than emitting a list YouTube will silently ignore.
- `description.txt` — hook in the **first two lines**, because that is all that shows.
- `<slug>-thumb.jpg` / `-thumb.png` / `-thumb-feed.png` — **collected, not composed.** See below.

`publish.mjs` used to compose the thumbnail itself, with its own copy of the CSS. Two
renderers for one artefact guarantees the published thumbnail and the approved one drift
apart, so it now copies the picked candidate and **fails loudly** if it has not been
rendered. It also checks YouTube's **2 MB** limit, because that failure otherwise happens
at upload time.

---

## The thumbnail

Three tools, in order. Nothing here is composed by hand.

    node tools/gen-thumb-art.mjs                     # the plates (Azure gpt-image-2, ~100 s)
    node tools/thumbnail.mjs                         # 17 candidates + two contact sheets
    node tools/thumbnail.mjs --pick LOUD-hold-cop    # promote one into publish.json
    node tools/publish.mjs --cut cut-e-framed --intro dist/v7-gupta-stinger.mp4

**Current pick: `LOUD-hold-cop`** — "1,000 YEARS BEFORE COPERNICUS" over Aryabhata holding
the glowing Earth, `INDIA · 499 CE` in a gold chip. Approved by the user: *"1000 YEARS
BEFORE COPERNICUS absolutely makes sense. Keep that."*

### Generate the figure, do not cut it out

The episode art is bright painted comic work on daylight backgrounds. Cutting a figure out
of it and dropping it on a black ink-and-gold plate reads as exactly what it is — two
pictures, pasted — and a thumbnail is judged in under a second, so that join is the first
thing the eye finds. The alpha cutouts in `episodes/aryabhata/img/*char*.png` were tried
and rejected for this reason.

`tools/gen-thumb-art.mjs` generates the figure **inside** the language instead. `INK_STYLE`
and `INK_LIGHT` are copied verbatim from the `GUPTA` direction, so a plate is lit by the
same lamp as the sequence it sits beside. The figure is described **once** in a shared
`FIGURE` constant — describe it per concept and two plates come back with two different men.

Four concepts, deliberately different bets rather than variations, because which one
survives at 320 px is not something to reason about:

| id | what it is |
|---|---|
| `gaze` | looking up at the armillary sphere — awe, clear subject |
| `defiant` | straight down the lens — the strongest thumbnail shape |
| `hold` | holding the turning Earth — the claim made literal **← chosen** |
| `eye` | macro on the eye, sphere reflected in the iris — pure curiosity |

### Judge it at the size it is seen

`tools/thumbnail.mjs` renders every candidate at **1280×720 and 320×180**, and writes two
contact sheets: `sheet-full.png` for craft, `sheet-feed.png` for the decision. A layout that
only works large does not work. Three rules are enforced, not trusted:

- **Cap height is a share of frame height**, not a point size — `0.152` for the loud set,
  `0.086` for the quiet one. It survives the downscale or it does not.
- **Type is measured** against its column and against the safe area; the render throws
  rather than shipping type that has crept over the picture.
- **The corners are not yours** — YouTube lays a duration badge over the bottom right and a
  progress bar across the bottom on replay. `?guides=1` draws those zones for checking.

The first pass was brand-correct and, at 320 px, **quiet**: the kicker and footer were
texture rather than information. The `LOUD-` set drops everything that is not the claim,
runs it at a fifth of frame height, and puts the date in a **solid gold chip** — at feed
size the letters inside it stop resolving, but the gold block still reads as a badge.

### The headline must not repeat the title

The video title is *"The Man Who Said the Earth Turns"*. A thumbnail that also says THE
EARTH TURNS spends its one line on something the title already covers — and the Earth
turning is not a surprise to a modern viewer. The surprise is **who said it and when**, so
the comparison is the headline and the title carries the claim.

**The claim survives checking:** Āryabhaṭīya 499 CE, *De revolutionibus* 1543 — a gap of
1,044 years. Aryabhata argued **axial rotation**, not heliocentrism, so "BEFORE COPERNICUS"
alone could be read as an overclaim; it is paired with `INDIA · 499 CE` and sits under a
title that states the actual claim. An earlier variant (`BEST-hold`) keeps the comparison in
the chip under a THE EARTH TURNS headline if that ever needs to be more conservative.

---

## Years are spoken as years (fixed)

Azure's neural voices read a bare integer as a **quantity**, so `499 CE` came out as
"four hundred ninety-nine C E" — in the second phrase of the first episode. The upstream
`_norm()` in `IndianHistory/tools/voice.py` expands regnal Roman numerals and strips
diacritics but never normalises years.

- `tools/years.mjs` — `yearWords()` and `speakYears()`. Only rewrites a number **in a date
  context** (beside CE/BCE/AD/BC, across an era-marked range, or after
  in/by/around/circa/since/the year), so `62,832`, `20,000` and `3.1416` stay quantities.
- `tools/speak.mjs` — re-synthesises a line through the **same voice config as voice.py**
  (`en-IN-Arjun:DragonHDLatestNeural`, narrator base `-6%`, per-mood pitch/style, 24 kHz
  96 kbps mono MP3). `--all --dry` audits a whole episode.
- `tools/years.test.mjs` — 33 assertions, `npm run test:years`.

**Audit result: 3 of 28 panels** — `cover` (499 CE), `p02` (in 476), `p08` (the year 499).
All three fixed; fixing only the cover would have recreated the inconsistency.

**IndianHistory is still read-only from here.** The corrected audio is an override in
`episodes/aryabhata/voice-fix/`, picked up by `audioFixed()` in `build-episode.mjs`.
`episodes/aryabhata/voice-fix/PORT-UPSTREAM.md` has the port-back instructions — it is one
line in `_norm()` — and how to remove the override afterwards.

Caption timings survive because `foldToWritten()` merges the spoken run ("four
ninety-nine", two boundaries) back onto the single written token `499`, and asserts the
token count matches. This **also retired the fused-token defect on `cover`** that
`repairWords()` was patching around.

Needs `microsoft-cognitiveservices-speech-sdk` (word boundaries need the WebSocket
protocol; the REST TTS endpoint does not return them) and `az login`.

---

## Pace: the voice model moved under us

`en-IN-Arjun:DragonHDLatestNeural` is a **`Latest` alias, and Azure moves it.** At the
identical `-6%` rate it now speaks measurably faster than when this story was generated:

| line | as generated | re-synthesised at −6% | drift |
|---|---|---|---|
| `cover` | 12.05 s | 11.16 s | −7.4% |
| `p08` | 12.94 s | 12.43 s | −3.9% |

The cover's *speech* ran **11.99 s** originally and **9.95 s** on the first re-synthesis —
the year change accounts for well under a second of that. The user heard it immediately:
*"the older video the transition of the text and voice was good, this one is little
hurried."*

A short line does not only sound hurried on its own. It **drags the whole episode
forward**, moves the title splice (12.0 s → 10.0 s) and shifts every chapter after it.

**Fix: match the slot, not the rate.** `speak.mjs` synthesises, measures against the file
it replaces, and re-synthesises at a corrected rate until it fits within 2.5%. Speed is
`1 + rate/100`, so the correction is `speed × got/target`; the loop exists because the
response is not linear.

```
cover  try 1  -6%     11.16s  -7.4%
       try 4  -21.7%  12.17s  +1.0%   fit
```

Result: **runtime 325.7 s against the approved 326.3 s** — 0.6 s across the whole episode.
The pacing the user approved is preserved; only the words inside each slot changed.
Confirmed by ear: *"the delivery sounds natural… the pace is measured and unhurried."*

**Every attempt is kept** as `-t1.mp3`, `-t2.mp3`…, and `index.json` records which one won,
its rate, its duration and its drift.

> The year reading was re-verified on the final take **by forced choice**, because the
> audio model transcribed the same file as "five hundred ninety-nine" once and "four
> ninety-nine" another time. Forced choice returned **`FOUR_NINETY_NINE`**. Do not trust a
> free-form transcript for a detail that matters — make the model pick from fixed options.

---

## The underscore level, measured

The music was always there. It was **not audible enough to do its job**: a very low bed
paired with an aggressive 7:1 duck at a low threshold.

`render-episode.mjs` now prints the balance on every run and keeps the ducked bed as its
own stem. Measured, with the gentler 4:1 duck:

| bed lift | separation | verdict |
|---|---|---|
| 1.9 | 6.7 dB | fights the narration |
| 0.75 | 14.9 dB | slightly forward |
| **0.6** | **~17 dB** | **shipped** |
| 0.5 | 18.4 dB | just under |

Target band **16–20 dB**. Above ~26 dB the bed reads as silence on a phone; below ~10 dB it
competes with the words. `buildUnderscore(panels, total, lift)` takes the level as a
parameter — the *shape* of the cue list was right, only its level was wrong.

> I first wrote "the old mix measured ~28 dB down" in a code comment **without measuring
> it**. It was ~12 dB. Corrected, and the renderer prints the real number now. Never assert
> an audio figure that has not been measured.

---

## Retention analysis — `tools/retention.mjs`

    node tools/retention.mjs

Measures the built episode, the cut, the master and the publishing kit against YouTube's
own published rules, and prints a comparable score so two versions can be ranked without
re-arguing the case.

**ep01 scores 83/100 — solid. 14 pass · 2 warn · 0 fail.**

```
intro      ████████████████··  27/30   titles over at 28.0s, inside the 30s window
hooks      ███████████████···  17/20   20/28 panels carry a hook; longest dry stretch 19s
pacing     ████████████······  10/15   flat: +1% across the episode
audio      ██████████████████  15/15   -14.2 LUFS, -1.4 dBTP, no dead silence
packaging  ██████████████████  10/10   thumbnail and title carry different hooks
rehook     ███████···········   4/10   3 panels hold one image over 15s
```

Weights are ordered by how much each factor moves watch time, not by how much work it took:
intro 30, hook spacing 20, pacing 15, audio 15, packaging 10, re-hook 10. **It is a design
score, not a prediction** — it says whether the known retention killers are gone, not what
the click-through rate will be.

**The two open warnings are the next work:**

1. **Pacing is flat.** Panel length varies 23% but trends **+1%** across the episode. The
   title sequence deliberately accelerates 6.0 → 3.4 s; the body abandons that rhythm.
2. **Three panels hold one image over 15 s** — `p12` 16.2 s, `p16` 15.5 s, `p19` 15.1 s.
   One panel is one picture, so a long panel is a long still.

> An earlier version of this tool reported "the payoff sits 80% through". That was **a
> measurement artefact**: it looked for the claim only after 60 s, and the claim is
> actually delivered at **0:00** in the cold open. Replaced with **hook spacing** — the
> honest question for a narrated piece is how long the viewer goes with nothing new.

## Films — the rebuild

`films/` is the answer to "if you could start over, how would you build it". The episodes are
built the only way their source data allows — one narration line, one picture, thirteen
seconds, repeat — and everything flat about them is downstream of that. **The shot list is
written first and the narration is synthesised per shot afterwards**, so silence becomes a
decision instead of an accident of the audio.

| | shots | runtime | silent | separation | spine |
|---|---|---|---|---|---|
| `zero-ascent` | 57 | 6:32 | 16 | 16.1 dB | chronological, accelerating |
| `zero-objection` | 54 | 6:43 | 14 | 17.1 dB | an argument, ending on division by zero |
| `zero-reverse` | 52 | 5:54 | 20 | 16.6 dB | opens on now, peels back to a dot on bark |

All three −14.1 LUFS, −1.4 dBTP. Upload folders at `dist/gupta/zero_*/`.

```
node tools/write-film.mjs --spine ascent --id zero-ascent
node tools/reshoot.mjs   --all          # what the camera sees, edit locked
node tools/degibber.mjs  --all          # prompts that would draw fake writing
node tools/fix-cards.mjs --all          # cards are read, so they use figures
node tools/shorten.mjs   --all          # lines that outgrew the longest take
node tools/film-voice.mjs --all --missing
node tools/film-gen.mjs  --all --what stills --missing --conc 4
node tools/film-gen.mjs  --all --what clips  --missing --conc 2
node tools/undercut.mjs  --all          # takes too short to cover their shot
node tools/film-render.mjs --id zero-ascent --lift 0.4
node tools/film-publish.mjs --all
```

### What the format buys

- **Silence is authored.** `validateFilm` refuses a film with fewer than one silent shot in
  eight, because without held beats it is a voiceover with pictures.
- **The scrim belongs to the card, not the film.** It fades in with each card and out again,
  so the half of the frames carrying no type are undimmed.
- **No burnt-in captions.** The picture carries it; type appears only on the six or seven
  cards at the movement boundaries. Silent shots produce no caption cue either — the screen is
  quiet on purpose and a caption there would be inventing something to read.

### Bugs this cost, all of them silent

1. **A take that does not cover its shot does not fail.** 29 of 57 shots were longer than
   their 8s take; the trim yielded short clips, every xfade offset landed past the end of its
   input, the chain collapsed, and `tpad` cloned one frame for six minutes. It encoded
   cleanly, hit −14.1 LUFS and passed every assertion. **Only looking at frames caught it.**
   The renderer now measures every take against its shot and refuses to build.
2. **Sora offers 4, 8 or 12 seconds** — so a shot over ~11.5 s is unbuildable, *and* is a
   panel again. `validateFilm` refuses it; that caught 25 lines of 18–25 words.
3. **Beautiful and monotonous.** The first still pass was five identical ink-in-water shots in
   eight. Timing cannot articulate anything without contrast. Shots now carry a `kind` and the
   distribution is enforced *and verified* — abstract went from dominant to 5 of 57.
4. **A third of the prompts would have drawn fake writing.** "Worn and indistinct" reduces
   gibberish and does not stop it. The only rule that holds: **never mention writing**. Where
   the mark carries meaning, ask for geometry — a dot, a ring, a circle with a void. Those
   render perfectly and in this film they *are* the subject.
5. **Cards are read, not spoken.** The no-numerals rule exists for the synthesiser; applied to
   cards it produced "about six twenty-eight CE" on screen.
6. **The same mix setting means different things in different formats.** A film has far more
   silence than an episode, so the bed is audible in the gaps: lift 0.55 measured 17 dB on an
   episode and 13.8 dB here. 0.4 puts it in band.
7. **Sora refuses a reference image containing a person**, while accepting text-to-video of
   one. Every `face` and `hand` shot fails first time; it is retried without the reference
   automatically and counted separately.

### Measured

The narrator speaks at **1.85 words/second**, not the 2.6 I first told the author — which ran
all three films 30% long.

---

## The skill — where the method is preserved

**Source of truth:** `C:\Users\navg\DailyApps\dailyapps-skills\ink-and-light\` — a git repo with a
GitHub remote (`naveenneog/dailyapps-skills`) and a pre-commit gate that validates every skill.

`C:\Users\navg\.copilot\skills\ink-and-light\` is an **installed copy**. Edit the repo, then copy
outward. It was written there first, which meant the whole method lived in one unversioned folder.

```
ink-and-light/SKILL.md                       the method, §0-14
ink-and-light/references/era-system.md       seeding, fact-checking, parallel generation
ink-and-light/references/episode-factory.md  the stages, the two versions, the upload contract
ink-and-light/references/youtube.md          retention, loudness, captions, thumbnails, measured
ink-and-light/references/bugs.md             26 failures already paid for
```

Commit `48360da`. Not yet pushed.

---

## The factory — `tools/factory.mjs`

Twelve stages, story in, two uploadable folders out.

```
node tools/factory.mjs --story <key> --slug <slug> --era <era> --plan
node tools/factory.mjs --slug zero --era gupta
node tools/factory.mjs --slug zero --from render     # resume
node tools/factory.mjs --slug zero --until intro     # stop early
node tools/factory.mjs --slug zero --only pack --force
node tools/factory.mjs --slug zero --draft           # 40s, half scale, 12fps
```

`episode → voice → rebuild → subject → pack → thumb-art → thumbs → intro-build → intro →
render ×2 → publish ×2 → score ×2`

Every stage declares what it produces, so a stage whose output exists is skipped and a dead run
resumes. A failed stage **stops the run** — a master built from a failed narration stage looks fine
and says the wrong thing. A stage that reports success without writing its output also stops it.

**The two versions differ only in the caption:** v1 `cut-e-framed` (settle), v2 `cut-h-card` (card).
Everything upstream is generated once and shared, so the comparison is of that and nothing else.

### New tools

- **`tools/pack.mjs`** — writes `publish.json` from the narration: 5 ranked titles, hook, 8-12
  chapters, tags, 5 ranked thumbnail headlines, each marked `none|mild|overclaim`. Chapters are
  timed in the **cut's** order (cut E opens on `cover`, the third stored panel) and checked against
  YouTube's 10 s rule with an 18 s margin. On the zero episode it corrected 2 chapters that would
  have been silently dropped at upload.
- **`tools/subject.mjs`** — writes `thumb-art/subject.json`: who the thumbnail is of, the object
  behind them, and the object they hold. The `held` field is the one that decides whether the
  thumbnail works; it is constrained to a strong simple silhouette over the most literal object.
  First pass returned a birch-bark manuscript (a brown smear at feed size); the rule was tightened
  and it returned a glowing stone disc, which *is* the zero.
- **`tools/source.mjs`** — resolves `--era <id>` or a version id into one beat-shaped object, so
  `build-version.mjs` and `render-master.mjs` read both roots instead of eras needing forks.

### Bugs found and fixed building it

1. **`speak.mjs` defaulted `--story` to aryabhata.** `--slug zero` audited *Aryabhata's* narration
   and wrote the fixes into the zero episode. Now derived from `episode.json.id`.
2. **`render-episode.mjs` scratch dir keyed on the cut alone.** Two episodes on one cut shared
   `dist/.ep-<cut>`, so `--reuse` would splice one body under another's titles. Now `.ep-<slug>-<cut>`.
3. **`render-master.mjs` ignored `picks.json`** while `build-version.mjs` honoured it — the master
   could be composited from a clip the page never showed.
4. **`thumbnail.mjs` had hardcoded headlines.** The zero episode's first thumbnails read "THE EARTH
   TURNS". Now built from that episode's own `publish.json`; the Aryabhata table is kept verbatim so
   ep01 still rebuilds exactly.
5. **The caption named every speaker "Aryabhata".** Now `ep.figure`.
6. **A backtick in a comment inside the page template literal** broke the string —
   `SyntaxError: Unexpected identifier`. Same trap as the CSS-comment backtick, second time.
7. **`.cap-card #capwrap{padding-top:14%}`** is right for the bled cut and pure offset in the framed
   cut, where `#capwrap` is already a full-height centred grid. It put v2's caption ~7% below every
   other treatment — a confound in an experiment whose point is that only the caption differs.
8. **`beatsFor()` filtered silently** when a cut named a beat the sequence lacked, shipping a
   one-beat stinger. Now a hard error.

---

## Era system state

**18 eras seeded, all 180 beats fact-checked, all 180 stills generated, zero failures**
(~29 s/still at 4 concurrent, ~34 min for the last 170).

| | |
|---|---|
| stills | 18/18 eras complete |
| clips | gupta only (10) — the other 17 are the next spend |
| picks | gupta only |

`era.json` gained an optional `stinger` (two beat ids). Absent, it is derived as beat 1 + beat 3 —
and `saveEra()` refuses to persist a derived value, so changing the rule later still applies.

---

## The wrong story was built into the episode (caught 31 Jul, by the user)

`build-episode.mjs` had **two independently defaulting flags**: `--story` (upstream id) and
`--slug` (output directory). Running `build-episode.mjs --slug zero` — no `--story` —
changed where the episode was written and left the story at its default, so **Aryabhata's
script was built into Brahmagupta's episode**. Same artwork, entirely different narration.

It rendered. It scored. Nothing failed:

| | | |
|---|---|---|
| `episodes/zero` should be | `the_dot_that_became_zero` | Brahmagupta, Bhinmal, 628 CE |
| what got built | `aryabhata_turns_the_earth` | Aryabhata, Kusumapura, 499 CE |
| result | 27 of 29 panels replaced | +48.6 s |

**And I misdiagnosed it.** I measured the 48.6 s change, confirmed the upstream file really
was newer, concluded the source project had re-recorded its voice track, and wrote a
section of this document explaining a drift that was not happening. Every number in that
analysis was correct and the conclusion was wrong. The user caught it from one frame: the
map said *Kusumapura* under a story about *Bhinmal*.

**This is the second tool to make this exact mistake.** See "Bugs found and fixed" §1 —
`speak.mjs --slug zero` read Aryabhata's lines for the same reason. Fixing the instance did
not fix the class.

### The fix

Defaults that only make sense together must not be settable apart. `build-episode.mjs` now:

- takes the story from **the existing `episodes/<slug>/episode.json`** when `--story` is
  omitted — an episode on disk already records which story it is, so a rebuild does not
  need to be told twice;
- **hard errors** if a slug has no story and none was given;
- **hard errors** if `--story` disagrees with what the slug was built from, unless
  `--restory` is passed;
- prints `slug <- story` as its first line, so the wiring is visible in every log.

### The general rule

**A flag that narrows *where* output goes must never leave *what* is processed at a
default.** If two flags are only meaningful together, either derive one from the other or
refuse to run.

---


Each differs from the next by exactly one thing, so a comparison between any two is a
comparison of that thing.

| | cut | what changes |
|---|---|---|
| v1 | `cut-e-framed` | **settle** — the whole line present, the spoken word lit |
| v2 | `cut-h-card` | **card** — a few words at a time, set large |
| v3 | `cut-i-flow` | **flow** — the caption scrolls so the spoken word never leaves the centre line |
| v4 | `cut-j-shots` | flow **+ the picture cuts** on the speaker's pauses |
| v5 | `cut-k-page` | flow **+ the frame is an open book and the page turns** |

`dist/<era>/<slug>_<version>/` — video, intro, thumbnail, SRT, chapters, description, tags,
title, `UPLOAD.md`, and `ab/` with three thumbnails, five titles and five headlines.

### v5 — the book page turn

The framed layout already had a book's geometry: caption column left, picture right,
boundary at 38%. Calling that boundary a **crease** and hinging the picture there makes a
panel change a page turn — the recto lifts, sweeps across the crease, closes over the
words, and lands as the new verso while the next picture is revealed under it.

**38% is one number in five places**: `#capwrap` width, `img.sharp` left,
`transform-origin`, the crease seam, the paper's `left`. If any drifts, it stops being a
book.

`TURN = 1.25` s rotation + `SETTLE = 0.22` s during which the landed leaf dissolves into
the left page while the new words come up through it. All of it a pure function of panel
local time, because the renderer scrubs.

**Judge it with `tools/turnsheet.mjs`, never from a master.**

```
node tools/turnsheet.mjs --slug zero --cut cut-k-page --panel 3 --steps 14 --scale 0.6
```

Scrubs the player to instants inside one turn, writes full-size frames plus a contact
sheet, and reads `--turn/--lift/--leaf/--shade/--reveal` back **off the live element** so
the log cannot drift from what is drawn. A turn is thirty frames buried in six minutes; a
master costs forty minutes a look, and a downscaled contact sheet of a draft is how most of
the following survived several passes.

#### Nine wrong versions, all of which encoded cleanly

1. **Hinged at the frame's edge.** Rotates *away* from the words. A rectangle, not a page.
2. **`backface-visibility:hidden` on the leaf hid its children too** — including the paper
   reverse, the one thing that must appear at 90°. Use `transform-style:preserve-3d` on the
   container and put the backface rules on the children.
3. **`.shotbox` flattens the 3D space.** The sharp picture sits inside it, so the image's
   backface was resolved in the shotbox's own unrotated plane, which always faces the
   viewer — past 90° the leaf showed the picture **mirrored, place-name and all**. The rule
   belongs on whatever sits *directly* in the leaf's 3D space (`.scene.turning > *`).
4. **The backface test is not trustworthy at exactly 180°.** With the rule in the right
   place, an opaque paper and the depth sorted, the mirrored picture still came back for
   the frames the page lay flat. `--face` switches the two sides from the clock at the
   midpoint — smoothstep is symmetric, so the leaf is edge-on there and neither is visible.
5. **`translateZ` is written in the rotated element's own space**, which reverses at −180°.
   `+2px` — "in front" everywhere else — put the paper two pixels *behind* the picture
   exactly where it had to be in front. Written *after* the flip it lands in the same wrong
   place. One mistake, three disguises.
6. **A page's back is opaque.** Gradients alone maxed at alpha .40 and the picture showed
   through. Solid base under the sheen.
7. **The leaf lands mirrored, so only its first 61% is ever on screen.** A sheen at 96% —
   the natural choice for a page lit from the right — lands off-frame left, and the whole
   second half of the turn is an unlit black rectangle. Place the light where it will land.
8. **The caption must not be swapped when the turn starts.** Repainting on the panel change
   put the *new* words on the left page on frame one and then blanked them for the whole
   turn: the page spent 1.25 s closing over an empty leaf. The left page belongs to the
   panel being turned *away from* until the leaf lands. Derived from the time (`capKey`),
   not remembered, because the renderer scrubs.
9. **`#capwrap` (z4) outranked `#art` (z auto)**, so the leaf — z6 *inside* the stacking
   context `#art` creates the moment it is given a `perspective` — swept **underneath** the
   words. Raising `#art` to z5 then required pulling the blurred plate back to the recto
   (`.page-turn #art img.plate{left:38%;width:62%}`), or it buried the caption at rest.
   That turned out to be the better picture anyway: the leaf now *is* a full page.

Plus: **ease-out makes the turn invisible** (85° in the first fifth — edge-on; a 920 ms
turn visible for 200 ms). Smoothstep `u*u*(3-2*u)` hits 90° at the midpoint.

And: **a page and the page it becomes must be lit the same way**, or the dissolve is a
visible shift. The leaf's numbers re-expressed against the verso's narrower box — the leaf
is 62% of the frame wide and lands on a 38% page, so its `22%` is the verso's `64%` and its
`120%` radius is `196%`. Both darkest in the gutter, which is also physically right.

And: **the outgoing leaf keeps its own clock.** The per-frame `animation-delay` scrub was
handing it the new panel's local time, so the outgoing picture snapped back to the start of
its pan on the very frame it began to lift.

### The captions settle, they do not flow

v5 was built on `cut-i-flow`, whose caption scrolls so the spoken word never leaves the
centre line. Under a turning page that is a **second thing moving**, and two competing
motions read as instability rather than as either effect. `cut-k-page` now uses v1's
`settle` — the whole line present, the spoken word lit — so the only thing travelling is
the page.

### The split panel was the one kind that turned wrongly

`split` is three pictures side by side. Every other kind fills the frame with a blurred
blow-up of its own art; this one had **no plate**, so nothing held it to the recto. In the
framed cut it bled across the crease and sat under the caption; in the page-turn cut the
third of it lying left of the 38% hinge swung *backwards* while the rest swung forward.

Two fixes, both needed:

- the three slices go in a `.splitrow` **inside** the scene, so the scene stays the
  full-frame rectangle the hinge, the paper and the backface rules are all written against;
- it gets a plate, taken from its first slice.

Then a third: `.framed #art img{object-fit:contain}` means nothing is cropped, so square
slices in a full-height column letterbox to a third of the height and leave two thirds
black. The row is sized to its own content — *n* columns of square art is an *n*:1 band —
and centred, `row.style.aspectRatio = p.slices.length + '/1'`.

### The close — one image, and what he actually wrote

`tools/make-outro.mjs` used to assemble five abstract takes over 33 s. Five shots in a row
say less than one image held long enough to be looked at. It is now:

- **one** take (`zero-objection/530-lasting-question` — a held gold circle, which for this
  story is the subject), retimed to 1.5× → 17.5 s;
- **Brahmagupta's own rules** over it as silent type, no narration;
- the wordmark. 22.1 s total, −14.7 LUFS, −1.5 dBTP.

```
A fortune minus zero is a fortune.
A debt minus zero is a debt.
Zero minus zero is zero.
Zero multiplied by zero is zero.
BRĀHMASPHUṬASIDDHĀNTA · 628 CE
```

He also wrote that **zero divided by zero is zero**, which is wrong. It is left off rather
than shown without the narration that would place it: **a card with no voice over it is read
as fact.**

Per story, in the `CLOSERS` table — the closing type is the episode's content restated, so
a shared sign-off would be decoration. Adding a story is a data edit.

**What had to change to allow it:** cards were keyed to shots, so a second line meant a
second shot, which meant a second clip and a visible cut through one continuous image. A
shot may now own a `cards` array with per-line `at`/`hold`; the compositor already gave
every card independent fades from its own start and duration, so nothing downstream changed.
The **scrim** window is built per *shot*, not per card — per card it faded out and back in
between every line and the picture appeared to pulse. Sequence cards without a date are set
in the reading face (a quotation is not a title); cards with a date keep the display
treatment. And the retimed length is **probed from the encoded file**, not multiplied —
`setpts` lands on a whole frame and came out 150 ms short, which is enough for the renderer
to refuse to build.

### The cold open — `tools/hook.mjs`

The source project's opening line introduces a story; it was not written to stop a scroll.
The channel writes its own: one claim, 12–26 words, opening on something concrete and
stopping on the sharp part, spoken by the same narrator, **over the thumbnail's own plate**.

The first prompt asked for a claim *and* for the question to stay unanswered — those pull
against each other, and the model produced a man standing on a ridge, wondering. What is
withheld is the **how and the why, never the what**. `hook.mjs` now checks its own output
for inert verbs, subordinate-clause openers and numerals.

### The stinger belongs to its episode — `tools/stinger.mjs`

The era default is beat 1 + beat 3, which for the Guptas is a gold coin and *the turning
Earth* — Aryabhata's beat, in front of a zero episode, and identical for every episode in
the series. Two beats are now chosen per story: **widest first**, then the beat that is
literally the story, so the sequence ends on what is about to be watched. Zero got
*the golden age* → *place value*, whose image is a glowing ring with a dark centre.

### The thumbnail must be the same person

Described from the **narration**, the model invented a bearded elder in a turban for an
episode whose art shows a moustached man in his late twenties. `subject.mjs` now passes the
episode's hero, cover and first panel to the model **as images** and asks it to match age,
facial hair, headwear, garment borders and jewellery, and to report which features it took.

Two things fell out: the object drifted to an armillary sphere (episode one's object — two
episodes would have worn the same picture), and regenerating wrote `-r2` plates while
`thumbnail.mjs` still named `-r1`.

---

## Two metric artefacts, both caught by disbelieving a result

**Loudness.** Two renders of identical audio landed at −0.75 and −1.21 dBTP, because
`loudnorm` applies its ceiling to its own estimate. The scorer's threshold is −1, so the same
content scored 73 or 78 — and it nearly got reported as *the card treatment outperforming
settle*. A real limiter (`alimiter=limit=-1.2dB:level=disabled`) makes the ceiling a
guarantee. `assertLoudness` now fails above −0.9.

**The intro cliff.** The intro weight stepped 30 → 27 at exactly 25 s, so titles ending at
25.1 s scored three points below 24.9 s. A tenth of a second carried the weight of a real
editorial decision. It ramps now.

**The rule both point at:** when a result is surprising, check the instrument before
changing the video.

---

## Where the score can and cannot go

All four versions score **77/100**, which is correct — they differ only in treatment, and the
scorer does not measure treatment. The remaining 23 points are not reachable by cutting:

- **hooks 6/20** — dominated by a **95-second stretch with no new hook**. That is the
  narration's shape.
- **pacing 7/15** — measures variance in panel *duration*, and durations are set by the
  narration audio.

Both need story-level edits upstream in IndianHistory. **Cut J is worth judging by eye**: the
picture now cuts two or three times per panel, and the metric cannot see it.

---

## Changelog — 3 Aug 2026: the Gupta run, and five bugs it exposed

The era was produced end to end with uploads. Ten of fourteen episodes went up private on the
first pass. Everything below was found by running it, not by reading it.

**Every failure of the day was a false report of some kind.** Not one was a crash.

### 1. A server cleaned up only on exit is a process that cannot exit

`short.mjs` finished a Short, wrote its upload folder, and sat for **seven hours** holding up the
run. A spawned child keeps the parent's event loop referenced until it exits, and the server's
only cleanup was `process.on('exit')` — so the process would not exit until the child did, and
the child was only killed when the process exited.

It had been latent for weeks. Orphaned servers from previous days were squatting on those ports,
so the spawn failed, the child died at once, the handle was released and the process exited. **The
port clash was accidentally papering over the deadlock**, and clearing the orphans removed the
accident. The same bug is why a `turnsheet` from 31 July had been stuck two days holding 4419 —
one root cause, two symptoms that looked unrelated.

`film-render` and `render-episode` already called `stop()` explicitly. `short.mjs` and
`turnsheet.mjs` now do too.

### 2. Two runners, one era

Two `series.mjs` processes ran against Gupta for over an hour. Every stage is keyed on the slug so
they did not obviously collide — they took turns doing the same work, until both reached
`render-episode` for the same story. That stage archives the scratch frame directory before
capturing into it, so one run moved the other's frames out at **69% of a forty-minute capture**
and the encode found an empty folder. It cost `chandragupta-ii` and `faxian`.

Worse, both had loaded `series.json` at start and wrote back their whole copy, so **the ledger
alternated between two stale views** — the same story read `ok 44.4m` and `FAILED at render book`
half an hour apart. Nothing in it showed two runners; the failures looked like a renderer bug.

`series.mjs` now takes a per-era lock with a liveness check. **When the record disagrees with
itself, trust the artefacts**: `uploads.json` is written per upload rather than rewritten wholesale,
and a master's measured loudness is ground truth.

### 3. A failed render that leaves its output turns into a false "ok"

`kalidasa` failed on 2 Aug at `-0.1 dBTP` — the limiter had not taken effect — but **left the
master behind**. The next run saw the file, skipped the stage, and reported success in 2.5
minutes. A sweep of all six masters found only that one bad; it was quarantined to
`artifacts/superseded/` and re-queued.

Still to fix: `render-episode` must remove or quarantine its own output when the assertion fails.
Until then, sweep before trusting a resumed run:

```powershell
node -e "import('./tools/loudness.mjs').then(async m=>{const fs=await import('node:fs/promises');
for(const f of (await fs.readdir('dist')).filter(f=>/-book-cut-k-page\.mp4$/.test(f))){
const r=await m.measure('dist/'+f);const i=+r.input_i,tp=+r.input_tp;
console.log((Math.abs(i+14)>1||tp>-0.9?'BAD ':'ok  ')+f+' '+i.toFixed(1)+' LUFS '+tp.toFixed(1)+' dBTP')}})"
```

### 4. The close was one dB quiet, and the check was right to stop

Every story failed at `outro`, and it was the loudness assertion rather than the render. `loudnorm`
in linear mode computes one gain from the **pre-limiter** measurement; the limiter then shaves the
peaks and takes back some of that loudness. How much depends on the crest factor, so it varies per
take.

It went unnoticed while every episode closed on the same era beat: that clip landed at −14.9 LUFS,
just inside tolerance. **The moment each story got its own closing take, the spread showed.**

`trimToTarget` measures what actually came out and applies the residual, bounded by real headroom.
Two things it got wrong first: headroom computed by subtracting an intersample true-peak reading
from `alimiter`'s **sample**-peak target — two different scales, giving −0.1 dB of "headroom" and
correcting nothing; and re-limiting the correction, which is exactly what removed the loudness in
the first place. −15.2 → −14.8 LUFS at −1.0 dBTP.

### 5. A validation message is an instruction

`deogarh` failed `short-script` three attempts running, every one opening a line on "His". The
rule is right — a Short is watched from the middle of a scroll, so a line starting on a pronoun
has no referent. But the message said only that a pronoun was used, and the prompt's advice was
"name the subject again". Deogarh's figure is **"The Master Sculptor of the Gupta Age"**. There is
no name. The model was being told to do something impossible and kept trying variations of it.

The check now says what to do instead — use a noun phrase where there is no recorded name.
Corrected on the first retry. **Stating the violation is only half the job.**

### What the run produced

Ten of fourteen uploaded private on the first pass, each with its own stinger pair and its own
closing image, no two alike. `dist/uploads.json` holds the URLs. Outstanding: `deogarh`
(`--from short-script`), `kalidasa` (re-render), `iron-pillar`, `the-coins-go-silent`.

A **fourteenth story appeared upstream mid-run** — `the_coins_go_silent_in_ujjain` — and
`series.mjs` picked it up without being told.

---

## Changelog — 2 Aug 2026

Six pieces of work in one long session. Each has a section below; this is the index.

| what | why it mattered | where |
|---|---|---|
| Sora fleet across two deployments | capacity was hardcoded at a number that was true once | `tools/azure.mjs`, `tools/sora-probe.mjs`, `tools/fleet.test.mjs` |
| Hindi as a second timeline | the channel is bilingual from here on | `tools/build-episode.mjs --lang`, `tools/lang.mjs` |
| Keeping what was generated | tools were deleting irreproducible work as hygiene | `tools/keep.mjs` |
| Five repositories | 5.56 GiB packed; GitHub refuses a first push that size | `.gitmodules`, `tools/push-assets.mjs` |
| Story-specific opens and closes | 11 of 12 outros were byte-identical | `tools/outro-shot.mjs`, `tools/stinger.mjs` |
| Shorts state facts, and keep their stills | user direction, both scoped forward only | `tools/short.mjs`, `tools/short-shots.mjs` |

---

## The repositories

`git clone --recurse-submodules https://github.com/naveenneog/bharatiya-itihasa-intro.git`

| path | repo | visibility | holds |
|---|---|---|---|
| *(root)* | `bharatiya-itihasa-intro` | public | tools, scripts, src, vendor — ~1 MB, 55 commits |
| `episodes/` | `…-intro-episodes` | private | art, narration, thumbnails, Short and outro takes + stills |
| `films/` | `…-intro-films` | private | film stills and Sora takes |
| `eras/` | `…-intro-eras` | private | era title-sequence stills and takes |
| `versions/` | `…-intro-versions` | private | title-sequence version stills and takes |
| `artifacts/` | `…-intro-artifacts` | private | kept frames, contact sheets, plates, probe takes, superseded renders |

This mirrors how `IndianHistory` is arranged (code repo + `app/assets` submodule pointing at
`bharatiya-itihasa-masters`), which is what the split was modelled on.

The original single-repo history is preserved at
`C:\Users\navg\DailyApps\ItihasaIntro-backup-20260802-144558.git` (a mirror clone, 5.71 GB).
It is the only copy of the pre-split history. Do not delete it without asking.

**Push generated assets with `node tools/push-assets.mjs`.** It commits each dirty submodule,
pushes it, and then records the new commit ids in the parent — that last step is the one that is
easy to forget and the one that matters, because a submodule pushed but not recorded is invisible
to a fresh clone.

### What pushing 7.5 GB taught

- **GitHub answers a push of roughly two gigabytes with HTTP 500 and then prints
  `Everything up-to-date`.** A loop that reads the last line of git's output therefore records a
  successful push of nothing. Every push is now verified against `git ls-remote`, not against
  what git said it did. This cost two rounds of "the films repo is pushed" that were false.
- **A pack of many small objects fails the same way with the bytes well inside the limit.**
  Batching by accumulated size alone still failed at 16,328 frames. Bound on **count and bytes**.
- **Git reports a new directory as one untracked entry**, so size-batching the entries git prints
  puts a 7 GB tree in one batch and the limit never binds. Expand directories to files first.
- **A bare `.git` copied into a working tree has no index**, so every file reads as modified and
  `checkout` aborts. `git reset --mixed HEAD` populates it without touching the tree.
- `safe.bareRepository=explicit` is set globally here; operating on a bare repo needs `GIT_DIR`.

---

## Sora capacity — measured, not declared

```powershell
node tools/sora-probe.mjs              # one job per live deployment
node tools/sora-probe.mjs --burst 3    # three at once per lane, to find the cap
npm run test:fleet                     # 16 assertions, no network
```

The account has **three** Sora deployments and only two are usable: `sora` is provisioned,
listed, and `Disabled`, on model version `2025-05-02`. `sora-2` and `sora-2b` are both
`2025-12-08`. **A deployment list is not an availability list** — check `provisioningState` and
model version.

Each deployment enforces its own running-task cap, so `genVideo` dispatches across a fleet of
lanes, each finding its ceiling by AIMD and remembering it in `dist/.sora-conc.json` (gitignored).
The cap is **2 per deployment** — the same number that used to be hardcoded, which is the point:
the value was never the problem, the inability to tell "2 is the cap" from "2 was the cap once"
was.

Measured, same job (seven 8-second portrait takes):

| | span | evidence |
|---|---|---|
| one lane | 346 s | completions land in clean **pairs** |
| two lanes | 291 s | **three** completions inside ten seconds |

The finishing *pattern* is the evidence, not the total — a total improves for many reasons, but
three completions inside ten seconds against a cap of two can only mean more than two ran.

Three things worth keeping:

- **Two kinds of 429 want opposite responses.** "Too many running tasks" is relieved the instant
  the fleet shrinks; a token-rate limit is relieved only by waiting. Both were sleeping a flat
  45 s, and a burst of six spent more time asleep in the retry branch than generating. The same
  burst went **330 s → 209 s** on that one change.
- **Then that fix caused a bug.** Cheaper retries burned the fixed ten-attempt budget faster and
  killed two clips out of seven. Concurrency 429s now draw on their own budget (40 waits) because
  backpressure is not failure.
- **Halving overshoots a small ceiling.** 6 → 3 → 1 undershot in two steps, both taken before any
  job had finished. Backing off by a third converges 6 → 4 → 3 → 2 and stops on the truth.

A caller must pass `model: null` to let the fleet choose. `gen-clips.mjs` defaulted `--model` to
`'sora-2'`, which after the fleet landed would have pinned every clip to one lane and quietly
undone the whole change — the defaulting-flag class again.

---

## Hindi is a second timeline

```powershell
node tools/build-episode.mjs --story <id> --slug zero --lang hi   # -> episodes/zero-hi/
node tools/build-episode.mjs --slug zero-hi                        # the same thing
```

The upstream project ships Hindi **text and audio** for every line and **no Hindi word timings**.
The Hindi voice it chose, `hi-IN-Dhruv:MAI-Voice-2`, returns none from the synthesiser either —
that architecture emits no word boundaries at all, while the ordinary `hi-IN` neural voices
(`AaravNeural`, `MadhurNeural`, `SwaraNeural`) return one per written token, exactly. Measured
with `tools/hi-probe.mjs`, not assumed.

**The user chose to keep the better voice and accept whole-line Hindi captions.** So Hindi is a
deliberate treatment, not a degraded one: the line is shown entire in Tiro Devanagari Hindi, lit,
rising slightly as it arrives — and the rise is driven from `paintWords` with everything else,
because a CSS animation on a class change has no defined position under the renderer's seek.

A sweep faked from invented timings was rejected on principle: it would light the wrong word and
look exactly like a version that worked.

Hindi gets its **own episode folder** because the timeline differs — 6.5 min against English's
5.5, line by line. Taking durations from English and playing Hindi over them is how a dub goes out
of sync with its own pictures. `episode.json` records `lang`; every downstream tool takes the
folder as its `--slug`, and `--slug zero-hi` and `--slug zero --lang hi` mean the same thing while
a contradiction between them is refused.

`tools/lang.mjs` holds the language profile and the Hindi register instruction. It is read from
the episode rather than passed, because packaging, cold open, closing cards and the vertical cut
are four separate generators and a language given to three of them produces a Hindi voice under
an English title.

**Hindi exposed a flaw that was always there.** The verso gutter shadow reaches 21% in from the
crease and the caption column had 3.2%, so the last word of every full line sat under a ~40% veil.
English hid it — only unspoken words were affected and they brighten as the voice reaches them.
Hindi is lit all the way along, so it was permanent. Both languages now get a gutter margin
(`padding: 0 7.2% 0 4.6%` on `.framed #capwrap`), tied by comment to the 21% it clears.

**State:** `zero-hi` is built, packaged, and has closing cards and a closing take. Hook, Short and
master render are not done. The Hindi rollout across the era has not started.

---

## Keeping what was generated

The user's instruction, verbatim: *"Please persist the stills and all artifacts you are
generating don't delete intermediate images and videos. Keep them saperate."* And later, on why:
*"The Stills was beautiful thats why I asked to keep them."*

`tools/keep.mjs`:

```js
stash(dir, label)    // move it into artifacts/<label>/<stamp>/ instead of deleting
recycle(dir, label)  // stash, then hand back an empty directory at the same path
runDir(label)        // an output directory stamped with its run, so nothing overwrites
```

Wired into `render-episode` (frames), `render-master` (plates), `make-outro` (superseded takes),
`short` (type frames), `turnsheet`, `capsheet`, `sora-probe`. `--drop-frames` still exists on
`render-episode` if disk gets short.

Every generated asset keeps its **prompt in a `.txt` beside it**. A generated asset whose prompt
was not kept cannot be varied, corrected or explained later — only replaced.

### What that policy now costs — audited 21 Aug 2026

The instruction was right and is not in question. But the archive it produced has grown roughly
tenfold past the note that describes it, and the numbers are worth having in front of you before
the disk decides for us. **C: was at 135 GB free of ~2 TB.**

| | size | files |
|---|---|---|
| `artifacts/frames` | **678.2 GB** | 1,512,298 |
| `dist/.ep-*` scratch | 202.6 GB | 203 dirs |
| dist masters | 54.5 GB | 195 |
| `episodes/` | 37.8 GB | |
| `artifacts/.git` | 9.6 GB | |
| films, eras, outro-clips, plates, short-frames | ~14.5 GB | |

`artifacts/frames` is 99% of the archive. Its shape is
`frames/<slug>-cut-k-page/<run-stamp>/f000000.jpg…` — 195 episode directories, ~9,000 JPEGs and
~4 GB each, one full uncompressed frame set per episode.

Two things a reader should know before touching it:

- **`frames/` is gitignored, but 16,328 files under it are still tracked.** The ignore rule was
  added after they were committed, and `.gitignore` does not untrack. It is exactly two
  directories — `skandagupta` and `chandragupta-i`, the earliest Gupta builds. Everything else,
  **193 directories and 661.8 GB**, is purely local: never pushed, not in history.
- **The ignore note is stale.** It says "146,000 JPEGs weighing 76 GB is 95% of this archive".
  It is now 1.51 M files and 678 GB. The note also contains the argument against itself —
  *"every one of them is also present inside the encoded master beside it"* — and the 195 masters
  come to 54.5 GB, so `frames/` is a 12× larger duplicate of video we already hold.

The honest counter-argument, from the same note: a frame is only reproducible from the page *as
it was*, and the page is edited constantly. Deleting is irreversible in a way re-rendering cannot
undo. That is a judgement for the user, not for the pipeline.

### What was cleared, 21 Aug 2026, on the user's instruction

*"clean up artificats/frames"*. **661.8 GB freed; free space went 135 GB → 789 GB.**

The 193 untracked directories were removed. The two tracked ones — `skandagupta` and
`chandragupta-i` — were **kept**, because deleting them would show as pending deletions in the
`artifacts` submodule and would not free the blobs from history anyway. `artifacts/frames` is now
16.4 GB in 2 directories.

Three checks ran before anything was deleted, and are the checks to repeat next time:

1. **Every directory had its master**, ≥10 MB, on disk — the whole justification is that the
   frames are already inside the encoded master. 193 of 193 passed; had any failed it would have
   been kept.
2. **Every directory was untracked**, verified against `git ls-files frames` rather than assumed
   from `.gitignore` — the two tracked ones exist precisely because the ignore rule came later.
3. **Afterwards**: `git status` in `artifacts` is clean, 195 masters and 197 episode directories
   are untouched.

`render-episode --drop-frames` is what stops this recurring; at one full frame set per episode
the archive regrows at ~4 GB per build.

**Stills are generated and kept for every take.** This was not true until 2 Aug: both
`short-shots.mjs` and `outro-shot.mjs` went straight from text to video on the reasoning that
"a reference would cost a still per shot for no editorial gain". That was wrong twice — the still
is a finished piece of art in its own right, and animating an approved still holds the take far
closer to the brief than a text prompt does.

| | still | take |
|---|---|---|
| close | `episodes/<slug>/outro-stills/<id>-rN.png` 1536×1024 | `outro-clips/<id>-rN.mp4` |
| Short | `episodes/<slug>/short-stills/NN-<id>-r1.png` 1024×1536 | `short-clips/NN-<id>-r1.mp4` |

Portrait stills for the Shorts deliberately: a 9:16 crop of a 3:2 still keeps a narrow strip and
upscales it, the same softness that made cropped landscape footage unusable. Costs ~2 min more
per shot.

The nine Shorts that already existed were made text-to-video and have no stills. **The user said
explicitly not to regenerate them.**

---

## Story-specific opens and closes

The user's report: *"Don't just reuse the same Dinara video for all the videos, Use Story
specific, Intro, outro."* Both faults were the same shape — **a rule that reads as sound
editorial guidance and, applied across a series, collapses to a constant.**

**The close.** `make-outro` fell back to "the era's longest abstract beat", which is one
deterministic answer for a whole era: **eleven of twelve Gupta outros were byte-identical**, and
only `zero` escaped because it has a real film. `tools/outro-shot.mjs` now writes one closing
subject from the episode's own closing cards and generates a 12-second take — Aryabhata ends on
an eclipse wave crossing a turning world, Faxian on an empty begging bowl filling with gold dust,
Kalidasa on a cloud unfurling into a river's curve. Thirteen distinct takes. The era fallback
still exists and now **warns loudly**.

**The open.** The stinger prompt asked for "the widest or most familiar beat of the era", which
has exactly one right answer, so `01-dinara` opened **all thirteen** episodes. Telling the model
to "prefer an unused beat" did not fix it — it still chose the same one eight times. The model now
returns a **subject beat plus three ranked openers** and the spread is decided in code.

**What must not repeat is the pair, not the opener.** Balancing openers alone gave
`chandragupta-i` and `chandragupta-ii` the identical fifteen seconds. Now 13 of 13 pairs are
distinct and `01-dinara` opens four.

Two bugs found doing it:

- **The era-order sort was unconditional and silently outranked the rule it served.** The
  sequence accelerates, so the pair was sorted into era order; but the subject must play *last*.
  The model chose to open the zero episode on the Huns — Brahmagupta wrote in the post-Gupta
  north-west, and its reasoning said exactly that — and the sort turned it into an episode that
  opened on zero and ended on an invasion. Only the manual path sorts now.
- **The model returns ids without their numeric prefix** often enough to matter (`kavya` for
  `08-kavya`), which failed validation and lost sushruta's whole choice. The prefix is ours, not
  the model's; bare names resolve, ambiguity is still an error.

---

## Shorts state facts, not a story

The user's direction: *"Going forward We might want to just tell Facts, Not like a story this
only applies to shorts format only and for next generation which is still not started."*

The long-form book cut **keeps its narrative**. Only the 9:16 Short changed, and only for Shorts
not already scripted — `short.mjs` caches `short.json`, so the nine existing scripts are
untouched by design.

The shape was an arc (hook → ground → turn → proof → proof → reach → payoff). It is now **seven
standalone facts**: strongest first, each true on its own, none depending on the line before.
The reasoning is in the prompt — a Short is watched in a scroll, often from the middle, often
twice; facts survive that and a narrative does not.

**The connective rule is enforced, not requested**, because narrative is the natural way to write
history and the model drifts straight back to it. A line may not open on `and, so, then, but, yet,
because, after, this, that, which, meaning, leading, thus, hence, later, soon, now`, and after the
first line may not open on a pronoun. First attempt on sushruta produced *"He spoke of one hundred
and twenty instruments…"* — rejected, fed back, corrected on the retry. `short.mjs` now makes up
to **three attempts, handing the specific failures back**, rather than failing an unattended run
over a fixable sentence.

---

## Publishing to YouTube

Standing instruction from the user: **upload via the local yt-agent, never by driving a browser.**

**Use `tools/upload.mjs`** — it reads a finished upload folder and drives the agent:

```powershell
node tools/upload.mjs --dir dist/gupta/zero_v5 --dry          # show what would be sent
node tools/upload.mjs --dir dist/gupta/zero_v5 --ab           # private, with A/B challengers
node tools/upload.mjs --dir dist/gupta/zero_v5 --visibility public
```

It picks the master (largest mp4 that is not the intro or outro), the title from `title.txt`,
the description from `description.txt`, the 1280×720 `<slug>-thumb.png`, and — with `--ab` — the
B title from `ab/titles.txt` and the B plate from `ab/`. It checks the title is within YouTube's
100 characters before submitting.

**Two deliberate choices:**

- **Private by default.** The agent's own documentation shows `--visibility public`, which is
  right for one video someone is watching go up and wrong as the default of an unattended
  thirteen-story run, which would publish an unreviewed series to subscribers. Pass
  `--visibility public` explicitly.
- **Idempotent against the master's SHA-256.** Every other step here is safe to re-run — a stage
  whose output exists is skipped, a failed story is retried. An upload is the one step that is
  not: running it twice produces two videos on a public channel. Uploads are recorded in
  `dist/uploads.json` against the video's content hash, and a second attempt refuses unless
  `--again` is passed. A timeout (exit 3) is recorded too, because "still processing" is not
  "not uploaded".

Raw agent interface, if it is ever needed directly:

```powershell
powershell -File C:\Users\navg\DailyApps\yt-agent\start-agent.ps1     # idempotent
node C:\Users\navg\DailyApps\yt-agent\submit.mjs `
  --video "C:\ABS\final.mp4" --title "<=100 chars" --desc-file "C:\ABS\desc.txt" `
  --visibility public --thumbnail "C:\ABS\thumb-a-1280x720.png" `
  --title-variants "Alternate title B" --thumbnail-variants "C:\ABS\thumb-b-1280x720.png" `
  --wait --timeout 900
```

Exit `0` done → report `youtube_url`; `ab:true` A/B running; `thumbnail_limited:true` daily cap,
add tomorrow. Exit `1` failed (`SIGNED_OUT` → sign in once in the Edge profile). Exit `3` timeout,
still processing.

**Only one process at a time may drive `C:\Users\navg\.copilot\playwright-youtube-profile`.**
Serialise uploads; never run a batch of them in parallel.

**Nothing has been uploaded yet, and this is not a factory stage.** It was left out on purpose
while `series.mjs` was mid-run — editing `factory.mjs` during a run is what broke three stories
earlier. Adding an opt-in `upload` stage gated on `--upload` is the next step. Until then it is
run by hand per folder.

---

## Do not edit tools while a batch runner is going

`series.mjs` spawns a fresh `node` per stage, so it picks up whatever is on disk at that instant —
including a half-written file. Editing `closer.mjs` mid-run failed `skandagupta`, `sushruta` and
`zero` at the `closer` stage; all three passed immediately on re-run. **Stop the runner before
touching `tools/`.** The failures look like real failures in the ledger and are not.

`series.mjs` itself is the exception — node has already loaded it, so editing it does not affect
a run in progress, only the next one.

### When an edit genuinely cannot wait — write, check, rename

A rename is atomic; a write is not. So never write into `tools/` in place while a runner is
going. Write the new text to `tools/.<name>-patch.tmp.mjs`, run `node --check` on it, and only
then `fs.renameSync` it over the original. A stage that spawns mid-swap sees either the whole old
file or the whole new one, never a torn half. **The temp file must end in `.mjs`** — `node --check`
refuses an unknown extension, and that refusal is what stops the rename. That guard earned its
keep on the first attempt here: the check failed on a `.tmp` name and the original was left
untouched.

This is the pattern that `todar-mal-counts-every-bigha` was lost for. Editing `llm.mjs` in place
under a live runner let a stage read a half-written file.

### Never `import` series.mjs to inspect it

`series.mjs` runs its CLI at module scope, so `await import('./tools/series.mjs')` does not load
it — it *starts a run*. Doing this to check `checkSlugs` began planning `gupta` and left a
`dist/gupta/series.lock` behind. Harmless here (the pid was dead, and `series.mjs` takes over a
lock whose pid is gone), but on a live era it would be a second runner.

To read the corpus, import `tools/stories.mjs` — `loadStories`, `eraOf`, `yearOf` are all pure.
To check slugs, run `series.mjs` as a subprocess and read its output.

---

## Two things that make an unattended run hard to debug

**The runner was swallowing stderr.** `p.stderr.on('data', keep)` captured the child's error
output into a string, used it to regex out the name of the failing stage, and threw the rest
away. Four stories failed at `outro` in one run and there was nothing anywhere saying why. Fixed
2 Aug: stderr passes through, and the last 4,000 characters of a failed run are written to
`dist/<era>/<slug>.fail.log` with the ledger pointing at it. **An unattended run is read hours
later, when the scrollback is gone — the ledger has to hand over the evidence, not just the
verdict.**

**Orphaned `serve.mjs` processes hold ports for days.** Several tools spawn
`scripts/serve.mjs` on a **fixed** port (`film-render.mjs` 4431, `turnsheet.mjs` 4419,
`capsheet.mjs` 4463, `render-episode.mjs` its own) with `stdio: 'ignore'`. If the port is already
held the server **dies silently** and only the later `page.goto` fails, with
`ERR_CONNECTION_REFUSED` — a symptom that looks nothing like its cause. Processes from 21 July,
26 July and 31 July were still listening when this was found, including a `turnsheet` stuck for
two days.

Check before a long run:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'serve\.mjs|turnsheet|capsheet' } |
  ForEach-Object { "{0} {1}" -f $_.ProcessId, $_.CommandLine }
```

**Worth fixing properly:** pick a free port instead of a fixed one, and check the server is
actually listening before navigating. Not done — it needs an edit to every tool that spawns a
server, and the series was running.

---

---

## The series runs in chronological order

`loadStories()` used to end `out.sort((a, b) => a.id.localeCompare(b.id))`. Alphabetical by id put
Ashoka's change of heart before Chandragupta founded the dynasty, and dropped Prinsep's 1837
decipherment of the edicts into the middle of the empire it decoded. Production order is also
upload order, so the channel was filling up out of sequence.

The only date available is the `era` field, which is free text written for a human. `yearOf(story)`
in `tools/stories.mjs` turns it into a signed sort year and `byChronology` sorts on it:

| the string | reads as | why |
|---|---|---|
| `c. 261 BCE` | −261 | BCE is negated so it counts backwards |
| `c. 321-297 BCE` | −321 | a range means its start |
| `c. 260s-230s BCE` | −260 | the decade `s` is ignored |
| `after c. 297 BCE` | −297 | |
| `c. 250 BCE and modern national adoption in 1947-1950` | −250 | **the first date wins** — this is an Ashokan pillar, not a 1947 story |
| `c. late 4th-early 5th century CE` | 380 | century + qualifier |
| `1837-1838 CE` | 1837 | |
| `Mauryan statecraft tradition` | `null` | sorts last, not guessed |

Two decisions worth keeping:

- **A century is a hedge, not a date, so it sits at its middle**, shifted by `early` / `mid` /
  `late` (15 / 50 / 80 years in). Taking a century's first year instead put Kalidasa and Sushruta
  (`4th-5th century CE` → 300) ahead of Chandragupta I founding the dynasty in 319. With midpoints
  Kalidasa lands at 380, beside Chandragupta II, which is where tradition puts him. A BCE century
  runs backwards — early 3rd century BCE is nearer 300 than 201.
- **An undated story returns `null` and sorts last** rather than being given a plausible year. A
  wrong date in a chronological series is worse than an admitted gap.

Gupta now reads founder → expansion → zenith → Kalidasa → twilight → Aryabhata → zero (628), and
Maurya ends on `the_parade_that_ended_the_mauryas` (185 BCE) with Prinsep trailing the empire.

### It immediately caught a mis-filed story

Sorting chronologically showed `the_gods_take_shape_at_deogarh` sitting in **Maurya** at 450 CE.
The year was right; the bucket was wrong. `eraOf` returns the **first** matching era in list order
and `maurya` is listed before `gupta`, so `sarnath` in the Maurya pattern claimed it — Sarnath is
both Ashoka's lion capital and the Gupta Buddha. `sarnath` is gone from the Maurya pattern;
`the_four_lions_of_sarnath` still lands there on `ashoka`. Counts moved 14/14 → 13/15, and deogarh
is now bucketed where it was actually built and uploaded.

First-match-wins on an ordered keyword list stays fragile: any place, dynasty or name shared across
two eras is claimed by whichever era is listed first. Putting a date in the story files would
remove both this class of bug and `yearOf` altogether.

### A ledger shorter than the corpus — two different causes, told apart by the runner

Mughal had 30 stories in the corpus and 29 rows in `dist/mughal/series.json`, the missing one being
`karnal_and_the_three_hour_rout` (1739), last chronologically. The first reading was that `yearOf`
had dated karnal into mughal *after* the runner planned, and since a runner plans once at startup,
it could never be seen.

That was wrong **for karnal**. The runner reached it unaided, so it had been in the plan all along —
and the dating fix landed 13 Aug, before both the runner killed by the 15 Aug reboot and its
replacement. The cause there is the reboot: killing a runner mid-flight writes a burst of fail rows
for everything unbuilt (18 inside one second here) and that write was cut short. Karnal sorts last,
so it is exactly the row that never landed.

But the *mechanism* is real, and auditing every era found it had already happened four times:

| era | corpus | rows | never attempted |
|---|---|---|---|
| gupta | 24 | 14 | **10** |
| rashtrakuta | 10 | 8 | 2 |
| delhi-sultanate | 30 | 29 | 1 |
| maurya | 13 | 12 | 1 |

All four had been reported complete, because "complete" was measured against **the plan the runner
made**, not against the corpus. `eraOf` falls through to the date, so every widening of `yearOf`
moves stories between eras — the century-range and lone-year fixes cut corpus-undated from 48 to 5,
and those newly dated stories landed in eras already finished. Gupta gained ten: Faxian, Harsha,
Silabhadra, Lalitaditya, the cadaver in the lecture hall.

So a short ledger has two causes, and the test that separates them is simple:

- **Never attempted** — the story is in the corpus with no row at all, and no `.fail.log`. The era
  was built before the story belonged to it. Re-run the era; the plan is rebuilt from the corpus.
- **Row lost** — the runner demonstrably reached it. A truncated write during a kill. Also fixed by
  re-running, but nothing was missed.

```js
const g = all.filter(s => eraOf(s) === era);
const ids = new Set(Object.values(led.runs).map(r => r.id));
for (const s of g) if (!ids.has(s.id)) console.log('no row:', s.id);
```

**Never call an era done without running this.** A runner that finishes has finished *its plan*, and
a plan is a snapshot. Re-audit every era after any change to `yearOf` or `eraOf`.

One row in that audit is not what it looks like. Maurya's `the_grammar_that_watched_a_war` reads
`failed`, but the episode is **built** — a 307 MB master from 4 Aug and a 12-file publish kit. It
failed the *upload* stage, which was still part of the run then: the file reached YouTube, the
upload did not finish, and `upload.mjs` refuses to send it twice. Re-running the era without
`--upload` records it `ok`. A ledger row names the stage that failed, and not every stage makes
video.

---

## An episode was built into the wrong era, and it is already made

`the_debased_coin_and_the_divided_court` is dated **"Karkota decline, c. 760–855 CE"** — Kashmir,
eighth century. It was produced as the **opening Mughal episode**, and its stinger is `02-mansab`
and `06-nurjahan`: the Mughal rank system and Nur Jahan's coin of the 1620s, roughly eight hundred
years after the story it is introducing.

Nothing objected, because `eraOf` matches keywords first and both dates are CE. "Debased coin" and
"divided court" are Mughal-sounding phrases. The isolation guard added later would have skipped it —
it is 766 years from any other Mughal story — but it was already built by then, and the guard
deliberately leaves built work alone.

**It must not be uploaded as a Mughal episode.** The master exists and is technically fine; the
framing is what is wrong, and a history channel opening its Mughal series on an eighth-century
Kashmiri coin is the error the `eraMismatch` comment was written about in the first place. The
decision — drop it from the Mughal set, or rebuild it under a Kashmir era — is editorial and is
recorded as a todo rather than taken here.

Worth noting how it was found: not by watching it, but by asking which stories have **no neighbour
within four centuries in their own era**. That question found six more misfiled stories in eras not
yet built. It costs one query and should be run whenever the corpus moves.

The same sweep shows the keyword bucket has errors a date test cannot see at all — `cabral_s_
factory_and_the_miri_fire`, the Portuguese at Calicut in 1500, sits in **bhakti** beside Mirabai
and Purandara Dasa. It is dated close enough to them that isolation says nothing. Dates catch the
absurd; only reading catches the merely wrong.

---

## Slug collisions resolve themselves

`slugFor` truncates an upstream id at its first connective, so `the_king_s_physician_under_law` and
`the_king_who_turned_ally` both want `episodes/the-king`. The old handling was to name the loser in
`BY_HAND` — 47 entries deep by the end — and `checkSlugs` exited when it found one it did not know.

That is fine while the library holds still, and the library does not. Three collisions appeared in a
single day — `the-book`, `the-river`, `the-king` — and because the check runs across the **whole
corpus**, each one stopped *every* era: a mughal sweep died twice on stories belonging to `other`
and `chola`. Twice that cost a night's building, because the runner exits before it takes the lock
and nothing looks wrong until you read the log.

Resolution is now derived, in this order:

1. **`BY_HAND` still wins.** Those slugs are published; they must not move.
2. **The story already built keeps the short name.** `episodes/<slug>/episode.json` names its owner,
   so the directory on disk *is* the record of who got there first.
3. **Everyone else falls back to the full id**, which is unique by construction.

When none of them is built they all take the long name rather than one winning arbitrarily — the
rule the two princes already followed by hand.

`checkSlugs` stays, as an assertion. If anything still collides the derivation is wrong, and telling
the reader to edit `BY_HAND` would send them to fix the wrong thing.

Verified before committing, and worth re-running after any change here: 698 stories resolve with
**zero duplicates**, all **168 built stories keep their existing directory**, and **166 masters** on
disk are still addressed by their slug. Note that `episodes/zero-hi` shares its story id with
`episodes/zero` — a Hindi variant is not a second claim on a slug, and a check that assumes one
directory per story will report a false move.

---

## The tools added on 2 Aug

| tool | what it does |
|---|---|
| `tools/keep.mjs` | archive instead of delete; `stash`, `recycle`, `runDir` |
| `tools/lang.mjs` | the language an episode is in, read from the episode; Hindi register instruction |
| `tools/outro-shot.mjs` | this story's own closing still + 12 s take, from its closing cards |
| `tools/push-assets.mjs` | commit + push each asset submodule in size- and count-bounded batches, then record the pointers in the parent |
| `tools/sora-probe.mjs` | fire real jobs at each deployment to find the concurrency cap |
| `tools/fleet.test.mjs` | 16 assertions on lane dispatch, pinning and the back-off law, no network |
| `tools/capsheet.mjs` | one full-size frame per panel for judging typography; reads the font and geometry back off the page |
| `tools/hi-probe.mjs` | which Hindi voices return word boundaries |
| `tools/hi-align.mjs` | forced alignment of existing Hindi audio — does not work here, kept as a record |

Existing tools changed: `azure.mjs` (fleet), `build-episode.mjs` (`--lang`), `episode-page.mjs`
(Hindi caption, gutter margin), `stinger.mjs` (opener spread, pair uniqueness), `make-outro.mjs`
(own take first, loud fallback), `short.mjs` (facts, retries), `short-shots.mjs` (stills),
`pack.mjs` / `hook.mjs` / `closer.mjs` (language-aware), `factory.mjs` (`outro-shot` stage),
`render-episode.mjs` / `render-master.mjs` (archive rather than delete), `gen-clips.mjs` /
`gen-era.mjs` / `film-gen.mjs` (fleet-aware concurrency).

---

## Still to do

### In flight right now

**`node tools/series.mjs --era gupta` is running** (shell `gupta`, started ~21:00 on 2 Aug).
13 stories, ~13–15 min each, so roughly three hours. Ledger at `dist/gupta/series.json`.

Everything rendered was **archived as superseded first** — 42 files, 2.9 GB, in
`artifacts/superseded/20260802-205919/` — because every stinger pair and every closing take
changed, and the factory skips a stage whose output exists. Without that invalidation the run
would have "succeeded" while shipping the old intros and outros. If the run is interrupted,
re-running is safe: stages are cached and a failure does not stop the era.

**Do not edit `tools/` until it finishes.** See the section above for why.

When it completes: check the ledger, then `node tools/push-assets.mjs` to get the new takes,
stills and frames onto GitHub.

### Next, in rough order

1. **Hindi rollout.** `zero-hi` proves the chain as far as packaging and closing cards. Still
   needed: Hindi hook, Hindi Short, a Hindi master render, and then the other twelve stories.
   `series.mjs` builds one language; it needs a `--lang` pass.
2. **Upload something.** Nothing has gone to YouTube yet. The yt-agent recipe is above.
3. **Decide on story-specific intro footage.** Stinger *pairs* are now unique, but all thirteen
   still draw on the ten shared era beats. Generating an opening beat per story the way the close
   now works would change the era-signature design deliberately — the user has not been asked.
4. **Re-run `retention.mjs`** on the new masters. Scores were zero 77, nalanda 81; `hooks` and
   `rehook` remain narration-shaped and low.
5. `megasthenes` is excluded from Gupta (c. 300 BCE in a CE era) and belongs to a Maurya series.
   Other eras may hold similar misfilings — the check is `eraMismatch` in `series.mjs`.
6. **Round 2 stills** (`--rounds 2`) and `picks.json` for the 17 non-Gupta eras.
7. **Give the body the intro's rhythm** — pacing is the lowest-scoring fixable bar.
8. **Break the three 15 s+ panels** into two visual moves each.
9. Fix the 2.1 s number-token caption dwell (sweep the highlight across the token).
10. Consider a 1440p delivery so YouTube gives the video a VP9 encode.
11. Port the year fix into `voice.py` once that project is free, then delete the override.
12. Re-check whether `repairWords()` still earns its place once years are fixed upstream.
13. Push `dailyapps-skills` — 3 commits, gate PASS, not pushed.
14. `tools/hi-align.mjs` investigated forced alignment of the existing Hindi audio and failed:
    the STT websocket will not connect on this resource (`StatusCode: 1006`) while TTS works.
    It is kept as a record of the path tried. If STT is ever reachable, Hindi could have the
    MAI voice *and* true word timings.

---

## Queued (user's explicit next task)

### The episode factory — the big one

Asked for verbatim: *"pick each story from Indian tales and generate content including
youtube upload folder which contains video, episode and Intro thumbnail… rate your
generation design for Youtube Viral factor, Accurate wordings… generation of Intro in the
style we agreed and relevant to the video encompassing and highlighting the factors of each
video in the narration… and a LOUD thumbnail options… document your process and create
reusable assets, skills and code to continue this flow for all the Stories Indian History
is creating… create 2 versions… free to use GPT-image-2… Lets complete Gupta series."*

Read as a contract:

1. **One command per story.** It walks the whole flow end to end and is reusable for every
   IndianHistory story, not hand-tuned for Aryabhata.
2. **A per-story intro**, in the Ink and Light language, whose beats are drawn from *that
   story's* own hooks — not the shared Gupta sequence replayed. The narration should
   highlight what makes that particular episode worth watching.
3. **LOUD thumbnail options** — plural. The `LOUD-` treatment in `tools/thumbnail.mjs` is
   the baseline; concepts come from `tools/gen-thumb-art.mjs`.
4. **A YouTube upload folder** per story: the video, the episode, the intro, the thumbnail,
   plus SRT, chapters, description and tags. One folder you can upload from.
5. **Two versions** of each, kept side by side for comparison.
6. **A scorecard** per version: the `retention.mjs` viral score **plus a wording-accuracy
   pass** (the Gupta fact-check found two outright errors; assume every story has some).
7. **Documented, with a skill**, so the flow survives context loss — alongside
   `ink-and-light`.
8. **Gupta series first.**

Building blocks that already exist and should be composed rather than rewritten:
`directions.mjs` · `gen-stills.mjs` · `gen-clips.mjs` · `picks.mjs` · `build-version.mjs` ·
`render-master.mjs` · `speak.mjs` + `years.mjs` · `build-episode.mjs` · `render-episode.mjs`
· `underscore.mjs` · `loudness.mjs` · `gen-thumb-art.mjs` · `thumbnail.mjs` · `publish.mjs`
· `retention.mjs`.

Missing pieces to build: a story picker over `IndianHistory/app/data/*.player.json`; a
per-story intro author (beats derived from the story's own hooks); the upload-folder
contract; the accuracy pass; and the orchestrator that runs all of it twice.

**Costing note.** ep01 took ~38 min of frame capture alone at 1080p25. A full story is
roughly: stills 5 min → clips 12 min → masters 8 min → episode render 38 min → kit 2 min
≈ **65 min per version**, ~2 h for two. Budget accordingly and run stories sequentially,
because Sora and the frame capture both saturate the machine.

### One intro per storyline

**One intro per storyline, not one shared intro** — a Gupta opening, a Chola opening, and so on,
each a full Ink and Light sequence attached to its own section. Pick **one deep sector per era and
kingdom**. Section 11 of the `ink-and-light` skill has the method: 8–14 beats *inside* one era,
same visual language, own direction id, same series wordmark.

**Gupta is done** (`v7-gupta-ink`, 10 beats, 45 s) and is the worked example to copy.
Remaining: **Maurya, Chola, Vijayanagara, Mughal, Maratha, the Republic** — and for each, a
2-beat `stinger` variant for its episodes to open with.

The recipe, now proven end to end:

1. Author the direction in `tools/directions.mjs` — 10 beats, `INK_LIGHT` + `RIGHT` constants,
   durations accelerating, every line fact-checked **before** rendering.
2. `node tools/gen-stills.mjs <id>` **twice** → two candidates per beat.
3. Contact-sheet r1 vs r2, choose, write `versions/<id>/picks.json` with the reason.
4. `node tools/gen-clips.mjs <id> --seconds 8` (~12 min at concurrency 2).
5. `build-version` + `render-master` for both `mobile` and `stinger` variants.

---

## Standing user preferences observed

- **Never delete generated assets. Keep every version.** Stated twice, and hardened after the
  second time: *"Please persist the stills and all artifacts you are generating don't delete
  intermediate images and videos. Keep them saperate."* — *"The Stills was beautiful thats why I
  asked to keep them."* Frames are **no longer** an exception; `tools/keep.mjs` archives them.
  Do not add an `rm` of anything generated.
- **Every generated asset keeps its prompt** in a `.txt` beside it.
- Keep **every version intact** for later review; never overwrite generative output.
- Wants to **see and approve** options rather than be given one answer.
- Uses Overdrive for work that is meant to be seen — decide and commit, no hedging, verify by
  actually using the thing.
- Do not disturb the Indian Tales repos.
- **IndianHistory is read-only from here**, and it is often mid-run generating other stories —
  fixes that belong upstream get built here as overrides plus a port-back note.
- **Both languages from here on.** English and Hindi; the Hindi narration already exists upstream.
- **Shorts state facts, not a story.** Scoped to the 9:16 format only; the long-form cut keeps its
  narrative. Applies to Shorts not yet scripted.
- **Every story gets its own intro and outro footage.** Reusing one era beat across a series was
  called out by name (*"the same Dinara video"*).
- **Uploads go through the local yt-agent, never a browser**, and only one at a time.
- **Repos follow the IndianHistory shape**: a small public code repo, heavy assets in private
  submodules, cloned recursively.

---

## The reflex worth keeping

Almost every expensive failure in this project has been the same thing: **a result that looks
correct.** Not a crash — a video of the right length, a push that says `Everything up-to-date`,
a caption that renders, a stinger that plays, a `29 KB` Short that encoded without error.

The habit that catches them:

- **Verify against the thing itself, not against what the tool said it did.** `git ls-remote`,
  not git's last line. The pixels, not the DOM. The encoded file's duration, not the arithmetic.
- **When a measurement changes by more than you can explain, check identity before modelling
  change.** A 48.6 s "narration drift" was a different story entirely.
- **A rule that is sound for one item can collapse to a constant across a series.** "The widest
  beat of the era", "the era's longest abstract take" — both correct, both produced thirteen
  identical results.
- **What a stage declares it makes must be what the next stage reads**, or a resumed run skips it
  and fails later, after the expensive part.
- **Instructions the model will drift across must be enforced in code**, not asked for. Preferring
  an unused beat, not opening a line on a connective — both ignored until checked.
