/* sketch.js — the hand. Turns clean geometry into drawn geometry.

   A real pen does three things a plotter doesn't:
     1. it wanders  — low-frequency wobble along the stroke, never white noise;
     2. it searches — faint under-drawing passes that miss slightly before the confident line;
     3. it overshoots — strokes run past their ends, corners get hunted twice.

   Everything here is deterministic (seeded), so the on-screen piece and the
   rendered video are frame-identical. */

import { spline, noise1, rng } from './geom.js';

const NS = 'http://www.w3.org/2000/svg';
let probe = null;

function probePath() {
  if (!probe) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    probe = document.createElementNS(NS, 'path');
    svg.appendChild(probe);
    document.body.appendChild(svg);
  }
  return probe;
}

/** Resample any path `d` into evenly spaced points. */
export function sample(d, step = 7) {
  const p = probePath();
  p.setAttribute('d', d);
  const len = p.getTotalLength();
  if (!len || !isFinite(len)) { p.setAttribute('d', ''); return { pts: [], len: 0 }; }
  const n = Math.max(2, Math.min(900, Math.ceil(len / step)));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const pt = p.getPointAtLength((len * i) / n);
    pts.push([pt.x, pt.y]);
  }
  p.setAttribute('d', '');   // never leave measuring geometry in the layout tree
  return { pts, len };
}

export function pathLength(d) {
  const p = probePath();
  p.setAttribute('d', d);
  const l = p.getTotalLength();
  p.setAttribute('d', '');
  return isFinite(l) ? l : 0;
}

/**
 * One hand-drawn pass over `d`.
 * amp     — wobble amplitude in user units
 * freq    — wobbles across the whole stroke
 * trim    — [start,end] fraction: a searching pass starts late / stops short
 * overrun — fraction of length the pen carries past the end
 */
export function handStroke(d, {
  seed = 1, amp = 1.6, freq = 5, step = 7, trim = [0, 1], overrun = 0, tension = 1,
} = {}) {
  const { pts, len } = sample(d, step);
  if (pts.length < 3) return d;

  const nx = noise1(seed, 2), ny = noise1(seed ^ 0x9e37, 2);
  const r = rng(seed * 2654435761);
  const drift = (r() - 0.5) * amp * 0.9;

  const i0 = Math.floor(trim[0] * (pts.length - 1));
  const i1 = Math.ceil(trim[1] * (pts.length - 1));
  const slice = pts.slice(i0, i1 + 1);
  if (slice.length < 3) return d;

  const out = slice.map((pt, i) => {
    const t = i / (slice.length - 1);
    // taper the wobble at both ends so joins between strokes stay tight
    const ease = Math.min(1, Math.sin(Math.min(t, 1 - t) * Math.PI * 1.9) * 1.35 + 0.18);
    const a = amp * ease;
    return [pt[0] + nx(t * freq) * a + drift * t, pt[1] + ny(t * freq + 3.7) * a + drift * (1 - t)];
  });

  if (overrun > 0 && slice.length > 2) {
    const [ax, ay] = out[out.length - 2], [bx, by] = out[out.length - 1];
    const m = Math.hypot(bx - ax, by - ay) || 1;
    const push = len * overrun;
    out.push([bx + ((bx - ax) / m) * push, by + ((by - ay) / m) * push]);
  }
  return spline(out, { tension });
}

/**
 * A drawn mark: the faint search passes plus the committed ink line.
 * Returns [{d, role}] where role drives width/opacity/timing downstream.
 */
export function drawnMark(d, {
  seed = 1, amp = 1.7, freq = 5, ghosts = 2, ghostAmp = 3.4, step = 7, overrun = 0.004,
} = {}) {
  const marks = [];
  for (let g = 0; g < ghosts; g++) {
    marks.push({
      role: 'ghost',
      d: handStroke(d, {
        seed: seed * 131 + g * 977,
        amp: ghostAmp * (1 + g * 0.35),
        freq: freq * (1.35 + g * 0.4),
        step: step * 1.7,
        trim: g === 0 ? [0.03, 0.94] : [0.10, 0.99],
        overrun: 0.012,
        tension: 1,
      }),
    });
  }
  marks.push({ role: 'ink', d: handStroke(d, { seed, amp, freq, step, overrun }) });
  return marks;
}
