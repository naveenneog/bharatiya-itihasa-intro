/* Render a deterministic master MP4 for a video-based version.

   v1's renderer scrubbed a GSAP timeline frame by frame; that cannot work here
   because the picture is twelve <video> elements and a headless browser will not
   seek them frame-accurately. So the master is composited instead:

     picture   the Sora clips, trimmed to their in-points and cross-faded in ffmpeg
     plates    the scrim, rules, type, wordmark and vignette captured from the real
               page as transparent PNGs, then given their motion by ffmpeg's alpha fades

   Everything the viewer sees is therefore still authored in the page — the renderer
   never restates a font, a gradient or a duration. Timing comes from timeline.mjs,
   the same module the player imports, so the two cannot drift.

     node tools/render-master.mjs v3-empires
     node tools/render-master.mjs v3-empires --score --out dist/v4-empires-scored.mp4
     node tools/render-master.mjs --era chola --variant kingdom --score
*/
import { mkdir, rm, readdir, writeFile } from 'node:fs/promises';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { stash } from './keep.mjs';
import { launch } from '../scripts/browser.mjs';
import { XF, TAIL, schedule, clipSeconds, totalSeconds } from './timeline.mjs';
import { MASTER_AF } from './score.mjs';
import { normaliseTo, assertLoudness } from './loudness.mjs';
import { filterScript } from './ffmpeg-args.mjs';
import { variant, beatsFor } from './variants.mjs';
import { resolveSource } from './source.mjs';
import { picks, choose } from './picks.mjs';

const execFileP = promisify(execFile);
const W = 1920;
const H = 1080;

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const FPS = Number(flag('fps', '30'));
const PORT = Number(flag('port', '4399'));
const OUT = flag('out', null);
const SCORE = argv.includes('--score');
const VARIANT = flag('variant', 'default');
const V = variant(VARIANT);
const BUILD = flag('build', null) || V.out;
const CUT = flag('beats', null)?.split(',').map((s) => s.trim());

const { root: ROOT, dir } = await resolveSource(argv, {
  valued: ['fps', 'port', 'out', 'variant', 'beats', 'build', 'era'],
});

/* The picked revision, not the newest — the same rule build-version.mjs uses. When this
   took the newest and the page took the pick, the master could be composited from a clip
   the page never showed. */
async function pickedClip(dirId, beatId) {
  const files = await readdir(path.join(ROOT, dirId, 'clips')).catch(() => []);
  const p = await picks(ROOT, dirId);
  return choose(files, beatId, 'mp4', p[beatId]);
}

// ---------------------------------------------------------------- plates

/** Peak alpha in a captured plate. A silently-empty layer once shipped a master with
    no rules in it, so every plate is asserted to actually contain something. */
async function alphaMax(png) {
  try {
    const { stdout } = await execFileP('ffmpeg', ['-v', 'error', '-i', png,
      '-vf', 'alphaextract,signalstats,metadata=print:key=lavfi.signalstats.YMAX:file=-',
      '-f', 'null', '-'], { maxBuffer: 1 << 22 });
    const m = stdout.match(/YMAX=(\d+)/);
    return m ? Number(m[1]) : -1;
  } catch { return -1; }
}

/** Capture one isolated layer of the page as a transparent PNG. */
async function capture(page, url, out) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__layerReady === true, { timeout: 20000 });
  await page.locator('#frame').screenshot({ path: out, omitBackground: true });
  const a = await alphaMax(out);
  if (a === 0) throw new Error(`plate is fully transparent: ${path.basename(out)} (${url})`);
  return a;
}

