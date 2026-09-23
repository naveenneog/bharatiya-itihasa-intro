/* Find the selectors that actually hold the numbers.

   yt-stats guessed at #views / #comments / #likes and got null for all 431 rows. Rather than
   guess again, dump one row's cell structure and read it.

     node tools/yt-dom.mjs
*/
import { chromium } from 'playwright-core';

const PROFILE = 'C:\\Users\\navg\\.copilot\\playwright-youtube-profile';
const CHANNEL = 'UCGYbLzah4VnRM1NVL7W8mVA';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ctx = await chromium.launchPersistentContext(PROFILE,
  { channel: 'msedge', headless: false, viewport: { width: 1600, height: 950 } });
const page = ctx.pages()[0] || await ctx.newPage();
try {
  await page.goto(`https://studio.youtube.com/channel/${CHANNEL}/videos/upload`, { waitUntil: 'domcontentloaded' });
  await sleep(8000);

  const info = await page.locator('ytcp-video-row').first().evaluate((row) => {
    const kids = [...row.querySelectorAll('*')]
      .filter((e) => e.id || (e.className && typeof e.className === 'string' && e.className.includes('cell')))
      .slice(0, 60)
      .map((e) => ({
        tag: e.tagName.toLowerCase(),
        id: e.id || '',
        cls: (typeof e.className === 'string' ? e.className : '').slice(0, 44),
        text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      }))
      .filter((e) => e.text);
    return { full: (row.innerText || '').replace(/\s+/g, ' ').trim(), kids };
  });

  console.log(`  FULL ROW TEXT:\n  ${info.full}\n`);
  console.log('  elements with an id or "cell" class:');
  for (const k of info.kids) console.log(`    ${k.tag.padEnd(22)} id=${k.id.padEnd(22)} cls=${k.cls.padEnd(30)} "${k.text}"`);
} finally {
  await ctx.close();
}
