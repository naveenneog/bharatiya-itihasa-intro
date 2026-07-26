/* intro.js — "One Line, Five Thousand Years".

   A single nib never lifts from the paper. Its one continuous curve becomes an Indus
   seal, then the lion capital at Sarnath, then a Chola vimana, then the stone chariot
   wheel at Hampi, then a Mughal dome — and finally collapses to a point of ink from
   which the coast of India is drawn in one stroke, before resolving into the wordmark.

   The dominant criterion is TIMING. Each era gets a draw, a hold, and a hand-off; the
   pace is deliberately uneven — the Indus beat is slow and searching, Chola stacks in a
   hard rhythm, Hampi turns, the Mughal beat is still, and the coast is the longest and
   quietest line in the piece. */

import {
  indusSeal, lionCapital, vimana, chariotWheel, mughalDome,
  indiaCoast, chakra, CHAPTER_SITES,
} from './art.js';
import { buildScene, svgEl, orderOf } from './stage.js';
import { drawnMark } from './sketch.js';
import { LiveSting, renderWav } from './audio.js';

const { gsap, DrawSVGPlugin, MorphSVGPlugin, CustomEase } = window;
gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin, CustomEase);
CustomEase.create('ink', 'M0,0 C0.14,0.68 0.2,1 1,1');       // a stroke leaves fast, settles slow
CustomEase.create('lift', 'M0,0 C0.66,0 0.86,0.28 1,1');      // and is withdrawn late and sharp
CustomEase.create('coast', 'M0,0 C0.42,0.02 0.16,1 1,1');     // one long travelling line

/* ── the eras ────────────────────────────────────────────────────────────── */

const ERAS = [
  {
    key: 'indus', num: 'I', hi: 'सिंधु घाटी', en: 'INDUS', when: 'c. 2600 BCE',
    line: 'A seal the size of a thumb. A script no one can read.',
    art: indusSeal(), draw: 2.6, hold: 1, gap: 0.8, step: 0,
  },
  {
    key: 'maurya', num: 'II', hi: 'मौर्य', en: 'MAURYA', when: 'c. 250 BCE',
    line: 'Four lions at Sarnath — and the wheel on India’s flag.',
    art: lionCapital(), draw: 2.3, hold: 0.82, gap: 0.72, step: 2,
  },
  {
    key: 'chola', num: 'III', hi: 'चोल', en: 'CHOLA', when: '1010 CE',
    line: 'Thirteen storeys of granite. A capstone still argued over.',
    art: vimana({ tiers: 13 }), draw: 2.05, hold: 0.68, gap: 0.64, step: 3,
  },
  {
    key: 'vijayanagara', num: 'IV', hi: 'विजयनगर', en: 'VIJAYANAGARA', when: 'c. 1520 CE',
    line: 'A stone chariot whose wheels, they say, turned.',
    art: chariotWheel(), draw: 1.85, hold: 0.56, gap: 0.56, step: 4, spin: -46,
  },
  {
    key: 'mughal', num: 'V', hi: 'मुग़ल', en: 'MUGHAL', when: '1632–1653',
    line: 'Marble on the Yamuna. A name against time.',
    art: mughalDome(), draw: 1.65, hold: 0.5, gap: 0.5, step: 5,
  },
];

const EYEBROW = 'One line · five thousand years';

/* ── build ───────────────────────────────────────────────────────────────── */

const $ = (s) => document.querySelector(s);
const frame = $('#frame');
const scenesG = $('#scenes');
const finaleG = $('#finale');
const carrier = $('#carrier');
const nib = $('#nib');
const eraEl = $('#era');

const scenes = ERAS.map((e) => {
  const sc = buildScene(e.art, { id: `sc-${e.key}` });
  // each drawing is composed to fill the frame on its own terms: a column and a wheel
  // should not be laid out at the same scale just because they share a 1000-unit box
  const wrap = svgEl('g', { class: 'fit' });
  wrap.appendChild(sc.g);
  scenesG.appendChild(wrap);
  const bb = sc.g.getBBox();
  // clear of the two rules even at the widest point of the slow camera push
  const k = Math.min(880 / bb.width, 750 / bb.height);
  const fit = { k, tx: 500 - (bb.x + bb.width / 2) * k, ty: 500 - (bb.y + bb.height / 2) * k };
  wrap.setAttribute('transform', `translate(${fit.tx.toFixed(2)} ${fit.ty.toFixed(2)}) scale(${k.toFixed(4)})`);
  gsap.set([...sc.drawn, ...sc.heroEls], { drawSVG: '0% 0%' });
  gsap.set(sc.dabs, { opacity: 0, transformOrigin: '50% 50%' });
  gsap.set(sc.g, { display: 'none' });
  return Object.assign({}, e, sc, { fit });
});
const IDENTITY_FIT = { k: 1, tx: 0, ty: 0 };

