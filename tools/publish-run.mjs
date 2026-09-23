/* Drive the publish plan: upload what is missing, then give everything its date.

   Two phases, because they cannot share a browser. tools/upload.mjs spawns the agent, which
   opens its own window; schedulePublish needs a window of its own. Only one process may drive
   the profile at a time, so they are run one after the other, never together.

     node tools/publish-run.mjs --upload --max 3     # upload the next 3, private
     node tools/publish-run.mjs --upload             # upload everything missing
     node tools/publish-run.mjs --schedule --max 5   # give the next 5 their dates
     node tools/publish-run.mjs                      # show state, do nothing

   Uploads follow **plan order**, not directory order. That matters: the run will be stopped by
   a daily quota long before 294 videos are up, and when it is, the ones that made it should be
   the ones publishing first. Uploading alphabetically would leave October's episodes on disk
   and March's on the channel.

   Idempotent. tools/upload.mjs already refuses a second copy of a master by content hash, and
   schedulePublish reports a video that is already scheduled rather than moving it. Progress is
   recorded in dist/publish-log.json so a stopped run resumes where it left off.
*/
import { spawn } from 'node:child_process';
import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const UPLOAD = has('upload');
const SCHEDULE = has('schedule');
const MAX = Number(arg('max', 9999));
const PLAN = arg('plan', 'dist/publish-plan.json');
const LOG = arg('log', 'dist/publish-log.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { plan } = JSON.parse(await readFile(PLAN, 'utf8'));
const log = JSON.parse((await readFile(LOG, 'utf8').catch(() => '')).trim() || '{}');
const save = async () => {
  await writeFile(`${LOG}.tmp`, `${JSON.stringify(log, null, 2)}\n`);
  await rename(`${LOG}.tmp`, LOG);
};

/* The plan is a snapshot; the ledger is what this machine believes it did. They disagree, and
   when they do the channel wins.

   dist/uploads.json holds 117 successful uploads. 81 of those video ids are not on the channel
   — deleted, or removed after failing to process. Taking an id from the ledger alone means
   scheduling a video that does not exist: it fails one at a time, slowly, in a browser.

   So a ledger id counts only when the channel scan also saw it. Anything else is treated as
   not uploaded, which is the safe direction — a duplicate upload is refused by content hash,
   while a missing one is silently never published. */
const ledger = await readFile('dist/uploads.json', 'utf8')
  .then((s) => JSON.parse(s).uploads || {}).catch(() => ({}));
const channel = JSON.parse(await readFile('dist/yt-channel.json', 'utf8'));
const live = new Set(channel.rows.map((r) => r.id));
/* The plan's `state` was true when the plan was written and is not true now — this campaign
   uploads a hundred videos between one scan and the next. Matching the fresh scan by title is
   what tells us whether the channel has this episode today, under any id. Without it, an item
   uploaded by some other route since the plan was made looks absent, gets `--again`, and goes
   up a second time. */
const norm = (t) => (t || '').toLowerCase().replace(/[’'`]/g, "'").replace(/[^a-z0-9]+/g, ' ').trim();

const liveByTitle = new Map();
for (const r of channel.rows) if (!liveByTitle.has(norm(r.title))) liveByTitle.set(norm(r.title), r);
const idOf = (u) => (u || '').replace(/^https?:\/\/(youtu\.be\/|(www\.)?youtube\.com\/shorts\/)/, '');
const uploadedId = (dir) => {
  const rec = Object.entries(ledger).find(([k, v]) => k.replace(/\\/g, '/') === dir && v.exit === 0 && v.url);
  const id = rec ? idOf(rec[1].url) : null;
  return id && live.has(id) ? id : null;
};

let ghosts = 0;
for (const p of plan) {
  /* Any record at all, successful or not. A failed attempt matters as much as a successful one,
     because upload.mjs guards against both. */
  const rec = Object.entries(ledger).find(([k]) => k.replace(/\\/g, '/') === p.dir)?.[1];
  const hasLedger = !!rec;
  const mine = log[p.dir]?.id || null;
  const claimed = p.id || uploadedId(p.dir);

  /* Order matters here, and getting it wrong duplicates videos.

     dist/yt-channel.json is a snapshot taken before this run. Anything uploaded since is
     absent from it, so checking the snapshot first marks a video this tool just sent as "not
     on the channel" — and then, because the ledger now has a record for it, as stale, which
     passes --again and uploads a second copy. Caught on the first live upload.

     So: what this tool recorded wins outright, because it is the most recent thing that
     happened. Only when the tool has no record does the snapshot get consulted. */
  /* The channel as it is now, by title, rather than as the plan remembers it. Taking the id
     from here as a last resort means an episode uploaded by some other route gets a date
     instead of a second upload. */
  const here = liveByTitle.get(norm(p.title)) || null;
  const onChannelNow = !!here;
  p.id = mine || claimed || (here ? here.id : null);
  p.scheduled = !!(here?.state === 'SCHEDULED' || p.state === 'SCHEDULED' || log[p.dir]?.scheduled);

  /* upload.mjs refuses to send a master twice, and has two separate guards for it:
       - already uploaded (exit 0, url recorded) — by content hash
       - already attempted and left unfinished (exit non-zero, no url) — because a half-done
         upload usually leaves a draft, and sending again would make two copies

     Both guards read the ledger, and the ledger is not the channel. 81 recorded uploads have
     been deleted since. And the second guard is the more conservative of the two: three
     uploads failed on a click timeout at the *title box*, which happens before the video is
     committed, so nothing was left behind at all — confirmed by scanning for their titles.

     The channel settles it. If it has neither the id nor the title, there is nothing to
     duplicate, so `--again` is correct: not "send a second copy", but "there is no first one".
     Anything this tool uploaded, or that the channel still has, keeps the guard. */
  p.stale = hasLedger && !mine && !p.id && !onChannelNow;
  if (!mine && claimed === null && hasLedger && !onChannelNow) ghosts++;
}

const toUpload = plan.filter((p) => !p.id);
const toSchedule = plan.filter((p) => p.id && !p.scheduled);

console.log(`\n  ${plan.length} in the plan`);
console.log(`    ${plan.length - toUpload.length} on the channel`);
console.log(`    ${toUpload.length} still to upload`);
console.log(`    ${toSchedule.length} uploaded but with no date yet`);
if (ghosts) console.log(`    ${ghosts} ledger id(s) ignored — recorded as uploaded but not on the channel`);

if (!UPLOAD && !SCHEDULE) {
  console.log('\n  --upload to send them, --schedule to date them. Nothing done.');
  const next = toUpload.slice(0, 5);
  if (next.length) {
    console.log('\n  next up for upload:');
    for (const p of next) console.log(`    ${p.publishLocal.slice(0, 10)}  ${p.kind.padEnd(5)} ${p.title.slice(0, 56)}`);
  }
  process.exit(0);
}

if (UPLOAD) {
  const work = toUpload.slice(0, MAX);
  console.log(`\n  uploading ${work.length}, private, in plan order\n`);
  let ok = 0; let bad = 0;
  for (const [i, p] of work.entries()) {
    console.log(`${'─'.repeat(70)}\n  [${i + 1}/${work.length}] ${p.publishLocal.slice(0, 10)}  ${p.kind}  ${p.title}`);
    if (p.stale) console.log('      (ledger says uploaded, channel does not have it — re-sending)');
    const args = ['tools/upload.mjs', '--dir', p.dir, '--visibility', 'private',
      ...(p.stale ? ['--again'] : [])];
    const code = await new Promise((r) => spawn(process.execPath, args, { stdio: 'inherit' }).on('close', r));
    /* Re-read the ledger rather than parsing stdout: upload.mjs is the thing that knows whether
       the upload counted, and it writes that down. */
    const fresh = await readFile('dist/uploads.json', 'utf8')
      .then((s) => JSON.parse(s).uploads || {}).catch(() => ({}));
    const rec = Object.entries(fresh).find(([k, v]) => k.replace(/\\/g, '/') === p.dir && v.exit === 0 && v.url);
    if (code === 0 && rec) {
      log[p.dir] = { ...(log[p.dir] || {}), id: idOf(rec[1].url), uploadedAt: new Date().toISOString() };
      ok++;
    } else {
      log[p.dir] = { ...(log[p.dir] || {}), uploadExit: code, failedAt: new Date().toISOString() };
      bad++;
      console.log(`      upload did not land (exit ${code})`);
    }
    await save();
    /* Three consecutive failures is a quota or a sign-out, not three unlucky videos. Stopping
       beats burning the rest of the list against a wall. */
    const tail = work.slice(Math.max(0, i - 2), i + 1);
    if (tail.length === 3 && tail.every((t) => log[t.dir]?.uploadExit !== undefined)) {
      console.log('\n  three failed in a row — stopping. Check the channel for a daily limit.');
      break;
    }
    await sleep(4000);
  }
  console.log(`\n  uploaded ${ok}, failed ${bad}`);
  console.log('  now: node tools/publish-run.mjs --schedule');
}

if (SCHEDULE) {
  const { chromium } = await import('playwright-core');
  const { schedulePublish } = await import('../../yt-agent/lib/upload.mjs');
  const PROFILE = 'C:\\Users\\navg\\.copilot\\playwright-youtube-profile';

  /* The agent keeps its own Edge open on this profile between jobs. A second
     launchPersistentContext against a live user-data-dir does not fail cleanly — Edge prints
     "Opening in existing browser session", hands back a context with no pages, and Playwright
     dies a hundred lines later with the whole command line in the error. Say what is actually
     wrong instead, and leave the agent alone: it belongs to the upload phase. */
  const { execSync } = await import('node:child_process');
  const holding = execSync(
    'powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \\"Name=\'msedge.exe\'\\" | Where-Object { $_.CommandLine -like \'*playwright-youtube-profile*\' }).Count"',
    { encoding: 'utf8' }).trim();
  if (Number(holding) > 0) {
    console.error(`\n  ${holding} Edge process(es) already hold the YouTube profile — almost certainly the agent.`);
    console.error('  Upload and schedule cannot share it. Stop the agent, then run --schedule again:');
    console.error('    Get-CimInstance Win32_Process -Filter "Name=\'node.exe\'\\" | Where-Object { $_.CommandLine -like \'*agent.mjs*\' }');
    console.error('    Stop-Process -Id <that pid>');
    console.error('  Restart it for the next upload batch with yt-agent\\start-agent.ps1.');
    process.exit(2);
  }

  /* Re-read: an --upload phase in this same process has just changed who has an id. */
  const work = plan.filter((p) => (p.id || log[p.dir]?.id) && !p.scheduled && !log[p.dir]?.scheduled)
    .slice(0, MAX);
  if (!work.length) { console.log('\n  nothing to schedule'); process.exit(0); }

  console.log(`\n  scheduling ${work.length}\n`);
  const ctx = await chromium.launchPersistentContext(PROFILE,
    { channel: 'msedge', headless: false, viewport: { width: 1300, height: 950 } });
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded' });
  await sleep(3000);

  let ok = 0; let bad = 0; let pending = 0;
  try {
    for (const [i, p] of work.entries()) {
      const m = p.publishLocal.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      const when = { year: +m[1], month: +m[2], day: +m[3], hour: +m[4], minute: +m[5] };
      const id = p.id || log[p.dir].id;
      process.stdout.write(`  [${i + 1}/${work.length}] ${p.publishLocal.slice(0, 10)} ${p.kind.padEnd(5)} ${p.title.slice(0, 44)} ... `);
      try {
        const r = await schedulePublish(page, id, when, (msg) => process.stdout.write(`\n      ${msg}`));
        log[p.dir] = { ...(log[p.dir] || {}), id, scheduled: !!r.verified, when: r.when, at: new Date().toISOString() };
        if (r.verified) { ok++; console.log('ok'); }
        else if (r.pending) { pending++; console.log('still processing — retry later'); }
        else { bad++; console.log('not verified'); }
      } catch (e) {
        bad++;
        log[p.dir] = { ...(log[p.dir] || {}), id, scheduled: false, error: String(e.message).slice(0, 200) };
        console.log(`ERROR ${String(e.message).slice(0, 80)}`);
      }
      await save();
      await sleep(2500 + Math.random() * 1500);
    }
  } finally {
    await ctx.close();
  }
  console.log(`\n  scheduled ${ok}, still processing ${pending}, failed ${bad}`);
}
