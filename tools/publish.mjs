/* Everything YouTube needs besides the file itself.

   A master that nobody can find, follow or read is not published, it is uploaded.
   This writes the four things that decide whether a video is watchable in a feed:

     .srt          captions, cut from the same word timings the on-screen text uses
     chapters.txt  the description block, first mark at 00:00, every chapter >= 10s
     description   hook first, because only the first two lines are visible
     thumbnail     1280x720, composed in the project's own typography

   Every time here is derived from the episode data and the cut, including the shift
   that the spliced title sequence introduces. Nothing is transcribed by hand, so a
   change to a panel's narration cannot leave the captions a second out.

   With --master it also collects the video itself and the title sequence, so the folder
   is everything the upload needs and nothing has to be fetched from somewhere else at
   the moment of publishing.

     node tools/publish.mjs --cut cut-e-framed --intro dist/v7-gupta-stinger.mp4
     node tools/publish.mjs --slug zero --master dist/zero-v1-cut-e-framed.mp4 \
       --out dist/upload-zero-v1
*/
import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { CUTS, openIndices } from './episode-page.mjs';

const execFileP = promisify(execFile);

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };

const SLUG = arg('slug', 'aryabhata');
const CUT = arg('cut', 'cut-e-framed');
const INTRO = arg('intro', 'dist/v7-gupta-stinger.mp4');
const MASTER = arg('master', null);
const EP = path.join('episodes', SLUG);
const OUT = arg('out', path.join('dist', `publish-${SLUG}`));

const ep = JSON.parse(await readFile(path.join(EP, 'episode.json'), 'utf8'));
const meta = JSON.parse(await readFile(path.join(EP, 'publish.json'), 'utf8'));
const cut = CUTS.find((c) => c.id === CUT);
if (!cut) throw new Error(`unknown cut ${CUT}`);

const introLen = await (async () => {
  const { stdout } = await execFileP('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', path.resolve(INTRO)]);
  return Number(stdout.trim());
})();

await mkdir(OUT, { recursive: true });

/* The cut's own order, and where the titles land in it. Panels before the splice keep
   their times; everything after is pushed back by the title sequence. */
const openIdx = openIndices(ep.panels, cut);
const restIdx = ep.panels.map((_, n) => n).filter((n) => !openIdx.includes(n));
const order = [...openIdx, ...restIdx].map((n) => ep.panels[n]);

const spliceAt = order.slice(0, openIdx.length).reduce((a, p) => a + p.dur, 0);
let acc = 0;
const timed = order.map((p) => {
  const bodyStart = acc;
  acc += p.dur;
  return { ...p, bodyStart, start: bodyStart + (bodyStart >= spliceAt - 1e-6 ? introLen : 0) };
});
const runtime = acc + introLen;

// ── captions ─────────────────────────────────────────────────────────────
/* Word timings are per panel and in milliseconds from that panel's own audio. Grouped
   into cues short enough to read: at most two lines, ~42 characters each, and never
   spanning a panel, because a caption that outlives its picture reads as a glitch. */
const MAXLINE = 42;
const MAXCUE = 6.0;

function wrap(text) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > MAXLINE) { lines.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2).join('\n') + (lines.length > 2 ? ' ' + lines.slice(2).join(' ') : '');
}

const ts = (s) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor(ms / 60000) % 60).padStart(2, '0');
  const sec = String(Math.floor(ms / 1000) % 60).padStart(2, '0');
  return `${h}:${m}:${sec},${String(ms % 1000).padStart(3, '0')}`;
};