// finale: the coast, the chapter sites that bloom on it, and the chakra
const coast = indiaCoast({ box: 1000, pad: 98 });
const coastInk = drawnMark(coast.d, { seed: 424242, amp: 2.1, ghosts: 1, ghostAmp: 3.6 });
const coastG = svgEl('g', { id: 'coastG' });
const coastGhost = svgEl('path', { d: coastInk[0].d, class: 'ghost', 'stroke-width': '2.6' });
const coastPath = svgEl('path', { d: coastInk.at(-1).d, class: 'ink hero', 'stroke-width': '3.4' });
const coastHalo = svgEl('path', { d: coastInk.at(-1).d, class: 'halo', 'stroke-width': '13' });
const sitesG = svgEl('g', { id: 'sites' });
coastG.append(coastGhost, coastHalo, coastPath, sitesG);

const sites = CHAPTER_SITES
  .map((s) => ({ ...s, p: coast.project(s.lon, s.lat) }))
  .sort((a, b) => b.p[1] - a.p[1])
  .map(({ name, p }) => {
    const g = svgEl('g', { transform: `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})` });
    g.append(
      svgEl('circle', { r: 3.4, class: 'site-core' }),
      svgEl('circle', { r: 12, class: 'site' }),
    );
    g.setAttribute('data-name', name);
    sitesG.appendChild(g);
    return g;
  });

const chakraWrap = svgEl('g', { id: 'chakraWrap' });
const chakraScene = buildScene(chakra(500, 500, 300), { id: 'sc-chakra', jitter: 0.7 });
chakraWrap.appendChild(chakraScene.g);
finaleG.append(coastG, chakraWrap);

gsap.set([coastGhost, coastPath, coastHalo], { drawSVG: '0% 0%' });
gsap.set(sites, { opacity: 0 });
gsap.set([...chakraScene.drawn, ...chakraScene.heroEls], { drawSVG: '0% 0%' });
gsap.set(chakraScene.dabs, { opacity: 0, transformOrigin: '50% 50%' });
gsap.set(chakraWrap, { opacity: 0 });

// the eyebrow, split for per-character motion
$('#eyebrow').innerHTML = [...EYEBROW]
  .map((c) => `<span class="ch">${c === ' ' ? '&nbsp;' : c}</span>`).join('');

/* ── helpers ─────────────────────────────────────────────────────────────── */

const master = gsap.timeline({ paused: true });
const cues = [];
const cue = (t, voice, opts = {}) => cues.push({ t: +t.toFixed(3), voice, ...opts });

const stagger = (sc, span, reverse = false) => (i, el) => {
  const u = orderOf(el, sc.minOrder, sc.maxOrder);
  return (reverse ? 1 - u : u) * span;
};

/** Rides the pen tip along a path in lockstep with the tween that draws it.
    Positions are mapped out of the path's own space into root SVG space via the live
    CTM, so nesting, per-scene fits and the slow camera push all stay honest. */
const canvas = $('#canvas');
function nibRide(pathEl, at, duration, ease) {
  const prox = { p: 0 };
  const pt = canvas.createSVGPoint();
  master.to(prox, {
    p: 1, duration, ease,
    onUpdate() {
      const len = pathEl.getTotalLength();
      if (!len) return;
      const local = pathEl.getPointAtLength(len * prox.p);
      const m = pathEl.getScreenCTM();
      const root = canvas.getScreenCTM();
      if (!m || !root) return;
      pt.x = local.x; pt.y = local.y;
      const p = pt.matrixTransform(root.inverse().multiply(m));
      gsap.set(nib, { x: p.x, y: p.y });
    },
  }, at);
}

