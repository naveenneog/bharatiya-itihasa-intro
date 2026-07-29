/* Generate stills and clips for eras, in parallel, without drift.

   Eighteen eras at ten beats is 180 stills and 180 clips. Run one era at a time and it is
   days; run them all flat out and Azure throttles, jobs fail halfway, and the failures are
   discovered hours later.

   So this is a single queue across all requested eras with one global concurrency cap,
   rather than a loop of per-era runs. That matters for three reasons:

     - the cap is a property of the *account*, not of an era, so it belongs at the top
     - a slow era cannot starve a fast one; work is taken as workers free up
     - one interrupted run leaves every era partially done and resumable, instead of
       leaving some eras finished and others untouched

   Nothing is ever overwritten. Every take is a new revision, so a second pass gives a
   second candidate to choose between rather than destroying the first.

   Consistency is not enforced here — it is structural. Prompts come from `loadEra`, which
   composes them through `tools/ink.mjs`. This file never mentions lighting or framing, so
   it cannot introduce a difference between eras.

     node tools/gen-era.mjs --all --what stills            # one candidate per beat, everywhere
     node tools/gen-era.mjs --all --what stills --rounds 2 # two candidates per beat
     node tools/gen-era.mjs chola maurya --what clips
     node tools/gen-era.mjs --all --what stills --dry      # show the plan and the cost
*/
import { mkdir, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { genImage, genVideo } from './azure.mjs';
import { listEras, loadEra, ROOT } from './eras.mjs';
import { picks, choose } from './picks.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const VALUE_FLAGS = new Set(['what', 'conc', 'rounds', 'seconds', 'beats', 'beat', 'era']);
const BOOL_FLAGS = new Set(['dry', 'missing', 'all']);
const consumed = new Set();
argv.forEach((a, i) => { if (a.startsWith('--') && VALUE_FLAGS.has(a.slice(2))) consumed.add(i + 1); });
const targets = argv.filter((a, i) => !a.startsWith('--') && !consumed.has(i));

/* Refuse to run on a flag this tool does not understand.

   `--beat 01-uzhai` (the name gen-clips.mjs uses) was silently ignored here, where the
   flag is `--beats` — so a request for one clip generated ten. A narrowing flag that is
   quietly dropped *widens* the job, and this job costs money per item, so an unknown flag
   has to be an error rather than a shrug. */
const unknown = argv.filter((a) => a.startsWith('--')
  && !VALUE_FLAGS.has(a.slice(2)) && !BOOL_FLAGS.has(a.slice(2)));
if (unknown.length) {
  console.error(`unknown flag(s): ${unknown.join(', ')}`);
  console.error(`known: ${[...VALUE_FLAGS].map((f) => `--${f} <v>`).join(', ')}, ${[...BOOL_FLAGS].map((f) => `--${f}`).join(', ')}`);
  process.exit(1);
}

const WHAT = arg('what', 'stills');
const ROUNDS = Number(arg('rounds', '1'));
const SECONDS = arg('seconds', '8');
const DRY = has('dry');
const ONLY_MISSING = has('missing');
/* Both spellings, because the sibling generator uses the singular and picking one to be
   correct only moves which of the two costs money. */
const BEATFILTER = [arg('beats', ''), arg('beat', '')]
  .join(',').split(',').map((s) => s.trim()).filter(Boolean);

/* Concurrency is per *kind of job*, because the two endpoints behave differently: image
   generation is fast and tolerates four in flight, video is slow and expensive and two is
   already enough to keep it saturated. Measured on this account, not guessed. */
const CONC = Number(arg('conc', WHAT === 'clips' ? '2' : '4'));

if (!['stills', 'clips'].includes(WHAT)) {
  console.error(`--what must be stills or clips`);
  process.exit(1);
}

const eras = targets.length ? targets : await listEras();

/** Highest existing revision for a beat, so a new take never lands on an old one. */
async function nextRev(dir, sub, beatId, ext) {
  const d = path.join(dir, sub);
  await mkdir(d, { recursive: true });
  const files = await readdir(d).catch(() => []);
  const re = new RegExp(`^${beatId}-r(\\d+)\\.${ext}$`);
  const max = files.reduce((m, f) => {
    const g = f.match(re);
    return g ? Math.max(m, Number(g[1])) : m;
  }, 0);
  return { out: path.join(d, `${beatId}-r${max + 1}.${ext}`), existing: max };
}

// ── build the queue ───────────────────────────────────────────────────────
const jobs = [];
for (const id of eras) {
  let era;
  try { era = await loadEra(id); } catch { console.log(`  skip ${id} — no era.json`); continue; }
  if (era.draft) console.log(`  note ${id} is still marked draft — fact-check it before this ships`);

  for (const beat of era.beats) {
    if (BEATFILTER.length && !BEATFILTER.some((f) => beat.id.includes(f))) continue;

    if (WHAT === 'stills') {
      for (let r = 0; r < ROUNDS; r++) {
        jobs.push({ era: id, dir: era.dir, beat, kind: 'stills' });
      }
    } else {
      /* A clip is generated from the *chosen* still, not the newest one, so the candidate
         that was picked is the one that moves. Without picks.json this falls back to the
         newest, which is the old behaviour. */
      const p = await picks(ROOT, id);
      const stills = await readdir(path.join(era.dir, 'stills')).catch(() => []);
      const still = choose(stills, beat.id, 'png', p[beat.id]);
      if (!still) { console.log(`  skip ${id}/${beat.id} — no still to animate`); continue; }
      jobs.push({ era: id, dir: era.dir, beat, kind: 'clips', still: path.join(era.dir, 'stills', still) });
    }
  }
}

/* --missing only fills gaps. Useful after an interrupted run, and the only safe way to
   re-run a large batch without generating a second candidate for everything. */
let queue = jobs;
if (ONLY_MISSING) {
  const keep = [];
  for (const j of jobs) {
    const sub = j.kind === 'stills' ? 'stills' : 'clips';
    const ext = j.kind === 'stills' ? 'png' : 'mp4';
    const { existing } = await nextRev(j.dir, sub, j.beat.id, ext);
    if (existing === 0) keep.push(j);
  }
  queue = keep;
}

const byEra = new Map();
for (const j of queue) byEra.set(j.era, (byEra.get(j.era) || 0) + 1);

console.log(`\n  ${WHAT}: ${queue.length} job(s) across ${byEra.size} era(s), ${CONC} at a time\n`);
for (const [e, n] of [...byEra].sort()) console.log(`    ${e.padEnd(18)} ${n}`);

/* Measured on this account: a still is ~25 s of wall clock at concurrency 4, a clip ~72 s
   at concurrency 2. Printing the estimate before a long run is the difference between
   waiting deliberately and waiting by accident. */
const PER = WHAT === 'stills' ? 25 : 72;
const mins = Math.round((queue.length * PER) / CONC / 60);
console.log(`\n  estimated ${mins} min (~${PER}s per job at ${CONC} concurrent)\n`);

if (DRY) { console.log('  --dry: nothing generated\n'); process.exit(0); }
if (!queue.length) { console.log('  nothing to do\n'); process.exit(0); }

// ── run ───────────────────────────────────────────────────────────────────
const t0 = Date.now();
let done = 0;
let failed = 0;
const work = queue.slice();

async function worker() {
  for (;;) {
    const j = work.shift();
    if (!j) return;
    const sub = j.kind === 'stills' ? 'stills' : 'clips';
    const ext = j.kind === 'stills' ? 'png' : 'mp4';
    const { out } = await nextRev(j.dir, sub, j.beat.id, ext);
    const label = `${j.era}/${j.beat.id}`;
    try {
      if (j.kind === 'stills') {
        await genImage(j.beat.fullPrompt, out, { size: '1536x1024', quality: 'high' });
        await writeFile(out.replace(/\.png$/, '.txt'), j.beat.fullPrompt);
      } else {
        /* The still is 1536x1024 (3:2) and the clip is 1280x720 (16:9). genVideo
           centre-crops and scales the reference to the exact requested size, because sora
           rejects any mismatch — see fitRef in azure.mjs. This comment used to assert that
           without it being true, and every clip here failed with a 400. */
        await genVideo(j.beat.fullPrompt, out, { seconds: SECONDS, size: '1280x720', ref: j.still });
        await writeFile(out.replace(/\.mp4$/, '.txt'), j.beat.fullPrompt);
      }
      done++;
      console.log(`  [${done + failed}/${queue.length}] ${((Date.now() - t0) / 1000).toFixed(0)}s  ok   ${label} -> ${path.basename(out)}`);
    } catch (e) {
      failed++;
      /* Collapse the message to one line and keep the *end* as well as the start. These
         errors arrive as pretty-printed JSON, so a plain 140-character prefix showed
         `HTTP 400 { "error": { "message":` and stopped — 170 identical failures with the
         reason cut off. */
      const msg = String(e.message).replace(/\s+/g, ' ').trim();
      const short = msg.length > 200 ? `${msg.slice(0, 110)} … ${msg.slice(-80)}` : msg;
      console.log(`  [${done + failed}/${queue.length}] ${((Date.now() - t0) / 1000).toFixed(0)}s  FAIL ${label}: ${short}`);
    }
  }
}

await Promise.all(Array.from({ length: Math.max(1, Math.min(CONC, queue.length)) }, worker));

console.log(`\n  ${done}/${queue.length} ${WHAT} in ${((Date.now() - t0) / 60000).toFixed(1)} min`
  + (failed ? `, ${failed} failed — re-run with --missing to fill the gaps` : ''));
console.log(`  -> ${ROOT}/<era>/${WHAT}/\n`);
process.exit(failed ? 1 : 0);