const cues = [];
for (const p of timed) {
  if (!p.words?.length) {
    if (p.text?.en) cues.push({ a: p.start, b: p.start + p.dur, t: p.text.en });
    continue;
  }
  let bag = [];
  const flush = (endMs) => {
    if (!bag.length) return;
    const a = p.start + bag[0][1] / 1000;
    const b = p.start + endMs / 1000;
    cues.push({ a, b: Math.min(b, p.start + p.dur), t: bag.map((w) => w[0]).join(' ') });
    bag = [];
  };
  for (let k = 0; k < p.words.length; k++) {
    const w = p.words[k];
    const line = [...bag, w].map((x) => x[0]).join(' ');
    const span = (w[1] + w[2] - (bag.length ? bag[0][1] : w[1])) / 1000;
    bag.push(w);
    const next = p.words[k + 1];
    const endsClause = /[.,;:?!—]$/.test(w[0]);
    if (!next || line.length > MAXLINE * 2 - 8 || span > MAXCUE || (endsClause && line.length > MAXLINE * 0.7)) {
      flush(next ? Math.min(w[1] + w[2] + 90, next[1]) : w[1] + w[2] + 220);
    }
  }
  flush(p.words[p.words.length - 1][1] + p.words[p.words.length - 1][2]);
}
cues.sort((a, b) => a.a - b.a);
for (let k = 1; k < cues.length; k++) if (cues[k].a < cues[k - 1].b) cues[k - 1].b = cues[k].a - 0.02;

const srt = cues
  .filter((c) => c.b > c.a + 0.15)
  .map((c, k) => `${k + 1}\n${ts(c.a)} --> ${ts(c.b)}\n${wrap(c.t)}\n`)
  .join('\n');
await writeFile(path.join(OUT, `${SLUG}.en.srt`), srt);

// ── chapters ─────────────────────────────────────────────────────────────
/* YouTube's rules, enforced rather than assumed: the first mark must be 00:00, there
   must be at least three, and none may be shorter than ten seconds. A chapter list
   that breaks any of these is silently ignored, which looks identical to not having
   written one. */
const clock = (s) => {
  const t = Math.max(0, Math.floor(s));
  const m = Math.floor(t / 60);
  const sec = String(t % 60).padStart(2, '0');
  return t >= 3600 ? `${Math.floor(t / 3600)}:${String(m % 60).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

let marks = timed
  .filter((p) => meta.chapters[p.id])
  .map((p) => ({ at: p.start, name: meta.chapters[p.id] }))
  .sort((a, b) => a.at - b.at);
/* The cold open is authored after the packaging is, so nothing has named it. "Open" is a
   wasted first chapter — it is the one every viewer sees in the description box, and it
   should say what the video claims. "The claim" is what episode one called the same beat. */
if (!marks.length || marks[0].at > 0.5) {
  const first = order[0].id;
  marks.unshift({ at: 0, name: meta.chapters[first] || (first === 'hook' ? 'The claim' : 'Open') });
}
marks[0].at = 0;

const kept = [];
for (const m of marks) {
  if (!kept.length) { kept.push(m); continue; }
  if (m.at - kept[kept.length - 1].at >= 10) kept.push(m);
}
if (kept.length < 3) throw new Error(`only ${kept.length} chapters survive the 10s rule — add marks to publish.json`);
const dropped = marks.length - kept.length;

const chapters = kept.map((m) => `${clock(m.at)} ${m.name}`).join('\n');
await writeFile(path.join(OUT, 'chapters.txt'), chapters + '\n');

// ── description ──────────────────────────────────────────────────────────
/* Only the first two lines show before "…more", so the hook goes there and nothing
   else competes with it. */
const description = [
  meta.hook,
  '',
  `${ep.title} — ${ep.era || ''}`.trim(),
  '',
  'CHAPTERS',
  chapters,
  '',
  ep.moral ? `“${ep.moral}”` : '',
  '',
  'Bhāratīya Itihāsa — India\'s history, one story at a time.',
  '',
  meta.tags.map((t) => '#' + t.replace(/[^A-Za-z0-9]/g, '')).join(' '),
].filter((l) => l !== null).join('\n');
await writeFile(path.join(OUT, 'description.txt'), description);
await writeFile(path.join(OUT, 'tags.txt'), meta.tags.join(', '));

// ── thumbnail ────────────────────────────────────────────────────────────
/* The thumbnail is *not* composed here. tools/thumbnail.mjs builds the candidates, checks
   them for overflow and safe area, and renders them at feed size so the choice is made at
   the size the thumbnail is actually judged at. This step only collects the one that was
   picked.

   It used to be composed here as well, with its own copy of the CSS — two renderers for
   one artefact, which is a guarantee that the published thumbnail and the one that was
   approved will drift apart. */
const cand = meta.thumb?.candidate;
if (!cand) {
  throw new Error('publish.json has no thumb.candidate — run:\n'
    + '  node tools/gen-thumb-art.mjs\n  node tools/thumbnail.mjs\n'
    + '  node tools/thumbnail.mjs --pick <candidate-id>');
}
const thumbSrc = path.join('dist', `thumbs-${SLUG}`, `${cand}.png`);
if (!existsSync(thumbSrc)) {
  throw new Error(`picked thumbnail "${cand}" has not been rendered — run: node tools/thumbnail.mjs`);
}
await copyFile(thumbSrc, path.join(OUT, `${SLUG}-thumb.png`));
await execFileP('ffmpeg', ['-y', '-loglevel', 'error', '-i', thumbSrc, '-q:v', '2',
  path.join(OUT, `${SLUG}-thumb.jpg`)]);
await execFileP('ffmpeg', ['-y', '-loglevel', 'error', '-i', thumbSrc, '-vf', 'scale=320:180',
  path.join(OUT, `${SLUG}-thumb-feed.png`)]);

/* YouTube rejects a custom thumbnail over 2 MB. jpeg q2 of a mostly-black frame is
   nowhere near it, but the failure happens at upload time rather than here, so it is
   worth the one stat call. */
const thumbBytes = statSync(path.join(OUT, `${SLUG}-thumb.jpg`)).size;
if (thumbBytes > 2 * 1024 * 1024) {
  throw new Error(`thumbnail is ${(thumbBytes / 1024 / 1024).toFixed(1)} MB — YouTube's limit is 2 MB`);
}

