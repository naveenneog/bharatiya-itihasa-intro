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
  return spec(
    `:measured_I=${m.input_i}:measured_TP=${m.input_tp}`
    + `:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}`
    + `${m.target_offset !== undefined ? `:offset=${m.target_offset}` : ''}`
    + ':linear=true:print_format=summary',
  );
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
  if (tp > -0.5) throw new Error(`true peak ${tp.toFixed(1)} dBTP will clip on re-encode`);
  return { i, tp };
}
