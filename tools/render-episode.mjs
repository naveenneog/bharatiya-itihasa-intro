/* Render an episode to a real, publishable MP4.

   Until now the episode existed only as a web page, which is fine for judging a cut
   and useless for publishing. This makes the file: picture scrubbed frame by frame
   out of that same page, narration concatenated from the source audio, a continuous
   underscore beneath it, the title sequence spliced in at the cut's own boundary, and
   the whole thing delivered at the streaming loudness reference.

   Why scrub the page rather than composite in ffmpeg: the captions track the voice
   word by word and the panels travel to defeat the square-into-16:9 crop. Restating
   either in a filter graph means maintaining the design twice and watching the two
   drift. window.__ep.seek(t) makes the page a pure function of time, so the renderer
   only has to ask for frames.

   Structure, for a cut with a cold open:

     [ open panels ]  ->  [ title sequence ]  ->  [ the rest of the story ]
      body 0..openSecs      the real master        body openSecs..end

   The splice point is the cut's own `open` list, so changing the cut changes the
   film without touching this file.

     node tools/render-episode.mjs --cut cut-e-framed --intro dist/v7-gupta-ink.mp4
     node tools/render-episode.mjs --cut cut-e-framed --limit 40 --scale 0.5   # draft
*/
import { mkdir, rm, writeFile, readdir } from 'node:fs/promises';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { launch } from '../scripts/browser.mjs';
import { buildUnderscore } from './underscore.mjs';
import { normaliseTo, assertLoudness } from './loudness.mjs';

const execFileP = promisify(execFile);

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const SLUG = arg('slug', 'aryabhata');
const CUT = arg('cut', 'cut-e-framed');
const FPS = Number(arg('fps', 25));
const SCALE = Number(arg('scale', 1));
const PORT = Number(arg('port', 4407));
const LIMIT = Number(arg('limit', 0));          // seconds of body, for drafts
const INTRO = arg('intro', 'dist/v7-gupta-ink.mp4');
const LANG = arg('lang', 'en');
const OUT = path.resolve(arg('out', `dist/episode-${SLUG}-${CUT}.mp4`));

const EP = path.join('episodes', SLUG);
const TMP = path.resolve('dist', `.ep-${CUT}`);
const W = Math.round(1920 * SCALE);
const H = Math.round(1080 * SCALE);

const ff = (args, label) => execFileP('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args],
  { maxBuffer: 1 << 26 }).catch((e) => {
  throw new Error(`${label} failed:\n${String(e.stderr || e.message).slice(-2500)}`);
});

async function seconds(file) {
  const { stdout } = await execFileP('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', file]);
  return Number(stdout.trim());
}

await rm(TMP, { recursive: true, force: true });
await mkdir(TMP, { recursive: true });
await mkdir(path.dirname(OUT), { recursive: true });

const server = spawn(process.execPath, ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* gone */ } };
process.on('exit', stop);
await new Promise((r) => setTimeout(r, 700));

