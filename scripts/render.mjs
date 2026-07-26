/* render.mjs — deterministic frame-accurate export.

   The timeline is scrubbed, not played: for each frame we set tl.time(n/fps), wait for
   a paint, and grab the pixels. Nothing depends on wall-clock speed, so the render is
   identical on any machine and never drops a frame. The sting is rendered separately
   through an OfflineAudioContext from the very same cue list and muxed in by ffmpeg.

   node scripts/render.mjs [--fps 60] [--scale 1] [--out dist/itihasa-intro.mp4] [--silent]
*/
import { launch } from './browser.mjs';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes('--' + k);

const FPS = Number(arg('fps', 60));
const SCALE = Number(arg('scale', 1));
const URL = arg('url', 'http://localhost:4321/index.html?export=1');
const OUT = path.resolve(arg('out', 'dist/itihasa-intro.mp4'));
const TMP = path.resolve('dist/.frames');

const run = (cmd, args) => new Promise((res, rej) => {
  const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', (d) => { err += d; });
  p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${cmd} exited ${c}\n${err.slice(-2500)}`))));
  p.on('error', rej);
});

await rm(TMP, { recursive: true, force: true });
await mkdir(TMP, { recursive: true });
await mkdir(path.dirname(OUT), { recursive: true });

const browser = await launch();
const page = await browser.newPage({
  viewport: { width: Math.round(1920 * SCALE), height: Math.round(1080 * SCALE) },
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference',
});
const problems = [];
page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
page.on('pageerror', (e) => problems.push('PAGEERROR ' + e.message));

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => window.__intro?.duration > 0, null, { timeout: 30000 });

// Guard: viewer chrome must never end up in a master. Fail loudly rather than
// spending half an hour rendering 1752 frames with buttons burnt into them.
const chrome = await page.evaluate(() => ['#controls', '#hint'].filter((s) => {
  const el = document.querySelector(s);
  return el && getComputedStyle(el).display !== 'none';
}));
if (chrome.length) {
  await browser.close();
  throw new Error(`viewer chrome visible in export mode: ${chrome.join(', ')} — is ?export=1 on the URL?`);
}

const duration = await page.evaluate(() => window.__intro.duration);
const total = Math.ceil(duration * FPS);
console.log(`rendering ${total} frames @ ${FPS}fps  (${duration.toFixed(2)}s, ${1920 * SCALE}x${1080 * SCALE})`);

// audio first — same cue list, offline context, muxed below
let wav = null;
if (!has('silent')) {
  const b64 = await page.evaluate(async () => {
    const { cues, duration: d, renderWav } = window.__intro;
    const bytes = await renderWav(cues, d + 0.4);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  });
  wav = path.join(TMP, 'sting.wav');
  await writeFile(wav, Buffer.from(b64, 'base64'));
  console.log(`sting rendered -> ${path.basename(wav)}`);
}

const t0 = Date.now();
for (let f = 0; f < total; f++) {
  await page.evaluate((t) => {
    window.__intro.seek(t);
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, f / FPS);
  await page.screenshot({ path: path.join(TMP, `f${String(f).padStart(5, '0')}.png`) });
  if (f % 120 === 0) {
    const pct = ((f / total) * 100).toFixed(0);
    process.stdout.write(`  ${pct}%  (${((Date.now() - t0) / 1000).toFixed(0)}s)\r`);
  }
}
await browser.close();
console.log(`\nframes captured in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

const seq = path.join(TMP, 'f%05d.png');
const common = ['-y', '-framerate', String(FPS), '-i', seq];
const vArgs = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];

await run('ffmpeg', wav
  ? [...common, '-i', wav, ...vArgs, '-c:a', 'aac', '-b:a', '192k', '-shortest', OUT]
  : [...common, ...vArgs, OUT]);
console.log('wrote ' + OUT);

// a webm alongside, for the web player
const webm = OUT.replace(/\.mp4$/, '.webm');
await run('ffmpeg', wav
  ? [...common, '-i', wav, '-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0', '-row-mt', '1', '-c:a', 'libopus', '-b:a', '128k', '-shortest', webm]
  : [...common, '-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0', '-row-mt', '1', webm]);
console.log('wrote ' + webm);

// and the final frame as a poster
await run('ffmpeg', ['-y', '-i', path.join(TMP, `f${String(total - 1).padStart(5, '0')}.png`),
  OUT.replace(/\.mp4$/, '-poster.jpg')]);
console.log('wrote ' + OUT.replace(/\.mp4$/, '-poster.jpg'));

if (!has('keep-frames') && existsSync(TMP)) await rm(TMP, { recursive: true, force: true });
console.log(problems.length ? 'RENDER WARNINGS:\n' + problems.join('\n') : 'render clean — no page errors');
