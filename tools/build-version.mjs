/* Assemble each art direction into a playable title sequence.

   The Sora clips are the picture; the type is set in HTML over the dark left third the
   stills were deliberately composed to leave empty. Same brand vocabulary as v1
   (Marcellus / Tiro Devanagari / Cormorant), so the directions differ in art only —
   which is the whole point of an A/B.

   node tools/build-version.mjs            # all directions that have clips
   node tools/build-version.mjs v2c
   node tools/build-version.mjs v3-empires --variant mobile
*/
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { DIRECTIONS } from './directions.mjs';
import { XF, TAIL, schedule, clipSeconds, totalSeconds } from './timeline.mjs';
import { buildScore, SCORES } from './score.mjs';

/* Variants are separate builds of the same picture. `default` is what v3 and v4
   shipped and must keep shipping; `mobile` enlarges the type for a phone held in
   landscape, where the frame is a few hundred pixels wide and 2.1vw of Devanagari
   is unreadable, and carries the reworked procession score. Each writes to its own
   directory so an older version is never overwritten. */
const VARIANTS = {
  default: {
    out: 'build', ts: 1, tw: '38%', score: 'standard',
    scrim: 'linear-gradient(90deg,rgba(6,5,4,.94) 0%,rgba(6,5,4,.78) 26%,rgba(6,5,4,.20) 48%,rgba(6,5,4,0) 66%)',
  },
  mobile: {
    out: 'build-mobile', ts: 1.6, tw: '37%', score: 'procession',
    /* At 1.6x the longest line ran out of the dark zone and onto bright gold, so the
       column is narrower than the desktop one, not wider — the type wraps sooner and
       stays where it can be read. The scrim is correspondingly deeper and reaches
       further, which costs a little of the art and buys all of the legibility. */
    scrim: 'linear-gradient(90deg,rgba(6,5,4,.97) 0%,rgba(6,5,4,.93) 28%,rgba(6,5,4,.72) 44%,rgba(6,5,4,.24) 60%,rgba(6,5,4,0) 75%)',
  },
};

const argv = process.argv.slice(2);
const vIdx = argv.indexOf('--variant');
const VNAME = vIdx >= 0 ? argv[vIdx + 1] : 'default';
const V = VARIANTS[VNAME];
if (!V) { console.error(`unknown variant ${VNAME} — one of ${Object.keys(VARIANTS).join(', ')}`); process.exit(1); }

const ROOT = 'versions';
const filter = argv.filter((a, i) => !a.startsWith('--') && i !== vIdx + 1);

async function latest(dirId, kind, beatId, ext) {
  const d = path.join(ROOT, dirId, kind);
  const files = await readdir(d).catch(() => []);
  const re = new RegExp(`^${beatId}-r(\\d+)\\.${ext}$`);
  let best = null; let n = 0;
  for (const f of files) {
    const g = f.match(re);
    if (g && Number(g[1]) > n) { n = Number(g[1]); best = f; }
  }
  return best;
}

