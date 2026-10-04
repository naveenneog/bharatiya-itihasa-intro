/* Move the long-form publish calendar earlier by whole days, keeping its order.

   Written on 4 Oct. plan-publish.mjs starts a plan "the day after the last scheduled item", and
   on the day the plan was made the last scheduled item was an old-format Short on 19 Oct; the
   last long-form episode was 1 Oct. So the plan's episodes began on 20 Oct and the channel had
   no long-form episode for 18 days, against the user's "one video a day".

   Every long-form episode scheduled on the channel (dist/yt-channel.json) moves by --days, one
   at a time, oldest date first, through tools/yt-reschedule.mjs, which confirms each move by
   reading the stored date and time back from Studio. After each confirmed move its
   dist/publish-log.json `when` and dist/publish-plan.json `publishLocal` are updated. The run
   stops at the first failure, so the calendar is never left with a hole and a doubled day that
   nobody knows about. Only when every scheduled episode has moved are the plan's undated
   episodes moved by the same number of days, so that publish-run.mjs dates them into the
   shifted calendar. Shorts are not touched.

     node tools/shift-books.mjs --days -15            # dry: list the moves
     node tools/shift-books.mjs --days -15 --go
     node tools/shift-books.mjs --days -15 --go --only <id>   # one video, no plan shift

   Re-running after a stop is safe: a video already at its target reads "already at that time".
   The target is computed from the plan's publishLocal, recorded before the first move as
   previousPublishLocal, so a second run does not move anything twice. Only one process may
   drive the browser profile at a time; stop the yt-agent first. */
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, rename } from 'node:fs/promises';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const GO = argv.includes('--go');
const DAYS = Number(arg('days', NaN));
const ONLY = arg('only', null);
if (!Number.isInteger(DAYS) || DAYS === 0) { console.error('usage: node tools/shift-books.mjs --days <non-zero whole days> [--go] [--only <id>]'); process.exit(1); }

const PLAN = 'dist/publish-plan.json';
const LOG = 'dist/publish-log.json';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const save = async (file, obj) => { await writeFile(`${file}.tmp`, `${JSON.stringify(obj, null, 2)}\n`); await rename(`${file}.tmp`, file); };

const chan = JSON.parse(await readFile('dist/yt-channel.json', 'utf8'));
const ageH = (Date.now() - Date.parse(chan.at)) / 3600e3;
if (!(ageH < 30)) { console.error(`dist/yt-channel.json is ${ageH.toFixed(0)} h old; run tools/yt-scan.mjs first`); process.exit(1); }
const planDoc = JSON.parse(await readFile(PLAN, 'utf8'));
const log = JSON.parse(await readFile(LOG, 'utf8'));

/* publishLocal is "YYYY-MM-DDTHH:MM:SS+05:30". Day arithmetic on the date part, in UTC, so no
   local-time rule can move it. */
const shiftLocal = (pl, days) => {
  const d = new Date(`${pl.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.toISOString().slice(0, 10)}${pl.slice(10)}`;
};
const logWhen = (pl) => {
  const [y, m, d] = pl.slice(0, 10).split('-').map(Number);
  const [h, mi] = pl.slice(11, 16).split(':').map(Number);
  return `${MON[m - 1]} ${d}, ${y} ${h % 12 || 12}:${String(mi).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const idOf = (p) => p.id || log[p.dir]?.id || null;
const scheduledIds = new Set(chan.rows.filter((r) => r.kind === 'book' && r.state === 'SCHEDULED').map((r) => r.id));
const books = planDoc.plan.filter((p) => p.kind === 'book');
const moving = books.filter((p) => scheduledIds.has(idOf(p)) && (!ONLY || idOf(p) === ONLY))
  .map((p) => ({ p, id: idOf(p), from: p.previousPublishLocal || p.publishLocal }))
  .map((m) => ({ ...m, to: shiftLocal(m.from, DAYS) }))
  .sort((a, b) => a.from.localeCompare(b.from));
const strays = [...scheduledIds].filter((id) => !books.some((p) => idOf(p) === id));
if (strays.length) console.log(`  scheduled long-form not in the plan (left alone): ${strays.join(', ')}`);
if (ONLY && !moving.length) { console.error(`  ${ONLY} is not a scheduled long-form episode in the plan`); process.exit(1); }
const earliest = Date.now() + 3 * 3600e3;
const tooSoon = moving.filter((m) => Date.parse(m.to) < earliest);
if (tooSoon.length) { console.error(`  ${tooSoon.length} target(s) less than three hours away, first ${tooSoon[0].to}; choose fewer days`); process.exit(1); }

console.log(`  ${moving.length} scheduled episode(s) move ${DAYS} day(s): ${moving[0]?.from.slice(0, 10)} .. ${moving.at(-1)?.from.slice(0, 10)} -> ${moving[0]?.to.slice(0, 10)} .. ${moving.at(-1)?.to.slice(0, 10)}`);
const undated = books.filter((p) => !scheduledIds.has(idOf(p)) && !p.previousPublishLocal);
if (!ONLY) console.log(`  then ${undated.length} undated plan episode(s) move ${DAYS} day(s): first ${undated[0]?.publishLocal.slice(0, 10)} -> ${undated[0] ? shiftLocal(undated[0].publishLocal, DAYS).slice(0, 10) : '-'}`);
if (!GO) { for (const m of moving.slice(0, 5)) console.log(`    ${m.id}  ${m.from} -> ${m.to}  ${m.p.title}`); console.log('  dry run: nothing changed (pass --go)'); process.exit(0); }

let moved = 0;
for (const m of moving) {
  const at = m.to.slice(0, 16);
  process.stdout.write(`  ${m.id}  ${m.from.slice(0, 16)} -> ${at}  ${m.p.title.slice(0, 50)} ... `);
  const r = spawnSync(process.execPath, ['tools/yt-reschedule.mjs', '--id', m.id, '--at', at, '--go'], { encoding: 'utf8', timeout: 240_000 });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const ok = r.status === 0 && /moved, confirmed|already at that time/.test(out);
  if (!ok) {
    console.log(`FAILED (exit ${r.status ?? r.signal})\n${out.trim().split('\n').slice(0, 12).map((l) => `      ${l.slice(0, 200)}`).join('\n')}`);
    console.log(`\n  stopped after ${moved} move(s); re-run the same command to continue`);
    process.exit(1);
  }
  if (!m.p.previousPublishLocal) m.p.previousPublishLocal = m.p.publishLocal;
  m.p.publishLocal = m.to;
  m.p.shiftedAt = new Date().toISOString();
  const e = log[m.p.dir];
  if (e) { if (!e.previousWhen) e.previousWhen = e.when; e.when = logWhen(m.to); e.rescheduledAt = m.p.shiftedAt; }
  await save(PLAN, planDoc);
  await save(LOG, log);
  moved++;
  console.log(/already at that time/.test(out) ? 'already there' : 'moved, confirmed');
}

if (!ONLY) {
  for (const p of undated) { p.previousPublishLocal = p.publishLocal; p.publishLocal = shiftLocal(p.publishLocal, DAYS); }
  planDoc.shifts = [...(planDoc.shifts || []), { at: new Date().toISOString(), kind: 'book', days: DAYS, scheduledMoved: moved, undatedMoved: undated.length }];
  await save(PLAN, planDoc);
  console.log(`\n  ${moved} scheduled episode(s) moved; ${undated.length} undated plan episode(s) moved ${DAYS} day(s) in ${PLAN}`);
}
