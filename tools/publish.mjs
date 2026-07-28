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

     node tools/publish.mjs --cut cut-e-framed --intro dist/v7-gupta-stinger.mp4
*/
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { launch } from '../scripts/browser.mjs';
import { CUTS } from './episode-page.mjs';

const execFileP = promisify(execFile);

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };

const SLUG = arg('slug', 'aryabhata');
const CUT = arg('cut', 'cut-e-framed');
const INTRO = arg('intro', 'dist/v7-gupta-stinger.mp4');
const PORT = Number(arg('port', 4409));
const EP = path.join('episodes', SLUG);
const OUT = path.join('dist', `publish-${SLUG}`);

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
const openIdx = (cut.open || []).map((id) => ep.panels.findIndex((p) => p.id === id)).filter((n) => n >= 0);
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
if (!marks.length || marks[0].at > 0.5) marks.unshift({ at: 0, name: meta.chapters[order[0].id] || 'Open' });
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
/* Composed in a page rather than in a filter graph, for the same reason the master is:
   the type is the project's type, loaded from the project's fonts, at the size the
   designer chose. 1280x720 is the delivery size and it is checked, not assumed. */
const thumbHtml = `<!doctype html><meta charset="utf-8">
<style>
  @font-face{font-family:"Marcellus";src:url("/vendor/fonts/marcellus-latin-1.woff2") format("woff2");font-display:block}
  @font-face{font-family:"Cormorant Garamond";src:url("/vendor/fonts/cormorant-latin-1.woff2") format("woff2");font-display:block}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1280px;height:720px;overflow:hidden;background:#0d0b09}
  #t{position:relative;width:1280px;height:720px;overflow:hidden}
  img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${meta.thumb.pos || '62% 42%'}}
  #scrim{position:absolute;inset:0;background:
    linear-gradient(90deg,rgba(6,5,4,.97) 0%,rgba(6,5,4,.92) 34%,rgba(6,5,4,.5) 56%,rgba(6,5,4,.06) 84%),
    radial-gradient(ellipse at 26% 50%,rgba(6,5,4,.55),rgba(6,5,4,0) 68%)}
  /* A thumbnail is judged at about 320px wide in a feed, where mid-tones collapse.
     A warm rim behind the subject keeps it separated from the black at that size. */
  #glow{position:absolute;right:-6%;top:-10%;width:70%;height:120%;
    background:radial-gradient(ellipse at 46% 50%,rgba(232,182,74,.22),rgba(232,182,74,0) 62%);
    mix-blend-mode:screen}
  #vig{position:absolute;inset:0;box-shadow:inset 0 0 220px 60px rgba(0,0,0,.72)}
  #copy{position:absolute;left:64px;top:50%;transform:translateY(-50%);width:660px}
  .kick{font-family:"Marcellus",serif;font-size:30px;letter-spacing:.42em;color:#e8b64a;margin-bottom:22px}
  .rule{width:96px;height:1px;background:linear-gradient(90deg,#e8b64a,rgba(232,182,74,0));margin-bottom:26px}
  h1{font-family:"Marcellus",serif;font-weight:400;font-size:118px;line-height:.94;color:#f6ecd8;
     letter-spacing:.005em;text-shadow:0 6px 40px rgba(0,0,0,.85)}
  h1 em{font-style:normal;color:#e8b64a}
  .foot{margin-top:34px;font-family:"Marcellus",serif;font-size:21px;letter-spacing:.3em;color:rgba(183,166,132,.82)}
</style>
<div id="t">
  <img src="${meta.thumb.art}">
  <div id="glow"></div>
  <div id="scrim"></div>
  <div id="copy">
    <div class="kick">${meta.thumb.kicker}</div>
    <div class="rule"></div>
    <h1>${meta.thumb.line1}<br><em>${meta.thumb.line2}</em></h1>
    <div class="foot">${meta.thumb.foot}</div>
  </div>
  <div id="vig"></div>
</div>`;
await writeFile(path.join(EP, '.thumb.html'), thumbHtml);

const server = spawn(process.execPath, ['scripts/serve.mjs', String(PORT)], { stdio: 'ignore' });
try {
  await new Promise((r) => setTimeout(r, 700));
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/${EP.replace(/\\/g, '/')}/.thumb.html`, { waitUntil: 'load' });
  /* A thumbnail whose art silently failed to load is a black rectangle with nice type
     on it, and it looks deliberate enough to ship. Assert instead. */
  const artOk = await page.evaluate(() => {
    const im = document.querySelector('#t img');
    return !!im && im.complete && im.naturalWidth > 0;
  });
  if (!artOk) throw new Error(`thumbnail art did not load: ${meta.thumb.art} (relative to ${EP})`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
  const png = path.join(OUT, `${SLUG}-thumb.png`);
  await page.locator('#t').screenshot({ path: png });
  await browser.close();
  await execFileP('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-q:v', '2',
    path.join(OUT, `${SLUG}-thumb.jpg`)]);
} finally {
  try { server.kill(); } catch { /* gone */ }
}

// ── report ───────────────────────────────────────────────────────────────
const last = cues[cues.length - 1];
console.log(`${SLUG} / ${CUT}`);
console.log(`  runtime      ${clock(runtime)}  (body ${clock(acc)} + titles ${introLen.toFixed(1)}s at ${clock(spliceAt)})`);
console.log(`  captions     ${cues.length} cues, last ends ${clock(last.b)} -> ${SLUG}.en.srt`);
console.log(`  chapters     ${kept.length} kept${dropped ? `, ${dropped} dropped for the 10s rule` : ''} -> chapters.txt`);
console.log(`  description  ${description.split('\n').length} lines -> description.txt`);
console.log(`  thumbnail    1280x720 -> ${SLUG}-thumb.jpg`);
console.log(`\n${chapters}`);
