/* art.js — every drawing in the sequence.
   Each scene is authored in a local 1000x1000 box and placed by the stage.
   Nothing here is imported artwork: beziers are hand-authored, ornament is procedural.

   stroke = { d, role, order }
     role  'hero'   the single long line that carries the morph between eras
           'frame'  structure drawn first
           'detail' the body of the drawing
           'accent' the last few marks that make it land
     order stagger index — lower draws earlier */

import { P, spline, circle, arc, line, ellipse, petal, ring, polar, scallop, arcPoints } from './geom.js';

const s = (d, role = 'detail', order = 0) => ({ d, role, order });

/* ───────────────────────── I · INDUS  ·  the seal ───────────────────────── */

function indusSign(i, x, y, w = 46, h = 58) {
  const p = new P();
  switch (i % 6) {
    case 0: // lens / "fish"
      p.M(x, y + h / 2).C(x + w * 0.24, y, x + w * 0.76, y, x + w, y + h / 2)
        .C(x + w * 0.76, y + h, x + w * 0.24, y + h, x, y + h / 2);
      return [p.toString(), line(x + w * 0.5, y + h * 0.06, x + w * 0.5, y + h * 0.94)];
    case 1: // jar with two handles
      p.M(x + 4, y).L(x + 4, y + h * 0.62).C(x + 4, y + h, x + w - 4, y + h, x + w - 4, y + h * 0.62).L(x + w - 4, y);
      return [p.toString(),
        new P().M(x + 4, y + h * 0.2).C(x - 12, y + h * 0.28, x - 12, y + h * 0.5, x + 2, y + h * 0.56).toString(),
        new P().M(x + w - 4, y + h * 0.2).C(x + w + 12, y + h * 0.28, x + w + 12, y + h * 0.5, x + w - 2, y + h * 0.56).toString()];
    case 2: { // comb
      const teeth = [0, 1, 2, 3].map((k) => line(x + 5 + k * ((w - 10) / 3), y + h * 0.18, x + 5 + k * ((w - 10) / 3), y + h));
      return [line(x, y + h * 0.16, x + w, y + h * 0.16), ...teeth];
    }
    case 3: // double post with crossbar
      return [line(x + w * 0.24, y, x + w * 0.24, y + h), line(x + w * 0.76, y, x + w * 0.76, y + h),
        line(x + w * 0.24, y + h * 0.42, x + w * 0.76, y + h * 0.42)];
    case 4: // chevron stack
      return [new P().M(x, y + h * 0.42).L(x + w / 2, y).L(x + w, y + h * 0.42).toString(),
        new P().M(x, y + h).L(x + w / 2, y + h * 0.58).L(x + w, y + h).toString()];
    default: { // wheel-cross
      const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
      return [circle(cx, cy, r), line(cx - r, cy, cx + r, cy), line(cx, cy - r, cx, cy + r)];
    }
  }
}

