/* audio.js — the sting, synthesised. No samples, no files.

   Written as a *cue list* rather than as playback calls, so the identical score can be
   (a) scheduled live against the timeline clock and (b) rendered offline through an
   OfflineAudioContext and muxed into the exported video. One score, two destinations.

   Palette: a tanpura-like drone under everything, one plucked note per era climbing a
   pentatonic phrase, nib-on-paper noise as each scene draws, a riser into the map
   collapse, and a low struck bell on the wordmark. */

const SA = 65.41;                        // C2 — a low, warm tonic
const SCALE = [0, 3, 5, 7, 10, 12, 15, 19];

function env(param, when, peak, attack, decay) {
  param.setValueAtTime(0.0001, when);
  param.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack);
  param.exponentialRampToValueAtTime(0.0001, when + attack + decay);
}

function noiseBuffer(ctx, dur, colour = 0.86) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    last = colour * last + (1 - colour) * (Math.random() * 2 - 1);
    ch[i] = last * 3.2;
  }
  return buf;
}

/* ── voices ─────────────────────────────────────────────────────────────── */

/* attack/release are exposed because a short cue with the default 3.4s fade-in never
   reaches its level — the lockup drone has only ~5s to be there under the bell. */
function drone(ctx, dest, when, { dur = 26, gain = 0.3, attack = 3.4, release = 3.2 } = {}) {
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 820; lp.Q.value = 0.7;
  g.connect(lp).connect(dest);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + Math.min(attack, dur * 0.5));
  g.gain.setValueAtTime(gain, when + Math.max(attack + 0.1, dur - release));
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  [[1, 0.5, 'sine'], [1.5, 0.24, 'sine'], [2, 0.18, 'sine'], [3, 0.07, 'triangle'], [1.004, 0.28, 'sine']]
    .forEach(([mul, amp, type], i) => {
      const o = ctx.createOscillator();
      o.type = type; o.frequency.value = SA * mul;
      const og = ctx.createGain(); og.gain.value = amp;
      const lfo = ctx.createOscillator();
      lfo.type = 'sine'; lfo.frequency.value = 0.06 + i * 0.017;
      const lg = ctx.createGain(); lg.gain.value = amp * 0.3;
      lfo.connect(lg).connect(og.gain);
      o.connect(og).connect(g);
      o.start(when); o.stop(when + dur + 0.2);
      lfo.start(when); lfo.stop(when + dur + 0.2);
    });
}

function pluck(ctx, dest, when, { step = 0, gain = 0.3, dur = 3.6 } = {}) {
  const oct = Math.floor(step / SCALE.length);
  const f = SA * 4 * Math.pow(2, (SCALE[step % SCALE.length] + 12 * oct) / 12);
  const g = ctx.createGain();
  env(g.gain, when, gain, 0.008, dur);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(5600, when);
  lp.frequency.exponentialRampToValueAtTime(640, when + dur * 0.72);
  g.connect(lp).connect(dest);
  [1, 2, 3.01, 4.02, 5.4].forEach((mul, i) => {
    const o = ctx.createOscillator();
    o.type = i ? 'sine' : 'triangle';
    o.frequency.value = f * mul;
    const og = ctx.createGain();
    og.gain.value = 0.62 / (i + 1) ** 1.7;
    o.connect(og).connect(g);
    o.start(when); o.stop(when + dur + 0.1);
  });
}

function scratch(ctx, dest, when, { gain = 0.05, dur = 1.1 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, dur);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(gain, when + dur * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  src.connect(bp).connect(g).connect(dest);
  src.start(when); src.stop(when + dur + 0.05);
}

function riser(ctx, dest, when, { dur = 1.6, gain = 0.16 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, dur, 0.6);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.Q.value = 3.5;
  bp.frequency.setValueAtTime(320, when);
  bp.frequency.exponentialRampToValueAtTime(4200, when + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + dur * 0.92);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.14);
  src.connect(bp).connect(g).connect(dest);
  src.start(when); src.stop(when + dur + 0.2);
}

function strike(ctx, dest, when, { gain = 0.8 } = {}) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(158, when);
  o.frequency.exponentialRampToValueAtTime(42, when + 0.8);
  const g = ctx.createGain();
  env(g.gain, when, gain, 0.01, 2.4);
  o.connect(g).connect(dest);
  o.start(when); o.stop(when + 2.6);
  [1, 2.76, 5.4, 8.9].forEach((mul, i) => {
    const b = ctx.createOscillator();
    b.type = 'sine'; b.frequency.value = 415 * mul;
    const bg = ctx.createGain();
    env(bg.gain, when, 0.13 / (i + 1), 0.006, 3.8 - i * 0.55);
    b.connect(bg).connect(dest);
    b.start(when); b.stop(when + 4);
  });
  scratch(ctx, dest, when, { gain: 0.14, dur: 0.5 });
}

