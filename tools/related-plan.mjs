/* Which public Shorts can link to their long-form episode, and link them.

   A pair is ready when the Short and its episode (same slug, `_book` folder) are both public in
   the latest scan (dist/yt-channel.json). Done pairs are kept in dist/related-links.json and
   skipped. The Short's id comes from dist/feed-shorts.json first (remakes reuse the folder), then
   dist/uploads.json and dist/publish-log.json.

     node tools/related-plan.mjs              # list the ready pairs
     node tools/related-plan.mjs --run        # link them, one at a time, via tools/yt-related.mjs

   Run tools/yt-scan.mjs first: "public" is read from the scan, not assumed from a schedule. */
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const RUN = process.argv.includes('--run');
const load = async (f, d) => JSON.parse(await readFile(f, 'utf8').catch(() => JSON.stringify(d)));
const scan = await load('dist/yt-channel.json', { rows: [] });
const feed = await load('dist/feed-shorts.json', []);
const uploads = (await load('dist/uploads.json', { uploads: {} })).uploads;
const log = await load('dist/publish-log.json', {});
const REG = 'dist/related-links.json';
const done = await load(REG, {});

const byId = new Map(scan.rows.map((r) => [r.id, r]));
const idOfDir = (dir) => (uploads[dir]?.exit === 0 && uploads[dir]?.url ? uploads[dir].url.replace(/^.*\//, '') : null) || log[dir]?.id || null;
const shorts = new Map();
for (const f of feed) if (f.id && f.slug && f.era) shorts.set(f.id, { era: f.era, slug: f.slug });
for (const dir of new Set([...Object.keys(uploads), ...Object.keys(log)])) {
  const m = dir.match(/^dist\/([^/]+)\/(.+)_short$/);
  const id = idOfDir(dir);
  if (m && id && !shorts.has(id) && !feed.some((f) => f.slug === m[2] && f.era === m[1])) shorts.set(id, { era: m[1], slug: m[2] });
}

const ready = [];
for (const [id, s] of shorts) {
  if (byId.get(id)?.state !== 'PUBLIC' || done[id]) continue;
  const book = idOfDir(`dist/${s.era}/${s.slug}_book`);
  if (!book || byId.get(book)?.state !== 'PUBLIC') continue;
  ready.push({ short: id, target: book, slug: s.slug, era: s.era, title: byId.get(id).title, bookTitle: byId.get(book).title });
}
console.log(`scan ${scan.at}: ${ready.length} Short(s) ready to link, ${Object.keys(done).length} already linked\n`);
for (const r of ready) console.log(`  ${r.short} "${r.title}"  ->  ${r.target} "${r.bookTitle}"`);
if (!RUN || !ready.length) process.exit(0);

let ok = 0;
for (const r of ready) {
  const res = spawnSync(process.execPath, ['tools/yt-related.mjs', '--short', r.short, '--target', r.target, '--go'], { encoding: 'utf8' });
  process.stdout.write(res.stdout);
  if (res.status === 0) {
    done[r.short] = { target: r.target, slug: r.slug, at: new Date().toISOString() };
    await writeFile(REG, `${JSON.stringify(done, null, 2)}\n`);
    ok++;
  }
}
console.log(`\n  linked ${ok} of ${ready.length}`);
process.exit(ok === ready.length ? 0 : 1);