/* ── the A/B set ──────────────────────────────────────────────────────────
   YouTube can test up to three thumbnails against each other, and the title is worth
   testing too. Both were being decided once and then lost: the alternatives existed in
   publish.json and in dist/thumbs-<slug>/ and neither travelled with the upload.

   So the folder carries the runners-up as well as the winner. The picked thumbnail is
   always A, so a folder is unambiguous about what shipped. */
const AB = path.join(OUT, 'ab');
await mkdir(AB, { recursive: true });

const sheet = path.join('dist', `thumbs-${SLUG}`);
const others = (await readdir(sheet).catch(() => []))
  .filter((f) => f.endsWith('.png') && !f.startsWith('sheet') && f !== `${cand}.png`)
  /* The candidates directory also holds a 320x180 preview of each one. Those are outputs,
     not candidates — taking them as alternatives produced a `-feed-feed.png` and an 18 KB
     "thumbnail" that was a feed preview blown back up. */
  .filter((f) => !f.endsWith('-feed.png'))
  /* One per concept beyond the winner. Three variations of the same picture is not a test,
     it is the same thumbnail three times. */
  .filter((f) => !f.startsWith('quiet-'));

const seenArt = new Set([cand.replace(/^(LOUD|quiet)-/, '').split('-')[0]]);
const picks2 = [];
for (const f of others) {
  const concept = f.replace(/^(LOUD|quiet)-/, '').split('-')[0];
  if (seenArt.has(concept)) continue;
  seenArt.add(concept);
  picks2.push(f);
  if (picks2.length >= 2) break;
}

const abList = [[`A-${cand}`, path.join(sheet, `${cand}.png`)]];
for (const [i, f] of picks2.entries()) abList.push([`${'BC'[i]}-${f.replace(/\.png$/, '')}`, path.join(sheet, f)]);

for (const [name, src] of abList) {
  await execFileP('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-q:v', '2', path.join(AB, `${name}.jpg`)]);
  await execFileP('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', 'scale=320:180', path.join(AB, `${name}-feed.png`)]);
}

/* Titles too. The model ranked five and marked the risky ones; shipping only the first
   throws away the test. */
const titles = (meta.options?.titles || []).map((t, i) =>
  `${i === 0 ? 'A' : 'ABC'[i] || i + 1}. ${t.text}${t.risk && t.risk !== 'none' ? `   [${t.risk}]` : ''}`
    + (t.why ? `\n     ${t.why}` : ''));
await writeFile(path.join(AB, 'titles.txt'),
  `${titles.length ? titles.join('\n\n') : meta.title || ep.title}\n`);

