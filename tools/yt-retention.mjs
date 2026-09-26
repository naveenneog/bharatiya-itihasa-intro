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
      /* The two Shorts metrics that answer the questions actually being asked.
         "Shown in feed" says whether YouTube is testing the Short at all; "viewed vs swiped
         away" says whether the first moment works. Average view duration is slower and needs
         far more views before it means anything — two views produced no figure at all. */
      shownInFeed: (body.match(/Shown in feed\s*([\d.,]+[KM]?)/i) || [])[1] || null,
      viewedPct: (body.match(/([\d.]+)%\s*viewed/i) || body.match(/Viewed\s*([\d.]+)%/i) || [])[1] || null,
      /* The labels are read from a page that changes; keep the raw text around the one that
         matters so a missed match is visible rather than silently null. */
      swipeContext: (body.match(/.{0,80}swiped.{0,80}/i) || [])[0] || null,
    };

    /* The hook metric lives on the Engagement tab, not the overview: Studio renders it as
       "How viewers engaged … 66.7% 33.3% Stayed to watch Swiped away" — two percentages first,
       labels after. Searched for on the overview and reach tabs first and found on neither. */
    await page.goto(`https://studio.youtube.com/video/${id}/analytics/tab-interest_viewers/period-default`,
      { waitUntil: 'domcontentloaded' });
    await sleep(7000);
    const eng = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
    const sw = eng.match(/([\d.]+)%\s*([\d.]+)%\s*Stayed to watch\s*Swiped away/i);
    rec.stayedPct = sw ? Number(sw[1]) : null;
    rec.swipedPct = sw ? Number(sw[2]) : null;

    out.push(rec);
    console.log(`  ${id}  views=${String(rec.views ?? '?').split(' ')[0].padStart(4)}  stayed=${rec.stayedPct ?? '?'}%  avgDur=${rec.avgViewDuration ?? '?'}  ${rec.title.slice(0, 40)}`);
    out.push(rec);
  }
  await writeFile('dist/yt-retention.json', `${JSON.stringify({ at: new Date().toISOString(), out }, null, 2)}\n`);
  console.log('\n  -> dist/yt-retention.json');
} finally {
  await ctx.close();
}
