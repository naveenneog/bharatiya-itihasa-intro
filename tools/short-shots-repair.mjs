/* Migrate short-shots.json from "the plan" to "the generation finished", and disarm the episodes
   caught in between.

   short-shots.mjs used to write one file, and it wrote it the moment the model returned the plan
   — before a single clip existed. factory.mjs skips the stage when that file is present, so a run
   that generated 6 of 7 clips and exited 1 left a complete-looking marker behind. The next run
   skipped generation entirely and failed two stages later at "no portrait clips".

   Now the plan lives in short-shots.plan.json and short-shots.json is written only when every
   planned shot has a clip. This moves the existing episodes onto that split:

     complete   -> plan copied aside, marker rewritten with the clips it actually has
     incomplete -> plan copied aside, marker REMOVED so the stage runs again
     no marker  -> nothing to do

   Dry by default; --fix writes.

     node tools/short-shots-repair.mjs
     node tools/short-shots-repair.mjs --fix
*/
import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const FIX = process.argv.includes('--fix');
const eps = (await readdir('episodes', { withFileTypes: true }))
  .filter((d) => d.isDirectory()).map((d) => d.name).sort();
const eras = (await readdir('dist', { withFileTypes: true }).catch(() => []))
  .filter((d) => d.isDirectory()).map((d) => d.name);

/* The Short is gated on its own UPLOAD.md, so regenerating the missing clip is not enough on its
   own — the cut would be skipped and keep the six-beat version it already had. deogarh and
   the-coins-go-silent were both sitting like that: a complete-looking Short built from 6 of 7. */
async function shortMarker(slug) {
  for (const era of eras) {
    const p = path.join('dist', era, `${slug}_short`, 'UPLOAD.md');
    if (await readFile(p, 'utf8').then(() => true).catch(() => false)) return p;
  }
  return null;
}

const rows = [];
for (const slug of eps) {
  const EP = path.join('episodes', slug);
  const DONE = path.join(EP, 'short-shots.json');
  const PLAN = path.join(EP, 'short-shots.plan.json');

  const marker = await readFile(DONE, 'utf8').then(JSON.parse).catch(() => null);
  const already = await readFile(PLAN, 'utf8').then(JSON.parse).catch(() => null);
  const plan = already || marker;
  if (!plan || !Array.isArray(plan.shots)) continue;

  const files = await readdir(path.join(EP, 'short-clips')).catch(() => []);
  const clips = plan.shots.map((s) => files.find(
    (f) => f.startsWith(`${String(s.n).padStart(2, '0')}-`) && f.endsWith('.mp4')) || null);
  const missing = clips.filter((c) => !c).length;

  /* A marker that already lists its clips has been through here. */
  const migrated = marker && Array.isArray(marker.clips);
  const stale = missing ? await shortMarker(slug) : null;
  if (migrated && !missing) continue;
  if (!marker && !missing && !already) continue;

  rows.push({ slug, shots: plan.shots.length, missing, hadMarker: !!marker, stale });
  if (!FIX) continue;

  if (!already) await writeFile(PLAN, `${JSON.stringify(plan, null, 2)}\n`);
  if (missing) {
    await rm(DONE, { force: true });
    if (stale) await rm(stale, { force: true });
  } else {
    await writeFile(DONE, `${JSON.stringify({ ...plan, clips, at: new Date().toISOString() }, null, 2)}\n`);
  }
}

const armed = rows.filter((r) => r.missing);
const done = rows.filter((r) => !r.missing);

console.log(`\n  ${eps.length} episodes, ${rows.length} to migrate\n`);
for (const r of armed) {
  console.log(`  INCOMPLETE ${r.slug.padEnd(26)} ${r.missing}/${r.shots} shots have no clip`);
  if (r.hadMarker) console.log(`             marker ${FIX ? 'removed' : 'would be removed'} - short-shots will run again`);
  if (r.stale) console.log(`             Short was built from ${r.shots - r.missing}/${r.shots} - ${FIX ? 'cleared' : 'would clear'} ${r.stale}`);
}
console.log(`\n  ${done.length} complete   -> marker rewritten with the clips it has`);
console.log(`  ${armed.length} incomplete -> will regenerate, and rebuild the Short if one exists`);
if (!FIX) console.log('\n  dry run. --fix to write.');
