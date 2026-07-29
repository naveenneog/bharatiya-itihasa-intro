/* Retention analysis — the numbers that decide whether a video is watched.

   This is not a taste review. Everything here is measured off the built episode, the cut,
   the master file and the publishing kit, and checked against thresholds that come from
   YouTube's own documentation rather than from folklore:

     - YouTube Analytics defines "the intro" as the **first 30 seconds**, and calls
       retention there "above typical" only at **50% or better**. Its stated remedy when
       that number is low is to change the first 30 seconds. Everything the tool weights
       most heavily happens inside that window.
     - Playback loudness normalises to about **-14 LUFS**, and YouTube **attenuates loud
       uploads but never lifts quiet ones**, so a quiet master permanently plays under
       everything around it.
     - Chapters require a first mark at **00:00**, at least **three** marks, each at least
       **10 s** long, or the whole list is silently ignored.
     - Custom thumbnails are capped at **2 MB**, and are decided at roughly **320 px** wide.

   Where a threshold is a judgement rather than a published rule it is labelled as one.

     node tools/retention.mjs
     node tools/retention.mjs --master dist/ep01-aryabhata-youtube.mp4
*/
import { readFile, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { CUTS, openIndices } from './episode-page.mjs';
import { measure } from './loudness.mjs';

const execFileP = promisify(execFile);

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };

const SLUG = arg('slug', 'aryabhata');
const CUT = arg('cut', 'cut-e-framed');
const INTRO = arg('intro', 'dist/v7-gupta-stinger.mp4');
const MASTER = arg('master', `dist/ep01-${SLUG}-youtube.mp4`);
const EP = path.join('episodes', SLUG);
/* The publishing kit's location is passed in, not assumed. It was hardcoded to
   `dist/publish-<slug>`, so once the factory began writing per-version folders the score
   reported "no thumbnail, no chapters, no SRT" for a kit that was complete — understating
   packaging by up to 7 points and, worse, reporting a real-looking failure that was not
   real. A scorecard that measures the wrong folder is worse than no scorecard. */
const KIT = arg('kit', path.join('dist', `publish-${SLUG}`));

const findings = [];
const note = (level, area, text) => findings.push({ level, area, text });
const PASS = 'pass'; const WARN = 'warn'; const FAIL = 'fail';

const secs = async (f) => {
  const { stdout } = await execFileP('ffprobe', ['-v', 'error', '-show_entries',
    'format=duration', '-of', 'default=nw=1:nk=1', f]);
  return Number(stdout.trim());
};

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ── the cut, in playback order, with the titles spliced in ────────────────
const ep = JSON.parse(await readFile(path.join(EP, 'episode.json'), 'utf8'));
const cut = CUTS.find((c) => c.id === CUT);
if (!cut) throw new Error(`unknown cut ${CUT}`);

const introLen = await secs(INTRO);
const openIdx = openIndices(ep.panels, cut);
const restIdx = ep.panels.map((_, n) => n).filter((n) => !openIdx.includes(n));
const order = [...openIdx, ...restIdx].map((n) => ep.panels[n]);

const splice = order.slice(0, openIdx.length).reduce((a, p) => a + p.dur, 0);
let acc = 0;
const timed = order.map((p) => {
  const start = acc + (acc >= splice - 1e-6 ? introLen : 0);
  acc += p.dur;
  return { ...p, start, end: start + p.dur };
});
const runtime = acc + introLen;

console.log(`\n  RETENTION ANALYSIS — ${ep.title}`);
console.log(`  ${CUT} · ${timed.length} panels · ${clock(runtime)} total\n`);
console.log('─'.repeat(78));

// ── 1. the first thirty seconds ───────────────────────────────────────────
console.log('\n1. THE FIRST 30 SECONDS   (YouTube measures the "intro" here)\n');
const titlesEnd = splice + introLen;
for (const p of timed) {
  if (p.start > 32) break;
  if (Math.abs(p.start - titlesEnd) < 0.01) console.log(`   ${clock(splice).padStart(5)}  ── TITLES (${introLen.toFixed(1)}s) ──`);
  console.log(`   ${clock(p.start).padStart(5)}  ${p.id.padEnd(12)} ${(p.text.en || '').slice(0, 52)}`);
}
console.log('');

