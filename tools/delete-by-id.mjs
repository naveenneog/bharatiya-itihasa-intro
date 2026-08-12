/* Delete specific videos by id via the edit page's ⋮ menu -> Delete -> confirm.
   Used for the stuck "Pending / Checks starting soon" re-uploads, which the list-based
   delete-broken.mjs won't touch (they aren't in a processing-abandoned/interrupted state).

   Navigating by exact id guarantees we delete the intended video.

   Usage:
     node tools/delete-by-id.mjs --ids abc123,def456           # delete
     node tools/delete-by-id.mjs --ids abc123 --dry            # open + confirm dialog, cancel
*/
import { chromium } from 'playwright-core';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);
const DRY = has('dry');
const IDS = (arg('ids', '') || '').split(',').map(s => s.trim()).filter(Boolean);
const PROFILE = 'C:\\Users\\navg\\.copilot\\playwright-youtube-profile';
const s = (ms) => new Promise(r => setTimeout(r, ms));

if (!IDS.length) { console.error('usage: --ids <comma-separated video ids>'); process.exit(1); }

const ctx = await chromium.launchPersistentContext(PROFILE, { channel: 'msedge', headless: false, viewport: { width: 1300, height: 950 } });
const page = ctx.pages()[0] || await ctx.newPage();

let ok = 0, fail = 0;
for (const id of IDS) {
  process.stdout.write(`\n${id} ... `);
  try {
    await page.goto(`https://studio.youtube.com/video/${id}/edit`, { waitUntil: 'domcontentloaded' });
    await s(5000);
    await page.locator("[icon='icons:more-vert'], [icon='more-vert']").first().click({ timeout: 12000 });
    await s(1500);
    // click the "Delete" menu item (paper-listbox item; match exact trimmed text)
    const del = page.getByText('Delete', { exact: true }).first();
    await del.click({ timeout: 8000 });
    await s(2000);
    // confirm dialog: check "I understand" + Delete forever
    const dlg = page.locator('ytcp-confirmation-dialog').last();
    if (DRY) { console.log('DRY — confirm dialog shown, cancelling'); await page.keyboard.press('Escape').catch(() => {}); await s(800); continue; }
    await dlg.locator('ytcp-checkbox-lit, [role=checkbox]').first().click({ timeout: 5000 }).catch(() => {});
    await s(500);
    await dlg.getByRole('button', { name: /^Delete forever$/i }).first().click({ timeout: 6000 });
    await s(3000);
    console.log('DELETED');
    ok++;
  } catch (e) { console.log('FAIL: ' + String(e.message).slice(0, 80)); fail++; }
}
console.log(`\n\nDone. deleted=${ok} failed=${fail}`);
await ctx.close();
