/* The underscore — music that does not stop when the titles do.

   The sample episode had a 61-second score and then five and a half minutes of dry
   narration over silence. That silence is the single largest retention leak in the
   cut: a viewer who has just been handed a scored, designed title sequence hears the
   audio world collapse the moment the story starts, and reads it as the video being
   over.

   This is the opposite of the title score. That one is *foreground* — it accelerates,
   it has gear changes, it is meant to be noticed. This one must never be noticed. It
   has three rules:

     1. It plays in the gaps. Panel boundaries are known exactly, so melodic phrases
        are placed where the narrator is between lines rather than under a sentence.
     2. It never repeats on a period a listener can hear. Phrase spacing is driven by
        an irrational step so no two-minute stretch rhymes with another.
     3. It is quiet by construction, not by ducking. Sidechain compression is applied
        as well (see render-episode.mjs), but a bed that only works because it is
        being squashed sounds like a bed being squashed.

   Voices come from src/audio.js, the same synth as the title score, so the episode
   sounds like it belongs to the sequence that opened it.
*/

const SCALE = [0, 3, 5, 7, 10, 12, 15, 19];   // matches src/audio.js
const SA = 174.61;                            // F3, the tonic the drone sits on

const hz = (step) => SA * Math.pow(2, SCALE[((step % SCALE.length) + SCALE.length) % SCALE.length] / 12)
  * Math.pow(2, Math.floor(step / SCALE.length));

/* Moods that earn a pulse. Everything else stays on drone and flute — a pulse under
   an expository line makes the line feel hurried, which is the opposite of the job. */
const PULSED = new Set(['tension', 'action', 'triumph', 'conflict', 'danger', 'urgent']);

/**
 * @param {{id:string,start:number,dur:number,mood?:string|null}[]} panels
 *        the narration schedule, in order, in seconds
 * @param {number} total  seconds of bed to write
 * @param {number} lift   overall gain multiplier for the bed
 *
 * `lift` exists because the first mix paired these gains with an aggressive duck and the
 * bed measured ~28 dB under the narration — present in the file, inaudible on a phone.
 * The shape of the cue list was right; only its level was wrong, so the level is a
 * parameter rather than six edited constants.
 */
export function buildUnderscore(panels, total, lift = 0.6, pageTurn = false) {
  const cues = [];
  const cue = (t, voice, opts = {}) => {
    if (t < 0 || t >= total) return;
    if (opts.gain != null) opts = { ...opts, gain: +(opts.gain * lift).toFixed(4) };
    cues.push({ t: +t.toFixed(3), voice, ...opts });
  };

  // ── the drone ───────────────────────────────────────────────────────────
  /* One continuous tonic, laid down as overlapping 26-second segments because the
     voice's own release is 3.2s and a single cue that long would thin out. Each
     segment is re-attacked under the tail of the last, so the seam is inaudible. */
  const SEG = 24;
  for (let t = 0; t < total; t += SEG - 4) {
    cue(t, 'drone', { dur: Math.min(SEG, total - t) + 3, gain: 0.052, attack: 5, release: 4.5 });
  }
  /* A second drone a fifth up, entering a third of the way in and leaving before the
     end, so the harmony opens once across the episode without ever announcing it. */
  const fifthIn = total * 0.34;
  for (let t = fifthIn; t < total * 0.82; t += SEG - 4) {
    cue(t, 'drone', { dur: Math.min(SEG, total * 0.82 - t) + 3, gain: 0.03, attack: 7, release: 6 });
  }

  // ── flute phrases, placed in the gaps between lines ──────────────────────
  /* Panel boundaries are the only reliable silence in the track. Phrases start ~0.35s
     after a panel ends so they bloom into the pause and are already decaying by the
     time the next line begins. Spacing walks forward by an irrational multiple of the
     mean panel so the pattern never lines up with the picture twice. */
  const GAP_MIN = 15.5;
  let next = 12;
  let step = 4;
  let dir = 1;
  const phrases = [];
  for (let i = 0; i < panels.length; i++) {
    const boundary = panels[i].start + panels[i].dur;
    if (boundary < next || boundary > total - 6) continue;

    /* a three-note descent or ascent, not a tune — enough shape to register as music
       and not enough to become a melody the viewer starts following */
    const notes = [step, step + dir * 2, step + dir];
    notes.forEach((s, k) => {
      cue(boundary + 0.35 + k * 0.62, 'bansuri', {
        freq: hz(s),
        dur: k === notes.length - 1 ? 3.4 : 1.5,
        gain: k === 0 ? 0.055 : 0.042,
        meend: k === notes.length - 1 ? -0.4 : 0,
        breath: 0.62,
      });
    });
    phrases.push(+boundary.toFixed(1));

    next = boundary + GAP_MIN * (1 + ((i * 0.618) % 1) * 0.9);
    step += dir;
    if (step > 9) { dir = -1; step = 9; }
    if (step < 1) { dir = 1; step = 1; }
  }

  // ── pulse, only where the story is moving ───────────────────────────────
  /* Not a groove. One low baya every four seconds or so, so a tense stretch acquires
     a heartbeat the viewer feels rather than hears. It fades in over the first stroke
     pair and stops at the panel edge, so it can never bleed into a quiet line. */
  let pulsed = 0;
  for (const p of panels) {
    if (!PULSED.has(String(p.mood || '').toLowerCase())) continue;
    const gap = 3.9;
    const n = Math.floor((p.dur - 1) / gap);
    if (n < 2) continue;
    for (let k = 0; k < n; k++) {
      cue(p.start + 0.8 + k * gap, 'baya', {
        freq: 82,
        gain: 0.055 * Math.min(1, (k + 1) / 2),
        dur: 1.1,
        bend: 0.6,
      });
    }
    pulsed++;
  }

  // ── the close ───────────────────────────────────────────────────────────
  /* The bed must resolve rather than be cut off, or the end card lands on a dead
     stop. The tonic swells slightly, one struck bell, and a long release. */
  cue(total - 7.5, 'drone', { dur: 8.6, gain: 0.075, attack: 3, release: 5 });
  cue(total - 5.4, 'bansuri', { freq: hz(7), dur: 4.2, gain: 0.06, meend: -0.5, breath: 0.55 });
  cue(total - 2.6, 'strike', { gain: 0.16 });

  /* ── page turns ──────────────────────────────────────────────────────────
     A page turning silently is a rectangle rotating. The sound is what makes it paper, so it
     is scheduled here, on the panel boundaries, from the same timeline the picture uses —
     rather than as an effect fired near the transition and hoped to line up.

     It sits outside the `lift` scaling every other cue goes through. The bed is deliberately
     quiet because it plays under speech; this is a foreground sound that has to be heard over
     the same speech, and scaling it with the bed would bury it. */
  if (pageTurn) {
    for (const p of panels.slice(1)) cues.push({ t: +p.start.toFixed(3), voice: 'page', gain: 0.5, dur: 0.92 });
  }

  cues.sort((a, b) => a.t - b.t);
  return { cues, phrases, pulsed, turns: pageTurn ? Math.max(0, panels.length - 1) : 0 };
}