function enterScene(sc, at, { morphed = false } = {}) {
  const span = sc.draw * 0.74;
  master.set(sc.g, { display: 'block', opacity: 1, rotation: 0 }, at);
  master.fromTo(sc.drawn, { drawSVG: '0% 0%' },
    { drawSVG: '0% 100%', duration: 0.5, ease: 'ink', stagger: stagger(sc, span) }, at);
  master.fromTo(sc.dabs, { opacity: 0, scale: 0.4 },
    { opacity: 1, scale: 1, duration: 0.32, ease: 'back.out(2.4)', stagger: stagger(sc, span) }, at + 0.05);
  if (morphed) {
    master.set(sc.heroEls, { drawSVG: '0% 100%', opacity: 0 }, at);
  } else {
    master.set([sc.heroEls, nib], { opacity: 1 }, at);
    master.fromTo(sc.heroEls, { drawSVG: '0% 0%' },
      { drawSVG: '0% 100%', duration: sc.draw * 0.62, ease: 'ink' }, at);
    nibRide(sc.hero.el, at, sc.draw * 0.62, 'ink');
  }
  if (sc.spin) {
    master.fromTo(sc.g, { rotation: sc.spin, svgOrigin: '500 486' },
      { rotation: 0, duration: sc.draw + 0.9, ease: 'power3.out' }, at);
  }
}

function exitScene(sc, at) {
  master.to(sc.drawn, { drawSVG: '100% 100%', duration: 0.38, ease: 'lift', stagger: stagger(sc, 0.4, true) }, at);
  master.to(sc.dabs, { opacity: 0, scale: 0.35, duration: 0.26, ease: 'power2.in', stagger: stagger(sc, 0.4, true) }, at);
  master.to(sc.heroEls, { opacity: 0, duration: 0.14 }, at);
  master.set(sc.g, { display: 'none' }, at + 1.0);
}

function morph(fromD, fromFit, toD, toFit, at, dur) {
  master.set(carrier, {
    attr: { d: fromD }, opacity: 1, drawSVG: '0% 100%',
    x: fromFit.tx, y: fromFit.ty, scale: fromFit.k, svgOrigin: '0 0',
  }, at);
  master.to(carrier, {
    morphSVG: { shape: toD, shapeIndex: 'auto' },
    x: toFit.tx, y: toFit.ty, scale: toFit.k,
    duration: dur, ease: 'power2.inOut',
  }, at);
  master.to(carrier, { opacity: 0, duration: 0.2 }, at + dur - 0.1);
}

function showEra(sc, at) {
  master.call(() => {
    eraEl.querySelector('.era-num').textContent = sc.num;
    eraEl.querySelector('.era-hi').textContent = sc.hi;
    eraEl.querySelector('.era-en').textContent = sc.en;
    eraEl.querySelector('.era-when').textContent = sc.when;
    eraEl.querySelector('.era-line').textContent = sc.line;
  }, null, at);
  master.fromTo(eraEl, { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: 0.62, ease: 'power3.out' }, at);
  master.fromTo(eraEl.querySelectorAll('.era-num, .era-name, .era-when, .era-line'),
    { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.07 }, at + 0.04);
}

/* ── the sequence ────────────────────────────────────────────────────────── */

const MORPH = 0.95;

master.to(frame, { opacity: 1, duration: 0.9, ease: 'power2.out' }, 0);
master.fromTo('#push', { scale: 1.075, transformOrigin: '960px 520px' },
  { scale: 1, duration: 27, ease: 'none' }, 0);