/* A tuned membrane stroke — the pulse the empire procession rides on.

   Shorter and more pitched than `strike`, which is a struck bell for the lockup.
   The partials are deliberately inharmonic and the pitch drops slightly as it
   decays, which is what makes a drum head read as a drum head rather than a beep. */
function tabla(ctx, dest, when, { gain = 0.3, freq = 196, dur = 0.5, slap = 0.45 } = {}) {
  const g = ctx.createGain();
  env(g.gain, when, gain, 0.004, dur);
  g.connect(dest);
  [[1, 1], [2.13, 0.38], [3.41, 0.17], [4.52, 0.08]].forEach(([mul, amp]) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * mul, when);
    o.frequency.exponentialRampToValueAtTime(freq * mul * 0.84, when + dur * 0.55);
    const og = ctx.createGain(); og.gain.value = amp;
    o.connect(og).connect(g);
    o.start(when); o.stop(when + dur + 0.05);
  });
  if (slap > 0) {                       // the finger transient, gone in 50 ms
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.07, 0.32);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1500;
    const ng = ctx.createGain();
    env(ng.gain, when, gain * slap, 0.001, 0.05);
    src.connect(hp).connect(ng).connect(dest);
    src.start(when); src.stop(when + 0.12);
  }
}

/* ── the tabla pair ───────────────────────────────────────────────────────

   `tabla` above is one drum and one sound, which is why a run of it reads as a
   metronome. A real tabla is two drums and a vocabulary of strokes (bols), and the
   groove comes from which drum speaks when — so these are modelled separately and
   the score spells out bols rather than beats.

   baya  the big left-hand bass drum. Its signature is the pitch *bend*: the heel
         slides on the head after the strike and the note swoops up. Damped strokes
         (ke) are choked and do not bend.
   daya  the small right-hand treble drum, tuned to the tonic. Open strokes (na)
         ring; closed ones (ta, tin) are cut short. Its partials are deliberately
         near-harmonic — a tabla head is loaded to ring at a pitch, unlike most drums. */

function baya(ctx, dest, when, { gain = 0.34, freq = 88, dur = 0.75, bend = 0.55, damp = false } = {}) {
  const g = ctx.createGain();
  env(g.gain, when, gain, 0.006, damp ? 0.13 : dur);
  g.connect(dest);
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, when);
  if (!damp && bend) o.frequency.exponentialRampToValueAtTime(freq * (1 + bend), when + dur * 0.45);
  else o.frequency.exponentialRampToValueAtTime(freq * 0.86, when + 0.12);
  const og = ctx.createGain(); og.gain.value = 1;
  o.connect(og).connect(g);
  o.start(when); o.stop(when + dur + 0.1);

  const h = ctx.createOscillator();       // a little body above the fundamental
  h.type = 'sine'; h.frequency.setValueAtTime(freq * 2.4, when);
  const hg = ctx.createGain(); env(hg.gain, when, gain * 0.22, 0.004, damp ? 0.09 : dur * 0.4);
  h.connect(hg).connect(dest);
  h.start(when); h.stop(when + dur + 0.1);

  const src = ctx.createBufferSource();   // the palm
  src.buffer = noiseBuffer(ctx, 0.05, 0.4);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
  const ng = ctx.createGain(); env(ng.gain, when, gain * 0.5, 0.001, 0.04);
  src.connect(lp).connect(ng).connect(dest);
  src.start(when); src.stop(when + 0.1);
}

function daya(ctx, dest, when, { gain = 0.26, freq = 330, dur = 0.55, open = true, slap = 0.4 } = {}) {
  const d = open ? dur : Math.min(dur, 0.16);
  const g = ctx.createGain();
  env(g.gain, when, gain, 0.003, d);
  g.connect(dest);
  [[1, 1], [2.0, 0.5], [3.0, 0.22], [4.1, 0.1], [5.4, 0.05]].forEach(([mul, amp]) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * mul, when);
    o.frequency.exponentialRampToValueAtTime(freq * mul * 0.97, when + d * 0.8);
    const og = ctx.createGain(); og.gain.value = amp;
    o.connect(og).connect(g);
    o.start(when); o.stop(when + d + 0.05);
  });
  if (slap > 0) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.05, 0.25);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.9;
    const ng = ctx.createGain(); env(ng.gain, when, gain * slap, 0.001, 0.035);
    src.connect(bp).connect(ng).connect(dest);
    src.start(when); src.stop(when + 0.09);
  }
}

/* A bamboo flute. Nearly a sine — the character is all in the breath noise riding
   with it, the slow vibrato that arrives late rather than immediately, and the
   meend, the glide into the note from below that no keyed instrument can do. */
