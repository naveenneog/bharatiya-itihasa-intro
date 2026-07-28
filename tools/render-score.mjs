/* Render just the score to a WAV and report what it actually sounds like, measured.

   The picture takes minutes to composite; the score needs many more passes than that.
   This renders the cue list alone through the page's OfflineAudioContext and prints an
   EBU R128 profile, so the shape of the piece can be judged — build, peak, release —
   without re-encoding a frame.

     node tools/render-score.mjs v3-empires
     node tools/render-score.mjs v3-empires --out dist/score.wav
*/
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { launch } from '../scripts/browser.mjs';
import { DIRECTIONS } from './directions.mjs';
import { clipSeconds, schedule, totalSeconds } from './timeline.mjs';
import { MASTER_AF } from './score.mjs';

const execFileP = promisify(execFile);
const ROOT = 'versions';
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const PORT = Number(flag('port', '4398'));
const VARIANT = flag('variant', 'default');
const BUILD = VARIANT === 'default' ? 'build' : `build-${VARIANT}`;

const flagIdx = new Set();
argv.forEach((a, i) => { if (a.startsWith('--')) { flagIdx.add(i); flagIdx.add(i + 1); } });
const filter = argv.filter((_, i) => !flagIdx.has(i));

const dir = DIRECTIONS.find((d) => filter.some((f) => d.id.includes(f)));
if (!dir) { console.error('usage: node tools/render-score.mjs <version-id>'); process.exit(1); }

const out = flag('out', path.join('dist', `${dir.id}-${VARIANT}-score.wav`));
const raw = out.replace(/\.wav$/, '-raw.wav');
await mkdir(path.dirname(out), { recursive: true });

const beats = [];
for (const b of dir.beats) {
  beats.push({ ...b, clipLen: await clipSeconds(path.join(ROOT, dir.id, 'clips', `${b.id}-r1.mp4`)) });
}
const total = totalSeconds(schedule(beats));

const server = spawn(process.execPath, ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' });
try {
  await new Promise((r) => setTimeout(r, 700));
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/${ROOT}/${dir.id}/${BUILD}/index.html?export=1&layer=scrim`,
    { waitUntil: 'load' });
  await page.waitForFunction(() => window.__seq && window.__seq.CUES, { timeout: 20000 });

  const { b64, cues } = await page.evaluate(async (d) => {
    const bytes = await window.__seq.renderWav(window.__seq.CUES, d);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { b64: btoa(s), cues: window.__seq.CUES.length };
  }, total + 0.4);
  await browser.close();

  await writeFile(raw, Buffer.from(b64, 'base64'));
  // master through the same limiter the muxed video uses, so this report is the deliverable
  await execFileP('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af', MASTER_AF, out]);
  console.log(`${dir.id}: ${cues} cues, ${total.toFixed(1)}s -> ${out}\n`);

  // measured, because a score that cannot be heard here still has to be right
  const { stderr } = await execFileP('ffmpeg',
    ['-hide_banner', '-nostats', '-i', out, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
    { maxBuffer: 1 << 26 }).catch((e) => e);

  const pts = [...stderr.matchAll(/t:\s*([\d.]+)\s+.*?M:\s*(-?[\d.]+)/g)]
    .map((m) => ({ t: +m[1], m: +m[2] })).filter((p) => Number.isFinite(p.m) && p.m > -70);
  const buckets = new Map();
  for (const p of pts) {
    const k = Math.floor(p.t / 5) * 5;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(p.m);
  }
  for (const [k, v] of [...buckets].sort((a, b) => a[0] - b[0])) {
    const avg = v.reduce((a, b) => a + b, 0) / v.length;
    console.log(`${String(k).padStart(3)}s ${avg.toFixed(1).padStart(6)} LUFS  ${'#'.repeat(Math.max(0, Math.round(avg + 40)))}`);
  }
  const tail = stderr.slice(stderr.lastIndexOf('Integrated loudness'));
  console.log('\n' + tail.split('\n').filter((l) => /I:|LRA:|Peak:/.test(l)).join('\n'));
} finally {
  try { server.kill(); } catch { /* already gone */ }
}
