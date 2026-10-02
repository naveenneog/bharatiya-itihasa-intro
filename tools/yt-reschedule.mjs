/* Move an already-scheduled video to a different publish time.

   tools/pilot-schedule.mjs cannot do this: the agent's schedulePublish() returns early when a
   video already reads "Scheduled", by design, so that a second pass never re-dates anything.
   This is the deliberate path for the cases where a date has to change.

   Written on 2 Oct, when two Hindi test Shorts sat an hour before English Shorts. In all five
   pairs of Shorts published within an hour of each other on this channel (25-30 Sep), one of the
   two stalled at 5-73 views (GROWTH.md, 2 Oct).

   For a scheduled video, Studio's visibility dialog opens with the stored date and time in it,
   so the change is confirmed by reading them back after a reload, not by trusting the save.

     node tools/yt-reschedule.mjs --id HfSI_28sPPk --at 2026-10-02T19:00          # dry: show the change
     node tools/yt-reschedule.mjs --id HfSI_28sPPk --at 2026-10-02T19:00 --go

   Refuses a video that is not "Scheduled" (public or private) and a target less than three hours
   away. On success, updates the video's publishLocal in dist/feed-shorts.json, if it is there.
   Only one process may drive the browser profile at a time; stop the yt-agent first. */
import { chromium } from 'playwright-core';
import { readFile, writeFile, rename } from 'node:fs/promises';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const GO = argv.includes('--go');
const ID = arg('id', null);
const AT = arg('at', null);
const m = String(AT || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
if (!ID || !m) { console.error('usage: node tools/yt-reschedule.mjs --id <video id> --at YYYY-MM-DDTHH:MM (IST) [--go]'); process.exit(1); }
const [Y, M, D, H, MI] = m.slice(1).map(Number);
if (MI % 15) { console.error('Studio offers times in 15-minute steps'); process.exit(1); }
const targetMs = Date.parse(`${AT}:00+05:30`);
if (targetMs < Date.now() + 3 * 3600e3) { console.error(`${AT} IST is less than three hours away`); process.exit(1); }

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateStr = `${MON[M - 1]} ${D}, ${Y}`;
const timeStr = `${H % 12 || 12}:${String(MI).padStart(2, '0')} ${H < 12 ? 'AM' : 'PM'}`;
/* Studio renders "7:00 PM" with a narrow no-break space in some builds. */
const norm = (s) => String(s || '').replace(/[\s\u00a0\u202f]+/g, '').toUpperCase();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ctx = await chromium.launchPersistentContext('C:\\Users\\navg\\.copilot\\playwright-youtube-profile',
  { channel: 'msedge', headless: false, viewport: { width: 1300, height: 950 } });
const page = ctx.pages()[0] || await ctx.newPage();

async function openDialog() {
  await page.goto(`https://studio.youtube.com/video/${ID}/edit`, { waitUntil: 'domcontentloaded' });
  await sleep(8000);
  const card = ((await page.locator('ytcp-video-metadata-visibility').first().innerText().catch(() => '')) || '')
    .replace(/\s+/g, ' ').trim();
  if (!/scheduled/i.test(card)) return { card };
  await page.locator('ytcp-video-metadata-visibility [role=button]').first().click({ timeout: 15000 });
  await sleep(2500);
  const inputs = page.locator('tp-yt-paper-dialog input, ytcp-video-metadata-visibility input');
  let timeIdx = -1; let time = '';
  for (let i = 0; i < await inputs.count(); i++) {
    const v = (await inputs.nth(i).inputValue().catch(() => '')) || '';
    if (/(AM|PM)/i.test(v)) { timeIdx = i; time = v; break; }
  }
  const date = ((await page.locator('#datepicker-trigger').first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  return { card, inputs, timeIdx, time, date };
}

let code = 1;
try {
  const now = await openDialog();
  console.log(`  ${ID}  [${now.card || '?'}]  stored: ${now.date || '?'} ${now.time || '?'}  ->  wanted: ${dateStr} ${timeStr}`);
  if (!/scheduled/i.test(now.card || '')) throw new Error('not a scheduled video; use tools/pilot-schedule.mjs for private ones, and never move a public one');
  if (!now.date || now.timeIdx < 0) throw new Error('could not read the stored date and time from the dialog');
  const sameDate = norm(now.date) === norm(dateStr);
  const sameTime = norm(now.time) === norm(timeStr);
  if (sameDate && sameTime) { console.log('    already at that time'); code = 0; }
  else if (!GO) { console.log('    dry run: nothing changed (pass --go)'); code = 0; await page.keyboard.press('Escape'); }
  else {
    if (!sameTime) {
      await now.inputs.nth(now.timeIdx).click(); await sleep(1000);
      const opt = page.getByRole('option', { name: timeStr, exact: true }).first();
      const alt = page.locator('tp-yt-paper-item').filter({ hasText: new RegExp(`^\\s*${timeStr.replace(/\s+/g, '[\\s\\u00a0\\u202f]*')}\\s*$`) }).first();
      const pick = (await opt.count()) ? opt : alt;
      if (!(await pick.count())) throw new Error(`time option "${timeStr}" not found`);
      await pick.scrollIntoViewIfNeeded().catch(() => {});
      await pick.click({ timeout: 5000 });
      await sleep(900);
    }
    if (!sameDate) {
      await page.locator('#datepicker-trigger').first().click({ timeout: 6000 });
      await sleep(1200);
      const month = page.locator('.calendar-month', { hasText: `${MON[M - 1]} ${Y}` }).first();
      const cell = month.getByText(String(D), { exact: true }).first();
      await cell.scrollIntoViewIfNeeded();
      await cell.click({ timeout: 6000 });
      await sleep(900);
    }
    const done = page.getByRole('button', { name: /^Done$/i }).first();
    if (!(await done.isEnabled().catch(() => false))) throw new Error('Done is not enabled after the change');
    await done.click({ timeout: 6000 }); await sleep(2000);
    const save = page.getByRole('button', { name: /^Save$/i }).first();
    if (!(await save.isEnabled().catch(() => false))) throw new Error('Save is not enabled after Done');
    await save.click({ timeout: 8000 }); await sleep(6000);

    const after = await openDialog();
    const ok = /scheduled/i.test(after.card || '') && norm(after.date) === norm(dateStr) && norm(after.time) === norm(timeStr);
    console.log(`    after reload: [${after.card}] ${after.date} ${after.time}  -> ${ok ? 'moved, confirmed' : 'NOT CONFIRMED'}`);
    await page.keyboard.press('Escape');
    if (ok) {
      code = 0;
      const REG = 'dist/feed-shorts.json';
      const rows = JSON.parse(await readFile(REG, 'utf8').catch(() => '[]'));
      const row = rows.find((r) => r.id === ID);
      if (row) {
        row.previousPublishLocal = row.publishLocal;
        row.publishLocal = `${AT}:00+05:30`;
        row.rescheduledAt = new Date().toISOString();
        await writeFile(`${REG}.tmp`, `${JSON.stringify(rows, null, 2)}\n`);
        await rename(`${REG}.tmp`, REG);
        console.log(`    ${REG}: ${row.previousPublishLocal} -> ${row.publishLocal}`);
      }
    }
  }
} catch (e) {
  await page.screenshot({ path: `dist/probe/yt-reschedule-${ID}.png` }).catch(() => {});
  console.log(`    FAILED: ${String(e.message).split('\n')[0]}  (page: dist/probe/yt-reschedule-${ID}.png)`);
} finally {
  await ctx.close();
}
process.exitCode = code;
