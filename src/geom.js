/* geom.js — path construction primitives.
   Everything the title sequence draws is generated here as SVG path data.
   No imported artwork: every curve in this piece is authored or procedural. */

export const RAD = Math.PI / 180;
export const f = (n) => Math.round(n * 100) / 100;

export function polar(cx, cy, r, deg) {
  const a = deg * RAD;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
}

/** Deterministic RNG so every render — screen or video — is identical. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 1-D value noise in [-1,1]; used for hand-wobble, never white noise. */
export function noise1(seed, octaves = 2) {
  const r = rng(seed);
  const g = Array.from({ length: 512 }, () => r() * 2 - 1);
  const at = (x) => {
    const i = Math.floor(x), t = x - i;
    const a = g[((i % 512) + 512) % 512], b = g[(((i + 1) % 512) + 512) % 512];
    const s = t * t * (3 - 2 * t);
    return a + (b - a) * s;
  };
  return (x) => {
    let v = 0, amp = 1, fr = 1, norm = 0;
    for (let o = 0; o < octaves; o++) { v += at(x * fr) * amp; norm += amp; amp *= 0.45; fr *= 2.3; }
    return v / norm;
  };
}

/** Tiny fluent path builder — keeps the art files readable. */
export class P {
  constructor(d = '') { this.s = d; }
  M(x, y) { this.s += `M${f(x)} ${f(y)}`; return this; }
  L(x, y) { this.s += `L${f(x)} ${f(y)}`; return this; }
  C(a, b, c, d, e, g) { this.s += `C${f(a)} ${f(b)} ${f(c)} ${f(d)} ${f(e)} ${f(g)}`; return this; }
  Q(a, b, c, d) { this.s += `Q${f(a)} ${f(b)} ${f(c)} ${f(d)}`; return this; }
  A(rx, ry, rot, laf, sf, x, y) { this.s += `A${f(rx)} ${f(ry)} ${rot} ${laf} ${sf} ${f(x)} ${f(y)}`; return this; }
  Z() { this.s += 'Z'; return this; }
  toString() { return this.s; }
}
export const path = (d) => new P(d);

/** Catmull-Rom through points -> cubic bezier path. The workhorse for organic curves. */
export function spline(pts, { closed = false, tension = 1 } = {}) {
  if (pts.length < 2) return '';
  const p = pts.map(([x, y]) => [x, y]);
  const n = p.length;
  const get = (i) => closed ? p[((i % n) + n) % n] : p[Math.max(0, Math.min(n - 1, i))];
  const d = new P().M(p[0][0], p[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    d.C(
      p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension,
      p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension,
      p2[0], p2[1]
    );
  }
  if (closed) d.Z();
  return d.toString();
}

/** Circle as two arcs — draws cleanly under DrawSVG (a single arc command cannot close). */
export function circle(cx, cy, r, from = -90) {
  const [x0, y0] = polar(cx, cy, r, from);
  const [x1, y1] = polar(cx, cy, r, from + 180);
  return new P().M(x0, y0).A(r, r, 0, 0, 1, x1, y1).A(r, r, 0, 0, 1, x0, y0).toString();
}

export function arc(cx, cy, r, a0, a1) {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return new P().M(x0, y0).A(r, r, 0, large, sweep, x1, y1).toString();
}

export const line = (x1, y1, x2, y2) => new P().M(x1, y1).L(x2, y2).toString();

/** Ellipse via arcs (used for domes, bells, hubs). */
export function ellipse(cx, cy, rx, ry) {
  return new P().M(cx - rx, cy).A(rx, ry, 0, 0, 1, cx + rx, cy).A(rx, ry, 0, 0, 1, cx - rx, cy).toString();
}

/** A lotus petal pointing outward from (cx,cy) at `deg`, spanning r0..r1. */
export function petal(cx, cy, r0, r1, deg, spread) {
  const [ax, ay] = polar(cx, cy, r0, deg - spread);
  const [bx, by] = polar(cx, cy, r1, deg);
  const [dx, dy] = polar(cx, cy, r0, deg + spread);
  const [m1x, m1y] = polar(cx, cy, (r0 + r1) / 2, deg - spread * 0.72);
  const [m2x, m2y] = polar(cx, cy, (r0 + r1) / 2, deg + spread * 0.72);
  return new P().M(ax, ay).Q(m1x, m1y, bx, by).Q(m2x, m2y, dx, dy).toString();
}

/** Repeat a generator around a circle. */
export function ring(count, fn, offset = 0) {
  return Array.from({ length: count }, (_, i) => fn((i / count) * 360 + offset, i));
}

/** Scalloped edge along a spine polyline — carved fur, lotus rims, cloud banks. */
export function scallop(pts, { bumps = 6, amp = 16, phase = 0, tension = 1, fade = true } = {}) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push(d); total += d;
  }
  if (!total) return '';
  const samples = Math.max(24, Math.round(bumps * 9));
  const out = [];
  for (let sIdx = 0; sIdx <= samples; sIdx++) {
    const u = sIdx / samples, target = total * u;
    let acc = 0, i = 0;
    while (i < segs.length - 1 && acc + segs[i] < target) { acc += segs[i]; i++; }
    const t = segs[i] ? (target - acc) / segs[i] : 0;
    const a = pts[i], b = pts[Math.min(i + 1, pts.length - 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
    const env = fade ? Math.sin(Math.PI * u) ** 0.35 : 1;
    const w = Math.abs(Math.sin(u * bumps * Math.PI + phase)) * amp * env;
    out.push([a[0] + dx * t + (-dy / m) * w, a[1] + dy * t + (dx / m) * w]);
  }
  return spline(out, { tension });
}

/** Points along a circular arc — a spine for scallop(). */
export function arcPoints(cx, cy, r, a0, a1, n = 9) {
  return Array.from({ length: n }, (_, i) => polar(cx, cy, r, a0 + ((a1 - a0) * i) / (n - 1)));
}
