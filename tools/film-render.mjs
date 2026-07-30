/* Render a film to a master MP4.

   Same approach as the title sequences, because the same constraint applies: the picture is
   sixty <video> elements and a headless browser will not seek them frame-accurately. So the
   master is composited rather than captured —

     picture   the Sora takes, trimmed to each shot's own duration and cross-faded
     plates    scrim, cards, vignette, grain and the wordmark, captured from the real page
               as transparent PNGs and given their motion by ffmpeg's alpha fades
     sound     one narration file per speaking shot, delayed to its shot's start, over a bed

   Everything the viewer sees is still authored in the page. The renderer restates no font, no
   gradient and no duration.

     node tools/film-render.mjs --id zero-ascent
     node tools/film-render.mjs --id zero-ascent --draft
*/
import { mkdir, rm, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { launch } from '../scripts/browser.mjs';
import { loadFilm, ROOT } from './films.mjs';
import { filmPage, cardsOf } from './film-page.mjs';
import { buildUnderscore } from './underscore.mjs';
import { normaliseTo, assertLoudness, measure } from './loudness.mjs';

const execFileP = promisify(execFile);
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const ID = arg('id', null);
if (!ID) { console.error('usage: node tools/film-render.mjs --id <film-id>'); process.exit(1); }

const DRAFT = has('draft');
const FPS = Number(arg('fps', DRAFT ? '12' : '25'));
const SCALE = Number(arg('scale', DRAFT ? '0.5' : '1'));
const PORT = Number(arg('port', '4431'));
const LIFT = Number(arg('lift', '0.55'));
const XF = Number(arg('xf', '0.34'));
const TAIL = Number(arg('tail', '4.6'));
const OUT = path.resolve(arg('out', path.join('dist', `${ID}.mp4`)));

const W = Math.round(1920 * SCALE);
const H = Math.round(1080 * SCALE);
const DIR = path.join(ROOT, ID);
const TMP = path.resolve('dist', `.film-${ID}`);

const ff = (args, label) => execFileP('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args],
  { maxBuffer: 1 << 26 }).catch((e) => {
  throw new Error(`${label} failed:\n${String(e.stderr || e.message).slice(-2000)}`);
});

async function seconds(file) {
  const { stdout } = await execFileP('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', file]);
  return Number(stdout.trim());
}

/** The chosen take for a shot: highest revision on disk. */
async function clipFor(shotId) {
  const files = await readdir(path.join(DIR, 'clips')).catch(() => []);
  let best = null; let n = 0;
  for (const f of files) {
    const g = f.match(new RegExp(`^${shotId}-r(\\d+)\\.mp4$`));
    if (g && Number(g[1]) > n) { n = Number(g[1]); best = f; }
  }
  return best;
}

const film = await loadFilm(ID);
await mkdir(TMP, { recursive: true });
await mkdir(path.dirname(OUT), { recursive: true });

/* Resolve each shot's take and its in-point. An eight-second take shown for 2.4 seconds should
   use the middle, where the ink is moving, not the first 2.4 where it has barely left the
   reference frame. */
const missing = [];
const short = [];
for (const s of film.shots) {
  const clip = await clipFor(s.id);
  if (!clip) { missing.push(s.id); continue; }
  s.clip = clip;
  const len = await seconds(path.join(DIR, 'clips', clip));
  s.clipLen = len;
  /* A take that does not cover its shot is the worst failure this renderer has, because it
     does not fail. The trim silently yields a short clip, the next xfade's offset lands past
     the end of its input, the whole chain collapses to a few seconds, and tpad then clones
     the last frame for the rest of the running time — a six-minute film of one frozen image
     that encodes cleanly and reports nothing. 29 of 57 shots were in this state. */
  if (len < s.dur + XF - 0.05) short.push(`${s.id} needs ${(s.dur + XF).toFixed(1)}s, take is ${len.toFixed(1)}s`);
  s.seek = +Math.max(0, (len - (s.dur + XF)) / 2).toFixed(3);
}
if (missing.length) {
  console.error(`${missing.length} shot(s) have no clip: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? ' …' : ''}`);
  console.error(`run: node tools/film-gen.mjs --id ${ID} --what clips --missing`);
  process.exit(1);
}
if (short.length) {
  console.error(`\n${short.length} take(s) are shorter than the shot they have to cover:\n`);
  for (const s of short.slice(0, 10)) console.error(`   ${s}`);
  if (short.length > 10) console.error(`   … and ${short.length - 10} more`);
  console.error(`\nregenerate them — film-gen picks 4, 8 or 12 seconds from each shot's own length:`);
  console.error(`  node tools/film-gen.mjs --id ${ID} --what clips --shots ${short.map((s) => s.split(' ')[0]).slice(0, 8).join(',')}`);
  process.exit(1);
}

const total = film.runtime + TAIL;
console.log(`${ID}: ${film.shots.length} shots, ${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, '0')} @ ${FPS}fps${DRAFT ? ' [draft]' : ''} -> ${OUT}`);

