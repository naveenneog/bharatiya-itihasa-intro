/* The register of feed-format Shorts: record each one, give it a slot, schedule it.

   The five pilots were scheduled from ids typed into this file. That does not survive a second
   day. The register is dist/feed-shorts.json, one entry per Short, and everything reads it: the
   daily measurement takes its ids from here, and the scheduler takes its slots from here.

     node tools/pilot-schedule.mjs add --slug nalanda-hi --era gupta --at 2026-10-02T19:00
         reads the uploaded id from dist/uploads.json and records the Short at that IST time
     node tools/pilot-schedule.mjs add --slug five-generations-across --era chalukya \
         --at 2026-09-30T13:00 --replaces 91lAMk9AoNg
         a remake: takes the old version's slot, and records the old id, which
         tools/yt-delete.mjs removes once the remake is scheduled
     node tools/pilot-schedule.mjs schedule [--dry]
         dates every entry not yet scheduled, and marks the verified ones
     node tools/pilot-schedule.mjs ids [--published]
         prints the ids, comma-joined, for tools/yt-retention.mjs --ids; --published keeps only
         those whose publish time has passed

   `add` refuses a slot within five hours of any other Short in this register or the backlog
   plan (the plan's Shorts are at 13:00 and 19:00 from 20 Oct). To move a Short that is already
   scheduled, use tools/yt-reschedule.mjs.
*/
import { readFile, writeFile, rename } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const cmd = argv[0];
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const DRY = argv.includes('--dry');
const REG = 'dist/feed-shorts.json';
const TZ = '+05:30';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const load = async () => JSON.parse(await readFile(REG, 'utf8').catch(() => '[]'));
const save = async (rows) => {
  await writeFile(`${REG}.tmp`, `${JSON.stringify(rows, null, 2)}\n`);
  await rename(`${REG}.tmp`, REG);
};

if (cmd === 'ids') {
  /* --published: only Shorts whose publish time has passed. Analytics for a scheduled video are
     empty, and each one costs the measurement two page loads. */
  const pub = argv.includes('--published');
  console.log((await load())
    .filter((r) => !pub || (r.publishLocal && Date.parse(r.publishLocal) <= Date.now()))
    .map((r) => r.id).filter(Boolean).join(','));
  process.exit(0);
}

