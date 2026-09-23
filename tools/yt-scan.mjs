/* Read the channel and write down what is actually there.

   Every planning file in dist/ describes a moment that has passed. schedule.json was written
   12 Aug for a window that closed 8 Sep; schedule-log.json records 58 attempts of which 26
   failed. None of them knows what the channel looks like now, and scheduling against a stale
   picture is how a video gets a date in the past.

   So this asks YouTube. It is read-only: it opens the uploads list, pages to the end, and
   writes dist/yt-channel.json. It never edits a video.

     node tools/yt-scan.mjs              # scan, write dist/yt-channel.json
     node tools/yt-scan.mjs --pages 40   # raise the page cap for a bigger channel

   Only one process may drive the profile at a time. Check before running.
*/
import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const PROFILE = 'C:\\Users\\navg\\.copilot\\playwright-youtube-profile';
const CHANNEL = 'UCGYbLzah4VnRM1NVL7W8mVA';
const MAX_PAGES = Number(arg('pages', 40));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* The row's text carries the state as a word. Order matters: a failed upload also says
   "draft", and a scheduled video also says "private" in some locales, so the more specific
   condition has to be tested first. Taken from the one-off scanner that already proved these
   strings against this channel. */
function stateOf(rowText) {
  const t = rowText || '';
  if (/processing abandoned|failed to upload|could not be processed/i.test(t)) return 'PROC_ABANDONED';
  if (/upload interrupted|resume upload/i.test(t)) return 'UPLOAD_INTERRUPTED';
  if (/\bdraft\b/i.test(t)) return 'DRAFT';
  if (/\bscheduled\b/i.test(t)) return 'SCHEDULED';
  if (/\bpublic\b/i.test(t)) return 'PUBLIC';
  if (/\bunlisted\b/i.test(t)) return 'UNLISTED';
  if (/\bprivate\b/i.test(t)) return 'PRIVATE';
  return 'UNKNOWN';
}

const ctx = await chromium.launchPersistentContext(PROFILE,
  { channel: 'msedge', headless: false, viewport: { width: 1400, height: 950 } });
const page = ctx.pages()[0] || await ctx.newPage();

/* Studio splits the library in two. /videos/upload is long-form only and silently omits every
   Short — scanning it alone found 36 of this project's 104 uploads and reported the other 68
   as missing from the channel, which would have queued them all for a second upload. The
   Shorts live under /videos/short and have to be asked for separately. */
const TABS = [['upload', 'book'], ['short', 'short']];

async function scanTab(tab) {
  await page.goto(`https://studio.youtube.com/channel/${CHANNEL}/videos/${tab}`,
    { waitUntil: 'domcontentloaded' });
  await sleep(7000);

  if (/accounts\.google\.com|signin/i.test(page.url())) {
    console.error('NOT SIGNED IN — sign in once in this Edge profile, then re-run.');
    await ctx.close();
    process.exit(1);
  }

  const seen = new Map();
  let pages = 0;

  /* Virtualised rows: the list only renders what is near the viewport, so reading straight
     after a page change sees a partial set. Scroll to the bottom until the count stops
     growing, then read. */
  async function renderAll() {
    let last = -1;
    for (let i = 0; i < 12; i++) {
      const n = await page.locator('ytcp-video-row').count();
      if (n === last) break;
      last = n;
      await page.mouse.wheel(0, 4000);
      await sleep(600);
    }
    await page.mouse.wheel(0, -20000);
    await sleep(400);
    return last;
  }

  const firstId = () => page.locator('ytcp-video-row a[href*="/video/"]').first()
    .getAttribute('href').catch(() => null);

  for (; pages < MAX_PAGES; pages++) {
    await sleep(1500);
    await renderAll();
    const batch = await page.locator('ytcp-video-row').evaluateAll((nodes) => nodes.map((row) => {
      const a = row.querySelector('a[href*="/video/"]');
      const href = a ? a.getAttribute('href') : '';
      const id = (href.match(/\/video\/([^/]+)\//) || [])[1] || '';
      const t = row.querySelector('#video-title');
      return {
        id,
        title: (t ? t.textContent : '').trim(),
        rowText: (row.innerText || row.textContent || '').replace(/\s+/g, ' ').trim(),
      };
    }));
    let fresh = 0;
    for (const b of batch) if (b.id && !seen.has(b.id)) { seen.set(b.id, b); fresh++; }
    console.log(`  ${tab} page ${pages + 1}: ${batch.length} row(s), ${fresh} new, ${seen.size} total`);

    const next = page.locator('#navigate-after, ytcp-icon-button[aria-label="Go to next page"], button[aria-label="Go to next page"]').first();
    if (await next.count() === 0) { console.log('  no next control — end of list'); break; }
    const dis = await next.getAttribute('disabled').catch(() => null);
    const aria = await next.getAttribute('aria-disabled').catch(() => null);
    if (dis !== null || aria === 'true') { console.log('  next disabled — end of list'); break; }

    /* Clicking and sleeping was the bug: a click that does not register leaves the same page
       rendered, the reader sees zero new rows and calls it the end. 75 of 268 videos were
       found that way. Wait for the first row to actually change instead — that is the only
       evidence the page turned. */
    const before = await firstId();
    await next.click().catch(() => {});
    let turned = false;
    for (let i = 0; i < 25; i++) {
      await sleep(500);
      if ((await firstId()) !== before) { turned = true; break; }
    }
    if (!turned) { console.log('  page did not turn after click — stopping'); break; }
  }
  return seen;
}

try {
  const rows = [];
  for (const [tab, kind] of TABS) {
    const seen = await scanTab(tab);
    for (const v of seen.values()) {
      rows.push({
        id: v.id,
        kind,
        title: v.title,
        state: stateOf(v.rowText),
        /* The scheduled date as YouTube renders it, so a plan can be compared against what the
           channel actually holds rather than against what a local file hoped for. */
        when: (v.rowText.match(/Scheduled\s*[:\-]?\s*([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})/i) || [])[1] || null,
        rowText: v.rowText.slice(0, 160),
      });
    }
  }

  await writeFile('dist/yt-channel.json', `${JSON.stringify({ at: new Date().toISOString(), channel: CHANNEL, rows }, null, 2)}\n`);

  const by = {};
  for (const r of rows) {
    const k = `${r.kind}/${r.state}`;
    by[k] = (by[k] || 0) + 1;
  }
  console.log(`\n  ${rows.length} item(s) on the channel\n`);
  for (const k of Object.keys(by).sort()) console.log(`  ${k.padEnd(24)} ${String(by[k]).padStart(4)}`);
  console.log('\n  -> dist/yt-channel.json');
} finally {
  await ctx.close();
}