// ── the page and its plates ──────────────────────────────────────────────
const build = path.join(DIR, 'build');
await mkdir(build, { recursive: true });
await writeFile(path.join(build, 'index.html'), filmPage({ ...film, tail: TAIL }));

const cards = cardsOf(film);
const server = spawn(process.execPath, ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);

async function alphaMax(png) {
  try {
    const { stdout } = await execFileP('ffmpeg', ['-v', 'error', '-i', png,
      '-vf', 'alphaextract,signalstats,metadata=print:key=lavfi.signalstats.YMAX:file=-',
      '-f', 'null', '-'], { maxBuffer: 1 << 22 });
    const m = stdout.match(/YMAX=(\d+)/);
    return m ? Number(m[1]) : -1;
  } catch { return -1; }
}

const plates = {};
const bed = path.join(TMP, 'bed.wav');
try {
  await new Promise((r) => setTimeout(r, 700));
  const base = `http://localhost:${PORT}/${ROOT}/${ID}/build/index.html?export=1`;
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  const capture = async (url, out) => {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__layerReady === true, { timeout: 20000 });
    await page.locator('#frame').screenshot({ path: out, omitBackground: true });
    /* A silently empty plate once shipped a master with its gold rules missing, so every one
       is asserted to actually contain something. */
    if (await alphaMax(out) === 0) throw new Error(`plate is fully transparent: ${path.basename(out)}`);
    return out;
  };

  console.log('  capturing plates from the page...');
  for (const part of ['scrim', 'vig', 'grain', 'wm']) {
    plates[part] = await capture(`${base}&layer=${part}`, path.join(TMP, `${part}.png`));
  }
  plates.cards = [];
  for (let k = 0; k < cards.length; k++) {
    plates.cards.push(await capture(`${base}&layer=type&card=${k}`, path.join(TMP, `card-${String(k).padStart(2, '0')}.png`)));
  }

  /* The bed is synthesised by the same page, through the same synth the title sequences use,
     so the film's music and the channel's music are the same instrument. It has to happen in
     the browser — src/audio.js renders through an OfflineAudioContext — and doing it in this
     session rather than a second one keeps it one source of truth.

     buildUnderscore wants items with `start` and `dur`, which is what a shot already is, so
     the bed's phrasing follows the cut rather than a grid. */
  const { cues, phrases, pulsed } = buildUnderscore(film.shots, total + 1, LIFT);
  console.log(`  underscore: ${cues.length} cues, ${phrases.length} flute phrases, ${pulsed} pulsed shot(s), lift ${LIFT}`);
  const b64 = await page.evaluate(async ({ c, d }) => {
    const { renderWav } = await import('/src/audio.js');
    const bytes = await renderWav(c, d);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }, { c: cues, d: total + 1 });
  await writeFile(bed, Buffer.from(b64, 'base64'));

  await browser.close();
} finally {
  stop();
}

// ── sound ────────────────────────────────────────────────────────────────
/* Narration is one file per speaking shot, delayed to that shot's start. The silences between
   shots are therefore exactly the silences the author wrote, rather than whatever the gap
   between two recordings happened to be. */
console.log('  arranging narration...');
const speak = film.shots.filter((s) => s.say && existsSync(path.join(DIR, 'audio', `${s.id}.mp3`)));
const voice = path.join(TMP, 'voice.wav');
if (!speak.length) {
  /* A film can be entirely silent — the closing movement is. amix with no inputs is not an
     empty mix, it is a filter graph that does not build, so the silence has to be made
     explicitly rather than falling out of having nothing to mix. */
  await ff(['-f', 'lavfi', '-t', String(total), '-i', 'anullsrc=r=48000:cl=stereo',
    '-ar', '48000', '-ac', '2', voice], 'silent narration');
} else {
  const voiceArgs = [];
  const voiceFilter = [];
  speak.forEach((s, k) => {
    voiceArgs.push('-i', path.join(DIR, 'audio', `${s.id}.mp3`));
    voiceFilter.push(`[${k}:a]adelay=${Math.round(s.start * 1000)}|${Math.round(s.start * 1000)},aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[v${k}]`);
  });
  await ff([...voiceArgs, '-filter_complex',
    `${voiceFilter.join(';')};${speak.map((_, k) => `[v${k}]`).join('')}amix=inputs=${speak.length}:normalize=0:dropout_transition=0,apad,atrim=0:${total.toFixed(3)}[out]`,
    '-map', '[out]', '-ar', '48000', '-ac', '2', voice], 'narration arrange');
}


/* Duck the bed under the voice and print the separation, because "there is music under it" is
   not a claim anyone can check and 16-20 dB is the band that works on a phone. */
const mixed = path.join(TMP, 'mix.wav');
await ff(['-i', voice, '-i', bed, '-filter_complex',
  '[0:a]asplit=2[va][vk];[1:a][vk]sidechaincompress=threshold=0.05:ratio=8:attack=8:release=420[duck];'
  + '[va][duck]amix=inputs=2:normalize=0:dropout_transition=0[out];',
  '-map', '[out]', '-ar', '48000', '-ac', '2', mixed], 'mix');