const hook = timed[0];
const firstWords = (hook.text.en || '').split(/\s+/).slice(0, 12).join(' ');
if (titlesEnd <= 30) {
  note(PASS, 'intro', `titles are over at ${titlesEnd.toFixed(1)}s — the story is running before the 30s mark`);
} else {
  note(FAIL, 'intro', `titles end at ${titlesEnd.toFixed(1)}s, past the 30s mark YouTube measures`);
}
if (splice <= 15) {
  note(PASS, 'hook', `${splice.toFixed(1)}s of cold open before any titles`);
} else {
  note(WARN, 'hook', `${splice.toFixed(1)}s of cold open — long before the titles even start`);
}

/* The first sentence is the entire hook. A claim or a question holds; a scene-setting
   description does not. This is a judgement, so it reports rather than fails. */
const claimy = /\bdares?\b|\bsaid?\b|\bclaim|\bfirst\b|\bbefore\b|\bnobody\b|\bno one\b|\?|\bwhy\b|\bhow\b/i.test(hook.text.en || '');
note(claimy ? PASS : WARN, 'hook',
  claimy ? `opening line makes a claim: "${firstWords}…"` : `opening line is descriptive, not a claim: "${firstWords}…"`);

// ── 2. pacing ─────────────────────────────────────────────────────────────
console.log('2. PACING   (a flat metronome is where attention goes)\n');
const durs = timed.map((p) => p.dur);
const mean = durs.reduce((a, b) => a + b, 0) / durs.length;
const sd = Math.sqrt(durs.reduce((a, b) => a + (b - mean) ** 2, 0) / durs.length);
const cov = sd / mean;
const firstHalf = durs.slice(0, Math.floor(durs.length / 2));
const lastHalf = durs.slice(Math.floor(durs.length / 2));
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const trend = (avg(lastHalf) - avg(firstHalf)) / avg(firstHalf);

console.log(`   panel length   mean ${mean.toFixed(1)}s   sd ${sd.toFixed(1)}s   variation ${(cov * 100).toFixed(0)}%`);
console.log(`   first half ${avg(firstHalf).toFixed(1)}s  ->  last half ${avg(lastHalf).toFixed(1)}s   (${trend >= 0 ? '+' : ''}${(trend * 100).toFixed(0)}%)`);
const longest = [...timed].sort((a, b) => b.dur - a.dur).slice(0, 3);
console.log(`   longest holds  ${longest.map((p) => `${p.id} ${p.dur.toFixed(1)}s @ ${clock(p.start)}`).join(' · ')}`);
console.log('');

/* The title sequence deliberately accelerates 6.0 -> 3.4s. The body does not accelerate
   at all, which is the contrast worth naming: the intro teaches the viewer a rhythm the
   story then abandons. */
if (Math.abs(trend) < 0.08) {
  note(WARN, 'pacing', `panel length is flat across the episode (${(trend * 100).toFixed(0)}%) — no rhythmic arc, unlike the intro which accelerates 6.0s -> 3.4s`);
} else {
  note(PASS, 'pacing', `panel length trends ${trend < 0 ? 'shorter' : 'longer'} by ${Math.abs(trend * 100).toFixed(0)}% across the episode`);
}
if (cov < 0.2) note(WARN, 'pacing', `only ${(cov * 100).toFixed(0)}% variation in panel length — close to a metronome`);

/* Something must change often enough that the eye is never told it can leave. One panel
   is one picture, so a long panel is a long still. */
const stale = timed.filter((p) => p.dur > 15);
if (stale.length) {
  note(WARN, 're-hook', `${stale.length} panel(s) hold one image for over 15s: `
    + stale.map((p) => `${p.id} ${p.dur.toFixed(1)}s @ ${clock(p.start)}`).join(', '));
} else {
  note(PASS, 're-hook', 'no panel holds a single image longer than 15s');
}

