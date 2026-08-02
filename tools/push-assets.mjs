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
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const DRY = has('dry');
const MSG = arg('m', null) || arg('message', null);

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
  if (DRY) continue;

  await git(['add', '-A'], m);
  await git(['commit', '-m', MSG || `Generated assets, ${stamp}`], m);
  await git(['push', 'origin', 'HEAD:main'], m);

  /* Verified against the remote rather than against what push said. GitHub answers a push of
     about two gigabytes with HTTP 500 and then prints "Everything up-to-date", so a tool that
     reads git's last line records a successful push of nothing. */
  const local = await git(['rev-parse', 'HEAD'], m);
  const remote = (await git(['ls-remote', 'origin', 'refs/heads/main'], m)).split(/\s+/)[0];
  if (local !== remote) {
    console.error(`    !! ${m}: pushed HEAD ${local.slice(0, 8)} but remote is ${remote.slice(0, 8)}`);
    console.error('       The push did not land. Split the commit if it is very large.');
    process.exit(1);
  }
  console.log(`    -> ${local.slice(0, 8)} pushed and verified`);
  moved++;
}

if (!moved) { console.log('\nnothing to push'); process.exit(0); }
if (DRY) { console.log('\n--dry: nothing committed'); process.exit(0); }

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