const page = (dir, beats) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${dir.name} — भारतीय इतिहास title sequence</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="../../../vendor/fonts/fonts.css">
<style>
  :root{
    --paper:#0d0b09; --ink:#e8b64a; --ink-hi:#f6dc9a; --saffron:#e07b2a;
    --dim:#b7a684; --faint:rgba(183,166,132,.42);
    --ts:${V.ts};            /* type scale — raised for phone-sized frames */
    --tw:${V.tw};            /* width of the type column */
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{height:100%;background:#000;color:var(--dim);
    font-family:"Marcellus",Georgia,serif;-webkit-font-smoothing:antialiased}
  body{display:grid;place-items:center;overflow:hidden}

  #frame{position:relative;width:min(100vw,177.78vh);aspect-ratio:16/9;
    overflow:hidden;background:var(--paper);isolation:isolate}

  /* picture */
  #film{position:absolute;inset:0}
  #film video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
    opacity:0;transition:opacity .62s linear}
  #film video.on{opacity:1}

  /* the left third is where type lives — deepen it so type always holds contrast */
  #scrim{position:absolute;inset:0;pointer-events:none;
    background:${V.scrim}}
  #vig{position:absolute;inset:0;pointer-events:none;
    box-shadow:inset 0 0 190px 70px rgba(0,0,0,.72)}
  /* grain lives outside any filter — an SVG filter here would re-rasterise every frame */
  #grain{position:absolute;inset:-8px;pointer-events:none;opacity:.09;mix-blend-mode:overlay;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3'/></filter><rect width='320' height='320' filter='url(%23n)'/></svg>");
    background-size:320px 320px}

  /* rules, borrowed from v1 so the frame still reads as one brand */
  .rule{position:absolute;left:6.2%;right:6.2%;height:1px;background:rgba(232,182,74,.30);
    transform:scaleX(0);transform-origin:left center;transition:transform 1.1s cubic-bezier(.22,1,.36,1)}
  .rule.t{top:7.4%} .rule.b{bottom:7.4%;transform-origin:right center}
  #frame.lit .rule{transform:scaleX(1)}

  /* type — every era block is anchored to the same optical centre; if they sat in
     normal flow each successive label would step down the frame */
  #type{position:absolute;left:8.6%;top:0;bottom:0;width:var(--tw);pointer-events:none}
  .era{position:absolute;left:0;top:50%;width:100%;
    opacity:0;transform:translateY(calc(-50% + 14px));
    transition:opacity .7s ease,transform .7s cubic-bezier(.22,1,.36,1)}
  .era.on{opacity:1;transform:translateY(-50%)}
  .era-num{display:flex;align-items:center;gap:14px;
    font-size:calc(clamp(9px,.78vw,14px) * var(--ts));letter-spacing:.5em;color:var(--saffron)}
  .era-num::after{content:"";display:block;width:calc(4.2vw * var(--ts));height:1px;background:var(--faint)}
  .era-hi{margin-top:.7em;font-family:"Tiro Devanagari Hindi",serif;
    font-size:calc(clamp(22px,2.1vw,38px) * var(--ts));line-height:1.1;color:var(--ink-hi)}
  .era-en{margin-top:.35em;font-size:calc(clamp(11px,1.05vw,19px) * var(--ts));letter-spacing:.36em;color:var(--dim)}
  /* Marcellus has no lining figures — 1010 reads as IOIO. Set dates in Cormorant. */
  .era-when{margin-top:.6em;font-family:"Cormorant Garamond",Georgia,serif;
    font-variant-numeric:lining-nums;font-feature-settings:"lnum" 1;
    font-size:calc(clamp(11px,.92vw,17px) * var(--ts));letter-spacing:.24em;color:var(--saffron)}
  .era-line{margin-top:.75em;font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;
    font-size:calc(clamp(14px,1.4vw,25px) * var(--ts));line-height:1.34;color:var(--dim)}

  /* wordmark */
  #wm{position:absolute;inset:0;display:grid;place-content:center;text-align:center;
    opacity:0;transition:opacity 1.1s ease;pointer-events:none}
  #wm.on{opacity:1}
  #wm-bg{position:absolute;inset:0;background:var(--paper);opacity:0;transition:opacity 1.2s ease}
  #wm-bg.on{opacity:1}
  .wm-hi{font-family:"Tiro Devanagari Hindi",serif;font-size:clamp(40px,5.8vw,104px);
    line-height:1.22;color:var(--ink-hi)}
  .wm-en{margin-top:.5em;font-size:clamp(12px,1.4vw,25px);letter-spacing:.48em;
    text-indent:.48em;color:var(--dim)}
  .wm-tag{margin-top:1.1em;font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;
    font-size:clamp(15px,1.6vw,29px);color:var(--dim)}

  /* chrome — hidden in ?export=1 so it can never burn into a render */
  #chrome{position:absolute;left:0;right:0;bottom:14px;display:flex;justify-content:center;gap:10px;z-index:9}
  #chrome button{cursor:pointer;font-family:inherit;font-size:11px;letter-spacing:.28em;
    text-transform:uppercase;color:var(--dim);background:transparent;
    border:1px solid rgba(183,166,132,.28);border-radius:2px;padding:7px 15px}
  #chrome button:hover{color:var(--ink-hi);border-color:rgba(232,182,74,.6)}
  #tag{position:absolute;left:0;right:0;top:14px;text-align:center;font-size:11px;
    letter-spacing:.34em;text-transform:uppercase;color:rgba(183,166,132,.55);z-index:9}
  html.export #chrome,html.export #tag{display:none}

  /* layer mode — ?layer=<part> isolates one element on transparency so the offline
     master can composite it in ffmpeg. Capturing through the real page means the
     render uses the real fonts, metrics and gradients rather than a restatement of
     them. Every layer is a still: no timers run, all motion is applied downstream.
     Each part is captured separately because they are not one contiguous z-band —
     scrim and rules sit under the type, vignette and grain sit over it. */
  html.layer,html.layer body,html.layer #frame{background:transparent!important}
  html.layer #frame > *{display:none}
  html.layer-scrim #scrim{display:block}
  /* .rule has no id, so it needs #frame to outweigh the blanket rule above */
  html.layer-rules #frame > .rule{display:block}
  html.layer-type  #type{display:block}
  html.layer-wm    #wm{display:grid}
  html.layer-vig   #vig{display:block}
  html.layer-grain #grain{display:block}
  html.layer .era,html.layer #wm,html.layer .rule{transition:none}

  @media (prefers-reduced-motion:reduce){
    #film video,.era,.rule,#wm,#wm-bg{transition-duration:.01ms!important}
  }