// ── 3. audio ──────────────────────────────────────────────────────────────
console.log('3. AUDIO\n');
let masterOk = false;
try {
  await stat(MASTER);
  masterOk = true;
  const m = await measure(MASTER);
  const i = Number(m.input_i); const tp = Number(m.input_tp); const lra = Number(m.input_lra);
  console.log(`   ${path.basename(MASTER)}   ${i.toFixed(1)} LUFS · peak ${tp.toFixed(1)} dBTP · range ${lra.toFixed(1)} LU`);
  note(Math.abs(i + 14) <= 1 ? PASS : FAIL, 'loudness',
    `master is ${i.toFixed(1)} LUFS (target -14; YouTube attenuates loud uploads but never lifts quiet ones)`);
  note(tp <= -1 ? PASS : WARN, 'loudness', `true peak ${tp.toFixed(1)} dBTP (want <= -1 for the lossy re-encode)`);

  /* Long dead silence reads as "the video is over". Anything past ~2.5s under -50 dB in
     a narrated piece is worth knowing about. */
  const { stderr } = await execFileP('ffmpeg', ['-hide_banner', '-nostats', '-i', MASTER,
    '-af', 'silencedetect=noise=-50dB:d=2.5', '-f', 'null', '-'], { maxBuffer: 1 << 24 });
  const gaps = [...stderr.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_duration: ([\d.]+)/g)]
    .map((g) => ({ at: Number(g[1]), len: Number(g[2]) }));
  if (gaps.length) {
    note(WARN, 'audio', `${gaps.length} silent gap(s) over 2.5s: `
      + gaps.slice(0, 4).map((g) => `${clock(g.at)} (${g.len.toFixed(1)}s)`).join(', '));
  } else {
    note(PASS, 'audio', 'no dead silence longer than 2.5s — the bed runs under the whole episode');
  }
} catch {
  note(WARN, 'audio', `master not found at ${MASTER} — render it to check loudness`);
}
console.log('');

// ── 4. packaging ──────────────────────────────────────────────────────────
console.log('4. PACKAGING   (title, thumbnail, chapters, captions)\n');
const meta = JSON.parse(await readFile(path.join(EP, 'publish.json'), 'utf8'));

/* A thumbnail that repeats the title spends its one line twice. Overlap is measured on
   content words only — era markers and dates are shared deliberately, because the
   thumbnail grounds the claim and the title carries it. */
const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'who', 'in', 'on', 'to', 'is', 'was',
  'he', 'his', 'it', 'ce', 'bce', 'ad', 'bc', 'india', 'indian']);
const words = (s) => new Set(String(s || '').toLowerCase().match(/[a-z]+/g)?.filter((w) => !STOP.has(w)) || []);
const tWords = words(meta.title);
const thWords = words(`${meta.thumb?.headline} ${meta.thumb?.kicker}`);
const shared = [...thWords].filter((w) => tWords.has(w));
console.log(`   title      "${meta.title}"`);
console.log(`   thumbnail  "${meta.thumb?.kicker}" / "${meta.thumb?.headline}"`);
console.log(`   overlap    ${shared.length ? shared.join(', ') : 'none'}`);
note(shared.length === 0 ? PASS : WARN, 'packaging',
  shared.length === 0
    ? 'thumbnail and title say different things — together they carry two hooks'
    : `thumbnail repeats title word(s): ${shared.join(', ')}`);

try {
  const jpg = path.join(KIT, `${SLUG}-thumb.jpg`);
  const sz = (await stat(jpg)).size;
  note(sz <= 2 * 1024 * 1024 ? PASS : FAIL, 'packaging',
    `thumbnail ${(sz / 1024).toFixed(0)} KB (YouTube's limit is 2 MB)`);
} catch { note(WARN, 'packaging', 'no thumbnail rendered'); }

