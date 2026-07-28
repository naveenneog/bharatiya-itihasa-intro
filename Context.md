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
| ep01 | the Aryabhata episode as an actual film, cut E, ~5:42 | `dist/ep01-aryabhata-youtube.mp4` | first publishable master |

`dist/` is **gitignored** — masters are regenerable from the committed stills, clips and tools.
Stills and clips **are** committed (generative output is not reproducible).

Commits: `73f85f6` v2 · `a8d92bc` v3 · `e856cdd` v4 · `7e7d6bf` v5 · `4a6d48a` episode integration ·
`dcb2185` YouTube review + skill · `096f2bc` Gupta sequence + episode renderer.

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
    and looks entirely deliberate. `publish.mjs` asserts `naturalWidth > 0` before screenshotting.

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

## Rendering an episode to a file (new)

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

## The underscore (new)

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

## Publishing kit (new)

`node tools/publish.mjs --cut cut-e-framed --intro dist/v7-gupta-stinger.mp4`
→ `dist/publish-aryabhata/`

Reads `episodes/<slug>/publish.json` (title, hook, tags, chapter map keyed by panel id, thumbnail
spec) and writes:

- `<slug>.en.srt` — cut from the **same word timings the screen uses**, ≤2 lines, ~42 chars,
  never spanning a panel. 61 cues, correctly gapped across the spliced titles.
- `chapters.txt` — **YouTube's three rules enforced**: first mark `0:00`, ≥3 marks, none under
  10 s. It throws rather than emitting a list YouTube will silently ignore.
- `description.txt` — hook in the **first two lines**, because that is all that shows.
- `<slug>-thumb.jpg` — 1280×720 composed in a page with the project's own fonts, and it
  **asserts the art loaded** (a black rectangle with good type on it looks deliberate).

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

## Still to do

1. Fix the 2.1 s number-token caption dwell (sweep the highlight across the token).
2. Consider a 1440p delivery so YouTube gives the video a VP9 encode.
3. Port the year fix into `voice.py` once that project is free, then delete the override.
4. Re-check whether `repairWords()` still earns its place once years are fixed upstream.

---

## Queued (user's explicit next task)

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

- Keep **every version intact** for later review; never overwrite generative output.
- Wants to **see and approve** options rather than be given one answer.
- Uses Overdrive for work that is meant to be seen — decide and commit, no hedging, verify by
  actually using the thing.
- Do not disturb the Indian Tales repos.
