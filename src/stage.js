/* stage.js — turns stroke data into live SVG, and gives the timeline handles to pull.

   Rendering model per stroke:
     ghost  faint searching passes (heavy marks only)
     halo   a wide, low-opacity copy of the ink line — a glow without a filter,
            because filters cost per-frame and this does not
     ink    the committed line

   Short marks are not "drawn" at all: they dab in with opacity and scale, which is
   both cheaper and truer — a pen doesn't stroke a dot, it taps it. */

import { drawnMark, pathLength } from './sketch.js';

const NS = 'http://www.w3.org/2000/svg';

export const WIDTH = { hero: 3.2, frame: 2.3, detail: 1.9, accent: 1.6 };
const GHOSTS = { hero: 2, frame: 2, detail: 1, accent: 0 };
const DAB_LENGTH = 46;          // below this a mark is tapped, not drawn

export function svgEl(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

let seedCounter = 1;

/**
 * Build one scene group.
 * Returns { g, drawn:[el], dabs:[el], hero:{el,d}, byOrder }
 */
export function buildScene(strokes, { id, jitter = 1 } = {}) {
  const g = svgEl('g', { id, class: 'scene' });
  const gGhost = svgEl('g', { class: 'ghosts' });
  const gHalo = svgEl('g', { class: 'halos' });
  const gInk = svgEl('g', { class: 'inks' });
  g.append(gGhost, gHalo, gInk);

  const drawn = [], dabs = [], heroEls = [];
  let hero = null;

  for (const st of strokes) {
    const w = WIDTH[st.role] ?? 2;
    const seed = (seedCounter += 7919);
    const marks = drawnMark(st.d, {
      seed,
      amp: 1.7 * jitter,
      freq: 5,
      ghosts: GHOSTS[st.role] ?? 1,
      ghostAmp: 3.2 * jitter,
    });
    const inkD = marks.at(-1).d;
    const len = pathLength(inkD);
    const short = len < DAB_LENGTH;
    const isHero = st.role === 'hero' && !hero;
    const push = (el) => (isHero ? heroEls : short ? dabs : drawn).push(el);

    for (const m of marks) {
      if (m.role !== 'ghost') continue;
      const p = svgEl('path', { d: m.d, class: 'ghost', 'stroke-width': (w * 0.8).toFixed(2) });
      p.dataset.order = st.order;
      gGhost.appendChild(p);
      push(p);
    }

    if (st.role === 'hero' || st.role === 'frame') {
      const halo = svgEl('path', { d: inkD, class: 'halo', 'stroke-width': (w * 3.4).toFixed(2) });
      halo.dataset.order = st.order;
      gHalo.appendChild(halo);
      push(halo);
    }

    const ink = svgEl('path', { d: inkD, class: `ink ${st.role}`, 'stroke-width': w.toFixed(2) });
    ink.dataset.order = st.order;
    gInk.appendChild(ink);
    push(ink);

    if (isHero) hero = { el: ink, d: inkD, len };
  }

  const orders = strokes.map((s) => s.order);
  return {
    g, drawn, dabs, heroEls, hero,
    minOrder: Math.min(...orders),
    maxOrder: Math.max(...orders),
  };
}

/** Normalised stagger position (0..1) for an element, from its authored order. */
export function orderOf(el, min, max) {
  const o = Number(el.dataset.order || 0);
  return max === min ? 0 : (o - min) / (max - min);
}
