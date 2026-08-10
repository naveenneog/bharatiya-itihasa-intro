/* Plan the daily chronological publish schedule for the Bhāratīya Itihāsa series.
   Reads dist/uploads.json (dir -> youtube url) and each episode.json's `era` date,
   orders by era (Maurya->Kushan->Gupta->Pallava) then by parsed event year within era,
   and assigns one publish slot per day starting from --start at --hour (IST).
   Writes dist/schedule.json. Pure planning — no browser, nothing published. */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };

const START = arg('start', '2026-08-08');      // first publish date (local IST)
const HOUR = parseInt(arg('hour', '9'), 10);   // publish hour, IST
const TZ_OFFSET = '+05:30';                     // IST

const ERA_RANK = { maurya: 0, kushan: 1, gupta: 2, pallava: 3 };

/* Parse a freeform era string into an approximate sort year (BCE negative, CE positive).
   Uses the FIRST era-marked date (the episode's own event), so trailing modern dates
   like decipherment/adoption/excavation years don't pollute the ancient sort key. */
function eraYear(era) {
  if (!era) return 0;
  const s = era.replace(/(\d)s\b/g, '$1'); // "260s-230s" -> "260-230"
  // first explicit era-marked date, optionally a range: "321-297 BCE", "499 CE"
  const marked = s.match(/(\d{1,4})\s*(?:[–-]\s*(\d{1,4}))?\s*(BCE|BC|CE|AD)\b/i);
  if (marked) {
    const a = parseInt(marked[1], 10);
    const b = marked[2] ? parseInt(marked[2], 10) : a;
    const sign = /bce|bc/i.test(marked[3]) ? -1 : 1;
    return sign * ((a + b) / 2);
  }
  // century form: "4th century", "late 4th-early 5th century CE"
  const bce = /bce|bc\b/i.test(s);
  const cent = [...s.matchAll(/(\d)(?:st|nd|rd|th)\s*(?:century|c\.)/gi)].map((m) => parseInt(m[1], 10));
  if (cent.length) {
    const midC = cent.reduce((a, b) => a + b, 0) / cent.length;
    return (bce ? -1 : 1) * ((midC - 1) * 100 + 50);
  }
  return 0;
}

const ledger = JSON.parse(await readFile('dist/uploads.json', 'utf8')).uploads;

const rows = [];
for (const [dir, rec] of Object.entries(ledger)) {
  const m = dir.match(/^dist\/([^/]+)\/(.+)_book$/);
  if (!m) { console.error('SKIP unparsable dir:', dir); continue; }
  const [, era, slug] = m;
  // read the episode's era date
  let eraStr = '';
  try {
    const ep = JSON.parse(await readFile(path.join('episodes', slug, 'episode.json'), 'utf8'));
    eraStr = ep.era || '';
  } catch { console.error('WARN no episode.json for', slug); }
  rows.push({
    dir, era, slug, url: rec.url || null, exit: rec.exit,
    title: rec.title, eraStr, year: eraYear(eraStr),
    eraRank: ERA_RANK[era] ?? 99,
  });
}

rows.sort((a, b) => (a.eraRank - b.eraRank) || (a.year - b.year) || a.slug.localeCompare(b.slug));

// assign one slot per day
const [Y, M, D] = START.split('-').map(Number);
const schedule = rows.map((r, i) => {
  const dt = new Date(Date.UTC(Y, M - 1, D + i, HOUR - 5, 0 - 30, 0)); // IST hour -> UTC
  const localIso = `${new Date(Date.UTC(Y, M - 1, D + i)).toISOString().slice(0, 10)}T${String(HOUR).padStart(2, '0')}:00:00${TZ_OFFSET}`;
  return { ...r, order: i + 1, publishLocal: localIso, publishUtc: dt.toISOString() };
});

await writeFile('dist/schedule.json', JSON.stringify(schedule, null, 2) + '\n');

console.log(`Planned ${schedule.length} episodes, one/day from ${START} ${String(HOUR).padStart(2,'0')}:00 IST\n`);
let lastEra = '';
for (const s of schedule) {
  if (s.era !== lastEra) { console.log(`\n== ${s.era.toUpperCase()} ==`); lastEra = s.era; }
  const flag = s.exit !== 0 ? ' [WAS-FAILED]' : '';
  const u = s.url ? s.url.replace('https://youtu.be/', '') : 'NO-URL';
  console.log(`  ${String(s.order).padStart(2)}. ${s.publishLocal.slice(0,10)}  ${(s.eraStr||'?').padEnd(38)} ${u}  ${s.title}${flag}`);
}
console.log(`\nLast publish: ${schedule[schedule.length-1].publishLocal.slice(0,10)}`);
