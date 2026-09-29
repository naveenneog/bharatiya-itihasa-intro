/* Checks that a rendered Short shows each line over the take its plan chose for that line.

   Written after all six feed-format Shorts of 24–28 Sep turned out to have been cut from the
   wrong clips (see the note at the picture stage in short.mjs). That bug was invisible in every
   check the pipeline had: each clip was a real take of the right story, the durations were
   right, and a frame looked like a Short. Only comparing the picture under a line with the take
   planned for it shows the difference.

   For each line: one frame from the render at the middle of that line, and one frame from every
   take in short-clips/ at the same offset into the take (each take is trimmed from its start, so
   the offsets agree). Both are reduced to small grey images and compared by correlation, which
   ignores the scrim, vignette and grade laid over the picture. The planned take must be the
   best match. Beat timing is recomputed from the voice files exactly as short.mjs lays it out,
   so run this against a render made from the current audio.

     node tools/short-verify.mjs --slug zero --era gupta
     node tools/short-verify.mjs --slug zero --era gupta --file dist/gupta/zero_short/zero-short.mp4

   Exit 0 when every line matches its planned take, 1 otherwise. */
import { readFile, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { seconds as mp3Seconds } from './voice.mjs';

const execFileP = promisify(execFile);
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const SLUG = arg('slug', null);
const ERA = arg('era', null);
if (!SLUG || !ERA) { console.error('usage: node tools/short-verify.mjs --slug <slug> --era <era> [--file <render.mp4>]'); process.exit(1); }
const EP = path.join('episodes', SLUG);
const FILE = arg('file', path.join('dist', ERA, `${SLUG}_short`, `${SLUG}-short.mp4`));

const script = JSON.parse(await readFile(path.join(EP, 'short.json'), 'utf8'));
const done = JSON.parse(await readFile(path.join(EP, 'short-shots.json'), 'utf8'));
const takes = (await readdir(path.join(EP, 'short-clips'))).filter((f) => f.endsWith('.mp4')).sort();

/* Same arithmetic as short.mjs: the line's voice plus a held beat, 0.55 s after the hook and
   0.30 s after the others, rounded to the millisecond. */
const beats = [];
let at = 0;
for (const [i] of script.lines.entries()) {
  const say = await mp3Seconds(path.join(EP, 'short-audio', `${String(i).padStart(2, '0')}.mp3`));
  const dur = +(say + (i === 0 ? 0.55 : 0.30)).toFixed(3);
  beats.push({ i, start: at, dur });
  at += dur;
}

const SIZE = [36, 64];
async function grey(file, t) {
  const { stdout } = await execFileP('ffmpeg', ['-v', 'error', '-ss', t.toFixed(3), '-i', file, '-frames:v', '1',
    '-vf', `scale=360:640:force_original_aspect_ratio=increase,crop=360:640,scale=${SIZE[0]}:${SIZE[1]},format=gray`,
    '-f', 'rawvideo', '-'], { encoding: 'buffer', maxBuffer: 1 << 20 });
  if (stdout.length !== SIZE[0] * SIZE[1]) throw new Error(`no frame from ${file} at ${t.toFixed(2)} s`);
  return stdout;
}
function corr(a, b) {
  const n = a.length; let ma = 0; let mb = 0;
  for (let k = 0; k < n; k++) { ma += a[k]; mb += b[k]; }
  ma /= n; mb /= n;
  let sab = 0; let saa = 0; let sbb = 0;
  for (let k = 0; k < n; k++) { const x = a[k] - ma; const y = b[k] - mb; sab += x * y; saa += x * x; sbb += y * y; }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0;
}

console.log(`${FILE}\n  ${beats.length} lines, ${takes.length} takes on disk\n`);
let bad = 0;
for (const b of beats) {
  const mid = b.dur / 2;
  const frame = await grey(FILE, b.start + mid);
  const scored = [];
  for (const t of takes) scored.push({ t, r: corr(frame, await grey(path.join(EP, 'short-clips', t), mid)) });
  scored.sort((x, y) => y.r - x.r);
  const want = done.clips[b.i];
  const ok = scored[0].t === want;
  if (!ok) bad++;
  const mine = scored.find((s) => s.t === want);
  console.log(`  line ${b.i + 1}  ${ok ? 'ok      ' : 'MISMATCH'}  best ${scored[0].t} (r=${scored[0].r.toFixed(2)})`
    + `${ok ? `, next ${scored[1]?.t} (r=${scored[1]?.r.toFixed(2)})` : `; planned ${want} (r=${mine ? mine.r.toFixed(2) : 'n/a'})`}`);
}
console.log(`\n  ${bad ? `${bad} of ${beats.length} lines show the wrong take` : `every line shows its planned take`}`);
/* Recorded beside the render, against the render's own mtime, so a later render is not taken
   as verified by an earlier pass (tools/remake-queue.mjs reads it). */
if (!arg('file', null)) {
  const { stat, writeFile } = await import('node:fs/promises');
  const s = await stat(FILE);
  await writeFile(path.join(path.dirname(FILE), 'verify.json'),
    `${JSON.stringify({ ok: !bad, bad, lines: beats.length, mp4MtimeMs: s.mtimeMs, at: new Date().toISOString() }, null, 2)}\n`);
}
process.exit(bad ? 1 : 0);