export function indusSeal() {
  const out = [];
  // seal frame — squared, with the softened corners of a fired steatite tablet
  out.push(s(new P().M(112, 190).C(112, 150, 132, 132, 172, 132).L(828, 132)
    .C(868, 132, 888, 152, 888, 192).L(888, 872)
    .C(888, 908, 866, 926, 828, 926).L(172, 926)
    .C(134, 926, 112, 906, 112, 868).Z().toString(), 'frame', 0));
  out.push(s(line(150, 292, 850, 292), 'frame', 1));

  // undeciphered signs — a row of marks, deliberately not a claim to meaning
  [0, 1, 2, 3, 4, 5].forEach((i, k) => {
    indusSign(i, 196 + k * 112, 178, 48, 62).forEach((d, j) => out.push(s(d, 'accent', 2 + k * 0.1 + j * 0.02)));
  });

  // the "unicorn" bull, facing left, head lowered to the standard
  out.push(s(spline([[330, 505], [420, 476], [520, 468], [612, 478], [702, 504]], { tension: 1 }), 'hero', 4));
  out.push(s(new P().M(702, 504).C(736, 528, 748, 566, 744, 604).toString(), 'detail', 4.4));
  out.push(s(spline([[366, 612], [470, 640], [590, 644], [686, 618]]), 'detail', 4.6));
  out.push(s(new P().M(330, 505).C(310, 540, 312, 580, 332, 606).toString(), 'detail', 4.8));

  // head: brow, face, muzzle, jaw
  out.push(s(new P().M(302, 542).C(266, 554, 214, 586, 178, 634)
    .C(160, 656, 158, 672, 174, 682).C(198, 694, 234, 674, 260, 652)
    .C(288, 630, 302, 600, 300, 570).toString(), 'detail', 5));
  out.push(s(new P().M(300, 588).C(320, 616, 332, 646, 328, 672).toString(), 'detail', 5.4)); // dewlap
  out.push(s(new P().M(286, 572).C(268, 554, 244, 554, 234, 566).C(246, 582, 270, 586, 286, 578).toString(), 'detail', 5.3)); // ear
  out.push(s(arc(232, 604, 9, 200, 520), 'accent', 5.5)); // eye

  // the single horn — the sign the seal is named for, carried clear of the back line
  out.push(s(new P().M(274, 540).C(306, 480, 366, 444, 436, 432).toString(), 'accent', 5.6));
  out.push(s(new P().M(282, 558).C(312, 502, 368, 468, 432, 456).toString(), 'accent', 5.7));
  out.push(s(new P().M(436, 432).C(438, 442, 436, 450, 432, 456).toString(), 'accent', 5.8));
  [0, 1, 2].forEach((k) => out.push(s(new P().M(322 + k * 26, 512 + k * 2)
    .C(316 + k * 26, 536, 314 + k * 26, 566, 322 + k * 26, 592).toString(), 'accent', 5.85 + k * 0.03))); // neck rings

  // legs — near pair heavier, far pair set back
  out.push(s(new P().M(374, 614).C(368, 674, 366, 734, 374, 794).toString(), 'detail', 6));
  out.push(s(line(360, 794, 392, 794), 'detail', 6.05));
  out.push(s(new P().M(412, 618).C(406, 674, 404, 732, 410, 790).toString(), 'detail', 6.1));
  out.push(s(line(398, 790, 426, 790), 'detail', 6.15));
  out.push(s(new P().M(700, 606).C(710, 660, 700, 702, 688, 742).C(682, 766, 684, 782, 690, 794).toString(), 'detail', 6.2));
  out.push(s(line(676, 794, 708, 794), 'detail', 6.25));
  out.push(s(new P().M(660, 612).C(670, 664, 660, 704, 648, 742).C(642, 766, 644, 780, 650, 790).toString(), 'detail', 6.3));
  out.push(s(line(636, 790, 666, 790), 'detail', 6.35));
  out.push(s(new P().M(376, 520).C(392, 556, 390, 596, 376, 614).toString(), 'detail', 6.4)); // shoulder

  // tail with tuft
  out.push(s(new P().M(742, 556).C(766, 616, 762, 682, 744, 722).toString(), 'detail', 6.5));
  out.push(s(new P().M(744, 722).C(732, 742, 738, 762, 752, 770).toString(), 'accent', 6.6));

  // the ritual standard set before the animal
  out.push(s(new P().M(104, 802).L(120, 758).L(176, 758).L(192, 802).Z().toString(), 'detail', 6.7));
  out.push(s(line(148, 758, 148, 706), 'detail', 6.75));
  out.push(s(new P().M(100, 706).L(196, 706).L(184, 640).L(112, 640).Z().toString(), 'detail', 6.8));
  [136, 160].forEach((x, i) => out.push(s(line(x - 2, 646, x, 700), 'accent', 6.85 + i * 0.03)));
  out.push(s(new P().M(120, 640).C(130, 612, 166, 612, 176, 640).toString(), 'accent', 6.95));
  out.push(s(line(150, 838, 806, 838), 'accent', 7.1)); // ground
  return out;
}

/* ─────────────────────── II · MAURYA  ·  the lion capital ─────────────────────── */

