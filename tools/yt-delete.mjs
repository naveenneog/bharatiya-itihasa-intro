/* Delete videos from the channel — carefully, because this is the one action here that cannot be
   undone.

   Used for two things: the duplicate private copies left by the 28 Sep upload failures, and the
   old-format version of a scheduled Short once its remake has taken the slot.

   Refuses, per video, unless every check passes:
     - it is not public (visibility read from Studio, not from any local file);
     - its title matches --expect-title, when given;
     - no register still points at it: dist/publish-log.json, dist/feed-shorts.json. A video
       the tools would schedule is never deleted — update the register first.

   Dry by default. Only one process may drive the browser profile at a time; stop the yt-agent
   first.

     node tools/yt-delete.mjs --ids a,b,c                         # dry: show what would happen
     node tools/yt-delete.mjs --ids a,b,c --go
     node tools/yt-delete.mjs --ids a --expect-title "Mamalla Takes Vatapi" --go
*/
import { chromium } from 'playwright-core';
import { readFile, writeFile } from 'node:fs/promises';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);
const GO = has('go');
const IDS = String(arg('ids', '')).split(',').map((s) => s.trim()).filter(Boolean);
const EXPECT = arg('expect-title', null);
const PROFILE = 'C:\\Users\\navg\\.copilot\\playwright-youtube-profile';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (t) => (t || '').toLowerCase().replace(/[’'`]/g, "'").replace(/[^a-z0-9\u0900-\u097f]+/g, ' ').trim();

if (!IDS.length) { console.error('usage: node tools/yt-delete.mjs --ids <id,id> [--expect-title "..."] [--go]'); process.exit(1); }

const log = JSON.parse(await readFile('dist/publish-log.json', 'utf8').catch(() => '{}'));
const feed = JSON.parse(await readFile('dist/feed-shorts.json', 'utf8').catch(() => '[]'));
const referenced = new Map();
for (const [dir, v] of Object.entries(log)) if (v?.id) referenced.set(v.id, `publish-log ${dir}`);
for (const f of feed) if (f?.id) referenced.set(f.id, `feed-shorts ${f.slug}`);
/* An old version is only deleted once its remake holds the slot; until then it is the video
   that will publish on that day. */
const remakeOf = new Map(feed.filter((f) => f?.replaces).map((f) => [f.replaces, f]));

const ctx = await chromium.launchPersistentContext(PROFILE,
  { channel: 'msedge', headless: false, viewport: { width: 1400, height: 950 } });
const page = ctx.pages()[0] || await ctx.newPage();
let deleted = 0; let refused = 0;
try {
  for (const id of IDS) {
    const why = [];
    if (referenced.has(id)) why.push(`still referenced by ${referenced.get(id)}`);
    const remake = remakeOf.get(id);
    if (remake && !remake.scheduled) why.push(`its remake ${remake.id} is not scheduled yet`);

    await page.goto(`https://studio.youtube.com/video/${id}/edit`, { waitUntil: 'domcontentloaded' });
    await sleep(8000);
    const title = ((await page.getByRole('textbox', { name: /Add a title that describes/i }).first()
      .innerText({ timeout: 8000 }).catch(() => '')) || '').trim();
    const vis = ((await page.locator('ytcp-video-metadata-visibility').first().innerText().catch(() => '')) || '')
      .replace(/\s+/g, ' ').trim();
    if (!title) why.push('page did not load a video (already deleted, or not this channel)');
    if (/public/i.test(vis)) why.push(`visibility is "${vis}" — never delete a public video`);
    if (!vis) why.push('could not read visibility');
    if (EXPECT && norm(title) !== norm(EXPECT)) why.push(`title "${title}" is not "${EXPECT}"`);

    console.log(`\n  ${id}  "${title}"  [${vis || '?'}]`);
    if (why.length) { refused++; for (const w of why) console.log(`    REFUSED: ${w}`); continue; }
    if (!GO) { console.log('    would delete (dry run; pass --go)'); continue; }

    /* The kebab menu beside Save holds Delete. The confirmation needs its checkbox ticked before
       "Delete forever" enables. */
    try {
      const menu = page.locator('ytcp-video-metadata-editor ytcp-icon-button, #overflow-menu-button, ytcp-button#overflow-menu-button, [aria-label="Options"], [aria-label="More actions"]').first();
      await menu.click({ timeout: 15000 });
      await sleep(1200);
      await page.getByRole('menuitem', { name: /^Delete/i }).first().click({ timeout: 10000 })
        .catch(async () => { await page.getByText(/^Delete$/).first().click({ timeout: 8000 }); });
      await sleep(1500);
      const dlg = page.locator('tp-yt-paper-dialog, ytcp-dialog').filter({ hasText: /delete/i }).last();
      await dlg.locator('#checkbox, [role=checkbox], ytcp-checkbox-lit').first().click({ timeout: 10000 });
      await sleep(600);
      await dlg.getByRole('button', { name: /delete forever|delete/i }).last().click({ timeout: 10000 });
      await sleep(5000);
    } catch (e) {
      const shot = `dist/probe/yt-delete-${id}.png`;
      await page.screenshot({ path: shot }).catch(() => {});
      console.log(`    FAILED in the delete dialog: ${String(e.message).split('\n')[0]}  (page: ${shot})`);
      refused++;
      continue;
    }

    /* Proof, not assumption: reload and confirm the editor no longer finds a video. */
    await page.goto(`https://studio.youtube.com/video/${id}/edit`, { waitUntil: 'domcontentloaded' });
    await sleep(7000);
    const still = ((await page.getByRole('textbox', { name: /Add a title that describes/i }).first()
      .innerText({ timeout: 5000 }).catch(() => '')) || '').trim();
    if (still) { console.log('    NOT DELETED — the editor still loads it'); refused++; }
    else {
      console.log('    deleted, confirmed'); deleted++;
      /* An audit trail, since this cannot be undone: what went, when, and what stood in for it. */
      const audit = JSON.parse(await readFile('dist/yt-deleted.json', 'utf8').catch(() => '[]'));
      audit.push({ id, title, visibility: vis, at: new Date().toISOString(), ...(remake ? { replacedBy: remake.id } : {}) });
      await writeFile('dist/yt-deleted.json', `${JSON.stringify(audit, null, 2)}\n`);
      if (remake) {
        const rows = JSON.parse(await readFile('dist/feed-shorts.json', 'utf8'));
        const row = rows.find((r) => r.id === remake.id);
        if (row) { row.replacedDeletedAt = new Date().toISOString(); await writeFile('dist/feed-shorts.json', `${JSON.stringify(rows, null, 2)}\n`); }
      }
    }
  }
} finally {
  await ctx.close();
}
console.log(`\n  deleted ${deleted}, refused or failed ${refused}${GO ? '' : ' (dry run)'}`);
process.exit(refused ? 1 : 0);
