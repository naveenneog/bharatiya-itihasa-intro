/* Send every finished folder that has not been uploaded yet, one at a time.

   upload.mjs takes one folder. There are 47 waiting, so this walks them in order and calls it
   for each, skipping anything the ledger already records as done. It is safe to stop and re-run:
   upload.mjs refuses a second copy of the same master by content hash.

     node tools/upload-pending.mjs                 # what would be sent, nothing sent
     node tools/upload-pending.mjs --go            # send them, private
     node tools/upload-pending.mjs --go --era pallava
     node tools/upload-pending.mjs --go --kind short

   The agent drives one browser profile, so these are strictly sequential — two at once would
   fight over the same Edge window. */

import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const GO = has('go');
const ERA = arg('era', null);
const KIND = arg('kind', null);
const VISIBILITY = arg('visibility', 'private');

const ERAS = ERA ? [ERA] : ['maurya', 'kushan', 'gupta', 'pallava', 'chalukya', 'rashtrakuta'];

/* The zero episode has eight abandoned cuts beside it from the days when the caption treatment
   was still being chosen. They are not episodes and must never be uploaded. */
const NOT_AN_EPISODE = /_(ascent|objection|reverse|v\d+)$/;

const ledger = await readFile(path.join('dist', 'uploads.json'), 'utf8')
  .then((s) => JSON.parse(s).uploads).catch(() => ({}));
const done = new Map(Object.entries(ledger).map(([k, v]) => [k.replace(/\\/g, '/'), v]));

const queue = [];
for (const era of ERAS) {
  const dir = path.join('dist', era);
  for (const name of (await readdir(dir).catch(() => [])).sort()) {
    const full = path.join(dir, name);
    if (!existsSync(path.join(full, 'UPLOAD.md'))) continue;
    if (NOT_AN_EPISODE.test(name)) continue;
    const kind = name.endsWith('_short') ? 'short' : 'book';
    if (KIND && kind !== KIND) continue;
    const rel = full.replace(/\\/g, '/');
    const rec = done.get(rel);
    if (rec && rec.exit === 0) continue;
    queue.push({ rel, full, kind, era, retry: !!rec });
  }
}

if (!queue.length) { console.log('nothing pending — every finished folder is uploaded'); process.exit(0); }

console.log(`${queue.length} folder(s) to send, ${VISIBILITY}\n`);
for (const q of queue) console.log(`  ${q.kind.padEnd(5)} ${q.rel}${q.retry ? '   (previous attempt failed)' : ''}`);
if (!GO) { console.log('\n--go to send them'); process.exit(0); }

let ok = 0; let bad = 0;
const t0 = Date.now();
for (const [i, q] of queue.entries()) {
  console.log(`\n${'─'.repeat(72)}\n  [${i + 1}/${queue.length}] ${q.rel}\n`);
  /* --ab only on the long form: the A/B plates are a feed-thumbnail experiment and a Short is
     not browsed that way. */
  const args = ['tools/upload.mjs', '--dir', q.full, '--visibility', VISIBILITY,
    ...(q.kind === 'book' ? ['--ab'] : []),
    ...(q.retry ? ['--again'] : [])];
  const code = await new Promise((r) => spawn(process.execPath, args, { stdio: 'inherit' }).on('close', r));
  if (code === 0) ok++; else { bad++; console.error(`  ${q.rel} failed with ${code}`); }
}

console.log(`\n${'═'.repeat(72)}`);
console.log(`  ${ok}/${queue.length} sent in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
if (bad) console.log(`  ${bad} failed — re-run to retry just those`);
console.log('  links: dist/uploads.json\n');
process.exit(bad ? 1 : 0);
