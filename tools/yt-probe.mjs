/* What does YouTube actually show when an upload stalls?

   Three uploads failed in a row with `locator.click: Timeout` on the title box — the element
   resolves but will not take a click, which means something is over it. A restarted browser
   and three different file sizes failed identically, so it is not the browser and not the file.

   This opens the upload dialog and reports what is on screen: dialog text, any notice, and a
   screenshot. It does not upload anything.

     node tools/yt-probe.mjs
*/
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const PROFILE = 'C:\\Users\\navg\\.copilot\\playwright-youtube-profile';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ctx = await chromium.launchPersistentContext(PROFILE,
  { channel: 'msedge', headless: false, viewport: { width: 1400, height: 950 } });
const page = ctx.pages()[0] || await ctx.newPage();
try {
  await page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded' });
  await sleep(6000);
  console.log(`  url: ${page.url()}`);

  /* The upload dialog is opened the way a person opens it: the Create button top-right, then
     "Upload videos". The agent's own selector is different, but if a notice blocks the form it
     will block either route. */
  const createBtn = page.getByRole('button', { name: /^create$/i }).first();
  if (await createBtn.count()) { await createBtn.click().catch(() => {}); await sleep(2000); }
  else console.log('  (no Create button found)');
  const uploadItem = page.getByText(/upload videos/i).first();
  if (await uploadItem.count()) { await uploadItem.click().catch(() => {}); await sleep(6000); }
  else console.log('  (no "Upload videos" item found)');

  const dialog = page.locator('ytcp-uploads-dialog, tp-yt-paper-dialog').first();
  if (await dialog.count()) {
    const dt = (await dialog.innerText().catch(() => '')).replace(/\s+/g, ' ');
    console.log(`\n  DIALOG TEXT:\n  ${dt.slice(0, 900)}`);
  } else {
    console.log('\n  no upload dialog appeared');
  }

  const body = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  console.log(`\n  visible text (first 1200 chars):\n  ${body.slice(0, 1200)}`);

  for (const pat of [/daily upload limit/i, /limit/i, /verify/i, /try again later/i, /too many/i, /suspend/i]) {
    const m = body.match(new RegExp(`.{0,120}${pat.source}.{0,160}`, 'i'));
    if (m) console.log(`\n  MATCH ${pat}:\n    …${m[0]}…`);
  }

  await mkdir('dist/probe', { recursive: true });
  await page.screenshot({ path: 'dist/probe/upload-dialog.png', fullPage: false });
  console.log('\n  -> dist/probe/upload-dialog.png');
} finally {
  await ctx.close();
}
