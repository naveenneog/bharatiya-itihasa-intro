# Context

Recovery document. If the conversation context is lost, this file plus the git log is enough to
resume cold. Method for the intro itself lives in the **`ink-and-light` skill**
(`C:\Users\navg\.copilot\skills\ink-and-light\SKILL.md`) — this file is *project state*.

Last updated: 2026-07-28.

---

## What this repo is

`C:\Users\navg\DailyApps\ItihasaIntro` — a title sequence for the user's **Bhāratīya Itihāsa /
IndianHistory** project, built in a **separate repo so the Indian Tales repos are never touched**
(a standing constraint; verified repeatedly — `IndianTales`, `indian-tales`, `indian-tales-app`
have had 0 files modified throughout).

`IndianHistory` *is* touched by the user's own content pipeline constantly. **This repo only ever
reads from it.** Do not write there.

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
Stills, clips and thumbnail plates **are** committed (generative output is not reproducible).

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

## Environment gotchas

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

## Still to do

1. **Generate era clips** — 170 jobs at ~72 s each. The one remaining big spend.
2. **Round 2 stills** (`--rounds 2`) so each beat has two candidates, then `picks.json` per era.
3. **Give the body the intro's rhythm** — pacing is the lowest-scoring fixable bar.
4. **Break the three 15 s+ panels** into two visual moves each.
5. Fix the 2.1 s number-token caption dwell (sweep the highlight across the token).
6. Consider a 1440p delivery so YouTube gives the video a VP9 encode.
7. Port the year fix into `voice.py` once that project is free, then delete the override.
8. Re-check whether `repairWords()` still earns its place once years are fixed upstream.
9. Push `dailyapps-skills` (committed, not pushed).

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

- **Never delete generated assets. Keep every version. Clean up only after explicit approval.**
  Stated directly: *"Keep in memory to keep all versions, don't cleanup the assets. Only after
  approval, you do that."* Frames are the one exception the user has not objected to — they are a
  deterministic function of the page and the schedule, and there are thousands of them; everything
  else (stems, takes, plates, candidates, masters) stays.
- Keep **every version intact** for later review; never overwrite generative output.
- Wants to **see and approve** options rather than be given one answer.
- Uses Overdrive for work that is meant to be seen — decide and commit, no hedging, verify by
  actually using the thing.
- Do not disturb the Indian Tales repos.
- **IndianHistory is read-only from here**, and it is often mid-run generating other stories —
  fixes that belong upstream get built here as overrides plus a port-back note.
