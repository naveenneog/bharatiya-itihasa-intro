/* The empires score, written as a cue list against the picture schedule.

   Cues are data, not playback calls, so the identical score is (a) scheduled live
   in the browser and (b) rendered offline through an OfflineAudioContext and muxed
   into the master. Voices come from src/audio.js — the same synth v1 uses, so the
   two pieces sound like the same title sequence.

   The score is derived from the same `schedule()` the picture uses, so a change to
   any beat length moves the music with it. Nothing here restates a timing.

   Shape:
     drone        one continuous tanpura-ish Sa under all of it
     opening      no pulse at all — ink, and one plucked note per beat
     empires      a tabla pulse enters on Indus and tightens through three gears,
                  vilambit -> madhya -> drut, so the acceleration is *heard* and not
                  only seen; one plucked note per empire climbing the scale
     lockup       the pulse stops dead, a riser, a struck bell, and a return to Sa
*/

/* Applied to the rendered score before it is encoded. The synth chain has a
   compressor but no limiter, so a loud cue can still reach full scale; this keeps
   true peak at -1 dBFS no matter how the cue gains are later tuned. Defined once
   so the audio-only report and the muxed master measure the same thing. */
export const MASTER_AF = 'alimiter=limit=0.891:attack=5:release=60:level=false';

/* Strokes per beat. Beats already shorten 6.4s -> 3.4s, so a fixed count would
   accelerate on its own; stepping the count up three times as well turns a gradual
   drift into three audible gear changes, which is how a tabla piece actually moves
   through laya. */
function strokesFor(e, n) {
  const u = e / Math.max(1, n - 1);
  if (u < 0.5) return 4;
  if (u < 0.75) return 5;
  return 6;
}

export function buildScore(sched, total) {
  const cues = [];
  const cue = (t, voice, opts = {}) => cues.push({ t: +Math.max(0, t).toFixed(3), voice, ...opts });

  const empires = sched.filter((s) => s.era.num);
  const opening = sched.filter((s) => !s.era.num);
  const first = sched[0];
  const last = sched[sched.length - 1];
  const end = last.start + last.dur;          // picture ends, lockup begins
  const n = empires.length;

  /* The build is made by starting quiet rather than by ending loud: the master
     chain compresses above -16 dBFS, so pushing the finish up only squashes it.
     Measured short-term loudness runs ~-24 LUFS at Indus to ~-17 at the Republic. */
  const ramp = (e, lo, hi) => lo + (hi - lo) * (e / Math.max(1, n - 1));

  // ── the bed ─────────────────────────────────────────────────────────────
  // three overlapping drones rather than one, so the tonic thickens in two steps
  // that land with the tabla gear changes instead of sitting flat for 40 seconds
  cue(0, 'drone', { dur: end + 1.4, gain: 0.17 });
  if (n > 4) cue(empires[Math.floor(n * 0.5)].start, 'drone', { dur: end - empires[Math.floor(n * 0.5)].start + 1.4, gain: 0.1, attack: 5 });
  if (n > 8) cue(empires[Math.floor(n * 0.75)].start, 'drone', { dur: end - empires[Math.floor(n * 0.75)].start + 1.4, gain: 0.11, attack: 4 });

  // ── the opening: no pulse, so the procession has something to arrive into ──
  cue(first.start + 0.25, 'scratch', { gain: 0.055, dur: 1.4 });
  opening.forEach((s, i) => {
    if (i) cue(s.start, 'scratch', { gain: 0.04, dur: 1.1 });
    cue(s.labelIn - 0.12, 'pluck', { step: i * 2, gain: 0.2, dur: 4.2 });
  });

  // ── the empires ─────────────────────────────────────────────────────────
  empires.forEach((s, e) => {
    const strokes = strokesFor(e, n);
    const gap = s.dur / strokes;
    for (let k = 0; k < strokes; k++) {
      const t = s.start + k * gap;
      if (t >= end - 0.05) break;
      const accent = k === 0;
      cue(t, 'tabla', {
        // the downbeat is the low drum, the rest are the higher head
        freq: accent ? 131 : 196,
        gain: accent ? ramp(e, 0.19, 0.34) : ramp(e, 0.09, 0.18),
        dur: accent ? 0.62 : 0.34,
        slap: accent ? 0.35 : 0.5,
      });
    }
    // one note per empire, climbing — twelve steps is nearly two octaves
    cue(s.labelIn - 0.1, 'pluck', { step: e, gain: ramp(e, 0.17, 0.28), dur: Math.min(4, s.dur + 0.6) });
  });

  // ── the lockup ──────────────────────────────────────────────────────────
  // the drone starts before the bell so it is already at level underneath it
  cue(end - 2.4, 'drone', { dur: (total - end) + 2.4, gain: 0.22, attack: 1.5, release: 3.4 });
  cue(end - 1.7, 'riser', { dur: 1.7, gain: 0.13 });
  cue(end, 'strike', { gain: 0.66 });
  cue(end + 0.55, 'pluck', { step: 0, gain: 0.22, dur: 4.4 });

  return cues.sort((a, b) => a.t - b.t);
}

