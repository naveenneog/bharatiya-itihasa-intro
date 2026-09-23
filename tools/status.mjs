/* What exists: built, uploaded, and still to produce.

   Written because the answer kept being remembered instead of counted, and the remembered
   answer was wrong — Context.md said "nothing has been uploaded yet" for weeks while the
   ledger held 119 successful uploads.

   Three sources, each the one that actually knows:
     built     dist/<era>/<slug>_{book,short}/ with an UPLOAD.md and a master mp4
     uploaded  dist/uploads.json, exit 0
     corpus    the upstream story index, via stories.mjs

     node tools/status.mjs            # the summary
     node tools/status.mjs --gaps     # plus every incomplete episode, named
*/
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadStories, eraOf } from './stories.mjs';

const GAPS = process.argv.includes('--gaps');

/* The zero episode has abandoned cuts beside it from when the caption treatment was being
   chosen. They are not episodes, and upload-pending.mjs skips them by the same rule. */
const NOT_AN_EPISODE = /_(ascent|objection|reverse|v\d+)$/;

/* A master far below its kind's floor is a truncated render, not a short episode. Measured
   across all 405 finished folders: episodes 115-411 MB, Shorts 21-65 MB. */
const FLOOR_MB = { book: 60, short: 12 };

const eras = (await readdir('dist', { withFileTypes: true }).catch(() => []))
  .filter((d) => d.isDirectory() && !d.name.startsWith('.') && !d.name.startsWith('thumbs-'))
  .map((d) => d.name);

const built = [];
for (const era of eras) {
  for (const name of (await readdir(path.join('dist', era)).catch(() => []))) {
    if (NOT_AN_EPISODE.test(name)) continue;
    const dir = path.join('dist', era, name);
    if (!existsSync(dir)) continue;
    const files = await readdir(dir).catch(() => []);
    const kind = name.endsWith('_short') ? 'short' : 'book';
    let mb = 0;
    for (const f of files) {
      if (!f.endsWith('.mp4') || /intro|outro/i.test(f)) continue;
      const { size } = await import('node:fs/promises').then((m) => m.stat(path.join(dir, f)));
      mb = Math.max(mb, size / 1024 / 1024);
    }
    if (!mb) continue;
    built.push({
      era, name, kind, mb, slug: name.replace(/_(book|short)$/, ''),
      upload: files.includes('UPLOAD.md'), thin: mb < FLOOR_MB[kind],
    });
  }
}

const ledger = await readFile(path.join('dist', 'uploads.json'), 'utf8')
  .then((s) => JSON.parse(s).uploads || {}).catch(() => ({}));
const up = new Set(Object.entries(ledger)
  .filter(([, v]) => v.exit === 0).map(([k]) => k.replace(/\\/g, '/')));

const stories = await loadStories();
const builtIds = new Set();
for (const d of (await readdir('episodes', { withFileTypes: true }).catch(() => []))) {
  if (!d.isDirectory()) continue;
  const j = await readFile(path.join('episodes', d.name, 'episode.json'), 'utf8')
    .then(JSON.parse).catch(() => null);
  if (j?.id) builtIds.add(j.id);
}

const rows = {};
for (const e of eras) rows[e] = { book: 0, short: 0, up: 0, mb: 0 };
for (const b of built) {
  rows[b.era][b.kind]++;
  rows[b.era].mb += b.mb;
  if (up.has(`dist/${b.era}/${b.name}`)) rows[b.era].up++;
}

const corpus = {};
for (const s of stories) {
  const e = eraOf(s);
  corpus[e] = corpus[e] || { total: 0, built: 0 };
  corpus[e].total++;
  if (builtIds.has(s.id)) corpus[e].built++;
}

const n = (x, w) => String(x).padStart(w);
console.log('\n  era                 eps  shorts  uploaded     GB   left in corpus');
let B = 0; let S = 0; let U = 0; let MB = 0;
for (const e of Object.keys(rows).sort()) {
  const r = rows[e];
  if (!r.book && !r.short) continue;
  B += r.book; S += r.short; U += r.up; MB += r.mb;
  const left = (corpus[e]?.total || 0) - (corpus[e]?.built || 0);
  console.log(`  ${e.padEnd(18)} ${n(r.book, 4)}  ${n(r.short, 6)}  ${n(r.up, 8)}  ${n((r.mb / 1024).toFixed(1), 5)}  ${left ? n(left, 15) : n('-', 15)}`);
}
console.log(`  ${'TOTAL'.padEnd(18)} ${n(B, 4)}  ${n(S, 6)}  ${n(U, 8)}  ${n((MB / 1024).toFixed(1), 5)}`);

const finished = built.length;
console.log(`\n  ${finished} finished folder(s): ${B} episode(s) + ${S} Short(s)`);
console.log(`  ${U} uploaded, ${finished - U} not`);

const thin = built.filter((b) => b.thin);
if (thin.length) {
  console.log(`\n  ${thin.length} master(s) below the size floor — likely truncated:`);
  for (const t of thin) console.log(`    ${t.mb.toFixed(1)} MB  ${t.era}/${t.name}`);
}

/* An episode without its Short, or the reverse, is a half-finished story. It is the shape the
   Azure suspension left behind and the shape a skipped stage leaves, so it is worth naming. */
const pair = new Map();
for (const b of built) {
  const p = pair.get(`${b.era}/${b.slug}`) || {};
  p[b.kind] = true;
  pair.set(`${b.era}/${b.slug}`, p);
}
const half = [...pair].filter(([, p]) => !p.book || !p.short);
console.log(`\n  ${half.length} half-finished (an episode without its Short, or the reverse)`);
if (half.length && GAPS) for (const [k, p] of half) console.log(`    ${k.padEnd(40)} missing ${p.book ? 'Short' : 'episode'}`);

const noUpload = built.filter((b) => !b.upload);
if (noUpload.length) {
  console.log(`\n  ${noUpload.length} folder(s) with a master but no UPLOAD.md (will not queue):`);
  for (const b of noUpload) console.log(`    ${b.era}/${b.name}`);
}

const T = stories.length;
const Bu = [...builtIds].length;
const other = (corpus.other?.total || 0) - (corpus.other?.built || 0);
console.log(`\n  corpus ${T} stor(ies), ${Bu} built, ${T - Bu} remaining`);
console.log(`    ${T - Bu - other} in named eras — reachable with series.mjs --era`);
console.log(`    ${other} in 'other' — match no era regex, so no --era can reach them`);
