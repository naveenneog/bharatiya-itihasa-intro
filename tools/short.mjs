/* The vertical cut: the claims, over ink and light, under a minute.

   The long form earns its length by building. A Short has about a second and a half to be
   worth staying for and then has to keep paying, so it does not carry the narrative — it
   carries the **claims**: the assertions a viewer could repeat afterwards. Those play over
   the channel's abstract language rather than over the episode's figure and panels, because
   the artwork belongs to the story and what travels is what the story found.

   The picture is the era's own beats, generated in portrait (eras/<era>/clips-v). One batch
   per era serves every story in it, so a Short costs no generation of its own.

   Five things happen here:

     script   what the Short says — from the episode's narration, via the LLM
     voice    the same narrator at the same rate as the episode, measured
     type     the words, captured as frames on transparent so they can light as spoken
     picture  the era's portrait clips, cut to the beats
     mix      voice over the same synth bed, at the same loudness reference

     node tools/short.mjs --slug zero --era gupta
     node tools/short.mjs --slug zero --era gupta --script-only
     node tools/short.mjs --slug zero --era gupta --draft
*/
import { mkdir, rm, writeFile, readFile, readdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { launch } from '../scripts/browser.mjs';
import { chatJson } from './llm.mjs';
import { synth, seconds as mp3Seconds, foldToWritten } from './voice.mjs';
import { speakYears } from './years.mjs';
import { shortPage } from './short-page.mjs';
import { buildUnderscore } from './underscore.mjs';
import { normaliseTo, assertLoudness } from './loudness.mjs';

const execFileP = promisify(execFile);
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const SLUG = arg('slug', null);
if (!SLUG) { console.error('usage: node tools/short.mjs --slug <slug> --era <era>'); process.exit(1); }
const ERA = arg('era', 'gupta');
const DRAFT = has('draft');
const FPS = Number(arg('fps', DRAFT ? 12 : 25));
const SCALE = DRAFT ? 0.5 : 1;
const W = Math.round(1080 * SCALE);
const H = Math.round(1920 * SCALE);
const PORT = Number(arg('port', 4441));
const EP = path.join('episodes', SLUG);
const OUT = path.resolve(arg('out', path.join('dist', ERA, `${SLUG}_short`)));
const TMP = path.resolve('dist', `.short-${SLUG}`);
const SCRIPT = path.join(EP, 'short.json');

const ff = (args, label) => execFileP('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args],
  { maxBuffer: 1 << 26 }).catch((e) => {
  throw new Error(`${label} failed:\n${String(e.stderr || e.message).slice(-2500)}`);
});

const ep = JSON.parse(await readFile(path.join(EP, 'episode.json'), 'utf8'));
const meta = await readFile(path.join(EP, 'publish.json'), 'utf8').then(JSON.parse).catch(() => ({}));

// ── 1. the script ────────────────────────────────────────────────────────
/* Written once and kept. It is the thing a human would most want to correct, and
   regenerating it on every render would silently discard those corrections. */
const SYSTEM = `You write a vertical short for a YouTube history channel about India.

It is under a minute. It plays over abstract footage — ink and gold in black water, no
people, no places — so the words carry everything. There is no narrative artwork to lean on.

WHAT IT IS
A chain of CLAIMS. Each line asserts something the episode established: what was measured,
written, built, decided or changed. A viewer should be able to repeat any line afterwards.
It is not a summary and not a trailer; it does not tease and it does not say "the story of".

SHAPE — exactly 7 lines:
  1  hook    the most arresting true claim in the episode. Concrete, specific, surprising.
             It is the first thing heard and it must be worth the next second.
  2  ground  who, where, when — the minimum that makes the hook land.
  3  turn    what changed, or what was done
  4  proof   the concrete detail that makes it credible: a method, an object, a rule
  5  proof   a second one, different in kind from the fourth
  6  reach   what it touched afterwards — the consequence, honestly scoped
  7  payoff  the line the viewer leaves with. A claim, not a moral.

HARD RULES
- Everything must be supported by the narration you are given. Add no facts, dates, names or
  numbers that are not in it. You are selecting and sharpening, not researching.
- 7 to 15 words per line. The whole thing must be sayable in about 45 seconds.
- Spell numbers as words: "six twenty-eight", "three hundred years". These are SPOKEN; a
  numeral is read aloud as a quantity and comes out wrong.
- No second person, no rhetorical questions, no "imagine", no trailing ellipses.
- Every line ends on its strongest word. Never end on a preposition or a name already used.
- Do not repeat a proper noun in consecutive lines.
- Say nothing the episode does not claim, and nothing the figure got wrong, unless the line
  itself says it was wrong.

KICKERS
Each line gets a two or three word kicker set above it in small capitals — a label for the
beat, drawn from the content ("THE CLAIM", "BHINMAL, 628", "THE RULE"). Not the line again.

Return JSON only:
{"lines":[{"text":"...","kick":"...","beat":"hook"}, ... 7 of them],
 "why": "one sentence on why this chain holds"}`;

let script = await readFile(SCRIPT, 'utf8').then(JSON.parse).catch(() => null);
if (script && has('rescript')) script = null;
if (!script) {
  const narration = ep.panels.map((p) => p.text?.en).filter(Boolean).join('\n');
  const user = `Episode: ${ep.title}\nFigure: ${ep.figure || '(none)'}\nEra: ${ep.era || ''}\n\nNARRATION\n${narration}`;
  const got = await chatJson(SYSTEM, user, { maxTokens: 3000 });
  const lines = Array.isArray(got.lines) ? got.lines : [];

  /* Checked, not trusted — the same rules the prompt states, enforced. A numeral here is the
     one that matters most: it is spoken, and the source project's own voice reads "628" as
     six hundred and twenty-eight. */
  const problems = [];
  if (lines.length !== 7) problems.push(`${lines.length} lines, expected 7`);
  for (const [i, l] of lines.entries()) {
    const t = String(l?.text || '').trim();
    if (!t) { problems.push(`line ${i + 1} is empty`); continue; }
    const n = t.split(/\s+/).length;
    if (n < 7 || n > 15) problems.push(`line ${i + 1} is ${n} words, outside 7-15: "${t}"`);
    if (/\d/.test(t)) problems.push(`line ${i + 1} contains a numeral — it will be spoken as a quantity: "${t}"`);
    if (/\byou\b|\byour\b/i.test(t)) problems.push(`line ${i + 1} addresses the viewer: "${t}"`);
    if (/\?$|\.\.\.$|…$/.test(t)) problems.push(`line ${i + 1} trails off or asks: "${t}"`);
    if (!String(l?.kick || '').trim()) problems.push(`line ${i + 1} has no kicker`);
  }
  if (problems.length) {
    console.error(`the short script for ${SLUG} did not pass:`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  script = { slug: SLUG, title: ep.title, why: got.why || '', lines };
  await writeFile(SCRIPT, `${JSON.stringify(script, null, 2)}\n`);
}
console.log(`${SLUG} short — 7 lines`);
for (const l of script.lines) console.log(`  ${String(l.kick).padEnd(18)} ${l.text}`);
if (has('script-only')) process.exit(0);

// ── 2. the voice ─────────────────────────────────────────────────────────
/* Same narrator, same rate as the episode, through tools/voice.mjs — a Short in a different
   voice is a different channel. Durations are measured from the files rather than estimated,
   which is the only reason the type can be word-synced at all. */
await mkdir(path.join(EP, 'short-audio'), { recursive: true });
const beats = [];
for (const [i, l] of script.lines.entries()) {
  const mp3 = path.join(EP, 'short-audio', `${String(i).padStart(2, '0')}.mp3`);
  const written = l.text.trim();
  /* speakYears returns { text, changed } — the spoken form is `text`. Destructuring it as
     `spoken` gave undefined, which reached the synthesiser as an SSML body and threw there
     rather than here. */
  const { text: spoken } = speakYears(written);
  if (!existsSync(mp3) || has('revoice')) {
    const { audio, words } = await synth(spoken, { role: 'narrator', mood: i === 0 ? 'suspense' : 'calm' });
    await writeFile(mp3, audio);
    await writeFile(mp3.replace(/\.mp3$/, '.json'), JSON.stringify(foldToWritten(written, spoken, words)));
  }
  const dur = await mp3Seconds(mp3);
  const words = JSON.parse(await readFile(mp3.replace(/\.mp3$/, '.json'), 'utf8'));
  /* A held beat after each line. Without it the lines run into one another and the piece
     reads as one long sentence; the hook gets the longest, because the first silence is
     where a viewer decides. */
  const gap = i === 0 ? 0.55 : 0.30;
  beats.push({ i, text: written, kick: l.kick, words, say: dur, dur: +(dur + gap).toFixed(3) });
}
const runtime = +beats.reduce((a, b) => a + b.dur, 0).toFixed(3);
const TAIL = 2.6;
const total = +(runtime + TAIL).toFixed(3);
console.log(`  narration ${runtime.toFixed(1)}s + ${TAIL}s close = ${total.toFixed(1)}s`);
if (runtime + TAIL > 59) console.warn('  ! over 59s — YouTube will not treat this as a Short');

// ── 3. the page, and the type as frames ──────────────────────────────────
await rm(TMP, { recursive: true, force: true });
await mkdir(path.join(TMP, 'type'), { recursive: true });
const build = path.join(EP, 'short-build');
await mkdir(build, { recursive: true });
await writeFile(path.join(build, 'index.html'),
  shortPage({ title: ep.title, beats, runtime, tail: TAIL }));

const server = spawn(process.execPath, ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' });
process.on('exit', () => { try { server.kill(); } catch { /* gone */ } });
await new Promise((r) => setTimeout(r, 700));

const base = `http://localhost:${PORT}/${build.replace(/\\/g, '/')}/index.html`;
const browser = await launch();
const plates = {};
{
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  for (const layer of ['scrim', 'vig', 'grain', 'wm']) {
    await page.goto(`${base}?layer=${layer}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__shortReady === true, null, { timeout: 30000 });
    const out = path.join(TMP, `${layer}.png`);
    await page.screenshot({ path: out, omitBackground: true });
    plates[layer] = out;
  }
  await page.close();
}

/* The type, frame by frame, on transparent.

   One plate per line would be cheaper and would lose the thing that makes the channel read
   as itself: the word lighting as it is said. A transparent layer at 25fps for forty-five
   seconds is about eleven hundred captures — three minutes — and it composites in one
   overlay instead of one per word. */
{
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(`${base}?layer=type`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shortReady === true, null, { timeout: 30000 });
  const n = Math.ceil(runtime * FPS);
  console.log(`  capturing ${n} type frames @ ${FPS}fps (${W}x${H})...`);
  const t0 = Date.now();
  for (let f = 0; f < n; f++) {
    await page.evaluate((t) => {
      window.__short.seek(t);
      return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, f / FPS);
    await page.screenshot({ path: path.join(TMP, 'type', `f${String(f).padStart(5, '0')}.png`), omitBackground: true });
    /* The first frame decides whether the next three minutes are worth capturing.

       A layer that comes back opaque overlays the picture out of existence, and the result
       encodes cleanly, runs the right length and reports nothing — the whole film is black
       and every check passes. Checked once, here, rather than discovered in the output. */
    if (f === 0) {
      const { stdout } = await execFileP('ffmpeg', ['-v', 'error',
        '-i', path.join(TMP, 'type', 'f00000.png'),
        '-vf', 'alphaextract,signalstats,metadata=print:key=lavfi.signalstats.YMIN:file=-',
        '-f', 'null', '-'], { maxBuffer: 1 << 22 }).catch(() => ({ stdout: '' }));
      const min = Number((stdout.match(/YMIN=(\d+)/) || [])[1] ?? -1);
      if (min >= 255) {
        throw new Error('the type layer captured fully opaque — it would overlay the picture '
          + 'out of existence. Check that html.layer sets a transparent background on the '
          + 'root element and not only on body.');
      }
    }
    if (f % 100 === 0) process.stdout.write(`    ${((f / n) * 100).toFixed(0)}%   \r`);
  }
  console.log(`\n  type captured in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  await page.close();
}

// ── 4. the bed ───────────────────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 320, height: 240 } });
  await page.goto(`${base}?layer=vig`, { waitUntil: 'load' });
  const { cues } = buildUnderscore(
    beats.map((b, k) => ({ start: beats.slice(0, k).reduce((a, x) => a + x.dur, 0), dur: b.dur })),
    total + 1, 0.62, false);
  const b64 = await page.evaluate(async ({ c, d }) => {
    const { renderWav } = await import('/src/audio.js');
    const bytes = await renderWav(c, d);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }, { c: cues, d: total + 1 });
  await writeFile(path.join(TMP, 'bed.wav'), Buffer.from(b64, 'base64'));
  console.log(`  bed: ${cues.length} cues`);
  await page.close();
}
await browser.close();

// ── 5. the picture ───────────────────────────────────────────────────────
/* The era's own beats, in portrait. Cut one per line, in order, wrapping if the era has
   fewer clips than the short has lines — the abstract vocabulary repeats across a channel
   by design, and a viewer sees one Short at a time. */
const vdir = path.join('eras', ERA, 'clips-v');
const clips = (await readdir(vdir).catch(() => [])).filter((f) => f.endsWith('.mp4')).sort();
if (!clips.length) {
  console.error(`no portrait clips in ${vdir} — run: node tools/gen-era.mjs ${ERA} --what clips --vertical`);
  process.exit(1);
}
const picture = path.join(TMP, 'picture.mp4');
{
  const args = [];
  for (const [k] of beats.entries()) args.push('-i', path.join(vdir, clips[k % clips.length]));
  const f = [];
  /* Each clip is trimmed to its line, scaled to fill, and butted to the next. A cross-fade
     would blur the cut, and the cut is what carries the pace — the picture changes when the
     claim changes, which is the whole grammar of the format. */
  beats.forEach((b, k) => {
    f.push(`[${k}:v]trim=0:${b.dur.toFixed(3)},setpts=PTS-STARTPTS,`
      + `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},`
      + `fps=${FPS},format=yuv420p[p${k}]`);
  });
  f.push(`${beats.map((_, k) => `[p${k}]`).join('')}concat=n=${beats.length}:v=1:a=0[out]`);
  args.push('-filter_complex', f.join(';'), '-map', '[out]',
    '-c:v', 'libx264', '-preset', DRAFT ? 'veryfast' : 'slow', '-crf', DRAFT ? '26' : '17',
    '-pix_fmt', 'yuv420p', '-r', String(FPS), picture);
  await ff(args, 'picture');
}

// ── 6. the composite ─────────────────────────────────────────────────────
const silent = path.join(TMP, 'silent.mp4');
{
  const args = ['-i', picture,
    '-framerate', String(FPS), '-i', path.join(TMP, 'type', 'f%05d.png'),
    '-loop', '1', '-t', String(total), '-i', plates.scrim,
    '-loop', '1', '-t', String(total), '-i', plates.vig,
    '-loop', '1', '-t', String(total), '-i', plates.grain,
    '-loop', '1', '-t', String(total), '-i', plates.wm,
    '-f', 'lavfi', '-t', String(total), '-i', `color=c=0x0d0b09:s=${W}x${H}:r=${FPS}`];
  const f = [];
  /* The picture runs out when the narration does; the close is the wordmark over the paper,
     so the last frame is held under it rather than the film simply stopping. */
  f.push(`[0:v]tpad=stop_mode=clone:stop_duration=${(TAIL + 0.5).toFixed(2)}[pic]`);
  f.push(`[2:v]format=rgba[scrim]`);
  f.push('[pic][scrim]overlay=format=auto[a]');
  f.push('[1:v]format=rgba[ty]');
  f.push('[a][ty]overlay=format=auto:eof_action=pass[b]');
  f.push(`[6:v]format=rgba,fade=t=in:st=${(runtime - 0.35).toFixed(2)}:d=0.8:alpha=1[paper]`);
  f.push(`[5:v]format=rgba,fade=t=in:st=${(runtime + 0.15).toFixed(2)}:d=0.7:alpha=1[wmk]`);
  f.push('[b][paper]overlay=format=auto[c]');
  f.push('[c][wmk]overlay=format=auto[d]');
  f.push('[3:v]format=rgba[vig]');
  f.push('[d][vig]overlay=format=auto[e]');
  f.push('[4:v]format=rgba[gr]');
  f.push('[e][gr]blend=all_mode=overlay:all_opacity=0.075,format=yuv420p[out]');
  args.push('-filter_complex', f.join(';'), '-map', '[out]',
    '-c:v', 'libx264', '-preset', DRAFT ? 'veryfast' : 'slow', '-crf', DRAFT ? '26' : '17',
    '-pix_fmt', 'yuv420p', '-r', String(FPS), '-t', String(total), silent);
  await ff(args, 'composite');
}

// ── 7. the mix ───────────────────────────────────────────────────────────
const voice = path.join(TMP, 'voice.wav');
{
  /* Each line laid at its own start rather than concatenated, so the held beat after a line
     is silence in the mix and not a gap the bed has to guess at. */
  const args = [];
  for (const b of beats) args.push('-i', path.join(EP, 'short-audio', `${String(b.i).padStart(2, '0')}.mp3`));
  const f = [];
  let acc = 0;
  beats.forEach((b, k) => {
    f.push(`[${k}:a]aresample=48000,adelay=${Math.round(acc * 1000)}|${Math.round(acc * 1000)}[v${k}]`);
    acc += b.dur;
  });
  f.push(`${beats.map((_, k) => `[v${k}]`).join('')}amix=inputs=${beats.length}:normalize=0:duration=longest,`
    + `apad,atrim=0:${total}[out]`);
  args.push('-filter_complex', f.join(';'), '-map', '[out]', '-ar', '48000', '-ac', '2', voice);
  await ff(args, 'voice');
}
const mixed = path.join(TMP, 'mixed.wav');
await ff(['-i', voice, '-i', path.join(TMP, 'bed.wav'),
  '-filter_complex', `[1:a]atrim=0:${total},volume=0.62[bed];[0:a][bed]amix=inputs=2:normalize=0:duration=first[out]`,
  '-map', '[out]', '-ar', '48000', '-ac', '2', mixed], 'mix');

const OUTMP4 = path.join(OUT, `${SLUG}-short.mp4`);
await mkdir(OUT, { recursive: true });
await ff(['-i', silent, '-i', mixed, '-map', '0:v', '-map', '1:a',
  '-af', await normaliseTo(mixed, 'programme'),
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
  '-movflags', '+faststart', '-shortest', OUTMP4], 'mux');

// ── 8. the kit ───────────────────────────────────────────────────────────
const srt = beats.map((b, k) => {
  const start = beats.slice(0, k).reduce((a, x) => a + x.dur, 0);
  const t = (s) => {
    const hh = String(Math.floor(s / 3600)).padStart(2, '0');
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(Math.floor(s % 60)).padStart(2, '0');
    const ms = String(Math.round((s % 1) * 1000)).padStart(3, '0');
    return `${hh}:${mm}:${ss},${ms}`;
  };
  return `${k + 1}\n${t(start)} --> ${t(start + b.say)}\n${b.text}\n`;
}).join('\n');
await writeFile(path.join(OUT, `${SLUG}-short.en.srt`), srt);

const title = (meta.titles?.[0] || ep.title).slice(0, 90);
await writeFile(path.join(OUT, 'title.txt'), `${title}\n`);
await writeFile(path.join(OUT, 'description.txt'),
  `${script.lines[0].text}\n\n${script.lines[6].text}\n\n#Shorts #IndianHistory #${ERA}\n`);
await writeFile(path.join(OUT, 'tags.txt'), (meta.tags || []).join(', ') + '\n');
const thumb = path.join(EP, 'thumb-art', 'hold-r1.png');
if (existsSync(thumb)) await copyFile(thumb, path.join(OUT, `${SLUG}-short-cover.png`));

await writeFile(path.join(OUT, 'UPLOAD.md'), `# ${ep.title} — Short

**${title}**

${total.toFixed(1)}s · ${W}x${H} · 9:16 · ${FPS}fps${DRAFT ? ' · DRAFT' : ''}

The claims, over ${ERA}'s own abstract beats in portrait. Same narrator, same bed, same
loudness reference as the long form.

| | |
|---|---|
| video | \`${SLUG}-short.mp4\` |
| captions | \`${SLUG}-short.en.srt\` |
| title | \`title.txt\` |
| description | \`description.txt\` |

## The script

${script.lines.map((l, k) => `${k + 1}. **${l.kick}** — ${l.text}`).join('\n')}

${script.why ? `\n> ${script.why}\n` : ''}
`);

const { stdout } = await execFileP('ffprobe', ['-v', 'error',
  '-show_entries', 'format=duration,size:stream=width,height', '-of', 'default=nw=1', OUTMP4]);
console.log(`\ndone -> ${OUTMP4}\n${stdout.trim()}`);
await assertLoudness(OUTMP4);
