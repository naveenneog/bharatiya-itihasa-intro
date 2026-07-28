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

`dist/` is **gitignored** — masters are regenerable from the committed stills, clips and tools.
Stills and clips **are** committed (generative output is not reproducible).

Commits: `73f85f6` v2 · `a8d92bc` v3 · `e856cdd` v4 · `7e7d6bf` v5 · `4a6d48a` episode integration.

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
9. **The same number is read two different ways** by the narration: `cover` says "four ninety-nine
   C E", `p08` says "four hundred and ninety-nine". Source-audio inconsistency, not ours — but it is
   the opening line. Flagged, not yet resolved.
10. **A number token highlighted for 2.1 s** (`62,832`, `3.1416`) looks like a frozen caption even
    though the timing is correct. Fix intended: sweep the highlight across the token. **Not done.**

---

## Environment gotchas

- **Playwright cache is broken on this machine.** Only `chromium-1228` and `webkit-2311` are
  complete; Firefox is absent. `scripts/browser.mjs` auto-discovers and passes `executablePath`.
- **PowerShell has no heredoc.** Write commit messages to a temp file and `git commit -F`.
  Each call is a fresh process — no env/cwd persistence.
- **ffmpeg here has no glob** (`-pattern_type glob` fails) and **no fontconfig** (`drawtext` fails).
  Stage sequentially-named copies for `tile`; avoid `drawtext`.
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

## Still to do

1. Remaster audio to **−14 LUFS** for a YouTube master; render an MP4 (consider 1440p for VP9).
2. Generate **SRT** captions from the word timings, **chapter** timestamps, and a 1280×720 thumbnail.
3. Fix the 2.1 s number-token caption dwell (sweep the highlight across the token).
4. The narration reads `499` two different ways between `cover` and `p08` — source-audio issue,
   flagged, unresolved.

---

## Queued (user's explicit next task)

**One intro per storyline, not one shared intro** — a Gupta opening, a Chola opening, and so on,
each a full Ink and Light sequence attached to its own section. Pick **one deep sector per era and
kingdom**. Section 11 of the `ink-and-light` skill has the method: 8–14 beats *inside* one era,
same visual language, own direction id, same series wordmark.

---

## Standing user preferences observed

- Keep **every version intact** for later review; never overwrite generative output.
- Wants to **see and approve** options rather than be given one answer.
- Uses Overdrive for work that is meant to be seen — decide and commit, no hedging, verify by
  actually using the thing.
- Do not disturb the Indian Tales repos.
