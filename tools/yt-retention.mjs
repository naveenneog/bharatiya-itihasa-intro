/* Retention, which is the only thing a Short is judged on.

   A long-form video can fail at the thumbnail. A Short has no thumbnail: it is pushed into a
   feed, and whether it keeps going depends entirely on whether people keep watching. So when
   43 public Shorts average 15.5 views, the feed has already tested them and stopped. The
   question is how fast viewers leave.

   Reads the per-video analytics overview for a list of ids and writes dist/yt-retention.json.

     node tools/yt-retention.mjs --ids abc,def
     node tools/yt-retention.mjs --top 8          # the 8 most-viewed public Shorts
*/
import { chromium } from 'playwright-core';
import { readFile, writeFile } from 'node:fs/promises';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const PROFILE = 'C:\\Users\\navg\\.copilot\\playwright-youtube-profile';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ids = (arg('ids', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
const wantKind = arg('kind', 'short');
if (!ids.length) {
  const { rows } = JSON.parse(await readFile('dist/yt-stats.json', 'utf8'));
  ids = rows.filter((r) => r.kind === wantKind && /public/i.test(r.visibility || '') && r.views !== null)
    .sort((a, b) => b.views - a.views)
    .slice(0, Number(arg('top', 8)))
    .map((r) => r.id);
}

const ctx = await chromium.launchPersistentContext(PROFILE,
  { channel: 'msedge', headless: false, viewport: { width: 1500, height: 980 } });
const page = ctx.pages()[0] || await ctx.newPage();
const out = [];
try {
  for (const id of ids) {
    await page.goto(`https://studio.youtube.com/video/${id}/analytics/tab-overview/period-default`,
      { waitUntil: 'domcontentloaded' });
    await sleep(7000);
    const body = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');

    /* Studio writes these as labelled metric cards. Pulling them by label rather than by
       position, because the card order changes between long-form and Shorts. */
    const after = (label, pat) => {
      const m = body.match(new RegExp(`${label}\\s*([^A-Za-z]{0,3}${pat})`, 'i'));
      return m ? m[1].trim() : null;
    };
    const rec = {
      id,
      title: (await page.locator('#entity-name, .video-title').first().innerText().catch(() => '')).trim(),
      views: after('Views', '[\\d.,]+[KM]?'),
      avgViewDuration: after('Average view duration', '[\\d:]+'),
      avgPercent: (body.match(/Average percentage viewed\s*([\d.]+%)/i) || [])[1] || null,
      impressions: (body.match(/Impressions\s*([\d.,]+[KM]?)/i) || [])[1] || null,
      ctr: (body.match(/click-through rate\s*([\d.]+%)/i) || [])[1] || null,
    };
    out.push(rec);
    console.log(`  ${id}  views=${rec.views ?? '?'}  avgDur=${rec.avgViewDuration ?? '?'}  avg%=${rec.avgPercent ?? '?'}  ${rec.title.slice(0, 40)}`);
  }
  await writeFile('dist/yt-retention.json', `${JSON.stringify({ at: new Date().toISOString(), out }, null, 2)}\n`);
  console.log('\n  -> dist/yt-retention.json');
} finally {
  await ctx.close();
}