/* ── v5: the same procession, played rather than counted ────────────────────

   The v4 pulse was one drum striking a uniform grid whose spacing was derived from
   the picture beats. It accelerated correctly and still read as a metronome, because
   nothing about it varied except speed, and its three gear changes fell wherever the
   edit happened to put them.

   This replaces it with how the instrument is actually played:

   - a theka of bols on two drums, so the groove comes from *which drum speaks when*
     rather than from spacing alone;
   - one steady grid of its own that accelerates smoothly, ignoring the picture cuts
     it used to be chained to — music running on its own clock against the edit is
     what makes an edit feel scored rather than counted;
   - one dugun, a clean doubling of density, placed deliberately on an empire rather
     than three arbitrary gear changes;
   - a tihai to finish: a phrase three times over, landing its last stroke exactly on
     the bell.

   A bansuri answers the sitar every second empire, so the long middle has a melody
   over it instead of forty seconds of drum and drone. */

const SA = 65.41;
const SCALE = [0, 3, 5, 7, 10, 12, 15, 19];
const note = (step, mul) => SA * mul
  * Math.pow(2, (SCALE[step % SCALE.length] + 12 * Math.floor(step / SCALE.length)) / 12);

/* Keherwa, eight matras. `dha` is both drums together, `ge` is bass alone,
   `na`/`tin`/`ta` are the treble, `ke` is the bass choked. */
const THEKA = ['dha', 'ge', 'na', 'tin', 'na', 'ke', 'dhin', 'na'];

function emitBol(cue, bol, t, v) {
  switch (bol) {
    case 'dha':
      cue(t, 'baya', { gain: 0.32 * v, dur: 0.8 });
      cue(t, 'daya', { gain: 0.24 * v, freq: 330, dur: 0.55, open: true });
      break;
    case 'dhin':
      cue(t, 'baya', { gain: 0.26 * v, dur: 0.7, bend: 0.42 });
      cue(t, 'daya', { gain: 0.2 * v, freq: 330, dur: 0.4, open: true });
      break;
    case 'ge': cue(t, 'baya', { gain: 0.28 * v, dur: 0.72 }); break;
    case 'ke': cue(t, 'baya', { gain: 0.17 * v, dur: 0.2, damp: true }); break;
    case 'na': cue(t, 'daya', { gain: 0.2 * v, freq: 330, dur: 0.42, open: true }); break;
    case 'tin': cue(t, 'daya', { gain: 0.17 * v, freq: 392, dur: 0.3, open: true, slap: 0.5 }); break;
    case 'ta': cue(t, 'daya', { gain: 0.16 * v, freq: 330, dur: 0.18, open: false }); break;
    default: break;
  }
}