export function lionCapital() {
  const out = [];
  const CX = 500;

  // polished monolithic shaft
  out.push(s(line(438, 1010, 448, 884), 'frame', 0));
  out.push(s(line(562, 1010, 552, 884), 'frame', 0.1));

  // campaniform lotus — narrow at the shaft, flaring wide to carry the abacus
  out.push(s(new P().M(448, 884).C(434, 842, 396, 792, 322, 744)
    .C(308, 734, 300, 730, 298, 724).toString(), 'hero', 1));
  out.push(s(new P().M(552, 884).C(566, 842, 604, 792, 678, 744)
    .C(692, 734, 700, 730, 702, 724).toString(), 'detail', 1.1));
  for (let k = -3; k <= 3; k++) {
    if (!k) continue;
    const x0 = CX + k * 15, x1 = CX + k * 62;
    out.push(s(new P().M(x0, 886).C(x0 + k * 6, 830, x1 - k * 10, 786, x1, 730).toString(), 'detail', 1.2 + Math.abs(k) * 0.06));
  }
  out.push(s(spline([[294, 724], [400, 708], [600, 708], [706, 724]]), 'detail', 1.5));
  out.push(s(spline([[292, 702], [400, 688], [600, 688], [708, 702]]), 'detail', 1.55));

  // abacus drum carrying the wheel of the law
  out.push(s(spline([[300, 700], [400, 716], [600, 716], [700, 700]]), 'frame', 1.7));
  out.push(s(spline([[300, 610], [400, 626], [600, 626], [700, 610]]), 'frame', 1.75));
  out.push(s(new P().M(300, 610).C(292, 654, 292, 662, 300, 700).toString(), 'frame', 1.8));
  out.push(s(new P().M(700, 610).C(708, 654, 708, 662, 700, 700).toString(), 'frame', 1.8));
  out.push(s(circle(CX, 660, 40), 'accent', 1.9));
  out.push(s(circle(CX, 660, 11), 'accent', 1.95));
  ring(16, (deg, i) => {
    const [ax, ay] = polar(CX, 660, 12, deg), [bx, by] = polar(CX, 660, 39, deg);
    out.push(s(line(ax, ay, bx, by), 'accent', 2 + i * 0.012));
  });
  // the animal reliefs either side of the wheel — read as gesture, not portraiture
  [-1, 1].forEach((sgn, i) => {
    const x = CX + sgn * 140;
    out.push(s(new P().M(x - sgn * 34, 682).C(x - sgn * 16, 652, x + sgn * 16, 648, x + sgn * 34, 670).toString(), 'accent', 2.3 + i * 0.05));
    out.push(s(new P().M(x - sgn * 28, 682).C(x - sgn * 26, 666, x - sgn * 22, 656, x - sgn * 12, 650).toString(), 'accent', 2.35 + i * 0.05));
    out.push(s(new P().M(x + sgn * 30, 670).C(x + sgn * 36, 682, x + sgn * 34, 692, x + sgn * 26, 694).toString(), 'accent', 2.4 + i * 0.05));
  });

  // two lions in profile, backs together, facing out — the reading the object gives at three-quarters
  const ABACUS = 618;
  // Each lion is a compact seated mass, a small head held forward, and — the signal that
  // makes it a lion rather than a dog — a heavy scalloped mane collar wrapping the head.
  const put = (pts, sgn, k = 0.86, shift = 46) =>
    pts.map(([x, y]) => [CX + sgn * ((x - CX - shift) * k), y]);
  const arcPts = (r, a0, a1, n) => arcPoints(690, 440, r, a0, a1, n);

  [1, -1].forEach((sgn, li) => {
    const o = li * 0.6;
    // body as one mass: chest down to the paw, along the base, up the rump
    out.push(s(spline(put([[748, 508], [742, 544], [734, 576], [728, 602], [732, 618]], sgn), { tension: 0.9 }), li ? 'detail' : 'hero', 2.6 + o));
    out.push(s(spline(put([[732, 618], [676, 612], [620, 614], [598, 618]], sgn), { tension: 0.9 }), 'detail', 2.64 + o));
    out.push(s(spline(put([[598, 618], [584, 592], [576, 560], [580, 528], [598, 504]], sgn), { tension: 0.9 }), 'detail', 2.68 + o));
    out.push(s(spline(put([[714, 552], [708, 586], [710, 616]], sgn), { tension: 0.9 }), 'detail', 2.72 + o)); // far foreleg
    [700, 720].forEach((x, k) => out.push(s(line(...put([[x, 606]], sgn)[0], ...put([[x, 618]], sgn)[0]), 'accent', 2.74 + k * 0.02 + o)));
    out.push(s(spline(put([[610, 540], [644, 566], [652, 606]], sgn), { tension: 0.9 }), 'detail', 2.78 + o)); // rear leg
    // the mane — two scalloped courses from the chest, round the back, over the head
    out.push(s(scallop(put(arcPts(94, 48, 332, 13), sgn), { bumps: 7, amp: 21 }), 'detail', 2.86 + o));
    out.push(s(scallop(put(arcPts(64, 56, 322, 11), sgn), { bumps: 6, amp: 13 }), 'detail', 2.98 + o));
    // head in profile
    out.push(s(spline(put([[708, 492], [700, 462], [703, 434], [714, 414], [734, 407], [753, 415],
      [769, 430], [775, 447], [770, 461], [753, 469], [736, 475], [720, 483], [708, 492]], sgn), { tension: 0.85 }), 'accent', 3.1 + o));
    out.push(s(spline(put([[775, 447], [757, 455], [740, 460]], sgn), { tension: 0.9 }), 'accent', 3.2 + o)); // mouth
    out.push(s(spline(put([[766, 434], [758, 438], [760, 444]], sgn), { tension: 0.9 }), 'accent', 3.24 + o)); // nostril
    out.push(s(spline(put([[728, 426], [739, 420], [747, 429], [736, 435], [728, 426]], sgn), { tension: 0.9 }), 'accent', 3.28 + o)); // eye
    out.push(s(spline(put([[712, 412], [706, 398], [714, 390], [724, 398]], sgn), { tension: 0.9 }), 'accent', 3.32 + o)); // ear
  });
  // the fourth lion, seen behind and between the other two
  out.push(s(scallop(arcPoints(CX, 438, 74, 198, 342, 11), { bumps: 6, amp: 13 }), 'accent', 4));
  out.push(s(scallop(arcPoints(CX, 438, 48, 204, 336, 9), { bumps: 5, amp: 9 }), 'accent', 4.05));
  out.push(s(spline([[478, 412], [500, 404], [522, 412]], { tension: 0.9 }), 'accent', 4.1));
  return out;
}

