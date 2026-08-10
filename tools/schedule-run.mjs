/* Batch-schedule Bhāratīya Itihāsa episodes to publish public, one per day, in the
   chronological order already computed in dist/schedule.json.

   Idempotent: every scheduled video is recorded in dist/schedule-log.json against its
   id; a re-run skips anything already verified. Only drives ONE browser (the profile
   allows a single writer), sequentially, with pacing.

   Sources:
     dist/schedule.json   order -> { url, title, publishLocal, ... }
     dist/yt-status.json  order -> { state }  (PRIVATE|PUBLIC|PROC_ABANDONED|...)

   Usage:
     node tools/schedule-run.mjs --dry            # print what would be scheduled
     node tools/schedule-run.mjs                  # schedule all PRIVATE, healthy eps
     node tools/schedule-run.mjs --only 3,4,5     # only these orders
     node tools/schedule-run.mjs --max 5          # cap this run
*/
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { schedulePublish } from '../../yt-agent/lib/upload.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);
const DRY = has('dry');
const MAX = parseInt(arg('max', '999'), 10);
const ONLY = arg('only', null)?.split(',').map(Number);
const PROFILE = 'C:\\Users\\navg\\.copilot\\playwright-youtube-profile';
const LOG = 'dist/schedule-log.json';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const sched = JSON.parse(await readFile('dist/schedule.json', 'utf8'));
const status = JSON.parse(await readFile('dist/yt-status.json', 'utf8'));
const stateByOrder = new Map(status.map(s => [s.order, s.state]));
const log = JSON.parse(await readFile(LOG, 'utf8').catch(() => '{}'));

function parseSlot(iso) { // "2026-08-13T09:00:00+05:30"
  const m = iso.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return { year: +m[1], month: +m[2], day: +m[3], hour: +m[4], minute: +m[5] };
}

// Build the work list: healthy PRIVATE episodes, in chronological order, not yet done.
let work = sched
  .filter(e => e.url)
  .map(e => ({ ...e, id: e.url.replace('https://youtu.be/', ''), state: stateByOrder.get(e.order) }))
  .filter(e => (ONLY ? ONLY.includes(e.order) : e.state === 'PRIVATE'))
  .filter(e => !(log[e.id] && log[e.id].verified))
  .sort((a, b) => a.order - b.order)
  .slice(0, MAX);

console.log(`To schedule: ${work.length} episode(s)`);
for (const e of work) console.log(`  ${String(e.order).padStart(2)}. ${e.publishLocal.slice(0,10)}  ${e.state.padEnd(8)} ${e.id}  ${e.title}`);
if (DRY) { console.log('\n--dry: nothing scheduled'); process.exit(0); }
if (!work.length) { console.log('nothing to do'); process.exit(0); }

const ctx = await chromium.launchPersistentContext(PROFILE, { channel: 'msedge', headless: false, viewport: { width: 1300, height: 950 } });
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded' });
await sleep(3000);

let ok = 0, fail = 0;
for (const e of work) {
  const slot = parseSlot(e.publishLocal);
  process.stdout.write(`\n[${e.order}] ${e.title} -> ${e.publishLocal.slice(0,10)} ... `);
  try {
    const r = await schedulePublish(page, e.id, slot, m => process.stdout.write(`\n    ${m}`));
    log[e.id] = { order: e.order, ...r, at: new Date().toISOString() };
    await writeFile(LOG, JSON.stringify(log, null, 2) + '\n');
    if (r.verified) ok++; else fail++;
  } catch (err) {
    console.log('\n    ERROR: ' + String(err.message).slice(0, 120));
    log[e.id] = { order: e.order, scheduled: false, verified: false, error: String(err.message).slice(0, 200), at: new Date().toISOString() };
    await writeFile(LOG, JSON.stringify(log, null, 2) + '\n');
    fail++;
  }
  await sleep(2500 + Math.random() * 2000); // pace
}
console.log(`\n\nDone. scheduled(verified)=${ok} failed=${fail}`);
await ctx.close();