function bansuri(ctx, dest, when, { freq = 392, dur = 2.6, gain = 0.15, meend = 0, breath = 0.5 } = {}) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + Math.min(0.34, dur * 0.22));
  g.gain.setValueAtTime(gain, when + dur * 0.62);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.6;
  g.connect(lp).connect(dest);

  const vib = ctx.createOscillator();     // vibrato fades in, as a player's does
  vib.type = 'sine'; vib.frequency.value = 5.2;
  const vg = ctx.createGain();
  vg.gain.setValueAtTime(0.0001, when);
  vg.gain.exponentialRampToValueAtTime(freq * 0.008, when + dur * 0.55);
  vib.connect(vg);
  vib.start(when); vib.stop(when + dur + 0.1);

  [[1, 1], [2, 0.16], [3, 0.05]].forEach(([mul, amp]) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    if (meend) {
      o.frequency.setValueAtTime(freq * mul * Math.pow(2, -meend / 12), when);
      o.frequency.exponentialRampToValueAtTime(freq * mul, when + Math.min(0.42, dur * 0.28));
    } else {
      o.frequency.setValueAtTime(freq * mul, when);
    }
    vg.connect(o.frequency);
    const og = ctx.createGain(); og.gain.value = amp;
    o.connect(og).connect(g);
    o.start(when); o.stop(when + dur + 0.1);
  });

  if (breath > 0) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, dur + 0.1, 0.7);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = freq * 2.1; bp.Q.value = 1.6;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, when);
    ng.gain.exponentialRampToValueAtTime(gain * 0.12 * breath, when + 0.2);
    ng.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(bp).connect(ng).connect(dest);
    src.start(when); src.stop(when + dur + 0.1);
  }
}

const VOICES = { drone, pluck, scratch, riser, strike, tabla, baya, daya, bansuri };

/** Play one cue on any context. `when` is absolute in that context's clock. */
export function playCue(ctx, dest, cue, when) {
  const v = VOICES[cue.voice];
  if (v) v(ctx, dest, when, cue);
}

function chain(ctx) {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.25;
  const master = ctx.createGain();
  master.gain.value = 0.85;
  master.connect(comp).connect(ctx.destination);
  return master;
}

/* ── live playback, locked to the timeline clock ─────────────────────────── */

export class LiveSting {
  constructor(cues) { this.cues = cues; this.ctx = null; this.master = null; this.armed = false; this.bus = null; }

  enable() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      this.ctx = new Ctx();
      this.master = chain(this.ctx);
    }
    this.ctx.resume();
    this.armed = true;
    return true;
  }

  disable() { this.armed = false; this.stop(); }

  /** Schedule the whole score, offset so cue time 0 == timeline time `fromTime`. */
  start(fromTime = 0) {
    if (!this.armed || !this.ctx) return;
    this.stop();
    const t0 = this.ctx.currentTime + 0.06;
    const bus = this.ctx.createGain();
    bus.gain.value = 1;
    bus.connect(this.master);
    this.bus = bus;
    for (const cue of this.cues) {
      if (cue.t + (cue.dur || 0) < fromTime) continue;
      playCue(this.ctx, bus, cue, t0 + Math.max(0, cue.t - fromTime));
    }
  }

  stop() {
    if (!this.bus) return;
    const b = this.bus; this.bus = null;
    try {
      b.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
      setTimeout(() => b.disconnect(), 600);
    } catch { /* context already gone */ }
  }
}

/* ── offline render, for muxing into the exported video ──────────────────── */

export async function renderWav(cues, duration, sampleRate = 48000) {
  const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new Off(2, Math.ceil(duration * sampleRate), sampleRate);
  const master = chain(ctx);
  for (const cue of cues) playCue(ctx, master, cue, cue.t);
  const buf = await ctx.startRendering();
  return encodeWav(buf);
}

function encodeWav(buf) {
  const chs = buf.numberOfChannels, n = buf.length;
  const data = new DataView(new ArrayBuffer(44 + n * chs * 2));
  const str = (off, s) => [...s].forEach((c, i) => data.setUint8(off + i, c.charCodeAt(0)));
  str(0, 'RIFF'); data.setUint32(4, 36 + n * chs * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true);
  data.setUint16(22, chs, true); data.setUint32(24, buf.sampleRate, true);
  data.setUint32(28, buf.sampleRate * chs * 2, true); data.setUint16(32, chs * 2, true);
  data.setUint16(34, 16, true); str(36, 'data'); data.setUint32(40, n * chs * 2, true);
  const src = Array.from({ length: chs }, (_, c) => buf.getChannelData(c));
  let off = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < chs; c++) {
      const v = Math.max(-1, Math.min(1, src[c][i]));
      data.setInt16(off, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      off += 2;
    }
  }
  return new Uint8Array(data.buffer);
}