/* ─────────────────────── III · CHOLA  ·  the vimana ─────────────────────── */

export function vimana({ tiers = 12 } = {}) {
  const out = [];
  const CX = 500, BASE = 902, TOP = 336;
  const halfAt = (t) => 306 * (1 - 0.70 * t);

  // adhisthana — the plinth the whole mass stands on
  out.push(s(line(150, 1006, 850, 1006), 'frame', 0));
  [[168, 966], [180, 934], [192, 902]].forEach(([inset, y], i) =>
    out.push(s(line(inset, y, 1000 - inset, y), 'frame', 0.1 + i * 0.06)));
  out.push(s(new P().M(430, 1006).L(430, 946).C(430, 916, 570, 916, 570, 946).L(570, 1006).toString(), 'accent', 0.4));
  out.push(s(new P().M(452, 1006).L(452, 950).C(452, 930, 548, 930, 548, 950).L(548, 1006).toString(), 'accent', 0.45));

  // the storeys, drawn from the ground up — the tower assembles rather than fades
  for (let i = 0; i < tiers; i++) {
    const t0 = i / tiers, t1 = (i + 1) / tiers;
    const y0 = BASE + (TOP - BASE) * t0, y1 = BASE + (TOP - BASE) * t1;
    const w0 = halfAt(t0), w1 = halfAt(t1);
    const order = 1 + i * 0.9;
    out.push(s(new P().M(CX - w0, y0).L(CX - w1, y1).toString(), i === 0 ? 'hero' : 'frame', order));
    out.push(s(new P().M(CX + w0, y0).L(CX + w1, y1).toString(), 'frame', order + 0.05));
    // kapota cornice with the flick the Cholas gave every eave
    out.push(s(new P().M(CX - w1 - 14, y1 + 8).C(CX - w1 * 0.4, y1 - 5, CX + w1 * 0.4, y1 - 5, CX + w1 + 14, y1 + 8).toString(), 'detail', order + 0.12));
    out.push(s(new P().M(CX - w1 - 14, y1 + 8).C(CX - w1 * 0.4, y1 + 1, CX + w1 * 0.4, y1 + 1, CX + w1 + 14, y1 + 8).toString(), 'detail', order + 0.16));
    // shrine cells along the parapet
    const cells = Math.max(2, Math.round(w1 / 42));
    for (let k = -cells; k <= cells; k++) {
      if (Math.abs(k) === 0 && i % 2) continue;
      const cw = 11 - i * 0.4, x = CX + (k / (cells + 0.35)) * w1;
      const cy = y1 + 8, ch = 20 - i * 0.7;
      out.push(s(new P().M(x - cw, cy).L(x - cw, cy - ch * 0.55)
        .C(x - cw, cy - ch, x + cw, cy - ch, x + cw, cy - ch * 0.55).L(x + cw, cy).toString(), 'detail', order + 0.2 + Math.abs(k) * 0.02));
    }
    if (i < 4) { // pilasters on the lower storeys only, as on the real tower
      [-0.62, -0.24, 0.24, 0.62].forEach((u, k) =>
        out.push(s(line(CX + u * w0, y0 - 4, CX + u * w1, y1 + 6), 'detail', order + 0.3 + k * 0.01)));
    }
  }

  // griva, sikhara and the kalasha that finishes it
  const wTop = halfAt(1);
  out.push(s(line(CX - wTop, TOP, CX - wTop + 8, TOP - 46), 'frame', 12));
  out.push(s(line(CX + wTop, TOP, CX + wTop - 8, TOP - 46), 'frame', 12.05));
  out.push(s(line(CX - wTop + 8, TOP - 46, CX + wTop - 8, TOP - 46), 'detail', 12.1));
  out.push(s(new P().M(CX - wTop - 10, TOP - 46)
    .C(CX - wTop - 6, TOP - 118, CX - 40, TOP - 160, CX, TOP - 164)
    .C(CX + 40, TOP - 160, CX + wTop + 6, TOP - 118, CX + wTop + 10, TOP - 46).toString(), 'accent', 12.2));
  out.push(s(ellipse(CX, TOP - 164, 34, 12), 'accent', 12.35));
  out.push(s(line(CX, TOP - 168, CX, TOP - 196), 'accent', 12.4));
  out.push(s(new P().M(CX - 26, TOP - 196).C(CX - 26, TOP - 232, CX + 26, TOP - 232, CX + 26, TOP - 196).Z().toString(), 'accent', 12.45));
  out.push(s(line(CX, TOP - 232, CX, TOP - 268), 'accent', 12.5));
  out.push(s(new P().M(CX - 13, TOP - 268).C(CX - 6, TOP - 296, CX + 6, TOP - 296, CX + 13, TOP - 268).Z().toString(), 'accent', 12.55));
  return out;
}

