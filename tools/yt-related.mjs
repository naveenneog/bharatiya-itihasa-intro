/* Set a Short's "Related video" — the link YouTube shows on a Short to one of the channel's
   long-form videos, which is how a viewer who liked a Short reaches the full episode.

   The picker is chosen by video id, never by title: the channel holds two public long-form
   videos titled "Brahmagupta and the Birth of Zero" and three Shorts titled "The Dot That Became
   Zero". Each card in Studio's picker (ytcp-entity-card) carries its id in `.video.videoId`.

   Dry by default: selects the card, reports, and leaves without saving.

     node tools/yt-related.mjs --short tk2o89qLIM0 --target 90fM9pzXx1k
     node tools/yt-related.mjs --short tk2o89qLIM0 --target 90fM9pzXx1k --go

   The search box needs words from the target's title; they are taken from the latest scan
   (dist/yt-channel.json) unless --search is given. Only one process may drive the browser
   profile at a time; stop the yt-agent first. */
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const GO = argv.includes('--go');
const SHORT = arg('short', null);
const TARGET = arg('target', null);
if (!SHORT || !TARGET) { console.error('usage: node tools/yt-related.mjs --short <id> --target <id> [--search "words"] [--go]'); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const scan = JSON.parse(await readFile('dist/yt-channel.json', 'utf8').catch(() => '{"rows":[]}'));
const targetRow = scan.rows.find((r) => r.id === TARGET);
const SEARCH = arg('search', targetRow?.title?.split(/\s+/).slice(0, 4).join(' ') || null);
if (!SEARCH) { console.error(`${TARGET} is not in the latest scan; pass --search "<words from its title>"`); process.exit(1); }

const ctx = await chromium.launchPersistentContext('C:\\Users\\navg\\.copilot\\playwright-youtube-profile',
  { channel: 'msedge', headless: false, viewport: { width: 1400, height: 1000 } });
const page = ctx.pages()[0] || await ctx.newPage();
const readLink = async () => ((await page.locator('#linked-video-editor-link').first().innerText().catch(() => '')) || '')
  .replace(/\s+/g, ' ').replace(/^Related video\s*/i, '').trim();
let code = 1;
try {
  await page.goto(`https://studio.youtube.com/video/${SHORT}/edit`, { waitUntil: 'domcontentloaded' });
  await sleep(9000);
  const title = ((await page.getByRole('textbox', { name: /Add a title that describes/i }).first()
    .innerText({ timeout: 8000 }).catch(() => '')) || '').trim();
  const before = await readLink();
  console.log(`  ${SHORT}  "${title}"\n    related now: ${before || '(none shown)'}`);
  if (!title) throw new Error('the Short did not load');

  await page.locator('#linked-video-editor-link').first().click({ timeout: 10000 });
  await page.locator('ytcp-video-pick-dialog-contents').first().waitFor({ timeout: 15000 });
  await page.locator("input[placeholder='Search your videos']").first().fill(SEARCH);
  const cards = page.locator('ytcp-video-pick-dialog-contents ytcp-entity-card');
  /* The results load behind a progress bar, sometimes for several seconds; a fixed pause read
     an empty list twice on 29 Sep. Wait for cards, then for the count to hold. */
  let n = 0;
  for (let t = 0, last = -1, still = 0; t < 40 && still < 3; t++) {
    await sleep(500);
    n = await cards.count();
    still = n > 0 && n === last ? still + 1 : 0;
    last = n;
  }
  let hit = -1; const seen = [];
  for (let i = 0; i < n; i++) {
    const id = await cards.nth(i).evaluate((e) => e.video?.videoId || null).catch(() => null);
    seen.push(id);
    if (id === TARGET) { hit = i; break; }
  }
  if (hit < 0) throw new Error(`no card for ${TARGET} among ${n} results for "${SEARCH}" (${seen.join(', ')})`);
  const cardTitle = ((await cards.nth(hit).innerText().catch(() => '')) || '').split('\n')[0].trim();
  await cards.nth(hit).click({ timeout: 8000 });
  await sleep(2500);
  const picked = await readLink();
  console.log(`    picked ${TARGET} "${cardTitle}" -> field reads: ${picked}`);

  if (!GO) { console.log('    dry run: not saved (pass --go)'); code = 0; }
  else {
    const save = page.getByRole('button', { name: /^Save$/i }).first();
    if (!(await save.isEnabled().catch(() => false))) throw new Error('Save is not enabled after picking');
    await save.click({ timeout: 8000 });
    await sleep(5000);
    await page.goto(`https://studio.youtube.com/video/${SHORT}/edit`, { waitUntil: 'domcontentloaded' });
    await sleep(8000);
    const after = await readLink();
    const ok = cardTitle && after.includes(cardTitle);
    console.log(`    after reload: ${after}  -> ${ok ? 'saved, confirmed' : 'NOT CONFIRMED'}`);
    code = ok ? 0 : 1;
  }
} catch (e) {
  await page.screenshot({ path: `dist/probe/yt-related-${SHORT}.png` }).catch(() => {});
  console.log(`    FAILED: ${String(e.message).split('\n')[0]}  (page: dist/probe/yt-related-${SHORT}.png)`);
} finally {
  await ctx.close();
}
process.exit(code);
