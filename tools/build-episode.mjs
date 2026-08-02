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
import { mkdir, readFile, readdir, writeFile, copyFile, rm, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { episodePage, CUTS } from './episode-page.mjs';

const execFileP = promisify(execFile);
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };

const SRC = flag('src', 'C:/Users/navg/DailyApps/IndianHistory');
const SLUG = flag('slug', 'aryabhata');
/* The language is part of the episode's identity, not a rendering option. Hindi narration is a
   different length line by line, so every duration, every splice point and every chapter mark
   differs — it is a different timeline over the same pictures, and it gets its own folder. The
   folder name is derived rather than passed, because a language flag and a path flag that can
   disagree is exactly the shape of the bug described below. */
const LANG = flag('lang', 'en');
const EPID = LANG === 'en' ? SLUG : `${SLUG}-${LANG}`;
const OUT = path.join('episodes', EPID);
const MAXW = 1280;                       // art is 1024-1536px square-ish; 1280 is plenty at 1080p

/* Which upstream story this slug is, and the refusal to guess.

   `--story` and `--slug` were two independently defaulting flags. Passing only `--slug zero`
   changed where the episode was written and left the story at its default, so Aryabhata's
   script was built into Brahmagupta's episode: same pictures, entirely different narration,
   twenty-seven of twenty-nine panels replaced. It rendered, scored, and published. I read the
   48-second change as a re-recorded voice track and wrote a section of the context document
   explaining a drift that was not happening.

   This is the *second* tool to make this exact mistake — see bugs.md §1, where speak.mjs
   --slug zero read Aryabhata's lines for the same reason. Defaults that only make sense
   together must not be settable apart.

   An episode already on disk records the story it was built from, so a rebuild does not need
   to be told twice, and being told something different is an error rather than an instruction. */
const existing = await readFile(path.join(OUT, 'episode.json'), 'utf8')
  .then(JSON.parse).catch(() => null);
const asked = flag('story', null);
const STORY = asked || existing?.id || (SLUG === 'aryabhata' ? 'aryabhata_turns_the_earth' : null);

if (!STORY) {
  console.error(`no story for --slug ${SLUG}: pass --story <upstream_id> the first time it is built`);
  process.exit(1);
}
if (existing && existing.id && existing.id !== STORY && !argv.includes('--restory')) {
  console.error(`episodes/${EPID} was built from "${existing.id}" and you asked for "${STORY}".`);
  console.error('One of the two is wrong. Pass --restory only if you mean to replace the story.');
  process.exit(1);
}
if (existing && existing.lang && existing.lang !== LANG) {
  console.error(`episodes/${EPID} was built as "${existing.lang}" and you asked for "${LANG}".`);
  process.exit(1);
}
console.log(`${EPID} <- ${STORY} [${LANG}]`);

const story = JSON.parse(await readFile(path.join(SRC, 'app', 'data', `${STORY}.player.json`), 'utf8'));
if (!(story.langs || ['en']).includes(LANG)) {
  console.error(`${STORY} has no "${LANG}" narration — it has ${(story.langs || ['en']).join(', ')}`);
  process.exit(1);
}

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

/* The source stores narration as audio/<lang>/<key>.mp3; this repo keeps it flat, so the
   path is folded to <lang>_<key>.mp3. Both the copy and the override lookup derive the
   name here, because when they each had their own rule they disagreed and the override
   silently never matched. */