async function renderPlates(sched, plateDir) {
  await mkdir(plateDir, { recursive: true });
  const base = `http://localhost:${PORT}/${ROOT}/${dir.id}/${BUILD}/index.html?export=1`;

  const browser = await launch();
  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });

  const plates = {};
  for (const part of ['scrim', 'rules', 'vig', 'grain', 'wm']) {
    const out = path.join(plateDir, `${part}.png`);
    await capture(page, `${base}&layer=${part}`, out);
    plates[part] = out;
  }
  plates.type = [];
  for (let i = 0; i < sched.length; i++) {
    const out = path.join(plateDir, `type-${String(i).padStart(2, '0')}.png`);
    await capture(page, `${base}&layer=type&beat=${i}`, out);
    plates.type.push(out);
  }

  /* The score is synthesised by the same page, through an OfflineAudioContext, so
     the master carries exactly the cues the live player schedules. Rendering it
     here rather than in a second browser session keeps it one source of truth. */
  if (SCORE) {
    plates.wav = path.join(plateDir, 'score.wav');
    const b64 = await page.evaluate(async (d) => {
      const bytes = await window.__seq.renderWav(window.__seq.CUES, d);
      let s = '';
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(s);
    }, totalSeconds(sched) + 0.4);
    await writeFile(plates.wav, Buffer.from(b64, 'base64'));
  }

  await browser.close();
  return plates;
}

// ---------------------------------------------------------------- compositing

/* Build the ffmpeg filter graph.

   Picture: each clip is trimmed to [seek, seek + dur + XF] — the beat plus the
   crossfade that runs off its tail — then xfaded onto the running composite at the
   next beat's start time, which is exactly where the player overlaps them.

   Plates: every overlay is a looped still given its motion by an alpha fade, so the
   result is a pure function of the schedule and reproduces bit-for-bit. */
function buildGraph(sched, plates, total) {
  const end = sched[sched.length - 1].start + sched[sched.length - 1].dur;
  const f = [];

  sched.forEach((s, i) => {
    f.push(`[${i}:v]trim=start=${s.seek}:duration=${(s.dur + XF).toFixed(3)},setpts=PTS-STARTPTS,`
      + `scale=${W}:${H}:flags=lanczos,fps=${FPS},format=rgba,setsar=1[v${i}]`);
  });

  let cur = 'v0';
  for (let i = 1; i < sched.length; i++) {
    const out = `x${i}`;
    f.push(`[${cur}][v${i}]xfade=transition=fade:duration=${XF}:offset=${sched[i].start.toFixed(3)}[${out}]`);
    cur = out;
  }

  // hold the last frame under the wordmark, exactly as the paused <video> does
  f.push(`[${cur}]tpad=stop_mode=clone:stop_duration=${(total - (end + XF) + 0.5).toFixed(3)},`
    + `trim=duration=${total.toFixed(3)},setpts=PTS-STARTPTS,format=rgba[pic]`);

  // input indices for the plates, after the clips
  const n = sched.length;
  const iScrim = n; const iRules = n + 1; const iVig = n + 2;
  const iGrain = n + 3; const iWm = n + 4; const iPaper = n + 5; const iType0 = n + 6;

  f.push(`[${iScrim}:v]scale=${W}:${H},format=rgba[scrim]`);
  f.push(`[${iRules}:v]scale=${W}:${H},format=rgba,fade=t=in:st=0.15:d=1.1:alpha=1[rules]`);
  f.push(`[pic][scrim]overlay=format=auto[c0]`);
  f.push(`[c0][rules]overlay=format=auto[c1]`);

  // paper wipe and wordmark, mirroring #wm-bg and #wm in the page
  f.push(`[${iPaper}:v]format=rgba,fade=t=in:st=${(end - 0.5).toFixed(3)}:d=1.2:alpha=1[paper]`);
  f.push(`[${iWm}:v]scale=${W}:${H},format=rgba,fade=t=in:st=${(end + 0.15).toFixed(3)}:d=1.1:alpha=1[wmk]`);

  let c = 'c1';
  sched.forEach((s, i) => {
    const lbl = `t${i}`;
    f.push(`[${iType0 + i}:v]scale=${W}:${H},format=rgba,`
      + `fade=t=in:st=${s.labelIn.toFixed(3)}:d=0.7:alpha=1,`
      + `fade=t=out:st=${s.labelOut.toFixed(3)}:d=0.7:alpha=1[${lbl}]`);
    const out = `ct${i}`;
    f.push(`[${c}][${lbl}]overlay=format=auto[${out}]`);
    c = out;
  });

  f.push(`[${c}][paper]overlay=format=auto[cp]`);
  f.push(`[cp][wmk]overlay=format=auto[cw]`);
  f.push(`[${iVig}:v]scale=${W}:${H},format=rgba[vig]`);
  f.push(`[cw][vig]overlay=format=auto[cv]`);
  // grain is mix-blend-mode:overlay in the page; ffmpeg's blend reproduces it
  f.push(`[${iGrain}:v]scale=${W}:${H},format=rgba[grain]`);
  f.push(`[cv][grain]blend=all_mode=overlay:all_opacity=0.09,format=yuv420p[out]`);

  return { graph: f.join(';'), inputs: { iScrim, iRules, iVig, iGrain, iWm, iPaper, iType0 } };
}

