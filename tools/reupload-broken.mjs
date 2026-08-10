/* Delete + re-upload the broken Bhāratīya Itihāsa episodes, one at a time, resumably.

   For each broken order (processing-abandoned / upload-interrupted):
     1. delete the broken YouTube entry   (tools/delete-broken.mjs --only N)
     2. re-upload the local master private (tools/upload.mjs --dir <dir> --again)
   The profile allows a single writer, so each child runs alone and the profile is
   freed (orphan Edge killed, daemon stopped) between steps.

   Resumable via dist/reupload-log.json: a step already done is skipped, so re-running
   never creates a duplicate upload. Scheduling of the re-uploaded videos is a SEPARATE
   step (tools/schedule-run.mjs) run once they finish processing.

   Usage:
     node tools/reupload-broken.mjs --dry
     node tools/reupload-broken.mjs                 # all pending
     node tools/reupload-broken.mjs --only 2,7      # subset
     node tools/reupload-broken.mjs --max 3
*/
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);
const DRY = has('dry');
const MAX = parseInt(arg('max', '999'), 10);
const ONLY = arg('only', null)?.split(',').map(Number);
const LOG = 'dist/reupload-log.json';

const status = JSON.parse(await readFile('dist/yt-status.json', 'utf8'));
const sched = JSON.parse(await readFile('dist/schedule.json', 'utf8'));
const dirByOrder = new Map(sched.map(e => [e.order, e.dir]));
const log = JSON.parse(await readFile(LOG, 'utf8').catch(() => '{}'));

let targets = status.filter(s => ['PROC_ABANDONED', 'UPLOAD_INTERRUPTED'].includes(s.state));
if (ONLY) targets = targets.filter(t => ONLY.includes(t.order));
targets = targets.filter(t => !(log[t.order] && log[t.order].reuploaded)).sort((a, b) => a.order - b.order).slice(0, MAX);

console.log(`Broken to re-upload: ${targets.length}`);
for (const t of targets) console.log(`  ${String(t.order).padStart(2)}. ${t.title}  (${dirByOrder.get(t.order)})`);
if (DRY) { console.log('\n--dry'); process.exit(0); }
if (!targets.length) { console.log('nothing to do'); process.exit(0); }

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function run(cmd, args) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: false });
    p.on('close', (code) => resolve(code));
  });
}
async function freeProfile() {
  // stop daemon + kill any Edge holding the playwright profile
  await run('powershell', ['-NoProfile', '-Command',
    `$lp=(Get-Content 'C:\\Users\\navg\\DailyApps\\yt-agent\\agent.lock' -ErrorAction SilentlyContinue); if($lp){Stop-Process -Id $lp -Force -ErrorAction SilentlyContinue}; ` +
    `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -match 'playwright-youtube-profile' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`]);
  await sleep(2500);
}

let ok = 0, fail = 0;
for (const t of targets) {
  const dir = dirByOrder.get(t.order);
  console.log(`\n=== [${t.order}] ${t.title} ===`);
  log[t.order] = log[t.order] || { title: t.title };

  // 1. delete broken entry (idempotent; skips if already gone)
  if (!log[t.order].deleted) {
    await freeProfile();
    const dc = await run('node', ['tools/delete-broken.mjs', '--only', String(t.order)]);
    log[t.order].deleted = (dc === 0);
    await writeFile(LOG, JSON.stringify(log, null, 2) + '\n');
  }

  // 2. re-upload master (only once)
  await freeProfile();
  const uc = await run('node', ['tools/upload.mjs', '--dir', dir, '--again', '--visibility', 'private']);
  // read the new url from the ledger
  let url = null;
  try { const led = JSON.parse(await readFile('dist/uploads.json', 'utf8')); url = led.uploads[dir.replace(/\\/g, '/')]?.url || null; } catch {}
  log[t.order].reuploaded = (uc === 0);
  log[t.order].url = url;
  log[t.order].at = new Date().toISOString();
  await writeFile(LOG, JSON.stringify(log, null, 2) + '\n');
  if (uc === 0) { ok++; console.log(`  re-uploaded -> ${url}`); } else { fail++; console.log(`  re-upload FAILED (exit ${uc})`); }
  await sleep(2000);
}
await freeProfile();
console.log(`\n\nDone. reuploaded=${ok} failed=${fail}. Schedule them once processed with tools/schedule-run.mjs.`);
