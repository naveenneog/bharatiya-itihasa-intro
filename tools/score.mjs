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