// ---------------------------------------------------------------- main

const beats = [];
for (const b of beatsFor(dir, V, CUT)) {
  const clip = await pickedClip(dir.id, b.id);
  if (!clip) { console.error(`missing clip for ${b.id} — run gen-clips first`); process.exit(1); }
  beats.push({ ...b, clip, clipLen: await clipSeconds(path.join(ROOT, dir.id, 'clips', clip)) });
}

const sched = schedule(beats);
const total = totalSeconds(sched);
const out = OUT || path.join('dist', `${dir.id}.mp4`);
await mkdir(path.dirname(out), { recursive: true });

console.log(`${dir.id}: ${beats.length} beats, ${total.toFixed(1)}s @ ${FPS}fps -> ${out}`);

const server = spawn(process.execPath, ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);

try {
  await new Promise((r) => setTimeout(r, 700));

  const plateDir = path.join(ROOT, dir.id, BUILD, 'plates');
  await stash(plateDir, `plates/${dir.id}`);
  console.log('  capturing plates from the page...');
  const plates = await renderPlates(sched, plateDir);

  const { graph } = buildGraph(sched, plates, total);
  await writeFile(path.join(plateDir, 'filter.txt'), graph);

  const args = ['-y', '-hide_banner', '-loglevel', 'error', '-stats'];
  for (const b of beats) args.push('-i', path.join(ROOT, dir.id, 'clips', b.clip));
  for (const p of [plates.scrim, plates.rules, plates.vig, plates.grain, plates.wm]) {
    args.push('-loop', '1', '-t', String(total), '-i', p);
  }
  args.push('-f', 'lavfi', '-t', String(total), '-i', `color=c=0x0d0b09:s=${W}x${H}:r=${FPS}`);
  for (const p of plates.type) args.push('-loop', '1', '-t', String(total), '-i', p);
  // the score goes last so it cannot shift the video input indices the graph uses
  const wavIdx = beats.length * 2 + 6;
  if (SCORE) args.push('-i', plates.wav);

  /* Loudness is measured on the limited signal, because the limiter is what the
     mix actually delivers; measuring the raw score would leave the master a dB or
     two off target. Pass one runs on a throwaway render of exactly that chain. */
  let audioFilter = MASTER_AF;
  if (SCORE) {
    const limited = path.join(plateDir, 'score-limited.wav');
    await execFileP('ffmpeg', ['-y', '-loglevel', 'error', '-i', plates.wav, '-af', MASTER_AF, limited]);
    audioFilter = `${MASTER_AF},${await normaliseTo(limited, 'score')}`;
  }

  args.push(
    ...await filterScript(path.join(plateDir, 'filter.txt')),
    '-map', '[out]',
  );
  if (SCORE) args.push('-map', `${wavIdx}:a`, '-af', audioFilter, '-c:a', 'aac', '-b:a', '192k');
  args.push(
    '-r', String(FPS),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-t', String(total),
    out,
  );

  console.log(`  compositing${SCORE ? ' with score' : ''}...`);
  await execFileP('ffmpeg', args, { maxBuffer: 1 << 26 });

  const { stdout } = await execFileP('ffprobe', ['-v', 'error',
    '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate',
    '-of', 'default=noprint_wrappers=1', out]);
  console.log(`\ndone -> ${out}\n${stdout.trim()}`);
  if (SCORE) await assertLoudness(out);
} finally {
  stop();
}