/* ─────────────── IV · VIJAYANAGARA  ·  the stone chariot wheel ─────────────── */

export function chariotWheel() {
  const out = [];
  const CX = 500, CY = 486;
  out.push(s(circle(CX, CY, 336), 'hero', 0));
  out.push(s(circle(CX, CY, 312), 'frame', 0.3));
  out.push(s(circle(CX, CY, 138), 'frame', 0.5));
  out.push(s(circle(CX, CY, 118), 'frame', 0.55));

  ring(16, (deg, i) => out.push(s(petal(CX, CY, 122, 308, deg, 8.4), 'detail', 1 + i * 0.05)));
  ring(16, (deg, i) => {
    const [ax, ay] = polar(CX, CY, 150, deg + 11.25), [bx, by] = polar(CX, CY, 300, deg + 11.25);
    out.push(s(line(ax, ay, bx, by), 'detail', 1.1 + i * 0.05));
  });
  ring(32, (deg, i) => {
    const [x, y] = polar(CX, CY, 324, deg);
    out.push(s(circle(x, y, 6.5), 'accent', 2.4 + i * 0.012));
  });
  ring(32, (deg, i) => out.push(s(petal(CX, CY, 338, 404, deg, 5.2), 'detail', 2.9 + i * 0.012)));
  out.push(s(circle(CX, CY, 408), 'frame', 3.4));
  out.push(s(circle(CX, CY, 428), 'frame', 3.45));
  ring(36, (deg, i) => {
    const [ax, ay] = polar(CX, CY, 408, deg), [bx, by] = polar(CX, CY, 428, deg);
    out.push(s(line(ax, ay, bx, by), 'accent', 3.5 + i * 0.008));
  });

  // hub and axle
  out.push(s(circle(CX, CY, 60), 'accent', 4.2));
  out.push(s(circle(CX, CY, 26), 'accent', 4.25));
  ring(8, (deg, i) => {
    const [x, y] = polar(CX, CY, 92, deg + 22.5);
    out.push(s(circle(x, y, 9), 'accent', 4.3 + i * 0.02));
  });

  // the granite block it turns on — the wheel really did once revolve
  out.push(s(new P().M(300, 918).L(700, 918).toString(), 'frame', 4.6));
  out.push(s(new P().M(322, 918).L(340, 872).L(660, 872).L(678, 918).toString(), 'detail', 4.65));
  out.push(s(line(360, 872, 360, 838), 'detail', 4.7));
  out.push(s(line(640, 872, 640, 838), 'detail', 4.72));
  out.push(s(spline([[340, 838], [500, 824], [660, 838]]), 'detail', 4.75));
  return out;
}

