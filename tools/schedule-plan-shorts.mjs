/* Plan publish slots for the Shorts. Each Short publishes the SAME day as its long-form
   episode but at 18:00 IST (episode is 09:00), to cross-promote it. Shorts whose era has
   no scheduled long-form (chalukya, rashtrakuta, …) are queued one per day at 18:00 after
   the last episode date, ordered by era then slug.

   Reads dist/uploads.json (for every *_short url) and dist/schedule.json (episode dates).
   Writes dist/schedule-shorts.json. Pure planning — no browser.
*/
import { readFile, writeFile } from 'node:fs/promises';

const ERA_RANK = { maurya: 0, kushan: 1, gupta: 2, pallava: 3, chalukya: 4, rashtrakuta: 5 };
const TZ = '+05:30';
const HOUR = 18;

const ledger = JSON.parse(await readFile('dist/uploads.json', 'utf8')).uploads;
const sched = JSON.parse(await readFile('dist/schedule.json', 'utf8'));
// map era/slug -> episode publish date (YYYY-MM-DD)
const epDate = new Map();
let lastDay = '2026-08-11';
for (const e of sched) {
  const m = e.dir.match(/^dist\/([^/]+)\/(.+)_book$/); if (!m) continue;
  const day = e.publishLocal.slice(0, 10);
  epDate.set(`${m[1]}/${m[2]}`, day);
  if (day > lastDay) lastDay = day;
}

const shorts = [];
for (const [dir, rec] of Object.entries(ledger)) {
  const m = dir.match(/^dist\/([^/]+)\/(.+)_short$/); if (!m) continue;
  const [, era, slug] = m;
  if (!rec.url) { console.error('SKIP short without url:', dir); continue; }
  shorts.push({ dir, era, slug, url: rec.url, eraRank: ERA_RANK[era] ?? 99,
    day: epDate.get(`${era}/${slug}`) || null, title: rec.title || slug });
}

// orphans (no episode date) get sequential days after the last episode day
const orphans = shorts.filter(s => !s.day).sort((a, b) => (a.eraRank - b.eraRank) || a.slug.localeCompare(b.slug));
let d = new Date(lastDay + 'T00:00:00Z');
for (const o of orphans) { d = new Date(d.getTime() + 86400000); o.day = d.toISOString().slice(0, 10); }

shorts.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0) || (a.eraRank - b.eraRank));
const out = shorts.map((s, i) => ({
  order: i + 1, era: s.era, slug: s.slug, dir: s.dir, url: s.url, title: s.title,
  matched: epDate.has(`${s.era}/${s.slug}`),
  publishLocal: `${s.day}T${String(HOUR).padStart(2, '0')}:00:00${TZ}`,
}));
await writeFile('dist/schedule-shorts.json', JSON.stringify(out, null, 2) + '\n');

console.log(`Planned ${out.length} shorts at ${HOUR}:00 IST`);
const orphanCount = out.filter(s => !s.matched).length;
console.log(`  matched to an episode day: ${out.length - orphanCount}`);
console.log(`  orphan-era (queued after ${lastDay}): ${orphanCount}`);
console.log(`  first: ${out[0].publishLocal.slice(0,10)}  last: ${out[out.length-1].publishLocal.slice(0,10)}`);
