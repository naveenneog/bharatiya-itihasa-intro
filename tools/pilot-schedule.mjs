/* Give the five pilot Shorts their publish times.

   Peak audience for this channel is Indian evening, and the pilots finished at one in the
   morning. Publishing them straight away would have the Shorts feed run its first test — the
   one that decides whether a video gets a second audience — against the quietest hours of the
   day. So they are dated instead: at most two a day, at 13:00 and 19:00 IST.

   Spacing also keeps the account's activity unremarkable. The upload failures on 23 Sep came
   after roughly 120 uploads in a day.

     node tools/pilot-schedule.mjs --dry
     node tools/pilot-schedule.mjs
*/
import { chromium } from 'playwright-core';
import { schedulePublish } from '../../yt-agent/lib/upload.mjs';

const DRY = process.argv.includes('--dry');
const PROFILE = 'C:\\Users\\navg\\.copilot\\playwright-youtube-profile';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PILOTS = [
  { id: '5cP0OLSYbjY', title: 'Why Delhi’s Iron Pillar Refuses To Rust', when: { year: 2026, month: 9, day: 25, hour: 19, minute: 0 } },
  { id: 'tk2o89qLIM0', title: 'The Dot That Became Zero', when: { year: 2026, month: 9, day: 26, hour: 13, minute: 0 } },
  { id: 'fXuNrAyOnEA', title: 'The Surgeon Who Rebuilt a Nose', when: { year: 2026, month: 9, day: 26, hour: 19, minute: 0 } },
  { id: 'p4CRJYYrtYs', title: 'The King Who Built a School That Lasted 700 Years', when: { year: 2026, month: 9, day: 27, hour: 13, minute: 0 } },
  { id: '2H3oaeRNPLo', title: 'The Mud-Brick Rooms That Never Reopened', when: { year: 2026, month: 9, day: 27, hour: 19, minute: 0 } },
];

for (const p of PILOTS) {
  const { year, month, day, hour } = p.when;
  console.log(`  ${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:00  ${p.id}  ${p.title}`);
}
if (DRY) { console.log('\n  --dry: nothing scheduled'); process.exit(0); }

const ctx = await chromium.launchPersistentContext(PROFILE,
  { channel: 'msedge', headless: false, viewport: { width: 1300, height: 950 } });
const page = ctx.pages()[0] || await ctx.newPage();
try {
  await page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  let ok = 0; let pending = 0; let bad = 0;
  for (const p of PILOTS) {
    process.stdout.write(`\n  ${p.id} -> ${p.when.day}/${p.when.month} ${p.when.hour}:00 ... `);
    try {
      const r = await schedulePublish(page, p.id, p.when, (m) => process.stdout.write(`\n      ${m}`));
      if (r.verified) { ok++; process.stdout.write('ok'); }
      else if (r.pending) { pending++; process.stdout.write('still processing — retry later'); }
      else { bad++; process.stdout.write('not verified'); }
    } catch (e) { bad++; process.stdout.write(`ERROR ${String(e.message).slice(0, 70)}`); }
    await sleep(2500);
  }
  console.log(`\n\n  scheduled ${ok}, still processing ${pending}, failed ${bad}`);
} finally {
  await ctx.close();
}
