/* Lay out the publish calendar: one episode a day, two Shorts a day, in historical order.

   Three things this reads rather than assumes, each of which was wrong in an older planner:

   1. **What is on the channel.** dist/yt-channel.json, written by yt-scan.mjs. The old planners
      read dist/uploads.json, which records what this machine uploaded — 117 entries, of which
      only 36 are still on the channel, and which knows nothing about the 232 videos uploaded
      some other way. Plan against the ledger and you re-upload work that is already public.

   2. **Which days are taken.** The channel already holds 31 scheduled items running to 19 Oct.
      A new plan that starts today would put two videos on the same day, or worse, try to
      schedule a date that has passed. The default start is the day after the last one.

   3. **The order of the eras.** Derived from the stories' own dates, not a hand-written rank.
      The two existing planners carry ERA_RANK maps listing four and six eras; thirteen have
      been built. Anything missing silently sorted to the end, which for a chronological
      channel means the Mughals before the Mauryas.

   Shorts run ahead of their episodes here, which is deliberate: at two a day against one
   episode a day they must. It is also what the channel already does — the Chalukya and
   Rashtrakuta Shorts are scheduled through October while their episodes are not yet uploaded.

     node tools/plan-publish.mjs                   # plan, print, write dist/publish-plan.json
     node tools/plan-publish.mjs --start 2026-11-01
     node tools/plan-publish.mjs --shorts-per-day 1
*/
import { readFile, writeFile } from 'node:fs/promises';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };

const EPS_PER_DAY = Number(arg('eps-per-day', 1));
const SHORTS_PER_DAY = Number(arg('shorts-per-day', 2));
const TZ = '+05:30';
const EP_HOURS = [9];
const SHORT_HOURS = [13, 19];

/* Held back, not scheduled. Same list upload-pending.mjs enforces — an 8th-century Kashmir
   story built as the opening Mughal episode. */
const HELD = new Set(['the-debased-coin']);
const NOT_AN_EPISODE = /_(ascent|objection|reverse|v\d+)$/;

/* Parse a freeform era string into an approximate sort year (BCE negative). Lifted from
   schedule-plan.mjs, which proved it against these episodes: take the FIRST era-marked date so
   a trailing decipherment or excavation year does not drag an ancient story forward. */
function eraYear(era) {
  if (!era) return null;
  const s = era.replace(/(\d)s\b/g, '$1');
  const marked = s.match(/(\d{1,4})\s*(?:[–-]\s*(\d{1,4}))?\s*(BCE|BC|CE|AD)\b/i);
  if (marked) {
    const a = parseInt(marked[1], 10);
    const b = marked[2] ? parseInt(marked[2], 10) : a;
    return (/bce|bc/i.test(marked[3]) ? -1 : 1) * ((a + b) / 2);
  }
  const bce = /bce|bc\b/i.test(s);
  const cent = [...s.matchAll(/(\d)(?:st|nd|rd|th)\s*(?:century|c\.)/gi)].map((m) => parseInt(m[1], 10));
  if (cent.length) {
    const mid = cent.reduce((a, b) => a + b, 0) / cent.length;
    return (bce ? -1 : 1) * ((mid - 1) * 100 + 50);
  }
  return null;
}

const norm = (t) => (t || '').toLowerCase().replace(/[’'`]/g, "'").replace(/[^a-z0-9]+/g, ' ').trim();

const channel = await readFile('dist/yt-channel.json', 'utf8').then(JSON.parse)
  .catch(() => { throw new Error('dist/yt-channel.json missing — run: node tools/yt-scan.mjs'); });
const onChannel = new Map();
for (const r of channel.rows) if (!onChannel.has(norm(r.title))) onChannel.set(norm(r.title), r);

/* The last day the channel already has spoken for. Parsed from what YouTube rendered, so it
   reflects the real calendar rather than a local plan file that may never have been applied. */
const MONTH = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
let lastTaken = null;
for (const r of channel.rows) {
  const m = (r.when || '').match(/([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})/);
  if (!m) continue;
  const iso = `${m[3]}-${String(MONTH[m[1]]).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  if (!lastTaken || iso > lastTaken) lastTaken = iso;
}

const dayAfter = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
const today = new Date().toISOString().slice(0, 10);
const START = arg('start', lastTaken ? dayAfter(lastTaken) : dayAfter(today));

const eras = readdirSync('dist', { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('.') && !d.name.startsWith('thumbs-'))
  .map((d) => d.name);

const items = [];
for (const era of eras) {
  for (const name of readdirSync(path.join('dist', era))) {
    if (NOT_AN_EPISODE.test(name)) continue;
    const dir = path.join('dist', era, name);
    if (!existsSync(path.join(dir, 'UPLOAD.md'))) continue;
    const slug = name.replace(/_(book|short)$/, '');
    if (HELD.has(slug)) continue;
    const kind = name.endsWith('_short') ? 'short' : 'book';
    const tf = path.join(dir, 'title.txt');
    const title = existsSync(tf) ? readFileSync(tf, 'utf8').trim().split('\n')[0] : slug;
    const epf = path.join('episodes', slug, 'episode.json');
    let eraStr = '';
    if (existsSync(epf)) { try { eraStr = JSON.parse(readFileSync(epf, 'utf8')).era || ''; } catch { /* keep blank */ } }
    const hit = onChannel.get(norm(title));
    items.push({
      era, slug, kind, title, dir: dir.replace(/\\/g, '/'), eraStr, year: eraYear(eraStr),
      state: hit ? hit.state : null,
      id: hit ? hit.id : null,
      /* schedule-run.mjs keys off `url`, so emit one for anything already on the channel and
         let that tool stay as it is. A Short's canonical url is the /shorts/ form. */
      url: hit ? (hit.kind === 'short' ? `https://youtube.com/shorts/${hit.id}` : `https://youtu.be/${hit.id}`) : null,
    });
  }
}

