/* Produce a whole era, one story after another, without a human in the loop.

   The factory makes one story. A series is fifteen of them at about an hour each, which is
   not a thing to launch by hand fifteen times: a run that stops on the fourth failure has
   wasted the eleven hours it would have spent on the rest.

   So this runs them in sequence, **keeps going past a failure**, and writes a ledger. A
   story that fails is recorded with the stage it died on and the run continues; re-running
   this later skips everything already made, so fixing one story and re-running costs only
   that story.

     node tools/series.mjs --era gupta --plan
     node tools/series.mjs --era gupta
     node tools/series.mjs --era gupta --only sushruta,kalidasa
     node tools/series.mjs --era gupta --from render      # a stage onwards, for every story

   The ledger is dist/<era>/series.json.
*/
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { loadStories, eraOf } from './stories.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const has = (k) => argv.includes(`--${k}`);

const ERA = arg('era', 'gupta');
const PLAN = has('plan');
const FROM = arg('from', null);
const UPLOAD = has('upload');
const VISIBILITY = arg('visibility', 'private');
const ONLY = (arg('only', '') || '').split(',').map((s) => s.trim()).filter(Boolean);

/* The slug a story is published under.

   Derived, so a series does not need a hand-maintained table, but derived *shortly*: the
   upstream ids are sentences ("chandragupta_ii_and_the_fall_of_the_shakas") and a slug is a
   folder name, a file name and part of a URL. Everything after the first connective is
   dropped, and a handful are named by hand where the short form would collide or mislead. */
const BY_HAND = {
  the_dot_that_became_zero: 'zero',
  nalanda_the_ocean_of_learning: 'nalanda',
  aryabhata_turns_the_earth: 'aryabhata',
  the_iron_pillar_that_would_not_rust: 'iron-pillar',
  the_gods_take_shape_at_deogarh: 'deogarh',
  chandragupta_i_and_the_licchavi_bride: 'chandragupta-i',
  chandragupta_ii_and_the_fall_of_the_shakas: 'chandragupta-ii',
  sushruta_and_the_healer_s_knife: 'sushruta',
  faxian_s_road_through_a_golden_land: 'faxian',
  kalidasa_and_the_cloud_messenger: 'kalidasa',
  megasthenes_at_the_wooden_capital: 'megasthenes',
  prabhavatigupta_the_regent_queen: 'prabhavatigupta',
  samudragupta_s_hundred_victories: 'samudragupta',
  skandagupta_holds_back_the_huns: 'skandagupta',
  chandragupta_s_last_fast_at_shravanabelagola: 'shravanabelagola',
};
const slugFor = (id) => BY_HAND[id]
  || id.replace(/_(and|at|the|of|in|through|that|who|s)_.*$/, '').replace(/_/g, '-');

/* A story whose own dates fall outside the era it is filed under.

   `megasthenes_at_the_wooden_capital` sits in the gupta bucket and is dated c. 300 BCE — a
   Greek embassy to *Chandragupta Maurya*, six hundred years before the Guptas. Produced here
   it would open on Gupta objects, carry a Gupta stinger and close on a Gupta beat, which is
   the kind of error a history channel does not get to make twice. It is skipped rather than
   silently mis-dressed; it belongs to a Maurya series.

   The test is deliberately narrow — a BCE date in a CE era, or vice versa — because guessing
   more than that would start dropping stories for no good reason. */
function eraMismatch(story, era) {
  const t = String(story.era || '');
  const bce = /\bBCE\b/.test(t);
  const ce = /\bCE\b/.test(t) && !/\bBCE\b/.test(t);
  if (era === 'harappa' || era === 'maurya' || era === 'vedic') return null;
  if (bce && !ce) return `dated ${t.trim()} — BCE, in a CE era`;
  return null;
}

const all = await loadStories();
let stories = all.filter((s) => eraOf(s) === ERA);
if (ONLY.length) stories = stories.filter((s) => ONLY.includes(slugFor(s.id)) || ONLY.includes(s.id));

const skipped = [];
const queue = [];
for (const s of stories) {
  const why = eraMismatch(s, ERA);
  if (why) { skipped.push({ id: s.id, slug: slugFor(s.id), why }); continue; }
  queue.push({ id: s.id, slug: slugFor(s.id), title: s.title, era: s.era });
}