export function buildProcession(sched, total, opt = {}) {
  /* Defaults reproduce what v5 shipped with, bit for bit. The corrections below came
     out of an actual listen and are opt-in through the `procession2` key, because
     retuning a score a version has already been approved with is not a fix. */
  const { refined = false, finalLift = 0 } = opt;
  const cues = [];
  const cue = (t, voice, opts = {}) => cues.push({ t: +Math.max(0, t).toFixed(3), voice, ...opts });

  /* A sequence is either an unnumbered opening followed by a numbered procession —
     the empires cut — or numbered the whole way, which is what a single-kingdom
     sequence looks like when every beat is one of its aspects. The drum still needs
     something to arrive into, so when there is no opening section the first beat
     becomes one: drone and pluck alone, and the theka enters on beat two. */
  const numbered = sched.filter((s) => s.era.num);
  const unnumbered = sched.filter((s) => !s.era.num);
  const hasOpening = unnumbered.length > 0;
  const opening = hasOpening ? unnumbered : numbered.slice(0, 1);
  const empires = hasOpening ? numbered : numbered.slice(1);
  if (!empires.length) return buildScore(sched, total);

  const first = sched[0];
  const last = sched[sched.length - 1];
  const end = last.start + last.dur;
  const n = empires.length;

  const t0 = empires[0].start;
  const span = end - t0;
  const M0 = 0.62;                       // matra at the entry — the spacing that worked
  const M1 = 0.34;                       // matra at the finish
  /* Linear tightening spends its acceleration early and coasts through the last third,
     which is exactly where a blind listen said the piece plateaus. A convex curve holds
     the opening laya longer and does most of the tightening near the finish. */
  const ease = (u) => (refined ? Math.pow(u, 1.4) : u);
  const matraAt = (t) => M0 + (M1 - M0) * ease(Math.min(1, Math.max(0, (t - t0) / span)));
  const dugunAt = empires[Math.min(n - 1, Math.round(n * 0.5))].start;

  // ── the bed ─────────────────────────────────────────────────────────────
  cue(0, 'drone', { dur: end + 1.4, gain: 0.17 });
  cue(empires[Math.floor(n * 0.5)].start, 'drone',
    { dur: end - empires[Math.floor(n * 0.5)].start + 1.4, gain: 0.1, attack: 5 });
  cue(empires[Math.floor(n * 0.75)].start, 'drone',
    { dur: end - empires[Math.floor(n * 0.75)].start + 1.4, gain: 0.11, attack: 4 });

  // ── the opening: still no drum, so the procession has something to arrive into ──
  cue(first.start + 0.25, 'scratch', { gain: 0.055, dur: 1.4 });
  opening.forEach((s, i) => {
    if (i) cue(s.start, 'scratch', { gain: 0.04, dur: 1.1 });
    cue(s.labelIn - 0.12, 'pluck', { step: i * 2, gain: 0.2, dur: 4.2 });
  });
  cue(opening[opening.length - 1].labelIn + 0.3, 'bansuri',
    { freq: note(2, 4), dur: 3.4, gain: 0.1, meend: 2 });

  // ── the theka ───────────────────────────────────────────────────────────
  /* A tihai is one phrase played three times, arranged so the *final* stroke lands on
     sam. The old form ended on the third repetition's own last stroke — `tin`, an
     unaccented treble tap — which is why the piece stopped rather than resolved. The
     closing stroke is now the sam itself, struck hardest, under the bell. */
  const PHRASE = ['dha', 'na', 'tin'];
  const tihaiLen = refined ? PHRASE.length * 3 + 1 : 9;
  const tihaiFrom = end - (tihaiLen - 1) * M1 - 0.02;
  let t = t0;
  let i = 0;
  let bol = 0;
  let step = 2;
  while (t < tihaiFrom) {
    const m = matraAt(t);
    /* Half density until the dugun, full after — one deliberate doubling. Two things
       were wrong with it. It was taken the instant an empire began, landing mid-cycle,
       which reads as a slip rather than a gear change. And at half density the loop
       emitted every *other* bol of the theka — dha ge na tin na ke dhin na became
       dha na na dhin, a different pattern rather than the same one at half speed. The
       phrase index now advances per struck bol, so Keherwa stays Keherwa and the dugun
       genuinely doubles its tempo, at the top of a cycle. */
    if (refined) {
      if (step === 2 && t >= dugunAt && bol % THEKA.length === 0) step = 1;
    } else {
      step = t < dugunAt ? 2 : 1;
    }
    if (i % step === 0) {
      const u = (t - t0) / span;
      /* The linear velocity ramp plateaus through the last third — the piece stops
         growing before it ends. An extra push over the closing third makes the finish
         arrive instead of merely stopping. */
      const lift = finalLift && u > 0.62 ? finalLift * ((u - 0.62) / 0.38) : 0;
      emitBol(cue, THEKA[(refined ? bol : i) % THEKA.length], t, 0.72 + 0.5 * u + lift);
      bol++;
    }
    t += m;
    i++;
  }

  for (let k = 0; k < tihaiLen; k++) {
    const at = end - (tihaiLen - 1 - k) * M1;
    if (refined) {
      const sam = k === tihaiLen - 1;
      emitBol(cue, sam ? 'dha' : PHRASE[k % PHRASE.length], at,
        sam ? 1.75 : (k % PHRASE.length === 0 ? 1.3 : 0.98));
    } else {
      const head = k % 3 === 0;
      emitBol(cue, head ? 'dha' : (k % 3 === 1 ? 'na' : 'tin'), at, head ? 1.35 : 1.0);
    }
  }

  // ── melody over the procession ──────────────────────────────────────────
  /* A two-beat stinger leaves exactly one empire, and e/(n-1) is then 0/0. The gain
     reaches Web Audio as NaN and that voice silently drops out of the mix. buildScore
     already guards this; buildProcession did not. */
  const u = (e) => e / Math.max(1, n - 1);
  empires.forEach((s, e) => {
    cue(s.labelIn - 0.1, 'pluck',
      { step: e, gain: 0.16 + 0.09 * u(e), dur: Math.min(4, s.dur + 0.6) });
    /* The flute answers every second empire, so the two lines trade rather than stack —
       except over the closing stretch, where answering every beat is what stops the
       melody looping in place while the drum is still climbing. */
    if (e % 2 === 1 || (finalLift && e >= n - 3)) {
      cue(s.labelIn + s.dur * 0.34, 'bansuri', {
        freq: note(2 + Math.floor(e / 2), 4),
        dur: Math.min(3.6, s.dur + 1.1),
        gain: 0.09 + 0.05 * u(e),
        meend: e % 4 === 1 ? 2 : 0,
      });
    }
  });

  // ── the lockup ──────────────────────────────────────────────────────────
  cue(end - 2.4, 'drone', { dur: (total - end) + 2.4, gain: 0.22, attack: 1.5, release: 3.4 });
  cue(end - 1.7, 'riser', { dur: 1.7, gain: 0.12 });
  cue(end, 'strike', { gain: 0.66 });
  cue(end + 0.35, 'bansuri', { freq: note(0, 4), dur: 4.2, gain: 0.13, meend: 3 });
  cue(end + 0.55, 'pluck', { step: 0, gain: 0.2, dur: 4.4 });

  return cues.sort((a, b) => a.t - b.t);
}

/* Scores are keyed so an older version keeps the score it shipped with. Changing
   the procession must not retune v4 — or v5, which is why the corrections that came
   out of an actual listen live under a new key rather than in the old one. */
export const SCORES = {
  standard: buildScore,
  procession: buildProcession,
  procession2: (s, t) => buildProcession(s, t, { refined: true, finalLift: 0.3 }),
};

