# One Line, Five Thousand Years

A drawn title sequence for **Bhāratīya Itihāsa** (भारतीय इतिहास) — the Indian History project.

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

## Credits and licences

- **GSAP 3.15.0** — core, DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin, CustomEase.
  Vendored in `vendor/gsap/`. Free under GSAP's standard no-charge licence.
- **Fonts**, vendored in `vendor/fonts/` as woff2 subsets, all SIL Open Font License 1.1:
  - *Marcellus* — Astigmatic
  - *Cormorant Garamond* — Christian Thalmann / Catharsis Fonts
  - *Tiro Devanagari Hindi* — Tiro Typeworks
- Palette inherited from the Bhāratīya Itihāsa app: ink `#f3e7d0`, gold `#e8b64a`,
  saffron `#e07b2a` on `#0d0b09`.

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