console.log(`\n  ${ERA}: ${queue.length} story(ies) to produce${skipped.length ? `, ${skipped.length} skipped` : ''}\n`);
for (const q of queue) console.log(`    ${q.slug.padEnd(20)} ${q.id}`);
for (const s of skipped) console.log(`    SKIP ${s.slug.padEnd(15)} ${s.why}`);
console.log('');
if (PLAN) { console.log('  --plan: nothing run'); process.exit(0); }

const LEDGER = path.join('dist', ERA, 'series.json');
await mkdir(path.dirname(LEDGER), { recursive: true });
const ledger = await readFile(LEDGER, 'utf8').then(JSON.parse).catch(() => ({ era: ERA, runs: {} }));
ledger.skipped = skipped;

function run(story) {
  return new Promise((resolve) => {
    const args = ['tools/factory.mjs', '--story', story.id, '--slug', story.slug, '--era', ERA];
    if (FROM) args.push('--from', FROM);
    /* Passed through rather than assumed. An era run that uploaded by default would publish a
       whole series unreviewed; upload.mjs defaults to private and refuses a second copy of the
       same master, so the batch is safe once it has been asked for. */
    if (UPLOAD) args.push('--upload', '--visibility', VISIBILITY);
    const p = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let tail = '';
    const keep = (b) => { tail = (tail + b.toString()).slice(-4000); };
    p.stdout.on('data', (b) => { keep(b); process.stdout.write(b); });
    /* stderr was captured and never shown. A failed stage reported only its own name, and the
       exception explaining it — the one thing needed to fix it — went into a string that was
       used to regex out that same name and then thrown away. Four stories failed at `outro` in
       one run with nothing anywhere saying why. */
    p.stderr.on('data', (b) => { keep(b); process.stderr.write(b); });
    p.on('close', (code) => resolve({ code, tail }));
  });
}

const t0 = Date.now();
for (const [i, story] of queue.entries()) {
  const started = Date.now();
  console.log(`\n${'█'.repeat(72)}`);
  console.log(`  [${i + 1}/${queue.length}]  ${story.slug}  —  ${story.title}`);
  console.log(`${'█'.repeat(72)}\n`);
  const { code, tail } = await run(story);
  const mins = +((Date.now() - started) / 60000).toFixed(1);
  ledger.runs[story.slug] = {
    id: story.id, title: story.title, ok: code === 0, mins, at: new Date().toISOString(),
    /* The failing stage, lifted from the factory's own last words, so the ledger says what
       to fix rather than only that something broke. */
    failedAt: code === 0 ? null : (tail.match(/(\S+(?: \S+)?) FAILED — stopping/) || [])[1] || 'unknown',
  };
  await writeFile(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`);
  /* The last four thousand characters of a failed run, kept where the ledger points at it. An
     unattended run is read hours later, by which time the scrollback is gone or was never
     visible — the ledger has to be able to hand over the evidence, not just the verdict. */
  if (code !== 0) {
    const log = path.join(path.dirname(LEDGER), `${story.slug}.fail.log`);
    await writeFile(log, `${new Date().toISOString()}  ${story.slug}  failed at `
      + `${ledger.runs[story.slug].failedAt}\n\n${tail}\n`);
    ledger.runs[story.slug].log = log;
    await writeFile(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`);
    console.log(`  why: ${log}`);
  }
  console.log(`\n  ${story.slug}: ${code === 0 ? 'done' : `FAILED at ${ledger.runs[story.slug].failedAt}`} in ${mins} min`);
}

const done = Object.values(ledger.runs).filter((r) => r.ok).length;
const bad = Object.entries(ledger.runs).filter(([, r]) => !r.ok);
console.log(`\n${'═'.repeat(72)}`);
console.log(`  ${ERA}: ${done}/${queue.length} produced in ${((Date.now() - t0) / 3600000).toFixed(1)} h`);
for (const [slug, r] of bad) console.log(`  FAILED  ${slug.padEnd(20)} at ${r.failedAt}`);
for (const s of skipped) console.log(`  SKIPPED ${s.slug.padEnd(20)} ${s.why}`);
console.log(`  ledger: ${LEDGER}\n`);
if (bad.length) process.exit(1);
