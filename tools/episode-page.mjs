/* The episode player, and the three cuts of it that are up for approval.

   All three play the same story with the same player. What differs is only where the
   title sequence sits relative to the content, which is the decision that actually
   has to be made once and then holds for every episode in the series:

     A  titles first      the full 61s sequence, then the episode. Cinematic, and a
                          minute of titles before content on every single episode.
     B  cold open         the hero and the map play first, the titles fire on the line
                          that states the premise, then the story resumes. Standard
                          episodic television, and it earns the titles.
     C  series stinger    a 15s cut of the sequence built from the opening beat and
                          *this episode's own era*, then straight into the story. The
                          titles change per episode and never outstay.

   The player is one file for all three: the cut is data.
*/

export const CUTS = [
  {
    id: 'cut-a-titles',
    name: 'A · Titles first',
    pitch: 'The full 61-second sequence, an episode card, then the story. The most cinematic '
      + 'opening and the most expensive: a minute of titles before any content, every episode.',
    intro: { src: '../../../dist/v5-empires-mobile.mp4' },
    open: [], card: true, frame: 'bleed',
  },
  {
    id: 'cut-b-cold-open',
    name: 'B · Cold open, then titles',
    pitch: 'The hero and the map play first — about forty seconds that state who this is and '
      + 'what he claimed — then the titles fire and the story resumes. Standard episodic '
      + 'television: the titles arrive once you already care.',
    intro: { src: '../../../dist/v5-empires-mobile.mp4' },
    open: ['intro_hero', 'intro_map'], card: true, frame: 'bleed',
  },
  {
    id: 'cut-c-stinger',
    name: 'C · Series stinger',
    pitch: 'A fifteen-second cut of the sequence — the opening beat, then this episode\'s own '
      + 'era — and straight into the story. The titles change per episode, so they stay '
      + 'meaningful, and they never outstay their welcome.',
    intro: { src: '../../../dist/v6-episode-titles.mp4' },
    open: [], card: false, frame: 'bleed',
  },
  /* Built against YouTube's own numbers rather than taste. YouTube Analytics defines the
     "intro" as the first 30 seconds and calls retention there "above typical" only above
     50%; its stated advice when that number is low is to change the first 30 seconds. So
     the hook lands first, the titles are the 15s cut and are *over* by ~27s, and the story
     resumes inside the window YouTube is measuring. */
  {
    id: 'cut-d-youtube',
    name: 'D · YouTube cut',
    pitch: 'The claim first — "499 CE, a young Aryabhata dares to say: the Earth turns" — then '
      + 'the 15-second titles, then the story, with the titles finished by about 27 seconds. '
      + 'Built around YouTube measuring retention at the 30-second mark.',
    intro: { src: '../../../dist/v6-episode-titles.mp4' },
    open: ['cover'], card: false, frame: 'bleed',
  },
  /* The art is composed square. Cover-cropping it to 16:9 throws away 44% of every panel,
     which is where the tops of heads and the objects on the desk live. This cut never crops:
     the whole panel sits in frame with the caption beside it, in the title sequence's own
     layout. Costs screen area, loses nothing. */
  {
    id: 'cut-e-framed',
    name: 'E · Framed, nothing cropped',
    pitch: 'The claim, the 15-second titles, then the story with every panel shown whole — '
      + 'the art beside the caption instead of cropped behind it. Nothing is ever cut off.',
    intro: { src: '../../../dist/v7-gupta-stinger.mp4' },
    open: ['cover'], card: false, frame: 'framed', caption: 'settle',
  },

  /* ── caption experiments ───────────────────────────────────────────────
     Identical to cut E in every respect except how the caption behaves, so a comparison
     between them is a comparison of the treatment and nothing else.

     What holds attention on a phone is word-synchronised text with per-word motion. The
     treatments currently trending — neon fills, comic bursts, bouncing pop-ups — are
     Shorts-native and would wreck this brand, so the mechanic is borrowed and the
     aesthetic is not. */
  {
    id: 'cut-f-rise',
    name: 'F · Framed + rising words',
    pitch: 'Cut E, with each word lifting and brightening as it is spoken and settling '
      + 'behind the next. Per-word motion in the sequence\'s own register.',
    intro: { src: '../../../dist/v7-gupta-stinger.mp4' },
    open: ['cover'], card: false, frame: 'framed', caption: 'rise',
  },
  {
    id: 'cut-g-focus',
    name: 'G · Framed + focus',
    pitch: 'Cut E, with everything but the live phrase dropped to near-nothing. The '
      + 'strongest attention treatment and the most opinionated — you cannot read ahead.',
    intro: { src: '../../../dist/v7-gupta-stinger.mp4' },
    open: ['cover'], card: false, frame: 'framed', caption: 'focus',
  },
  {
    id: 'cut-h-card',
    name: 'H · Framed + word cards',
    pitch: 'Cut E, with the caption set large and short — the pop-up treatment that is '
      + 'everywhere on the platform, translated into this typeface. The biggest gamble.',
    intro: { src: '../../../dist/v7-gupta-stinger.mp4' },
    open: ['cover'], card: false, frame: 'framed', caption: 'card',
  },
];

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const episodePage = (ep, cut) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(ep.title)} — ${esc(cut.name)}</title>
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

  #stage{position:relative;width:min(100vw,177.78vh);aspect-ratio:16/9;
    overflow:hidden;background:var(--paper);isolation:isolate}

  /* picture — the intro film and the panel art share the frame */
  #film,#art{position:absolute;inset:0}
  #film{opacity:0;transition:opacity .5s linear;z-index:1}
  #film.on{opacity:1}
  #film video{width:100%;height:100%;object-fit:cover;display:block}

  /* the scene wrapper owns the cross-fade; the images inside it are always opaque */
  #art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
    transform-origin:center}
  /* The panels are composed square. Cover-cropping one into 16:9 discards 44% of its
     height — which is exactly where heads and desks are. So instead of holding a fixed
     centre crop, the shot travels the full height of the image over the panel's own
     length: nothing in the frame is permanently unseen, and a still gains a move.
     object-position is animatable, which does this without touching layout. */
  @keyframes panDown{from{object-position:50% 4%;transform:scale(1.015)}
                     to{object-position:50% 96%;transform:scale(1.075)}}
  @keyframes panUp{from{object-position:50% 96%;transform:scale(1.075)}
                   to{object-position:50% 4%;transform:scale(1.015)}}
  #art .scene.on img.pan-down{animation:panDown linear forwards}
  #art .scene.on img.pan-up{animation:panUp linear forwards}

  /* framed: never crop. The whole panel sits right of centre and the caption takes the
     column beside it — the title sequence's own layout, applied to the story. */
  .framed #art .scene{left:0}
  .framed #art img{object-fit:contain;object-position:50% 50%}
  /* panDown/panUp travel object-position, which does nothing once the picture is
     contained — there is no slack to travel through. Without a replacement the framed
     cut is five minutes of stills, so the picture breathes instead: the panel pushes
     3% over its own length while the blurred surround drifts the other way. Alternate
     panels invert, so twenty-eight of them never fall into a rhythm. */
  @keyframes framedIn{from{transform:scale(1)}to{transform:scale(1.034)}}
  @keyframes framedOut{from{transform:scale(1.034)}to{transform:scale(1)}}
  @keyframes plateDrift{from{transform:scale(1.18) translate(0,0)}
                        to{transform:scale(1.27) translate(-1.6%,.8%)}}
  .framed #art .scene.on img.sharp.pan-down{animation:framedIn linear forwards}
  .framed #art .scene.on img.sharp.pan-up{animation:framedOut linear forwards}
  .framed #art .scene.on img.plate{animation:plateDrift linear forwards}
  .framed #art .scene.on img.bg,.framed #art .scene.on img.char{animation:none}

  .framed #capwrap{right:auto;width:38%;bottom:auto;top:0;height:100%;padding:0 3.2% 0 5%;
    display:grid;align-content:center;background:none}
  /* Larger than the bled cut's, not smaller. Contain-fitting frees the width the caption
     used to share with the picture, and burnt-in text on a phone needs to clear about
     3.5% of frame height to stay readable — 29px in a 1080 frame did not. */
  .framed #cap{text-align:left;max-width:none;font-size:clamp(15px,2.34vw,44px);line-height:1.42}
  .framed #speaker{text-align:left;margin-left:0;font-size:clamp(10px,1.02vw,19px)}

  /* Contain-fitting a square panel into 16:9 leaves a third of the frame empty, and
     empty reads as unfinished. The same picture, blown up, blurred and pushed down to
     near-black, fills it: the frame is complete, the panel's own colour bleeds into the
     surround, and not one pixel of the art has been cropped to get there. */
  #art img.plate{display:none}
  .framed #art img.plate{display:block;object-fit:cover;transform:scale(1.18);
    filter:blur(42px) saturate(.62) brightness(.30);z-index:0}
  .framed #art img.sharp{left:38%;width:62%;z-index:3}
  .framed #art .scene::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;
    background:radial-gradient(ellipse at 68% 50%,rgba(6,5,4,0) 30%,rgba(6,5,4,.58) 100%)}
  .framed #art .scene::before{content:"";position:absolute;left:24%;top:0;bottom:0;width:24%;
    z-index:2;pointer-events:none;
    background:linear-gradient(90deg,rgba(13,11,9,1) 0%,rgba(13,11,9,.74) 46%,rgba(13,11,9,0) 100%)}

  /* Export mode. A master carries the picture and nothing else — no buttons, no cut
     label, no progress bar, and no intro <video>, because the titles are composited
     from the real master file rather than screen-grabbed through a page. */
  html.export #chrome,html.export #start,html.export #bar,
  html.export #cut,html.export #film{display:none!important}
  html.export,html.export body{cursor:none}

  /* the four panels that are not plain pictures */
  #art .scene{position:absolute;inset:0;opacity:0;transition:opacity .9s ease}
  #art .scene.on{opacity:1}
  /* The pin's coordinates are fractions of the picture, so they have to be measured
     against the picture's box and not the frame's — in the framed cut those are not the
     same rectangle. The box also lifts the pin above the artwork's own stacking level. */
  .scene .pinbox{position:absolute;inset:0;z-index:4;pointer-events:none}
  .framed #art .scene .pinbox{left:38%;width:62%}
  .scene .pin{position:absolute;width:1.5vw;height:1.5vw;min-width:12px;min-height:12px;
    border-radius:50%;background:var(--saffron);transform:translate(-50%,-50%);
    box-shadow:0 0 0 0 rgba(224,123,42,.7);animation:ping 2.1s ease-out infinite}
  @keyframes ping{0%{box-shadow:0 0 0 0 rgba(224,123,42,.65)}100%{box-shadow:0 0 0 3.2vw rgba(224,123,42,0)}}
  .scene .pinlabel{position:absolute;transform:translate(-50%,14px);white-space:nowrap;
    font-size:clamp(9px,1vw,17px);letter-spacing:.24em;text-transform:uppercase;
    color:var(--ink-hi);background:rgba(6,5,4,.72);padding:.45em .9em;border-radius:2px;
    border:1px solid rgba(232,182,74,.28)}
  @keyframes bgmove{from{transform:scale(1) translateX(0)}to{transform:scale(var(--z,1.12)) translateX(var(--pan,-6%))}}
  .scene img.bg{animation:bgmove linear forwards}
  @keyframes charmove{
    from{transform:translateX(var(--fx,0%)) scale(var(--fs,.85)) rotate(var(--fr,0deg))}
    to{transform:translateX(var(--tx,0%)) scale(var(--ts2,1.03)) rotate(var(--tr,0deg))}}
  .scene img.char{object-fit:contain;animation:charmove linear forwards;
    filter:drop-shadow(0 18px 34px rgba(0,0,0,.72))}
  .scene.split{display:flex;gap:2px}
  .scene.split .sl{position:relative;flex:1;overflow:hidden}
  .scene.split .sl img{position:absolute;inset:0;opacity:1;transition:none}
  .scene.split .sl b{position:absolute;left:6%;right:6%;bottom:34%;z-index:2;display:block;
    font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-weight:400;
    font-size:clamp(11px,1.35vw,24px);line-height:1.3;color:var(--ink-hi);
    text-shadow:0 2px 16px #000;text-align:center}
  .scene.split .sl::after{content:"";position:absolute;inset:0;z-index:1;
    background:linear-gradient(0deg,rgba(6,5,4,.9) 0%,rgba(6,5,4,.55) 44%,rgba(6,5,4,0) 74%)}

  /* the caption sits in a band that is dark enough to hold text over any art */
  #capwrap{position:absolute;left:0;right:0;bottom:0;z-index:4;padding:0 7.4% 5.6%;
    background:linear-gradient(0deg,rgba(6,5,4,.93) 0%,rgba(6,5,4,.82) 42%,rgba(6,5,4,.42) 72%,rgba(6,5,4,0) 100%);
    padding-top:9%;pointer-events:none}
  #cap{max-width:64ch;margin:0 auto;text-align:center;
    font-family:"Cormorant Garamond",Georgia,serif;
    font-size:clamp(15px,2.05vw,37px);line-height:1.38;color:rgba(183,166,132,.55)}
  #cap.speech{font-style:italic;color:rgba(232,182,74,.5)}
  #cap .w{transition:color .18s linear,text-shadow .18s linear}
  #cap .w.said{color:var(--ink-hi)}
  #cap .w.now{color:#fff;text-shadow:0 0 18px rgba(232,182,74,.55)}
  #cap.plain{color:var(--ink-hi)}

  /* ── caption treatments ────────────────────────────────────────────────
     What actually holds attention on a phone in 2026 is word-synchronised text with
     per-word motion. The styles trending on the platform — neon fills, comic bursts,
     bouncing pop-ups — are Shorts-native and would destroy this brand on contact, so what
     is borrowed is the *mechanic* (sync, contrast, motion per word) and not the aesthetic.
     Same typeface, same two colours, in every treatment.

     A treatment is chosen per cut, so two versions of an episode can differ by exactly
     this and nothing else — which is the only way to learn which one works. */

  /* rise — each word lifts and brightens as it is spoken, then settles.
     The kinetic mechanic in a refined register: motion the eye tracks, not motion that
     performs. The lift is 0.14em rather than a fixed pixel value so it scales with the
     type and reads the same on a phone as on a desktop. */
  .cap-rise #cap .w{display:inline-block;transition:color .16s linear,transform .22s cubic-bezier(.2,.9,.3,1),text-shadow .16s linear}
  .cap-rise #cap .w.now{transform:translateY(-0.14em)}
  .cap-rise #cap .w.said{transform:translateY(0)}

  /* focus — everything except the live phrase falls back to near-nothing.
     The strongest attention treatment and the most opinionated: it removes the ability to
     read ahead, which is exactly why it holds. Words already said stay faintly visible so
     the line still reads as a sentence rather than as flashcards. */
  .cap-focus #cap{color:rgba(183,166,132,.16)}
  .cap-focus #cap .w{transition:color .2s linear,opacity .2s linear,text-shadow .2s linear}
  .cap-focus #cap .w.said{color:rgba(183,166,132,.4)}
  .cap-focus #cap .w.now{color:#fff;text-shadow:0 0 26px rgba(232,182,74,.75)}

  /* card — the pop-up treatment, translated. One short phrase at a time, large and centred,
     instead of a running line. Chunking is done in the player on punctuation first and
     length second, because a phrase that breaks mid-clause reads as a stutter.

     The biggest departure and the biggest gamble: it carries the least text per second, so
     it lives or dies on the phrasing. Words outside the live phrase are not merely dimmed
     but removed from the flow, or the block still reads as a wall. */
  .cap-card #capwrap{padding-top:14%}
  .cap-card #cap{font-size:clamp(22px,3.4vw,64px);line-height:1.14;max-width:18ch;
    min-height:2.3em;display:flex;flex-wrap:wrap;gap:0 .28em;align-content:center;
    justify-content:center;color:rgba(183,166,132,.34)}
  .cap-card #cap .w{display:none;transition:color .14s linear,transform .2s cubic-bezier(.2,.9,.3,1)}
  .cap-card #cap .w.inchunk{display:inline-block}
  .cap-card #cap .w.inchunk.said{color:rgba(232,182,74,.6)}
  .cap-card #cap .w.now{color:#fff;transform:scale(1.05);text-shadow:0 0 30px rgba(232,182,74,.6)}
  /* "framed" is a class on #stage and "cap-card" is on the root element, so this is a
     descendant relationship, not a compound one. Written as a compound selector it
     silently matched nothing and the card sat centred inside a left-aligned column. */
  .cap-card .framed #cap{justify-content:flex-start;text-align:left}

  /* stroke — a gold rule travels under the live word.
     Adds a moving element without moving the type, which keeps long lines readable while
     still giving the eye something that changes every few hundred milliseconds. */
  .cap-stroke #cap .w{position:relative}
  .cap-stroke #cap .w.now::after{content:"";position:absolute;left:0;right:0;bottom:-0.16em;
    height:2px;background:linear-gradient(90deg,rgba(232,182,74,0),#e8b64a,rgba(232,182,74,0))}
  #speaker{margin:0 auto .5em;text-align:center;font-family:"Marcellus",serif;
    font-size:clamp(9px,.86vw,15px);letter-spacing:.34em;text-transform:uppercase;
    color:var(--saffron);opacity:0}
  #speaker.on{opacity:1}

  /* episode card */
  #card{position:absolute;inset:0;z-index:5;display:grid;place-content:center;text-align:center;
    background:var(--paper);opacity:0;transition:opacity .8s ease;pointer-events:none}
  #card.on{opacity:1}
  .card-num{font-size:clamp(9px,.8vw,14px);letter-spacing:.5em;color:var(--saffron);margin-bottom:1.6em}
  .card-hi{font-family:"Tiro Devanagari Hindi",serif;font-size:clamp(26px,3.5vw,64px);
    line-height:1.18;color:var(--ink-hi)}
  .card-en{margin-top:.5em;font-size:clamp(13px,1.5vw,27px);letter-spacing:.3em;color:var(--dim)}
  .card-era{margin-top:1.4em;font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;
    font-size:clamp(12px,1.25vw,22px);color:var(--dim);opacity:.85}

  /* brand finish, carried over from the title sequence so the join is invisible */
  #vig{position:absolute;inset:0;pointer-events:none;z-index:6;
    box-shadow:inset 0 0 190px 70px rgba(0,0,0,.72)}
  #grain{position:absolute;inset:-8px;pointer-events:none;z-index:7;opacity:.075;mix-blend-mode:overlay;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3'/></filter><rect width='320' height='320' filter='url(%23n)'/></svg>");
    background-size:320px 320px}

  /* chrome */
  #bar{position:absolute;left:0;right:0;bottom:0;height:3px;z-index:8;background:rgba(232,182,74,.14)}
  #bar i{display:block;height:100%;width:0;background:var(--ink);transition:width .2s linear}
  #chrome{position:absolute;left:0;right:0;top:0;z-index:9;display:flex;align-items:center;gap:9px;
    padding:14px 18px;opacity:0;transition:opacity .25s ease}
  #stage:hover #chrome,#chrome.show{opacity:1}
  #chrome button{cursor:pointer;font-family:inherit;font-size:11px;letter-spacing:.2em;
    text-transform:uppercase;color:var(--dim);background:rgba(6,5,4,.62);
    border:1px solid rgba(183,166,132,.28);border-radius:2px;padding:6px 12px}
  #chrome button:hover{color:var(--ink-hi);border-color:rgba(232,182,74,.6)}
  #chrome button.act{color:var(--paper);background:var(--ink);border-color:var(--ink)}
  #where{margin-left:auto;font-size:11px;letter-spacing:.16em;color:var(--dim);
    background:rgba(6,5,4,.62);padding:6px 11px;border-radius:2px}
  #cut{position:absolute;left:18px;bottom:16px;z-index:9;font-size:10.5px;letter-spacing:.26em;
    text-transform:uppercase;color:rgba(183,166,132,.5)}

  #start{position:absolute;inset:0;z-index:20;display:grid;place-content:center;gap:18px;
    background:rgba(6,5,4,.9);text-align:center;cursor:pointer}
  #start h1{font-family:"Tiro Devanagari Hindi",serif;font-size:clamp(24px,3.2vw,58px);
    color:var(--ink-hi);font-weight:400}
  #start p{font-size:clamp(11px,1.1vw,17px);letter-spacing:.28em;text-transform:uppercase;color:var(--dim)}
  #start span{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:clamp(13px,1.3vw,22px);
    color:var(--saffron);letter-spacing:.06em;text-transform:none}
  #start.gone{display:none}
  @media (prefers-reduced-motion:reduce){ #art img.on{animation:none} }
</style>
</head>
<body>
<div id="stage">
  <div id="art"></div>
  <div id="film"><video id="vid" src="${esc(cut.intro.src)}" playsinline preload="auto"></video></div>

  <div id="card">
    <div class="card-num">${esc(ep.era || '')}</div>
    <div class="card-hi">${esc(ep.title_i18n?.hi || ep.title)}</div>
    <div class="card-en">${esc(ep.title.toUpperCase())}</div>
    <div class="card-era">${esc(ep.hero?.legend || '')}</div>
  </div>

  <div id="capwrap">
    <div id="speaker"></div>
    <div id="cap"></div>
  </div>

  <div id="vig"></div><div id="grain"></div>
  <div id="bar"><i></i></div>
  <div id="cut">${esc(cut.name)}</div>

  <div id="chrome">
    <button id="pp">Pause</button>
    <button id="prev">Prev</button>
    <button id="next">Next</button>
    <button id="en" class="act">EN</button>
    <button id="hi">हिं</button>
    <button id="skip">Skip titles</button>
    <div id="where"></div>
  </div>

  <div id="start">
    <h1>${esc(ep.title_i18n?.hi || 'आर्यभट')}</h1>
    <p>${esc(ep.title)}</p>
    <span>${esc(cut.name)} — tap to begin</span>
  </div>
</div>

<script type="module">
const CUT = ${JSON.stringify({ intro: cut.intro, card: cut.card, open: cut.open, frame: cut.frame, caption: cut.caption || 'settle' })};
const ep = await (await fetch('../episode.json')).json();
const P = ep.panels;
if (CUT.frame === 'framed') document.querySelector('#stage').classList.add('framed');
/* The caption treatment is a class on the root, so it can be swapped without touching the
   player: the word spans and their .now/.said classes are identical in every treatment and
   only their CSS differs. That is what makes two versions comparable — they differ by this
   and by nothing else. */
if (CUT.caption && CUT.caption !== 'settle') document.documentElement.classList.add('cap-' + CUT.caption);

/* The cut names which panels play before the titles; everything else follows in the
   source order. Expressing it as ids rather than a count means a cut can open on any
   panel — the YouTube cut opens on the claim, which is the third panel in the data. */
const openIdx = (CUT.open || []).map((id) => P.findIndex((p) => p.id === id)).filter((n) => n >= 0);
const restIdx = P.map((_, n) => n).filter((n) => !openIdx.includes(n));
const ORDER = [...openIdx, ...restIdx];

const $ = (s) => document.querySelector(s);
const art = $('#art'), film = $('#film'), vid = $('#vid'), card = $('#card');
const cap = $('#cap'), speaker = $('#speaker'), bar = $('#bar i'), where = $('#where');

let lang = 'en';
let i = -1;                 // current panel index
let audio = null;
let raf = 0;
let paused = false;
let introDone = false;

/* Preload the next panel's picture and sound while the current one plays, so a cut
   never waits on the network. Two ahead is enough and keeps memory flat. */
const cache = new Map();
function warm(n) {
  for (const k of ORDER.slice(n, n + 2)) {
    const p = P[k];
    if (!p || cache.has(p.id)) continue;
    const im = new Image(); if (p.art) im.src = p.art;
    const a = new Audio(); a.preload = 'auto';
    const src = p.audio[lang] || p.audio.en; if (src) a.src = src;
    cache.set(p.id, { im, a });
  }
}

/* Group the words of a line into short phrases.

   The "card" treatment shows one phrase at a time rather than a running line, which is the
   pop-up mechanic that is everywhere on the platform. Chunking on punctuation first and
   only then on length keeps the phrases readable — a chunk that breaks mid-clause reads as
   a stutter, which is worse than no chunking at all. */
function chunkWords(words, max) {
  const out = [];
  let cur = [];
  for (let k = 0; k < words.length; k++) {
    cur.push(k);
    const w = words[k][0];
    const ends = /[.,;:?!—]$/.test(w);
    if ((ends && cur.length >= 2) || cur.length >= max || k === words.length - 1) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  const of = new Array(words.length);
  out.forEach((g, ci) => g.forEach((k) => { of[k] = ci; }));
  return of;
}

let chunkOf = [];

function paintCaption(p) {
  cap.classList.toggle('speech', !!p.speech);
  speaker.textContent = p.speech ? (p.role === 'male' ? 'Aryabhata' : p.role) : '';
  speaker.classList.toggle('on', !!p.speech);
  // English has word timings, so the caption can track the voice; Hindi does not
  if (lang === 'en' && p.words.length) {
    cap.classList.remove('plain');
    chunkOf = CUT.caption === 'card' ? chunkWords(p.words, 5) : [];
    cap.innerHTML = p.words.map(([w], k) =>
      \`<span class="w" data-k="\${k}"\${chunkOf.length ? \` data-c="\${chunkOf[k]}"\` : ''}>\${w}</span>\`).join(' ');
  } else {
    cap.classList.add('plain');
    cap.textContent = p.text[lang] || p.text.en;
    chunkOf = [];
  }
}

/* The one place a caption's highlight state is decided.

   This used to exist twice — once for live playback and once for the frame-accurate export
   — and two copies of the rule that decides what the viewer sees is how the master and the
   player quietly stop agreeing. */
function paintWords(p, ms) {
  if (lang !== 'en' || !p.words.length) return;
  const spans = cap.children;
  let live = -1;
  for (let k = 0; k < p.words.length; k++) {
    const [, t, d] = p.words[k];
    const s = spans[k];
    if (!s) continue;
    const now = ms >= t && ms < t + d + 60;
    const said = ms >= t;
    if (now) live = k;
    if (s.classList.contains('now') !== now) s.classList.toggle('now', now);
    if (s.classList.contains('said') !== said) s.classList.toggle('said', said);
  }
  if (!chunkOf.length) return;
  /* Between words there is no live word, so the last one spoken decides the chunk —
     otherwise the card blinks out in every gap. */
  if (live < 0) for (let k = p.words.length - 1; k >= 0; k--) { if (ms >= p.words[k][1]) { live = k; break; } }
  const c = live >= 0 ? chunkOf[live] : 0;
  for (let k = 0; k < p.words.length; k++) {
    const s = spans[k];
    if (s) s.classList.toggle('inchunk', chunkOf[k] === c);
  }
}

function tick(p) {
  if (!audio) return;
  paintWords(p, audio.currentTime * 1000);
  const done = ORDER.slice(0, i).reduce((a, k) => a + P[k].dur, 0) + audio.currentTime;
  bar.style.width = (100 * done / ep.runtime).toFixed(2) + '%';
  raf = requestAnimationFrame(() => tick(p));
}

/* Build the picture for a panel. Most are one image with a slow push; four are not,
   and each of those gets what its data actually describes rather than a fallback. */
function buildScene(p, secs, pos) {
  const el = document.createElement('div');
  el.className = 'scene ' + p.kind;
  // alternate the travel direction so twenty-eight panels never feel mechanical
  const pan = pos % 2 === 0 ? 'pan-down' : 'pan-up';
  const img = (src, cls) => {
    const m = document.createElement('img');
    m.src = src; m.className = cls; m.style.animationDuration = secs + 's';
    return m;
  };
  /* In the framed cut a picture is two layers: a blurred blow-up that fills the frame
     and the untouched panel sitting on top of it. Everywhere else the plate is
     display:none, so this costs one cached decode and changes nothing. */
  const laid = (src, cls) => {
    el.appendChild(img(src, 'plate'));
    el.appendChild(img(src, cls + ' sharp'));
  };

  if (p.kind === 'map' && p.map) {
    laid(p.map, pan);
    const box = document.createElement('div');
    box.className = 'pinbox';
    const pin = document.createElement('i');
    pin.className = 'pin';
    pin.style.left = (p.pin.x * 100) + '%';
    pin.style.top = (p.pin.y * 100) + '%';
    box.appendChild(pin);
    if (p.pin.label) {
      const lb = document.createElement('div');
      lb.className = 'pinlabel';
      lb.style.left = (p.pin.x * 100) + '%';
      lb.style.top = (p.pin.y * 100) + '%';
      lb.textContent = p.pin.label;
      box.appendChild(lb);
    }
    el.appendChild(box);
    return el;
  }

  if (p.kind === 'action' && p.bg) {
    el.appendChild(img(p.bg, 'plate'));
    const b = img(p.bg, 'bg sharp');
    b.style.setProperty('--z', p.motion?.bgZoom ?? 1.12);
    b.style.setProperty('--pan', (p.motion?.bgPan ?? -6) + '%');
    el.appendChild(b);
    for (const c of (p.chars || [])) {
      if (!c.img) continue;
      const m = img(c.img, 'char sharp');
      const mo = c.motion || {};
      m.style.setProperty('--fx', (mo.fromX ?? 0) + '%');
      m.style.setProperty('--tx', (mo.toX ?? 0) + '%');
      m.style.setProperty('--fs', mo.fromScale ?? 0.85);
      m.style.setProperty('--ts2', mo.toScale ?? 1.03);
      m.style.setProperty('--fr', (mo.fromRot ?? mo.rotFrom ?? 0) + 'deg');
      m.style.setProperty('--tr', (mo.toRot ?? mo.rotTo ?? 0) + 'deg');
      el.appendChild(m);
    }
    return el;
  }

  if (p.kind === 'split' && p.slices?.length) {
    for (const s of p.slices) {
      const d = document.createElement('div');
      d.className = 'sl';
      if (s.img) { const m = document.createElement('img'); m.src = s.img; d.appendChild(m); }
      const b = document.createElement('b');
      b.textContent = s.slogan?.[lang] || s.slogan?.en || '';
      d.appendChild(b);
      el.appendChild(d);
    }
    return el;
  }

  if (p.art) laid(p.art, pan);
  return el;
}

function show(n) {
  cancelAnimationFrame(raf);
  if (audio) { audio.pause(); audio = null; }
  if (n >= ORDER.length) return finish();
  i = n;
  const p = P[ORDER[n]];
  where.textContent = \`\${n + 1} / \${ORDER.length}\`;

  const scene = buildScene(p, Math.max(4, p.dur + 1.2), n);
  art.appendChild(scene);
  requestAnimationFrame(() => scene.classList.add('on'));
  setTimeout(() => { [...art.children].slice(0, -1).forEach((el) => el.remove()); }, 1000);

  paintCaption(p);
  const src = p.audio[lang] || p.audio.en;
  audio = new Audio(src);
  audio.play().catch(() => {});
  audio.onended = () => { if (!paused) show(i + 1); };
  warm(n + 1);
  tick(p);
}

function finish() {
  cancelAnimationFrame(raf);
  card.querySelector('.card-hi').textContent = ep.moral ? '' : '';
  card.querySelector('.card-num').textContent = 'THE MORAL';
  card.querySelector('.card-en').textContent = '';
  card.querySelector('.card-era').textContent = ep.moral || '';
  card.classList.add('on');
  bar.style.width = '100%';
}

async function playIntro() {
  film.classList.add('on');
  vid.currentTime = 0;
  try { await vid.play(); } catch { /* blocked until gesture */ }
  await new Promise((r) => {
    vid.onended = r;
    vid.onerror = r;
  });
  film.classList.remove('on');
  introDone = true;
  await new Promise((r) => setTimeout(r, 420));
}

async function showCard() {
  if (!CUT.card) return;
  card.classList.add('on');
  await new Promise((r) => setTimeout(r, 2600));
  card.classList.remove('on');
  await new Promise((r) => setTimeout(r, 700));
}

/* The cut is expressed as "how many panels play before the titles". Everything else
   about the three versions is identical, which is the point of comparing them. */
async function run() {
  const before = openIdx.length;
  if (before > 0) {
    await new Promise((resolve) => {
      let stop = false;
      const step = (n) => {
        if (stop) return;
        if (n >= before) { resolve(); return; }
        show(n);
        audio.onended = () => step(n + 1);
      };
      step(0);
      window.__abortColdOpen = () => { stop = true; resolve(); };
    });
    if (audio) { audio.pause(); audio = null; }
    cancelAnimationFrame(raf);
    [...art.children].forEach((el) => el.classList.remove('on'));
    await new Promise((r) => setTimeout(r, 600));
  }
  await playIntro();
  await showCard();
  show(before);
}

$('#pp').addEventListener('click', () => {
  paused = !paused;
  $('#pp').textContent = paused ? 'Play' : 'Pause';
  if (paused) { audio?.pause(); vid.pause(); }
  else { if (audio) { audio.play().catch(() => {}); } else if (!introDone) vid.play().catch(() => {}); }
});
$('#prev').addEventListener('click', () => show(Math.max(0, i - 1)));
$('#next').addEventListener('click', () => show(Math.min(P.length - 1, i + 1)));
$('#skip').addEventListener('click', () => {
  window.__abortColdOpen?.();
  vid.pause(); film.classList.remove('on'); introDone = true;
  vid.currentTime = 0; vid.onended = null;
  card.classList.remove('on');
  show(CUT.intro.before);
});
for (const L of ['en', 'hi']) {
  $('#' + L).addEventListener('click', () => {
    if (lang === L) return;
    lang = L;
    $('#en').classList.toggle('act', L === 'en');
    $('#hi').classList.toggle('act', L === 'hi');
    cache.clear();
    if (i >= 0) show(i);        // restart the panel in the new voice
  });
}

$('#start').addEventListener('click', () => {
  $('#start').classList.add('gone');
  $('#chrome').classList.add('show');
  setTimeout(() => $('#chrome').classList.remove('show'), 2600);
  warm(0);
  run();
}, { once: true });

/* ── export: the picture as a pure function of time ───────────────────────
   The live player is driven by <audio> events, which a headless browser cannot
   step frame by frame. So the export path never plays anything. Given t it works
   out which panel is on screen, rebuilds that panel only when it changes, and
   scrubs the CSS move to the exact instant with a negative animation-delay
   against a paused animation. Two consequences matter:

     the render is deterministic — same frames on any machine, none dropped
     the render cannot drift from the player — it *is* the player's own markup,
     its own keyframes and its own word timings, read at a different clock

   Panel durations come from the narration files, so picture and voice stay in
   sync by construction rather than by a number kept in step by hand. */
const EXPORT = new URLSearchParams(location.search).has('export');
if (EXPORT) document.documentElement.classList.add('export');

const DURATION = ORDER.reduce((a, k) => a + P[k].dur, 0);
let scrubbed = -1;

function panelAt(t) {
  let acc = 0;
  for (let n = 0; n < ORDER.length; n++) {
    const d = P[ORDER[n]].dur;
    if (t < acc + d || n === ORDER.length - 1) {
      return { n, lt: Math.max(0, Math.min(d, t - acc)), d, start: acc };
    }
    acc += d;
  }
  return { n: 0, lt: 0, d: 0, start: 0 };
}

function seek(t) {
  const { n, lt, d } = panelAt(t);
  const p = P[ORDER[n]];

  if (n !== scrubbed) {
    scrubbed = n;
    i = n;
    cancelAnimationFrame(raf);
    art.replaceChildren();
    const scene = buildScene(p, Math.max(4, d + 1.2), n);
    scene.classList.add('on');              // no cross-fade to wait out when scrubbing
    art.appendChild(scene);
    paintCaption(p);
    where.textContent = \`\${n + 1} / \${ORDER.length}\`;
  }

  for (const el of art.querySelectorAll('img')) {
    el.style.animationPlayState = 'paused';
    el.style.animationDelay = (-lt).toFixed(3) + 's';
  }

  paintWords(p, lt * 1000);

  const done = ORDER.slice(0, n).reduce((a, k) => a + P[k].dur, 0) + lt;
  bar.style.width = (100 * done / ep.runtime).toFixed(2) + '%';
  return { panel: p.id, index: n, local: lt };
}

/** The schedule the renderer needs: where every panel starts, in the cut's order. */
function timeline() {
  let acc = 0;
  return ORDER.map((k) => {
    const p = P[k];
    const row = { id: p.id, start: +acc.toFixed(3), dur: p.dur, mood: p.mood || null, audio: p.audio };
    acc += p.dur;
    return row;
  });
}

// handle for QA and for the master renderer
window.__ep = {
  show, seek, panelAt, timeline,
  duration: DURATION,
  order: ORDER,
  get index() { return i; },
  panels: P,
  setLang(L) { lang = L; },
};
window.__epReady = true;
</script>
</body>
</html>
`;
