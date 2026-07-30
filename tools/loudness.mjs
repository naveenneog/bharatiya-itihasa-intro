/* Loudness normalisation to the streaming target.

   YouTube normalises to roughly -14 LUFS integrated, but it only ever *attenuates*
   a loud upload — it will not lift a quiet one. A master delivered at -18 LUFS
   therefore plays several dB under every other video in the feed, which on a phone
   at half volume reads as "this one is broken" and costs the retention the first
   thirty seconds were built to win.

   ffmpeg's loudnorm is only accurate in two passes: pass one measures, pass two
   corrects with those measurements pinned and `linear=true`, which applies a single
   gain rather than riding the level and squashing the dynamics the score depends on.

     const m = await measure('score.wav');
     const af = normaliseFilter(m);            // -> loudnorm=...:linear=true
*/
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

export const TARGET_I = -14;    // LUFS integrated, the streaming reference
/* Asking for -1.0 lands the delivered file around -0.6 dBTP, because loudnorm's ceiling
   is applied to its own estimate and the AAC encode adds a little back. Asking for -1.5
   leaves the master where it was meant to be with room for the platform's re-encode. */
export const TARGET_TP = -1.5;  // dBTP ceiling
export const TARGET_LRA = 11;   // LU, loudnorm's default range

/* ...and then a real limiter, because loudnorm's ceiling is an estimate and estimates
   scatter. Two renders of identical audio came out at -0.75 and -1.21 dBTP — same content,
   same filter, half a dB apart. That is normally harmless, but it straddled the threshold
   the retention scorer uses, so the same episode scored 73 or 78 depending on which side of
   the coin-flip it landed. A comparison between two versions was measuring luck.

   The ceiling is -1.6 rather than -1.2 because alimiter works on sample peak while the
   measurement is intersample: a signal limited to -1.2 dBFS can still read above -1 dBTP once
   the reconstruction filter is applied, and a track full of fast broadband transients — page
   turns — did exactly that, landing at -0.1. The extra 0.4 dB is the overshoot allowance.

   `level=disabled` matters: without it alimiter normalises upward as well, which would undo
   the integrated loudness loudnorm just set. */
export const CEILING = -1.6;
const LIMITER = `alimiter=limit=${CEILING}dB:level=disabled`;

const spec = (extra = '') =>
  `loudnorm=I=${TARGET_I}:TP=${TARGET_TP}:LRA=${TARGET_LRA}${extra}`;

/** Pass one: measure a file's true loudness. Returns loudnorm's JSON block. */
export async function measure(file) {
  const { stderr } = await execFileP('ffmpeg', [
    '-v', 'info', '-nostats', '-i', file,
    '-af', spec(':print_format=json'),
    '-f', 'null', '-',
  ], { maxBuffer: 1 << 24 });

  // loudnorm prints the JSON at the very end of stderr
  const start = stderr.lastIndexOf('{');
  const end = stderr.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error(`loudnorm printed no measurement for ${file}`);
  const m = JSON.parse(stderr.slice(start, end + 1));

  for (const k of ['input_i', 'input_tp', 'input_lra', 'input_thresh']) {
    if (m[k] === undefined) throw new Error(`loudnorm measurement missing ${k}`);
  }
  return m;
}

/** Pass two: the corrective filter, with the pass-one numbers pinned.

    loudnorm refuses to run linear when the required gain would push true peak past
    the ceiling; it falls back to dynamic mode on its own, so `linear=true` is a
    preference rather than a promise and is always safe to ask for. */
export function normaliseFilter(m) {
  return `${spec(
    `:measured_I=${m.input_i}:measured_TP=${m.input_tp}`
    + `:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}`
    + `${m.target_offset !== undefined ? `:offset=${m.target_offset}` : ''}`
    + ':linear=true:print_format=summary',
  )},${LIMITER}`;
}

/** Measure, then report what the correction will do. Returns the pass-two filter. */
export async function normaliseTo(file, label = 'audio') {
  const m = await measure(file);
  const gain = (TARGET_I - Number(m.input_i)).toFixed(1);
  console.log(`  ${label}: ${Number(m.input_i).toFixed(1)} LUFS, peak ${Number(m.input_tp).toFixed(1)} dBTP`
    + ` -> ${TARGET_I} LUFS (${gain > 0 ? '+' : ''}${gain} dB)`);
  return normaliseFilter(m);
}

/** Verify a finished file actually landed on target. Throws if it is more than
    `tol` LU away, because a silently-quiet master is the exact bug this prevents. */
export async function assertLoudness(file, tol = 1.0) {
  const m = await measure(file);
  const i = Number(m.input_i);
  const tp = Number(m.input_tp);
  const off = Math.abs(i - TARGET_I);
  console.log(`  measured: ${i.toFixed(1)} LUFS, true peak ${tp.toFixed(1)} dBTP`);
  if (off > tol) throw new Error(`master is ${i.toFixed(1)} LUFS, wanted ${TARGET_I} +/- ${tol}`);
  /* The limiter guarantees the ceiling, so anything above it means the limiter did not run
     — worth failing on rather than shipping a master that clips after the platform's
     re-encode. The slack is for measurement noise, not for headroom. */
  if (tp > -0.9) throw new Error(`true peak ${tp.toFixed(1)} dBTP — the limiter did not take effect`);
  return { i, tp };
}