/* ───────────────────── V · MUGHAL  ·  the dome and the arch ───────────────────── */

export function mughalDome() {
  const out = [];
  const CX = 500;

  out.push(s(line(96, 900, 904, 900), 'frame', 0));
  out.push(s(line(120, 878, 880, 878), 'frame', 0.06));

  // pishtaq — the great framed arch
  out.push(s(new P().M(330, 878).L(330, 452).L(670, 452).L(670, 878).toString(), 'frame', 0.3));
  out.push(s(new P().M(352, 878).L(352, 474).L(648, 474).L(648, 878).toString(), 'frame', 0.36));
  out.push(s(new P().M(388, 878).L(388, 648).C(388, 562, 452, 520, CX, 440)
    .C(548, 520, 612, 562, 612, 648).L(612, 878).toString(), 'hero', 0.5));
  out.push(s(new P().M(408, 878).L(408, 650).C(408, 578, 460, 540, CX, 474)
    .C(540, 540, 592, 578, 592, 650).L(592, 878).toString(), 'detail', 0.7));
  // pietra dura spandrels — two vines, not a texture fill
  [-1, 1].forEach((sgn, i) => {
    const x = CX + sgn * 250;
    out.push(s(new P().M(x, 560).C(x - sgn * 34, 528, x - sgn * 30, 496, x - sgn * 4, 486).toString(), 'accent', 0.9 + i * 0.05));
    ring(5, (deg, k) => out.push(s(petal(x - sgn * 6, 500, 8, 26, deg * 0.5 - 150, 12), 'accent', 1 + k * 0.03 + i * 0.05)));
  });

  // drum, then the onion — bulging low, pinched at the neck, pointed at the apex
  out.push(s(line(392, 452, 608, 452), 'frame', 1.3));
  out.push(s(line(396, 400, 604, 400), 'frame', 1.34));
  ring(9, (deg, i) => out.push(s(petal(CX, 400, 12, 44, deg * 0.5 - 168, 9), 'accent', 1.4 + i * 0.02)));
  out.push(s(new P().M(396, 400).C(354, 372, 340, 336, 348, 300)
    .C(358, 254, 386, 214, 426, 182).C(456, 156, 484, 126, CX, 88).toString(), 'accent', 1.7));
  out.push(s(new P().M(604, 400).C(646, 372, 660, 336, 652, 300)
    .C(642, 254, 614, 214, 574, 182).C(544, 156, 516, 126, CX, 88).toString(), 'accent', 1.75));
  out.push(s(new P().M(372, 322).C(410, 300, 590, 300, 628, 322).toString(), 'detail', 1.9));

  // finial: stem, two pots, and the crescent
  out.push(s(line(CX, 90, CX, 14), 'accent', 2));
  out.push(s(ellipse(CX, 74, 21, 12), 'accent', 2.05));
  out.push(s(ellipse(CX, 50, 13, 8), 'accent', 2.08));
  out.push(s(new P().M(CX - 24, 34).C(CX - 18, 8, CX + 18, 8, CX + 24, 34)
    .C(CX + 14, 18, CX - 14, 18, CX - 24, 34).Z().toString(), 'accent', 2.12));

  // chhatris
  [-1, 1].forEach((sgn, i) => {
    const x = CX + sgn * 268;
    out.push(s(new P().M(x - 52, 560).C(x - 52, 508, x + 52, 508, x + 52, 560).toString(), 'detail', 2.3 + i * 0.06));
    out.push(s(line(x - 58, 560, x + 58, 560), 'detail', 2.36 + i * 0.06));
    [-44, -15, 15, 44].forEach((u, k) => out.push(s(line(x + u, 560, x + u, 646), 'detail', 2.4 + k * 0.02 + i * 0.06)));
    out.push(s(line(x - 58, 646, x + 58, 646), 'detail', 2.5 + i * 0.06));
    out.push(s(line(x, 508, x, 476), 'accent', 2.54 + i * 0.06));
    out.push(s(ellipse(x, 500, 13, 7), 'accent', 2.56 + i * 0.06));
  });

  // minarets, set back and leaning fractionally outward as the real four do
  [-1, 1].forEach((sgn, i) => {
    const x = CX + sgn * 396;
    out.push(s(new P().M(x - 20, 878).L(x - 26 - sgn * 2, 320).toString(), 'detail', 2.8 + i * 0.05));
    out.push(s(new P().M(x + 20, 878).L(x + 14 - sgn * 2, 320).toString(), 'detail', 2.84 + i * 0.05));
    [700, 520].forEach((y, k) => {
      out.push(s(line(x - 34, y, x + 34, y), 'accent', 2.9 + k * 0.04 + i * 0.05));
      out.push(s(line(x - 32, y - 12, x + 32, y - 12), 'accent', 2.92 + k * 0.04 + i * 0.05));
    });
    out.push(s(line(x - 32, 320, x + 20, 320), 'accent', 3.05 + i * 0.05));
    out.push(s(new P().M(x - 28, 300).C(x - 28, 262, x + 22, 262, x + 22, 300).toString(), 'accent', 3.08 + i * 0.05));
    out.push(s(line(x - 3, 262, x - 3, 236), 'accent', 3.1 + i * 0.05));
  });

  // the water in front of it
  [[196, 946], [150, 972], [232, 996]].forEach(([x0, y], i) => {
    out.push(s(spline([[x0, y], [x0 + 180, y + 5], [x0 + 380, y - 4], [x0 + 560, y + 3]]), 'accent', 3.4 + i * 0.08));
  });
  return out;
}

