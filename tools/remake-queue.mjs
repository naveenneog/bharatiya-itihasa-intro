/* The old-format Shorts still due to publish, earliest first — the remake queue.

   A Short is in the queue when it is scheduled on the channel (latest scan, dist/yt-channel.json)
   or dated in the backlog plan (dist/publish-plan.json), and its folder is not yet in
   dist/feed-shorts.json. The slot a remake takes is the old one: the plan's own time for backlog
   Shorts, 13:00 IST for the ones scheduled before the plan (the scan shows their day only).

     node tools/remake-queue.mjs              # the next 7 days
     node tools/remake-queue.mjs --days 14
     node tools/remake-queue.mjs --json
     node tools/remake-queue.mjs --slug the-copper-plate --era chalukya   # one folder's state

   Per row: whether the folder already holds a hand-checked feed script (short.json with an
   `edited` or `editedHook` record) — the step that cannot be automated — and `next`, the first
   step not yet done: script, clips, render, verify, upload, register (add, schedule, delete).

   From 21 Oct the old-format Shorts are an A/B test (rule fixed 2 Oct, GROWTH.md): each day one
   of the two is remade and the other kept as uploaded, alternating between 13:00 and 19:00. A
   kept Short is fact-checked against its episode first (`next: check`), then recorded:

     node tools/remake-queue.mjs --slug the-seal --era gupta --decide keep --note "checked: ..."
     node tools/remake-queue.mjs --slug the-seal --era gupta --decide remake --note "factual error: ..."
     node tools/remake-queue.mjs --slug the-seal --era gupta --decide skip --note "budget STOP"

   `skip` is for a remake-arm Short that cannot be remade (tools/spend.ps1 says STOP): it publishes
   as uploaded and belongs to neither arm of the test.

   Decisions live in dist/remake-decisions.json and override the alternation. The kept Shorts'
   ids, once published, for the daily measurement:

     node tools/remake-queue.mjs --kept-ids          # comma-joined, for yt-retention.mjs --ids */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync, statSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const DAYS = Number(arg('days', 7));
const load = async (f, d) => JSON.parse(await readFile(f, 'utf8').catch(() => JSON.stringify(d)));

const DEC = 'dist/remake-decisions.json';
const decisions = await load(DEC, {});
const DECIDE = arg('decide', null);
if (DECIDE) {
  const slug = arg('slug', null); const era = arg('era', null); const note = arg('note', '');
  if (!slug || !era || !['keep', 'remake', 'skip'].includes(DECIDE) || !note) {
    console.error('usage: --slug <slug> --era <era> --decide keep|remake|skip --note "<what was checked, the error, or why skipped>"');
    process.exit(1);
  }
  const dir = `dist/${era}/${slug}_short`;
  if (!existsSync(dir)) { console.error(`no folder ${dir}`); process.exit(1); }
  decisions[dir] = { decision: DECIDE, checked: true, note, at: new Date().toISOString() };
  await writeFile(DEC, `${JSON.stringify(decisions, null, 2)}\n`);
  console.log(`  ${dir}: ${DECIDE} — ${note}`);
  process.exit(0);
}

/* Days counted from 21 Oct, so the alternation holds across month ends: day 0 remakes the 13:00
   Short and keeps the 19:00 one, day 1 the reverse, and so on. Before 21 Oct every old-format
   Short was remade. */
const AB_FROM = Date.parse('2026-10-21T00:00:00+05:30');
function armOf(publishLocal) {
  const t = Date.parse(publishLocal);
  if (Number.isNaN(t) || t < AB_FROM) return 'remake';
  const n = Math.floor((t - AB_FROM) / 86400e3);
  const evening = Number(String(publishLocal).slice(11, 13)) >= 16;
  return (n % 2 === 0) !== evening ? 'remake' : 'keep';
}

const scan = await load('dist/yt-channel.json', { rows: [] });
const plan = (await load('dist/publish-plan.json', { plan: [] })).plan;
const feed = await load('dist/feed-shorts.json', []);
const log = await load('dist/publish-log.json', {});
const uploads = (await load('dist/uploads.json', { uploads: {} })).uploads;