</style>
<script>(function(){
  var q = new URLSearchParams(location.search);
  if (q.has('export')) document.documentElement.classList.add('export');
  var l = q.get('layer');
  if (l) document.documentElement.classList.add('layer', 'layer-' + l);
})();</script>
</head>
<body>
<div id="tag">${dir.name} · version ${dir.id}</div>
<div id="frame">
  <div id="film">
${beats.map((b, i) => `    <video data-i="${i}" src="../clips/${b.clip}" muted playsinline preload="auto"></video>`).join('\n')}
  </div>
  <div id="scrim"></div>
  <div class="rule t"></div><div class="rule b"></div>
  <div id="wm-bg"></div>
  <div id="type">
${beats.map((b, i) => `    <div class="era" data-i="${i}">
      <div class="era-num">${b.era.num}</div>
      <div class="era-hi">${b.era.hi}</div>
      <div class="era-en">${b.era.en}</div>${b.era.when ? `
      <div class="era-when">${b.era.when}</div>` : ''}
      <div class="era-line">${b.era.line}</div>
    </div>`).join('\n')}
  </div>
  <div id="wm">
    <div class="wm-hi">भारतीय<br>इतिहास</div>
    <div class="wm-en">BHĀRATĪYA ITIHĀSA</div>
    <div class="wm-tag">${dir.tagline}</div>
  </div>
  <div id="vig"></div>
  <div id="grain"></div>
  <div id="chrome">
    <button id="sound" aria-pressed="false">Sound</button>
    <button id="replay">Replay</button>
  </div>
</div>
<script type="module">
import { LiveSting, renderWav } from '../../../src/audio.js';
const SCHED = ${JSON.stringify(schedule(beats))};
const CUES = ${JSON.stringify(SCORES[V.score](schedule(beats), totalSeconds(schedule(beats))))};
const XF = ${XF};
const frame = document.getElementById('frame');
const vids  = [...document.querySelectorAll('#film video')];
const eras  = [...document.querySelectorAll('.era')];
const wm    = document.getElementById('wm');
const wmBg  = document.getElementById('wm-bg');
let timers = [];

const at = (t, fn) => timers.push(setTimeout(fn, t * 1000));