/* ─────────────────────── VI · THE COAST  ·  one continuous line ─────────────────────── */

/* A stylised, hand-drawn silhouette of the Republic of India — not a survey map.
   Traced clockwise from the far north-west; the northern extent is drawn to
   include the whole of Jammu & Kashmir and Ladakh. */
const INDIA_LONLAT = [
  [74.0, 35.6], [75.6, 36.2], [77.2, 35.7], [78.6, 34.7], [79.4, 33.4], [79.1, 32.4], [78.8, 31.4],
  [80.1, 30.7], [81.0, 30.2], [82.7, 28.4], [84.6, 27.5], [86.2, 26.6], [87.9, 26.4], [88.3, 27.6],
  [89.2, 26.9], [91.6, 26.9], [92.1, 27.7], [94.2, 27.6], [95.6, 28.6], [96.9, 28.3], [97.3, 27.4],
  [96.3, 27.1], [95.2, 26.6], [94.6, 25.2], [93.9, 24.0], [93.3, 23.1], [92.6, 22.1], [92.3, 21.4],
  [91.7, 22.9], [91.4, 24.0], [90.2, 25.1], [89.9, 25.9], [88.4, 26.2], [88.7, 25.1], [88.2, 24.2],
  [88.9, 23.2], [89.0, 22.1], [87.9, 21.6], [86.9, 20.8], [85.1, 19.7], [84.0, 18.6], [83.3, 17.7],
  [81.3, 16.3], [80.3, 15.7], [80.2, 13.5], [79.9, 11.9], [79.4, 10.4], [78.2, 9.3], [78.1, 8.5],
  [77.5, 8.08], [76.9, 8.6], [76.2, 9.9], [75.7, 11.4], [74.8, 12.9], [74.1, 15.0], [73.1, 17.0],
  [72.8, 18.9], [72.9, 20.4], [72.6, 21.6], [72.1, 21.1], [70.4, 20.8], [69.1, 22.1], [70.0, 22.6],
  [68.9, 23.6], [68.3, 23.9], [69.0, 24.4], [70.4, 24.4], [71.1, 24.7], [70.6, 25.7], [70.1, 26.6],
  [69.6, 27.2], [70.8, 28.0], [72.3, 28.8], [73.5, 29.9], [74.6, 31.1], [74.5, 32.5], [74.1, 34.1],
];