if (cmd === 'add') {
  const slug = arg('slug', null); const era = arg('era', null);
  const at = arg('at', null); const replaces = arg('replaces', null);
  if (!slug || !era) { console.error('usage: add --slug <slug> --era <era> --at YYYY-MM-DDTHH:MM [--replaces <old id>]'); process.exit(1); }
  const dir = `dist/${era}/${slug}_short`;
  const title = readFileSync(path.join(dir, 'title.txt'), 'utf8').trim().split('\n')[0];
  const ledger = JSON.parse(readFileSync('dist/uploads.json', 'utf8')).uploads || {};
  const rec = Object.entries(ledger).find(([k, v]) => k.replace(/\\/g, '/') === dir && v.exit === 0 && v.url);
  if (!rec) { console.error(`${dir} has no successful upload in dist/uploads.json — upload it first`); process.exit(1); }
  const id = rec[1].url.replace(/^https?:\/\/(youtu\.be\/|(www\.)?youtube\.com\/shorts\/)/, '');
  /* The ledger is keyed by folder and a remake renders into the old version's folder, so until
     the remake is uploaded the record still names the video it is meant to replace. */
  if (replaces && id === replaces) {
    console.error(`${dir}'s upload record is still the old version (${id}) — upload the remake first`);
    process.exit(1);
  }
  const rows = await load();
  if (rows.some((r) => r.id === id)) { console.log(`  ${id} already registered`); process.exit(0); }
  /* An explicit slot is required. The old default filled 17:00 and 21:00, four hours apart and
     four hours after the 13:00 Shorts, which the spacing check below would now refuse anyway. */
  if (!at) { console.error('--at YYYY-MM-DDTHH:MM (IST) is required'); process.exit(1); }
  const m = String(at).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/);
  if (!m) { console.error(`--at takes IST local time as YYYY-MM-DDTHH:MM, not "${at}"`); process.exit(1); }
  const publishLocal = `${m[1]}T${m[2]}:${m[3]}:00${TZ}`;
  if (new Date(publishLocal).getTime() < Date.now() + 2 * 3600e3) {
    console.error(`--at ${at} IST is less than two hours away; Studio needs time to process first`);
    process.exit(1);
  }
  const clash = rows.find((r) => r.publishLocal === publishLocal);
  if (clash) { console.error(`${publishLocal} already belongs to ${clash.id} (${clash.slug})`); process.exit(1); }
  /* Spacing. In all five pairs of Shorts published within an hour of each other on this channel
     (25-30 Sep), one of the two stalled at 5-73 views (GROWTH.md, 2 Oct). So no slot within five
     hours of another Short, counting this register and the backlog plan. The slot a remake takes
     over is not a neighbour: the plan item for the same folder, and the video it replaces. */
  const plan = JSON.parse(readFileSync('dist/publish-plan.json', 'utf8')).plan || [];
  const feedDirs = new Set(rows.map((r) => `dist/${r.era}/${r.slug}_short`));
  const t = Date.parse(publishLocal);
  const near = [
    ...rows.filter((r) => r.publishLocal && r.id !== replaces)
      .map((r) => ({ what: `${r.id} ${r.slug}`, at: r.publishLocal })),
    ...plan.filter((p) => p.kind === 'short' && p.publishLocal && p.dir !== dir && !feedDirs.has(p.dir))
      .map((p) => ({ what: p.dir, at: p.publishLocal })),
  ].filter((x) => Math.abs(Date.parse(x.at) - t) < 5 * 3600e3);
  if (near.length) {
    console.error(`${publishLocal} is within five hours of another Short:`);
    for (const x of near) console.error(`  ${x.at}  ${x.what}`);
    process.exit(1);
  }
  rows.push({ id, slug, era, title, publishLocal, scheduled: false, addedAt: new Date().toISOString(),
    ...(replaces ? { replaces } : {}) });
  await save(rows);
  /* A backlog Short's old id is also in dist/publish-log.json, which tools/yt-delete.mjs treats
     as "still in use". The remake takes over the folder, and publish-run skips folders in this
     register, so the log entry is handed over: the old id is kept as replacedId. */
  if (replaces) {
    const LOG = 'dist/publish-log.json';
    const log = JSON.parse(readFileSync(LOG, 'utf8'));
    const hit = Object.entries(log).find(([, v]) => v?.id === replaces);
    if (hit) {
      const [dir, v] = hit;
      log[dir] = { ...v, id: undefined, replacedId: replaces, replacedBy: id, replacedAt: new Date().toISOString() };
      await writeFile(`${LOG}.tmp`, `${JSON.stringify(log, null, 2)}\n`);
      await rename(`${LOG}.tmp`, LOG);
      console.log(`  publish-log ${dir}: ${replaces} handed over to ${id}`);
    }
  }
  console.log(`  registered ${id}  ${publishLocal}  ${title}${replaces ? `  (replaces ${replaces})` : ''}`);
  process.exit(0);
}

if (cmd === 'schedule') {
  const rows = await load();
  const todo = rows.filter((r) => r.id && r.publishLocal && !r.scheduled);
  for (const r of todo) console.log(`  ${r.publishLocal.slice(0, 16).replace('T', ' ')}  ${r.id}  ${r.title}`);
  if (!todo.length) { console.log('  nothing to schedule'); process.exit(0); }
  if (DRY) { console.log('\n  --dry: nothing scheduled'); process.exit(0); }

  const { chromium } = await import('playwright-core');
  const { schedulePublish } = await import('../../yt-agent/lib/upload.mjs');
  const ctx = await chromium.launchPersistentContext('C:\\Users\\navg\\.copilot\\playwright-youtube-profile',
    { channel: 'msedge', headless: false, viewport: { width: 1300, height: 950 } });
  const page = ctx.pages()[0] || await ctx.newPage();
  let ok = 0; let pending = 0; let bad = 0;
  try {
    await page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    for (const r of todo) {
      const m = r.publishLocal.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      const when = { year: +m[1], month: +m[2], day: +m[3], hour: +m[4], minute: +m[5] };
      process.stdout.write(`\n  ${r.id} -> ${r.publishLocal.slice(0, 16)} ... `);
      try {
        const res = await schedulePublish(page, r.id, when, (msg) => process.stdout.write(`\n      ${msg}`));
        if (res.verified) { r.scheduled = true; r.scheduledAt = new Date().toISOString(); ok++; process.stdout.write('ok'); }
        else if (res.pending) { pending++; process.stdout.write('still processing — next pass'); }
        else { bad++; process.stdout.write('not verified'); }
      } catch (e) { bad++; process.stdout.write(`ERROR ${String(e.message).slice(0, 70)}`); }
      await save(rows);
      await sleep(2500);
    }
  } finally {
    await ctx.close();
  }
  console.log(`\n\n  scheduled ${ok}, still processing ${pending}, failed ${bad}`);
  process.exit(bad ? 1 : 0);
}

console.error('usage: node tools/pilot-schedule.mjs add|schedule|ids  (see header)');
process.exit(1);
