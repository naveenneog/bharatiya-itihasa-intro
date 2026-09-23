/* What is actually being watched, and what is not.

   The channel has 431 videos and 42 subscribers. That ratio is the whole problem statement:
   volume is demonstrably not the lever, so before publishing anything else it is worth knowing
   which videos get watched, which get nothing, and whether the Shorts surface is reaching
   anyone at all.

   Reads the Content list — which carries views, comments and likes per row — for both tabs, and
   writes dist/yt-stats.json. Read-only.

     node tools/yt-stats.mjs
*/
import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';

const PROFILE = 'C:\\Users\\navg\\.copilot\\playwright-youtube-profile';
const CHANNEL = 'UCGYbLzah4VnRM1NVL7W8mVA';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ctx = await chromium.launchPersistentContext(PROFILE,
  { channel: 'msedge', headless: false, viewport: { width: 1600, height: 950 } });
const page = ctx.pages()[0] || await ctx.newPage();

async function scanTab(tab, kind) {
  await page.goto(`https://studio.youtube.com/channel/${CHANNEL}/videos/${tab}`,
    { waitUntil: 'domcontentloaded' });
  await sleep(7000);
  const out = new Map();
  const firstId = () => page.locator('ytcp-video-row a[href*="/video/"]').first()
    .getAttribute('href').catch(() => null);

  for (let p = 0; p < 40; p++) {
    await sleep(1400);
    let last = -1;
    for (let i = 0; i < 12; i++) {
      const n = await page.locator('ytcp-video-row').count();
      if (n === last) break;
      last = n; await page.mouse.wheel(0, 4000); await sleep(500);
    }
    await page.mouse.wheel(0, -20000); await sleep(300);

    /* Read the cells, not the row text. The row text is one long string in which a view count
       and a like count are both just numbers, and a 160-character slice of it drops them
       entirely for any video with a long description.

       The cells are class-based — `.tablecell-views`, `.tablecell-comments` — not id-based.
       Guessing `#views` returned null for all 431 rows, silently, which is why this reads the
       DOM that is actually there (tools/yt-dom.mjs dumps it). */
    const rows = await page.locator('ytcp-video-row').evaluateAll((nodes) => nodes.map((row) => {
      const a = row.querySelector('a[href*="/video/"]');
      const id = ((a ? a.getAttribute('href') : '').match(/\/video\/([^/]+)\//) || [])[1] || '';
      const txt = (sel) => (row.querySelector(sel)?.textContent || '').replace(/\s+/g, ' ').trim();
      const num = (sel) => {
        const t = txt(sel).replace(/,/g, '');
        if (!t) return null;
        const m = t.match(/^(\d+(?:\.\d+)?)\s*([KM])?/);
        if (!m) return null;
        const v = parseFloat(m[1]);
        return Math.round(m[2] === 'K' ? v * 1e3 : m[2] === 'M' ? v * 1e6 : v);
      };
      return {
        id,
        title: txt('#video-title'),
        duration: txt('#video-thumbnail'),
        visibility: txt('.tablecell-visibility'),
        date: txt('.tablecell-date'),
        views: num('.tablecell-views'),
        comments: num('.tablecell-comments'),
        likes: num('.tablecell-likes'),
      };
    }));
    let fresh = 0;
    for (const r of rows) if (r.id && !out.has(r.id)) { out.set(r.id, { ...r, kind }); fresh++; }
    console.log(`  ${tab} page ${p + 1}: ${rows.length} rows, ${out.size} total`);

    const next = page.locator('#navigate-after, ytcp-icon-button[aria-label="Go to next page"], button[aria-label="Go to next page"]').first();
    if (await next.count() === 0) break;
    if ((await next.getAttribute('disabled').catch(() => null)) !== null
      || (await next.getAttribute('aria-disabled').catch(() => null)) === 'true') break;
    const before = await firstId();
    await next.click().catch(() => {});
    let turned = false;
    for (let i = 0; i < 25; i++) { await sleep(500); if ((await firstId()) !== before) { turned = true; break; } }
    if (!turned) break;
  }
  return [...out.values()];
}

try {
  const rows = [...await scanTab('upload', 'long'), ...await scanTab('short', 'short')];
  await writeFile('dist/yt-stats.json', `${JSON.stringify({ at: new Date().toISOString(), rows }, null, 2)}\n`);

  const seen = rows.filter((r) => r.views !== null);
  const sum = (xs) => xs.reduce((a, b) => a + b, 0);
  for (const kind of ['long', 'short']) {
    const g = seen.filter((r) => r.kind === kind);
    if (!g.length) continue;
    const v = g.map((r) => r.views).sort((a, b) => b - a);
    const med = v[Math.floor(v.length / 2)];
    console.log(`\n  ${kind.toUpperCase()}  ${g.length} video(s), ${sum(v)} views total`);
    console.log(`    median ${med}   top ${v[0]}   bottom ${v.at(-1)}`);
    console.log(`    zero-view: ${v.filter((x) => x === 0).length}   under 10: ${v.filter((x) => x < 10).length}`);
    console.log(`    top 5:`);
    for (const r of g.sort((a, b) => b.views - a.views).slice(0, 5)) {
      console.log(`      ${String(r.views).padStart(6)}  ${r.title.slice(0, 58)}`);
    }
  }
  console.log('\n  -> dist/yt-stats.json');
} finally {
  await ctx.close();
}
