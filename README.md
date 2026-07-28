# One Line, Five Thousand Years

A drawn title sequence for **Bhāratīya Itihāsa** (भारतीय इतिहास) — the Indian History project.

> Looking for the **AI art directions**? Jump to [v2](#v2--the-ai-art-directions), or run
> `npm start` and open <http://localhost:4321/gallery.html> to review every version side by side.

Thirty seconds. One nib of gold ink that never lifts. The line it leaves becomes an Indus
seal, then the Sarnath lion capital, then a Chola vimāna, then the stone chariot wheel at
Hampi, then a Mughal dome — each drawing morphing into the next without the pen ever
leaving the page. It collapses to a single point of ink, from which the coast of India is
drawn in one continuous stroke; twelve chapter sites bloom along it; the map drains into
the Ashoka chakra, and the wordmark resolves beneath it.

Nothing here is a photograph, a stock asset or an imported illustration. Every curve in the
piece is generated from code in `src/art.js`, then re-drawn by a synthetic hand
(`src/sketch.js`) that wanders, searches and overshoots the way a real pen does. The score
is synthesised in the browser from an oscillator graph — there is no audio file.

---

## Run it

```bash
npm start          # serves the repo on http://localhost:4321/
```

Open <http://localhost:4321/> and it plays. Press **Replay** to run it again, **Sound** to
enable audio (browsers require a user gesture before any audio can start).

No build step, no bundler, no network. GSAP and the fonts are vendored into the repo, so the
sequence runs fully offline.

## Render it to video

```bash
npm install        # playwright, used only for rendering and QA
npx playwright install chromium
npm run render     # → dist/itihasa-intro.mp4, .webm, -poster.jpg
npm run render:draft   # fast 24fps half-scale proof
```

The renderer does **not** screen-record. It scrubs the GSAP timeline to `n / fps` and
screenshots each frame, so the export is frame-exact and deterministic regardless of how
fast the machine is. The score is rendered separately through an `OfflineAudioContext` to a
WAV, and ffmpeg muxes the two. Requires `ffmpeg` on `PATH`.

The renderer loads the page with `?export=1`, which hides the Sound / Replay buttons and the
standing caption — they are viewer chrome, not part of the sequence. The class is set on
`<html>` from an inline script so it applies before first paint, and `render.mjs` asserts the
chrome is hidden before capturing anything rather than discovering it half an hour later.

Output: 1920×1080, H.264 crf 17 + AAC 48 kHz stereo (`.mp4`), VP9 + Opus (`.webm`).

## QA

```bash
npm run qa         # real-time playthrough: fps, DOM weight, errors, reduced-motion
npm run xb         # cross-engine: Chromium + WebKit + Firefox, errors and frame spill
npm run frames     # contact sheet of 14 timeline positions → qa/frame-NN.png
npm run art        # contact sheet of every drawing → qa/art.png
```

`npm run qa` exits non-zero on failure. Measured on an idle machine: **median 59.9 fps,
5% low 59.5, 1% low 59.5**, worst single second 59 fps, 1741 frames sampled over the
29.19 s runtime, 1120 SVG paths, 0 console/page/network errors, reduced motion verified.

`npm run xb` loads the sequence in every Playwright engine present on the machine, seeks to
six timeline positions, screenshots each, and asserts that nothing which is actually painted
spills outside the 1920×1080 frame. Engines that are not installed are skipped, not failed.
Chromium and WebKit both report `29.19s · 1120 paths · 22 cues · 0 errors · 0 spills`, and
the screenshots are visually indistinguishable — including the gradient-clipped Devanagari
wordmark, which was the thing most likely to break.

---

## How it is put together

| File | What it does |
| --- | --- |
| `index.html` | The 1920×1080 stage, brand CSS, SVG scaffolding, type overlay, controls |
| `src/geom.js` | Path primitives — a chainable `P` builder, Catmull-Rom `spline()`, `circle/arc/ellipse/petal/ring/scallop`, seeded `rng()` and `noise1()` |
| `src/sketch.js` | The hand. Turns a clean path into ghost search passes plus a committed ink line with wander and overshoot |
| `src/art.js` | Every drawing: `indusSeal`, `lionCapital`, `vimana`, `chariotWheel`, `mughalDome`, `indiaCoast`, `chakra` — plus `INDIA_LONLAT` and `CHAPTER_SITES` |
| `src/stage.js` | Builds a drawing into SVG: ghost / halo / ink layers, hero separation, stroke-width table |
| `src/audio.js` | Cue-list synth (`drone / pluck / scratch / riser / strike`). Plays live, and renders the identical score offline to WAV |
| `src/intro.js` | The master GSAP timeline — era data, per-scene fit, nib rides, morph hand-offs, the finale, the cue list |
| `scripts/` | `serve` · `frames` · `shot` · `qa` · `xb` · `render` · `fetch-fonts` · `browser` (Playwright launcher) |

### Decisions worth knowing

- **The beats accelerate.** This is the one thing the whole piece is tuned around. Each era
  gets less time than the one before — draw, hold and hand-off all shorten together, from a
  4.4 s opening beat to a 2.65 s closing one. Five thousand years arriving faster than you
  can hold it. The copy shortens in step (13 → 10 → 9 → 8 → 8 words) so the reading load per
  second stays flat even as the cutting speeds up, and the era label comes up 0.55 s into
  the beat rather than at the tail, so it is on screen for most of it. The acceleration then
  breaks: everything collapses to one dot of ink and the coast is drawn in a single slow
  2.4 s stroke. The release is the point.
- **Everything is authored at exactly 1920×1080** inside `#frame`, then CSS-scaled to the
  window. SVG art and HTML type therefore share one coordinate space, on screen and in the
  export, and the video is pixel-identical to the browser.
- **Per-scene fit.** A column and a wheel cannot be laid out at the same scale just because
  they share a 1000-unit box. Each drawing is measured with `getBBox()` and given its own
  transform, budgeted to stay clear of both rules even at the widest point of the camera
  push. `vector-effect: non-scaling-stroke` keeps line weight identical across scenes.
- **Morphs are carried, not cross-faded.** One `#carrier` path takes the outgoing hero's
  `d`, MorphSVGs to the incoming hero's `d`, and tweens between the two scenes' fit
  transforms. The next drawing therefore arrives already drawn — the pen never lifts.
- **Marks shorter than 46 units are dabbed, not drawn** (opacity + scale) — cheaper, and
  truer to how a pen actually makes a small mark.
- **No SVG filters in the animated tree.** The paper grain is a 320×320 raster tile tiled by
  CSS on a div outside the `<svg>`. An earlier full-frame `feTurbulence` *inside* the SVG
  re-rasterised on every painted frame and pinned the sequence at 3–18 fps; moving it out
  took the median to 59.9. The halo glow is a wide low-opacity stroke, not a blur filter,
  for the same reason.
- **Deterministic by construction.** All jitter comes from a seeded `rng()`/`noise1()`, so
  two renders of the same frame are byte-comparable.
- **Reduced motion is honoured** — `prefers-reduced-motion: reduce` lands directly on the
  final composed frame instead of animating.

`window.__intro = { tl, cues, duration, renderWav, seek(t) }` is the control surface used by
the render and QA scripts.

---

## The drawings

| Beat | Subject | Date shown |
| --- | --- | --- |
| I | Indus seal — humped bull, offering stand, six signs | c. 2600 BCE |
| II | Lion capital of Ashoka, Sarnath | c. 250 BCE |
| III | Vimāna of the Brihadisvara temple, Thanjavur (drawn with 13 tiers) | 1010 CE |
| IV | Stone chariot wheel, Vitthala temple, Hampi | c. 1520 CE |
| V | Onion dome of the Taj Mahal | 1632–1653 |
| Finale | Coast of India, 12 chapter sites, Ashoka chakra | — |

Dates are the conventional scholarly ones and are deliberately hedged where the record is
(`c.`, "they say", "still argued over"). The Chola beat says "thirteen storeys" and the
drawing is generated with `vimana({ tiers: 13 })`, so the claim on screen matches the art on
screen.

**On the map:** `INDIA_LONLAT` is a hand-authored 78-point trace. It is a *stylised
silhouette for a title sequence, not a survey map* — the coastline is smoothed and
simplified for legibility at speed. The northern extent is drawn to include the whole of
Jammu & Kashmir and Ladakh. It should not be used as a reference for any boundary.

---

## v2 — the AI art directions

v1 (above) is the fully procedural, offline sequence. **v2 is a parallel exploration** that
replaces the drawn line with generated imagery, kept in `versions/` so every option stays
reviewable side by side. Nothing in v1 was changed or deleted to make it.

```bash
npm start                              # then open http://localhost:4321/gallery.html
```

`gallery.html` indexes **every** version, beat and revision that exists on disk — v1
included, so the directions are judged against what they'd replace rather than in isolation.
Each has a **Play the sequence** button.

| Version | Direction | The idea |
| --- | --- | --- |
| `v2a-living-miniature` | Living Miniature | Mughal/Pahari/Rajput miniature painting brought to life. Flat jewelled pigment, gold leaf, ornate rule borders. Warm, storybook, unmistakably Indian. |
| `v2b-carved-stone` | Carved in Stone | Macro cinematography of real temple stone. Raking gold light crawling across sandstone and granite, dust in the beam. Monumental and reverent. |
| `v2c-ink-and-light` | Ink and Light | The v1 idea made physical — real ink blooming in water, gold leaf, palm leaf. Abstract, luxurious, still about the act of writing history down. |
| `v2d-faces` | The Faces of Itihāsa | History as people, not monuments. Chiaroscuro portraits of the hands that actually made these things. The one direction with real emotion in it. |

### Pipeline

```bash
node tools/gen-stills.mjs [v2a v2c ...]        # gpt-image-2 → versions/<id>/stills/
node tools/gen-clips.mjs  [v2c] [--missing]    # sora-2      → versions/<id>/clips/
node tools/build-version.mjs [v2c]             # → versions/<id>/build/index.html
node tools/build-gallery.mjs                   # → gallery.html
```

Auth is an AAD bearer token from `az account get-access-token` — **no API keys and no `.env`
anywhere in this repo.** Run `az login` first.

**Nothing is ever overwritten.** Every run writes a new revision (`-r1`, `-r2`, …) and the
exact prompt is saved beside each file as `.txt`, so any frame can be traced back to what
produced it and no earlier version is lost. `--missing` resumes a partial run instead of
regenerating work that already succeeded.

### Decisions worth knowing

- **Clips are image-to-video, not text-to-video.** Each beat's approved still is cropped to
  the video size and passed as Sora's `input_reference`, so the footage inherits the exact
  palette and composition that was signed off. Text-to-video alone drifts off-look between
  beats and the four clips stop looking like one film.
- **Every still is composed with a dark, empty left third**, and the type is set in HTML over
  it — same Marcellus / Tiro Devanagari / Cormorant vocabulary as v1. So the directions differ
  in *art only*, which is what makes them a fair A/B. Prompts also forbid lettering outright:
  image models garble Devanagari.
- **`v2d-faces` is the exception — it is text-to-video.** Sora's moderation refuses reference
  images containing people (`people-in-user-uploads`), so that direction has to carry its look
  in the prompt. It holds up, but its framing is looser than the other three; that is a policy
  limit, not a tuning choice.
- **The era block is absolutely positioned at a fixed optical centre.** In normal flow each
  successive label stepped further down the frame as its predecessors stacked above it.
- **Dates are set in Cormorant, not Marcellus.** Marcellus has no lining figures, so `1010 CE`
  renders as `IOIO CE`.

### Limits found by probing the live service

The published docs did not match the deployment, so these were established against it directly
and are recorded at the top of `tools/azure.mjs`:

- Video API is `POST /openai/v1/videos?api-version=preview` — only `preview` and `v1` are
  accepted. A `{"detail":"Not Found"}` body means the api-version is right and the path is
  wrong; `{"error":{"code":"404"}}` means the route is wrong.
- `sora-2` renders **1280×720 or 720×1280 only**, for **4, 8 or 12 seconds**. The request
  schema advertises 1792×1024, but the model rejects it — and `sora-2b` resolves to the same
  model. 720p is therefore the ceiling; the assembly upscales.
- An `input_reference` must match the requested output size *exactly*, or the request fails
  with `Inpaint image must match the requested width and height`.
- Sora returns HTTP 429 `Too many running tasks` above ~2 concurrent jobs. That is a
  concurrency cap rather than a rate limit, so it wants patience, not smaller batches.

### Open

Longer takes and extra revisions per beat are one command each. Every direction remains
playable so the comparison stays honest.

---

## v3 — Ink and Light, extended to the empires

`v2c` was the chosen direction, so it was taken from four abstract beats to a **fourteen-beat,
61-second procession**: a two-beat opening, twelve empires, then the wordmark.

```powershell
node tools/gen-stills.mjs  v3-empires                  # 14 stills
node tools/gen-clips.mjs   v3-empires --seconds 8      # 14 clips, locked to the stills
node tools/build-version.mjs v3-empires                # playable page
node tools/render-master.mjs v3-empires                # dist/v3-empires-ink.mp4
```

Both generators take `--beat a,b,c` to redo individual beats, and never overwrite: each run
writes a new `-rN` revision so every take stays reviewable.

### What the extension changed

- **The visual language did not change.** Everything is still macro ink and liquid gold in
  black water. What changed is that each beat now carries *one empire's defining object* in
  that medium — pure abstraction cannot tell Gupta from Chola, and a roll-call of empires has
  to be legible.
- **Beats accelerate monotonically, 6.4 s → 3.4 s**, unbroken across all fourteen. Timing was
  the one thing v1 was tuned around and the one lesson worth carrying: five thousand years
  should arrive faster than you can hold it. The copy shortens in step so reading load per
  second stays flat, and the acceleration then breaks on the chakra, which holds.
- **The opening carries no numeral and no date.** Numbering is reserved for empires and
  neither opening beat is one. The first names the form itself — *itihāsa* is literally
  *iti-ha-āsa*, "so indeed it was" — and the second establishes the ground before any empire
  exists.
- **Empires overlap**, so the order is by start date, not a claim that one replaced another.
  The Sultanate and Vijayanagara are contemporaries.

### Decisions worth knowing

- **One clock, one module.** `tools/timeline.mjs` computes the schedule and is imported by
  both the browser player and the offline renderer. When the timing lived in the player, the
  renderer had to restate it and any edit silently desynced the two.
- **The in-point centres each beat inside its clip.** Clips are generated at 8 s and shown for
  3.4–6.4 s, so a beat plays the middle — where the ink is actually moving — rather than the
  first seconds where it has barely left the reference frame.
- **Sora holds a single hero object; it invents repeating texture over broad fields.** Every
  beat built around one object against black held for the full 8 s. The one landscape beat
  grew a field of scallops across the terrain, and needed a per-beat `motion` override telling
  it the rock does not move. That override is the only per-beat motion in the sequence.
- **Prompts must name one subject.** Two beats first came back unreadable because the prompt
  named two things and the model foregrounded the wrong one — a bundle of columns instead of
  the Qutb Minar, an extreme close-up blade instead of a hill fort. Naming a single hero with
  an explicit silhouette fixed both.
- **Art must stay out of the type zone.** Vijayanagara's wheel drifted left under the labels;
  the prompt now states the left half is empty black water and nothing else.

### The master render

v1's renderer scrubbed a GSAP timeline frame by frame. That cannot work here — the picture is
fourteen `<video>` elements and a headless browser will not seek them frame-accurately. So the
master is **composited** instead:

- **Picture** — clips trimmed to their in-points and cross-faded by ffmpeg's `xfade`.
- **Plates** — the scrim, rules, type, wordmark, vignette and grain captured *from the real
  page* as transparent PNGs via `?layer=…`, then given their motion by ffmpeg alpha fades.

Everything the viewer sees is therefore still authored in the page; the renderer never restates
a font, a gradient or a duration. Each part is captured separately because they are not one
contiguous z-band — scrim and rules sit under the type, vignette and grain over it.

Two bugs worth recording, both caught by **extracting frames back out of the encoded file**:

- The gold rules never rendered. `html.layer #frame > *{display:none}` carries id specificity
  and beat `html.layer-rules .rule` — `.rule` is the only plate with no id. Every plate is now
  asserted to contain non-zero alpha, so a silently-empty layer cannot ship again.
- Azure returns **HTTP 400 for a reference-image upload that timed out server-side**. It is
  transient despite the 4xx and is now the one 400 the client retries.

---

## v4 — the empires, scored

The same picture as v3 with a score muxed in. **v3 stays silent and untouched**; v4 is a
separate deliverable file, so both can be shown.

```powershell
node tools/render-score.mjs  v3-empires                                       # audio only + loudness report
node tools/render-master.mjs v3-empires --score --out dist/v4-empires-scored.mp4
```

The player at `versions/v3-empires-ink/build/index.html` gains a **Sound** button. Audio is off
until clicked, because every browser requires a gesture first.

### The score

No samples and no audio files — it is synthesised by the **same Web Audio engine v1 uses**
(`src/audio.js`), so the two pieces sound like the same title sequence. `tools/score.mjs` writes
it as a **cue list** rather than playback calls, which is what lets the identical score be both
scheduled live in the browser and rendered offline through an `OfflineAudioContext` for the mux.

Cues are derived from the same `schedule()` the picture uses, so changing a beat length moves
the music with it. Nothing in the score restates a timing.

| section | what happens |
| --- | --- |
| opening | drone and ink only — **no pulse**, so the procession has something to arrive into |
| empires | a tabla pulse enters on Indus and tightens through three gears, **1.40 s → 0.57 s** between strokes |
| | one plucked note per empire, climbing nearly two octaves |
| lockup | the pulse stops dead, a riser, a struck bell, and a return to Sa |

The three gear changes are deliberate: the beats already shorten on their own, so a fixed
stroke count would drift gradually. Stepping the count up three times instead turns that drift
into audible changes of *laya* — vilambit, madhya, drut — which is how a tabla piece actually
moves.

### Judging audio you cannot hear

This was written without being able to listen to it, so every claim about it is **measured**.
`tools/render-score.mjs` renders the score alone — seconds, not the minutes a picture composite
takes — and prints an EBU R128 profile. Two real faults were caught that way:

- **The first pass was dynamically flat**: LRA 2.9 LU, sitting at −18.5 LUFS for forty
  unbroken seconds. The build is now made by *starting quiet* rather than ending loud, because
  the synth chain compresses above −16 dBFS and pushing the finish only squashes it. LRA is
  now 7.0 LU, running −28.9 LUFS at the open to −16.6 at the drut section.
- **The lockup never reached level.** v1's drone has a fixed 3.4 s fade-in, which cannot arrive
  inside a 5.2 s cue, so the bell landed over nothing. `drone` now takes `attack`/`release`;
  v1's defaults are unchanged.

Raising the gains then pushed the mix to **0.0 dBFS — clipping**. Rather than tune gains until
it happened to fit, a true-peak limiter (`MASTER_AF`, exported from `score.mjs`) is applied to
both the audio-only report and the muxed master, so the deliverable cannot clip however the cue
gains are later edited. Final master: **−19.8 LUFS integrated, −2.3 dBTP, LRA 7.0**, and the
struck bell is the loudest sustained moment in the piece.

---



- **GSAP 3.15.0** — core, DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin, CustomEase.
  Vendored in `vendor/gsap/`. Free under GSAP's standard no-charge licence.
- **Fonts**, vendored in `vendor/fonts/` as woff2 subsets, all SIL Open Font License 1.1:
  - *Marcellus* — Astigmatic
  - *Cormorant Garamond* — Christian Thalmann / Catharsis Fonts
  - *Tiro Devanagari Hindi* — Tiro Typeworks
- Palette inherited from the Bhāratīya Itihāsa app: ink `#f3e7d0`, gold `#e8b64a`,
  saffron `#e07b2a` on `#0d0b09`.
- **v2 imagery** is generated with Azure OpenAI `gpt-image-2` (stills) and `sora-2` (motion)
  on the project's own Azure AI resource. Prompts are committed alongside every output.
  v1 uses no AI at all.

## Known limits

- **Verified in Chromium and WebKit** (`npm run xb`) — identical output in both, so Safari
  should be sound. **Firefox is untested**; no Firefox build was available on the machine
  this was authored on. `npm run xb` will cover it as soon as one is installed.
- **Audio needs a user gesture** in the browser, as all browsers require. The video export
  is unaffected — it renders the score offline.
- The sequence is authored for 16:9. It scales to fit any window but is not re-composed for
  portrait; on a phone it letterboxes.
- `npm run render` writes ~1800 PNGs to a temp directory before muxing. Budget the disk.

---

*Built for the Bhāratīya Itihāsa project. Nothing in the Indian Tales or IndianHistory
repositories was modified.*