/* Era order from the stories themselves. The median is used rather than the earliest, because
   one outlier — a Karkota story filed under Mughal, a 19th-century medical college filed under
   Gupta — would otherwise move a whole era by a thousand years.

   Only directories that actually hold built items count. dist/ also carries scratch from older
   one-off runs (publish-aryabhata, upload-zero-v1, upload-zero-v2), which are not eras and
   would otherwise be ranked and printed as though they were. */
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const realEras = eras.filter((e) => items.some((i) => i.era === e));
const eraYearOf = {};
for (const e of realEras) {
  const ys = items.filter((i) => i.era === e && i.year !== null).map((i) => i.year);
  eraYearOf[e] = median(ys);
}
const eraRank = Object.fromEntries(
  [...realEras].sort((a, b) => eraYearOf[a] - eraYearOf[b]).map((e, i) => [e, i]));

const order = (a, b) => (eraRank[a.era] - eraRank[b.era])
  || ((a.year ?? 1e9) - (b.year ?? 1e9))
  || a.slug.localeCompare(b.slug);

/* Only what is not already live or scheduled. A PRIVATE one is on the channel but unpublished,
   so it needs a date but not another upload. */
const todo = items.filter((i) => i.state !== 'PUBLIC' && i.state !== 'SCHEDULED');
const books = todo.filter((i) => i.kind === 'book').sort(order);
const shorts = todo.filter((i) => i.kind === 'short').sort(order);

const plan = [];
const slot = (day, hour) => `${day}T${String(hour).padStart(2, '0')}:00:00${TZ}`;
let day = START;
for (let d = 0; books.length || shorts.length; d++) {
  for (let i = 0; i < EPS_PER_DAY && books.length; i++) {
    plan.push({ ...books.shift(), publishLocal: slot(day, EP_HOURS[i % EP_HOURS.length]) });
  }
  for (let i = 0; i < SHORTS_PER_DAY && shorts.length; i++) {
    plan.push({ ...shorts.shift(), publishLocal: slot(day, SHORT_HOURS[i % SHORT_HOURS.length]) });
  }
  day = dayAfter(day);
}
plan.sort((a, b) => a.publishLocal.localeCompare(b.publishLocal));
plan.forEach((p, i) => { p.order = i + 1; });

await writeFile('dist/publish-plan.json', `${JSON.stringify({
  at: new Date().toISOString(), start: START, epsPerDay: EPS_PER_DAY, shortsPerDay: SHORTS_PER_DAY, plan,
}, null, 2)}\n`);

const eps = plan.filter((p) => p.kind === 'book');
const shs = plan.filter((p) => p.kind === 'short');
const needUpload = plan.filter((p) => !p.id);

console.log(`\n  era order, derived from the stories' own dates:`);
for (const e of [...realEras].sort((a, b) => eraRank[a] - eraRank[b])) {
  const n = items.filter((i) => i.era === e).length;
  const left = todo.filter((i) => i.era === e).length;
  const y = eraYearOf[e];
  console.log(`    ${String(eraRank[e] + 1).padStart(2)}. ${e.padEnd(18)} ${(y < 0 ? `${-y} BCE` : `${y} CE`).padStart(9)}   ${String(n).padStart(3)} built, ${String(left).padStart(3)} to schedule`);
}

console.log(`\n  channel already holds ${channel.rows.length} item(s); last scheduled day ${lastTaken || '(none)'}`);
console.log(`  plan starts ${START} — ${EPS_PER_DAY} episode/day at ${EP_HOURS.map((h) => `${h}:00`).join(', ')}, ${SHORTS_PER_DAY} Shorts/day at ${SHORT_HOURS.map((h) => `${h}:00`).join(', ')} IST\n`);
console.log(`  ${plan.length} item(s) planned: ${eps.length} episodes, ${shs.length} Shorts`);
console.log(`  ${needUpload.length} still need uploading; ${plan.length - needUpload.length} are already on the channel and only need a date`);
if (eps.length) console.log(`  episodes run ${eps[0].publishLocal.slice(0, 10)} -> ${eps.at(-1).publishLocal.slice(0, 10)}`);
if (shs.length) console.log(`  Shorts   run ${shs[0].publishLocal.slice(0, 10)} -> ${shs.at(-1).publishLocal.slice(0, 10)}`);

console.log('\n  first 14 days:');
let shown = null;
for (const p of plan.slice(0, EPS_PER_DAY * 14 + SHORTS_PER_DAY * 14)) {
  const d = p.publishLocal.slice(0, 10);
  if (d !== shown) { console.log(`   ${d}`); shown = d; }
  console.log(`      ${p.publishLocal.slice(11, 16)}  ${p.kind.padEnd(5)} ${p.era.padEnd(16)} ${p.title.slice(0, 52)}`);
}
console.log('\n  -> dist/publish-plan.json');