const [vi, bi] = await Promise.all([measure(voice), measure(bed)]);
console.log(`    voice ${Number(vi.input_i).toFixed(1)} LUFS · bed ${Number(bi.input_i).toFixed(1)} LUFS`
  + ` · separation ${(Number(vi.input_i) - Number(bi.input_i)).toFixed(1)} dB`);

// ── picture ──────────────────────────────────────────────────────────────
/* Each take is trimmed to its shot plus the crossfade running off its tail, then xfaded onto
   the running composite at exactly the next shot's start — the same overlap the page plays. */
const f = [];
film.shots.forEach((s, i) => {
  f.push(`[${i}:v]trim=start=${s.seek}:duration=${(s.dur + XF).toFixed(3)},setpts=PTS-STARTPTS,`
    + `scale=${W}:${H}:flags=lanczos,fps=${FPS},format=rgba,setsar=1[v${i}]`);
});
let cur = 'v0';
for (let i = 1; i < film.shots.length; i++) {
  f.push(`[${cur}][v${i}]xfade=transition=fade:duration=${XF}:offset=${film.shots[i].start.toFixed(3)}[x${i}]`);
  cur = `x${i}`;
}
const end = film.runtime;
f.push(`[${cur}]tpad=stop_mode=clone:stop_duration=${Math.max(0.1, total - end + 0.5).toFixed(3)},`
  + `trim=duration=${total.toFixed(3)},setpts=PTS-STARTPTS,format=rgba[pic]`);

const n = film.shots.length;
const iScrim = n; const iVig = n + 1; const iGrain = n + 2; const iWm = n + 3; const iPaper = n + 4; const iCard0 = n + 5;

/* The scrim is part of a card, not part of the film, so it fades in and out with each one
   rather than sitting over every frame. Half the shots are undimmed because of this. */
f.push(`[${iScrim}:v]scale=${W}:${H},format=rgba${cards.map((c) =>
  `,fade=t=in:st=${(c.start).toFixed(3)}:d=0.5:alpha=1,fade=t=out:st=${(c.start + c.dur - 0.45).toFixed(3)}:d=0.5:alpha=1`).join('')}[scrim]`);
f.push('[pic][scrim]overlay=format=auto[c0]');

let c = 'c0';
cards.forEach((cd, k) => {
  f.push(`[${iCard0 + k}:v]scale=${W}:${H},format=rgba,`
    + `fade=t=in:st=${(cd.start + 0.30).toFixed(3)}:d=0.62:alpha=1,`
    + `fade=t=out:st=${(cd.start + cd.dur - 0.42).toFixed(3)}:d=0.62:alpha=1[cd${k}]`);
  f.push(`[${c}][cd${k}]overlay=format=auto[cc${k}]`);
  c = `cc${k}`;
});

f.push(`[${iPaper}:v]format=rgba,fade=t=in:st=${(end - 0.5).toFixed(3)}:d=1.25:alpha=1[paper]`);
f.push(`[${iWm}:v]scale=${W}:${H},format=rgba,fade=t=in:st=${(end + 0.2).toFixed(3)}:d=1.15:alpha=1[wmk]`);
f.push(`[${c}][paper]overlay=format=auto[cp]`);
f.push('[cp][wmk]overlay=format=auto[cw]');
f.push(`[${iVig}:v]scale=${W}:${H},format=rgba[vig]`);
f.push('[cw][vig]overlay=format=auto[cv]');
f.push(`[${iGrain}:v]scale=${W}:${H},format=rgba[grain]`);
f.push('[cv][grain]blend=all_mode=overlay:all_opacity=0.085,format=yuv420p[out]');

await writeFile(path.join(TMP, 'filter.txt'), f.join(';'));

const args = ['-y', '-hide_banner', '-loglevel', 'error', '-stats'];
for (const s of film.shots) args.push('-i', path.join(DIR, 'clips', s.clip));
for (const p of [plates.scrim, plates.vig, plates.grain, plates.wm]) args.push('-loop', '1', '-t', String(total), '-i', p);
args.push('-f', 'lavfi', '-t', String(total), '-i', `color=c=0x0d0b09:s=${W}x${H}:r=${FPS}`);
for (const p of plates.cards) args.push('-loop', '1', '-t', String(total), '-i', p);
const audioIdx = film.shots.length + 5 + plates.cards.length;
args.push('-i', mixed);

console.log('  compositing...');
args.push('-filter_complex_script', path.join(TMP, 'filter.txt'), '-map', '[out]', '-map', `${audioIdx}:a`);
args.push('-af', await normaliseTo(mixed, 'programme'));
args.push('-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2');
args.push('-r', String(FPS), '-c:v', 'libx264', '-preset', DRAFT ? 'veryfast' : 'slow',
  '-crf', DRAFT ? '26' : '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  '-t', String(total), OUT);

await execFileP('ffmpeg', args, { maxBuffer: 1 << 26 });

const { stdout } = await execFileP('ffprobe', ['-v', 'error',
  '-show_entries', 'format=duration,size:stream=codec_type,width,height', '-of', 'default=nw=1', OUT]);
console.log(`\ndone -> ${OUT}\n${stdout.trim()}`);
await assertLoudness(OUT);
