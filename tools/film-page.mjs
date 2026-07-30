/* The film page.

   The title sequences composite plates in ffmpeg because their picture is a dozen <video>
   elements a headless browser cannot seek frame-accurately. A film has sixty of them, so the
   same approach applies and this page exists for two jobs only:

     1. Play the film live, so the cut can be watched and judged before it is rendered.
     2. Hand the renderer its type layers through ?layer=, captured from the real page — so the
        master uses the real fonts and metrics rather than a restatement of them.

   There are no burnt-in captions. That is the point of the format: the episodes put the whole
   narration on screen because the picture could not carry thirteen seconds alone, and reading
   along with a voice is not watching a film. Here the picture carries it, and type appears
   only on the six or seven cards the author placed at the movement boundaries.
*/

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Cards, in shot order, with the index of the shot each belongs to. */
export const cardsOf = (film) => film.shots
  .map((s, i) => (s.type ? { i, id: s.id, start: s.start, dur: s.dur, ...s.type } : null))
  .filter(Boolean);

export const filmPage = (film) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(film.title)} — ${esc(film.spine)}</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="../../../vendor/fonts/fonts.css">
<style>
  :root{
    --paper:#0d0b09; --ink:#e8b64a; --ink-hi:#f6dc9a; --saffron:#e07b2a;
    --dim:#b7a684; --faint:rgba(183,166,132,.42);
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{height:100%;background:#000;color:var(--dim);
    font-family:"Marcellus",Georgia,serif;-webkit-font-smoothing:antialiased}
  body{display:grid;place-items:center;overflow:hidden}

  #frame{position:relative;width:min(100vw,177.78vh);aspect-ratio:16/9;
    overflow:hidden;background:var(--paper);isolation:isolate}

  /* picture — every shot is a <video>, only the live one is opaque */
  #film{position:absolute;inset:0}
  #film video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
    opacity:0;transition:opacity var(--xf,.34s) linear}
  #film video.on{opacity:1}

  /* A card needs its left third readable; a shot without one should not be dimmed for nothing.
     So the scrim is per-shot rather than permanent — it is part of the card, not part of the
     film. Half the frames in the piece are undimmed because of this. */
  #scrim{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .5s ease;
    background:linear-gradient(90deg,rgba(6,5,4,.95) 0%,rgba(6,5,4,.80) 26%,rgba(6,5,4,.22) 50%,rgba(6,5,4,0) 68%)}
  #scrim.on{opacity:1}
  #vig{position:absolute;inset:0;pointer-events:none;
    box-shadow:inset 0 0 210px 78px rgba(0,0,0,.74)}
  /* grain lives outside any filter — an SVG filter here would re-rasterise every frame */
  #grain{position:absolute;inset:-8px;pointer-events:none;opacity:.085;mix-blend-mode:overlay;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3'/></filter><rect width='320' height='320' filter='url(%23n)'/></svg>");
    background-size:320px 320px}

  /* type — cards only, anchored to one optical centre so successive cards do not step down */
  #type{position:absolute;left:8.4%;top:0;bottom:0;width:36%;pointer-events:none}
  .card{position:absolute;left:0;top:50%;width:100%;
    opacity:0;transform:translateY(calc(-50% + 12px));
    transition:opacity .62s ease,transform .62s cubic-bezier(.22,1,.36,1)}
  .card.on{opacity:1;transform:translateY(-50%)}
  .card-en{font-size:clamp(15px,1.72vw,32px);letter-spacing:.30em;line-height:1.24;color:var(--ink-hi)}
  /* Marcellus has no lining figures — 1010 reads as IOIO. Dates are set in Cormorant. */
  .card-when{margin-top:.72em;font-family:"Cormorant Garamond",Georgia,serif;
    font-variant-numeric:lining-nums;font-feature-settings:"lnum" 1;
    font-size:clamp(12px,1.02vw,19px);letter-spacing:.24em;color:var(--saffron)}
  .card-rule{margin-top:1em;width:3.6vw;height:1px;background:var(--faint)}

  /* wordmark — the film ends on the channel, not on a shot */
  #wm{position:absolute;inset:0;display:grid;place-content:center;text-align:center;
    opacity:0;transition:opacity 1.15s ease;pointer-events:none}
  #wm.on{opacity:1}
  #wm-bg{position:absolute;inset:0;background:var(--paper);opacity:0;transition:opacity 1.25s ease}
  #wm-bg.on{opacity:1}
  .wm-hi{font-family:"Tiro Devanagari Hindi",serif;font-size:clamp(38px,5.4vw,98px);
    line-height:1.22;color:var(--ink-hi)}
  .wm-en{margin-top:.5em;font-size:clamp(11px,1.32vw,23px);letter-spacing:.48em;
    text-indent:.48em;color:var(--dim)}

  #chrome{position:absolute;left:0;right:0;bottom:14px;display:flex;justify-content:center;gap:10px;z-index:9}
  #chrome button{cursor:pointer;font-family:inherit;font-size:11px;letter-spacing:.28em;
    text-transform:uppercase;color:var(--dim);background:transparent;
    border:1px solid rgba(183,166,132,.28);border-radius:2px;padding:7px 15px}
  #tag{position:absolute;left:0;right:0;top:14px;text-align:center;font-size:11px;
    letter-spacing:.34em;text-transform:uppercase;color:rgba(183,166,132,.5);z-index:9}
  html.export #chrome,html.export #tag{display:none}

  /* layer mode — one element on transparency, so the offline master can composite it in
     ffmpeg while the type still comes from the real page. Every layer is a still: no timers
     run, and all motion is applied downstream. */
  html.layer,html.layer body,html.layer #frame{background:transparent!important}
  html.layer #frame > *{display:none}
  html.layer-scrim #scrim{display:block;opacity:1}
  html.layer-type  #type{display:block}
  html.layer-wm    #wm{display:grid}
  html.layer-vig   #vig{display:block}
  html.layer-grain #grain{display:block}
  html.layer .card,html.layer #wm,html.layer #scrim{transition:none}

  @media (prefers-reduced-motion:reduce){
    #film video,.card,#wm,#wm-bg,#scrim{transition-duration:.01ms!important}
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
<div id="tag">${esc(film.title)} · ${esc(film.spine)}</div>
<div id="frame">
  <div id="film">
${film.shots.map((s, i) => `    <video data-i="${i}" src="../clips/${s.clip}" muted playsinline preload="none"></video>`).join('\n')}
  </div>
  <div id="scrim"></div>
  <div id="wm-bg"></div>
  <div id="type">
${cardsOf(film).map((c) => `    <div class="card" data-i="${c.i}">
      <div class="card-en">${esc(c.en)}</div>${c.when ? `
      <div class="card-when">${esc(c.when)}</div>` : ''}
      <div class="card-rule"></div>
    </div>`).join('\n')}
  </div>
  <div id="wm">
    <div class="wm-hi">भारतीय<br>इतिहास</div>
    <div class="wm-en">BHĀRATĪYA ITIHĀSA</div>
  </div>
  <div id="vig"></div>
  <div id="grain"></div>
  <div id="chrome">
    <button id="play">Play</button>
    <button id="replay">Replay</button>
  </div>
</div>
<script type="module">
const SHOTS = ${JSON.stringify(film.shots.map((s) => ({ id: s.id, start: s.start, dur: s.dur, seek: s.seek, card: !!s.type, say: !!s.say })))};
const TAIL = ${film.tail ?? 4.6};
const RUNTIME = ${film.runtime};
const vids = [...document.querySelectorAll('#film video')];
const cards = [...document.querySelectorAll('.card')];
const scrim = document.getElementById('scrim');
const wm = document.getElementById('wm');
const wmBg = document.getElementById('wm-bg');
const audios = new Map();

/* One <audio> per speaking shot rather than one long mixdown, because a shot's narration has
   to start exactly when its picture does and the silences between shots are authored, not
   recorded. The renderer builds the same arrangement in ffmpeg from the same numbers. */
for (const s of SHOTS) if (s.say) { const a = new Audio('../audio/' + s.id + '.mp3'); a.preload = 'auto'; audios.set(s.id, a); }

let timers = [];
const at = (t, fn) => timers.push(setTimeout(fn, t * 1000));

function reset() {
  timers.forEach(clearTimeout); timers = [];
  wm.classList.remove('on'); wmBg.classList.remove('on'); scrim.classList.remove('on');
  cards.forEach((c) => c.classList.remove('on'));
  vids.forEach((v, i) => { v.classList.remove('on'); v.pause(); v.currentTime = SHOTS[i].seek || 0; });
  audios.forEach((a) => { a.pause(); a.currentTime = 0; });
}

function run() {
  reset();
  SHOTS.forEach((s, i) => {
    const v = vids[i];
    at(s.start, () => {
      v.currentTime = s.seek || 0;
      v.classList.add('on');
      v.play().catch(() => {});
      scrim.classList.toggle('on', s.card);
      audios.get(s.id)?.play().catch(() => {});
    });
    at(s.start + s.dur + 0.34, () => { v.classList.remove('on'); v.pause(); });
  });
  cards.forEach((c) => {
    const s = SHOTS[Number(c.dataset.i)];
    at(s.start + 0.30, () => c.classList.add('on'));
    at(s.start + s.dur - 0.42, () => c.classList.remove('on'));
  });
  at(RUNTIME - 0.5, () => { wmBg.classList.add('on'); vids[vids.length - 1].classList.remove('on'); });
  at(RUNTIME + 0.2, () => wm.classList.add('on'));
}

window.__film = { SHOTS, RUNTIME, TAIL, run, duration: RUNTIME + TAIL };

const q = new URLSearchParams(location.search);
const layer = q.get('layer');
if (layer) {
  vids.forEach((v) => { v.removeAttribute('src'); v.load(); });
  if (layer === 'type') cards[Number(q.get('card') || 0)]?.classList.add('on');
  if (layer === 'wm') wm.classList.add('on');
  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__layerReady = true; }));
} else {
  document.getElementById('play').addEventListener('click', run);
  document.getElementById('replay').addEventListener('click', run);
}
</script>
</body>
</html>
`;