try {
  const ch = (await readFile(path.join(KIT, 'chapters.txt'), 'utf8')).trim().split('\n');
  const times = ch.map((l) => { const [m, s] = l.split(' ')[0].split(':').map(Number); return m * 60 + s; });
  const shortest = Math.min(...times.slice(1).map((t, i) => t - times[i]));
  const ok = times[0] === 0 && ch.length >= 3 && shortest >= 10;
  console.log(`   chapters   ${ch.length}, first ${ch[0].split(' ')[0]}, shortest ${shortest}s`);
  note(ok ? PASS : FAIL, 'packaging',
    ok ? `${ch.length} chapters, all valid` : 'chapters break YouTube\'s rules and will be ignored');
} catch { note(WARN, 'packaging', 'no chapters written'); }

try {
  const srt = await readFile(path.join(KIT, `${SLUG}.en.srt`), 'utf8');
  const n = (srt.match(/-->/g) || []).length;
  note(PASS, 'packaging', `${n} caption cues (SRT), cut from the on-screen word timings`);
} catch { note(WARN, 'packaging', 'no SRT written'); }
console.log('');

// ── 5. the shape of the story ─────────────────────────────────────────────
console.log('5. STORY SHAPE\n');
const total = runtime;

/* What keeps a viewer past the intro is not the claim — that is spent in the first thirty
   seconds — but how often something *new* arrives afterwards. So the measure is the
   distribution of hooks, not the position of one payoff.

   A hook is a panel carrying something concrete and surprising: a figure, a named work, a
   physical analogy, a confrontation. Exposition between hooks is where people leave, so
   the number that matters is the **longest stretch with nothing new in it**. */
const HOOK = /\d[\d,.]*|\bpi\b|eclipse|shadow|boat|verse|chess|pillar|rust|revolv|turns|dares|refus|curse|doubt|unsettl/i;
const hooks = timed.filter((p) => HOOK.test(p.text.en || ''));
let biggest = { gap: 0, from: null, to: null };
for (let i = 1; i < hooks.length; i++) {
  const gap = hooks[i].start - hooks[i - 1].end;
  if (gap > biggest.gap) biggest = { gap, from: hooks[i - 1], to: hooks[i] };
}
const thirds = [0, 0, 0];
for (const h of hooks) thirds[Math.min(2, Math.floor((h.start / total) * 3))]++;

console.log(`   ${hooks.length} of ${timed.length} panels carry a concrete hook`);
console.log(`   spread     first third ${thirds[0]} · middle ${thirds[1]} · last ${thirds[2]}`);
console.log(`   longest stretch with nothing new: ${biggest.gap.toFixed(1)}s`
  + (biggest.from ? ` (${clock(biggest.from.end)} -> ${clock(biggest.to.start)})` : ''));

const claimAt = timed.find((p) => /turns|revolves|moves/i.test(p.text.en || ''));
if (claimAt) {
  console.log(`   the claim lands at ${clock(claimAt.start)} (${((claimAt.start / total) * 100).toFixed(0)}% in)`);
  note(claimAt.start <= 30 ? PASS : WARN, 'story',
    `the claim the title promises is delivered at ${clock(claimAt.start)}`);
}
note(biggest.gap <= 25 ? PASS : WARN, 'story',
  biggest.gap <= 25
    ? `hooks are spaced at most ${biggest.gap.toFixed(0)}s apart — something new keeps arriving`
    : `${biggest.gap.toFixed(0)}s of exposition with no new hook at ${biggest.from ? clock(biggest.from.end) : '?'}`);
note(Math.min(...thirds) > 0 ? PASS : WARN, 'story',
  `hook distribution across thirds: ${thirds.join(' / ')}`);

const ending = timed[timed.length - 1];
console.log(`   ends on    ${ending.id}: "${(ending.text.en || '').slice(0, 60)}"`);
const setsUpNext = /next|follow|subscribe|series|continue/i.test(ending.text.en || '');
note(setsUpNext ? PASS : WARN, 'story',
  setsUpNext ? 'the ending points forward' : 'the ending resolves but does not point at another video — nothing pulls the viewer on');