export function indiaCoast({ box = 1000, pad = 60 } = {}) {
  const lo = INDIA_LONLAT.reduce((a, [x, y]) => [Math.min(a[0], x), Math.min(a[1], y)], [999, 999]);
  const hi = INDIA_LONLAT.reduce((a, [x, y]) => [Math.max(a[0], x), Math.max(a[1], y)], [-999, -999]);
  // simple equirectangular with a latitude cosine correction so it isn't squashed
  const kx = Math.cos(((lo[1] + hi[1]) / 2) * Math.PI / 180);
  const w = (hi[0] - lo[0]) * kx, h = hi[1] - lo[1];
  const scale = (box - pad * 2) / Math.max(w, h);
  const ox = (box - w * scale) / 2, oy = (box - h * scale) / 2;
  const project = (lon, lat) => [ox + (lon - lo[0]) * kx * scale, oy + (hi[1] - lat) * scale];
  return { d: spline(INDIA_LONLAT.map(([lon, lat]) => project(lon, lat)), { closed: true, tension: 0.92 }), project };
}

/* Places the app already tells chapters about — the points that bloom on the map. */
export const CHAPTER_SITES = [
  { name: 'Dholavira', lon: 70.21, lat: 23.89 },
  { name: 'Lothal', lon: 72.25, lat: 22.52 },
  { name: 'Delhi', lon: 77.21, lat: 28.61 },
  { name: 'Agra', lon: 78.02, lat: 27.18 },
  { name: 'Sarnath', lon: 83.02, lat: 25.38 },
  { name: 'Pataliputra', lon: 85.14, lat: 25.59 },
  { name: 'Nalanda', lon: 85.44, lat: 25.14 },
  { name: 'Jhansi', lon: 78.58, lat: 25.45 },
  { name: 'Ellora', lon: 75.18, lat: 20.02 },
  { name: 'Badami', lon: 75.68, lat: 15.92 },
  { name: 'Hampi', lon: 76.46, lat: 15.34 },
  { name: 'Thanjavur', lon: 79.14, lat: 10.79 },
];

/* ─────────────────────────── the chakra and the rule ─────────────────────────── */

export function chakra(cx, cy, r) {
  const out = [];
  out.push(s(circle(cx, cy, r), 'frame', 0));
  out.push(s(circle(cx, cy, r * 0.9), 'frame', 0.1));
  out.push(s(circle(cx, cy, r * 0.16), 'accent', 0.2));
  ring(24, (deg, i) => {
    const [ax, ay] = polar(cx, cy, r * 0.16, deg), [bx, by] = polar(cx, cy, r * 0.9, deg);
    out.push(s(line(ax, ay, bx, by), 'detail', 0.4 + i * 0.02));
  });
  ring(24, (deg, i) => {
    const [x, y] = polar(cx, cy, r * 0.9, deg + 7.5);
    out.push(s(circle(x, y, r * 0.035), 'accent', 1 + i * 0.01));
  });
  return out;
}

/** A manuscript rule with a lotus-bud centre — used under the wordmark. */
export function flourish(cx, cy, half) {
  const out = [];
  out.push(s(line(cx - half, cy, cx - 40, cy), 'frame', 0));
  out.push(s(line(cx + 40, cy, cx + half, cy), 'frame', 0));
  out.push(s(new P().M(cx - 26, cy).C(cx - 18, cy - 16, cx - 6, cy - 22, cx, cy - 24)
    .C(cx + 6, cy - 22, cx + 18, cy - 16, cx + 26, cy).C(cx + 16, cy + 14, cx - 16, cy + 14, cx - 26, cy).Z().toString(), 'accent', 0.3));
  out.push(s(line(cx, cy - 24, cx, cy + 8), 'accent', 0.4));
  [-1, 1].forEach((sgn) => out.push(s(new P().M(cx + sgn * 40, cy)
    .C(cx + sgn * 30, cy - 12, cx + sgn * 14, cy - 10, cx + sgn * 10, cy).toString(), 'accent', 0.5)));
  return out;
}