const flatName = (rel) => rel.replace(/^.*\/audio\//, '').replace(/\//g, '_');

async function audio(rel) {
  if (!rel) return null;
  const from = srcAsset(rel);
  const name = flatName(rel);
  const to = path.join(OUT, 'audio', name);
  await copyFile(from, to);
  return `../audio/${name}`;
}

/* Lines re-synthesised locally by tools/speak.mjs, because the source project reads a
   bare year as a quantity — "499 CE" as four hundred ninety-nine. The fix belongs in
   IndianHistory/tools/voice.py and will be ported there; until then the override wins,
   and the source project is still only ever read from.

   Keyed by the flattened audio name, so a line whose narration is later regenerated
   upstream is matched by name rather than by position. */
const fixes = await readFile(path.join(OUT, 'voice-fix', 'index.json'), 'utf8')
  .then(JSON.parse).catch(() => ({}));
let overridden = 0;

/** The override for a source audio path, if one exists. */
function fixFor(rel) {
  if (!rel) return null;
  const key = flatName(rel).replace(/\.[^.]+$/, '');
  return fixes[key] ? { key, ...fixes[key] } : null;
}

async function audioFixed(rel) {
  const fix = fixFor(rel);
  if (!fix) return audio(rel);
  const name = flatName(rel);
  await copyFile(path.join(OUT, 'voice-fix', fix.mp3), path.join(OUT, 'audio', name));
  overridden++;
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

/* How long a token takes to *say*, which is not how long it is to write. "499" is three
   characters and three words of speech. Digits are weighted accordingly so a repaired
   span is divided by spoken length rather than by character count. */
const spokenWeight = (tok) => {
  const t = String(tok).replace(/[^\p{L}\p{N}]/gu, '');
  const digits = (t.match(/\d/g) || []).length;
  return Math.max(1, (t.length - digits) + digits * 3.5);
};

/* Repair the source alignment instead of trusting it.

   It is per-word on 27 of the 28 panels. On the cover — the first thing any viewer sees —
   the opening four words come back fused into a single token timed 297 ms at t=4421, so the
   line is spoken for four and a half seconds with nothing lit and then the whole phrase
   flashes and disappears. A fused token really spans from where the previous word ended to
   where the next one starts, so it is given that span and split across its words by spoken
   length. Returns how many tokens it had to repair, so the build reports it rather than
   silently papering over bad data. */
function repairWords(words, durSec) {
  if (!words.length) return { words: [], fixed: 0 };
  const out = [];
  let fixed = 0;
  for (let k = 0; k < words.length; k++) {
    const [w, t, d] = words[k];
    const parts = String(w).trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) { out.push([w, t, d]); continue; }
    const prevEnd = out.length ? out[out.length - 1][1] + out[out.length - 1][2] : 0;
    const nextStart = k + 1 < words.length ? words[k + 1][1] : Math.round(durSec * 1000);
    const start = Math.min(t, prevEnd);
    const span = Math.max(1, Math.max(t + d, nextStart) - start);
    const total = parts.reduce((a, p) => a + spokenWeight(p), 0);
    let acc = start;
    for (const p of parts) {
      const share = Math.round(span * (spokenWeight(p) / total));
      out.push([p, acc, share]);
      acc += share;
    }
    fixed++;
  }
  return { words: out, fixed };
}

const panels = [];
let n = 0;
let repaired = 0;
for (const p of story.panels) {
  const line = p.lines?.[0];
  if (!line) continue;
  const [imgPath, aEn, aHi] = await Promise.all([
    art(p.art), audioFixed(line.audio?.en), audio(line.audio?.hi),
  ]);
  /* The timeline belongs to the language being built. Taking the duration from English and
     playing Hindi over it is how a dub goes out of sync with its own pictures. */
  const track = LANG === 'en' ? aEn : aHi;
  if (!track) {
    console.error(`panel ${p.id} has no ${LANG} audio — cannot build a ${LANG} timeline`);
    process.exit(1);
  }
  const dur = await seconds(track);

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

  /* Word timings exist for English only. The source ships none for Hindi, and the Hindi voice
     the source chose (MAI-Voice-2) returns none from the synthesiser either — that architecture
     does not emit boundaries at all, while the ordinary hi-IN neural voices do. Keeping the
     better voice therefore means keeping whole-line Hindi captions, which is a deliberate
     choice: a caption swept word by word on invented timings would light the wrong word and
     look exactly like one that worked. */
  const rawWords = LANG === 'en' ? (line.words?.en || []).map((w) => [w.w, w.t, w.d]) : [];
  /* A re-synthesised line carries its own boundaries, already folded back onto the
     written tokens — the source timings belong to audio that is no longer being played
     and would drift the caption by seconds. */
  const fix = LANG === 'en' ? fixFor(line.audio?.en) : null;
  const { words, fixed } = fix
    ? { words: fix.words, fixed: 0 }
    : repairWords(rawWords, dur);
  repaired += fixed;
  if (fixed) console.log(`  repaired ${fixed} fused token(s) in ${p.id}`);

  panels.push({
    id: p.id,
    kind: p.type || 'panel',
    mood: p.mood || null,
    art: imgPath,
    role: line.role || 'narrator',
    speech: line.type === 'speech',
    text: { en: line.text?.en || '', hi: line.text?.hi || '' },
    audio: { en: aEn, hi: aHi },
    words,
    dur,
    ...extra,
  });
  n++;
  if (n % 6 === 0) console.log(`  ${n}/${story.panels.length} panels`);
}

const total = panels.reduce((a, p) => a + p.dur, 0);

/* The channel's own cold open, if one has been written. It goes in front of everything as a
   real panel, so the player, the renderer, the captions and the chapter times all treat it
   like any other — rather than as a special case that four separate tools have to know
   about and one of them will forget. */
const hook = await readFile(path.join(OUT, 'hook', 'hook.json'), 'utf8')
  .then(JSON.parse).catch(() => null);
if (hook?.dur) {
  /* The picture is resolved here, from whichever thumbnail was picked, rather than frozen
     into hook.json when the line was written. The whole point of the cold open is that it
     is the frame the viewer clicked; picking a different thumbnail later has to move it too,
     or the two silently drift apart and nobody notices until they are side by side. */
  const picked = await readFile(path.join(OUT, 'publish.json'), 'utf8')
    .then((s) => JSON.parse(s).thumb?.art).catch(() => null);
  if (picked) {
    await copyFile(path.join(OUT, picked), path.join(OUT, 'hook', 'hook.png'));
    console.log(`  cold open uses ${picked}`);
  }
  /* The mp3 is copied into audio/ with every other line rather than referenced where it was
     written. The renderer gathers narration from one directory, and a panel whose audio
     lives somewhere else is a special case that every consumer would have to know about. */
  await copyFile(path.join(OUT, 'hook', 'hook.mp3'), path.join(OUT, 'audio', `${LANG}_hook.mp3`));
  panels.unshift({
    id: 'hook',
    kind: 'panel',
    mood: 'suspense',
    art: hook.art,
    role: 'narrator',
    speech: false,
    text: { en: LANG === 'en' ? hook.line : '', hi: LANG === 'hi' ? hook.line : '' },
    audio: { en: LANG === 'en' ? '../audio/en_hook.mp3' : null, hi: LANG === 'hi' ? '../audio/hi_hook.mp3' : null },
    words: hook.words || [],
    dur: hook.dur,
  });
}

/* The upstream sample this build was taken from.

   build-episode is the only thing that reads the source project, and nothing used to
   record when it last did. Between rendering v4 and v5 of one episode, upstream had
   regenerated the whole voice track nine days earlier: v1–v4 were cut against a 293.8 s
   narration and v5 against a 342.5 s one, twenty-seven of twenty-nine panels different.
   Both were correct builds. The set was no longer a comparison of caption treatments.

   Stamping the newest mtime seen lets every downstream tool ask whether the sample it is
   about to spend forty minutes rendering is still the current one. */
/* The first line of the first panel that has narration — not `p.audio`, which panels do not
   have. Reading it off the panel gave '', so dirname twice gave '.', and the stamp watched
   IndianHistory/app instead of the story's audio folder: a drift detector pointed at the
   wrong directory reports "unchanged" no matter what changes. */
const anyAudio = story.panels.flatMap((p) => p.lines || []).find((l) => l.audio?.en || l.audio?.hi);
const audioDir = path.join(SRC, 'app', path.dirname(path.dirname(
  (anyAudio?.audio?.en || anyAudio?.audio?.hi || '').replace(/^assets\//, 'assets/'))));
let newestMs = 0;
for (const f of await readdir(audioDir).catch(() => [])) {
  const s = await stat(path.join(audioDir, f)).catch(() => null);
  if (s?.mtimeMs > newestMs) newestMs = s.mtimeMs;
}

const episode = {
  id: story.id,
  slug: SLUG,
  lang: LANG,
  title: story.title,
  title_i18n: story.title_i18n || null,
  figure: story.figure,
  era: story.era,
  moral: story.moral,
  hero: story.hero,
  langs: story.langs || ['en', 'hi'],
  runtime: +total.toFixed(1),
  source: { dir: audioDir.replace(/\\/g, '/'), newestMs, builtAt: Date.now() },
  panels,
};
episode.runtime = +panels.reduce((a, p) => a + p.dur, 0).toFixed(1);
await writeFile(path.join(OUT, 'episode.json'), JSON.stringify(episode, null, 2));

for (const cut of CUTS) {
  const dir = path.join(OUT, cut.id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), episodePage(episode, cut));
  console.log(`  ok   ${cut.id.padEnd(14)} ${cut.name}`);
}

console.log(`\n${panels.length} panels, ${(total / 60).toFixed(1)} min of narration -> ${OUT}/`);
if (repaired) console.log(`${repaired} fused caption token(s) repaired`);
if (overridden) console.log(`${overridden} line(s) using the locally re-synthesised voice (years spoken as years)`);
console.log(`${CUTS.length} cuts to compare`);