console.log('');

// ── report ────────────────────────────────────────────────────────────────
console.log('─'.repeat(78));
console.log('\nFINDINGS\n');
const icon = { pass: ' OK ', warn: 'WARN', fail: 'FAIL' };
for (const lvl of [FAIL, WARN, PASS]) {
  for (const f of findings.filter((x) => x.level === lvl)) {
    console.log(`  [${icon[lvl]}] ${f.area.padEnd(10)} ${f.text}`);
  }
}
const nf = findings.filter((f) => f.level === FAIL).length;
const nw = findings.filter((f) => f.level === WARN).length;
console.log(`\n  ${findings.length - nf - nw} pass · ${nw} warn · ${nf} fail`);

// ── score ─────────────────────────────────────────────────────────────────
/* A single comparable number, so two versions of the same episode can be ranked without
   re-arguing the case each time.

   The weights are not neutral. They are ordered by how much each factor actually moves
   watch time, which is not the same as how much work each one took:

     30  the first 30 seconds        YouTube's own retention window; nothing else matters
                                     if this fails
     20  hook spacing                what holds a viewer past the intro is how often
                                     something new arrives, not one payoff
     15  pacing                      a flat metronome is where attention leaks out
     15  audio                       loudness against the platform reference, and whether
                                     anything is playing under the narration at all
     10  packaging                   thumbnail, title, chapters, captions
     10  re-hook cadence             how long one image is allowed to sit

   This is a *design* score, measured off the artefact. It cannot predict a click-through
   rate — only whether the things known to destroy retention have been removed. */
const bandOf = (n) => (n >= 85 ? 'strong' : n >= 70 ? 'solid' : n >= 55 ? 'workable' : 'weak');
const w = {};
/* A ramp, not a step. The cliff sat at exactly 25s, so titles ending at 25.1s scored three
   points below titles ending at 24.9s — a tenth of a second swinging the same weight as a
   real editorial decision. YouTube measures at 30s; everything before that is degrees of
   better, not a pass and a fail. The same class of mistake as a loudness threshold that
   turned half a decibel of measurement noise into a five-point difference. */
w.intro = titlesEnd > 30 ? 10 : Math.round(30 - 3 * Math.max(0, (titlesEnd - 22) / 8));
if (!claimy) w.intro -= 5;
w.hooks = (biggest.gap <= 15 ? 12 : biggest.gap <= 25 ? 9 : biggest.gap <= 40 ? 5 : 2)
  + (Math.min(...thirds) > 0 ? 4 : 0)
  + (hooks.length / timed.length >= 0.6 ? 4 : hooks.length / timed.length >= 0.4 ? 2 : 0);
w.pacing = (Math.abs(trend) >= 0.08 ? 9 : 4) + (cov >= 0.2 ? 6 : 3);
w.audio = findings.filter((f) => (f.area === 'loudness' || f.area === 'audio') && f.level === PASS).length * 5;
w.packaging = findings.filter((f) => f.area === 'packaging' && f.level === PASS).length * 2.5;
w.rehook = stale.length === 0 ? 10 : Math.max(3, 10 - stale.length * 2);
const score = Math.round(Math.min(100, Object.values(w).reduce((a, b) => a + b, 0)));

console.log('\n  VIRAL / STICKINESS SCORE\n');
const bar = (v, max) => '█'.repeat(Math.round((v / max) * 18)).padEnd(18, '·');
for (const [k, max] of [['intro', 30], ['hooks', 20], ['pacing', 15], ['audio', 15], ['packaging', 10], ['rehook', 10]]) {
  console.log(`    ${k.padEnd(10)} ${bar(w[k], max)} ${String(Math.round(w[k])).padStart(2)}/${max}`);
}
console.log(`\n    TOTAL      ${score}/100  — ${bandOf(score)}`);
console.log('\n    The lowest bar is the next thing to fix.\n');

if (!masterOk) console.log('  (master not measured)');
console.log('');
process.exit(nf ? 1 : 0);
