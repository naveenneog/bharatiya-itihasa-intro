/* The old-format Shorts still due to publish, earliest first — the remake queue.

   A Short is in the queue when it is scheduled on the channel (latest scan, dist/yt-channel.json)
   or dated in the backlog plan (dist/publish-plan.json), and its folder is not yet in
   dist/feed-shorts.json. The slot a remake takes is the old one: the plan's own time for backlog
   Shorts, 13:00 IST for the ones scheduled before the plan (the scan shows their day only).

     node tools/remake-queue.mjs              # the next 7 days
     node tools/remake-queue.mjs --days 14
     node tools/remake-queue.mjs --json

   Per row: whether the folder already holds a hand-checked feed script (short.json with an
   `edited` or `editedHook` record) — the step that cannot be automated. */
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const DAYS = Number(arg('days', 7));
const load = async (f, d) => JSON.parse(await readFile(f, 'utf8').catch(() => JSON.stringify(d)));

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
const rows = [...byDir.values()]
  .filter((r) => Date.parse(r.publishLocal) > Date.now() && Date.parse(r.publishLocal) <= until)
  .sort((a, b) => a.publishLocal.localeCompare(b.publishLocal));
for (const r of rows) {
  const f = `episodes/${r.slug}/short.json`;
  const s = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
  r.script = !s ? 'none' : (s.edited || s.editedHook) ? `checked, ${s.length || 'standard'}` : (s.format === 'hook-v1' ? 'feed, NOT checked' : 'old');
}

if (argv.includes('--json')) { console.log(JSON.stringify(rows, null, 2)); process.exit(0); }
console.log(`old-format Shorts publishing in the next ${DAYS} days (scan ${scan.at || '?'}):\n`);
for (const r of rows) {
  console.log(`  ${r.publishLocal.slice(0, 16).replace('T', ' ')}  ${String(r.oldId || '-').padEnd(11)}  ${r.era}/${r.slug}  [${r.script}]`);
}
if (!rows.length) console.log('  none');