const headlines = (meta.options?.thumb_headlines || []).map((h, i) =>
  `${i + 1}. ${h.lines.join(' / ')}${h.risk && h.risk !== 'none' ? `   [${h.risk}]` : ''}`);
await writeFile(path.join(AB, 'headlines.txt'), `${headlines.join('\n')}\n`);

// ── the video, and the sequence in front of it ───────────────────────────
/* Collected rather than referenced. An upload folder that points at a master somewhere
   else is one `dist` clean away from being a folder of text files. */
const collected = [];
if (MASTER) {
  if (!existsSync(MASTER)) throw new Error(`--master ${MASTER} does not exist`);
  await copyFile(MASTER, path.join(OUT, `${SLUG}.mp4`));
  collected.push([`${SLUG}.mp4`, statSync(MASTER).size]);
}
if (existsSync(INTRO)) {
  await copyFile(INTRO, path.join(OUT, `${SLUG}-intro.mp4`));
  collected.push([`${SLUG}-intro.mp4`, statSync(INTRO).size]);
}

// ── the checklist ────────────────────────────────────────────────────────
/* What goes where, in the order YouTube's upload form asks for it. Written into the
   folder rather than remembered, because the cost of pasting the description into the
   title field is a published video with a broken title. */
const mb = (b) => `${(b / 1024 / 1024).toFixed(1)} MB`;
const upload = [
  `# ${meta.title || ep.title}`,
  '',
  `Cut ${CUT} · runtime ${clock(runtime)} · titles ${introLen.toFixed(1)}s at ${clock(spliceAt)}`,
  '',
  '## Upload',
  '',
  `1. Video          ${SLUG}.mp4`,
  `2. Title          see title.txt (alternatives in ${path.relative('.', path.join(EP, 'publish.json'))})`,
  `3. Description    description.txt — paste whole, chapters are already in it`,
  `4. Thumbnail      ${SLUG}-thumb.jpg`,
  `5. Subtitles      ${SLUG}.en.srt (English, manual)`,
  `6. Tags           tags.txt`,
  '',
  '## A/B testing',
  '',
  'YouTube tests up to three thumbnails against each other. `ab/` holds them, A first —',
  'A is what shipped, B and C are different concepts rather than restyles of the same one.',
  'Each has a `-feed.png` at 320x180, which is the size the choice is actually made at.',
  '',
  '  ab/titles.txt      five ranked titles, overclaims marked',
  '  ab/headlines.txt   five ranked thumbnail headlines',
  '',
  '## Check before publishing',
  '',
  '- [ ] The first chapter reads 0:00 in the description box.',
  '- [ ] The thumbnail is legible in the mobile preview, not just the desktop one.',
  '- [ ] The title and the thumbnail say two different things.',
  '- [ ] Captions are set to English, not auto-generated.',
  '',
  '## In this folder',
  '',
  ...collected.map(([f, b]) => `  ${f.padEnd(28)} ${mb(b)}`),
].join('\n');
await writeFile(path.join(OUT, 'UPLOAD.md'), `${upload}\n`);
await writeFile(path.join(OUT, 'title.txt'), `${meta.title || ep.title}\n`);

// ── report ───────────────────────────────────────────────────────────────
const last = cues[cues.length - 1];
console.log(`${SLUG} / ${CUT} -> ${OUT}/`);
console.log(`  runtime      ${clock(runtime)}  (body ${clock(acc)} + titles ${introLen.toFixed(1)}s at ${clock(spliceAt)})`);
console.log(`  captions     ${cues.length} cues, last ends ${clock(last.b)} -> ${SLUG}.en.srt`);
console.log(`  chapters     ${kept.length} kept${dropped ? `, ${dropped} dropped for the 10s rule` : ''} -> chapters.txt`);
console.log(`  description  ${description.split('\n').length} lines -> description.txt`);
console.log(`  thumbnail    ${cand} -> ${SLUG}-thumb.jpg (${(thumbBytes / 1024).toFixed(0)} KB)`);
for (const [f, b] of collected) console.log(`  video        ${f} (${mb(b)})`);
console.log(`\n${chapters}`);