function reset() {
  timers.forEach(clearTimeout); timers = [];
  frame.classList.remove('lit');
  wm.classList.remove('on'); wmBg.classList.remove('on');
  eras.forEach((e) => e.classList.remove('on'));
  vids.forEach((v, i) => { v.classList.remove('on'); v.pause(); v.currentTime = SCHED[i].seek; });
}

function run() {
  reset();
  void frame.offsetWidth;   // force reflow so the rules re-draw rather than snapping
  at(0.15, () => frame.classList.add('lit'));

  SCHED.forEach((s, i) => {
    const v = vids[i];
    at(s.start, () => { v.currentTime = s.seek; v.classList.add('on'); v.play().catch(() => {}); });
    at(s.labelIn, () => eras[i].classList.add('on'));
    at(s.labelOut, () => eras[i].classList.remove('on'));
    // hold one crossfade past the beat so the next clip has something to fade over
    if (i < SCHED.length - 1) at(s.start + s.dur + XF, () => { v.classList.remove('on'); v.pause(); });
  });

  const last = SCHED[SCHED.length - 1];
  const end = last.start + last.dur;
  at(end - 0.5, () => { wmBg.classList.add('on'); vids[vids.length - 1].classList.remove('on'); });
  at(end + 0.15, () => wm.classList.add('on'));
}

const DURATION = SCHED[SCHED.length - 1].start + SCHED[SCHED.length - 1].dur + ${TAIL};
const sting = new LiveSting(CUES);
window.__seq = { SCHED, CUES, run, duration: DURATION, renderWav };

/* Layer mode: hold one static pose for the offline renderer instead of playing.
   ?layer=scrim|rules|vig|grain  static plates
   ?layer=type&beat=N            one era block
   ?layer=wm                     the wordmark */
const q = new URLSearchParams(location.search);
const layer = q.get('layer');
if (layer) {
  vids.forEach((v) => { v.removeAttribute('src'); v.load(); });
  if (layer === 'type') eras[Number(q.get('beat') || 0)]?.classList.add('on');
  if (layer === 'rules') frame.classList.add('lit');
  if (layer === 'wm') wm.classList.add('on');
  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__layerReady = true; }));
} else {
  // browsers require a gesture before audio, so the score is opt-in and off by default
  const soundBtn = document.getElementById('sound');
  soundBtn.addEventListener('click', () => {
    if (sting.armed) { sting.disable(); soundBtn.setAttribute('aria-pressed', 'false'); return; }
    if (sting.enable()) { soundBtn.setAttribute('aria-pressed', 'true'); sting.start(0); run(); }
  });
  document.getElementById('replay').addEventListener('click', () => { run(); if (sting.armed) sting.start(0); });
  // wait for enough data on every clip, otherwise the first beat plays black
  await Promise.all(vids.map((v) => v.readyState >= 3
    ? Promise.resolve()
    : new Promise((r) => v.addEventListener('canplay', r, { once: true }))));
  run();
}
</script>
</body>
</html>
`;

const dirs = filter.length
  ? DIRECTIONS.filter((d) => filter.some((f) => d.id.includes(f)))
  : DIRECTIONS;

let built = 0;
for (const dir of dirs) {
  const beats = [];
  for (const b of dir.beats) {
    const clip = await latest(dir.id, 'clips', b.id, 'mp4');
    if (clip) beats.push({ ...b, clip, clipLen: await clipSeconds(path.join(ROOT, dir.id, 'clips', clip)) });
  }
  if (beats.length !== dir.beats.length) {
    console.log(`  skip ${dir.id} — ${beats.length}/${dir.beats.length} clips`);
    continue;
  }
  const out = path.join(ROOT, dir.id, V.out, 'index.html');
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, page(dir, beats));
  const s = schedule(beats);
  const total = totalSeconds(s);
  console.log(`  ok   ${dir.id} [${VNAME}] -> ${out}  (${beats.length} beats, ${total.toFixed(1)}s)`);
  built++;
}
console.log(`\n${built} version(s) assembled`);
