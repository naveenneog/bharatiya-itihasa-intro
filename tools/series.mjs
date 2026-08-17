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
import { unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { loadStories, eraOf, yearOf } from './stories.mjs';

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

  /* Slugs are a flat namespace — `episodes/<slug>` — but the rule below truncates at the first
     "and/at/the/of/who/…", so four different kings all become `the-king`. That collision does not
     surface until a second era tries to build into a directory the first one owns, which is where
     Vijayanagara's Krishnadevaraya met Pallava's Nandivarman: "episodes/the-king was built from
     the_king_who_turned_ally and you asked for the_king_who_wrote_amuktamalyada".

     The two already built keep the short slug so their folders stay valid; every other member of
     a colliding group is named here. checkSlugs below fails at plan time if a new one appears. */
  water_in_the_desert: 'water-desert',
  water_through_rock_at_bidar: 'bidar-water',
  the_city_that_drew_itself_in_straight_lines: 'straight-lines',
  the_city_that_did_not_smell: 'did-not-smell',
  when_the_monsoons_changed: 'monsoons-changed',
  when_the_deccan_empire_split: 'deccan-split',
  the_river_the_two_republics_shared: 'two-republics',
  the_queen_at_the_coin_pass: 'coin-pass',
  the_queen_who_came_back: 'queen-came-back',
  the_king_who_gathered_seven_hundred_songs: 'seven-hundred-songs',
  the_king_who_became_jagannath_s_servant: 'jagannath-servant',
  the_king_who_wrote_amuktamalyada: 'amuktamalyada',
  /* Neither prince is built, so both are named — no folder has to be kept valid. */
  the_prince_who_would_not_die: 'would-not-die',
  the_prince_who_read_the_hidden_books: 'hidden-books',
  /* Neither book is built either. `the-book` is the same truncation: both titles open with
     "The Book" and the rule stops at "that"/"of". They sit in different eras (other 550,
     chola 1259), so nothing surfaced until checkSlugs swept the whole corpus at plan time. */
  the_book_that_crossed_mountains: 'crossed-mountains',
  the_book_of_all_duties: 'all-duties',
  /* `the-river` is already built from the_river_that_taught_the_stars in rashtrakuta, so that one
     keeps the short slug and only its namesake is renamed. */
  the_river_that_redrew_the_kingdom: 'redrew-the-kingdom',
  /* the_tanks_that_fed_an_empire is built as `the-tanks` in vijayanagara, so it keeps it. */
  the_tanks_that_kept_mahoba_alive: 'mahoba-tanks',
  /* `the-king` belongs to pallava's built the_king_who_turned_ally. */
  the_king_who_wrote_his_copper_plate: 'copper-plate-king',
  /* `copper-plates` is built from copper_plates_and_village_sabhas, so it keeps it. */
  copper_plates_and_the_roads_of_malwa: 'malwa-roads',
  /* Neither `what` story is built; both are named. */
  what_the_chachnama_remembers: 'chachnama-remembers',
  what_the_metal_knows: 'what-metal-knows',
  sangram_shah_and_the_fifty_two_forts: 'fifty-two-forts',
  sangram_shah_s_sanskrit_court: 'sangram-sanskrit-court',
  the_man_who_read_the_sky_and_the_soil: 'sky-and-soil',
  the_man_who_asked_why: 'asked-why',
  lalitaditya_s_empire_and_its_legend: 'lalitaditya-empire',
  lalitaditya_s_living_library: 'lalitaditya-library',
  the_mathematician_who_made_numbers_dance: 'numbers-dance',
  the_mathematician_at_the_edge_of_the_infinite: 'edge-of-infinite',
  malik_kafur_at_the_granite_walls: 'kafur-granite',
  malik_kafur_in_madurai: 'kafur-madurai',
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
  if (bce && !ce) {
    /* A BCE story in a CE era is usually misfiled — but not when it is the era's own run-up.

       Kushan has three: Panini (400-350 BCE) and Taxila (600 BCE), which are Gandhara stories the
       keyword match dragged in, and `the_yuezhi_cross_a_thousand_mountains` (176-30 BCE), which is
       how the Kushans came to exist. Kujula Kadphises founds the dynasty at 30 CE, continuous with
       it. Reading the letters BCE cannot tell those apart; the distance can.

       Measured against the era's earliest CE story rather than a fixed year, so it needs no table
       of dynasties. Maurya keeps its exemption above: Prinsep reading the edicts in 1837 is 2,000
       years from that era's centre and still belongs to it, which is why distance alone is not
       enough on its own. */
    const start = eraStart(era);
    const y = yearOf(story);
    if (start !== null && y !== null && start - y <= 250) return null;
    return `dated ${t.trim()} — BCE, in a CE era`;
  }
  return null;
}

/** The year the era proper begins: its earliest story that is not itself BCE. */
function eraStart(era) {
  const ys = all.filter((s) => eraOf(s) === era)
    .map(yearOf)
    .filter((y) => y !== null && y > 0);
  return ys.length ? Math.min(...ys) : null;
}

const all = await loadStories();

/* Two stories that share a slug share a directory, and the second one to build wins parts of the
   first. Checked across every era rather than the one being produced, because that is the scope
   the collision actually lives in, and checked before anything is generated rather than an hour
   in when `rebuild` notices the episode it is rebuilding is a different story. */
function checkSlugs(stories) {
  const by = new Map();
  for (const s of stories) {
    const k = slugFor(s.id);
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(s.id);
  }
  const clashes = [...by].filter(([, ids]) => ids.length > 1);
  if (!clashes.length) return;
  console.error('slug collision — these stories would share one episodes/ directory:\n');
  for (const [slug, ids] of clashes) {
    console.error(`  ${slug}`);
    for (const id of ids) console.error(`    ${id}`);
  }
  console.error('\nAdd an entry to BY_HAND in tools/series.mjs for all but one of each group.');
  process.exit(1);
}
checkSlugs(all);

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

/* One runner per era, enforced.

   Two of these ran against Gupta at once for over an hour. Every stage is keyed on the slug, so
   they did not obviously collide — they simply took turns doing the same work, until both
   reached render-episode for the same story. That stage archives the scratch frame directory
   before capturing into it, so one run moved the other's frames out from under it at 69% and the
   encode found an empty folder: "Error opening input file f%06d.jpg", forty minutes in, three
   stories running.

   Nothing in the ledger showed two runners. The failures looked like a bug in the renderer. */
const LOCK = path.join('dist', ERA, 'series.lock');
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const held = await readFile(LOCK, 'utf8').then(JSON.parse).catch(() => null);
if (held && held.pid !== process.pid && alive(held.pid)) {
  console.error(`another series runner is already producing "${ERA}" (pid ${held.pid}, started ${held.at}).`);
  console.error('Two runners share every scratch directory and will corrupt each other\'s renders.');
  console.error(`Stop it first, or delete ${LOCK} if that process is gone.`);
  process.exit(1);
}
await writeFile(LOCK, `${JSON.stringify({ pid: process.pid, at: new Date().toISOString(), era: ERA })}\n`);
process.on('exit', () => { try { unlinkSync(LOCK); } catch { /* gone */ } });

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
