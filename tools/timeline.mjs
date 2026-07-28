/* The one clock.

   Both the browser player (build-version.mjs) and the offline master render
   (render-master.mjs) import this. When the timing lived in the player only, the
   renderer had to restate it, and any edit to one silently desynced the other —
   so the schedule is computed here and nowhere else.
*/
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

export const XF = 0.62;        // crossfade between beats
export const TAIL = 5.2;       // wordmark hold after the last beat

/** Actual encoded length of a clip, so in-points are computed rather than assumed. */
export async function clipSeconds(file) {
  try {
    const { stdout } = await execFileP('ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
    const n = parseFloat(stdout.trim());
    return Number.isFinite(n) ? n : 4;
  } catch { return 4; }
}

/* Lay the beats out on one clock.

   Beats may each have their own duration (the empires sequence accelerates from
   5.6s to 3.4s), so the schedule is computed here rather than assumed uniform in
   the browser. Each beat overlaps its predecessor by one crossfade.

   The in-point centres the beat inside its clip: an 8s take shown for 3.4s should
   use the middle, where the ink is actually moving, not the first 3.4s where it has
   barely left the reference frame. */
export function schedule(beats) {
  let t = 0;
  return beats.map((b) => {
    const dur = b.dur ?? 4;
    // the clip must cover the beat plus the crossfade that runs off its tail
    const need = dur + XF;
    const seek = Math.max(0, (b.clipLen - need) / 2);
    const row = {
      clip: b.clip,
      start: +t.toFixed(3),
      dur: +dur.toFixed(3),
      seek: +seek.toFixed(3),
      // the label has to ride most of the beat — it is the only thing carrying meaning
      labelIn: +(t + Math.min(0.52, dur * 0.16)).toFixed(3),
      labelOut: +(t + dur - 0.62).toFixed(3),
      era: b.era,
    };
    t += dur - XF;
    return row;
  });
}

/** Wall-clock length of the finished sequence, including the wordmark hold. */
export function totalSeconds(sched) {
  const last = sched[sched.length - 1];
  return last.start + last.dur + TAIL;
}
