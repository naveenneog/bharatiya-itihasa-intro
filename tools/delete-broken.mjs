/* Safely delete the broken (processing-abandoned / upload-interrupted) YouTube entries
   for Bhāratīya Itihāsa episodes, so their masters can be re-uploaded cleanly.

   Safety: only deletes a row when (a) its title EXACTLY matches a known broken episode
   AND (b) the row text still shows a broken state (abandoned/interrupted/failed/resume)
   AND (c) the confirm dialog shows the same title. Never deletes a healthy/public video.
   Idempotent: a title already gone is logged as 'deleted' and skipped.

   Usage:
     node tools/delete-broken.mjs --dry           # find + assert, never confirm
     node tools/delete-broken.mjs --only 1        # one order
     node tools/delete-broken.mjs                 # delete all broken
*/
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);
const DRY = has('dry');
const ONLY = arg('only', null)?.split(',').map(Number);
const PROFILE = 'C:\\Users\\navg\\.copilot\\playwright-youtube-profile';
const LIST = 'https://studio.youtube.com/channel/UCGYbLzah4VnRM1NVL7W8mVA/videos/upload';
const LOG = 'dist/deleted-log.json';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const norm = t => (t || '').toLowerCase().replace(/[’'`]/g, "'").replace(/[^a-z0-9]+/g, ' ').trim();
const BROKEN_RE = /abandoned|interrupted|failed|resume|could not be processed/i;

const status = JSON.parse(await readFile('dist/yt-status.json', 'utf8'));
let targets = status.filter(s => ['PROC_ABANDONED', 'UPLOAD_INTERRUPTED'].includes(s.state));
if (ONLY) targets = targets.filter(t => ONLY.includes(t.order));
const log = JSON.parse(await readFile(LOG, 'utf8').catch(() => '{}'));

console.log(`Broken to delete: ${targets.length}`);
const pending = targets.filter(t => !(log[t.order] && log[t.order].deleted));
console.log(`Pending (not yet deleted): ${pending.length}`);
if (!pending.length) { console.log('nothing to do'); process.exit(0); }

const ctx = await chromium.launchPersistentContext(PROFILE, { channel: 'msedge', headless: false, viewport: { width: 1400, height: 950 } });
const page = ctx.pages()[0] || await ctx.newPage();

async function findRow(title) {
  await page.goto(LIST, { waitUntil: 'domcontentloaded' });
  await sleep(6000);
  for (let pg = 0; pg < 6; pg++) {
    await sleep(1200);
    const rows = page.locator('ytcp-video-row');
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      const t = ((await rows.nth(i).locator('#video-title').first().innerText().catch(() => '')) || '').trim();
      if (norm(t) === norm(title)) return rows.nth(i);
    }
    const next = page.locator('#navigate-after').first();
    if (await next.count() === 0 || (await next.getAttribute('aria-disabled')) === 'true') break;
    await next.click().catch(() => {}); await sleep(1800);
  }
  return null;
}

let deleted = 0, skipped = 0, notfound = 0;
for (const t of pending) {
  process.stdout.write(`\n[${t.order}] ${t.title} ... `);
  const row = await findRow(t.title);
  if (!row) { console.log('NOT FOUND (already deleted?)'); log[t.order] = { title: t.title, deleted: true, note: 'not-found', at: new Date().toISOString() }; notfound++; await writeFile(LOG, JSON.stringify(log, null, 2) + '\n'); continue; }
  const rowText = ((await row.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
  if (!BROKEN_RE.test(rowText)) { console.log('SKIP — row not in broken state (safety)'); skipped++; continue; }
  const delBtn = row.getByRole('button', { name: /^Delete video$/i }).first();
  if (await delBtn.count() === 0) { console.log('SKIP — no Delete button'); skipped++; continue; }
  await delBtn.scrollIntoViewIfNeeded().catch(() => {});
  await delBtn.click({ timeout: 6000 });
  await sleep(2000);
  const dlg = page.locator('ytcp-confirmation-dialog').last();
  const dlgText = ((await dlg.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
  if (norm(dlgText).indexOf(norm(t.title)) === -1) { console.log('SKIP — confirm dialog title mismatch (safety)'); await page.keyboard.press('Escape').catch(() => {}); skipped++; continue; }
  if (DRY) { console.log('DRY — would delete'); await page.keyboard.press('Escape').catch(() => {}); await sleep(800); continue; }
  // check the "I understand" box, then Delete forever
  await dlg.locator('ytcp-checkbox-lit, [role=checkbox]').first().click({ timeout: 4000 }).catch(() => {});
  await sleep(500);
  await dlg.getByRole('button', { name: /^Delete forever$/i }).first().click({ timeout: 6000 });
  await sleep(3000);
  console.log('DELETED');
  log[t.order] = { title: t.title, deleted: true, at: new Date().toISOString() };
  await writeFile(LOG, JSON.stringify(log, null, 2) + '\n');
  deleted++;
}
console.log(`\n\nDone. deleted=${deleted} skipped=${skipped} notfound=${notfound}`);
await ctx.close();
