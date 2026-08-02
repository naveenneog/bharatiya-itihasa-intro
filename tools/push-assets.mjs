/* Push what was generated to the asset repositories.

   The heavy material lives in five submodules — episodes, films, eras, versions, artifacts —
   and a generation run leaves new stills, takes, prompts and frames scattered across them. Left
   alone they sit on one disk, which is the same as not having them: a Sora take costs about a
   minute of wall clock and cannot be reproduced, since the model is not deterministic and the
   deployments move underneath it.

   So this commits each submodule that has changes, pushes it, and then records the new commit
   ids in the parent. That last step is the one that is easy to forget and the one that matters:
   a submodule pushed but not recorded in the parent is invisible to a fresh clone.

     node tools/push-assets.mjs --dry
     node tools/push-assets.mjs -m "Gupta series, story-specific closes"
*/
import { readFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const DRY = has('dry');
const MSG = arg('m', null) || arg('message', null);
/* Comfortably under the point where GitHub starts answering with HTTP 500. It is not a
   documented number; it is where pushes were observed to fail. */
const LIMIT = Number(arg('limit-mb', '700')) * 1024 * 1024;
/* And by file count, independently. A pack of many small objects fails on the same HTTP 500
   with bytes well under the limit. */
const MAXFILES = Number(arg('limit-files', '1500'));

/** Every file under a directory, so an untracked folder can be weighed before it is committed. */
async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

const git = async (args, cwd = '.') => {
  const { stdout } = await execFileP('git', args, { cwd, maxBuffer: 1 << 28 });
  return stdout.trim();
};

const mods = (await readFile('.gitmodules', 'utf8').catch(() => ''))
  .split('\n').map((l) => l.trim())
  .filter((l) => l.startsWith('path = '))
  .map((l) => l.slice(7).trim());

if (!mods.length) { console.error('no submodules in .gitmodules'); process.exit(1); }

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
let moved = 0;

for (const m of mods) {
  const status = await git(['status', '--porcelain'], m).catch(() => null);
  if (status === null) { console.log(`  ${m.padEnd(11)} not a checkout — skipped`); continue; }

  const lines = status ? status.split('\n') : [];
  /* Counted by kind, because "412 changes" tells you nothing about whether a run went well and
     "412 new takes, 0 modified" tells you it went exactly as intended. */
  const added = lines.filter((l) => /^\?\?/.test(l)).length;
  const changed = lines.filter((l) => /^\s*M/.test(l)).length;
  const gone = lines.filter((l) => /^\s*D/.test(l)).length;

  if (!lines.length) {
    const ahead = await git(['rev-list', '--count', '@{u}..HEAD'], m).catch(() => '0');
    if (ahead === '0') { console.log(`  ${m.padEnd(11)} clean`); continue; }
    console.log(`  ${m.padEnd(11)} clean, ${ahead} commit(s) unpushed`);
    if (!DRY) await git(['push', 'origin', 'HEAD:main'], m);
    moved++;
    continue;
  }

  console.log(`  ${m.padEnd(11)} ${added} new, ${changed} modified, ${gone} removed`);
  moved++;
  if (DRY) continue;

  /* Committed in size-bounded batches, because a push is not allowed to be arbitrarily large.
     GitHub answers roughly two gigabytes with HTTP 500, and an archived frame sequence is three
     to four on its own — one run of one episode. Batching by accumulated bytes rather than by
     directory is what makes it general: the unit that must fit is the push, and nothing about
     the shape of the work guarantees any directory is small enough.

     Untracked directories are expanded to their files first. Git reports a new folder as one
     entry, so batching the entries git prints puts a seven-gigabyte tree in a single batch and
     the limit never binds. */
  const entries = lines.map((l) => l.slice(3).replace(/^"|"$/g, '')).filter(Boolean);
  const weighed = [];
  for (const e of entries) {
    const full = path.join(m, e);
    const isDir = e.endsWith('/') || await stat(full).then((s) => s.isDirectory(), () => false);
    if (isDir) {
      for (const f of await walk(full)) {
        weighed.push({ p: path.relative(m, f).replace(/\\/g, '/'), size: (await stat(f).catch(() => ({ size: 0 }))).size });
      }
    } else {
      weighed.push({ p: e, size: (await stat(full).catch(() => ({ size: 0 }))).size });
    }
  }

  const batches = [];
  let batch = []; let bytes = 0;
  for (const w of weighed.sort((a, b) => a.p.localeCompare(b.p))) {
    /* Bounded by count as well as by bytes. A push fails on either: sixteen thousand small
       frames is a large pack even when the bytes look modest, and relying on the byte estimate
       alone put every one of them in a single batch. */
    if (batch.length && (bytes + w.size > LIMIT || batch.length >= MAXFILES)) {
      batches.push(batch); batch = []; bytes = 0;
    }
    batch.push(w.p); bytes += w.size;
  }
  if (batch.length) batches.push(batch);
  const totalMB = weighed.reduce((a, w) => a + w.size, 0) / 1024 / 1024;
  console.log(`    ${weighed.length} file(s), ${totalMB.toFixed(0)} MB -> ${batches.length} push(es)`);

  for (const [i, b] of batches.entries()) {
    const label = batches.length > 1 ? `${MSG || 'Generated assets'} (${i + 1}/${batches.length})` : (MSG || `Generated assets, ${stamp}`);
    /* Paths are handed to git in chunks: a batch can be thousands of files and Windows caps a
       command line at about 32k characters. */
    for (let k = 0; k < b.length; k += 400) await git(['add', '--', ...b.slice(k, k + 400)], m);
    await git(['commit', '-m', label], m);
    await git(['push', 'origin', 'HEAD:main'], m);
    const at = await git(['rev-parse', 'HEAD'], m);
    const there = (await git(['ls-remote', 'origin', 'refs/heads/main'], m)).split(/\s+/)[0];
    if (at !== there) {
      console.error(`    !! ${m}: pushed ${at.slice(0, 8)} but remote is ${there.slice(0, 8)} — batch ${i + 1} did not land`);
      process.exit(1);
    }
    console.log(`    ${batches.length > 1 ? `[${i + 1}/${batches.length}] ` : ''}${at.slice(0, 8)} · ${b.length} file(s) pushed and verified`);
  }
  continue;
}

if (!moved) { console.log('\nnothing to push'); process.exit(0); }
if (DRY) { console.log(`\n--dry: ${moved} repo(s) would be committed and pushed`); process.exit(0); }

/* The parent records which commit of each submodule belongs to this state of the code. A
   submodule pushed without this is on GitHub and invisible to anyone cloning. */
const parentDirty = await git(['status', '--porcelain', '--', ...mods]);
if (parentDirty) {
  await git(['add', '--', ...mods]);
  await git(['commit', '-m', MSG ? `${MSG} (asset pointers)` : `Asset pointers, ${stamp}`]);
  await git(['push', 'origin', 'HEAD:main']);
  console.log(`\nparent -> ${(await git(['rev-parse', '--short', 'HEAD']))} (submodule pointers updated)`);
} else {
  console.log('\nparent already points at these commits');
}
