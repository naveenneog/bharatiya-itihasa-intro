/* The vertical cut — 9:16, under a minute, claims over ink and light.

   A Short is not the episode trimmed. The long form earns its length by building; a Short has
   about a second and a half to be worth staying for and then has to keep paying. So it carries
   the story's *claims* — the assertions a viewer could repeat afterwards — over the channel's
   abstract language rather than over its narrative artwork. The figure, the map and the panels
   belong to the episode; what travels is what the episode found.

   This module is the picture and the type only. The frame is composited in ffmpeg by
   tools/short.mjs, which captures this page twice: once for the type, on transparent, and
   once for each fixed layer.

   Why the type is captured as frames rather than as one plate per line: the words light as
   they are spoken, which is the channel's reading signature, and a plate cannot move. Frames
   of a transparent layer cost three minutes for a forty-five second piece and buy the sync.

   The safe area matters more here than anywhere else in the channel. YouTube puts its own
   chrome over the bottom of a Short — title, handle, buttons — and the right rail eats a
   strip as well. The type therefore sits between 16% and 68% of the height and never inside
   the last quarter. */

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const shortPage = (short) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(short.title)} — short</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="../../vendor/fonts/fonts.css">
<style>
  :root{
    --paper:#0d0b09; --ink:#e8b64a; --ink-hi:#f6dc9a; --saffron:#e07b2a;
    --dim:#b7a684; --faint:rgba(183,166,132,.42);
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{height:100%;background:#000;color:var(--dim);
    font-family:"Marcellus",Georgia,serif;-webkit-font-smoothing:antialiased}
  body{display:grid;place-items:center;overflow:hidden}
  #stage{position:relative;width:min(100vw,56.25vh);aspect-ratio:9/16;overflow:hidden;
    background:var(--paper);isolation:isolate;container-type:inline-size}

  /* the scrim under the type — the abstract footage is bright in places and the type has to
     hold over all of it, so the band travels with the type rather than sitting at the foot */
  #scrim{position:absolute;left:0;right:0;top:8%;height:66%;z-index:2;pointer-events:none;
    background:linear-gradient(180deg,rgba(6,5,4,0) 0%,rgba(6,5,4,.62) 22%,rgba(6,5,4,.72) 62%,rgba(6,5,4,0) 100%)}

  #type{position:absolute;left:7.5%;right:7.5%;top:16%;height:52%;z-index:3;
    display:grid;align-content:center;pointer-events:none}
  /* Type is sized against the stage, not the viewport.

     A clamp in vh with a pixel ceiling makes a draft and a master disagree: half scale put
     7.4vh at 71px on a 540-wide frame, full scale hit the 74px ceiling on a 1080-wide one,
     so the type was relatively twice as large in the draft that was used to approve it.
     Container units are the stage's own width, so what is judged at half scale is what
     ships. */
  #line{font-family:"Cormorant Garamond",Georgia,serif;
    font-size:8.2cqw;line-height:1.20;text-align:left;
    color:rgba(183,166,132,.30)}
  /* Said and now, as in the long form. The lit word is white with a gold bloom; everything
     already spoken stays legible so the line still reads as a sentence. */
  #line .w{display:inline-block;transition:none}
  #line .w.said{color:rgba(232,182,74,.62)}
  #line .w.now{color:#fff;text-shadow:0 0 34px rgba(232,182,74,.62)}

  /* the kicker — what kind of beat this is, set small above the line */
  #kick{position:absolute;left:7.5%;right:7.5%;top:11.4%;z-index:3;pointer-events:none;
    font-size:1.95cqw;letter-spacing:.42em;text-transform:uppercase;
    color:var(--saffron);opacity:0}
  #kick.on{opacity:1}

  #wm{position:absolute;inset:0;z-index:6;display:grid;place-content:center;text-align:center;
    opacity:0;pointer-events:none}
  #wm.on{opacity:1}
  #wm-bg{position:absolute;inset:0;z-index:5;background:var(--paper);opacity:0}
  .wm-hi{font-size:7.4cqw;line-height:1.14;color:var(--ink-hi)}
  .wm-en{margin-top:1.1em;font-size:1.85cqw;letter-spacing:.42em;color:var(--faint)}

  #vig{position:absolute;inset:0;z-index:7;pointer-events:none;
    background:radial-gradient(ellipse at 50% 42%,rgba(6,5,4,0) 42%,rgba(6,5,4,.72) 100%)}
  #grain{position:absolute;inset:-8px;z-index:8;pointer-events:none;opacity:.075;mix-blend-mode:overlay;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3'/></filter><rect width='320' height='320' filter='url(%23n)'/></svg>");
    background-size:320px 320px}

  /* Layer mode. Each fixed layer is captured on its own, transparent, and composited in
     ffmpeg; the type is captured as frames the same way so that the words can move.

     The root element as well as the body. The black is set on html and body together, and
     overriding only the body left the root opaque — Playwright's omitBackground then had
     nothing to strip, every type frame came out on solid black, and overlaying it wiped the
     picture out entirely. The composite encoded to 29 KB for forty-two seconds, ran the
     right length, and reported no error at all. */
  html.layer,html.layer body{background:transparent}
  html.layer #stage{background:transparent}
  html.layer #stage > *{display:none}
  html.layer-type #type,html.layer-type #kick{display:block}
  html.layer-type #type{display:grid}
  html.layer-scrim #scrim{display:block}
  html.layer-vig #vig{display:block}
  html.layer-grain #grain{display:block}
  html.layer-wm #wm{display:grid}