try {
  // ── the page ────────────────────────────────────────────────────────────
  const url = `http://localhost:${PORT}/${EP.replace(/\\/g, '/')}/${CUT}/index.html?export=1`;
  const browser = await launch();
  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const problems = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
  page.on('pageerror', (e) => problems.push(`PAGEERROR ${e.message}`));

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__epReady === true, null, { timeout: 30000 });
  if (LANG !== 'en') await page.evaluate((L) => window.__ep.setLang(L), LANG);

  /* Viewer chrome in a master is unrecoverable an hour later, so it is checked
     before a single frame is captured rather than discovered in the output. */
  const chrome = await page.evaluate(() => ['#chrome', '#start', '#bar', '#cut'].filter((s) => {
    const el = document.querySelector(s);
    return el && getComputedStyle(el).display !== 'none';
  }));
  if (chrome.length) throw new Error(`viewer chrome visible in export mode: ${chrome.join(', ')}`);

  const tl = await page.evaluate(() => window.__ep.timeline());
  const fullDuration = await page.evaluate(() => window.__ep.duration);
  const duration = LIMIT > 0 ? Math.min(LIMIT, fullDuration) : fullDuration;

  /* Where the titles go: after the panels the cut names as its cold open. Taken from
     the cut spec the page was generated from, so the two cannot disagree. */
  const { CUTS } = await import('./episode-page.mjs');
  const cutSpec = CUTS.find((c) => c.id === CUT);
  if (!cutSpec) throw new Error(`unknown cut ${CUT} — known: ${CUTS.map((c) => c.id).join(', ')}`);
  const openN = (cutSpec.open || []).length;
  const openSecs = tl.slice(0, openN).reduce((a, p) => a + p.dur, 0);

  console.log(`${CUT}: ${tl.length} panels, ${(fullDuration / 60).toFixed(1)} min`
    + `${LIMIT ? ` (rendering first ${duration}s)` : ''}`);
  console.log(`  titles splice at ${openSecs.toFixed(1)}s (${openN} panel${openN === 1 ? '' : 's'} of cold open)`);

  // ── the underscore, through the same synth as the title score ────────────
  const { cues, phrases, pulsed } = buildUnderscore(tl, fullDuration + 1);
  console.log(`  underscore: ${cues.length} cues, ${phrases.length} flute phrases, ${pulsed} pulsed panel(s)`);
  const bedWav = path.join(TMP, 'bed.wav');
  const b64 = await page.evaluate(async ({ c, d }) => {
    const { renderWav } = await import('/src/audio.js');
    const bytes = await renderWav(c, d);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }, { c: cues, d: fullDuration + 1 });
  await writeFile(bedWav, Buffer.from(b64, 'base64'));
  console.log(`  bed rendered (${(await seconds(bedWav)).toFixed(1)}s)`);

  // ── frames ──────────────────────────────────────────────────────────────
  const frames = path.join(TMP, 'f');
  await mkdir(frames, { recursive: true });
  const total = Math.ceil(duration * FPS);
  console.log(`  capturing ${total} frames @ ${FPS}fps (${W}x${H})...`);
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    await page.evaluate((t) => {
      window.__ep.seek(t);
      return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, f / FPS);
    await page.screenshot({
      path: path.join(frames, `f${String(f).padStart(6, '0')}.jpg`),
      type: 'jpeg', quality: 94,
    });
    if (f % 100 === 0) {
      const el = (Date.now() - t0) / 1000;
      const eta = f ? ((el / f) * (total - f)) : 0;
      process.stdout.write(`    ${((f / total) * 100).toFixed(0)}%  ${el.toFixed(0)}s elapsed, ~${eta.toFixed(0)}s left    \r`);
    }
  }
  await browser.close();
  console.log(`\n  frames captured in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  // ── narration ───────────────────────────────────────────────────────────
  /* One file per panel, in the cut's order, butted end to end. Panel durations were
     measured from these files, so the concatenation lines up with the picture to the
     sample without a single offset being written down. */
  const audioDir = path.join(EP, 'audio');
  const have = new Set(await readdir(audioDir).catch(() => []));
  const list = [];
  for (const p of tl) {
    if (LIMIT > 0 && p.start >= duration) break;
    const rel = (p.audio?.[LANG] || p.audio?.en || '').replace(/^\.\.\/audio\//, '');
    if (!rel || !have.has(rel)) throw new Error(`missing narration for panel ${p.id} (${rel})`);
    list.push(`file '${path.resolve(audioDir, rel).replace(/\\/g, '/')}'`);
  }
  const listFile = path.join(TMP, 'narration.txt');
  await writeFile(listFile, list.join('\n'));
  const vo = path.join(TMP, 'vo.wav');
  await ff(['-f', 'concat', '-safe', '0', '-i', listFile, '-ar', '48000', '-ac', '2', vo], 'narration concat');
  console.log(`  narration: ${list.length} files, ${(await seconds(vo)).toFixed(1)}s`);

  // ── mix: bed under voice, ducked by the voice itself ────────────────────
  /* The bed is written quiet, but "quiet" is not the same as "never in the way".
     sidechaincompress keys the bed off the narration so it steps back the instant a
     line starts and returns in the gaps — the standard broadcast underscore. A slow
     release keeps it from pumping between words. */
  const mixed = path.join(TMP, 'mix.wav');
  await ff([
    '-i', vo, '-i', bedWav,
    '-filter_complex',
    '[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,'
      + 'highpass=f=70,acompressor=threshold=0.09:ratio=3:attack=8:release=180,volume=1.0[vo];'
      + '[1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[bed];'
      + '[vo]asplit=2[voa][vok];'
      + '[bed][vok]sidechaincompress=threshold=0.035:ratio=7:attack=18:release=600:makeup=1[duck];'
      + '[voa][duck]amix=inputs=2:duration=first:weights=1 0.9:normalize=0[mx]',
    '-map', '[mx]', mixed,
  ], 'mix');
  console.log(`  mixed voice + bed (${(await seconds(mixed)).toFixed(1)}s)`);

  // ── body ────────────────────────────────────────────────────────────────
  const body = path.join(TMP, 'body.mp4');
  await ff([
    '-framerate', String(FPS), '-i', path.join(frames, 'f%06d.jpg'),
    '-i', mixed,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '256k', '-shortest', body,
  ], 'body encode');
  console.log(`  body encoded (${(await seconds(body)).toFixed(1)}s)`);

  // ── splice the titles in ────────────────────────────────────────────────
  const parts = [];
  const cutAt = async (from, to, name) => {
    const out = path.join(TMP, name);
    const a = ['-ss', from.toFixed(3)];
    if (to != null) a.push('-to', to.toFixed(3));
    await ff([...a, '-i', body, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
      '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2', out], `split ${name}`);
    return out;
  };

  const introOk = openSecs > 0.5 && openSecs < duration - 0.5;
  if (introOk) {
    parts.push(await cutAt(0, openSecs, 'a.mp4'));
    const intro = path.join(TMP, 'intro.mp4');
    await ff(['-i', path.resolve(INTRO), '-vf', `scale=${W}:${H}:flags=lanczos,fps=${FPS},setsar=1`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2', intro], 'intro conform');
    parts.push(intro);
    parts.push(await cutAt(openSecs, null, 'b.mp4'));
  } else {
    const intro = path.join(TMP, 'intro.mp4');
    await ff(['-i', path.resolve(INTRO), '-vf', `scale=${W}:${H}:flags=lanczos,fps=${FPS},setsar=1`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2', intro], 'intro conform');
    parts.push(intro, body);
  }

  const joinList = path.join(TMP, 'join.txt');
  await writeFile(joinList, parts.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
  const joined = path.join(TMP, 'joined.mp4');
  await ff(['-f', 'concat', '-safe', '0', '-i', joinList, '-c', 'copy', joined], 'join');
  console.log(`  spliced: ${parts.length} segments -> ${(await seconds(joined)).toFixed(1)}s`);

  // ── deliver at the streaming reference ──────────────────────────────────
  const af = await normaliseTo(joined, 'programme');
  await ff(['-i', joined, '-c:v', 'copy', '-af', af, '-c:a', 'aac', '-b:a', '256k',
    '-movflags', '+faststart', OUT], 'loudness pass');

  const { stdout } = await execFileP('ffprobe', ['-v', 'error',
    '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate',
    '-of', 'default=noprint_wrappers=1', OUT]);
  console.log(`\ndone -> ${OUT}\n${stdout.trim()}`);
  await assertLoudness(OUT);
  console.log(problems.length ? `\nPAGE WARNINGS:\n${problems.slice(0, 12).join('\n')}` : '\npage clean — no errors');

  if (!has('keep')) await rm(path.join(TMP, 'f'), { recursive: true, force: true });
} finally {
  stop();
}
