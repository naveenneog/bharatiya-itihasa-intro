/* Build a self-contained episode out of an IndianHistory story.

   The story, its art and its narration live in the IndianHistory project. That
   project is read *only* — nothing here writes to it. Art is downscaled and audio
   copied into episodes/<slug>/ so the episode can be served, moved or shipped on its
   own, and so this repo never depends on a sibling checkout being present.

   The interesting part of the source data is the word-level timing on every English
   line: `words: [{ w, t, d }]` in milliseconds. That is what lets the caption track
   the narration word by word instead of just appearing and disappearing.

     node tools/build-episode.mjs
     node tools/build-episode.mjs --story aryabhata_turns_the_earth --slug aryabhata
*/
import { mkdir, readFile, writeFile, copyFile, rm, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { episodePage, CUTS } from './episode-page.mjs';

const execFileP = promisify(execFile);
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };

const SRC = flag('src', 'C:/Users/navg/DailyApps/IndianHistory');
const STORY = flag('story', 'aryabhata_turns_the_earth');
const SLUG = flag('slug', 'aryabhata');
const OUT = path.join('episodes', SLUG);
const MAXW = 1280;                       // art is 1024-1536px square-ish; 1280 is plenty at 1080p

const srcJson = path.join(SRC, 'app', 'data', `${STORY}.player.json`);
const story = JSON.parse(await readFile(srcJson, 'utf8'));

await mkdir(path.join(OUT, 'img'), { recursive: true });
await mkdir(path.join(OUT, 'audio'), { recursive: true });

/** Resolve a path as written in the story data against the source project. */
const srcAsset = (p) => path.join(SRC, 'app', p.replace(/^assets\//, 'assets/'));

async function art(rel, { alpha = false } = {}) {
  if (!rel) return null;
  const from = srcAsset(rel);
  const ext = alpha ? 'png' : 'jpg';
  const name = `${path.basename(path.dirname(rel))}_${path.basename(rel, path.extname(rel))}.${ext}`;
  const to = path.join(OUT, 'img', name);
  // re-encoding thirty images on every run makes iterating on the player slow for no gain
  const fresh = await stat(to).then((s) => s.mtimeMs, () => 0);
  const src = await stat(from).then((s) => s.mtimeMs, () => Infinity);
  if (fresh > src) return `../img/${name}`;
  // character cutouts carry alpha and must stay png; backgrounds are photographic, so jpeg
  const enc = alpha ? [] : ['-q:v', '3'];
  await execFileP('ffmpeg', ['-y', '-loglevel', 'error', '-i', from,
    '-vf', `scale='min(${MAXW},iw)':-2:flags=lanczos`, ...enc, to]);
  return `../img/${name}`;
}

async function audio(rel) {
  if (!rel) return null;
  const from = srcAsset(rel);
  const name = rel.replace(/^.*\/audio\//, '').replace(/\//g, '_');
  const to = path.join(OUT, 'audio', name);
  await copyFile(from, to);
  return `../audio/${name}`;
}

/** Encoded length, so the player can lay panels on a timeline before anything loads. */
async function seconds(file) {
  try {
    const { stdout } = await execFileP('ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(OUT, file.replace('../', ''))]);
    return +parseFloat(stdout.trim()).toFixed(3);
  } catch { return 0; }
}

const panels = [];
let n = 0;
for (const p of story.panels) {
  const line = p.lines?.[0];
  if (!line) continue;
  const [imgPath, aEn, aHi] = await Promise.all([
    art(p.art), audio(line.audio?.en), audio(line.audio?.hi),
  ]);
  const dur = aEn ? await seconds(aEn) : 0;

  /* Four of the twenty-eight panels are not plain pictures: a located map, two action
     beats with a cut-out figure moving over a panning background, and a split of three
     slogan slices. Carrying their structure through rather than flattening it is the
     difference between the sample showing what the format can do and showing four
     black frames. */
  const extra = {};
  if (p.type === 'map') {
    extra.map = await art(p.map);
    extra.pin = { x: p.x ?? 0.5, y: p.y ?? 0.5, label: p.label || '' };
  }
  if (p.type === 'action') {
    extra.bg = await art(p.bg);
    const cs = Array.isArray(p.chars) ? p.chars : (p.chars ? [p.chars] : []);
    extra.chars = [];
    for (const c of cs) extra.chars.push({ img: await art(c.img, { alpha: true }), motion: c.motion || {} });
    extra.motion = p.motion || {};
  }
  if (p.type === 'split') {
    extra.slices = [];
    for (const s of (p.slices || [])) {
      extra.slices.push({ img: await art(s.img), slogan: s.slogan || { en: '', hi: '' } });
    }
  }

  panels.push({
    id: p.id,
    kind: p.type || 'panel',
    mood: p.mood || null,
    art: imgPath,
    role: line.role || 'narrator',
    speech: line.type === 'speech',
    text: { en: line.text?.en || '', hi: line.text?.hi || '' },
    audio: { en: aEn, hi: aHi },
    // only English carries word timings in the source; Hindi captions run whole-line
    words: (line.words?.en || []).map((w) => [w.w, w.t, w.d]),
    dur,
    ...extra,
  });
  n++;
  if (n % 6 === 0) console.log(`  ${n}/${story.panels.length} panels`);
}

const total = panels.reduce((a, p) => a + p.dur, 0);
const episode = {
  id: story.id,
  slug: SLUG,
  title: story.title,
  title_i18n: story.title_i18n || null,
  figure: story.figure,
  era: story.era,
  moral: story.moral,
  hero: story.hero,
  langs: story.langs || ['en', 'hi'],
  runtime: +total.toFixed(1),
  panels,
};
await writeFile(path.join(OUT, 'episode.json'), JSON.stringify(episode, null, 2));

for (const cut of CUTS) {
  const dir = path.join(OUT, cut.id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), episodePage(episode, cut));
  console.log(`  ok   ${cut.id.padEnd(14)} ${cut.name}`);
}

console.log(`\n${panels.length} panels, ${(total / 60).toFixed(1)} min of narration -> ${OUT}/`);
console.log(`${CUTS.length} cuts to compare`);