// the nib touches down and rules the frame
master.set(nib, { opacity: 1, x: 150, y: 152 }, 0.42);
master.fromTo(nib, { scale: 0.3 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' }, 0.42);
master.fromTo('#ruleTop', { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 1.15, ease: 'expo.out' }, 0.5);
nibRide($('#ruleTop'), 0.5, 1.15, 'expo.out');
master.to(nib, { opacity: 0, duration: 0.3 }, 1.42);
master.fromTo('#ruleBottom', { drawSVG: '100% 100%' }, { drawSVG: '0% 100%', duration: 1.15, ease: 'expo.out' }, 0.62);
master.fromTo('#eyebrow', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.95);
master.fromTo('#eyebrow .ch', { opacity: 0, y: 16 },
  { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out', stagger: 0.017 }, 0.95);
cue(0.45, 'drone', { dur: 26.4, gain: 0.26 });
cue(0.5, 'scratch', { gain: 0.05, dur: 1.2 });

let t = 1.72;
const marks = [];
scenes.forEach((sc, i) => {
  const morphed = i > 0;
  enterScene(sc, t, { morphed });
  // the label rides most of the beat, not the tail of it — it has to be readable
  showEra(sc, t + 0.55);
  cue(t + 0.02, 'pluck', { step: sc.step, gain: i === 0 ? 0.26 : 0.3, dur: 3.8 });
  cue(t + 0.04, 'scratch', { gain: 0.045, dur: sc.draw * 0.8 });
  if (!morphed) master.to(nib, { opacity: 0, duration: 0.35 }, t + sc.draw * 0.62 + 0.1);
  const out = t + sc.draw + sc.hold;
  exitScene(sc, out);
  master.to(eraEl, { opacity: 0, x: 12, duration: 0.4, ease: 'power2.in' }, out - 0.02);
  marks.push({ sc, at: t, out });
  // beats shorten as they go: five thousand years arriving faster than you can hold it
  t = out + sc.gap;
});

// hand-offs: each era's hero line is the next era's first line
for (let i = 0; i < scenes.length - 1; i++) {
  const span = Math.min(MORPH, scenes[i].gap * 1.16);
  morph(scenes[i].hero.d, scenes[i].fit, scenes[i + 1].hero.d, scenes[i + 1].fit, marks[i].out, span);
  master.set(scenes[i + 1].heroEls, { opacity: 1 }, marks[i].out + span - 0.06);
  cue(marks[i].out, 'scratch', { gain: 0.035, dur: 0.7 });
}

// ── the coast: everything collapses to one point of ink, then India is drawn
const lastOut = marks.at(-1).out;
const startPt = coastPath.getPointAtLength(0);
const dot = `M${startPt.x - 5} ${startPt.y}A5 5 0 0 1 ${startPt.x + 5} ${startPt.y}A5 5 0 0 1 ${startPt.x - 5} ${startPt.y}`;
morph(scenes.at(-1).hero.d, scenes.at(-1).fit, dot, IDENTITY_FIT, lastOut, MORPH * 1.05);
cue(lastOut, 'riser', { dur: 1.2, gain: 0.1 });

const COAST_AT = lastOut + 1.02;
master.set(nib, { opacity: 1 }, COAST_AT);
master.fromTo(nib, { scale: 0.4 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, COAST_AT);
master.fromTo(coastGhost, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 2.3, ease: 'coast' }, COAST_AT - 0.05);
master.fromTo([coastPath, coastHalo], { drawSVG: '0% 0%' },
  { drawSVG: '0% 100%', duration: 2.4, ease: 'coast' }, COAST_AT);
nibRide(coastPath, COAST_AT, 2.4, 'coast');
cue(COAST_AT, 'pluck', { step: 6, gain: 0.26, dur: 4.2 });
cue(COAST_AT, 'scratch', { gain: 0.06, dur: 2.4 });

const SITES_AT = COAST_AT + 1.62;
master.fromTo(sites, { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.055 }, SITES_AT);
master.fromTo(sites.map((g) => g.querySelector('.site-core')), { scale: 0 },
  { scale: 1, duration: 0.42, ease: 'back.out(3)', stagger: 0.055, transformOrigin: '50% 50%' }, SITES_AT);
master.fromTo(sites.map((g) => g.querySelector('.site')), { scale: 0.2, opacity: 0.9 },
  { scale: 1.9, opacity: 0, duration: 1.1, ease: 'power2.out', stagger: 0.055, transformOrigin: '50% 50%' }, SITES_AT);
master.to(nib, { opacity: 0, duration: 0.4 }, SITES_AT + 0.5);

// ── the map is drawn into the wheel
const CHAKRA_AT = SITES_AT + 1.5;
cue(CHAKRA_AT - 0.5, 'riser', { dur: 1.4, gain: 0.13 });
master.to(coastG, { scale: 0.26, rotation: 26, opacity: 0, duration: 0.95, ease: 'power3.in', svgOrigin: '500 500' }, CHAKRA_AT);
master.set(chakraWrap, { opacity: 1 }, CHAKRA_AT + 0.18);
master.fromTo(chakraWrap, { rotation: -62, scale: 0.55, svgOrigin: '500 500' },
  { rotation: 0, scale: 1, duration: 1.35, ease: 'power3.out' }, CHAKRA_AT + 0.18);
master.fromTo([...chakraScene.drawn, ...chakraScene.heroEls], { drawSVG: '0% 0%' },
  { drawSVG: '0% 100%', duration: 0.5, ease: 'ink', stagger: stagger(chakraScene, 0.75) }, CHAKRA_AT + 0.18);
master.fromTo(chakraScene.dabs, { opacity: 0, scale: 0.4 },
  { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)', stagger: stagger(chakraScene, 0.75) }, CHAKRA_AT + 0.34);

// ── the wordmark
const LOCK_AT = CHAKRA_AT + 1.5;
master.to(chakraWrap, { y: -206, scale: 0.3155, duration: 1.05, ease: 'power3.inOut', svgOrigin: '500 500' }, LOCK_AT);
master.to('#ruleTop', { drawSVG: '20% 80%', opacity: 0.5, duration: 0.9, ease: 'power2.inOut' }, LOCK_AT);
master.to('#ruleBottom', { drawSVG: '20% 80%', opacity: 0.5, duration: 0.9, ease: 'power2.inOut' }, LOCK_AT);
master.to('#eyebrow', { opacity: 0, duration: 0.5 }, LOCK_AT - 0.2);

master.set('#lockup', { opacity: 1 }, LOCK_AT + 0.4);
master.fromTo('.wm-rule', { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'expo.out' }, LOCK_AT + 0.42);
master.fromTo('.wm-hi', { clipPath: 'inset(0 0 100% 0)', y: 8 },
  { clipPath: 'inset(0 0 0% 0)', y: 0, duration: 0.85, ease: 'power3.out' }, LOCK_AT + 0.62);
master.fromTo('.wm-en', { opacity: 0, letterSpacing: '22px', textIndent: '22px' },
  { opacity: 1, letterSpacing: '12px', textIndent: '12px', duration: 1.05, ease: 'power3.out' }, LOCK_AT + 1.02);
master.fromTo('.wm-tag', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, LOCK_AT + 1.34);
cue(LOCK_AT + 0.6, 'strike', { gain: 0.7 });
cue(LOCK_AT + 1.3, 'pluck', { step: 7, gain: 0.2, dur: 4.4 });

// ── land, and hold
master.to(chakraWrap, { rotation: 3, duration: 4, ease: 'sine.inOut' }, LOCK_AT + 1.1);
master.fromTo('#controls', { opacity: 0 }, { opacity: 1, duration: 0.7 }, LOCK_AT + 2.5);
master.fromTo('#hint', { opacity: 0 }, { opacity: 1, duration: 0.7 }, LOCK_AT + 2.5);
master.set('#frame', { opacity: 1 }, LOCK_AT + 3.4);   // hold the final frame

const DURATION = master.duration();

/* ── shell: fit, controls, reduced motion, render hooks ──────────────────── */

function fit() {
  const k = Math.min(innerWidth / 1920, innerHeight / 1080);
  frame.style.transform =
    `translate(${(innerWidth - 1920 * k) / 2}px, ${(innerHeight - 1080 * k) / 2}px) scale(${k})`;
}
addEventListener('resize', fit);
fit();

const sting = new LiveSting(cues);
const soundBtn = $('#sound');
soundBtn.addEventListener('click', () => {
  if (sting.armed) { sting.disable(); soundBtn.setAttribute('aria-pressed', 'false'); return; }
  if (sting.enable()) {
    soundBtn.setAttribute('aria-pressed', 'true');
    if (master.isActive()) sting.start(master.time());
  }
});
$('#replay').addEventListener('click', () => { master.restart(); if (sting.armed) sting.start(0); });

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

async function boot() {
  if (document.fonts?.ready) await document.fonts.ready;
  if (reduced) {
    master.progress(1).pause();
    gsap.set(['#controls', '#hint'], { opacity: 1 });
  } else {
    master.play(0);
  }
  document.body.dataset.ready = '1';
}

window.__intro = {
  tl: master, cues, duration: DURATION, renderWav,
  seek(time) { master.pause(); master.time(Math.min(time, DURATION)); },
};

boot();