const feedDirs = new Set(feed.map((f) => `dist/${f.era}/${f.slug}_short`));
const feedIds = new Set(feed.flatMap((f) => [f.id, f.replaces]).filter(Boolean));
const idOf = (url) => (url || '').replace(/^.*\//, '');
const dirById = new Map();
for (const [d, v] of Object.entries(uploads)) if (v?.url) dirById.set(idOf(v.url), d);
for (const [d, v] of Object.entries(log)) if (v?.id) dirById.set(v.id, d);

const byDir = new Map();
for (const p of plan) {
  if (p.kind !== 'short' || !p.publishLocal || feedDirs.has(p.dir)) continue;
  byDir.set(p.dir, { dir: p.dir, slug: p.slug, era: p.era, title: p.title, publishLocal: p.publishLocal,
    oldId: log[p.dir]?.id || p.id || null, from: 'plan' });
}
for (const r of scan.rows || []) {
  if (r.kind !== 'short' || !/SCHEDULED/i.test(r.state || '') || feedIds.has(r.id)) continue;
  const dir = dirById.get(r.id);
  if (!dir || feedDirs.has(dir) || byDir.has(dir)) continue;
  const day = new Date(`${r.when} 12:00 UTC`);
  if (Number.isNaN(day.getTime())) continue;
  const m = dir.match(/^dist\/([^/]+)\/(.+)_short$/);
  byDir.set(dir, { dir, slug: m?.[2], era: m?.[1], title: r.title,
    publishLocal: `${day.toISOString().slice(0, 10)}T13:00:00+05:30`, oldId: r.id, from: 'scan' });
}

const until = Date.now() + DAYS * 86400e3;

/* The ids of the A/B's kept Shorts that have published, comma-joined for tools/yt-retention.mjs.
   The remade ones are in dist/feed-shorts.json already (pilot-schedule ids --published).
   --as-of YYYY-MM-DD stands in for today, for testing. */
if (argv.includes('--kept-ids')) {
  const asOf = arg('as-of', null);
  const now = asOf ? Date.parse(`${asOf}T23:59:59+05:30`) : Date.now();
  const out = [];
  for (const p of plan) {
    if (p.kind !== 'short' || !p.publishLocal || feedDirs.has(p.dir)) continue;
    const t = Date.parse(p.publishLocal);
    if (t < AB_FROM || t > now) continue;
    if ((decisions[p.dir]?.decision || armOf(p.publishLocal)) !== 'keep') continue;
    const id = log[p.dir]?.id || p.id;
    if (id) out.push(id);
  }
  console.log(out.join(','));
  process.exit(0);
}
const ONE = arg('slug', null);
const rows = ONE
  ? [{ dir: `dist/${arg('era', '?')}/${ONE}_short`, slug: ONE, era: arg('era', '?'), publishLocal: '(any)', oldId: null }]
  : [...byDir.values()]
    .filter((r) => Date.parse(r.publishLocal) > Date.now() && Date.parse(r.publishLocal) <= until)
    .sort((a, b) => a.publishLocal.localeCompare(b.publishLocal));
for (const r of rows) {
  const f = `episodes/${r.slug}/short.json`;
  const s = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
  r.script = !s ? 'none' : (s.edited || s.editedHook) ? `checked, ${s.length || 'standard'}` : (s.format === 'hook-v1' ? 'feed, NOT checked' : 'old');
  const d = decisions[r.dir];
  r.arm = d?.decision || armOf(r.publishLocal);
  r.next = r.arm === 'skip' ? 'none (skipped)' : r.arm === 'keep' ? (d?.checked ? 'keep' : 'check') : nextStep(r, s);
}

/* The first step not yet done, so a pass resumes rather than redoes. Each check compares against
   the current script, so an edit after a step sends the Short back to that step. */
function nextStep(r, s) {
  if (!s || !(s.edited || s.editedHook)) return 'script';
  const ep = `episodes/${r.slug}`;
  const done = existsSync(`${ep}/short-shots.json`) ? JSON.parse(readFileSync(`${ep}/short-shots.json`, 'utf8')) : null;
  const claimsMatch = done?.shots?.length >= s.lines.length
    && s.lines.every((l, k) => (done.shots[k]?.claim || '').trim() === l.text.trim());
  const clipsThere = done?.clips?.every((c) => c && existsSync(`${ep}/short-clips/${c}`));
  if (!claimsMatch || !clipsThere) return 'clips';
  const mp4 = `${r.dir}/${r.slug}-short.mp4`;
  if (!existsSync(mp4) || statSync(mp4).mtimeMs < statSync(`${ep}/short-shots.json`).mtimeMs
    || statSync(mp4).mtimeMs < statSync(`${ep}/short.json`).mtimeMs) return 'render';
  const v = existsSync(`${r.dir}/verify.json`) ? JSON.parse(readFileSync(`${r.dir}/verify.json`, 'utf8')) : null;
  if (!v?.ok || Math.abs(v.mp4MtimeMs - statSync(mp4).mtimeMs) > 1) return 'verify';
  const up = uploads[r.dir];
  if (!up || up.exit !== 0 || !up.url || Date.parse(up.at) < statSync(mp4).mtimeMs) return 'upload';
  return 'register';
}

if (argv.includes('--json')) { console.log(JSON.stringify(rows, null, 2)); process.exit(0); }
console.log(`old-format Shorts publishing in the next ${DAYS} days (scan ${scan.at || '?'}):\n`);
for (const r of rows) {
  console.log(`  ${r.publishLocal.slice(0, 16).replace('T', ' ')}  ${String(r.oldId || '-').padEnd(11)}  ${(r.arm || '').padEnd(6)}  ${r.era}/${r.slug}  [${r.script}]  next: ${r.next}`);
}
if (!rows.length) console.log('  none');