</style>
<script>(function(){
  var q = new URLSearchParams(location.search);
  var l = q.get('layer');
  if (l) document.documentElement.className = 'layer layer-' + l;
}());</script>
</head>
<body>
<div id="stage">
  <div id="scrim"></div>
  <div id="kick"></div>
  <div id="type"><div id="line"></div></div>
  <div id="wm-bg"></div>
  <div id="wm">
    <div class="wm-hi">भारतीय<br>इतिहास</div>
    <div class="wm-en">BHĀRATĪYA ITIHĀSA</div>
  </div>
  <div id="vig"></div>
  <div id="grain"></div>
</div>
<script type="module">
const BEATS = ${JSON.stringify(short.beats)};
const RUNTIME = ${short.runtime};
const TAIL = ${short.tail};

const line = document.getElementById('line');
const kick = document.getElementById('kick');

let painted = -1;

/* Which beat is on screen at t, and how far into it. */
function beatAt(t) {
  let acc = 0;
  for (let n = 0; n < BEATS.length; n++) {
    const d = BEATS[n].dur;
    if (t < acc + d || n === BEATS.length - 1) return { n, lt: Math.max(0, Math.min(d, t - acc)) };
    acc += d;
  }
  return { n: 0, lt: 0 };
}

function paint(n) {
  const b = BEATS[n];
  line.innerHTML = b.words.map(function (w, k) {
    return '<span class="w" data-k="' + k + '">' + w[0] + '</span>';
  }).join(' ');
  kick.textContent = b.kick || '';
  kick.classList.toggle('on', !!b.kick);
  painted = n;
}

/* The whole page as a pure function of time, for the same reason the long form is: the
   renderer scrubs to arbitrary instants and anything that depends on how it got there
   disagrees with the player. */
function seek(t) {
  const { n, lt } = beatAt(t);
  if (n !== painted) paint(n);
  const b = BEATS[n];
  const ms = lt * 1000;
  const spans = line.children;
  for (let k = 0; k < b.words.length; k++) {
    const w = b.words[k];
    const s = spans[k];
    if (!s) continue;
    const now = ms >= w[1] && ms < w[1] + w[2] + 60;
    const said = ms >= w[1];
    if (s.classList.contains('now') !== now) s.classList.toggle('now', now);
    if (s.classList.contains('said') !== said) s.classList.toggle('said', said);
  }
  return { beat: n, local: lt };
}

window.__short = { BEATS, RUNTIME, TAIL, seek, duration: RUNTIME + TAIL };

const q = new URLSearchParams(location.search);
if (q.get('layer') === 'wm') document.getElementById('wm').classList.add('on');
if (!q.get('layer') || q.get('layer') === 'type') paint(0);
await document.fonts.ready;
requestAnimationFrame(() => requestAnimationFrame(() => { window.__shortReady = true; }));
</script>
</body>
</html>
`;
